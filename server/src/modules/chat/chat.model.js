const mongoose = require("mongoose");

const chatUserStateSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    clearedAt: {
      type: Date,
      default: null,
    },
    manualUnread: {
      type: Boolean,
      default: false,
    },
    hidden: {
      type: Boolean,
      default: false,
    },
  },
  {
    _id: false,
  }
);

const chatSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    isGroup: {
      type: Boolean,
      default: false,
    },
    userStates: {
      type: [chatUserStateSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

chatSchema.index({ participants: 1 });

module.exports = mongoose.model("Chat", chatSchema);
