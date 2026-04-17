"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  SearchIcon,
  ImageOffIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import { t } from "@/lib/i18n";
import { SlideCard, SlideCardSkeleton } from "@/components/slide-card";
import type { Slide, PaginationInfo } from "@/types/slide";

interface Magazine {
  id: number;
  name: string;
}

const QUICK_SUGGESTIONS = [
  "Roma",
  "Milano",
  "Firenze",
  "Napoli",
  "Venezia",
  "1970",
  "1975",
  "1980",
  "1985",
  "1990",
];

export default function RicercaPage() {
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Advanced filters
  const [titleFilter, setTitleFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [magazineFilter, setMagazineFilter] = useState("");

  // Results
  const [slides, setSlides] = useState<Slide[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [page, setPage] = useState(1);
  const [magazines, setMagazines] = useState<Magazine[]>([]);

  // Fetch magazines for filter
  useEffect(() => {
    fetch("/api/v1/magazines")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.magazines) setMagazines(data.magazines);
      })
      .catch(() => {});
  }, []);

  const doSearch = useCallback(
    async (searchPage = 1, queryOverride?: string) => {
      setLoading(true);
      setSearched(true);
      try {
        const effectiveQuery = (queryOverride ?? query).trim();
        const params = new URLSearchParams({
          page: String(searchPage),
          limit: "50",
        });
        if (effectiveQuery) params.set("q", effectiveQuery);
        if (dateFrom) params.set("dateFrom", dateFrom);
        if (dateTo) params.set("dateTo", dateTo);
        if (magazineFilter) params.set("magazineId", magazineFilter);

        const res = await fetch(`/api/v1/search?${params}`);
        const data = await res.json();
        if (data.success) {
          setSlides(data.slides);
          setPagination(data.pagination);
        }
      } catch (error) {
        console.error("Errore nella ricerca:", error);
      } finally {
        setLoading(false);
      }
    },
    [query, dateFrom, dateTo, magazineFilter]
  );

  // Auto-search if q param is present
  useEffect(() => {
    if (searchParams.get("q")) {
      doSearch(1);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSearch() {
    setPage(1);
    doSearch(1);
  }

  function handlePageChange(newPage: number) {
    setPage(newPage);
    doSearch(newPage);
  }

  function handleQueryChange(value: string) {
    setQuery(value);
  }

  function handleSuggestionClick(suggestion: string) {
    setQuery(suggestion);
    setPage(1);
    doSearch(1, suggestion);
  }

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

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{t("search.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("search.subtitleLong")}
        </p>
      </div>

      {/* Search input */}
      <div className="flex gap-2">
        <SearchBar
          value={query}
          onChange={handleQueryChange}
          placeholder="Cerca per titolo, luogo, data..."
          autoFocus
          className="flex-1"
        />
        <Button onClick={handleSearch} disabled={loading}>
          {loading ? (
            <span className="flex items-center gap-1.5">
              <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              {t("search.searching")}
            </span>
          ) : (
            <>
              <SearchIcon className="mr-1.5 size-4" />
              {t("actions.search")}
            </>
          )}
        </Button>
      </div>

      {/* Quick suggestions */}
      {!searched && (
        <div className="flex flex-wrap gap-1.5">
          <span className="text-xs text-muted-foreground self-center mr-1">
            Suggerimenti:
          </span>
          {QUICK_SUGGESTIONS.map((s) => (
            <Badge
              key={s}
              variant="secondary"
              className="cursor-pointer hover:bg-secondary/80"
              onClick={() => handleSuggestionClick(s)}
            >
              {s}
            </Badge>
          ))}
        </div>
      )}

      {/* Advanced search */}
      <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <CollapsibleTrigger
          render={
            <Button variant="ghost" size="sm" className="gap-1.5">
              {advancedOpen ? (
                <ChevronUpIcon className="size-3.5" />
              ) : (
                <ChevronDownIcon className="size-3.5" />
              )}
              {t("search.advancedSearch")}
            </Button>
          }
        />
        <CollapsibleContent>
          <div className="mt-3 grid gap-4 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="adv-title">Titolo</Label>
              <Input
                id="adv-title"
                value={titleFilter}
                onChange={(e) => setTitleFilter(e.target.value)}
                placeholder="Titolo..."
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="adv-location">Luogo</Label>
              <Input
                id="adv-location"
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                placeholder="Luogo..."
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="adv-date-from">Data da</Label>
              <Input
                id="adv-date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="adv-date-to">Data a</Label>
              <Input
                id="adv-date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Caricatore</Label>
              <Select
                value={magazineFilter}
                onValueChange={(v) => setMagazineFilter(v ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("search.allMagazines")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t("search.allMagazines")}</SelectItem>
                  {magazines.map((m) => (
                    <SelectItem key={m.id} value={String(m.id)}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Results */}
      {searched && (
        <>
          {/* Result count */}
          {pagination && !loading && (
            <p className="text-sm text-muted-foreground">
              {pagination.total === 0
                ? "Nessun risultato"
                : `${pagination.total} ${
                    pagination.total === 1
                      ? "diapositiva trovata"
                      : "diapositive trovate"
                  }`}
            </p>
          )}

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-5">
              {Array.from({ length: 15 }).map((_, i) => (
                <SlideCardSkeleton key={i} />
              ))}
            </div>
          ) : slides.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <ImageOffIcon className="size-12 text-muted-foreground/40" />
              <h2 className="text-lg font-medium text-muted-foreground">
                {t("labels.noResults")}
              </h2>
              <p className="text-sm text-muted-foreground/70">
                {t("search.tryAdjusting")}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-5">
              {slides.map((slide) => (
                <SlideCard key={slide.id} slide={slide} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    text="Precedente"
                    onClick={() => handlePageChange(Math.max(1, page - 1))}
                    aria-disabled={page <= 1}
                    className={
                      page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"
                    }
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
                        onClick={() => handlePageChange(p)}
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
                      handlePageChange(
                        Math.min(pagination.totalPages, page + 1)
                      )
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
        </>
      )}
    </div>
  );
}
