/**
 * Health check endpoint
 * No authentication required
 */

import type { Request, Response } from 'express';

export async function healthCheck(req: Request, res: Response): Promise<void> {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'streamlets-api',
    version: '0.1.0',
  });
}
