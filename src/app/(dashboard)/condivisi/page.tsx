"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ImagesIcon, UsersIcon } from "lucide-react";
import { t } from "@/lib/i18n";
import { AlbumCard } from "@/components/album-card";
import { PageMasthead } from "@/components/page-masthead";
import { EmptyMount, ErrorState } from "@/components/state-views";
import { Skeleton } from "@/components/ui/skeleton";

interface SharedGallery {
  ownerId: number;
  name: string | null;
  email: string;
}
interface SharedAlbum {
  id: number;
  name: string;
  description: string | null;
  coverSlideId: number | null;
}

function initials(nameOrEmail: string): string {
  return nameOrEmail
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export default function CondivisiPage() {
  const [galleries, setGalleries] = useState<SharedGallery[]>([]);
  const [albums, setAlbums] = useState<SharedAlbum[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const r = await fetch("/api/v1/shares/received", { credentials: "include" });
      if (!r.ok) throw new Error(String(r.status));
      const data = await r.json();
      if (!data.success) throw new Error("failed");
      setGalleries(data.galleries ?? []);
      setAlbums(data.albums ?? []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const empty = !loading && !error && galleries.length === 0 && albums.length === 0;
  const total = galleries.length + albums.length;

  return (
    <div className="flex flex-col gap-8 p-4 sm:p-6">
      <PageMasthead
        eyebrow={t("sharing.kicker")}
        title={t("sharing.title")}
        count={loading ? null : total}
        countLabel={total === 1 ? "condivisione" : "condivisioni"}
        subtitle={t("sharing.subtitle")}
      />

      {loading ? (
        <>
          {/* Skeletons mirror the real two-section layout */}
          <section className="flex flex-col gap-3">
            <Skeleton className="h-3 w-24" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <div
                  key={i}
                  data-slot="card"
                  className="flex items-center gap-3 rounded-sm border bg-card p-4 shadow-sm"
                >
                  <Skeleton className="size-11 shrink-0 rounded-full" />
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </section>
          <section className="flex flex-col gap-3">
            <Skeleton className="h-3 w-16" />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  data-slot="card"
                  className="rounded-sm border bg-card p-2 shadow-sm"
                >
                  <Skeleton className="aspect-[4/3] rounded-[3px]" />
                  <div className="space-y-1 px-0.5 pt-1.5 pb-0.5">
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-2.5 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : error ? (
        <ErrorState message={t("sharing.loadError")} onRetry={load} />
      ) : empty ? (
        <EmptyMount
          icon={UsersIcon}
          title={t("sharing.emptyTitle")}
          hint={t("sharing.emptyHint")}
        />
      ) : (
        <>
          {galleries.length > 0 && (
            <section className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <h2 className="shrink-0 font-mono text-[11px] uppercase tracking-[0.35em] text-muted-foreground">
                  {t("sharing.galleries")}
                </h2>
                <span className="font-mono text-[11px] tabular-nums text-muted-foreground/60">
                  ×{galleries.length}
                </span>
                <div className="film-sprockets flex-1 opacity-40" aria-hidden />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {galleries.map((g, i) => (
                  <div
                    key={g.ownerId}
                    className="slide-reveal"
                    style={{ animationDelay: `${Math.min(i * 35, 700)}ms` }}
                  >
                    <Link
                      href={`/galleria?owner=${g.ownerId}`}
                      className="group block rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                    >
                      <div
                        data-slot="card"
                        className="flex items-center gap-3 rounded-sm border bg-card p-4 shadow-sm transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-lg group-hover:ring-2 group-hover:ring-ring/40"
                      >
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary font-mono text-sm font-bold uppercase text-secondary-foreground">
                          {initials(g.name || g.email)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">
                            {t("sharing.galleryOf", { name: g.name || g.email })}
                          </p>
                          <p className="truncate font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                            {g.email}
                          </p>
                        </div>
                        <ImagesIcon
                          className="size-4 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-primary"
                          aria-hidden
                        />
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            </section>
          )}

          {albums.length > 0 && (
            <section className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <h2 className="shrink-0 font-mono text-[11px] uppercase tracking-[0.35em] text-muted-foreground">
                  {t("sharing.albums")}
                </h2>
                <span className="font-mono text-[11px] tabular-nums text-muted-foreground/60">
                  ×{albums.length}
                </span>
                <div className="film-sprockets flex-1 opacity-40" aria-hidden />
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {albums.map((a, i) => (
                  <div
                    key={a.id}
                    className="slide-reveal"
                    style={{ animationDelay: `${Math.min(i * 35, 700)}ms` }}
                  >
                    <AlbumCard
                      collection={{
                        id: a.id,
                        name: a.name,
                        description: a.description,
                        coverSlideId: a.coverSlideId,
                        shared: true,
                      }}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
