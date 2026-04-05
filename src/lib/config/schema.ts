import { z } from "zod";

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
const appSchema = z.object({
  name: z.string().default("Dia-Storage"),
  url: z.string().url().default("http://localhost:3000"),
  port: z.number().int().default(3000),
  timezone: z.string().default("Europe/Rome"),
  logLevel: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
const authSchema = z.object({
  otpLength: z.number().int().min(4).max(8).default(6),
  otpExpiryMinutes: z.number().int().min(1).default(10),
  sessionExpiryDays: z.number().int().min(1).default(30),
  maxOtpAttempts: z.number().int().min(1).default(5),
  otpCooldownSeconds: z.number().int().min(10).default(60),
  allowedDomains: z.array(z.string()).optional(),
  defaultChannel: z.enum(["email", "whatsapp", "both"]).default("email"),
});

// ---------------------------------------------------------------------------
// Email (SMTP)
// ---------------------------------------------------------------------------
const emailSchema = z.object({
  host: z.string().default("localhost"),
  port: z.number().int().default(587),
  secure: z.boolean().default(false),
  user: z.string().optional(),
  password: z.string().optional(),
  from: z.string().email().default("noreply@localhost"),
  fromName: z.string().default("Dia-Storage"),
});

// ---------------------------------------------------------------------------
// WhatsApp
// ---------------------------------------------------------------------------
const whatsappSchema = z.object({
  enabled: z.boolean().default(false),
  apiUrl: z
    .string()
    .url()
    .default("https://graph.facebook.com/v21.0"),
  phoneNumberId: z.string().optional(),
  accessToken: z.string().optional(),
  templateName: z.string().default("otp_login"),
  templateLanguage: z.string().default("it"),
});

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------
const storageSchema = z.object({
  basePath: z.string().default("/data"),
  incomingDir: z.string().default("incoming"),
  originalsDir: z.string().default("originals"),
  thumbnailsDir: z.string().default("thumbnails"),
  mediumDir: z.string().default("medium"),
  thumbnailWidth: z.number().int().default(400),
  thumbnailQuality: z.number().int().min(1).max(100).default(80),
  mediumWidth: z.number().int().default(1600),
  mediumQuality: z.number().int().min(1).max(100).default(85),
  maxUploadSizeMb: z.number().default(100),
  allowedExtensions: z
    .array(z.string())
    .default([".jpg", ".jpeg", ".tif", ".tiff", ".png"]),
});

// ---------------------------------------------------------------------------
// Database
// ---------------------------------------------------------------------------
const databaseSchema = z.object({
  url: z.string().default("postgres://dia:dia@localhost:5432/dia_storage"),
  maxConnections: z.number().int().default(10),
  idleTimeout: z.number().int().default(20),
});

// ---------------------------------------------------------------------------
// Backup
// ---------------------------------------------------------------------------
const backupDestinationSchema = z.object({
  type: z.enum(["s3", "local", "smb", "rsync"]),
  path: z.string().optional(),
  bucket: z.string().optional(),
  region: z.string().optional(),
  endpoint: z.string().optional(),
  accessKeyId: z.string().optional(),
  secretAccessKey: z.string().optional(),
  host: z.string().optional(),
  share: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
});

const backupSchema = z.object({
  enabled: z.boolean().default(false),
  schedule: z.string().default("0 2 * * *"),
  destinations: z.array(backupDestinationSchema).default([]),
  retainDays: z.number().int().default(90),
  includeDatabase: z.boolean().default(true),
});

// ---------------------------------------------------------------------------
// Remote Help (for remote-assistance features)
// ---------------------------------------------------------------------------
const remoteHelpSchema = z.object({
  enabled: z.boolean().default(false),
  provider: z.enum(["rustdesk", "tailscale", "none"]).default("none"),
  rustdeskId: z.string().optional(),
  tailscaleAuthKey: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Root config schema
// ---------------------------------------------------------------------------
const rawConfigSchema = z.object({
  app: appSchema.optional(),
  auth: authSchema.optional(),
  email: emailSchema.optional(),
  whatsapp: whatsappSchema.optional(),
  storage: storageSchema.optional(),
  database: databaseSchema.optional(),
  backup: backupSchema.optional(),
  remoteHelp: remoteHelpSchema.optional(),
});

export const configSchema = rawConfigSchema.transform((data) => ({
  app: data.app ?? appSchema.parse({}),
  auth: data.auth ?? authSchema.parse({}),
  email: data.email ?? emailSchema.parse({}),
  whatsapp: data.whatsapp ?? whatsappSchema.parse({}),
  storage: data.storage ?? storageSchema.parse({}),
  database: data.database ?? databaseSchema.parse({}),
  backup: data.backup ?? backupSchema.parse({}),
  remoteHelp: data.remoteHelp ?? remoteHelpSchema.parse({}),
}));

export type AppConfig = z.infer<typeof configSchema>;
