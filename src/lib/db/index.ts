import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

function resolveDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (url) return url;
  // Never fall back to well-known dev credentials in production: a deployment
  // that forgets DATABASE_URL must fail loudly, not silently run on dia:dia.
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "DATABASE_URL non impostata. Configurala con credenziali dedicate prima dell'avvio in produzione."
    );
  }
  return "postgres://dia:dia@localhost:5432/dia_storage";
}

const DATABASE_URL = resolveDatabaseUrl();

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
