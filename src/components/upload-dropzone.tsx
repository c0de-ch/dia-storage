"use client";

import React, { useCallback, useRef, useState } from "react";
import { t } from "@/lib/i18n";
import { toast } from "sonner";
import { UploadIcon, ImageIcon, FilmIcon, FileIcon } from "lucide-react";
import { cn } from "@/lib/utils";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

interface UploadDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}

export function UploadDropzone({
  onFilesSelected,
  disabled = false,
}: UploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList) return;
      const allowedExts = [
        ".jpg", ".jpeg", ".png", ".tiff", ".tif", ".webp",
        ".gif", ".heic", ".heif", ".bmp", ".avif",
        ".mp4", ".mov", ".m4v", ".avi", ".mkv", ".webm",
      ];
      const all = Array.from(fileList);
      const mediaFiles = all.filter((f) => {
        const name = f.name.toLowerCase();
        return allowedExts.some((ext) => name.endsWith(ext));
      });
      const rejected = all.filter((f) => !mediaFiles.includes(f));
      if (rejected.length === 1 && rejected[0]) {
        toast.warning(t("upload.invalidFormat", { name: rejected[0].name }));
      } else if (rejected.length > 1) {
        toast.warning(
          `${rejected.length} file ignorati: formato non supportato`
        );
      }
      if (mediaFiles.length > 0) {
        onFilesSelected(mediaFiles);
      }
    },
    [onFilesSelected]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) setIsDragging(true);
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Ignore leave events fired when the pointer moves onto a child element,
    // otherwise the highlight flickers for the whole duration of the drag.
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (!disabled) handleFiles(e.dataTransfer.files);
    },
    [disabled, handleFiles]
  );

  const handleClick = useCallback(() => {
    if (!disabled) inputRef.current?.click();
  }, [disabled]);

  return (
    // An empty 35mm mount awaiting film: card shell, sprocket strips top and
    // bottom, dashed mount window in the middle. The whole zone is a single
    // focusable button (no nested interactive controls).
    <div
      data-slot="card"
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-label={t("upload.dropzone")}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      className={cn(
        "flex cursor-pointer flex-col gap-2 rounded-sm border bg-card p-2 shadow-sm transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isDragging && "-translate-y-1 shadow-lg ring-2 ring-primary",
        disabled && "pointer-events-none opacity-50"
      )}
    >
      <div className="film-sprockets" aria-hidden />

      {/* Mount window */}
      <div
        className={cn(
          "relative flex flex-col items-center justify-center gap-4 rounded-[3px] border-2 border-dashed px-6 py-12 text-center transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 bg-muted/30 hover:border-primary/50 hover:bg-muted/50"
        )}
      >
        <div className="flex size-16 items-center justify-center rounded-full bg-muted">
          {isDragging ? (
            <ImageIcon className="size-8 text-primary" />
          ) : (
            <UploadIcon className="size-8 text-muted-foreground" />
          )}
        </div>
        <div>
          <p className="text-base font-medium">
            {isDragging ? t("upload.dropzoneActive") : t("upload.dropzone")}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("upload.allowedFormats", {
              formats: "JPEG, PNG, GIF, HEIC, TIFF, WebP, MP4, MOV",
            })}
          </p>
        </div>
        {/* Styled as a button but inert: the surrounding dropzone is the single
            real control, so we avoid button-inside-button semantics. */}
        <span className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-sm font-medium shadow-xs">
          <UploadIcon className="size-4" />
          {t("upload.selectFiles")}
        </span>
        {/* Mount-window inner shadow */}
        <div
          className="pointer-events-none absolute inset-0 rounded-[3px] shadow-[inset_0_0_10px_rgba(0,0,0,0.25)]"
          aria-hidden
        />
      </div>

      {/* Mount stampings */}
      <p className="text-center font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
        35mm · JPEG · TIFF · HEIC · MP4
      </p>

      <div className="film-sprockets" aria-hidden />

      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*,.heic,.heif,.avif"
        multiple
        className="hidden"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => {
          handleFiles(e.target.files);
          if (inputRef.current) inputRef.current.value = "";
        }}
        disabled={disabled}
      />
    </div>
  );
}

interface FilePreviewGridProps {
  files: File[];
  onRemove?: (index: number) => void;
}

export function FilePreviewGrid({ files, onRemove }: FilePreviewGridProps) {
  if (files.length === 0) return null;

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between font-mono text-xs uppercase tracking-wide text-muted-foreground">
        <span>{t("upload.filesSelected", { count: files.length })}</span>
        <span>{t("upload.totalSize", { size: formatBytes(totalSize) })}</span>
      </div>
      <div className="film-sprockets" aria-hidden />
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
        {files.map((file, i) => (
          <FileThumb
            key={`${file.name}-${i}`}
            file={file}
            index={i}
            onRemove={onRemove}
          />
        ))}
      </div>
    </div>
  );
}

function FileThumb({
  file,
  index,
  onRemove,
}: {
  file: File;
  index: number;
  onRemove: ((i: number) => void) | undefined;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const isVideo = ["mp4", "mov", "m4v", "avi", "mkv", "webm"].includes(ext);
  // Browsers can't display HEIC/HEIF/TIFF natively (except Safari for HEIC)
  const needsPlaceholder =
    ["heic", "heif", "tiff", "tif", "bmp"].includes(ext) || isVideo;

  React.useEffect(() => {
    if (needsPlaceholder) return;
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file, needsPlaceholder]);

  return (
    // Mini slide mount, staggered onto the light table like the galleria grid
    <div
      data-slot="card"
      className="group relative slide-reveal rounded-sm border bg-card p-1.5 shadow-sm"
      style={{ animationDelay: `${Math.min(index, 20) * 30}ms` }}
    >
      <div className="relative aspect-square overflow-hidden rounded-[3px] bg-muted">
        {needsPlaceholder ? (
          <div className="flex size-full flex-col items-center justify-center gap-1">
            {isVideo ? (
              <FilmIcon className="size-6 text-muted-foreground" />
            ) : (
              <FileIcon className="size-6 text-muted-foreground" />
            )}
            <span className="text-[9px] font-medium uppercase text-muted-foreground">
              {ext}
            </span>
          </div>
        ) : src ? (
          /* eslint-disable-next-line @next/next/no-img-element -- blob URL preview of a to-be-uploaded file */
          <img src={src} alt={file.name} className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center">
            <ImageIcon className="size-4 text-muted-foreground" />
          </div>
        )}
        {/* Inner shadow of the mount window */}
        <div
          className="pointer-events-none absolute inset-0 rounded-[3px] shadow-[inset_0_0_10px_rgba(0,0,0,0.45)]"
          aria-hidden
        />
        {onRemove && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(index);
            }}
            className="absolute top-1 right-1 z-10 flex size-5 items-center justify-center rounded-full bg-background/80 text-xs text-foreground opacity-0 shadow-sm backdrop-blur-sm transition-opacity group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-sm:opacity-100"
            aria-label={`${t("actions.remove")} ${file.name}`}
          >
            &times;
          </button>
        )}
      </div>
      {/* Stamped caption */}
      <p className="truncate pt-1 font-mono text-[9px] uppercase tracking-wide text-muted-foreground">
        {file.name}
      </p>
    </div>
  );
}
