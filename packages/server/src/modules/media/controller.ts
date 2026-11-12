/**
 * Media Controller
 * HTTP handlers for media endpoints
 */

import { Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { apiResponse } from '../../shared/utils/apiResponse';
import {
  uploadMedia,
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
    return apiResponse.error(res, 'No file provided', 400, 'NO_FILE');
  }

  const mediaAsset = await uploadMedia({
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

  apiResponse.success(res, mediaAsset, 'Media uploaded successfully', 201);
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

  apiResponse.success(res, params, 'Signed upload params generated');
});

// ============================================================================
// Confirm Client Upload
// ============================================================================

export const confirmClientUploadController = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!._id.toString();
  const { publicId } = req.params;
  const { messageId, chatId } = req.body;

  const mediaAsset = await confirmClientUpload(publicId, userId, messageId, chatId);

  apiResponse.success(res, mediaAsset, 'Upload confirmed successfully');
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

  apiResponse.success(res, mediaAsset, `Media ${status} successfully`);
});

// ============================================================================
// Delete Media
// ============================================================================

export const deleteMediaController = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!._id.toString();
  const { publicId } = req.params;

  await deleteMedia(publicId, userId);

  apiResponse.success(res, null, 'Media deleted successfully');
});

// ============================================================================
// Get Media Info
// ============================================================================

export const getMediaInfoController = asyncHandler(async (req: Request, res: Response) => {
  const { publicId } = req.params;

  const mediaAsset = await getMediaInfo(publicId);

  if (!mediaAsset) {
    return apiResponse.notFound(res, 'Media not found');
  }

  apiResponse.success(res, mediaAsset, 'Media info retrieved successfully');
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

  apiResponse.success(res, result, 'User media retrieved successfully');
});

// ============================================================================
// Get Transformed URL
// ============================================================================

export const getTransformedUrlController = asyncHandler(async (req: Request, res: Response) => {
  const { publicId } = req.params;
  const { transformation } = req.query;

  if (!transformation) {
    return apiResponse.error(res, 'Transformation params required', 400, 'MISSING_TRANSFORMATION');
  }

  const url = getTransformedUrl(publicId, JSON.parse(transformation as string));

  apiResponse.success(res, { url }, 'Transformed URL generated');
});