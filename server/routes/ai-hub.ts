import { Router } from 'express';
import { storage } from '../storage';
import { z } from 'zod';
import { 
  PipelineCategory, 
  insertPipelineSchema, 
  insertAiHubProjectSchema, 
  insertProjectDeploymentSchema,
  ProjectType,
  ProjectTemplate
} from '@shared/schema';

const router = Router();

// Pipeline routes
router.get('/pipelines', async (req, res) => {
  try {
    const userId = 1; // In a real app, this would come from auth
    const pipelines = await storage.getPipelines(userId);
    res.json(pipelines);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/pipelines/category/:category', async (req, res) => {
  try {
    const category = req.params.category;
    
    // Validate that the category is valid
    if (!Object.values(PipelineCategory).includes(category as PipelineCategory)) {
      return res.status(400).json({ error: 'Invalid pipeline category' });
    }
    
    const pipelines = await storage.getPipelinesByCategory(category);
    res.json(pipelines);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/pipelines/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid pipeline ID' });
    }
    
    const pipeline = await storage.getPipeline(id);
    if (!pipeline) {
      return res.status(404).json({ error: 'Pipeline not found' });
    }
    
    res.json(pipeline);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/pipelines', async (req, res) => {
  try {
    const userId = 1; // In a real app, this would come from auth
    
    const validatedData = insertPipelineSchema.safeParse({
      ...req.body,
      userId
    });
    
    if (!validatedData.success) {
      return res.status(400).json({ error: validatedData.error });
    }
    
    const pipeline = await storage.createPipeline(validatedData.data);
    res.status(201).json(pipeline);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/pipelines/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid pipeline ID' });
    }
    
    const pipeline = await storage.getPipeline(id);
    if (!pipeline) {
      return res.status(404).json({ error: 'Pipeline not found' });
    }
    
    const updateSchema = insertPipelineSchema.partial();
    const validatedData = updateSchema.safeParse(req.body);
    
    if (!validatedData.success) {
      return res.status(400).json({ error: validatedData.error });
    }
    
    const updatedPipeline = await storage.updatePipeline(id, validatedData.data);
    res.json(updatedPipeline);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/pipelines/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid pipeline ID' });
    }
    
    const pipeline = await storage.getPipeline(id);
    if (!pipeline) {
      return res.status(404).json({ error: 'Pipeline not found' });
    }
    
    const success = await storage.deletePipeline(id);
    if (!success) {
      return res.status(500).json({ error: 'Failed to delete pipeline' });
    }
    
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/pipelines/:id/execute', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid pipeline ID' });
    }
    
    const pipeline = await storage.getPipeline(id);
    if (!pipeline) {
      return res.status(404).json({ error: 'Pipeline not found' });
    }
    
    const userId = 1; // In a real app, this would come from auth
    const input = req.body;
    
    // In a real app, you would validate that the input matches the pipeline's input schema
    
    const execution = await storage.executePipeline(id, input, userId);
    res.status(202).json(execution);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/pipelines/:id/executions', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid pipeline ID' });
    }
    
    const pipeline = await storage.getPipeline(id);
    if (!pipeline) {
      return res.status(404).json({ error: 'Pipeline not found' });
    }
    
    const executions = await storage.getPipelineExecutions(id);
    res.json(executions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/pipeline-executions/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid execution ID' });
    }
    
    const execution = await storage.getPipelineExecution(id);
    if (!execution) {
      return res.status(404).json({ error: 'Execution not found' });
    }
    
    res.json(execution);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// AI Hub Project routes
router.get('/projects', async (req, res) => {
  try {
    const userId = 1; // In a real app, this would come from auth
    const projects = await storage.getAiHubProjects(userId);
    res.json(projects);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/projects/type/:type', async (req, res) => {
  try {
    const type = req.params.type;
    const userId = 1; // In a real app, this would come from auth
    
    // Validate that the type is valid
    if (!Object.values(ProjectType).includes(type as ProjectType)) {
      return res.status(400).json({ error: 'Invalid project type' });
    }
    
    const projects = await storage.getAiHubProjectsByType(userId, type);
    res.json(projects);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/projects/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }
    
    const project = await storage.getAiHubProject(id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    res.json(project);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/projects', async (req, res) => {
  try {
    const userId = 1; // In a real app, this would come from auth
    
    const validatedData = insertAiHubProjectSchema.safeParse({
      ...req.body,
      userId
    });
    
    if (!validatedData.success) {
      return res.status(400).json({ error: validatedData.error });
    }
    
    const project = await storage.createAiHubProject(validatedData.data);
    res.status(201).json(project);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/projects/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }
    
    const project = await storage.getAiHubProject(id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const updateSchema = insertAiHubProjectSchema.partial();
    const validatedData = updateSchema.safeParse(req.body);
    
    if (!validatedData.success) {
      return res.status(400).json({ error: validatedData.error });
    }
    
    const updatedProject = await storage.updateAiHubProject(id, validatedData.data);
    res.json(updatedProject);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/projects/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }
    
    const project = await storage.getAiHubProject(id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const success = await storage.deleteAiHubProject(id);
    if (!success) {
      return res.status(500).json({ error: 'Failed to delete project' });
    }
    
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/projects/:id/scan', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }
    
    const project = await storage.getAiHubProject(id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const scanResult = await storage.scanAiHubProject(id);
    res.json(scanResult);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/projects/:id/deployments', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }
    
    const project = await storage.getAiHubProject(id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const deployments = await storage.getProjectDeployments(id);
    res.json(deployments);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/projects/:id/deployments', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }
    
    const project = await storage.getAiHubProject(id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const validatedData = insertProjectDeploymentSchema.safeParse({
      ...req.body,
      projectId: id,
      deployedBy: 1 // In a real app, this would come from auth
    });
    
    if (!validatedData.success) {
      return res.status(400).json({ error: validatedData.error });
    }
    
    const deployment = await storage.createProjectDeployment(validatedData.data);
    res.status(201).json(deployment);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Filesystem operations
router.post('/filesystem/scan', async (req, res) => {
  try {
    const { path, recursive } = req.body;
    
    if (!path || typeof path !== 'string') {
      return res.status(400).json({ error: 'Path is required' });
    }
    
    const scanResult = await storage.scanFileSystem(path, recursive);
    res.json(scanResult);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/filesystem/fix-errors', async (req, res) => {
  try {
    const { filePath, issues } = req.body;
    
    if (!filePath || typeof filePath !== 'string') {
      return res.status(400).json({ error: 'File path is required' });
    }
    
    if (!issues || !Array.isArray(issues)) {
      return res.status(400).json({ error: 'Issues array is required' });
    }
    
    const fixResult = await storage.fixCommonErrors(filePath, issues);
    res.json(fixResult);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/code-to-project', async (req, res) => {
  try {
    const { code, projectName, type } = req.body;
    
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Code is required' });
    }
    
    if (!projectName || typeof projectName !== 'string') {
      return res.status(400).json({ error: 'Project name is required' });
    }
    
    if (!type || typeof type !== 'string' || !Object.values(ProjectType).includes(type as ProjectType)) {
      return res.status(400).json({ error: 'Valid project type is required' });
    }
    
    const project = await storage.convertCodeToProject(code, projectName, type);
    if (!project) {
      return res.status(500).json({ error: 'Failed to convert code to project' });
    }
    
    res.status(201).json(project);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;