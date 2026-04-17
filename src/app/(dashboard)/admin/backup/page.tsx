"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Database,
  HardDrive,
  Play,
  RefreshCw,
  Server,
  Clock,
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
import { Switch } from "@/components/ui/switch";
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
      return (
        <Badge className="bg-green-600 text-white hover:bg-green-700">
          Riuscito
        </Badge>
      );
    case "failed":
    case "error":
      return <Badge variant="destructive">Fallito</Badge>;
    case "running":
    case "in_progress":
      return (
        <Badge className="bg-yellow-500 text-white hover:bg-yellow-600">
          In corso
        </Badge>
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
// Main page
// ---------------------------------------------------------------------------

export default function BackupPage() {
  const [status, setStatus] = useState<BackupStatus | null>(null);
  const [history, setHistory] = useState<BackupHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [destination, setDestination] = useState("s3");
  const [triggering, setTriggering] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Schedule mock state (would come from config API in prod)
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleFrequency] = useState("Ogni giorno");
  const [scheduleTime] = useState("02:00");

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

  const fetchAll = useCallback(async () => {
    await Promise.all([fetchStatus(), fetchHistory()]);
    setLoading(false);
  }, [fetchStatus, fetchHistory]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-muted-foreground">{t("labels.loading")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Gestione backup
          </h1>
          <p className="text-muted-foreground">
            Controlla lo stato dei backup e avvia backup manuali.
          </p>
        </div>
        <Button variant="outline" onClick={fetchAll}>
          <RefreshCw className="size-4 mr-1.5" />
          Aggiorna
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Status card */}
        <Card>
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
                  <span className="font-medium">
                    {new Date(status.startedAt).toLocaleString("it-IT")}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Stato</span>
                  {backupStatusBadge(status.status)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Dimensione</span>
                  <span className="font-medium">
                    {formatBytes(status.totalBytes)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Destinazione</span>
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
        <Card>
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
                <Select value={destination} onValueChange={(v) => { if (v) setDestination(v); }}>
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
                    <AlertDialogTitle>Vuoi avviare un backup?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Verr&agrave; avviato un backup completo verso{" "}
                      {destinationLabel(destination)}. L&apos;operazione
                      potrebbe richiedere diversi minuti.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("actions.cancel")}</AlertDialogCancel>
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

      {/* Schedule config card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="size-4" />
            Pianificazione backup
          </CardTitle>
          <CardDescription>
            Configura l&apos;esecuzione automatica dei backup.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium">Backup automatico</p>
              <p className="text-sm text-muted-foreground">
                {scheduleEnabled
                  ? `${scheduleFrequency} alle ${scheduleTime}`
                  : "Disattivato"}
              </p>
            </div>
            <Switch
              checked={scheduleEnabled}
              onCheckedChange={setScheduleEnabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* Backup history */}
      <Card>
        <CardHeader>
          <CardTitle>Cronologia backup</CardTitle>
          <CardDescription>
            Elenco degli ultimi backup effettuati.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center text-sm">
              Nessun backup nella cronologia.
            </p>
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
                    <TableCell>
                      {new Date(b.startedAt).toLocaleString("it-IT")}
                    </TableCell>
                    <TableCell>{backupStatusBadge(b.status)}</TableCell>
                    <TableCell>{destinationLabel(b.destination)}</TableCell>
                    <TableCell>{formatBytes(b.totalBytes)}</TableCell>
                    <TableCell>
                      {formatDuration(b.startedAt, b.completedAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
