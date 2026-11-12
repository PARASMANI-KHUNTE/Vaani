/**
 * Media Routes
 * Media upload, management, transformation
 */

import { Router, RequestHandler } from 'express';
import multer from 'multer';
import {
  uploadMediaController,
  getSignedUploadParamsController,
  confirmClientUploadController,
  moderateMediaController,
  deleteMediaController,
  getMediaInfoController,
  getUserMediaController,
  getTransformedUrlController,
} from './controller.js';
import {
  uploadMediaValidator,
  signedUploadValidator,
  confirmUploadValidator,
  moderateMediaValidator,
  deleteMediaValidator,
  getMediaInfoValidator,
  getUserMediaValidator,
  transformedUrlValidator,
  validate,
} from './validators.js';
import { authMiddleware, requireRole } from '../../shared/middleware/auth.js';

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
  },
  fileFilter: (_req, file, cb) => {
    // Allow images, videos, audio, and documents
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
      'audio/webm',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'));
    }
  },
});

const router: Router = Router();

// All routes require authentication
router.use(authMiddleware);

// ============================================================================
// Upload
// ============================================================================

// Server-side upload
router.post(
  '/upload',
  upload.single('file'),
  uploadMediaValidator,
  validate,
  uploadMediaController
);

// Get signed upload params for client-side direct upload
router.post('/signed-upload', signedUploadValidator, validate, getSignedUploadParamsController);

// Confirm client-side upload
router.post('/confirm/:publicId', confirmUploadValidator, validate, confirmClientUploadController);

// ============================================================================
// Moderation (Admin/Moderator only)
// ============================================================================

router.post(
  '/moderate/:publicId',
  requireRole('admin', 'moderator'),
  moderateMediaValidator,
  validate,
  moderateMediaController
);

// ============================================================================
// Media Management
// ============================================================================

// Delete media
router.delete('/:publicId', deleteMediaValidator, validate, deleteMediaController);

// Get media info
router.get('/:publicId', getMediaInfoValidator, validate, getMediaInfoController);

// Get user's media
router.get('/user/me', getUserMediaValidator, validate, getUserMediaController);

// Get transformed URL
router.get('/transform/:publicId', transformedUrlValidator, validate, getTransformedUrlController);

export { router as mediaRoutes };