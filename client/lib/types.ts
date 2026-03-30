export type BackendUser = {
  _id: string;
  username?: string;
  name: string;
  avatar: string | null;
  tagline?: string;
  bio?: string;
  lastSeen: string | null;
  createdAt?: string;
  friendsCount?: number;
  isFriend?: boolean;
  requestSent?: boolean;
  requestReceived?: boolean;
  isBlocked?: boolean;
  hasBlocked?: boolean;
};

export type MessageType = "text" | "image" | "video" | "voice" | "file";
export type CallType = "audio" | "video";
export type CallStatus = "idle" | "calling" | "ringing" | "connecting" | "connected" | "ended";

export type CallPeerUser = {
  _id: string;
  name: string;
  avatar: string | null;
  username?: string;
};

export type CallSession = {
  callId: string;
  chatId: string;
  callType: CallType;
  callerId: string;
  receiverId: string;
  status: "pending" | "active";
  createdAt: string;
  acceptedAt: string | null;
  caller: CallPeerUser;
  receiver: CallPeerUser;
  reason?: string;
  endedByUserId?: string;
};

export type CallHistoryItem = {
  _id: string;
  callId: string;
  chatId: string;
  callType: CallType;
  status: "missed" | "rejected" | "completed" | "cancelled" | "failed";
  endedReason: "rejected" | "ended" | "timeout" | "disconnected" | "busy" | "failed";
  startedAt: string;
  answeredAt: string | null;
  endedAt: string;
  durationSeconds: number;
  direction: "incoming" | "outgoing";
  otherUser: CallPeerUser | null;
};

export type MediaAttachment = {
  url: string;
  publicId: string;
  resourceType: "image" | "video" | "raw";
  mimeType?: string | null;
  originalName?: string | null;
  format?: string | null;
  bytes?: number;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
  waveform?: number[];
  messageType?: Exclude<MessageType, "text">;
};

export type MessageReaction = {
  emoji: string;
  userId: string;
  userName?: string;
};

export type Message = {
  _id: string;
  chatId: string;
  senderId:
    | string
    | {
        _id: string;
        name: string;
        avatar: string | null;
      };
  content: string;
  type: MessageType;
  media?: MediaAttachment | null;
  status: "sent" | "delivered" | "seen";
  createdAt: string;
  deliveredAt?: string | null;
  seenAt?: string | null;
  reactions?: MessageReaction[];
  replyTo?:
    | {
        _id: string;
        content: string;
        createdAt: string;
        deletedForEveryone?: boolean;
        senderId?: {
          _id: string;
          username?: string;
          name: string;
          avatar: string | null;
        };
      }
    | null;
  deletedForEveryone?: boolean;
  optimistic?: boolean;
};

export type SocketNewMessagePayload = {
  message: Message;
  chat: Chat;
  clientTempId?: string;
};

export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  chatId?: string;
  userId?: string;
  read: boolean;
  kind: "message" | "presence" | "friend_request";
  action?: "received" | "accepted" | "rejected";
  fromUser?: {
    _id: string;
    name: string;
    username?: string;
    avatar?: string | null;
  };
};

export type CallConfiguration = {
  iceServers: RTCIceServer[];
  callTimeoutMs: number;
};

export type UserProfile = BackendUser & {
  username: string;
  tagline: string;
  bio: string;
  friendsCount: number;
  isFriend: boolean;
  requestSent: boolean;
  requestReceived: boolean;
  isBlocked: boolean;
  hasBlocked: boolean;
};

export type Chat = {
  _id: string;
  isGroup: boolean;
  createdAt: string;
  updatedAt?: string;
  unreadCount: number;
  manuallyMarkedUnread?: boolean;
  participants: BackendUser[];
  otherParticipant: BackendUser | null;
  lastMessage: Pick<Message, "content" | "type" | "status" | "senderId" | "createdAt" | "deliveredAt" | "seenAt" | "media"> | null;
};

export type MessageListResponse = {
  messages: Message[];
  deliveredCount: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
  };
};
