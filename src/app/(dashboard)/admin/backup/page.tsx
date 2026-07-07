"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Clock,
  Database,
  HardDrive,
  Play,
  RefreshCw,
  Server,
  Settings2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageMasthead } from "@/components/page-masthead";
import { StatusBadge } from "@/components/status-badge";
import { EmptyMount } from "@/components/state-views";
import { t } from "@/lib/i18n";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BackupStatus {
  id: string;
  destination: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  totalBytes: number;
  slidesCount: number;
  error: string | null;
  progress?: number;
}

interface BackupHistoryEntry {
  id: string;
  destination: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  totalBytes: number;
  slidesCount: number;
  error: string | null;
}

interface ScheduleInfo {
  enabled: boolean;
  cron: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatDuration(start: string, end: string | null): string {
  if (!end) return "In corso...";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

function backupStatusBadge(status: string) {
  switch (status) {
    case "completed":
    case "success":
      return <StatusBadge tone="success">Riuscito</StatusBadge>;
    case "failed":
    case "error":
      return <StatusBadge tone="destructive">Fallito</StatusBadge>;
    case "running":
    case "in_progress":
      return (
        <StatusBadge tone="warning" pulse>
          In corso
        </StatusBadge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function destinationLabel(dest: string) {
  switch (dest) {
    case "s3":
      return "Amazon S3";
    case "nas":
      return "NAS locale";
    default:
      return dest;
  }
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function BackupSkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      <div className="grid gap-4 md:grid-cols-2">
        {[0, 1].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-44" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function BackupPage() {
  const [status, setStatus] = useState<BackupStatus | null>(null);
  const [history, setHistory] = useState<BackupHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [destination, setDestination] = useState("s3");
  const [triggering, setTriggering] = useState(false);
  const [schedule, setSchedule] = useState<ScheduleInfo | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isBackupRunning =
    status?.status === "running" || status?.status === "in_progress";

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/backup/status");
      const data = await res.json();
      if (data.success) {
        setStatus(data.backup ?? null);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/backup/history?limit=20");
      const data = await res.json();
      if (data.success) {
        setHistory(data.backups ?? []);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const fetchSchedule = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/config");
      const data = await res.json();
      if (data.success) {
        const cfg = (data.config ?? {}) as Record<string, unknown>;
        setSchedule({
          enabled:
            cfg.scheduleEnabled === true || cfg.scheduleEnabled === "true",
          cron:
            typeof cfg.cronExpression === "string" && cfg.cronExpression
              ? cfg.cronExpression
              : "0 2 * * *",
        });
      }
    } catch {
      /* ignore: the card falls back to a neutral message */
    }
  }, []);

  const fetchAll = useCallback(async () => {
    await Promise.all([fetchStatus(), fetchHistory()]);
    setLoading(false);
  }, [fetchStatus, fetchHistory]);

  useEffect(() => {
    fetchAll();
    fetchSchedule();
  }, [fetchAll, fetchSchedule]);

  // Auto-refresh every 10 seconds when backup is running
  useEffect(() => {
    if (isBackupRunning) {
      intervalRef.current = setInterval(() => {
        fetchAll();
      }, 10_000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isBackupRunning, fetchAll]);

  async function triggerBackup() {
    setTriggering(true);
    try {
      const res = await fetch("/api/v1/backup/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message ?? "Errore nell'avvio del backup.");
        return;
      }
      toast.success(data.message ?? "Backup avviato con successo.");
      fetchAll();
    } catch {
      toast.error("Errore di rete.");
    } finally {
      setTriggering(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageMasthead
        size="md"
        eyebrow="Amministrazione"
        title="Gestione backup"
        subtitle="Controlla lo stato dei backup e avvia backup manuali."
        action={
          <Button variant="outline" onClick={fetchAll}>
            <RefreshCw className="size-4 mr-1.5" />
            {t("actions.refresh")}
          </Button>
        }
      />

      {loading ? (
        <BackupSkeleton />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {/* Status card */}
            <Card className="slide-reveal" style={{ animationDelay: "60ms" }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="size-4" />
                  Stato ultimo backup
                </CardTitle>
              </CardHeader>
              <CardContent>
                {status ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Data</span>
                      <span className="font-mono text-sm font-medium tabular-nums">
                        {new Date(status.startedAt).toLocaleString("it-IT")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Stato</span>
                      {backupStatusBadge(status.status)}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Dimensione</span>
                      <span className="font-mono text-sm font-medium tabular-nums">
                        {formatBytes(status.totalBytes)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        Destinazione
                      </span>
                      <span className="font-medium">
                        {destinationLabel(status.destination)}
                      </span>
                    </div>

                    {isBackupRunning && (
                      <div className="pt-2">
                        <Progress value={status.progress ?? 0}>
                          <ProgressLabel>Progresso</ProgressLabel>
                          <ProgressValue />
                        </Progress>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Nessun backup effettuato.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Trigger backup card */}
            <Card className="slide-reveal" style={{ animationDelay: "120ms" }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="size-4" />
                  Avvia backup manuale
                </CardTitle>
                <CardDescription>
                  Scegli la destinazione e avvia un backup adesso.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid gap-1.5">
                    <Label>Destinazione</Label>
                    <Select
                      value={destination}
                      onValueChange={(v) => {
                        if (v) setDestination(v);
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="s3">
                          <Server className="size-4 mr-1.5 inline" />
                          Amazon S3
                        </SelectItem>
                        <SelectItem value="nas">
                          <HardDrive className="size-4 mr-1.5 inline" />
                          NAS locale
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <AlertDialog>
                    <AlertDialogTrigger
                      render={
                        <Button
                          className="w-full"
                          disabled={triggering || isBackupRunning}
                        >
                          <Play className="size-4 mr-1.5" />
                          {isBackupRunning
                            ? "Backup in corso..."
                            : "Avvia backup adesso"}
                        </Button>
                      }
                    />
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Vuoi avviare un backup?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Verr&agrave; avviato un backup completo verso{" "}
                          {destinationLabel(destination)}. L&apos;operazione
                          potrebbe richiedere diversi minuti.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>
                          {t("actions.cancel")}
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={triggerBackup}>
                          Avvia backup
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Schedule summary (read-only: configured in Impostazioni) */}
          <Card className="slide-reveal" style={{ animationDelay: "180ms" }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="size-4" />
                Pianificazione backup
              </CardTitle>
              <CardDescription>
                L&apos;esecuzione automatica si configura nelle impostazioni.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">Backup automatico</p>
                    {schedule ? (
                      schedule.enabled ? (
                        <StatusBadge tone="success">
                          {t("labels.enabled")}
                        </StatusBadge>
                      ) : (
                        <StatusBadge tone="neutral">
                          {t("labels.disabled")}
                        </StatusBadge>
                      )
                    ) : (
                      <Skeleton className="h-5 w-20 rounded-4xl" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {schedule?.enabled ? (
                      <>
                        Espressione cron:{" "}
                        <span className="font-mono text-xs">
                          {schedule.cron}
                        </span>
                      </>
                    ) : (
                      "Nessuna esecuzione automatica pianificata."
                    )}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  nativeButton={false}
                  render={<Link href="/admin/impostazioni" />}
                >
                  <Settings2 className="size-4 mr-1.5" />
                  Configura pianificazione
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Backup history */}
          <Card className="slide-reveal" style={{ animationDelay: "240ms" }}>
            <CardHeader>
              <CardTitle>{t("backup.history")}</CardTitle>
              <CardDescription>
                Elenco degli ultimi backup effettuati.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <EmptyMount
                  icon={Database}
                  title={t("backup.noBackups")}
                  hint="Avvia il primo backup per proteggere l'archivio."
                  className="py-10"
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Stato</TableHead>
                      <TableHead>Destinazione</TableHead>
                      <TableHead>Dimensione</TableHead>
                      <TableHead>Durata</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="font-mono text-xs tabular-nums whitespace-nowrap">
                          {new Date(b.startedAt).toLocaleString("it-IT")}
                        </TableCell>
                        <TableCell>{backupStatusBadge(b.status)}</TableCell>
                        <TableCell>{destinationLabel(b.destination)}</TableCell>
                        <TableCell className="font-mono text-sm tabular-nums">
                          {formatBytes(b.totalBytes)}
                        </TableCell>
                        <TableCell className="font-mono text-sm tabular-nums">
                          {formatDuration(b.startedAt, b.completedAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
