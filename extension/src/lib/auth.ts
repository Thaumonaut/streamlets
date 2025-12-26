/// <reference types="@sveltejs/kit" />

/**
 * Twitch Extension JWT handling
 * Manages Twitch JWT acquisition for the extension runtime.
 */

export interface TwitchJWT {
  token: string;
  userId: string;
  channelId: string;
  role: 'viewer' | 'broadcaster' | 'moderator';
}

import { browser, dev } from '$app/environment';

interface TwitchExtAuthorizedEvent {
  token: string;
  userId?: string;
  channelId: string;
  clientId: string;
  role?: 'viewer' | 'broadcaster' | 'moderator';
}

interface PendingAuthRequest {
  resolve: (token: string) => void;
  reject: (error: Error) => void;
}

declare global {
  interface Window {
    Twitch?: {
      ext?: {
        onAuthorized: (handler: (auth: TwitchExtAuthorizedEvent) => void) => void;
        onError?: (handler: (error: unknown) => void) => void;
      };
    };
  }
}

const DEFAULT_AUTH_TIMEOUT = 10_000;

let cachedToken: string | null = null;
let cachedPayload: TwitchJWT | null = null;
let authInitialized = false;
let pendingRequests: PendingAuthRequest[] = [];

function setCachedAuth(token: string, auth?: TwitchExtAuthorizedEvent): void {
  const storedDevToken = dev && browser ? window.localStorage.getItem('dev_auth_token') : null;

  if (storedDevToken && token !== storedDevToken) {
    // Prefer the manually selected dev token while developing; ignore Twitch-issued tokens.
    if (!cachedToken) {
      cachedToken = storedDevToken;
      const parsedDev = parseJWTPayload(storedDevToken);
      if (parsedDev) {
        cachedPayload = parsedDev;
      }
    }
    return;
  }

  cachedToken = token;

  const parsed = parseJWTPayload(token);
  if (parsed) {
    cachedPayload = parsed;
    return;
  }

  if (auth) {
    cachedPayload = {
      token,
      userId: auth.userId ?? '',
      channelId: auth.channelId,
      role: auth.role ?? 'viewer',
    };
  }
}

function resolvePending(token: string, auth?: TwitchExtAuthorizedEvent): void {
  setCachedAuth(token, auth);

  if (pendingRequests.length === 0) return;

  const requests = pendingRequests;
  pendingRequests = [];

  for (const request of requests) {
    request.resolve(token);
  }
}

function rejectPending(error: Error): void {
  if (pendingRequests.length === 0) return;

  const requests = pendingRequests;
  pendingRequests = [];

  for (const request of requests) {
    request.reject(error);
  }
}

export function setDevAuthToken(token: string): void {
  if (!browser || !dev) {
    return;
  }

  window.localStorage.setItem('dev_auth_token', token);

  if (pendingRequests.length > 0) {
    resolvePending(token);
  } else {
    setCachedAuth(token);
  }
}

function initializeTwitchAuthListener(): void {
  if (authInitialized || !browser) {
    return;
  }

  authInitialized = true;

  const attemptSetup = (): boolean => {
    const ext = window.Twitch?.ext;
    if (!ext) {
      return false;
    }

    ext.onAuthorized((auth) => {
      resolvePending(auth.token, auth);
    });

    ext.onError?.((error) => {
      const err = error instanceof Error ? error : new Error(String(error));
      rejectPending(err);
    });

    return true;
  };

  if (attemptSetup()) {
    return;
  }

  let attempts = 0;
  const pollInterval = window.setInterval(() => {
    attempts += 1;

    if (attemptSetup() || attempts >= 50) {
      window.clearInterval(pollInterval);
    }
  }, 100);
}

/**
 * Extract JWT token from Twitch extension URL fragment
 * Example: #token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 */
export function extractTwitchJWT(): string | null {
  if (typeof window === 'undefined') return null;

  const hash = window.location.hash.slice(1);
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

    const payloadSegment = parts[1];
    if (!payloadSegment) return null;

    const payload = JSON.parse(atob(payloadSegment));
    return {
      token,
      userId: payload.user_id,
      channelId: payload.channel_id,
      role: payload.role,
    } as TwitchJWT;
  } catch (error) {
    console.error('Failed to parse JWT:', error);
    return null;
  }
}

/**
 * Get JWT token for API requests
 * Returns stored token or extracts from URL
 * In development, checks localStorage first (for local testing)
 */
export function getAuthToken(): string | null {
  if (cachedToken) return cachedToken;

  initializeTwitchAuthListener();

  if (!browser) {
    return cachedToken;
  }

  if (dev) {
    const devToken = window.localStorage.getItem('dev_auth_token');
    if (devToken) {
      resolvePending(devToken);
      return cachedToken;
    }
  }

  const token = extractTwitchJWT();
  if (token) {
    resolvePending(token);
  }

  return cachedToken;
}

export interface WaitForAuthTokenOptions {
  timeoutMs?: number;
}

export async function waitForAuthToken(
  options: WaitForAuthTokenOptions = {}
): Promise<TwitchJWT> {
  const { timeoutMs = DEFAULT_AUTH_TIMEOUT } = options;

  initializeTwitchAuthListener();

  const existingToken = getAuthToken();
  if (existingToken && cachedPayload) {
    return cachedPayload;
  }

  if (existingToken) {
    const parsed = parseJWTPayload(existingToken);
    if (parsed) {
      cachedPayload = parsed;
      return parsed;
    }
  }

  if (!browser) {
    throw new Error('Twitch authorization is not available in this environment');
  }

  return new Promise<TwitchJWT>((resolve, reject) => {
    let timer: number | null = null;

    const pendingRequest: PendingAuthRequest = {
      resolve: (token) => {
        if (timer !== null) {
          window.clearTimeout(timer);
          timer = null;
        }

        const payload = parseJWTPayload(token) ?? cachedPayload;
        if (!payload) {
          reject(new Error('Received invalid Twitch auth token'));
          return;
        }

        cachedPayload = payload;
        resolve(payload);
      },
      reject: (error) => {
        if (timer !== null) {
          window.clearTimeout(timer);
          timer = null;
        }

        reject(error);
      },
    };

    pendingRequests.push(pendingRequest);

    if (timeoutMs > 0) {
      timer = window.setTimeout(() => {
        pendingRequests = pendingRequests.filter((req) => req !== pendingRequest);
        reject(new Error('Timed out waiting for Twitch authorization'));
      }, timeoutMs);
    }
  });
}
