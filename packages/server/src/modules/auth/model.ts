/**
 * Auth Module - No separate model needed
 * Uses User model from user module
 */

// This module doesn't have its own model
// It uses the User model from the user module
// This file exists for consistency with the module structure

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface GoogleProfile {
  email: string;
  name: string;
  avatar?: string;
}