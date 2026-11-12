/**
 * Media Service
 * Business logic for media asset management
 */

import mongoose from 'mongoose';
import { MediaAsset, IMediaAsset } from './model.js';
import { User } from '../user/model.js';
import { ApiError } from '../../shared/utils/apiError.js';
import { logger } from '../../shared/utils/logger.js';
import { CloudinaryFolders, CloudinaryTransformations, MediaConstraints, Limits } from '@chat-app/shared/constants';
import { config } from '../../config/index.js';
import {
  uploadMedia as uploadMediaToCloudinary,
  destroyMediaAssets,
  generateSignedUploadParams,
  validateMediaFile as validateMediaFileUtil,
  validateFileBuffer,
  getFolderForCategory,
  getTransformationForCategory,
} from '../../shared/utils/mediaUpload.js';
import { v2 as cloudinary } from 'cloudinary';

// ============================================================================
// Types
// ============================================================================

type CloudinaryFolder = typeof CloudinaryFolders[keyof typeof CloudinaryFolders];

interface UploadInput {
  file: Buffer;
  fileName: string;
  mimeType: string;
  userId: string;
  folder?: CloudinaryFolder;
  transformation?: string;
  chatId?: string;
  messageId?: string;
  tags?: string[];
}

interface SignedUploadInput {
  fileName: string;
  mimeType: string;
  userId: string;
  folder?: CloudinaryFolder;
  transformation?: string;
  tags?: string[];
}

interface ModerateInput {
  publicId: string;
  status: 'approved' | 'rejected';
  reason?: string;
  moderatorId: string;
}

// ============================================================================
// Direct Upload (Server-side)
// ============================================================================

export const uploadMediaDirect = async (input: UploadInput): Promise<IMediaAsset> => {
  const { file, fileName, mimeType, userId, folder = 'chat_media', transformation, chatId, messageId, tags = [] } = input;

  // Validate file
  const validation = validateMediaFileUtil(fileName, mimeType, file.length);
  if (!validation.valid) {
    throw new ApiError(400, validation.error || 'Invalid media file', 'INVALID_MEDIA_FILE');
  }

  // Verify user
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
  }

  // Upload to Cloudinary
  const result = await uploadMediaToCloudinary(file, {
    folder,
    publicId: undefined, // Auto-generate
    transformation,
    tags: [`user:${userId}`, ...tags],
    context: {
      uploadedBy: userId,
      originalName: fileName,
    },
  });

  // Record in database
  const mediaAsset = await MediaAsset.recordUpload({
    publicId: result.publicId,
    url: result.url,
    secureUrl: result.secureUrl,
    format: result.format,
    resourceType: result.resourceType as 'image' | 'video' | 'raw',
    width: result.width,
    height: result.height,
    duration: result.duration,
    bytes: result.bytes,
    originalFilename: fileName,
    mimeType,
    folder,
    tags: [`user:${userId}`, ...tags],
    uploadedBy: new mongoose.Types.ObjectId(userId),
    messageId: messageId ? new mongoose.Types.ObjectId(messageId) : undefined,
    chatId: chatId ? new mongoose.Types.ObjectId(chatId) : undefined,
  });

  logger.debug('Media uploaded', { publicId: result.publicId, userId, folder });
  return mediaAsset;
};

// ============================================================================
// Signed Upload (Client-side direct to Cloudinary)
// ============================================================================

export const getSignedUploadParams = async (input: SignedUploadInput): Promise<{
  uploadUrl: string;
  publicId: string;
  signature: string;
  timestamp: number;
  apiKey: string;
  folder: string;
  transformation?: string;
}> => {
  const { fileName, mimeType, userId, folder = 'chat_media', transformation, tags = [] } = input;

  // Validate file type (basic check) - using validateMediaFileUtil with a dummy file size
  const validation = validateMediaFileUtil(fileName, mimeType, 0, 'IMAGE');
  if (!validation.valid) {
    throw new ApiError(400, validation.error || 'Invalid media file', 'INVALID_MEDIA_FILE');
  }

  // Verify user
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
  }

  // Generate signed upload params
  const params = generateSignedUploadParams(folder, transformation);

  // Generate upload URL (Cloudinary unsigned upload endpoint)
  const uploadUrl = `https://api.cloudinary.com/v1_1/${config.cloudinary.cloudName}/auto/upload`;

  // Generate a public ID for the upload
  const publicId = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}`;

  return {
    uploadUrl,
    publicId,
    signature: params.signature,
    timestamp: params.timestamp,
    apiKey: params.apiKey,
    folder: params.folder,
    transformation: params.transformation,
  };
};

// ============================================================================
// Confirm Client Upload
// ============================================================================

export const confirmClientUpload = async (
  publicId: string,
  userId: string,
  messageId?: string,
  chatId?: string
): Promise<IMediaAsset> => {
  // Fetch resource info from Cloudinary
  let resource;
  try {
    resource = await cloudinary.api.resource(publicId);
  } catch {
    throw new ApiError(404, 'Media not found in Cloudinary', 'MEDIA_NOT_FOUND');
  }

  // Verify ownership via context
  if (resource.context?.custom?.uploadedBy !== userId) {
    throw new ApiError(403, 'Not authorized for this media', 'NOT_AUTHORIZED');
  }

  // Record in database
  const mediaAsset = await MediaAsset.recordUpload({
    publicId: resource.public_id,
    url: resource.url,
    secureUrl: resource.secure_url,
    format: resource.format,
    resourceType: resource.resource_type as 'image' | 'video' | 'raw',
    type: resource.type as 'upload' | 'private' | 'authenticated',
    width: resource.width,
    height: resource.height,
    duration: resource.duration,
    bytes: resource.bytes,
    originalFilename: resource.original_filename,
    mimeType: resource.mime_type,
    folder: resource.folder || 'chat_media',
    tags: resource.tags || [],
    uploadedBy: new mongoose.Types.ObjectId(userId),
    messageId: messageId ? new mongoose.Types.ObjectId(messageId) : undefined,
    chatId: chatId ? new mongoose.Types.ObjectId(chatId) : undefined,
  });

  // If linked to message, mark as not orphaned
  if (messageId && chatId) {
    await MediaAsset.linkToMessage(publicId, new mongoose.Types.ObjectId(messageId), new mongoose.Types.ObjectId(chatId));
  } else {
    // Schedule orphan cleanup
    await MediaAsset.scheduleOrphanCleanup(publicId, 7);
  }

  logger.debug('Client upload confirmed', { publicId, userId });
  return mediaAsset;
};

// ============================================================================
// Moderation
// ============================================================================

export const moderateMedia = async (input: ModerateInput): Promise<IMediaAsset> => {
  const { publicId, status, reason, moderatorId } = input;

  // Verify moderator
  const moderator = await User.findById(moderatorId);
  if (!moderator || !['admin', 'moderator'].includes(moderator.role || '')) {
    throw new ApiError(403, 'Not authorized to moderate', 'NOT_AUTHORIZED');
  }

  const mediaAsset = await MediaAsset.markModerated(publicId, status, reason);

  if (!mediaAsset) {
    throw new ApiError(404, 'Media not found', 'MEDIA_NOT_FOUND');
  }

  // If rejected, delete from Cloudinary
  if (status === 'rejected') {
    await destroyMediaAssets([publicId]);
    logger.warn('Media rejected and deleted', { publicId, reason, moderatorId });
  }

  return mediaAsset;
};

// ============================================================================
// Delete Media
// ============================================================================

export const deleteMedia = async (publicId: string, userId: string): Promise<void> => {
  const mediaAsset = await MediaAsset.findOne({ publicId });

  if (!mediaAsset) {
    throw new ApiError(404, 'Media not found', 'MEDIA_NOT_FOUND');
  }

  // Check ownership
  if (!mediaAsset.uploadedBy.equals(userId)) {
    const user = await User.findById(userId);
    if (!user || !['admin', 'moderator'].includes(user.role || '')) {
      throw new ApiError(403, 'Not authorized to delete this media', 'NOT_AUTHORIZED');
    }
  }

  // Delete from Cloudinary
  await destroyMediaAssets([publicId]);

  // Delete from database
  await MediaAsset.findByIdAndDelete(mediaAsset._id);

  logger.debug('Media deleted', { publicId, userId });
};

// ============================================================================
// Get Media Info
// ============================================================================

export const getMediaInfo = async (publicId: string): Promise<Record<string, unknown> | null> => {
  return MediaAsset.findOne({ publicId }).lean() as Promise<Record<string, unknown> | null>;
};

export const getUserMedia = async (
  userId: string,
  options: { page?: number; limit?: number; folder?: string; resourceType?: 'image' | 'video' | 'raw' } = {}
): Promise<{ assets: Record<string, unknown>[]; pagination: { page: number; limit: number; total: number; totalPages: number; hasNextPage: boolean } }> => {
  const { page = 1, limit = 20, folder, resourceType } = options;
  const skip = (page - 1) * limit;

  const query: Record<string, unknown> = { uploadedBy: userId };
  if (folder) query.folder = folder;
  if (resourceType) query.resourceType = resourceType;

  const assets = await MediaAsset.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await MediaAsset.countDocuments(query);
  const totalPages = Math.ceil(total / limit);

  return {
    assets: assets as Record<string, unknown>[],
    pagination: { page, limit, total, totalPages, hasNextPage: page < totalPages },
  };
};

// ============================================================================
// Orphan Cleanup (called by cron job)
// ============================================================================

export const cleanupOrphanedMedia = async (): Promise<{ deleted: number; failed: number }> => {
  const orphanedAssets = await MediaAsset.getAssetsForCleanup();

  let deleted = 0;
  let failed = 0;

  for (const asset of orphanedAssets) {
    try {
      await destroyMediaAssets([asset.publicId]);
      await MediaAsset.findByIdAndDelete(asset._id);
      deleted++;
      logger.debug('Orphaned media cleaned up', { publicId: asset.publicId });
    } catch (error) {
      failed++;
      logger.error('Failed to cleanup orphaned media', { publicId: asset.publicId, error });
    }
  }

  return { deleted, failed };
};

// ============================================================================
// Transform URL Generation
// ============================================================================

export const getTransformedUrl = (
  publicId: string,
  transformation: Record<string, unknown>
): string => {
  // Use Cloudinary's URL generation
  return cloudinary.url(publicId, {
    secure: true,
    transformation: [transformation],
  });
};