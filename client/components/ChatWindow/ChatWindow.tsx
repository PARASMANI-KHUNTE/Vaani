"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ImagePlus,
  LoaderCircle,
  Mic,
  RefreshCcw,
  SendHorizonal,
  SmilePlus,
  Sparkles,
  Square,
  Video,
  X,
} from "lucide-react";
import { MessageBubble } from "@/components/MessageBubble/MessageBubble";
import { Chat, Message } from "@/lib/types";

type ChatWindowProps = {
  chat: Chat | null;
  messages: Message[];
  currentUserId?: string;
  isLoading: boolean;
  mediaTransfer?: {
    isUploading: boolean;
    progress: number;
    fileName: string | null;
    error?: string | null;
    canRetry?: boolean;
  };
  onSendMessage: (content: string, replyToId?: string | null) => Promise<void>;
  onSendMedia?: (input: {
    file: File;
    content?: string;
    replyToId?: string | null;
    waveform?: number[];
  }) => Promise<void>;
  onRetryMedia?: () => Promise<void>;
  onDismissMedia?: () => void;
  onTyping?: () => void;
  onDeleteMessage?: (messageId: string, scope: "me" | "everyone") => Promise<void>;
  onBack?: () => void;
  onClose?: () => void;
  isOnline?: boolean;
  typingLabel?: string | null;
};

const emojis = ["😀", "😂", "😍", "🔥", "👍", "🙏", "🎉", "💬", "😎", "❤️"];

export const ChatWindow = ({
  chat,
  messages,
  currentUserId,
  isLoading,
  mediaTransfer,
  onSendMessage,
  onSendMedia,
  onRetryMedia,
  onDismissMedia,
  onTyping,
  onDeleteMessage,
  onBack,
  onClose,
  isOnline,
  typingLabel,
}: ChatWindowProps) => {
  const [draft, setDraft] = useState("");
  const [replyTarget, setReplyTarget] = useState<Message | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSendingMedia, setIsSendingMedia] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isDragActive, setIsDragActive] = useState(false);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [recordingWaveform, setRecordingWaveform] = useState<number[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const waveformFrameRef = useRef<number | null>(null);
  const waveformSamplesRef = useRef<number[]>([]);

  useEffect(() => {
    const node = scrollContainerRef.current;

    if (node) {
      node.scrollTop = node.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }

      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());

      if (waveformFrameRef.current) {
        window.cancelAnimationFrame(waveformFrameRef.current);
      }

      void audioContextRef.current?.close();
    };
  }, []);

  useEffect(() => {
    if (!isRecording) {
      setRecordingSeconds(0);
      return undefined;
    }

    const timer = window.setInterval(() => {
      setRecordingSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isRecording]);

  const downsampleWaveform = (samples: number[], targetPoints = 32) => {
    if (!samples.length) {
      return [];
    }

    const bucketSize = Math.max(1, Math.floor(samples.length / targetPoints));
    const bars: number[] = [];

    for (let index = 0; index < samples.length; index += bucketSize) {
      const slice = samples.slice(index, index + bucketSize);
      const average = slice.reduce((total, value) => total + value, 0) / slice.length;
      bars.push(Math.max(0.12, Math.min(1, Number(average.toFixed(3)))));
    }

    return bars.slice(0, targetPoints);
  };

  const stopRecordingStream = () => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  };

  const teardownWaveformCapture = async () => {
    if (waveformFrameRef.current) {
      window.cancelAnimationFrame(waveformFrameRef.current);
      waveformFrameRef.current = null;
    }

    if (audioContextRef.current) {
      await audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

  const startWaveformCapture = async (stream: MediaStream) => {
    const AudioContextConstructor =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextConstructor) {
      return;
    }

    const audioContext = new AudioContextConstructor();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();

    analyser.fftSize = 64;
    source.connect(analyser);

    audioContextRef.current = audioContext;
    waveformSamplesRef.current = [];
    setRecordingWaveform([]);

    const data = new Uint8Array(analyser.frequencyBinCount);

    const sample = () => {
      analyser.getByteTimeDomainData(data);

      let peak = 0;
      for (const value of data) {
        const normalized = Math.abs((value - 128) / 128);
        if (normalized > peak) {
          peak = normalized;
        }
      }

      waveformSamplesRef.current.push(peak);

      if (waveformSamplesRef.current.length > 120) {
        waveformSamplesRef.current.shift();
      }

      setRecordingWaveform(downsampleWaveform(waveformSamplesRef.current, 24));
      waveformFrameRef.current = window.requestAnimationFrame(sample);
    };

    waveformFrameRef.current = window.requestAnimationFrame(sample);
  };

  const handleSendFile = async (file: File | null, waveform?: number[]) => {
    if (!file || !onSendMedia) {
      return;
    }

    setIsSendingMedia(true);
    setRecordingError(null);

    try {
      await onSendMedia({
        file,
        content: draft.trim() || undefined,
        replyToId: replyTarget?._id || null,
        waveform,
      });
      setDraft("");
      setReplyTarget(null);
    } finally {
      setIsSendingMedia(false);
    }
  };

  const startVoiceRecording = async () => {
    if (!onSendMedia || isRecording) {
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setRecordingError("Voice notes are not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      const chunks: BlobPart[] = [];

      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      await startWaveformCapture(stream);

      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      });

      recorder.addEventListener("stop", async () => {
        stopRecordingStream();
        mediaRecorderRef.current = null;
        await teardownWaveformCapture();

        if (!chunks.length) {
          setIsRecording(false);
          setRecordingWaveform([]);
          return;
        }

        const blob = new Blob(chunks, { type: "audio/webm" });
        const file = new File([blob], `voice-note-${Date.now()}.webm`, { type: "audio/webm" });
        const waveform = downsampleWaveform(waveformSamplesRef.current);
        waveformSamplesRef.current = [];
        setIsRecording(false);
        setRecordingWaveform([]);
        await handleSendFile(file, waveform);
      });

      recorder.start();
      setRecordingError(null);
      setIsRecording(true);
    } catch (error) {
      setRecordingError(
        error instanceof Error ? error.message : "Microphone access is required for voice notes."
      );
    }
  };

  const stopVoiceRecording = () => {
    mediaRecorderRef.current?.stop();
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const secs = (seconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };

  const submitMessage = async () => {
    const trimmedDraft = draft.trim();

    if (!trimmedDraft) {
      return;
    }

    setDraft("");
    await onSendMessage(trimmedDraft, replyTarget?._id || null);
    setReplyTarget(null);
  };

  if (!chat) {
    return (
      <section className="surface-elevated flex h-full min-h-[480px] items-center justify-center rounded-[36px] p-8">
        <div className="max-w-sm text-center animate-fade-up">
          <div className="relative mx-auto mb-6">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-200/30 to-lagoon/20 blur-2xl" />
            <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-white/60 bg-gradient-to-br from-lagoon/10 to-ember/10 shadow-lg">
              <Sparkles className="h-10 w-10 text-lagoon/60" />
            </div>
          </div>
          <h2 className="soft-heading text-3xl font-semibold text-ink">Start a conversation</h2>
          <p className="mt-4 text-base leading-7 text-ink/55">
            Select a conversation from the sidebar to start messaging. 
            Your messages will appear here with delivery status and timestamps.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      className="surface-panel relative flex h-full min-h-[480px] flex-col overflow-hidden rounded-[34px]"
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragActive(true);
      }}
      onDragLeave={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
          return;
        }
        setIsDragActive(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragActive(false);
        const file = event.dataTransfer.files?.[0] || null;
        void handleSendFile(file);
      }}
    >
      {isDragActive ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-lagoon/10 backdrop-blur-sm">
          <div className="rounded-[28px] border border-lagoon/20 bg-white/90 px-8 py-10 text-center shadow-panel">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-lagoon/70">Drop media</p>
            <h3 className="soft-heading mt-3 text-3xl font-semibold text-ink">Send image, video, or voice</h3>
            <p className="mt-2 text-sm text-ink/60">Release the file to attach it to this conversation.</p>
          </div>
        </div>
      ) : null}

      <header className="flex items-center gap-4 border-b border-ink/6 bg-gradient-to-r from-white/60 to-white/30 px-5 py-3.5">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="btn-secondary !py-2.5 !px-3 lg:hidden"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        ) : null}
        <div className="warm-outline relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl bg-sand">
          {chat.otherParticipant?.avatar ? (
            <Image
              src={chat.otherParticipant.avatar}
              alt={chat.otherParticipant.name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-sand to-sand/70 text-lg font-semibold text-ink/50">
              {(chat.otherParticipant?.name || "?").charAt(0).toUpperCase()}
            </div>
          )}
          <span
            className={`absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white transition-colors ${
              isOnline ? "bg-emerald-400" : "bg-slate-300"
            }`}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-base font-semibold text-ink">
              {chat.otherParticipant?.name || "Unknown user"}
            </h2>
            {isOnline && (
              <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                Online
              </span>
            )}
          </div>
          <p className="text-sm text-ink/50">
            {typingLabel ? (
              <span className="text-lagoon/80 italic">{typingLabel}</span>
            ) : isOnline ? (
              "Active now"
            ) : (
              "Last seen recently"
            )}
          </p>
        </div>

        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary ml-auto !py-2.5 !px-3 text-ink/50 hover:text-ink"
            aria-label="Close chat"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </header>

      <div
        ref={scrollContainerRef}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-paper-grid bg-[size:18px_18px] px-5 py-5 [background-color:rgba(255,253,249,0.4)]"
      >
        {isLoading
          ? Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-16 animate-pulse rounded-[22px] bg-white/70" />
            ))
          : messages.map((message) => {
              const senderId =
                typeof message.senderId === "string" ? message.senderId : message.senderId._id;

              return (
                <MessageBubble
                  key={message._id}
                  message={message}
                  isOwnMessage={senderId === currentUserId}
                  onReply={(entry) => setReplyTarget(entry)}
                  onDelete={(entry, scope) => void onDeleteMessage?.(entry._id, scope)}
                />
              );
            })}
      </div>

      <div className="border-t border-ink/6 bg-gradient-to-br from-white/80 to-shell/30 p-4">
        {mediaTransfer?.isUploading ? (
          <div className="mb-3 rounded-2xl border border-lagoon/10 bg-white/80 px-4 py-3 shadow-soft">
            <div className="flex items-center justify-between gap-3 text-sm text-ink">
              <div className="flex items-center gap-2">
                <LoaderCircle className="h-4 w-4 animate-spin text-lagoon" />
                <span className="font-medium">
                  Uploading {mediaTransfer.fileName ? `"${mediaTransfer.fileName}"` : "attachment"}
                </span>
              </div>
              <span className="text-xs text-ink/55">{mediaTransfer.progress}%</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-shell/80">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,#155e75,#cb6a16)] transition-all duration-200"
                style={{ width: `${mediaTransfer.progress}%` }}
              />
            </div>
          </div>
        ) : null}

        {mediaTransfer?.error ? (
          <div className="mb-3 rounded-2xl border border-red-200 bg-red-50/90 px-4 py-3 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-500">Upload issue</p>
                <p className="mt-1 text-sm text-red-700">
                  {mediaTransfer.error}
                  {mediaTransfer.fileName ? ` (${mediaTransfer.fileName})` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {mediaTransfer.canRetry ? (
                  <button
                    type="button"
                    onClick={() => void onRetryMedia?.()}
                    className="inline-flex items-center gap-2 rounded-full bg-red-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-700"
                  >
                    <RefreshCcw className="h-3.5 w-3.5" />
                    Retry
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => onDismissMedia?.()}
                  className="rounded-full border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-white"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {isRecording ? (
          <div className="mb-3 rounded-2xl border border-red-200 bg-red-50/80 px-4 py-3 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-500">Live recording</p>
                <p className="mt-1 text-sm font-medium text-red-700">REC {formatRecordingTime(recordingSeconds)}</p>
              </div>
              <div className="flex h-12 flex-1 items-end gap-1 rounded-2xl bg-white/70 px-3 py-2">
                {(recordingWaveform.length
                  ? recordingWaveform
                  : Array.from({ length: 24 }, () => 0.12)
                ).map((bar, index) => (
                  <span
                    key={`${bar}-${index}`}
                    className="w-full rounded-full bg-[linear-gradient(180deg,#ef4444,#f97316)] transition-all duration-150"
                    style={{ height: `${Math.max(14, Math.round(bar * 100))}%` }}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {recordingError ? (
          <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-700 shadow-soft">
            {recordingError}
          </div>
        ) : null}

        {replyTarget ? (
          <div className="mb-3 flex items-start justify-between rounded-2xl border border-ink/8 bg-white/80 px-4 py-3 shadow-soft">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lagoon/70">Replying to</p>
              <p className="mt-1 text-sm text-ink">
                {typeof replyTarget.senderId === "string" ? "Message" : replyTarget.senderId.name}
              </p>
              <p className="mt-1 line-clamp-2 text-xs text-ink/60">{replyTarget.content}</p>
            </div>
            <button type="button" onClick={() => setReplyTarget(null)} className="text-ink/55">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        <div className="flex items-end gap-2.5 rounded-[28px] border border-ink/8 bg-white/90 px-4 py-3 shadow-soft transition-all focus-within:border-lagoon/30 focus-within:shadow-md">
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0] || null;
              void handleSendFile(file);
              event.currentTarget.value = "";
            }}
          />
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0] || null;
              void handleSendFile(file);
              event.currentTarget.value = "";
            }}
          />

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowEmojiPicker((value) => !value)}
              className="btn-secondary !py-2.5 !px-2.5"
            >
              <SmilePlus className="h-4 w-4" />
            </button>
            {showEmojiPicker ? (
              <div className="absolute bottom-14 left-0 z-20 w-56 rounded-2xl border border-ink/8 bg-white/98 p-3 shadow-lg animate-fade-in">
                <div className="grid grid-cols-5 gap-1.5">
                  {emojis.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        setDraft((currentDraft) => `${currentDraft}${emoji}`);
                        setShowEmojiPicker(false);
                      }}
                      className="rounded-xl bg-shell/60 px-2 py-2 text-xl transition-all hover:bg-shell hover:scale-110"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="btn-secondary !py-2.5 !px-2.5"
            aria-label="Send image"
            disabled={isSendingMedia || mediaTransfer?.isUploading}
          >
            <ImagePlus className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => videoInputRef.current?.click()}
            className="btn-secondary !py-2.5 !px-2.5"
            aria-label="Send video"
            disabled={isSendingMedia || mediaTransfer?.isUploading}
          >
            <Video className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              if (isRecording) {
                stopVoiceRecording();
              } else {
                void startVoiceRecording();
              }
            }}
            className={`btn-secondary !py-2.5 !px-2.5 ${
              isRecording ? "!bg-red-500 !text-white !border-red-400" : ""
            }`}
            aria-label={isRecording ? "Stop recording voice note" : "Record voice note"}
            disabled={isSendingMedia || mediaTransfer?.isUploading}
          >
            {isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>

          <textarea
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              onTyping?.();
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void submitMessage();
              }
            }}
            rows={1}
            placeholder={
              isRecording
                ? "Recording voice note..."
                : mediaTransfer?.isUploading || isSendingMedia
                  ? "Uploading media..."
                  : "Type a message"
            }
            className="max-h-32 min-h-[28px] flex-1 resize-none bg-transparent text-sm text-ink outline-none placeholder:text-ink/40"
            disabled={isSendingMedia || mediaTransfer?.isUploading}
          />

          <button
            type="button"
            onClick={() => void submitMessage()}
            className="btn-primary !h-11 !w-11 !rounded-full !p-0"
            disabled={isSendingMedia || mediaTransfer?.isUploading}
          >
            <SendHorizonal className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
};
