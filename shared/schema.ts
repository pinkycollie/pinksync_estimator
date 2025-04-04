import { pgTable, text, serial, integer, boolean, timestamp, jsonb, pgEnum } from "drizzle-orm/pg-core";
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
  contentSummary: text("content_summary"),
  contentVector: jsonb("content_vector"), // Store vector embeddings as JSON
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

// AI Chat Platform Types
export const aiPlatformEnum = pgEnum('ai_platform', [
  'openai_chatgpt',
  'anthropic_claude',
  'google_bard',
  'meta_llama', 
  'other'
]);

// AI Chat History - Stores imported chat conversations from various AI platforms
export const aiChatHistories = pgTable('ai_chat_histories', {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  platform: text("platform").notNull(), // Which AI platform this chat is from
  platformConversationId: text("platform_conversation_id"),
  title: text("title"),
  summary: text("summary"),
  importedAt: timestamp("imported_at").notNull().defaultNow(),
  conversationDate: timestamp("conversation_date"),
  rawData: jsonb("raw_data"), // Store the original JSON data
  metadataVector: jsonb("metadata_vector"), // Vector embedding of conversation metadata
  isProcessed: boolean("is_processed").default(false),
  tags: text("tags"), // Comma-separated tags generated or assigned to this chat
});

export const insertAiChatHistorySchema = createInsertSchema(aiChatHistories).omit({
  id: true,
});

// Individual messages within AI chat conversations
export const aiChatMessages = pgTable('ai_chat_messages', {
  id: serial("id").primaryKey(),
  chatHistoryId: integer("chat_history_id").notNull(),
  role: text("role").notNull(), // 'user', 'assistant', 'system'
  content: text("content").notNull(),
  timestamp: timestamp("timestamp"),
  orderIndex: integer("order_index").notNull(), // Position in conversation
  contentVector: jsonb("content_vector"), // Vector embedding of message content
  tokenCount: integer("token_count"), // Estimated token count of this message
});

export const insertAiChatMessageSchema = createInsertSchema(aiChatMessages).omit({
  id: true,
});

// Entrepreneurial Ideas
export const entrepreneurIdeas = pgTable('entrepreneur_ideas', {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default('draft'), // draft, in_progress, implemented, abandoned
  category: text("category"), // business, tech, product, service, etc.
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  dueDate: timestamp("due_date"), // Optional deadline
  priority: integer("priority").default(5), // 1-10 scale
  tags: text("tags"), // Comma-separated tags
  inspirationSource: text("inspiration_source"), // Where the idea came from
  contentVector: jsonb("content_vector"), // For semantic search
  relatedChatIds: jsonb("related_chat_ids"), // Array of related AI chat IDs
  relatedFiles: jsonb("related_files"), // Array of related file IDs
});

export const insertEntrepreneurIdeaSchema = createInsertSchema(entrepreneurIdeas).omit({
  id: true,
});

// Idea Versions for tracking changes
export const ideaVersions = pgTable('idea_versions', {
  id: serial("id").primaryKey(),
  ideaId: integer("idea_id").notNull(),
  versionNumber: integer("version_number").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  changedBy: integer("changed_by").notNull(), // userId
  createdAt: timestamp("created_at").notNull().defaultNow(),
  changeLog: text("change_log"), // Description of changes from previous version
});

export const insertIdeaVersionSchema = createInsertSchema(ideaVersions).omit({
  id: true,
});

// Project Plans
export const projectPlans = pgTable('project_plans', {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default('planning'), // planning, in_progress, completed, cancelled
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  budget: text("budget"),
  resources: jsonb("resources"), // People, tools, etc.
  dependencies: jsonb("dependencies"), // External dependencies
  risks: jsonb("risks"), // Identified risks
  relatedIdeas: jsonb("related_ideas"), // Array of related idea IDs
  contentVector: jsonb("content_vector"), // For semantic search
});

export const insertProjectPlanSchema = createInsertSchema(projectPlans).omit({
  id: true,
});

// Project Milestones
export const projectMilestones = pgTable('project_milestones', {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  dueDate: timestamp("due_date"),
  completedDate: timestamp("completed_date"),
  status: text("status").notNull().default('pending'), // pending, in_progress, completed, delayed
  orderIndex: integer("order_index").notNull(), // Position in project timeline
  assignedTo: integer("assigned_to"), // userId
});

export const insertProjectMilestoneSchema = createInsertSchema(projectMilestones).omit({
  id: true,
});

// Code Sources
export const codeSources = pgTable('code_sources', {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  language: text("language").notNull(), // programming language
  snippet: text("snippet").notNull(), // actual code
  source: text("source"), // where it came from: GitHub, personal, AI generated
  url: text("url"), // URL if from external source
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  tags: text("tags"), // Comma-separated tags
  isFavorite: boolean("is_favorite").default(false),
  useCount: integer("use_count").default(0), // Track how often this source is used
  relatedIdeas: jsonb("related_ideas"), // Array of related idea IDs
  relatedProjects: jsonb("related_projects"), // Array of related project IDs
  contentVector: jsonb("content_vector"), // For semantic search
});

export const insertCodeSourceSchema = createInsertSchema(codeSources).omit({
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

export type AiChatHistory = typeof aiChatHistories.$inferSelect;
export type InsertAiChatHistory = z.infer<typeof insertAiChatHistorySchema>;

export type AiChatMessage = typeof aiChatMessages.$inferSelect;
export type InsertAiChatMessage = z.infer<typeof insertAiChatMessageSchema>;

export type EntrepreneurIdea = typeof entrepreneurIdeas.$inferSelect;
export type InsertEntrepreneurIdea = z.infer<typeof insertEntrepreneurIdeaSchema>;

export type IdeaVersion = typeof ideaVersions.$inferSelect;
export type InsertIdeaVersion = z.infer<typeof insertIdeaVersionSchema>;

export type ProjectPlan = typeof projectPlans.$inferSelect;
export type InsertProjectPlan = z.infer<typeof insertProjectPlanSchema>;

export type ProjectMilestone = typeof projectMilestones.$inferSelect;
export type InsertProjectMilestone = z.infer<typeof insertProjectMilestoneSchema>;

export type CodeSource = typeof codeSources.$inferSelect;
export type InsertCodeSource = z.infer<typeof insertCodeSourceSchema>;

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

// AI Platform enum for reference
export enum AiPlatform {
  OPENAI_CHATGPT = "openai_chatgpt",
  ANTHROPIC_CLAUDE = "anthropic_claude",
  GOOGLE_BARD = "google_bard",
  META_LLAMA = "meta_llama",
  OTHER = "other",
}

// Idea status enum for reference
export enum IdeaStatus {
  DRAFT = "draft",
  IN_PROGRESS = "in_progress",
  IMPLEMENTED = "implemented",
  ABANDONED = "abandoned",
}

// Project status enum for reference
export enum ProjectStatus {
  PLANNING = "planning",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

// Milestone status enum for reference
export enum MilestoneStatus {
  PENDING = "pending",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  DELAYED = "delayed",
}
