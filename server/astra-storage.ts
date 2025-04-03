import { createClient } from "@astrajs/collections";
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
// The Astra DB ID is the UUID part of your database URL
// Example: https://2ba73933-3d26-47d9-a6f8-69b4f93a4611-us-east-2.apps.astra.datastax.com
// becomes "2ba73933-3d26-47d9-a6f8-69b4f93a4611"
const ASTRA_DB_ID = "2ba73933-3d26-47d9-a6f8-69b4f93a4611";
const ASTRA_DB_REGION = "us-east-2";
const ASTRA_DB_KEYSPACE = "pinky_os";
const ASTRA_DB_TOKEN = process.env.ASTRA_DB_TOKEN || "";

// Get the API endpoint from DB ID and region
const ASTRA_DB_ENDPOINT = `https://${ASTRA_DB_ID}-${ASTRA_DB_REGION}.apps.astra.datastax.com`;

// Check token format
if (ASTRA_DB_TOKEN && !ASTRA_DB_TOKEN.startsWith("AstraCS:")) {
  console.warn("Warning: ASTRA_DB_TOKEN should start with 'AstraCS:'");
}

// Check if token is available at startup
if (!ASTRA_DB_TOKEN) {
  console.warn("Warning: ASTRA_DB_TOKEN environment variable not set");
}

/**
 * Implementation of IStorage using Astra DB
 */
export class AstraStorage implements IStorage {
  private usersCollection: any;
  private filesCollection: any;
  private integrationsCollection: any;
  private recommendationsCollection: any;
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
        return; // Don't throw, just return to indicate not connected
      }

      try {
        // Updated configuration based on the latest documentation
        // Following https://docs.datastax.com/en/astra-db-serverless/integrations/unstructured-io.html
        const astraClient = await createClient({
          astraDatabaseId: ASTRA_DB_ID,
          astraDatabaseRegion: ASTRA_DB_REGION,
          applicationToken: ASTRA_DB_TOKEN,
        });
        
        console.log("Astra client created successfully");
        
        // Create document collections for each data type
        this.usersCollection = await astraClient.namespace(ASTRA_DB_KEYSPACE).collection("users");
        this.filesCollection = await astraClient.namespace(ASTRA_DB_KEYSPACE).collection("files");
        this.integrationsCollection = await astraClient.namespace(ASTRA_DB_KEYSPACE).collection("integrations");
        this.recommendationsCollection = await astraClient.namespace(ASTRA_DB_KEYSPACE).collection("recommendations");
        
        // Check if collections are working by attempting a simple query
        await this.usersCollection.find({}, { limit: 1 });
        console.log("Connected to Astra DB successfully");
        this.isConnected = true;
      } catch (connectionError) {
        console.error("Failed to connect to Astra DB:", connectionError);
        this.isConnected = false;
        // Don't throw, just set isConnected to false
      }
    } catch (error) {
      console.error("Error in initializeCollections:", error);
      this.isConnected = false;
      // Don't throw, just set isConnected to false
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
    try {
      const response = await this.usersCollection.findOne({ id });
      return response ? response as User : undefined;
    } catch (error) {
      console.error("Error getting user:", error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    await this.ensureConnected();
    try {
      // Handle the case where Astra DB might have connectivity issues
      // but we want the system to continue operating with memory storage
      if (!this.isConnected || !this.usersCollection) {
        throw new Error("Not connected to Astra DB");
      }
      
      const response = await this.usersCollection.find({ username }, { limit: 1 });
      return response.data.length > 0 ? response.data[0] as User : undefined;
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
    try {
      // Get the next ID
      const allUsers = await this.usersCollection.find({});
      const id = allUsers.data.length > 0 
        ? Math.max(...allUsers.data.map((u: User) => u.id)) + 1
        : 1;
      
      const newUser: User = { 
        ...user, 
        id, 
        email: user.email || null,
        displayName: user.displayName || null 
      };
      await this.usersCollection.create(newUser.id.toString(), newUser);
      return newUser;
    } catch (error) {
      console.error("Error creating user:", error);
      throw new Error("Failed to create user");
    }
  }

  // File methods
  async getFiles(userId: number): Promise<File[]> {
    await this.ensureConnected();
    try {
      const response = await this.filesCollection.find({ userId });
      return response.data as File[];
    } catch (error) {
      console.error("Error getting files:", error);
      return [];
    }
  }

  async getFilesByCategory(userId: number, category: string): Promise<File[]> {
    await this.ensureConnected();
    try {
      const response = await this.filesCollection.find({ userId, category });
      return response.data as File[];
    } catch (error) {
      console.error("Error getting files by category:", error);
      return [];
    }
  }

  async getFilesBySource(userId: number, source: string): Promise<File[]> {
    await this.ensureConnected();
    try {
      const response = await this.filesCollection.find({ userId, source });
      return response.data as File[];
    } catch (error) {
      console.error("Error getting files by source:", error);
      return [];
    }
  }

  async getRecentFiles(userId: number, limit: number = 10): Promise<File[]> {
    await this.ensureConnected();
    try {
      const response = await this.filesCollection.find({ userId }, { limit });
      // Sort by lastModified desc
      return response.data
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
    try {
      const response = await this.filesCollection.findOne({ id });
      return response ? response as File : undefined;
    } catch (error) {
      console.error("Error getting file:", error);
      return undefined;
    }
  }

  async createFile(file: InsertFile): Promise<File> {
    await this.ensureConnected();
    try {
      // Get the next ID
      const allFiles = await this.filesCollection.find({});
      const id = allFiles.data.length > 0 
        ? Math.max(...allFiles.data.map((f: File) => f.id)) + 1
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
      await this.filesCollection.create(newFile.id.toString(), newFile);
      return newFile;
    } catch (error) {
      console.error("Error creating file:", error);
      throw new Error("Failed to create file");
    }
  }

  async updateFile(id: number, fileUpdate: Partial<InsertFile>): Promise<File | undefined> {
    await this.ensureConnected();
    try {
      const existingFile = await this.getFile(id);
      if (!existingFile) return undefined;
      
      const updatedFile = { ...existingFile, ...fileUpdate };
      await this.filesCollection.update(id.toString(), updatedFile);
      return updatedFile;
    } catch (error) {
      console.error("Error updating file:", error);
      return undefined;
    }
  }

  async deleteFile(id: number): Promise<boolean> {
    await this.ensureConnected();
    try {
      await this.filesCollection.delete(id.toString());
      return true;
    } catch (error) {
      console.error("Error deleting file:", error);
      return false;
    }
  }

  // Integration methods
  async getIntegrations(userId: number): Promise<Integration[]> {
    await this.ensureConnected();
    try {
      const response = await this.integrationsCollection.find({ userId });
      return response.data as Integration[];
    } catch (error) {
      console.error("Error getting integrations:", error);
      return [];
    }
  }

  async getIntegration(id: number): Promise<Integration | undefined> {
    await this.ensureConnected();
    try {
      const response = await this.integrationsCollection.findOne({ id });
      return response ? response as Integration : undefined;
    } catch (error) {
      console.error("Error getting integration:", error);
      return undefined;
    }
  }

  async getIntegrationByType(userId: number, type: string): Promise<Integration | undefined> {
    await this.ensureConnected();
    try {
      const response = await this.integrationsCollection.find({ userId, type }, { limit: 1 });
      return response.data.length > 0 ? response.data[0] as Integration : undefined;
    } catch (error) {
      console.error("Error getting integration by type:", error);
      return undefined;
    }
  }

  async createIntegration(integration: InsertIntegration): Promise<Integration> {
    await this.ensureConnected();
    try {
      // Get the next ID
      const allIntegrations = await this.integrationsCollection.find({});
      const id = allIntegrations.data.length > 0 
        ? Math.max(...allIntegrations.data.map((i: Integration) => i.id)) + 1
        : 1;
      
      const newIntegration: Integration = { 
        ...integration, 
        id,
        isConnected: integration.isConnected || null,
        config: integration.config || null,
        lastSynced: integration.lastSynced || null
      };
      await this.integrationsCollection.create(newIntegration.id.toString(), newIntegration);
      return newIntegration;
    } catch (error) {
      console.error("Error creating integration:", error);
      throw new Error("Failed to create integration");
    }
  }

  async updateIntegration(id: number, integrationUpdate: Partial<InsertIntegration>): Promise<Integration | undefined> {
    await this.ensureConnected();
    try {
      const existingIntegration = await this.getIntegration(id);
      if (!existingIntegration) return undefined;
      
      const updatedIntegration = { ...existingIntegration, ...integrationUpdate };
      await this.integrationsCollection.update(id.toString(), updatedIntegration);
      return updatedIntegration;
    } catch (error) {
      console.error("Error updating integration:", error);
      return undefined;
    }
  }

  async deleteIntegration(id: number): Promise<boolean> {
    await this.ensureConnected();
    try {
      await this.integrationsCollection.delete(id.toString());
      return true;
    } catch (error) {
      console.error("Error deleting integration:", error);
      return false;
    }
  }

  // Recommendation methods
  async getRecommendations(userId: number): Promise<Recommendation[]> {
    await this.ensureConnected();
    try {
      const response = await this.recommendationsCollection.find({ userId });
      return response.data as Recommendation[];
    } catch (error) {
      console.error("Error getting recommendations:", error);
      return [];
    }
  }

  async getActiveRecommendations(userId: number): Promise<Recommendation[]> {
    await this.ensureConnected();
    try {
      // Get all recommendations for the user and filter by isDismissed
      const response = await this.recommendationsCollection.find({ userId });
      return response.data.filter((rec: Recommendation) => !rec.isDismissed) as Recommendation[];
    } catch (error) {
      console.error("Error getting active recommendations:", error);
      return [];
    }
  }

  async getRecommendation(id: number): Promise<Recommendation | undefined> {
    await this.ensureConnected();
    try {
      const response = await this.recommendationsCollection.findOne({ id });
      return response ? response as Recommendation : undefined;
    } catch (error) {
      console.error("Error getting recommendation:", error);
      return undefined;
    }
  }

  async createRecommendation(recommendation: InsertRecommendation): Promise<Recommendation> {
    await this.ensureConnected();
    try {
      // Get the next ID
      const allRecommendations = await this.recommendationsCollection.find({});
      const id = allRecommendations.data.length > 0 
        ? Math.max(...allRecommendations.data.map((r: Recommendation) => r.id)) + 1
        : 1;
      
      const newRecommendation: Recommendation = { 
        ...recommendation, 
        id,
        source: recommendation.source || null,
        isDismissed: recommendation.isDismissed || null
      };
      await this.recommendationsCollection.create(newRecommendation.id.toString(), newRecommendation);
      return newRecommendation;
    } catch (error) {
      console.error("Error creating recommendation:", error);
      throw new Error("Failed to create recommendation");
    }
  }

  async updateRecommendation(id: number, recommendationUpdate: Partial<InsertRecommendation>): Promise<Recommendation | undefined> {
    await this.ensureConnected();
    try {
      const existingRecommendation = await this.getRecommendation(id);
      if (!existingRecommendation) return undefined;
      
      const updatedRecommendation = { ...existingRecommendation, ...recommendationUpdate };
      await this.recommendationsCollection.update(id.toString(), updatedRecommendation);
      return updatedRecommendation;
    } catch (error) {
      console.error("Error updating recommendation:", error);
      return undefined;
    }
  }

  async deleteRecommendation(id: number): Promise<boolean> {
    await this.ensureConnected();
    try {
      await this.recommendationsCollection.delete(id.toString());
      return true;
    } catch (error) {
      console.error("Error deleting recommendation:", error);
      return false;
    }
  }

  // Stats methods
  async getFileStats(userId: number): Promise<{ category: string; count: number }[]> {
    await this.ensureConnected();
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