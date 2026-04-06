const mongoose = require("mongoose");

const mediaSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
    },
    publicId: {
      type: String,
      required: true,
    },
    resourceType: {
      type: String,
      enum: ["image", "video", "raw"],
      required: true,
    },
    mimeType: {
      type: String,
      default: null,
    },
    originalName: {
      type: String,
      default: null,
    },
    format: {
      type: String,
      default: null,
    },
    bytes: {
      type: Number,
      default: 0,
    },
    width: {
      type: Number,
      default: null,
    },
    height: {
      type: Number,
      default: null,
    },
    duration: {
      type: Number,
      default: null,
    },
    waveform: {
      type: [Number],
      default: [],
    },
  },
  {
    _id: false,
  }
);

const receiptSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
    seenAt: {
      type: Date,
      default: null,
    },
  },
  {
    _id: false,
  }
);

const messageSchema = new mongoose.Schema(
  {
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
    content: {
      type: String,
      default: "",
      trim: true,
      maxlength: 5000,
    },
    type: {
      type: String,
      enum: ["text", "image", "file", "video", "voice"],
      default: "text",
    },
    media: {
      type: mediaSchema,
      default: null,
    },
    receipts: {
      type: [receiptSchema],
      default: [],
    },
    reactions: [
      {
        emoji: {
          type: String,
          required: true,
        },
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    deletedForEveryone: {
      type: Boolean,
      default: false,
    },
    deletedFor: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    isSystem: {
      type: Boolean,
      default: false,
    },
    edited: {
      type: Boolean,
      default: false,
    },
    forwarded: {
      type: Boolean,
      default: false,
    },
    systemEvent: {
      type: {
        eventType: {
          type: String,
          enum: [
            "group_created",
            "group_renamed",
            "group_avatar_updated",
            "member_added",
            "member_removed",
            "member_left",
            "admin_promoted",
            "admin_demoted",
            "ownership_transferred",
          ],
          default: null,
        },
        metadata: {
          type: mongoose.Schema.Types.Mixed,
          default: null,
        },
      },
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

messageSchema.index({ chatId: 1, createdAt: -1 });
messageSchema.index({ chatId: 1, senderId: 1 });
messageSchema.index({ chatId: 1, deletedForEveryone: 1, deletedFor: 1 });
messageSchema.index({ "reactions.userId": 1 });
messageSchema.index({ senderId: 1, createdAt: -1 });
messageSchema.index({ "receipts.userId": 1 });
messageSchema.index({ replyTo: 1 });

module.exports = mongoose.model("Message", messageSchema);
