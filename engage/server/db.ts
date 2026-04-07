import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../shared/schema.js";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Don't connect eagerly at startup — connect on first query
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,  // fail fast if Neon is unreachable
});

export const db = drizzle(pool, { schema });
