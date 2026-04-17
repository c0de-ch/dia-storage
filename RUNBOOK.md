# Dia-Storage Ops Runbook

Operational procedures for running, backing up, and restoring dia-storage.

## Prerequisites

- `pg_dump` and `pg_restore` on PATH (bundled with `postgresql-client` on Debian/Ubuntu)
- `DATABASE_URL` env var pointing at the database
- `config.yaml` with a backup destination of type `s3`

## Backups

### Automated (cron)

The scheduler at `src/lib/backup/scheduler.ts` runs on the cron expression from
`config.yaml` (`backup.schedule`, default `0 2 * * *` — 2 AM daily). On each
tick it:

1. Acquires a Postgres advisory lock so concurrent workers cannot race.
2. Incrementally uploads any new slide files to S3.
3. Dumps the database and uploads the archive to `s3://<bucket>/db-backups/dia-storage-<timestamp>.dump`.
4. Runs the NAS backup if a local/SMB destination is configured.

Failures on the DB dump are logged but do not abort the file backup.

### Manual DB backup

```
npx tsx scripts/backup-db.ts
```

Prints the S3 key on success.

## Restore

**Restoring the database is destructive.** It overwrites the target database
using `pg_restore --clean --if-exists`. Double-check `DATABASE_URL` before
running and snapshot the current DB if there is anything worth preserving.

### Restore the most recent DB dump

```
CONFIRM=yes npx tsx scripts/restore-db.ts
```

### Restore a specific dump

```
CONFIRM=yes npx tsx scripts/restore-db.ts db-backups/dia-storage-2026-04-17T02-00-00-000Z.dump
```

The script refuses to run without `CONFIRM=yes`.

### Restoring slide files

Slide files live at the paths stored in `slides.storage_path`. They are
uploaded to S3 under the same relative path (minus the `/data/` prefix). To
restore a single file, fetch it from S3 with any S3 client and place it at the
stored path. There is no bulk file restore yet — add one if/when the first
real DR exercise demands it.

## Health checks

- `/api/v1/health` performs a `SELECT 1` — Caddy/Docker healthchecks should use it.
- Backup history is in the `backup_history` table; surface failures to oncall via whatever alerting you wire up to structured logs.

## Common incidents

**The cron job reports "Backup già in corso su un altro worker" every tick.**
Another instance is holding the advisory lock. If that instance has crashed,
the lock (being transaction-scoped) should already be released on the next
connection restart; check for stuck long-running transactions:

```
SELECT pid, state, query_start, query FROM pg_stat_activity
WHERE state <> 'idle' ORDER BY query_start;
```

**`pg_dump` exits with "command not found".**
The runtime container is missing `postgresql-client`. Add it to the Dockerfile
runner stage.

**S3 `HeadBucket` returns 403.**
The configured access key can't reach the bucket. Verify the key pair and the
bucket policy; run `npx tsx -e 'import("./src/lib/backup/s3").then(m => m.testS3Connection(m.getS3ConfigFromApp()!))'` to reproduce.
