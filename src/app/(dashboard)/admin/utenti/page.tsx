"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Copy,
  Eye,
  EyeOff,
  Key,
  Pencil,
  Plus,
  ShieldAlert,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
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
import { useAuth } from "@/lib/auth/context";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface User {
  id: string;
  email: string;
  phone: string | null;
  name: string | null;
  role: string;
  otpChannel: string;
  active: boolean;
  createdAt: string;
}

// Mirrors GET /api/v1/api-keys: revoked keys are deleted server-side,
// so every key returned here is active.
interface ApiKey {
  id: number;
  name: string;
  userId: number;
  createdAt: string;
  lastUsedAt: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function roleBadge(role: string) {
  switch (role) {
    case "admin":
      return (
        <Badge className="border-transparent bg-primary/15 text-primary">
          Admin
        </Badge>
      );
    case "operator":
      return <Badge variant="secondary">Operatore</Badge>;
    case "viewer":
      return <Badge variant="outline">Visualizzatore</Badge>;
    default:
      return <Badge variant="secondary">{t("roles.user")}</Badge>;
  }
}

function statusBadge(active: boolean) {
  return active ? (
    <StatusBadge tone="success">{t("labels.active")}</StatusBadge>
  ) : (
    <StatusBadge tone="destructive">{t("labels.inactive")}</StatusBadge>
  );
}

// ---------------------------------------------------------------------------
// User Form Dialog (add / edit)
// ---------------------------------------------------------------------------

function UserFormDialog({
  user,
  open,
  onOpenChange,
  onSaved,
}: {
  user: User | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const isEdit = !!user;
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [role, setRole] = useState(user?.role ?? "operator");
  const [otpChannel, setOtpChannel] = useState(user?.otpChannel ?? "email");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(user?.name ?? "");
      setEmail(user?.email ?? "");
      setPhone(user?.phone ?? "");
      setRole(user?.role ?? "operator");
      setOtpChannel(user?.otpChannel ?? "email");
    }
  }, [open, user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { email, phone: phone || null, name, role, otpChannel };
      const res = isEdit
        ? await fetch(`/api/v1/users/${user.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/v1/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message ?? "Errore durante il salvataggio.");
        return;
      }
      toast.success(
        isEdit
          ? "Utente aggiornato con successo."
          : "Utente creato con successo."
      );
      onSaved();
      onOpenChange(false);
    } catch {
      toast.error("Errore di rete. Riprova.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEdit ? "Modifica utente" : "Nuovo utente"}
            </DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Modifica i dati dell'utente selezionato."
                : "Inserisci i dati per creare un nuovo utente."}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="user-name">Nome</Label>
              <Input
                id="user-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Mario Rossi"
                required
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="user-email">Email</Label>
              <Input
                id="user-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="mario@esempio.it"
                required
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="user-phone">Telefono</Label>
              <Input
                id="user-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+39 333 1234567"
              />
            </div>

            <div className="grid gap-1.5">
              <Label>Ruolo</Label>
              <Select value={role} onValueChange={(v) => { if (v) setRole(v); }}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="operator">Operatore</SelectItem>
                  <SelectItem value="viewer">Visualizzatore</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label>Canale OTP</Label>
              <Select value={otpChannel} onValueChange={(v) => { if (v) setOtpChannel(v); }}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <DialogClose
              render={<Button variant="outline" type="button" />}
            >
              Annulla
            </DialogClose>
            <Button type="submit" disabled={saving}>
              {saving ? "Salvataggio..." : isEdit ? "Salva" : "Crea utente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// API Key created dialog (show key once)
// ---------------------------------------------------------------------------

function ApiKeyCreatedDialog({
  apiKey,
  open,
  onOpenChange,
}: {
  apiKey: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [showKey, setShowKey] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(apiKey);
    toast.success(t("apiKeys.keyCopied"));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Chiave API generata</DialogTitle>
          <DialogDescription>
            Copia questa chiave adesso. Non sarà più visibile in seguito.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <Input
            readOnly
            type={showKey ? "text" : "password"}
            value={apiKey}
            className="font-mono text-xs"
          />
          <Button
            variant="ghost"
            size="icon"
            type="button"
            aria-label={showKey ? "Nascondi chiave" : "Mostra chiave"}
            onClick={() => setShowKey(!showKey)}
          >
            {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </Button>
          <Button
            variant="outline"
            size="icon"
            type="button"
            aria-label={t("apiKeys.copyKey")}
            onClick={handleCopy}
          >
            <Copy className="size-4" />
          </Button>
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Chiudi
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// API Keys panel (rendered inline in the expanded table row)
// ---------------------------------------------------------------------------

function UserApiKeys({
  userId,
  userName,
  isSelf,
}: {
  userId: string;
  userName: string | null;
  isSelf: boolean;
}) {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyName, setKeyName] = useState("");
  const [generating, setGenerating] = useState(false);
  const [createdKey, setCreatedKey] = useState("");
  const [showCreatedDialog, setShowCreatedDialog] = useState(false);

  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/api-keys?userId=${userId}`);
      const data = await res.json();
      if (data.success) {
        setKeys(
          (data.apiKeys ?? []).filter(
            (k: ApiKey) => String(k.userId) === String(userId)
          )
        );
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  async function generateKey() {
    if (!keyName.trim()) {
      toast.error("Inserisci un nome per la chiave.");
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch("/api/v1/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: keyName }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message ?? "Errore nella generazione.");
        return;
      }
      setCreatedKey(data.apiKey.key);
      setShowCreatedDialog(true);
      setKeyName("");
      fetchKeys();
    } catch {
      toast.error("Errore di rete.");
    } finally {
      setGenerating(false);
    }
  }

  async function revokeKey(keyId: number) {
    try {
      const res = await fetch(`/api/v1/api-keys/${keyId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message ?? "Errore nella revoca.");
        return;
      }
      toast.success("Chiave revocata con successo.");
      fetchKeys();
    } catch {
      toast.error("Errore di rete.");
    }
  }

  return (
    <>
      <ApiKeyCreatedDialog
        apiKey={createdKey}
        open={showCreatedDialog}
        onOpenChange={setShowCreatedDialog}
      />

      <div className="space-y-4">
        <div>
          <p className="flex items-center gap-2 text-sm font-medium">
            <Key className="size-4" aria-hidden />
            Chiavi API &mdash; {userName ?? "Utente"}
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {isSelf
              ? "Gestisci le chiavi API associate al tuo account."
              : "Le chiavi API possono essere generate solo dal proprio account: qui è disponibile l'elenco in sola lettura."}
          </p>
        </div>

        {/* Generate new key (only for the logged-in admin's own row: the API
            always assigns new keys to the authenticated user) */}
        {isSelf && (
          <div className="flex items-end gap-2">
            <div className="max-w-xs flex-1">
              <Label htmlFor={`key-name-${userId}`}>Nome chiave</Label>
              <Input
                id={`key-name-${userId}`}
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                placeholder="Es. Scanner locale"
                className="mt-1.5"
              />
            </div>
            <Button onClick={generateKey} disabled={generating} size="sm">
              <Plus className="size-4 mr-1" />
              {generating ? "Generazione..." : "Genera chiave"}
            </Button>
          </div>
        )}

        {/* Keys list */}
        {loading ? (
          <div className="space-y-2" aria-hidden>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : keys.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {t("apiKeys.noKeys")}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Creata il</TableHead>
                <TableHead>Ultimo utilizzo</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead>Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keys.map((k) => (
                <TableRow key={k.id}>
                  <TableCell className="font-medium">{k.name}</TableCell>
                  <TableCell className="font-mono text-xs tabular-nums">
                    {new Date(k.createdAt).toLocaleDateString("it-IT")}
                  </TableCell>
                  <TableCell className="font-mono text-xs tabular-nums">
                    {k.lastUsedAt
                      ? new Date(k.lastUsedAt).toLocaleDateString("it-IT")
                      : "Mai"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge tone="success">Attiva</StatusBadge>
                  </TableCell>
                  <TableCell>
                    <AlertDialog>
                      <AlertDialogTrigger
                        render={
                          <Button variant="destructive" size="xs">
                            <Trash2 className="size-3 mr-1" />
                            Revoca
                          </Button>
                        }
                      />
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Revocare la chiave?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            La chiave &quot;{k.name}&quot; non potr&agrave;
                            pi&ugrave; essere utilizzata. Questa azione
                            &egrave; irreversibile.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t("actions.cancel")}</AlertDialogCancel>
                          <AlertDialogAction
                            variant="destructive"
                            onClick={() => revokeKey(k.id)}
                          >
                            Revoca
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

const USERS_TABLE_COLUMNS = 7;

export default function UtentiPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | undefined>();
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/users");
      const data = await res.json();
      if (data.success) {
        setUsers(data.users ?? []);
      }
    } catch {
      toast.error("Errore nel caricamento degli utenti.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  function openAdd() {
    setEditingUser(undefined);
    setFormOpen(true);
  }

  function openEdit(user: User) {
    setEditingUser(user);
    setFormOpen(true);
  }

  async function deactivateUser(userId: string) {
    try {
      const res = await fetch(`/api/v1/users/${userId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message ?? "Errore nella disattivazione.");
        return;
      }
      toast.success("Utente disattivato con successo.");
      fetchUsers();
    } catch {
      toast.error("Errore di rete.");
    }
  }

  return (
    <div className="space-y-6">
      <PageMasthead
        size="md"
        eyebrow="Amministrazione"
        title={t("users.title")}
        count={loading ? null : users.length}
        countLabel={users.length === 1 ? "utente" : "utenti"}
        subtitle={t("users.subtitle")}
        action={
          <Button onClick={openAdd}>
            <UserPlus className="size-4 mr-1.5" />
            {t("users.createUser")}
          </Button>
        }
      />

      <UserFormDialog
        user={editingUser}
        open={formOpen}
        onOpenChange={setFormOpen}
        onSaved={fetchUsers}
      />

      <Card className="slide-reveal" style={{ animationDelay: "80ms" }}>
        <CardContent className="pt-4">
          {!loading && users.length === 0 ? (
            <EmptyMount
              icon={Users}
              title={t("users.noUsers")}
              hint="Crea il primo utente per dare accesso all'archivio."
              className="py-10"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("labels.name")}</TableHead>
                  <TableHead>{t("labels.email")}</TableHead>
                  <TableHead>{t("labels.phone")}</TableHead>
                  <TableHead>{t("labels.role")}</TableHead>
                  <TableHead>{t("users.otpChannel")}</TableHead>
                  <TableHead>{t("labels.status")}</TableHead>
                  <TableHead>Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-40" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-5 w-16 rounded-4xl" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-5 w-14 rounded-4xl" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-5 w-14 rounded-4xl" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-16" />
                        </TableCell>
                      </TableRow>
                    ))
                  : users.map((u) => (
                      <Fragment key={u.id}>
                        <TableRow>
                          <TableCell className="font-medium">
                            {u.name ?? "—"}
                          </TableCell>
                          <TableCell>{u.email}</TableCell>
                          <TableCell>{u.phone ?? "—"}</TableCell>
                          <TableCell>{roleBadge(u.role)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {u.otpChannel === "whatsapp"
                                ? "WhatsApp"
                                : "Email"}
                            </Badge>
                          </TableCell>
                          <TableCell>{statusBadge(u.active)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => openEdit(u)}
                                aria-label={`Modifica ${u.name ?? u.email}`}
                              >
                                <Pencil className="size-3.5" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon-xs"
                                className={cn(
                                  expandedUserId === u.id &&
                                    "bg-accent text-accent-foreground"
                                )}
                                aria-expanded={expandedUserId === u.id}
                                aria-label={`Chiavi API di ${u.name ?? u.email}`}
                                onClick={() =>
                                  setExpandedUserId(
                                    expandedUserId === u.id ? null : u.id
                                  )
                                }
                              >
                                <Key className="size-3.5" />
                              </Button>

                              {u.active && (
                                <AlertDialog>
                                  <AlertDialogTrigger
                                    render={
                                      <Button
                                        variant="ghost"
                                        size="icon-xs"
                                        aria-label={`Disattiva ${u.name ?? u.email}`}
                                      >
                                        <ShieldAlert className="size-3.5 text-destructive" />
                                      </Button>
                                    }
                                  />
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>
                                        Disattivare l&apos;utente?
                                      </AlertDialogTitle>
                                      <AlertDialogDescription>
                                        L&apos;utente &quot;
                                        {u.name ?? u.email}&quot; non
                                        potr&agrave; pi&ugrave; accedere al
                                        sistema. Potrai riattivarlo in seguito.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>
                                        {t("actions.cancel")}
                                      </AlertDialogCancel>
                                      <AlertDialogAction
                                        variant="destructive"
                                        onClick={() => deactivateUser(u.id)}
                                      >
                                        Disattiva
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>

                        {/* Inline API keys panel for the expanded user */}
                        {expandedUserId === u.id && (
                          <TableRow className="bg-muted/30 hover:bg-muted/30">
                            <TableCell
                              colSpan={USERS_TABLE_COLUMNS}
                              className="p-4"
                            >
                              <UserApiKeys
                                userId={u.id}
                                userName={u.name}
                                isSelf={
                                  currentUser != null &&
                                  String(currentUser.id) === String(u.id)
                                }
                              />
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
