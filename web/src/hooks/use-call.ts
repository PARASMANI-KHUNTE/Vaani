"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getCallConfiguration } from "@/lib/api";
import { getSocketClient, socketEvents } from "@/lib/socket";
import { CallConfiguration, CallSession, CallStatus, CallType, Chat } from "@/lib/types";
import { WebRTCCallSession, getDefaultCallConfiguration } from "@/lib/webrtc";

type UseCallParams = {
  token?: string;
  currentUserId?: string;
};

type StartCallParams = {
  chat: Chat;
  callType: CallType;
};

type UseCallResult = {
  activeCall: CallSession | null;
  incomingCall: CallSession | null;
  callStatus: CallStatus;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isVideoOn: boolean;
  error: string | null;
  startCall: (input: StartCallParams) => Promise<void>;
  acceptIncomingCall: () => Promise<void>;
  rejectIncomingCall: () => Promise<void>;
  endActiveCall: () => Promise<void>;
  toggleMute: () => void;
  toggleVideo: () => void;
  clearCallError: () => void;
};

const endedReasonToMessage = (reason?: string) => {
  if (reason === "timeout") {
    return "The call timed out before it was answered.";
  }

  if (reason === "rejected") {
    return "The call was declined.";
  }

  if (reason === "busy") {
    return "The other user is already on another call.";
  }

  if (reason === "disconnected") {
    return "The call ended because the other user disconnected.";
  }

  return "The call has ended.";
};

export const useCall = ({ token, currentUserId }: UseCallParams): UseCallResult => {
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [activeCall, setActiveCall] = useState<CallSession | null>(null);
  const [incomingCall, setIncomingCall] = useState<CallSession | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [configuration, setConfiguration] = useState<CallConfiguration>(getDefaultCallConfiguration());
  const sessionRef = useRef<WebRTCCallSession | null>(null);
  const activeCallRef = useRef<CallSession | null>(null);
  const incomingCallRef = useRef<CallSession | null>(null);
  const requestedCallTypeRef = useRef<CallType>("audio");
  const isAnsweringOfferRef = useRef(false);

  const cleanupSession = useCallback(() => {
    sessionRef.current?.cleanup();
    sessionRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setIsMuted(false);
    setIsVideoOn(true);
  }, []);

  const resetCallState = useCallback((nextStatus: CallStatus = "idle") => {
    cleanupSession();
    setIncomingCall(null);
    setActiveCall(null);
    activeCallRef.current = null;
    setCallStatus(nextStatus);
  }, [cleanupSession]);

  const ensureSession = useCallback(() => {
    if (sessionRef.current) {
      return sessionRef.current;
    }

    sessionRef.current = new WebRTCCallSession({
      iceServers: configuration.iceServers,
      onIceCandidate: (candidate) => {
        if (!token || !activeCallRef.current) {
          return;
        }

        const socket = getSocketClient(token);
        socket.emit(socketEvents.iceCandidate, {
          callId: activeCallRef.current.callId,
          candidate: candidate.toJSON(),
        });
      },
      onRemoteStream: (stream) => {
        setRemoteStream(stream);
      },
      onConnectionStateChange: (state) => {
        if (state === "connected") {
          setCallStatus("connected");
        }

        if (["failed", "disconnected", "closed"].includes(state)) {
          setError("The call connection was interrupted.");
          resetCallState("ended");
        }
      },
      onIceConnectionStateChange: (state) => {
        if (["failed", "closed"].includes(state)) {
          setError("The network could not keep the call connected.");
        }
      },
      onDebug: (event, details) => {
        console.log("[WebRTC]", event, details ?? "");
      },
    });

    return sessionRef.current;
  }, [configuration.iceServers, resetCallState, token]);

  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  useEffect(() => {
    incomingCallRef.current = incomingCall;
  }, [incomingCall]);

  useEffect(() => {
    if (!token) {
      return;
    }

    let isMounted = true;

    getCallConfiguration(token)
      .then((response) => {
        if (isMounted) {
          setConfiguration(response.config);
        }
      })
      .catch(() => {
        if (isMounted) {
          setConfiguration(getDefaultCallConfiguration());
        }
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  useEffect(() => {
    if (!token || !currentUserId) {
      resetCallState("idle");
      return;
    }

    const socket = getSocketClient(token);

    const handleIncomingCall = (call: CallSession) => {
      if (activeCallRef.current || incomingCallRef.current) {
        socket.emit(socketEvents.rejectCall, {
          callId: call.callId,
          reason: "busy",
        });
        return;
      }

      requestedCallTypeRef.current = call.callType;
      setIncomingCall(call);
      setCallStatus("ringing");
      setError(null);
    };

    const handleCallAccepted = async (call: CallSession) => {
      try {
        if (
          activeCallRef.current?.callId === call.callId &&
          !["calling", "idle", "ended"].includes(callStatus)
        ) {
          return;
        }

        setActiveCall(call);
        activeCallRef.current = call;
        setCallStatus("connecting");

        const session = ensureSession();
        await session.prepare(call.callType);
        setLocalStream(session.getLocalStream());
        setIsVideoOn(call.callType === "video");

        const offer = await session.createOffer();
        socket.emit(socketEvents.offer, {
          callId: call.callId,
          offer,
        });
      } catch (acceptError) {
        setError(acceptError instanceof Error ? acceptError.message : "Unable to connect the call.");
        resetCallState("ended");
      }
    };

    const handleCallRejected = (call: CallSession) => {
      setError(endedReasonToMessage(call.reason));
      resetCallState("ended");
    };

    const handleOffer = async ({
      callId,
      offer,
    }: {
      callId: string;
      offer: RTCSessionDescriptionInit;
    }) => {
      if (isAnsweringOfferRef.current) {
        return;
      }

      try {
        const call = activeCallRef.current || incomingCallRef.current;

        if (!call || call.callId !== callId) {
          return;
        }

        const session = ensureSession();

        if (session.getSignalingState() === "have-remote-offer") {
          return;
        }
        if (session.getSignalingState() === "stable" && session.hasRemoteDescription()) {
          return;
        }

        isAnsweringOfferRef.current = true;
        await session.setRemoteDescription(offer);

        if (session.getSignalingState() !== "have-remote-offer") {
          return;
        }

        const answer = await session.createAnswer();
        setLocalStream(session.getLocalStream());
        socket.emit(socketEvents.answer, {
          callId,
          answer,
        });
        setCallStatus("connecting");
      } catch (offerError) {
        setError(offerError instanceof Error ? offerError.message : "Unable to answer the call.");
        resetCallState("ended");
      } finally {
        isAnsweringOfferRef.current = false;
      }
    };

    const handleAnswer = async ({
      callId,
      answer,
    }: {
      callId: string;
      answer: RTCSessionDescriptionInit;
    }) => {
      try {
        if (!activeCallRef.current || activeCallRef.current.callId !== callId) {
          return;
        }

        const session = ensureSession();

        if (session.getSignalingState() === "stable" && session.hasRemoteDescription()) {
          return;
        }

        await session.setRemoteDescription(answer);
        setCallStatus("connecting");
      } catch (answerError) {
        setError(answerError instanceof Error ? answerError.message : "Unable to complete the call connection.");
        resetCallState("ended");
      }
    };

    const handleIceCandidate = async ({
      callId,
      candidate,
    }: {
      callId: string;
      candidate: RTCIceCandidateInit;
    }) => {
      try {
        const call = activeCallRef.current || incomingCallRef.current;
        if (!call || call.callId !== callId) {
          return;
        }

        await ensureSession().addIceCandidate(candidate);
      } catch (candidateError) {
        setError(candidateError instanceof Error ? candidateError.message : "Unable to process network candidate.");
      }
    };

    const handleCallEnded = (call: CallSession) => {
      setError(endedReasonToMessage(call.reason));
      resetCallState("ended");
    };

    socket.on(socketEvents.incomingCall, handleIncomingCall);
    socket.on(socketEvents.callAccepted, handleCallAccepted);
    socket.on(socketEvents.callRejected, handleCallRejected);
    socket.on(socketEvents.offer, handleOffer);
    socket.on(socketEvents.answer, handleAnswer);
    socket.on(socketEvents.iceCandidate, handleIceCandidate);
    socket.on(socketEvents.callEnded, handleCallEnded);

    return () => {
      socket.off(socketEvents.incomingCall, handleIncomingCall);
      socket.off(socketEvents.callAccepted, handleCallAccepted);
      socket.off(socketEvents.callRejected, handleCallRejected);
      socket.off(socketEvents.offer, handleOffer);
      socket.off(socketEvents.answer, handleAnswer);
      socket.off(socketEvents.iceCandidate, handleIceCandidate);
      socket.off(socketEvents.callEnded, handleCallEnded);
    };
  }, [callStatus, currentUserId, ensureSession, resetCallState, token]);

  useEffect(() => () => cleanupSession(), [cleanupSession]);

  useEffect(() => {
    if (!token || !activeCall) {
      return;
    }

    const handleBeforeUnload = () => {
      const socket = getSocketClient(token);
      socket.emit(socketEvents.endCall, {
        callId: activeCall.callId,
        reason: "ended",
      });
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [activeCall, token]);

  const startCall = async ({ chat, callType }: StartCallParams) => {
    if (!token || !chat.otherParticipant?._id) {
      return;
    }

    try {
      requestedCallTypeRef.current = callType;
      setError(null);
      setIncomingCall(null);
      setCallStatus("calling");

      const session = ensureSession();
      await session.prepare(callType);
      setLocalStream(session.getLocalStream());
      setRemoteStream(null);
      setIsVideoOn(callType === "video");

      const socket = getSocketClient(token);
      await new Promise<void>((resolve, reject) => {
        socket.emit(
          socketEvents.callUser,
          {
            chatId: chat._id,
            receiverId: chat.otherParticipant?._id,
            callType,
          },
          (acknowledgement?: { ok?: boolean; error?: string; call?: CallSession | null }) => {
            const acknowledgedCall = acknowledgement?.call || null;

            if (!acknowledgement?.ok || !acknowledgedCall) {
              reject(new Error(acknowledgement?.error || "Unable to start the call."));
              return;
            }

            setActiveCall(acknowledgedCall);
            activeCallRef.current = acknowledgedCall;
            resolve();
          }
        );
      });
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : "Unable to start the call.");
      resetCallState("ended");
    }
  };

  const acceptIncomingCall = async () => {
    if (!token || !incomingCall) {
      return;
    }

    try {
      setError(null);
      const session = ensureSession();
      await session.prepare(incomingCall.callType);
      setLocalStream(session.getLocalStream());
      setRemoteStream(null);
      setIsVideoOn(incomingCall.callType === "video");

      const socket = getSocketClient(token);
      await new Promise<void>((resolve, reject) => {
        socket.emit(
          socketEvents.acceptCall,
          { callId: incomingCall.callId },
          (acknowledgement?: { ok?: boolean; error?: string; call?: CallSession | null }) => {
            const acknowledgedCall = acknowledgement?.call || null;

            if (!acknowledgement?.ok || !acknowledgedCall) {
              reject(new Error(acknowledgement?.error || "Unable to accept the call."));
              return;
            }

            setActiveCall(acknowledgedCall);
            activeCallRef.current = acknowledgedCall;
            setIncomingCall(null);
            setCallStatus("connecting");
            resolve();
          }
        );
      });
    } catch (acceptError) {
      setError(acceptError instanceof Error ? acceptError.message : "Unable to accept the call.");
      resetCallState("ended");
    }
  };

  const rejectIncomingCall = async () => {
    if (!token || !incomingCall) {
      return;
    }

    const currentIncomingCall = incomingCall;
    setIncomingCall(null);

    try {
      const socket = getSocketClient(token);
      await new Promise<void>((resolve) => {
        socket.emit(
          socketEvents.rejectCall,
          { callId: currentIncomingCall.callId, reason: "rejected" },
          () => resolve()
        );
      });
    } finally {
      resetCallState("idle");
    }
  };

  const endActiveCall = async () => {
    const call = activeCallRef.current;

    if (!token || !call) {
      resetCallState("idle");
      return;
    }

    try {
      const socket = getSocketClient(token);
      await new Promise<void>((resolve) => {
        socket.emit(
          socketEvents.endCall,
          { callId: call.callId, reason: "ended" },
          () => resolve()
        );
      });
    } finally {
      resetCallState("ended");
    }
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    ensureSession().setMuted(nextMuted);
    setIsMuted(nextMuted);
  };

  const toggleVideo = () => {
    const callType = activeCallRef.current?.callType || requestedCallTypeRef.current;

    if (callType !== "video") {
      return;
    }

    const nextVideoOn = !isVideoOn;
    ensureSession().setVideoEnabled(nextVideoOn);
    setIsVideoOn(nextVideoOn);
  };

  return {
    activeCall,
    incomingCall,
    callStatus,
    localStream,
    remoteStream,
    isMuted,
    isVideoOn,
    error,
    startCall,
    acceptIncomingCall,
    rejectIncomingCall,
    endActiveCall,
    toggleMute,
    toggleVideo,
    clearCallError: () => setError(null),
  };
};
