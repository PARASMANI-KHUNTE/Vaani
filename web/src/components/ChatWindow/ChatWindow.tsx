"use client";

import { Avatar } from "@/components/ui/avatar";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Crown,
  Copy,
  ImagePlus,
  Link2,
  Mic,
  Paperclip,
  Phone,
  RefreshCcw,
  SendHorizonal,
  Shield,
  SmilePlus,
  Square,
  UserMinus,
  UserPlus,
  Users,
  Video,
  X,
} from "lucide-react";
import { MessageBubble } from "@/components/MessageBubble/MessageBubble";
import { BackendUser, CallStatus, Chat, Message } from "@/lib/types";
import { cn, formatDateSeparator } from "@/lib/utils";

type ChatWindowProps = {
  chat: Chat | null;
  messages: Message[];
  currentUserId?: string;
  isLoading: boolean;
  mediaTransfer?: {
    isUploading: boolean;
    progress: number;
    fileName: string | null;
    fileType?: string | null;
    error?: string | null;
    canRetry?: boolean;
    canCancel?: boolean;
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
  onCancelMedia?: () => void;
  onTyping?: () => void;
  onDeleteMessage?: (messageId: string, scope: "me" | "everyone") => Promise<void>;
  onReact?: (messageId: string, emoji: string) => Promise<void>;
  onBack?: () => void;
  onClose?: () => void;
  isOnline?: boolean;
  typingLabel?: string | null;
  onStartAudioCall?: () => void;
  onStartVideoCall?: () => void;
  onOpenUserProfile?: (user: BackendUser) => void;
  groupDirectoryUsers?: BackendUser[];
  onGroupRename?: (chatId: string, groupName: string) => Promise<void>;
  onGroupAvatarUpdate?: (chatId: string, groupAvatar: string | null) => Promise<void>;
  onGroupAddMembers?: (chatId: string, memberIds: string[]) => Promise<void>;
  onGroupRemoveMember?: (chatId: string, memberId: string) => Promise<void>;
  onGroupPromoteAdmin?: (chatId: string, memberId: string) => Promise<void>;
  onGroupDemoteAdmin?: (chatId: string, memberId: string) => Promise<void>;
  onGroupTransferOwnership?: (chatId: string, nextOwnerId: string) => Promise<void>;
  onGroupLeave?: (chatId: string) => Promise<void>;
  onGroupCreateInviteLink?: (
    chatId: string,
    options?: { expiresInHours?: number; maxUses?: number }
  ) => Promise<{ token: string; expiresAt: string; maxUses: number } | null>;
  onOpenGroupInfo?: (chatId: string) => void;
  callStatus?: CallStatus;
};

const emojis = ["😀", "😂", "😍", "🔥", "👍", "🙏", "🎉", "💬", "😎", "❤️"];

const TypingDots = () => (
  <div className="typing-indicator inline-flex items-center gap-1">
    <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
    <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
    <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
  </div>
);

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
  onCancelMedia,
  onTyping,
  onDeleteMessage,
  onReact,
  onBack,
  onClose,
  isOnline,
  typingLabel,
  onStartAudioCall,
  onStartVideoCall,
  onOpenUserProfile,
  groupDirectoryUsers = [],
  onGroupRename,
  onGroupAvatarUpdate,
  onGroupAddMembers,
  onGroupRemoveMember,
  onGroupPromoteAdmin,
  onGroupDemoteAdmin,
  onGroupTransferOwnership,
  onGroupLeave,
  onGroupCreateInviteLink,
  onOpenGroupInfo,
  callStatus = "idle",
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
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isGroupPanelOpen, setIsGroupPanelOpen] = useState(false);
  const [groupNameDraft, setGroupNameDraft] = useState("");
  const [groupAvatarDraft, setGroupAvatarDraft] = useState("");
  const [memberIdsToAdd, setMemberIdsToAdd] = useState<string[]>([]);
  const [inviteExpiryHours, setInviteExpiryHours] = useState("168");
  const [inviteMaxUses, setInviteMaxUses] = useState("0");
  const [groupInviteUrl, setGroupInviteUrl] = useState<string | null>(null);
  const [groupActionBusy, setGroupActionBusy] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
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

  useEffect(() => {
    if (!chat?.isGroup) {
      setIsGroupPanelOpen(false);
      return;
    }
    setGroupNameDraft(chat.groupName || "");
    setGroupAvatarDraft(chat.groupAvatar || "");
    setMemberIdsToAdd([]);
    setGroupInviteUrl(null);
  }, [chat?._id, chat?.isGroup, chat?.groupName, chat?.groupAvatar]);

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
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="surface-elevated flex h-full min-h-0 items-center justify-center rounded-[28px] p-6 sm:rounded-[36px] sm:p-8"
      >
        <div className="max-w-sm text-center animate-fade-up">
          <div className="relative mx-auto mb-8">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-300/15 to-indigo-500/20 blur-3xl" />
            <div className="relative flex h-28 w-28 items-center justify-center">
              <svg className="h-28 w-28 text-slate-600/40" viewBox="0 0 120 120" fill="none">
                <rect x="10" y="25" width="60" height="45" rx="12" stroke="currentColor" strokeWidth="2.5" fill="none" />
                <rect x="50" y="50" width="60" height="45" rx="12" stroke="currentColor" strokeWidth="2.5" fill="none" opacity="0.5" />
                <circle cx="30" cy="47" r="3" fill="currentColor" opacity="0.4" />
                <circle cx="42" cy="47" r="3" fill="currentColor" opacity="0.6" />
                <circle cx="54" cy="47" r="3" fill="currentColor" opacity="0.8" />
                <path d="M25 70 L35 80 L50 65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.3" />
              </svg>
            </div>
          </div>
          <h2 className="soft-heading text-2xl font-semibold text-ink dark:text-slate-200">Select a conversation</h2>
          <p className="mt-3 text-sm leading-7 text-ink/55 dark:text-slate-400/80">
            Choose a conversation from the sidebar to start messaging.
            Your messages will appear here with delivery status and timestamps.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white/65 px-4 py-2 dark:border-white/5 dark:bg-white/5">
            <kbd className="rounded-md border border-ink/15 bg-white/80 px-1.5 py-0.5 text-[10px] font-medium text-ink/50 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">/</kbd>
            <span className="text-xs text-ink/55 dark:text-slate-400">to search</span>
          </div>
        </div>
      </motion.section>
    );
  }

  const chatTitle = chat.isGroup
    ? chat.groupName || `Group (${chat.participants.length})`
    : chat.otherParticipant?.name || "Unknown user";
  const chatAvatar = chat.isGroup ? chat.groupAvatar : chat.otherParticipant?.avatar;
  const canStartDirectCall = !chat.isGroup && Boolean(chat.otherParticipant);
  const participantIds = new Set(chat.participants.map((participant) => participant._id));
  const adminIdSet = new Set(chat.adminIds || []);
  const isGroupOwner = Boolean(chat.isGroup && currentUserId && chat.createdBy === currentUserId);
  const isGroupAdmin = Boolean(chat.isGroup && currentUserId && adminIdSet.has(currentUserId));
  const addableUsers = groupDirectoryUsers.filter((user) => !participantIds.has(user._id));

  const toggleUserForAddition = (userId: string) => {
    setMemberIdsToAdd((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]
    );
  };

  const runGroupAction = async (actionKey: string, action: () => Promise<void>) => {
    setGroupActionBusy(actionKey);
    try {
      await action();
    } finally {
      setGroupActionBusy(null);
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="surface-panel depth-card relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl sm:rounded-[34px]"
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
      <AnimatePresence>
        {isDragActive ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex items-center justify-center bg-cyan-500/10 backdrop-blur-sm"
          >
            <div className="rounded-[28px] border border-cyan-300/30 bg-white/90 px-8 py-10 text-center shadow-panel dark:bg-slate-900/75">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300/90">Drop media</p>
              <h3 className="soft-heading mt-3 text-3xl font-semibold text-ink dark:text-slate-100">Send image, video, or file</h3>
              <p className="mt-2 text-sm text-ink/60 dark:text-slate-300/75">Release the file to attach it to this conversation.</p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <header className="flex items-center gap-2.5 border-b border-ink/10 bg-gradient-to-r from-white/75 via-sky-50/55 to-teal-50/45 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3 md:gap-4 md:px-5 md:py-3.5 dark:border-white/10 dark:bg-gradient-to-r dark:from-slate-900/70 dark:via-indigo-950/25 dark:to-slate-900/60">
        {onBack ? (
          <button type="button" onClick={onBack} className="btn-secondary !px-2.5 !py-2.5 lg:hidden">
            <ArrowLeft className="h-4 w-4" />
          </button>
        ) : null}
        <div className="relative h-11 w-11 shrink-0 sm:h-12 sm:w-12">
          <button
            type="button"
            onClick={() => {
              if (!chat.isGroup && chat.otherParticipant && onOpenUserProfile) {
                onOpenUserProfile(chat.otherParticipant);
              }
            }}
            className={cn(!chat.isGroup && "rounded-2xl")}
            title={chat.isGroup ? "Group chat" : "Open profile"}
          >
            <Avatar
              src={chatAvatar}
              name={chatTitle}
              className="warm-outline h-full w-full rounded-2xl"
              textClassName="text-lg font-semibold"
            />
          </button>
          {!chat.isGroup ? (
            <span
              className={`absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-slate-900 transition-colors ${
                isOnline ? "bg-emerald-400" : "bg-slate-500"
              }`}
            />
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (!chat.isGroup && chat.otherParticipant && onOpenUserProfile) {
                  onOpenUserProfile(chat.otherParticipant);
                }
              }}
              className={cn(
                "truncate text-left text-sm font-semibold text-ink dark:text-slate-100 sm:text-base",
                !chat.isGroup && "hover:text-lagoon"
              )}
            >
              {chatTitle}
            </button>
            {isOnline && (
              <span className="shrink-0 rounded-full border border-emerald-300/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                Online
              </span>
            )}
          </div>
          <p className="text-xs text-ink/55 dark:text-slate-300/70 sm:text-sm">
            {typingLabel ? (
              <span className="inline-flex items-center gap-2 text-cyan-300 italic">
                <TypingDots /> {typingLabel}
              </span>
            ) : isOnline ? (
              "Active now"
            ) : (
              "Last seen recently"
            )}
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onStartAudioCall}
            disabled={!onStartAudioCall || !canStartDirectCall || !["idle", "ended"].includes(callStatus)}
            className="btn-secondary !px-2.5 !py-2.5 text-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Start audio call"
            title={chat.isGroup ? "Group calling arrives in the next phase" : "Audio call (Ctrl+Shift+A)"}
          >
            <Phone className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onStartVideoCall}
            disabled={!onStartVideoCall || !canStartDirectCall || !["idle", "ended"].includes(callStatus)}
            className="btn-secondary !px-2.5 !py-2.5 text-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Start video call"
            title={chat.isGroup ? "Group video calling arrives in the next phase" : "Video call (Ctrl+Shift+V)"}
          >
            <Video className="h-4 w-4" />
          </button>
          {chat.isGroup ? (
            <button
              type="button"
              onClick={() => setIsGroupPanelOpen((open) => !open)}
              className={cn(
                "btn-secondary !px-2.5 !py-2.5",
                isGroupPanelOpen && "!border-lagoon/30 !bg-lagoon/10 !text-lagoon"
              )}
              aria-label="Group info"
              title="Group info"
            >
              <Users className="h-4 w-4" />
            </button>
          ) : null}

          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary !px-2.5 !py-2.5 text-ink/45 hover:text-ink dark:text-slate-300 dark:hover:text-white"
              aria-label="Close chat"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </header>

      {chat.isGroup && isGroupPanelOpen ? (
        <div className="border-b border-ink/10 bg-white/75 px-3 py-3 dark:border-white/10 dark:bg-slate-900/70 sm:px-5">
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-2xl border border-ink/10 bg-white/75 p-3 dark:border-white/10 dark:bg-white/5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lagoon/70">Group Profile</p>
              <div className="mt-2 space-y-2">
                <input
                  value={groupNameDraft}
                  onChange={(event) => setGroupNameDraft(event.target.value)}
                  placeholder="Group name"
                  className="w-full rounded-xl border border-ink/10 bg-white/80 px-3 py-2 text-sm outline-none dark:border-white/10 dark:bg-slate-900/70"
                  disabled={!isGroupAdmin}
                />
                <input
                  value={groupAvatarDraft}
                  onChange={(event) => setGroupAvatarDraft(event.target.value)}
                  placeholder="Group avatar URL"
                  className="w-full rounded-xl border border-ink/10 bg-white/80 px-3 py-2 text-sm outline-none dark:border-white/10 dark:bg-slate-900/70"
                  disabled={!isGroupAdmin}
                />
                {isGroupAdmin ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        runGroupAction("rename", async () => {
                          if (!onGroupRename) return;
                          await onGroupRename(chat._id, groupNameDraft.trim());
                        })
                      }
                      disabled={groupActionBusy !== null}
                      className="rounded-full bg-lagoon/10 px-3 py-1.5 text-xs font-semibold text-lagoon disabled:opacity-60"
                    >
                      Save Name
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        runGroupAction("avatar", async () => {
                          if (!onGroupAvatarUpdate) return;
                          await onGroupAvatarUpdate(chat._id, groupAvatarDraft.trim() || null);
                        })
                      }
                      disabled={groupActionBusy !== null}
                      className="rounded-full bg-lagoon/10 px-3 py-1.5 text-xs font-semibold text-lagoon disabled:opacity-60"
                    >
                      Save Avatar
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-2xl border border-ink/10 bg-white/75 p-3 dark:border-white/10 dark:bg-white/5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lagoon/70">Add Members</p>
              <div className="mt-2 max-h-36 space-y-2 overflow-y-auto pr-1">
                {addableUsers.length === 0 ? (
                  <p className="text-xs text-ink/50 dark:text-slate-400">No users available to add.</p>
                ) : (
                  addableUsers.map((user) => (
                    <label key={user._id} className="flex cursor-pointer items-center gap-2 rounded-xl border border-ink/8 px-2 py-1.5 text-sm dark:border-white/8">
                      <input
                        type="checkbox"
                        checked={memberIdsToAdd.includes(user._id)}
                        onChange={() => toggleUserForAddition(user._id)}
                        disabled={!isGroupAdmin}
                      />
                      <span className="truncate">{user.name}</span>
                    </label>
                  ))
                )}
              </div>
              {isGroupAdmin ? (
                <button
                  type="button"
                  onClick={() =>
                    runGroupAction("add-members", async () => {
                      if (!onGroupAddMembers || memberIdsToAdd.length === 0) return;
                      await onGroupAddMembers(chat._id, memberIdsToAdd);
                      setMemberIdsToAdd([]);
                    })
                  }
                  disabled={groupActionBusy !== null || memberIdsToAdd.length === 0}
                  className="mt-2 inline-flex items-center gap-1 rounded-full bg-lagoon/10 px-3 py-1.5 text-xs font-semibold text-lagoon disabled:opacity-60"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Add Selected
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-3 rounded-2xl border border-ink/10 bg-white/75 p-3 dark:border-white/10 dark:bg-white/5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lagoon/70">Invite Link</p>
            <p className="mt-1 text-xs text-ink/55 dark:text-slate-400">
              Share this link so people can join this group.
            </p>
            {isGroupAdmin ? (
              <div className="mt-3 space-y-2">
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="space-y-1">
                    <span className="text-[11px] text-ink/55 dark:text-slate-400">Expires (hours)</span>
                    <input
                      value={inviteExpiryHours}
                      onChange={(event) => setInviteExpiryHours(event.target.value)}
                      className="w-full rounded-xl border border-ink/10 bg-white/80 px-3 py-2 text-sm outline-none dark:border-white/10 dark:bg-slate-900/70"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[11px] text-ink/55 dark:text-slate-400">Max uses (0 = unlimited)</span>
                    <input
                      value={inviteMaxUses}
                      onChange={(event) => setInviteMaxUses(event.target.value)}
                      className="w-full rounded-xl border border-ink/10 bg-white/80 px-3 py-2 text-sm outline-none dark:border-white/10 dark:bg-slate-900/70"
                    />
                  </label>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      runGroupAction("invite-link", async () => {
                        if (!onGroupCreateInviteLink) return;
                        const invite = await onGroupCreateInviteLink(chat._id, {
                          expiresInHours: Number(inviteExpiryHours) || 168,
                          maxUses: Number(inviteMaxUses) || 0,
                        });
                        if (!invite) return;
                        const nextUrl = `${window.location.origin}/groups/join/${encodeURIComponent(invite.token)}`;
                        setGroupInviteUrl(nextUrl);
                      })
                    }
                    disabled={groupActionBusy !== null}
                    className="inline-flex items-center gap-1 rounded-full bg-lagoon/10 px-3 py-1.5 text-xs font-semibold text-lagoon disabled:opacity-60"
                  >
                    <Link2 className="h-3.5 w-3.5" />
                    Generate Link
                  </button>
                  {groupInviteUrl ? (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(groupInviteUrl);
                        } catch {
                          window.prompt("Copy invite link:", groupInviteUrl);
                        }
                      }}
                      className="inline-flex items-center gap-1 rounded-full bg-ink/10 px-3 py-1.5 text-xs font-semibold text-ink/70 dark:text-slate-300"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy Link
                    </button>
                  ) : null}
                </div>
                {groupInviteUrl ? (
                  <p className="break-all rounded-xl border border-ink/10 bg-white/80 px-3 py-2 text-xs text-ink/70 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-300">
                    {groupInviteUrl}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="mt-2 text-xs text-ink/55 dark:text-slate-400">
                Only admins can generate or rotate invite links.
              </p>
            )}
          </div>

          <div className="mt-3 rounded-2xl border border-ink/10 bg-white/75 p-3 dark:border-white/10 dark:bg-white/5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lagoon/70">Members</p>
            <div className="mt-2 max-h-52 space-y-2 overflow-y-auto pr-1">
              {chat.participants.map((participant) => {
                const isOwner = chat.createdBy === participant._id;
                const isAdmin = adminIdSet.has(participant._id);
                const isMe = participant._id === currentUserId;
                return (
                  <div
                    key={participant._id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-ink/8 px-2.5 py-2 text-xs dark:border-white/8"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink dark:text-slate-100">{participant.name}{isMe ? " (You)" : ""}</p>
                      <div className="mt-1 flex items-center gap-1.5">
                        {isOwner ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                            <Crown className="h-3 w-3" />
                            Owner
                          </span>
                        ) : null}
                        {isAdmin ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-lagoon/10 px-2 py-0.5 text-[10px] font-semibold text-lagoon">
                            <Shield className="h-3 w-3" />
                            Admin
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {isGroupOwner && !isOwner && !isAdmin ? (
                        <button
                          type="button"
                          onClick={() =>
                            runGroupAction(`promote-${participant._id}`, async () => {
                              if (!onGroupPromoteAdmin) return;
                              await onGroupPromoteAdmin(chat._id, participant._id);
                            })
                          }
                          className="rounded-full bg-lagoon/10 px-2.5 py-1 text-[10px] font-semibold text-lagoon"
                        >
                          Promote
                        </button>
                      ) : null}
                      {isGroupOwner && !isOwner && isAdmin ? (
                        <button
                          type="button"
                          onClick={() =>
                            runGroupAction(`demote-${participant._id}`, async () => {
                              if (!onGroupDemoteAdmin) return;
                              await onGroupDemoteAdmin(chat._id, participant._id);
                            })
                          }
                          className="rounded-full bg-ink/10 px-2.5 py-1 text-[10px] font-semibold text-ink/70 dark:text-slate-300"
                        >
                          Demote
                        </button>
                      ) : null}
                      {isGroupOwner && !isOwner ? (
                        <button
                          type="button"
                          onClick={() =>
                            runGroupAction(`transfer-${participant._id}`, async () => {
                              if (!onGroupTransferOwnership) return;
                              await onGroupTransferOwnership(chat._id, participant._id);
                            })
                          }
                          className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-semibold text-amber-700"
                        >
                          Transfer Owner
                        </button>
                      ) : null}
                      {isGroupAdmin && !isOwner && !isMe ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (!window.confirm(`Remove ${participant.name} from group?`)) return;
                            void runGroupAction(`remove-${participant._id}`, async () => {
                              if (!onGroupRemoveMember) return;
                              await onGroupRemoveMember(chat._id, participant._id);
                            });
                          }}
                          className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-[10px] font-semibold text-red-700"
                        >
                          <UserMinus className="h-3 w-3" />
                          Remove
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap justify-end gap-2">
              {onOpenGroupInfo && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenGroupInfo(chat._id);
                    setIsGroupPanelOpen(false);
                  }}
                  className="inline-flex items-center gap-1 rounded-full bg-[linear-gradient(135deg,#155e75,#1d6a81)] px-3 py-1.5 text-xs font-semibold text-white"
                >
                  View Full Info
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (!onGroupLeave || !window.confirm("Leave this group?")) {
                    return;
                  }
                  void runGroupAction("leave-group", async () => {
                    await onGroupLeave(chat._id);
                    setIsGroupPanelOpen(false);
                  });
                }}
                className="rounded-full bg-red-600 px-3 py-1.5 text-xs font-semibold text-white"
              >
                Leave Group
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div
        ref={scrollContainerRef}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-paper-grid bg-[size:18px_18px] px-3 py-4 [background-color:rgba(255,255,255,0.42)] dark:[background-color:rgba(8,14,24,0.5)] sm:px-5 sm:py-5"
      >
        {isLoading
          ? Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-16 animate-pulse rounded-[22px] bg-slate-700/70" />
            ))
          : messages.map((message, index) => {
              const senderId = typeof message.senderId === "string" ? message.senderId : message.senderId._id;
              const prevMessage = index > 0 ? messages[index - 1] : null;
              const showDateSeparator = !prevMessage ||
                formatDateSeparator(prevMessage.createdAt) !== formatDateSeparator(message.createdAt);

              return (
                <div key={message._id}>
                  {showDateSeparator && (
                    <div className="my-4 flex items-center gap-3">
                      <div className="h-px flex-1 bg-ink/10 dark:bg-white/5" />
                      <span className="shrink-0 rounded-full border border-ink/10 bg-white/75 px-3 py-1 text-[11px] font-medium text-ink/55 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
                        {formatDateSeparator(message.createdAt)}
                      </span>
                      <div className="h-px flex-1 bg-ink/10 dark:bg-white/5" />
                    </div>
                  )}
                  <MessageBubble
                    message={message}
                    isOwnMessage={senderId === currentUserId}
                    currentUserId={currentUserId}
                    showSenderName={!!chat?.groupName}
                    onReply={(entry) => setReplyTarget(entry)}
                    onDelete={(entry, scope) => {
                      if (entry.optimistic) {
                        return;
                      }
                      void onDeleteMessage?.(entry._id, scope);
                    }}
                    onReact={(entry, emoji) => {
                      void onReact?.(entry._id, emoji);
                    }}
                  />
                </div>
              );
            })}
      </div>

      <div className="border-t border-ink/10 bg-gradient-to-br from-white/72 to-sky-50/52 p-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] dark:border-white/10 dark:bg-gradient-to-br dark:from-slate-900/80 dark:to-indigo-950/20 sm:p-4">
        {mediaTransfer?.isUploading ? (
          <div className="mb-3 rounded-2xl border border-cyan-300/15 bg-white/75 px-4 py-3 shadow-soft dark:bg-slate-900/70">
            <div className="flex items-center justify-between gap-3 text-sm text-ink dark:text-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/15">
                  {mediaTransfer.fileType === "video" ? (
                    <Video className="h-4 w-4 text-cyan-300" />
                  ) : mediaTransfer.fileType === "file" ? (
                    <Paperclip className="h-4 w-4 text-cyan-300" />
                  ) : (
                    <ImagePlus className="h-4 w-4 text-cyan-300" />
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="font-medium">
                    {mediaTransfer.fileType === "video"
                      ? "Uploading video"
                      : mediaTransfer.fileType === "file"
                        ? "Uploading file"
                        : "Uploading image"}
                  </span>
                  <span className="max-w-[180px] truncate text-xs text-ink/55 dark:text-slate-300/70">
                    {mediaTransfer.fileName || "attachment"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-ink/55 dark:text-slate-300/75">{mediaTransfer.progress}%</span>
                {mediaTransfer.canCancel && (
                  <button
                    type="button"
                    onClick={() => onCancelMedia?.()}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-ink/5 text-ink/50 transition hover:bg-red-500/20 hover:text-red-300 dark:bg-white/10 dark:text-slate-300"
                    title="Cancel upload"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-700/80">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-200"
                style={{ width: `${mediaTransfer.progress}%` }}
              />
            </div>
          </div>
        ) : null}

        {mediaTransfer?.error ? (
          <div className="mb-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 shadow-soft">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-300">Upload issue</p>
                <p className="mt-1 text-sm text-red-200">
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
                  className="rounded-full border border-red-300/30 px-3 py-2 text-xs font-semibold text-red-200 transition hover:bg-red-500/20"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {isRecording ? (
          <div className="mb-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 shadow-soft">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-300">Live recording</p>
                <p className="mt-1 text-sm font-medium text-red-200">REC {formatRecordingTime(recordingSeconds)}</p>
              </div>
              <div className="flex h-12 w-full items-end gap-1 rounded-2xl bg-ink/5 px-3 py-2 dark:bg-white/10 sm:flex-1">
                {(recordingWaveform.length ? recordingWaveform : Array.from({ length: 24 }, () => 0.12)).map((bar, index) => (
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
          <div className="mb-3 rounded-2xl border border-amber-300/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200 shadow-soft">
            {recordingError}
          </div>
        ) : null}

        {replyTarget ? (
          <div className="mb-3 flex items-start justify-between rounded-2xl border border-ink/10 bg-white/75 px-4 py-3 shadow-soft dark:border-white/10 dark:bg-slate-900/70">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lagoon dark:text-cyan-300/80">Replying to</p>
              <p className="mt-1 text-sm text-ink dark:text-slate-100">
                {typeof replyTarget.senderId === "string" ? "Message" : replyTarget.senderId.name}
              </p>
              <p className="mt-1 line-clamp-2 text-xs text-ink/55 dark:text-slate-300/70">{replyTarget.content}</p>
            </div>
            <button type="button" onClick={() => setReplyTarget(null)} className="text-ink/55 hover:text-ink dark:text-slate-300/70 dark:hover:text-slate-100">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        <motion.div
          animate={{ scale: isInputFocused ? 1.01 : 1 }}
          transition={{ duration: 0.2 }}
          className="flex flex-wrap items-end gap-1.5 rounded-2xl border border-ink/10 bg-white/88 px-2.5 py-2.5 shadow-soft transition-all focus-within:border-cyan-300/50 focus-within:shadow-[0_0_0_2px_rgba(34,211,238,0.16),0_18px_40px_rgba(6,182,212,0.12)] dark:border-white/10 dark:bg-slate-900/85 sm:flex-nowrap sm:gap-2 sm:gap-2.5 sm:rounded-[28px] sm:px-4 sm:py-3"
        >
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
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.7z"
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
              className="btn-secondary !px-2.5 !py-2.5"
              title="Emoji (Ctrl+E)"
            >
              <SmilePlus className="h-4 w-4" />
            </button>
            <AnimatePresence>
              {showEmojiPicker ? (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.97 }}
                  transition={{ duration: 0.18 }}
                  className="absolute bottom-14 left-0 z-20 w-[min(224px,calc(100vw-2rem))] rounded-2xl border border-ink/10 bg-white/95 p-3 shadow-lg dark:border-white/10 dark:bg-slate-900/95"
                >
                  <div className="grid grid-cols-5 gap-1.5">
                    {emojis.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          setDraft((currentDraft) => `${currentDraft}${emoji}`);
                          setShowEmojiPicker(false);
                        }}
                        className="rounded-xl bg-ink/5 px-2 py-2 text-xl transition-all hover:scale-110 hover:bg-ink/10 dark:bg-white/10 dark:hover:bg-white/20"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="btn-secondary order-2 !px-2.5 !py-2.5 sm:order-none"
            aria-label="Send image"
            title="Image (Ctrl+I)"
            disabled={isSendingMedia || mediaTransfer?.isUploading}
          >
            <ImagePlus className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => videoInputRef.current?.click()}
            className="btn-secondary order-3 !px-2.5 !py-2.5 sm:order-none"
            aria-label="Send video"
            title="Video (Ctrl+U)"
            disabled={isSendingMedia || mediaTransfer?.isUploading}
          >
            <Video className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="btn-secondary order-4 !px-2.5 !py-2.5 sm:order-none"
            aria-label="Send file"
            title="File (Ctrl+O)"
            disabled={isSendingMedia || mediaTransfer?.isUploading}
          >
            <Paperclip className="h-4 w-4" />
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
            className={`btn-secondary order-4 !px-2.5 !py-2.5 sm:order-none ${
              isRecording ? "!border-red-400 !bg-red-500 !text-white" : ""
            }`}
            aria-label={isRecording ? "Stop recording voice note" : "Record voice note"}
            title={isRecording ? "Stop recording (Ctrl+M)" : "Voice note (Ctrl+M)"}
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
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
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
            className="order-1 max-h-32 min-h-[28px] w-full flex-1 resize-none bg-transparent text-sm text-ink outline-none placeholder:text-ink/40 dark:text-slate-100 dark:placeholder:text-slate-400 sm:order-none sm:w-auto"
            disabled={isSendingMedia || mediaTransfer?.isUploading}
          />

          <motion.button
            whileHover={{ y: -2, scale: 1.05, boxShadow: "0 0 22px rgba(34, 211, 238, 0.4)" }}
            whileTap={{ scale: 0.97 }}
            type="button"
            onClick={() => void submitMessage()}
            className="btn-primary order-5 !h-11 !w-11 !rounded-full !p-0 sm:order-none"
            disabled={isSendingMedia || mediaTransfer?.isUploading}
            title="Send message (Enter)"
          >
            <SendHorizonal className="h-4 w-4" />
          </motion.button>
        </motion.div>
      </div>
    </motion.section>
  );
};

