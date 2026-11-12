/**
 * System Routes
 * Health checks, metrics, settings, audit logs, cleanup
 */

import { Router } from 'express';
import {
  healthCheckController,
  detailedHealthController,
  getSettingController,
  setSettingController,
  getPublicSettingsController,
  recordMetricController,
  getMetricsController,
  getAuditLogsController,
  runCleanupController,
  getStatsController,
} from './controller';
import {
  settingKeyParamValidator,
  setSettingValidator,
  metricNameParamValidator,
  recordMetricValidator,
  getMetricsQueryValidator,
  auditLogsQueryValidator,
  validate,
} from './validators';
import { authMiddleware } from '../../shared/middleware/auth';
import { requireRole } from '../../shared/middleware/auth';

const router: Router = Router();

// ============================================================================
// Public Health Check (no auth required)
// ============================================================================

router.get('/health', healthCheckController);

// ============================================================================
// Protected Routes (require authentication)
// ============================================================================

router.use(authMiddleware);

// Public settings (readable by all authenticated users)
router.get('/settings/public', getPublicSettingsController);

// Detailed health (admin/moderator only)
router.get('/health/detailed', requireRole('admin', 'moderator'), detailedHealthController);

// ============================================================================
// System Settings (Admin only for write)
// ============================================================================

router.get('/settings/:key', settingKeyParamValidator, validate, getSettingController);
router.put('/settings/:key', requireRole('admin'), setSettingValidator, validate, setSettingController);

// ============================================================================
// Metrics (Admin/Moderator for read, Admin/System for write)
// ============================================================================

router.post('/metrics', requireRole('admin'), recordMetricValidator, validate, recordMetricController);
router.get('/metrics/:name', requireRole('admin', 'moderator'), metricNameParamValidator, getMetricsQueryValidator, validate, getMetricsController);

// ============================================================================
// Audit Logs (Admin/Moderator only)
// ============================================================================

router.get('/audit-logs', requireRole('admin', 'moderator'), auditLogsQueryValidator, validate, getAuditLogsController);

// ============================================================================
// Retention Cleanup (Admin only)
// ============================================================================

router.post('/cleanup', requireRole('admin'), runCleanupController);

// ============================================================================
// System Stats (Admin/Moderator only)
// ============================================================================

router.get('/stats', requireRole('admin', 'moderator'), getStatsController);

export { router as systemRoutes };