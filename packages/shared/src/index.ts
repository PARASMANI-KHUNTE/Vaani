/**
 * @chat-app/shared - Main Entry Point
 * Shared types, constants, validators, utilities, and API client
 */

// Types (domain types, interfaces) - explicit exports to avoid conflicts with validators
export {
  // Base types
  type BaseEntity,
  type PaginationParams,
  type PaginatedResponse,
  type ApiResponse,
  // User types
  type UserProfile,
  type UserSettings,
  type NotificationSettings,
  type PrivacySettings,
  type PushToken,
  type FriendRequest,
  type BackendUser,
  // Chat types
  type ChatType,
  type ChatParticipant,
  type UserChatState,
  type Chat,
  type ChatSettings,
  type GroupInviteLink,
  type CreateDirectChatInput,
  type CreateGroupChatInput,
  type UpdateGroupInput,
  // Message types
  type MessageType,
  type MessageStatus,
  type DeleteScope,
  type MediaAttachment,
  type MessageReaction,
  type MessageReceipt,
  type ReplyTo,
  type SystemEventData,
  type Message,
  type SendMessageInput,
  type EditMessageInput,
  type ForwardMessageInput,
  type ReactionInput,
  // Socket types
  type SocketEvents,
  type FriendRequestNotification,
  // Notification types
  type InAppNotification,
  type PushNotificationPayload,
  type NotificationType,
  // Auth types
  type AuthTokens,
  type GoogleAuthInput,
  type MobileAuthCode,
  type JWTPayload,
  // Media types
  type UploadedMedia,
  type SignedUploadParams,
  // Error types
  type AppError,
  ErrorCodes,
  type ErrorCode,
  // System types
  type HealthCheckResult,
  type MetricsData,
  // API Error type
  type ApiError,
} from './types';

// Constants (configuration values, event names, limits, etc.)
export {
  // Socket events
  SocketEvents as SocketEventsConst,
  type SocketEventName,
  ClientSocketEvents,
  ServerSocketEvents,
  // HTTP
  HttpStatus,
  HttpMethods,
  ApiEndpoints,
  // Pagination
  PaginationDefaults,
  // Rate limiting
  RateLimitKeys,
  RateLimitDefaults,
  // Media
  MediaConstraints,
  CloudinaryFolders,
  CloudinaryTransformations,
  // Retention
  RetentionDefaults,
  // Tokens
  TokenConstants,
  // Limits
  Limits,
  // Storage
  StorageKeys,
  // Environment
  EnvKeys,
  // Database
  DbIndexes,
  // Patterns
  Patterns,
  // Magic Bytes
  MagicBytes,
} from './constants';

// Validators (Zod schemas and inferred types - excluding types that conflict with types.ts)
export {
  // Schemas
  ObjectIdSchema,
  PaginationSchema,
  DateRangeSchema,
  GoogleAuthSchema,
  MobileAuthCodeSchema,
  RefreshTokenSchema,
  AuthTokensSchema,
  UpdateProfileSchema,
  UserSettingsSchema,
  PushTokenSchema,
  SearchUsersSchema,
  CreateDirectChatSchema,
  CreateGroupChatSchema,
  UpdateGroupSchema,
  GroupInviteSchema,
  AddGroupMembersSchema,
  PromoteDemoteAdminSchema,
  TransferOwnershipSchema,
  MediaAttachmentSchema,
  SendMessageSchema,
  EditMessageSchema,
  DeleteMessageSchema,
  ForwardMessageSchema,
  ReactionSchema,
  GetMessagesSchema,
  NotificationSchema,
  GetNotificationsSchema,
  UploadMediaSchema,
  SignedUploadRequestSchema,
  FriendActionSchema,
  BlockUserSchema,
  HealthCheckSchema,
  // Validator-specific types (not in types.ts)
  type MobileAuthCodeInput,
  type UpdateProfileInput,
  type UserSettingsInput,
  type PushTokenInput,
  type SearchUsersInput,
  type GroupInviteInput,
  type AddGroupMembersInput,
  type PromoteDemoteAdminInput,
  type TransferOwnershipInput,
  type GetMessagesInput,
  type NotificationInput,
  type GetNotificationsInput,
  type SignedUploadRequestInput,
  type FriendActionInput,
  type BlockUserInput,
  type MediaCategory,
  // Validation helpers
  validateMediaFile,
  validateMediaBuffer,
  validateMagicBytes,
} from './validators';

// Utilities (helper functions)
export * from './utils';

// API Client (base class for typed API clients)
export * from './api';

// Re-export Zod for consumers
export { z } from 'zod';