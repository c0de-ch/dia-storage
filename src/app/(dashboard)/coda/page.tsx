"use client";

import React, { useCallback, useEffect, useState } from "react";
import { t } from "@/lib/i18n";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  ArchiveIcon,
  PencilIcon,
  Trash2Icon,
  Loader2Icon,
  MonitorIcon,
  LaptopIcon,
} from "lucide-react";

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
  magazineName?: string;
  date?: string;
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
  onArchive,
  onDelete,
}: {
  batch: Batch;
  onArchive: (id: string, meta: BatchMeta) => void;
  onDelete: (id: string) => void;
}) {
  const [magazineName, setMagazineName] = useState(batch.magazineName ?? "");
  const [date, setDate] = useState(batch.date ?? "");
  const [location, setLocation] = useState(batch.location ?? "");
  const [notes, setNotes] = useState(batch.notes ?? "");
  const [applyToAll, setApplyToAll] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleArchive() {
    setArchiving(true);
    try {
      await onArchive(batch.id, {
        magazineName,
        date,
        location,
        notes,
        applyToAll,
      });
    } finally {
      setArchiving(false);
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
          {batch.slides.slice(0, 8).map((slide) => (
            <div
              key={slide.id}
              className="aspect-square overflow-hidden rounded-md border bg-muted"
            >
              {slide.thumbnailUrl ? (
                <img
                  src={slide.thumbnailUrl}
                  alt={slide.originalFilename ?? "Diapositiva"}
                  className="size-full object-cover"
                />
              ) : (
                <div className="flex size-full items-center justify-center">
                  <ImageIcon className="size-4 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}
          {batch.count > 8 && (
            <div className="flex aspect-square items-center justify-center rounded-md border bg-muted text-sm text-muted-foreground">
              +{batch.count - 8}
            </div>
          )}
        </div>

        <p className="text-sm text-muted-foreground">
          {batch.count === 1
            ? "1 diapositiva"
            : `${batch.count} diapositive`}
        </p>

        <Separator />

        {/* Metadata form */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`mag-${batch.id}`}>
              {t("metadata.magazine")}
            </Label>
            <Input
              id={`mag-${batch.id}`}
              placeholder={t("magazines.magazineNamePlaceholder")}
              value={magazineName}
              onChange={(e) => setMagazineName(e.target.value)}
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
            <Input
              id={`loc-${batch.id}`}
              placeholder={t("metadata.noLocation")}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
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

        <div className="flex items-center gap-2">
          <Checkbox
            id={`apply-all-${batch.id}`}
            checked={applyToAll}
            onCheckedChange={(v) => setApplyToAll(v === true)}
          />
          <Label htmlFor={`apply-all-${batch.id}`} className="font-normal">
            Applica a tutte le diapositive del lotto
          </Label>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={handleArchive} disabled={archiving}>
            {archiving ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              <ArchiveIcon />
            )}
            Archivia lotto
          </Button>
          <Button variant="outline" render={<a href={`/coda/${batch.id}`} />}>
            <PencilIcon />
            Modifica singole
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
    </Card>
  );
}

interface BatchMeta {
  magazineName: string;
  date: string;
  location: string;
  notes: string;
  applyToAll: boolean;
}

export default function CodaPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBatches = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/slides/incoming", {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        const raw = data.batches ?? data.items ?? [];
        // Map API response to Batch interface
        const mapped: Batch[] = raw.map((b: Record<string, unknown>) => ({
          id: (b.batchId ?? b.id ?? String(Math.random())) as string,
          slides: Array.isArray(b.slides)
            ? b.slides.map((s: Record<string, unknown>) => ({
                id: String(s.id ?? ""),
                thumbnailUrl: s.thumbnailPath
                  ? `/api/v1/slides/${s.id}/thumbnail`
                  : undefined,
                originalFilename: s.originalFilename as string | undefined,
              }))
            : [],
          count: (b.count ?? 0) as number,
          source: (b.source ?? "web") as Batch["source"],
          uploadedAt: (b.createdAt ?? b.uploadedAt ?? new Date().toISOString()) as string,
        }));
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

  const handleArchive = useCallback(
    async (batchId: string, meta: BatchMeta) => {
      try {
        const res = await fetch("/api/v1/slides/batch/archive", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ batchId, metadata: meta }),
          credentials: "include",
        });
        if (!res.ok) throw new Error();
        toast.success("Lotto archiviato con successo");
        setBatches((prev) => prev.filter((b) => b.id !== batchId));
      } catch {
        toast.error("Errore durante l'archiviazione del lotto");
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
    } catch {
      toast.error(t("errors.deleteFailed"));
    }
  }, []);

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

  const grouped = groupByDate(batches);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Coda in arrivo</h1>
        <p className="text-muted-foreground">
          {t("queue.subtitle")}
        </p>
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
                onArchive={handleArchive}
                onDelete={handleDelete}
              />
            ))}
          </div>
        ))
      )}
    </div>
  );
}
