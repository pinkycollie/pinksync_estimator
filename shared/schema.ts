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
  preferences: jsonb("preferences"), // User preferences for UI and system behavior
  defaultWorkspaces: jsonb("default_workspaces"), // Default workspace paths for different devices
  onboardingCompleted: boolean("onboarding_completed").default(false), // Whether the user has completed onboarding
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
  size: integer("size"),
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
  status: text("status").default("pending"), // pending, active, syncing, error
  lastError: text("last_error"),
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

// User Categorization Preferences
export const userCategorizationPrefs = pgTable('user_categorization_prefs', {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  categoryType: text("category_type").notNull(), // e.g., 'device_type', 'file_type', 'project', 'workflow'
  categoryName: text("category_name").notNull(), // The name of this specific category 
  isActive: boolean("is_active").default(true),
  priority: integer("priority").default(5),
  filePatterns: text("file_patterns"), // File patterns that match this category
  folderPatterns: text("folder_patterns"), // Folder patterns that match this category
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  metadata: jsonb("metadata"), // Additional configuration
});

export const insertUserCategorizationPrefSchema = createInsertSchema(userCategorizationPrefs).omit({
  id: true,
});

// File Watch configuration
export const fileWatchConfigs = pgTable('file_watch_configs', {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  path: text("path").notNull(), // Path to watch
  isRecursive: boolean("is_recursive").default(true), // Watch subdirectories
  filePatterns: text("file_patterns"), // File glob patterns to watch, comma-separated
  ignorePatterns: text("ignore_patterns"), // Patterns to ignore, comma-separated
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  lastRunAt: timestamp("last_run_at"),
  watchConfig: jsonb("watch_config"), // Additional configuration
});

export const insertFileWatchConfigSchema = createInsertSchema(fileWatchConfigs).omit({
  id: true,
});

// Automation Workflow schema
export const automationWorkflows = pgTable('automation_workflows', {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  triggerType: text("trigger_type").notNull(), // file_change, schedule, manual, api
  triggerConfig: jsonb("trigger_config"), // Configuration for the trigger
  steps: jsonb("steps").notNull(), // Array of workflow steps to execute
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  lastRunAt: timestamp("last_run_at"),
  executionCount: integer("execution_count").default(0),
  averageExecutionTime: integer("average_execution_time"), // in milliseconds
});

export const insertAutomationWorkflowSchema = createInsertSchema(automationWorkflows).omit({
  id: true,
});

// Workflow Execution History
export const workflowExecutions = pgTable('workflow_executions', {
  id: serial("id").primaryKey(),
  workflowId: integer("workflow_id").notNull(),
  userId: integer("user_id").notNull(),
  startTime: timestamp("start_time").notNull().defaultNow(),
  endTime: timestamp("end_time"),
  status: text("status").notNull(), // pending, running, completed, failed, cancelled
  result: jsonb("result"), // Result of the workflow execution
  logs: jsonb("logs"), // Logs from the workflow execution
  error: text("error"), // Error message if the workflow failed
  executionTime: integer("execution_time"), // in milliseconds
  triggerSource: text("trigger_source"), // What triggered this execution
  triggerData: jsonb("trigger_data"), // Data that triggered the workflow
});

export const insertWorkflowExecutionSchema = createInsertSchema(workflowExecutions).omit({
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

export type UserCategorizationPref = typeof userCategorizationPrefs.$inferSelect;
export type InsertUserCategorizationPref = z.infer<typeof insertUserCategorizationPrefSchema>;

export type FileWatchConfig = typeof fileWatchConfigs.$inferSelect;
export type InsertFileWatchConfig = z.infer<typeof insertFileWatchConfigSchema>;

export type AutomationWorkflow = typeof automationWorkflows.$inferSelect;
export type InsertAutomationWorkflow = z.infer<typeof insertAutomationWorkflowSchema>;

export type WorkflowExecution = typeof workflowExecutions.$inferSelect;
export type InsertWorkflowExecution = z.infer<typeof insertWorkflowExecutionSchema>;

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

// File event type enum for reference
export enum FileEventType {
  ADDED = "added",
  MODIFIED = "modified",
  DELETED = "deleted",
  RENAMED = "renamed",
}

// Trigger type enum for reference
export enum TriggerType {
  FILE_EVENT = "file_event",
  SCHEDULE = "schedule",
  MANUAL = "manual",
  API = "api",
  INTEGRATION_EVENT = "integration_event",
}

// Workflow status enum for reference
export enum WorkflowStatus {
  PENDING = "pending",
  RUNNING = "running",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled",
}

// Workflow step type enum for reference
export enum WorkflowStepType {
  FILE_OPERATION = "file_operation",
  DATA_TRANSFORM = "data_transform",
  HTTP_REQUEST = "http_request",
  SCRIPT = "script",
  CONDITIONAL = "conditional",
  FILE_IMPORT = "file_import",
  FILE_EXPORT = "file_export",
  AI_ANALYSIS = "ai_analysis",
  DATABASE_OPERATION = "database_operation",
  NOTIFICATION = "notification",
  API_REQUEST = "api_request", // Keep for backward compatibility
  AI_PROCESSING = "ai_processing", // Keep for backward compatibility
  PIPELINE = "pipeline", // Keep for backward compatibility
  CODE_SNIPPET = "code_snippet", // Keep for backward compatibility
}

// Schedule configuration type
export interface ScheduleConfig {
  schedule: string; // cron expression
  timezone?: string;
  description?: string;
  
  // Schedule types
  type?: string; // "cron", "interval", "specificTime", "daily", "weekly", "monthly"
  
  // For cron schedules
  cron?: string;
  
  // For interval schedules
  minutes?: number;
  hours?: number;
  days?: number;
  
  // For specific time schedules
  hour?: number;
  minute?: number;
  
  // For weekly schedules
  dayOfWeek?: number; // 0-6, where 0 is Sunday
  
  // For monthly schedules
  day?: number; // 1-31
}

// File event configuration type
export interface FileEventConfig {
  pathPattern?: string;
  eventTypes?: FileEventType[];
  fileExtensions?: string[];
  description?: string;
}

// Integration event configuration type
export interface IntegrationEventConfig {
  integrationType?: string;
  eventTypes?: string[];
  description?: string;
}
