import cron, { type ScheduledTask } from 'node-cron';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { getConfig } from '@/lib/config/loader';
import { runIncrementalBackup } from './s3';
import { runNasBackup } from './nas';
import { backupDatabaseToS3 } from './database';
import { purgeOldAuditLogs } from '@/lib/audit/retention';
import { reportError } from '@/lib/observability/report';

let scheduledTask: ScheduledTask | null = null;

// Advisory-lock key for the backup job. Shared across processes that connect
// to the same database, so two containers running the same cron won't race.
const BACKUP_LOCK_KEY = 9731428461;

/**
 * Start the backup scheduler using the cron expression from config.
 *
 * Reads `backup.schedule` from the YAML config (defaults to "0 2 * * *" -- 2 AM daily).
 * Runs both S3 and NAS backups (whichever are configured) on each tick.
 */
export function startBackupScheduler(): void {
  if (scheduledTask) {
    console.warn('[backup] Scheduler già in esecuzione, ignorando la richiesta.');
    return;
  }

  const config = getConfig();

  if (!config.backup.enabled) {
    console.info('[backup] Backup disabilitato nella configurazione.');
    return;
  }

  const schedule = config.backup.schedule;

  if (!cron.validate(schedule)) {
    console.error(`[backup] Espressione cron non valida: "${schedule}"`);
    return;
  }

  console.info(`[backup] Avvio scheduler con cron: "${schedule}"`);

  scheduledTask = cron.schedule(schedule, async () => {
    // pg_try_advisory_xact_lock auto-releases at transaction end, guarding
    // against concurrent runs across containers/processes. Returns false if
    // another worker already holds the lock.
    try {
      await db.transaction(async (tx) => {
        const locked = await tx.execute<{ acquired: boolean }>(
          sql`select pg_try_advisory_xact_lock(${BACKUP_LOCK_KEY}) as acquired`,
        );
        const row = Array.isArray(locked) ? locked[0] : undefined;
        if (!row?.acquired) {
          console.warn('[backup] Backup già in corso su un altro worker, salto.');
          return;
        }

        console.info('[backup] Inizio backup programmato...');

        const hasS3 = config.backup.destinations.some((d) => d.type === 's3');
        if (hasS3) {
          console.info('[backup] Esecuzione backup S3...');
          const s3Result = await runIncrementalBackup();
          console.info(
            `[backup] S3: ${s3Result.uploaded} file caricati, ${s3Result.errors.length} errori.`,
          );

          try {
            const dbKey = await backupDatabaseToS3();
            console.info(`[backup] Dump DB caricato su S3: ${dbKey}`);
          } catch (dbErr) {
            reportError('backup.database', dbErr, { stage: 's3-dump' });
          }
        }

        const hasNas = config.backup.destinations.some(
          (d) => d.type === 'local' || d.type === 'smb',
        );
        if (hasNas) {
          console.info('[backup] Esecuzione backup NAS...');
          const nasResult = await runNasBackup();
          console.info(
            `[backup] NAS: ${nasResult.copied} file copiati, ${nasResult.errors.length} errori.`,
          );
        }

        try {
          const purged = await purgeOldAuditLogs(config.backup.auditRetainDays);
          if (purged > 0) {
            console.info(`[backup] Retention audit log: rimosse ${purged} righe.`);
          }
        } catch (retentionErr) {
          reportError('backup.auditRetention', retentionErr, {
            retainDays: config.backup.auditRetainDays,
          });
        }

        console.info('[backup] Backup programmato completato.');
      });
    } catch (err) {
      reportError('backup.scheduler', err);
    }
  });

  scheduledTask.start();
}

/**
 * Stop the backup scheduler.
 */
export function stopBackupScheduler(): void {
  if (!scheduledTask) {
    return;
  }

  scheduledTask.stop();
  scheduledTask = null;
  console.info('[backup] Scheduler fermato.');
}

/**
 * Check whether the scheduler is currently active.
 */
export function isSchedulerRunning(): boolean {
  return scheduledTask !== null;
}
