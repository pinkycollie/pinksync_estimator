import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { storage } from '../storage';
import { CodeEnhancement } from '../utils/codeEnhancement';
import { IdeaToProduction } from '../utils/ideaToProduction';
import { DeploymentStatus, ProjectType } from '@shared/schema';

const router = Router();

// Initialize a new project based on an idea
router.post('/projects/initialize', async (req, res) => {
  try {
    const { userId, ideaText, accessibilityOptions } = req.body;
    
    if (!userId || !ideaText) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const project = await IdeaToProduction.initializeFromIdea(
      userId, 
      ideaText, 
      accessibilityOptions
    );
    
    res.json({ success: true, project });
  } catch (error) {
    console.error('Error initializing project:', error);
    res.status(500).json({ error: error.message || 'Failed to initialize project' });
  }
});

// Create a Git repository for a project
router.post('/projects/:projectId/repository', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { repoName, platform } = req.body;
    
    if (!repoName) {
      return res.status(400).json({ error: 'Repository name is required' });
    }
    
    const result = await IdeaToProduction.createRepository(
      parseInt(projectId), 
      repoName, 
      platform || 'github'
    );
    
    res.json(result);
  } catch (error) {
    console.error('Error creating repository:', error);
    res.status(500).json({ error: error.message || 'Failed to create repository' });
  }
});

// Setup Replit integration
router.post('/projects/:projectId/replit-setup', async (req, res) => {
  try {
    const { projectId } = req.params;
    
    const result = await IdeaToProduction.setupReplitProject(
      parseInt(projectId)
    );
    
    res.json(result);
  } catch (error) {
    console.error('Error setting up Replit project:', error);
    res.status(500).json({ error: error.message || 'Failed to set up Replit project' });
  }
});

// Setup Cursor AI integration
router.post('/projects/:projectId/cursor-ai-setup', async (req, res) => {
  try {
    const { projectId } = req.params;
    
    const result = await IdeaToProduction.setupCursorAI(
      parseInt(projectId)
    );
    
    res.json(result);
  } catch (error) {
    console.error('Error setting up Cursor AI:', error);
    res.status(500).json({ error: error.message || 'Failed to set up Cursor AI' });
  }
});

// Configure Netlify deployment
router.post('/projects/:projectId/netlify-setup', async (req, res) => {
  try {
    const { projectId } = req.params;
    
    const result = await IdeaToProduction.configureNetlifyDeployment(
      parseInt(projectId)
    );
    
    res.json(result);
  } catch (error) {
    console.error('Error configuring Netlify deployment:', error);
    res.status(500).json({ error: error.message || 'Failed to configure Netlify deployment' });
  }
});

// Create CI/CD pipeline
router.post('/projects/:projectId/cicd-pipeline', async (req, res) => {
  try {
    const { projectId } = req.params;
    
    const result = await IdeaToProduction.createCICDPipeline(
      parseInt(projectId)
    );
    
    res.json(result);
  } catch (error) {
    console.error('Error creating CI/CD pipeline:', error);
    res.status(500).json({ error: error.message || 'Failed to create CI/CD pipeline' });
  }
});

// Track deployment
router.post('/projects/:projectId/track-deployment', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { environment, status } = req.body;
    
    if (!environment || !status) {
      return res.status(400).json({ error: 'Environment and status are required' });
    }
    
    const deployment = await IdeaToProduction.trackDeployment(
      parseInt(projectId), 
      environment, 
      status
    );
    
    res.json({ success: true, deployment });
  } catch (error) {
    console.error('Error tracking deployment:', error);
    res.status(500).json({ error: error.message || 'Failed to track deployment' });
  }
});

// Generate accessible project report
router.get('/projects/:projectId/accessible-report', async (req, res) => {
  try {
    const { projectId } = req.params;
    
    const report = await IdeaToProduction.createAccessibleReport(
      parseInt(projectId)
    );
    
    res.json(report);
  } catch (error) {
    console.error('Error creating accessible report:', error);
    res.status(500).json({ error: error.message || 'Failed to create accessible report' });
  }
});

// Analyze code files
router.post('/files/:fileId/analyze-code', async (req, res) => {
  try {
    const { fileId } = req.params;
    
    const analysis = await CodeEnhancement.analyzeCode(
      parseInt(fileId)
    );
    
    res.json(analysis);
  } catch (error) {
    console.error('Error analyzing code:', error);
    res.status(500).json({ error: error.message || 'Failed to analyze code' });
  }
});

// Generate code documentation
router.post('/files/:fileId/generate-documentation', async (req, res) => {
  try {
    const { fileId } = req.params;
    
    const documentation = await CodeEnhancement.generateDocumentation(
      parseInt(fileId)
    );
    
    res.json(documentation);
  } catch (error) {
    console.error('Error generating documentation:', error);
    res.status(500).json({ error: error.message || 'Failed to generate documentation' });
  }
});

// Check deployment readiness for a specific platform
router.post('/files/:fileId/deployment-readiness', async (req, res) => {
  try {
    const { fileId } = req.params;
    const { platform } = req.body;
    
    if (!platform) {
      return res.status(400).json({ error: 'Platform is required' });
    }
    
    const readiness = await CodeEnhancement.checkDeploymentReadiness(
      parseInt(fileId), 
      platform
    );
    
    res.json(readiness);
  } catch (error) {
    console.error('Error checking deployment readiness:', error);
    res.status(500).json({ error: error.message || 'Failed to check deployment readiness' });
  }
});

// Prepare Netlify deployment
router.post('/files/:fileId/prepare-netlify-deployment', async (req, res) => {
  try {
    const { fileId } = req.params;
    
    const deployment = await CodeEnhancement.prepareNetlifyDeployment(
      parseInt(fileId)
    );
    
    res.json(deployment);
  } catch (error) {
    console.error('Error preparing Netlify deployment:', error);
    res.status(500).json({ error: error.message || 'Failed to prepare Netlify deployment' });
  }
});

// Prepare Replit deployment
router.post('/files/:fileId/prepare-replit-deployment', async (req, res) => {
  try {
    const { fileId } = req.params;
    
    const deployment = await CodeEnhancement.prepareReplitDeployment(
      parseInt(fileId)
    );
    
    res.json(deployment);
  } catch (error) {
    console.error('Error preparing Replit deployment:', error);
    res.status(500).json({ error: error.message || 'Failed to prepare Replit deployment' });
  }
});

// Get all projects
router.get('/projects', async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const projects = await storage.getProjects(parseInt(userId.toString()));
    
    res.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch projects' });
  }
});

// Get a specific project
router.get('/projects/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    
    const project = await storage.getProject(parseInt(projectId));
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    res.json(project);
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch project' });
  }
});

// Update a project
router.patch('/projects/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const updates = req.body;
    
    const project = await storage.updateProject(parseInt(projectId), updates);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    res.json(project);
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: error.message || 'Failed to update project' });
  }
});

// Get project deployment history
router.get('/projects/:projectId/deployments', async (req, res) => {
  try {
    const { projectId } = req.params;
    
    const deployments = await storage.getProjectDeployments(parseInt(projectId));
    
    res.json(deployments);
  } catch (error) {
    console.error('Error fetching deployments:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch deployments' });
  }
});

// Debug route to show project structure (for development only)
router.get('/projects/:projectId/structure', async (req, res) => {
  try {
    const { projectId } = req.params;
    
    const project = await storage.getProject(parseInt(projectId));
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Get project's files
    const files = await storage.getProjectFiles(parseInt(projectId));
    
    // Get project's deployment history
    const deployments = await storage.getProjectDeployments(parseInt(projectId));
    
    res.json({
      project,
      files,
      deployments,
      visualizedStructure: `
        Project: ${project.title}
        Status: ${project.status}
        Files: ${files.length}
        Deployments: ${deployments.length}
        
        Git Repository: ${project.gitRepository || 'Not configured'}
        Replit Integration: ${project.metadata?.replit ? 'Configured' : 'Not configured'}
        Cursor AI Integration: ${project.metadata?.cursorAI ? 'Configured' : 'Not configured'}
        Netlify Integration: ${project.metadata?.netlify ? 'Configured' : 'Not configured'}
        CI/CD Pipeline: ${project.metadata?.cicd ? 'Configured' : 'Not configured'}
      `
    });
  } catch (error) {
    console.error('Error fetching project structure:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch project structure' });
  }
});

export default router;