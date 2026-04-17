import { lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLog } from "@/lib/db/schema";

/**
 * Delete audit log rows older than `retainDays`. Returns the number of rows
 * that were removed. `audit_log_created_idx` (see schema.ts) keeps this cheap.
 *
 * Called from the nightly backup scheduler so retention piggybacks on an
 * already-scheduled maintenance window without introducing a second cron.
 */
export async function purgeOldAuditLogs(retainDays: number): Promise<number> {
  const cutoff = new Date(Date.now() - retainDays * 24 * 60 * 60 * 1000);
  const result = await db
    .delete(auditLog)
    .where(lt(auditLog.createdAt, cutoff))
    .returning({ id: auditLog.id });
  return result.length;
}
