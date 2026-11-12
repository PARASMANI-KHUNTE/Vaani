/**
 * JWT Utilities
 * Token verification and extraction for socket authentication
 */

import jwt from 'jsonwebtoken';
import { config } from '../../config';

export interface JWTPayload {
  sub: string;
  email: string;
  type: 'access' | 'refresh';
  jti?: string;
  iat: number;
  exp: number;
}

/**
 * Verify access token
 */
export const verifyAccessToken = (token: string): JWTPayload => {
  try {
    const decoded = jwt.verify(token, config.auth.jwtSecret) as JWTPayload;

    // Check token type
    if (decoded.type !== 'access') {
      throw new Error('Invalid token type');
    }

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('TOKEN_EXPIRED');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('INVALID_TOKEN');
    }
    throw error;
  }
};

/**
 * Extract token from socket handshake
 */
export const extractTokenFromSocket = (socket: any): string | null => {
  // Check auth header
  const authHeader = socket.handshake.auth?.Authorization || socket.handshake.auth?.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }

  // Check query params
  const token = socket.handshake.query?.token as string | undefined;
  if (token) {
    return token;
  }

  // Check headers
  const headers = socket.handshake.headers;
  const authFromHeaders = headers?.authorization;
  if (authFromHeaders && authFromHeaders.startsWith('Bearer ')) {
    return authFromHeaders.split(' ')[1];
  }

  return null;
};

/**
 * Generate access token
 */
export const generateAccessToken = (payload: Omit<JWTPayload, 'iat' | 'exp' | 'type'>): string => {
  return jwt.sign(
    { ...payload, type: 'access' },
    config.auth.jwtSecret,
    { expiresIn: config.auth.accessTokenExpiry }
  );
};

/**
 * Generate refresh token
 */
export const generateRefreshToken = (payload: Omit<JWTPayload, 'iat' | 'exp' | 'type'>): string => {
  return jwt.sign(
    { ...payload, type: 'refresh' },
    config.auth.jwtRefreshSecret,
    { expiresIn: config.auth.refreshTokenExpiry }
  );
};