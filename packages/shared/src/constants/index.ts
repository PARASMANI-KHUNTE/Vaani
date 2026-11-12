/**
 * Shared Constants
 * Single source of truth for event names, error codes, config keys, etc.
 */

// ============================================================================
// Socket Event Names
// ============================================================================

export const SocketEvents = {
  // Client -> Server
  SEND_MESSAGE: 'SEND_MESSAGE',
  JOIN_CHAT: 'JOIN_CHAT',
  LEAVE_CHAT: 'LEAVE_CHAT',
  TYPING: 'TYPING',
  STOP_TYPING: 'STOP_TYPING',
  DELETE_MESSAGE: 'DELETE_MESSAGE',
  EDIT_MESSAGE: 'EDIT_MESSAGE',
  MARK_DELIVERED: 'MARK_DELIVERED',
  MARK_SEEN: 'MARK_SEEN',
  MARK_CHAT_SEEN: 'MARK_CHAT_SEEN',
  ADD_REACTION: 'ADD_REACTION',
  REMOVE_REACTION: 'REMOVE_REACTION',
  FORWARD_MESSAGE: 'FORWARD_MESSAGE',
  CREATE_CHAT: 'CREATE_CHAT',
  UPDATE_CHAT: 'UPDATE_CHAT',
  ADD_GROUP_MEMBERS: 'ADD_GROUP_MEMBERS',
  REMOVE_GROUP_MEMBER: 'REMOVE_GROUP_MEMBER',
  PROMOTE_ADMIN: 'PROMOTE_ADMIN',
  DEMOTE_ADMIN: 'DEMOTE_ADMIN',
  TRANSFER_OWNERSHIP: 'TRANSFER_OWNERSHIP',
  LEAVE_GROUP: 'LEAVE_GROUP',
  JOIN_GROUP_INVITE: 'JOIN_GROUP_INVITE',
  GET_ONLINE_USERS: 'GET_ONLINE_USERS',
  GET_PRESENCE: 'GET_PRESENCE',
  MARK_NOTIFICATION_READ: 'MARK_NOTIFICATION_READ',
  MARK_ALL_NOTIFICATIONS_READ: 'MARK_ALL_NOTIFICATIONS_READ',

  // Server -> Client
  CONNECTED: 'CONNECTED',
  NEW_MESSAGE: 'NEW_MESSAGE',
  MESSAGE_DELIVERED: 'MESSAGE_DELIVERED',
  MESSAGE_SEEN: 'MESSAGE_SEEN',
  MESSAGE_DELETED: 'MESSAGE_DELETED',
  MESSAGE_EDITED: 'MESSAGE_EDITED',
  CHAT_UPDATED: 'CHAT_UPDATED',
  CHAT_REMOVED: 'CHAT_REMOVED',
  CHAT_CREATED: 'CHAT_CREATED',
  CHAT_DELETED: 'CHAT_DELETED',
  USER_ONLINE: 'USER_ONLINE',
  USER_OFFLINE: 'USER_OFFLINE',
  PRESENCE_SYNC: 'PRESENCE_SYNC',
  PRESENCE_UPDATE: 'PRESENCE_UPDATE',
  TYPING_START: 'TYPING_START',
  TYPING_STOP: 'TYPING_STOP',
  REACTION_ADDED: 'REACTION_ADDED',
  REACTION_REMOVED: 'REACTION_REMOVED',
  FRIEND_REQUEST_RECEIVED: 'FRIEND_REQUEST_RECEIVED',
  FRIEND_REQUEST_ACCEPTED: 'FRIEND_REQUEST_ACCEPTED',
  FRIEND_REQUEST_REJECTED: 'FRIEND_REQUEST_REJECTED',
  MEMBER_ADDED_TO_GROUP: 'MEMBER_ADDED_TO_GROUP',
  MEMBER_ADDED_TO_GROUP_LOCAL: 'MEMBER_ADDED_TO_GROUP_LOCAL',
  MEMBER_ADDED: 'MEMBER_ADDED',
  MEMBER_REMOVED: 'MEMBER_REMOVED',
  NOTIFICATION_CREATED: 'NOTIFICATION_CREATED',
  NOTIFICATION_READ: 'NOTIFICATION_READ',
  ALL_NOTIFICATIONS_READ: 'ALL_NOTIFICATIONS_READ',
  SOCKET_ERROR: 'SOCKET_ERROR',
  ONLINE_USERS_LIST: 'ONLINE_USERS_LIST',
  CALL_INCOMING: 'CALL_INCOMING',
  CALL_ACCEPTED: 'CALL_ACCEPTED',
  CALL_REJECTED: 'CALL_REJECTED',
  CALL_ENDED: 'CALL_ENDED',
} as const;

export type SocketEventName = typeof SocketEvents[keyof typeof SocketEvents];

// ============================================================================
// Message/Chat Types
// ============================================================================

export const MessageType = {
  TEXT: 'text',
  IMAGE: 'image',
  VIDEO: 'video',
  AUDIO: 'audio',
  FILE: 'file',
  SYSTEM: 'system',
  LOCATION: 'location',
  CONTACT: 'contact',
} as const;

export type MessageTypeValue = typeof MessageType[keyof typeof MessageType];

export const DeleteScope = {
  ME: 'me',
  EVERYONE: 'everyone',
} as const;

export type DeleteScopeValue = typeof DeleteScope[keyof typeof DeleteScope];

export const ChatType = {
  DIRECT: 'direct',
  GROUP: 'group',
} as const;

export type ChatTypeValue = typeof ChatType[keyof typeof ChatType];

// Client-to-server events (for validation)
export const ClientSocketEvents = [
  SocketEvents.SEND_MESSAGE,
  SocketEvents.JOIN_CHAT,
  SocketEvents.LEAVE_CHAT,
  SocketEvents.TYPING,
  SocketEvents.STOP_TYPING,
  SocketEvents.DELETE_MESSAGE,
  SocketEvents.EDIT_MESSAGE,
  SocketEvents.MARK_DELIVERED,
  SocketEvents.MARK_SEEN,
  SocketEvents.MARK_CHAT_SEEN,
  SocketEvents.ADD_REACTION,
  SocketEvents.REMOVE_REACTION,
  SocketEvents.FORWARD_MESSAGE,
  SocketEvents.CREATE_CHAT,
  SocketEvents.UPDATE_CHAT,
  SocketEvents.ADD_GROUP_MEMBERS,
  SocketEvents.REMOVE_GROUP_MEMBER,
  SocketEvents.PROMOTE_ADMIN,
  SocketEvents.DEMOTE_ADMIN,
  SocketEvents.TRANSFER_OWNERSHIP,
  SocketEvents.LEAVE_GROUP,
  SocketEvents.JOIN_GROUP_INVITE,
  SocketEvents.GET_ONLINE_USERS,
  SocketEvents.GET_PRESENCE,
  SocketEvents.MARK_NOTIFICATION_READ,
  SocketEvents.MARK_ALL_NOTIFICATIONS_READ,
] as const;

// Server-to-client events (for listening)
export const ServerSocketEvents = [
  SocketEvents.CONNECTED,
  SocketEvents.NEW_MESSAGE,
  SocketEvents.MESSAGE_DELIVERED,
  SocketEvents.MESSAGE_SEEN,
  SocketEvents.MESSAGE_DELETED,
  SocketEvents.MESSAGE_EDITED,
  SocketEvents.CHAT_UPDATED,
  SocketEvents.CHAT_REMOVED,
  SocketEvents.CHAT_CREATED,
  SocketEvents.CHAT_DELETED,
  SocketEvents.USER_ONLINE,
  SocketEvents.USER_OFFLINE,
  SocketEvents.PRESENCE_SYNC,
  SocketEvents.PRESENCE_UPDATE,
  SocketEvents.TYPING_START,
  SocketEvents.TYPING_STOP,
  SocketEvents.REACTION_ADDED,
  SocketEvents.REACTION_REMOVED,
  SocketEvents.FRIEND_REQUEST_RECEIVED,
  SocketEvents.FRIEND_REQUEST_ACCEPTED,
  SocketEvents.FRIEND_REQUEST_REJECTED,
  SocketEvents.MEMBER_ADDED_TO_GROUP,
  SocketEvents.MEMBER_ADDED_TO_GROUP_LOCAL,
  SocketEvents.MEMBER_ADDED,
  SocketEvents.MEMBER_REMOVED,
  SocketEvents.NOTIFICATION_CREATED,
  SocketEvents.NOTIFICATION_READ,
  SocketEvents.ALL_NOTIFICATIONS_READ,
  SocketEvents.SOCKET_ERROR,
  SocketEvents.ONLINE_USERS_LIST,
  SocketEvents.CALL_INCOMING,
  SocketEvents.CALL_ACCEPTED,
  SocketEvents.CALL_REJECTED,
  SocketEvents.CALL_ENDED,
] as const;

// ============================================================================
// HTTP/REST Constants
// ============================================================================

export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

export const HttpMethods = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  PATCH: 'PATCH',
  DELETE: 'DELETE',
} as const;

// ============================================================================
// API Endpoints
// ============================================================================

export const ApiEndpoints = {
  // Auth
  AUTH_LOGIN: '/auth/login',
  AUTH_ME: '/auth/me',
  AUTH_REFRESH: '/auth/refresh',
  AUTH_LOGOUT: '/auth/logout',
  AUTH_MOBILE_CODE: '/auth/mobile/code',

  // Users
  USERS_ME: '/users/me',
  USERS_SEARCH: '/users/search',
  USERS_EXPLORE: '/users/explore',
  USERS_PROFILE_BY_USERNAME: '/users/profile/:username',
  USERS_PROFILE_BY_ID: '/users/:userId/profile',
  USERS_BLOCKED: '/users/me/blocked',
  USERS_FRIEND_REQUEST: '/users/:userId/friend-request',
  USERS_FRIEND_REQUEST_ACCEPT: '/users/:userId/friend-request/accept',
  USERS_FRIEND_REQUEST_REJECT: '/users/:userId/friend-request/reject',
  USERS_FRIEND: '/users/:userId/friend',
  USERS_BLOCK: '/users/:userId/block',
  USERS_DISABLE: '/users/me/disable',
  USERS_DELETE: '/users/me',
  USERS_PUSH_TOKEN: '/users/push-token',

  // Chats
  CHATS_LIST: '/chats',
  CHATS_CREATE: '/chats',
  CHATS_GET: '/chats/:chatId',
  CHATS_UPDATE_GROUP: '/chats/:chatId/group',
  CHATS_READ: '/chats/:chatId/read',
  CHATS_UNREAD: '/chats/:chatId/unread',
  CHATS_DELETE: '/chats/:chatId',
  CHATS_CLEAR: '/chats/:chatId/clear',
  CHATS_LEAVE: '/chats/:chatId/leave',
  CHATS_INVITE_LINK: '/chats/:chatId/invite-link',
  CHATS_INVITE_PREVIEW: '/chats/invite/:inviteToken',
  CHATS_INVITE_JOIN: '/chats/invite/:inviteToken/join',
  CHATS_MEMBERS: '/chats/:chatId/members',
  CHATS_MEMBER: '/chats/:chatId/members/:memberId',
  CHATS_ADMINS: '/chats/:chatId/admins/:memberId',
  CHATS_OWNER: '/chats/:chatId/owner',

  // Messages
  MESSAGES_LIST: '/messages/:chatId',
  MESSAGES_SEND: '/messages',
  MESSAGES_UPLOAD: '/messages/upload',
  MESSAGES_GET: '/messages/:messageId',
  MESSAGES_EDIT: '/messages/:messageId',
  MESSAGES_DELETE: '/messages/:messageId',
  MESSAGES_STATUS: '/messages/:messageId/status',
  MESSAGES_FORWARD: '/messages/:messageId/forward',
  MESSAGES_REACTION: '/messages/:messageId/reaction',

  // Health/Monitoring
  HEALTH: '/health',
  HEALTH_READY: '/health/ready',
  HEALTH_LIVE: '/health/live',
  METRICS: '/metrics',
} as const;

// ============================================================================
// Pagination Defaults
// ============================================================================

export const PaginationDefaults = {
  CHATS_LIMIT: 30,
  CHATS_MAX_LIMIT: 100,
  MESSAGES_LIMIT: 30,
  MESSAGES_MAX_LIMIT: 100,
  USERS_SEARCH_LIMIT: 20,
  USERS_EXPLORE_LIMIT: 30,
  NOTIFICATIONS_LIMIT: 50,
} as const;

// ============================================================================
// Rate Limiting
// ============================================================================

export const RateLimitKeys = {
  AUTH_LOGIN: 'auth:login',
  AUTH_REGISTER: 'auth:register',
  AUTH_REFRESH: 'auth:refresh',
  API_GENERAL: 'api:general',
  API_CHATS: 'api:chats',
  API_MESSAGES: 'api:messages',
  API_UPLOAD: 'api:upload',
  API_GROUP_MUTATION: 'api:group:mutation',
  SOCKET_MESSAGE: 'socket:message',
  SOCKET_TYPING: 'socket:typing',
  SOCKET_JOIN: 'socket:join',
  SOCKET_REACTION: 'socket:reaction',
} as const;

export const RateLimitDefaults = {
  [RateLimitKeys.AUTH_LOGIN]: { windowMs: 15 * 60 * 1000, max: 10 }, // 10 per 15 min
  [RateLimitKeys.AUTH_REGISTER]: { windowMs: 60 * 60 * 1000, max: 5 }, // 5 per hour
  [RateLimitKeys.AUTH_REFRESH]: { windowMs: 60 * 60 * 1000, max: 20 }, // 20 per hour
  [RateLimitKeys.API_GENERAL]: { windowMs: 60 * 1000, max: 100 }, // 100 per minute
  [RateLimitKeys.API_CHATS]: { windowMs: 60 * 1000, max: 50 }, // 50 per minute
  [RateLimitKeys.API_MESSAGES]: { windowMs: 60 * 1000, max: 60 }, // 60 per minute
  [RateLimitKeys.API_UPLOAD]: { windowMs: 60 * 60 * 1000, max: 50 }, // 50 per hour
  [RateLimitKeys.API_GROUP_MUTATION]: { windowMs: 60 * 1000, max: 20 }, // 20 per minute
  [RateLimitKeys.SOCKET_MESSAGE]: { windowMs: 1000, max: 10 }, // 10 per second
  [RateLimitKeys.SOCKET_TYPING]: { windowMs: 1000, max: 5 }, // 5 per second
  [RateLimitKeys.SOCKET_JOIN]: { windowMs: 60 * 1000, max: 30 }, // 30 per minute
  [RateLimitKeys.SOCKET_REACTION]: { windowMs: 1000, max: 20 }, // 20 per second
} as const;

// ============================================================================
// Media/Upload Constants
// ============================================================================

export const MediaConstraints = {
  IMAGE: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.heic'],
  },
  VIDEO: {
    maxSize: 50 * 1024 * 1024, // 50MB
    allowedMimeTypes: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska'],
    allowedExtensions: ['.mp4', '.webm', '.mov', '.mkv'],
  },
  AUDIO: {
    maxSize: 20 * 1024 * 1024, // 20MB
    allowedMimeTypes: ['audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm', 'audio/mp4'],
    allowedExtensions: ['.mp3', '.ogg', '.wav', '.webm', '.m4a'],
  },
  FILE: {
    maxSize: 25 * 1024 * 1024, // 25MB
    allowedMimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'application/zip',
      'application/x-rar-compressed',
    ],
    allowedExtensions: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.zip', '.rar'],
  },
} as const;

export const CloudinaryFolders = {
  AVATARS: 'avatars',
  CHAT_IMAGES: 'chat/images',
  CHAT_VIDEOS: 'chat/videos',
  CHAT_AUDIO: 'chat/audio',
  CHAT_FILES: 'chat/files',
  GROUP_AVATARS: 'groups/avatars',
  TEMP: 'temp',
} as const;

export const CloudinaryTransformations = {
  AVATAR: 'w_200,h_200,c_fill,g_face,r_max/f_auto,q_auto',
  AVATAR_LARGE: 'w_400,h_400,c_fill,g_face,r_max/f_auto,q_auto',
  CHAT_THUMBNAIL: 'w_300,h_300,c_limit,f_auto,q_auto',
  CHAT_PREVIEW: 'w_800,h_600,c_limit,f_auto,q_auto',
  GROUP_AVATAR: 'w_300,h_300,c_fill,g_auto,r_max/f_auto,q_auto',
} as const;

// ============================================================================
// Retention/Cleanup
// ============================================================================

export const RetentionDefaults = {
  CHAT_DAYS: 365, // 1 year
  MESSAGE_DAYS: 180, // 6 months
  CLEANUP_INTERVAL_HOURS: 24,
} as const;

// ============================================================================
// JWT/Token Constants
// ============================================================================

export const TokenConstants = {
  ACCESS_TOKEN_EXPIRY: '15m',
  REFRESH_TOKEN_EXPIRY: '7d',
  REFRESH_TOKEN_ROTATION_WINDOW: '1m', // Allow reuse within 1 minute for race conditions
  MOBILE_AUTH_CODE_EXPIRY: '5m',
  MOBILE_AUTH_CODE_LENGTH: 6,
} as const;

// ============================================================================
// Feature Flags / Limits
// ============================================================================

export const Limits = {
  MAX_GROUP_MEMBERS: 500,
  MAX_GROUP_NAME_LENGTH: 100,
  MAX_GROUP_DESCRIPTION_LENGTH: 500,
  MAX_MESSAGE_LENGTH: 10000,
  MAX_BIO_LENGTH: 200,
  MAX_TAGLINE_LENGTH: 50,
  MAX_USERNAME_LENGTH: 30,
  MIN_USERNAME_LENGTH: 3,
  MAX_REACTIONS_PER_MESSAGE: 50,
  MAX_PINNED_CHATS: 10,
  MAX_ARCHIVED_CHATS: 100,
  MAX_BLOCKED_USERS: 1000,
  MAX_FRIEND_REQUESTS_PENDING: 50,
  TYPING_TIMEOUT_MS: 3000,
  PRESENCE_HEARTBEAT_MS: 30000,
  MESSAGE_DEDUP_WINDOW_MS: 5000,
  OFFLINE_QUEUE_MAX_SIZE: 1000,
  USERS_SEARCH_LIMIT: 20,
  USERS_EXPLORE_LIMIT: 30,
} as const;

// ============================================================================
// Storage Keys (Client-side)
// ============================================================================

export const StorageKeys = {
  // Web (localStorage)
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_SESSION: 'user_session',
  THEME: 'theme',
  SIDEBAR_COLLAPSED: 'sidebar_collapsed',
  NOTIFICATION_TONE: 'notification_tone_enabled',
  UNREAD_BADGE: 'unread_badge_count',
  LAST_ACTIVE_CHAT: 'last_active_chat',

  // Mobile (SecureStore)
  MOBILE_AUTH_TOKEN: 'mobile_auth_token',
  MOBILE_REFRESH_TOKEN: 'mobile_refresh_token',
  MOBILE_USER_SESSION: 'mobile_user_session',
  MOBILE_PUSH_TOKEN: 'mobile_push_token',
  MOBILE_BIOMETRIC_ENABLED: 'mobile_biometric_enabled',
} as const;

// ============================================================================
// Environment Variable Keys
// ============================================================================

export const EnvKeys = {
  // Server
  NODE_ENV: 'NODE_ENV',
  PORT: 'PORT',
  API_URL: 'API_URL',
  CLIENT_URL: 'CLIENT_URL',
  MOBILE_CLIENT_URL: 'MOBILE_CLIENT_URL',

  // Database
  MONGODB_URI: 'MONGODB_URI',
  MONGODB_URI_TEST: 'MONGODB_URI_TEST',

  // Redis
  REDIS_URL: 'REDIS_URL',
  REDIS_URL_UPSTASH: 'REDIS_URL_UPSTASH',
  REDIS_TOKEN_UPSTASH: 'REDIS_TOKEN_UPSTASH',

  // Auth
  JWT_SECRET: 'JWT_SECRET',
  JWT_REFRESH_SECRET: 'JWT_REFRESH_SECRET',
  GOOGLE_CLIENT_ID: 'GOOGLE_CLIENT_ID',
  GOOGLE_CLIENT_SECRET: 'GOOGLE_CLIENT_SECRET',

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: 'CLOUDINARY_CLOUD_NAME',
  CLOUDINARY_API_KEY: 'CLOUDINARY_API_KEY',
  CLOUDINARY_API_SECRET: 'CLOUDINARY_API_SECRET',

  // Push Notifications
  EXPO_ACCESS_TOKEN: 'EXPO_ACCESS_TOKEN',
  FIREBASE_SERVER_KEY: 'FIREBASE_SERVER_KEY',

  // Retention
  RETENTION_CHAT_DAYS: 'RETENTION_CHAT_DAYS',
  RETENTION_MESSAGE_DAYS: 'RETENTION_MESSAGE_DAYS',
  RETENTION_CLEANUP_INTERVAL_HOURS: 'RETENTION_CLEANUP_INTERVAL_HOURS',

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: 'RATE_LIMIT_WINDOW_MS',
  RATE_LIMIT_MAX_REQUESTS: 'RATE_LIMIT_MAX_REQUESTS',
} as const;

// ============================================================================
// Database Indexes / Query Constants
// ============================================================================

export const DbIndexes = {
  USER_EMAIL: 'email_1',
  USER_USERNAME: 'username_1',
  USER_FRIENDS: 'friends_1',
  CHAT_PARTICIPANTS: 'participants.userId_1_updatedAt_-1',
  CHAT_TYPE_UPDATED: 'type_1_updatedAt_-1',
  MESSAGE_CHAT_CREATED: 'chatId_1_createdAt_-1',
  MESSAGE_SENDER: 'senderId_1_createdAt_-1',
  MESSAGE_CLIENT_TEMP_ID: 'clientTempId_1',
  FRIEND_REQUEST_TO_FROM: 'toUser_1_fromUser_1',
  NOTIFICATION_USER_READ: 'userId_1_read_1_createdAt_-1',
} as const;

// ============================================================================
// Regex Patterns
// ============================================================================

export const Patterns = {
  USERNAME: /^[a-zA-Z0-9_]{3,30}$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^\+?[1-9]\d{1,14}$/,
  URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  SUSPICIOUS_URL: /(bit\.ly|tinyurl|t\.co|goo\.gl|short\.link|cutt\.ly|rb\.gy|is\.gd|v\.gd|tiny\.cc|clck\.ru)/i,
  HEX_COLOR: /^#[0-9A-Fa-f]{6}$/,
  OBJECT_ID: /^[0-9a-fA-F]{24}$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
} as const;

// Magic Bytes for file type validation
export const MagicBytes: Record<string, number[][]> = {
  'image/jpeg': [[0xff, 0xd8, 0xff]],
  'image/png': [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46], [0x57, 0x45, 0x42, 0x50]], // RIFF....WEBP
  'image/gif': [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]], // GIF87a / GIF89a
  'video/mp4': [[0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70], [0x00, 0x00, 0x00, 0x1c, 0x66, 0x74, 0x79, 0x70]], // ftyp
  'video/webm': [[0x1a, 0x45, 0xdf, 0xa3]], // EBML
  'audio/mpeg': [[0xff, 0xfb], [0xff, 0xf3], [0x49, 0x44, 0x33]], // MP3 / ID3
  'audio/ogg': [[0x4f, 0x67, 0x67, 0x53]], // OggS
  'audio/wav': [[0x52, 0x49, 0x46, 0x46], [0x57, 0x41, 0x56, 0x45]], // RIFF....WAVE
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
};

export function validateMagicBytes(buffer: Buffer, mimeType: string): boolean {
  const signatures = MagicBytes[mimeType as keyof typeof MagicBytes];
  if (!signatures) return true; // Unknown type, skip validation

  return signatures.some((sig) =>
    sig.every((byte, index) => buffer[index] === byte)
  );
}