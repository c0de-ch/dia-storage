import {
  pgTable,
  serial,
  text,
  boolean,
  timestamp,
  integer,
  bigint,
  jsonb,
  unique,
  index,
  date,
  customType,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Custom tsvector type for full-text search
const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------
export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull().unique(),
    phone: text("phone"),
    name: text("name"),
    role: text("role").notNull().default("user"),
    otpChannel: text("otp_channel").notNull().default("email"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("users_email_idx").on(table.email)]
);

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(userSessions),
  magazines: many(magazines),
  slides: many(slides),
  collections: many(collections),
  apiKeys: many(apiKeys),
  uploadBatches: many(uploadBatches),
  auditLogs: many(auditLog),
}));

// ---------------------------------------------------------------------------
// OTP Codes
// ---------------------------------------------------------------------------
export const otpCodes = pgTable(
  "otp_codes",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull(),
    code: text("code").notNull(),
    channel: text("channel").notNull().default("email"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("otp_codes_email_idx").on(table.email),
    index("otp_codes_email_code_idx").on(table.email, table.code),
  ]
);

// ---------------------------------------------------------------------------
// User Sessions
// ---------------------------------------------------------------------------
export const userSessions = pgTable(
  "user_sessions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("user_sessions_token_idx").on(table.token)]
);

export const userSessionsRelations = relations(userSessions, ({ one }) => ({
  user: one(users, {
    fields: [userSessions.userId],
    references: [users.id],
  }),
}));

// ---------------------------------------------------------------------------
// Magazines
// ---------------------------------------------------------------------------
export const magazines = pgTable(
  "magazines",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    slotCount: integer("slot_count").notNull().default(50),
    ownerUserId: integer("owner_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("magazines_owner_idx").on(table.ownerUserId)]
);

export const magazinesRelations = relations(magazines, ({ one, many }) => ({
  owner: one(users, {
    fields: [magazines.ownerUserId],
    references: [users.id],
  }),
  slides: many(slides),
}));

// ---------------------------------------------------------------------------
// Slides
// ---------------------------------------------------------------------------
export const slides = pgTable(
  "slides",
  {
    id: serial("id").primaryKey(),
    magazineId: integer("magazine_id").references(() => magazines.id, {
      onDelete: "set null",
    }),
    slotNumber: integer("slot_number"),
    originalFilename: text("original_filename"),
    storagePath: text("storage_path").unique(),
    thumbnailPath: text("thumbnail_path"),
    mediumPath: text("medium_path"),
    fileSize: bigint("file_size", { mode: "number" }),
    width: integer("width"),
    height: integer("height"),
    checksum: text("checksum"),
    title: text("title"),
    dateTaken: text("date_taken"),
    dateTakenPrecise: date("date_taken_precise"),
    location: text("location"),
    notes: text("notes"),
    scanDate: timestamp("scan_date", { withTimezone: true }),
    exifData: jsonb("exif_data"),
    // tsvector column for full-text search.
    // Populated via a PostgreSQL trigger (see migrations).
    searchVector: tsvector("search_vector"),
    batchId: text("batch_id"),
    status: text("status").notNull().default("incoming"),
    backedUp: boolean("backed_up").notNull().default(false),
    backedUpAt: timestamp("backed_up_at", { withTimezone: true }),
    exifWritten: boolean("exif_written").notNull().default(false),
    uploadedBy: integer("uploaded_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("slides_magazine_idx").on(table.magazineId),
    index("slides_status_idx").on(table.status),
    index("slides_batch_idx").on(table.batchId),
    index("slides_uploaded_by_idx").on(table.uploadedBy),
    index("slides_date_taken_idx").on(table.dateTakenPrecise),
    index("slides_checksum_idx").on(table.checksum),
    index("slides_backed_up_idx").on(table.backedUp),
  ]
);

export const slidesRelations = relations(slides, ({ one, many }) => ({
  magazine: one(magazines, {
    fields: [slides.magazineId],
    references: [magazines.id],
  }),
  uploader: one(users, {
    fields: [slides.uploadedBy],
    references: [users.id],
  }),
  slideCollections: many(slideCollections),
}));

// ---------------------------------------------------------------------------
// Collections
// ---------------------------------------------------------------------------
export const collections = pgTable(
  "collections",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    coverSlideId: integer("cover_slide_id").references(() => slides.id, {
      onDelete: "set null",
    }),
    ownerUserId: integer("owner_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("collections_owner_idx").on(table.ownerUserId)]
);

export const collectionsRelations = relations(
  collections,
  ({ one, many }) => ({
    coverSlide: one(slides, {
      fields: [collections.coverSlideId],
      references: [slides.id],
    }),
    owner: one(users, {
      fields: [collections.ownerUserId],
      references: [users.id],
    }),
    slideCollections: many(slideCollections),
  })
);

// ---------------------------------------------------------------------------
// Slide <-> Collection join table
// ---------------------------------------------------------------------------
export const slideCollections = pgTable(
  "slide_collections",
  {
    slideId: integer("slide_id")
      .notNull()
      .references(() => slides.id, { onDelete: "cascade" }),
    collectionId: integer("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [
    unique("slide_collections_unique").on(table.slideId, table.collectionId),
    index("slide_collections_collection_idx").on(table.collectionId),
  ]
);

export const slideCollectionsRelations = relations(
  slideCollections,
  ({ one }) => ({
    slide: one(slides, {
      fields: [slideCollections.slideId],
      references: [slides.id],
    }),
    collection: one(collections, {
      fields: [slideCollections.collectionId],
      references: [collections.id],
    }),
  })
);

// ---------------------------------------------------------------------------
// Backup History
// ---------------------------------------------------------------------------
export const backupHistory = pgTable(
  "backup_history",
  {
    id: serial("id").primaryKey(),
    type: text("type").notNull(),
    destination: text("destination").notNull(),
    slidesCount: integer("slides_count").notNull().default(0),
    totalBytes: bigint("total_bytes", { mode: "number" }).notNull().default(0),
    status: text("status").notNull().default("in_progress"),
    error: text("error"),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [index("backup_history_status_idx").on(table.status)]
);

// ---------------------------------------------------------------------------
// API Keys
// ---------------------------------------------------------------------------
export const apiKeys = pgTable(
  "api_keys",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    key: text("key").notNull().unique(),
    name: text("name").notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("api_keys_key_idx").on(table.key)]
);

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  user: one(users, {
    fields: [apiKeys.userId],
    references: [users.id],
  }),
}));

// ---------------------------------------------------------------------------
// Upload Batches
// ---------------------------------------------------------------------------
export const uploadBatches = pgTable(
  "upload_batches",
  {
    id: serial("id").primaryKey(),
    batchId: text("batch_id").notNull().unique(),
    source: text("source").notNull().default("web"),
    uploadedBy: integer("uploaded_by").references(() => users.id, {
      onDelete: "set null",
    }),
    slidesCount: integer("slides_count").notNull().default(0),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("upload_batches_batch_id_idx").on(table.batchId),
    index("upload_batches_status_idx").on(table.status),
  ]
);

export const uploadBatchesRelations = relations(uploadBatches, ({ one }) => ({
  uploader: one(users, {
    fields: [uploadBatches.uploadedBy],
    references: [users.id],
  }),
}));

// ---------------------------------------------------------------------------
// Settings (key-value store)
// ---------------------------------------------------------------------------
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// Audit Log
// ---------------------------------------------------------------------------
export const auditLog = pgTable(
  "audit_log",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    entityType: text("entity_type"),
    entityId: integer("entity_id"),
    details: jsonb("details"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("audit_log_user_idx").on(table.userId),
    index("audit_log_action_idx").on(table.action),
    index("audit_log_entity_idx").on(table.entityType, table.entityId),
    index("audit_log_created_idx").on(table.createdAt),
  ]
);

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  user: one(users, {
    fields: [auditLog.userId],
    references: [users.id],
  }),
}));

// ---------------------------------------------------------------------------
// Auth Attempts (rate limiting for login + verify-otp)
// ---------------------------------------------------------------------------
export const authAttempts = pgTable(
  "auth_attempts",
  {
    id: serial("id").primaryKey(),
    identifier: text("identifier").notNull(),
    kind: text("kind").notNull(),
    success: boolean("success").notNull().default(false),
    ipAddress: text("ip_address"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("auth_attempts_identifier_idx").on(
      table.identifier,
      table.kind,
      table.createdAt
    ),
  ]
);
