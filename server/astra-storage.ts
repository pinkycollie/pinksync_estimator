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

        // Create or get collections - using the specified collection name
        // As specified by the user, we need to use the "anynomous_mindmap" collection
        // We'll use this as our main collection and segment data by type
        const mainCollection = this.db.collection("anynomous_mindmap");
        this.usersCollection = mainCollection;
        this.filesCollection = mainCollection;
        this.integrationsCollection = mainCollection;
        this.recommendationsCollection = mainCollection;
        
        console.log("Using collection: anynomous_mindmap for all data types");
        
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
      const response = await this.usersCollection.findOne({ id });
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
      // Get all users to determine next ID
      const allUsers = await this.usersCollection.find({});
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
      const response = await this.filesCollection.find({ userId });
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
      const response = await this.filesCollection.find({ userId, category });
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
      const response = await this.filesCollection.find({ userId, source });
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
      const response = await this.filesCollection.find({ userId }, { limit });
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
      const response = await this.filesCollection.findOne({ id });
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
      // Get all files to determine next ID
      const allFiles = await this.filesCollection.find({});
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
        isProcessed: file.isProcessed || null
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
      await this.filesCollection.updateOne({ id }, { $set: fileUpdate });
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
      await this.filesCollection.deleteOne({ id });
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
      const response = await this.integrationsCollection.find({ userId });
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
      const response = await this.integrationsCollection.findOne({ id });
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
      const response = await this.integrationsCollection.find({ userId, type }, { limit: 1 });
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
      // Get all integrations to determine next ID
      const allIntegrations = await this.integrationsCollection.find({});
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
      await this.integrationsCollection.updateOne({ id }, { $set: integrationUpdate });
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
      await this.integrationsCollection.deleteOne({ id });
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
      const response = await this.recommendationsCollection.find({ userId });
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
      const response = await this.recommendationsCollection.find({ userId });
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
      const response = await this.recommendationsCollection.findOne({ id });
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
      // Get all recommendations to determine next ID
      const allRecommendations = await this.recommendationsCollection.find({});
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
      await this.recommendationsCollection.updateOne({ id }, { $set: recommendationUpdate });
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
      await this.recommendationsCollection.deleteOne({ id });
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
}

// Export a singleton instance
export const astraStorage = new AstraStorage();