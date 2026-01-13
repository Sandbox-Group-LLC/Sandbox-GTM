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

// Create pool with conservative settings to prevent connection corruption
// Key: Don't reuse connections for too long, and keep pool small
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 3, // Small pool to minimize stale connections
  min: 0, // Allow pool to shrink to zero when idle
  idleTimeoutMillis: 5000, // Close idle connections quickly (5 seconds)
  connectionTimeoutMillis: 5000, // Timeout for acquiring connections
  allowExitOnIdle: true, // Allow app to exit if only idle connections remain
});

// Handle pool-level errors - these indicate a connection was lost unexpectedly
pool.on('error', (err) => {
  console.error('[db] Pool error (connection will be removed):', err.message);
  // Don't crash, the pool will automatically remove the bad connection
});

// Track new connections
pool.on('connect', (client) => {
  console.log('[db] New connection established');
  
  // Handle client-level errors to prevent unhandled rejections
  client.on('error', (err: Error) => {
    console.error('[db] Connection error:', err.message);
    // Connection will be removed from pool automatically
  });
});

pool.on('remove', () => {
  console.log('[db] Connection closed');
});

export const db = drizzle(pool, { schema });

// Export function to reset pool if needed
export async function resetPool(): Promise<void> {
  console.log('[db] Resetting connection pool...');
  await pool.end();
  console.log('[db] Pool reset complete');
}
