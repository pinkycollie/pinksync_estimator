import { DataAPIClient, Collection } from "@datastax/astra-db-ts";
import { 
  IStorage
} from "./storage";
import { 
  User, InsertUser,
  File, InsertFile,
  Integration, InsertIntegration,
  Recommendation, InsertRecommendation
} from "@shared/schema";
import { generateEmbedding, generateQueryVector, cosineSimilarity } from "./utils/vectorUtils";

// Astra DB configuration
// The database ID is directly from the URL
const ASTRA_DB_ID = "2ba73933-3d26-47d9-a6f8-69b4f93a4611";
const ASTRA_DB_REGION = "us-east-2"; 
const ASTRA_DB_KEYSPACE = "default_keyspace";

// Get the token and ensure proper format (AstraCS should be uppercase)
let rawToken = process.env.ASTRA_DB_TOKEN || "";

// Fix token format if needed (replace "astracs:" with "AstraCS:")
const ASTRA_DB_TOKEN = rawToken.replace(/^astracs:/i, "AstraCS:");

// Note: For this SDK, we should NOT use the full URL when calling .db()
// We'll keep this for logging purposes only
const ASTRA_DB_ENDPOINT = `https://${ASTRA_DB_ID}-${ASTRA_DB_REGION}.apps.astra.datastax.com`;

// Log token format check
if (ASTRA_DB_TOKEN && !ASTRA_DB_TOKEN.startsWith("AstraCS:")) {
  console.warn("Warning: ASTRA_DB_TOKEN should start with 'AstraCS:' for proper authentication");
}

// Check if token is available at startup
if (!ASTRA_DB_TOKEN) {
  console.warn("Warning: ASTRA_DB_TOKEN environment variable not set");
}

/**
 * Implementation of IStorage using Astra DB with the new TypeScript SDK
 */
export class AstraStorage implements IStorage {
  private client: DataAPIClient | null = null;
  private db: any = null;
  private usersCollection: Collection | null = null;
  private filesCollection: Collection | null = null;
  private integrationsCollection: Collection | null = null;
  private recommendationsCollection: Collection | null = null;
  private isConnected: boolean = false;
  
  constructor() {
    this.initializeCollections();
  }

  private async initializeCollections() {
    try {
      // If ASTRA_DB_TOKEN is not set, fall back to in-memory storage
      if (!ASTRA_DB_TOKEN) {
        console.warn("ASTRA_DB_TOKEN not set, using in-memory storage instead");
        this.isConnected = false;
        return;
      }

      try {
        // Parse the endpoint to extract the DB ID and region
        // According to the Astra DB docs, we should use the full endpoint URL
        console.log(`Connecting to Astra DB using endpoint: ${ASTRA_DB_ENDPOINT}`);
        
        // Trace the token format being used 
        const tokenDebugInfo = ASTRA_DB_TOKEN
          ? `Token format: starts with "${ASTRA_DB_TOKEN.substring(0, 8)}...", length: ${ASTRA_DB_TOKEN.length}`
          : "Token is empty";
        console.log(tokenDebugInfo);
        
        // Initialize client using the new TypeScript SDK with DataAPIClient
        this.client = new DataAPIClient(ASTRA_DB_TOKEN);
        
        // The SDK has two signatures we can use:
        // 1. .db(endpoint, options?)
        // 2. .db(id, region, options?)
        try {
          // Use method overload with id and region separately
          this.db = this.client.db(ASTRA_DB_ID, ASTRA_DB_REGION, { keyspace: ASTRA_DB_KEYSPACE });
          console.log(`Database client initialized with ID: ${ASTRA_DB_ID}, region: ${ASTRA_DB_REGION}, keyspace: ${ASTRA_DB_KEYSPACE}`);
        } catch (dbInitError) {
          console.error("Error initializing DB client:", dbInitError);
          throw dbInitError;
        }
        
        // For debugging - log the structure of token parts
        if (ASTRA_DB_TOKEN) {
          const tokenParts = ASTRA_DB_TOKEN.split(':');
          console.log(`Token parts: ${tokenParts.length}, first part: "${tokenParts[0]}"`);
        }
        
        console.log("Astra client created successfully");

        // Create or get collections using a hybrid approach
        // User information is frequently accessed and critical - gets its own collection
        this.usersCollection = this.db.collection("pinky_users");
        console.log("Created 'pinky_users' collection for user data");
        
        // Files are high-volume and frequently queried - gets its own collection
        this.filesCollection = this.db.collection("pinky_files");
        console.log("Created 'pinky_files' collection for file data");
        
        // Integrations and recommendations are related to system interactions
        // and often queried together - grouped in a shared collection
        const interactionsCollection = this.db.collection("pinky_interactions");
        this.integrationsCollection = interactionsCollection;
        this.recommendationsCollection = interactionsCollection;
        console.log("Created 'pinky_interactions' collection for integrations and recommendations");
        
        // We'll still use docType for proper data segmentation within each collection
        
        console.log("Created collection references using KeySpace:", ASTRA_DB_KEYSPACE);
        
        // Test the connection with a simple findOne operation
        try {
          // Try a simple query to test connection
          const testDoc = await this.usersCollection?.findOne({ username: "test" });
          console.log("Connection verified with findOne operation");
          this.isConnected = true;
        } catch (findError: any) {
          // Check if the error is just that the document wasn't found (404)
          // which still means the connection is working
          if (findError.status === 404) {
            console.log("Connection verified (document not found but connection works)");
            this.isConnected = true;
          } else {
            console.error("Failed to verify connection:", findError);
            this.isConnected = false;
          }
        }
      } catch (connectionError) {
        console.error("Failed to connect to Astra DB:", connectionError);
        this.isConnected = false;
      }
    } catch (error) {
      console.error("Error in initializeCollections:", error);
      this.isConnected = false;
    }
  }

  private async ensureConnected() {
    if (!this.isConnected) {
      await this.initializeCollections();
    }
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    await this.ensureConnected();
    if (!this.isConnected || !this.usersCollection) return undefined;
    
    try {
      // Include docType to ensure we're getting a user document
      const response = await this.usersCollection.findOne({ 
        id, 
        docType: 'user' 
      });
      return response as unknown as User || undefined;
    } catch (error) {
      console.error("Error getting user:", error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    await this.ensureConnected();
    try {
      // Handle the case where Astra DB might have connectivity issues
      if (!this.isConnected || !this.usersCollection) {
        throw new Error("Not connected to Astra DB");
      }
      
      // Add docType in the query criteria to only search for user documents
      const response = await this.usersCollection.find({ username, docType: 'user' }, { limit: 1 });
      // Convert FindCursor to array for easier handling
      const results = await response.toArray();
      return results.length > 0 ? results[0] as unknown as User : undefined;
    } catch (error) {
      console.error("Error getting user by username:", error);
      // Throw to trigger the fallback to memory storage in the useAstraDB function
      if (username === "test_connection") {
        throw error;
      }
      return undefined;
    }
  }

  async createUser(user: InsertUser): Promise<User> {
    await this.ensureConnected();
    if (!this.isConnected || !this.usersCollection) {
      throw new Error("Not connected to Astra DB");
    }
    
    try {
      // Get all users to determine next ID (filtered by docType)
      const allUsers = await this.usersCollection.find({ docType: 'user' });
      const users = await allUsers.toArray();
      const id = users.length > 0 
        ? Math.max(...users.map((u: any) => u.id)) + 1
        : 1;
      
      const newUser: User = { 
        ...user, 
        id, 
        email: user.email || null,
        displayName: user.displayName || null 
      };
      
      // Insert the user document with the ID as document ID and type marker
      await this.usersCollection.insertOne({ 
        _id: id.toString(), 
        docType: 'user',
        ...newUser 
      });
      return newUser;
    } catch (error) {
      console.error("Error creating user:", error);
      throw new Error("Failed to create user");
    }
  }

  // File methods
  async getFiles(userId: number): Promise<File[]> {
    await this.ensureConnected();
    if (!this.isConnected || !this.filesCollection) return [];
    
    try {
      // Include docType to filter for file documents
      const response = await this.filesCollection.find({ 
        userId, 
        docType: 'file' 
      });
      const results = await response.toArray();
      return results as unknown as File[];
    } catch (error) {
      console.error("Error getting files:", error);
      return [];
    }
  }

  async getFilesByCategory(userId: number, category: string): Promise<File[]> {
    await this.ensureConnected();
    if (!this.isConnected || !this.filesCollection) return [];
    
    try {
      // Include docType to filter for file documents
      const response = await this.filesCollection.find({ 
        userId, 
        fileCategory: category, 
        docType: 'file' 
      });
      const results = await response.toArray();
      return results as unknown as File[];
    } catch (error) {
      console.error("Error getting files by category:", error);
      return [];
    }
  }

  async getFilesBySource(userId: number, source: string): Promise<File[]> {
    await this.ensureConnected();
    if (!this.isConnected || !this.filesCollection) return [];
    
    try {
      // Include docType to filter for file documents
      const response = await this.filesCollection.find({ 
        userId, 
        source, 
        docType: 'file' 
      });
      const results = await response.toArray();
      return results as unknown as File[];
    } catch (error) {
      console.error("Error getting files by source:", error);
      return [];
    }
  }

  async getRecentFiles(userId: number, limit: number = 10): Promise<File[]> {
    await this.ensureConnected();
    if (!this.isConnected || !this.filesCollection) return [];
    
    try {
      // Include docType to filter for file documents
      const response = await this.filesCollection.find({ 
        userId, 
        docType: 'file' 
      }, { limit });
      const results = await response.toArray();
      
      // Sort by lastModified desc
      return results
        .sort((a: any, b: any) => 
          new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
        )
        .slice(0, limit) as unknown as File[];
    } catch (error) {
      console.error("Error getting recent files:", error);
      return [];
    }
  }

  async getFile(id: number): Promise<File | undefined> {
    await this.ensureConnected();
    if (!this.isConnected || !this.filesCollection) return undefined;
    
    try {
      // Include docType to ensure we're getting a file document
      const response = await this.filesCollection.findOne({ 
        id, 
        docType: 'file' 
      });
      return response as unknown as File || undefined;
    } catch (error) {
      console.error("Error getting file:", error);
      return undefined;
    }
  }

  async createFile(file: InsertFile): Promise<File> {
    await this.ensureConnected();
    if (!this.isConnected || !this.filesCollection) {
      throw new Error("Not connected to Astra DB");
    }
    
    try {
      // Get all files to determine next ID (filtered by docType)
      const allFiles = await this.filesCollection.find({ docType: 'file' });
      const files = await allFiles.toArray();
      const id = files.length > 0 
        ? Math.max(...files.map((f: any) => f.id)) + 1
        : 1;
      
      const newFile: File = { 
        ...file, 
        id,
        path: file.path || null,
        fileType: file.fileType || null,
        fileCategory: file.fileCategory || null,
        sourceId: file.sourceId || null,
        metadata: file.metadata || null,
        isProcessed: file.isProcessed || null,
        contentSummary: file.contentSummary || null,
        contentVector: file.contentVector || null
      };
      
      await this.filesCollection.insertOne({ 
        _id: id.toString(), 
        docType: 'file',
        ...newFile 
      });
      return newFile;
    } catch (error) {
      console.error("Error creating file:", error);
      throw new Error("Failed to create file");
    }
  }

  async updateFile(id: number, fileUpdate: Partial<InsertFile>): Promise<File | undefined> {
    await this.ensureConnected();
    if (!this.isConnected || !this.filesCollection) return undefined;
    
    try {
      const existingFile = await this.getFile(id);
      if (!existingFile) return undefined;
      
      const updatedFile = { ...existingFile, ...fileUpdate };
      await this.filesCollection.updateOne({ id, docType: 'file' }, { $set: fileUpdate });
      return updatedFile;
    } catch (error) {
      console.error("Error updating file:", error);
      return undefined;
    }
  }

  async deleteFile(id: number): Promise<boolean> {
    await this.ensureConnected();
    if (!this.isConnected || !this.filesCollection) return false;
    
    try {
      await this.filesCollection.deleteOne({ id, docType: 'file' });
      return true;
    } catch (error) {
      console.error("Error deleting file:", error);
      return false;
    }
  }

  // Integration methods
  async getIntegrations(userId: number): Promise<Integration[]> {
    await this.ensureConnected();
    if (!this.isConnected || !this.integrationsCollection) return [];
    
    try {
      // Add docType to filter out recommendations from the same collection
      const response = await this.integrationsCollection.find({ 
        userId, 
        docType: 'integration' 
      });
      const results = await response.toArray();
      return results as unknown as Integration[];
    } catch (error) {
      console.error("Error getting integrations:", error);
      return [];
    }
  }

  async getIntegration(id: number): Promise<Integration | undefined> {
    await this.ensureConnected();
    if (!this.isConnected || !this.integrationsCollection) return undefined;
    
    try {
      // Include docType to ensure we're getting an integration document
      const response = await this.integrationsCollection.findOne({ 
        id, 
        docType: 'integration' 
      });
      return response as unknown as Integration || undefined;
    } catch (error) {
      console.error("Error getting integration:", error);
      return undefined;
    }
  }

  async getIntegrationByType(userId: number, type: string): Promise<Integration | undefined> {
    await this.ensureConnected();
    if (!this.isConnected || !this.integrationsCollection) return undefined;
    
    try {
      // Include docType to ensure we're only searching integration documents
      const response = await this.integrationsCollection.find({ 
        userId, 
        type,
        docType: 'integration' 
      }, { limit: 1 });
      const results = await response.toArray();
      return results.length > 0 ? results[0] as unknown as Integration : undefined;
    } catch (error) {
      console.error("Error getting integration by type:", error);
      return undefined;
    }
  }

  async createIntegration(integration: InsertIntegration): Promise<Integration> {
    await this.ensureConnected();
    if (!this.isConnected || !this.integrationsCollection) {
      throw new Error("Not connected to Astra DB");
    }
    
    try {
      // Get all integrations to determine next ID (filtered by docType)
      const allIntegrations = await this.integrationsCollection.find({ docType: 'integration' });
      const integrations = await allIntegrations.toArray();
      const id = integrations.length > 0 
        ? Math.max(...integrations.map((i: any) => i.id)) + 1
        : 1;
      
      const newIntegration: Integration = { 
        ...integration, 
        id,
        isConnected: integration.isConnected || null,
        config: integration.config || null,
        lastSynced: integration.lastSynced || null
      };
      
      await this.integrationsCollection.insertOne({ 
        _id: id.toString(),
        docType: 'integration',
        ...newIntegration 
      });
      return newIntegration;
    } catch (error) {
      console.error("Error creating integration:", error);
      throw new Error("Failed to create integration");
    }
  }

  async updateIntegration(id: number, integrationUpdate: Partial<InsertIntegration>): Promise<Integration | undefined> {
    await this.ensureConnected();
    if (!this.isConnected || !this.integrationsCollection) return undefined;
    
    try {
      const existingIntegration = await this.getIntegration(id);
      if (!existingIntegration) return undefined;
      
      const updatedIntegration = { ...existingIntegration, ...integrationUpdate };
      await this.integrationsCollection.updateOne({ id, docType: 'integration' }, { $set: integrationUpdate });
      return updatedIntegration;
    } catch (error) {
      console.error("Error updating integration:", error);
      return undefined;
    }
  }

  async deleteIntegration(id: number): Promise<boolean> {
    await this.ensureConnected();
    if (!this.isConnected || !this.integrationsCollection) return false;
    
    try {
      await this.integrationsCollection.deleteOne({ id, docType: 'integration' });
      return true;
    } catch (error) {
      console.error("Error deleting integration:", error);
      return false;
    }
  }

  // Recommendation methods
  async getRecommendations(userId: number): Promise<Recommendation[]> {
    await this.ensureConnected();
    if (!this.isConnected || !this.recommendationsCollection) return [];
    
    try {
      // Add docType to filter out integrations from the same collection
      const response = await this.recommendationsCollection.find({ 
        userId, 
        docType: 'recommendation' 
      });
      const results = await response.toArray();
      return results as unknown as Recommendation[];
    } catch (error) {
      console.error("Error getting recommendations:", error);
      return [];
    }
  }

  async getActiveRecommendations(userId: number): Promise<Recommendation[]> {
    await this.ensureConnected();
    if (!this.isConnected || !this.recommendationsCollection) return [];
    
    try {
      // Get all recommendations for the user and filter by isDismissed
      // Include docType to ensure we only get recommendations
      const response = await this.recommendationsCollection.find({ 
        userId,
        docType: 'recommendation'
      });
      const results = await response.toArray();
      return results.filter((rec: any) => !rec.isDismissed) as unknown as Recommendation[];
    } catch (error) {
      console.error("Error getting active recommendations:", error);
      return [];
    }
  }

  async getRecommendation(id: number): Promise<Recommendation | undefined> {
    await this.ensureConnected();
    if (!this.isConnected || !this.recommendationsCollection) return undefined;
    
    try {
      // Include docType to ensure we're getting a recommendation document
      const response = await this.recommendationsCollection.findOne({ 
        id, 
        docType: 'recommendation' 
      });
      return response as unknown as Recommendation || undefined;
    } catch (error) {
      console.error("Error getting recommendation:", error);
      return undefined;
    }
  }

  async createRecommendation(recommendation: InsertRecommendation): Promise<Recommendation> {
    await this.ensureConnected();
    if (!this.isConnected || !this.recommendationsCollection) {
      throw new Error("Not connected to Astra DB");
    }
    
    try {
      // Get all recommendations to determine next ID (filtered by docType)
      const allRecommendations = await this.recommendationsCollection.find({ docType: 'recommendation' });
      const recommendations = await allRecommendations.toArray();
      const id = recommendations.length > 0 
        ? Math.max(...recommendations.map((r: any) => r.id)) + 1
        : 1;
      
      const newRecommendation: Recommendation = { 
        ...recommendation, 
        id,
        source: recommendation.source || null,
        isDismissed: recommendation.isDismissed || null
      };
      
      await this.recommendationsCollection.insertOne({ 
        _id: id.toString(),
        docType: 'recommendation',
        ...newRecommendation 
      });
      return newRecommendation;
    } catch (error) {
      console.error("Error creating recommendation:", error);
      throw new Error("Failed to create recommendation");
    }
  }

  async updateRecommendation(id: number, recommendationUpdate: Partial<InsertRecommendation>): Promise<Recommendation | undefined> {
    await this.ensureConnected();
    if (!this.isConnected || !this.recommendationsCollection) return undefined;
    
    try {
      const existingRecommendation = await this.getRecommendation(id);
      if (!existingRecommendation) return undefined;
      
      const updatedRecommendation = { ...existingRecommendation, ...recommendationUpdate };
      await this.recommendationsCollection.updateOne({ id, docType: 'recommendation' }, { $set: recommendationUpdate });
      return updatedRecommendation;
    } catch (error) {
      console.error("Error updating recommendation:", error);
      return undefined;
    }
  }

  async deleteRecommendation(id: number): Promise<boolean> {
    await this.ensureConnected();
    if (!this.isConnected || !this.recommendationsCollection) return false;
    
    try {
      await this.recommendationsCollection.deleteOne({ id, docType: 'recommendation' });
      return true;
    } catch (error) {
      console.error("Error deleting recommendation:", error);
      return false;
    }
  }

  // Stats methods
  async getFileStats(userId: number): Promise<{ category: string; count: number }[]> {
    await this.ensureConnected();
    if (!this.isConnected || !this.filesCollection) return [];
    
    try {
      const userFiles = await this.getFiles(userId);
      
      const stats = userFiles.reduce((acc: {[key: string]: number}, file) => {
        const category = file.fileCategory || 'uncategorized';
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {});
      
      return Object.entries(stats).map(([category, count]) => ({ category, count }));
    } catch (error) {
      console.error("Error getting file stats:", error);
      return [];
    }
  }

  async getIntegrationStats(userId: number): Promise<{ type: string; count: number }[]> {
    await this.ensureConnected();
    if (!this.isConnected || !this.integrationsCollection) return [];
    
    try {
      const userIntegrations = await this.getIntegrations(userId);
      
      const stats = userIntegrations.reduce((acc: {[key: string]: number}, integration) => {
        const type = integration.type;
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {});
      
      return Object.entries(stats).map(([type, count]) => ({ type, count }));
    } catch (error) {
      console.error("Error getting integration stats:", error);
      return [];
    }
  }

  // Synchronization methods
  async synchronizeDropbox(userId: number, integrationId: number): Promise<{ success: boolean; fileCount: number; errors?: string[] }> {
    await this.ensureConnected();
    if (!this.isConnected || !this.filesCollection || !this.integrationsCollection) {
      return { success: false, fileCount: 0, errors: ['Database connection unavailable'] };
    }

    try {
      // Check if integration exists and is valid
      const integration = await this.getIntegration(integrationId);
      if (!integration || integration.userId !== userId || integration.type !== 'dropbox') {
        return { success: false, fileCount: 0, errors: ['Invalid integration'] };
      }

      // Update last synced timestamp
      await this.updateIntegration(integrationId, { 
        lastSynced: new Date() 
      });

      // Simulate fetching files from Dropbox API
      // In production, this would use the Dropbox API with proper authentication
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

      // Insert files with docType (important for Astra DB collection approach)
      const createdFiles = await Promise.all(
        sampleFiles.map(async file => {
          // Check if file with same sourceId already exists
          const existingFile = await this.filesCollection?.findOne({ 
            userId, 
            source: 'dropbox', 
            sourceId: file.sourceId,
            docType: 'file'
          });

          if (existingFile) {
            // Update existing file
            return this.updateFile(existingFile.id, {
              ...file,
              lastModified: new Date()
            });
          } else {
            // Create new file
            return this.createFile(file);
          }
        })
      );

      return { success: true, fileCount: createdFiles.filter(Boolean).length };
    } catch (error: any) {
      console.error("Error synchronizing Dropbox:", error);
      return { 
        success: false, 
        fileCount: 0, 
        errors: [error.message || 'Unknown error during Dropbox synchronization'] 
      };
    }
  }

  async synchronizeIOS(userId: number, integrationId: number): Promise<{ success: boolean; fileCount: number; errors?: string[] }> {
    await this.ensureConnected();
    if (!this.isConnected || !this.filesCollection || !this.integrationsCollection) {
      return { success: false, fileCount: 0, errors: ['Database connection unavailable'] };
    }

    try {
      // Check if integration exists and is valid
      const integration = await this.getIntegration(integrationId);
      if (!integration || integration.userId !== userId || integration.type !== 'ios') {
        return { success: false, fileCount: 0, errors: ['Invalid iOS integration'] };
      }

      // Update last synced timestamp
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
        },
        {
          name: 'Screenshot.png',
          path: '/Photos/Screenshot.png',
          fileType: '.png',
          fileCategory: 'image',
          source: 'ios',
          sourceId: 'ios_3',
          lastModified: new Date(),
          userId: userId,
          metadata: { dimensions: '1284x2778', size: 2400000 },
          isProcessed: false
        }
      ];

      // Insert files with docType (important for Astra DB collection approach)
      const createdFiles = await Promise.all(
        sampleFiles.map(async file => {
          // Check if file with same sourceId already exists
          const existingFile = await this.filesCollection?.findOne({ 
            userId, 
            source: 'ios', 
            sourceId: file.sourceId,
            docType: 'file'
          });

          if (existingFile) {
            // Update existing file
            return this.updateFile(existingFile.id, {
              ...file,
              lastModified: new Date()
            });
          } else {
            // Create new file
            return this.createFile(file);
          }
        })
      );

      return { success: true, fileCount: createdFiles.filter(Boolean).length };
    } catch (error: any) {
      console.error("Error synchronizing iOS:", error);
      return { 
        success: false, 
        fileCount: 0, 
        errors: [error.message || 'Unknown error during iOS synchronization'] 
      };
    }
  }

  async synchronizeUbuntu(userId: number, integrationId: number): Promise<{ success: boolean; fileCount: number; errors?: string[] }> {
    await this.ensureConnected();
    if (!this.isConnected || !this.filesCollection || !this.integrationsCollection) {
      return { success: false, fileCount: 0, errors: ['Database connection unavailable'] };
    }

    try {
      // Check if integration exists and is valid
      const integration = await this.getIntegration(integrationId);
      if (!integration || integration.userId !== userId || integration.type !== 'ubuntu') {
        return { success: false, fileCount: 0, errors: ['Invalid Ubuntu integration'] };
      }

      // Update last synced timestamp
      await this.updateIntegration(integrationId, { 
        lastSynced: new Date() 
      });

      // Simulate fetching files from Ubuntu
      const sampleFiles: InsertFile[] = [
        {
          name: 'app.py',
          path: '/home/user/projects/python/app.py',
          fileType: '.py',
          fileCategory: 'code',
          source: 'ubuntu',
          sourceId: 'ubuntu_1',
          lastModified: new Date(),
          userId: userId,
          metadata: { lines: 245, size: 8500 },
          isProcessed: false
        },
        {
          name: 'data.csv',
          path: '/home/user/data/data.csv',
          fileType: '.csv',
          fileCategory: 'document',
          source: 'ubuntu',
          sourceId: 'ubuntu_2',
          lastModified: new Date(),
          userId: userId,
          metadata: { rows: 1500, size: 75000 },
          isProcessed: false
        },
        {
          name: 'config.json',
          path: '/home/user/config/config.json',
          fileType: '.json',
          fileCategory: 'code',
          source: 'ubuntu',
          sourceId: 'ubuntu_3',
          lastModified: new Date(),
          userId: userId,
          metadata: { size: 2500 },
          isProcessed: false
        }
      ];

      // Insert files with docType (important for Astra DB collection approach)
      const createdFiles = await Promise.all(
        sampleFiles.map(async file => {
          // Check if file with same sourceId already exists
          const existingFile = await this.filesCollection?.findOne({ 
            userId, 
            source: 'ubuntu', 
            sourceId: file.sourceId,
            docType: 'file'
          });

          if (existingFile) {
            // Update existing file
            return this.updateFile(existingFile.id, {
              ...file,
              lastModified: new Date()
            });
          } else {
            // Create new file
            return this.createFile(file);
          }
        })
      );

      return { success: true, fileCount: createdFiles.filter(Boolean).length };
    } catch (error: any) {
      console.error("Error synchronizing Ubuntu:", error);
      return { 
        success: false, 
        fileCount: 0, 
        errors: [error.message || 'Unknown error during Ubuntu synchronization'] 
      };
    }
  }

  async synchronizeWindows(userId: number, integrationId: number): Promise<{ success: boolean; fileCount: number; errors?: string[] }> {
    await this.ensureConnected();
    if (!this.isConnected || !this.filesCollection || !this.integrationsCollection) {
      return { success: false, fileCount: 0, errors: ['Database connection unavailable'] };
    }

    try {
      // Check if integration exists and is valid
      const integration = await this.getIntegration(integrationId);
      if (!integration || integration.userId !== userId || integration.type !== 'windows') {
        return { success: false, fileCount: 0, errors: ['Invalid Windows integration'] };
      }

      // Update last synced timestamp
      await this.updateIntegration(integrationId, { 
        lastSynced: new Date() 
      });

      // Simulate fetching files from Windows
      const sampleFiles: InsertFile[] = [
        {
          name: 'Quarterly Report.pptx',
          path: 'C:\\Users\\User\\Documents\\Presentations\\Quarterly Report.pptx',
          fileType: '.pptx',
          fileCategory: 'document',
          source: 'windows',
          sourceId: 'win_1',
          lastModified: new Date(),
          userId: userId,
          metadata: { slides: 24, size: 5600000 },
          isProcessed: false
        },
        {
          name: 'Project Timeline.xlsx',
          path: 'C:\\Users\\User\\Documents\\Project\\Timeline.xlsx',
          fileType: '.xlsx',
          fileCategory: 'document',
          source: 'windows',
          sourceId: 'win_2',
          lastModified: new Date(),
          userId: userId,
          metadata: { sheets: 3, size: 450000 },
          isProcessed: false
        },
        {
          name: 'Requirements.docx',
          path: 'C:\\Users\\User\\Documents\\Project\\Requirements.docx',
          fileType: '.docx',
          fileCategory: 'document',
          source: 'windows',
          sourceId: 'win_3',
          lastModified: new Date(),
          userId: userId,
          metadata: { pages: 12, size: 350000 },
          isProcessed: false
        }
      ];

      // Insert files with docType (important for Astra DB collection approach)
      const createdFiles = await Promise.all(
        sampleFiles.map(async file => {
          // Check if file with same sourceId already exists
          const existingFile = await this.filesCollection?.findOne({ 
            userId, 
            source: 'windows', 
            sourceId: file.sourceId,
            docType: 'file'
          });

          if (existingFile) {
            // Update existing file
            return this.updateFile(existingFile.id, {
              ...file,
              lastModified: new Date()
            });
          } else {
            // Create new file
            return this.createFile(file);
          }
        })
      );

      return { success: true, fileCount: createdFiles.filter(Boolean).length };
    } catch (error: any) {
      console.error("Error synchronizing Windows:", error);
      return { 
        success: false, 
        fileCount: 0, 
        errors: [error.message || 'Unknown error during Windows synchronization'] 
      };
    }
  }

  // Platform-specific file operations
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

  // Conflict resolution
  async resolveFileConflicts(userId: number, fileIds: number[]): Promise<{ resolved: number; failed: number }> {
    await this.ensureConnected();
    if (!this.isConnected || !this.filesCollection) {
      return { resolved: 0, failed: fileIds.length };
    }

    let resolved = 0;
    let failed = 0;

    for (const fileId of fileIds) {
      try {
        const file = await this.getFile(fileId);
        if (file && file.userId === userId) {
          // Add conflict resolution metadata and mark as processed
          let newMetadata: any = { conflictResolved: true, resolvedAt: new Date() };
          
          if (file.metadata && typeof file.metadata === 'object') {
            newMetadata = { 
              ...file.metadata as Record<string, any>,
              conflictResolved: true,
              resolvedAt: new Date()
            };
          }
          
          const success = await this.updateFile(fileId, { 
            isProcessed: true,
            metadata: newMetadata
          });
          
          if (success) {
            resolved++;
          } else {
            failed++;
          }
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
  
  /**
   * Process a file to add AI-generated vector embeddings and content summary
   * @param fileId ID of the file to process
   * @returns The updated file with vector embeddings, or undefined if not found or error
   */
  async processFileForVectorSearch(fileId: number): Promise<File | undefined> {
    await this.ensureConnected();
    if (!this.isConnected || !this.filesCollection) return undefined;
    
    try {
      const file = await this.getFile(fileId);
      if (!file) return undefined;
      
      // Generate content summary from file metadata and name
      const contentSummary = this.generateContentSummary(file);
      
      // Generate vector embedding for the content summary
      const contentVector = await generateEmbedding(contentSummary);
      
      if (!contentVector) {
        console.warn(`Failed to generate vector embedding for file ID ${fileId}`);
        return file;
      }
      
      // Update the file with the content summary and vector
      const updatedFile = await this.updateFile(fileId, {
        metadata: {
          ...file.metadata as Record<string, any>,
          contentSummary,
          contentVector
        },
        isProcessed: true
      });
      
      return updatedFile;
    } catch (error) {
      console.error(`Error processing file ${fileId} for vector search:`, error);
      return undefined;
    }
  }
  
  /**
   * Process all unprocessed files for a user to add vector embeddings
   * @param userId User ID to process files for
   * @returns Count of successfully processed files
   */
  async processAllUserFilesForVectorSearch(userId: number): Promise<number> {
    await this.ensureConnected();
    if (!this.isConnected || !this.filesCollection) return 0;
    
    try {
      // Get all files for the user that aren't processed yet
      const response = await this.filesCollection.find({
        userId,
        docType: 'file',
        isProcessed: { $ne: true }
      });
      const files = await response.toArray() as unknown as File[];
      
      let processedCount = 0;
      
      for (const file of files) {
        try {
          await this.processFileForVectorSearch(file.id);
          processedCount++;
        } catch (error) {
          console.error(`Error processing file ${file.id}:`, error);
        }
      }
      
      return processedCount;
    } catch (error) {
      console.error(`Error processing files for vector search for user ${userId}:`, error);
      return 0;
    }
  }
  
  /**
   * Perform a semantic search across a user's files
   * @param userId User ID to search files for
   * @param query Search query text
   * @param limit Maximum number of results to return
   * @param threshold Minimum similarity score (0-1)
   * @returns Array of files sorted by similarity to the query
   */
  async searchFilesByVector(
    userId: number, 
    query: string, 
    limit: number = 10,
    threshold: number = 0.7
  ): Promise<File[]> {
    await this.ensureConnected();
    if (!this.isConnected || !this.filesCollection) return [];
    
    try {
      // Generate vector embedding for the query
      const queryVector = await generateQueryVector(query);
      
      if (!queryVector) {
        console.warn(`Failed to generate vector embedding for query: ${query}`);
        return [];
      }
      
      // Get all processed files for the user
      const response = await this.filesCollection.find({
        userId,
        docType: 'file',
        isProcessed: true
      });
      const files = await response.toArray() as unknown as File[];
      
      // Filter files that have content vectors
      const filesWithVectors = files.filter(file => {
        const metadata = file.metadata || {};
        return metadata.contentVector && Array.isArray(metadata.contentVector);
      });
      
      // Calculate similarity scores for each file
      const scoredFiles = filesWithVectors.map(file => {
        const metadata = file.metadata || {};
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
  
  /**
   * Find files similar to a specific file
   * @param fileId ID of the file to find similar files for
   * @param limit Maximum number of results to return
   * @param threshold Minimum similarity score (0-1)
   * @returns Array of files sorted by similarity
   */
  async findSimilarFiles(
    fileId: number,
    limit: number = 5,
    threshold: number = 0.7
  ): Promise<File[]> {
    await this.ensureConnected();
    if (!this.isConnected || !this.filesCollection) return [];
    
    try {
      // Get the source file
      const sourceFile = await this.getFile(fileId);
      if (!sourceFile) return [];
      
      const metadata = sourceFile.metadata || {};
      
      // Check if the source file has a content vector
      if (!metadata.contentVector || !Array.isArray(metadata.contentVector)) {
        // Process the file if it doesn't have a vector
        const processedFile = await this.processFileForVectorSearch(fileId);
        if (!processedFile || !processedFile.metadata?.contentVector) {
          return [];
        }
      }
      
      // Use the source file's vector to find similar files
      const sourceVector = metadata.contentVector;
      
      // Get all processed files for the same user
      const response = await this.filesCollection.find({
        userId: sourceFile.userId,
        docType: 'file',
        isProcessed: true,
        id: { $ne: fileId } // Exclude the source file
      });
      const files = await response.toArray() as unknown as File[];
      
      // Filter files that have content vectors
      const filesWithVectors = files.filter(file => {
        const fileMetadata = file.metadata || {};
        return fileMetadata.contentVector && Array.isArray(fileMetadata.contentVector);
      });
      
      // Calculate similarity scores for each file
      const scoredFiles = filesWithVectors.map(file => {
        const fileMetadata = file.metadata || {};
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
    
    // Get category as a string
    const category = file.fileCategory || 'unknown';
    
    // Extract any metadata
    const metadata = file.metadata || {};
    
    // Create a summary string
    let summary = `File: ${fileName}\n`;
    summary += `Category: ${category}\n`;
    summary += `Type: ${file.fileType || fileExtension || 'unknown'}\n`;
    summary += `Source: ${file.source}\n`;
    
    // Add path information if available
    if (file.path) {
      summary += `Path: ${file.path}\n`;
    }
    
    // Add metadata fields if available (excluding vector data)
    if (Object.keys(metadata).length > 0) {
      summary += 'Metadata:\n';
      for (const [key, value] of Object.entries(metadata)) {
        // Skip vector data and internal fields
        if (key === 'contentVector' || key === 'contentSummary') continue;
        
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          summary += `- ${key}: ${value}\n`;
        }
      }
    }
    
    return summary;
  }
}

// Export a singleton instance
export const astraStorage = new AstraStorage();