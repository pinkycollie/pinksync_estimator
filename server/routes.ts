import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertFileSchema, insertIntegrationSchema, insertRecommendationSchema } from "@shared/schema";
import { analyzeAndCategorizeFile } from "./utils/aiUtils";
import { scanLocalFiles, scanGoogleDriveFiles } from "./utils/fileUtils";
import { zodResolver } from "@hookform/resolvers/zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes, all prefixed with /api
  
  // Current user endpoint - using demo user for now
  app.get("/api/user", async (req: Request, res: Response) => {
    const user = await storage.getUserByUsername("pinky");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Don't return password in response
    const { password, ...safeUser } = user;
    res.json(safeUser);
  });
  
  // File endpoints
  app.get("/api/files", async (req: Request, res: Response) => {
    const user = await storage.getUserByUsername("pinky");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    const files = await storage.getFiles(user.id);
    res.json(files);
  });
  
  app.get("/api/files/recent", async (req: Request, res: Response) => {
    const user = await storage.getUserByUsername("pinky");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const recentFiles = await storage.getRecentFiles(user.id, limit);
    res.json(recentFiles);
  });
  
  app.get("/api/files/category/:category", async (req: Request, res: Response) => {
    const user = await storage.getUserByUsername("pinky");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    const { category } = req.params;
    const files = await storage.getFilesByCategory(user.id, category);
    res.json(files);
  });
  
  app.get("/api/files/source/:source", async (req: Request, res: Response) => {
    const user = await storage.getUserByUsername("pinky");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    const { source } = req.params;
    const files = await storage.getFilesBySource(user.id, source);
    res.json(files);
  });
  
  app.post("/api/files", async (req: Request, res: Response) => {
    const user = await storage.getUserByUsername("pinky");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    try {
      const fileData = insertFileSchema.parse(req.body);
      const file = await storage.createFile({
        ...fileData,
        userId: user.id
      });
      
      // Process the file with AI categorization
      const categorizedFile = await analyzeAndCategorizeFile(file);
      if (categorizedFile) {
        await storage.updateFile(file.id, {
          fileCategory: categorizedFile.fileCategory,
          isProcessed: true
        });
      }
      
      res.status(201).json(file);
    } catch (error) {
      res.status(400).json({ message: "Invalid file data", error });
    }
  });
  
  app.get("/api/files/stats", async (req: Request, res: Response) => {
    const user = await storage.getUserByUsername("pinky");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    const stats = await storage.getFileStats(user.id);
    res.json(stats);
  });
  
  // Integration endpoints
  app.get("/api/integrations", async (req: Request, res: Response) => {
    const user = await storage.getUserByUsername("pinky");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    const integrations = await storage.getIntegrations(user.id);
    res.json(integrations);
  });
  
  app.post("/api/integrations", async (req: Request, res: Response) => {
    const user = await storage.getUserByUsername("pinky");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    try {
      const integrationData = insertIntegrationSchema.parse(req.body);
      const integration = await storage.createIntegration({
        ...integrationData,
        userId: user.id
      });
      res.status(201).json(integration);
    } catch (error) {
      res.status(400).json({ message: "Invalid integration data", error });
    }
  });
  
  app.patch("/api/integrations/:id", async (req: Request, res: Response) => {
    const { id } = req.params;
    const integrationId = parseInt(id);
    
    try {
      const updates = req.body;
      const updatedIntegration = await storage.updateIntegration(integrationId, updates);
      
      if (!updatedIntegration) {
        return res.status(404).json({ message: "Integration not found" });
      }
      
      res.json(updatedIntegration);
    } catch (error) {
      res.status(400).json({ message: "Invalid integration data", error });
    }
  });
  
  // Recommendation endpoints
  app.get("/api/recommendations", async (req: Request, res: Response) => {
    const user = await storage.getUserByUsername("pinky");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    const active = req.query.active === 'true';
    let recommendations;
    
    if (active) {
      recommendations = await storage.getActiveRecommendations(user.id);
    } else {
      recommendations = await storage.getRecommendations(user.id);
    }
    
    res.json(recommendations);
  });
  
  app.post("/api/recommendations", async (req: Request, res: Response) => {
    const user = await storage.getUserByUsername("pinky");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    try {
      const recommendationData = insertRecommendationSchema.parse(req.body);
      const recommendation = await storage.createRecommendation({
        ...recommendationData,
        userId: user.id
      });
      res.status(201).json(recommendation);
    } catch (error) {
      res.status(400).json({ message: "Invalid recommendation data", error });
    }
  });
  
  app.patch("/api/recommendations/:id", async (req: Request, res: Response) => {
    const { id } = req.params;
    const recommendationId = parseInt(id);
    
    try {
      const updates = req.body;
      const updatedRecommendation = await storage.updateRecommendation(recommendationId, updates);
      
      if (!updatedRecommendation) {
        return res.status(404).json({ message: "Recommendation not found" });
      }
      
      res.json(updatedRecommendation);
    } catch (error) {
      res.status(400).json({ message: "Invalid recommendation data", error });
    }
  });
  
  // System endpoints
  app.post("/api/system/scan", async (req: Request, res: Response) => {
    const user = await storage.getUserByUsername("pinky");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    try {
      const { source } = req.body;
      let files: any[] = [];
      
      if (source === "local") {
        files = await scanLocalFiles(user.id);
      } else if (source === "google_drive") {
        files = await scanGoogleDriveFiles(user.id);
      } else {
        return res.status(400).json({ message: "Invalid source" });
      }
      
      // Process and save files
      for (const fileData of files) {
        await storage.createFile(fileData);
      }
      
      res.json({ message: "Scan completed", fileCount: files.length });
    } catch (error) {
      res.status(500).json({ message: "Error scanning files", error });
    }
  });
  
  app.get("/api/system/status", async (req: Request, res: Response) => {
    const user = await storage.getUserByUsername("pinky");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    try {
      // Get all integrations
      const integrations = await storage.getIntegrations(user.id);
      
      // Get file counts by source
      const local = await storage.getFilesBySource(user.id, "local");
      const gdrive = await storage.getFilesBySource(user.id, "google_drive");
      const dropbox = await storage.getFilesBySource(user.id, "dropbox");
      const notion = await storage.getFilesBySource(user.id, "notion");
      
      // Get total processed files
      const allFiles = await storage.getFiles(user.id);
      const processedFiles = allFiles.filter(file => file.isProcessed);
      
      // Get file stats by category
      const fileStats = await storage.getFileStats(user.id);
      
      res.json({
        sources: {
          local: {
            status: local.length > 0 ? "connected" : "disconnected",
            fileCount: local.length
          },
          google_drive: {
            status: gdrive.length > 0 ? "connected" : "disconnected",
            fileCount: gdrive.length
          },
          dropbox: {
            status: "disconnected",
            fileCount: 0
          },
          notion: {
            status: notion.length > 0 ? "connected" : "disconnected",
            fileCount: notion.length
          }
        },
        fileAnalysis: {
          total: allFiles.length,
          processed: processedFiles.length,
          categories: fileStats
        },
        lastSync: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ message: "Error getting system status", error });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
