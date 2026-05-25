"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { t } from "@/lib/i18n";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  InboxIcon,
  ImageIcon,
  SendIcon,
  PencilIcon,
  Trash2Icon,
  Loader2Icon,
  MonitorIcon,
  LaptopIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  RotateCcwIcon,
  RotateCwIcon,
  FlipHorizontalIcon,
  FlipVerticalIcon,
  CheckCheckIcon,
  XIcon,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { LocationPicker } from "@/components/location-picker";
import { ImageLightbox } from "@/components/image-lightbox";

interface BatchSlide {
  id: string;
  thumbnailUrl?: string;
  originalFilename?: string;
}

interface Batch {
  id: string;
  slides: BatchSlide[];
  count: number;
  source: "web" | "macos" | "api";
  uploadedAt: string;
  title?: string;
  dateTaken?: string;
  location?: string;
  notes?: string;
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("it-IT", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

function groupByDate(batches: Batch[]): Record<string, Batch[]> {
  const groups: Record<string, Batch[]> = {};
  for (const batch of batches) {
    const day = new Date(batch.uploadedAt).toLocaleDateString("it-IT", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    if (!groups[day]) groups[day] = [];
    groups[day].push(batch);
  }
  return groups;
}

function SourceIcon({ source }: { source: string }) {
  if (source === "macos")
    return <LaptopIcon className="size-4 text-muted-foreground" />;
  return <MonitorIcon className="size-4 text-muted-foreground" />;
}

function BatchCard({
  batch,
  onPublish,
  onDelete,
  selected,
  versions,
  onToggleSelect,
}: {
  batch: Batch;
  onPublish: (id: string, meta: BatchMeta) => void;
  onDelete: (id: string) => void;
  selected: Set<string>;
  versions: Record<string, number>;
  onToggleSelect: (id: string) => void;
}) {
  const [title, setTitle] = useState(batch.title ?? "");
  const [date, setDate] = useState(batch.dateTaken ?? "");
  const [location, setLocation] = useState(batch.location ?? "");
  const [notes, setNotes] = useState(batch.notes ?? "");
  const [publishing, setPublishing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [lightboxSlide, setLightboxSlide] = useState<BatchSlide | null>(null);

  const visibleSlides = batch.slides.slice(0, expanded ? 50 : 8);

  async function handlePublish() {
    setPublishing(true);
    try {
      await onPublish(batch.id, {
        title,
        dateTaken: date,
        location,
        notes,
      });
    } finally {
      setPublishing(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await onDelete(batch.id);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">
              Lotto {(batch.id ?? "").slice(0, 8)}
            </CardTitle>
            <SourceIcon source={batch.source} />
            <span className="text-xs text-muted-foreground">
              {batch.source === "macos" ? "macOS" : "Web"}
            </span>
          </div>
          <CardDescription>
            {formatDate(batch.uploadedAt)}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* Thumbnail grid */}
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
          {visibleSlides.map((slide) => (
            <div
              key={slide.id}
              role="button"
              tabIndex={0}
              onClick={() => setLightboxSlide(slide)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") setLightboxSlide(slide);
              }}
              className={cn(
                "group/thumb relative aspect-square cursor-zoom-in overflow-hidden rounded-md border bg-muted transition-all hover:opacity-90",
                selected.has(slide.id) && "ring-2 ring-primary"
              )}
            >
              {/* Selection checkbox */}
              <div
                className={cn(
                  "absolute top-1.5 left-1.5 z-10 transition-opacity",
                  selected.has(slide.id)
                    ? "opacity-100"
                    : "opacity-0 group-hover/thumb:opacity-100"
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="rounded bg-background/80 p-0.5 backdrop-blur-sm">
                  <Checkbox
                    checked={selected.has(slide.id)}
                    onCheckedChange={() => onToggleSelect(slide.id)}
                  />
                </div>
              </div>
              {slide.thumbnailUrl ? (
                <Image
                  src={`${slide.thumbnailUrl}?v=${versions[slide.id] ?? 0}`}
                  alt={slide.originalFilename ?? "Diapositiva"}
                  fill
                  sizes="(max-width: 640px) 25vw, (max-width: 1024px) 12vw, 8vw"
                  className="object-cover"
                  loading="lazy"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              ) : (
                <div className="flex size-full items-center justify-center">
                  <ImageIcon className="size-4 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}
          {!expanded && batch.count > 8 && (
            <button
              onClick={() => setExpanded(true)}
              className="flex aspect-square items-center justify-center rounded-md border bg-muted text-sm text-muted-foreground hover:bg-accent transition-colors"
            >
              +{batch.count - 8}
            </button>
          )}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {batch.count === 1
              ? "1 diapositiva"
              : `${batch.count} diapositive`}
          </p>
          {batch.count > 8 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronUpIcon className="size-4" /> : <ChevronDownIcon className="size-4" />}
              {expanded ? "Mostra meno" : "Mostra tutte"}
            </Button>
          )}
        </div>

        <Separator />

        {/* Metadata form — applies to entire batch */}
        <p className="text-xs font-medium text-muted-foreground">
          Imposta titolo e dettagli per tutto il lotto:
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`title-${batch.id}`}>
              {t("metadata.title")}
            </Label>
            <Input
              id={`title-${batch.id}`}
              placeholder="es. Vacanze estate 1985"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`date-${batch.id}`}>{t("labels.date")}</Label>
            <Input
              id={`date-${batch.id}`}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`loc-${batch.id}`}>
              {t("metadata.location")}
            </Label>
            <LocationPicker
              id={`loc-${batch.id}`}
              value={location}
              onChange={setLocation}
              placeholder="Cerca un luogo..."
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`notes-${batch.id}`}>
              {t("metadata.notes")}
            </Label>
            <Textarea
              id={`notes-${batch.id}`}
              placeholder={t("metadata.noNotes")}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[38px]"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={handlePublish} disabled={publishing}>
            {publishing ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              <SendIcon />
            )}
            {t("queue.publishToGallery")}
          </Button>
          <Button variant="outline" nativeButton={false} render={<a href={`/coda/${batch.id}`} />}>
            <PencilIcon />
            {t("queue.editIndividual")}
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              <Trash2Icon />
            )}
            {t("actions.delete")}
          </Button>
        </div>
      </CardContent>
      <ImageLightbox
        open={lightboxSlide !== null}
        onOpenChange={(o) => {
          if (!o) setLightboxSlide(null);
        }}
        src={
          lightboxSlide
            ? `/api/v1/slides/${lightboxSlide.id}/medium?v=${versions[lightboxSlide.id] ?? 0}`
            : ""
        }
        alt={lightboxSlide?.originalFilename}
        downloadUrl={
          lightboxSlide
            ? `/api/v1/slides/${lightboxSlide.id}/original`
            : undefined
        }
      />
    </Card>
  );
}

interface BatchMeta {
  title: string;
  dateTaken: string;
  location: string;
  notes: string;
}

export default function CodaPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishingAll, setPublishingAll] = useState(false);
  // Selection spans every batch, so one central bar can transform across them.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [versions, setVersions] = useState<Record<string, number>>({});
  const [transforming, setTransforming] = useState(false);

  const fetchBatches = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/slides/incoming", {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        const raw = data.batches ?? data.items ?? [];
        // Map API response to Batch interface
        const mapped: Batch[] = raw.map((b: Record<string, unknown>) => {
          const slidesRaw = Array.isArray(b.slides)
            ? (b.slides as Record<string, unknown>[])
            : [];
          const first = slidesRaw[0];
          return {
            id: (b.batchId ?? b.id ?? String(Math.random())) as string,
            slides: slidesRaw.map((s) => ({
              id: String(s.id ?? ""),
              thumbnailUrl: s.id
                ? `/api/v1/slides/${s.id}/thumbnail`
                : undefined,
              originalFilename: s.originalFilename as string | undefined,
            })),
            count: (b.count ?? 0) as number,
            source: (b.source ?? "web") as Batch["source"],
            uploadedAt: (b.createdAt ?? b.uploadedAt ?? new Date().toISOString()) as string,
            // Pre-fill the batch form with the metadata captured at upload.
            title: (first?.title as string | undefined) ?? "",
            dateTaken:
              (first?.dateTakenPrecise as string | undefined) ??
              (first?.dateTaken as string | undefined) ??
              "",
            location: (first?.location as string | undefined) ?? "",
          };
        });
        setBatches(mapped);
      }
    } catch {
      toast.error(t("errors.generic"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  const handlePublish = useCallback(
    async (batchId: string, meta: BatchMeta) => {
      try {
        const res = await fetch("/api/v1/slides/batch/archive", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            batchId,
            metadata: meta,
            collectionName: meta.title || undefined,
          }),
          credentials: "include",
        });
        if (!res.ok) throw new Error();
        toast.success(t("success.slidesPublished"));
        setBatches((prev) => prev.filter((b) => b.id !== batchId));
        setSelected(new Set());
      } catch {
        toast.error("Errore durante la pubblicazione del lotto");
      }
    },
    []
  );

  const handleDelete = useCallback(async (batchId: string) => {
    try {
      const res = await fetch("/api/v1/slides/batch/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId }),
        credentials: "include",
      });
      if (!res.ok) throw new Error();
      toast.success(t("success.deleted"));
      setBatches((prev) => prev.filter((b) => b.id !== batchId));
      setSelected(new Set());
    } catch {
      toast.error(t("errors.deleteFailed"));
    }
  }, []);

  const totalSlides = useMemo(
    () => batches.reduce((sum, b) => sum + b.count, 0),
    [batches]
  );

  const handlePublishAll = useCallback(async () => {
    if (batches.length === 0) return;
    if (
      !window.confirm(
        `Pubblicare nella galleria tutte le ${totalSlides} diapositive in coda (${batches.length} lotti)?`
      )
    )
      return;
    setPublishingAll(true);
    const targets = [...batches];
    let published = 0;
    for (const b of targets) {
      try {
        // No metadata payload: publish-all moves everything to the gallery
        // as-is and preserves any per-slide metadata set in "Modifica singola".
        const res = await fetch("/api/v1/slides/batch/archive", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ batchId: b.id }),
          credentials: "include",
        });
        if (res.ok) {
          published += 1;
          setBatches((prev) => prev.filter((x) => x.id !== b.id));
        }
      } catch {
        // keep going; report at the end
      }
    }
    setPublishingAll(false);
    setSelected(new Set());
    if (published === targets.length) {
      toast.success(t("success.slidesPublished"));
    } else {
      toast.error(
        `Pubblicati ${published}/${targets.length} lotti. Riprova per i restanti.`
      );
    }
  }, [batches, totalSlides]);

  const allIds = useMemo(
    () => batches.flatMap((b) => b.slides.map((s) => s.id)),
    [batches]
  );

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelected((prev) =>
      prev.size === allIds.length && allIds.length > 0
        ? new Set()
        : new Set(allIds)
    );
  }, [allIds]);

  // Apply a rotate/flip to every selected photo across all batches.
  const applyToSelected = useCallback(
    async (op: string) => {
      if (selected.size === 0) return;
      setTransforming(true);
      let ok = 0;
      for (const id of [...selected]) {
        try {
          const res = await fetch(`/api/v1/slides/${id}/transform`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ op }),
            credentials: "include",
          });
          if (res.ok) {
            ok += 1;
            setVersions((v) => ({ ...v, [id]: (v[id] ?? 0) + 1 }));
          }
        } catch {
          // keep going
        }
      }
      setTransforming(false);
      if (ok > 0) toast.success(`${ok} immagini aggiornate`);
      else toast.error("Errore durante la trasformazione");
    },
    [selected]
  );

  const grouped = useMemo(() => groupByDate(batches), [batches]);

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-72" />
        </div>
        <div className="flex flex-col gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-6", selected.size > 0 && "pb-24")}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("queue.incomingTitle")}</h1>
          <p className="text-muted-foreground">
            {t("queue.subtitle")}
          </p>
        </div>
        {batches.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={selectAll}>
              <CheckCheckIcon />
              {selected.size === allIds.length && allIds.length > 0
                ? "Deseleziona tutte"
                : "Seleziona tutte"}
            </Button>
            <Button onClick={handlePublishAll} disabled={publishingAll}>
              {publishingAll ? (
                <Loader2Icon className="animate-spin" />
              ) : (
                <SendIcon />
              )}
              Pubblica tutto
            </Button>
          </div>
        )}
      </div>

      {batches.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <InboxIcon className="mb-4 size-12 text-muted-foreground" />
            <p className="text-lg font-medium">{t("empty.queue")}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("empty.queueDescription")}
            </p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped).map(([date, dateBatches]) => (
          <div key={date} className="flex flex-col gap-4">
            <h2 className="text-sm font-medium text-muted-foreground">
              {date}
            </h2>
            {dateBatches.map((batch) => (
              <BatchCard
                key={batch.id}
                batch={batch}
                onPublish={handlePublish}
                onDelete={handleDelete}
                selected={selected}
                versions={versions}
                onToggleSelect={toggleSelect}
              />
            ))}
          </div>
        ))
      )}

      {/* Central action bar — applies to the selection across all batches */}
      {selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-between gap-3 border-t bg-background/95 px-4 py-3 shadow-lg backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setSelected(new Set())}
              title="Deseleziona"
            >
              <XIcon className="size-4" />
            </Button>
            <span className="text-sm font-medium">
              {selected.size} selezionate
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={transforming} onClick={() => applyToSelected("rotate-ccw")} title="Ruota a sinistra">
              <RotateCcwIcon className="size-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={transforming} onClick={() => applyToSelected("rotate-cw")} title="Ruota a destra">
              <RotateCwIcon className="size-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={transforming} onClick={() => applyToSelected("flip-h")} title="Capovolgi orizzontale">
              <FlipHorizontalIcon className="size-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={transforming} onClick={() => applyToSelected("flip-v")} title="Capovolgi verticale">
              <FlipVerticalIcon className="size-4" />
            </Button>
            {transforming && <Loader2Icon className="size-4 animate-spin" />}
          </div>
        </div>
      )}
    </div>
  );
}
