/**
 * System Model
 * Mongoose schemas for system-level data (audit logs, settings, metrics)
 */

import mongoose, { Document, Schema } from 'mongoose';
import { createBaseSchema, userRef } from '../../core/mongoose';

// ============================================================================
// Audit Log
// ============================================================================

export interface IAuditLog extends Document {
  _id: mongoose.Types.ObjectId;
  actorId?: mongoose.Types.ObjectId;
  actorType: 'user' | 'system' | 'admin';
  action: string;
  resourceType: string;
  resourceId?: mongoose.Types.ObjectId;
  metadata: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
  createdAt: Date;
}

const AuditLogSchema = createBaseSchema<IAuditLog>({
  actorId: { type: Schema.Types.ObjectId, ref: 'User' },
  actorType: { type: String, enum: ['user', 'system', 'admin'], required: true },
  action: { type: String, required: true, index: true },
  resourceType: { type: String, required: true, index: true },
  resourceId: { type: Schema.Types.ObjectId, index: true },
  metadata: { type: Schema.Types.Mixed, default: {} },
  ipAddress: String,
  userAgent: String,
  success: { type: Boolean, required: true, default: true },
  errorMessage: String,
});

AuditLogSchema.index({ actorId: 1, createdAt: -1 });
AuditLogSchema.index({ resourceType: 1, resourceId: 1, createdAt: -1 });
AuditLogSchema.index({ createdAt: -1 });

AuditLogSchema.statics.log = async function (data: {
  actorId?: mongoose.Types.ObjectId;
  actorType: 'user' | 'system' | 'admin';
  action: string;
  resourceType: string;
  resourceId?: mongoose.Types.ObjectId;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  success?: boolean;
  errorMessage?: string;
}): Promise<IAuditLog> {
  return this.create({
    ...data,
    success: data.success ?? true,
  });
};

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

// ============================================================================
// System Settings
// ============================================================================

export interface ISystemSettings extends Document {
  _id: mongoose.Types.ObjectId;
  key: string;
  value: unknown;
  description?: string;
  isPublic: boolean; // Whether clients can read this setting
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SystemSettingsSchema = createBaseSchema<ISystemSettings>({
  key: { type: String, required: true, unique: true, index: true },
  value: { type: Schema.Types.Mixed, required: true },
  description: String,
  isPublic: { type: Boolean, default: false },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
});

SystemSettingsSchema.statics.getSetting = async function (this: any, key: string): Promise<unknown> {
  const setting = await this.findOne({ key }).lean();
  return setting?.value;
};

SystemSettingsSchema.statics.setSetting = async function (
  this: any,
  key: string,
  value: unknown,
  description?: string,
  updatedBy?: mongoose.Types.ObjectId
): Promise<ISystemSettings> {
  return this.findOneAndUpdate(
    { key },
    { key, value, description, updatedBy, updatedAt: new Date() },
    { upsert: true, new: true }
  );
};

SystemSettingsSchema.statics.getPublicSettings = async function (this: any): Promise<Record<string, unknown>> {
  const settings = await this.find({ isPublic: true }).lean();
  return settings.reduce((acc: any, s: any) => ({ ...acc, [s.key]: s.value }), {});
};

export const SystemSettings = mongoose.model<ISystemSettings>('SystemSettings', SystemSettingsSchema);

// ============================================================================
// Metrics / Analytics
// ============================================================================

export interface IMetric extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  value: number;
  tags: Record<string, string>;
  timestamp: Date;
}

const MetricSchema = new Schema<IMetric>({
  name: { type: String, required: true, index: true },
  value: { type: Number, required: true },
  tags: { type: Schema.Types.Mixed, default: {} },
  timestamp: { type: Date, default: Date.now, index: true },
});

MetricSchema.index({ name: 1, timestamp: -1 });
MetricSchema.index({ timestamp: -1 });

MetricSchema.statics.record = async function (this: any, name: string, value: number, tags: Record<string, string> = {}): Promise<IMetric> {
  return this.create({ name, value, tags, timestamp: new Date() });
};

MetricSchema.statics.getMetrics = async function (
  this: any,
  name: string,
  start: Date,
  end: Date,
  tags: Record<string, string> = {}
): Promise<IMetric[]> {
  const query: Record<string, unknown> = {
    name,
    timestamp: { $gte: start, $lte: end },
  };
  Object.entries(tags).forEach(([k, v]) => {
    query[`tags.${k}`] = v;
  });
  return this.find(query).sort({ timestamp: 1 }).lean();
};

export const Metric = mongoose.model<IMetric>('Metric', MetricSchema);

// ============================================================================
// Rate Limit Tracking
// ============================================================================

export interface IRateLimitRecord extends Document {
  _id: mongoose.Types.ObjectId;
  identifier: string; // IP, user ID, etc.
  endpoint: string;
  count: number;
  windowStart: Date;
  expiresAt: Date;
}

const RateLimitRecordSchema = new Schema<IRateLimitRecord>({
  identifier: { type: String, required: true, index: true },
  endpoint: { type: String, required: true, index: true },
  count: { type: Number, default: 1 },
  windowStart: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
});

RateLimitRecordSchema.index({ identifier: 1, endpoint: 1 }, { unique: true });

RateLimitRecordSchema.statics.increment = async function (
  this: any,
  identifier: string,
  endpoint: string,
  windowMs: number
): Promise<{ count: number; isLimited: boolean }> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowMs);
  const expiresAt = new Date(now.getTime() + windowMs);

  const record = await this.findOneAndUpdate(
    { identifier, endpoint, windowStart: { $gte: windowStart } },
    {
      $inc: { count: 1 },
      $setOnInsert: { windowStart: now, expiresAt },
    },
    { upsert: true, new: true }
  );

  return { count: record.count, isLimited: false }; // Actual limiting done in middleware
};

export const RateLimitRecord = mongoose.model<IRateLimitRecord>('RateLimitRecord', RateLimitRecordSchema);