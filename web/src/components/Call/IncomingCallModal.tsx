"use client";

import { Avatar } from "@/components/ui/avatar";
import { Phone, PhoneOff, Video } from "lucide-react";
import { CallSession } from "@/lib/types";

type IncomingCallModalProps = {
  call: CallSession | null;
  onAccept: () => void;
  onReject: () => void;
};

export const IncomingCallModal = ({
  call,
  onAccept,
  onReject,
}: IncomingCallModalProps) => {
  if (!call) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[260] flex items-center justify-center bg-ink/45 dark:bg-black/60 px-4 backdrop-blur-sm">
      <div className="surface-panel w-full max-w-md rounded-[32px] px-6 py-7 shadow-[0_28px_90px_rgba(15,23,42,0.26)]">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-lagoon/70">
          Incoming {call.callType} call
        </p>
        <div className="mt-5 flex items-center gap-4">
          <div className="relative h-16 w-16 overflow-hidden rounded-3xl bg-shell dark:bg-slate-700">
            <Avatar
              src={call.caller.avatar}
              name={call.caller.name}
              className="h-full w-full rounded-3xl"
              textClassName="text-2xl font-semibold text-white"
            />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-xl font-semibold text-ink dark:text-slate-100">{call.caller.name}</h2>
            <p className="mt-1 flex items-center gap-2 text-sm text-ink/55 dark:text-slate-400">
              {call.callType === "video" ? <Video className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
              <span>{call.callType === "video" ? "Video call" : "Audio call"}</span>
            </p>
          </div>
        </div>

        <p className="mt-6 text-sm leading-6 text-ink/60 dark:text-slate-400">
          This request will expire automatically if you do not answer within 30 seconds.
        </p>

        <div className="mt-7 flex items-center gap-3">
          <button
            type="button"
            onClick={onReject}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-rose-200 dark:border-rose-800/40 bg-rose-50 dark:bg-rose-900/20 px-4 py-3 text-sm font-semibold text-rose-600 dark:text-rose-400 transition hover:bg-rose-100"
          >
            <PhoneOff className="h-4 w-4" />
            Reject
          </button>
          <button
            type="button"
            onClick={onAccept}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            <Phone className="h-4 w-4" />
            Accept
          </button>
        </div>
      </div>
    </div>
  );
};

