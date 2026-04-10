"use client";

import React, { useCallback, useRef, useState } from "react";
import { t } from "@/lib/i18n";
import { UploadIcon, ImageIcon, FilmIcon, FileIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

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
      const mediaFiles = Array.from(fileList).filter((f) => {
        const name = f.name.toLowerCase();
        return allowedExts.some((ext) => name.endsWith(ext));
      });
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

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFiles(e.target.files);
      if (inputRef.current) inputRef.current.value = "";
    },
    [handleFiles]
  );

  return (
    <div
      role="button"
      tabIndex={0}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") handleClick();
      }}
      className={`flex cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-12 text-center transition-colors ${
        isDragging
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
      } ${disabled ? "pointer-events-none opacity-50" : ""}`}
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
          {isDragging
            ? t("upload.dropzoneActive")
            : t("upload.dropzone")}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("upload.allowedFormats", { formats: "JPEG, PNG, GIF, HEIC, TIFF, WebP, MP4, MOV" })}
        </p>
      </div>
      <Button variant="outline" size="sm" disabled={disabled} type="button">
        <UploadIcon />
        {t("upload.selectFiles")}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*,.heic,.heif,.avif"
        multiple
        className="hidden"
        onChange={handleInputChange}
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
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{t("upload.filesSelected", { count: files.length })}</span>
        <span>{t("upload.totalSize", { size: formatBytes(totalSize) })}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
        {files.map((file, i) => (
          <FileThumb key={`${file.name}-${i}`} file={file} index={i} onRemove={onRemove} />
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
  onRemove?: (i: number) => void;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const isVideo = ["mp4", "mov", "m4v", "avi", "mkv", "webm"].includes(ext);
  // Browsers can't display HEIC/HEIF/AVIF natively (except Safari for HEIC)
  const needsPlaceholder = ["heic", "heif", "tiff", "tif", "bmp"].includes(ext) || isVideo;

  React.useEffect(() => {
    if (needsPlaceholder) return;
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file, needsPlaceholder]);

  return (
    <div className="group relative aspect-square overflow-hidden rounded-md border bg-muted">
      {needsPlaceholder ? (
        <div className="flex size-full flex-col items-center justify-center gap-1">
          {isVideo ? (
            <FilmIcon className="size-6 text-muted-foreground" />
          ) : (
            <FileIcon className="size-6 text-muted-foreground" />
          )}
          <span className="text-[9px] font-medium uppercase text-muted-foreground">{ext}</span>
        </div>
      ) : src ? (
        <img
          src={src}
          alt={file.name}
          className="size-full object-cover"
        />
      ) : (
        <div className="flex size-full items-center justify-center">
          <ImageIcon className="size-4 text-muted-foreground" />
        </div>
      )}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(index);
          }}
          className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-black/60 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
          aria-label={t("actions.remove")}
        >
          &times;
        </button>
      )}
      <div className="absolute inset-x-0 bottom-0 bg-black/50 px-1 py-0.5">
        <p className="truncate text-[10px] text-white">{file.name}</p>
      </div>
    </div>
  );
}
