import { pgTable, text, uuid, boolean, integer, json, timestamp } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

/**
 * Enum values for platform types
 */
export const PlatformType = {
  DROPBOX: 'dropbox',
  IOS: 'ios',
  UBUNTU: 'ubuntu',
  WINDOWS: 'windows',
  WEB: 'web'
} as const;

/**
 * Enum values for sync direction
 */
export const SyncDirection = {
  UPLOAD: 'upload', // Local to remote
  DOWNLOAD: 'download', // Remote to local
  BIDIRECTIONAL: 'bidirectional' // Both ways
} as const;

/**
 * Enum values for sync status
 */
export const SyncStatus = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CONFLICT: 'conflict'
} as const;

/**
 * Platform connection table schema
 */
export const platformConnections = pgTable('platform_connections', {
  id: uuid('id').primaryKey().defaultRandom(),
  platform: text('platform').notNull().$type<keyof typeof PlatformType>(),
  name: text('name').notNull(),
  rootPath: text('root_path').notNull(),
  credentials: json('credentials').notNull().$type<Record<string, any>>(),
  lastSyncDate: timestamp('last_sync_date'),
  isEnabled: boolean('is_enabled').notNull().default(true),
  syncDirection: text('sync_direction').notNull().$type<keyof typeof SyncDirection>().default(SyncDirection.BIDIRECTIONAL),
  syncFrequency: integer('sync_frequency').notNull().default(60), // In minutes
  excludedPaths: json('excluded_paths').notNull().$type<string[]>().default([]),
  includedExtensions: json('included_extensions').notNull().$type<string[]>().default([]),
  excludedExtensions: json('excluded_extensions').notNull().$type<string[]>().default([]),
  metadata: json('metadata').notNull().$type<Record<string, any>>().default({}),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

/**
 * Sync operations table schema
 */
export const syncOperations = pgTable('sync_operations', {
  id: uuid('id').primaryKey().defaultRandom(),
  connectionId: uuid('connection_id').notNull().references(() => platformConnections.id, { onDelete: 'cascade' }),
  startTime: timestamp('start_time').notNull().defaultNow(),
  endTime: timestamp('end_time'),
  status: text('status').notNull().$type<keyof typeof SyncStatus>().default(SyncStatus.PENDING),
  itemsProcessed: integer('items_processed').notNull().default(0),
  itemsTotal: integer('items_total'),
  bytesTransferred: integer('bytes_transferred').notNull().default(0),
  errors: json('errors').notNull().$type<Array<{path: string, message: string, code: string}>>().default([]),
  conflictItems: json('conflict_items').notNull().$type<string[]>().default([])
});

/**
 * Sync items table schema
 */
export const syncItems = pgTable('sync_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  connectionId: uuid('connection_id').notNull().references(() => platformConnections.id, { onDelete: 'cascade' }),
  path: text('path').notNull(),
  isDirectory: boolean('is_directory').notNull(),
  size: integer('size'),
  mimeType: text('mime_type'),
  hash: text('hash'),
  lastModified: timestamp('last_modified').notNull(),
  lastSynced: timestamp('last_synced'),
  syncStatus: text('sync_status').notNull().$type<keyof typeof SyncStatus>().default(SyncStatus.PENDING),
  platformSpecificData: json('platform_specific_data').$type<Record<string, any>>(),
  conflictResolution: text('conflict_resolution').$type<'local' | 'remote' | 'rename' | 'manual'>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
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
  id: true, 
  startTime: true 
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
  // Add additional validations for platform-specific credentials
  credentials: z.record(z.any()).refine((val) => {
    // Validate based on platform
    if (val.platform === PlatformType.DROPBOX) {
      return !!val.accessToken;
    } else if (val.platform === PlatformType.IOS) {
      return !!val.appleId && !!val.password;
    } else if (val.platform === PlatformType.UBUNTU) {
      return !!val.host && !!val.username && (!!val.password || !!val.privateKey);
    } else if (val.platform === PlatformType.WINDOWS) {
      return !!val.share && !!val.domain && !!val.username && !!val.password;
    }
    return true;
  }, { message: 'Invalid credentials for the selected platform' })
});

/**
 * Validation schema for updating platform connection
 */
export const updatePlatformConnectionSchema = insertPlatformConnectionSchema.partial();