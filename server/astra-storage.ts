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
// The Astra DB endpoint is the full URL to your database
const ASTRA_DB_ENDPOINT = "https://2ba73933-3d26-47d9-a6f8-69b4f93a4611-us-east-2.apps.astra.datastax.com";
const ASTRA_DB_TOKEN = process.env.ASTRA_DB_TOKEN || "";
const ASTRA_DB_NAMESPACE = "pinky_os"; // Namespace/keyspace name

// Check token format
if (ASTRA_DB_TOKEN && !ASTRA_DB_TOKEN.startsWith("AstraCS:")) {
  console.warn("Warning: ASTRA_DB_TOKEN should start with 'AstraCS:'");
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
        // Format: https://2ba73933-3d26-47d9-a6f8-69b4f93a4611-us-east-2.apps.astra.datastax.com
        const urlParts = ASTRA_DB_ENDPOINT.split('.');
        const dbIdWithRegion = urlParts[0].split('//')[1];
        const [dbId, region] = dbIdWithRegion.split('-us-');
        
        console.log(`Connecting to Astra DB with ID: ${dbId} in region: us-${region}`);
        
        // Initialize client using the new TypeScript SDK
        this.client = new DataAPIClient(ASTRA_DB_TOKEN);
        
        // Make sure to append /api/rest/v2 to the endpoint as required by the new SDK
        if (!ASTRA_DB_ENDPOINT.includes('/api/rest')) {
          // For new SDK, we need to add the specific API endpoint
          const apiEndpoint = `${ASTRA_DB_ENDPOINT}/api/rest/v2`;
          console.log(`Using API endpoint: ${apiEndpoint}`);
          this.db = this.client.db(apiEndpoint);
        } else {
          this.db = this.client.db(ASTRA_DB_ENDPOINT);
        }
        
        console.log("Astra client created successfully");

        // First create the namespace/keyspace if it doesn't exist
        try {
          await this.db.createNamespace(ASTRA_DB_NAMESPACE);
          console.log(`Created namespace: ${ASTRA_DB_NAMESPACE}`);
        } catch (nsError) {
          console.log(`Namespace ${ASTRA_DB_NAMESPACE} may already exist: ${nsError.message}`);
        }

        // Create or get collections
        this.usersCollection = this.db.collection(ASTRA_DB_NAMESPACE, "users");
        this.filesCollection = this.db.collection(ASTRA_DB_NAMESPACE, "files");
        this.integrationsCollection = this.db.collection(ASTRA_DB_NAMESPACE, "integrations");
        this.recommendationsCollection = this.db.collection(ASTRA_DB_NAMESPACE, "recommendations");
        
        // Try a simple test operation to verify connection
        try {
          // Try creating indexes to verify connection
          await this.usersCollection.createIndex({ fields: [{ name: "id" }] });
          await this.filesCollection.createIndex({ fields: [{ name: "userId" }] });
          console.log("Successfully created indexes - connection verified");
          this.isConnected = true;
        } catch (indexError) {
          console.log("Index creation attempted, may already exist:", indexError.message);
          // Let's try a different operation to test connection
          try {
            const simpleTest = await this.usersCollection.findOne({ id: 1 });
            console.log("Connection test successful");
            this.isConnected = true;
          } catch (findError) {
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
      return response as User || undefined;
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
      
      const response = await this.usersCollection.find({ username }, { limit: 1 });
      return response.length > 0 ? response[0] as User : undefined;
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
      const id = allUsers.length > 0 
        ? Math.max(...allUsers.map((u: User) => u.id)) + 1
        : 1;
      
      const newUser: User = { 
        ...user, 
        id, 
        email: user.email || null,
        displayName: user.displayName || null 
      };
      
      // Insert the user document with the ID as document ID
      await this.usersCollection.insertOne({ _id: id.toString(), ...newUser });
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
      return response as File[];
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
      return response as File[];
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
      return response as File[];
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
      // Sort by lastModified desc
      return response
        .sort((a: File, b: File) => 
          new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
        )
        .slice(0, limit) as File[];
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
      return response as File || undefined;
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
      const id = allFiles.length > 0 
        ? Math.max(...allFiles.map((f: File) => f.id)) + 1
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
      
      await this.filesCollection.insertOne({ _id: id.toString(), ...newFile });
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
      return response as Integration[];
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
      return response as Integration || undefined;
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
      return response.length > 0 ? response[0] as Integration : undefined;
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
      const id = allIntegrations.length > 0 
        ? Math.max(...allIntegrations.map((i: Integration) => i.id)) + 1
        : 1;
      
      const newIntegration: Integration = { 
        ...integration, 
        id,
        isConnected: integration.isConnected || null,
        config: integration.config || null,
        lastSynced: integration.lastSynced || null
      };
      
      await this.integrationsCollection.insertOne({ _id: id.toString(), ...newIntegration });
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
      return response as Recommendation[];
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
      return response.filter((rec: Recommendation) => !rec.isDismissed) as Recommendation[];
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
      return response as Recommendation || undefined;
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
      const id = allRecommendations.length > 0 
        ? Math.max(...allRecommendations.map((r: Recommendation) => r.id)) + 1
        : 1;
      
      const newRecommendation: Recommendation = { 
        ...recommendation, 
        id,
        source: recommendation.source || null,
        isDismissed: recommendation.isDismissed || null
      };
      
      await this.recommendationsCollection.insertOne({ _id: id.toString(), ...newRecommendation });
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