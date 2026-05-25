"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
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
} from "lucide-react";

interface Slide {
  id: number;
  originalFilename?: string;
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
      toast.success("Salvato");
    } catch {
      toast.error(t("errors.generic"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardContent className="grid gap-4 p-4 md:grid-cols-[minmax(0,340px)_1fr]">
        {/* Preview + rotate/flip controls */}
        <div className="flex flex-col gap-2">
          <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-md border bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/v1/slides/${slide.id}/medium?v=${version}`}
              alt={slide.originalFilename ?? "Diapositiva"}
              onClick={() => setLightboxOpen(true)}
              className="max-h-full max-w-full cursor-pointer object-contain"
            />
          </div>
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyOp("rotate-ccw")}
              disabled={busyOp !== null}
              title="Ruota a sinistra"
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
            >
              {busyOp === "flip-v" ? (
                <Loader2Icon className="animate-spin" />
              ) : (
                <FlipVerticalIcon />
              )}
            </Button>
          </div>
          <p className="truncate text-center text-xs text-muted-foreground">
            {slide.originalFilename}
          </p>
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
              Salva
            </Button>
          </div>
        </div>
      </CardContent>
      <ImageLightbox
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
        src={`/api/v1/slides/${slide.id}/medium?v=${version}`}
        alt={slide.originalFilename}
        downloadUrl={`/api/v1/slides/${slide.id}/original`}
      />
    </Card>
  );
}

export default function BatchEditPage() {
  const params = useParams<{ batchId: string }>();
  const batchId = params?.batchId;
  const [slides, setSlides] = useState<Slide[] | null>(null);
  const [missing, setMissing] = useState(false);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/v1/slides/incoming?limit=200", {
          credentials: "include",
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        const batch = (data.batches ?? []).find(
          (b: { batchId: string }) => b.batchId === batchId
        );
        if (!active) return;
        if (!batch) {
          setMissing(true);
          setSlides([]);
          return;
        }
        setSlides(
          (batch.slides ?? []).map((s: Record<string, unknown>) => ({
            id: Number(s.id),
            originalFilename: s.originalFilename as string | undefined,
            title: (s.title as string | null) ?? "",
            dateTaken: (s.dateTaken as string | null) ?? "",
            location: (s.location as string | null) ?? "",
            notes: (s.notes as string | null) ?? "",
          }))
        );
      } catch {
        if (active) {
          setMissing(true);
          setSlides([]);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [batchId]);

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
      window.location.href = "/coda";
    } catch {
      toast.error("Errore durante la pubblicazione del lotto");
      setPublishing(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
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
          <h1 className="text-2xl font-bold tracking-tight">
            Modifica lotto {(batchId ?? "").slice(0, 8)}
          </h1>
          <p className="text-muted-foreground">
            Ruota o capovolgi ogni immagine e modifica i dettagli singolarmente.
          </p>
        </div>
        {slides && slides.length > 0 && (
          <Button onClick={publishBatch} disabled={publishing}>
            {publishing ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              <SendIcon />
            )}
            {t("queue.publishToGallery")}
          </Button>
        )}
      </div>

      {slides === null ? (
        <div className="flex flex-col gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-xl" />
          ))}
        </div>
      ) : missing || slides.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <InboxIcon className="mb-4 size-12 text-muted-foreground" />
            <p className="text-lg font-medium">Lotto non trovato</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Potrebbe essere già stato pubblicato o eliminato.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {slides.map((slide) => (
            <SlideEditor key={slide.id} slide={slide} />
          ))}
        </div>
      )}
    </div>
  );
}
