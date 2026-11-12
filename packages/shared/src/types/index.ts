/**
 * Shared Type Definitions
 * Single source of truth for all domain types across server, web, and mobile
 */

// ============================================================================
// Base Types
// ============================================================================

export interface BaseEntity {
  _id: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// ============================================================================
// User Types
// ============================================================================

export interface UserProfile extends BaseEntity {
  _id: string;
  name: string;
  email: string;
  username?: string;
  avatar?: string;
  tagline?: string;
  bio?: string;
  isOnline?: boolean;
  lastSeen?: string;
  pushTokens?: PushToken[];
  friends?: string[];
  friendRequests?: FriendRequest[];
  blockedUsers?: string[];
  settings?: UserSettings;
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  notifications: NotificationSettings;
  privacy: PrivacySettings;
}

export interface NotificationSettings {
  messages: boolean;
  reactions: boolean;
  friendRequests: boolean;
  groupInvites: boolean;
  sounds: boolean;
}

export interface PrivacySettings {
  lastSeen: 'everyone' | 'contacts' | 'nobody';
  profilePhoto: 'everyone' | 'contacts' | 'nobody';
  about: 'everyone' | 'contacts' | 'nobody';
  groups: 'everyone' | 'contacts' | 'nobody';
}

export interface PushToken {
  token: string;
  platform: 'web' | 'ios' | 'android';
  deviceId?: string;
  createdAt: string;
}

export interface FriendRequest {
  _id: string;
  fromUser: string;
  toUser: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

export interface BackendUser {
  _id: string;
  name: string;
  email: string;
  username?: string;
  avatar?: string;
  tagline?: string;
  isOnline?: boolean;
  lastSeen?: string;
}

// ============================================================================
// Chat Types
// ============================================================================

export type ChatType = 'direct' | 'group';

export interface ChatParticipant {
  userId: string;
  role: 'member' | 'admin' | 'owner';
  joinedAt: string;
  userState?: UserChatState;
}

export interface UserChatState {
  clearedAt?: string;
  hidden?: boolean;
  manualUnread?: boolean;
  archivedAt?: string;
  pinnedAt?: string;
  mutedUntil?: string;
  notificationsMuted?: boolean;
}

export interface Chat extends BaseEntity {
  _id: string;
  type: ChatType;
  participants: ChatParticipant[];
  groupName?: string;
  groupAvatar?: string;
  groupDescription?: string;
  ownerId?: string;
  admins?: string[];
  lastMessage?: Message;
  unreadCount?: number;
  inviteLink?: GroupInviteLink;
  settings?: ChatSettings;
  otherParticipant?: BackendUser; // For direct chats - populated on client
}

export interface ChatSettings {
  wallpaper?: string;
  theme?: string;
  disappearingMessages?: {
    enabled: boolean;
    duration: number; // in seconds
  };
}

export interface GroupInviteLink {
  token: string;
  expiresAt: string;
  maxUses?: number;
  useCount: number;
  createdBy: string;
}

export interface CreateDirectChatInput {
  participantId: string;
}

export interface CreateGroupChatInput {
  groupName: string;
  participantIds: string[];
  groupDescription?: string;
  groupAvatar?: string;
}

export interface UpdateGroupInput {
  groupName?: string;
  groupAvatar?: string | null;
  groupDescription?: string;
  settings?: Partial<ChatSettings>;
}

// ============================================================================
// Message Types
// ============================================================================

export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'file' | 'system' | 'location' | 'contact';

export type MessageStatus = 'sent' | 'delivered' | 'seen' | 'failed';

export type DeleteScope = 'me' | 'everyone';

export interface MediaAttachment {
  url: string;
  thumbnailUrl?: string;
  publicId: string;
  format: string;
  width?: number;
  height?: number;
  duration?: number; // for audio/video
  fileSize: number;
  fileName?: string;
  mimeType: string;
}

export interface MessageReaction {
  emoji: string;
  userId: string;
  userName: string;
  createdAt: string;
}

export interface MessageReceipt {
  userId: string;
  status: MessageStatus;
  timestamp: string;
}

export interface ReplyTo {
  _id: string;
  content?: string;
  type: MessageType;
  senderId: string;
  senderName: string;
  media?: MediaAttachment;
}

export interface SystemEventData {
  type: 'member_added' | 'member_removed' | 'group_name_changed' | 'group_avatar_changed' | 'member_promoted' | 'member_demoted' | 'ownership_transferred' | 'message_deleted' | 'chat_cleared';
  actorId: string;
  actorName: string;
  targetUserId?: string;
  targetUserName?: string;
  metadata?: Record<string, unknown>;
}

export interface Message extends BaseEntity {
  _id: string;
  chatId: string;
  senderId: string;
  senderName?: string;
  senderAvatar?: string;
  type: MessageType;
  content?: string;
  media?: MediaAttachment;
  replyTo?: ReplyTo | string;
  reactions?: MessageReaction[];
  receipts?: MessageReceipt[];
  status: MessageStatus;
  isEdited?: boolean;
  editedAt?: string;
  deletedFor?: string[];
  deletedForEveryone?: boolean;
  deletedAt?: string;
  systemEvent?: SystemEventData;
  clientTempId?: string; // For optimistic updates
}

export interface SendMessageInput {
  chatId: string;
  content?: string;
  type?: MessageType;
  replyToId?: string | null;
  media?: MediaAttachment | null;
  clientTempId?: string;
}

export interface EditMessageInput {
  messageId: string;
  chatId: string;
  content: string;
}

export interface ForwardMessageInput {
  messageId: string;
  chatId: string;
  targetChatId: string;
}

export interface ReactionInput {
  messageId: string;
  emoji: string;
}

// ============================================================================
// Socket Event Types
// ============================================================================

export interface SocketEvents {
  // Client -> Server
  SEND_MESSAGE: (input: SendMessageInput) => void;
  JOIN_CHAT: (chatId: string) => void;
  LEAVE_CHAT: (chatId: string) => void;
  TYPING: (chatId: string) => void;
  STOP_TYPING: (chatId: string) => void;
  DELETE_MESSAGE: (input: { messageId: string; scope: DeleteScope }) => void;
  EDIT_MESSAGE: (input: EditMessageInput) => void;
  MARK_DELIVERED: (messageId: string) => void;
  MARK_SEEN: (messageId: string) => void;
  ADD_REACTION: (input: ReactionInput) => void;
  REMOVE_REACTION: (input: { messageId: string; emoji: string }) => void;
  FORWARD_MESSAGE: (input: ForwardMessageInput) => void;
  CREATE_CHAT: (input: CreateDirectChatInput | CreateGroupChatInput) => void;
  UPDATE_CHAT: (input: { chatId: string; data: UpdateGroupInput }) => void;
  ADD_GROUP_MEMBERS: (input: { chatId: string; memberIds: string[] }) => void;
  REMOVE_GROUP_MEMBER: (input: { chatId: string; memberId: string }) => void;
  PROMOTE_ADMIN: (input: { chatId: string; memberId: string }) => void;
  DEMOTE_ADMIN: (input: { chatId: string; memberId: string }) => void;
  TRANSFER_OWNERSHIP: (input: { chatId: string; nextOwnerId: string }) => void;
  LEAVE_GROUP: (chatId: string) => void;
  JOIN_GROUP_INVITE: (inviteToken: string) => void;

  // Server -> Client
  NEW_MESSAGE: (data: { message: Message; chat: Chat; clientTempId?: string }) => void;
  MESSAGE_DELIVERED: (data: { messageId: string; chatId: string; userId: string }) => void;
  MESSAGE_SEEN: (data: { messageId: string; chatId: string; userId: string }) => void;
  MESSAGE_DELETED: (data: { messageId: string; chatId: string; scope: DeleteScope; message?: Message }) => void;
  MESSAGE_EDITED: (data: { message: Message }) => void;
  CHAT_UPDATED: (data: { chat: Chat }) => void;
  CHAT_REMOVED: (data: { chatId: string }) => void;
  CHAT_CREATED: (data: { chat: Chat }) => void;
  USER_ONLINE: (data: { userId: string }) => void;
  USER_OFFLINE: (data: { userId: string }) => void;
  PRESENCE_SYNC: (data: { onlineUserIds: string[] }) => void;
  TYPING_START: (data: { chatId: string; userId: string; userName: string }) => void;
  TYPING_STOP: (data: { chatId: string; userId: string }) => void;
  REACTION_ADDED: (data: { message: Message; userId: string; userName: string; emoji: string }) => void;
  REACTION_REMOVED: (data: { message: Message; userId: string; emoji: string }) => void;
  FRIEND_REQUEST_RECEIVED: (data: FriendRequestNotification) => void;
  FRIEND_REQUEST_ACCEPTED: (data: FriendRequestNotification) => void;
  FRIEND_REQUEST_REJECTED: (data: FriendRequestNotification) => void;
  MEMBER_ADDED_TO_GROUP: (data: { chatId: string; userId: string; userName: string }) => void;
  SOCKET_ERROR: (data: { code: string; message: string; timestamp: string }) => void;
}

export interface FriendRequestNotification {
  id: string;
  type: 'friend_request' | 'friend_accepted' | 'friend_rejected';
  fromUser: BackendUser;
  createdAt: string;
  read: boolean;
}

// ============================================================================
// Notification Types
// ============================================================================

export type NotificationType = 'message' | 'reaction' | 'friend_request' | 'friend_accepted' | 'friend_rejected' | 'group_invite' | 'mention' | 'system';

export interface InAppNotification extends BaseEntity {
  _id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  read: boolean;
  chatId?: string;
  actorId?: string;
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: string;
  badge?: number;
  priority?: 'default' | 'high';
  channelId?: string;
  categoryId?: string;
  mutableContent?: boolean;
  contentAvailable?: boolean;
}

// ============================================================================
// Auth Types
// ============================================================================

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface GoogleAuthInput {
  idToken: string;
}

export interface MobileAuthCode {
  code: string;
  expiresAt: string;
}

export interface JWTPayload {
  sub: string;
  email: string;
  name: string;
  iat: number;
  exp: number;
  type: 'access' | 'refresh';
  jti?: string;
}

// ============================================================================
// Media Types
// ============================================================================

export interface UploadedMedia {
  media: MediaAttachment;
  uploadId?: string;
}

export interface SignedUploadParams {
  signature: string;
  timestamp: number;
  apiKey: string;
  folder: string;
  transformation?: string;
}

export type MediaCategory = 'avatar' | 'chat' | 'group' | 'message';

// ============================================================================
// Error Types
// ============================================================================

export interface AppError {
  code: string;
  message: string;
  statusCode: number;
  details?: Record<string, unknown>;
  isOperational: boolean;
}

export const ErrorCodes = {
  // Auth
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  REFRESH_TOKEN_EXPIRED: 'REFRESH_TOKEN_EXPIRED',
  REFRESH_TOKEN_REVOKED: 'REFRESH_TOKEN_REVOKED',
  GOOGLE_AUTH_FAILED: 'GOOGLE_AUTH_FAILED',

  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',

  // Resources
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CHAT_NOT_FOUND: 'CHAT_NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  MESSAGE_NOT_FOUND: 'MESSAGE_NOT_FOUND',

  // Permissions
  NOT_CHAT_MEMBER: 'NOT_CHAT_MEMBER',
  NOT_GROUP_ADMIN: 'NOT_GROUP_ADMIN',
  NOT_GROUP_OWNER: 'NOT_GROUP_OWNER',
  CANNOT_BLOCK_SELF: 'CANNOT_BLOCK_SELF',
  ALREADY_FRIENDS: 'ALREADY_FRIENDS',
  FRIEND_REQUEST_EXISTS: 'FRIEND_REQUEST_EXISTS',
  FRIEND_REQUEST_NOT_FOUND: 'FRIEND_REQUEST_NOT_FOUND',

  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',

  // Media
  UPLOAD_FAILED: 'UPLOAD_FAILED',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  MEDIA_PROCESSING_FAILED: 'MEDIA_PROCESSING_FAILED',

  // System
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR: 'DATABASE_ERROR',
  REDIS_ERROR: 'REDIS_ERROR',
  SOCKET_ERROR: 'SOCKET_ERROR',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

// ============================================================================
// System/Monitoring Types
// ============================================================================

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  checks: {
    database: { status: string; latency?: number };
    redis: { status: string; latency?: number };
    memory: { used: number; total: number; percentage: number };
    cpu: { usage: number };
  };
}

export interface MetricsData {
  requestsTotal: number;
  requestsPerSecond: number;
  averageLatency: number;
  errorRate: number;
  activeConnections: number;
  activeUsers: number;
  messagesPerMinute: number;
}

// ============================================================================
// API Error Type
// ============================================================================

export interface ApiError {
  status: number;
  code: string;
  message: string;
  details?: Record<string, unknown>;
}