/**
 * Backend API client
 * Handles all API requests with authentication
 */

import { getAuthToken } from './auth';
import type {
  WatchTimeRequest,
  WatchTimeResponse,
  PullRequest,
  PullResponse,
  CraftRequest,
  CraftResponse,
  InventoryResponse,
  RecipesResponse,
  ErrorResponse,
} from '@project-puff/shared';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

/**
 * Make authenticated API request
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();

  if (!token) {
    throw new Error('No authentication token available');
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error: ErrorResponse = await response.json();
    throw new Error(error.error || 'API request failed');
  }

  return response.json();
}

/**
 * Award watch time currency
 */
export async function sendWatchTimeHeartbeat(channelId: string): Promise<WatchTimeResponse> {
  return apiRequest<WatchTimeResponse>('/api/watch-time', {
    method: 'POST',
    body: JSON.stringify({ channelId } as WatchTimeRequest),
  });
}

/**
 * Execute gacha pull
 */
export async function executePull(tier: 'single' | '5' | '10'): Promise<PullResponse> {
  return apiRequest<PullResponse>('/api/pulls', {
    method: 'POST',
    body: JSON.stringify({ tier } as PullRequest),
  });
}

/**
 * Craft character from recipe
 */
export async function craftCharacter(recipeId: string): Promise<CraftResponse> {
  return apiRequest<CraftResponse>('/api/craft', {
    method: 'POST',
    body: JSON.stringify({ recipeId } as CraftRequest),
  });
}

/**
 * Get viewer inventory (currency, materials, characters)
 */
export async function getInventory(): Promise<InventoryResponse> {
  return apiRequest<InventoryResponse>('/api/inventory');
}

/**
 * Get available recipes with craftability status
 */
export async function getRecipes(): Promise<RecipesResponse> {
  return apiRequest<RecipesResponse>('/api/recipes');
}
