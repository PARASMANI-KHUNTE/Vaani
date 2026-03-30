import { CallConfiguration, CallType } from "@/lib/types";

type WebRTCCallOptions = {
  iceServers?: RTCIceServer[];
  onIceCandidate?: (candidate: RTCIceCandidate) => void;
  onRemoteStream?: (stream: MediaStream) => void;
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
  onIceConnectionStateChange?: (state: RTCIceConnectionState) => void;
  onDebug?: (event: string, details?: unknown) => void;
};

const defaultConfiguration: CallConfiguration = {
  iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }],
  callTimeoutMs: 30_000,
};

const toReadableMediaError = (error: unknown) => {
  if (!(error instanceof Error)) {
    return "Unable to access your microphone or camera.";
  }

  if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
    return "Microphone or camera permission was denied.";
  }

  if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
    return "No microphone or camera was found for this call.";
  }

  if (error.name === "NotReadableError" || error.name === "TrackStartError") {
    return "Your microphone or camera is already in use by another application.";
  }

  return error.message || "Unable to access your microphone or camera.";
};

export class WebRTCCallSession {
  private peerConnection: RTCPeerConnection | null = null;
  private remoteStream: MediaStream | null = null;
  private localStream: MediaStream | null = null;
  private queuedCandidates: RTCIceCandidateInit[] = [];
  private readonly options: WebRTCCallOptions;

  constructor(options: WebRTCCallOptions = {}) {
    this.options = options;
  }

  getLocalStream() {
    return this.localStream;
  }

  getRemoteStream() {
    return this.remoteStream;
  }

  getSignalingState() {
    return this.peerConnection?.signalingState || "stable";
  }

  hasRemoteDescription() {
    return Boolean(this.peerConnection?.remoteDescription);
  }

  async ensureLocalStream(callType: CallType) {
    if (this.localStream) {
      return this.localStream;
    }

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === "video",
      });

      this.options.onDebug?.("local-stream-ready", {
        callType,
        audioTracks: this.localStream.getAudioTracks().length,
        videoTracks: this.localStream.getVideoTracks().length,
      });

      return this.localStream;
    } catch (error) {
      throw new Error(toReadableMediaError(error));
    }
  }

  private ensurePeerConnection() {
    if (this.peerConnection) {
      return this.peerConnection;
    }

    const peerConnection = new RTCPeerConnection({
      iceServers: this.options.iceServers || defaultConfiguration.iceServers,
    });

    this.remoteStream = new MediaStream();

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.options.onIceCandidate?.(event.candidate);
      }
    };

    peerConnection.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach((track) => {
        this.remoteStream?.addTrack(track);
      });

      if (this.remoteStream) {
        this.options.onRemoteStream?.(this.remoteStream);
      }
    };

    peerConnection.onconnectionstatechange = () => {
      this.options.onDebug?.("connection-state", peerConnection.connectionState);
      this.options.onConnectionStateChange?.(peerConnection.connectionState);
    };

    peerConnection.oniceconnectionstatechange = () => {
      this.options.onDebug?.("ice-connection-state", peerConnection.iceConnectionState);
      this.options.onIceConnectionStateChange?.(peerConnection.iceConnectionState);
    };

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, this.localStream as MediaStream);
      });
    }

    this.peerConnection = peerConnection;
    return peerConnection;
  }

  async prepare(callType: CallType) {
    await this.ensureLocalStream(callType);
    this.ensurePeerConnection();
  }

  async createOffer() {
    const peerConnection = this.ensurePeerConnection();

    if (peerConnection.signalingState !== "stable") {
      this.options.onDebug?.("offer-skipped", peerConnection.signalingState);
      throw new Error("Call negotiation is already in progress.");
    }

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    this.options.onDebug?.("offer-created");
    return offer;
  }

  async createAnswer() {
    const peerConnection = this.ensurePeerConnection();

    if (peerConnection.signalingState !== "have-remote-offer") {
      this.options.onDebug?.("answer-skipped", peerConnection.signalingState);
      throw new Error("No remote offer is ready to answer.");
    }

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    this.options.onDebug?.("answer-created");
    return answer;
  }

  async setRemoteDescription(description: RTCSessionDescriptionInit) {
    const peerConnection = this.ensurePeerConnection();

    if (description.type === "answer") {
      if (peerConnection.signalingState === "stable") {
        this.options.onDebug?.("remote-answer-ignored", "already-stable");
        return;
      }

      if (peerConnection.signalingState !== "have-local-offer") {
        throw new Error(
          `Received an answer while the call was in an unexpected state: ${peerConnection.signalingState}`
        );
      }
    }

    if (description.type === "offer") {
      if (peerConnection.signalingState === "have-remote-offer") {
        this.options.onDebug?.("remote-offer-ignored", "offer-already-set");
        return;
      }

      if (!["stable", "have-local-offer"].includes(peerConnection.signalingState)) {
        throw new Error(
          `Received an offer while the call was in an unexpected state: ${peerConnection.signalingState}`
        );
      }
    }

    await peerConnection.setRemoteDescription(description);
    this.options.onDebug?.("remote-description-set", description.type);
    await this.flushQueuedCandidates();
  }

  async addIceCandidate(candidate: RTCIceCandidateInit) {
    const peerConnection = this.ensurePeerConnection();

    if (!peerConnection.remoteDescription) {
      this.queuedCandidates.push(candidate);
      return;
    }

    await peerConnection.addIceCandidate(candidate);
  }

  private async flushQueuedCandidates() {
    const peerConnection = this.ensurePeerConnection();

    while (this.queuedCandidates.length > 0) {
      const candidate = this.queuedCandidates.shift();

      if (candidate) {
        await peerConnection.addIceCandidate(candidate);
      }
    }
  }

  setMuted(isMuted: boolean) {
    this.localStream?.getAudioTracks().forEach((track) => {
      track.enabled = !isMuted;
    });
  }

  setVideoEnabled(isEnabled: boolean) {
    this.localStream?.getVideoTracks().forEach((track) => {
      track.enabled = isEnabled;
    });
  }

  cleanup() {
    this.peerConnection?.close();
    this.peerConnection = null;

    this.localStream?.getTracks().forEach((track) => track.stop());
    this.remoteStream?.getTracks().forEach((track) => track.stop());

    this.localStream = null;
    this.remoteStream = null;
    this.queuedCandidates = [];
  }
}

export const getDefaultCallConfiguration = () => defaultConfiguration;
