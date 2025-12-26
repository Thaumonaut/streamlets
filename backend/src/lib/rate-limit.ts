/**
 * Rate limiting for API endpoints
 * Prevents spam and abuse
 */

// In-memory rate limit tracking (sufficient for MVP single-instance deployment)
const pullTimestamps = new Map<string, number>();
const PULL_COOLDOWN_MS = 2000; // 2 seconds between pulls

/**
 * Check if a viewer can perform a pull (rate limit check)
 * Returns true if allowed, false if rate limited
 */
export function canPull(viewerId: string): boolean {
  const now = Date.now();
  const lastPull = pullTimestamps.get(viewerId) || 0;
  const elapsed = now - lastPull;

  if (elapsed < PULL_COOLDOWN_MS) {
    return false; // Rate limited
  }

  pullTimestamps.set(viewerId, now);
  return true;
}

/**
 * Get remaining cooldown time in milliseconds
 */
export function getRemainingCooldown(viewerId: string): number {
  const now = Date.now();
  const lastPull = pullTimestamps.get(viewerId) || 0;
  const elapsed = now - lastPull;

  if (elapsed >= PULL_COOLDOWN_MS) {
    return 0;
  }

  return PULL_COOLDOWN_MS - elapsed;
}

// Cleanup old entries every 5 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [viewerId, timestamp] of pullTimestamps.entries()) {
    if (now - timestamp > 300000) { // 5 minutes
      pullTimestamps.delete(viewerId);
    }
  }
}, 300000);
