/**
 * Media Model
 * Mongoose schema for tracking media assets (Cloudinary references)
 */

import mongoose, { Document, Schema } from 'mongoose';
import { createBaseSchema, userRef } from '../../core/mongoose';

// ============================================================================
// Interfaces
// ============================================================================

export interface IMediaAsset extends Document {
  _id: mongoose.Types.ObjectId;
  publicId: string;
  url: string;
  secureUrl: string;
  format: string;
  resourceType: 'image' | 'video' | 'raw';
  type: 'upload' | 'private' | 'authenticated';
  width?: number;
  height?: number;
  duration?: number;
  bytes: number;
  originalFilename?: string;
  mimeType?: string;
  folder: string;
  tags: string[];
  // Usage tracking
  uploadedBy: mongoose.Types.ObjectId;
  messageId?: mongoose.Types.ObjectId;
  chatId?: mongoose.Types.ObjectId;
  // Moderation
  isModerated: boolean;
  moderationStatus: 'pending' | 'approved' | 'rejected';
  moderationReason?: string;
  // Cleanup
  isOrphaned: boolean;
  scheduledForDeletion?: Date;
  createdAt: Date;
  updatedAt: Date;
  [key: string]: unknown;
}

export interface IMediaAssetModel extends mongoose.Model<IMediaAsset> {
  recordUpload(data: {
    publicId: string;
    url: string;
    secureUrl: string;
    format: string;
    resourceType: 'image' | 'video' | 'raw';
    type?: 'upload' | 'private' | 'authenticated';
    width?: number;
    height?: number;
    duration?: number;
    bytes: number;
    originalFilename?: string;
    mimeType?: string;
    folder: string;
    tags?: string[];
    uploadedBy: mongoose.Types.ObjectId;
    messageId?: mongoose.Types.ObjectId;
    chatId?: mongoose.Types.ObjectId;
  }): Promise<IMediaAsset>;
  linkToMessage(
    publicId: string,
    messageId: mongoose.Types.ObjectId,
    chatId: mongoose.Types.ObjectId
  ): Promise<IMediaAsset | null>;
  markModerated(
    publicId: string,
    status: 'approved' | 'rejected',
    reason?: string
  ): Promise<IMediaAsset | null>;
  scheduleOrphanCleanup(
    publicId: string,
    deleteAfterDays?: number
  ): Promise<IMediaAsset | null>;
  getOrphanedAssets(olderThan?: Date): Promise<IMediaAsset[]>;
  getAssetsForCleanup(): Promise<IMediaAsset[]>;
}

// ============================================================================
// Schema
// ============================================================================

const MediaAssetSchema = createBaseSchema<IMediaAsset>({
  publicId: { type: String, required: true, unique: true, index: true },
  url: { type: String, required: true },
  secureUrl: { type: String, required: true },
  format: { type: String, required: true },
  resourceType: {
    type: String,
    enum: ['image', 'video', 'raw'],
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: ['upload', 'private', 'authenticated'],
    default: 'upload',
  },
  width: Number,
  height: Number,
  duration: Number,
  bytes: { type: Number, required: true },
  originalFilename: String,
  mimeType: String,
  folder: { type: String, required: true, index: true },
  tags: [{ type: String, index: true }],
  uploadedBy: userRef(),
  messageId: { type: Schema.Types.ObjectId, ref: 'Message', index: true },
  chatId: { type: Schema.Types.ObjectId, ref: 'Chat', index: true },
  isModerated: { type: Boolean, default: false, index: true },
  moderationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true,
  },
  moderationReason: String,
  isOrphaned: { type: Boolean, default: false, index: true },
  scheduledForDeletion: { type: Date, index: true },
});

// ============================================================================
// Indexes
// ============================================================================

MediaAssetSchema.index({ uploadedBy: 1, createdAt: -1 });
MediaAssetSchema.index({ chatId: 1, createdAt: -1 });
MediaAssetSchema.index({ isOrphaned: 1, scheduledForDeletion: 1 });

// ============================================================================
// Static Methods
// ============================================================================

MediaAssetSchema.statics.recordUpload = async function (data: {
  publicId: string;
  url: string;
  secureUrl: string;
  format: string;
  resourceType: 'image' | 'video' | 'raw';
  type?: 'upload' | 'private' | 'authenticated';
  width?: number;
  height?: number;
  duration?: number;
  bytes: number;
  originalFilename?: string;
  mimeType?: string;
  folder: string;
  tags?: string[];
  uploadedBy: mongoose.Types.ObjectId;
  messageId?: mongoose.Types.ObjectId;
  chatId?: mongoose.Types.ObjectId;
}): Promise<IMediaAsset> {
  return this.create({
    ...data,
    type: data.type || 'upload',
    tags: data.tags || [],
    isModerated: false,
    moderationStatus: 'pending',
    isOrphaned: !data.messageId, // Orphaned if not linked to message yet
  });
};

MediaAssetSchema.statics.linkToMessage = async function (
  this: any,
  publicId: string,
  messageId: mongoose.Types.ObjectId,
  chatId: mongoose.Types.ObjectId
): Promise<IMediaAsset | null> {
  return this.findOneAndUpdate(
    { publicId },
    {
      messageId,
      chatId,
      isOrphaned: false,
      scheduledForDeletion: undefined,
    },
    { new: true }
  );
};

MediaAssetSchema.statics.markModerated = async function (
  this: any,
  publicId: string,
  status: 'approved' | 'rejected',
  reason?: string
): Promise<IMediaAsset | null> {
  return this.findOneAndUpdate(
    { publicId },
    {
      isModerated: true,
      moderationStatus: status,
      moderationReason: reason,
    },
    { new: true }
  );
};

MediaAssetSchema.statics.scheduleOrphanCleanup = async function (
  this: any,
  publicId: string,
  deleteAfterDays = 7
): Promise<IMediaAsset | null> {
  const scheduledForDeletion = new Date();
  scheduledForDeletion.setDate(scheduledForDeletion.getDate() + deleteAfterDays);

  return this.findOneAndUpdate(
    { publicId, isOrphaned: true },
    {
      scheduledForDeletion,
    },
    { new: true }
  );
};

MediaAssetSchema.statics.getOrphanedAssets = async function (
  this: any,
  olderThan?: Date
): Promise<IMediaAsset[]> {
  const query: Record<string, unknown> = { isOrphaned: true };
  if (olderThan) {
    query.createdAt = { $lt: olderThan };
  }
  return this.find(query).lean();
};

MediaAssetSchema.statics.getAssetsForCleanup = async function (this: any): Promise<IMediaAsset[]> {
  return this.find({
    scheduledForDeletion: { $lte: new Date() },
  }).lean();
};

// ============================================================================
// Model Export
// ============================================================================

export const MediaAsset = mongoose.model<IMediaAsset, IMediaAssetModel>('MediaAsset', MediaAssetSchema);
export default MediaAsset;