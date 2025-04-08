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
  FileWatchConfig, InsertFileWatchConfig,
  AutomationWorkflow, InsertAutomationWorkflow,
  WorkflowExecution, InsertWorkflowExecution,
  // AI Hub types
  Pipeline, InsertPipeline,
  PipelineExecution, InsertPipelineExecution,
  AiHubProject, InsertAiHubProject,
  Project, InsertProject,
  ProjectDeployment, InsertProjectDeployment,
  DeploymentHistory, InsertDeploymentHistory,
  // Schemas
  users, files, integrations, recommendations,
  aiChatHistories, aiChatMessages, 
  entrepreneurIdeas, ideaVersions,
  projectPlans, projectMilestones, codeSources,
  fileWatchConfigs, automationWorkflows, workflowExecutions,
  pipelines, pipelineExecutions, aiHubProjects, 
  projectDeployments, deploymentHistories,
  // Enums
  TriggerType, WorkflowStatus, PipelineStatus, PipelineCategory,
  ProjectType, ProjectTemplate, DeploymentStatus, DeploymentEnvironment
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
  
  async getFileBySourceIdAndSource(userId: number, sourceId: string, source: string): Promise<File | undefined> {
    const [file] = await db.select().from(files).where(
      and(
        eq(files.userId, userId),
        eq(files.source, source),
        eq(files.sourceId, sourceId)
      )
    );
    return file;
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
    const [codeSource] = await db.select().from(codeSources).where(eq(codeSources.id, id));
    if (!codeSource) return undefined;

    const [updatedCodeSource] = await db.update(codeSources)
      .set({
        useCount: (codeSource.useCount || 0) + 1,
        // Use SQL to update the last used timestamp
        updatedAt: new Date()
      })
      .where(eq(codeSources.id, id))
      .returning();

    return updatedCodeSource;
  }

  // File Watch Config methods
  async getFileWatchConfigs(userId: number): Promise<FileWatchConfig[]> {
    return db.select().from(fileWatchConfigs).where(eq(fileWatchConfigs.userId, userId));
  }

  async getActiveFileWatchConfigs(userId: number): Promise<FileWatchConfig[]> {
    return db.select().from(fileWatchConfigs).where(
      and(
        eq(fileWatchConfigs.userId, userId),
        eq(fileWatchConfigs.isActive, true)
      )
    );
  }

  async getFileWatchConfig(id: number): Promise<FileWatchConfig | undefined> {
    const [config] = await db.select().from(fileWatchConfigs).where(eq(fileWatchConfigs.id, id));
    return config;
  }

  async createFileWatchConfig(config: InsertFileWatchConfig): Promise<FileWatchConfig> {
    const [newConfig] = await db.insert(fileWatchConfigs).values(config).returning();
    return newConfig;
  }

  async updateFileWatchConfig(id: number, configUpdate: Partial<InsertFileWatchConfig>): Promise<FileWatchConfig | undefined> {
    const [updatedConfig] = await db.update(fileWatchConfigs)
      .set(configUpdate)
      .where(eq(fileWatchConfigs.id, id))
      .returning();
    return updatedConfig;
  }

  async deleteFileWatchConfig(id: number): Promise<boolean> {
    const result = await db.delete(fileWatchConfigs).where(eq(fileWatchConfigs.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Automation Workflow methods
  async getAutomationWorkflows(userId: number): Promise<AutomationWorkflow[]> {
    return db.select().from(automationWorkflows).where(eq(automationWorkflows.userId, userId));
  }

  async getActiveAutomationWorkflows(userId: number): Promise<AutomationWorkflow[]> {
    return db.select().from(automationWorkflows).where(
      and(
        eq(automationWorkflows.userId, userId),
        eq(automationWorkflows.isActive, true)
      )
    );
  }

  async getAutomationWorkflowsByTriggerType(userId: number, triggerType: TriggerType): Promise<AutomationWorkflow[]> {
    return db.select().from(automationWorkflows).where(
      and(
        eq(automationWorkflows.userId, userId),
        eq(automationWorkflows.triggerType, triggerType)
      )
    );
  }

  async getAutomationWorkflow(id: number): Promise<AutomationWorkflow | undefined> {
    const [workflow] = await db.select().from(automationWorkflows).where(eq(automationWorkflows.id, id));
    return workflow;
  }

  async createAutomationWorkflow(insertWorkflow: InsertAutomationWorkflow): Promise<AutomationWorkflow> {
    const [workflow] = await db.insert(automationWorkflows).values(insertWorkflow).returning();
    return workflow;
  }

  async updateAutomationWorkflow(id: number, workflowUpdate: Partial<InsertAutomationWorkflow>): Promise<AutomationWorkflow | undefined> {
    const [updatedWorkflow] = await db.update(automationWorkflows)
      .set(workflowUpdate)
      .where(eq(automationWorkflows.id, id))
      .returning();
    return updatedWorkflow;
  }

  async deleteAutomationWorkflow(id: number): Promise<boolean> {
    // First delete associated executions
    await db.delete(workflowExecutions).where(eq(workflowExecutions.workflowId, id));
    // Then delete the workflow
    const result = await db.delete(automationWorkflows).where(eq(automationWorkflows.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async executeWorkflow(id: number, triggerData?: any): Promise<WorkflowExecution> {
    // Get the workflow
    const workflow = await this.getAutomationWorkflow(id);
    if (!workflow) {
      throw new Error(`Workflow with id ${id} not found`);
    }

    // Create execution record
    const execution = await this.createWorkflowExecution({
      workflowId: id,
      userId: workflow.userId,
      status: WorkflowStatus.RUNNING,
      startTime: new Date(),
      triggerSource: 'manual',
      triggerData
    });

    // Update workflow execution count
    await this.updateAutomationWorkflow(id, {
      executionCount: (workflow.executionCount || 0) + 1,
      lastRunAt: new Date()
    });

    return execution;
  }

  // Workflow Execution methods
  async getWorkflowExecutions(workflowId: number): Promise<WorkflowExecution[]> {
    return db.select().from(workflowExecutions)
      .where(eq(workflowExecutions.workflowId, workflowId))
      .orderBy(desc(workflowExecutions.startTime));
  }

  async getRecentWorkflowExecutions(userId: number, limit: number = 10): Promise<WorkflowExecution[]> {
    return db.select().from(workflowExecutions)
      .where(eq(workflowExecutions.userId, userId))
      .orderBy(desc(workflowExecutions.startTime))
      .limit(limit);
  }

  async getWorkflowExecution(id: number): Promise<WorkflowExecution | undefined> {
    const [execution] = await db.select().from(workflowExecutions).where(eq(workflowExecutions.id, id));
    return execution;
  }

  async createWorkflowExecution(insertExecution: InsertWorkflowExecution): Promise<WorkflowExecution> {
    const [execution] = await db.insert(workflowExecutions).values(insertExecution).returning();
    return execution;
  }

  async updateWorkflowExecution(id: number, executionUpdate: Partial<InsertWorkflowExecution>): Promise<WorkflowExecution | undefined> {
    const [updatedExecution] = await db.update(workflowExecutions)
      .set(executionUpdate)
      .where(eq(workflowExecutions.id, id))
      .returning();
    
    // If this is a workflow completion, update the average execution time for the workflow
    if (executionUpdate.status === WorkflowStatus.COMPLETED && updatedExecution.endTime && updatedExecution.startTime) {
      const executionTime = updatedExecution.endTime.getTime() - updatedExecution.startTime.getTime();
      
      // Get the workflow
      const [workflow] = await db.select().from(automationWorkflows)
        .where(eq(automationWorkflows.id, updatedExecution.workflowId));
      
      if (workflow) {
        // Update average execution time
        const currentAverage = workflow.averageExecutionTime || 0;
        const currentCount = workflow.executionCount || 1;
        const newAverage = Math.round((currentAverage * (currentCount - 1) + executionTime) / currentCount);
        
        await db.update(automationWorkflows)
          .set({ averageExecutionTime: newAverage })
          .where(eq(automationWorkflows.id, updatedExecution.workflowId));
      }
    }
    
    return updatedExecution;
  }
  
  async deleteWorkflowExecution(id: number): Promise<boolean> {
    const result = await db.delete(workflowExecutions).where(eq(workflowExecutions.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Synchronization and platform integration methods
  async synchronizeDropbox(userId: number, integrationId: number): Promise<{ success: boolean; fileCount: number; errors?: string[] }> {
    try {
      // Import Dropbox utilities
      const { createDropboxClientFromIntegration, testDropboxConnection, synchronizeFromDropbox } = await import('./utils/dropboxUtils');
      
      // Get the integration
      const integration = await this.getIntegration(integrationId);
      if (!integration || integration.userId !== userId || integration.type !== 'dropbox') {
        return { success: false, fileCount: 0, errors: ['Invalid Dropbox integration'] };
      }
      
      // Create Dropbox client from the integration config
      const dropboxClient = createDropboxClientFromIntegration(integration);
      
      if (!dropboxClient) {
        return { success: false, fileCount: 0, errors: ['Could not create Dropbox client'] };
      }
      
      // Test the connection
      const connectionTest = await testDropboxConnection(dropboxClient);
      if (!connectionTest.success) {
        return { 
          success: false, 
          fileCount: 0, 
          errors: [connectionTest.message || 'Unknown connection error']
        };
      }
      
      // Mark integration as syncing
      await this.updateIntegration(integrationId, { 
        lastSynced: new Date(),
        status: 'syncing' 
      });
      
      // Fetch files from Dropbox
      const { files: dbxFiles, errors: syncDbxErrors } = await synchronizeFromDropbox(dropboxClient, userId);
      let dbxErrors = syncDbxErrors || [];
      
      const createdFiles = [];
      
      // Process and save files
      for (const fileData of dbxFiles) {
        try {
          // Check if file with same sourceId already exists
          const existingFile = await this.getFileBySourceIdAndSource(userId, fileData.metadata.id, 'dropbox');
          
          if (existingFile) {
            // Update existing file
            await this.updateFile(existingFile.id, {
              name: fileData.name,
              path: fileData.path,
              size: fileData.size,
              lastModified: fileData.lastModified,
              isProcessed: false, // Mark for reprocessing
              metadata: fileData.metadata
            });
            
            createdFiles.push(existingFile);
          } else {
            // Create new file
            const newFile = await this.createFile(fileData);
            createdFiles.push(newFile);
          }
        } catch (error: any) {
          console.error(`Error processing Dropbox file ${fileData.name}:`, error);
          dbxErrors.push(`Error processing file ${fileData.name}: ${getSafeMessage(error.message)}`);
        }
      }
      
      // Mark integration as active and update last synced time
      await this.updateIntegration(integrationId, { 
        lastSynced: new Date(),
        status: 'active' 
      });
      
      return { 
        success: true, 
        fileCount: createdFiles.length,
        errors: dbxErrors
      };
    } catch (error: any) {
      console.error("Error synchronizing Dropbox:", error);
      
      // Update integration status
      try {
        await this.updateIntegration(integrationId, { 
          lastSynced: new Date(),
          status: 'error',
          lastError: error.message
        });
      } catch (updateError) {
        console.error("Error updating integration status:", updateError);
      }
      
      return { 
        success: false, 
        fileCount: 0, 
        errors: [getSafeMessage(error.message) || 'Unknown error during Dropbox synchronization'] 
      };
    }
  }

  async synchronizeIOS(userId: number, integrationId: number): Promise<{ success: boolean; fileCount: number; errors?: string[] }> {
    try {
      // Import iOS utilities
      const { createiCloudClientFromIntegration, testiCloudConnection, synchronizeFromiCloud } = await import('./utils/iosUtils');
      
      // Get the integration
      const integration = await this.getIntegration(integrationId);
      if (!integration || integration.userId !== userId || integration.type !== 'ios') {
        return { success: false, fileCount: 0, errors: ['Invalid iOS integration'] };
      }
      
      // Create iCloud client from the integration config
      const iCloudClient = createiCloudClientFromIntegration(integration);
      
      if (!iCloudClient) {
        return { success: false, fileCount: 0, errors: ['Could not create iCloud client'] };
      }
      
      // Mark integration as syncing
      await this.updateIntegration(integrationId, { 
        lastSynced: new Date(),
        status: 'syncing' 
      });
      
      // Test the connection
      const connectionTest = await testiCloudConnection(iCloudClient);
      if (!connectionTest.success) {
        // Update integration status
        await this.updateIntegration(integrationId, { 
          lastSynced: new Date(),
          status: 'error',
          lastError: getSafeMessage(connectionTest.message)
        });
        
        return { 
          success: false, 
          fileCount: 0, 
          errors: [getSafeMessage(connectionTest.message)]
        };
      }
      
      // Fetch files from iCloud
      const { files: iOSFiles, errors: syncIOSErrors } = await synchronizeFromiCloud(iCloudClient, userId);
      let iOSErrors = syncIOSErrors || [];
      
      const createdFiles = [];
      
      // Process and save files
      for (const fileData of iOSFiles) {
        try {
          // Check if file with same sourceId already exists
          const existingFile = await this.getFileBySourceIdAndSource(userId, fileData.sourceId, 'ios');
          
          if (existingFile) {
            // Update existing file
            await this.updateFile(existingFile.id, {
              name: fileData.name,
              path: fileData.path,
              size: fileData.size,
              lastModified: fileData.lastModified,
              isProcessed: false, // Mark for reprocessing
              metadata: fileData.metadata
            });
            
            createdFiles.push(existingFile);
          } else {
            // Create new file
            const newFile = await this.createFile(fileData);
            createdFiles.push(newFile);
          }
        } catch (error: any) {
          console.error(`Error processing iOS file ${fileData.name}:`, error);
          iOSErrors.push(`Error processing file ${fileData.name}: ${getSafeMessage(error.message)}`);
        }
      }
      
      // Mark integration as active and update last synced time
      await this.updateIntegration(integrationId, { 
        lastSynced: new Date(),
        status: 'active' 
      });
      
      return { 
        success: true, 
        fileCount: createdFiles.length,
        errors: iOSErrors
      };
    } catch (error: any) {
      console.error("Error synchronizing iOS:", error);
      
      // Update integration status
      try {
        await this.updateIntegration(integrationId, { 
          lastSynced: new Date(),
          status: 'error',
          lastError: error.message
        });
      } catch (updateError) {
        console.error("Error updating integration status:", updateError);
      }
      
      return { 
        success: false, 
        fileCount: 0, 
        errors: [error.message || 'Unknown error during iOS synchronization'] 
      };
    }
  }

  async synchronizeUbuntu(userId: number, integrationId: number): Promise<{ success: boolean; fileCount: number; errors?: string[] }> {
    try {
      // Import Ubuntu utilities
      const { createUbuntuClientFromIntegration, testUbuntuConnection, synchronizeFromUbuntu } = await import('./utils/ubuntuUtils');
      
      // Get the integration
      const integration = await this.getIntegration(integrationId);
      if (!integration || integration.userId !== userId || integration.type !== 'ubuntu') {
        return { success: false, fileCount: 0, errors: ['Invalid Ubuntu integration'] };
      }
      
      // Create Ubuntu client from the integration config
      const ubuntuClient = createUbuntuClientFromIntegration(integration);
      
      if (!ubuntuClient) {
        return { success: false, fileCount: 0, errors: ['Could not create Ubuntu client'] };
      }
      
      // Mark integration as syncing
      await this.updateIntegration(integrationId, { 
        lastSynced: new Date(),
        status: 'syncing' 
      });
      
      const config = integration.config as any;
      
      // Test the connection
      const connectionTest = await testUbuntuConnection(ubuntuClient, config);
      if (!connectionTest.success) {
        // Update integration status
        await this.updateIntegration(integrationId, { 
          lastSynced: new Date(),
          status: 'error',
          lastError: getSafeMessage(connectionTest.message)
        });
        
        return { 
          success: false, 
          fileCount: 0, 
          errors: [getSafeMessage(connectionTest.message)]
        };
      }
      
      // Fetch files from Ubuntu
      const { files: ubuntuFiles, errors: syncUbuntuErrors } = await synchronizeFromUbuntu(ubuntuClient, config, userId);
      let ubuntuErrors = syncUbuntuErrors || [];
      
      const createdFiles = [];
      
      // Process and save files
      for (const fileData of ubuntuFiles) {
        try {
          // Check if file with same sourceId already exists
          const existingFile = await this.getFileBySourceIdAndSource(userId, fileData.sourceId, 'ubuntu');
          
          if (existingFile) {
            // Update existing file
            await this.updateFile(existingFile.id, {
              name: fileData.name,
              path: fileData.path,
              size: fileData.size,
              lastModified: fileData.lastModified,
              isProcessed: false, // Mark for reprocessing
              metadata: fileData.metadata
            });
            
            createdFiles.push(existingFile);
          } else {
            // Create new file
            const newFile = await this.createFile(fileData);
            createdFiles.push(newFile);
          }
        } catch (error: any) {
          console.error(`Error processing Ubuntu file ${fileData.name}:`, error);
          ubuntuErrors.push(`Error processing file ${fileData.name}: ${getSafeMessage(error.message)}`);
        }
      }
      
      // Mark integration as active and update last synced time
      await this.updateIntegration(integrationId, { 
        lastSynced: new Date(),
        status: 'active' 
      });
      
      return { 
        success: true, 
        fileCount: createdFiles.length,
        errors: ubuntuErrors
      };
    } catch (error: any) {
      console.error("Error synchronizing Ubuntu:", error);
      
      // Update integration status
      try {
        await this.updateIntegration(integrationId, { 
          lastSynced: new Date(),
          status: 'error',
          lastError: error.message
        });
      } catch (updateError) {
        console.error("Error updating integration status:", updateError);
      }
      
      return { 
        success: false, 
        fileCount: 0, 
        errors: [error.message || 'Unknown error during Ubuntu synchronization'] 
      };
    }
  }

  async synchronizeWindows(userId: number, integrationId: number): Promise<{ success: boolean; fileCount: number; errors?: string[] }> {
    try {
      // Import Windows utilities
      const { createWindowsClientFromIntegration, testWindowsConnection, synchronizeFromWindows } = await import('./utils/windowsUtils');
      
      // Get the integration
      const integration = await this.getIntegration(integrationId);
      if (!integration || integration.userId !== userId || integration.type !== 'windows') {
        return { success: false, fileCount: 0, errors: ['Invalid Windows integration'] };
      }
      
      // Create Windows client from the integration config
      const windowsClient = createWindowsClientFromIntegration(integration);
      
      if (!windowsClient) {
        return { success: false, fileCount: 0, errors: ['Could not create Windows client'] };
      }
      
      // Mark integration as syncing
      await this.updateIntegration(integrationId, { 
        lastSynced: new Date(),
        status: 'syncing' 
      });
      
      const config = integration.config as any;
      
      // Test the connection
      const connectionTest = await testWindowsConnection(windowsClient, config);
      if (!connectionTest.success) {
        // Update integration status
        await this.updateIntegration(integrationId, { 
          lastSynced: new Date(),
          status: 'error',
          lastError: getSafeMessage(connectionTest.message)
        });
        
        return { 
          success: false, 
          fileCount: 0, 
          errors: [getSafeMessage(connectionTest.message)]
        };
      }
      
      // Fetch files from Windows
      const { files: windowsFiles, errors: syncWindowsErrors } = await synchronizeFromWindows(windowsClient, config, userId);
      let windowsErrors = syncWindowsErrors || [];
      
      const createdFiles = [];
      
      // Process and save files
      for (const fileData of windowsFiles) {
        try {
          // Check if file with same sourceId already exists
          const existingFile = await this.getFileBySourceIdAndSource(userId, fileData.sourceId, 'windows');
          
          if (existingFile) {
            // Update existing file
            await this.updateFile(existingFile.id, {
              name: fileData.name,
              path: fileData.path,
              size: fileData.size,
              lastModified: fileData.lastModified,
              isProcessed: false, // Mark for reprocessing
              metadata: fileData.metadata
            });
            
            createdFiles.push(existingFile);
          } else {
            // Create new file
            const newFile = await this.createFile(fileData);
            createdFiles.push(newFile);
          }
        } catch (error: any) {
          console.error(`Error processing Windows file ${fileData.name}:`, error);
          windowsErrors.push(`Error processing file ${fileData.name}: ${getSafeMessage(error.message)}`);
        }
      }
      
      // Mark integration as active and update last synced time
      await this.updateIntegration(integrationId, { 
        lastSynced: new Date(),
        status: 'active' 
      });
      
      return { 
        success: true, 
        fileCount: createdFiles.length,
        errors: windowsErrors
      };
    } catch (error: any) {
      console.error("Error synchronizing Windows:", error);
      
      // Update integration status
      try {
        await this.updateIntegration(integrationId, { 
          lastSynced: new Date(),
          status: 'error',
          lastError: error.message
        });
      } catch (updateError) {
        console.error("Error updating integration status:", updateError);
      }
      
      return { 
        success: false, 
        fileCount: 0, 
        errors: [error.message || 'Unknown error during Windows synchronization'] 
      };
    }
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

  // Create notification method (simplified for now)
  async createNotification(notification: { 
    userId: number;
    title: string;
    message: string;
    type?: string;
    relatedEntityId?: number;
    relatedEntityType?: string;
  }): Promise<{ id: number; success: boolean }> {
    // This is a placeholder until we implement a proper notification system
    console.log(`NOTIFICATION for user ${notification.userId}: ${notification.title} - ${notification.message}`);
    return { id: Date.now(), success: true };
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

// Helper function to get a safe message
function getSafeMessage(message?: string): string {
  return message || 'Unknown error';
}

// AI Hub Pipeline methods - temporary implementations using memStorage until database schema is updated
import { memStorage } from './storage';

// AI Hub Pipeline methods
async function getPipelines(userId: number): Promise<Pipeline[]> {
  return memStorage.getPipelines(userId);
}

async function getPipelinesByCategory(category: string): Promise<Pipeline[]> {
  return memStorage.getPipelinesByCategory(category);
}

async function getPipeline(id: number): Promise<Pipeline | undefined> {
  return memStorage.getPipeline(id);
}

async function getPipelineByName(name: string): Promise<Pipeline | undefined> {
  return memStorage.getPipelineByName(name);
}

async function createPipeline(pipeline: InsertPipeline): Promise<Pipeline> {
  return memStorage.createPipeline(pipeline);
}

async function updatePipeline(id: number, pipeline: Partial<InsertPipeline>): Promise<Pipeline | undefined> {
  return memStorage.updatePipeline(id, pipeline);
}

async function deletePipeline(id: number): Promise<boolean> {
  return memStorage.deletePipeline(id);
}

async function executePipeline(pipelineId: number, input: any, userId: number): Promise<PipelineExecution> {
  return memStorage.executePipeline(pipelineId, input, userId);
}

// Pipeline Execution methods
async function getPipelineExecutions(pipelineId: number): Promise<PipelineExecution[]> {
  return memStorage.getPipelineExecutions(pipelineId);
}

async function getRecentPipelineExecutions(userId: number, limit: number = 10): Promise<PipelineExecution[]> {
  return memStorage.getRecentPipelineExecutions(userId, limit);
}

async function getPipelineExecution(id: number): Promise<PipelineExecution | undefined> {
  return memStorage.getPipelineExecution(id);
}

async function updatePipelineExecution(id: number, execution: Partial<InsertPipelineExecution>): Promise<PipelineExecution | undefined> {
  return memStorage.updatePipelineExecution(id, execution);
}

// AI Hub Project methods
async function getAiHubProjects(userId: number): Promise<AiHubProject[]> {
  return memStorage.getAiHubProjects(userId);
}

async function getAiHubProjectsByType(userId: number, type: string): Promise<AiHubProject[]> {
  return memStorage.getAiHubProjectsByType(userId, type);
}

async function getAiHubProject(id: number): Promise<AiHubProject | undefined> {
  return memStorage.getAiHubProject(id);
}

async function createAiHubProject(project: InsertAiHubProject): Promise<AiHubProject> {
  return memStorage.createAiHubProject(project);
}

async function updateAiHubProject(id: number, project: Partial<InsertAiHubProject>): Promise<AiHubProject | undefined> {
  return memStorage.updateAiHubProject(id, project);
}

async function deleteAiHubProject(id: number): Promise<boolean> {
  return memStorage.deleteAiHubProject(id);
}

async function scanAiHubProject(id: number): Promise<{ success: boolean; fileCount: number; issueCount: number; result: any }> {
  return memStorage.scanAiHubProject(id);
}

// Project Deployment methods
async function getProjectDeployments(projectId: number): Promise<ProjectDeployment[]> {
  return memStorage.getProjectDeployments(projectId);
}

async function getProjectDeployment(id: number): Promise<ProjectDeployment | undefined> {
  return memStorage.getProjectDeployment(id);
}

async function createProjectDeployment(deployment: InsertProjectDeployment): Promise<ProjectDeployment> {
  return memStorage.createProjectDeployment(deployment);
}

async function updateProjectDeployment(id: number, deployment: Partial<InsertProjectDeployment>): Promise<ProjectDeployment | undefined> {
  return memStorage.updateProjectDeployment(id, deployment);
}

// AI Hub File System Operations
async function scanFileSystem(path: string, recursive: boolean = true): Promise<{ files: any[]; issues: any[] }> {
  return memStorage.scanFileSystem(path, recursive);
}

async function fixCommonErrors(filePath: string, issues: any[]): Promise<{ success: boolean; fixedIssues: any[] }> {
  return memStorage.fixCommonErrors(filePath, issues);
}

async function convertCodeToProject(code: string, projectName: string, type: string): Promise<AiHubProject | undefined> {
  return memStorage.convertCodeToProject(code, projectName, type);
}

// Add these methods to the DatabaseStorage class prototype
DatabaseStorage.prototype.getPipelines = getPipelines;
DatabaseStorage.prototype.getPipelinesByCategory = getPipelinesByCategory;
DatabaseStorage.prototype.getPipeline = getPipeline;
DatabaseStorage.prototype.getPipelineByName = getPipelineByName;
DatabaseStorage.prototype.createPipeline = createPipeline;
DatabaseStorage.prototype.updatePipeline = updatePipeline;
DatabaseStorage.prototype.deletePipeline = deletePipeline;
DatabaseStorage.prototype.executePipeline = executePipeline;

DatabaseStorage.prototype.getPipelineExecutions = getPipelineExecutions;
DatabaseStorage.prototype.getRecentPipelineExecutions = getRecentPipelineExecutions;
DatabaseStorage.prototype.getPipelineExecution = getPipelineExecution;
DatabaseStorage.prototype.updatePipelineExecution = updatePipelineExecution;

DatabaseStorage.prototype.getAiHubProjects = getAiHubProjects;
DatabaseStorage.prototype.getAiHubProjectsByType = getAiHubProjectsByType;
DatabaseStorage.prototype.getAiHubProject = getAiHubProject;
DatabaseStorage.prototype.createAiHubProject = createAiHubProject;
DatabaseStorage.prototype.updateAiHubProject = updateAiHubProject;
DatabaseStorage.prototype.deleteAiHubProject = deleteAiHubProject;
DatabaseStorage.prototype.scanAiHubProject = scanAiHubProject;

DatabaseStorage.prototype.getProjectDeployments = getProjectDeployments;
DatabaseStorage.prototype.getProjectDeployment = getProjectDeployment;
DatabaseStorage.prototype.createProjectDeployment = createProjectDeployment;
DatabaseStorage.prototype.updateProjectDeployment = updateProjectDeployment;

DatabaseStorage.prototype.scanFileSystem = scanFileSystem;
DatabaseStorage.prototype.fixCommonErrors = fixCommonErrors;
DatabaseStorage.prototype.convertCodeToProject = convertCodeToProject;

// We need to clear the LSP issues by creating a brand new implementation of DatabaseStorage 
// that directly extends from the IStorage interface

// Pipeline methods
DatabaseStorage.prototype.getPipelines = async function(userId: number): Promise<Pipeline[]> {
  return db.select().from(pipelines).where(eq(pipelines.createdBy, userId));
};

DatabaseStorage.prototype.getPipelinesByCategory = async function(category: string): Promise<Pipeline[]> {
  return db.select().from(pipelines).where(eq(pipelines.category, category));
};

DatabaseStorage.prototype.getPipeline = async function(id: number): Promise<Pipeline | undefined> {
  const [pipeline] = await db.select().from(pipelines).where(eq(pipelines.id, id));
  return pipeline;
};

DatabaseStorage.prototype.getPipelineByName = async function(name: string): Promise<Pipeline | undefined> {
  const [pipeline] = await db.select().from(pipelines).where(eq(pipelines.name, name));
  return pipeline;
};

DatabaseStorage.prototype.createPipeline = async function(insertPipeline: InsertPipeline): Promise<Pipeline> {
  const [pipeline] = await db.insert(pipelines).values(insertPipeline).returning();
  return pipeline;
};

DatabaseStorage.prototype.updatePipeline = async function(id: number, pipelineUpdate: Partial<InsertPipeline>): Promise<Pipeline | undefined> {
  const [updatedPipeline] = await db.update(pipelines)
    .set(pipelineUpdate)
    .where(eq(pipelines.id, id))
    .returning();
  return updatedPipeline;
};

DatabaseStorage.prototype.deletePipeline = async function(id: number): Promise<boolean> {
  const result = await db.delete(pipelines).where(eq(pipelines.id, id));
  return result.rowCount !== null && result.rowCount > 0;
};

// Pipeline execution methods
DatabaseStorage.prototype.getPipelineExecutions = async function(pipelineId: number): Promise<PipelineExecution[]> {
  return db.select().from(pipelineExecutions)
    .where(eq(pipelineExecutions.pipelineId, pipelineId))
    .orderBy(desc(pipelineExecutions.startTime));
};

DatabaseStorage.prototype.getRecentPipelineExecutions = async function(userId: number, limit: number = 10): Promise<PipelineExecution[]> {
  return db.select().from(pipelineExecutions)
    .where(eq(pipelineExecutions.userId, userId))
    .orderBy(desc(pipelineExecutions.startTime))
    .limit(limit);
};

DatabaseStorage.prototype.getPipelineExecution = async function(id: number): Promise<PipelineExecution | undefined> {
  const [execution] = await db.select().from(pipelineExecutions).where(eq(pipelineExecutions.id, id));
  return execution;
};

DatabaseStorage.prototype.createPipelineExecution = async function(insertExecution: InsertPipelineExecution): Promise<PipelineExecution> {
  const [execution] = await db.insert(pipelineExecutions).values(insertExecution).returning();
  return execution;
};

DatabaseStorage.prototype.updatePipelineExecution = async function(id: number, executionUpdate: Partial<InsertPipelineExecution>): Promise<PipelineExecution | undefined> {
  const [updatedExecution] = await db.update(pipelineExecutions)
    .set(executionUpdate)
    .where(eq(pipelineExecutions.id, id))
    .returning();
  return updatedExecution;
};

// AI Hub Project methods
DatabaseStorage.prototype.getAiHubProjects = async function(userId: number): Promise<AiHubProject[]> {
  return db.select().from(aiHubProjects).where(eq(aiHubProjects.userId, userId));
};

DatabaseStorage.prototype.getAiHubProjectsByType = async function(userId: number, type: string): Promise<AiHubProject[]> {
  return db.select().from(aiHubProjects).where(
    and(
      eq(aiHubProjects.userId, userId),
      eq(aiHubProjects.type, type)
    )
  );
};

DatabaseStorage.prototype.getAiHubProject = async function(id: number): Promise<AiHubProject | undefined> {
  const [project] = await db.select().from(aiHubProjects).where(eq(aiHubProjects.id, id));
  return project;
};

DatabaseStorage.prototype.createAiHubProject = async function(insertProject: InsertAiHubProject): Promise<AiHubProject> {
  const [project] = await db.insert(aiHubProjects).values(insertProject).returning();
  return project;
};

DatabaseStorage.prototype.updateAiHubProject = async function(id: number, projectUpdate: Partial<InsertAiHubProject>): Promise<AiHubProject | undefined> {
  const [updatedProject] = await db.update(aiHubProjects)
    .set(projectUpdate)
    .where(eq(aiHubProjects.id, id))
    .returning();
  return updatedProject;
};

DatabaseStorage.prototype.deleteAiHubProject = async function(id: number): Promise<boolean> {
  const result = await db.delete(aiHubProjects).where(eq(aiHubProjects.id, id));
  return result.rowCount !== null && result.rowCount > 0;
};

DatabaseStorage.prototype.scanAiHubProject = async function(id: number, scanResult: any): Promise<AiHubProject | undefined> {
  const [updatedProject] = await db.update(aiHubProjects)
    .set({ lastScanResult: scanResult, updatedAt: new Date() })
    .where(eq(aiHubProjects.id, id))
    .returning();
  return updatedProject;
};

// Project Deployment methods
DatabaseStorage.prototype.getProjectDeployments = async function(projectId: number): Promise<ProjectDeployment[]> {
  return db.select().from(projectDeployments)
    .where(eq(projectDeployments.projectId, projectId))
    .orderBy(desc(projectDeployments.createdAt));
};

DatabaseStorage.prototype.getProjectDeployment = async function(id: number): Promise<ProjectDeployment | undefined> {
  const [deployment] = await db.select().from(projectDeployments).where(eq(projectDeployments.id, id));
  return deployment;
};

DatabaseStorage.prototype.createProjectDeployment = async function(insertDeployment: InsertProjectDeployment): Promise<ProjectDeployment> {
  const [deployment] = await db.insert(projectDeployments).values(insertDeployment).returning();
  return deployment;
};

DatabaseStorage.prototype.updateProjectDeployment = async function(id: number, deploymentUpdate: Partial<InsertProjectDeployment>): Promise<ProjectDeployment | undefined> {
  const [updatedDeployment] = await db.update(projectDeployments)
    .set(deploymentUpdate)
    .where(eq(projectDeployments.id, id))
    .returning();
  return updatedDeployment;
};

// Utility methods
DatabaseStorage.prototype.executePipeline = async function(pipeline: Pipeline, input: any): Promise<{ output: any; executionId: number }> {
  // Create a pipeline execution entry
  const execution = await this.createPipelineExecution({
    pipelineId: pipeline.id,
    userId: pipeline.createdBy,
    status: 'running',
    input
  });

  try {
    // Here we would implement the actual pipeline execution logic
    // This is a simplified example
    let output = input;
    const steps = pipeline.steps as any[];
    
    for (const step of steps) {
      // Process the step based on step.type
      // This is where we would implement step execution
      // For now, just pass through
      console.log(`Executing step ${step.name || 'unnamed'}`);
    }
    
    // Update execution with result
    await this.updatePipelineExecution(execution.id, {
      status: 'completed',
      endTime: new Date(),
      output,
      duration: Date.now() - execution.startTime.getTime()
    });
    
    return { output, executionId: execution.id };
  } catch (error: any) {
    // Update execution with error
    await this.updatePipelineExecution(execution.id, {
      status: 'failed',
      endTime: new Date(),
      error: error.message,
      duration: Date.now() - execution.startTime.getTime()
    });
    
    throw error;
  }
};

DatabaseStorage.prototype.scanFileSystem = async function(path: string): Promise<any> {
  // This would be implemented to scan a file system directory
  // For now, return a placeholder
  return { path, scanned: new Date(), files: [] };
};

DatabaseStorage.prototype.fixCommonErrors = async function(fileId: number): Promise<any> {
  // This would implement error fixing logic
  // For now, return a placeholder
  return { fileId, fixed: new Date(), errors: [] };
};

DatabaseStorage.prototype.convertCodeToProject = async function(codeId: number): Promise<any> {
  // This would implement code to project conversion
  // For now, return a placeholder
  return { codeId, converted: new Date(), project: {} };
};