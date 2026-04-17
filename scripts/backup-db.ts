/**
 * Manual DB backup to S3.
 *
 * Usage:
 *   npx tsx scripts/backup-db.ts
 *
 * Requires:
 *   - pg_dump on PATH
 *   - DATABASE_URL env var
 *   - config.yaml with a backup destination of type "s3"
 */

import { backupDatabaseToS3 } from "../src/lib/backup/database";

async function main() {
  try {
    const key = await backupDatabaseToS3();
    console.log(`OK: dump caricato su S3 con chiave "${key}"`);
    process.exit(0);
  } catch (err) {
    console.error("Backup fallito:", err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main();
