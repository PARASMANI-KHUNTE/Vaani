/**
 * Media Upload Utilities
 * Cloudinary integration with transformations, signed uploads, and asset cleanup
 */

import { v2 as cloudinary } from 'cloudinary';
import { config } from '../../config';
import { CloudinaryFolders, CloudinaryTransformations, MediaConstraints } from '@chat-app/shared/constants';
import { logger } from './logger';
import { validateMagicBytes, MagicBytes } from '@chat-app/shared/validators';

// ============================================================================
// Types
// ============================================================================

export interface UploadOptions {
  folder?: string;
  resourceType?: 'image' | 'video' | 'raw' | 'auto';
  transformation?: string | Record<string, unknown>;
  publicId?: string;
  overwrite?: boolean;
  invalidate?: boolean;
  tags?: string[];
  context?: Record<string, string>;
}

export interface UploadResult {
  publicId: string;
  url: string;
  secureUrl: string;
  format: string;
  width?: number;
  height?: number;
  duration?: number;
  bytes: number;
  resourceType: string;
  createdAt: string;
}

export interface SignedUploadParams {
  signature: string;
  timestamp: number;
  apiKey: string;
  folder: string;
  transformation?: string;
}

// ============================================================================
// Initialize Cloudinary
// ============================================================================

if (config.cloudinary.cloudName && config.cloudinary.apiKey && config.cloudinary.apiSecret) {
  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
    secure: true,
  });
} else {
  logger.warn({ cloudinary: 'not configured' }, 'Cloudinary not configured - media uploads will fail');
}

// ============================================================================
// Upload Functions
// ============================================================================

/**
 * Upload a file to Cloudinary
 */
export const uploadMedia = async (
  file: string | Buffer, // Base64 string, file path, or buffer
  options: UploadOptions = {}
): Promise<UploadResult> => {
  const {
    folder = CloudinaryFolders.CHAT_IMAGES,
    resourceType = 'auto',
    transformation,
    publicId,
    overwrite = false,
    invalidate = true,
    tags = [],
    context = {},
  } = options;

  const uploadOptions: Record<string, unknown> = {
    folder,
    resource_type: resourceType,
    overwrite,
    invalidate,
    tags: ['chat-app', ...tags],
    context: { source: 'chat-app', ...context },
    use_filename: true,
    unique_filename: true,
  };

  if (publicId) {
    uploadOptions.public_id = publicId;
  }

  if (transformation) {
    uploadOptions.transformation = transformation;
  }

  try {
    // Cloudinary accepts string (path, URL, base64) or Buffer - cast to satisfy TypeScript
    const result = await cloudinary.uploader.upload(file as string, uploadOptions);

    return {
      publicId: result.public_id,
      url: result.url,
      secureUrl: result.secure_url,
      format: result.format,
      width: result.width,
      height: result.height,
      duration: result.duration,
      bytes: result.bytes,
      resourceType: result.resource_type,
      createdAt: result.created_at,
    };
  } catch (error) {
    logger.error({ error: (error as Error).message, folder }, 'Cloudinary upload failed');
    throw error;
  }
};

/**
 * Upload multiple files
 */
export const uploadMultiple = async (
  files: (string | Buffer)[],
  options: UploadOptions = {}
): Promise<UploadResult[]> => {
  return Promise.all(files.map((file) => uploadMedia(file, options)));
};

/**
 * Generate signed upload parameters for direct client uploads
 */
export const generateSignedUploadParams = (
  folder: string = CloudinaryFolders.CHAT_IMAGES,
  transformation?: string
): SignedUploadParams => {
  const timestamp = Math.round(Date.now() / 1000);
  const paramsToSign: Record<string, unknown> = {
    folder,
    timestamp,
  };

  if (transformation) {
    paramsToSign.transformation = transformation;
  }

  const signature = cloudinary.utils.api_sign_request(paramsToSign, config.cloudinary.apiSecret);

  return {
    signature,
    timestamp,
    apiKey: config.cloudinary.apiKey,
    folder,
    transformation,
  };
};

/**
 * Delete media assets by public IDs
 */
export const destroyMediaAssets = async (publicIds: string[]): Promise<number> => {
  if (!publicIds.length) return 0;

  try {
    const result = await cloudinary.api.delete_resources(publicIds, {
      invalidate: true,
      resource_type: 'auto',
    });

    const deleted = result.deleted ? Object.keys(result.deleted).length : 0;
    logger.info({ count: deleted, publicIds }, 'Cloudinary assets destroyed');
    return deleted;
  } catch (error) {
    logger.error({ error: (error as Error).message, publicIds }, 'Failed to destroy Cloudinary assets');
    return 0;
  }
};

/**
 * Delete media by folder prefix
 */
export const destroyByFolder = async (folder: string): Promise<number> => {
  try {
    const result = await cloudinary.api.delete_resources_by_prefix(folder, {
      invalidate: true,
    });

    const deleted = result.deleted ? Object.keys(result.deleted).length : 0;
    logger.info({ folder, count: deleted }, 'Cloudinary folder destroyed');
    return deleted;
  } catch (error) {
    logger.error({ error: (error as Error).message, folder }, 'Failed to destroy Cloudinary folder');
    return 0;
  }
};

/**
 * Get optimized URL for an asset
 */
export const getOptimizedUrl = (
  publicId: string,
  options: {
    width?: number;
    height?: number;
    quality?: 'auto' | number;
    format?: 'auto' | 'webp' | 'avif' | 'jpg' | 'png';
    crop?: 'fill' | 'scale' | 'fit' | 'thumb';
    gravity?: 'auto' | 'face' | 'center';
  } = {}
): string => {
  const { width, height, quality = 'auto', format = 'auto', crop = 'fill', gravity = 'auto' } = options;

  return cloudinary.url(publicId, {
    secure: true,
    width,
    height,
    quality,
    format,
    crop,
    gravity,
  });
};

/**
 * Get thumbnail URL
 */
export const getThumbnailUrl = (publicId: string, size: number = 300): string => {
  return getOptimizedUrl(publicId, {
    width: size,
    height: size,
    crop: 'fill',
    gravity: 'auto',
    quality: 'auto',
    format: 'auto',
  });
};

/**
 * Validate file before upload
 */
export const validateMediaFile = (
  fileName: string,
  mimeType: string,
  fileSize: number,
  category: keyof typeof MediaConstraints = 'IMAGE'
): { valid: boolean; error?: string } => {
  // Type assertion to avoid TypeScript narrowing issues
  const constraints = MediaConstraints[category] as { maxSize: number; allowedMimeTypes: readonly string[]; allowedExtensions: readonly string[] };

  if (!constraints.allowedMimeTypes.includes(mimeType)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed: ${constraints.allowedMimeTypes.join(', ')}`,
    };
  }

  if (fileSize > constraints.maxSize) {
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
};

/**
 * Validate file buffer using magic bytes
 */
export const validateFileBuffer = (buffer: Buffer, mimeType: string): boolean => {
  return validateMagicBytes(buffer, mimeType);
};

/**
 * Get folder for media category
 */
export const getFolderForCategory = (category: 'avatar' | 'chat' | 'group' | 'message'): string => {
  switch (category) {
    case 'avatar':
      return CloudinaryFolders.AVATARS;
    case 'group':
      return CloudinaryFolders.GROUP_AVATARS;
    case 'message':
      return CloudinaryFolders.CHAT_IMAGES;
    case 'chat':
    default:
      return CloudinaryFolders.CHAT_IMAGES;
  }
};

/**
 * Get transformation for media category
 */
export const getTransformationForCategory = (
  category: 'avatar' | 'chat' | 'group' | 'message',
  variant?: 'thumbnail' | 'preview' | 'large'
): string => {
  switch (category) {
    case 'avatar':
      return variant === 'large' ? CloudinaryTransformations.AVATAR_LARGE : CloudinaryTransformations.AVATAR;
    case 'group':
      return CloudinaryTransformations.GROUP_AVATAR;
    case 'message':
      return variant === 'preview' ? CloudinaryTransformations.CHAT_PREVIEW : CloudinaryTransformations.CHAT_THUMBNAIL;
    case 'chat':
    default:
      return CloudinaryTransformations.CHAT_THUMBNAIL;
  }
};

/**
 * Extract media info from Cloudinary URL
 */
export const extractMediaInfo = (url: string): { publicId: string; format: string } | null => {
  try {
    const match = url.match(/\/v\d+\/(.+)\.(.+)$/);
    if (match) {
      return { publicId: match[1], format: match[2] };
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * Generate Cloudinary eager transformations
 */
export const generateEagerTransformations = (
  category: 'avatar' | 'chat' | 'group' | 'message'
): Array<Record<string, unknown>> => {
  const baseTransform = getTransformationForCategory(category);

  return [
    { transformation: baseTransform },
    { transformation: `${baseTransform}/w_100,h_100` }, // Small thumbnail
  ];
};