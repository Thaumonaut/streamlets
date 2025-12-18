/**
 * Development Routes
 * Only available in development mode
 * Serves test tokens and debugging endpoints
 */

import type { Response } from 'express';
import { loadDevTokens, saveDevTokens } from '../lib/token-storage';
import { generateTestTokens } from '../lib/jwt-generator';

/**
 * GET /api/dev/tokens
 * Returns saved development tokens (dev only)
 */
export function devTokensHandler(_req: unknown, res: Response): void {
  if (process.env.NODE_ENV === 'production') {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  try {
    const tokens = loadDevTokens();

    if (!tokens) {
      res.status(404).json({
        error: 'No development tokens found. Generate them with: npm run token:generate',
      });
      return;
    }

    res.json({
      viewer: tokens.viewer,
      broadcaster: tokens.broadcaster,
      moderator: tokens.moderator,
      expires_at: tokens.expires_at,
    });
  } catch (error) {
    console.error('Failed to load dev tokens:', error);
    res.status(500).json({ error: 'Failed to load tokens' });
  }
}

/**
 * POST /api/dev/regenerate-tokens
 * Generates and saves new development tokens (dev only)
 */
export function regenerateTokensHandler(_req: unknown, res: Response): void {
  if (process.env.NODE_ENV === 'production') {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  try {
    console.log('🔄 Regenerating development tokens...');
    const tokens = generateTestTokens();

    // Save to file
    const typedTokens = tokens as Record<'viewer' | 'broadcaster' | 'moderator', string>;
    saveDevTokens({
      viewer: typedTokens.viewer,
      broadcaster: typedTokens.broadcaster,
      moderator: typedTokens.moderator,
    });

    console.log('✓ Development tokens regenerated');

    res.json({
      success: true,
      message: 'Tokens regenerated successfully',
      viewer: typedTokens.viewer,
      broadcaster: typedTokens.broadcaster,
      moderator: typedTokens.moderator,
    });
  } catch (error) {
    console.error('Failed to regenerate tokens:', error);
    res.status(500).json({ error: 'Failed to regenerate tokens' });
  }
}
