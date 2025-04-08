import { 
  type Pipeline, type InsertPipeline,
  type PipelineExecution, type InsertPipelineExecution,
  type AiHubProject, type InsertAiHubProject,
  type ProjectDeployment, type InsertProjectDeployment,
  type DeploymentHistory, type InsertDeploymentHistory,
  type File
} from './schema';

/**
 * AI Hub Pipeline Storage Interface
 */
export interface IAIHubPipelineStorage {
  // Pipeline methods
  getPipelines(userId: number): Promise<Pipeline[]>;
  getPipelinesByCategory(category: string): Promise<Pipeline[]>;
  getPipeline(id: number): Promise<Pipeline | undefined>;
  getPipelineByName(name: string): Promise<Pipeline | undefined>;
  createPipeline(pipeline: InsertPipeline): Promise<Pipeline>;
  updatePipeline(id: number, pipeline: Partial<InsertPipeline>): Promise<Pipeline | undefined>;
  deletePipeline(id: number): Promise<boolean>;
  
  // Pipeline execution methods
  getPipelineExecutions(pipelineId: number): Promise<PipelineExecution[]>;
  getRecentPipelineExecutions(userId: number, limit?: number): Promise<PipelineExecution[]>;
  getPipelineExecution(id: number): Promise<PipelineExecution | undefined>;
  createPipelineExecution(execution: InsertPipelineExecution): Promise<PipelineExecution>;
  updatePipelineExecution(id: number, execution: Partial<InsertPipelineExecution>): Promise<PipelineExecution | undefined>;
  executePipeline(pipeline: Pipeline, input: any): Promise<{ output: any; executionId: number }>;
}

/**
 * AI Hub Project Storage Interface
 */
export interface IAIHubProjectStorage {
  // AI Hub Project methods
  getAiHubProjects(userId: number): Promise<AiHubProject[]>;
  getAiHubProjectsByType(userId: number, type: string): Promise<AiHubProject[]>;
  getAiHubProject(id: number): Promise<AiHubProject | undefined>;
  createAiHubProject(project: InsertAiHubProject): Promise<AiHubProject>;
  updateAiHubProject(id: number, project: Partial<InsertAiHubProject>): Promise<AiHubProject | undefined>;
  deleteAiHubProject(id: number): Promise<boolean>;
  scanAiHubProject(id: number, scanResult: any): Promise<AiHubProject | undefined>;
  
  // Project Deployment methods
  getProjectDeployments(projectId: number): Promise<ProjectDeployment[]>;
  getProjectDeployment(id: number): Promise<ProjectDeployment | undefined>;
  createProjectDeployment(deployment: InsertProjectDeployment): Promise<ProjectDeployment>;
  updateProjectDeployment(id: number, deployment: Partial<InsertProjectDeployment>): Promise<ProjectDeployment | undefined>;
}

/**
 * AI Hub Deployment Storage Interface
 */
export interface IAIHubDeploymentStorage {
  // Deployment History methods
  getDeploymentHistories(projectId: number): Promise<DeploymentHistory[]>;
  getDeploymentHistoriesForProject(projectId: number): Promise<DeploymentHistory[]>;
  getDeploymentHistory(id: number): Promise<DeploymentHistory | undefined>;
  createDeploymentHistory(history: InsertDeploymentHistory): Promise<DeploymentHistory>;
  updateDeploymentHistory(id: number, history: Partial<InsertDeploymentHistory>): Promise<DeploymentHistory | undefined>;
  deleteDeploymentHistory(id: number): Promise<boolean>;
  
  // Project deployment utility methods
  deployProject(projectId: number, userId: number, environment: string, metadata?: any): Promise<DeploymentHistory>;
  updateDeploymentStatus(deploymentId: number, status: string, logs?: any, visualFeedback?: any): Promise<DeploymentHistory | undefined>;
  
  // Project Files utility methods
  getFilesForProject(projectId: number): Promise<File[]>;
}

/**
 * AI Hub Utilities Storage Interface
 */
export interface IAIHubUtilityStorage {
  // File system operations
  scanFileSystem(path: string, recursive?: boolean): Promise<{ files: any[]; issues: any[] }>;
  fixCommonErrors(filePath: string, issues: any[]): Promise<{ success: boolean; fixedIssues: any[] }>;
  convertCodeToProject(code: string, projectName: string, type: string): Promise<AiHubProject | undefined>;
}

/**
 * Combined AI Hub Storage Interface
 */
export interface IAIHubStorage extends 
  IAIHubPipelineStorage, 
  IAIHubProjectStorage,
  IAIHubDeploymentStorage,
  IAIHubUtilityStorage {
}