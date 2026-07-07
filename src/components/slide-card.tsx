"use client";

import { memo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageIcon } from "lucide-react";
import type { Slide } from "@/types/slide";
import { t } from "@/lib/i18n";

interface SlideCardProps {
  slide: Slide;
  selected?: boolean;
  onSelect?: (id: number, selected: boolean) => void;
  showCheckbox?: boolean;
  /** false hides the selection affordance entirely (e.g. read-only shared galleries) */
  selectable?: boolean;
}

/**
 * A slide rendered as a physical 35mm mount: thick card frame, inset
 * photo with inner shadow, frame number and date stamped in mono —
 * like a Kodachrome mount on a light table.
 */
export const SlideCard = memo(function SlideCard({
  slide,
  selected = false,
  onSelect,
  showCheckbox = false,
  selectable = true,
}: SlideCardProps) {
  const router = useRouter();

  const displayTitle =
    slide.title || slide.originalFilename || `Diapositiva #${slide.id}`;
  const displayDate = slide.dateTaken || null;
  const displayLocation = slide.location || null;
  const frameNumber = `#${String(slide.id).padStart(4, "0")}`;

  function handleClick(e: React.MouseEvent) {
    // Don't navigate if clicking the checkbox
    if ((e.target as HTMLElement).closest('[data-slot="checkbox"]')) return;
    router.push(`/galleria/${slide.id}`);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      router.push(`/galleria/${slide.id}`);
    }
  }

  function handleCheckboxChange(checked: boolean) {
    onSelect?.(slide.id, checked);
  }

  const statusBadgeVariant =
    slide.status === "active"
      ? "secondary"
      : slide.status === "incoming"
        ? "outline"
        : "destructive";

  return (
    <div
      data-slot="card"
      role="button"
      tabIndex={0}
      aria-label={displayTitle}
      className={cn(
        "group/slide relative cursor-pointer rounded-sm border bg-card p-2 shadow-sm",
        "transition-all duration-300 ease-out",
        "hover:-translate-y-1 hover:shadow-lg hover:ring-2 hover:ring-ring/40",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected && "-translate-y-1 ring-2 ring-primary shadow-lg"
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {/* Checkbox overlay */}
      {selectable && (
        <div
          className={cn(
            "absolute top-3.5 left-3.5 z-10 transition-opacity",
            showCheckbox || selected
              ? "opacity-100"
              : "opacity-0 group-hover/slide:opacity-100 group-focus-within/slide:opacity-100"
          )}
        >
          <div
            className="rounded bg-background/80 p-1 backdrop-blur-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <Checkbox
              checked={selected}
              onCheckedChange={handleCheckboxChange}
              aria-label={`Seleziona ${displayTitle}`}
            />
          </div>
        </div>
      )}

      {/* Status badge */}
      {slide.status !== "active" && (
        <div className="absolute top-3.5 right-3.5 z-10">
          <Badge variant={statusBadgeVariant}>
            {slide.status === "incoming"
              ? t("status.incoming")
              : slide.status === "deleted"
                ? t("status.deleted")
                : slide.status}
          </Badge>
        </div>
      )}

      {/* Photo, inset in the mount */}
      <ThumbnailImage slideId={slide.id} alt={displayTitle} />

      {/* Mount stampings */}
      <div className="px-0.5 pt-1.5 pb-0.5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="min-w-0 truncate text-xs font-semibold leading-tight">
            {displayTitle}
          </p>
          <span className="shrink-0 font-mono text-[10px] tracking-wider text-muted-foreground/70">
            {frameNumber}
          </span>
        </div>
        {(displayDate || displayLocation) ? (
          <p className="truncate font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            {[displayDate, displayLocation].filter(Boolean).join(" · ")}
          </p>
        ) : (
          <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground/50">
            {t("gallery.noDetails")}
          </p>
        )}
      </div>
    </div>
  );
});

function ThumbnailImage({ slideId, alt }: { slideId: number; alt: string }) {
  const [failed, setFailed] = useState(false);

  return (
    <div className="relative aspect-[3/2] w-full overflow-hidden rounded-[3px] bg-muted">
      {failed ? (
        <div className="flex h-full w-full items-center justify-center">
          <ImageIcon className="size-8 text-muted-foreground" />
        </div>
      ) : (
        <Image
          src={`/api/v1/slides/${slideId}/thumbnail`}
          alt={alt}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
          className="object-cover transition-transform duration-500 ease-out group-hover/slide:scale-[1.04]"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      )}
      {/* Inner shadow of the mount window */}
      <div
        className="pointer-events-none absolute inset-0 rounded-[3px] shadow-[inset_0_0_10px_rgba(0,0,0,0.45)]"
        aria-hidden
      />
    </div>
  );
}

export function SlideCardSkeleton() {
  return (
    <div data-slot="card" className="rounded-sm border bg-card p-2 shadow-sm">
      <Skeleton className="aspect-[3/2] w-full rounded-[3px]" />
      <div className="space-y-1 px-0.5 pt-1.5 pb-0.5">
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-2.5 w-1/2" />
      </div>
    </div>
  );
}
