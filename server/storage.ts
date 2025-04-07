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
  // File monitoring and workflow automation
  FileWatchConfig, InsertFileWatchConfig,
  AutomationWorkflow, InsertAutomationWorkflow,
  WorkflowExecution, InsertWorkflowExecution,
  // AI Hub Pipeline
  Pipeline, InsertPipeline,
  PipelineExecution, InsertPipelineExecution,
  AiHubProject, InsertAiHubProject,
  ProjectDeployment, InsertProjectDeployment,
  // Enums
  AiPlatform, FileCategory, FileSource, 
  IntegrationType, RecommendationType,
  IdeaStatus, ProjectStatus, MilestoneStatus,
  TriggerType, WorkflowStatus, WorkflowStepType,
  PipelineStatus, PipelineCategory,
  ProjectType, ProjectTemplate,
  DeploymentPlatform, DeploymentEnvironment,
  DeploymentStatus
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import { DatabaseStorage } from './database-storage';

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
  CodeSource, InsertCodeSource,
  // File monitoring and workflow automation
  FileWatchConfig, InsertFileWatchConfig,
  AutomationWorkflow, InsertAutomationWorkflow,
  WorkflowExecution, InsertWorkflowExecution,
  // AI Hub Pipeline
  Pipeline, InsertPipeline,
  PipelineExecution, InsertPipelineExecution,
  AiHubProject, InsertAiHubProject,
  ProjectDeployment, InsertProjectDeployment,
  // Enums
  PipelineStatus, PipelineCategory,
  ProjectType, ProjectTemplate,
  DeploymentPlatform, DeploymentEnvironment,
  DeploymentStatus
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
  
  // AI Hub Pipeline methods
  getPipelines(userId: number): Promise<Pipeline[]>;
  getPipelinesByCategory(category: string): Promise<Pipeline[]>;
  getPipeline(id: number): Promise<Pipeline | undefined>;
  getPipelineByName(name: string): Promise<Pipeline | undefined>;
  createPipeline(pipeline: InsertPipeline): Promise<Pipeline>;
  updatePipeline(id: number, pipeline: Partial<InsertPipeline>): Promise<Pipeline | undefined>;
  deletePipeline(id: number): Promise<boolean>;
  
  // Pipeline Execution methods
  executePipeline(pipelineId: number, input: any, userId: number): Promise<PipelineExecution>;
  getPipelineExecutions(pipelineId: number): Promise<PipelineExecution[]>;
  getRecentPipelineExecutions(userId: number, limit?: number): Promise<PipelineExecution[]>;
  getPipelineExecution(id: number): Promise<PipelineExecution | undefined>;
  updatePipelineExecution(id: number, execution: Partial<InsertPipelineExecution>): Promise<PipelineExecution | undefined>;
  
  // AI Hub Project methods
  getAiHubProjects(userId: number): Promise<AiHubProject[]>;
  getAiHubProjectsByType(userId: number, type: string): Promise<AiHubProject[]>;
  getAiHubProject(id: number): Promise<AiHubProject | undefined>;
  createAiHubProject(project: InsertAiHubProject): Promise<AiHubProject>;
  updateAiHubProject(id: number, project: Partial<InsertAiHubProject>): Promise<AiHubProject | undefined>;
  deleteAiHubProject(id: number): Promise<boolean>;
  scanAiHubProject(id: number): Promise<{ success: boolean; fileCount: number; issueCount: number; result: any }>;
  
  // Project Deployment methods
  getProjectDeployments(projectId: number): Promise<ProjectDeployment[]>;
  getProjectDeployment(id: number): Promise<ProjectDeployment | undefined>;
  createProjectDeployment(deployment: InsertProjectDeployment): Promise<ProjectDeployment>;
  updateProjectDeployment(id: number, deployment: Partial<InsertProjectDeployment>): Promise<ProjectDeployment | undefined>;
  
  // AI Hub File System Operations
  scanFileSystem(path: string, recursive?: boolean): Promise<{ files: any[]; issues: any[] }>;
  fixCommonErrors(filePath: string, issues: any[]): Promise<{ success: boolean; fixedIssues: any[] }>;
  convertCodeToProject(code: string, projectName: string, type: string): Promise<AiHubProject | undefined>;
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
  
  // File Watch Config methods
  getFileWatchConfigs(userId: number): Promise<FileWatchConfig[]>;
  getActiveFileWatchConfigs(userId: number): Promise<FileWatchConfig[]>;
  getFileWatchConfig(id: number): Promise<FileWatchConfig | undefined>;
  createFileWatchConfig(config: InsertFileWatchConfig): Promise<FileWatchConfig>;
  updateFileWatchConfig(id: number, config: Partial<InsertFileWatchConfig>): Promise<FileWatchConfig | undefined>;
  deleteFileWatchConfig(id: number): Promise<boolean>;
  
  // Automation Workflow methods
  getAutomationWorkflows(userId: number): Promise<AutomationWorkflow[]>;
  getActiveAutomationWorkflows(userId: number): Promise<AutomationWorkflow[]>;
  getAutomationWorkflowsByTriggerType(userId: number, triggerType: TriggerType): Promise<AutomationWorkflow[]>;
  getAutomationWorkflow(id: number): Promise<AutomationWorkflow | undefined>;
  createAutomationWorkflow(workflow: InsertAutomationWorkflow): Promise<AutomationWorkflow>;
  updateAutomationWorkflow(id: number, workflow: Partial<InsertAutomationWorkflow>): Promise<AutomationWorkflow | undefined>;
  deleteAutomationWorkflow(id: number): Promise<boolean>;
  
  // Workflow Execution methods
  getWorkflowExecutions(workflowId: number): Promise<WorkflowExecution[]>;
  getRecentWorkflowExecutions(userId: number, limit?: number): Promise<WorkflowExecution[]>;
  getWorkflowExecution(id: number): Promise<WorkflowExecution | undefined>;
  createWorkflowExecution(execution: InsertWorkflowExecution): Promise<WorkflowExecution>;
  updateWorkflowExecution(id: number, execution: Partial<InsertWorkflowExecution>): Promise<WorkflowExecution | undefined>;
  
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
  
  // File Watch methods
  getFileWatchConfigs(userId: number): Promise<FileWatchConfig[]>;
  getActiveFileWatchConfigs(userId: number): Promise<FileWatchConfig[]>;
  getFileWatchConfig(id: number): Promise<FileWatchConfig | undefined>;
  createFileWatchConfig(config: InsertFileWatchConfig): Promise<FileWatchConfig>;
  updateFileWatchConfig(id: number, config: Partial<InsertFileWatchConfig>): Promise<FileWatchConfig | undefined>;
  deleteFileWatchConfig(id: number): Promise<boolean>;
  
  // Automation Workflow methods
  getAutomationWorkflows(userId: number): Promise<AutomationWorkflow[]>;
  getActiveAutomationWorkflows(userId: number): Promise<AutomationWorkflow[]>;
  getAutomationWorkflowsByTriggerType(userId: number, triggerType: string): Promise<AutomationWorkflow[]>;
  getAutomationWorkflow(id: number): Promise<AutomationWorkflow | undefined>;
  createAutomationWorkflow(workflow: InsertAutomationWorkflow): Promise<AutomationWorkflow>;
  updateAutomationWorkflow(id: number, workflow: Partial<InsertAutomationWorkflow>): Promise<AutomationWorkflow | undefined>;
  deleteAutomationWorkflow(id: number): Promise<boolean>;
  executeWorkflow(id: number, triggerData?: any): Promise<WorkflowExecution>;
  
  // Workflow Execution methods
  getWorkflowExecutions(workflowId: number): Promise<WorkflowExecution[]>;
  getRecentWorkflowExecutions(userId: number, limit?: number): Promise<WorkflowExecution[]>;
  getWorkflowExecution(id: number): Promise<WorkflowExecution | undefined>;
  updateWorkflowExecution(id: number, execution: Partial<InsertWorkflowExecution>): Promise<WorkflowExecution | undefined>;
  
  // AI Hub Pipeline methods
  getPipelines(userId: number): Promise<Pipeline[]>;
  getPipelinesByCategory(category: string): Promise<Pipeline[]>;
  getPipeline(id: number): Promise<Pipeline | undefined>;
  getPipelineByName(name: string): Promise<Pipeline | undefined>;
  createPipeline(pipeline: InsertPipeline): Promise<Pipeline>;
  updatePipeline(id: number, pipeline: Partial<InsertPipeline>): Promise<Pipeline | undefined>;
  deletePipeline(id: number): Promise<boolean>;
  executePipeline(pipelineId: number, input: any, userId: number): Promise<PipelineExecution>;
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
  // AI Hub specific maps
  private pipelines: Map<number, Pipeline>;
  private pipelineExecutions: Map<number, PipelineExecution>;
  private aiHubProjects: Map<number, AiHubProject>;
  private projectDeployments: Map<number, ProjectDeployment>;
  // Counter variables
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
  private fileWatchConfigIdCounter: number;
  private automationWorkflowIdCounter: number;
  private workflowExecutionIdCounter: number;
  // AI Hub specific counters
  private pipelineIdCounter: number;
  private pipelineExecutionIdCounter: number;
  private aiHubProjectIdCounter: number;
  private projectDeploymentIdCounter: number;
  // Maps for file watching and automation
  private fileWatchConfigs: Map<number, FileWatchConfig>;
  private automationWorkflows: Map<number, AutomationWorkflow>;
  private workflowExecutions: Map<number, WorkflowExecution>;

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
    this.fileWatchConfigs = new Map();
    this.automationWorkflows = new Map();
    this.workflowExecutions = new Map();
    
    // Initialize AI Hub maps
    this.pipelines = new Map();
    this.pipelineExecutions = new Map();
    this.aiHubProjects = new Map();
    this.projectDeployments = new Map();
    
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
    this.fileWatchConfigIdCounter = 1;
    this.automationWorkflowIdCounter = 1;
    this.workflowExecutionIdCounter = 1;
    
    // Initialize AI Hub counters
    this.pipelineIdCounter = 1;
    this.pipelineExecutionIdCounter = 1;
    this.aiHubProjectIdCounter = 1;
    this.projectDeploymentIdCounter = 1;
    
    // Initialize AI Hub counters
    this.pipelineIdCounter = 1;
    this.pipelineExecutionIdCounter = 1;
    this.aiHubProjectIdCounter = 1;
    this.projectDeploymentIdCounter = 1;
    
    // Add sample file watch configurations
    this.createFileWatchConfig({
      name: "Documents Folder Watch",
      path: "/home/user/documents",
      userId: 1,
      isActive: true,
      isRecursive: true,
      filePatterns: "*.docx,*.pdf,*.txt",
      ignorePatterns: "*.tmp,*~"
    });
    
    // Add sample automation workflow
    this.createAutomationWorkflow({
      name: "New Document Processing",
      userId: 1,
      description: "Process new documents when they are added",
      triggerType: "FILE_CREATED",
      triggerConfig: { watchId: 1, filePattern: "*.docx" },
      steps: [
        {
          id: 1,
          type: "NOTIFICATION",
          name: "Send Notification",
          config: { 
            title: "New Document Added",
            message: "A new document has been added to your documents folder"
          }
        },
        {
          id: 2,
          type: "AI_SUMMARY",
          name: "Generate Summary",
          config: {
            model: "gpt-4o",
            prompt: "Summarize this document in 3 paragraphs"
          }
        }
      ]
    });
    
    // Initialize with sample user
    this.createUser({
      username: "pinky",
      password: "password",
      displayName: "Pinky Kim",
      email: "pinky@example.com"
    });
    
    // Initialize sample AI Hub pipelines
    this.createPipeline({
      name: "Text Analysis Pipeline",
      description: "Analyzes text for sentiment, topics, and entities",
      category: PipelineCategory.TEXT_ANALYSIS,
      userId: 1,
      configSchema: JSON.stringify({
        type: "object",
        properties: {
          model: {
            type: "string",
            enum: ["basic", "advanced"],
            default: "basic"
          },
          includeEntities: {
            type: "boolean",
            default: true
          }
        }
      }),
      inputSchema: JSON.stringify({
        type: "object",
        properties: {
          text: {
            type: "string",
            description: "The text to analyze"
          }
        },
        required: ["text"]
      }),
      outputSchema: JSON.stringify({
        type: "object",
        properties: {
          sentiment: {
            type: "string",
            enum: ["positive", "negative", "neutral"]
          },
          topics: {
            type: "array",
            items: {
              type: "string"
            }
          },
          entities: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { type: "string" },
                name: { type: "string" },
                count: { type: "number" }
              }
            }
          }
        }
      }),
      implementation: "function analyze(input, config) { /* Implementation code here */ }",
      isPublic: true
    });
    
    this.createPipeline({
      name: "Data Transformation Pipeline",
      description: "Transforms JSON data according to specified rules",
      category: PipelineCategory.DATA_TRANSFORMATION,
      userId: 1,
      configSchema: JSON.stringify({
        type: "object",
        properties: {
          transformations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                field: { type: "string" },
                operation: { 
                  type: "string",
                  enum: ["rename", "delete", "modify"]
                },
                value: { type: "string" }
              }
            }
          }
        }
      }),
      inputSchema: JSON.stringify({
        type: "object",
        properties: {
          data: {
            type: "array",
            items: {
              type: "object"
            }
          }
        },
        required: ["data"]
      }),
      isPublic: true
    });
    
    this.createPipeline({
      name: "File Conversion Pipeline",
      description: "Converts files between different formats",
      category: PipelineCategory.FILE_CONVERSION,
      userId: 1,
      configSchema: JSON.stringify({
        type: "object",
        properties: {
          quality: {
            type: "string",
            enum: ["low", "medium", "high"],
            default: "medium"
          }
        }
      }),
      inputSchema: JSON.stringify({
        type: "object",
        properties: {
          fileName: {
            type: "string",
            description: "The name of the file to convert"
          },
          targetFormat: {
            type: "string",
            enum: ["pdf", "docx", "txt", "html", "md"]
          }
        },
        required: ["fileName", "targetFormat"]
      }),
      isPublic: true
    });
    
    this.createPipeline({
      name: "Git Repository Analysis",
      description: "Analyzes Git repositories for stats and issues",
      category: PipelineCategory.GIT_REPOSITORY,
      userId: 1,
      configSchema: JSON.stringify({
        type: "object",
        properties: {
          depth: {
            type: "number",
            default: 10,
            description: "Number of commits to analyze"
          },
          checkStyle: {
            type: "boolean",
            default: true
          }
        }
      }),
      inputSchema: JSON.stringify({
        type: "object",
        properties: {
          repoUrl: {
            type: "string",
            description: "The URL of the Git repository"
          },
          branch: {
            type: "string",
            default: "main"
          }
        },
        required: ["repoUrl"]
      }),
      isPublic: true
    });
    
    // Initialize sample AI Hub project
    this.createAiHubProject({
      name: "Sample Web App",
      description: "A sample React web application with API integration",
      type: ProjectType.WEB,
      template: ProjectTemplate.WEB,
      userId: 1,
      status: "IN_PROGRESS",
      localPath: "/projects/sample-web-app",
      config: {
        framework: "react",
        styling: "tailwind",
        features: ["authentication", "database", "api"]
      },
      isPublic: true
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

  // File Watch Configuration methods
  async getFileWatchConfigs(userId: number): Promise<FileWatchConfig[]> {
    return Array.from(this.fileWatchConfigs.values()).filter(
      (config) => config.userId === userId
    );
  }

  async getActiveFileWatchConfigs(userId: number): Promise<FileWatchConfig[]> {
    return Array.from(this.fileWatchConfigs.values()).filter(
      (config) => config.userId === userId && config.isActive
    );
  }

  async getFileWatchConfig(id: number): Promise<FileWatchConfig | undefined> {
    return this.fileWatchConfigs.get(id);
  }

  async createFileWatchConfig(insertConfig: InsertFileWatchConfig): Promise<FileWatchConfig> {
    const id = this.fileWatchConfigIdCounter++;
    const now = new Date();
    
    // Type-safe initialization
    const config: FileWatchConfig = {
      id,
      name: insertConfig.name,
      path: insertConfig.path,
      userId: insertConfig.userId,
      createdAt: now,
      updatedAt: now,
      isActive: insertConfig.isActive ?? true,
      isRecursive: insertConfig.isRecursive ?? false,
      filePatterns: insertConfig.filePatterns ?? null,
      ignorePatterns: insertConfig.ignorePatterns ?? null,
      lastRunAt: null,
      watchConfig: insertConfig.watchConfig ?? null
    };
    
    this.fileWatchConfigs.set(id, config);
    return config;
  }

  async updateFileWatchConfig(id: number, updates: Partial<InsertFileWatchConfig>): Promise<FileWatchConfig | undefined> {
    const existingConfig = this.fileWatchConfigs.get(id);
    if (!existingConfig) return undefined;

    const updatedConfig = { 
      ...existingConfig, 
      ...updates,
      updatedAt: new Date()
    };
    
    this.fileWatchConfigs.set(id, updatedConfig);
    return updatedConfig;
  }

  async deleteFileWatchConfig(id: number): Promise<boolean> {
    return this.fileWatchConfigs.delete(id);
  }

  // Automation Workflow methods
  async getAutomationWorkflows(userId: number): Promise<AutomationWorkflow[]> {
    return Array.from(this.automationWorkflows.values()).filter(
      (workflow) => workflow.userId === userId
    );
  }

  async getActiveAutomationWorkflows(userId: number): Promise<AutomationWorkflow[]> {
    return Array.from(this.automationWorkflows.values()).filter(
      (workflow) => workflow.userId === userId && workflow.isActive
    );
  }

  async getAutomationWorkflowsByTriggerType(userId: number, triggerType: string): Promise<AutomationWorkflow[]> {
    return Array.from(this.automationWorkflows.values()).filter(
      (workflow) => workflow.userId === userId && workflow.triggerType === triggerType
    );
  }

  async getAutomationWorkflow(id: number): Promise<AutomationWorkflow | undefined> {
    return this.automationWorkflows.get(id);
  }

  async createAutomationWorkflow(insertWorkflow: InsertAutomationWorkflow): Promise<AutomationWorkflow> {
    const id = this.automationWorkflowIdCounter++;
    const now = new Date();
    
    // Type-safe initialization
    const workflow: AutomationWorkflow = {
      id,
      name: insertWorkflow.name,
      userId: insertWorkflow.userId,
      description: insertWorkflow.description ?? null,
      triggerType: insertWorkflow.triggerType,
      triggerConfig: insertWorkflow.triggerConfig ?? null,
      steps: insertWorkflow.steps ?? null,
      createdAt: now,
      updatedAt: now,
      isActive: insertWorkflow.isActive ?? true,
      lastRunAt: null,
      executionCount: 0,
      averageExecutionTime: null
    };
    
    this.automationWorkflows.set(id, workflow);
    return workflow;
  }

  async updateAutomationWorkflow(id: number, updates: Partial<InsertAutomationWorkflow>): Promise<AutomationWorkflow | undefined> {
    const existingWorkflow = this.automationWorkflows.get(id);
    if (!existingWorkflow) return undefined;

    const updatedWorkflow = { 
      ...existingWorkflow, 
      ...updates,
      updatedAt: new Date()
    };
    
    this.automationWorkflows.set(id, updatedWorkflow);
    return updatedWorkflow;
  }

  async deleteAutomationWorkflow(id: number): Promise<boolean> {
    return this.automationWorkflows.delete(id);
  }

  async executeWorkflow(id: number, triggerData: any = {}): Promise<WorkflowExecution> {
    const workflow = await this.getAutomationWorkflow(id);
    if (!workflow) {
      throw new Error(`Workflow with ID ${id} not found`);
    }

    // Create a new execution record
    const execution = await this.createWorkflowExecution({
      workflowId: id,
      userId: workflow.userId,
      status: "running",
      startTime: new Date(),
      triggerSource: "manual",
      triggerData: triggerData
    });

    // In a real implementation, this would execute the workflow steps
    // For this prototype, we'll simulate a successful execution
    
    // Update the workflow stats
    await this.updateAutomationWorkflow(id, {
      lastRunAt: new Date(),
      executionCount: (workflow.executionCount || 0) + 1
    });

    // Mark the execution as complete with execution time
    const executionTime = 1250; // milliseconds, simulated time
    const completedExecution = await this.updateWorkflowExecution(execution.id, {
      status: "completed",
      endTime: new Date(),
      result: { success: true, message: "Workflow executed successfully" },
      executionTime: executionTime
    });

    return completedExecution!;
  }
  
  // Workflow Execution methods
  async getWorkflowExecutions(workflowId: number): Promise<WorkflowExecution[]> {
    return Array.from(this.workflowExecutions.values()).filter(
      (execution) => execution.workflowId === workflowId
    );
  }

  async getRecentWorkflowExecutions(userId: number, limit: number = 10): Promise<WorkflowExecution[]> {
    // First get all workflows for this user
    const userWorkflows = await this.getAutomationWorkflows(userId);
    const userWorkflowIds = new Set(userWorkflows.map(w => w.id));
    
    // Then get executions that match these workflow IDs
    return Array.from(this.workflowExecutions.values())
      .filter(execution => userWorkflowIds.has(execution.workflowId))
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
      .slice(0, limit);
  }

  async getWorkflowExecution(id: number): Promise<WorkflowExecution | undefined> {
    return this.workflowExecutions.get(id);
  }

  async createWorkflowExecution(insertExecution: InsertWorkflowExecution): Promise<WorkflowExecution> {
    const id = this.workflowExecutionIdCounter++;
    
    // Type-safe initialization with handling for startTime being required
    const execution: WorkflowExecution = {
      id,
      workflowId: insertExecution.workflowId,
      userId: insertExecution.userId,
      status: insertExecution.status,
      startTime: insertExecution.startTime ?? new Date(), // Default to now if not provided
      endTime: insertExecution.endTime ?? null,
      triggerSource: insertExecution.triggerSource ?? null,
      result: insertExecution.result ?? null,
      logs: insertExecution.logs ?? null,
      error: insertExecution.error ?? null,
      executionTime: insertExecution.executionTime ?? null,
      triggerData: insertExecution.triggerData ?? null
    };
    
    this.workflowExecutions.set(id, execution);
    return execution;
  }

  async updateWorkflowExecution(id: number, updates: Partial<InsertWorkflowExecution>): Promise<WorkflowExecution | undefined> {
    const existingExecution = this.workflowExecutions.get(id);
    if (!existingExecution) return undefined;

    const updatedExecution = { ...existingExecution, ...updates };
    this.workflowExecutions.set(id, updatedExecution);
    return updatedExecution;
  }

  async deleteWorkflowExecution(id: number): Promise<boolean> {
    return this.workflowExecutions.delete(id);
  }

  // AI Hub Pipeline methods
  async getPipelines(userId: number): Promise<Pipeline[]> {
    return Array.from(this.pipelines.values()).filter(
      (pipeline) => pipeline.userId === userId,
    );
  }

  async getPipelinesByCategory(category: string): Promise<Pipeline[]> {
    return Array.from(this.pipelines.values()).filter(
      (pipeline) => pipeline.category === category,
    );
  }

  async getPipeline(id: number): Promise<Pipeline | undefined> {
    return this.pipelines.get(id);
  }

  async getPipelineByName(name: string): Promise<Pipeline | undefined> {
    return Array.from(this.pipelines.values()).find(
      (pipeline) => pipeline.name === name,
    );
  }

  async createPipeline(pipeline: InsertPipeline): Promise<Pipeline> {
    const id = this.pipelineIdCounter++;
    const newPipeline: Pipeline = {
      id,
      name: pipeline.name,
      description: pipeline.description || null,
      inputType: pipeline.inputType,
      outputType: pipeline.outputType,
      steps: pipeline.steps,
      isActive: pipeline.isActive !== undefined ? pipeline.isActive : true,
      createdAt: pipeline.createdAt || new Date(),
      updatedAt: pipeline.updatedAt || new Date(),
      createdBy: pipeline.createdBy,
      category: pipeline.category || null,
      tags: pipeline.tags || null,
      metadata: pipeline.metadata || null,
      configSchema: pipeline.configSchema || null,
    };
    this.pipelines.set(id, newPipeline);
    return newPipeline;
  }

  async updatePipeline(id: number, pipeline: Partial<InsertPipeline>): Promise<Pipeline | undefined> {
    const existingPipeline = this.pipelines.get(id);
    if (!existingPipeline) return undefined;

    const updatedPipeline = { 
      ...existingPipeline, 
      ...pipeline,
      updatedAt: new Date()
    };
    this.pipelines.set(id, updatedPipeline);
    return updatedPipeline;
  }

  async deletePipeline(id: number): Promise<boolean> {
    return this.pipelines.delete(id);
  }

  async executePipeline(pipelineId: number, input: any, userId: number): Promise<PipelineExecution> {
    const pipeline = await this.getPipeline(pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline with ID ${pipelineId} not found`);
    }

    const id = this.pipelineExecutionIdCounter++;
    const execution: PipelineExecution = {
      id,
      pipelineId,
      userId,
      input,
      output: null,
      status: PipelineStatus.RUNNING,
      startTime: new Date(),
      endTime: null,
      duration: null,
      error: null,
      logs: [{
        timestamp: new Date().toISOString(),
        level: "INFO",
        message: `Pipeline execution started: ${pipeline.name}`
      }],
      metadata: null
    };

    this.pipelineExecutions.set(id, execution);

    // Simulate pipeline execution (asynchronously)
    setTimeout(async () => {
      try {
        // In a real implementation, this would execute the actual pipeline logic
        // based on pipeline.implementation
        
        // For demonstration purposes, we'll create sample outputs based on pipeline category
        let output: any;
        
        switch (pipeline.category) {
          case PipelineCategory.TEXT_ANALYSIS:
            output = {
              sentiment: Math.random() > 0.5 ? "positive" : "negative",
              topics: ["business", "technology", "AI"],
              summary: "This is a sample text analysis result.",
              entities: [
                { type: "person", name: "John Doe", count: 3 },
                { type: "organization", name: "Acme Corp", count: 2 }
              ]
            };
            break;
            
          case PipelineCategory.DATA_TRANSFORMATION:
            output = {
              transformedData: input.data.map((item: any) => ({ 
                ...item, 
                processed: true,
                score: Math.random() * 100
              })),
              stats: {
                processed: input.data.length,
                filtered: Math.floor(input.data.length * 0.2),
                enhanced: Math.floor(input.data.length * 0.8)
              }
            };
            break;
            
          case PipelineCategory.FILE_CONVERSION:
            output = {
              convertedFile: {
                name: input.fileName.replace(/\.\w+$/, '.converted'),
                size: Math.floor(Math.random() * 1000000),
                format: input.targetFormat || "pdf",
                url: `https://example.com/files/${input.fileName.replace(/\.\w+$/, '.converted')}`
              }
            };
            break;
            
          case PipelineCategory.GIT_REPOSITORY:
            output = {
              repoStats: {
                commits: Math.floor(Math.random() * 1000),
                branches: Math.floor(Math.random() * 10) + 1,
                contributors: Math.floor(Math.random() * 5) + 1,
                lastCommit: new Date().toISOString()
              },
              analyzedFiles: Math.floor(Math.random() * 100) + 10,
              issues: Math.floor(Math.random() * 20)
            };
            break;
            
          default:
            output = { result: "Sample pipeline output", timestamp: new Date().toISOString() };
        }

        // Update the execution with success
        const updatedExecution = {
          ...execution,
          status: PipelineStatus.COMPLETED,
          endTime: new Date(),
          duration: 2000, // Simulated execution time in ms
          output: output,
          logs: [...execution.logs, {
            timestamp: new Date().toISOString(),
            level: "INFO",
            message: `Pipeline execution completed successfully: ${pipeline.name}`
          }]
        };
        
        this.pipelineExecutions.set(id, updatedExecution);
        
      } catch (error: any) {
        // Update the execution with error
        const updatedExecution = {
          ...execution,
          status: PipelineStatus.FAILED,
          endTime: new Date(),
          duration: 2000, // Simulated execution time in ms
          error: error.message || "Unknown error during pipeline execution",
          logs: [...execution.logs, {
            timestamp: new Date().toISOString(),
            level: "ERROR",
            message: `Pipeline execution failed: ${error.message || "Unknown error"}`
          }]
        };
        
        this.pipelineExecutions.set(id, updatedExecution);
      }
    }, 2000); // Simulate 2 second processing time
    
    return execution;
  }

  // Pipeline Execution methods
  async getPipelineExecutions(pipelineId: number): Promise<PipelineExecution[]> {
    return Array.from(this.pipelineExecutions.values()).filter(
      (execution) => execution.pipelineId === pipelineId,
    );
  }

  async getRecentPipelineExecutions(userId: number, limit: number = 10): Promise<PipelineExecution[]> {
    return Array.from(this.pipelineExecutions.values())
      .filter((execution) => execution.userId === userId)
      .sort((a, b) => {
        const dateA = new Date(a.startTime).getTime();
        const dateB = new Date(b.startTime).getTime();
        return dateB - dateA;
      })
      .slice(0, limit);
  }

  async getPipelineExecution(id: number): Promise<PipelineExecution | undefined> {
    return this.pipelineExecutions.get(id);
  }

  async updatePipelineExecution(id: number, execution: Partial<InsertPipelineExecution>): Promise<PipelineExecution | undefined> {
    const existingExecution = this.pipelineExecutions.get(id);
    if (!existingExecution) return undefined;

    const updatedExecution = { ...existingExecution, ...execution };
    this.pipelineExecutions.set(id, updatedExecution);
    return updatedExecution;
  }

  // AI Hub Project methods
  async getAiHubProjects(userId: number): Promise<AiHubProject[]> {
    return Array.from(this.aiHubProjects.values()).filter(
      (project) => project.userId === userId,
    );
  }

  async getAiHubProjectsByType(userId: number, type: string): Promise<AiHubProject[]> {
    return Array.from(this.aiHubProjects.values()).filter(
      (project) => project.userId === userId && project.type === type,
    );
  }

  async getAiHubProject(id: number): Promise<AiHubProject | undefined> {
    return this.aiHubProjects.get(id);
  }

  async createAiHubProject(project: InsertAiHubProject): Promise<AiHubProject> {
    const id = this.aiHubProjectIdCounter++;
    const newProject: AiHubProject = {
      id,
      name: project.name,
      description: project.description || null,
      type: project.type,
      template: project.template || null,
      userId: project.userId,
      status: project.status || "IN_PROGRESS",
      repositoryUrl: project.repositoryUrl || null,
      localPath: project.localPath || null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastBuildAt: null,
      config: project.config || null,
      apiSpec: project.apiSpec || null,
      isPublic: project.isPublic || false,
      tags: project.tags || null
    };
    this.aiHubProjects.set(id, newProject);
    return newProject;
  }

  async updateAiHubProject(id: number, project: Partial<InsertAiHubProject>): Promise<AiHubProject | undefined> {
    const existingProject = this.aiHubProjects.get(id);
    if (!existingProject) return undefined;

    const updatedProject = { 
      ...existingProject, 
      ...project,
      updatedAt: new Date()
    };
    this.aiHubProjects.set(id, updatedProject);
    return updatedProject;
  }

  async deleteAiHubProject(id: number): Promise<boolean> {
    return this.aiHubProjects.delete(id);
  }

  async scanAiHubProject(id: number): Promise<{ success: boolean; fileCount: number; issueCount: number; result: any }> {
    const project = await this.getAiHubProject(id);
    if (!project) {
      throw new Error(`Project with ID ${id} not found`);
    }

    // Simulate project scanning
    // In a real implementation, this would analyze the project files
    
    const fileCount = Math.floor(Math.random() * 50) + 10;
    const issueCount = Math.floor(Math.random() * 10);
    
    const issues = Array.from({ length: issueCount }, (_, i) => ({
      id: i + 1,
      type: ['ERROR', 'WARNING', 'INFO'][Math.floor(Math.random() * 3)],
      file: `src/components/Component${Math.floor(Math.random() * 10)}.tsx`,
      line: Math.floor(Math.random() * 200) + 1,
      message: `Sample issue ${i + 1} in project scan`,
      code: `code-${Math.floor(Math.random() * 1000)}`
    }));

    const result = {
      scannedAt: new Date().toISOString(),
      summary: {
        fileCount,
        issueCount,
        errorCount: issues.filter(i => i.type === 'ERROR').length,
        warningCount: issues.filter(i => i.type === 'WARNING').length,
        infoCount: issues.filter(i => i.type === 'INFO').length
      },
      issues
    };
    
    return {
      success: true,
      fileCount,
      issueCount,
      result
    };
  }

  // Project Deployment methods
  async getProjectDeployments(projectId: number): Promise<ProjectDeployment[]> {
    return Array.from(this.projectDeployments.values()).filter(
      (deployment) => deployment.projectId === projectId,
    );
  }

  async getProjectDeployment(id: number): Promise<ProjectDeployment | undefined> {
    return this.projectDeployments.get(id);
  }

  async createProjectDeployment(deployment: InsertProjectDeployment): Promise<ProjectDeployment> {
    const id = this.projectDeploymentIdCounter++;
    const newDeployment: ProjectDeployment = {
      id,
      projectId: deployment.projectId,
      platform: deployment.platform,
      environment: deployment.environment || DeploymentEnvironment.DEVELOPMENT,
      status: deployment.status || DeploymentStatus.PENDING,
      deployedAt: new Date(),
      deployedBy: deployment.deployedBy,
      config: deployment.config || null,
      url: deployment.url || null,
      version: deployment.version || "1.0.0",
      logs: deployment.logs || null
    };
    this.projectDeployments.set(id, newDeployment);
    return newDeployment;
  }

  async updateProjectDeployment(id: number, deployment: Partial<InsertProjectDeployment>): Promise<ProjectDeployment | undefined> {
    const existingDeployment = this.projectDeployments.get(id);
    if (!existingDeployment) return undefined;

    const updatedDeployment = { ...existingDeployment, ...deployment };
    this.projectDeployments.set(id, updatedDeployment);
    return updatedDeployment;
  }

  // AI Hub File System Operations
  async scanFileSystem(path: string, recursive: boolean = true): Promise<{ files: any[]; issues: any[] }> {
    // Simulate filesystem scanning
    // In a real implementation, this would scan the actual filesystem
    
    const fileCount = Math.floor(Math.random() * 30) + 5;
    const issueCount = Math.floor(Math.random() * 5);
    
    const files = Array.from({ length: fileCount }, (_, i) => ({
      name: `file_${i + 1}.${['js', 'ts', 'json', 'md', 'txt'][Math.floor(Math.random() * 5)]}`,
      path: `${path}/${['src', 'docs', 'config', ''][Math.floor(Math.random() * 4)]}`,
      size: Math.floor(Math.random() * 50000),
      lastModified: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000).toISOString(),
      type: ['file', 'directory'][Math.floor(Math.random() * 2)]
    }));
    
    const issues = Array.from({ length: issueCount }, (_, i) => ({
      id: i + 1,
      path: `${path}/${files[Math.floor(Math.random() * files.length)].name}`,
      type: ['permission_denied', 'not_found', 'read_error'][Math.floor(Math.random() * 3)],
      message: `Sample filesystem issue ${i + 1}`
    }));
    
    return {
      files,
      issues
    };
  }

  async fixCommonErrors(filePath: string, issues: any[]): Promise<{ success: boolean; fixedIssues: any[] }> {
    // Simulate fixing errors
    // In a real implementation, this would attempt to fix the actual issues
    
    const fixedIssues = issues.filter(() => Math.random() > 0.3).map(issue => ({
      ...issue,
      fixed: true,
      fixedAt: new Date().toISOString()
    }));
    
    return {
      success: fixedIssues.length > 0,
      fixedIssues
    };
  }

  async convertCodeToProject(code: string, projectName: string, type: string): Promise<AiHubProject | undefined> {
    // Simulate code to project conversion
    // In a real implementation, this would analyze the code and create a proper project
    
    const project = await this.createAiHubProject({
      name: projectName,
      description: `Project created from code snippet on ${new Date().toISOString()}`,
      type: type as ProjectType,
      template: ProjectTemplate.EMPTY,
      userId: 1, // Default user
      status: "IN_PROGRESS",
      localPath: `/projects/${projectName.toLowerCase().replace(/\s+/g, '-')}`,
      config: { sourceCode: code.substring(0, 100) + '...' } // Store a snippet of the code
    });
    
    return project;
  }
}

// Export storage instances
export const memStorage = new MemStorage();
export const dbStorage = new DatabaseStorage();

// Use the PostgreSQL implementation by default
export const storage = dbStorage;
