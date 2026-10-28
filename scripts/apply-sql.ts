/**
 * Applies the SQL files in drizzle/ in name order.
 *
 * `drizzle-kit push` creates the tables and indexes from the schema, but not
 * the `unaccent` extension, the trigger function and the trigger that fill
 * `slides.search_vector` (drizzle/0001_search_vector.sql). The files are
 * written to be idempotent (IF NOT EXISTS / OR REPLACE), so this runs at
 * every start, after the push, in the chart's init container.
 *
 * Usage:
 *   npx tsx scripts/apply-sql.ts
 *
 * Environment:
 *   DATABASE_URL         - PostgreSQL connection string
 */

import { readdir } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgres://dia:dia@localhost:5432/dia_storage";
const SQL_DIR = path.resolve(__dirname, "..", "drizzle");

async function applySql() {
  console.log("Dia-Storage - Applicazione SQL");
  console.log("==============================");
  console.log(`Database: ${DATABASE_URL.replace(/\/\/.*@/, "//***@")}`);
  console.log(`Directory: ${SQL_DIR}`);
  console.log();

  const files = (await readdir(SQL_DIR))
    .filter((name) => name.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.log("Nessun file SQL da applicare.");
    return;
  }

  const sql = postgres(DATABASE_URL, { max: 1 });

  try {
    for (const file of files) {
      process.stdout.write(`Applico ${file} ... `);
      // No parameters, so postgres.js uses the simple protocol and the file
      // may contain several statements (and $$ function bodies).
      await sql.file(path.join(SQL_DIR, file));
      console.log("ok");
    }
    console.log();
    console.log("SQL applicato con successo!");
  } catch (error) {
    console.error("Errore durante l'applicazione SQL:", error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

applySql();
