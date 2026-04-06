const express = require('express');

const startServer = (app) =>
  new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolve({
        server,
        baseUrl: `http://127.0.0.1:${address.port}`,
      });
    });
  });

describe('Message edit + forward routes', () => {
  const userId = '507f1f77bcf86cd799439011';
  const chatId = '507f1f77bcf86cd799439012';
  const messageId = '507f1f77bcf86cd799439013';
  const targetChatId = '507f1f77bcf86cd799439014';

  const buildApp = async () => {
    jest.resetModules();

    jest.doMock('../../../middlewares/authMiddleware', () => (req, res, next) => {
      req.user = { _id: userId };
      next();
    });

    jest.doMock('../../../middlewares/rateLimiter', () => ({
      uploadRateLimiter: (req, res, next) => next(),
      messageRateLimiter: (req, res, next) => next(),
    }));

    const messageDoc = {
      _id: messageId,
      chatId,
      senderId: userId,
      content: 'original',
      type: 'text',
      edited: false,
      deletedForEveryone: false,
      deletedFor: [],
      save: jest.fn().mockResolvedValue(true),
    };

    const forwardedSource = {
      _id: messageId,
      chatId,
      senderId: '507f1f77bcf86cd799439099',
      content: 'hello there',
      type: 'text',
      media: null,
      deletedForEveryone: false,
      deletedFor: [],
    };

    const forwardedDoc = {
      _id: '507f1f77bcf86cd799439015',
      chatId: targetChatId,
      senderId: userId,
      content: forwardedSource.content,
      type: forwardedSource.type,
      media: forwardedSource.media,
    };

    const queryFor = (value) => ({
      populate: () => ({
        lean: jest.fn().mockResolvedValue(value),
      }),
    });
    jest.doMock('../message.model', () => {
      return {
        findOne: jest.fn((query) => {
          if (query && query.senderId) {
            return messageDoc;
          }
          return queryFor(forwardedSource);
        }),
        findById: jest.fn((id) => {
          if (id && id.toString() === forwardedDoc._id.toString()) {
            return queryFor(forwardedDoc);
          }
          return queryFor({
            _id: messageDoc._id,
            chatId: messageDoc.chatId,
            senderId: messageDoc.senderId,
            content: messageDoc.content,
            type: messageDoc.type,
            edited: messageDoc.edited,
          });
        }),
        create: jest.fn().mockResolvedValue({ _id: forwardedDoc._id }),
      };
    });
    jest.doMock('../../chat/chat.service', () => ({
      ensureChatMember: jest.fn().mockResolvedValue({ _id: chatId }),
    }));

    jest.doMock('../../user/user.service', () => ({
      assertUsersCanInteract: jest.fn().mockResolvedValue(true),
    }));

    jest.doMock('../../../utils/mediaUpload', () => ({
      createSignedUploadParams: jest.fn(),
      destroyMediaAsset: jest.fn(),
      normalizeMessageMedia: jest.fn(),
      uploadMessageMedia: jest.fn(),
    }));

    const messageRoutes = require('../message.routes');

    const app = express();
    app.use(express.json());
    app.use('/messages', messageRoutes);

    app.use((err, req, res, next) => {
      res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || 'Internal Server Error',
      });
    });

    return { app, messageDoc, forwardedDoc };
  };

  it('PUT /messages/:messageId edits message (200)', async () => {
    const { app, messageDoc } = await buildApp();
    const { server, baseUrl } = await startServer(app);

    try {
      const res = await fetch(`${baseUrl}/messages/${messageId}`, {
        method: 'PUT',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          chatId,
          content: 'updated content',
        }),
      });

      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.message).toBe('Message edited successfully');
      expect(body.data.message.content).toBe('updated content');
      expect(body.data.message.edited).toBe(true);
      expect(messageDoc.save).toHaveBeenCalledTimes(1);
    } finally {
      server.close();
    }
  });

  it('POST /messages/:messageId/forward forwards message (201)', async () => {
    const { app } = await buildApp();
    const { server, baseUrl } = await startServer(app);

    try {
      const res = await fetch(`${baseUrl}/messages/${messageId}/forward`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          chatId,
          targetChatId,
        }),
      });

      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body.success).toBe(true);
      expect(body.message).toBe('Message forwarded successfully');
      expect(body.data.message.chatId).toBe(targetChatId);
    } finally {
      server.close();
    }
  });
});