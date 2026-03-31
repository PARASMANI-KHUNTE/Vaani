const env = require("../config/env");
const logger = require("./logger");
const Chat = require("../modules/chat/chat.model");
const Message = require("../modules/message/message.model");
const { destroyMediaAssets } = require("./mediaUpload");

let cleanupTimer = null;
let cleanupInProgress = false;

const daysToCutoff = (days) => {
  if (!Number.isFinite(days) || days <= 0) {
    return null;
  }

  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
};

const runRetentionCleanup = async () => {
  if (cleanupInProgress) {
    return { skipped: true };
  }

  cleanupInProgress = true;

  try {
    const chatCutoff = daysToCutoff(env.retention.chatDays);
    const messageCutoff = daysToCutoff(env.retention.messageDays);

    let deletedChats = 0;
    let deletedMessages = 0;
    let deletedMediaAssets = 0;
    let retainedChatIds = [];

    if (chatCutoff) {
      const oldChats = await Chat.find({ updatedAt: { $lt: chatCutoff } })
        .select("_id")
        .lean();
      const oldChatIds = oldChats.map((chat) => chat._id);

      retainedChatIds = oldChatIds;

      if (oldChatIds.length) {
        const chatMessages = await Message.find({ chatId: { $in: oldChatIds } })
          .select("media")
          .lean();

        deletedMediaAssets += await destroyMediaAssets(chatMessages.map((message) => message.media));

        const messageDeleteResult = await Message.deleteMany({ chatId: { $in: oldChatIds } });
        const chatDeleteResult = await Chat.deleteMany({ _id: { $in: oldChatIds } });

        deletedMessages += messageDeleteResult.deletedCount || 0;
        deletedChats += chatDeleteResult.deletedCount || 0;
      }
    }

    if (messageCutoff) {
      const oldMessages = await Message.find({
        createdAt: { $lt: messageCutoff },
        ...(retainedChatIds.length ? { chatId: { $nin: retainedChatIds } } : {}),
      })
        .select("_id media")
        .lean();

      if (oldMessages.length) {
        deletedMediaAssets += await destroyMediaAssets(oldMessages.map((message) => message.media));

        const messageIds = oldMessages.map((message) => message._id);
        const deleteResult = await Message.deleteMany({ _id: { $in: messageIds } });
        deletedMessages += deleteResult.deletedCount || 0;
      }
    }

    return {
      deletedChats,
      deletedMessages,
      deletedMediaAssets,
    };
  } finally {
    cleanupInProgress = false;
  }
};

const initializeRetentionCleanup = () => {
  const intervalHours = Number(env.retention.cleanupIntervalHours || 0);

  if (!Number.isFinite(intervalHours) || intervalHours <= 0) {
    return;
  }

  void runRetentionCleanup().catch((error) => {
    logger.error("Initial retention cleanup failed", { error: error.message, stack: error.stack });
  });

  cleanupTimer = setInterval(() => {
    void runRetentionCleanup().catch((error) => {
      logger.error("Scheduled retention cleanup failed", { error: error.message, stack: error.stack });
    });
  }, intervalHours * 60 * 60 * 1000);
};

module.exports = {
  initializeRetentionCleanup,
  runRetentionCleanup,
};
