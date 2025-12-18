/**
 * Development Token Storage
 * Provides utilities to save and load JWT tokens for local testing
 * 
 * ⚠️ DEVELOPMENT ONLY - Never commit tokens to version control
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../../../');
const TOKEN_FILE = path.join(PROJECT_ROOT, '.dev-tokens.json');
const GITIGNORE_PATH = path.join(PROJECT_ROOT, '.gitignore');

export interface DevTokens {
  viewer: string;
  broadcaster: string;
  moderator: string;
  generated_at: string;
  expires_at: string;
}

/**
 * Save tokens to local development file
 */
export function saveDevTokens(tokens: Omit<DevTokens, 'generated_at' | 'expires_at'>): void {
  const now = new Date().toISOString();
  
  // Calculate expiration (1 hour from now)
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  const data: DevTokens = {
    ...tokens,
    generated_at: now,
    expires_at: expiresAt,
  };

  fs.writeFileSync(TOKEN_FILE, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`✓ Tokens saved to ${path.relative(PROJECT_ROOT, TOKEN_FILE)}`);

  // Ensure .gitignore has the file
  ensureGitignore();
}

/**
 * Load tokens from local development file
 */
export function loadDevTokens(): DevTokens | null {
  if (!fs.existsSync(TOKEN_FILE)) {
    return null;
  }

  try {
    const content = fs.readFileSync(TOKEN_FILE, 'utf-8');
    const data = JSON.parse(content) as DevTokens;

    // Check if expired
    const expiresAt = new Date(data.expires_at);
    if (expiresAt < new Date()) {
      console.warn('⚠️  Saved tokens have expired. Generate new ones with: npm run token:generate');
      return null;
    }

    return data;
  } catch (error) {
    console.error('Failed to load tokens:', error);
    return null;
  }
}

/**
 * Get a specific token by role
 */
export function getDevToken(role: 'viewer' | 'broadcaster' | 'moderator'): string | null {
  const tokens = loadDevTokens();
  return tokens?.[role] || null;
}

/**
 * Check if valid tokens exist and are not expired
 */
export function hasValidDevTokens(): boolean {
  return loadDevTokens() !== null;
}

/**
 * Delete saved tokens
 */
export function deleteDevTokens(): void {
  if (fs.existsSync(TOKEN_FILE)) {
    fs.unlinkSync(TOKEN_FILE);
    console.log(`✓ Deleted ${path.relative(PROJECT_ROOT, TOKEN_FILE)}`);
  }
}

/**
 * Ensure .gitignore includes .dev-tokens.json
 */
function ensureGitignore(): void {
  const gitignorePath = path.join(PROJECT_ROOT, '.gitignore');
  
  if (!fs.existsSync(gitignorePath)) {
    fs.writeFileSync(gitignorePath, '.dev-tokens.json\n', 'utf-8');
    return;
  }

  const content = fs.readFileSync(gitignorePath, 'utf-8');
  if (!content.includes('.dev-tokens.json')) {
    fs.appendFileSync(gitignorePath, '.dev-tokens.json\n', 'utf-8');
    console.log('✓ Added .dev-tokens.json to .gitignore');
  }
}

/**
 * Display saved tokens info
 */
export function showDevTokensInfo(): void {
  const tokens = loadDevTokens();
  
  if (!tokens) {
    console.log('\n📋 No saved tokens found. Generate them with: npm run token:generate\n');
    return;
  }

  const now = new Date();
  const expiresAt = new Date(tokens.expires_at);
  const minutesLeft = Math.floor((expiresAt.getTime() - now.getTime()) / 1000 / 60);

  console.log('\n📋 Saved Development Tokens:\n');
  console.log(`Generated: ${tokens.generated_at}`);
  console.log(`Expires in: ${minutesLeft} minutes\n`);

  Object.entries(tokens).forEach(([role, token]) => {
    if (role === 'generated_at' || role === 'expires_at') return;
    console.log(`${role.toUpperCase()}:`);
    console.log(`  ${token.substring(0, 50)}...`);
  });

  console.log('\n');
}
