/**
 * Mongoose Core Setup
 * Connection, plugins, and model utilities
 */

import mongoose from 'mongoose';
import { config } from '../../config';

// ============================================================================
// Mongoose Plugins
// ============================================================================

// Soft delete plugin
export const softDeletePlugin = (schema: mongoose.Schema) => {
  schema.add({
    deletedAt: { type: Date, default: null, index: true },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  });

  // Add deletedAt to queries by default
  schema.pre(/^find/, function () {
    if (!this.getOptions().includeDeleted) {
      this.where({ deletedAt: null });
    }
  });

  // Instance method for soft delete
  schema.methods.softDelete = async function (deletedBy?: mongoose.Types.ObjectId) {
    this.deletedAt = new Date();
    this.deletedBy = deletedBy || null;
    return this.save();
  };

  // Static method for soft delete
  schema.statics.softDelete = async function (filter: Record<string, unknown>, deletedBy?: mongoose.Types.ObjectId) {
    return this.updateMany(filter, { deletedAt: new Date(), deletedBy: deletedBy || null });
  };

  // Static method for restore
  schema.statics.restore = async function (filter: Record<string, unknown>) {
    return this.updateMany(filter, { deletedAt: null, deletedBy: null });
  };
};

// Timestamps plugin (enhanced)
export const timestampsPlugin = (schema: mongoose.Schema) => {
  schema.set('timestamps', {
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  });
};

// JSON transform plugin
export const jsonTransformPlugin = (schema: mongoose.Schema) => {
  schema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: (_doc, ret: Record<string, unknown>) => {
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  });

  schema.set('toObject', {
    virtuals: true,
    versionKey: false,
    transform: (_doc, ret: Record<string, unknown>) => {
      delete ret.__v;
      return ret;
    },
  });
};

// ============================================================================
// Base Schema Factory
// ============================================================================

export const createBaseSchema = <T extends Record<string, unknown>>(
  definition: mongoose.SchemaDefinition<T>,
  options: mongoose.SchemaOptions = {}
): mongoose.Schema<T> => {
  const schema = new mongoose.Schema(definition, {
    ...options,
    timestamps: true,
    toJSON: { virtuals: true, versionKey: false },
    toObject: { virtuals: true, versionKey: false },
  });

  // Apply plugins
  schema.plugin(timestampsPlugin);
  schema.plugin(jsonTransformPlugin);

  return schema;
};

// ============================================================================
// Common Field Definitions
// ============================================================================

export const commonFields = {
  id: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  deletedAt: { type: Date, default: null, index: true },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
} as const;

export const userRef = (required = true) => ({
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User',
  required,
  index: true,
});

export const chatRef = (required = true) => ({
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Chat',
  required,
  index: true,
});

export const messageRef = (required = true) => ({
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Message',
  required,
  index: true,
});

// ============================================================================
// Index Helpers
// ============================================================================

export const createCompoundIndex = (
  fields: Record<string, 1 | -1 | 'text' | '2dsphere'>,
  options: mongoose.IndexOptions = {}
) => {
  return { fields, options: { background: true, ...options } };
};

export const textIndex = (fields: string[], options: mongoose.IndexOptions = {}) => {
  const fieldObj = fields.reduce((acc, field) => ({ ...acc, [field]: 'text' }), {});
  return { fields: fieldObj, options: { background: true, weights: { name: 10, email: 5 }, ...options } };
};

// ============================================================================
// Virtual Population Helpers
// ============================================================================

export const addVirtualPopulation = (
  schema: mongoose.Schema,
  name: string,
  ref: string,
  localField: string,
  foreignField: string = '_id',
  options: { count?: boolean; match?: Record<string, unknown> } = {}
) => {
  schema.virtual(name, {
    ref,
    localField,
    foreignField,
    justOne: !options.count,
    options: { match: options.match },
  });
};

// ============================================================================
// Query Helpers
// ============================================================================

export const paginateQuery = <T>(
  query: mongoose.Query<T[], T>,
  page: number = 1,
  limit: number = 30,
  maxLimit: number = 100
): mongoose.Query<T[], T> => {
  const safeLimit = Math.min(Math.max(limit, 1), maxLimit);
  const safePage = Math.max(page, 1);
  const skip = (safePage - 1) * safeLimit;

  return query.skip(skip).limit(safeLimit);
};

export const sortByCreatedAt = <T>(query: mongoose.Query<T[], T>, order: 'asc' | 'desc' = 'desc'): mongoose.Query<T[], T> => {
  return query.sort({ createdAt: order === 'desc' ? -1 : 1 });
};

export const sortByUpdatedAt = <T>(query: mongoose.Query<T[], T>, order: 'asc' | 'desc' = 'desc'): mongoose.Query<T[], T> => {
  return query.sort({ updatedAt: order === 'desc' ? -1 : 1 });
};

// ============================================================================
// Transaction Helpers
// ============================================================================

export const runInTransaction = async <T>(
  callback: (session: mongoose.ClientSession) => Promise<T>
): Promise<T> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const result = await callback(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
};

// ============================================================================
// Model Factory
// ============================================================================

export const createModel = <T extends mongoose.Document>(
  name: string,
  schema: mongoose.Schema<T>,
  collection?: string
): mongoose.Model<T> => {
  // Check if model already exists (for hot reload in development)
  if (mongoose.models[name]) {
    return mongoose.models[name] as mongoose.Model<T>;
  }

  return mongoose.model<T>(name, schema, collection);
};

// ============================================================================
// Connection State
// ============================================================================

export const getConnectionState = (): string => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  return states[mongoose.connection.readyState] || 'unknown';
};

export const isConnected = (): boolean => mongoose.connection.readyState === 1;