/**
 * System Controller
 * HTTP handlers for system endpoints (health, stats, settings, metrics)
 */

import { Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { sendSuccess, sendError, HttpStatus } from '../../shared/utils/apiResponse';
import {
  getHealthStatus,
  getDetailedHealth,
  getSystemSetting,
  setSystemSetting,
  getPublicSettings,
  recordMetric,
  getMetrics,
  createAuditLog,
  getAuditLogs,
  runRetentionCleanup,
  getSystemStats,
} from './service';

// ============================================================================
// Health Checks
// ============================================================================

export const healthCheckController = asyncHandler(async (_req: Request, res: Response) => {
  const health = await getHealthStatus();

  const statusCode = health.status === 'healthy' ? HttpStatus.OK : health.status === 'degraded' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
  sendSuccess(res, statusCode, 'Health check completed', health);
});

export const detailedHealthController = asyncHandler(async (req: Request, res: Response) => {
  // Only allow admins to see detailed health
  const user = req.user!;
  if (!['admin', 'moderator'].includes(user.role || '')) {
    return sendError(res, HttpStatus.FORBIDDEN, 'Insufficient permissions');
  }

  const health = await getDetailedHealth();
  sendSuccess(res, HttpStatus.OK, 'Detailed health check completed', health);
});

// ============================================================================
// System Settings
// ============================================================================

export const getSettingController = asyncHandler(async (req: Request, res: Response) => {
  const { key } = req.params;
  const value = await getSystemSetting(key);

  if (value === undefined) {
    return sendError(res, HttpStatus.NOT_FOUND, 'Setting not found');
  }

  sendSuccess(res, HttpStatus.OK, 'Setting retrieved successfully', { key, value });
});

export const setSettingController = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  if (!['admin'].includes(user.role || '')) {
    return sendError(res, HttpStatus.FORBIDDEN, 'Admin access required');
  }

  const { key } = req.params;
  const { value, description } = req.body;

  await setSystemSetting(key, value, description, user._id.toString());

  sendSuccess(res, HttpStatus.OK, 'Setting updated successfully', { key, value });
});

export const getPublicSettingsController = asyncHandler(async (_req: Request, res: Response) => {
  const settings = await getPublicSettings();
  sendSuccess(res, HttpStatus.OK, 'Public settings retrieved successfully', settings);
});

// ============================================================================
// Metrics
// ============================================================================

export const recordMetricController = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  if (!['admin', 'system'].includes(user.role || '')) {
    return sendError(res, HttpStatus.FORBIDDEN, 'Insufficient permissions');
  }

  const { name, value, tags } = req.body;

  await recordMetric(name, value, tags || {});

  sendSuccess(res, HttpStatus.OK, 'Metric recorded successfully', null);
});

export const getMetricsController = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  if (!['admin', 'moderator'].includes(user.role || '')) {
    return sendError(res, HttpStatus.FORBIDDEN, 'Insufficient permissions');
  }

  const { name } = req.params;
  const { start, end, tags } = req.query;

  const metrics = await getMetrics(
    name,
    start ? new Date(start as string) : new Date(Date.now() - 24 * 60 * 60 * 1000),
    end ? new Date(end as string) : new Date(),
    tags ? JSON.parse(tags as string) : {}
  );

  sendSuccess(res, HttpStatus.OK, 'Metrics retrieved successfully', { name, metrics });
});

// ============================================================================
// Audit Logs
// ============================================================================

export const getAuditLogsController = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  if (!['admin', 'moderator'].includes(user.role || '')) {
    return sendError(res, HttpStatus.FORBIDDEN, 'Insufficient permissions');
  }

  const { actorId, action, resourceType, resourceId, start, end, page, limit } = req.query;

  const result = await getAuditLogs({
    actorId: actorId as string,
    action: action as string,
    resourceType: resourceType as string,
    resourceId: resourceId as string,
    start: start ? new Date(start as string) : undefined,
    end: end ? new Date(end as string) : undefined,
    page: page ? parseInt(page as string, 10) : 1,
    limit: limit ? parseInt(limit as string, 10) : 50,
  });

  sendSuccess(res, HttpStatus.OK, 'Audit logs retrieved successfully', result);
});

// ============================================================================
// Retention Cleanup (Admin only)
// ============================================================================

export const runCleanupController = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  if (!['admin'].includes(user.role || '')) {
    return sendError(res, HttpStatus.FORBIDDEN, 'Admin access required');
  }

  const results = await runRetentionCleanup();

  sendSuccess(res, HttpStatus.OK, 'Retention cleanup completed', results);
});

// ============================================================================
// System Stats (Admin/Moderator)
// ============================================================================

export const getStatsController = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  if (!['admin', 'moderator'].includes(user.role || '')) {
    return sendError(res, HttpStatus.FORBIDDEN, 'Insufficient permissions');
  }

  const stats = await getSystemStats();
  sendSuccess(res, HttpStatus.OK, 'System stats retrieved successfully', stats);
});