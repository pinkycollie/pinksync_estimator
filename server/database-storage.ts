import { 
  User, InsertUser, 
  File, InsertFile, 
  Integration, InsertIntegration, 
  Recommendation, InsertRecommendation,
  AiChatHistory, InsertAiChatHistory,
  AiChatMessage, InsertAiChatMessage,
  EntrepreneurIdea, InsertEntrepreneurIdea,
  IdeaVersion, InsertIdeaVersion,
  ProjectPlan, InsertProjectPlan,
  ProjectMilestone, InsertProjectMilestone,
  CodeSource, InsertCodeSource,
  // Schemas
  users, files, integrations, recommendations,
  aiChatHistories, aiChatMessages, 
  entrepreneurIdeas, ideaVersions,
  projectPlans, projectMilestones, codeSources
} from "@shared/schema";

import { IStorage } from "./storage";
import { db } from "./db";
import { eq, and, desc, asc, like, sql } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

// PostgreSQL session store
const PostgresSessionStore = connectPg(session);

/**
 * Implementation of IStorage using PostgreSQL with Drizzle ORM
 */
export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // File methods
  async getFiles(userId: number): Promise<File[]> {
    return db.select().from(files).where(eq(files.userId, userId));
  }

  async getFilesByCategory(userId: number, category: string): Promise<File[]> {
    return db.select().from(files).where(
      and(
        eq(files.userId, userId),
        eq(files.fileCategory, category)
      )
    );
  }

  async getFilesBySource(userId: number, source: string): Promise<File[]> {
    return db.select().from(files).where(
      and(
        eq(files.userId, userId),
        eq(files.source, source)
      )
    );
  }

  async getRecentFiles(userId: number, limit: number = 10): Promise<File[]> {
    return db.select().from(files)
      .where(eq(files.userId, userId))
      .orderBy(desc(files.lastModified))
      .limit(limit);
  }

  async getFile(id: number): Promise<File | undefined> {
    const [file] = await db.select().from(files).where(eq(files.id, id));
    return file;
  }

  async createFile(insertFile: InsertFile): Promise<File> {
    const [file] = await db.insert(files).values(insertFile).returning();
    return file;
  }

  async updateFile(id: number, fileUpdate: Partial<InsertFile>): Promise<File | undefined> {
    const [updatedFile] = await db.update(files)
      .set(fileUpdate)
      .where(eq(files.id, id))
      .returning();
    return updatedFile;
  }

  async deleteFile(id: number): Promise<boolean> {
    const result = await db.delete(files).where(eq(files.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Integration methods
  async getIntegrations(userId: number): Promise<Integration[]> {
    return db.select().from(integrations).where(eq(integrations.userId, userId));
  }

  async getIntegration(id: number): Promise<Integration | undefined> {
    const [integration] = await db.select().from(integrations).where(eq(integrations.id, id));
    return integration;
  }

  async getIntegrationByType(userId: number, type: string): Promise<Integration | undefined> {
    const [integration] = await db.select().from(integrations).where(
      and(
        eq(integrations.userId, userId),
        eq(integrations.type, type)
      )
    );
    return integration;
  }

  async createIntegration(insertIntegration: InsertIntegration): Promise<Integration> {
    const [integration] = await db.insert(integrations).values(insertIntegration).returning();
    return integration;
  }

  async updateIntegration(id: number, integrationUpdate: Partial<InsertIntegration>): Promise<Integration | undefined> {
    const [updatedIntegration] = await db.update(integrations)
      .set(integrationUpdate)
      .where(eq(integrations.id, id))
      .returning();
    return updatedIntegration;
  }

  async deleteIntegration(id: number): Promise<boolean> {
    const result = await db.delete(integrations).where(eq(integrations.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Recommendation methods
  async getRecommendations(userId: number): Promise<Recommendation[]> {
    return db.select().from(recommendations).where(eq(recommendations.userId, userId));
  }

  async getActiveRecommendations(userId: number): Promise<Recommendation[]> {
    return db.select().from(recommendations).where(
      and(
        eq(recommendations.userId, userId),
        eq(recommendations.isDismissed, false)
      )
    );
  }

  async getRecommendation(id: number): Promise<Recommendation | undefined> {
    const [recommendation] = await db.select().from(recommendations).where(eq(recommendations.id, id));
    return recommendation;
  }

  async createRecommendation(insertRecommendation: InsertRecommendation): Promise<Recommendation> {
    const [recommendation] = await db.insert(recommendations).values(insertRecommendation).returning();
    return recommendation;
  }

  async updateRecommendation(id: number, recommendationUpdate: Partial<InsertRecommendation>): Promise<Recommendation | undefined> {
    const [updatedRecommendation] = await db.update(recommendations)
      .set(recommendationUpdate)
      .where(eq(recommendations.id, id))
      .returning();
    return updatedRecommendation;
  }

  async deleteRecommendation(id: number): Promise<boolean> {
    const result = await db.delete(recommendations).where(eq(recommendations.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Stats methods
  async getFileStats(userId: number): Promise<{ category: string; count: number }[]> {
    const result = await db.select({
      category: files.fileCategory,
      count: sql<number>`count(*)::int`
    })
    .from(files)
    .where(eq(files.userId, userId))
    .groupBy(files.fileCategory);
    
    return result.map(r => ({
      category: r.category || 'uncategorized',
      count: r.count
    }));
  }

  async getIntegrationStats(userId: number): Promise<{ type: string; count: number }[]> {
    const result = await db.select({
      type: integrations.type,
      count: sql<number>`count(*)::int`
    })
    .from(integrations)
    .where(eq(integrations.userId, userId))
    .groupBy(integrations.type);
    
    return result;
  }

  // AI Chat History methods
  async getChatHistories(userId: number): Promise<AiChatHistory[]> {
    return db.select().from(aiChatHistories).where(eq(aiChatHistories.userId, userId));
  }

  async getChatHistoriesByPlatform(userId: number, platform: string): Promise<AiChatHistory[]> {
    return db.select().from(aiChatHistories).where(
      and(
        eq(aiChatHistories.userId, userId),
        eq(aiChatHistories.platform, platform)
      )
    );
  }

  async getChatHistory(id: number): Promise<AiChatHistory | undefined> {
    const [history] = await db.select().from(aiChatHistories).where(eq(aiChatHistories.id, id));
    return history;
  }

  async createChatHistory(insertChatHistory: InsertAiChatHistory): Promise<AiChatHistory> {
    const [history] = await db.insert(aiChatHistories).values(insertChatHistory).returning();
    return history;
  }

  async updateChatHistory(id: number, chatHistoryUpdate: Partial<InsertAiChatHistory>): Promise<AiChatHistory | undefined> {
    const [updatedHistory] = await db.update(aiChatHistories)
      .set(chatHistoryUpdate)
      .where(eq(aiChatHistories.id, id))
      .returning();
    return updatedHistory;
  }

  async deleteChatHistory(id: number): Promise<boolean> {
    // First delete associated messages
    await db.delete(aiChatMessages).where(eq(aiChatMessages.chatHistoryId, id));
    // Then delete the chat history
    const result = await db.delete(aiChatHistories).where(eq(aiChatHistories.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async searchChatHistories(userId: number, query: string, limit: number = 10): Promise<AiChatHistory[]> {
    // Perform text search across title, summary, and tags
    return db.select().from(aiChatHistories)
      .where(
        and(
          eq(aiChatHistories.userId, userId),
          sql`to_tsvector('english', ${aiChatHistories.title} || ' ' || coalesce(${aiChatHistories.summary}, '') || ' ' || coalesce(${aiChatHistories.tags}, '')) @@ to_tsquery('english', ${query.split(' ').join(' & ')})`
        )
      )
      .limit(limit);
  }

  // AI Chat Message methods
  async getChatMessages(chatHistoryId: number): Promise<AiChatMessage[]> {
    return db.select().from(aiChatMessages)
      .where(eq(aiChatMessages.chatHistoryId, chatHistoryId))
      .orderBy(asc(aiChatMessages.orderIndex));
  }

  async getChatMessage(id: number): Promise<AiChatMessage | undefined> {
    const [message] = await db.select().from(aiChatMessages).where(eq(aiChatMessages.id, id));
    return message;
  }

  async createChatMessage(insertMessage: InsertAiChatMessage): Promise<AiChatMessage> {
    const [message] = await db.insert(aiChatMessages).values(insertMessage).returning();
    return message;
  }

  async updateChatMessage(id: number, messageUpdate: Partial<InsertAiChatMessage>): Promise<AiChatMessage | undefined> {
    const [updatedMessage] = await db.update(aiChatMessages)
      .set(messageUpdate)
      .where(eq(aiChatMessages.id, id))
      .returning();
    return updatedMessage;
  }

  async deleteChatMessage(id: number): Promise<boolean> {
    const result = await db.delete(aiChatMessages).where(eq(aiChatMessages.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Entrepreneur Ideas methods
  async getIdeas(userId: number): Promise<EntrepreneurIdea[]> {
    return db.select().from(entrepreneurIdeas).where(eq(entrepreneurIdeas.userId, userId));
  }

  async getIdeasByStatus(userId: number, status: string): Promise<EntrepreneurIdea[]> {
    return db.select().from(entrepreneurIdeas).where(
      and(
        eq(entrepreneurIdeas.userId, userId),
        eq(entrepreneurIdeas.status, status)
      )
    );
  }

  async getIdea(id: number): Promise<EntrepreneurIdea | undefined> {
    const [idea] = await db.select().from(entrepreneurIdeas).where(eq(entrepreneurIdeas.id, id));
    return idea;
  }

  async createIdea(insertIdea: InsertEntrepreneurIdea): Promise<EntrepreneurIdea> {
    const [idea] = await db.insert(entrepreneurIdeas).values(insertIdea).returning();
    return idea;
  }

  async updateIdea(id: number, ideaUpdate: Partial<InsertEntrepreneurIdea>): Promise<EntrepreneurIdea | undefined> {
    const [updatedIdea] = await db.update(entrepreneurIdeas)
      .set(ideaUpdate)
      .where(eq(entrepreneurIdeas.id, id))
      .returning();
    return updatedIdea;
  }

  async deleteIdea(id: number): Promise<boolean> {
    // First delete associated versions
    await db.delete(ideaVersions).where(eq(ideaVersions.ideaId, id));
    // Then delete the idea
    const result = await db.delete(entrepreneurIdeas).where(eq(entrepreneurIdeas.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async searchIdeas(userId: number, query: string, limit: number = 10): Promise<EntrepreneurIdea[]> {
    // Perform text search across title, description, and tags
    return db.select().from(entrepreneurIdeas)
      .where(
        and(
          eq(entrepreneurIdeas.userId, userId),
          sql`to_tsvector('english', ${entrepreneurIdeas.title} || ' ' || ${entrepreneurIdeas.description} || ' ' || coalesce(${entrepreneurIdeas.tags}, '')) @@ to_tsquery('english', ${query.split(' ').join(' & ')})`
        )
      )
      .limit(limit);
  }

  // Idea Version methods
  async getIdeaVersions(ideaId: number): Promise<IdeaVersion[]> {
    return db.select().from(ideaVersions)
      .where(eq(ideaVersions.ideaId, ideaId))
      .orderBy(desc(ideaVersions.versionNumber));
  }

  async getIdeaVersion(id: number): Promise<IdeaVersion | undefined> {
    const [version] = await db.select().from(ideaVersions).where(eq(ideaVersions.id, id));
    return version;
  }

  async createIdeaVersion(insertVersion: InsertIdeaVersion): Promise<IdeaVersion> {
    const [version] = await db.insert(ideaVersions).values(insertVersion).returning();
    return version;
  }

  // Project Plans methods
  async getProjects(userId: number): Promise<ProjectPlan[]> {
    return db.select().from(projectPlans).where(eq(projectPlans.userId, userId));
  }

  async getProjectsByStatus(userId: number, status: string): Promise<ProjectPlan[]> {
    return db.select().from(projectPlans).where(
      and(
        eq(projectPlans.userId, userId),
        eq(projectPlans.status, status)
      )
    );
  }

  async getProject(id: number): Promise<ProjectPlan | undefined> {
    const [project] = await db.select().from(projectPlans).where(eq(projectPlans.id, id));
    return project;
  }

  async createProject(insertProject: InsertProjectPlan): Promise<ProjectPlan> {
    const [project] = await db.insert(projectPlans).values(insertProject).returning();
    return project;
  }

  async updateProject(id: number, projectUpdate: Partial<InsertProjectPlan>): Promise<ProjectPlan | undefined> {
    const [updatedProject] = await db.update(projectPlans)
      .set(projectUpdate)
      .where(eq(projectPlans.id, id))
      .returning();
    return updatedProject;
  }

  async deleteProject(id: number): Promise<boolean> {
    // First delete associated milestones
    await db.delete(projectMilestones).where(eq(projectMilestones.projectId, id));
    // Then delete the project
    const result = await db.delete(projectPlans).where(eq(projectPlans.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Project Milestone methods
  async getProjectMilestones(projectId: number): Promise<ProjectMilestone[]> {
    return db.select().from(projectMilestones)
      .where(eq(projectMilestones.projectId, projectId))
      .orderBy(asc(projectMilestones.orderIndex));
  }

  async getProjectMilestone(id: number): Promise<ProjectMilestone | undefined> {
    const [milestone] = await db.select().from(projectMilestones).where(eq(projectMilestones.id, id));
    return milestone;
  }

  async createProjectMilestone(insertMilestone: InsertProjectMilestone): Promise<ProjectMilestone> {
    const [milestone] = await db.insert(projectMilestones).values(insertMilestone).returning();
    return milestone;
  }

  async updateProjectMilestone(id: number, milestoneUpdate: Partial<InsertProjectMilestone>): Promise<ProjectMilestone | undefined> {
    const [updatedMilestone] = await db.update(projectMilestones)
      .set(milestoneUpdate)
      .where(eq(projectMilestones.id, id))
      .returning();
    return updatedMilestone;
  }

  async deleteProjectMilestone(id: number): Promise<boolean> {
    const result = await db.delete(projectMilestones).where(eq(projectMilestones.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Code Source methods
  async getCodeSources(userId: number): Promise<CodeSource[]> {
    return db.select().from(codeSources).where(eq(codeSources.userId, userId));
  }

  async getCodeSourcesByLanguage(userId: number, language: string): Promise<CodeSource[]> {
    return db.select().from(codeSources).where(
      and(
        eq(codeSources.userId, userId),
        eq(codeSources.language, language)
      )
    );
  }

  async getCodeSource(id: number): Promise<CodeSource | undefined> {
    const [source] = await db.select().from(codeSources).where(eq(codeSources.id, id));
    return source;
  }

  async createCodeSource(insertCodeSource: InsertCodeSource): Promise<CodeSource> {
    const [source] = await db.insert(codeSources).values(insertCodeSource).returning();
    return source;
  }

  async updateCodeSource(id: number, codeSourceUpdate: Partial<InsertCodeSource>): Promise<CodeSource | undefined> {
    const [updatedSource] = await db.update(codeSources)
      .set(codeSourceUpdate)
      .where(eq(codeSources.id, id))
      .returning();
    return updatedSource;
  }

  async deleteCodeSource(id: number): Promise<boolean> {
    const result = await db.delete(codeSources).where(eq(codeSources.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async searchCodeSources(userId: number, query: string, limit: number = 10): Promise<CodeSource[]> {
    // Perform text search across title, description, snippet, and tags
    return db.select().from(codeSources)
      .where(
        and(
          eq(codeSources.userId, userId),
          sql`to_tsvector('english', ${codeSources.title} || ' ' || coalesce(${codeSources.description}, '') || ' ' || ${codeSources.snippet} || ' ' || coalesce(${codeSources.tags}, '')) @@ to_tsquery('english', ${query.split(' ').join(' & ')})`
        )
      )
      .limit(limit);
  }

  async incrementCodeSourceUseCount(id: number): Promise<CodeSource | undefined> {
    const [updatedSource] = await db.update(codeSources)
      .set({ useCount: sql`${codeSources.useCount} + 1` })
      .where(eq(codeSources.id, id))
      .returning();
    return updatedSource;
  }

  // Synchronization and platform integration methods
  async synchronizeDropbox(userId: number, integrationId: number): Promise<{ success: boolean; fileCount: number; errors?: string[] }> {
    // Implementation will be added when Dropbox API integration is implemented
    return { success: true, fileCount: 0 };
  }

  async synchronizeIOS(userId: number, integrationId: number): Promise<{ success: boolean; fileCount: number; errors?: string[] }> {
    // Implementation will be added when iOS integration is implemented
    return { success: true, fileCount: 0 };
  }

  async synchronizeUbuntu(userId: number, integrationId: number): Promise<{ success: boolean; fileCount: number; errors?: string[] }> {
    // Implementation will be added when Ubuntu integration is implemented
    return { success: true, fileCount: 0 };
  }

  async synchronizeWindows(userId: number, integrationId: number): Promise<{ success: boolean; fileCount: number; errors?: string[] }> {
    // Implementation will be added when Windows integration is implemented
    return { success: true, fileCount: 0 };
  }

  async synchronizeAnytype(userId: number, integrationId: number): Promise<{ success: boolean; itemCount: number; errors?: string[] }> {
    // Implementation will be added when Anytype API integration is implemented
    return { success: true, itemCount: 0 };
  }

  // Platform file operations - these will be implemented with actual API integrations later
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

  // AI processing and chat import methods
  async importChatGPTExport(userId: number, exportData: any): Promise<{ success: boolean; chatsImported: number; messagesImported: number; errors?: string[] }> {
    // This will be implemented with the actual OpenAI ChatGPT export format
    return { success: true, chatsImported: 0, messagesImported: 0 };
  }

  async importClaudeExport(userId: number, exportData: any): Promise<{ success: boolean; chatsImported: number; messagesImported: number; errors?: string[] }> {
    // This will be implemented with the actual Anthropic Claude export format
    return { success: true, chatsImported: 0, messagesImported: 0 };
  }

  // File conflict resolution
  async resolveFileConflicts(userId: number, fileIds: number[]): Promise<{ resolved: number; failed: number }> {
    // This will be implemented to handle file conflicts between different platforms
    return { resolved: 0, failed: 0 };
  }

  // Vector search methods - to be implemented with actual embedding generation
  async processFileForVectorSearch(fileId: number): Promise<File | undefined> {
    // Generate embeddings and update file
    return this.getFile(fileId);
  }

  async processAllUserFilesForVectorSearch(userId: number): Promise<number> {
    // Process all unprocessed files for a user
    return 0;
  }

  async searchFilesByVector(userId: number, query: string, limit: number = 10, threshold: number = 0.6): Promise<File[]> {
    // Perform vector search using generated embeddings
    // For now fall back to text search
    return db.select().from(files)
      .where(
        and(
          eq(files.userId, userId),
          or(
            sql`to_tsvector('english', ${files.name} || ' ' || coalesce(${files.contentSummary}, '')) @@ to_tsquery('english', ${query.split(' ').join(' & ')})`,
            like(files.name, `%${query}%`),
            like(files.contentSummary || '', `%${query}%`)
          )
        )
      )
      .limit(limit);
  }

  async findSimilarFiles(fileId: number, limit: number = 5, threshold: number = 0.7): Promise<File[]> {
    // Find files similar to a given file based on vector similarity
    // For now, return files of the same category
    const file = await this.getFile(fileId);
    if (!file) return [];

    return db.select().from(files)
      .where(
        and(
          eq(files.userId, file.userId),
          eq(files.fileCategory, file.fileCategory || ''),
          sql`${files.id} != ${fileId}`
        )
      )
      .limit(limit);
  }

  async processChatHistoryForVectorSearch(chatHistoryId: number): Promise<AiChatHistory | undefined> {
    // Generate embeddings for chat history content
    return this.getChatHistory(chatHistoryId);
  }
}

// Helper function for SQL OR condition
function or(...conditions: any[]): any {
  if (conditions.length === 0) return undefined;
  if (conditions.length === 1) return conditions[0];
  
  let result = conditions[0];
  for (let i = 1; i < conditions.length; i++) {
    result = sql`(${result}) OR (${conditions[i]})`;
  }
  
  return result;
}