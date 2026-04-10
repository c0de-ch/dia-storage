"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ImageIcon,
  Loader2Icon,
  Trash2Icon,
} from "lucide-react";
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
import { MetadataForm } from "@/components/metadata-form";
import { ExifPanel } from "@/components/exif-panel";
import type { Slide } from "@/types/slide";

export default function SlideDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slideId = Number(params.id);

  const [slide, setSlide] = useState<Slide | null>(null);
  const [siblings, setSiblings] = useState<Slide[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  // Fetch slide
  const fetchSlide = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/slides/${slideId}`);
      const data = await res.json();
      if (data.success) {
        setSlide(data.slide);
        // Fetch siblings from same magazine
        if (data.slide.magazineId) {
          const sibRes = await fetch(
            `/api/v1/slides?magazineId=${data.slide.magazineId}&limit=50&sortBy=slotNumber&sortOrder=asc`
          );
          const sibData = await sibRes.json();
          if (sibData.success) setSiblings(sibData.slides);
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
    fetchSlide();
  }, [fetchSlide]);

  // Prev/Next navigation
  const currentSibIndex = siblings.findIndex((s) => s.id === slideId);
  const prevSlide = currentSibIndex > 0 ? siblings[currentSibIndex - 1] : null;
  const nextSlide =
    currentSibIndex < siblings.length - 1
      ? siblings[currentSibIndex + 1]
      : null;

  function navigateTo(id: number) {
    router.push(`/galleria/${id}`);
  }

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
  }, [prevSlide, nextSlide]);

  // Delete
  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/v1/slides/${slideId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        router.push("/galleria");
      }
    } catch (error) {
      console.error("Errore nell'eliminazione:", error);
    } finally {
      setDeleting(false);
    }
  }

  // EXIF write
  async function handleExifWrite() {
    try {
      await fetch(`/api/v1/slides/${slideId}/exif`, { method: "POST" });
    } catch (error) {
      console.error("Errore nella scrittura EXIF:", error);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-4 sm:p-6">
        <Skeleton className="h-6 w-48" />
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <Skeleton className="aspect-[4/3] w-full rounded-lg" />
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
          Diapositiva non trovata
        </p>
        <Button variant="outline" onClick={() => router.push("/galleria")}>
          Torna alla galleria
        </Button>
      </div>
    );
  }

  const displayTitle =
    slide.title || slide.originalFilename || `Diapositiva #${slide.id}`;

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/galleria" />}>
                Galleria
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{displayTitle}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Prev/Next */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            disabled={!prevSlide}
            onClick={() => prevSlide && navigateTo(prevSlide.id)}
            title="Precedente"
          >
            <ChevronLeftIcon className="size-4" />
          </Button>
          {siblings.length > 0 && (
            <span className="px-1 text-xs text-muted-foreground">
              {currentSibIndex + 1} / {siblings.length}
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
      </div>

      {/* Main content: two columns */}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Left: Image viewer */}
        <ImageViewer
          src={`/api/v1/slides/${slide.id}/medium`}
          alt={displayTitle}
          downloadUrl={`/api/v1/slides/${slide.id}/original`}
          className="aspect-[4/3] w-full"
        />

        {/* Right: Metadata form + actions */}
        <div className="flex flex-col gap-4">
          <MetadataForm
            slideId={slide.id}
            initialValues={{
              title: slide.title ?? "",
              dateTaken: slide.dateTaken ?? "",
              dateTakenPrecise: slide.dateTakenPrecise ?? null,
              location: slide.location ?? "",
              notes: slide.notes ?? "",
            }}
            onExifWrite={handleExifWrite}
          />

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

          {/* Delete */}
          <div className="border-t pt-4">
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
                    Elimina diapositiva
                  </Button>
                }
              />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
                  <AlertDialogDescription>
                    Sei sicuro di voler eliminare questa diapositiva? Questa
                    azione non puo essere annullata.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annulla</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Elimina
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      {/* Bottom: Sibling thumbnail strip */}
      {siblings.length > 1 && (
        <div className="space-y-2 border-t pt-4">
          <h3 className="text-sm font-medium text-muted-foreground">
            Stesso caricatore
          </h3>
          <ScrollArea className="w-full">
            <div className="flex gap-2 pb-2">
              {siblings.map((sib) => (
                <button
                  key={sib.id}
                  onClick={() => navigateTo(sib.id)}
                  className={`relative shrink-0 overflow-hidden rounded-md border-2 transition-all ${
                    sib.id === slide.id
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-transparent hover:border-muted-foreground/30"
                  }`}
                >
                  <SiblingThumb id={sib.id} alt={sib.title || sib.originalFilename || `#${sib.id}`} />
                </button>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
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
    <img
      src={`/api/v1/slides/${id}/thumbnail`}
      alt={alt}
      className="h-16 w-24 object-cover"
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
