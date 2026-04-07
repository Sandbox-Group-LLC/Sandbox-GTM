import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./engage/shared/schema.ts",
  out: "./engage/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
