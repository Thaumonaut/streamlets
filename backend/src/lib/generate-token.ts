#!/usr/bin/env tsx
/**
 * CLI tool to generate JWT tokens for local testing
 * Usage: npx tsx src/lib/generate-token.ts [role] [user_id] [channel_id]
 */

import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Load environment variables from project root
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// From src/lib go up to backend, then up to project root
const envPath = path.resolve(__dirname, '../../../.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const parsed = dotenv.parse(envContent);
Object.assign(process.env, parsed);

import { generateTestJWT, generateTestTokens } from './jwt-generator';
import { saveDevTokens, showDevTokensInfo } from './token-storage';

const args = process.argv.slice(2);

if (args[0] === '--help' || args[0] === '-h') {
  console.log(`
JWT Token Generator for Local Testing

Usage:
  npx tsx src/lib/generate-token.ts                    # Generate all test tokens
  npx tsx src/lib/generate-token.ts [role]             # Generate token with role (viewer|broadcaster|moderator)
  npx tsx src/lib/generate-token.ts [role] [user_id]   # Generate token with role and user ID
  npx tsx src/lib/generate-token.ts [role] [user_id] [channel_id] [expires_in]

Examples:
  npx tsx src/lib/generate-token.ts                    # All tokens
  npx tsx src/lib/generate-token.ts viewer             # Viewer token
  npx tsx src/lib/generate-token.ts broadcaster        # Broadcaster token
  npx tsx src/lib/generate-token.ts moderator          # Moderator token
  npx tsx src/lib/generate-token.ts viewer myuser mychannel 7200

Options:
  --help, -h     Show this help message
`);
  process.exit(0);
}

try {
  if (args.length === 0 || args[0] === 'all') {
    const tokens = generateTestTokens();
    console.log('\n✓ Generated test tokens:\n');
    
    Object.entries(tokens).forEach(([role, token]) => {
      console.log(`${role.toUpperCase()}:`);
      console.log(`  Token: ${token}\n`);
      console.log(`  As Bearer: Bearer ${token}\n`);
      console.log(`  URL Fragment: #token=${token}\n`);
      console.log('---\n');
    });

    // Save tokens to dev file
    saveDevTokens({
      viewer: tokens.viewer,
      broadcaster: tokens.broadcaster,
      moderator: tokens.moderator,
    });

    showDevTokensInfo();
  } else {
    const role = args[0] as 'viewer' | 'broadcaster' | 'moderator' | undefined;
    const userId = args[1];
    const channelId = args[2];
    const expiresIn = args[3] ? parseInt(args[3]) : undefined;

    const token = generateTestJWT({
      role,
      userId,
      channelId,
      expiresIn,
    });

    console.log('\n✓ Generated JWT Token:\n');
    console.log(`Token: ${token}\n`);
    console.log(`Bearer Header: Bearer ${token}\n`);
    console.log(`URL Fragment: #token=${token}\n`);
    
    // Also show the decoded payload
    const parts = token.split('.');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    console.log('Payload:');
    console.log(JSON.stringify(payload, null, 2));
  }
} catch (error) {
  console.error('❌ Error generating token:', error instanceof Error ? error.message : error);
  process.exit(1);
}
