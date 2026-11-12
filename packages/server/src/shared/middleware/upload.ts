/**
 * File Upload Middleware
 * Multer configuration with magic bytes validation
 */

import multer, { FileFilterCallback, Multer } from 'multer';
import { Request, Response, NextFunction } from 'express';
import { MediaConstraints, MagicBytes } from '@chat-app/shared/constants';
import { ApiError } from '../../shared/utils/apiError';
import { logger } from '../../shared/utils/logger';

// ============================================================================
// Configuration
// ============================================================================

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB max (video limit)

interface UploadCategory {
  maxSize: number;
  allowedMimeTypes: string[];
  allowedExtensions: string[];
}

// Create mutable copies to avoid readonly issues
const imageConstraints = {
  maxSize: MediaConstraints.IMAGE.maxSize,
  allowedMimeTypes: [...MediaConstraints.IMAGE.allowedMimeTypes],
  allowedExtensions: [...MediaConstraints.IMAGE.allowedExtensions],
};
const videoConstraints = {
  maxSize: MediaConstraints.VIDEO.maxSize,
  allowedMimeTypes: [...MediaConstraints.VIDEO.allowedMimeTypes],
  allowedExtensions: [...MediaConstraints.VIDEO.allowedExtensions],
};
const audioConstraints = {
  maxSize: MediaConstraints.AUDIO.maxSize,
  allowedMimeTypes: [...MediaConstraints.AUDIO.allowedMimeTypes],
  allowedExtensions: [...MediaConstraints.AUDIO.allowedExtensions],
};
const fileConstraints = {
  maxSize: MediaConstraints.FILE.maxSize,
  allowedMimeTypes: [...MediaConstraints.FILE.allowedMimeTypes],
  allowedExtensions: [...MediaConstraints.FILE.allowedExtensions],
};

const UPLOAD_CATEGORIES: Record<string, UploadCategory> = {
  avatar: imageConstraints,
  image: imageConstraints,
  video: videoConstraints,
  audio: audioConstraints,
  file: fileConstraints,
  auto: {
    maxSize: MAX_FILE_SIZE,
    allowedMimeTypes: [
      ...imageConstraints.allowedMimeTypes,
      ...videoConstraints.allowedMimeTypes,
      ...audioConstraints.allowedMimeTypes,
      ...fileConstraints.allowedMimeTypes,
    ],
    allowedExtensions: [
      ...imageConstraints.allowedExtensions,
      ...videoConstraints.allowedExtensions,
      ...audioConstraints.allowedExtensions,
      ...fileConstraints.allowedExtensions,
    ],
  },
};

// ============================================================================
// Magic Bytes Validation
// ============================================================================

const validateMagicBytes = (buffer: Buffer, mimeType: string): boolean => {
  const signatures = MagicBytes[mimeType];
  if (!signatures) return true; // Unknown type, skip validation

  return signatures.some((sig) =>
    sig.every((byte, index) => buffer[index] === byte)
  );
};

// ============================================================================
// File Filter
// ============================================================================

const createFileFilter = (category: string = 'auto') => {
  const constraints = UPLOAD_CATEGORIES[category] || UPLOAD_CATEGORIES.auto;

  return (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    // Check MIME type
    if (!constraints.allowedMimeTypes.includes(file.mimetype)) {
      logger.warn({ mimetype: file.mimetype, allowed: constraints.allowedMimeTypes, category }, 'File upload rejected: invalid MIME type');
      return cb(new ApiError(415, `File type not allowed. Allowed: ${constraints.allowedMimeTypes.join(', ')}`, 'UNSUPPORTED_MEDIA_TYPE'));
    }

    // Check extension
    const extension = '.' + file.originalname.split('.').pop()?.toLowerCase();
    if (!constraints.allowedExtensions.includes(extension)) {
      logger.warn({ extension, allowed: constraints.allowedExtensions, category }, 'File upload rejected: invalid extension');
      return cb(new ApiError(415, `File extension not allowed. Allowed: ${constraints.allowedExtensions.join(', ')}`, 'UNSUPPORTED_MEDIA_TYPE'));
    }

    cb(null, true);
  };
};

// ============================================================================
// Multer Configuration
// ============================================================================

const createMulter = (category: string = 'auto'): Multer => {
  const constraints = UPLOAD_CATEGORIES[category] || UPLOAD_CATEGORIES.auto;

  return multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: constraints.maxSize,
      files: 1,
      fields: 10,
      fieldNameSize: 100,
      fieldSize: 1024 * 1024, // 1MB
    },
    fileFilter: createFileFilter(category),
  });
};

// ============================================================================
// Pre-configured Upload Middlewares
// ============================================================================

import type { RequestHandler } from 'express';

export const uploadAvatar: RequestHandler = createMulter('avatar').single('avatar');
export const uploadImage: RequestHandler = createMulter('image').single('image');
export const uploadVideo: RequestHandler = createMulter('video').single('video');
export const uploadAudio: RequestHandler = createMulter('audio').single('audio');
export const uploadFile: RequestHandler = createMulter('file').single('file');
export const uploadAny: RequestHandler = createMulter('auto').single('file');
export const uploadMultiple: RequestHandler = createMulter('auto').array('files', 10);

// Mixed fields for different file types
export const uploadMixed: RequestHandler = createMulter('auto').fields([
  { name: 'avatar', maxCount: 1 },
  { name: 'image', maxCount: 5 },
  { name: 'video', maxCount: 2 },
  { name: 'audio', maxCount: 3 },
  { name: 'file', maxCount: 5 },
]);

// ============================================================================
// Magic Bytes Validation Middleware (runs after multer)
// ============================================================================

export const validateUploadedFile = (category: string = 'auto') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const file = req.file;
    if (!file) return next();

    try {
      // Validate magic bytes
      if (!validateMagicBytes(file.buffer, file.mimetype)) {
        logger.warn({ mimetype: file.mimetype, originalname: file.originalname }, 'File upload rejected: magic bytes mismatch');
        throw new ApiError(415, 'File content does not match declared type', 'INVALID_FILE_CONTENT');
      }

      // Additional category-specific validation
      if (category !== 'auto') {
        const constraints = UPLOAD_CATEGORIES[category];
        if (constraints) {
          if (!constraints.allowedMimeTypes.includes(file.mimetype)) {
            throw new ApiError(415, `File type not allowed for ${category} upload`, 'FILE_TYPE_NOT_ALLOWED');
          }
          if (file.size > constraints.maxSize) {
            const maxMB = constraints.maxSize / (1024 * 1024);
            throw new ApiError(413, `File too large. Maximum size for ${category}: ${maxMB}MB`, 'FILE_TOO_LARGE');
          }
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Remove duplicate import at end of file

// ============================================================================
// Error Handling for Multer
// ============================================================================

export const handleUploadError = (error: Error, req: Request, res: Response, next: NextFunction) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(413).json({
          success: false,
          error: 'File too large',
          message: `File exceeds maximum allowed size of ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(413).json({
          success: false,
          error: 'Too many files',
          message: 'Exceeded maximum number of files',
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          error: 'Unexpected file field',
          message: `Unexpected file field: ${error.field}`,
        });
      case 'LIMIT_FIELD_KEY':
        return res.status(400).json({
          success: false,
          error: 'Field name too long',
        });
      case 'LIMIT_FIELD_VALUE':
        return res.status(400).json({
          success: false,
          error: 'Field value too long',
        });
      case 'LIMIT_FIELD_COUNT':
        return res.status(400).json({
          success: false,
          error: 'Too many fields',
        });
      default:
        return res.status(400).json({
          success: false,
          error: 'Upload error',
          message: error.message,
        });
    }
  }

  if (error instanceof ApiError) {
    return res.status(error.statusCode).json({
      success: false,
      error: error.code,
      message: error.message,
    });
  }

  next(error);
};

// ============================================================================
// Upload Helpers
// ============================================================================

export const getUploadCategory = (mimeType: string): string => {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'file';
};

export const getFileCategory = (file: Express.Multer.File): string => {
  return getUploadCategory(file.mimetype);
};

// Type declarations for Express.Multer
declare global {
  namespace Express {
    interface Multer {
      single(fieldName: string): (req: Request, res: Response, next: NextFunction) => void;
      array(fieldName: string, maxCount?: number): (req: Request, res: Response, next: NextFunction) => void;
      fields(fields: { name: string; maxCount: number }[]): (req: Request, res: Response, next: NextFunction) => void;
      none(): (req: Request, res: Response, next: NextFunction) => void;
      any(): (req: Request, res: Response, next: NextFunction) => void;
    }
  }
}