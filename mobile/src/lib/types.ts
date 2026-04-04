export type SessionUser = {
  userId?: string;
  name?: string;
  email?: string;
  avatar?: string | null;
};

export type MobileSession = {
  accessToken: string;
  user: SessionUser | null;
};

export type ChatParticipant = {
  _id: string;
  name: string;
  avatar?: string | null;
  username?: string;
  tagline?: string;
  bio?: string;
  isFriend?: boolean;
  requestSent?: boolean;
  requestReceived?: boolean;
  isBlocked?: boolean;
  hasBlocked?: boolean;
};

export type MobileChat = {
  _id: string;
  isGroup: boolean;
  groupName?: string | null;
  groupAvatar?: string | null;
  createdBy?: string | null;
  adminIds?: string[];
  unreadCount: number;
  manuallyMarkedUnread?: boolean;
  createdAt: string;
  updatedAt?: string;
  participants: ChatParticipant[];
  otherParticipant: ChatParticipant | null;
  lastMessage:
    | {
        content?: string;
        type: "text" | "image" | "file" | "video" | "voice";
        createdAt: string;
      }
    | null;
};

export type MobileMessageReaction = {
  emoji: string;
  userId: string;
};

export type MobileMessage = {
  _id: string;
  chatId: string;
  senderId:
    | string
    | {
        _id: string;
        name: string;
        avatar?: string | null;
      };
  content: string;
  type: "text" | "image" | "file" | "video" | "voice";
  status: "sent" | "delivered" | "seen";
  createdAt: string;
  deliveredAt?: string;
  seenAt?: string;
  reactions?: MobileMessageReaction[];
  media?: {
    url: string;
    thumbnailUrl?: string;
    publicId?: string;
    mimeType?: string;
    fileSize?: number;
  };
  replyTo?: {
    _id: string;
    content: string;
    type: string;
    senderId: string | { _id: string; name: string };
  };
};

export type MobileProfile = {
  _id: string;
  username: string;
  name: string;
  email?: string;
  avatar: string | null;
  tagline: string;
  bio: string;
  lastSeen: string | null;
  createdAt?: string;
  friendsCount: number;
  isFriend: boolean;
  requestSent: boolean;
  requestReceived: boolean;
  isBlocked: boolean;
  hasBlocked: boolean;
};


export type MobileNotificationItem = {
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

export type MobileGroupInvite = {
  token: string;
  expiresAt: string;
  maxUses: number;
};

export type MobileGroupInvitePreview = {
  chatId: string;
  groupName: string;
  groupAvatar: string | null;
  memberCount: number;
  isAlreadyMember: boolean;
  expiresAt: string;
  maxUses: number;
  useCount: number;
};
