/**
 * Manual DB restore from S3. DESTRUCTIVE — overwrites the target database.
 *
 * Usage:
 *   npx tsx scripts/restore-db.ts                # restores the newest S3 dump
 *   npx tsx scripts/restore-db.ts <s3-object-key>  # restores a specific dump
 *
 * Requires:
 *   - pg_restore on PATH
 *   - DATABASE_URL env var pointing at the target database
 *   - config.yaml with a backup destination of type "s3"
 */

import { listS3Keys } from "../src/lib/backup/s3";
import { restoreDatabaseFromS3 } from "../src/lib/backup/database";

async function main() {
  let key = process.argv[2];

  if (!key) {
    console.log("Nessuna chiave specificata, cerco l'ultimo dump in db-backups/ ...");
    const objects = await listS3Keys("db-backups/");
    const latest = objects[0];
    if (!latest) {
      console.error("Nessun backup trovato in db-backups/.");
      process.exit(1);
    }
    key = latest.key;
    console.log(`Uso il backup più recente: ${key} (${latest.lastModified.toISOString()})`);
  }

  if (process.env.CONFIRM !== "yes") {
    console.error(
      'Abort: questa operazione sovrascriverà il database. Rieseguire con CONFIRM=yes per procedere.',
    );
    process.exit(2);
  }

  try {
    await restoreDatabaseFromS3(key);
    console.log(`OK: database ripristinato da ${key}`);
    process.exit(0);
  } catch (err) {
    console.error("Restore fallito:", err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main();
