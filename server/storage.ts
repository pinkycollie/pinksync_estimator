import { 
  User, InsertUser, 
  File, InsertFile, 
  Integration, InsertIntegration, 
  Recommendation, InsertRecommendation,
  // New types for entrepreneur features
  AiChatHistory, InsertAiChatHistory,
  AiChatMessage, InsertAiChatMessage,
  EntrepreneurIdea, InsertEntrepreneurIdea,
  IdeaVersion, InsertIdeaVersion,
  ProjectPlan, InsertProjectPlan,
  ProjectMilestone, InsertProjectMilestone,
  CodeSource, InsertCodeSource,
  // Enums
  AiPlatform, FileCategory, FileSource, 
  IntegrationType, RecommendationType,
  IdeaStatus, ProjectStatus, MilestoneStatus
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

// Re-export types for use in other files
export type { 
  User, InsertUser, 
  File, InsertFile, 
  Integration, InsertIntegration, 
  Recommendation, InsertRecommendation,
  // New types for entrepreneur features
  AiChatHistory, InsertAiChatHistory,
  AiChatMessage, InsertAiChatMessage,
  EntrepreneurIdea, InsertEntrepreneurIdea,
  IdeaVersion, InsertIdeaVersion,
  ProjectPlan, InsertProjectPlan,
  ProjectMilestone, InsertProjectMilestone,
  CodeSource, InsertCodeSource
};

export interface IStorage {
  // Session storage for authentication
  sessionStore: session.Store;
  
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
  
  // Synchronization methods
  synchronizeDropbox(userId: number, integrationId: number): Promise<{ success: boolean; fileCount: number; errors?: string[] }>;
  synchronizeIOS(userId: number, integrationId: number): Promise<{ success: boolean; fileCount: number; errors?: string[] }>;
  synchronizeUbuntu(userId: number, integrationId: number): Promise<{ success: boolean; fileCount: number; errors?: string[] }>;
  synchronizeWindows(userId: number, integrationId: number): Promise<{ success: boolean; fileCount: number; errors?: string[] }>;
  synchronizeAnytype(userId: number, integrationId: number): Promise<{ success: boolean; itemCount: number; errors?: string[] }>;
  
  // Platform file operations
  getDropboxFiles(userId: number): Promise<File[]>;
  getIOSFiles(userId: number): Promise<File[]>;
  getUbuntuFiles(userId: number): Promise<File[]>;
  getWindowsFiles(userId: number): Promise<File[]>;
  
  // Conflict resolution
  resolveFileConflicts(userId: number, fileIds: number[]): Promise<{ resolved: number; failed: number }>;
  
  // Vector search methods
  processFileForVectorSearch(fileId: number): Promise<File | undefined>;
  processAllUserFilesForVectorSearch(userId: number): Promise<number>;
  searchFilesByVector(userId: number, query: string, limit?: number, threshold?: number): Promise<File[]>;
  findSimilarFiles(fileId: number, limit?: number, threshold?: number): Promise<File[]>;
  
  // AI Chat History methods
  getChatHistories(userId: number): Promise<AiChatHistory[]>;
  getChatHistoriesByPlatform(userId: number, platform: string): Promise<AiChatHistory[]>;
  getChatHistory(id: number): Promise<AiChatHistory | undefined>;
  createChatHistory(chatHistory: InsertAiChatHistory): Promise<AiChatHistory>;
  updateChatHistory(id: number, chatHistory: Partial<InsertAiChatHistory>): Promise<AiChatHistory | undefined>;
  deleteChatHistory(id: number): Promise<boolean>;
  searchChatHistories(userId: number, query: string, limit?: number): Promise<AiChatHistory[]>;
  
  // AI Chat Message methods
  getChatMessages(chatHistoryId: number): Promise<AiChatMessage[]>;
  getChatMessage(id: number): Promise<AiChatMessage | undefined>;
  createChatMessage(message: InsertAiChatMessage): Promise<AiChatMessage>;
  updateChatMessage(id: number, message: Partial<InsertAiChatMessage>): Promise<AiChatMessage | undefined>;
  deleteChatMessage(id: number): Promise<boolean>;
  
  // Process and import AI chat exports
  importChatGPTExport(userId: number, exportData: any): Promise<{ success: boolean; chatsImported: number; messagesImported: number; errors?: string[] }>;
  importClaudeExport(userId: number, exportData: any): Promise<{ success: boolean; chatsImported: number; messagesImported: number; errors?: string[] }>;
  processChatHistoryForVectorSearch(chatHistoryId: number): Promise<AiChatHistory | undefined>;
  
  // Entrepreneur Ideas methods
  getIdeas(userId: number): Promise<EntrepreneurIdea[]>;
  getIdeasByStatus(userId: number, status: string): Promise<EntrepreneurIdea[]>;
  getIdea(id: number): Promise<EntrepreneurIdea | undefined>;
  createIdea(idea: InsertEntrepreneurIdea): Promise<EntrepreneurIdea>;
  updateIdea(id: number, idea: Partial<InsertEntrepreneurIdea>): Promise<EntrepreneurIdea | undefined>;
  deleteIdea(id: number): Promise<boolean>;
  searchIdeas(userId: number, query: string, limit?: number): Promise<EntrepreneurIdea[]>;
  
  // Idea Version methods
  getIdeaVersions(ideaId: number): Promise<IdeaVersion[]>;
  getIdeaVersion(id: number): Promise<IdeaVersion | undefined>;
  createIdeaVersion(version: InsertIdeaVersion): Promise<IdeaVersion>;
  
  // Project Plans methods
  getProjects(userId: number): Promise<ProjectPlan[]>;
  getProjectsByStatus(userId: number, status: string): Promise<ProjectPlan[]>;
  getProject(id: number): Promise<ProjectPlan | undefined>;
  createProject(project: InsertProjectPlan): Promise<ProjectPlan>;
  updateProject(id: number, project: Partial<InsertProjectPlan>): Promise<ProjectPlan | undefined>;
  deleteProject(id: number): Promise<boolean>;
  
  // Project Milestone methods
  getProjectMilestones(projectId: number): Promise<ProjectMilestone[]>;
  getProjectMilestone(id: number): Promise<ProjectMilestone | undefined>;
  createProjectMilestone(milestone: InsertProjectMilestone): Promise<ProjectMilestone>;
  updateProjectMilestone(id: number, milestone: Partial<InsertProjectMilestone>): Promise<ProjectMilestone | undefined>;
  deleteProjectMilestone(id: number): Promise<boolean>;
  
  // Code Source methods
  getCodeSources(userId: number): Promise<CodeSource[]>;
  getCodeSourcesByLanguage(userId: number, language: string): Promise<CodeSource[]>;
  getCodeSource(id: number): Promise<CodeSource | undefined>;
  createCodeSource(codeSource: InsertCodeSource): Promise<CodeSource>;
  updateCodeSource(id: number, codeSource: Partial<InsertCodeSource>): Promise<CodeSource | undefined>;
  deleteCodeSource(id: number): Promise<boolean>;
  searchCodeSources(userId: number, query: string, limit?: number): Promise<CodeSource[]>;
  incrementCodeSourceUseCount(id: number): Promise<CodeSource | undefined>;
}

export class MemStorage implements IStorage {
  sessionStore: session.Store;
  private users: Map<number, User>;
  private files: Map<number, File>;
  private integrations: Map<number, Integration>;
  private recommendations: Map<number, Recommendation>;
  private aiChatHistories: Map<number, AiChatHistory>;
  private aiChatMessages: Map<number, AiChatMessage>;
  private entrepreneurIdeas: Map<number, EntrepreneurIdea>;
  private ideaVersions: Map<number, IdeaVersion>;
  private projectPlans: Map<number, ProjectPlan>;
  private projectMilestones: Map<number, ProjectMilestone>;
  private codeSources: Map<number, CodeSource>;
  private userIdCounter: number;
  private fileIdCounter: number;
  private integrationIdCounter: number;
  private recommendationIdCounter: number;
  private chatHistoryIdCounter: number;
  private chatMessageIdCounter: number;
  private ideaIdCounter: number;
  private ideaVersionIdCounter: number;
  private projectIdCounter: number;
  private milestoneIdCounter: number;
  private codeSourceIdCounter: number;

  constructor() {
    // Initialize session store
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
    
    // Initialize data maps
    this.users = new Map();
    this.files = new Map();
    this.integrations = new Map();
    this.recommendations = new Map();
    this.aiChatHistories = new Map();
    this.aiChatMessages = new Map();
    this.entrepreneurIdeas = new Map();
    this.ideaVersions = new Map();
    this.projectPlans = new Map();
    this.projectMilestones = new Map();
    this.codeSources = new Map();
    
    // Initialize ID counters
    this.userIdCounter = 1;
    this.fileIdCounter = 1;
    this.integrationIdCounter = 1;
    this.recommendationIdCounter = 1;
    this.chatHistoryIdCounter = 1;
    this.chatMessageIdCounter = 1;
    this.ideaIdCounter = 1;
    this.ideaVersionIdCounter = 1;
    this.projectIdCounter = 1;
    this.milestoneIdCounter = 1;
    this.codeSourceIdCounter = 1;
    
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
      isProcessed: insertFile.isProcessed ?? null,
      contentSummary: insertFile.contentSummary ?? null,
      contentVector: insertFile.contentVector ?? null
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

  // Synchronization methods
  async synchronizeDropbox(userId: number, integrationId: number): Promise<{ success: boolean; fileCount: number; errors?: string[] }> {
    try {
      const integration = await this.getIntegration(integrationId);
      if (!integration || integration.userId !== userId || integration.type !== 'dropbox') {
        return { success: false, fileCount: 0, errors: ['Invalid integration'] };
      }

      // Mark integration as syncing (in a real app, this would update UI state)
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

      // Mark integration as syncing
      await this.updateIntegration(integrationId, { 
        lastSynced: new Date() 
      });

      // Simulate fetching files from iOS device
      // In a real app, this would use iOS file sharing API or iCloud API
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

      // Mark integration as syncing
      await this.updateIntegration(integrationId, { 
        lastSynced: new Date() 
      });

      // Simulate fetching files from Ubuntu
      // In a real app, this would use SSH/SFTP or a dedicated sync client
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

      // Mark integration as syncing
      await this.updateIntegration(integrationId, { 
        lastSynced: new Date() 
      });

      // Simulate fetching files from Windows
      // In a real app, this would use a Windows sync client or OneDrive integration
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
  
  async synchronizeAnytype(userId: number, integrationId: number): Promise<{ success: boolean; itemCount: number; errors?: string[] }> {
    try {
      // Import Anytype utilities
      const { createAnytypeClientFromIntegration, synchronizeFromAnytype } = await import('./utils/anytypeUtils');
      
      // Get the integration
      const integration = await this.getIntegration(integrationId);
      if (!integration || integration.userId !== userId || integration.type !== 'anytype') {
        return { success: false, itemCount: 0, errors: ['Invalid Anytype integration'] };
      }
      
      // Create Anytype client from the integration config
      const anytypeClient = createAnytypeClientFromIntegration(integration);
      
      if (!anytypeClient) {
        return { success: false, itemCount: 0, errors: ['Could not create Anytype client'] };
      }
      
      // Test the connection
      const connectionTest = await anytypeClient.testConnection();
      if (!connectionTest.success) {
        return { 
          success: false, 
          itemCount: 0, 
          errors: [connectionTest.message]
        };
      }
      
      // Mark integration as syncing
      await this.updateIntegration(integrationId, { 
        lastSynced: new Date(),
        isConnected: true
      });
      
      // Synchronize data from Anytype
      const result = await synchronizeFromAnytype(
        anytypeClient,
        userId,
        integration.lastSynced || undefined
      );
      
      // Create a recommendation if we imported new items
      if (result.success && result.itemCount > 0) {
        await this.createRecommendation({
          userId,
          type: 'content_update',
          title: 'Anytype content synchronized',
          description: `Successfully imported ${result.itemCount} items from your Anytype workspace.`,
          createdAt: new Date(),
          isDismissed: false
        });
      }
      
      return result;
    } catch (error: any) {
      console.error('Anytype synchronization error:', error);
      return {
        success: false,
        itemCount: 0,
        errors: [error.message || 'Unknown error during Anytype synchronization']
      };
    }
  }

  // Platform file operations
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
    let resolved = 0;
    let failed = 0;

    for (const fileId of fileIds) {
      const file = await this.getFile(fileId);
      if (file && file.userId === userId) {
        // In a real app, we would implement proper conflict resolution
        // For MVP, we'll just mark the file as processed
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
    const file = await this.getFile(fileId);
    if (!file) return undefined;
    
    try {
      // Import the HuggingFace vector utilities
      const { generateHfEmbedding } = await import('./utils/huggingfaceUtils');
      
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
      return file;
    }
  }
  
  /**
   * Process all unprocessed files for a user to add vector embeddings
   * @param userId User ID to process files for
   * @returns Count of successfully processed files
   */
  async processAllUserFilesForVectorSearch(userId: number): Promise<number> {
    try {
      // Get all files for the user that aren't processed yet
      const files = Array.from(this.files.values()).filter(
        file => file.userId === userId && !file.isProcessed
      );
      
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
    try {
      // Import the HuggingFace utilities
      const { generateHfEmbedding, cosineSimilarity } = await import('./utils/huggingfaceUtils');
      
      // Generate vector embedding for the query using HuggingFace
      const queryVector = await generateHfEmbedding(query);
      
      if (!queryVector) {
        console.warn(`Failed to generate vector embedding for query: ${query}`);
        return [];
      }
      
      // Get all processed files for the user
      const files = Array.from(this.files.values()).filter(
        file => file.userId === userId && file.isProcessed === true
      );
      
      // Filter files that have content vectors
      const filesWithVectors = files.filter(file => {
        const metadata = file.metadata || {};
        return metadata && typeof metadata === 'object' && 
               'contentVector' in metadata && 
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
    try {
      // Import the HuggingFace utilities
      const { cosineSimilarity } = await import('./utils/huggingfaceUtils');
      
      // Get the source file
      const sourceFile = await this.getFile(fileId);
      if (!sourceFile) return [];
      
      const metadata = sourceFile.metadata as Record<string, any> || {};
      
      // Check if the source file has a content vector
      if (!metadata.contentVector || !Array.isArray(metadata.contentVector)) {
        // Process the file if it doesn't have a vector
        const processedFile = await this.processFileForVectorSearch(fileId);
        if (!processedFile) return [];
        
        const updatedMetadata = processedFile.metadata as Record<string, any> || {};
        if (!updatedMetadata.contentVector) return [];
      }
      
      // Get the source vector
      const sourceMetadata = (await this.getFile(fileId))?.metadata as Record<string, any> || {};
      const sourceVector = sourceMetadata.contentVector;
      
      if (!sourceVector || !Array.isArray(sourceVector)) {
        return [];
      }
      
      // Get all processed files for the same user
      const files = Array.from(this.files.values()).filter(
        file => file.userId === sourceFile.userId && 
                file.isProcessed === true && 
                file.id !== fileId // Exclude the source file
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
    if (metadata && typeof metadata === 'object') {
      summary += 'Metadata:\n';
      for (const [key, value] of Object.entries(metadata as Record<string, any>)) {
        // Skip vector data and internal fields
        if (key === 'contentVector' || key === 'contentSummary') continue;
        
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          summary += `- ${key}: ${value}\n`;
        }
      }
    }
    
    return summary;
  }

  // AI Chat History methods
  async getChatHistories(userId: number): Promise<AiChatHistory[]> {
    return Array.from(this.aiChatHistories.values()).filter(
      (history) => history.userId === userId
    );
  }

  async getChatHistoriesByPlatform(userId: number, platform: string): Promise<AiChatHistory[]> {
    return Array.from(this.aiChatHistories.values()).filter(
      (history) => history.userId === userId && history.platform === platform
    );
  }

  async getChatHistory(id: number): Promise<AiChatHistory | undefined> {
    return this.aiChatHistories.get(id);
  }

  async createChatHistory(insertChatHistory: InsertAiChatHistory): Promise<AiChatHistory> {
    const id = this.chatHistoryIdCounter++;
    const chatHistory: AiChatHistory = {
      id,
      userId: insertChatHistory.userId,
      platform: insertChatHistory.platform,
      platformConversationId: insertChatHistory.platformConversationId,
      title: insertChatHistory.title,
      summary: insertChatHistory.summary ?? null,
      importedAt: insertChatHistory.importedAt,
      conversationDate: insertChatHistory.conversationDate,
      rawData: insertChatHistory.rawData ?? null,
      isProcessed: insertChatHistory.isProcessed ?? false,
      tags: insertChatHistory.tags ?? null
    };
    this.aiChatHistories.set(id, chatHistory);
    return chatHistory;
  }

  async updateChatHistory(id: number, updates: Partial<InsertAiChatHistory>): Promise<AiChatHistory | undefined> {
    const existingHistory = this.aiChatHistories.get(id);
    if (!existingHistory) return undefined;

    const updatedHistory = { ...existingHistory, ...updates };
    this.aiChatHistories.set(id, updatedHistory);
    return updatedHistory;
  }

  async deleteChatHistory(id: number): Promise<boolean> {
    // Delete all messages related to this chat history
    const messages = Array.from(this.aiChatMessages.values())
      .filter(msg => msg.chatHistoryId === id);
    
    for (const msg of messages) {
      this.aiChatMessages.delete(msg.id);
    }
    
    // Delete the chat history
    return this.aiChatHistories.delete(id);
  }

  // AI Chat Message methods
  async getChatMessages(chatHistoryId: number): Promise<AiChatMessage[]> {
    return Array.from(this.aiChatMessages.values())
      .filter(msg => msg.chatHistoryId === chatHistoryId)
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }

  async getChatMessage(id: number): Promise<AiChatMessage | undefined> {
    return this.aiChatMessages.get(id);
  }

  async createChatMessage(insertChatMessage: InsertAiChatMessage): Promise<AiChatMessage> {
    const id = this.chatMessageIdCounter++;
    const chatMessage: AiChatMessage = {
      id,
      chatHistoryId: insertChatMessage.chatHistoryId,
      role: insertChatMessage.role,
      content: insertChatMessage.content,
      timestamp: insertChatMessage.timestamp ?? null,
      orderIndex: insertChatMessage.orderIndex,
      tokenCount: insertChatMessage.tokenCount ?? null,
      contentVector: insertChatMessage.contentVector ?? null
    };
    this.aiChatMessages.set(id, chatMessage);
    return chatMessage;
  }

  async updateChatMessage(id: number, updates: Partial<InsertAiChatMessage>): Promise<AiChatMessage | undefined> {
    const existingMessage = this.aiChatMessages.get(id);
    if (!existingMessage) return undefined;

    const updatedMessage = { ...existingMessage, ...updates };
    this.aiChatMessages.set(id, updatedMessage);
    return updatedMessage;
  }

  async deleteChatMessage(id: number): Promise<boolean> {
    return this.aiChatMessages.delete(id);
  }

  // Entrepreneur Idea methods
  async getEntrepreneurIdeas(userId: number): Promise<EntrepreneurIdea[]> {
    return Array.from(this.entrepreneurIdeas.values())
      .filter(idea => idea.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getEntrepreneurIdea(id: number): Promise<EntrepreneurIdea | undefined> {
    return this.entrepreneurIdeas.get(id);
  }

  async createEntrepreneurIdea(insertIdea: InsertEntrepreneurIdea): Promise<EntrepreneurIdea> {
    const id = this.ideaIdCounter++;
    const idea: EntrepreneurIdea = {
      id,
      userId: insertIdea.userId,
      title: insertIdea.title,
      description: insertIdea.description,
      status: insertIdea.status ?? "draft",
      category: insertIdea.category ?? null,
      createdAt: insertIdea.createdAt,
      updatedAt: insertIdea.updatedAt ?? insertIdea.createdAt,
      tags: insertIdea.tags ?? null,
      metadata: insertIdea.metadata ?? null
    };
    this.entrepreneurIdeas.set(id, idea);
    return idea;
  }

  async updateEntrepreneurIdea(id: number, updates: Partial<InsertEntrepreneurIdea>): Promise<EntrepreneurIdea | undefined> {
    const existingIdea = this.entrepreneurIdeas.get(id);
    if (!existingIdea) return undefined;

    const updatedIdea = { 
      ...existingIdea, 
      ...updates,
      updatedAt: new Date() // Always update the updatedAt timestamp
    };
    this.entrepreneurIdeas.set(id, updatedIdea);
    return updatedIdea;
  }

  async deleteEntrepreneurIdea(id: number): Promise<boolean> {
    // Delete all versions related to this idea
    const versions = Array.from(this.ideaVersions.values())
      .filter(version => version.ideaId === id);
    
    for (const version of versions) {
      this.ideaVersions.delete(version.id);
    }
    
    // Delete the idea
    return this.entrepreneurIdeas.delete(id);
  }

  async searchEntrepreneurIdeas(userId: number, query: string): Promise<EntrepreneurIdea[]> {
    const ideas = await this.getEntrepreneurIdeas(userId);
    
    if (!query.trim()) {
      return ideas;
    }
    
    const searchTerms = query.toLowerCase().split(/\s+/);
    
    return ideas.filter(idea => {
      const ideaText = `${idea.title} ${idea.description} ${idea.tags || ''}`.toLowerCase();
      return searchTerms.some(term => ideaText.includes(term));
    });
  }

  // Idea Version methods
  async getIdeaVersions(ideaId: number): Promise<IdeaVersion[]> {
    return Array.from(this.ideaVersions.values())
      .filter(version => version.ideaId === ideaId)
      .sort((a, b) => b.versionNumber - a.versionNumber);
  }

  async getIdeaVersion(id: number): Promise<IdeaVersion | undefined> {
    return this.ideaVersions.get(id);
  }

  async createIdeaVersion(insertVersion: InsertIdeaVersion): Promise<IdeaVersion> {
    const id = this.ideaVersionIdCounter++;
    
    // Find the highest version number for this idea
    const existingVersions = await this.getIdeaVersions(insertVersion.ideaId);
    const highestVersion = existingVersions.length > 0 
      ? Math.max(...existingVersions.map(v => v.versionNumber))
      : 0;
    
    const version: IdeaVersion = {
      id,
      ideaId: insertVersion.ideaId,
      versionNumber: insertVersion.versionNumber ?? (highestVersion + 1),
      content: insertVersion.content,
      createdAt: insertVersion.createdAt,
      changes: insertVersion.changes ?? null,
      metadata: insertVersion.metadata ?? null
    };
    this.ideaVersions.set(id, version);
    
    // Update the idea's updatedAt timestamp
    const idea = await this.getEntrepreneurIdea(insertVersion.ideaId);
    if (idea) {
      await this.updateEntrepreneurIdea(idea.id, { updatedAt: new Date() });
    }
    
    return version;
  }

  async updateIdeaVersion(id: number, updates: Partial<InsertIdeaVersion>): Promise<IdeaVersion | undefined> {
    const existingVersion = this.ideaVersions.get(id);
    if (!existingVersion) return undefined;

    const updatedVersion = { ...existingVersion, ...updates };
    this.ideaVersions.set(id, updatedVersion);
    return updatedVersion;
  }

  async deleteIdeaVersion(id: number): Promise<boolean> {
    return this.ideaVersions.delete(id);
  }

  // Project Plan methods
  async getProjectPlans(userId: number): Promise<ProjectPlan[]> {
    return Array.from(this.projectPlans.values())
      .filter(plan => plan.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getProjectPlan(id: number): Promise<ProjectPlan | undefined> {
    return this.projectPlans.get(id);
  }

  async createProjectPlan(insertPlan: InsertProjectPlan): Promise<ProjectPlan> {
    const id = this.projectIdCounter++;
    const plan: ProjectPlan = {
      id,
      userId: insertPlan.userId,
      ideaId: insertPlan.ideaId,
      title: insertPlan.title,
      description: insertPlan.description,
      status: insertPlan.status ?? "planning",
      createdAt: insertPlan.createdAt,
      updatedAt: insertPlan.updatedAt ?? insertPlan.createdAt,
      targetDate: insertPlan.targetDate ?? null,
      completedDate: insertPlan.completedDate ?? null,
      metadata: insertPlan.metadata ?? null
    };
    this.projectPlans.set(id, plan);
    return plan;
  }

  async updateProjectPlan(id: number, updates: Partial<InsertProjectPlan>): Promise<ProjectPlan | undefined> {
    const existingPlan = this.projectPlans.get(id);
    if (!existingPlan) return undefined;

    const updatedPlan = { 
      ...existingPlan, 
      ...updates,
      updatedAt: new Date() // Always update the updatedAt timestamp
    };
    this.projectPlans.set(id, updatedPlan);
    return updatedPlan;
  }

  async deleteProjectPlan(id: number): Promise<boolean> {
    // Delete all milestones related to this project
    const milestones = Array.from(this.projectMilestones.values())
      .filter(milestone => milestone.projectId === id);
    
    for (const milestone of milestones) {
      this.projectMilestones.delete(milestone.id);
    }
    
    // Delete the project plan
    return this.projectPlans.delete(id);
  }

  // Project Milestone methods
  async getProjectMilestones(projectId: number): Promise<ProjectMilestone[]> {
    return Array.from(this.projectMilestones.values())
      .filter(milestone => milestone.projectId === projectId)
      .sort((a, b) => a.order - b.order);
  }

  async getProjectMilestone(id: number): Promise<ProjectMilestone | undefined> {
    return this.projectMilestones.get(id);
  }

  async createProjectMilestone(insertMilestone: InsertProjectMilestone): Promise<ProjectMilestone> {
    const id = this.milestoneIdCounter++;
    
    // Find the highest order for this project
    const existingMilestones = await this.getProjectMilestones(insertMilestone.projectId);
    const highestOrder = existingMilestones.length > 0 
      ? Math.max(...existingMilestones.map(m => m.order))
      : 0;
    
    const milestone: ProjectMilestone = {
      id,
      projectId: insertMilestone.projectId,
      title: insertMilestone.title,
      description: insertMilestone.description,
      status: insertMilestone.status ?? "pending",
      order: insertMilestone.order ?? (highestOrder + 1),
      targetDate: insertMilestone.targetDate ?? null,
      completedDate: insertMilestone.completedDate ?? null,
      metadata: insertMilestone.metadata ?? null
    };
    this.projectMilestones.set(id, milestone);
    
    // Update the project's updatedAt timestamp
    const project = await this.getProjectPlan(insertMilestone.projectId);
    if (project) {
      await this.updateProjectPlan(project.id, { updatedAt: new Date() });
    }
    
    return milestone;
  }

  async updateProjectMilestone(id: number, updates: Partial<InsertProjectMilestone>): Promise<ProjectMilestone | undefined> {
    const existingMilestone = this.projectMilestones.get(id);
    if (!existingMilestone) return undefined;

    const updatedMilestone = { ...existingMilestone, ...updates };
    this.projectMilestones.set(id, updatedMilestone);
    
    // If status changed to completed, set completedDate
    if (updates.status === "completed" && !existingMilestone.completedDate) {
      updatedMilestone.completedDate = new Date();
    }
    
    // Update the project's updatedAt timestamp
    const project = await this.getProjectPlan(existingMilestone.projectId);
    if (project) {
      await this.updateProjectPlan(project.id, { updatedAt: new Date() });
    }
    
    return updatedMilestone;
  }

  async deleteProjectMilestone(id: number): Promise<boolean> {
    return this.projectMilestones.delete(id);
  }

  // Code Source methods
  async getCodeSources(userId: number): Promise<CodeSource[]> {
    return Array.from(this.codeSources.values())
      .filter(code => code.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getCodeSource(id: number): Promise<CodeSource | undefined> {
    return this.codeSources.get(id);
  }

  async createCodeSource(insertCode: InsertCodeSource): Promise<CodeSource> {
    const id = this.codeSourceIdCounter++;
    const codeSource: CodeSource = {
      id,
      userId: insertCode.userId,
      title: insertCode.title,
      code: insertCode.code,
      language: insertCode.language,
      createdAt: insertCode.createdAt,
      updatedAt: insertCode.updatedAt ?? insertCode.createdAt,
      description: insertCode.description ?? null,
      tags: insertCode.tags ?? null,
      projectId: insertCode.projectId ?? null,
      ideaId: insertCode.ideaId ?? null,
      useCount: insertCode.useCount ?? 0,
      metadata: insertCode.metadata ?? null
    };
    this.codeSources.set(id, codeSource);
    return codeSource;
  }

  async updateCodeSource(id: number, updates: Partial<InsertCodeSource>): Promise<CodeSource | undefined> {
    const existingCode = this.codeSources.get(id);
    if (!existingCode) return undefined;

    const updatedCode = { 
      ...existingCode, 
      ...updates,
      updatedAt: new Date() // Always update the updatedAt timestamp
    };
    this.codeSources.set(id, updatedCode);
    return updatedCode;
  }

  async deleteCodeSource(id: number): Promise<boolean> {
    return this.codeSources.delete(id);
  }

  async searchCodeSources(userId: number, query: string, limit: number = 10): Promise<CodeSource[]> {
    const codes = await this.getCodeSources(userId);
    
    if (!query.trim()) {
      return codes.slice(0, limit);
    }
    
    const searchTerms = query.toLowerCase().split(/\s+/);
    
    return codes.filter(code => {
      const codeText = `${code.title} ${code.description || ''} ${code.code} ${code.language} ${code.tags || ''}`.toLowerCase();
      return searchTerms.some(term => codeText.includes(term));
    }).slice(0, limit);
  }

  async incrementCodeSourceUseCount(id: number): Promise<CodeSource | undefined> {
    const codeSource = await this.getCodeSource(id);
    if (!codeSource) return undefined;
    
    return this.updateCodeSource(id, {
      useCount: (codeSource.useCount || 0) + 1
    });
  }
  
  // Methods to implement interface
  async searchChatHistories(userId: number, query: string, limit: number = 10): Promise<AiChatHistory[]> {
    const histories = await this.getChatHistories(userId);
    
    if (!query.trim()) {
      return histories.slice(0, limit);
    }
    
    const searchTerms = query.toLowerCase().split(/\s+/);
    
    return histories.filter(history => {
      const historyText = `${history.title} ${history.summary || ''} ${history.tags || ''}`.toLowerCase();
      return searchTerms.some(term => historyText.includes(term));
    }).slice(0, limit);
  }
  
  async importChatGPTExport(userId: number, exportData: any): Promise<{ success: boolean; chatsImported: number; messagesImported: number; errors?: string[] }> {
    try {
      // Import the chat import utilities dynamically
      const { importChatGPTExport } = await import('./utils/chatImportUtils');
      
      // Use the utility to process the export
      return importChatGPTExport(userId, exportData, this);
    } catch (error: any) {
      return {
        success: false,
        chatsImported: 0,
        messagesImported: 0,
        errors: [error.message || 'Unknown error during ChatGPT import']
      };
    }
  }
  
  async importClaudeExport(userId: number, exportData: any): Promise<{ success: boolean; chatsImported: number; messagesImported: number; errors?: string[] }> {
    try {
      // Import the chat import utilities dynamically
      const { importClaudeExport } = await import('./utils/chatImportUtils');
      
      // Use the utility to process the export
      return importClaudeExport(userId, exportData, this);
    } catch (error: any) {
      return {
        success: false,
        chatsImported: 0,
        messagesImported: 0,
        errors: [error.message || 'Unknown error during Claude import']
      };
    }
  }
  
  async processChatHistoryForVectorSearch(chatHistoryId: number): Promise<AiChatHistory | undefined> {
    try {
      const chatHistory = await this.getChatHistory(chatHistoryId);
      if (!chatHistory) return undefined;
      
      // Get all messages for this chat history
      const messages = await this.getChatMessages(chatHistoryId);
      if (messages.length === 0) return chatHistory;
      
      // Combine message content into a representative sample
      const contentSample = messages
        .slice(0, Math.min(5, messages.length))
        .map(msg => `${msg.role}: ${msg.content.substring(0, 200)}...`)
        .join('\n\n');
      
      // Generate vector embedding for the content
      const { generateHfEmbedding } = await import('./utils/huggingfaceUtils');
      const contentVector = await generateHfEmbedding(contentSample);
      
      if (!contentVector) {
        console.warn(`Failed to generate vector embedding for chat history ID ${chatHistoryId}`);
        return chatHistory;
      }
      
      // Update the chat history with content vector and mark as processed
      const updatedHistory = await this.updateChatHistory(chatHistoryId, {
        rawData: {
          ...chatHistory.rawData,
          contentVector,
          contentSample
        },
        isProcessed: true
      });
      
      return updatedHistory;
    } catch (error) {
      console.error(`Error processing chat history ${chatHistoryId} for vector search:`, error);
      return undefined;
    }
  }
  
  // Additional entrepreneur methods
  async getIdeas(userId: number): Promise<EntrepreneurIdea[]> {
    return this.getEntrepreneurIdeas(userId);
  }
  
  async getIdeasByStatus(userId: number, status: string): Promise<EntrepreneurIdea[]> {
    return (await this.getEntrepreneurIdeas(userId)).filter(idea => idea.status === status);
  }
  
  async getIdea(id: number): Promise<EntrepreneurIdea | undefined> {
    return this.getEntrepreneurIdea(id);
  }
  
  async createIdea(idea: InsertEntrepreneurIdea): Promise<EntrepreneurIdea> {
    return this.createEntrepreneurIdea(idea);
  }
  
  async updateIdea(id: number, idea: Partial<InsertEntrepreneurIdea>): Promise<EntrepreneurIdea | undefined> {
    return this.updateEntrepreneurIdea(id, idea);
  }
  
  async deleteIdea(id: number): Promise<boolean> {
    return this.deleteEntrepreneurIdea(id);
  }
  
  async searchIdeas(userId: number, query: string, limit: number = 10): Promise<EntrepreneurIdea[]> {
    const ideas = await this.searchEntrepreneurIdeas(userId, query);
    return ideas.slice(0, limit);
  }
  
  // Additional project methods
  async getProjects(userId: number): Promise<ProjectPlan[]> {
    return this.getProjectPlans(userId);
  }
  
  async getProjectsByStatus(userId: number, status: string): Promise<ProjectPlan[]> {
    return (await this.getProjectPlans(userId)).filter(project => project.status === status);
  }
  
  async getProject(id: number): Promise<ProjectPlan | undefined> {
    return this.getProjectPlan(id);
  }
  
  async createProject(project: InsertProjectPlan): Promise<ProjectPlan> {
    return this.createProjectPlan(project);
  }
  
  async updateProject(id: number, project: Partial<InsertProjectPlan>): Promise<ProjectPlan | undefined> {
    return this.updateProjectPlan(id, project);
  }
  
  async deleteProject(id: number): Promise<boolean> {
    return this.deleteProjectPlan(id);
  }
  
  // Additional code source methods
  async getCodeSourcesByLanguage(userId: number, language: string): Promise<CodeSource[]> {
    return (await this.getCodeSources(userId)).filter(code => code.language === language);
  }
}

// Export storage instance
// We'll import the DatabaseStorage to use PostgreSQL by default
import { DatabaseStorage } from "./database-storage";

// Export both storage implementations for flexibility
export const memStorage = new MemStorage();
export const dbStorage = new DatabaseStorage();

// Use the PostgreSQL implementation by default
export const storage = dbStorage;
