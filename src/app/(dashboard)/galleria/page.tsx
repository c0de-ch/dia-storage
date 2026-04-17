"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
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
  XIcon,
} from "lucide-react";
import { toast } from "sonner";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { SearchBar } from "@/components/search-bar";
import { SlideCard, SlideCardSkeleton } from "@/components/slide-card";
import { BatchToolbar } from "@/components/batch-toolbar";
import type { Slide, PaginationInfo } from "@/types/slide";

const PER_PAGE_OPTIONS = [25, 50, 100] as const;

interface Collection {
  id: number;
  name: string;
  description?: string;
  coverSlideId?: number;
  slidesCount?: number;
}

export default function GalleriaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [slides, setSlides] = useState<Slide[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(
    searchParams.get("q") ?? ""
  );
  // Debounced copy of searchQuery used by fetchSlides so we don't fire a
  // request on every keystroke.
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 250);
    return () => clearTimeout(t);
  }, [searchQuery]);
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
    try {
      const params = new URLSearchParams({
        status: "active",
        page: String(page),
        limit: String(perPage),
        sortBy,
        sortOrder,
      });
      if (debouncedSearch.trim()) params.set("q", debouncedSearch.trim());
      if (filterDateFrom) params.set("dateFrom", filterDateFrom);
      if (filterDateTo) params.set("dateTo", filterDateTo);
      if (filterLocation) params.set("location", filterLocation);

      let url = `/api/v1/slides?${params}`;

      // If filtering by collection, use search endpoint with collection filter
      if (filterCollectionId) {
        url = `/api/v1/search?${params}&collectionId=${filterCollectionId}`;
      }

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setSlides(data.slides);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Errore nel caricamento:", error);
      toast.error("Impossibile caricare le diapositive. Riprova piu tardi.");
      setSlides([]);
    } finally {
      setLoading(false);
    }
  }, [page, perPage, sortBy, sortOrder, debouncedSearch, filterDateFrom, filterDateTo, filterLocation, filterCollectionId]);

  useEffect(() => {
    if (activeTab === "all") fetchSlides();
  }, [fetchSlides, activeTab]);

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
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold">{t("gallery.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("gallery.subtitle")}
        </p>
      </div>

      {/* Tabs: Tutte le foto / Album */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">
            <LayoutGridIcon className="mr-1.5 size-4" />
            {t("gallery.allPhotos")}
          </TabsTrigger>
          <TabsTrigger value="albums">
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

            {hasSelected && (
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

            <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
              {pagination && (
                <span>
                  {pagination.total}{" "}
                  {pagination.total === 1 ? "diapositiva" : "diapositive"}
                </span>
              )}
            </div>
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
                {collections.length > 0 && (
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
                        <SelectValue placeholder="Tutti gli album" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tutti gli album</SelectItem>
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
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-5">
              {Array.from({ length: perPage > 25 ? 25 : perPage }).map((_, i) => (
                <SlideCardSkeleton key={i} />
              ))}
            </div>
          ) : slides.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
              <ImageOffIcon className="size-12 text-muted-foreground/40" />
              <h2 className="text-lg font-medium text-muted-foreground">
                Nessuna diapositiva trovata
              </h2>
              <p className="text-sm text-muted-foreground/70">
                {hasActiveFilters
                  ? "Prova a modificare i filtri applicati."
                  : "Le diapositive appariranno qui dopo essere state pubblicate dalla coda."}
              </p>
              {hasActiveFilters && (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Cancella filtri
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-5">
              {slides.map((slide) => (
                <SlideCard
                  key={slide.id}
                  slide={slide}
                  selected={selectedIds.has(slide.id)}
                  onSelect={handleSelect}
                  showCheckbox={hasSelected}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
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
            </div>
          )}
        </TabsContent>

        {/* === ALBUMS TAB === */}
        <TabsContent value="albums" className="mt-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Organizza le diapositive in album tematici
            </p>
            <Button size="sm" render={<Link href="/galleria?view=all" />} onClick={() => {
              // Create new collection inline
              const name = prompt("Nome del nuovo album:");
              if (!name) return;
              fetch("/api/v1/collections", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name }),
              }).then(async (res) => {
                if (res.ok) {
                  const data = await res.json();
                  setCollections((prev) => [data.collection, ...prev]);
                  toast.success("Album creato");
                }
              });
            }}>
              <FolderPlusIcon className="mr-1.5 size-4" />
              {t("gallery.createAlbum")}
            </Button>
          </div>

          {collections.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
              <LibraryIcon className="size-12 text-muted-foreground/40" />
              <h2 className="text-lg font-medium text-muted-foreground">
                {t("gallery.noAlbums")}
              </h2>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {collections.map((collection) => (
                <AlbumCard key={collection.id} collection={collection} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Batch toolbar */}
      <BatchToolbar
        selectedCount={selectedIds.size}
        onEdit={handleBatchEdit}
        onDownload={handleBatchDownload}
        onDelete={handleBatchDelete}
        onDeselectAll={handleDeselectAll}
      />
    </div>
  );
}

function AlbumCard({ collection }: { collection: Collection }) {
  const coverUrl = collection.coverSlideId
    ? `/api/v1/slides/${collection.coverSlideId}/thumbnail`
    : null;

  return (
    <Link href={`/galleria?view=all&collectionId=${collection.id}`}>
      <Card className="group cursor-pointer overflow-hidden transition-all hover:ring-2 hover:ring-ring/50">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {coverUrl ? (
            <Image
              src={coverUrl}
              alt={collection.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition-transform group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex size-full items-center justify-center">
              <LibraryIcon className="size-10 text-muted-foreground/40" />
            </div>
          )}
        </div>
        <CardHeader className="p-3">
          <CardTitle className="text-sm">{collection.name}</CardTitle>
          {collection.description && (
            <p className="text-xs text-muted-foreground line-clamp-1">
              {collection.description}
            </p>
          )}
        </CardHeader>
      </Card>
    </Link>
  );
}
