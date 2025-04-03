import { 
  User, InsertUser, 
  File, InsertFile, 
  Integration, InsertIntegration, 
  Recommendation, InsertRecommendation
} from "@shared/schema";

// Re-export types for use in other files
export type { 
  User, InsertUser, 
  File, InsertFile, 
  Integration, InsertIntegration, 
  Recommendation, InsertRecommendation 
};

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // File methods
  getFiles(userId: number): Promise<File[]>;
  getFilesByCategory(userId: number, category: string): Promise<File[]>;
  getFilesBySource(userId: number, source: string): Promise<File[]>;
  getRecentFiles(userId: number, limit?: number): Promise<File[]>;
  getFile(id: number): Promise<File | undefined>;
  createFile(file: InsertFile): Promise<File>;
  updateFile(id: number, file: Partial<InsertFile>): Promise<File | undefined>;
  deleteFile(id: number): Promise<boolean>;
  
  // Integration methods
  getIntegrations(userId: number): Promise<Integration[]>;
  getIntegration(id: number): Promise<Integration | undefined>;
  getIntegrationByType(userId: number, type: string): Promise<Integration | undefined>;
  createIntegration(integration: InsertIntegration): Promise<Integration>;
  updateIntegration(id: number, integration: Partial<InsertIntegration>): Promise<Integration | undefined>;
  deleteIntegration(id: number): Promise<boolean>;
  
  // Recommendation methods
  getRecommendations(userId: number): Promise<Recommendation[]>;
  getActiveRecommendations(userId: number): Promise<Recommendation[]>;
  getRecommendation(id: number): Promise<Recommendation | undefined>;
  createRecommendation(recommendation: InsertRecommendation): Promise<Recommendation>;
  updateRecommendation(id: number, recommendation: Partial<InsertRecommendation>): Promise<Recommendation | undefined>;
  deleteRecommendation(id: number): Promise<boolean>;
  
  // Stats methods
  getFileStats(userId: number): Promise<{ category: string; count: number }[]>;
  getIntegrationStats(userId: number): Promise<{ type: string; count: number }[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private files: Map<number, File>;
  private integrations: Map<number, Integration>;
  private recommendations: Map<number, Recommendation>;
  private userIdCounter: number;
  private fileIdCounter: number;
  private integrationIdCounter: number;
  private recommendationIdCounter: number;

  constructor() {
    this.users = new Map();
    this.files = new Map();
    this.integrations = new Map();
    this.recommendations = new Map();
    this.userIdCounter = 1;
    this.fileIdCounter = 1;
    this.integrationIdCounter = 1;
    this.recommendationIdCounter = 1;
    
    // Initialize with sample user
    this.createUser({
      username: "pinky",
      password: "password",
      displayName: "Pinky Kim",
      email: "pinky@example.com"
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    // Type-safe initialization
    const user: User = { 
      id,
      username: insertUser.username,
      password: insertUser.password,
      email: insertUser.email ?? null,
      displayName: insertUser.displayName ?? null
    };
    this.users.set(id, user);
    return user;
  }

  // File methods
  async getFiles(userId: number): Promise<File[]> {
    return Array.from(this.files.values()).filter(
      (file) => file.userId === userId,
    );
  }

  async getFilesByCategory(userId: number, category: string): Promise<File[]> {
    return Array.from(this.files.values()).filter(
      (file) => file.userId === userId && file.fileCategory === category,
    );
  }

  async getFilesBySource(userId: number, source: string): Promise<File[]> {
    return Array.from(this.files.values()).filter(
      (file) => file.userId === userId && file.source === source,
    );
  }

  async getRecentFiles(userId: number, limit: number = 10): Promise<File[]> {
    return Array.from(this.files.values())
      .filter((file) => file.userId === userId)
      .sort((a, b) => {
        const dateA = new Date(a.lastModified ?? 0).getTime();
        const dateB = new Date(b.lastModified ?? 0).getTime();
        return dateB - dateA;
      })
      .slice(0, limit);
  }

  async getFile(id: number): Promise<File | undefined> {
    return this.files.get(id);
  }

  async createFile(insertFile: InsertFile): Promise<File> {
    const id = this.fileIdCounter++;
    // Type-safe initialization
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
      isProcessed: insertFile.isProcessed ?? null
    };
    this.files.set(id, file);
    return file;
  }

  async updateFile(id: number, fileUpdate: Partial<InsertFile>): Promise<File | undefined> {
    const existingFile = this.files.get(id);
    if (!existingFile) return undefined;

    const updatedFile = { ...existingFile, ...fileUpdate };
    this.files.set(id, updatedFile);
    return updatedFile;
  }

  async deleteFile(id: number): Promise<boolean> {
    return this.files.delete(id);
  }

  // Integration methods
  async getIntegrations(userId: number): Promise<Integration[]> {
    return Array.from(this.integrations.values()).filter(
      (integration) => integration.userId === userId,
    );
  }

  async getIntegration(id: number): Promise<Integration | undefined> {
    return this.integrations.get(id);
  }

  async getIntegrationByType(userId: number, type: string): Promise<Integration | undefined> {
    return Array.from(this.integrations.values()).find(
      (integration) => integration.userId === userId && integration.type === type,
    );
  }

  async createIntegration(insertIntegration: InsertIntegration): Promise<Integration> {
    const id = this.integrationIdCounter++;
    // Type-safe initialization
    const integration: Integration = { 
      id,
      name: insertIntegration.name,
      type: insertIntegration.type,
      userId: insertIntegration.userId,
      isConnected: insertIntegration.isConnected ?? null,
      config: insertIntegration.config ?? null,
      lastSynced: insertIntegration.lastSynced ?? null
    };
    this.integrations.set(id, integration);
    return integration;
  }

  async updateIntegration(id: number, integrationUpdate: Partial<InsertIntegration>): Promise<Integration | undefined> {
    const existingIntegration = this.integrations.get(id);
    if (!existingIntegration) return undefined;

    const updatedIntegration = { ...existingIntegration, ...integrationUpdate };
    this.integrations.set(id, updatedIntegration);
    return updatedIntegration;
  }

  async deleteIntegration(id: number): Promise<boolean> {
    return this.integrations.delete(id);
  }

  // Recommendation methods
  async getRecommendations(userId: number): Promise<Recommendation[]> {
    return Array.from(this.recommendations.values()).filter(
      (recommendation) => recommendation.userId === userId,
    );
  }

  async getActiveRecommendations(userId: number): Promise<Recommendation[]> {
    return Array.from(this.recommendations.values()).filter(
      (recommendation) => recommendation.userId === userId && !recommendation.isDismissed,
    );
  }

  async getRecommendation(id: number): Promise<Recommendation | undefined> {
    return this.recommendations.get(id);
  }

  async createRecommendation(insertRecommendation: InsertRecommendation): Promise<Recommendation> {
    const id = this.recommendationIdCounter++;
    // Type-safe initialization
    const recommendation: Recommendation = { 
      id,
      type: insertRecommendation.type,
      userId: insertRecommendation.userId,
      title: insertRecommendation.title,
      description: insertRecommendation.description,
      createdAt: insertRecommendation.createdAt,
      source: insertRecommendation.source ?? null,
      isDismissed: insertRecommendation.isDismissed ?? null
    };
    this.recommendations.set(id, recommendation);
    return recommendation;
  }

  async updateRecommendation(id: number, recommendationUpdate: Partial<InsertRecommendation>): Promise<Recommendation | undefined> {
    const existingRecommendation = this.recommendations.get(id);
    if (!existingRecommendation) return undefined;

    const updatedRecommendation = { ...existingRecommendation, ...recommendationUpdate };
    this.recommendations.set(id, updatedRecommendation);
    return updatedRecommendation;
  }

  async deleteRecommendation(id: number): Promise<boolean> {
    return this.recommendations.delete(id);
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
}

// Export storage instance
export const storage = new MemStorage();
