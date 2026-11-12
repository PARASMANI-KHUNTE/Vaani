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
import { authMiddleware, optionalAuthMiddleware } from '../../shared/middleware/auth';
import { roleMiddleware } from '../../shared/middleware/auth';

const router = Router();

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
router.get('/health/detailed', roleMiddleware(['admin', 'moderator']), detailedHealthController);

// ============================================================================
// System Settings (Admin only for write)
// ============================================================================

router.get('/settings/:key', settingKeyParamValidator, validate, getSettingController);
router.put('/settings/:key', roleMiddleware(['admin']), setSettingValidator, validate, setSettingController);

// ============================================================================
// Metrics (Admin/Moderator for read, Admin/System for write)
// ============================================================================

router.post('/metrics', roleMiddleware(['admin']), recordMetricValidator, validate, recordMetricController);
router.get('/metrics/:name', roleMiddleware(['admin', 'moderator']), metricNameParamValidator, getMetricsQueryValidator, validate, getMetricsController);

// ============================================================================
// Audit Logs (Admin/Moderator only)
// ============================================================================

router.get('/audit-logs', roleMiddleware(['admin', 'moderator']), auditLogsQueryValidator, validate, getAuditLogsController);

// ============================================================================
// Retention Cleanup (Admin only)
// ============================================================================

router.post('/cleanup', roleMiddleware(['admin']), runCleanupController);

// ============================================================================
// System Stats (Admin/Moderator only)
// ============================================================================

router.get('/stats', roleMiddleware(['admin', 'moderator']), getStatsController);

export { router as systemRoutes };