import Link from "next/link";
import Image from "next/image";
import { LibraryIcon, UsersIcon } from "lucide-react";

export interface AlbumCardData {
  id: number;
  name: string;
  description?: string | null;
  coverSlideId?: number | null;
  slidesCount?: number;
  shared?: boolean;
}

/**
 * An album rendered as a loose pile of mounted 35mm slides on the light
 * table. Extracted from the galleria so shared albums (/condivisi) are the
 * same physical object everywhere.
 */
export function AlbumCard({ collection }: { collection: AlbumCardData }) {
  const coverUrl = collection.coverSlideId
    ? `/api/v1/slides/${collection.coverSlideId}/thumbnail`
    : null;

  return (
    <Link
      href={`/album/${collection.id}`}
      className="group block rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
    >
      {/* A loose pile of mounted slides */}
      <div className="relative">
        <div
          className="absolute inset-0 translate-x-1.5 rotate-[1.6deg] rounded-sm border bg-card transition-transform duration-300 group-hover:rotate-[2.8deg]"
          aria-hidden
        />
        <div
          className="absolute inset-0 -translate-x-1 rotate-[-1deg] rounded-sm border bg-card transition-transform duration-300 group-hover:rotate-[-2deg]"
          aria-hidden
        />
        <div
          data-slot="card"
          className="relative rounded-sm border bg-card p-2 shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lg group-hover:ring-2 group-hover:ring-ring/40"
        >
          <div className="relative aspect-[4/3] overflow-hidden rounded-[3px] bg-muted">
            {collection.shared && (
              <span className="absolute top-2 left-2 z-10 inline-flex items-center gap-1 rounded-full bg-background/85 px-2 py-0.5 text-[10px] font-medium backdrop-blur-sm">
                <UsersIcon className="size-3" aria-hidden />
                Condiviso
              </span>
            )}
            {coverUrl ? (
              <Image
                src={coverUrl}
                alt={collection.name}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                loading="lazy"
              />
            ) : (
              <div className="flex size-full items-center justify-center">
                <LibraryIcon className="size-10 text-muted-foreground/40" aria-hidden />
              </div>
            )}
            <div
              className="pointer-events-none absolute inset-0 rounded-[3px] shadow-[inset_0_0_10px_rgba(0,0,0,0.45)]"
              aria-hidden
            />
          </div>
          <div className="px-0.5 pt-1.5 pb-0.5">
            <div className="flex items-baseline justify-between gap-2">
              <p className="min-w-0 truncate text-xs font-semibold leading-tight">
                {collection.name}
              </p>
              {typeof collection.slidesCount === "number" && (
                <span className="shrink-0 font-mono text-[10px] tracking-wider text-muted-foreground/70">
                  ×{collection.slidesCount}
                </span>
              )}
            </div>
            {collection.description && (
              <p className="truncate font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                {collection.description}
              </p>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
