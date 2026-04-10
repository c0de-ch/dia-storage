"use client";

import { useState } from "react";
import {
  CameraIcon,
  ChevronDownIcon,
  CopyIcon,
  CheckIcon,
  InfoIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";

interface ExifPanelProps {
  exifData: Record<string, unknown> | null;
  fileSize: number | null;
  width: number | null;
  height: number | null;
  originalFilename: string | null;
  checksum: string | null;
  scanDate: string | null;
  createdAt: string;
}

/** Well-known EXIF keys grouped by category */
const CATEGORIES: { label: string; keys: string[] }[] = [
  {
    label: "Fotocamera / Scanner",
    keys: ["Make", "Model", "Software", "LensModel", "LensInfo"],
  },
  {
    label: "Immagine",
    keys: [
      "ImageWidth",
      "ImageHeight",
      "ExifImageWidth",
      "ExifImageHeight",
      "Orientation",
      "XResolution",
      "YResolution",
      "ResolutionUnit",
      "BitsPerSample",
      "ColorSpace",
      "ComponentsConfiguration",
    ],
  },
  {
    label: "Esposizione",
    keys: [
      "ExposureTime",
      "FNumber",
      "ISO",
      "ISOSpeedRatings",
      "ShutterSpeedValue",
      "ApertureValue",
      "BrightnessValue",
      "ExposureBiasValue",
      "MaxApertureValue",
      "ExposureProgram",
      "MeteringMode",
      "Flash",
      "FocalLength",
      "FocalLengthIn35mmFormat",
      "WhiteBalance",
      "SceneCaptureType",
    ],
  },
  {
    label: "Date",
    keys: [
      "DateTimeOriginal",
      "CreateDate",
      "ModifyDate",
      "DateTime",
      "DateTimeDigitized",
      "OffsetTime",
      "OffsetTimeOriginal",
    ],
  },
  {
    label: "Compressione",
    keys: [
      "Compression",
      "Quality",
      "JFIFVersion",
      "YCbCrSubSampling",
      "YCbCrPositioning",
    ],
  },
];

/** Keys already shown in categories — used to find "other" keys */
const KNOWN_KEYS = new Set(CATEGORIES.flatMap((c) => c.keys));

/** Keys to hide (internal/binary data not useful to display) */
const HIDDEN_KEYS = new Set([
  "MakerNote",
  "UserComment",
  "undefined",
  "ApplicationNotes",
  "PrintImageMatching",
  "InteropIndex",
  "thumbnail",
]);

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (value instanceof Date) return value.toLocaleString("it-IT");
  if (typeof value === "string") {
    // Check if ISO date string
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
      return new Date(value).toLocaleString("it-IT");
    }
    return value;
  }
  if (typeof value === "number") {
    // Format fractions nicely (e.g. exposure time 1/125)
    if (value > 0 && value < 1) {
      const denom = Math.round(1 / value);
      return `1/${denom}`;
    }
    return value.toLocaleString("it-IT");
  }
  if (typeof value === "boolean") return value ? "Si" : "No";
  if (Array.isArray(value)) return value.map(formatValue).join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ExifRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-1 text-xs">
      <span className="shrink-0 font-medium text-muted-foreground">
        {label}
      </span>
      <span className="truncate text-right" title={value}>
        {value}
      </span>
    </div>
  );
}

export function ExifPanel({
  exifData,
  fileSize,
  width,
  height,
  originalFilename,
  checksum,
  scanDate,
  createdAt,
}: ExifPanelProps) {
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [copied, setCopied] = useState(false);

  const raw = exifData ?? {};

  // Build categorized entries
  const categorized = CATEGORIES.map((cat) => ({
    label: cat.label,
    entries: cat.keys
      .filter((k) => raw[k] !== undefined && raw[k] !== null)
      .map((k) => ({ key: k, value: formatValue(raw[k]) })),
  })).filter((cat) => cat.entries.length > 0);

  // "Other" keys not in any category
  const otherEntries = Object.entries(raw)
    .filter(
      ([k, v]) =>
        !KNOWN_KEYS.has(k) &&
        !HIDDEN_KEYS.has(k) &&
        v !== undefined &&
        v !== null &&
        typeof v !== "object"
    )
    .map(([k, v]) => ({ key: k, value: formatValue(v) }));

  const exifCount = Object.keys(raw).filter(
    (k) => !HIDDEN_KEYS.has(k) && raw[k] !== undefined && raw[k] !== null
  ).length;

  function handleCopy() {
    const lines: string[] = [];
    if (originalFilename) lines.push(`File: ${originalFilename}`);
    if (width && height) lines.push(`Dimensioni: ${width} x ${height} px`);
    if (fileSize) lines.push(`Peso: ${formatFileSize(fileSize)}`);
    if (checksum) lines.push(`Checksum: ${checksum}`);
    lines.push("");
    for (const cat of categorized) {
      lines.push(`--- ${cat.label} ---`);
      for (const e of cat.entries) {
        lines.push(`${e.key}: ${e.value}`);
      }
      lines.push("");
    }
    if (otherEntries.length > 0) {
      lines.push("--- Altro ---");
      for (const e of otherEntries) {
        lines.push(`${e.key}: ${e.value}`);
      }
    }
    navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm font-medium hover:bg-accent transition-colors">
        <div className="flex items-center gap-2">
          <CameraIcon className="size-4 text-muted-foreground" />
          Informazioni file e EXIF
          {exifCount > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {exifCount}
            </Badge>
          )}
        </div>
        <ChevronDownIcon
          className={`size-4 text-muted-foreground transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 rounded-lg border px-3 py-2 space-y-3">
          {/* File info (always shown) */}
          <div>
            <h4 className="mb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              File
            </h4>
            {originalFilename && (
              <ExifRow label="Nome" value={originalFilename} />
            )}
            {width && height && (
              <ExifRow label="Dimensioni" value={`${width} x ${height} px`} />
            )}
            {fileSize && (
              <ExifRow label="Peso" value={formatFileSize(fileSize)} />
            )}
            {checksum && (
              <ExifRow label="SHA-256" value={checksum} />
            )}
            {scanDate && (
              <ExifRow
                label="Data scansione"
                value={new Date(scanDate).toLocaleString("it-IT")}
              />
            )}
            <ExifRow
              label="Caricato il"
              value={new Date(createdAt).toLocaleString("it-IT")}
            />
          </div>

          {/* EXIF categories */}
          {categorized.length > 0 ? (
            <>
              {categorized.map((cat) => (
                <div key={cat.label}>
                  <h4 className="mb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {cat.label}
                  </h4>
                  {cat.entries.map((e) => (
                    <ExifRow key={e.key} label={e.key} value={e.value} />
                  ))}
                </div>
              ))}

              {/* Other/uncategorized keys */}
              {otherEntries.length > 0 && (
                <div>
                  <button
                    type="button"
                    className="mb-1 flex items-center gap-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                    onClick={() => setShowAll(!showAll)}
                  >
                    <InfoIcon className="size-3" />
                    Altro ({otherEntries.length})
                    <ChevronDownIcon
                      className={`size-3 transition-transform ${showAll ? "rotate-180" : ""}`}
                    />
                  </button>
                  {showAll &&
                    otherEntries.map((e) => (
                      <ExifRow key={e.key} label={e.key} value={e.value} />
                    ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              Nessun dato EXIF disponibile per questa immagine.
            </p>
          )}

          {/* Copy button */}
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-7 text-xs"
            onClick={handleCopy}
          >
            {copied ? (
              <CheckIcon className="size-3 mr-1.5 text-green-600" />
            ) : (
              <CopyIcon className="size-3 mr-1.5" />
            )}
            {copied ? "Copiato" : "Copia informazioni"}
          </Button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
