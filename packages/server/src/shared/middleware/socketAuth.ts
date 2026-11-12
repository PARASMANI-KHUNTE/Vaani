/**
 * Socket Authentication Middleware
 * JWT verification for Socket.IO connections
 */

import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../../config';
import { logger } from '../../shared/utils/logger';
import { ApiError } from '../../shared/utils/apiError';

interface SocketJWTPayload {
  sub: string;
  email: string;
  type: 'access';
  iat: number;
  exp: number;
}

// Extend SocketData interface for socket.data
declare module 'socket.io' {
  interface SocketData {
    userId: string;
    email: string;
    auth?: SocketJWTPayload;
  }
}

export const verifySocketToken = async (socket: Socket, next: (err?: Error) => void) => {
  try {
    // Get token from auth object or handshake headers
    const token = socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.split(' ')[1] ||
      socket.handshake.query?.token as string;

    if (!token) {
      logger.warn({ socketId: socket.id }, 'Socket connection attempt without token');
      return next(new Error('Authentication token required'));
    }

    // Verify token
    let decoded: SocketJWTPayload;
    try {
      decoded = jwt.verify(token, config.auth.jwtSecret) as SocketJWTPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return next(new Error('Token expired'));
      }
      if (error instanceof jwt.JsonWebTokenError) {
        return next(new Error('Invalid token'));
      }
      return next(new Error('Token verification failed'));
    }

    // Check token type
    if (decoded.type !== 'access') {
      return next(new Error('Invalid token type'));
    }

    // Attach user data to socket
    socket.data.userId = decoded.sub;
    socket.data.email = decoded.email;
    socket.data.auth = decoded;

    // Join user's personal room for direct messages
    socket.join(`user:${decoded.sub}`);

    logger.debug({ socketId: socket.id, userId: decoded.sub }, 'Socket authenticated');
    next();
  } catch (error) {
    logger.error({ socketId: socket.id, error: (error as Error).message }, 'Socket authentication error');
    next(new Error('Authentication failed'));
  }
};

// ============================================================================
// Socket Authorization Helpers
// ============================================================================

export const requireSocketAuth = (socket: Socket): string => {
  if (!socket.data.userId) {
    throw new Error('Socket not authenticated');
  }
  return socket.data.userId;
};

export const socketUserId = (socket: Socket): string => socket.data.userId;

export const socketEmail = (socket: Socket): string => socket.data.email;