"use client";

import React, { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { nanoid } from "nanoid";
import { t } from "@/lib/i18n";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageMasthead } from "@/components/page-masthead";
import { DatePickerIt } from "@/components/date-picker-it";
import {
  UploadDropzone,
  FilePreviewGrid,
} from "@/components/upload-dropzone";
import {
  UploadProgress,
  type FileUploadStatus,
} from "@/components/upload-progress";
import {
  CheckCircle2Icon,
  DownloadIcon,
  InboxIcon,
  InfoIcon,
  MonitorSmartphoneIcon,
  RotateCcwIcon,
  UploadIcon,
  XCircleIcon,
} from "lucide-react";

type UploadState = "idle" | "ready" | "uploading" | "done";

interface UploadFileResult {
  filename?: string;
  success?: boolean;
  duplicate?: boolean;
  message?: string;
}

interface UploadResponse {
  success?: boolean;
  message?: string;
  results?: UploadFileResult[];
}

/**
 * POST one file via XMLHttpRequest so we get real upload progress events
 * (fetch() has no upload progress). Abort is wired to the caller's
 * AbortSignal so cancelling mid-batch kills the in-flight request too.
 */
function uploadWithProgress(
  url: string,
  formData: FormData,
  signal: AbortSignal,
  onProgress: (fraction: number) => void
): Promise<{ ok: boolean; data: UploadResponse | null }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.withCredentials = true;
    xhr.responseType = "json";

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && e.total > 0) {
        onProgress(e.loaded / e.total);
      }
    };

    const onAbort = () => xhr.abort();
    signal.addEventListener("abort", onAbort, { once: true });

    xhr.onload = () => {
      signal.removeEventListener("abort", onAbort);
      resolve({
        ok: xhr.status >= 200 && xhr.status < 300,
        data: (xhr.response ?? null) as UploadResponse | null,
      });
    };
    xhr.onerror = () => {
      signal.removeEventListener("abort", onAbort);
      reject(new Error(t("errors.uploadFailed")));
    };
    xhr.onabort = () => {
      signal.removeEventListener("abort", onAbort);
      reject(new DOMException("Annullato", "AbortError"));
    };

    xhr.send(formData);
  });
}

export default function CaricamentoPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [fileStatuses, setFileStatuses] = useState<FileUploadStatus[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);
  // Honest note shown after a mid-batch cancel: which files already made it.
  const [cancelNote, setCancelNote] = useState<string | null>(null);
  // AbortController aborts the in-flight XHR when the user cancels. A plain
  // boolean ref only stopped the next iteration -- the current upload kept
  // burning bytes until it finished.
  const abortRef = useRef<AbortController | null>(null);

  // Optional batch metadata — applied to every photo in this upload and used
  // as the album name when the batch is published from the queue.
  const [title, setTitle] = useState("");
  // Free text as typed ("Estate 1985") plus the value actually sent: the
  // precise ISO date when parseable, the free text otherwise (the API stores
  // free text as dateTaken and only ISO strings as dateTakenPrecise).
  const [dateText, setDateText] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");

  const handleFilesSelected = useCallback((newFiles: File[]) => {
    setFiles((prev) => [...prev, ...newFiles]);
    setUploadState("ready");
  }, []);

  const handleRemoveFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const handleUpload = useCallback(async () => {
    if (files.length === 0) return;

    const controller = new AbortController();
    abortRef.current = controller;
    // One batch id for the whole upload session so all files land in a single
    // queue batch (the route reuses it instead of minting one per file).
    const batchId = nanoid();
    setUploadState("uploading");
    setCancelNote(null);

    const statuses: FileUploadStatus[] = files.map((f) => ({
      name: f.name,
      progress: 0,
      status: "pending" as const,
    }));
    setFileStatuses([...statuses]);
    setOverallProgress(0);

    // Overall progress is bytes-weighted so one 40 MB TIFF doesn't count the
    // same as a 200 KB thumbnail.
    const totalBytes = files.reduce((sum, f) => sum + f.size, 0) || 1;
    let finishedBytes = 0;

    // On cancel: files that already reached the server (uploaded or detected
    // as duplicates) leave the local queue, so retrying only sends the rest.
    const finishCancelled = () => {
      const remaining = files.filter((_, j) => {
        const s = statuses[j];
        return !(s && (s.status === "done" || s.status === "duplicate"));
      });
      const uploadedCount = files.length - remaining.length;
      setFiles(remaining);
      setFileStatuses([...statuses]);
      if (uploadedCount > 0) {
        setCancelNote(
          uploadedCount === 1
            ? "Caricamento annullato — 1 file era già stato caricato ed è in coda; verrà saltato al prossimo tentativo."
            : `Caricamento annullato — ${uploadedCount} file erano già stati caricati e sono in coda; verranno saltati al prossimo tentativo.`
        );
      }
      toast("Caricamento annullato");
      if (remaining.length > 0) {
        setUploadState("ready");
      } else {
        // Nothing left to retry: everything reached the server before the
        // cancel landed, so this is effectively a completed batch.
        setOverallProgress(100);
        setUploadState("done");
      }
      abortRef.current = null;
    };

    for (let i = 0; i < files.length; i++) {
      if (controller.signal.aborted) {
        finishCancelled();
        return;
      }

      const file = files[i];
      if (!file || !statuses[i]) continue;

      statuses[i] = { name: file.name, status: "uploading", progress: 0 };
      setFileStatuses([...statuses]);

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("batchId", batchId);
        if (title) formData.append("title", title);
        if (date) formData.append("date", date);
        if (location) formData.append("location", location);

        const { ok, data } = await uploadWithProgress(
          "/api/v1/slides/upload",
          formData,
          controller.signal,
          (fraction) => {
            statuses[i] = {
              name: file.name,
              status: "uploading",
              progress: fraction * 100,
            };
            setFileStatuses([...statuses]);
            setOverallProgress(
              Math.min(
                ((finishedBytes + fraction * file.size) / totalBytes) * 100,
                100
              )
            );
          }
        );

        if (!ok) {
          throw new Error(
            data?.message || t("upload.fileFailed", { name: file.name })
          );
        }

        const fileResult = data?.results?.[0];
        if (fileResult?.duplicate) {
          // The server accepted and deduplicated the file: not a failure.
          statuses[i] = {
            name: file.name,
            status: "duplicate",
            progress: 100,
            error:
              fileResult.message ??
              t("upload.duplicateFile", { name: file.name }),
          };
        } else if (fileResult && fileResult.success === false) {
          // Per-file server rejection (unsupported type, too large, ...)
          statuses[i] = {
            name: file.name,
            status: "error",
            progress: 100,
            error:
              fileResult.message || t("upload.fileFailed", { name: file.name }),
          };
        } else {
          statuses[i] = { name: file.name, status: "done", progress: 100 };
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          finishCancelled();
          return;
        }
        statuses[i] = {
          name: file.name,
          status: "error",
          progress: 0,
          error: err instanceof Error ? err.message : t("errors.uploadFailed"),
        };
      }

      finishedBytes += file.size;
      setOverallProgress(Math.min((finishedBytes / totalBytes) * 100, 100));
      setFileStatuses([...statuses]);
    }

    setOverallProgress(100);
    setUploadState("done");
    abortRef.current = null;

    const errors = statuses.filter((s) => s.status === "error").length;
    const duplicates = statuses.filter((s) => s.status === "duplicate").length;
    if (errors === 0 && duplicates === 0) {
      toast.success(t("upload.uploadComplete"));
    } else if (errors === 0) {
      toast.warning(
        `Caricamento completato — ${duplicates} ${duplicates === 1 ? "duplicato saltato" : "duplicati saltati"}`
      );
    } else if (errors === statuses.length) {
      toast.error(t("upload.uploadFailed"));
    } else {
      toast.warning(
        `Caricamento completato con ${errors} ${errors === 1 ? "errore" : "errori"}`
      );
    }
  }, [files, title, date, location]);

  // Retry after a failed batch: keep only the files that errored (statuses
  // and files share the same order) and go back to the ready state so the
  // user can start the upload again.
  const handleRetryFailed = useCallback(() => {
    setFiles((prev) =>
      prev.filter((_, i) => fileStatuses[i]?.status === "error")
    );
    setFileStatuses([]);
    setOverallProgress(0);
    setUploadState("ready");
  }, [fileStatuses]);

  const handleReset = useCallback(() => {
    setFiles([]);
    setFileStatuses([]);
    setOverallProgress(0);
    setUploadState("idle");
    setCancelNote(null);
    setTitle("");
    setDateText("");
    setDate("");
    setLocation("");
  }, []);

  // Honest done-state summary: how the batch actually went.
  const doneCount = fileStatuses.filter((s) => s.status === "done").length;
  const duplicateCount = fileStatuses.filter(
    (s) => s.status === "duplicate"
  ).length;
  const errorCount = fileStatuses.filter((s) => s.status === "error").length;
  const allFailed =
    fileStatuses.length > 0 && errorCount === fileStatuses.length;
  const partialSummary = [
    `${doneCount} ${doneCount === 1 ? "caricato" : "caricati"}`,
    errorCount > 0 &&
      `${errorCount} ${errorCount === 1 ? "fallito" : "falliti"}`,
    duplicateCount > 0 &&
      `${duplicateCount} ${duplicateCount === 1 ? "duplicato" : "duplicati"}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex flex-col gap-6">
      <PageMasthead
        eyebrow="Archivio · Nuova pellicola"
        title={t("upload.title")}
        {...(files.length > 0 ? { count: files.length, countLabel: "file" } : {})}
        subtitle={t("upload.subtitle")}
      />

      {uploadState === "done" ? (
        <Card className="slide-reveal">
          <CardContent className="flex flex-col items-center justify-center gap-4 py-12 text-center">
            {allFailed ? (
              <>
                <div className="flex size-16 items-center justify-center rounded-full bg-destructive/10">
                  <XCircleIcon className="size-8 text-destructive" />
                </div>
                <div>
                  <p className="text-lg font-medium">
                    {t("upload.uploadFailed")}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {errorCount === 1
                      ? "1 file non caricato"
                      : `${errorCount} file non caricati`}{" "}
                    — nessuna diapositiva è stata messa in coda
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button onClick={handleRetryFailed}>
                    <RotateCcwIcon />
                    {t("actions.retry")}
                  </Button>
                  <Button variant="outline" onClick={handleReset}>
                    {t("actions.reset")}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="flex size-16 items-center justify-center rounded-full bg-success/10">
                  <CheckCircle2Icon className="size-8 text-success" />
                </div>
                <div>
                  <p className="text-lg font-medium">
                    {t("upload.uploadComplete")}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {errorCount > 0 || duplicateCount > 0
                      ? partialSummary
                      : t("queue.queuedForProcessing")}
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button nativeButton={false} render={<Link href="/coda" />}>
                    <InboxIcon />
                    {t("queue.goToQueue")}
                  </Button>
                  <Button variant="outline" onClick={handleReset}>
                    <UploadIcon />
                    Carica altre
                  </Button>
                </div>
              </>
            )}

            {/* Final per-file summary */}
            {fileStatuses.length > 0 && (
              <div className="mt-4 flex w-full max-w-lg flex-col gap-4">
                <div className="film-sprockets" aria-hidden />
                <UploadProgress
                  files={fileStatuses}
                  overallProgress={overallProgress}
                />
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Dropzone */}
          <div className="slide-reveal" style={{ animationDelay: "80ms" }}>
            <UploadDropzone
              onFilesSelected={handleFilesSelected}
              disabled={uploadState === "uploading"}
            />
          </div>

          {/* Post-cancel note: which files already reached the queue */}
          {cancelNote && uploadState !== "uploading" && (
            <div className="flex items-start gap-2 rounded-md border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
              <InfoIcon className="mt-0.5 size-4 shrink-0" />
              <p>{cancelNote}</p>
            </div>
          )}

          {/* File previews */}
          {files.length > 0 && uploadState !== "uploading" && (
            <FilePreviewGrid files={files} onRemove={handleRemoveFile} />
          )}

          {/* Optional metadata */}
          {files.length > 0 && uploadState !== "uploading" && (
            <Card>
              <CardHeader>
                <CardTitle>
                  Metadati ({t("labels.optional").toLowerCase()})
                </CardTitle>
                <CardDescription>
                  {t("queue.metadataDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="batch-title">{t("metadata.title")}</Label>
                    <Input
                      id="batch-title"
                      placeholder="es. Vacanze estate 1985"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>{t("labels.date")}</Label>
                    <DatePickerIt
                      value={dateText}
                      onChange={(freeText, precise) => {
                        setDateText(freeText);
                        setDate(precise ?? freeText);
                      }}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="slide-location">
                      {t("metadata.location")}
                    </Label>
                    <Input
                      id="slide-location"
                      placeholder={t("metadata.noLocation")}
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Upload progress */}
          {uploadState === "uploading" && (
            <UploadProgress
              files={fileStatuses}
              overallProgress={overallProgress}
              onCancel={handleCancel}
            />
          )}

          {/* SD card companion app */}
          {uploadState !== "uploading" && (
            <Card>
              <CardContent className="flex items-center gap-4 py-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <MonitorSmartphoneIcon className="size-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    Importa automaticamente dalla scheda SD
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Usa l&apos;app Dia-Uploader per macOS per importare le
                    diapositive direttamente dallo scanner
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  nativeButton={false}
                  render={
                    <a
                      href="https://github.com/c0de-ch/dia-storage/releases/latest"
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  }
                >
                  <DownloadIcon />
                  Scarica Dia-Uploader
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Upload button */}
          {files.length > 0 && uploadState !== "uploading" && (
            <div className="flex gap-3">
              <Button onClick={handleUpload}>
                <UploadIcon />
                {t("upload.startUpload")}
              </Button>
              <Button variant="outline" onClick={handleReset}>
                {t("actions.reset")}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
