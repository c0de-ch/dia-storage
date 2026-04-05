"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FilterIcon,
  ImageOffIcon,
  Loader2Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { SearchBar } from "@/components/search-bar";
import { SlideCard, SlideCardSkeleton } from "@/components/slide-card";
import { BatchToolbar } from "@/components/batch-toolbar";
import type { Slide, PaginationInfo } from "@/types/slide";

const PER_PAGE_OPTIONS = [25, 50, 100] as const;

export default function GalleriaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [slides, setSlides] = useState<Slide[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(true);
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
      if (searchQuery.trim()) {
        params.set("q", searchQuery.trim());
      }
      const res = await fetch(`/api/v1/slides?${params}`);
      const data = await res.json();
      if (data.success) {
        setSlides(data.slides);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Errore nel caricamento:", error);
    } finally {
      setLoading(false);
    }
  }, [page, perPage, sortBy, sortOrder, searchQuery]);

  useEffect(() => {
    fetchSlides();
  }, [fetchSlides]);

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

  function handleBatchDownload() {
    for (const id of selectedIds) {
      window.open(`/api/v1/slides/${id}/original`, "_blank");
    }
  }

  function handleBatchEdit() {
    // Navigate to first selected for now
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

  // Build page numbers for pagination
  function getPageNumbers(): (number | "ellipsis")[] {
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
  }

  const hasSelected = selectedIds.size > 0;

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold">Galleria</h1>
        <p className="text-sm text-muted-foreground">
          Archivio delle diapositive digitalizzate
        </p>
      </div>

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

        <Button variant="outline" size="sm">
          <FilterIcon className="mr-1.5 size-3.5" />
          Filtri
        </Button>

        <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
          {pagination && (
            <span>
              {pagination.total}{" "}
              {pagination.total === 1 ? "diapositiva" : "diapositive"}
            </span>
          )}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: perPage > 25 ? 25 : perPage }).map((_, i) => (
            <SlideCardSkeleton key={i} />
          ))}
        </div>
      ) : slides.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <ImageOffIcon className="size-12 text-muted-foreground/40" />
          <h2 className="text-lg font-medium text-muted-foreground">
            Nessuna diapositiva archiviata
          </h2>
          <p className="text-sm text-muted-foreground/70">
            Le diapositive appariranno qui dopo essere state digitalizzate e
            archiviate.
          </p>
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
              {getPageNumbers().map((p, i) =>
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
