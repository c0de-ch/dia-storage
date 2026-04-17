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
}

export const SlideCard = memo(function SlideCard({
  slide,
  selected = false,
  onSelect,
  showCheckbox = false,
}: SlideCardProps) {
  const router = useRouter();

  const displayTitle =
    slide.title || slide.originalFilename || `Diapositiva #${slide.id}`;
  const displayDate = slide.dateTaken || null;
  const displayLocation = slide.location || null;

  function handleClick(e: React.MouseEvent) {
    // Don't navigate if clicking the checkbox
    if ((e.target as HTMLElement).closest('[data-slot="checkbox"]')) return;
    router.push(`/galleria/${slide.id}`);
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
      className={cn(
        "group/slide relative cursor-pointer overflow-hidden rounded-lg border bg-card transition-all hover:ring-2 hover:ring-ring/50",
        selected && "ring-2 ring-primary"
      )}
      onClick={handleClick}
    >
      {/* Checkbox overlay */}
      <div
        className={cn(
          "absolute top-2 left-2 z-10 transition-opacity",
          showCheckbox || selected ? "opacity-100" : "opacity-0 group-hover/slide:opacity-100"
        )}
      >
        <div
          className="rounded bg-background/80 p-1 backdrop-blur-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <Checkbox
            checked={selected}
            onCheckedChange={handleCheckboxChange}
          />
        </div>
      </div>

      {/* Status badge */}
      {slide.status !== "active" && (
        <div className="absolute top-2 right-2 z-10">
          <Badge variant={statusBadgeVariant}>
            {slide.status === "incoming"
              ? t("status.incoming")
              : slide.status === "deleted"
                ? t("status.deleted")
                : slide.status}
          </Badge>
        </div>
      )}

      {/* Thumbnail */}
      <ThumbnailImage slideId={slide.id} alt={displayTitle} />


      {/* Info below thumbnail */}
      <div className="space-y-0.5 px-2 py-1.5">
        {displayDate && (
          <p className="truncate text-xs text-muted-foreground">
            {displayDate}
          </p>
        )}
        {displayLocation && (
          <p className="truncate text-xs text-muted-foreground">
            {displayLocation}
          </p>
        )}
        {!displayDate && !displayLocation && (
          <p className="text-xs text-muted-foreground/50 italic">
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
    <div className="relative aspect-[3/2] w-full overflow-hidden bg-muted">
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
          className="object-cover transition-transform group-hover/slide:scale-105"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      )}
      {/* Title overlay at bottom of image */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2 pb-1.5 pt-4">
        <p className="truncate text-xs font-medium text-white">
          {alt}
        </p>
      </div>
    </div>
  );
}

export function SlideCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <Skeleton className="aspect-[3/2] w-full rounded-none" />
      <div className="space-y-1 px-2 py-1.5">
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}
