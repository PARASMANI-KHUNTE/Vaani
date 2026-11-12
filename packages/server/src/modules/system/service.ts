/**
 * System Service
 * Business logic for system-level operations (health, metrics, settings, cleanup)
 */

import mongoose from 'mongoose';
import { AuditLog, SystemSettings, Metric, RateLimitRecord } from './model';
import { User } from '../user/model';
import { Chat } from '../chat/model';
import { Message } from '../message/model';
import { Notification } from '../notification/model';
import { MediaAsset } from '../media/model';
import { ApiError } from '../../shared/utils/apiError';
import { logger } from '../../shared/utils/logger';
import { config } from '../../config';
import { destroyMediaAssets } from '../../shared/utils/mediaUpload';
import { processOfflineQueue } from '../../shared/utils/offlineQueue';

// ============================================================================
// Health Check
// ============================================================================

export const getHealthStatus = async (): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Record<string, { status: 'up' | 'down' | 'degraded'; latency?: number; error?: string }>;
  timestamp: Date;
}> => {
  const checks: Record<string, { status: 'up' | 'down' | 'degraded'; latency?: number; error?: string }> = {};

  // Database check
  const dbStart = Date.now();
  try {
    await mongoose.connection.db!.admin().ping();
    checks.database = { status: 'up', latency: Date.now() - dbStart };
  } catch (error) {
    checks.database = { status: 'down', error: error instanceof Error ? error.message : 'Unknown error' };
  }

  // Redis check (if configured)
  if (config.redis.enabled) {
    const redisStart = Date.now();
    try {
      // This would use the actual Redis client
      checks.redis = { status: 'up', latency: Date.now() - redisStart };
    } catch (error) {
      checks.redis = { status: 'down', error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Cloudinary check
  const cloudinaryStart = Date.now();
  try {
    // This would ping Cloudinary
    checks.cloudinary = { status: 'up', latency: Date.now() - cloudinaryStart };
  } catch (error) {
    checks.cloudinary = { status: 'degraded', error: error instanceof Error ? error.message : 'Unknown error' };
  }

  // Determine overall status
  const statuses = Object.values(checks).map((c) => c.status);
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  if (statuses.includes('down')) {
    overallStatus = 'unhealthy';
  } else if (statuses.includes('degraded')) {
    overallStatus = 'degraded';
  }

  return {
    status: overallStatus,
    checks,
    timestamp: new Date(),
  };
};

export const getDetailedHealth = async (): Promise<{
  health: { status: 'healthy' | 'degraded' | 'unhealthy'; checks: Record<string, { status: 'up' | 'down' | 'degraded'; latency?: number; error?: string }>; timestamp: Date };
  stats: {
    uptime: number;
    memory: NodeJS.MemoryUsage;
    cpu: NodeJS.CpuUsage;
    connections: {
      database: number;
      redis: number;
      socket: number;
    };
  };
}> => {
  const health = await getHealthStatus();

  return {
    health,
    stats: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      connections: {
        database: mongoose.connection.readyState === 1 ? 1 : 0,
        redis: 0, // Would need actual count
        socket: 0, // Would need actual count from socket server
      },
    },
  };
};

// ============================================================================
// System Settings
// ============================================================================

export const getSystemSetting = async (key: string): Promise<unknown> => {
  return SystemSettings.getSetting(key);
};

export const setSystemSetting = async (
  key: string,
  value: unknown,
  description?: string,
  updatedBy?: string
): Promise<void> => {
  await SystemSettings.setSetting(key, value, description, updatedBy ? new mongoose.Types.ObjectId(updatedBy) : undefined);
};

export const getPublicSettings = async (): Promise<Record<string, unknown>> => {
  return SystemSettings.getPublicSettings();
};

// ============================================================================
// Metrics
// ============================================================================

export const recordMetric = async (name: string, value: number, tags: Record<string, string> = {}): Promise<void> => {
  await Metric.record(name, value, tags);
};

export const getMetrics = async (
  name: string,
  start: Date,
  end: Date,
  tags: Record<string, string> = {}
): Promise<Array<{ timestamp: Date; value: number }>> => {
  const metrics = await Metric.getMetrics(name, start, end, tags);
  return metrics.map((m) => ({ timestamp: m.timestamp, value: m.value }));
};

// ============================================================================
// Audit Logs
// ============================================================================

export const createAuditLog = async (data: {
  actorId?: string;
  actorType: 'user' | 'system' | 'admin';
  action: string;
  resourceType: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  success?: boolean;
  errorMessage?: string;
}): Promise<void> => {
  await AuditLog.log({
    ...data,
    actorId: data.actorId ? new mongoose.Types.ObjectId(data.actorId) : undefined,
    resourceId: data.resourceId ? new mongoose.Types.ObjectId(data.resourceId) : undefined,
  });
};

export const getAuditLogs = async (
  options: {
    actorId?: string;
    action?: string;
    resourceType?: string;
    resourceId?: string;
    start?: Date;
    end?: Date;
    page?: number;
    limit?: number;
  } = {}
): Promise<{ logs: any[]; pagination: { page: number; limit: number; total: number; totalPages: number; hasNextPage: boolean } }> => {
  const { actorId, action, resourceType, resourceId, start, end, page = 1, limit = 50 } = options;
  const skip = (page - 1) * limit;

  const query: Record<string, unknown> = {};

  if (actorId) query.actorId = new mongoose.Types.ObjectId(actorId);
  if (action) query.action = action;
  if (resourceType) query.resourceType = resourceType;
  if (resourceId) query.resourceId = new mongoose.Types.ObjectId(resourceId);
  if (start || end) {
    query.createdAt = {};
    if (start) (query.createdAt as Record<string, unknown>).$gte = start;
    if (end) (query.createdAt as Record<string, unknown>).$lte = end;
  }

  const [logs, total] = await Promise.all([
    AuditLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    AuditLog.countDocuments(query),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    logs,
    pagination: { page, limit, total, totalPages, hasNextPage: page < totalPages },
  };
};

// ============================================================================
// Data Retention Cleanup
// ============================================================================

export const runRetentionCleanup = async (): Promise<{
  chatsDeleted: number;
  messagesDeleted: number;
  mediaDeleted: number;
  notificationsDeleted: number;
  auditLogsDeleted: number;
  metricsDeleted: number;
  rateLimitsDeleted: number;
}> => {
  logger.info({}, 'Starting retention cleanup job');

  const results = {
    chatsDeleted: 0,
    messagesDeleted: 0,
    mediaDeleted: 0,
    notificationsDeleted: 0,
    auditLogsDeleted: 0,
    metricsDeleted: 0,
    rateLimitsDeleted: 0,
  };

  // 1. Clean up old deleted chats and messages
  const retentionDays = config.retention.chatDays || 365;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  // Find chats deleted for everyone older than retention period
  const deletedChats = await Chat.find({
    deletedForEveryone: true,
    deletedAt: { $lt: cutoffDate },
  }).lean();

  for (const chat of deletedChats) {
    // Delete messages in this chat
    const messages = await Message.find({ chatId: chat._id }).lean();
    const mediaAssets: any[] = [];

    for (const msg of messages) {
      if (msg.media) mediaAssets.push(msg.media);
    }

    // Delete messages
    await Message.deleteMany({ chatId: chat._id });
    results.messagesDeleted += messages.length;

    // Delete chat
    await Chat.findByIdAndDelete(chat._id);
    results.chatsDeleted++;

    // Delete media assets
    if (mediaAssets.length > 0) {
      const publicIds = mediaAssets.map((m: any) => m.publicId);
      await destroyMediaAssets(publicIds);
      results.mediaDeleted += mediaAssets.length;
    }
  }

  // 2. Clean up orphaned media
  const { deleted: mediaDeleted } = await cleanupOrphanedMedia();
  results.mediaDeleted += mediaDeleted;

  // 3. Clean up old notifications (read notifications older than 30 days)
  const notificationCutoff = new Date();
  notificationCutoff.setDate(notificationCutoff.getDate() - 30);
  const notificationResult = await Notification.deleteMany({
    isRead: true,
    readAt: { $lt: notificationCutoff },
  });
  results.notificationsDeleted = notificationResult.deletedCount || 0;

  // 4. Clean up old audit logs (older than 90 days)
  const auditCutoff = new Date();
  auditCutoff.setDate(auditCutoff.getDate() - 90);
  const auditResult = await AuditLog.deleteMany({
    createdAt: { $lt: auditCutoff },
  });
  results.auditLogsDeleted = auditResult.deletedCount || 0;

  // 5. Clean up old metrics (older than 30 days)
  const metricsCutoff = new Date();
  metricsCutoff.setDate(metricsCutoff.getDate() - 30);
  const metricsResult = await Metric.deleteMany({
    timestamp: { $lt: metricsCutoff },
  });
  results.metricsDeleted = metricsResult.deletedCount || 0;

  // 6. Clean up expired rate limit records (handled by TTL index, but manual cleanup for safety)
  const rateLimitResult = await RateLimitRecord.deleteMany({
    expiresAt: { $lt: new Date() },
  });
  results.rateLimitsDeleted = rateLimitResult.deletedCount || 0;

  logger.info(results, 'Retention cleanup completed');
  return results;
};

// ============================================================================
// Orphan Media Cleanup
// ============================================================================

const cleanupOrphanedMedia = async (): Promise<{ deleted: number; failed: number }> => {
  const orphanedAssets = await MediaAsset.getAssetsForCleanup();

  let deleted = 0;
  let failed = 0;

  for (const asset of orphanedAssets) {
    try {
      await destroyMediaAssets([asset.publicId]);
      await MediaAsset.findByIdAndDelete(asset._id);
      deleted++;
    } catch (error) {
      failed++;
      logger.error({ publicId: asset.publicId, error }, 'Failed to cleanup orphaned media');
    }
  }

  return { deleted, failed };
};

// ============================================================================
// System Stats
// ============================================================================

export const getSystemStats = async (): Promise<{
  users: { total: number; active: number; online: number };
  chats: { total: number; direct: number; groups: number };
  messages: { total: number; today: number };
  media: { total: number; storageBytes: number };
  notifications: { total: number; unread: number };
}> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalUsers,
    activeUsers,
    onlineUsers,
    totalChats,
    directChats,
    groupChats,
    totalMessages,
    messagesToday,
    mediaStats,
    totalNotifications,
    unreadNotifications,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ accountStatus: 'active' }),
    User.countDocuments({ isOnline: true }),
    Chat.countDocuments({ deletedForEveryone: { $ne: true } }),
    Chat.countDocuments({ type: 'direct', deletedForEveryone: { $ne: true } }),
    Chat.countDocuments({ type: 'group', deletedForEveryone: { $ne: true } }),
    Message.countDocuments({ deletedForEveryone: { $ne: true } }),
    Message.countDocuments({ deletedForEveryone: { $ne: true }, createdAt: { $gte: today } }),
    MediaAsset.aggregate([
      { $group: { _id: null, total: { $sum: 1 }, storageBytes: { $sum: '$bytes' } } },
    ]),
    Notification.countDocuments(),
    Notification.countDocuments({ isRead: false }),
  ]);

  return {
    users: { total: totalUsers, active: activeUsers, online: onlineUsers },
    chats: { total: totalChats, direct: directChats, groups: groupChats },
    messages: { total: totalMessages, today: messagesToday },
    media: { total: mediaStats[0]?.total || 0, storageBytes: mediaStats[0]?.storageBytes || 0 },
    notifications: { total: totalNotifications, unread: unreadNotifications },
  };
};

// ============================================================================
// Process Offline Queue (for all users)
// ============================================================================

export const processAllOfflineQueues = async (): Promise<void> => {
  // This would be called periodically to process offline queues
  // In practice, this is handled by the socket layer when users come online
  logger.debug({}, 'Processing all offline queues');
  // Implementation depends on offline queue structure
};