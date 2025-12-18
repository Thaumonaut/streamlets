/**
 * Twitch Extension JWT handling
 * Extracts JWT token from URL fragment
 */

export interface TwitchJWT {
  token: string;
  userId: string;
  channelId: string;
  role: 'viewer' | 'broadcaster' | 'moderator';
}

/**
 * Extract JWT token from Twitch extension URL fragment
 * Example: #token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 */
export function extractTwitchJWT(): string | null {
  if (typeof window === 'undefined') return null;

  const hash = window.location.hash.slice(1); // Remove '#'
  const params = new URLSearchParams(hash);
  return params.get('token');
}

/**
 * Parse JWT payload (client-side only, validation happens server-side)
 * WARNING: This does NOT validate the signature, only decodes the payload
 */
export function parseJWTPayload(token: string): TwitchJWT | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(atob(parts[1]));
    return {
      token,
      userId: payload.user_id,
      channelId: payload.channel_id,
      role: payload.role,
    };
  } catch (error) {
    console.error('Failed to parse JWT:', error);
    return null;
  }
}

/**
 * Get JWT token for API requests
 * Returns stored token or extracts from URL
 */
let cachedToken: string | null = null;

export function getAuthToken(): string | null {
  if (cachedToken) return cachedToken;

  const token = extractTwitchJWT();
  if (token) {
    cachedToken = token;
  }

  return token;
}
