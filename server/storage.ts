// import { createClient } from '@neondatabase/serverless'; // Uncomment when using actual database
import { drizzle } from 'drizzle-orm/neon-serverless';
import session from 'express-session';
import MemoryStore from 'memorystore';
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
  public sessionStore: session.Store;
  
  constructor() {
    this.sessionStore = new MemStoreConstructor({
      checkPeriod: 86400000 // 24 hours
    });
  }
  
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