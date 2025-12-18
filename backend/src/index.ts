/**
 * Backend API server entry point
 * Express server with CORS, authentication, and API routes
 */

import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name in ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables FIRST, before any other imports
dotenv.config({ path: path.join(__dirname, '../../.env') });

import express from 'express';
import cors from 'cors';
import { healthCheck } from './api/health';
import { validateJWT } from './lib/auth';
import { watchTimeHandler, pullsHandler, craftHandler, inventoryHandler, recipesHandler } from './api/handlers';
import { devTokensHandler, regenerateTokensHandler } from './api/dev';
import { seed } from './db/seed';

const app = express();
const PORT = process.env.PORT || 3000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

// Middleware
app.use(cors({
  origin: CORS_ORIGIN,
  credentials: true,
}));
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Routes
app.get('/health', healthCheck);

// Development routes (only in dev mode)
if (process.env.NODE_ENV !== 'production') {
  app.get('/api/dev/tokens', devTokensHandler);
  app.post('/api/dev/regenerate-tokens', regenerateTokensHandler);
}

// API routes with JWT authentication
app.post('/api/watch-time', validateJWT, watchTimeHandler);
app.post('/api/pulls', validateJWT, pullsHandler);
app.post('/api/craft', validateJWT, craftHandler);
app.get('/api/inventory', validateJWT, inventoryHandler);
app.get('/api/recipes', validateJWT, recipesHandler);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
async function start() {
  try {
    // Seed database on startup (will skip if already seeded)
    console.log('🌱 Checking database seed status...');
    await seed();

    app.listen(PORT, () => {
      console.log(`✅ API server running on http://localhost:${PORT}`);
      console.log(`   CORS origin: ${CORS_ORIGIN}`);
      console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

start();
