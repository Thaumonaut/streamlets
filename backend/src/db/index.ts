/**
 * Database connection and Drizzle ORM setup
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Create PostgreSQL connection
const client = postgres(connectionString);

// Create Drizzle ORM instance with schema
export const db = drizzle(client, { schema });

// Export schema for use in queries
export { schema };
