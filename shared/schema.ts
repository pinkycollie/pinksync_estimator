import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  displayName: text("display_name"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  displayName: true,
});

// File schema
export const files = pgTable("files", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  path: text("path"),
  fileType: text("file_type"),
  fileCategory: text("file_category"),
  source: text("source").notNull(),
  sourceId: text("source_id"),
  lastModified: timestamp("last_modified").notNull(),
  userId: integer("user_id").notNull(),
  metadata: jsonb("metadata"),
  isProcessed: boolean("is_processed").default(false),
});

export const insertFileSchema = createInsertSchema(files).omit({
  id: true,
});

// Integration schema
export const integrations = pgTable("integrations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  isConnected: boolean("is_connected").default(false),
  config: jsonb("config"),
  userId: integer("user_id").notNull(),
  lastSynced: timestamp("last_synced"),
});

export const insertIntegrationSchema = createInsertSchema(integrations).omit({
  id: true,
});

// Recommendation schema
export const recommendations = pgTable("recommendations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(),
  source: text("source"),
  isDismissed: boolean("is_dismissed").default(false),
  userId: integer("user_id").notNull(),
  createdAt: timestamp("created_at").notNull(),
});

export const insertRecommendationSchema = createInsertSchema(recommendations).omit({
  id: true,
});

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type File = typeof files.$inferSelect;
export type InsertFile = z.infer<typeof insertFileSchema>;

export type Integration = typeof integrations.$inferSelect;
export type InsertIntegration = z.infer<typeof insertIntegrationSchema>;

export type Recommendation = typeof recommendations.$inferSelect;
export type InsertRecommendation = z.infer<typeof insertRecommendationSchema>;

// File category enum for reference
export enum FileCategory {
  DOCUMENT = "document",
  CODE = "code",
  IMAGE = "image",
  VIDEO = "video",
  AUDIO = "audio",
  NOTE = "note",
  CHAT_LOG = "chat_log",
  OTHER = "other",
}

// File source enum for reference
export enum FileSource {
  LOCAL = "local",
  GOOGLE_DRIVE = "google_drive",
  DROPBOX = "dropbox",
  NOTION = "notion",
  ANYTYPE = "anytype",
  IOS = "ios",
  UBUNTU = "ubuntu",
  WINDOWS = "windows",
}

// Integration type enum for reference
export enum IntegrationType {
  GOOGLE_DRIVE = "google_drive",
  DROPBOX = "dropbox",
  NOTION = "notion",
  ANYTYPE = "anytype",
  IOS = "ios",
  UBUNTU = "ubuntu",
  WINDOWS = "windows",
}

// Recommendation type enum for reference
export enum RecommendationType {
  FILE_ORGANIZATION = "file_organization",
  INTEGRATION_SUGGESTION = "integration_suggestion",
  CONTENT_UPDATE = "content_update",
  TASK_REMINDER = "task_reminder",
}
