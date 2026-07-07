"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LocationPicker } from "@/components/location-picker";
import { ImageLightbox } from "@/components/image-lightbox";
import { PageMasthead } from "@/components/page-masthead";
import { EmptyMount, ErrorState } from "@/components/state-views";
import {
  ArrowLeftIcon,
  RotateCcwIcon,
  RotateCwIcon,
  FlipHorizontalIcon,
  FlipVerticalIcon,
  SaveIcon,
  SendIcon,
  Loader2Icon,
  InboxIcon,
  ImageIcon,
} from "lucide-react";

interface Slide {
  id: number;
  originalFilename?: string | undefined;
  title: string;
  dateTaken: string;
  location: string;
  notes: string;
}

function SlideEditor({ slide }: { slide: Slide }) {
  const [title, setTitle] = useState(slide.title);
  const [dateTaken, setDateTaken] = useState(slide.dateTaken);
  const [location, setLocation] = useState(slide.location);
  const [notes, setNotes] = useState(slide.notes);
  const [saving, setSaving] = useState(false);
  const [version, setVersion] = useState(0);
  const [busyOp, setBusyOp] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  // Track which src failed: a successful rotate/flip bumps the version and
  // produces a new src, automatically giving the preview another chance.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  const previewSrc = `/api/v1/slides/${slide.id}/medium?v=${version}`;
  const failed = failedSrc === previewSrc;
  const stamp =
    slide.originalFilename ?? `#${String(slide.id).padStart(4, "0")}`;

  async function applyOp(op: string) {
    setBusyOp(op);
    try {
      const res = await fetch(`/api/v1/slides/${slide.id}/transform`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op }),
        credentials: "include",
      });
      if (!res.ok) throw new Error();
      setVersion((v) => v + 1); // bust the cached preview so the change shows
    } catch {
      toast.error("Errore durante la trasformazione");
    } finally {
      setBusyOp(null);
    }
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/slides/${slide.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || null,
          dateTaken: dateTaken.trim() || null,
          location: location.trim() || null,
          notes: notes.trim() || null,
        }),
        credentials: "include",
      });
      if (!res.ok) throw new Error();
      toast.success(t("success.saved"));
    } catch {
      toast.error(t("errors.generic"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardContent className="grid gap-4 p-4 md:grid-cols-[minmax(0,340px)_1fr]">
        {/* Preview mounted as a 35mm slide + rotate/flip controls */}
        <div className="flex flex-col gap-2">
          <div data-slot="card" className="rounded-sm border bg-card p-2 shadow-sm">
            <div
              role="button"
              tabIndex={0}
              aria-label={`Apri anteprima di ${stamp}`}
              onClick={() => setLightboxOpen(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setLightboxOpen(true);
                }
              }}
              className="relative aspect-[3/2] cursor-pointer overflow-hidden rounded-[3px] bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {failed ? (
                <div className="flex size-full items-center justify-center">
                  <ImageIcon className="size-8 text-muted-foreground" aria-hidden />
                </div>
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={previewSrc}
                  alt={slide.originalFilename ?? "Diapositiva"}
                  onError={() => setFailedSrc(previewSrc)}
                  className="absolute inset-0 size-full object-contain"
                />
              )}
              {/* Inner shadow of the mount window */}
              <div
                className="pointer-events-none absolute inset-0 rounded-[3px] shadow-[inset_0_0_10px_rgba(0,0,0,0.45)]"
                aria-hidden
              />
            </div>
            <p className="truncate px-0.5 pt-1.5 text-center font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
              {stamp}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyOp("rotate-ccw")}
              disabled={busyOp !== null}
              title="Ruota a sinistra"
              aria-label="Ruota a sinistra"
            >
              {busyOp === "rotate-ccw" ? (
                <Loader2Icon className="animate-spin" />
              ) : (
                <RotateCcwIcon />
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyOp("rotate-cw")}
              disabled={busyOp !== null}
              title="Ruota a destra"
              aria-label="Ruota a destra"
            >
              {busyOp === "rotate-cw" ? (
                <Loader2Icon className="animate-spin" />
              ) : (
                <RotateCwIcon />
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyOp("flip-h")}
              disabled={busyOp !== null}
              title="Capovolgi orizzontale"
              aria-label="Capovolgi orizzontale"
            >
              {busyOp === "flip-h" ? (
                <Loader2Icon className="animate-spin" />
              ) : (
                <FlipHorizontalIcon />
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyOp("flip-v")}
              disabled={busyOp !== null}
              title="Capovolgi verticale"
              aria-label="Capovolgi verticale"
            >
              {busyOp === "flip-v" ? (
                <Loader2Icon className="animate-spin" />
              ) : (
                <FlipVerticalIcon />
              )}
            </Button>
          </div>
        </div>

        {/* Per-slide metadata */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`title-${slide.id}`}>{t("metadata.title")}</Label>
            <Input
              id={`title-${slide.id}`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="es. Vacanze estate 1985"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`date-${slide.id}`}>{t("labels.date")}</Label>
            <Input
              id={`date-${slide.id}`}
              type="date"
              value={dateTaken}
              onChange={(e) => setDateTaken(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`loc-${slide.id}`}>{t("metadata.location")}</Label>
            <LocationPicker
              id={`loc-${slide.id}`}
              value={location}
              onChange={setLocation}
              placeholder="Cerca un luogo..."
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`notes-${slide.id}`}>{t("metadata.notes")}</Label>
            <Textarea
              id={`notes-${slide.id}`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("metadata.noNotes")}
              className="min-h-[38px]"
            />
          </div>
          <div>
            <Button onClick={save} disabled={saving} size="sm">
              {saving ? <Loader2Icon className="animate-spin" /> : <SaveIcon />}
              {t("actions.save")}
            </Button>
          </div>
        </div>
      </CardContent>
      <ImageLightbox
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
        src={previewSrc}
        alt={slide.originalFilename}
        downloadUrl={`/api/v1/slides/${slide.id}/original`}
      />
    </Card>
  );
}

function SlideEditorSkeleton() {
  return (
    <Card>
      <CardContent className="grid gap-4 p-4 md:grid-cols-[minmax(0,340px)_1fr]">
        <div className="flex flex-col gap-2">
          <div data-slot="card" className="rounded-sm border bg-card p-2 shadow-sm">
            <Skeleton className="aspect-[3/2] w-full rounded-[3px]" />
            <Skeleton className="mx-auto mt-1.5 h-2.5 w-24" />
          </div>
          <div className="flex justify-center gap-1.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="size-8 rounded-md" />
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function BatchEditPage() {
  const params = useParams<{ batchId: string }>();
  const batchId = params?.batchId;
  const router = useRouter();
  const [slides, setSlides] = useState<Slide[] | null>(null);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState(false);
  const [publishing, setPublishing] = useState(false);
  // Guards against a stale fetch (e.g. a retry racing the first load)
  // overwriting fresher state.
  const requestRef = useRef(0);

  const load = useCallback(async () => {
    if (!batchId) return;
    const reqId = ++requestRef.current;
    setSlides(null);
    setMissing(false);
    setError(false);
    try {
      // Page through the whole queue: the API caps each response at 200
      // slides, so the batch may sit beyond the first page (or span pages).
      let found: Record<string, unknown>[] | null = null;
      let page = 1;
      for (;;) {
        const res = await fetch(
          `/api/v1/slides/incoming?limit=200&page=${page}`,
          { credentials: "include" }
        );
        if (!res.ok) throw new Error();
        const data = await res.json();
        const batch = (data.batches ?? []).find(
          (b: { batchId: string }) => b.batchId === batchId
        );
        if (batch) {
          found = [...(found ?? []), ...(batch.slides ?? [])];
        }
        const totalPages = Number(data.pagination?.totalPages ?? 1);
        if (page >= totalPages || page >= 25) break;
        page += 1;
      }
      if (requestRef.current !== reqId) return;
      if (!found || found.length === 0) {
        setMissing(true);
        setSlides([]);
        return;
      }
      setSlides(
        found.map((s: Record<string, unknown>) => ({
          id: Number(s.id),
          originalFilename: s.originalFilename as string | undefined,
          title: (s.title as string | null) ?? "",
          dateTaken: (s.dateTaken as string | null) ?? "",
          location: (s.location as string | null) ?? "",
          notes: (s.notes as string | null) ?? "",
        }))
      );
    } catch {
      if (requestRef.current !== reqId) return;
      setError(true);
      setSlides([]);
    }
  }, [batchId]);

  useEffect(() => {
    load();
  }, [load]);

  async function publishBatch() {
    setPublishing(true);
    try {
      // No metadata: keep the per-slide edits made above, just move to gallery.
      const res = await fetch("/api/v1/slides/batch/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId }),
        credentials: "include",
      });
      if (!res.ok) throw new Error();
      toast.success(t("success.slidesPublished"));
      router.push("/coda");
    } catch {
      toast.error("Errore durante la pubblicazione del lotto");
      setPublishing(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-fit"
          nativeButton={false}
          render={<Link href="/coda" />}
        >
          <ArrowLeftIcon />
          {t("queue.incomingTitle")}
        </Button>
        <PageMasthead
          size="md"
          eyebrow={`Archivio · Lotto ${(batchId ?? "").slice(0, 8)}`}
          title="Modifica lotto"
          count={slides === null || error || missing ? null : slides.length}
          countLabel={
            slides !== null && !error && !missing && slides.length === 1
              ? "diapositiva"
              : "diapositive"
          }
          subtitle="Ruota o capovolgi ogni immagine e modifica i dettagli singolarmente."
          action={
            slides && slides.length > 0 ? (
              <Button onClick={publishBatch} disabled={publishing}>
                {publishing ? (
                  <Loader2Icon className="animate-spin" />
                ) : (
                  <SendIcon />
                )}
                {t("queue.publishToGallery")}
              </Button>
            ) : undefined
          }
        />
      </div>

      {error ? (
        <ErrorState message="Impossibile caricare il lotto" onRetry={load} />
      ) : slides === null ? (
        <div className="flex flex-col gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <SlideEditorSkeleton key={i} />
          ))}
        </div>
      ) : missing || slides.length === 0 ? (
        <EmptyMount
          icon={InboxIcon}
          title="Lotto non trovato"
          hint="Potrebbe essere già stato pubblicato o eliminato."
          action={
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href="/coda" />}
            >
              <ArrowLeftIcon />
              {t("queue.goToQueue")}
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          {slides.map((slide, i) => (
            <div
              key={slide.id}
              className="slide-reveal"
              style={{ animationDelay: `${Math.min(i * 60, 700)}ms` }}
            >
              <SlideEditor slide={slide} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
