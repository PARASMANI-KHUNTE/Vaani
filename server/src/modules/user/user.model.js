const mongoose = require("mongoose");

const pushTokenSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      trim: true,
    },
    platform: {
      type: String,
      enum: ["android", "ios"],
      default: "android",
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: false,
  }
);

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    avatar: {
      type: String,
      default: null,
    },
    tagline: {
      type: String,
      default: "",
      trim: true,
      uppercase: true,
      maxlength: 4,
      match: /^[A-Z0-9]{4}$/,
    },
    bio: {
      type: String,
      default: "",
      trim: true,
      maxlength: 280,
    },
    friends: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    sentFriendRequests: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    receivedFriendRequests: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    blockedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    pushTokens: {
      type: [pushTokenSchema],
      default: [],
    },
    lastSeen: {
      type: Date,
      default: null,
    },
    accountStatus: {
      type: String,
      enum: ["active", "disabled", "deleted"],
      default: "active",
    },
    disabledAt: {
      type: Date,
      default: null,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ tagline: "text", name: "text", email: "text", username: "text" });
userSchema.index({ friends: 1 });
userSchema.index({ friends: 1, accountStatus: 1 });
userSchema.index({ sentFriendRequests: 1 });
userSchema.index({ receivedFriendRequests: 1 });
userSchema.index({ blockedUsers: 1 });
userSchema.index({ accountStatus: 1 });
userSchema.index({ lastSeen: -1 });

module.exports = mongoose.model("User", userSchema);
