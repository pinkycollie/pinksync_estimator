import Database from '@replit/database';
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

const MemoryStore = createMemoryStore(session);

/**
 * Implementation of IStorage using Replit Database
 */
export class ReplitStorage implements IStorage {
  sessionStore: session.Store;
  private db: Database;
  private userIdCounter: number = 1;
  private fileIdCounter: number = 1;
  private integrationIdCounter: number = 1;
  private recommendationIdCounter: number = 1;
  private initialized: boolean = false;

  constructor() {
    // Initialize session store with memory store
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
    this.db = new Database();
    this.initialize();
  }

  /**
   * Initialize the database with counters and demo user
   */
  private async initialize() {
    try {
      // Initialize counters if they don't exist
      try {
        const userCounter = await this.db.get('user_id_counter');
        if (!userCounter) {
          await this.db.set('user_id_counter', 1);
        } else {
          this.userIdCounter = Number(userCounter);
        }
      } catch (error) {
        console.error('Error initializing user counter:', error);
        await this.db.set('user_id_counter', 1);
      }

      try {
        const fileCounter = await this.db.get('file_id_counter');
        if (!fileCounter) {
          await this.db.set('file_id_counter', 1);
        } else {
          this.fileIdCounter = Number(fileCounter);
        }
      } catch (error) {
        console.error('Error initializing file counter:', error);
        await this.db.set('file_id_counter', 1);
      }

      try {
        const integrationCounter = await this.db.get('integration_id_counter');
        if (!integrationCounter) {
          await this.db.set('integration_id_counter', 1);
        } else {
          this.integrationIdCounter = Number(integrationCounter);
        }
      } catch (error) {
        console.error('Error initializing integration counter:', error);
        await this.db.set('integration_id_counter', 1);
      }

      try {
        const recommendationCounter = await this.db.get('recommendation_id_counter');
        if (!recommendationCounter) {
          await this.db.set('recommendation_id_counter', 1);
        } else {
          this.recommendationIdCounter = Number(recommendationCounter);
        }
      } catch (error) {
        console.error('Error initializing recommendation counter:', error);
        await this.db.set('recommendation_id_counter', 1);
      }

      // Create demo user if none exists
      try {
        const users = await this.getAllUsers();
        if (users.length === 0) {
          await this.createUser({
            username: "pinky",
            password: "password",
            displayName: "Pinky Kim",
            email: "pinky@example.com"
          });
          console.log('Created demo user: pinky');
        }
      } catch (error) {
        console.error('Error creating demo user:', error);
        // Try direct creation since getAllUsers might fail
        await this.createUser({
          username: "pinky",
          password: "password",
          displayName: "Pinky Kim",
          email: "pinky@example.com"
        });
        console.log('Created demo user through fallback method');
      }

      this.initialized = true;
      console.log('Replit Database initialized successfully');
    } catch (error) {
      console.error('Error initializing Replit Database:', error);
      // Mark as initialized anyway to prevent hanging
      this.initialized = true;
    }
  }

  /**
   * Ensure the database is initialized before operations
   */
  private async ensureInitialized() {
    if (!this.initialized) {
      console.log('Waiting for database initialization...');
      try {
        // Wait for initialization with timeout to avoid hanging
        await Promise.race([
          new Promise(resolve => {
            const checkInterval = setInterval(() => {
              if (this.initialized) {
                clearInterval(checkInterval);
                resolve(true);
              }
            }, 100);
          }),
          new Promise((_, reject) => {
            setTimeout(() => {
              // Force initialization if it's taking too long
              this.initialized = true;
              console.warn('Database initialization timed out. Forcing initialization.');
            }, 5000);
          })
        ]);
      } catch (error) {
        console.error('Error waiting for initialization:', error);
        // Force initialization to avoid hanging
        this.initialized = true;
      }
      console.log('Database initialization complete or timed out');
    }
  }

  /**
   * Get all users (helper method)
   */
  private async getAllUsers(): Promise<User[]> {
    try {
      const userKeys = await this.db.list('user_');
      const users: User[] = [];
      
      // Check if userKeys is an iterable object
      if (userKeys && typeof userKeys[Symbol.iterator] === 'function') {
        for (const key of userKeys) {
          const user = await this.db.get(key);
          if (user) {
            users.push(user as User);
          }
        }
      } else {
        console.log('userKeys is not iterable or empty:', userKeys);
      }
      
      return users;
    } catch (error) {
      console.error('Error getting all users:', error);
      return [];
    }
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    await this.ensureInitialized();
    try {
      const user = await this.db.get(`user_${id}`);
      return user ? (user as User) : undefined;
    } catch (error) {
      console.error(`Error getting user ${id}:`, error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    await this.ensureInitialized();
    const users = await this.getAllUsers();
    return users.find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    await this.ensureInitialized();
    const id = this.userIdCounter++;
    
    try {
      await this.db.set('user_id_counter', this.userIdCounter);
      
      const user: User = { 
        id,
        username: insertUser.username,
        password: insertUser.password,
        email: insertUser.email ?? null,
        displayName: insertUser.displayName ?? null
      };
      
      const result = await this.db.set(`user_${id}`, user);
      
      // Check if the set operation was successful
      if (result && (result as any).ok) {
        console.log(`User ${id} created successfully`);
      } else {
        console.warn(`Unexpected response when creating user ${id}:`, result);
      }
      
      return user;
    } catch (error) {
      console.error(`Error creating user:`, error);
      // Return the user object anyway since we incremented the counter
      return { 
        id,
        username: insertUser.username,
        password: insertUser.password,
        email: insertUser.email ?? null,
        displayName: insertUser.displayName ?? null
      };
    }
  }

  // File methods
  async getFiles(userId: number): Promise<File[]> {
    await this.ensureInitialized();
    try {
      const fileKeys = await this.db.list(`file_`);
      const files: File[] = [];
      
      // Check if fileKeys is an iterable object
      if (fileKeys && typeof fileKeys[Symbol.iterator] === 'function') {
        for (const key of fileKeys) {
          const file = await this.db.get(key) as File;
          if (file && file.userId === userId) {
            files.push(file);
          }
        }
      } else {
        console.log('fileKeys is not iterable or empty:', fileKeys);
      }
      
      return files;
    } catch (error) {
      console.error('Error getting files:', error);
      return [];
    }
  }

  async getFilesByCategory(userId: number, category: string): Promise<File[]> {
    const files = await this.getFiles(userId);
    return files.filter(file => file.fileCategory === category);
  }

  async getFilesBySource(userId: number, source: string): Promise<File[]> {
    const files = await this.getFiles(userId);
    return files.filter(file => file.source === source);
  }

  async getRecentFiles(userId: number, limit: number = 10): Promise<File[]> {
    const files = await this.getFiles(userId);
    return files
      .sort((a, b) => {
        const dateA = new Date(a.lastModified).getTime();
        const dateB = new Date(b.lastModified).getTime();
        return dateB - dateA;
      })
      .slice(0, limit);
  }

  async getFile(id: number): Promise<File | undefined> {
    await this.ensureInitialized();
    try {
      const file = await this.db.get(`file_${id}`);
      return file ? (file as File) : undefined;
    } catch (error) {
      console.error(`Error getting file ${id}:`, error);
      return undefined;
    }
  }

  async createFile(insertFile: InsertFile): Promise<File> {
    await this.ensureInitialized();
    const id = this.fileIdCounter++;
    
    try {
      await this.db.set('file_id_counter', this.fileIdCounter);
      
      const file: File = { 
        id,
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
      };
      
      const result = await this.db.set(`file_${id}`, file);
      
      // Check if the set operation was successful
      if (result && (result as any).ok) {
        console.log(`File ${id} created successfully`);
      } else {
        console.warn(`Unexpected response when creating file ${id}:`, result);
      }
      
      return file;
    } catch (error) {
      console.error(`Error creating file:`, error);
      // Return the file object anyway since we incremented the counter
      return { 
        id,
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
      };
    }
  }

  async updateFile(id: number, fileUpdate: Partial<InsertFile>): Promise<File | undefined> {
    await this.ensureInitialized();
    const existingFile = await this.getFile(id);
    if (!existingFile) return undefined;

    const updatedFile = { ...existingFile, ...fileUpdate };
    await this.db.set(`file_${id}`, updatedFile);
    return updatedFile;
  }

  async deleteFile(id: number): Promise<boolean> {
    await this.ensureInitialized();
    const file = await this.getFile(id);
    if (!file) return false;
    
    await this.db.delete(`file_${id}`);
    return true;
  }

  // Integration methods
  async getIntegrations(userId: number): Promise<Integration[]> {
    await this.ensureInitialized();
    try {
      const integrationKeys = await this.db.list(`integration_`);
      const integrations: Integration[] = [];
      
      // Check if integrationKeys is an iterable object
      if (integrationKeys && typeof integrationKeys[Symbol.iterator] === 'function') {
        for (const key of integrationKeys) {
          const integration = await this.db.get(key) as Integration;
          if (integration && integration.userId === userId) {
            integrations.push(integration);
          }
        }
      } else {
        console.log('integrationKeys is not iterable or empty:', integrationKeys);
      }
      
      return integrations;
    } catch (error) {
      console.error('Error getting integrations:', error);
      return [];
    }
  }

  async getIntegration(id: number): Promise<Integration | undefined> {
    await this.ensureInitialized();
    try {
      const integration = await this.db.get(`integration_${id}`);
      return integration ? (integration as Integration) : undefined;
    } catch (error) {
      console.error(`Error getting integration ${id}:`, error);
      return undefined;
    }
  }

  async getIntegrationByType(userId: number, type: string): Promise<Integration | undefined> {
    const integrations = await this.getIntegrations(userId);
    return integrations.find(integration => integration.type === type);
  }

  async createIntegration(insertIntegration: InsertIntegration): Promise<Integration> {
    await this.ensureInitialized();
    const id = this.integrationIdCounter++;
    
    try {
      await this.db.set('integration_id_counter', this.integrationIdCounter);
      
      const integration: Integration = { 
        id,
        name: insertIntegration.name,
        type: insertIntegration.type,
        userId: insertIntegration.userId,
        isConnected: insertIntegration.isConnected ?? false,
        config: insertIntegration.config ?? null,
        lastSynced: insertIntegration.lastSynced ?? null
      };
      
      const result = await this.db.set(`integration_${id}`, integration);
      
      // Check if the set operation was successful
      if (result && (result as any).ok) {
        console.log(`Integration ${id} created successfully`);
      } else {
        console.warn(`Unexpected response when creating integration ${id}:`, result);
      }
      
      return integration;
    } catch (error) {
      console.error(`Error creating integration:`, error);
      // Return the integration object anyway since we incremented the counter
      return { 
        id,
        name: insertIntegration.name,
        type: insertIntegration.type,
        userId: insertIntegration.userId,
        isConnected: insertIntegration.isConnected ?? false,
        config: insertIntegration.config ?? null,
        lastSynced: insertIntegration.lastSynced ?? null
      };
    }
  }

  async updateIntegration(id: number, integrationUpdate: Partial<InsertIntegration>): Promise<Integration | undefined> {
    await this.ensureInitialized();
    const existingIntegration = await this.getIntegration(id);
    if (!existingIntegration) return undefined;

    const updatedIntegration = { ...existingIntegration, ...integrationUpdate };
    await this.db.set(`integration_${id}`, updatedIntegration);
    return updatedIntegration;
  }

  async deleteIntegration(id: number): Promise<boolean> {
    await this.ensureInitialized();
    const integration = await this.getIntegration(id);
    if (!integration) return false;
    
    await this.db.delete(`integration_${id}`);
    return true;
  }

  // Recommendation methods
  async getRecommendations(userId: number): Promise<Recommendation[]> {
    await this.ensureInitialized();
    try {
      const recommendationKeys = await this.db.list(`recommendation_`);
      const recommendations: Recommendation[] = [];
      
      // Check if recommendationKeys is an iterable object
      if (recommendationKeys && typeof recommendationKeys[Symbol.iterator] === 'function') {
        for (const key of recommendationKeys) {
          const recommendation = await this.db.get(key) as Recommendation;
          if (recommendation && recommendation.userId === userId) {
            recommendations.push(recommendation);
          }
        }
      } else {
        console.log('recommendationKeys is not iterable or empty:', recommendationKeys);
      }
      
      return recommendations;
    } catch (error) {
      console.error('Error getting recommendations:', error);
      return [];
    }
  }

  async getActiveRecommendations(userId: number): Promise<Recommendation[]> {
    const recommendations = await this.getRecommendations(userId);
    return recommendations.filter(recommendation => !recommendation.isDismissed);
  }

  async getRecommendation(id: number): Promise<Recommendation | undefined> {
    await this.ensureInitialized();
    try {
      const recommendation = await this.db.get(`recommendation_${id}`);
      return recommendation ? (recommendation as Recommendation) : undefined;
    } catch (error) {
      console.error(`Error getting recommendation ${id}:`, error);
      return undefined;
    }
  }

  async createRecommendation(insertRecommendation: InsertRecommendation): Promise<Recommendation> {
    await this.ensureInitialized();
    const id = this.recommendationIdCounter++;
    
    try {
      await this.db.set('recommendation_id_counter', this.recommendationIdCounter);
      
      const recommendation: Recommendation = { 
        id,
        type: insertRecommendation.type,
        userId: insertRecommendation.userId,
        title: insertRecommendation.title,
        description: insertRecommendation.description,
        createdAt: insertRecommendation.createdAt,
        source: insertRecommendation.source ?? null,
        isDismissed: insertRecommendation.isDismissed ?? false
      };
      
      const result = await this.db.set(`recommendation_${id}`, recommendation);
      
      // Check if the set operation was successful
      if (result && (result as any).ok) {
        console.log(`Recommendation ${id} created successfully`);
      } else {
        console.warn(`Unexpected response when creating recommendation ${id}:`, result);
      }
      
      return recommendation;
    } catch (error) {
      console.error(`Error creating recommendation:`, error);
      // Return the recommendation object anyway since we incremented the counter
      return { 
        id,
        type: insertRecommendation.type,
        userId: insertRecommendation.userId,
        title: insertRecommendation.title,
        description: insertRecommendation.description,
        createdAt: insertRecommendation.createdAt,
        source: insertRecommendation.source ?? null,
        isDismissed: insertRecommendation.isDismissed ?? false
      };
    }
  }

  async updateRecommendation(id: number, recommendationUpdate: Partial<InsertRecommendation>): Promise<Recommendation | undefined> {
    await this.ensureInitialized();
    const existingRecommendation = await this.getRecommendation(id);
    if (!existingRecommendation) return undefined;

    const updatedRecommendation = { ...existingRecommendation, ...recommendationUpdate };
    await this.db.set(`recommendation_${id}`, updatedRecommendation);
    return updatedRecommendation;
  }

  async deleteRecommendation(id: number): Promise<boolean> {
    await this.ensureInitialized();
    const recommendation = await this.getRecommendation(id);
    if (!recommendation) return false;
    
    await this.db.delete(`recommendation_${id}`);
    return true;
  }

  // Stats methods
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

  // Synchronization methods for various platforms
  async synchronizeDropbox(userId: number, integrationId: number): Promise<{ success: boolean; fileCount: number; errors?: string[] }> {
    try {
      const integration = await this.getIntegration(integrationId);
      if (!integration || integration.userId !== userId || integration.type !== 'dropbox') {
        return { success: false, fileCount: 0, errors: ['Invalid integration'] };
      }

      // Update last synced time
      await this.updateIntegration(integrationId, { 
        lastSynced: new Date() 
      });

      // Simulate fetching files from Dropbox API
      // In a real app, this would use the Dropbox API client
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
        },
        {
          name: 'Financial Report.xlsx',
          path: '/Documents/Finance/Financial Report.xlsx',
          fileType: '.xlsx',
          fileCategory: 'document',
          source: 'dropbox',
          sourceId: 'dbx_2',
          lastModified: new Date(),
          userId: userId,
          metadata: { size: 345000, shared: true },
          isProcessed: false
        }
      ];

      // Create files in our system
      const createdFiles = await Promise.all(
        sampleFiles.map(file => this.createFile(file))
      );

      return { success: true, fileCount: createdFiles.length };
    } catch (error: any) {
      return { 
        success: false, 
        fileCount: 0, 
        errors: [error.message || 'Unknown error during Dropbox synchronization'] 
      };
    }
  }

  async synchronizeIOS(userId: number, integrationId: number): Promise<{ success: boolean; fileCount: number; errors?: string[] }> {
    try {
      const integration = await this.getIntegration(integrationId);
      if (!integration || integration.userId !== userId || integration.type !== 'ios') {
        return { success: false, fileCount: 0, errors: ['Invalid iOS integration'] };
      }

      // Update last synced time
      await this.updateIntegration(integrationId, { 
        lastSynced: new Date() 
      });

      // Simulate fetching files from iOS device
      const sampleFiles: InsertFile[] = [
        {
          name: 'Voice Memo.m4a',
          path: '/Recordings/Voice Memo.m4a',
          fileType: '.m4a',
          fileCategory: 'audio',
          source: 'ios',
          sourceId: 'ios_1',
          lastModified: new Date(),
          userId: userId,
          metadata: { duration: '2:45', size: 4500000 },
          isProcessed: false
        },
        {
          name: 'Notes from Meeting.txt',
          path: '/Notes/Notes from Meeting.txt',
          fileType: '.txt',
          fileCategory: 'note',
          source: 'ios',
          sourceId: 'ios_2',
          lastModified: new Date(),
          userId: userId,
          metadata: { size: 1500 },
          isProcessed: false
        }
      ];

      // Create files in our system
      const createdFiles = await Promise.all(
        sampleFiles.map(file => this.createFile(file))
      );

      return { success: true, fileCount: createdFiles.length };
    } catch (error: any) {
      return { 
        success: false, 
        fileCount: 0, 
        errors: [error.message || 'Unknown error during iOS synchronization'] 
      };
    }
  }

  async synchronizeUbuntu(userId: number, integrationId: number): Promise<{ success: boolean; fileCount: number; errors?: string[] }> {
    try {
      const integration = await this.getIntegration(integrationId);
      if (!integration || integration.userId !== userId || integration.type !== 'ubuntu') {
        return { success: false, fileCount: 0, errors: ['Invalid Ubuntu integration'] };
      }

      // Update last synced time
      await this.updateIntegration(integrationId, { 
        lastSynced: new Date() 
      });

      // Simulate fetching files from Ubuntu
      const sampleFiles: InsertFile[] = [
        {
          name: 'app.py',
          path: '/home/user/projects/app.py',
          fileType: '.py',
          fileCategory: 'code',
          source: 'ubuntu',
          sourceId: 'ubu_1',
          lastModified: new Date(),
          userId: userId,
          metadata: { size: 4500, lines: 150 },
          isProcessed: false
        },
        {
          name: 'data.csv',
          path: '/home/user/data/data.csv',
          fileType: '.csv',
          fileCategory: 'document',
          source: 'ubuntu',
          sourceId: 'ubu_2',
          lastModified: new Date(),
          userId: userId,
          metadata: { size: 25000, rows: 500 },
          isProcessed: false
        }
      ];

      // Create files in our system
      const createdFiles = await Promise.all(
        sampleFiles.map(file => this.createFile(file))
      );

      return { success: true, fileCount: createdFiles.length };
    } catch (error: any) {
      return { 
        success: false, 
        fileCount: 0, 
        errors: [error.message || 'Unknown error during Ubuntu synchronization'] 
      };
    }
  }

  async synchronizeWindows(userId: number, integrationId: number): Promise<{ success: boolean; fileCount: number; errors?: string[] }> {
    try {
      const integration = await this.getIntegration(integrationId);
      if (!integration || integration.userId !== userId || integration.type !== 'windows') {
        return { success: false, fileCount: 0, errors: ['Invalid Windows integration'] };
      }

      // Update last synced time
      await this.updateIntegration(integrationId, { 
        lastSynced: new Date() 
      });

      // Simulate fetching files from Windows
      const sampleFiles: InsertFile[] = [
        {
          name: 'Presentation.pptx',
          path: 'C:\\Users\\user\\Documents\\Presentation.pptx',
          fileType: '.pptx',
          fileCategory: 'document',
          source: 'windows',
          sourceId: 'win_1',
          lastModified: new Date(),
          userId: userId,
          metadata: { size: 3500000, slides: 25 },
          isProcessed: false
        },
        {
          name: 'Invoice.pdf',
          path: 'C:\\Users\\user\\Downloads\\Invoice.pdf',
          fileType: '.pdf',
          fileCategory: 'document',
          source: 'windows',
          sourceId: 'win_2',
          lastModified: new Date(),
          userId: userId,
          metadata: { size: 150000, pages: 2 },
          isProcessed: false
        }
      ];

      // Create files in our system
      const createdFiles = await Promise.all(
        sampleFiles.map(file => this.createFile(file))
      );

      return { success: true, fileCount: createdFiles.length };
    } catch (error: any) {
      return { 
        success: false, 
        fileCount: 0, 
        errors: [error.message || 'Unknown error during Windows synchronization'] 
      };
    }
  }

  // Platform-specific file retrieval
  async getDropboxFiles(userId: number): Promise<File[]> {
    const files = await this.getFiles(userId);
    return files.filter(file => file.source === 'dropbox');
  }

  async getIOSFiles(userId: number): Promise<File[]> {
    const files = await this.getFiles(userId);
    return files.filter(file => file.source === 'ios');
  }

  async getUbuntuFiles(userId: number): Promise<File[]> {
    const files = await this.getFiles(userId);
    return files.filter(file => file.source === 'ubuntu');
  }

  async getWindowsFiles(userId: number): Promise<File[]> {
    const files = await this.getFiles(userId);
    return files.filter(file => file.source === 'windows');
  }

  // Conflict resolution
  async resolveFileConflicts(userId: number, fileIds: number[]): Promise<{ resolved: number; failed: number }> {
    let resolved = 0;
    let failed = 0;

    for (const fileId of fileIds) {
      try {
        const file = await this.getFile(fileId);
        if (file && file.userId === userId) {
          // Simulate conflict resolution by marking the file as processed
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
        console.error(`Error resolving conflict for file ${fileId}:`, error);
        failed++;
      }
    }

    return { resolved, failed };
  }

  // Vector search methods
  async processFileForVectorSearch(fileId: number): Promise<File | undefined> {
    const file = await this.getFile(fileId);
    if (!file) return undefined;
    
    try {
      // Generate content summary from file metadata and name
      const contentSummary = this.generateContentSummary(file);
      
      // Generate vector embedding for the content summary using HuggingFace
      const contentVector = await generateHfEmbedding(contentSummary);
      
      if (!contentVector) {
        console.warn(`Failed to generate vector embedding for file ID ${fileId}`);
        return file;
      }
      
      // Update the file with the content summary and vector
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
      console.error(`Error processing file ${fileId} for vector search:`, error);
      return file;
    }
  }

  async processAllUserFilesForVectorSearch(userId: number): Promise<number> {
    try {
      // Get all files for the user that aren't processed yet
      const files = await this.getFiles(userId);
      const unprocessedFiles = files.filter(file => !file.isProcessed);
      
      let processedCount = 0;
      
      // Process each file
      for (const file of unprocessedFiles) {
        const updated = await this.processFileForVectorSearch(file.id);
        if (updated && updated.isProcessed) {
          processedCount++;
        }
      }
      
      return processedCount;
    } catch (error) {
      console.error(`Error processing files for vector search for user ${userId}:`, error);
      return 0;
    }
  }

  async searchFilesByVector(userId: number, query: string, limit: number = 10, threshold: number = 0.6): Promise<File[]> {
    try {
      // Generate vector for query
      const queryVector = await generateHfEmbedding(query);
      if (!queryVector) {
        console.error('Failed to generate vector for query:', query);
        return [];
      }
      
      // Get all files for the user
      const files = await this.getFiles(userId);
      
      // Filter files that have content vectors
      const filesWithVectors = files.filter(file => {
        const metadata = file.metadata || {};
        return metadata && typeof metadata === 'object' && 
               'contentVector' in (metadata as any) && 
               Array.isArray((metadata as any).contentVector);
      });
      
      // Calculate similarity scores for each file
      const scoredFiles = filesWithVectors.map(file => {
        const metadata = file.metadata as Record<string, any> || {};
        const contentVector = metadata.contentVector;
        
        const similarity = cosineSimilarity(queryVector, contentVector);
        return { file, similarity };
      });
      
      // Filter by threshold and sort by similarity (highest first)
      return scoredFiles
        .filter(item => item.similarity >= threshold)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit)
        .map(item => item.file);
    } catch (error) {
      console.error(`Error searching files by vector for user ${userId}:`, error);
      return [];
    }
  }

  async findSimilarFiles(fileId: number, limit: number = 5, threshold: number = 0.7): Promise<File[]> {
    try {
      // Get the source file
      const sourceFile = await this.getFile(fileId);
      if (!sourceFile) {
        return [];
      }
      
      // Get the source file's vector
      const sourceMetadata = sourceFile.metadata as Record<string, any> || {};
      const sourceVector = sourceMetadata.contentVector;
      
      if (!sourceVector || !Array.isArray(sourceVector)) {
        return [];
      }
      
      // Get all files for the user except the source file
      const files = (await this.getFiles(sourceFile.userId)).filter(
        file => file.id !== fileId // Exclude the source file
      );
      
      // Filter files that have content vectors
      const filesWithVectors = files.filter(file => {
        const fileMetadata = file.metadata as Record<string, any> || {};
        return fileMetadata && 'contentVector' in fileMetadata && 
               Array.isArray(fileMetadata.contentVector);
      });
      
      // Calculate similarity scores for each file
      const scoredFiles = filesWithVectors.map(file => {
        const fileMetadata = file.metadata as Record<string, any> || {};
        const contentVector = fileMetadata.contentVector;
        
        const similarity = cosineSimilarity(sourceVector, contentVector);
        return { file, similarity };
      });
      
      // Filter by threshold and sort by similarity (highest first)
      return scoredFiles
        .filter(item => item.similarity >= threshold)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit)
        .map(item => item.file);
    } catch (error) {
      console.error(`Error finding similar files for file ${fileId}:`, error);
      return [];
    }
  }

  /**
   * Generate a content summary for a file based on its metadata
   * @param file The file to generate a summary for
   * @returns A text summary of the file
   */
  private generateContentSummary(file: File): string {
    // Extract filename and extension
    const fileName = file.name || '';
    const fileExtension = fileName.includes('.') ? fileName.split('.').pop()?.toLowerCase() : '';
    
    // Create a summary based on file type and metadata
    let summary = `${fileName} - ${file.fileCategory || 'unknown'} file`;
    
    if (file.path) {
      summary += ` located at ${file.path}`;
    }
    
    if (file.source) {
      summary += ` from ${file.source}`;
    }
    
    // Add content from metadata if available
    const metadata = file.metadata as Record<string, any> || {};
    if (metadata && metadata.content) {
      summary += `. Contents: ${metadata.content}`;
    }
    
    // Add more metadata based on file type
    switch (fileExtension) {
      case 'md':
      case 'txt':
        if (metadata.content) {
          summary += ` Text content: ${metadata.content}`;
        }
        break;
      case 'pdf':
      case 'docx':
      case 'doc':
        if (metadata.pages) {
          summary += ` Document with ${metadata.pages} pages.`;
        }
        break;
      case 'jpg':
      case 'png':
      case 'gif':
        if (metadata.dimensions) {
          summary += ` Image dimensions: ${metadata.dimensions}.`;
        }
        break;
      case 'mp3':
      case 'm4a':
      case 'wav':
        if (metadata.duration) {
          summary += ` Audio duration: ${metadata.duration}.`;
        }
        break;
    }
    
    // Add last modified date
    if (file.lastModified) {
      const date = new Date(file.lastModified);
      summary += ` Last modified: ${date.toLocaleDateString()}.`;
    }
    
    return summary;
  }
}

// Export a singleton instance
export const replitStorage = new ReplitStorage();