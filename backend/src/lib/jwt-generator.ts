/**
 * JWT Token Generator for Local Testing
 * Generates valid Twitch Extension JWT tokens for development
 */

import jwt from 'jsonwebtoken';
import type { TwitchJWTPayload } from './auth';

/**
 * Generate a test JWT token with custom claims
 * This is only for local development testing
 */
export function generateTestJWT(options: {
  userId?: string;
  channelId?: string;
  role?: 'viewer' | 'broadcaster' | 'moderator';
  expiresIn?: string | number; // seconds or string like "1h", "7d"
} = {}): string {
  const {
    userId = 'test_user_123',
    channelId = 'test_channel_456',
    role = 'viewer',
    expiresIn = '1h',
  } = options;

  const secret = Buffer.from(process.env.TWITCH_EXTENSION_SECRET || '', 'base64');

  if (!secret || secret.length === 0) {
    throw new Error('TWITCH_EXTENSION_SECRET is not set or empty');
  }

  const payload: TwitchJWTPayload = {
    user_id: userId,
    channel_id: channelId,
    role,
    exp: Math.floor(Date.now() / 1000) + (typeof expiresIn === 'number' ? expiresIn : 3600),
  };

  return jwt.sign(payload, secret);
}

/**
 * Generate multiple test tokens for different scenarios
 */
export function generateTestTokens(): Record<string, string> {
  const tokens: Record<string, string> = {};

  // Viewer token
  tokens.viewer = generateTestJWT({
    userId: 'user_viewer_001',
    channelId: 'channel_001',
    role: 'viewer',
  });

  // Broadcaster token
  tokens.broadcaster = generateTestJWT({
    userId: 'user_broadcaster_001',
    channelId: 'channel_001',
    role: 'broadcaster',
  });

  // Moderator token
  tokens.moderator = generateTestJWT({
    userId: 'user_moderator_001',
    channelId: 'channel_001',
    role: 'moderator',
  });

  return tokens;
}
