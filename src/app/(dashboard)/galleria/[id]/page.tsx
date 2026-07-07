"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArchiveIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  FlipHorizontalIcon,
  FlipVerticalIcon,
  ImageIcon,
  Loader2Icon,
  RotateCcwIcon,
  RotateCwIcon,
  SlidersHorizontalIcon,
  Trash2Icon,
  Volume2Icon,
  VolumeOffIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
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
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageViewer } from "@/components/image-viewer";
import { HelpPopover } from "@/components/help-popover";
import { MetadataForm, type MetadataFormValues } from "@/components/metadata-form";
import { ExifPanel } from "@/components/exif-panel";
import { PageMasthead } from "@/components/page-masthead";
import { t } from "@/lib/i18n";
import type { Slide } from "@/types/slide";

export default function SlideDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slideId = Number(params.id);

  const [slide, setSlide] = useState<Slide | null>(null);
  const [siblings, setSiblings] = useState<Slide[]>([]);
  const [loading, setLoading] = useState(true);
  // Permission flags from the API (default true until loaded).
  const [canEdit, setCanEdit] = useState(true);
  const [canDelete, setCanDelete] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [archivingSlide, setArchivingSlide] = useState(false);
  const [writingExif, setWritingExif] = useState(false);
  const [describing, setDescribing] = useState(false);
  const [description, setDescription] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [imgVersion, setImgVersion] = useState(0);
  const [transformOp, setTransformOp] = useState<string | null>(null);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [brightness, setBrightness] = useState(1);
  const [contrast, setContrast] = useState(1);
  const [saturation, setSaturation] = useState(1);
  const [applyingAdjust, setApplyingAdjust] = useState(false);

  // Fetch slide
  const fetchSlide = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/slides/${slideId}`);
      const data = await res.json();
      if (data.success) {
        setSlide(data.slide);
        setCanEdit(data.canEdit !== false);
        setCanDelete(data.canDelete !== false);
        // Fetch siblings from same magazine (the API only sorts by
        // title/dateTakenPrecise/createdAt, so order by slot client-side).
        if (data.slide.magazineId) {
          const sibRes = await fetch(
            `/api/v1/slides?magazineId=${data.slide.magazineId}&limit=50&sortBy=createdAt&sortOrder=asc`
          );
          const sibData = await sibRes.json();
          if (sibData.success) {
            const sorted = [...(sibData.slides as Slide[])].sort(
              (a, b) =>
                (a.slotNumber ?? Number.MAX_SAFE_INTEGER) -
                  (b.slotNumber ?? Number.MAX_SAFE_INTEGER) || a.id - b.id
            );
            setSiblings(sorted);
          }
        }
      }
    } catch (error) {
      console.error("Errore nel caricamento:", error);
    } finally {
      setLoading(false);
    }
  }, [slideId]);

  useEffect(() => {
    setLoading(true);
    setDescription(null);
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setSpeaking(false);
    fetchSlide();
  }, [fetchSlide]);

  // Prev/Next navigation
  const currentSibIndex = siblings.findIndex((s) => s.id === slideId);
  const prevSlide = currentSibIndex > 0 ? siblings[currentSibIndex - 1] : null;
  const nextSlide =
    currentSibIndex < siblings.length - 1
      ? siblings[currentSibIndex + 1]
      : null;

  const navigateTo = useCallback(
    (id: number) => {
      router.push(`/galleria/${id}`);
    },
    [router],
  );

  // Keyboard navigation
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (e.key === "ArrowLeft" && prevSlide) {
        navigateTo(prevSlide.id);
      } else if (e.key === "ArrowRight" && nextSlide) {
        navigateTo(nextSlide.id);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [prevSlide, nextSlide, navigateTo]);

  // Delete
  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/v1/slides/${slideId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(t("success.deleted"));
        router.push("/galleria");
      } else {
        toast.error(t("errors.deleteFailed"));
      }
    } catch {
      toast.error(t("errors.deleteFailed"));
    } finally {
      setDeleting(false);
    }
  }

  // Archive (move to backup). The single-slide PATCH schema doesn't accept
  // status "archived", so use the batch metadata endpoint like the gallery.
  async function handleArchive() {
    setArchivingSlide(true);
    try {
      const res = await fetch(`/api/v1/slides/batch/metadata`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slideIds: [slideId],
          metadata: { status: "archived" },
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Diapositiva archiviata nel backup");
        router.push("/galleria");
      } else {
        toast.error("Errore nell'archiviazione");
      }
    } catch {
      toast.error("Errore nell'archiviazione");
    } finally {
      setArchivingSlide(false);
    }
  }

  // EXIF write: the route expects the tags to write in the JSON body.
  async function handleExifWrite() {
    if (!slide) return;
    const exifBody: Record<string, string> = {};
    if (slide.title) exifBody.title = slide.title;
    const dateForExif = slide.dateTakenPrecise || slide.dateTaken;
    if (dateForExif) exifBody.dateTaken = dateForExif;
    if (slide.location) exifBody.location = slide.location;
    if (Object.keys(exifBody).length === 0) {
      toast.error("Nessun dato EXIF da scrivere");
      return;
    }
    setWritingExif(true);
    try {
      const res = await fetch(`/api/v1/slides/${slideId}/exif`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(exifBody),
      });
      if (!res.ok) throw new Error();
      toast.success("Dati EXIF scritti nel file");
    } catch {
      toast.error("Errore nella scrittura EXIF");
    } finally {
      setWritingExif(false);
    }
  }

  // Rotate / flip the original image and refresh the preview.
  async function applyTransform(op: string) {
    setTransformOp(op);
    try {
      const res = await fetch(`/api/v1/slides/${slideId}/transform`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op }),
        credentials: "include",
      });
      if (!res.ok) throw new Error();
      setImgVersion((v) => v + 1); // cache-bust the preview
    } catch {
      toast.error("Errore durante la trasformazione");
    } finally {
      setTransformOp(null);
    }
  }

  // Bake the previewed color correction into the image.
  async function applyAdjust() {
    if (brightness === 1 && contrast === 1 && saturation === 1) return;
    setApplyingAdjust(true);
    try {
      const res = await fetch(`/api/v1/slides/${slideId}/adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brightness, contrast, saturation }),
        credentials: "include",
      });
      if (!res.ok) throw new Error();
      setBrightness(1);
      setContrast(1);
      setSaturation(1);
      setImgVersion((v) => v + 1);
      toast.success("Correzione applicata");
    } catch {
      toast.error("Errore durante la correzione");
    } finally {
      setApplyingAdjust(false);
    }
  }

  // AI describe image
  async function handleDescribe() {
    setDescribing(true);
    setDescription(null);
    try {
      const res = await fetch(`/api/v1/slides/${slideId}/describe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lang: navigator.language || "it-IT" }),
      });
      const data = await res.json();
      if (data.success && data.description) {
        setDescription(data.description);
        speakText(data.description);
      } else {
        setDescription(data.message || "Errore nella descrizione.");
      }
    } catch (error) {
      console.error("Errore nella descrizione:", error);
      setDescription("Errore nella connessione al servizio IA.");
    } finally {
      setDescribing(false);
    }
  }

  function speakText(text: string) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = navigator.language || "it-IT";
    utterance.rate = 0.95;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }

  function stopSpeaking() {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }

  // Stable identity: a fresh object literal on every render would make the
  // metadata form think the slide changed and wipe unsaved edits.
  const metadataInitialValues = useMemo<MetadataFormValues>(
    () => ({
      title: slide?.title ?? "",
      dateTaken: slide?.dateTaken ?? "",
      dateTakenPrecise: slide?.dateTakenPrecise ?? null,
      location: slide?.location ?? "",
      notes: slide?.notes ?? "",
    }),
    [slide]
  );

  // Keep the local slide state in sync after a successful save, so the
  // masthead/breadcrumb update live and later resets use fresh values.
  const handleMetadataSaved = useCallback((vals: MetadataFormValues) => {
    setSlide((prev) =>
      prev
        ? {
            ...prev,
            title: vals.title || null,
            dateTaken: vals.dateTaken || null,
            dateTakenPrecise: vals.dateTakenPrecise || null,
            location: vals.location || null,
            notes: vals.notes || null,
          }
        : prev
    );
  }, []);

  // Center the active thumbnail in the filmstrip (horizontal only — never
  // scroll the page vertically) whenever it mounts or moves.
  const scrollActiveThumb = useCallback((node: HTMLButtonElement | null) => {
    if (!node) return;
    const viewport = node.closest<HTMLElement>(
      '[data-slot="scroll-area-viewport"]'
    );
    if (!viewport) return;
    const delta =
      node.getBoundingClientRect().left -
      viewport.getBoundingClientRect().left;
    viewport.scrollTo({
      left:
        viewport.scrollLeft + delta - viewport.clientWidth / 2 + node.clientWidth / 2,
      behavior: "smooth",
    });
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-4 sm:p-6">
        <Skeleton className="h-4 w-48" />
        <div className="space-y-2">
          <Skeleton className="h-3 w-56" />
          <Skeleton className="h-9 w-72" />
          <div className="film-sprockets mt-3 opacity-40" aria-hidden />
        </div>
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <Skeleton className="aspect-[3/2] w-full rounded-lg" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!slide) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-8">
        <p className="text-lg font-medium text-muted-foreground">
          {t("errors.slideNotFound")}
        </p>
        <Button variant="outline" onClick={() => router.push("/galleria")}>
          {t("gallery.backToGallery")}
        </Button>
      </div>
    );
  }

  const displayTitle =
    slide.title || slide.originalFilename || `Diapositiva #${slide.id}`;
  const frameNumber = `#${String(slide.id).padStart(4, "0")}`;

  const colorFilter =
    brightness !== 1 || contrast !== 1 || saturation !== 1
      ? `brightness(${brightness}) contrast(${contrast}) saturate(${saturation})`
      : undefined;

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      {/* Breadcrumb */}
      <Breadcrumb className="slide-reveal">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/galleria" />}>
              {t("nav.gallery")}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{displayTitle}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Editorial masthead */}
      <PageMasthead
        size="md"
        eyebrow={`Diapositiva ${frameNumber}${
          slide.magazineId ? ` · ${t("metadata.magazine")} ${slide.magazineId}` : ""
        }`}
        title={displayTitle}
        subtitle={
          slide.dateTaken || slide.location ? (
            <span className="font-mono text-[11px] uppercase tracking-wide">
              {[slide.dateTaken, slide.location].filter(Boolean).join(" · ")}
            </span>
          ) : undefined
        }
        action={
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              disabled={!prevSlide}
              onClick={() => prevSlide && navigateTo(prevSlide.id)}
              title={t("actions.previous")}
            >
              <ChevronLeftIcon className="size-4" />
            </Button>
            {siblings.length > 0 && currentSibIndex >= 0 && (
              <span className="px-1 font-mono text-sm tabular-nums text-primary">
                {String(currentSibIndex + 1).padStart(2, "0")} /{" "}
                {String(siblings.length).padStart(2, "0")}
              </span>
            )}
            <Button
              variant="outline"
              size="icon-sm"
              disabled={!nextSlide}
              onClick={() => nextSlide && navigateTo(nextSlide.id)}
              title="Successiva"
            >
              <ChevronRightIcon className="size-4" />
            </Button>
          </div>
        }
      >
        {!canEdit && (
          <span className="mt-2 inline-block w-fit rounded-[2px] border border-muted-foreground/40 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            Sola lettura
          </span>
        )}
      </PageMasthead>

      {/* Main content: two columns */}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Left: Image viewer + describe */}
        <div
          className="slide-reveal flex flex-col gap-3"
          style={{ animationDelay: "60ms" }}
        >
          <ImageViewer
            src={`/api/v1/slides/${slide.id}/medium?v=${imgVersion}`}
            alt={displayTitle}
            downloadUrl={`/api/v1/slides/${slide.id}/original`}
            className="aspect-[3/2] w-full"
            {...(adjustOpen && colorFilter ? { imageFilter: colorFilter } : {})}
          />

          {/* Rotate / flip the original (hidden for read-only viewers) */}
          {canEdit && (
            <div className="space-y-1.5">
              <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-muted-foreground">
                Modifica immagine
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                <div className="inline-flex items-center gap-0.5 rounded-lg border bg-card p-0.5">
                  {(
                    [
                      ["rotate-ccw", RotateCcwIcon, "Ruota a sinistra"],
                      ["rotate-cw", RotateCwIcon, "Ruota a destra"],
                      ["flip-h", FlipHorizontalIcon, "Capovolgi orizzontale"],
                      ["flip-v", FlipVerticalIcon, "Capovolgi verticale"],
                    ] as const
                  ).map(([op, Icon, label]) => (
                    <Button
                      key={op}
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => applyTransform(op)}
                      disabled={transformOp !== null}
                      title={label}
                      aria-label={label}
                    >
                      {transformOp === op ? (
                        <Loader2Icon className="size-3.5 animate-spin" />
                      ) : (
                        <Icon className="size-3.5" />
                      )}
                    </Button>
                  ))}
                </div>
                <Button
                  variant={adjustOpen ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setAdjustOpen((o) => !o)}
                  title="Correggi colore"
                >
                  <SlidersHorizontalIcon className="size-3.5" />
                  Correggi
                </Button>
                <HelpPopover
                  items={[
                    "Scorri sull'immagine per ingrandire, trascina per spostarti. Doppio clic per ingrandire o reimpostare.",
                    "Ruota a sinistra/destra o capovolgi in orizzontale/verticale.",
                    "«Correggi» regola luminosità, contrasto e saturazione.",
                    "Modifica titolo, data, luogo e note nel pannello a destra.",
                  ]}
                />
              </div>
            </div>
          )}

          {/* Color correction (live CSS preview, baked on Apply) */}
          {canEdit && adjustOpen && (
            <div className="flex flex-col gap-3 rounded-sm border bg-card p-3 shadow-sm">
              {(
                [
                  ["Luminosità", brightness, setBrightness],
                  ["Contrasto", contrast, setContrast],
                  ["Saturazione", saturation, setSaturation],
                ] as const
              ).map(([label, value, setter]) => (
                <label key={label} className="flex items-center gap-3 text-sm">
                  <span className="w-24 shrink-0 text-muted-foreground">
                    {label}
                  </span>
                  <input
                    type="range"
                    min={0.5}
                    max={1.5}
                    step={0.05}
                    value={value}
                    onChange={(e) => setter(parseFloat(e.target.value))}
                    className="flex-1 accent-primary"
                  />
                  <span className="w-10 shrink-0 text-right font-mono text-xs tabular-nums">
                    {Math.round(value * 100)}%
                  </span>
                </label>
              ))}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={applyAdjust}
                  disabled={applyingAdjust || !colorFilter}
                >
                  {applyingAdjust ? (
                    <Loader2Icon className="size-3.5 animate-spin" />
                  ) : null}
                  Applica
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setBrightness(1);
                    setContrast(1);
                    setSaturation(1);
                  }}
                  disabled={!colorFilter}
                >
                  Ripristina
                </Button>
              </div>
            </div>
          )}

          {/* AI Description */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDescribe}
              disabled={describing}
            >
              {describing ? (
                <Loader2Icon className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <EyeIcon className="mr-1.5 size-3.5" />
              )}
              {describing ? "Analisi in corso..." : "Descrivi immagine"}
            </Button>
            {description && (
              <>
                {speaking ? (
                  <Button variant="ghost" size="icon-sm" onClick={stopSpeaking} title="Ferma lettura">
                    <VolumeOffIcon className="size-3.5" />
                  </Button>
                ) : (
                  <Button variant="ghost" size="icon-sm" onClick={() => speakText(description)} title="Riascolta">
                    <Volume2Icon className="size-3.5" />
                  </Button>
                )}
                <Button variant="ghost" size="icon-sm" onClick={() => { stopSpeaking(); setDescription(null); }} title="Chiudi">
                  <XIcon className="size-3.5" />
                </Button>
              </>
            )}
          </div>
          {/* Live region so screen readers announce the AI analysis result */}
          <div role="status" aria-live="polite">
            {description && (
              <div className="rounded-lg border bg-muted/50 p-3 text-sm leading-relaxed">
                {description}
              </div>
            )}
          </div>
        </div>

        {/* Right: Metadata form + actions */}
        <div
          className="slide-reveal flex flex-col gap-4"
          style={{ animationDelay: "120ms" }}
        >
          <div className="space-y-3">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.35em] text-muted-foreground">
              Schedatura
            </h2>
            <MetadataForm
              slideId={slide.id}
              initialValues={metadataInitialValues}
              onSaved={handleMetadataSaved}
              onExifWrite={handleExifWrite}
              exifWriting={writingExif}
              readOnly={!canEdit}
            />
          </div>

          {/* EXIF info */}
          <ExifPanel
            exifData={slide.exifData}
            fileSize={slide.fileSize}
            width={slide.width}
            height={slide.height}
            originalFilename={slide.originalFilename}
            checksum={slide.checksum}
            scanDate={slide.scanDate}
            createdAt={slide.createdAt}
          />

          {/* Archive to backup */}
          {canEdit && slide.status === "active" && (
            <div className="space-y-3">
              <div className="film-sprockets" aria-hidden />
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleArchive}
                disabled={archivingSlide}
              >
                {archivingSlide ? (
                  <Loader2Icon className="mr-1.5 size-3.5 animate-spin" />
                ) : (
                  <ArchiveIcon className="mr-1.5 size-3.5" />
                )}
                Archivia nel backup
              </Button>
            </div>
          )}

          {/* Delete */}
          {canDelete && (
            <div className="space-y-3">
              <div className="film-sprockets" aria-hidden />
              <AlertDialog>
                <AlertDialogTrigger
                  render={
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full"
                      disabled={deleting}
                    >
                      {deleting ? (
                        <Loader2Icon className="mr-1.5 size-3.5 animate-spin" />
                      ) : (
                        <Trash2Icon className="mr-1.5 size-3.5" />
                      )}
                      {t("gallery.deleteSlide")}
                    </Button>
                  }
                />
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("confirm.deleteTitle")}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("gallery.deleteSlideConfirmLong")}
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
          )}
        </div>
      </div>

      {/* Bottom: Sibling filmstrip */}
      {siblings.length > 1 && (
        <div
          className="slide-reveal space-y-2 pt-2"
          style={{ animationDelay: "180ms" }}
        >
          <h3 className="font-mono text-[11px] uppercase tracking-[0.35em] text-muted-foreground">
            Stesso caricatore
          </h3>
          <div className="film-sprockets" aria-hidden />
          <ScrollArea className="w-full">
            <div className="flex gap-2 pb-2">
              {siblings.map((sib) => {
                const isActive = sib.id === slide.id;
                const sibAlt =
                  sib.title || sib.originalFilename || `#${sib.id}`;
                return (
                  <button
                    key={sib.id}
                    ref={isActive ? scrollActiveThumb : undefined}
                    onClick={() => navigateTo(sib.id)}
                    title={sibAlt}
                    aria-label={sibAlt}
                    aria-current={isActive ? "true" : undefined}
                    className={`relative shrink-0 overflow-hidden rounded-[2px] border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      isActive
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-transparent hover:border-muted-foreground/30"
                    }`}
                  >
                    <SiblingThumb id={sib.id} alt={sibAlt} />
                    <span
                      className="pointer-events-none absolute bottom-0.5 right-1 font-mono text-[9px] text-white/80 [text-shadow:0_1px_2px_rgba(0,0,0,0.8)]"
                      aria-hidden
                    >
                      #{String(sib.id).padStart(4, "0")}
                    </span>
                  </button>
                );
              })}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
          <div className="film-sprockets" aria-hidden />
        </div>
      )}
    </div>
  );
}

function SiblingThumb({ id, alt }: { id: number; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className="flex h-16 w-24 items-center justify-center bg-muted">
        <ImageIcon className="size-4 text-muted-foreground" />
      </div>
    );
  }
  return (
    <div className="relative h-16 w-24 overflow-hidden">
      <Image
        src={`/api/v1/slides/${id}/thumbnail`}
        alt={alt}
        fill
        sizes="96px"
        className="object-cover"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
