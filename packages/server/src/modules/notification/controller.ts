/**
 * Notification Controller
 * HTTP handlers for notification endpoints
 */

import { Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { sendSuccess, sendError } from '../../shared/utils/apiResponse';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
} from './service';

// ============================================================================
// Get Notifications
// ============================================================================

export const getNotificationsController = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!._id.toString();
  const { page, limit, unreadOnly, type, before } = req.query;

  const result = await getNotifications({
    userId,
    page: page ? parseInt(page as string, 10) : 1,
    limit: limit ? parseInt(limit as string, 10) : 20,
    unreadOnly: unreadOnly === 'true',
    type: type as any,
    before: before ? new Date(before as string) : undefined,
  });

  sendSuccess(res, 200, 'Notifications retrieved successfully', result);
});

// ============================================================================
// Get Unread Count
// ============================================================================

export const getUnreadCountController = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!._id.toString();

  const count = await getUnreadCount(userId);

  sendSuccess(res, 200, 'Unread count retrieved successfully', { count });
});

// ============================================================================
// Mark as Read
// ============================================================================

export const markAsReadController = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!._id.toString();
  const { notificationId } = req.params;

  const notification = await markAsRead(notificationId, userId);

  sendSuccess(res, 200, 'Notification marked as read', notification);
});

// ============================================================================
// Mark All as Read
// ============================================================================

export const markAllAsReadController = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!._id.toString();

  await markAllAsRead(userId);

  sendSuccess(res, 200, 'All notifications marked as read', null);
});