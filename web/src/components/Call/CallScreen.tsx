"use client";

import { Avatar } from "@/components/ui/avatar";
import { useEffect, useRef } from "react";
import { Mic, MicOff, PhoneOff, Video, VideoOff } from "lucide-react";
import { CallSession, CallStatus } from "@/lib/types";

type CallScreenProps = {
  call: CallSession | null;
  status: CallStatus;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isVideoOn: boolean;
  error?: string | null;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onEndCall: () => void;
};

const statusCopy: Record<CallStatus, string> = {
  idle: "Preparing call",
  calling: "Callingâ€¦",
  ringing: "Incoming callâ€¦",
  connecting: "Connectingâ€¦",
  connected: "Connected",
  ended: "Call ended",
};

export const CallScreen = ({
  call,
  status,
  localStream,
  remoteStream,
  isMuted,
  isVideoOn,
  error,
  onToggleMute,
  onToggleVideo,
  onEndCall,
}: CallScreenProps) => {
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }

    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  if (!call) {
    return null;
  }

  const peer = call.caller;
  const remoteHasVideo = Boolean(remoteStream?.getVideoTracks().length);
  const localHasVideo = Boolean(localStream?.getVideoTracks().length);

  return (
    <div className="fixed inset-0 z-[255] bg-[radial-gradient(circle_at_top,rgba(8,145,178,0.22),transparent_30%),linear-gradient(180deg,#0f172a_0%,#111827_100%)] text-white">
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {call.callType === "video" && remoteHasVideo ? (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}

      <div className="absolute inset-0 bg-black/20" />

      <div className="relative flex h-full flex-col justify-between px-5 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/65">
            {call.callType === "video" ? "Video call" : "Audio call"}
          </p>
          <h2 className="mt-4 text-3xl font-semibold">{peer.name}</h2>
          <p className="mt-2 text-sm text-white/70">{error || statusCopy[status]}</p>
        </div>

        {call.callType === "audio" || !remoteHasVideo ? (
          <div className="mx-auto flex flex-col items-center">
            <div className="relative h-32 w-32 overflow-hidden rounded-full border border-white/15 bg-white/10 shadow-[0_18px_60px_rgba(15,23,42,0.35)] sm:h-40 sm:w-40">
              <Avatar
                src={peer.avatar}
                name={peer.name}
                className="h-full w-full rounded-full"
                textClassName="text-5xl font-semibold text-white/80"
              />
            </div>
          </div>
        ) : null}

        {call.callType === "video" && localHasVideo ? (
          <div className="absolute right-5 top-24 overflow-hidden rounded-[26px] border border-white/15 bg-black/35 shadow-2xl sm:right-8 sm:top-28">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="h-36 w-24 object-cover sm:h-44 sm:w-32"
            />
            {!isVideoOn ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/55 text-xs font-medium text-white/80">
                Camera off
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="mx-auto flex w-full max-w-sm items-center justify-center gap-4 rounded-full border border-white/10 bg-white/8 px-4 py-3 backdrop-blur-md">
          <button
            type="button"
            onClick={onToggleMute}
            className={`flex h-14 w-14 items-center justify-center rounded-full transition ${
              isMuted ? "bg-amber-500 text-white" : "bg-white/12 text-white"
            }`}
            aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
          >
            {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>

          <button
            type="button"
            onClick={onEndCall}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-600 text-white transition hover:bg-rose-700"
            aria-label="End call"
          >
            <PhoneOff className="h-6 w-6" />
          </button>

          <button
            type="button"
            onClick={onToggleVideo}
            disabled={call.callType !== "video"}
            className={`flex h-14 w-14 items-center justify-center rounded-full transition ${
              call.callType !== "video"
                ? "cursor-not-allowed bg-white/8 text-white/40"
                : isVideoOn
                  ? "bg-white/12 text-white"
                  : "bg-amber-500 text-white"
            }`}
            aria-label={isVideoOn ? "Turn camera off" : "Turn camera on"}
          >
            {isVideoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </div>
  );
};

