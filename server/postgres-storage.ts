/**
 * PostgreSQL Storage Implementation
 * Replaces Replit Database with PostgreSQL + Drizzle ORM
 * 
 * Migration from Replit DB to PostgreSQL for:
 * - Users, Files, Integrations, Recommendations
 * - Platform synchronization data
 * - Vector search capabilities
 */

import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from './db';
import * as schema from '@shared/schema';
import { 
  User, InsertUser, 
  File, InsertFile, 
  Integration, InsertIntegration, 
  Recommendation, InsertRecommendation
} from "@shared/schema";
import { IStorage } from './storage';
import { cosineSimilarity, generateHfEmbedding } from './utils/huggingfaceUtils';
import session from "express-session";
import createMemoryStore from "memorystore";
import connectPgSimple from 'connect-pg-simple';
import { pool } from './db';

const MemoryStore = createMemoryStore(session);
const PgStore = connectPgSimple(session);

/**
 * PostgreSQL Storage Implementation using Drizzle ORM
 * Replaces the Replit Database implementation
 */
export class PostgresStorage implements IStorage {
  sessionStore: session.Store;
  private initialized: boolean = false;

  constructor() {
    // Use PostgreSQL session store for production, memory store for development
    const useLocalPostgres = process.env.USE_LOCAL_POSTGRES === 'true';
    
    if (useLocalPostgres || process.env.DATABASE_URL) {
      try {
        this.sessionStore = new PgStore({
          pool: pool as any,
          tableName: 'session',
          createTableIfMissing: true
        });
        console.log('[INFO] Using PostgreSQL session store');
      } catch (error) {
        console.warn('[WARN] Failed to create PostgreSQL session store, falling back to memory store');
        this.sessionStore = new MemoryStore({
          checkPeriod: 86400000, // prune expired entries every 24h
        });
      }
    } else {
      this.sessionStore = new MemoryStore({
        checkPeriod: 86400000,
      });
      console.log('[INFO] Using memory session store');
    }
    
    this.initialize();
  }

  /**
   * Initialize the database and create demo user if needed
   */
  private async initialize() {
    try {
      // Check if demo user exists, create if not
      const existingUsers = await db.select().from(schema.users).limit(1);
      
      if (existingUsers.length === 0) {
        await this.createUser({
          username: "pinky",
          password: "password",
          displayName: "Pinky Kim",
          email: "pinky@example.com"
        });
        console.log('[INFO] Created demo user: pinky');
      }

      this.initialized = true;
      console.log('[INFO] PostgreSQL Database initialized successfully');
    } catch (error) {
      console.error('[ERROR] Error initializing PostgreSQL Database:', error);
      // Mark as initialized anyway to prevent hanging
      this.initialized = true;
    }
  }

  /**
   * Ensure the database is initialized before operations
   */
  private async ensureInitialized() {
    if (!this.initialized) {
      console.log('[INFO] Waiting for database initialization...');
      await new Promise<void>((resolve) => {
        const checkInterval = setInterval(() => {
          if (this.initialized) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
        
        // Timeout after 5 seconds
        setTimeout(() => {
          this.initialized = true;
          clearInterval(checkInterval);
          console.warn('[WARN] Database initialization timed out. Forcing initialization.');
          resolve();
        }, 5000);
      });
    }
  }

  // ==================== User Methods ====================

  async getUser(id: number): Promise<User | undefined> {
    await this.ensureInitialized();
    try {
      const [user] = await db.select().from(schema.users).where(eq(schema.users.id, id));
      return user;
    } catch (error) {
      console.error(`[ERROR] Error getting user ${id}:`, error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    await this.ensureInitialized();
    try {
      const [user] = await db.select().from(schema.users).where(eq(schema.users.username, username));
      return user;
    } catch (error) {
      console.error(`[ERROR] Error getting user by username ${username}:`, error);
      return undefined;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    await this.ensureInitialized();
    try {
      const [user] = await db.insert(schema.users).values({
        username: insertUser.username,
        password: insertUser.password,
        email: insertUser.email ?? null,
        displayName: insertUser.displayName ?? null
      }).returning();
      
      console.log(`[INFO] User ${user.id} created successfully`);
      return user;
    } catch (error) {
      console.error(`[ERROR] Error creating user:`, error);
      throw error;
    }
  }

  // ==================== File Methods ====================

  async getFiles(userId: number): Promise<File[]> {
    await this.ensureInitialized();
    try {
      return await db.select().from(schema.files).where(eq(schema.files.userId, userId));
    } catch (error) {
      console.error('[ERROR] Error getting files:', error);
      return [];
    }
  }

  async getFilesByCategory(userId: number, category: string): Promise<File[]> {
    await this.ensureInitialized();
    try {
      return await db.select().from(schema.files).where(
        and(eq(schema.files.userId, userId), eq(schema.files.fileCategory, category))
      );
    } catch (error) {
      console.error('[ERROR] Error getting files by category:', error);
      return [];
    }
  }

  async getFilesBySource(userId: number, source: string): Promise<File[]> {
    await this.ensureInitialized();
    try {
      return await db.select().from(schema.files).where(
        and(eq(schema.files.userId, userId), eq(schema.files.source, source))
      );
    } catch (error) {
      console.error('[ERROR] Error getting files by source:', error);
      return [];
    }
  }

  async getRecentFiles(userId: number, limit: number = 10): Promise<File[]> {
    await this.ensureInitialized();
    try {
      return await db.select().from(schema.files)
        .where(eq(schema.files.userId, userId))
        .orderBy(desc(schema.files.lastModified))
        .limit(limit);
    } catch (error) {
      console.error('[ERROR] Error getting recent files:', error);
      return [];
    }
  }

  async getFile(id: number): Promise<File | undefined> {
    await this.ensureInitialized();
    try {
      const [file] = await db.select().from(schema.files).where(eq(schema.files.id, id));
      return file;
    } catch (error) {
      console.error(`[ERROR] Error getting file ${id}:`, error);
      return undefined;
    }
  }

  async createFile(insertFile: InsertFile): Promise<File> {
    await this.ensureInitialized();
    try {
      const [file] = await db.insert(schema.files).values({
        name: insertFile.name,
        source: insertFile.source,
        lastModified: insertFile.lastModified,
        userId: insertFile.userId,
        path: insertFile.path ?? null,
        fileType: insertFile.fileType ?? null,
        fileCategory: insertFile.fileCategory ?? null,
        sourceId: insertFile.sourceId ?? null,
        metadata: insertFile.metadata ?? null,
        isProcessed: insertFile.isProcessed ?? false,
        contentSummary: insertFile.contentSummary ?? null,
        contentVector: insertFile.contentVector ?? null
      }).returning();
      
      console.log(`[INFO] File ${file.id} created successfully`);
      return file;
    } catch (error) {
      console.error(`[ERROR] Error creating file:`, error);
      throw error;
    }
  }

  async updateFile(id: number, fileUpdate: Partial<InsertFile>): Promise<File | undefined> {
    await this.ensureInitialized();
    try {
      const [updatedFile] = await db.update(schema.files)
        .set(fileUpdate)
        .where(eq(schema.files.id, id))
        .returning();
      return updatedFile;
    } catch (error) {
      console.error(`[ERROR] Error updating file ${id}:`, error);
      return undefined;
    }
  }

  async deleteFile(id: number): Promise<boolean> {
    await this.ensureInitialized();
    try {
      const result = await db.delete(schema.files).where(eq(schema.files.id, id));
      return true;
    } catch (error) {
      console.error(`[ERROR] Error deleting file ${id}:`, error);
      return false;
    }
  }

  // ==================== Integration Methods ====================

  async getIntegrations(userId: number): Promise<Integration[]> {
    await this.ensureInitialized();
    try {
      return await db.select().from(schema.integrations).where(eq(schema.integrations.userId, userId));
    } catch (error) {
      console.error('[ERROR] Error getting integrations:', error);
      return [];
    }
  }

  async getIntegration(id: number): Promise<Integration | undefined> {
    await this.ensureInitialized();
    try {
      const [integration] = await db.select().from(schema.integrations).where(eq(schema.integrations.id, id));
      return integration;
    } catch (error) {
      console.error(`[ERROR] Error getting integration ${id}:`, error);
      return undefined;
    }
  }

  async getIntegrationByType(userId: number, type: string): Promise<Integration | undefined> {
    await this.ensureInitialized();
    try {
      const [integration] = await db.select().from(schema.integrations).where(
        and(eq(schema.integrations.userId, userId), eq(schema.integrations.type, type))
      );
      return integration;
    } catch (error) {
      console.error(`[ERROR] Error getting integration by type:`, error);
      return undefined;
    }
  }

  async createIntegration(insertIntegration: InsertIntegration): Promise<Integration> {
    await this.ensureInitialized();
    try {
      const [integration] = await db.insert(schema.integrations).values({
        name: insertIntegration.name,
        type: insertIntegration.type,
        userId: insertIntegration.userId,
        isConnected: insertIntegration.isConnected ?? false,
        config: insertIntegration.config ?? null,
        lastSynced: insertIntegration.lastSynced ?? null
      }).returning();
      
      console.log(`[INFO] Integration ${integration.id} created successfully`);
      return integration;
    } catch (error) {
      console.error(`[ERROR] Error creating integration:`, error);
      throw error;
    }
  }

  async updateIntegration(id: number, integrationUpdate: Partial<InsertIntegration>): Promise<Integration | undefined> {
    await this.ensureInitialized();
    try {
      const [updatedIntegration] = await db.update(schema.integrations)
        .set(integrationUpdate)
        .where(eq(schema.integrations.id, id))
        .returning();
      return updatedIntegration;
    } catch (error) {
      console.error(`[ERROR] Error updating integration ${id}:`, error);
      return undefined;
    }
  }

  async deleteIntegration(id: number): Promise<boolean> {
    await this.ensureInitialized();
    try {
      await db.delete(schema.integrations).where(eq(schema.integrations.id, id));
      return true;
    } catch (error) {
      console.error(`[ERROR] Error deleting integration ${id}:`, error);
      return false;
    }
  }

  // ==================== Recommendation Methods ====================

  async getRecommendations(userId: number): Promise<Recommendation[]> {
    await this.ensureInitialized();
    try {
      return await db.select().from(schema.recommendations).where(eq(schema.recommendations.userId, userId));
    } catch (error) {
      console.error('[ERROR] Error getting recommendations:', error);
      return [];
    }
  }

  async getActiveRecommendations(userId: number): Promise<Recommendation[]> {
    await this.ensureInitialized();
    try {
      return await db.select().from(schema.recommendations).where(
        and(eq(schema.recommendations.userId, userId), eq(schema.recommendations.isDismissed, false))
      );
    } catch (error) {
      console.error('[ERROR] Error getting active recommendations:', error);
      return [];
    }
  }

  async getRecommendation(id: number): Promise<Recommendation | undefined> {
    await this.ensureInitialized();
    try {
      const [recommendation] = await db.select().from(schema.recommendations).where(eq(schema.recommendations.id, id));
      return recommendation;
    } catch (error) {
      console.error(`[ERROR] Error getting recommendation ${id}:`, error);
      return undefined;
    }
  }

  async createRecommendation(insertRecommendation: InsertRecommendation): Promise<Recommendation> {
    await this.ensureInitialized();
    try {
      const [recommendation] = await db.insert(schema.recommendations).values({
        type: insertRecommendation.type,
        userId: insertRecommendation.userId,
        title: insertRecommendation.title,
        description: insertRecommendation.description,
        createdAt: insertRecommendation.createdAt,
        source: insertRecommendation.source ?? null,
        isDismissed: insertRecommendation.isDismissed ?? false
      }).returning();
      
      console.log(`[INFO] Recommendation ${recommendation.id} created successfully`);
      return recommendation;
    } catch (error) {
      console.error(`[ERROR] Error creating recommendation:`, error);
      throw error;
    }
  }

  async updateRecommendation(id: number, recommendationUpdate: Partial<InsertRecommendation>): Promise<Recommendation | undefined> {
    await this.ensureInitialized();
    try {
      const [updatedRecommendation] = await db.update(schema.recommendations)
        .set(recommendationUpdate)
        .where(eq(schema.recommendations.id, id))
        .returning();
      return updatedRecommendation;
    } catch (error) {
      console.error(`[ERROR] Error updating recommendation ${id}:`, error);
      return undefined;
    }
  }

  async deleteRecommendation(id: number): Promise<boolean> {
    await this.ensureInitialized();
    try {
      await db.delete(schema.recommendations).where(eq(schema.recommendations.id, id));
      return true;
    } catch (error) {
      console.error(`[ERROR] Error deleting recommendation ${id}:`, error);
      return false;
    }
  }

  // ==================== Stats Methods ====================

  async getFileStats(userId: number): Promise<{ category: string; count: number }[]> {
    const files = await this.getFiles(userId);
    const categories = new Map<string, number>();
    
    files.forEach((file) => {
      const category = file.fileCategory || 'uncategorized';
      categories.set(category, (categories.get(category) || 0) + 1);
    });
    
    return Array.from(categories.entries()).map(([category, count]) => ({ category, count }));
  }

  async getIntegrationStats(userId: number): Promise<{ type: string; count: number }[]> {
    const integrations = await this.getIntegrations(userId);
    const types = new Map<string, number>();
    
    integrations.forEach((integration) => {
      types.set(integration.type, (types.get(integration.type) || 0) + 1);
    });
    
    return Array.from(types.entries()).map(([type, count]) => ({ type, count }));
  }

  // ==================== Platform Synchronization Methods ====================

  async synchronizeDropbox(userId: number, integrationId: number): Promise<{ success: boolean; fileCount: number; errors?: string[] }> {
    try {
      const integration = await this.getIntegration(integrationId);
      if (!integration || integration.userId !== userId || integration.type !== 'dropbox') {
        return { success: false, fileCount: 0, errors: ['Invalid integration'] };
      }

      // Update last synced time
      await this.updateIntegration(integrationId, { lastSynced: new Date() });

      // Sample files for demo (in production, this would use Dropbox API)
      const sampleFiles: InsertFile[] = [
        {
          name: 'Project Proposal.docx',
          path: '/Documents/Work/Project Proposal.docx',
          fileType: '.docx',
          fileCategory: 'document',
          source: 'dropbox',
          sourceId: 'dbx_1',
          lastModified: new Date(),
          userId: userId,
          metadata: { size: 256000, shared: false },
          isProcessed: false
        }
      ];

      const createdFiles = await Promise.all(
        sampleFiles.map(file => this.createFile(file))
      );

      return { success: true, fileCount: createdFiles.length };
    } catch (error: any) {
      return { success: false, fileCount: 0, errors: [error.message || 'Unknown error'] };
    }
  }

  async synchronizeIOS(userId: number, integrationId: number): Promise<{ success: boolean; fileCount: number; errors?: string[] }> {
    try {
      const integration = await this.getIntegration(integrationId);
      if (!integration || integration.userId !== userId || integration.type !== 'ios') {
        return { success: false, fileCount: 0, errors: ['Invalid iOS integration'] };
      }

      await this.updateIntegration(integrationId, { lastSynced: new Date() });
      return { success: true, fileCount: 0 };
    } catch (error: any) {
      return { success: false, fileCount: 0, errors: [error.message || 'Unknown error'] };
    }
  }

  async synchronizeUbuntu(userId: number, integrationId: number): Promise<{ success: boolean; fileCount: number; errors?: string[] }> {
    try {
      const integration = await this.getIntegration(integrationId);
      if (!integration || integration.userId !== userId || integration.type !== 'ubuntu') {
        return { success: false, fileCount: 0, errors: ['Invalid Ubuntu integration'] };
      }

      await this.updateIntegration(integrationId, { lastSynced: new Date() });
      return { success: true, fileCount: 0 };
    } catch (error: any) {
      return { success: false, fileCount: 0, errors: [error.message || 'Unknown error'] };
    }
  }

  async synchronizeWindows(userId: number, integrationId: number): Promise<{ success: boolean; fileCount: number; errors?: string[] }> {
    try {
      const integration = await this.getIntegration(integrationId);
      if (!integration || integration.userId !== userId || integration.type !== 'windows') {
        return { success: false, fileCount: 0, errors: ['Invalid Windows integration'] };
      }

      await this.updateIntegration(integrationId, { lastSynced: new Date() });
      return { success: true, fileCount: 0 };
    } catch (error: any) {
      return { success: false, fileCount: 0, errors: [error.message || 'Unknown error'] };
    }
  }

  // Platform-specific file retrieval
  async getDropboxFiles(userId: number): Promise<File[]> {
    return this.getFilesBySource(userId, 'dropbox');
  }

  async getIOSFiles(userId: number): Promise<File[]> {
    return this.getFilesBySource(userId, 'ios');
  }

  async getUbuntuFiles(userId: number): Promise<File[]> {
    return this.getFilesBySource(userId, 'ubuntu');
  }

  async getWindowsFiles(userId: number): Promise<File[]> {
    return this.getFilesBySource(userId, 'windows');
  }

  // ==================== Conflict Resolution ====================

  async resolveFileConflicts(userId: number, fileIds: number[]): Promise<{ resolved: number; failed: number }> {
    let resolved = 0;
    let failed = 0;

    for (const fileId of fileIds) {
      try {
        const file = await this.getFile(fileId);
        if (file && file.userId === userId) {
          await this.updateFile(fileId, {
            metadata: {
              ...file.metadata as any,
              conflictResolved: true,
              conflictResolvedDate: new Date()
            }
          });
          resolved++;
        } else {
          failed++;
        }
      } catch (error) {
        console.error(`[ERROR] Error resolving conflict for file ${fileId}:`, error);
        failed++;
      }
    }

    return { resolved, failed };
  }

  // ==================== Vector Search Methods ====================

  async processFileForVectorSearch(fileId: number): Promise<File | undefined> {
    const file = await this.getFile(fileId);
    if (!file) return undefined;
    
    try {
      const contentSummary = this.generateContentSummary(file);
      const contentVector = await generateHfEmbedding(contentSummary);
      
      if (!contentVector) {
        console.warn(`[WARN] Failed to generate vector embedding for file ID ${fileId}`);
        return file;
      }
      
      const updatedFile = await this.updateFile(fileId, {
        contentSummary,
        metadata: {
          ...file.metadata as Record<string, any>,
          contentVector
        },
        isProcessed: true
      });
      
      return updatedFile;
    } catch (error) {
      console.error(`[ERROR] Error processing file ${fileId} for vector search:`, error);
      return file;
    }
  }

  async processAllUserFilesForVectorSearch(userId: number): Promise<number> {
    try {
      const files = await this.getFiles(userId);
      const unprocessedFiles = files.filter(file => !file.isProcessed);
      
      let processedCount = 0;
      
      for (const file of unprocessedFiles) {
        const updated = await this.processFileForVectorSearch(file.id);
        if (updated && updated.isProcessed) {
          processedCount++;
        }
      }
      
      return processedCount;
    } catch (error) {
      console.error(`[ERROR] Error processing files for vector search for user ${userId}:`, error);
      return 0;
    }
  }

  async searchFilesByVector(userId: number, query: string, limit: number = 10, threshold: number = 0.6): Promise<File[]> {
    try {
      const queryVector = await generateHfEmbedding(query);
      if (!queryVector) {
        console.error('[ERROR] Failed to generate vector for query:', query);
        return [];
      }
      
      const files = await this.getFiles(userId);
      
      const filesWithVectors = files.filter(file => {
        const metadata = file.metadata || {};
        return metadata && typeof metadata === 'object' && 
               'contentVector' in (metadata as any) && 
               Array.isArray((metadata as any).contentVector);
      });
      
      const scoredFiles = filesWithVectors.map(file => {
        const metadata = file.metadata as Record<string, any> || {};
        const contentVector = metadata.contentVector;
        const similarity = cosineSimilarity(queryVector, contentVector);
        return { file, similarity };
      });
      
      return scoredFiles
        .filter(item => item.similarity >= threshold)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit)
        .map(item => item.file);
    } catch (error) {
      console.error(`[ERROR] Error searching files by vector for user ${userId}:`, error);
      return [];
    }
  }

  async findSimilarFiles(fileId: number, limit: number = 5, threshold: number = 0.7): Promise<File[]> {
    try {
      const sourceFile = await this.getFile(fileId);
      if (!sourceFile) return [];
      
      const sourceMetadata = sourceFile.metadata as Record<string, any> || {};
      const sourceVector = sourceMetadata.contentVector;
      
      if (!sourceVector || !Array.isArray(sourceVector)) return [];
      
      const files = (await this.getFiles(sourceFile.userId)).filter(file => file.id !== fileId);
      
      const filesWithVectors = files.filter(file => {
        const fileMetadata = file.metadata as Record<string, any> || {};
        return fileMetadata && 'contentVector' in fileMetadata && 
               Array.isArray(fileMetadata.contentVector);
      });
      
      const scoredFiles = filesWithVectors.map(file => {
        const fileMetadata = file.metadata as Record<string, any> || {};
        const contentVector = fileMetadata.contentVector;
        const similarity = cosineSimilarity(sourceVector, contentVector);
        return { file, similarity };
      });
      
      return scoredFiles
        .filter(item => item.similarity >= threshold)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit)
        .map(item => item.file);
    } catch (error) {
      console.error(`[ERROR] Error finding similar files for file ${fileId}:`, error);
      return [];
    }
  }

  /**
   * Generate a content summary for a file based on its metadata
   */
  private generateContentSummary(file: File): string {
    const fileName = file.name || '';
    const fileExtension = fileName.includes('.') ? fileName.split('.').pop()?.toLowerCase() : '';
    
    let summary = `${fileName} - ${file.fileCategory || 'unknown'} file`;
    
    if (file.path) summary += ` located at ${file.path}`;
    if (file.source) summary += ` from ${file.source}`;
    
    const metadata = file.metadata as Record<string, any> || {};
    if (metadata && metadata.content) summary += `. Contents: ${metadata.content}`;
    
    if (file.lastModified) {
      const date = new Date(file.lastModified);
      summary += ` Last modified: ${date.toLocaleDateString()}.`;
    }
    
    return summary;
  }
}

// Export a singleton instance
export const postgresStorage = new PostgresStorage();
