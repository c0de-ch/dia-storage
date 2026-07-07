"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CalendarIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  FilmIcon,
  ImageOffIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import { PageMasthead } from "@/components/page-masthead";
import { EmptyMount, ErrorState } from "@/components/state-views";
import { t } from "@/lib/i18n";
import { SlideCard, SlideCardSkeleton } from "@/components/slide-card";
import type { Slide, PaginationInfo } from "@/types/slide";

interface Magazine {
  id: number;
  name: string;
}

interface SearchSuggestions {
  locations: string[];
  years: string[];
}

export default function RicercaPage() {
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  // ?avanzata=1 deep-links with the advanced panel open (e.g. from the
  // "Caricatori" stat card on the dashboard)
  const [advancedOpen, setAdvancedOpen] = useState(
    searchParams.get("avanzata") === "1"
  );
  // Suggestions derived from the archive (top locations and years), so
  // every chip is guaranteed to return results.
  const [suggestions, setSuggestions] = useState<SearchSuggestions | null>(
    null
  );

  // Advanced filters (only fields the search API actually supports)
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [magazineFilter, setMagazineFilter] = useState("");

  // Results
  const [slides, setSlides] = useState<Slide[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(1);
  const [magazines, setMagazines] = useState<Magazine[]>([]);

  const hasActiveFilters = Boolean(dateFrom || dateTo || magazineFilter);

  // Fetch magazines for filter
  useEffect(() => {
    fetch("/api/v1/magazines")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.magazines) setMagazines(data.magazines);
      })
      .catch(() => {});
  }, []);

  // Fetch data-driven suggestions
  useEffect(() => {
    fetch("/api/v1/search/suggestions")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setSuggestions({
            locations: data.locations ?? [],
            years: data.years ?? [],
          });
        }
      })
      .catch(() => {});
  }, []);

  const doSearch = useCallback(
    async (searchPage = 1, queryOverride?: string) => {
      setLoading(true);
      setSearched(true);
      setError(false);
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
        if (!res.ok || !data.success) {
          throw new Error(data.message ?? "Ricerca non riuscita");
        }
        setSlides(data.slides);
        setPagination(data.pagination);
      } catch (err) {
        console.error("Errore nella ricerca:", err);
        setError(true);
        toast.error("Impossibile completare la ricerca. Riprova più tardi.");
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

  /** Single entry point for a new search with the live input value. */
  function submitSearch(value: string) {
    setQuery(value);
    setPage(1);
    doSearch(1, value);
  }

  function handlePageChange(newPage: number) {
    setPage(newPage);
    doSearch(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleQueryChange(value: string) {
    setQuery(value);
  }

  function handleSuggestionClick(suggestion: string) {
    submitSearch(suggestion);
  }

  function clearFilters() {
    setDateFrom("");
    setDateTo("");
    setMagazineFilter("");
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
      {/* Editorial masthead */}
      <PageMasthead
        eyebrow="Archivio · Ricerca"
        title={t("search.title")}
        count={
          searched
            ? loading || error || !pagination
              ? null
              : pagination.total
            : undefined
        }
        countLabel={
          searched
            ? pagination?.total === 1
              ? "diapositiva trovata"
              : "diapositive trovate"
            : undefined
        }
        subtitle={t("search.subtitleLong")}
      />

      {/* Search form: Enter and the button both search with the live value */}
      <form
        className="slide-reveal flex gap-2"
        style={{ animationDelay: "60ms" }}
        onSubmit={(e) => {
          e.preventDefault();
          const live = new FormData(e.currentTarget).get("q");
          submitSearch(typeof live === "string" ? live : query);
        }}
      >
        <SearchBar
          name="q"
          value={query}
          onChange={handleQueryChange}
          onSubmit={submitSearch}
          placeholder={t("search.placeholder")}
          autoFocus
          className="flex-1"
        />
        <Button type="submit" disabled={loading}>
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
      </form>

      {/* Quick suggestions (top locations and years from the archive).
          Kept visible after a search so users can pivot. */}
      {suggestions &&
        (suggestions.locations.length > 0 || suggestions.years.length > 0) && (
          <div className="slide-reveal flex flex-wrap items-center gap-1.5" style={{ animationDelay: "120ms" }}>
            <span className="mr-1 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
              {t("search.suggestions")}
            </span>
            {suggestions.locations.map((s) => (
              <Badge
                key={`loc-${s}`}
                variant="secondary"
                className="cursor-pointer hover:bg-accent hover:text-accent-foreground"
                render={
                  <button
                    type="button"
                    onClick={() => handleSuggestionClick(s)}
                  />
                }
              >
                {s}
              </Badge>
            ))}
            {suggestions.years.map((s) => (
              <Badge
                key={`year-${s}`}
                variant="outline"
                className="cursor-pointer font-mono tabular-nums hover:bg-accent hover:text-accent-foreground"
                render={
                  <button
                    type="button"
                    onClick={() => handleSuggestionClick(s)}
                  />
                }
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
              {!advancedOpen && hasActiveFilters && (
                <Badge
                  variant="default"
                  className="ml-1 px-1.5 py-0 text-[10px]"
                >
                  !
                </Badge>
              )}
            </Button>
          }
        />
        <CollapsibleContent>
          <Card className="mt-3">
            <CardContent className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="adv-date-from">
                  <CalendarIcon className="mr-1 inline size-3" />
                  {t("search.dateFrom")}
                </Label>
                <Input
                  id="adv-date-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="adv-date-to">
                  <CalendarIcon className="mr-1 inline size-3" />
                  {t("search.dateTo")}
                </Label>
                <Input
                  id="adv-date-to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>
                  <FilmIcon className="mr-1 inline size-3" />
                  Caricatore
                </Label>
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
              {hasActiveFilters && (
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                  >
                    <XIcon className="mr-1 size-3.5" />
                    {t("search.clearFilters")}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Pre-search: empty light table invitation */}
      {!searched && (
        <div className="py-10">
          <div className="mx-auto flex justify-center gap-3 opacity-70" aria-hidden>
            <div
              data-slot="card"
              className="w-28 rotate-[-3deg] rounded-sm border bg-card p-1.5 shadow-sm"
            >
              <div className="aspect-[3/2] rounded-[3px] bg-muted" />
            </div>
            <div
              data-slot="card"
              className="slide-reveal w-28 rotate-[1.5deg] rounded-sm border bg-card p-1.5 shadow-sm"
              style={{ animationDelay: "180ms" }}
            >
              <div className="aspect-[3/2] rounded-[3px] bg-muted" />
            </div>
            <div
              data-slot="card"
              className="w-28 rotate-[3deg] rounded-sm border bg-card p-1.5 shadow-sm"
            >
              <div className="aspect-[3/2] rounded-[3px] bg-muted" />
            </div>
          </div>
          <p className="mt-6 text-center font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
            Cerca nell&apos;archivio per riempire il tavolo luminoso
          </p>
        </div>
      )}

      {/* Results */}
      {searched && (
        <>
          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-5">
              {Array.from({ length: 15 }).map((_, i) => (
                <SlideCardSkeleton key={i} />
              ))}
            </div>
          ) : error ? (
            <ErrorState
              message="Impossibile completare la ricerca."
              onRetry={() => doSearch(page)}
            />
          ) : slides.length === 0 ? (
            <EmptyMount
              icon={ImageOffIcon}
              title={t("search.noResults")}
              hint={t("search.tryAdjusting")}
              action={
                hasActiveFilters ? (
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    {t("search.clearFilters")}
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
                  <SlideCard slide={slide} selectable={false} />
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {!error && pagination && pagination.totalPages > 1 && (
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
