/**
 * Message Routes
 * Message CRUD, editing, forwarding, reactions, delivery/seen tracking
 */

import { Router } from 'express';
import {
  sendMessageController,
  getMessagesController,
  getMessageController,
  editMessageController,
  deleteMessageController,
  forwardMessageController,
  addReactionController,
  removeReactionController,
  markDeliveredController,
  markSeenController,
  markChatSeenController,
} from './controller';
import {
  sendMessageValidator,
  editMessageValidator,
  deleteMessageValidator,
  forwardMessageValidator,
  reactionValidator,
  markMessageValidator,
  markChatSeenValidator,
  chatIdParamValidator,
  messageIdParamValidator,
  getMessagesQueryValidator,
  validate,
} from './validators';
import { authMiddleware } from '../../shared/middleware/auth';

const router: Router = Router();

// All routes require authentication
router.use(authMiddleware);

// ============================================================================
// Message CRUD
// ============================================================================

// Send message
router.post('/', sendMessageValidator, validate, sendMessageController);

// Get messages for a chat (paginated)
router.get('/chat/:chatId', chatIdParamValidator, getMessagesQueryValidator, validate, getMessagesController);

// Get single message
router.get('/:messageId', messageIdParamValidator, validate, getMessageController);

// Edit message
router.patch('/:messageId/edit', editMessageValidator, validate, editMessageController);

// Delete message (for me or everyone)
router.delete('/:messageId', deleteMessageValidator, validate, deleteMessageController);

// Forward message
router.post('/:messageId/forward', forwardMessageValidator, validate, forwardMessageController);

// ============================================================================
// Reactions
// ============================================================================

// Add reaction
router.post('/:messageId/reactions', reactionValidator, validate, addReactionController);

// Remove reaction
router.delete('/:messageId/reactions', reactionValidator, validate, removeReactionController);

// ============================================================================
// Delivery & Seen Receipts
// ============================================================================

// Mark message as delivered
router.post('/:messageId/delivered', markMessageValidator, validate, markDeliveredController);

// Mark message as seen
router.post('/:messageId/seen', markMessageValidator, validate, markSeenController);

// Mark all messages in chat as seen (up to a point)
router.post('/chat/:chatId/seen', markChatSeenValidator, validate, markChatSeenController);

export { router as messageRoutes };