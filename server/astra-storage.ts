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

const ASTRA_DB_ID = "2ba73933-3d26-47d9-a6f8-69b4f93a4611-us-east-2";
const ASTRA_DB_REGION = "us-east-2";
const ASTRA_DB_KEYSPACE = "pinky_os";
const ASTRA_DB_TOKEN = process.env.ASTRA_DB_TOKEN || "";

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
      // Create an Astra DB client
      const astraClient = await createClient({
        astraDatabaseId: ASTRA_DB_ID,
        astraDatabaseRegion: ASTRA_DB_REGION,
        applicationToken: ASTRA_DB_TOKEN,
      });
      
      // Create document collections for each data type
      this.usersCollection = await astraClient.namespace(ASTRA_DB_KEYSPACE).collection("users");
      this.filesCollection = await astraClient.namespace(ASTRA_DB_KEYSPACE).collection("files");
      this.integrationsCollection = await astraClient.namespace(ASTRA_DB_KEYSPACE).collection("integrations");
      this.recommendationsCollection = await astraClient.namespace(ASTRA_DB_KEYSPACE).collection("recommendations");

      console.log("Connected to Astra DB successfully");
      this.isConnected = true;
    } catch (error) {
      console.error("Failed to connect to Astra DB:", error);
      throw new Error("Failed to connect to Astra DB");
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
      const response = await this.usersCollection.find({ username }, { limit: 1 });
      return response.data.length > 0 ? response.data[0] as User : undefined;
    } catch (error) {
      console.error("Error getting user by username:", error);
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
      const response = await this.recommendationsCollection.find({ userId, active: true });
      return response.data as Recommendation[];
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