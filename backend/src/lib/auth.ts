/**
 * Twitch Extension JWT authentication middleware
 * Validates JWT tokens from Twitch Extension requests
 */

import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';

export interface TwitchJWTPayload {
  user_id: string;      // Viewer's Twitch ID
  channel_id: string;   // Channel being watched
  role: 'viewer' | 'broadcaster' | 'moderator';
  exp: number;          // Expiration timestamp
}

export interface AuthenticatedRequest extends Request {
  viewer?: TwitchJWTPayload;
}

/**
 * Middleware to validate Twitch Extension JWT tokens
 * Extracts token from Authorization header and verifies signature
 */
export function validateJWT(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const token = authHeader.slice(7); // Remove 'Bearer ' prefix
  const secret = Buffer.from(process.env.TWITCH_EXTENSION_SECRET || '', 'base64');

  if (!process.env.TWITCH_EXTENSION_SECRET) {
    console.error('TWITCH_EXTENSION_SECRET environment variable is not set');
    res.status(500).json({ error: 'Server configuration error' });
    return;
  }

  try {
    // Verify JWT signature and decode payload
    const decoded = jwt.verify(token, secret) as TwitchJWTPayload;

    // Check expiration
    if (decoded.exp * 1000 < Date.now()) {
      res.status(401).json({ error: 'JWT token has expired' });
      return;
    }

    // Attach viewer info to request
    req.viewer = decoded;
    next();
  } catch (error) {
    console.error('JWT validation error:', error);
    res.status(401).json({ error: 'Invalid or expired JWT token' });
  }
}

/**
 * Extract viewer Twitch ID from authenticated request
 */
export function getViewerId(req: AuthenticatedRequest): string {
  if (!req.viewer) {
    throw new Error('Request not authenticated');
  }
  return req.viewer.user_id;
}

/**
 * Extract channel ID from authenticated request
 */
export function getChannelId(req: AuthenticatedRequest): string {
  if (!req.viewer) {
    throw new Error('Request not authenticated');
  }
  return req.viewer.channel_id;
}
