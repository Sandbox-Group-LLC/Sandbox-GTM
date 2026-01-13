import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool, types } = pg;

// Configure pg to return DATE values as strings to avoid timezone issues
// PostgreSQL DATE type OID is 1082
types.setTypeParser(1082, (val: string) => val);

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create pool with more aggressive connection management to avoid stale connections
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 5, // Reduced pool size for better connection health
  min: 1, // Minimum pool size
  idleTimeoutMillis: 10000, // Close idle connections faster (10 seconds)
  connectionTimeoutMillis: 5000, // Shorter timeout for connection attempts
  allowExitOnIdle: false,
});

// Add error handler to prevent circular JSON serialization crashes
// When a pool error occurs, the connection is automatically removed from the pool
pool.on('error', (err) => {
  console.error('[db] Unexpected pool error:', err.message);
});

pool.on('connect', (client) => {
  console.log('[db] New client connected to pool');
  // Add error handler to individual client to catch protocol errors
  client.on('error', (err: Error) => {
    console.error('[db] Client error:', err.message);
  });
});

pool.on('remove', () => {
  console.log('[db] Client removed from pool');
});

export const db = drizzle(pool, { schema });
