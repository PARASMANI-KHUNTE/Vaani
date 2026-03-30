const mongoose = require("mongoose");

const callLogSchema = new mongoose.Schema(
  {
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
      index: true,
    },
    callId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    callType: {
      type: String,
      enum: ["audio", "video"],
      required: true,
    },
    callerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["missed", "rejected", "completed", "cancelled", "failed"],
      required: true,
    },
    endedReason: {
      type: String,
      enum: ["rejected", "ended", "timeout", "disconnected", "busy", "failed"],
      required: true,
    },
    startedAt: {
      type: Date,
      required: true,
    },
    answeredAt: {
      type: Date,
      default: null,
    },
    endedAt: {
      type: Date,
      required: true,
    },
    durationSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

callLogSchema.index({ callerId: 1, createdAt: -1 });
callLogSchema.index({ receiverId: 1, createdAt: -1 });

module.exports = mongoose.model("CallLog", callLogSchema);
