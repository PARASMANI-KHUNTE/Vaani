export type BackendUser = {
  _id: string;
  username?: string;
  name: string;
  email?: string;
  avatar: string | null;
  tagline?: string;
  bio?: string;
  lastSeen: string | null;
  isOnline?: boolean;
  createdAt?: string;
  friendsCount?: number;
  isFriend?: boolean;
  requestSent?: boolean;
  requestReceived?: boolean;
  isBlocked?: boolean;
  hasBlocked?: boolean;
};

export type MessageType = "text" | "image" | "file" | "video" | "voice";

export type MediaAttachment = {
  url: string;
  publicId: string;
  resourceType: string;
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
        username?: string;
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
  isSystem?: boolean;
  systemEvent?: {
    eventType:
      | "group_created"
      | "group_renamed"
      | "group_avatar_updated"
      | "member_added"
      | "member_removed"
      | "member_left"
      | "admin_promoted"
      | "admin_demoted"
      | "ownership_transferred"
      | "group_wallpaper_updated"
      | "group_theme_updated";
    metadata?: Record<string, unknown> | null;
  } | null;
  optimistic?: boolean;
  edited?: boolean;
  forwarded?: boolean;
  failed?: boolean;
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
  kind: "message" | "presence" | "friend_request" | "reaction";
  action?: "received" | "accepted" | "rejected";
  fromUser?: {
    _id: string;
    name: string;
    username?: string;
    avatar?: string | null;
  };
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
  groupName?: string | null;
  groupAvatar?: string | null;
  wallpaper?: string | null;
  theme?: string;
  createdBy?: string | null;
  adminIds?: string[];
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
