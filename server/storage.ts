// import { createClient } from '@neondatabase/serverless'; // Uncomment when using actual database
import { drizzle } from 'drizzle-orm/neon-serverless';
import session from 'express-session';
import MemoryStore from 'memorystore';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { CommunicationEntity } from './utils/communicationLogger';
import { PlatformSyncStorage } from './storage/platformSyncStorage';
import { 
  PlatformConnection, 
  SyncOperation, 
  SyncItem,
  InsertPlatformConnection,
  InsertSyncOperation,
  InsertSyncItem 
} from '../shared/platformSyncSchema';

// Create memory store for sessions
const MemStoreConstructor = MemoryStore(session);

// Define storage interface
export interface IStorage {
  // Session store for Express sessions
  sessionStore: session.Store;
  
  // Communication methods
  createCommunication(communication: Omit<CommunicationEntity, 'id'>): Promise<CommunicationEntity>;
  getCommunication(id: string): Promise<CommunicationEntity | null>;
  updateCommunication(id: string, updates: Partial<CommunicationEntity>): Promise<CommunicationEntity | null>;
  getAllCommunications(): Promise<CommunicationEntity[]>;
  getAllTags(): Promise<Array<{ tag: string; count: number }>>;
  
  // Platform synchronization methods
  getAllPlatformConnections(): Promise<PlatformConnection[]>;
  getPlatformConnection(id: string): Promise<PlatformConnection | undefined>;
  createPlatformConnection(connection: InsertPlatformConnection): Promise<PlatformConnection>;
  updatePlatformConnection(id: string, updates: Partial<InsertPlatformConnection>): Promise<PlatformConnection | null>;
  deletePlatformConnection(id: string): Promise<boolean>;
  
  getSyncOperations(connectionId: string): Promise<SyncOperation[]>;
  getSyncOperation(id: string): Promise<SyncOperation | undefined>;
  createSyncOperation(operation: InsertSyncOperation): Promise<SyncOperation>;
  updateSyncOperation(id: string, updates: Partial<InsertSyncOperation>): Promise<SyncOperation | null>;
  
  getSyncItems(connectionId: string): Promise<SyncItem[]>;
  getSyncItem(id: string): Promise<SyncItem | undefined>;
  getSyncItemByPath(connectionId: string, path: string): Promise<SyncItem | undefined>;
  createSyncItem(item: InsertSyncItem): Promise<SyncItem>;
  updateSyncItem(id: string, updates: Partial<InsertSyncItem>): Promise<SyncItem | null>;
  deleteSyncItem(id: string): Promise<boolean>;
  batchCreateSyncItems(items: InsertSyncItem[]): Promise<SyncItem[]>;
  batchUpdateSyncItems(updates: Array<{ id: string, updates: Partial<InsertSyncItem> }>): Promise<number>;
  
  // For database connections (implemented in DatabaseStorage but not in MemStorage)
  connect?(): Promise<void>;
  disconnect?(): Promise<void>;
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private communications: Map<string, CommunicationEntity> = new Map();
  private tags: Map<string, Set<string>> = new Map(); // tag -> set of communication IDs
  private platformConnections: Map<string, PlatformConnection> = new Map();
  private syncOperations: Map<string, SyncOperation> = new Map();
  private syncItems: Map<string, SyncItem> = new Map();
  public sessionStore: session.Store;
  
  constructor() {
    this.sessionStore = new MemStoreConstructor({
      checkPeriod: 86400000 // 24 hours
    });
  }
  
  // Communication methods
  async createCommunication(communication: Omit<CommunicationEntity, 'id'>): Promise<CommunicationEntity> {
    // Generate a UUID (assuming it's a string)
    const id = `comm_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    const newCommunication: CommunicationEntity = {
      ...communication,
      id
    };
    
    this.communications.set(id, newCommunication);
    
    // Update tags
    for (const tag of newCommunication.tags) {
      if (!this.tags.has(tag)) {
        this.tags.set(tag, new Set());
      }
      this.tags.get(tag)?.add(id);
    }
    
    return newCommunication;
  }
  
  async getCommunication(id: string): Promise<CommunicationEntity | null> {
    const communication = this.communications.get(id);
    return communication || null;
  }
  
  async updateCommunication(id: string, updates: Partial<CommunicationEntity>): Promise<CommunicationEntity | null> {
    const communication = this.communications.get(id);
    if (!communication) return null;
    
    // If tags are being updated, update the tags mapping
    if (updates.tags && Array.isArray(updates.tags)) {
      // Remove old tags
      for (const tag of communication.tags) {
        const tagSet = this.tags.get(tag);
        if (tagSet) {
          tagSet.delete(id);
        }
      }
      
      // Add new tags
      for (const tag of updates.tags) {
        if (!this.tags.has(tag)) {
          this.tags.set(tag, new Set());
        }
        this.tags.get(tag)?.add(id);
      }
    }
    
    const updatedCommunication: CommunicationEntity = {
      ...communication,
      ...updates
    };
    
    this.communications.set(id, updatedCommunication);
    return updatedCommunication;
  }
  
  async getAllCommunications(): Promise<CommunicationEntity[]> {
    return Array.from(this.communications.values());
  }
  
  async getAllTags(): Promise<Array<{ tag: string; count: number }>> {
    return Array.from(this.tags.entries()).map(([tag, communications]) => ({
      tag,
      count: communications.size
    }));
  }
  
  // Platform Synchronization Methods
  
  // Platform Connection methods
  async getAllPlatformConnections(): Promise<PlatformConnection[]> {
    return Array.from(this.platformConnections.values());
  }
  
  async getPlatformConnection(id: string): Promise<PlatformConnection | undefined> {
    return this.platformConnections.get(id);
  }
  
  async createPlatformConnection(connection: InsertPlatformConnection): Promise<PlatformConnection> {
    // Generate an ID for the connection if it doesn't have one
    const id = connection.id || uuidv4();
    
    const newConnection: PlatformConnection = {
      ...connection,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    } as PlatformConnection;
    
    this.platformConnections.set(id, newConnection);
    return newConnection;
  }
  
  async updatePlatformConnection(id: string, updates: Partial<InsertPlatformConnection>): Promise<PlatformConnection | null> {
    const connection = this.platformConnections.get(id);
    if (!connection) return null;
    
    const updatedConnection: PlatformConnection = {
      ...connection,
      ...updates,
      updatedAt: new Date()
    };
    
    this.platformConnections.set(id, updatedConnection);
    return updatedConnection;
  }
  
  async deletePlatformConnection(id: string): Promise<boolean> {
    // Delete the connection
    const deleted = this.platformConnections.delete(id);
    
    // Delete all associated sync operations and items
    if (deleted) {
      // Delete sync operations
      for (const [opId, operation] of this.syncOperations.entries()) {
        if (operation.connectionId === id) {
          this.syncOperations.delete(opId);
        }
      }
      
      // Delete sync items
      for (const [itemId, item] of this.syncItems.entries()) {
        if (item.connectionId === id) {
          this.syncItems.delete(itemId);
        }
      }
    }
    
    return deleted;
  }
  
  // Sync Operations methods
  async getSyncOperations(connectionId: string): Promise<SyncOperation[]> {
    const operations: SyncOperation[] = [];
    
    for (const operation of this.syncOperations.values()) {
      if (operation.connectionId === connectionId) {
        operations.push(operation);
      }
    }
    
    // Sort by start time, most recent first
    return operations.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  }
  
  async getSyncOperation(id: string): Promise<SyncOperation | undefined> {
    return this.syncOperations.get(id);
  }
  
  async createSyncOperation(operation: InsertSyncOperation): Promise<SyncOperation> {
    // Generate an ID for the operation if it doesn't have one
    const id = operation.id || uuidv4();
    
    const newOperation: SyncOperation = {
      ...operation,
      id,
      startTime: operation.startTime || new Date()
    } as SyncOperation;
    
    this.syncOperations.set(id, newOperation);
    return newOperation;
  }
  
  async updateSyncOperation(id: string, updates: Partial<InsertSyncOperation>): Promise<SyncOperation | null> {
    const operation = this.syncOperations.get(id);
    if (!operation) return null;
    
    const updatedOperation: SyncOperation = {
      ...operation,
      ...updates
    };
    
    this.syncOperations.set(id, updatedOperation);
    return updatedOperation;
  }
  
  // Sync Items methods
  async getSyncItems(connectionId: string): Promise<SyncItem[]> {
    const items: SyncItem[] = [];
    
    for (const item of this.syncItems.values()) {
      if (item.connectionId === connectionId) {
        items.push(item);
      }
    }
    
    return items;
  }
  
  async getSyncItem(id: string): Promise<SyncItem | undefined> {
    return this.syncItems.get(id);
  }
  
  async getSyncItemByPath(connectionId: string, path: string): Promise<SyncItem | undefined> {
    for (const item of this.syncItems.values()) {
      if (item.connectionId === connectionId && item.path === path) {
        return item;
      }
    }
    
    return undefined;
  }
  
  async createSyncItem(item: InsertSyncItem): Promise<SyncItem> {
    // Generate an ID for the item if it doesn't have one
    const id = item.id || uuidv4();
    
    const newItem: SyncItem = {
      ...item,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    } as SyncItem;
    
    this.syncItems.set(id, newItem);
    return newItem;
  }
  
  async updateSyncItem(id: string, updates: Partial<InsertSyncItem>): Promise<SyncItem | null> {
    const item = this.syncItems.get(id);
    if (!item) return null;
    
    const updatedItem: SyncItem = {
      ...item,
      ...updates,
      updatedAt: new Date()
    };
    
    this.syncItems.set(id, updatedItem);
    return updatedItem;
  }
  
  async deleteSyncItem(id: string): Promise<boolean> {
    return this.syncItems.delete(id);
  }
  
  async batchCreateSyncItems(items: InsertSyncItem[]): Promise<SyncItem[]> {
    const createdItems: SyncItem[] = [];
    
    for (const item of items) {
      const createdItem = await this.createSyncItem(item);
      createdItems.push(createdItem);
    }
    
    return createdItems;
  }
  
  async batchUpdateSyncItems(updates: Array<{ id: string; updates: Partial<InsertSyncItem> }>): Promise<number> {
    let updateCount = 0;
    
    for (const { id, updates: itemUpdates } of updates) {
      const result = await this.updateSyncItem(id, itemUpdates);
      if (result) {
        updateCount++;
      }
    }
    
    return updateCount;
  }
}

/**
 * Create a database storage implementation if DATABASE_URL is available
 * otherwise use memory storage
 */
let storage: IStorage;

if (process.env.DATABASE_URL) {
  // This would be the actual database implementation
  // For now, we're just using memory storage
  storage = new MemStorage();
} else {
  storage = new MemStorage();
}

export { storage };