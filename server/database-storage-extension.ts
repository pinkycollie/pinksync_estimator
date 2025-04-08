// Import necessary modules
import { eq, and, desc, sql } from 'drizzle-orm';
import { db, pool } from './db';
import { 
  pipelines, type Pipeline, type InsertPipeline,
  pipelineExecutions, type PipelineExecution, type InsertPipelineExecution,
  aiHubProjects, type AiHubProject, type InsertAiHubProject,
  projectDeployments, type ProjectDeployment, type InsertProjectDeployment,
  deploymentHistories, type DeploymentHistory, type InsertDeploymentHistory,
  files, type File
} from '@shared/schema';
import { DatabaseStorage } from './database-storage';

// Extension methods for AI Hub pipelines
export function extendDatabaseStorageWithAiHub(DatabaseStorage: any) {
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

  // Deployment History methods
  DatabaseStorage.prototype.getDeploymentHistories = async function(projectId: number): Promise<DeploymentHistory[]> {
    return db.select().from(deploymentHistories)
      .where(eq(deploymentHistories.projectId, projectId))
      .orderBy(desc(deploymentHistories.createdAt));
  };

  DatabaseStorage.prototype.getDeploymentHistoriesForProject = async function(projectId: number): Promise<DeploymentHistory[]> {
    return db.select().from(deploymentHistories)
      .where(eq(deploymentHistories.projectId, projectId))
      .orderBy(desc(deploymentHistories.deployedAt));
  };

  DatabaseStorage.prototype.getDeploymentHistory = async function(id: number): Promise<DeploymentHistory | undefined> {
    const [history] = await db.select().from(deploymentHistories).where(eq(deploymentHistories.id, id));
    return history;
  };

  DatabaseStorage.prototype.createDeploymentHistory = async function(insertHistory: InsertDeploymentHistory): Promise<DeploymentHistory> {
    const [history] = await db.insert(deploymentHistories).values(insertHistory).returning();
    return history;
  };

  DatabaseStorage.prototype.updateDeploymentHistory = async function(id: number, historyUpdate: Partial<InsertDeploymentHistory>): Promise<DeploymentHistory | undefined> {
    const [updatedHistory] = await db.update(deploymentHistories)
      .set(historyUpdate)
      .where(eq(deploymentHistories.id, id))
      .returning();
    return updatedHistory;
  };

  DatabaseStorage.prototype.deleteDeploymentHistory = async function(id: number): Promise<boolean> {
    const result = await db.delete(deploymentHistories).where(eq(deploymentHistories.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  };

  // File Project Relations
  DatabaseStorage.prototype.getFilesForProject = async function(projectId: number): Promise<File[]> {
    // This would typically join the files table with a project_files junction table
    // Since we don't have that in our schema, we'll use the metadata to find files associated with the project
    return db.select().from(files)
      .where(sql`${files.metadata}->>'projectId' = ${projectId.toString()}`);
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

  DatabaseStorage.prototype.scanFileSystem = async function(path: string, recursive: boolean = true): Promise<{ files: any[]; issues: any[] }> {
    // This would be implemented to scan a file system directory
    // For now, return a placeholder
    return { 
      files: [], 
      issues: [] 
    };
  };

  DatabaseStorage.prototype.fixCommonErrors = async function(filePath: string, issues: any[]): Promise<{ success: boolean; fixedIssues: any[] }> {
    // This would implement error fixing logic
    // For now, return a placeholder
    return { 
      success: true, 
      fixedIssues: [] 
    };
  };

  DatabaseStorage.prototype.convertCodeToProject = async function(code: string, projectName: string, type: string): Promise<AiHubProject | undefined> {
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
  DatabaseStorage.prototype.deployProject = async function(projectId: number, userId: number, environment: string, metadata?: any): Promise<DeploymentHistory> {
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

  DatabaseStorage.prototype.updateDeploymentStatus = async function(deploymentId: number, status: string, logs?: any, visualFeedback?: any): Promise<DeploymentHistory | undefined> {
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