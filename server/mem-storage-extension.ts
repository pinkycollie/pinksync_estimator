import { MemStorage } from './storage';
import { 
  type Pipeline, type InsertPipeline,
  type PipelineExecution, type InsertPipelineExecution,
  type AiHubProject, type InsertAiHubProject,
  type ProjectDeployment, type InsertProjectDeployment,
  type DeploymentHistory, type InsertDeploymentHistory,
  type File
} from '@shared/schema';

// Extension methods for AI Hub pipelines
export function extendMemStorageWithAiHub(MemStorage: any) {
  // Pipeline methods
  MemStorage.prototype.getPipelines = async function(userId: number): Promise<Pipeline[]> {
    return Array.from(this.pipelines.values())
      .filter(pipeline => pipeline.createdBy === userId);
  };

  MemStorage.prototype.getPipelinesByCategory = async function(category: string): Promise<Pipeline[]> {
    return Array.from(this.pipelines.values())
      .filter(pipeline => pipeline.category === category);
  };

  MemStorage.prototype.getPipeline = async function(id: number): Promise<Pipeline | undefined> {
    return this.pipelines.get(id);
  };

  MemStorage.prototype.getPipelineByName = async function(name: string): Promise<Pipeline | undefined> {
    return Array.from(this.pipelines.values())
      .find(pipeline => pipeline.name === name);
  };

  MemStorage.prototype.createPipeline = async function(insertPipeline: InsertPipeline): Promise<Pipeline> {
    const id = this.pipelineIdCounter++;
    const pipeline: Pipeline = {
      id,
      ...insertPipeline,
      createdAt: insertPipeline.createdAt || new Date(),
      updatedAt: insertPipeline.updatedAt || new Date(),
      isActive: insertPipeline.isActive || true
    };
    this.pipelines.set(id, pipeline);
    return pipeline;
  };

  MemStorage.prototype.updatePipeline = async function(id: number, pipelineUpdate: Partial<InsertPipeline>): Promise<Pipeline | undefined> {
    const existingPipeline = this.pipelines.get(id);
    if (!existingPipeline) return undefined;

    const updatedPipeline: Pipeline = {
      ...existingPipeline,
      ...pipelineUpdate,
      updatedAt: new Date(),
      id
    };
    this.pipelines.set(id, updatedPipeline);
    return updatedPipeline;
  };

  MemStorage.prototype.deletePipeline = async function(id: number): Promise<boolean> {
    return this.pipelines.delete(id);
  };

  // Pipeline execution methods
  MemStorage.prototype.getPipelineExecutions = async function(pipelineId: number): Promise<PipelineExecution[]> {
    return Array.from(this.pipelineExecutions.values())
      .filter(execution => execution.pipelineId === pipelineId)
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  };

  MemStorage.prototype.getRecentPipelineExecutions = async function(userId: number, limit: number = 10): Promise<PipelineExecution[]> {
    return Array.from(this.pipelineExecutions.values())
      .filter(execution => execution.userId === userId)
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
      .slice(0, limit);
  };

  MemStorage.prototype.getPipelineExecution = async function(id: number): Promise<PipelineExecution | undefined> {
    return this.pipelineExecutions.get(id);
  };

  MemStorage.prototype.createPipelineExecution = async function(insertExecution: InsertPipelineExecution): Promise<PipelineExecution> {
    const id = this.pipelineExecutionIdCounter++;
    const execution: PipelineExecution = {
      id,
      ...insertExecution,
      startTime: insertExecution.startTime || new Date(),
      endTime: insertExecution.endTime || null,
      duration: insertExecution.duration || 0,
      output: insertExecution.output || null,
      error: insertExecution.error || null
    };
    this.pipelineExecutions.set(id, execution);
    return execution;
  };

  MemStorage.prototype.updatePipelineExecution = async function(id: number, executionUpdate: Partial<InsertPipelineExecution>): Promise<PipelineExecution | undefined> {
    const existingExecution = this.pipelineExecutions.get(id);
    if (!existingExecution) return undefined;

    const updatedExecution: PipelineExecution = {
      ...existingExecution,
      ...executionUpdate,
      id
    };
    this.pipelineExecutions.set(id, updatedExecution);
    return updatedExecution;
  };

  // AI Hub Project methods
  MemStorage.prototype.getAiHubProjects = async function(userId: number): Promise<AiHubProject[]> {
    return Array.from(this.aiHubProjects.values())
      .filter(project => project.userId === userId);
  };

  MemStorage.prototype.getAiHubProjectsByType = async function(userId: number, type: string): Promise<AiHubProject[]> {
    return Array.from(this.aiHubProjects.values())
      .filter(project => project.userId === userId && project.type === type);
  };

  MemStorage.prototype.getAiHubProject = async function(id: number): Promise<AiHubProject | undefined> {
    return this.aiHubProjects.get(id);
  };

  MemStorage.prototype.createAiHubProject = async function(insertProject: InsertAiHubProject): Promise<AiHubProject> {
    const id = this.aiHubProjectIdCounter++;
    const project: AiHubProject = {
      id,
      ...insertProject,
      createdAt: insertProject.createdAt || new Date(),
      updatedAt: insertProject.updatedAt || new Date(),
      files: insertProject.files || {},
      metadata: insertProject.metadata || {},
      template: insertProject.template || null,
      chatSourceId: insertProject.chatSourceId || null,
      dependencies: insertProject.dependencies || {},
      gitRepository: insertProject.gitRepository || null,
      lastScanResult: insertProject.lastScanResult || {}
    };
    this.aiHubProjects.set(id, project);
    return project;
  };

  MemStorage.prototype.updateAiHubProject = async function(id: number, projectUpdate: Partial<InsertAiHubProject>): Promise<AiHubProject | undefined> {
    const existingProject = this.aiHubProjects.get(id);
    if (!existingProject) return undefined;

    const updatedProject: AiHubProject = {
      ...existingProject,
      ...projectUpdate,
      updatedAt: new Date(),
      id
    };
    this.aiHubProjects.set(id, updatedProject);
    return updatedProject;
  };

  MemStorage.prototype.deleteAiHubProject = async function(id: number): Promise<boolean> {
    return this.aiHubProjects.delete(id);
  };

  MemStorage.prototype.scanAiHubProject = async function(id: number, scanResult: any): Promise<AiHubProject | undefined> {
    const existingProject = this.aiHubProjects.get(id);
    if (!existingProject) return undefined;

    const updatedProject: AiHubProject = {
      ...existingProject,
      lastScanResult: scanResult,
      updatedAt: new Date()
    };
    this.aiHubProjects.set(id, updatedProject);
    return updatedProject;
  };

  // Project Deployment methods
  MemStorage.prototype.getProjectDeployments = async function(projectId: number): Promise<ProjectDeployment[]> {
    return Array.from(this.projectDeployments.values())
      .filter(deployment => deployment.projectId === projectId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  };

  MemStorage.prototype.getProjectDeployment = async function(id: number): Promise<ProjectDeployment | undefined> {
    return this.projectDeployments.get(id);
  };

  MemStorage.prototype.createProjectDeployment = async function(insertDeployment: InsertProjectDeployment): Promise<ProjectDeployment> {
    const id = this.projectDeploymentIdCounter++;
    const deployment: ProjectDeployment = {
      id,
      ...insertDeployment,
      createdAt: insertDeployment.createdAt || new Date(),
      completedAt: insertDeployment.completedAt || null,
      logs: insertDeployment.logs || {},
      metadata: insertDeployment.metadata || {},
      configFiles: insertDeployment.configFiles || {},
      deploymentUrl: insertDeployment.deploymentUrl || null
    };
    this.projectDeployments.set(id, deployment);
    return deployment;
  };

  MemStorage.prototype.updateProjectDeployment = async function(id: number, deploymentUpdate: Partial<InsertProjectDeployment>): Promise<ProjectDeployment | undefined> {
    const existingDeployment = this.projectDeployments.get(id);
    if (!existingDeployment) return undefined;

    const updatedDeployment: ProjectDeployment = {
      ...existingDeployment,
      ...deploymentUpdate,
      id
    };
    this.projectDeployments.set(id, updatedDeployment);
    return updatedDeployment;
  };

  // Deployment History methods
  MemStorage.prototype.getDeploymentHistories = async function(projectId: number): Promise<DeploymentHistory[]> {
    return Array.from(this.deploymentHistories.values())
      .filter(history => history.projectId === projectId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  };

  MemStorage.prototype.getDeploymentHistoriesForProject = async function(projectId: number): Promise<DeploymentHistory[]> {
    return Array.from(this.deploymentHistories.values())
      .filter(history => history.projectId === projectId)
      .sort((a, b) => b.deployedAt.getTime() - a.deployedAt.getTime());
  };

  MemStorage.prototype.getDeploymentHistory = async function(id: number): Promise<DeploymentHistory | undefined> {
    return this.deploymentHistories.get(id);
  };

  MemStorage.prototype.createDeploymentHistory = async function(insertHistory: InsertDeploymentHistory): Promise<DeploymentHistory> {
    const id = this.deploymentHistoryIdCounter++;
    const history: DeploymentHistory = {
      id,
      ...insertHistory,
      createdAt: insertHistory.createdAt || new Date(),
      logs: insertHistory.logs || {},
      metadata: insertHistory.metadata || {},
      deployedAt: insertHistory.deployedAt || new Date(),
      completedAt: insertHistory.completedAt || null,
      deploymentUrl: insertHistory.deploymentUrl || null,
      version: insertHistory.version || '1.0.0'
    };
    this.deploymentHistories.set(id, history);
    return history;
  };

  MemStorage.prototype.updateDeploymentHistory = async function(id: number, historyUpdate: Partial<InsertDeploymentHistory>): Promise<DeploymentHistory | undefined> {
    const existingHistory = this.deploymentHistories.get(id);
    if (!existingHistory) return undefined;

    const updatedHistory: DeploymentHistory = {
      ...existingHistory,
      ...historyUpdate,
      id
    };
    this.deploymentHistories.set(id, updatedHistory);
    return updatedHistory;
  };

  MemStorage.prototype.deleteDeploymentHistory = async function(id: number): Promise<boolean> {
    return this.deploymentHistories.delete(id);
  };

  // File Project Relations
  MemStorage.prototype.getFilesForProject = async function(projectId: number): Promise<File[]> {
    return Array.from(this.files.values())
      .filter(file => {
        try {
          const metadata = file.metadata ? JSON.parse(file.metadata as string) : {};
          return metadata.projectId === projectId;
        } catch {
          return false;
        }
      });
  };

  // Utility methods
  MemStorage.prototype.executePipeline = async function(pipeline: Pipeline, input: any): Promise<{ output: any; executionId: number }> {
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

  MemStorage.prototype.scanFileSystem = async function(path: string, recursive: boolean = true): Promise<{ files: any[]; issues: any[] }> {
    // This would be implemented to scan a file system directory
    // For now, return a placeholder
    return { 
      files: [], 
      issues: [] 
    };
  };

  MemStorage.prototype.fixCommonErrors = async function(filePath: string, issues: any[]): Promise<{ success: boolean; fixedIssues: any[] }> {
    // This would implement error fixing logic
    // For now, return a placeholder
    return { 
      success: true, 
      fixedIssues: [] 
    };
  };

  MemStorage.prototype.convertCodeToProject = async function(code: string, projectName: string, type: string): Promise<AiHubProject | undefined> {
    // This would implement code to project conversion
    // For now, return a placeholder
    const project = await this.createAiHubProject({
      name: projectName,
      type: type,
      userId: 1,
      path: '/temp/' + projectName,
      description: 'Generated from code snippet',
      status: 'created'
    });
    
    return project;
  };

  // Project deployment utility methods
  MemStorage.prototype.deployProject = async function(projectId: number, userId: number, environment: string, metadata?: any): Promise<DeploymentHistory> {
    // Create a deployment history entry
    const deploymentHistory = await this.createDeploymentHistory({
      projectId,
      environment,
      userId,
      status: 'starting',
      deployedAt: new Date()
    });
    
    return deploymentHistory;
  };

  MemStorage.prototype.updateDeploymentStatus = async function(deploymentId: number, status: string, logs?: any, visualFeedback?: any): Promise<DeploymentHistory | undefined> {
    const updates: any = { status };
    
    if (logs) {
      updates.logs = logs;
    }
    
    if (status === 'completed' || status === 'failed') {
      updates.completedAt = new Date();
    }
    
    return this.updateDeploymentHistory(deploymentId, updates);
  };
}