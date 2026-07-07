"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageMasthead } from "@/components/page-masthead";
import { EmptyMount, ErrorState } from "@/components/state-views";
import { SlideCard, SlideCardSkeleton } from "@/components/slide-card";
import {
  ImageIcon,
  InboxIcon,
  UploadIcon,
  GalleryHorizontalEndIcon,
} from "lucide-react";
import type { Slide } from "@/types/slide";

interface DashboardStats {
  totalSlides: number;
  incomingCount: number;
  magazinesCount: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentSlides, setRecentSlides] = useState<Slide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [statsRes, slidesRes] = await Promise.all([
        fetch("/api/v1/dashboard/stats", { credentials: "include" }),
        fetch(
          "/api/v1/slides?status=active&limit=10&sortBy=createdAt&sortOrder=desc",
          { credentials: "include" }
        ),
      ]);

      if (!statsRes.ok || !slidesRes.ok) {
        throw new Error(
          `Risposta non valida (stats ${statsRes.status}, slides ${slidesRes.status})`
        );
      }

      const statsData: DashboardStats = await statsRes.json();
      const slidesData: { slides?: Slide[] } = await slidesRes.json();
      setStats(statsData);
      setRecentSlides(slidesData.slides ?? []);
    } catch (err) {
      console.error("Errore nel caricamento della dashboard:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const statCards = [
    {
      label: t("dashboard.totalSlides"),
      value: stats?.totalSlides,
      icon: ImageIcon,
      href: "/galleria",
    },
    {
      label: t("dashboard.incoming"),
      value: stats?.incomingCount,
      icon: InboxIcon,
      href: "/coda",
    },
    {
      label: t("nav.magazines"),
      value: stats?.magazinesCount,
      icon: GalleryHorizontalEndIcon,
      // Magazines are browsable via the advanced-search filter
      href: "/ricerca?avanzata=1",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageMasthead
        eyebrow={t("dashboard.kicker")}
        title={t("dashboard.title")}
        subtitle={t("app.tagline")}
      />

      {error && !loading ? (
        <ErrorState
          message={t("dashboard.loadError")}
          onRetry={fetchDashboard}
        />
      ) : (
        <>
          {/* Stats cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {statCards.map((card, i) => (
              <Link
                key={card.href}
                href={card.href}
                className="group slide-reveal block h-full rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
                style={{ animationDelay: `${60 + i * 60}ms` }}
              >
                <Card className="h-full transition-colors group-hover:border-primary group-focus-visible:border-primary">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardDescription className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                      {card.label}
                    </CardDescription>
                    <span
                      className="flex size-9 shrink-0 items-center justify-center rounded-sm bg-accent text-accent-foreground"
                      aria-hidden
                    >
                      <card.icon className="size-4" />
                    </span>
                  </CardHeader>
                  <CardContent>
                    {loading || card.value === undefined ? (
                      <Skeleton className="h-9 w-24" />
                    ) : (
                      <p className="font-mono text-3xl font-bold tabular-nums text-primary">
                        {String(card.value).padStart(4, "0")}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* Quick actions */}
          <div
            className="slide-reveal flex flex-wrap gap-3"
            style={{ animationDelay: "240ms" }}
          >
            <Button nativeButton={false} render={<Link href="/caricamento" />}>
              <UploadIcon aria-hidden />
              {t("dashboard.upload")}
            </Button>
          </div>

          {/* Recent slides */}
          <section>
            <div
              className="slide-reveal"
              style={{ animationDelay: "300ms" }}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-mono text-[11px] uppercase tracking-[0.35em] text-muted-foreground">
                  {t("dashboard.recent")}
                </h2>
                <Link
                  href="/galleria"
                  className="rounded-sm text-xs text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {t("gallery.browseGallery")}
                </Link>
              </div>
              <div className="film-sprockets my-3" aria-hidden />
            </div>

            {loading ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                {Array.from({ length: 10 }).map((_, i) => (
                  <SlideCardSkeleton key={i} />
                ))}
              </div>
            ) : recentSlides.length === 0 ? (
              <EmptyMount
                icon={ImageIcon}
                title={t("empty.slides")}
                hint={t("empty.slidesDescription")}
                action={
                  <Button
                    nativeButton={false}
                    render={<Link href="/caricamento" />}
                  >
                    <UploadIcon aria-hidden />
                    {t("dashboard.upload")}
                  </Button>
                }
              />
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                {recentSlides.map((slide, i) => (
                  <div
                    key={slide.id}
                    className="slide-reveal"
                    style={{ animationDelay: `${Math.min(i * 40, 700)}ms` }}
                  >
                    <SlideCard slide={slide} selectable={false} />
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
