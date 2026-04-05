"use client";

import React from "react";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2Icon,
  XCircleIcon,
  Loader2Icon,
  XIcon,
  ImageIcon,
} from "lucide-react";

export interface FileUploadStatus {
  name: string;
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
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
      return <CheckCircle2Icon className="size-4 text-emerald-500" />;
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
      return "Completato";
    case "error":
      return "Errore";
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
  const errors = files.filter((f) => f.status === "error").length;

  return (
    <div className="flex flex-col gap-4 rounded-xl border p-4">
      {/* Overall progress */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">
            {overallProgress < 100
              ? t("upload.uploading", {
                  progress: Math.round(overallProgress).toString(),
                })
              : t("upload.uploadComplete")}
          </p>
          {onCancel && overallProgress < 100 && (
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
        <p className="text-xs text-muted-foreground">
          {completed} di {files.length} completati
          {errors > 0 && ` \u00b7 ${errors} errori`}
        </p>
      </div>

      {/* Per-file list */}
      <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
        {files.map((file, i) => (
          <div
            key={`${file.name}-${i}`}
            className="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50"
          >
            <StatusIcon status={file.status} />
            <span className="flex-1 truncate">{file.name}</span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {file.status === "uploading"
                ? `${Math.round(file.progress)}%`
                : statusLabel(file.status)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
