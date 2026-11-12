/**
 * Media Controller
 * HTTP handlers for media endpoints
 */

import { Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { sendSuccess, sendCreated, sendOK, sendNoContent, sendError } from '../../shared/utils/apiResponse';
import {
  uploadMediaDirect,
  getSignedUploadParams,
  confirmClientUpload,
  moderateMedia,
  deleteMedia,
  getMediaInfo,
  getUserMedia,
  getTransformedUrl,
} from './service';

// ============================================================================
// Server-side Upload
// ============================================================================

export const uploadMediaController = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!._id.toString();
  const file = req.file;
  const { folder, transformation, chatId, messageId, tags } = req.body;

  if (!file) {
    return sendError(res, 400, 'No file provided', { code: 'NO_FILE' });
  }

  const mediaAsset = await uploadMediaDirect({
    file: file.buffer,
    fileName: file.originalname,
    mimeType: file.mimetype,
    userId,
    folder: folder as any,
    transformation: transformation ? JSON.parse(transformation) : undefined,
    chatId,
    messageId,
    tags: tags ? JSON.parse(tags) : [],
  });

  sendSuccess(res, 201, 'Media uploaded successfully', mediaAsset);
});

// ============================================================================
// Get Signed Upload Params (for client-side direct upload)
// ============================================================================

export const getSignedUploadParamsController = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!._id.toString();
  const { fileName, mimeType, folder, transformation, tags } = req.body;

  const params = await getSignedUploadParams({
    fileName,
    mimeType,
    userId,
    folder: folder as any,
    transformation,
    tags,
  });

  sendSuccess(res, 200, 'Signed upload params generated', params);
});

// ============================================================================
// Confirm Client Upload
// ============================================================================

export const confirmClientUploadController = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!._id.toString();
  const { publicId } = req.params;
  const { messageId, chatId } = req.body;

  const mediaAsset = await confirmClientUpload(publicId, userId, messageId, chatId);

  sendSuccess(res, 200, 'Upload confirmed successfully', mediaAsset);
});

// ============================================================================
// Moderate Media (Admin/Moderator)
// ============================================================================

export const moderateMediaController = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!._id.toString();
  const { publicId } = req.params;
  const { status, reason } = req.body;

  const mediaAsset = await moderateMedia({
    publicId,
    status,
    reason,
    moderatorId: userId,
  });

  sendSuccess(res, 200, `Media ${status} successfully`, mediaAsset);
});

// ============================================================================
// Delete Media
// ============================================================================

export const deleteMediaController = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!._id.toString();
  const { publicId } = req.params;

  await deleteMedia(publicId, userId);

  sendSuccess(res, 200, 'Media deleted successfully', null);
});

// ============================================================================
// Get Media Info
// ============================================================================

export const getMediaInfoController = asyncHandler(async (req: Request, res: Response) => {
  const { publicId } = req.params;

  const mediaAsset = await getMediaInfo(publicId);

  if (!mediaAsset) {
    return sendError(res, 404, 'Media not found', { code: 'MEDIA_NOT_FOUND' });
  }

  sendSuccess(res, 200, 'Media info retrieved successfully', mediaAsset);
});

// ============================================================================
// Get User Media
// ============================================================================

export const getUserMediaController = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!._id.toString();
  const { page, limit, folder, resourceType } = req.query;

  const result = await getUserMedia(userId, {
    page: page ? parseInt(page as string, 10) : 1,
    limit: limit ? parseInt(limit as string, 10) : 20,
    folder: folder as any,
    resourceType: resourceType as any,
  });

  sendSuccess(res, 200, 'User media retrieved successfully', result);
});

// ============================================================================
// Get Transformed URL
// ============================================================================

export const getTransformedUrlController = asyncHandler(async (req: Request, res: Response) => {
  const { publicId } = req.params;
  const { transformation } = req.query;

  if (!transformation) {
    return sendError(res, 400, 'Transformation params required', { code: 'MISSING_TRANSFORMATION' });
  }

  const url = getTransformedUrl(publicId, JSON.parse(transformation as string));

  sendSuccess(res, 200, 'Transformed URL generated', { url });
});