import { pgTable, text, timestamp, boolean, integer, json, pgEnum } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import { sql } from 'drizzle-orm';

/**
 * Enum values for platform types
 */
export const PlatformType = {
  DROPBOX: 'DROPBOX',
  IOS: 'IOS',
  UBUNTU: 'UBUNTU',
  WINDOWS: 'WINDOWS',
  WEB: 'WEB'
} as const;

/**
 * Enum values for sync direction
 */
export const SyncDirection = {
  UPLOAD: 'UPLOAD',
  DOWNLOAD: 'DOWNLOAD',
  BIDIRECTIONAL: 'BIDIRECTIONAL'
} as const;

/**
 * Enum values for sync status
 */
export const SyncStatus = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CONFLICT: 'CONFLICT'
} as const;

// Define the enum types for the database
const platformTypeEnum = pgEnum('platform_type', ['DROPBOX', 'IOS', 'UBUNTU', 'WINDOWS', 'WEB']);
const syncDirectionEnum = pgEnum('sync_direction', ['UPLOAD', 'DOWNLOAD', 'BIDIRECTIONAL']);
const syncStatusEnum = pgEnum('sync_status', ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CONFLICT']);
const conflictResolutionEnum = pgEnum('conflict_resolution', ['local', 'remote', 'rename', 'manual']);

/**
 * Platform connection table schema
 */
export const platformConnections = pgTable('platform_connections', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  platform: platformTypeEnum('platform').notNull(),
  rootPath: text('root_path').notNull(),
  credentials: json('credentials').notNull().$type<Record<string, any>>(),
  lastSyncDate: timestamp('last_sync_date', { mode: 'date' }),
  isEnabled: boolean('is_enabled').default(true).notNull(),
  syncDirection: syncDirectionEnum('sync_direction').default(SyncDirection.BIDIRECTIONAL).notNull(),
  syncInterval: integer('sync_interval'), // In minutes, null means manual sync only
  syncOnStartup: boolean('sync_on_startup').default(false).notNull(),
  syncOnSchedule: boolean('sync_on_schedule').default(false).notNull(),
  metadata: json('metadata').$type<Record<string, any>>(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

/**
 * Sync operations table schema
 */
export const syncOperations = pgTable('sync_operations', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  connectionId: text('connection_id').notNull().references(() => platformConnections.id, { onDelete: 'cascade' }),
  status: syncStatusEnum('status').default(SyncStatus.PENDING).notNull(),
  startTime: timestamp('start_time', { mode: 'date' }).notNull(),
  endTime: timestamp('end_time', { mode: 'date' }),
  itemsProcessed: integer('items_processed').default(0).notNull(),
  itemsTotal: integer('items_total'),
  bytesTransferred: integer('bytes_transferred').default(0).notNull(),
  errors: json('errors').$type<Array<{ path: string, message: string, code: string }>>().default([]),
  conflictItems: json('conflict_items').$type<string[]>().default([])
});

/**
 * Sync items table schema
 */
export const syncItems = pgTable('sync_items', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  connectionId: text('connection_id').notNull().references(() => platformConnections.id, { onDelete: 'cascade' }),
  path: text('path').notNull(),
  isDirectory: boolean('is_directory').notNull(),
  size: integer('size'),
  mimeType: text('mime_type'),
  hash: text('hash'),
  lastSyncedAt: timestamp('last_synced_at', { mode: 'date' }),
  syncStatus: syncStatusEnum('sync_status').default(SyncStatus.PENDING).notNull(),
  conflict: boolean('conflict').default(false).notNull(),
  localModified: timestamp('local_modified', { mode: 'date' }),
  remoteModified: timestamp('remote_modified', { mode: 'date' }),
  conflictResolution: conflictResolutionEnum('conflict_resolution'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

/**
 * Types and validation schemas for platform connections
 */
export type PlatformConnection = typeof platformConnections.$inferSelect;
export type InsertPlatformConnection = typeof platformConnections.$inferInsert;
export const insertPlatformConnectionSchema = createInsertSchema(platformConnections).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

/**
 * Types and validation schemas for sync operations
 */
export type SyncOperation = typeof syncOperations.$inferSelect;
export type InsertSyncOperation = typeof syncOperations.$inferInsert;
export const insertSyncOperationSchema = createInsertSchema(syncOperations).omit({ 
  id: true
});

/**
 * Types and validation schemas for sync items
 */
export type SyncItem = typeof syncItems.$inferSelect;
export type InsertSyncItem = typeof syncItems.$inferInsert;
export const insertSyncItemSchema = createInsertSchema(syncItems).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

/**
 * Validation schema for platform connection creation
 */
export const createPlatformConnectionSchema = insertPlatformConnectionSchema.extend({
  platform: insertPlatformConnectionSchema.shape.platform,
  credentials: insertPlatformConnectionSchema.shape.credentials,
  syncDirection: insertPlatformConnectionSchema.shape.syncDirection.optional()
});

/**
 * Validation schema for updating platform connection
 */
export const updatePlatformConnectionSchema = insertPlatformConnectionSchema.partial();