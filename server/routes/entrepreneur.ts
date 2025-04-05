import { Router, Request, Response } from "express";
import { isAuthenticated } from "../replitAuth";
import { insertEntrepreneurIdeaSchema, insertIdeaVersionSchema, insertProjectPlanSchema, insertProjectMilestoneSchema, insertCodeSourceSchema } from "@shared/schema";
import type { IStorage } from "../storage";
import { storage } from "../storage";

// Use storage from main module, which is the PostgreSQL database implementation
let activeStorage: IStorage = storage;

// Initialize router
const router = Router();

// ==================== IDEAS ROUTES ====================

// Get all ideas
router.get("/ideas", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const userId = user?.id || 1; // Default to user 1 if not authenticated
    
    // Filter by status if provided
    const status = req.query.status as string;
    let ideas;
    
    if (status) {
      ideas = await activeStorage.getIdeasByStatus(userId, status);
    } else {
      ideas = await activeStorage.getIdeas(userId);
    }
    
    res.json(ideas);
  } catch (error) {
    console.error("Error fetching ideas:", error);
    res.status(500).json({ error: "Failed to retrieve ideas" });
  }
});

// Create new idea
router.post("/ideas", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const userId = user?.id || 1;
    
    // Validate input
    const ideaData = insertEntrepreneurIdeaSchema.parse({
      ...req.body,
      userId,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // Create idea
    const idea = await activeStorage.createIdea(ideaData);
    
    // Create initial version for version history
    if (idea) {
      await activeStorage.createIdeaVersion({
        ideaId: idea.id,
        versionNumber: 1,
        title: idea.title,
        description: idea.description,
        changedBy: userId,
        createdAt: new Date(),
        changeLog: "Initial version"
      });
    }
    
    res.status(201).json(idea);
  } catch (error) {
    console.error("Error creating idea:", error);
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Failed to create idea" });
    }
  }
});

// Get idea by ID
router.get("/ideas/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const ideaId = parseInt(req.params.id);
    const idea = await activeStorage.getIdea(ideaId);
    
    if (!idea) {
      return res.status(404).json({ error: "Idea not found" });
    }
    
    // Check if this user owns this idea
    const user = req.user as any;
    if (idea.userId !== user?.id && user?.id !== 1) {
      return res.status(403).json({ error: "You don't have permission to access this idea" });
    }
    
    // Get version history
    const versions = await activeStorage.getIdeaVersions(ideaId);
    
    res.json({
      ...idea,
      versions
    });
  } catch (error) {
    console.error("Error fetching idea:", error);
    res.status(500).json({ error: "Failed to retrieve idea" });
  }
});

// Update idea
router.patch("/ideas/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const ideaId = parseInt(req.params.id);
    const idea = await activeStorage.getIdea(ideaId);
    
    if (!idea) {
      return res.status(404).json({ error: "Idea not found" });
    }
    
    // Check if this user owns this idea
    const user = req.user as any;
    const userId = user?.id || 1;
    if (idea.userId !== userId && userId !== 1) {
      return res.status(403).json({ error: "You don't have permission to update this idea" });
    }
    
    // Update idea
    const updatedIdea = await activeStorage.updateIdea(ideaId, {
      ...req.body,
      updatedAt: new Date()
    });
    
    // Create new version if title or description changed
    if (updatedIdea && (req.body.title || req.body.description)) {
      // Get current version count
      const versions = await activeStorage.getIdeaVersions(ideaId);
      const versionNumber = versions.length + 1;
      
      await activeStorage.createIdeaVersion({
        ideaId,
        versionNumber,
        title: updatedIdea.title,
        description: updatedIdea.description,
        changedBy: userId,
        createdAt: new Date(),
        changeLog: req.body.changeLog || `Version ${versionNumber}`
      });
    }
    
    res.json(updatedIdea);
  } catch (error) {
    console.error("Error updating idea:", error);
    res.status(500).json({ error: "Failed to update idea" });
  }
});

// Delete idea
router.delete("/ideas/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const ideaId = parseInt(req.params.id);
    const idea = await activeStorage.getIdea(ideaId);
    
    if (!idea) {
      return res.status(404).json({ error: "Idea not found" });
    }
    
    // Check if this user owns this idea
    const user = req.user as any;
    if (idea.userId !== user?.id && user?.id !== 1) {
      return res.status(403).json({ error: "You don't have permission to delete this idea" });
    }
    
    // Delete the idea
    const result = await activeStorage.deleteIdea(ideaId);
    
    res.json({ success: result });
  } catch (error) {
    console.error("Error deleting idea:", error);
    res.status(500).json({ error: "Failed to delete idea" });
  }
});

// Search ideas
router.get("/ideas/search/:query", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const userId = user?.id || 1;
    const query = req.params.query;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    
    const results = await activeStorage.searchIdeas(userId, query, limit);
    
    res.json(results);
  } catch (error) {
    console.error("Error searching ideas:", error);
    res.status(500).json({ error: "Failed to search ideas" });
  }
});

// ==================== PROJECTS ROUTES ====================

// Get all projects
router.get("/projects", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const userId = user?.id || 1;
    
    // Filter by status if provided
    const status = req.query.status as string;
    let projects;
    
    if (status) {
      projects = await activeStorage.getProjectsByStatus(userId, status);
    } else {
      projects = await activeStorage.getProjects(userId);
    }
    
    res.json(projects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    res.status(500).json({ error: "Failed to retrieve projects" });
  }
});

// Create new project
router.post("/projects", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const userId = user?.id || 1;
    
    // Validate input
    const projectData = insertProjectPlanSchema.parse({
      ...req.body,
      userId,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // Create project
    const project = await activeStorage.createProject(projectData);
    
    res.status(201).json(project);
  } catch (error) {
    console.error("Error creating project:", error);
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Failed to create project" });
    }
  }
});

// Get project by ID
router.get("/projects/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.id);
    const project = await activeStorage.getProject(projectId);
    
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    
    // Check if this user owns this project
    const user = req.user as any;
    if (project.userId !== user?.id && user?.id !== 1) {
      return res.status(403).json({ error: "You don't have permission to access this project" });
    }
    
    // Get milestones
    const milestones = await activeStorage.getProjectMilestones(projectId);
    
    res.json({
      ...project,
      milestones
    });
  } catch (error) {
    console.error("Error fetching project:", error);
    res.status(500).json({ error: "Failed to retrieve project" });
  }
});

// Update project
router.patch("/projects/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.id);
    const project = await activeStorage.getProject(projectId);
    
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    
    // Check if this user owns this project
    const user = req.user as any;
    if (project.userId !== user?.id && user?.id !== 1) {
      return res.status(403).json({ error: "You don't have permission to update this project" });
    }
    
    // Update project
    const updatedProject = await activeStorage.updateProject(projectId, {
      ...req.body,
      updatedAt: new Date()
    });
    
    res.json(updatedProject);
  } catch (error) {
    console.error("Error updating project:", error);
    res.status(500).json({ error: "Failed to update project" });
  }
});

// Delete project
router.delete("/projects/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.id);
    const project = await activeStorage.getProject(projectId);
    
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    
    // Check if this user owns this project
    const user = req.user as any;
    if (project.userId !== user?.id && user?.id !== 1) {
      return res.status(403).json({ error: "You don't have permission to delete this project" });
    }
    
    // Delete the project
    const result = await activeStorage.deleteProject(projectId);
    
    res.json({ success: result });
  } catch (error) {
    console.error("Error deleting project:", error);
    res.status(500).json({ error: "Failed to delete project" });
  }
});

// ==================== PROJECT MILESTONES ROUTES ====================

// Create milestone
router.post("/milestones", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    
    // Verify project ownership
    const projectId = req.body.projectId;
    const project = await activeStorage.getProject(projectId);
    
    if (!project || (project.userId !== user?.id && user?.id !== 1)) {
      return res.status(403).json({ error: "You don't have permission to add milestones to this project" });
    }
    
    // Get existing milestones to determine order
    const milestones = await activeStorage.getProjectMilestones(projectId);
    const orderIndex = milestones.length;
    
    // Validate and create
    const milestoneData = insertProjectMilestoneSchema.parse({
      ...req.body,
      orderIndex
    });
    
    const milestone = await activeStorage.createProjectMilestone(milestoneData);
    
    res.status(201).json(milestone);
  } catch (error) {
    console.error("Error creating milestone:", error);
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Failed to create milestone" });
    }
  }
});

// Update milestone
router.patch("/milestones/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const milestoneId = parseInt(req.params.id);
    const milestone = await activeStorage.getProjectMilestone(milestoneId);
    
    if (!milestone) {
      return res.status(404).json({ error: "Milestone not found" });
    }
    
    // Verify project ownership
    const project = await activeStorage.getProject(milestone.projectId);
    const user = req.user as any;
    
    if (!project || (project.userId !== user?.id && user?.id !== 1)) {
      return res.status(403).json({ error: "You don't have permission to update this milestone" });
    }
    
    // Update milestone
    const updatedMilestone = await activeStorage.updateProjectMilestone(milestoneId, req.body);
    
    // If status changed to completed, update completedDate
    if (req.body.status === 'completed' && milestone.status !== 'completed') {
      await activeStorage.updateProjectMilestone(milestoneId, {
        completedDate: new Date()
      });
    }
    
    res.json(updatedMilestone);
  } catch (error) {
    console.error("Error updating milestone:", error);
    res.status(500).json({ error: "Failed to update milestone" });
  }
});

// Delete milestone
router.delete("/milestones/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const milestoneId = parseInt(req.params.id);
    const milestone = await activeStorage.getProjectMilestone(milestoneId);
    
    if (!milestone) {
      return res.status(404).json({ error: "Milestone not found" });
    }
    
    // Verify project ownership
    const project = await activeStorage.getProject(milestone.projectId);
    const user = req.user as any;
    
    if (!project || (project.userId !== user?.id && user?.id !== 1)) {
      return res.status(403).json({ error: "You don't have permission to delete this milestone" });
    }
    
    // Delete the milestone
    const result = await activeStorage.deleteProjectMilestone(milestoneId);
    
    // Reorder the remaining milestones
    if (result) {
      const milestones = await activeStorage.getProjectMilestones(milestone.projectId);
      for (let i = 0; i < milestones.length; i++) {
        if (milestones[i].orderIndex !== i) {
          await activeStorage.updateProjectMilestone(milestones[i].id, { orderIndex: i });
        }
      }
    }
    
    res.json({ success: result });
  } catch (error) {
    console.error("Error deleting milestone:", error);
    res.status(500).json({ error: "Failed to delete milestone" });
  }
});

// ==================== CODE SOURCES ROUTES ====================

// Get all code sources
router.get("/code", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const userId = user?.id || 1;
    
    // Filter by language if provided
    const language = req.query.language as string;
    let codeSources;
    
    if (language) {
      codeSources = await activeStorage.getCodeSourcesByLanguage(userId, language);
    } else {
      codeSources = await activeStorage.getCodeSources(userId);
    }
    
    res.json(codeSources);
  } catch (error) {
    console.error("Error fetching code sources:", error);
    res.status(500).json({ error: "Failed to retrieve code sources" });
  }
});

// Create new code source
router.post("/code", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const userId = user?.id || 1;
    
    // Validate input
    const codeData = insertCodeSourceSchema.parse({
      ...req.body,
      userId,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // Create code source
    const codeSource = await activeStorage.createCodeSource(codeData);
    
    res.status(201).json(codeSource);
  } catch (error) {
    console.error("Error creating code source:", error);
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Failed to create code source" });
    }
  }
});

// Get code source by ID
router.get("/code/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const codeId = parseInt(req.params.id);
    const codeSource = await activeStorage.getCodeSource(codeId);
    
    if (!codeSource) {
      return res.status(404).json({ error: "Code source not found" });
    }
    
    // Check if this user owns this code source
    const user = req.user as any;
    if (codeSource.userId !== user?.id && user?.id !== 1) {
      return res.status(403).json({ error: "You don't have permission to access this code source" });
    }
    
    res.json(codeSource);
  } catch (error) {
    console.error("Error fetching code source:", error);
    res.status(500).json({ error: "Failed to retrieve code source" });
  }
});

// Update code source
router.patch("/code/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const codeId = parseInt(req.params.id);
    const codeSource = await activeStorage.getCodeSource(codeId);
    
    if (!codeSource) {
      return res.status(404).json({ error: "Code source not found" });
    }
    
    // Check if this user owns this code source
    const user = req.user as any;
    if (codeSource.userId !== user?.id && user?.id !== 1) {
      return res.status(403).json({ error: "You don't have permission to update this code source" });
    }
    
    // Update code source
    const updatedCodeSource = await activeStorage.updateCodeSource(codeId, {
      ...req.body,
      updatedAt: new Date()
    });
    
    res.json(updatedCodeSource);
  } catch (error) {
    console.error("Error updating code source:", error);
    res.status(500).json({ error: "Failed to update code source" });
  }
});

// Delete code source
router.delete("/code/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const codeId = parseInt(req.params.id);
    const codeSource = await activeStorage.getCodeSource(codeId);
    
    if (!codeSource) {
      return res.status(404).json({ error: "Code source not found" });
    }
    
    // Check if this user owns this code source
    const user = req.user as any;
    if (codeSource.userId !== user?.id && user?.id !== 1) {
      return res.status(403).json({ error: "You don't have permission to delete this code source" });
    }
    
    // Delete the code source
    const result = await activeStorage.deleteCodeSource(codeId);
    
    res.json({ success: result });
  } catch (error) {
    console.error("Error deleting code source:", error);
    res.status(500).json({ error: "Failed to delete code source" });
  }
});

// Track code source usage
router.post("/code/:id/use", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const codeId = parseInt(req.params.id);
    const codeSource = await activeStorage.getCodeSource(codeId);
    
    if (!codeSource) {
      return res.status(404).json({ error: "Code source not found" });
    }
    
    // Increment use count
    const updatedSource = await activeStorage.incrementCodeSourceUseCount(codeId);
    
    res.json(updatedSource);
  } catch (error) {
    console.error("Error updating code source use count:", error);
    res.status(500).json({ error: "Failed to update code source use count" });
  }
});

// Search code sources
router.get("/code/search/:query", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const userId = user?.id || 1;
    const query = req.params.query;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    
    const results = await activeStorage.searchCodeSources(userId, query, limit);
    
    res.json(results);
  } catch (error) {
    console.error("Error searching code sources:", error);
    res.status(500).json({ error: "Failed to search code sources" });
  }
});

export default router;