"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArchiveIcon,
  CalendarIcon,
  FilterIcon,
  FolderPlusIcon,
  ImageOffIcon,
  LayoutGridIcon,
  LibraryIcon,
  Loader2Icon,
  MapPinIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { SearchBar } from "@/components/search-bar";
import { SlideCard, SlideCardSkeleton } from "@/components/slide-card";
import { AlbumCard } from "@/components/album-card";
import { BatchToolbar } from "@/components/batch-toolbar";
import { GalleryShareButton } from "@/components/gallery-share-button";
import { PageMasthead } from "@/components/page-masthead";
import { EmptyMount, ErrorState } from "@/components/state-views";
import { cn } from "@/lib/utils";
import type { Slide, PaginationInfo } from "@/types/slide";

const PER_PAGE_OPTIONS = [25, 50, 100] as const;

interface Collection {
  id: number;
  name: string;
  description?: string;
  coverSlideId?: number;
  slidesCount?: number;
  shared?: boolean;
}

export default function GalleriaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [slides, setSlides] = useState<Slide[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  // SearchBar already debounces its onChange internally (300ms), so the
  // page can react to searchQuery directly without a second debounce.
  const [searchQuery, setSearchQuery] = useState(
    searchParams.get("q") ?? ""
  );
  const [sortBy, setSortBy] = useState(
    searchParams.get("sortBy") ?? "createdAt"
  );
  const [sortOrder, setSortOrder] = useState(
    searchParams.get("sortOrder") ?? "desc"
  );
  const [page, setPage] = useState(
    parseInt(searchParams.get("page") ?? "1")
  );
  const [perPage, setPerPage] = useState(
    parseInt(searchParams.get("limit") ?? "50")
  );
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [archiving, setArchiving] = useState(false);

  // Browse mode: ?owner=<id> shows another user's gallery shared with you
  // (read-only). Empty string = your own gallery.
  const ownerParam = searchParams.get("owner") ?? "";
  const isBrowsingShared = ownerParam !== "";
  const [ownerName, setOwnerName] = useState<string | null>(null);

  // Entering/leaving a shared gallery invalidates any selection, and we
  // resolve the owner's display name for the context banner.
  useEffect(() => {
    setSelectedIds(new Set());
    setOwnerName(null);
    if (!ownerParam) return;
    let cancelled = false;
    fetch("/api/v1/shares/received", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.success) return;
        const g = (data.galleries ?? []).find(
          (x: { ownerId: number }) => x.ownerId === Number(ownerParam)
        );
        if (g) setOwnerName(g.name || g.email);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [ownerParam]);

  // "Crea album" dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState("");
  const [creatingAlbum, setCreatingAlbum] = useState(false);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [filterCollectionId, setFilterCollectionId] = useState("");

  // Tab: "all" or "albums"
  const [activeTab, setActiveTab] = useState(
    searchParams.get("view") ?? "all"
  );

  // Fetch collections for album view
  useEffect(() => {
    async function fetchCollections() {
      try {
        const res = await fetch("/api/v1/collections?limit=100");
        const data = await res.json();
        if (data.success) setCollections(data.collections ?? []);
      } catch {
        // ignore
      }
    }
    fetchCollections();
  }, []);

  const fetchSlides = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const params = new URLSearchParams({
        status: "active",
        page: String(page),
        limit: String(perPage),
        sortBy,
        sortOrder,
      });
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      if (filterDateFrom) params.set("dateFrom", filterDateFrom);
      if (filterDateTo) params.set("dateTo", filterDateTo);
      if (filterLocation) params.set("location", filterLocation);
      if (filterCollectionId) params.set("collectionId", filterCollectionId);
      // Browsing a shared gallery: scope every fetch to that owner.
      if (ownerParam) params.set("owner", ownerParam);

      const res = await fetch(`/api/v1/slides?${params}`);
      const data = await res.json();
      if (data.success) {
        setSlides(data.slides);
        setPagination(data.pagination);
      } else {
        // e.g. a revoked share: don't masquerade as an empty gallery.
        setSlides([]);
        setPagination(null);
        setLoadError(data.message ?? "Impossibile caricare le diapositive.");
      }
    } catch (error) {
      console.error("Errore nel caricamento:", error);
      setSlides([]);
      setPagination(null);
      setLoadError("Impossibile caricare le diapositive. Riprova più tardi.");
    } finally {
      setLoading(false);
    }
  }, [page, perPage, sortBy, sortOrder, searchQuery, filterDateFrom, filterDateTo, filterLocation, filterCollectionId, ownerParam]);

  // Shared galleries have no albums tab: a deep link with ?view=albums must
  // still fetch and show the photo grid.
  const effectiveTab = isBrowsingShared ? "all" : activeTab;

  useEffect(() => {
    if (effectiveTab === "all") fetchSlides();
  }, [fetchSlides, effectiveTab]);

  // Keep the URL in sync (shallow) so refresh/back/deep links preserve
  // position — especially important for shared galleries entered via URL.
  useEffect(() => {
    const params = new URLSearchParams();
    if (ownerParam) params.set("owner", ownerParam);
    if (!isBrowsingShared && activeTab !== "all") params.set("view", activeTab);
    if (searchQuery.trim()) params.set("q", searchQuery.trim());
    if (sortBy !== "createdAt") params.set("sortBy", sortBy);
    if (sortOrder !== "desc") params.set("sortOrder", sortOrder);
    if (page !== 1) params.set("page", String(page));
    if (perPage !== 50) params.set("limit", String(perPage));
    const qs = params.toString();
    const url = qs ? `/galleria?${qs}` : "/galleria";
    if (`${window.location.pathname}${window.location.search}` !== url) {
      window.history.replaceState(null, "", url);
    }
  }, [ownerParam, isBrowsingShared, activeTab, searchQuery, sortBy, sortOrder, page, perPage]);

  // Selection handlers
  function handleSelect(id: number, selected: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function handleDeselectAll() {
    setSelectedIds(new Set());
  }

  async function handleBatchDelete() {
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          fetch(`/api/v1/slides/${id}`, { method: "DELETE" })
        )
      );
      setSelectedIds(new Set());
      fetchSlides();
    } catch (error) {
      console.error("Errore nell'eliminazione:", error);
    }
  }

  async function handleBatchArchive() {
    setArchiving(true);
    try {
      const res = await fetch("/api/v1/slides/batch/metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slideIds: Array.from(selectedIds),
          metadata: { status: "archived" },
        }),
      });
      if (res.ok) {
        toast.success(t("success.slidesArchived"));
        setSelectedIds(new Set());
        fetchSlides();
      } else {
        toast.error("Errore durante l'archiviazione");
      }
    } catch {
      toast.error("Errore durante l'archiviazione");
    } finally {
      setArchiving(false);
    }
  }

  function handleBatchDownload() {
    for (const id of selectedIds) {
      window.open(`/api/v1/slides/${id}/original`, "_blank");
    }
  }

  function handleBatchEdit() {
    const firstId = Array.from(selectedIds)[0];
    if (firstId) router.push(`/galleria/${firstId}`);
  }

  function handleSearchChange(value: string) {
    setSearchQuery(value);
    setPage(1);
  }

  function handleSortChange(value: string | null) {
    if (!value) return;
    const [newSortBy, newSortOrder] = value.split(":");
    if (!newSortBy || !newSortOrder) return;
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    setPage(1);
  }

  function handlePerPageChange(value: string | null) {
    if (!value) return;
    setPerPage(parseInt(value));
    setPage(1);
  }

  function clearFilters() {
    setFilterDateFrom("");
    setFilterDateTo("");
    setFilterLocation("");
    setFilterCollectionId("");
    setPage(1);
  }

  async function handleCreateAlbum(e: React.FormEvent) {
    e.preventDefault();
    const name = newAlbumName.trim();
    if (!name) return;
    setCreatingAlbum(true);
    try {
      const res = await fetch("/api/v1/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        const data = await res.json();
        setCollections((prev) => [data.collection, ...prev]);
        toast.success("Album creato");
        setCreateOpen(false);
        setNewAlbumName("");
      } else {
        toast.error("Impossibile creare l'album.");
      }
    } catch {
      toast.error("Impossibile creare l'album.");
    } finally {
      setCreatingAlbum(false);
    }
  }

  const hasActiveFilters = filterDateFrom || filterDateTo || filterLocation || filterCollectionId;

  // Build page numbers for pagination
  const pageNumbers = useMemo((): (number | "ellipsis")[] => {
    if (!pagination) return [];
    const { totalPages } = pagination;
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | "ellipsis")[] = [1];
    if (page > 3) pages.push("ellipsis");
    for (
      let i = Math.max(2, page - 1);
      i <= Math.min(totalPages - 1, page + 1);
      i++
    ) {
      pages.push(i);
    }
    if (page < totalPages - 2) pages.push("ellipsis");
    pages.push(totalPages);
    return pages;
  }, [pagination, page]);

  const hasSelected = selectedIds.size > 0;

  return (
    <div
      className={cn(
        "flex flex-col gap-4 p-4 sm:p-6",
        !isBrowsingShared && hasSelected && "pb-28"
      )}
    >
      {/* Editorial masthead */}
      <PageMasthead
        eyebrow={
          isBrowsingShared ? t("sharing.browsingEyebrow") : t("gallery.archiveLabel")
        }
        title={t("gallery.title")}
        count={
          activeTab === "all" || isBrowsingShared
            ? pagination
              ? pagination.total
              : null
            : undefined
        }
        countLabel={
          pagination?.total === 1
            ? t("gallery.slideUnitSingular")
            : t("gallery.slideUnitPlural")
        }
        subtitle={isBrowsingShared ? undefined : t("gallery.subtitle")}
        action={isBrowsingShared ? undefined : <GalleryShareButton />}
      >
        {isBrowsingShared && (
          <div className="mt-2 flex flex-wrap items-center gap-2 rounded-sm border border-primary/30 bg-primary/5 px-3 py-1.5">
            <UsersIcon className="size-3.5 text-primary" aria-hidden />
            <span className="text-sm">
              {t("sharing.browsingBanner", { name: ownerName ?? "…" })}
            </span>
            <Badge
              variant="outline"
              className="font-mono text-[10px] uppercase tracking-wider"
            >
              {t("sharing.readOnly")}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              className="ml-auto"
              nativeButton={false}
              render={<Link href="/condivisi" />}
            >
              <UsersIcon className="mr-1.5 size-4" />
              {t("sharing.backToShares")}
            </Button>
          </div>
        )}
      </PageMasthead>

      {/* Tabs: Tutte le foto / Album (hidden while browsing a shared gallery) */}
      <Tabs value={isBrowsingShared ? "all" : activeTab} onValueChange={setActiveTab}>
        <TabsList
          variant="line"
          className={cn(
            "w-full justify-start gap-5 border-b px-0",
            isBrowsingShared && "hidden"
          )}
        >
          <TabsTrigger
            value="all"
            className="flex-none text-xs font-bold uppercase tracking-[0.18em] after:bg-primary"
          >
            <LayoutGridIcon className="mr-1.5 size-4" />
            {t("gallery.allPhotos")}
          </TabsTrigger>
          <TabsTrigger
            value="albums"
            className="flex-none text-xs font-bold uppercase tracking-[0.18em] after:bg-primary"
          >
            <LibraryIcon className="mr-1.5 size-4" />
            {t("gallery.albums")}
          </TabsTrigger>
        </TabsList>

        {/* === ALL PHOTOS TAB === */}
        <TabsContent value="all" className="mt-4 flex flex-col gap-4">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <SearchBar
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Cerca per titolo, luogo..."
              className="w-full sm:w-64"
            />

            <Select
              value={`${sortBy}:${sortOrder}`}
              onValueChange={handleSortChange}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Ordina per..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt:desc">
                  Data aggiunta (recenti)
                </SelectItem>
                <SelectItem value="createdAt:asc">
                  Data aggiunta (meno recenti)
                </SelectItem>
                <SelectItem value="dateTakenPrecise:desc">
                  Data scatto (recenti)
                </SelectItem>
                <SelectItem value="dateTakenPrecise:asc">
                  Data scatto (meno recenti)
                </SelectItem>
                <SelectItem value="title:asc">Titolo (A-Z)</SelectItem>
                <SelectItem value="title:desc">Titolo (Z-A)</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant={showFilters ? "secondary" : "outline"}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <FilterIcon className="mr-1.5 size-3.5" />
              Filtri
              {hasActiveFilters && (
                <Badge variant="default" className="ml-1.5 px-1.5 py-0 text-[10px]">
                  !
                </Badge>
              )}
            </Button>

            {!isBrowsingShared && hasSelected && (
              <AlertDialog>
                <AlertDialogTrigger
                  render={
                    <Button variant="outline" size="sm" disabled={archiving}>
                      {archiving ? (
                        <Loader2Icon className="mr-1.5 size-3.5 animate-spin" />
                      ) : (
                        <ArchiveIcon className="mr-1.5 size-3.5" />
                      )}
                      Archivia ({selectedIds.size})
                    </Button>
                  }
                />
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("confirm.archiveTitle")}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("gallery.archiveConfirm")}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("actions.cancel")}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleBatchArchive}>
                      {t("actions.archive")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

          </div>

          {/* Filter panel */}
          {showFilters && (
            <Card>
              <CardContent className="flex flex-wrap items-end gap-3 p-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    <CalendarIcon className="mr-1 inline size-3" />
                    Data da
                  </label>
                  <Input
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => { setFilterDateFrom(e.target.value); setPage(1); }}
                    className="w-40"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    <CalendarIcon className="mr-1 inline size-3" />
                    Data a
                  </label>
                  <Input
                    type="date"
                    value={filterDateTo}
                    onChange={(e) => { setFilterDateTo(e.target.value); setPage(1); }}
                    className="w-40"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    <MapPinIcon className="mr-1 inline size-3" />
                    Luogo
                  </label>
                  <Input
                    value={filterLocation}
                    onChange={(e) => { setFilterLocation(e.target.value); setPage(1); }}
                    placeholder="es. Roma"
                    className="w-40"
                  />
                </div>
                {/* The collections list is the viewer's own — meaningless
                    while browsing someone else's shared gallery. */}
                {!isBrowsingShared && collections.length > 0 && (
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      <LibraryIcon className="mr-1 inline size-3" />
                      Album
                    </label>
                    <Select
                      value={filterCollectionId}
                      onValueChange={(v) => { setFilterCollectionId(v === "all" ? "" : (v ?? "")); setPage(1); }}
                    >
                      <SelectTrigger className="w-44">
                        <SelectValue placeholder={t("gallery.allAlbums")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("gallery.allAlbums")}</SelectItem>
                        {collections.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <XIcon className="mr-1 size-3.5" />
                    Cancella filtri
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-5">
              {Array.from({ length: perPage > 25 ? 25 : perPage }).map((_, i) => (
                <SlideCardSkeleton key={i} />
              ))}
            </div>
          ) : loadError ? (
            <ErrorState message={loadError} onRetry={fetchSlides} />
          ) : slides.length === 0 ? (
            <EmptyMount
              icon={ImageOffIcon}
              title="Nessuna diapositiva trovata"
              hint={
                hasActiveFilters
                  ? "Prova a modificare i filtri applicati."
                  : isBrowsingShared
                    ? t("sharing.sharedEmptyHint")
                    : "Le diapositive appariranno qui dopo essere state pubblicate dalla coda."
              }
              action={
                hasActiveFilters ? (
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    Cancella filtri
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-5">
              {slides.map((slide, i) => (
                <div
                  key={slide.id}
                  className="slide-reveal"
                  style={{ animationDelay: `${Math.min(i * 35, 700)}ms` }}
                >
                  <SlideCard
                    slide={slide}
                    selected={selectedIds.has(slide.id)}
                    onSelect={handleSelect}
                    showCheckbox={hasSelected}
                    selectable={!isBrowsingShared}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Pagination — the per-page select stays reachable whenever
              there are slides, even on a single page. */}
          {pagination && pagination.total > 0 && !loading && (
            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Per pagina:</span>
                <Select
                  value={String(perPage)}
                  onValueChange={handlePerPageChange}
                >
                  <SelectTrigger className="w-20" size="sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PER_PAGE_OPTIONS.map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {pagination.totalPages > 1 && (
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      text="Precedente"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      aria-disabled={page <= 1}
                      className={page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  {pageNumbers.map((p, i) =>
                    p === "ellipsis" ? (
                      <PaginationItem key={`e-${i}`}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    ) : (
                      <PaginationItem key={p}>
                        <PaginationLink
                          isActive={p === page}
                          onClick={() => setPage(p)}
                          className="cursor-pointer"
                        >
                          {p}
                        </PaginationLink>
                      </PaginationItem>
                    )
                  )}
                  <PaginationItem>
                    <PaginationNext
                      text="Successiva"
                      onClick={() =>
                        setPage((p) => Math.min(pagination.totalPages, p + 1))
                      }
                      aria-disabled={page >= pagination.totalPages}
                      className={
                        page >= pagination.totalPages
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
              )}
            </div>
          )}
        </TabsContent>

        {/* === ALBUMS TAB === */}
        <TabsContent value="albums" className="mt-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Organizza le diapositive in album tematici
            </p>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <FolderPlusIcon className="mr-1.5 size-4" />
              {t("gallery.createAlbum")}
            </Button>
          </div>

          {collections.length === 0 ? (
            <EmptyMount
              icon={LibraryIcon}
              title={t("gallery.noAlbums")}
              hint="Crea un album per raggruppare le diapositive per tema o viaggio."
              action={
                <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
                  <FolderPlusIcon className="mr-1.5 size-4" />
                  {t("gallery.createAlbum")}
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {collections.map((collection, i) => (
                <div
                  key={collection.id}
                  className="slide-reveal"
                  style={{ animationDelay: `${Math.min(i * 35, 700)}ms` }}
                >
                  <AlbumCard collection={collection} />
                </div>
              ))}
            </div>
          )}

          {/* "Crea album" dialog (replaces the old native prompt) */}
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Nuovo album</DialogTitle>
                <DialogDescription>
                  Dai un nome all&apos;album: potrai aggiungere le foto subito dopo.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateAlbum} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="new-album-name">Nome</Label>
                  <Input
                    id="new-album-name"
                    value={newAlbumName}
                    onChange={(e) => setNewAlbumName(e.target.value)}
                    placeholder="es. Vacanze estate 1985"
                    autoFocus
                    required
                  />
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setCreateOpen(false)}
                    disabled={creatingAlbum}
                  >
                    {t("actions.cancel")}
                  </Button>
                  <Button type="submit" disabled={creatingAlbum || !newAlbumName.trim()}>
                    {creatingAlbum ? (
                      <Loader2Icon className="mr-1.5 size-4 animate-spin" />
                    ) : (
                      <FolderPlusIcon className="mr-1.5 size-4" />
                    )}
                    {t("actions.create")}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>

      {/* Batch toolbar — never in read-only shared mode */}
      {!isBrowsingShared && (
        <BatchToolbar
          selectedCount={selectedIds.size}
          onEdit={handleBatchEdit}
          onDownload={handleBatchDownload}
          onDelete={handleBatchDelete}
          onDeselectAll={handleDeselectAll}
        />
      )}
    </div>
  );
}
