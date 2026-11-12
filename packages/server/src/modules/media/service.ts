/**
 * Media Service
 * Business logic for media asset management
 */

import mongoose from 'mongoose';
import { MediaAsset, IMediaAsset } from './model';
import { User } from '../user/model';
import { ApiError } from '../../shared/utils/apiError';
import { logger } from '../../shared/utils/logger';
import { CloudinaryFolder, CloudinaryTransformation, MediaConstraints } from '@chat-app/shared/constants';
import {
  uploadToCloudinary,
  deleteFromCloudinary,
  generateSignedUploadParams,
  validateMediaFile,
  getCloudinaryResource,
} from '../../shared/utils/mediaUpload';
import { Limits } from '@chat-app/shared/constants';

// ============================================================================
// Types
// ============================================================================

interface UploadInput {
  file: Buffer;
  fileName: string;
  mimeType: string;
  userId: string;
  folder?: CloudinaryFolder;
  transformation?: CloudinaryTransformation;
  chatId?: string;
  messageId?: string;
  tags?: string[];
}

interface SignedUploadInput {
  fileName: string;
  mimeType: string;
  userId: string;
  folder?: CloudinaryFolder;
  transformation?: CloudinaryTransformation;
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

export const uploadMedia = async (input: UploadInput): Promise<IMediaAsset> => {
  const { file, fileName, mimeType, userId, folder = 'chat_media', transformation, chatId, messageId, tags = [] } = input;

  // Validate file
  const validation = validateMediaFile(file, mimeType);
  if (!validation.valid) {
    throw new ApiError(400, validation.error!, 'INVALID_MEDIA_FILE');
  }

  // Verify user
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
  }

  // Upload to Cloudinary
  const result = await uploadToCloudinary(file, {
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
    publicId: result.public_id,
    url: result.url,
    secureUrl: result.secure_url,
    format: result.format,
    resourceType: result.resource_type as 'image' | 'video' | 'raw',
    type: result.type as 'upload' | 'private' | 'authenticated',
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

  logger.debug('Media uploaded', { publicId: result.public_id, userId, folder });
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
  transformation?: CloudinaryTransformation;
}> => {
  const { fileName, mimeType, userId, folder = 'chat_media', transformation, tags = [] } = input;

  // Validate file type (basic check)
  const validation = validateMediaFile(Buffer.from(''), mimeType, fileName);
  if (!validation.valid) {
    throw new ApiError(400, validation.error!, 'INVALID_MEDIA_FILE');
  }

  // Verify user
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
  }

  // Generate signed upload params
  const params = generateSignedUploadParams({
    folder,
    publicId: undefined,
    transformation,
    tags: [`user:${userId}`, ...tags],
    context: {
      uploadedBy: userId,
      originalName: fileName,
    },
  });

  return params;
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
  const resource = await getCloudinaryResource(publicId);

  if (!resource) {
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
    await deleteFromCloudinary(publicId);
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
  await deleteFromCloudinary(publicId);

  // Delete from database
  await MediaAsset.findByIdAndDelete(mediaAsset._id);

  logger.debug('Media deleted', { publicId, userId });
};

// ============================================================================
// Get Media Info
// ============================================================================

export const getMediaInfo = async (publicId: string): Promise<IMediaAsset | null> => {
  return MediaAsset.findOne({ publicId }).lean();
};

export const getUserMedia = async (
  userId: string,
  options: { page?: number; limit?: number; folder?: string; resourceType?: 'image' | 'video' | 'raw' } = {}
): Promise<{ assets: IMediaAsset[]; pagination: { page: number; limit: number; total: number; totalPages: number; hasNextPage: boolean } }> => {
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
    assets,
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
      await deleteFromCloudinary(asset.publicId);
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
  transformation: CloudinaryTransformation
): string => {
  // This would use Cloudinary's URL generation
  // For now, return the base URL with transformation params
  const baseUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`;
  const transformParts: string[] = [];

  if (transformation.width) transformParts.push(`w_${transformation.width}`);
  if (transformation.height) transformParts.push(`h_${transformation.height}`);
  if (transformation.crop) transformParts.push(`c_${transformation.crop}`);
  if (transformation.gravity) transformParts.push(`g_${transformation.gravity}`);
  if (transformation.quality) transformParts.push(`q_${transformation.quality}`);
  if (transformation.format) transformParts.push(`f_${transformation.format}`);

  const transformString = transformParts.length > 0 ? transformParts.join(',') + '/' : '';
  return `${baseUrl}/${transformString}${publicId}`;
};