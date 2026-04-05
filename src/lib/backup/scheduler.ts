import cron, { type ScheduledTask } from 'node-cron';
import { getConfig } from '@/lib/config/loader';
import { runIncrementalBackup } from './s3';
import { runNasBackup } from './nas';

let scheduledTask: ScheduledTask | null = null;
let isRunning = false;

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
    if (isRunning) {
      console.warn('[backup] Backup già in corso, salto questa esecuzione.');
      return;
    }

    isRunning = true;
    console.info('[backup] Inizio backup programmato...');

    try {
      // Run S3 backup if configured
      const hasS3 = config.backup.destinations.some((d) => d.type === 's3');
      if (hasS3) {
        console.info('[backup] Esecuzione backup S3...');
        const s3Result = await runIncrementalBackup();
        console.info(
          `[backup] S3: ${s3Result.uploaded} file caricati, ${s3Result.errors.length} errori.`,
        );
      }

      // Run NAS backup if configured
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
    } catch (err) {
      console.error(
        '[backup] Errore durante il backup:',
        err instanceof Error ? err.message : err,
      );
    } finally {
      isRunning = false;
      console.info('[backup] Backup programmato completato.');
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
  isRunning = false;
  console.info('[backup] Scheduler fermato.');
}

/**
 * Check whether the scheduler is currently active.
 */
export function isSchedulerRunning(): boolean {
  return scheduledTask !== null;
}
