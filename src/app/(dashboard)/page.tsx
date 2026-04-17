"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ImageIcon,
  InboxIcon,
  UploadIcon,
  GalleryHorizontalEndIcon,
} from "lucide-react";

interface DashboardStats {
  totalSlides: number;
  incomingCount: number;
  magazinesCount: number;
}

interface RecentSlide {
  id: string;
  title?: string;
  thumbnailUrl?: string;
  createdAt: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentSlides, setRecentSlides] = useState<RecentSlide[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const [statsRes, slidesRes] = await Promise.all([
          fetch("/api/v1/dashboard/stats", { credentials: "include" }),
          fetch("/api/v1/slides?status=active&limit=10&sortBy=createdAt&sortOrder=desc", {
            credentials: "include",
          }),
        ]);

        if (statsRes.ok) {
          const data = await statsRes.json();
          setStats(data);
        }

        if (slidesRes.ok) {
          const data = await slidesRes.json();
          setRecentSlides(data.items ?? data.slides ?? []);
        }
      } catch (error) {
        console.error("Errore nel caricamento della dashboard:", error);
        toast.error("Impossibile caricare la dashboard. Riprova piu tardi.");
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  const statCards = [
    {
      label: "Totale diapositive",
      value: stats?.totalSlides ?? 0,
      icon: ImageIcon,
      color: "text-blue-600 dark:text-blue-400",
    },
    {
      label: "In coda",
      value: stats?.incomingCount ?? 0,
      icon: InboxIcon,
      color: "text-amber-600 dark:text-amber-400",
    },
    {
      label: t("nav.magazines"),
      value: stats?.magazinesCount ?? 0,
      icon: GalleryHorizontalEndIcon,
      color: "text-emerald-600 dark:text-emerald-400",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Panoramica</h1>
        <p className="text-muted-foreground">
          {t("app.tagline")}
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardDescription>{card.label}</CardDescription>
              <card.icon className={`size-5 ${card.color}`} />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <p className="text-3xl font-bold tabular-nums">
                  {card.value.toLocaleString("it-IT")}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Button nativeButton={false} render={<Link href="/caricamento" />}>
          <UploadIcon />
          Carica diapositive
        </Button>
        <Button variant="outline" nativeButton={false} render={<Link href="/galleria" />}>
          <ImageIcon />
          {t("gallery.browseGallery")}
        </Button>
      </div>

      {/* Recent slides */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Ultime pubblicate</h2>
        {loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        ) : recentSlides.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <ImageIcon className="mb-4 size-12 text-muted-foreground" />
              <p className="text-lg font-medium">{t("empty.slides")}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("empty.slidesDescription")}
              </p>
              <Button className="mt-4" render={<Link href="/caricamento" />}>
                <UploadIcon />
                Carica diapositive
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {recentSlides.map((slide) => (
              <Link
                key={slide.id}
                href={`/galleria/${slide.id}`}
                className="group relative aspect-square overflow-hidden rounded-lg border bg-muted transition-colors hover:border-primary"
              >
                {slide.thumbnailUrl ? (
                  <Image
                    src={slide.thumbnailUrl}
                    alt={slide.title ?? "Diapositiva"}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                    className="object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center">
                    <ImageIcon className="size-8 text-muted-foreground" />
                  </div>
                )}
                {slide.title && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                    <p className="truncate text-xs text-white">
                      {slide.title}
                    </p>
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
