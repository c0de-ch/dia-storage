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
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  InboxIcon,
  ImageIcon,
  SendIcon,
  PencilIcon,
  Trash2Icon,
  Loader2Icon,
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
import { HelpPopover } from "@/components/help-popover";
import { PageMasthead } from "@/components/page-masthead";
import { EmptyMount, ErrorState } from "@/components/state-views";

interface BatchSlide {
  id: string;
  thumbnailUrl?: string | undefined;
  originalFilename?: string | undefined;
}

interface Batch {
  id: string;
  slides: BatchSlide[];
  count: number;
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

/** A queue photo as a mini 35mm mount: card frame, inset window, inner shadow. */
function BatchThumb({
  slide,
  version,
  isSelected,
  onToggleSelect,
  onOpen,
}: {
  slide: BatchSlide;
  version: number;
  isSelected: boolean;
  onToggleSelect: () => void;
  onOpen: () => void;
}) {
  // Track which src failed: a successful rotate/flip bumps the version and
  // produces a new src, automatically giving the image another chance.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const src = slide.thumbnailUrl ? `${slide.thumbnailUrl}?v=${version}` : undefined;
  const failed = src !== undefined && failedSrc === src;
  const label = slide.originalFilename ?? "Apri anteprima";

  return (
    <div
      data-slot="card"
      role="button"
      tabIndex={0}
      aria-label={label}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className={cn(
        "group/thumb relative cursor-pointer rounded-sm border bg-card p-1 shadow-sm",
        "transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isSelected && "-translate-y-0.5 ring-2 ring-primary"
      )}
    >
      {/* Selection checkbox — hover/focus on desktop, always reachable on touch */}
      <div
        className={cn(
          "absolute top-2 left-2 z-10 transition-opacity",
          isSelected
            ? "opacity-100"
            : "pointer-events-none opacity-0 group-hover/thumb:pointer-events-auto group-hover/thumb:opacity-100 group-focus-within/thumb:pointer-events-auto group-focus-within/thumb:opacity-100 [@media(pointer:coarse)]:pointer-events-auto [@media(pointer:coarse)]:opacity-100"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rounded bg-background/80 p-0.5 backdrop-blur-sm">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onToggleSelect}
            aria-label={`Seleziona ${label}`}
          />
        </div>
      </div>
      <div className="relative aspect-[3/2] overflow-hidden rounded-[3px] bg-muted">
        {src && !failed ? (
          <Image
            src={src}
            alt={label}
            fill
            sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, (max-width: 1024px) 17vw, 12vw"
            className="object-cover"
            loading="lazy"
            onError={() => setFailedSrc(src)}
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <ImageIcon className="size-4 text-muted-foreground" aria-hidden />
          </div>
        )}
        {/* Inner shadow of the mount window */}
        <div
          className="pointer-events-none absolute inset-0 rounded-[3px] shadow-[inset_0_0_10px_rgba(0,0,0,0.45)]"
          aria-hidden
        />
      </div>
    </div>
  );
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

  // "Mostra tutte" means all of them — no hidden cap.
  const visibleSlides = expanded ? batch.slides : batch.slides.slice(0, 8);
  const hiddenCount = batch.slides.length - 8;

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
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div className="flex flex-col gap-1">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-lg font-bold leading-none tabular-nums text-primary">
                {String(batch.count).padStart(3, "0")}
              </span>
              <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                {batch.count === 1 ? "diapositiva" : "diapositive"}
              </span>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
              Lotto {(batch.id ?? "").slice(0, 8)}
            </span>
          </div>
          <div className="flex flex-col items-end gap-1">
            <CardDescription className="font-mono text-xs">
              {formatDate(batch.uploadedAt)}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* Thumbnail grid — mini mounts on the light table */}
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
          {visibleSlides.map((slide) => (
            <BatchThumb
              key={slide.id}
              slide={slide}
              version={versions[slide.id] ?? 0}
              isSelected={selected.has(slide.id)}
              onToggleSelect={() => onToggleSelect(slide.id)}
              onOpen={() => setLightboxSlide(slide)}
            />
          ))}
          {!expanded && hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              aria-label={`Mostra tutte le ${batch.count} diapositive`}
              className="rounded-sm border border-dashed bg-card p-1 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex aspect-[3/2] w-full items-center justify-center rounded-[3px] bg-muted font-mono text-sm text-muted-foreground">
                +{hiddenCount}
              </span>
            </button>
          )}
        </div>

        {batch.slides.length > 8 && (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <ChevronUpIcon className="size-4" />
              ) : (
                <ChevronDownIcon className="size-4" />
              )}
              {expanded ? t("actions.showLess") : "Mostra tutte"}
            </Button>
          </div>
        )}

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
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button variant="destructive" disabled={deleting}>
                  {deleting ? (
                    <Loader2Icon className="animate-spin" />
                  ) : (
                    <Trash2Icon />
                  )}
                  {t("actions.delete")}
                </Button>
              }
            />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("confirm.deleteTitle")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {batch.count === 1
                    ? t("confirm.deleteSlidesSingular")
                    : t("confirm.deleteSlidesPlural", { count: batch.count })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("actions.cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {t("actions.delete")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
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

function BatchCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="flex flex-col items-end gap-2">
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              data-slot="card"
              className="rounded-sm border bg-card p-1 shadow-sm"
            >
              <Skeleton className="aspect-[3/2] w-full rounded-[3px]" />
            </div>
          ))}
        </div>
        <Separator />
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      </CardContent>
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
  const [error, setError] = useState(false);
  const [publishingAll, setPublishingAll] = useState(false);
  // Selection spans every batch, so one central bar can transform across them.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [versions, setVersions] = useState<Record<string, number>>({});
  const [transforming, setTransforming] = useState(false);

  const fetchBatches = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      // Page through the whole queue so large queues don't hide batches:
      // the API caps each response at 200 slides and groups per page.
      const raw: Record<string, unknown>[] = [];
      let page = 1;
      for (;;) {
        const res = await fetch(
          `/api/v1/slides/incoming?limit=200&page=${page}`,
          { credentials: "include" }
        );
        if (!res.ok) throw new Error();
        const data = await res.json();
        raw.push(...(data.batches ?? data.items ?? []));
        const totalPages = Number(data.pagination?.totalPages ?? 1);
        if (page >= totalPages || page >= 25) break;
        page += 1;
      }

      // Map API response to Batch, merging groups split across pages.
      const byId = new Map<string, Batch>();
      const mapped: Batch[] = [];
      raw.forEach((b, index) => {
        const slidesRaw = Array.isArray(b.slides)
          ? (b.slides as Record<string, unknown>[])
          : [];
        const first = slidesRaw[0];
        // Stable fallback id derived from batch content — never Math.random().
        const id = String(
          b.batchId ??
            b.id ??
            (first?.id != null ? `lotto-${first.id}` : `lotto-${index}`)
        );
        const slides: BatchSlide[] = slidesRaw.map((s) => ({
          id: String(s.id ?? ""),
          thumbnailUrl: s.id
            ? `/api/v1/slides/${s.id}/thumbnail`
            : undefined,
          originalFilename: s.originalFilename as string | undefined,
        }));
        const existing = byId.get(id);
        if (existing) {
          existing.slides.push(...slides);
          existing.count = existing.slides.length;
          return;
        }
        const batch: Batch = {
          id,
          slides,
          count: slides.length > 0 ? slides.length : ((b.count ?? 0) as number),
          uploadedAt: (b.createdAt ?? b.uploadedAt ?? new Date().toISOString()) as string,
          // Pre-fill the batch form with the metadata captured at upload.
          title: (first?.title as string | undefined) ?? "",
          dateTaken:
            (first?.dateTakenPrecise as string | undefined) ??
            (first?.dateTaken as string | undefined) ??
            "",
          location: (first?.location as string | undefined) ?? "",
        };
        byId.set(id, batch);
        mapped.push(batch);
      });
      setBatches(mapped);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  // Drop only the ids that belonged to the given batch, keeping the rest of
  // the cross-batch selection intact.
  const clearSelectionForBatch = useCallback((batch: Batch | undefined) => {
    if (!batch) return;
    const ids = new Set(batch.slides.map((s) => s.id));
    setSelected((prev) => {
      const next = new Set([...prev].filter((id) => !ids.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, []);

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
        clearSelectionForBatch(batches.find((b) => b.id === batchId));
        setBatches((prev) => prev.filter((b) => b.id !== batchId));
      } catch {
        toast.error("Errore durante la pubblicazione del lotto");
      }
    },
    [batches, clearSelectionForBatch]
  );

  const handleDelete = useCallback(
    async (batchId: string) => {
      try {
        const res = await fetch("/api/v1/slides/batch/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ batchId }),
          credentials: "include",
        });
        if (!res.ok) throw new Error();
        toast.success(t("success.deleted"));
        clearSelectionForBatch(batches.find((b) => b.id === batchId));
        setBatches((prev) => prev.filter((b) => b.id !== batchId));
      } catch {
        toast.error(t("errors.deleteFailed"));
      }
    },
    [batches, clearSelectionForBatch]
  );

  const totalSlides = useMemo(
    () => batches.reduce((sum, b) => sum + b.count, 0),
    [batches]
  );

  const handlePublishAll = useCallback(async () => {
    if (batches.length === 0) return;
    setPublishingAll(true);
    const targets = [...batches];
    const publishedIds = new Set<string>();
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
          for (const s of b.slides) publishedIds.add(s.id);
          setBatches((prev) => prev.filter((x) => x.id !== b.id));
        }
      } catch {
        // keep going; report at the end
      }
    }
    setPublishingAll(false);
    // Keep selections in batches that failed to publish.
    setSelected(
      (prev) => new Set([...prev].filter((id) => !publishedIds.has(id)))
    );
    if (published === targets.length) {
      toast.success(t("success.slidesPublished"));
    } else {
      toast.error(
        `Pubblicati ${published}/${targets.length} lotti. Riprova per i restanti.`
      );
    }
  }, [batches]);

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
      if (ok > 0)
        toast.success(
          ok === 1 ? "1 immagine aggiornata" : `${ok} immagini aggiornate`
        );
      else toast.error("Errore durante la trasformazione");
    },
    [selected]
  );

  // Group by day and precompute each group's start index so the slide-reveal
  // stagger runs continuously across date sections.
  const groupedEntries = useMemo(() => {
    const entries = Object.entries(groupByDate(batches));
    let offset = 0;
    return entries.map(([date, list]) => {
      const startIndex = offset;
      offset += list.length;
      return { date, list, startIndex };
    });
  }, [batches]);

  const publishAllMessage = `${
    totalSlides === 1
      ? "Verrà pubblicata nella galleria 1 diapositiva"
      : `Verranno pubblicate nella galleria ${totalSlides} diapositive`
  } in ${batches.length === 1 ? "1 lotto" : `${batches.length} lotti`}.`;

  return (
    <div className="flex flex-col gap-6">
      <PageMasthead
        eyebrow="Archivio · In arrivo"
        title={t("queue.incomingTitle")}
        count={loading || error ? null : totalSlides}
        countLabel={
          !loading && !error && totalSlides === 1
            ? "diapositiva in attesa"
            : "diapositive in attesa"
        }
        subtitle={
          <span className="inline-flex flex-wrap items-center gap-1">
            {t("queue.subtitle")}
            <HelpPopover
              items={[
                "Clicca una foto per ingrandirla.",
                "Spunta più foto e usa la barra in basso per ruotarle o capovolgerle insieme.",
                "«Pubblica tutto» archivia tutti i lotti; il titolo del lotto diventa il nome dell'album.",
                "«Modifica singole» apre il lotto per modificare ogni foto.",
              ]}
            />
          </span>
        }
        action={
          !loading && !error && batches.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={selectAll}>
                <CheckCheckIcon />
                {selected.size === allIds.length && allIds.length > 0
                  ? t("actions.deselectAll")
                  : t("actions.selectAll")}
              </Button>
              <AlertDialog>
                <AlertDialogTrigger
                  render={
                    <Button disabled={publishingAll}>
                      {publishingAll ? (
                        <Loader2Icon className="animate-spin" />
                      ) : (
                        <SendIcon />
                      )}
                      {t("actions.publishAll")}
                    </Button>
                  }
                />
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {t("confirm.publishTitle")}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {publishAllMessage}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("actions.cancel")}</AlertDialogCancel>
                    <AlertDialogAction onClick={handlePublishAll}>
                      {t("actions.publish")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ) : undefined
        }
      />

      {loading ? (
        <div className="flex flex-col gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <BatchCardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <ErrorState
          message="Impossibile caricare la coda"
          onRetry={fetchBatches}
        />
      ) : batches.length === 0 ? (
        <EmptyMount
          icon={InboxIcon}
          title={t("empty.queue")}
          hint={t("empty.queueDescription")}
        />
      ) : (
        groupedEntries.map(({ date, list, startIndex }) => (
          <section key={date} className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <h2 className="shrink-0 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                {date}
              </h2>
              <div className="film-sprockets flex-1 opacity-60" aria-hidden />
            </div>
            {list.map((batch, i) => (
              <div
                key={batch.id}
                className="slide-reveal"
                style={{
                  animationDelay: `${Math.min((startIndex + i) * 60, 700)}ms`,
                }}
              >
                <BatchCard
                  batch={batch}
                  onPublish={handlePublish}
                  onDelete={handleDelete}
                  selected={selected}
                  versions={versions}
                  onToggleSelect={toggleSelect}
                />
              </div>
            ))}
          </section>
        ))
      )}

      {/* Central action bar — applies to the selection across all batches.
          Sticky (not fixed) so it stays inside the content scroll area and
          never overlays the sidebar. */}
      {selected.size > 0 && (
        <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t bg-background/95 px-4 py-3 shadow-lg backdrop-blur supports-backdrop-filter:bg-background/60 sm:px-6 md:-mx-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setSelected(new Set())}
              title="Deseleziona"
              aria-label="Deseleziona"
            >
              <XIcon className="size-4" />
            </Button>
            <span className="text-sm font-medium">
              {selected.size === 1
                ? t("gallery.slidesSelectedSingular")
                : t("gallery.slidesSelectedPlural", { count: selected.size })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={transforming}
              onClick={() => applyToSelected("rotate-ccw")}
              title="Ruota a sinistra"
              aria-label="Ruota a sinistra"
            >
              <RotateCcwIcon className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={transforming}
              onClick={() => applyToSelected("rotate-cw")}
              title="Ruota a destra"
              aria-label="Ruota a destra"
            >
              <RotateCwIcon className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={transforming}
              onClick={() => applyToSelected("flip-h")}
              title="Capovolgi orizzontale"
              aria-label="Capovolgi orizzontale"
            >
              <FlipHorizontalIcon className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={transforming}
              onClick={() => applyToSelected("flip-v")}
              title="Capovolgi verticale"
              aria-label="Capovolgi verticale"
            >
              <FlipVerticalIcon className="size-4" />
            </Button>
            {transforming && <Loader2Icon className="size-4 animate-spin" />}
          </div>
        </div>
      )}
    </div>
  );
}
