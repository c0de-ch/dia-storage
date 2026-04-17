"use client";

import { useCallback, useEffect, useState } from "react";
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
import { t } from "@/lib/i18n";

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

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  userId: string;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  active: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function roleBadge(role: string) {
  switch (role) {
    case "admin":
      return (
        <Badge className="bg-blue-600 text-white hover:bg-blue-700">
          Admin
        </Badge>
      );
    default:
      return <Badge variant="secondary">{t("roles.user")}</Badge>;
  }
}

function statusBadge(active: boolean) {
  return active ? (
    <Badge className="bg-green-600 text-white hover:bg-green-700">
      Attivo
    </Badge>
  ) : (
    <Badge variant="destructive">Disattivato</Badge>
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
    toast.success("Chiave copiata negli appunti.");
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
            onClick={() => setShowKey(!showKey)}
          >
            {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </Button>
          <Button variant="outline" size="icon" type="button" onClick={handleCopy}>
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
// API Keys section per user
// ---------------------------------------------------------------------------

function UserApiKeys({
  userId,
  userName,
}: {
  userId: string;
  userName: string | null;
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
          (data.apiKeys ?? []).filter((k: ApiKey) => k.userId === userId)
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

  async function revokeKey(keyId: string) {
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

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Key className="size-4" />
            Chiavi API &mdash; {userName ?? "Utente"}
          </CardTitle>
          <CardDescription>
            Gestisci le chiavi API associate a questo utente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Generate new key */}
          <div className="mb-4 flex items-end gap-2">
            <div className="flex-1">
              <Label htmlFor={`key-name-${userId}`}>Nome chiave</Label>
              <Input
                id={`key-name-${userId}`}
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                placeholder="Es. Scanner locale"
              />
            </div>
            <Button
              onClick={generateKey}
              disabled={generating}
              size="sm"
            >
              <Plus className="size-4 mr-1" />
              {generating ? "Generazione..." : "Genera chiave"}
            </Button>
          </div>

          {/* Keys list */}
          {loading ? (
            <p className="text-muted-foreground text-sm">{t("labels.loading")}</p>
          ) : keys.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nessuna chiave API presente.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Prefisso</TableHead>
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
                    <TableCell className="font-mono text-xs">
                      {k.prefix}...
                    </TableCell>
                    <TableCell>
                      {new Date(k.createdAt).toLocaleDateString("it-IT")}
                    </TableCell>
                    <TableCell>
                      {k.lastUsedAt
                        ? new Date(k.lastUsedAt).toLocaleDateString("it-IT")
                        : "Mai"}
                    </TableCell>
                    <TableCell>
                      {k.active ? (
                        <Badge className="bg-green-600 text-white hover:bg-green-700">
                          Attiva
                        </Badge>
                      ) : (
                        <Badge variant="destructive">Revocata</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {k.active && (
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
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function UtentiPage() {
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("users.title")}
          </h1>
          <p className="text-muted-foreground">
            {t("users.subtitle")}
          </p>
        </div>
        <Button onClick={openAdd}>
          <UserPlus className="size-4 mr-1.5" />
          {t("users.createUser")}
        </Button>
      </div>

      <UserFormDialog
        user={editingUser}
        open={formOpen}
        onOpenChange={setFormOpen}
        onSaved={fetchUsers}
      />

      <Card>
        <CardContent className="pt-4">
          {loading ? (
            <p className="text-muted-foreground py-8 text-center">
              {t("labels.loading")}
            </p>
          ) : users.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">
              {t("users.noUsers")}
            </p>
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
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      {u.name ?? "—"}
                    </TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{u.phone ?? "—"}</TableCell>
                    <TableCell>{roleBadge(u.role)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {u.otpChannel === "whatsapp" ? "WhatsApp" : "Email"}
                      </Badge>
                    </TableCell>
                    <TableCell>{statusBadge(u.active)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => openEdit(u)}
                          title="Modifica"
                        >
                          <Pencil className="size-3.5" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() =>
                            setExpandedUserId(
                              expandedUserId === u.id ? null : u.id
                            )
                          }
                          title="Chiavi API"
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
                                  title="Disattiva"
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
                                  L&apos;utente &quot;{u.name ?? u.email}&quot;
                                  non potr&agrave; pi&ugrave; accedere al
                                  sistema. Potrai riattivarlo in seguito.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t("actions.cancel")}</AlertDialogCancel>
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
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* API Keys section for expanded user */}
      {expandedUserId && (
        <UserApiKeys
          userId={expandedUserId}
          userName={
            users.find((u) => u.id === expandedUserId)?.name ?? null
          }
        />
      )}
    </div>
  );
}
