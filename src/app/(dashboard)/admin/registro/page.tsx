"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { FileText, Filter, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { t } from "@/lib/i18n";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuditEntry {
  id: number;
  userId: number | null;
  action: string;
  entityType: string | null;
  entityId: number | null;
  details: Record<string, unknown> | null;
  createdAt: string;
  user?: {
    name: string | null;
    email: string;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ACTION_TYPES = [
  { value: "", label: "Tutte le azioni" },
  { value: "login", label: "Accesso" },
  { value: "logout", label: "Disconnessione" },
  { value: "create_user", label: "Creazione utente" },
  { value: "update_user", label: "Modifica utente" },
  { value: "deactivate_user", label: "Disattivazione utente" },
  { value: "create_api_key", label: "Creazione chiave API" },
  { value: "revoke_api_key", label: "Revoca chiave API" },
  { value: "upload", label: "Caricamento" },
  { value: "update_slide", label: "Modifica diapositiva" },
  { value: "delete_slide", label: "Eliminazione diapositiva" },
  { value: "backup_start", label: "Avvio backup" },
  { value: "backup_complete", label: "Backup completato" },
  { value: "backup_failed", label: "Backup fallito" },
  { value: "config_update", label: "Modifica configurazione" },
];

function actionBadge(action: string) {
  if (action.startsWith("login") || action.startsWith("logout")) {
    return (
      <Badge className="bg-blue-600 text-white hover:bg-blue-700">
        {actionLabel(action)}
      </Badge>
    );
  }
  if (action.includes("create") || action.includes("upload")) {
    return (
      <Badge className="bg-green-600 text-white hover:bg-green-700">
        {actionLabel(action)}
      </Badge>
    );
  }
  if (action.includes("update") || action.includes("config")) {
    return (
      <Badge className="bg-yellow-600 text-white hover:bg-yellow-700">
        {actionLabel(action)}
      </Badge>
    );
  }
  if (
    action.includes("delete") ||
    action.includes("deactivate") ||
    action.includes("revoke") ||
    action.includes("failed")
  ) {
    return <Badge variant="destructive">{actionLabel(action)}</Badge>;
  }
  if (action.includes("backup")) {
    return (
      <Badge className="bg-purple-600 text-white hover:bg-purple-700">
        {actionLabel(action)}
      </Badge>
    );
  }
  return <Badge variant="secondary">{actionLabel(action)}</Badge>;
}

function actionLabel(action: string): string {
  const found = ACTION_TYPES.find((a) => a.value === action);
  return found ? found.label : action;
}

function entityTypeLabel(type: string | null): string {
  if (!type) return "—";
  switch (type) {
    case "user":
      return "Utente";
    case "slide":
      return "Diapositiva";
    case "magazine":
      return "Caricatore";
    case "collection":
      return "Collezione";
    case "api_key":
      return "Chiave API";
    case "backup":
      return "Backup";
    case "config":
      return "Configurazione";
    default:
      return type;
  }
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function RegistroPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionFilter, setActionFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const limit = 20;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (actionFilter) params.set("action", actionFilter);
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);

      const res = await fetch(`/api/v1/audit-log?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setEntries(data.entries ?? []);
        setTotalPages(data.totalPages ?? 1);
      }
    } catch {
      toast.error("Errore nel caricamento del registro.");
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  function applyFilters() {
    setPage(1);
    fetchLogs();
  }

  function resetFilters() {
    setActionFilter("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Registro attivit&agrave;
          </h1>
          <p className="text-muted-foreground">
            Cronologia di tutte le azioni eseguite nel sistema.
          </p>
        </div>
        <Button variant="outline" onClick={fetchLogs}>
          <RefreshCw className="size-4 mr-1.5" />
          Aggiorna
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Filter className="size-4" />
            Filtri
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="grid gap-1.5 min-w-[200px]">
              <Label>Tipo azione</Label>
              <Select
                value={actionFilter || "__all__"}
                onValueChange={(v) => {
                  if (v) setActionFilter(v === "__all__" ? "" : v);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Tutte le azioni" />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_TYPES.map((a) => (
                    <SelectItem
                      key={a.value || "__all__"}
                      value={a.value || "__all__"}
                    >
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="date-from">Dal</Label>
              <Input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="date-to">Al</Label>
              <Input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>

            <Button onClick={applyFilters}>Filtra</Button>
            <Button variant="outline" onClick={resetFilters}>
              Resetta
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Log table */}
      <Card>
        <CardContent className="pt-4">
          {loading ? (
            <p className="text-muted-foreground py-8 text-center">
              {t("labels.loading")}
            </p>
          ) : entries.length === 0 ? (
            <div className="py-8 text-center">
              <FileText className="mx-auto mb-2 size-8 text-muted-foreground" />
              <p className="text-muted-foreground">
                Nessuna voce nel registro per i filtri selezionati.
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("labels.date")}</TableHead>
                    <TableHead>{t("roles.user")}</TableHead>
                    <TableHead>Azione</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Dettagli</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-xs">
                        {new Date(entry.createdAt).toLocaleString("it-IT")}
                      </TableCell>
                      <TableCell>
                        {entry.user?.name ??
                          entry.user?.email ??
                          (entry.userId
                            ? `Utente #${entry.userId}`
                            : "Sistema")}
                      </TableCell>
                      <TableCell>{actionBadge(entry.action)}</TableCell>
                      <TableCell>
                        {entityTypeLabel(entry.entityType)}
                        {entry.entityId && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            #{entry.entityId}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate text-xs text-muted-foreground">
                        {entry.details
                          ? JSON.stringify(entry.details)
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          text="Precedente"
                          onClick={() => setPage(Math.max(1, page - 1))}
                          aria-disabled={page <= 1}
                          className={
                            page <= 1
                              ? "pointer-events-none opacity-50"
                              : ""
                          }
                        />
                      </PaginationItem>

                      {Array.from(
                        { length: Math.min(totalPages, 5) },
                        (_, i) => {
                          let pageNum: number;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (page <= 3) {
                            pageNum = i + 1;
                          } else if (page >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = page - 2 + i;
                          }
                          return (
                            <PaginationItem key={pageNum}>
                              <PaginationLink
                                isActive={pageNum === page}
                                onClick={() => setPage(pageNum)}
                              >
                                {pageNum}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        }
                      )}

                      <PaginationItem>
                        <PaginationNext
                          text="Successiva"
                          onClick={() =>
                            setPage(Math.min(totalPages, page + 1))
                          }
                          aria-disabled={page >= totalPages}
                          className={
                            page >= totalPages
                              ? "pointer-events-none opacity-50"
                              : ""
                          }
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
