"use client";

import React, { useCallback, useRef, useState } from "react";
import Link from "next/link";
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
  Loader2Icon,
  MonitorSmartphoneIcon,
  UploadIcon,
} from "lucide-react";

type UploadState = "idle" | "ready" | "uploading" | "done";

export default function CaricamentoPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [fileStatuses, setFileStatuses] = useState<FileUploadStatus[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);
  const cancelledRef = useRef(false);

  // Optional metadata
  const [magazineName, setMagazineName] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");

  const handleFilesSelected = useCallback(
    (newFiles: File[]) => {
      setFiles((prev) => [...prev, ...newFiles]);
      setUploadState("ready");
    },
    []
  );

  const handleRemoveFile = useCallback((index: number) => {
    setFiles((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length === 0) return [];
      return next;
    });
  }, []);

  const handleCancel = useCallback(() => {
    cancelledRef.current = true;
  }, []);

  const handleUpload = useCallback(async () => {
    if (files.length === 0) return;

    cancelledRef.current = false;
    setUploadState("uploading");

    const statuses: FileUploadStatus[] = files.map((f) => ({
      name: f.name,
      progress: 0,
      status: "pending" as const,
    }));
    setFileStatuses([...statuses]);
    setOverallProgress(0);

    let completed = 0;

    for (let i = 0; i < files.length; i++) {
      if (cancelledRef.current) {
        toast("Caricamento annullato");
        setUploadState("ready");
        return;
      }

      statuses[i] = { ...statuses[i], status: "uploading", progress: 0 };
      setFileStatuses([...statuses]);

      try {
        const formData = new FormData();
        formData.append("file", files[i]);
        if (magazineName) formData.append("magazineName", magazineName);
        if (date) formData.append("date", date);
        if (location) formData.append("location", location);

        const res = await fetch("/api/v1/slides/upload", {
          method: "POST",
          body: formData,
          credentials: "include",
        });

        if (!res.ok) {
          throw new Error(
            t("upload.fileFailed", { name: files[i].name })
          );
        }

        const data = await res.json();
        // Check for duplicate warning in response
        const fileResult = data.results?.[0];
        if (fileResult && fileResult.duplicate) {
          statuses[i] = {
            ...statuses[i],
            status: "error",
            progress: 100,
            error: fileResult.message,
          };
          toast.warning(`${files[i].name}: ${fileResult.message}`);
        } else {
          statuses[i] = { ...statuses[i], status: "done", progress: 100 };
        }
      } catch (err) {
        statuses[i] = {
          ...statuses[i],
          status: "error",
          progress: 0,
          error:
            err instanceof Error ? err.message : t("errors.uploadFailed"),
        };
      }

      completed++;
      const progress = (completed / files.length) * 100;
      setOverallProgress(progress);
      setFileStatuses([...statuses]);
    }

    setUploadState("done");

    const errors = statuses.filter((s) => s.status === "error").length;
    if (errors === 0) {
      toast.success(t("upload.uploadComplete"));
    } else {
      toast.warning(
        `Caricamento completato con ${errors} errori`
      );
    }
  }, [files, magazineName, date, location]);

  const handleReset = useCallback(() => {
    setFiles([]);
    setFileStatuses([]);
    setOverallProgress(0);
    setUploadState("idle");
    setMagazineName("");
    setDate("");
    setLocation("");
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("upload.title")}
        </h1>
        <p className="text-muted-foreground">{t("upload.subtitle")}</p>
      </div>

      {uploadState === "done" ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-4 py-12 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
              <CheckCircle2Icon className="size-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-lg font-medium">
                {t("upload.uploadComplete")}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Le diapositive sono state aggiunte alla coda di elaborazione.
              </p>
            </div>
            <div className="flex gap-3">
              <Button nativeButton={false} render={<Link href="/coda" />}>
                <InboxIcon />
                Vai alla coda
              </Button>
              <Button variant="outline" onClick={handleReset}>
                <UploadIcon />
                Carica altre
              </Button>
            </div>

            {/* Show final progress summary */}
            {fileStatuses.length > 0 && (
              <div className="mt-4 w-full max-w-lg">
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
          <UploadDropzone
            onFilesSelected={handleFilesSelected}
            disabled={uploadState === "uploading"}
          />

          {/* File previews */}
          {files.length > 0 && uploadState !== "uploading" && (
            <FilePreviewGrid
              files={files}
              onRemove={handleRemoveFile}
            />
          )}

          {/* Optional metadata */}
          {files.length > 0 && uploadState !== "uploading" && (
            <Card>
              <CardHeader>
                <CardTitle>Metadati {t("labels.optional").toLowerCase()}</CardTitle>
                <CardDescription>
                  Informazioni aggiuntive da associare alle diapositive caricate
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="magazine-name">
                      {t("metadata.magazine")}
                    </Label>
                    <Input
                      id="magazine-name"
                      placeholder={t("magazines.magazineNamePlaceholder")}
                      value={magazineName}
                      onChange={(e) => setMagazineName(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="slide-date">{t("labels.date")}</Label>
                    <Input
                      id="slide-date"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
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
                    Usa l&apos;app Dia-Uploader per macOS per importare le diapositive direttamente dallo scanner
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
