import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool, Client, types } = pg;

// Configure pg to return DATE values as strings to avoid timezone issues
// PostgreSQL DATE type OID is 1082
types.setTypeParser(1082, (val: string) => val);

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create pool with settings that balance reliability and resource usage
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 5,
  min: 0,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  allowExitOnIdle: true,
});

// Handle pool-level errors
pool.on('error', (err) => {
  console.error('[db] Pool error:', err.message);
});

pool.on('connect', (client) => {
  console.log('[db] New connection established');
  client.on('error', (err: Error) => {
    console.error('[db] Connection error:', err.message);
  });
});

pool.on('remove', () => {
  console.log('[db] Connection closed');
});

export const db = drizzle(pool, { schema });

// Helper to run a query with a fresh connection (bypasses pool issues)
export async function withFreshConnection<T>(
  fn: (db: ReturnType<typeof drizzle>) => Promise<T>
): Promise<T> {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    await client.connect();
    const freshDb = drizzle(client, { schema });
    const result = await fn(freshDb);
    return result;
  } finally {
    await client.end().catch(() => {}); // Ignore errors during cleanup
  }
}

// Export function to reset pool if needed
export async function resetPool(): Promise<void> {
  console.log('[db] Resetting connection pool...');
  await pool.end();
  console.log('[db] Pool reset complete');
}
