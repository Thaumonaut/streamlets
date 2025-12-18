/**
 * Development Token Helper
 * Simple utilities to get tokens for use in tests and development
 */

import { getDevToken, hasValidDevTokens, loadDevTokens } from './token-storage';

/**
 * Get a token for use in API requests or tests
 * Returns token immediately if saved, otherwise throws error
 */
export function useDevToken(role: 'viewer' | 'broadcaster' | 'moderator' = 'viewer'): string {
  const token = getDevToken(role);
  
  if (!token) {
    throw new Error(
      `No valid ${role} token found. Generate tokens first:\n` +
      `  npm run token:generate\n\n` +
      `Then use this token in your code with: useDevToken('${role}')`
    );
  }

  return token;
}

/**
 * Get a bearer header ready for API requests
 * Usage: headers: { ...getBearerHeader() }
 */
export function getBearerHeader(role: 'viewer' | 'broadcaster' | 'moderator' = 'viewer'): {
  'Authorization': string;
} {
  const token = useDevToken(role);
  return {
    'Authorization': `Bearer ${token}`,
  };
}

/**
 * Get all saved tokens
 */
export function getAllDevTokens() {
  const tokens = loadDevTokens();
  if (!tokens) {
    throw new Error(
      'No valid tokens found. Generate tokens first:\n' +
      '  npm run token:generate'
    );
  }
  return tokens;
}

/**
 * Check if development tokens are available (non-throwing)
 */
export function hasDevTokens(): boolean {
  return hasValidDevTokens();
}

/**
 * Example: Using in tests
 * 
 * ```typescript
 * import { getBearerHeader } from './token-helper';
 * 
 * describe('API Tests', () => {
 *   it('should fetch inventory', async () => {
 *     const response = await fetch('http://localhost:3000/api/inventory', {
 *       headers: getBearerHeader('viewer')
 *     });
 *     expect(response.ok).toBe(true);
 *   });
 * });
 * ```
 */
