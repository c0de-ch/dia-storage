import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgres://dia:dia@localhost:5432/dia_storage";

// Connection pool for queries (multiple connections)
const queryClient = postgres(DATABASE_URL, {
  max: 15,
  idle_timeout: 60,
  connect_timeout: 10,
});

export const db = drizzle(queryClient, { schema });

// Single connection for migrations (not pooled)
export function createMigrationClient() {
  const migrationClient = postgres(DATABASE_URL, { max: 1 });
  return drizzle(migrationClient, { schema });
}

export type Database = typeof db;
