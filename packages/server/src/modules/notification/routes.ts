/**
 * Notification Routes
 * In-app notification management
 */

import { Router } from 'express';
import {
  getNotificationsController,
  getUnreadCountController,
  markAsReadController,
  markAllAsReadController,
} from './controller';
import {
  notificationIdParamValidator,
  getNotificationsQueryValidator,
  validate,
} from './validators';
import { authMiddleware } from '../../shared/middleware/auth';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Get notifications (paginated)
router.get('/', getNotificationsQueryValidator, validate, getNotificationsController);

// Get unread count
router.get('/unread-count', getUnreadCountController);

// Mark all as read
router.post('/read-all', markAllAsReadController);

// Mark single as read
router.post('/:notificationId/read', notificationIdParamValidator, validate, markAsReadController);

export { router as notificationRoutes };