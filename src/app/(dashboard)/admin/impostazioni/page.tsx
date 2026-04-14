"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AppWindow,
  Archive,
  Bell,
  BotIcon,
  CheckCircle2,
  Clock,
  Copy,
  Eye,
  EyeOff,
  Globe,
  HardDrive,
  Key,
  Loader2,
  Lock,
  Mail,
  MessageSquare,
  Plus,
  RefreshCw,
  Save,
  Send,
  Server,
  Settings2,
  Shield,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import { Switch } from "@/components/ui/switch";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ConfigMap = Record<string, string | number | boolean>;

interface ApiKey {
  id: number;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
}

type TabId =
  | "generale"
  | "autenticazione"
  | "chiavi-api"
  | "email"
  | "whatsapp"
  | "archiviazione"
  | "backup-s3"
  | "backup-nas"
  | "pianificazione"
  | "assistente-ia";

interface NavGroup {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[];
}

const navGroups: NavGroup[] = [
  {
    label: "Applicazione",
    icon: AppWindow,
    items: [
      { id: "generale", label: "Generale", icon: Globe },
    ],
  },
  {
    label: "Sicurezza",
    icon: Shield,
    items: [
      { id: "autenticazione", label: "Autenticazione", icon: Lock },
      { id: "chiavi-api", label: "Chiavi API", icon: Key },
    ],
  },
  {
    label: "Notifiche",
    icon: Bell,
    items: [
      { id: "email", label: "Email SMTP", icon: Mail },
      { id: "whatsapp", label: "WhatsApp", icon: MessageSquare },
    ],
  },
  {
    label: "Archivio",
    icon: Archive,
    items: [
      { id: "archiviazione", label: "Archiviazione", icon: HardDrive },
      { id: "backup-s3", label: "Backup S3", icon: Server },
      { id: "backup-nas", label: "Backup NAS", icon: HardDrive },
      { id: "pianificazione", label: "Pianificazione", icon: Clock },
    ],
  },
  {
    label: "Avanzate",
    icon: Settings2,
    items: [
      { id: "assistente-ia", label: "Assistente IA", icon: BotIcon },
    ],
  },
];

// ---------------------------------------------------------------------------
// Masked field component
// ---------------------------------------------------------------------------

function MaskedField({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1"
        />
        <Button
          variant="ghost"
          size="icon"
          type="button"
          onClick={() => setVisible(!visible)}
        >
          {visible ? (
            <EyeOff className="size-4" />
          ) : (
            <Eye className="size-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Save button
// ---------------------------------------------------------------------------

function SaveButton({
  saving,
  onClick,
}: {
  saving: boolean;
  onClick: () => void;
}) {
  return (
    <Button onClick={onClick} disabled={saving} className="mt-4">
      <Save className="size-4 mr-1.5" />
      {saving ? "Salvataggio..." : "Salva impostazioni"}
    </Button>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function ImpostazioniPage() {
  const [config, setConfig] = useState<ConfigMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("generale");
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [ollamaModelsLoading, setOllamaModelsLoading] = useState(false);

  // API keys state
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [createdKey, setCreatedKey] = useState("");
  const [creatingKey, setCreatingKey] = useState(false);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/config");
      const data = await res.json();
      if (data.success) {
        setConfig(data.config ?? {});
      }
    } catch {
      toast.error("Errore nel caricamento della configurazione.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchApiKeys = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/api-keys");
      const data = await res.json();
      if (data.success) {
        setApiKeys(data.keys ?? []);
      }
    } catch {
      toast.error("Errore nel caricamento delle chiavi API.");
    }
  }, []);

  const fetchOllamaModels = useCallback(async (url?: string) => {
    const ollamaUrl = url ?? getStr("ollamaUrl", "http://localhost:11434");
    setOllamaModelsLoading(true);
    try {
      const res = await fetch("/api/v1/config/ollama-models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ollamaUrl }),
      });
      const data = await res.json();
      setOllamaModels(data.models ?? []);
    } catch {
      setOllamaModels([]);
    } finally {
      setOllamaModelsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  useEffect(() => {
    fetchConfig();
    fetchApiKeys();
  }, [fetchConfig, fetchApiKeys]);

  // Fetch Ollama models when provider is ollama and config loads
  useEffect(() => {
    if (!loading && getStr("aiProvider", "anthropic") === "ollama") {
      fetchOllamaModels();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, config["aiProvider"]]);

  function updateField(key: string, value: string | number | boolean) {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }

  function getStr(key: string, fallback = ""): string {
    const v = config[key];
    return v !== undefined && v !== null ? String(v) : fallback;
  }

  function getNum(key: string, fallback = 0): number {
    const v = config[key];
    if (typeof v === "number") return v;
    const n = Number(v);
    return isNaN(n) ? fallback : n;
  }

  function getBool(key: string, fallback = false): boolean {
    const v = config[key];
    if (typeof v === "boolean") return v;
    if (v === "true") return true;
    if (v === "false") return false;
    return fallback;
  }

  async function saveConfig(fields: Record<string, string | number | boolean>) {
    setSaving(true);
    try {
      const res = await fetch("/api/v1/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message ?? "Errore nel salvataggio.");
        return;
      }
      toast.success("Impostazioni salvate con successo.");
    } catch {
      toast.error("Errore di rete.");
    } finally {
      setSaving(false);
    }
  }

  async function testEndpoint(
    url: string,
    successMsg: string,
    errorMsg: string
  ) {
    try {
      const res = await fetch(url, { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(successMsg);
      } else {
        toast.error(data.message ?? errorMsg);
      }
    } catch {
      toast.error(errorMsg);
    }
  }

  async function createApiKey() {
    if (!newKeyName.trim()) {
      toast.error("Inserisci un nome per la chiave API.");
      return;
    }
    setCreatingKey(true);
    try {
      const res = await fetch("/api/v1/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCreatedKey(data.key);
        setNewKeyName("");
        toast.success("Chiave API creata con successo.");
        fetchApiKeys();
      } else {
        toast.error(data.message ?? "Errore nella creazione della chiave API.");
      }
    } catch {
      toast.error("Errore di rete.");
    } finally {
      setCreatingKey(false);
    }
  }

  async function deleteApiKey(id: number, name: string) {
    if (!window.confirm(`Eliminare la chiave "${name}"? Questa azione non può essere annullata.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/v1/api-keys/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Chiave API eliminata.");
        fetchApiKeys();
      } else {
        toast.error(data.message ?? "Errore nell'eliminazione della chiave API.");
      }
    } catch {
      toast.error("Errore di rete.");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-muted-foreground">Caricamento...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Impostazioni</h1>
        <p className="text-muted-foreground">
          Configura i parametri dell&apos;applicazione.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-6">
        {/* --- Vertical sidebar nav (desktop) / horizontal scroll (mobile) --- */}
        <nav className="shrink-0 sm:w-56 sm:border-r sm:pr-4">
          {/* Mobile: horizontal scrollable row */}
          <div className="flex gap-1 overflow-x-auto pb-2 sm:hidden">
            {navGroups.flatMap((g) =>
              g.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      activeTab === item.id
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
                    }`}
                  >
                    <Icon className="size-3.5" />
                    {item.label}
                  </button>
                );
              })
            )}
          </div>

          {/* Desktop: vertical grouped nav */}
          <div className="hidden sm:block space-y-1">
            {navGroups.map((group) => (
              <div key={group.label}>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 pt-4 pb-1">
                  {group.label}
                </p>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center gap-2 text-left px-3 py-2 rounded-md text-sm transition-colors ${
                        activeTab === item.id
                          ? "bg-accent text-accent-foreground font-medium"
                          : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
                      }`}
                    >
                      <Icon className="size-4" />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </nav>

        {/* --- Content panel --- */}
        <div className="flex-1 min-w-0">
          {/* ---- Generale ---- */}
          {activeTab === "generale" && (
            <Card>
              <CardHeader>
                <CardTitle>Impostazioni generali</CardTitle>
                <CardDescription>
                  Configura i parametri base dell&apos;applicazione.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 max-w-lg">
                  <div className="grid gap-1.5">
                    <Label htmlFor="app-name">Nome applicazione</Label>
                    <Input
                      id="app-name"
                      value={getStr("appName", "Dia-Storage")}
                      onChange={(e) => updateField("appName", e.target.value)}
                    />
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="app-locale">Lingua</Label>
                    <Input
                      id="app-locale"
                      value={getStr("locale", "it-IT")}
                      onChange={(e) => updateField("locale", e.target.value)}
                      placeholder="it-IT"
                    />
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="app-timezone">Fuso orario</Label>
                    <Input
                      id="app-timezone"
                      value={getStr("timezone", "Europe/Rome")}
                      onChange={(e) => updateField("timezone", e.target.value)}
                      placeholder="Europe/Rome"
                    />
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="date-format">Formato data</Label>
                    <Input
                      id="date-format"
                      value={getStr("dateFormat", "dd/MM/yyyy")}
                      onChange={(e) => updateField("dateFormat", e.target.value)}
                      placeholder="dd/MM/yyyy"
                    />
                  </div>

                  <SaveButton
                    saving={saving}
                    onClick={() =>
                      saveConfig({
                        appName: getStr("appName", "Dia-Storage"),
                        locale: getStr("locale", "it-IT"),
                        timezone: getStr("timezone", "Europe/Rome"),
                        dateFormat: getStr("dateFormat", "dd/MM/yyyy"),
                      })
                    }
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* ---- Autenticazione ---- */}
          {activeTab === "autenticazione" && (
            <Card>
              <CardHeader>
                <CardTitle>Autenticazione</CardTitle>
                <CardDescription>
                  Parametri di sessione e OTP.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 max-w-lg">
                  <div className="grid gap-1.5">
                    <Label htmlFor="session-duration">
                      Durata sessione (giorni)
                    </Label>
                    <Input
                      id="session-duration"
                      type="number"
                      min={1}
                      value={getNum("sessionExpiryDays", 30)}
                      onChange={(e) =>
                        updateField("sessionExpiryDays", Number(e.target.value))
                      }
                    />
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="otp-expiry">
                      Scadenza OTP (minuti)
                    </Label>
                    <Input
                      id="otp-expiry"
                      type="number"
                      min={1}
                      value={getNum("otpExpiryMinutes", 10)}
                      onChange={(e) =>
                        updateField("otpExpiryMinutes", Number(e.target.value))
                      }
                    />
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="otp-length">Lunghezza OTP</Label>
                    <Input
                      id="otp-length"
                      type="number"
                      min={4}
                      max={8}
                      value={getNum("otpLength", 6)}
                      onChange={(e) =>
                        updateField("otpLength", Number(e.target.value))
                      }
                    />
                  </div>

                  <div className="grid gap-1.5">
                    <Label>Canale OTP predefinito</Label>
                    <Select
                      value={getStr("defaultChannel", "email")}
                      onValueChange={(v) => { if (v) updateField("defaultChannel", v); }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="both">Entrambi</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <SaveButton
                    saving={saving}
                    onClick={() =>
                      saveConfig({
                        sessionExpiryDays: getNum("sessionExpiryDays", 30),
                        otpExpiryMinutes: getNum("otpExpiryMinutes", 10),
                        otpLength: getNum("otpLength", 6),
                        defaultChannel: getStr("defaultChannel", "email"),
                      })
                    }
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* ---- Chiavi API ---- */}
          {activeTab === "chiavi-api" && (
            <Card>
              <CardHeader>
                <CardTitle>Chiavi API</CardTitle>
                <CardDescription>
                  Gestisci le chiavi di accesso per le API esterne.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 max-w-lg">
                  {/* Create new key */}
                  <div className="grid gap-3">
                    <Label htmlFor="new-key-name">Nuova chiave</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="new-key-name"
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                        placeholder="Nome della chiave (es. uploader-script)"
                        className="flex-1"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") createApiKey();
                        }}
                      />
                      <Button
                        onClick={createApiKey}
                        disabled={creatingKey || !newKeyName.trim()}
                      >
                        {creatingKey ? (
                          <Loader2 className="size-4 mr-1.5 animate-spin" />
                        ) : (
                          <Plus className="size-4 mr-1.5" />
                        )}
                        Crea chiave
                      </Button>
                    </div>
                  </div>

                  {/* Newly created key display */}
                  {createdKey && (
                    <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4">
                      <p className="text-sm font-medium text-green-700 dark:text-green-400 mb-2">
                        Chiave creata! Copiala ora, non sarà più visibile.
                      </p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 rounded bg-muted px-3 py-2 text-sm font-mono break-all select-all">
                          {createdKey}
                        </code>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            navigator.clipboard.writeText(createdKey);
                            toast.success("Chiave copiata negli appunti.");
                          }}
                        >
                          <Copy className="size-4" />
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 text-xs"
                        onClick={() => setCreatedKey("")}
                      >
                        Nascondi
                      </Button>
                    </div>
                  )}

                  {/* Existing keys list */}
                  <div className="grid gap-2">
                    <p className="text-sm font-medium">Chiavi esistenti</p>
                    {apiKeys.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">
                        Nessuna chiave API configurata.
                      </p>
                    ) : (
                      <div className="divide-y rounded-lg border">
                        {apiKeys.map((key) => (
                          <div
                            key={key.id}
                            className="flex items-center justify-between gap-4 px-4 py-3"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">
                                {key.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Creata: {new Date(key.createdAt).toLocaleDateString("it-IT")}
                                {key.lastUsedAt && (
                                  <> &middot; Ultimo utilizzo: {new Date(key.lastUsedAt).toLocaleDateString("it-IT")}</>
                                )}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => deleteApiKey(key.id, key.name)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ---- Email SMTP ---- */}
          {activeTab === "email" && (
            <Card>
              <CardHeader>
                <CardTitle>Email SMTP</CardTitle>
                <CardDescription>
                  Configurazione del server di posta in uscita.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 max-w-lg">
                  <div className="grid gap-1.5">
                    <Label htmlFor="smtp-host">Host SMTP</Label>
                    <Input
                      id="smtp-host"
                      value={getStr("smtpHost")}
                      onChange={(e) => updateField("smtpHost", e.target.value)}
                      placeholder="smtp.esempio.it"
                    />
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="smtp-port">Porta</Label>
                    <Input
                      id="smtp-port"
                      type="number"
                      value={getNum("smtpPort", 587)}
                      onChange={(e) =>
                        updateField("smtpPort", Number(e.target.value))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="smtp-secure">Connessione sicura (TLS)</Label>
                    <Switch
                      id="smtp-secure"
                      checked={getBool("smtpSecure")}
                      onCheckedChange={(v) => updateField("smtpSecure", v)}
                    />
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="smtp-user">Utente</Label>
                    <Input
                      id="smtp-user"
                      value={getStr("smtpUser")}
                      onChange={(e) => updateField("smtpUser", e.target.value)}
                      placeholder="utente@esempio.it"
                    />
                  </div>

                  <MaskedField
                    id="smtp-password"
                    label="Password"
                    value={getStr("smtpPassword")}
                    onChange={(v) => updateField("smtpPassword", v)}
                    placeholder="Password SMTP"
                  />

                  <div className="grid gap-1.5">
                    <Label htmlFor="smtp-from-name">Nome mittente</Label>
                    <Input
                      id="smtp-from-name"
                      value={getStr("smtpFromName", "Dia-Storage")}
                      onChange={(e) =>
                        updateField("smtpFromName", e.target.value)
                      }
                    />
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="smtp-from-address">
                      Indirizzo mittente
                    </Label>
                    <Input
                      id="smtp-from-address"
                      type="email"
                      value={getStr("smtpFromAddress")}
                      onChange={(e) =>
                        updateField("smtpFromAddress", e.target.value)
                      }
                      placeholder="noreply@esempio.it"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <SaveButton
                      saving={saving}
                      onClick={() =>
                        saveConfig({
                          smtpHost: getStr("smtpHost"),
                          smtpPort: getNum("smtpPort", 587),
                          smtpSecure: getBool("smtpSecure"),
                          smtpUser: getStr("smtpUser"),
                          smtpPassword: getStr("smtpPassword"),
                          smtpFromName: getStr("smtpFromName", "Dia-Storage"),
                          smtpFromAddress: getStr("smtpFromAddress"),
                        })
                      }
                    />
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() =>
                        testEndpoint(
                          "/api/v1/config/test-email",
                          "Email di prova inviata con successo.",
                          "Errore nell'invio dell'email di prova."
                        )
                      }
                    >
                      <Send className="size-4 mr-1.5" />
                      Invia email di prova
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ---- WhatsApp ---- */}
          {activeTab === "whatsapp" && (
            <Card>
              <CardHeader>
                <CardTitle>WhatsApp</CardTitle>
                <CardDescription>
                  Configurazione invio OTP tramite WhatsApp Business API.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 max-w-lg">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="wa-enabled">Abilita WhatsApp</Label>
                    <Switch
                      id="wa-enabled"
                      checked={getBool("whatsappEnabled")}
                      onCheckedChange={(v) => updateField("whatsappEnabled", v)}
                    />
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="wa-phone-id">Phone Number ID</Label>
                    <Input
                      id="wa-phone-id"
                      value={getStr("whatsappPhoneNumberId")}
                      onChange={(e) =>
                        updateField("whatsappPhoneNumberId", e.target.value)
                      }
                      placeholder="1234567890"
                    />
                  </div>

                  <MaskedField
                    id="wa-access-token"
                    label="Access Token"
                    value={getStr("whatsappAccessToken")}
                    onChange={(v) => updateField("whatsappAccessToken", v)}
                    placeholder="Token di accesso"
                  />

                  <div className="grid gap-1.5">
                    <Label htmlFor="wa-template">Nome template</Label>
                    <Input
                      id="wa-template"
                      value={getStr("whatsappTemplateName", "otp_login")}
                      onChange={(e) =>
                        updateField("whatsappTemplateName", e.target.value)
                      }
                      placeholder="otp_login"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <SaveButton
                      saving={saving}
                      onClick={() =>
                        saveConfig({
                          whatsappEnabled: getBool("whatsappEnabled"),
                          whatsappPhoneNumberId: getStr("whatsappPhoneNumberId"),
                          whatsappAccessToken: getStr("whatsappAccessToken"),
                          whatsappTemplateName: getStr(
                            "whatsappTemplateName",
                            "otp_login"
                          ),
                        })
                      }
                    />
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() =>
                        testEndpoint(
                          "/api/v1/config/test-whatsapp",
                          "Messaggio di prova inviato con successo.",
                          "Errore nell'invio del messaggio di prova."
                        )
                      }
                    >
                      <Send className="size-4 mr-1.5" />
                      Invia messaggio di prova
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ---- Archiviazione ---- */}
          {activeTab === "archiviazione" && (
            <Card>
              <CardHeader>
                <CardTitle>Archiviazione</CardTitle>
                <CardDescription>
                  Parametri di archiviazione delle diapositive.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 max-w-lg">
                  <div className="grid gap-1.5">
                    <Label htmlFor="storage-base-path">Percorso base</Label>
                    <Input
                      id="storage-base-path"
                      value={getStr("storagePath", "/data")}
                      onChange={(e) =>
                        updateField("storagePath", e.target.value)
                      }
                      placeholder="/data"
                    />
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="max-upload">
                      Dimensione massima upload (MB):{" "}
                      {getNum("maxUploadSizeMb", 100)}
                    </Label>
                    <input
                      id="max-upload"
                      type="range"
                      min={10}
                      max={500}
                      step={10}
                      value={getNum("maxUploadSizeMb", 100)}
                      onChange={(e) =>
                        updateField("maxUploadSizeMb", Number(e.target.value))
                      }
                      className="w-full accent-primary"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-1.5">
                      <Label htmlFor="thumb-width">
                        Larghezza miniatura (px)
                      </Label>
                      <Input
                        id="thumb-width"
                        type="number"
                        value={getNum("thumbnailWidth", 400)}
                        onChange={(e) =>
                          updateField("thumbnailWidth", Number(e.target.value))
                        }
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="thumb-quality">
                        Qualit&agrave; miniatura (%)
                      </Label>
                      <Input
                        id="thumb-quality"
                        type="number"
                        min={1}
                        max={100}
                        value={getNum("thumbnailQuality", 80)}
                        onChange={(e) =>
                          updateField(
                            "thumbnailQuality",
                            Number(e.target.value)
                          )
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-1.5">
                      <Label htmlFor="medium-width">
                        Larghezza media (px)
                      </Label>
                      <Input
                        id="medium-width"
                        type="number"
                        value={getNum("mediumWidth", 1600)}
                        onChange={(e) =>
                          updateField("mediumWidth", Number(e.target.value))
                        }
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="medium-quality">
                        Qualit&agrave; media (%)
                      </Label>
                      <Input
                        id="medium-quality"
                        type="number"
                        min={1}
                        max={100}
                        value={getNum("mediumQuality", 85)}
                        onChange={(e) =>
                          updateField("mediumQuality", Number(e.target.value))
                        }
                      />
                    </div>
                  </div>

                  {/* Disk usage progress bar */}
                  <div className="pt-2">
                    <Progress value={getNum("diskUsagePercent", 0)}>
                      <ProgressLabel>Utilizzo disco</ProgressLabel>
                      <ProgressValue />
                    </Progress>
                  </div>

                  <SaveButton
                    saving={saving}
                    onClick={() =>
                      saveConfig({
                        storagePath: getStr("storagePath", "/data"),
                        maxUploadSizeMb: getNum("maxUploadSizeMb", 100),
                        thumbnailWidth: getNum("thumbnailWidth", 400),
                        thumbnailQuality: getNum("thumbnailQuality", 80),
                        mediumWidth: getNum("mediumWidth", 1600),
                        mediumQuality: getNum("mediumQuality", 85),
                      })
                    }
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* ---- Backup S3 ---- */}
          {activeTab === "backup-s3" && (
            <Card>
              <CardHeader>
                <CardTitle>Backup S3</CardTitle>
                <CardDescription>
                  Configurazione del backup su storage compatibile S3.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 max-w-lg">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="s3-enabled">Abilita backup S3</Label>
                    <Switch
                      id="s3-enabled"
                      checked={getBool("s3Enabled")}
                      onCheckedChange={(v) => updateField("s3Enabled", v)}
                    />
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="s3-endpoint">Endpoint</Label>
                    <Input
                      id="s3-endpoint"
                      value={getStr("s3Endpoint")}
                      onChange={(e) =>
                        updateField("s3Endpoint", e.target.value)
                      }
                      placeholder="https://s3.amazonaws.com"
                    />
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="s3-bucket">Bucket</Label>
                    <Input
                      id="s3-bucket"
                      value={getStr("s3Bucket")}
                      onChange={(e) =>
                        updateField("s3Bucket", e.target.value)
                      }
                      placeholder="dia-storage-backup"
                    />
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="s3-region">Regione</Label>
                    <Input
                      id="s3-region"
                      value={getStr("s3Region", "eu-south-1")}
                      onChange={(e) =>
                        updateField("s3Region", e.target.value)
                      }
                      placeholder="eu-south-1"
                    />
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="s3-access-key">Access Key</Label>
                    <Input
                      id="s3-access-key"
                      value={getStr("s3AccessKey")}
                      onChange={(e) =>
                        updateField("s3AccessKey", e.target.value)
                      }
                      placeholder="AKIAIOSFODNN7EXAMPLE"
                    />
                  </div>

                  <MaskedField
                    id="s3-secret-key"
                    label="Secret Key"
                    value={getStr("s3SecretKey")}
                    onChange={(v) => updateField("s3SecretKey", v)}
                    placeholder="Chiave segreta"
                  />

                  <div className="flex items-center gap-2">
                    <SaveButton
                      saving={saving}
                      onClick={() =>
                        saveConfig({
                          s3Enabled: getBool("s3Enabled"),
                          s3Endpoint: getStr("s3Endpoint"),
                          s3Bucket: getStr("s3Bucket"),
                          s3Region: getStr("s3Region", "eu-south-1"),
                          s3AccessKey: getStr("s3AccessKey"),
                          s3SecretKey: getStr("s3SecretKey"),
                        })
                      }
                    />
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() =>
                        testEndpoint(
                          "/api/v1/config/test-s3",
                          "Connessione S3 verificata con successo.",
                          "Errore nella connessione S3."
                        )
                      }
                    >
                      <CheckCircle2 className="size-4 mr-1.5" />
                      Verifica connessione
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ---- Backup NAS ---- */}
          {activeTab === "backup-nas" && (
            <Card>
              <CardHeader>
                <CardTitle>Backup NAS</CardTitle>
                <CardDescription>
                  Configurazione del backup su NAS locale.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 max-w-lg">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="nas-enabled">Abilita backup NAS</Label>
                    <Switch
                      id="nas-enabled"
                      checked={getBool("nasEnabled")}
                      onCheckedChange={(v) => updateField("nasEnabled", v)}
                    />
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="nas-mount-path">Percorso di mount</Label>
                    <Input
                      id="nas-mount-path"
                      value={getStr("nasMountPath")}
                      onChange={(e) =>
                        updateField("nasMountPath", e.target.value)
                      }
                      placeholder="/mnt/nas/backup"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <SaveButton
                      saving={saving}
                      onClick={() =>
                        saveConfig({
                          nasEnabled: getBool("nasEnabled"),
                          nasMountPath: getStr("nasMountPath"),
                        })
                      }
                    />
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={async () => {
                        try {
                          const res = await fetch("/api/v1/config/test-nas", {
                            method: "POST",
                          });
                          const data = await res.json();
                          if (res.ok && data.success) {
                            toast.success(
                              "Verifica scrittura NAS riuscita."
                            );
                          } else {
                            toast.error(
                              data.message ??
                                "Errore nella verifica scrittura NAS."
                            );
                          }
                        } catch {
                          toast.error("Errore nella verifica scrittura NAS.");
                        }
                      }}
                    >
                      <Key className="size-4 mr-1.5" />
                      Verifica scrittura
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ---- Pianificazione ---- */}
          {activeTab === "pianificazione" && (
            <Card>
              <CardHeader>
                <CardTitle>Pianificazione backup</CardTitle>
                <CardDescription>
                  Configura l&apos;esecuzione automatica dei backup.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 max-w-lg">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="schedule-enabled">
                      Abilita pianificazione
                    </Label>
                    <Switch
                      id="schedule-enabled"
                      checked={getBool("scheduleEnabled")}
                      onCheckedChange={(v) => updateField("scheduleEnabled", v)}
                    />
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="cron-expression">
                      Espressione cron
                    </Label>
                    <Input
                      id="cron-expression"
                      value={getStr("cronExpression", "0 2 * * *")}
                      onChange={(e) =>
                        updateField("cronExpression", e.target.value)
                      }
                      placeholder="0 2 * * *"
                      className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                      Formato: minuto ora giorno mese giorno_settimana
                    </p>
                  </div>

                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-sm text-muted-foreground">
                      Prossima esecuzione prevista:
                    </p>
                    <p className="font-medium">
                      {getBool("scheduleEnabled")
                        ? "Calcolata in base all'espressione cron configurata"
                        : "Pianificazione disattivata"}
                    </p>
                  </div>

                  <SaveButton
                    saving={saving}
                    onClick={() =>
                      saveConfig({
                        scheduleEnabled: getBool("scheduleEnabled"),
                        cronExpression: getStr("cronExpression", "0 2 * * *"),
                      })
                    }
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* ---- Assistente IA ---- */}
          {activeTab === "assistente-ia" && (
            <Card>
              <CardHeader>
                <CardTitle>Assistente IA (Claude)</CardTitle>
                <CardDescription>
                  Configura l&apos;integrazione con Claude di Anthropic per
                  l&apos;assistente vocale. L&apos;assistente risponde alle domande
                  degli utenti sull&apos;applicazione.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 max-w-lg">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="ai-enabled">Abilita assistente IA</Label>
                    <Switch
                      id="ai-enabled"
                      checked={getBool("aiEnabled")}
                      onCheckedChange={(v) => updateField("aiEnabled", v)}
                    />
                  </div>

                  {/* Provider selection */}
                  <div className="grid gap-1.5">
                    <Label>Provider</Label>
                    <Select
                      value={getStr("aiProvider", "anthropic")}
                      onValueChange={(v) => { if (v) updateField("aiProvider", v); }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="anthropic">Claude (Anthropic)</SelectItem>
                        <SelectItem value="ollama">Modello locale (Ollama)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Anthropic settings */}
                  {getStr("aiProvider", "anthropic") === "anthropic" && (
                    <>
                      <MaskedField
                        id="anthropic-api-key"
                        label="Chiave API Anthropic"
                        value={getStr("anthropicApiKey")}
                        onChange={(v) => updateField("anthropicApiKey", v)}
                        placeholder="sk-ant-..."
                      />

                      <div className="grid gap-1.5">
                        <Label htmlFor="ai-model">Modello</Label>
                        <Select
                          value={getStr("aiModel", "claude-haiku-4-5-20251001")}
                          onValueChange={(v) => { if (v) updateField("aiModel", v); }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="claude-haiku-4-5-20251001">
                              Claude Haiku 4.5 (veloce, economico)
                            </SelectItem>
                            <SelectItem value="claude-sonnet-4-6">
                              Claude Sonnet 4.6 (bilanciato)
                            </SelectItem>
                            <SelectItem value="claude-opus-4-6">
                              Claude Opus 4.6 (avanzato)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-1.5">
                        <Label htmlFor="ai-max-monthly-usd">
                          Limite spesa mensile (USD): ${getNum("aiMaxMonthlyUsd", 5).toFixed(2)}
                        </Label>
                        <input
                          id="ai-max-monthly-usd"
                          type="range"
                          min={1}
                          max={100}
                          step={1}
                          value={getNum("aiMaxMonthlyUsd", 5)}
                          onChange={(e) =>
                            updateField("aiMaxMonthlyUsd", Number(e.target.value))
                          }
                          className="w-full accent-primary"
                        />
                        <p className="text-xs text-muted-foreground">
                          Quando il limite viene raggiunto, l&apos;assistente smette di
                          rispondere fino al mese successivo.
                        </p>
                      </div>

                      {/* Usage display */}
                      <div className="rounded-lg bg-muted/50 p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-muted-foreground">
                            Utilizzo mese corrente
                          </p>
                          <p className="text-sm font-medium">
                            ${getNum("aiCurrentMonthUsageUsd", 0).toFixed(4)} / ${getNum("aiMaxMonthlyUsd", 5).toFixed(2)}
                          </p>
                        </div>
                        <Progress
                          value={
                            getNum("aiMaxMonthlyUsd", 5) > 0
                              ? Math.min(
                                  100,
                                  (getNum("aiCurrentMonthUsageUsd", 0) /
                                    getNum("aiMaxMonthlyUsd", 5)) *
                                    100
                                )
                              : 0
                          }
                          className="mt-2"
                        >
                          <ProgressValue />
                        </Progress>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Richieste questo mese: {getNum("aiCurrentMonthRequests", 0)}
                        </p>
                      </div>
                    </>
                  )}

                  {/* Ollama settings */}
                  {getStr("aiProvider", "anthropic") === "ollama" && (
                    <>
                      <div className="grid gap-1.5">
                        <Label htmlFor="ollama-url">URL Ollama</Label>
                        <Input
                          id="ollama-url"
                          value={getStr("ollamaUrl", "http://localhost:11434")}
                          onChange={(e) => updateField("ollamaUrl", e.target.value)}
                          placeholder="http://localhost:11434"
                        />
                        <p className="text-xs text-muted-foreground">
                          Indirizzo del server Ollama in rete locale.
                        </p>
                      </div>

                      <div className="grid gap-1.5">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="ollama-model">Modello Ollama</Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => fetchOllamaModels()}
                            disabled={ollamaModelsLoading}
                          >
                            {ollamaModelsLoading ? (
                              <Loader2 className="size-3 animate-spin mr-1" />
                            ) : (
                              <RefreshCw className="size-3 mr-1" />
                            )}
                            Aggiorna
                          </Button>
                        </div>
                        {ollamaModels.length > 0 ? (
                          <Select
                            value={getStr("ollamaModel", "llama3.2")}
                            onValueChange={(v) => { if (v) updateField("ollamaModel", v); }}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Seleziona modello..." />
                            </SelectTrigger>
                            <SelectContent>
                              {ollamaModels.map((model) => (
                                <SelectItem key={model} value={model}>
                                  {model}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            id="ollama-model"
                            value={getStr("ollamaModel", "llama3.2")}
                            onChange={(e) => updateField("ollamaModel", e.target.value)}
                            placeholder="llama3.2"
                          />
                        )}
                        <p className="text-xs text-muted-foreground">
                          {ollamaModelsLoading
                            ? "Recupero modelli dal server..."
                            : ollamaModels.length > 0
                              ? `${ollamaModels.length} modelli disponibili sul server.`
                              : "Impossibile contattare il server. Inserisci il nome manualmente oppure premi Aggiorna."}
                        </p>
                      </div>

                      {/* Vision model for image description */}
                      <div className="space-y-2">
                        <Label htmlFor="ollama-vision-model">Modello Vision (descrizione immagini)</Label>
                        {ollamaModels.length > 0 ? (
                          <Select
                            value={getStr("ollamaVisionModel", "")}
                            onValueChange={(v) => { if (v) updateField("ollamaVisionModel", v); }}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Usa modello chat (predefinito)" />
                            </SelectTrigger>
                            <SelectContent>
                              {ollamaModels.map((model) => (
                                <SelectItem key={model} value={model}>
                                  {model}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            id="ollama-vision-model"
                            value={getStr("ollamaVisionModel", "")}
                            onChange={(e) => updateField("ollamaVisionModel", e.target.value)}
                            placeholder="llava:7b"
                          />
                        )}
                        <p className="text-xs text-muted-foreground">
                          Modello con supporto vision per descrivere le immagini (es. llava, llama3.2-vision). Se vuoto, usa il modello chat.
                        </p>
                      </div>
                    </>
                  )}

                  <SaveButton
                    saving={saving}
                    onClick={() =>
                      saveConfig({
                        aiEnabled: getBool("aiEnabled"),
                        aiProvider: getStr("aiProvider", "anthropic"),
                        anthropicApiKey: getStr("anthropicApiKey"),
                        aiModel: getStr("aiModel", "claude-haiku-4-5-20251001"),
                        aiMaxMonthlyUsd: getNum("aiMaxMonthlyUsd", 5),
                        ollamaUrl: getStr("ollamaUrl", "http://localhost:11434"),
                        ollamaModel: getStr("ollamaModel", "llama3.2"),
                        ollamaVisionModel: getStr("ollamaVisionModel", ""),
                      })
                    }
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
