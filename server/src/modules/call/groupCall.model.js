const mongoose = require("mongoose");

const participantTimelineSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    joinedAt: {
      type: Date,
      required: true,
    },
    leftAt: {
      type: Date,
      default: null,
    },
    leftReason: {
      type: String,
      enum: ["left", "ended", "disconnected", "removed", "failed"],
      default: "left",
    },
    isMuted: {
      type: Boolean,
      default: false,
    },
    isVideoOn: {
      type: Boolean,
      default: true,
    },
    speakerEvents: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    _id: false,
  }
);

const groupCallSessionSchema = new mongoose.Schema(
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
    status: {
      type: String,
      enum: ["active", "ended", "failed"],
      default: "active",
      index: true,
    },
    startedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    startedAt: {
      type: Date,
      required: true,
      index: true,
    },
    endedAt: {
      type: Date,
      default: null,
    },
    endedReason: {
      type: String,
      enum: ["ended", "empty", "failed"],
      default: null,
    },
    participantTimeline: {
      type: [participantTimelineSchema],
      default: [],
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

groupCallSessionSchema.index({ chatId: 1, createdAt: -1 });
groupCallSessionSchema.index({ "participantTimeline.userId": 1, createdAt: -1 });

module.exports = mongoose.model("GroupCallSession", groupCallSessionSchema);
