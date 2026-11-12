/**
 * Shared Validation Schemas (Zod)
 * Used on both client and server for consistent validation
 */

import { z } from 'zod';
import {
  Patterns,
  Limits,
  MediaConstraints,
  MessageType,
  DeleteScope,
  ChatType,
} from '../constants';

// ============================================================================
// Base Schemas
// ============================================================================

export const ObjectIdSchema = z.string().regex(Patterns.OBJECT_ID, 'Invalid ObjectId format');

export const PaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(Limits.MAX_GROUP_MEMBERS).default(30),
  offset: z.coerce.number().int().nonnegative().optional(),
});

export const DateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// ============================================================================
// Auth Schemas
// ============================================================================

export const GoogleAuthSchema = z.object({
  idToken: z.string().min(1, 'ID token is required'),
});

export const MobileAuthCodeSchema = z.object({
  code: z.string().length(6, 'Auth code must be 6 digits').regex(/^\d{6}$/, 'Auth code must be numeric'),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const AuthTokensSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  expiresIn: z.number().positive(),
  tokenType: z.literal('Bearer'),
});

// ============================================================================
// User Schemas
// ============================================================================

export const UpdateProfileSchema = z.object({
  name: z.string().min(1).max(Limits.MAX_USERNAME_LENGTH).optional(),
  tagline: z.string().max(Limits.MAX_TAGLINE_LENGTH).optional(),
  bio: z.string().max(Limits.MAX_BIO_LENGTH).optional(),
  username: z
    .string()
    .min(Limits.MIN_USERNAME_LENGTH)
    .max(Limits.MAX_USERNAME_LENGTH)
    .regex(Patterns.USERNAME, 'Username can only contain letters, numbers, and underscores')
    .optional(),
});

export const UserSettingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  notifications: z.object({
    messages: z.boolean().default(true),
    reactions: z.boolean().default(true),
    friendRequests: z.boolean().default(true),
    groupInvites: z.boolean().default(true),
    sounds: z.boolean().default(true),
  }).default({}),
  privacy: z.object({
    lastSeen: z.enum(['everyone', 'contacts', 'nobody']).default('contacts'),
    profilePhoto: z.enum(['everyone', 'contacts', 'nobody']).default('contacts'),
    about: z.enum(['everyone', 'contacts', 'nobody']).default('contacts'),
    groups: z.enum(['everyone', 'contacts', 'nobody']).default('contacts'),
  }).default({}),
});

export const PushTokenSchema = z.object({
  token: z.string().min(1),
  platform: z.enum(['web', 'ios', 'android']),
  deviceId: z.string().optional(),
});

export const SearchUsersSchema = z.object({
  q: z.string().min(1).max(100),
  limit: z.coerce.number().int().positive().max(Limits.USERS_SEARCH_LIMIT).default(Limits.USERS_SEARCH_LIMIT),
});

// ============================================================================
// Chat Schemas
// ============================================================================

export const CreateDirectChatSchema = z.object({
  participantId: ObjectIdSchema,
});

export const CreateGroupChatSchema = z.object({
  groupName: z.string().min(1).max(Limits.MAX_GROUP_NAME_LENGTH),
  participantIds: z.array(ObjectIdSchema).min(1).max(Limits.MAX_GROUP_MEMBERS - 1),
  groupDescription: z.string().max(Limits.MAX_GROUP_DESCRIPTION_LENGTH).optional(),
  groupAvatar: z.string().url().optional(),
});

export const UpdateGroupSchema = z.object({
  groupName: z.string().min(1).max(Limits.MAX_GROUP_NAME_LENGTH).optional(),
  groupAvatar: z.string().url().nullable().optional(),
  groupDescription: z.string().max(Limits.MAX_GROUP_DESCRIPTION_LENGTH).optional(),
  settings: z.object({
    wallpaper: z.string().url().nullable().optional(),
    theme: z.string().optional(),
    disappearingMessages: z.object({
      enabled: z.boolean(),
      duration: z.number().int().positive().max(86400 * 365), // Max 1 year in seconds
    }).optional(),
  }).optional(),
});

export const GroupInviteSchema = z.object({
  expiresInHours: z.coerce.number().int().positive().max(8760).optional(), // Max 1 year
  maxUses: z.coerce.number().int().positive().max(10000).optional(),
});

export const AddGroupMembersSchema = z.object({
  memberIds: z.array(ObjectIdSchema).min(1).max(50), // Batch limit
});

export const PromoteDemoteAdminSchema = z.object({
  chatId: ObjectIdSchema,
  memberId: ObjectIdSchema,
});

export const TransferOwnershipSchema = z.object({
  chatId: ObjectIdSchema,
  nextOwnerId: ObjectIdSchema,
});

// ============================================================================
// Message Schemas
// ============================================================================

export const MediaAttachmentSchema = z.object({
  url: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  publicId: z.string().min(1),
  format: z.string().min(1),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  duration: z.number().nonnegative().optional(),
  fileSize: z.number().int().positive(),
  fileName: z.string().optional(),
  mimeType: z.string().min(1),
});

export const SendMessageSchema = z.object({
  chatId: ObjectIdSchema,
  content: z.string().max(Limits.MAX_MESSAGE_LENGTH).optional(),
  type: z.enum(['text', 'image', 'video', 'audio', 'file', 'location', 'contact'] as const).default('text'),
  replyToId: ObjectIdSchema.nullable().optional(),
  media: MediaAttachmentSchema.nullable().optional(),
  clientTempId: z.string().uuid().optional(),
}).refine(
  (data) => data.content || data.media || data.type !== 'text',
  { message: 'Message must have content, media, or be a non-text type', path: ['content'] }
);

export const EditMessageSchema = z.object({
  messageId: ObjectIdSchema,
  chatId: ObjectIdSchema,
  content: z.string().min(1).max(Limits.MAX_MESSAGE_LENGTH),
});

export const DeleteMessageSchema = z.object({
  messageId: ObjectIdSchema,
  scope: z.enum(['me', 'everyone'] as const),
});

export const ForwardMessageSchema = z.object({
  messageId: ObjectIdSchema,
  chatId: ObjectIdSchema,
  targetChatId: ObjectIdSchema,
});

export const ReactionSchema = z.object({
  messageId: ObjectIdSchema,
  emoji: z.string().min(1).max(10), // Unicode emoji can be up to ~10 chars
});

export const GetMessagesSchema = z.object({
  chatId: ObjectIdSchema,
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(Limits.MESSAGES_MAX_LIMIT).default(Limits.MESSAGES_LIMIT),
});

// ============================================================================
// Notification Schemas
// ============================================================================

export const NotificationSchema = z.object({
  id: z.string().uuid(),
  type: z.enum([
    'message',
    'reaction',
    'friend_request',
    'friend_accepted',
    'friend_rejected',
    'group_invite',
    'mention',
    'system',
  ]),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(500),
  data: z.record(z.unknown()).optional(),
  read: z.boolean().default(false),
  chatId: ObjectIdSchema.optional(),
  actorId: ObjectIdSchema.optional(),
  createdAt: z.string().datetime(),
});

export const GetNotificationsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  unreadOnly: z.coerce.boolean().default(false),
});

// ============================================================================
// Media Upload Schemas
// ============================================================================

export const UploadMediaSchema = z.object({
  file: z.instanceof(File).optional(), // For browser
  // For server: buffer, mimetype, originalname handled separately
});

export const SignedUploadRequestSchema = z.object({
  category: z.enum(['avatar', 'chat', 'group', 'message'] as const),
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1),
  fileSize: z.number().int().positive(),
});

// ============================================================================
// Friend/Block Schemas
// ============================================================================

export const FriendActionSchema = z.object({
  userId: ObjectIdSchema,
});

export const BlockUserSchema = z.object({
  userId: ObjectIdSchema,
});

// ============================================================================
// System/Health Schemas
// ============================================================================

export const HealthCheckSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  timestamp: z.string().datetime(),
  uptime: z.number().positive(),
  checks: z.object({
    database: z.object({ status: z.string(), latency: z.number().optional() }),
    redis: z.object({ status: z.string(), latency: z.number().optional() }),
    memory: z.object({ used: z.number(), total: z.number(), percentage: z.number() }),
    cpu: z.object({ usage: z.number() }),
  }),
});

// ============================================================================
// Validation Helpers
// ============================================================================

export function validateMediaFile(file: File, category: keyof typeof MediaConstraints): { valid: boolean; error?: string } {
  const constraints = MediaConstraints[category];

  if (!constraints.allowedMimeTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed: ${constraints.allowedMimeTypes.join(', ')}`,
    };
  }

  if (file.size > constraints.maxSize) {
    const maxMB = constraints.maxSize / (1024 * 1024);
    return {
      valid: false,
      error: `File too large. Maximum size: ${maxMB}MB`,
    };
  }

  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!constraints.allowedExtensions.includes(extension)) {
    return {
      valid: false,
      error: `Invalid file extension. Allowed: ${constraints.allowedExtensions.join(', ')}`,
    };
  }

  return { valid: true };
}

export function validateMediaBuffer(
  buffer: Buffer,
  mimeType: string,
  fileName: string,
  category: keyof typeof MediaConstraints
): { valid: boolean; error?: string } {
  const constraints = MediaConstraints[category];

  if (!constraints.allowedMimeTypes.includes(mimeType)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed: ${constraints.allowedMimeTypes.join(', ')}`,
    };
  }

  if (buffer.length > constraints.maxSize) {
    const maxMB = constraints.maxSize / (1024 * 1024);
    return {
      valid: false,
      error: `File too large. Maximum size: ${maxMB}MB`,
    };
  }

  const extension = '.' + fileName.split('.').pop()?.toLowerCase();
  if (!constraints.allowedExtensions.includes(extension)) {
    return {
      valid: false,
      error: `Invalid file extension. Allowed: ${constraints.allowedExtensions.join(', ')}`,
    };
  }

  return { valid: true };
}

// Magic bytes validation for additional security
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
  const signatures = MagicBytes[mimeType];
  if (!signatures) return true; // Unknown type, skip validation

  return signatures.some((sig) =>
    sig.every((byte, index) => buffer[index] === byte)
  );
}

// ============================================================================
// Type Exports (inferred from schemas)
// ============================================================================

export type GoogleAuthInput = z.infer<typeof GoogleAuthSchema>;
export type MobileAuthCodeInput = z.infer<typeof MobileAuthCodeSchema>;
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
export type UserSettingsInput = z.infer<typeof UserSettingsSchema>;
export type PushTokenInput = z.infer<typeof PushTokenSchema>;
export type SearchUsersInput = z.infer<typeof SearchUsersSchema>;

export type CreateDirectChatInput = z.infer<typeof CreateDirectChatSchema>;
export type CreateGroupChatInput = z.infer<typeof CreateGroupChatSchema>;
export type UpdateGroupInput = z.infer<typeof UpdateGroupSchema>;
export type GroupInviteInput = z.infer<typeof GroupInviteSchema>;
export type AddGroupMembersInput = z.infer<typeof AddGroupMembersSchema>;
export type PromoteDemoteAdminInput = z.infer<typeof PromoteDemoteAdminSchema>;
export type TransferOwnershipInput = z.infer<typeof TransferOwnershipSchema>;

export type SendMessageInput = z.infer<typeof SendMessageSchema>;
export type EditMessageInput = z.infer<typeof EditMessageSchema>;
export type DeleteMessageInput = z.infer<typeof DeleteMessageSchema>;
export type ForwardMessageInput = z.infer<typeof ForwardMessageSchema>;
export type ReactionInput = z.infer<typeof ReactionSchema>;
export type GetMessagesInput = z.infer<typeof GetMessagesSchema>;

export type NotificationInput = z.infer<typeof NotificationSchema>;
export type GetNotificationsInput = z.infer<typeof GetNotificationsSchema>;

export type SignedUploadRequestInput = z.infer<typeof SignedUploadRequestSchema>;
export type FriendActionInput = z.infer<typeof FriendActionSchema>;
export type BlockUserInput = z.infer<typeof BlockUserSchema>;