/**
 * System Controller
 * HTTP handlers for system endpoints (health, stats, settings, metrics)
 */

import { Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { apiResponse } from '../../shared/utils/apiResponse';
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

  const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;
  apiResponse.success(res, health, 'Health check completed', statusCode);
});

export const detailedHealthController = asyncHandler(async (req: Request, res: Response) => {
  // Only allow admins to see detailed health
  const user = req.user!;
  if (!['admin', 'moderator'].includes(user.role || '')) {
    return apiResponse.forbidden(res, 'Insufficient permissions');
  }

  const health = await getDetailedHealth();
  apiResponse.success(res, health, 'Detailed health check completed');
});

// ============================================================================
// System Settings
// ============================================================================

export const getSettingController = asyncHandler(async (req: Request, res: Response) => {
  const { key } = req.params;
  const value = await getSystemSetting(key);

  if (value === undefined) {
    return apiResponse.notFound(res, 'Setting not found');
  }

  apiResponse.success(res, { key, value }, 'Setting retrieved successfully');
});

export const setSettingController = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  if (!['admin'].includes(user.role || '')) {
    return apiResponse.forbidden(res, 'Admin access required');
  }

  const { key } = req.params;
  const { value, description } = req.body;

  await setSystemSetting(key, value, description, user._id.toString());

  apiResponse.success(res, { key, value }, 'Setting updated successfully');
});

export const getPublicSettingsController = asyncHandler(async (_req: Request, res: Response) => {
  const settings = await getPublicSettings();
  apiResponse.success(res, settings, 'Public settings retrieved successfully');
});

// ============================================================================
// Metrics
// ============================================================================

export const recordMetricController = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  if (!['admin', 'system'].includes(user.role || '')) {
    return apiResponse.forbidden(res, 'Insufficient permissions');
  }

  const { name, value, tags } = req.body;

  await recordMetric(name, value, tags || {});

  apiResponse.success(res, null, 'Metric recorded successfully');
});

export const getMetricsController = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  if (!['admin', 'moderator'].includes(user.role || '')) {
    return apiResponse.forbidden(res, 'Insufficient permissions');
  }

  const { name } = req.params;
  const { start, end, tags } = req.query;

  const metrics = await getMetrics(
    name,
    start ? new Date(start as string) : new Date(Date.now() - 24 * 60 * 60 * 1000),
    end ? new Date(end as string) : new Date(),
    tags ? JSON.parse(tags as string) : {}
  );

  apiResponse.success(res, { name, metrics }, 'Metrics retrieved successfully');
});

// ============================================================================
// Audit Logs
// ============================================================================

export const getAuditLogsController = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  if (!['admin', 'moderator'].includes(user.role || '')) {
    return apiResponse.forbidden(res, 'Insufficient permissions');
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

  apiResponse.success(res, result, 'Audit logs retrieved successfully');
});

// ============================================================================
// Retention Cleanup (Admin only)
// ============================================================================

export const runCleanupController = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  if (!['admin'].includes(user.role || '')) {
    return apiResponse.forbidden(res, 'Admin access required');
  }

  const results = await runRetentionCleanup();

  apiResponse.success(res, results, 'Retention cleanup completed');
});

// ============================================================================
// System Stats (Admin/Moderator)
// ============================================================================

export const getStatsController = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  if (!['admin', 'moderator'].includes(user.role || '')) {
    return apiResponse.forbidden(res, 'Insufficient permissions');
  }

  const stats = await getSystemStats();
  apiResponse.success(res, stats, 'System stats retrieved successfully');
});