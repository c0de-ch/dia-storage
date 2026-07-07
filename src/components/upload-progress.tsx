"use client";

import React from "react";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2Icon,
  XCircleIcon,
  Loader2Icon,
  XIcon,
  ImageIcon,
  CopyIcon,
} from "lucide-react";

export interface FileUploadStatus {
  name: string;
  progress: number;
  status: "pending" | "uploading" | "done" | "duplicate" | "error";
  error?: string;
}

interface UploadProgressProps {
  files: FileUploadStatus[];
  overallProgress: number;
  onCancel?: () => void;
}

function StatusIcon({ status }: { status: FileUploadStatus["status"] }) {
  switch (status) {
    case "done":
      return <CheckCircle2Icon className="size-4 text-success" />;
    // chart-3 (not chart-5): chart-5's hue matches --destructive in every
    // theme, which would defeat "duplicate must read differently from error".
    case "duplicate":
      return <CopyIcon className="size-4 text-chart-3" />;
    case "error":
      return <XCircleIcon className="size-4 text-destructive" />;
    case "uploading":
      return <Loader2Icon className="size-4 animate-spin text-primary" />;
    default:
      return <ImageIcon className="size-4 text-muted-foreground" />;
  }
}

function statusLabel(status: FileUploadStatus["status"]): string {
  switch (status) {
    case "done":
      return t("status.complete");
    case "duplicate":
      return "Duplicato";
    case "error":
      return t("status.error");
    case "uploading":
      return t("labels.uploading");
    default:
      return t("status.pending");
  }
}

export function UploadProgress({
  files,
  overallProgress,
  onCancel,
}: UploadProgressProps) {
  const completed = files.filter((f) => f.status === "done").length;
  const duplicates = files.filter((f) => f.status === "duplicate").length;
  const errors = files.filter((f) => f.status === "error").length;
  // Bytes-sent can hit 100% while the last file is still awaiting the server
  // response: the batch is only over when every file reached a terminal state.
  const allSettled =
    files.length > 0 &&
    files.every(
      (f) =>
        f.status === "done" || f.status === "duplicate" || f.status === "error"
    );
  const allFailed = allSettled && errors === files.length;

  return (
    <div
      data-slot="card"
      className="flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-sm"
    >
      {/* Overall progress */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">
            {!allSettled
              ? t("upload.uploading", {
                  progress: Math.round(overallProgress).toString(),
                })
              : allFailed
                ? t("upload.uploadFailed")
                : t("upload.uploadComplete")}
          </p>
          {onCancel && !allSettled && (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={onCancel}
              aria-label={t("actions.cancel")}
            >
              <XIcon />
            </Button>
          )}
        </div>
        <Progress value={overallProgress} />
        <p className="font-mono text-xs tabular-nums text-muted-foreground">
          {completed} di {files.length} completati
          {duplicates > 0 &&
            ` · ${duplicates} ${duplicates === 1 ? "duplicato" : "duplicati"}`}
          {errors > 0 && ` · ${errors} ${errors === 1 ? "errore" : "errori"}`}
        </p>
      </div>

      <div className="film-sprockets" aria-hidden />

      {/* Per-file list */}
      <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
        {files.map((file, i) => (
          <div
            key={`${file.name}-${i}`}
            className="rounded-md px-2 py-1.5 hover:bg-muted/50"
          >
            <div className="flex items-center gap-3">
              <StatusIcon status={file.status} />
              <span className="min-w-0 flex-1 truncate font-mono text-xs">
                {file.name}
              </span>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {file.status === "uploading"
                  ? `${Math.round(file.progress)}%`
                  : statusLabel(file.status)}
              </span>
            </div>
            {file.error &&
              (file.status === "error" || file.status === "duplicate") && (
                <p
                  className={cn(
                    "break-words pl-7 pt-0.5 text-xs",
                    file.status === "duplicate"
                      ? "text-chart-3"
                      : "text-destructive"
                  )}
                >
                  {file.error}
                </p>
              )}
          </div>
        ))}
      </div>
    </div>
  );
}
