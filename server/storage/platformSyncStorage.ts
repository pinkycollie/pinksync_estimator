import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { 
  platformConnections, 
  syncOperations, 
  syncItems,
  type PlatformConnection,
  type SyncOperation,
  type SyncItem,
  type InsertPlatformConnection,
  type InsertSyncOperation,
  type InsertSyncItem
} from "../../shared/platformSyncSchema";

/**
 * Platform sync storage class
 * Used for storing and retrieving platform connections, sync operations, and sync items
 */
export class PlatformSyncStorage {
  /**
   * Get all platform connections
   */
  async getAllPlatformConnections(): Promise<PlatformConnection[]> {
    return await db.select().from(platformConnections);
  }

  /**
   * Get platform connection by ID
   */
  async getPlatformConnection(id: string): Promise<PlatformConnection | undefined> {
    const result = await db.select().from(platformConnections).where(eq(platformConnections.id, id));
    return result[0];
  }

  /**
   * Create a new platform connection
   */
  async createPlatformConnection(connection: InsertPlatformConnection): Promise<PlatformConnection> {
    const result = await db.insert(platformConnections).values(connection).returning();
    return result[0];
  }

  /**
   * Update an existing platform connection
   */
  async updatePlatformConnection(id: string, updates: Partial<InsertPlatformConnection>): Promise<PlatformConnection | null> {
    // Add updated timestamp
    const updatesWithTimestamp = {
      ...updates,
      updatedAt: new Date()
    };

    const result = await db
      .update(platformConnections)
      .set(updatesWithTimestamp)
      .where(eq(platformConnections.id, id))
      .returning();

    return result[0] || null;
  }

  /**
   * Delete a platform connection
   */
  async deletePlatformConnection(id: string): Promise<boolean> {
    const result = await db
      .delete(platformConnections)
      .where(eq(platformConnections.id, id))
      .returning({ id: platformConnections.id });

    return result.length > 0;
  }

  /**
   * Get all sync operations for a specific connection
   */
  async getSyncOperations(connectionId: string): Promise<SyncOperation[]> {
    return await db
      .select()
      .from(syncOperations)
      .where(eq(syncOperations.connectionId, connectionId))
      .orderBy(syncOperations.startTime);
  }

  /**
   * Get a specific sync operation by ID
   */
  async getSyncOperation(id: string): Promise<SyncOperation | undefined> {
    const result = await db.select().from(syncOperations).where(eq(syncOperations.id, id));
    return result[0];
  }

  /**
   * Create a new sync operation
   */
  async createSyncOperation(operation: InsertSyncOperation): Promise<SyncOperation> {
    const result = await db.insert(syncOperations).values(operation).returning();
    return result[0];
  }

  /**
   * Update an existing sync operation
   */
  async updateSyncOperation(id: string, updates: Partial<InsertSyncOperation>): Promise<SyncOperation | null> {
    const result = await db
      .update(syncOperations)
      .set(updates)
      .where(eq(syncOperations.id, id))
      .returning();

    return result[0] || null;
  }

  /**
   * Get all sync items for a specific connection
   */
  async getSyncItems(connectionId: string): Promise<SyncItem[]> {
    return await db
      .select()
      .from(syncItems)
      .where(eq(syncItems.connectionId, connectionId));
  }

  /**
   * Get a specific sync item by ID
   */
  async getSyncItem(id: string): Promise<SyncItem | undefined> {
    const result = await db.select().from(syncItems).where(eq(syncItems.id, id));
    return result[0];
  }

  /**
   * Create a new sync item
   */
  async createSyncItem(item: InsertSyncItem): Promise<SyncItem> {
    const result = await db.insert(syncItems).values(item).returning();
    return result[0];
  }

  /**
   * Update an existing sync item
   */
  async updateSyncItem(id: string, updates: Partial<InsertSyncItem>): Promise<SyncItem | null> {
    // Add updated timestamp
    const updatesWithTimestamp = {
      ...updates,
      updatedAt: new Date()
    };

    const result = await db
      .update(syncItems)
      .set(updatesWithTimestamp)
      .where(eq(syncItems.id, id))
      .returning();

    return result[0] || null;
  }

  /**
   * Delete a sync item
   */
  async deleteSyncItem(id: string): Promise<boolean> {
    const result = await db
      .delete(syncItems)
      .where(eq(syncItems.id, id))
      .returning({ id: syncItems.id });

    return result.length > 0;
  }

  /**
   * Get a sync item by path and connection ID
   */
  async getSyncItemByPath(connectionId: string, path: string): Promise<SyncItem | undefined> {
    const result = await db
      .select()
      .from(syncItems)
      .where(
        and(
          eq(syncItems.connectionId, connectionId),
          eq(syncItems.path, path)
        )
      );

    return result[0];
  }

  /**
   * Batch create sync items
   */
  async batchCreateSyncItems(items: InsertSyncItem[]): Promise<SyncItem[]> {
    if (items.length === 0) return [];
    
    const result = await db.insert(syncItems).values(items).returning();
    return result;
  }

  /**
   * Batch update sync items
   */
  async batchUpdateSyncItems(updates: Array<{ id: string, updates: Partial<InsertSyncItem> }>): Promise<number> {
    let updateCount = 0;
    
    // Using a transaction to ensure all updates are atomic
    await db.transaction(async (tx) => {
      for (const { id, updates } of updates) {
        const updatesWithTimestamp = {
          ...updates,
          updatedAt: new Date()
        };

        const result = await tx
          .update(syncItems)
          .set(updatesWithTimestamp)
          .where(eq(syncItems.id, id))
          .returning({ id: syncItems.id });

        if (result.length > 0) {
          updateCount++;
        }
      }
    });
    
    return updateCount;
  }
}