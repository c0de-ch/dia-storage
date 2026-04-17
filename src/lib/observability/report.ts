/**
 * Structured reporter for errors and notable events.
 *
 * Today this is a thin wrapper around console that emits JSON so log
 * aggregators (Grafana Loki, Datadog, a simple `jq`) can parse fields
 * without regex. The shape is stable so a future upgrade to a
 * Sentry-compatible endpoint can ship the same payload unchanged.
 *
 * Call `reportError` at every layer that knows something a human would
 * want to see: backup failures, external API timeouts, unexpected 5xxs.
 * Call `reportEvent` for non-error signals (backup completed, purge ran).
 */

type Level = "error" | "warn" | "info";

type LogFields = Record<string, unknown>;

type Report = {
  level: Level;
  scope: string;
  message: string;
  timestamp: string;
  fields?: LogFields;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
};

function emit(report: Report): void {
  const line = JSON.stringify(report);
  if (report.level === "error") {
    console.error(line);
  } else if (report.level === "warn") {
    console.warn(line);
  } else {
    console.info(line);
  }
}

export function reportError(
  scope: string,
  err: unknown,
  fields?: LogFields,
): void {
  const error: Report["error"] =
    err instanceof Error
      ? {
          name: err.name,
          message: err.message,
          ...(err.stack !== undefined && { stack: err.stack }),
        }
      : { name: "NonErrorThrown", message: String(err) };

  emit({
    level: "error",
    scope,
    message: error?.message ?? "",
    timestamp: new Date().toISOString(),
    ...(fields !== undefined && { fields }),
    error,
  });
}

export function reportEvent(
  scope: string,
  message: string,
  fields?: LogFields,
  level: Level = "info",
): void {
  emit({
    level,
    scope,
    message,
    timestamp: new Date().toISOString(),
    ...(fields !== undefined && { fields }),
  });
}
