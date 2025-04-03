import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import type { IStorage } from "./storage"; 
import { astraStorage } from "./astra-storage";
import { z } from "zod";
import { insertFileSchema, insertIntegrationSchema, insertRecommendationSchema, type InsertFile, type File } from "@shared/schema";
import { analyzeAndCategorizeFile } from "./utils/aiUtils";
import { scanLocalFiles, scanGoogleDriveFiles } from "./utils/fileUtils";
import { zodResolver } from "@hookform/resolvers/zod";

// Set up storage with fallback to in-memory when Astra DB connection fails
let activeStorage: IStorage = storage; // Default to in-memory storage

// Try to use Astra DB, but fallback to in-memory storage if there's an issue
export const useAstraDB = async () => {
  try {
    // If there's no token, we won't even try
    if (!process.env.ASTRA_DB_TOKEN) {
      console.log("No ASTRA_DB_TOKEN found, using in-memory storage");
      return false;
    }
    
    // Check token format
    if (!process.env.ASTRA_DB_TOKEN.startsWith("AstraCS:")) {
      console.warn("Warning: ASTRA_DB_TOKEN should start with 'AstraCS:'");
      // We'll still try to use it though
    }
    
    console.log("Attempting to connect to Astra DB...");
    
    // Create a test user if needed to verify connection
    try {
      // Test the connection by trying to get a user - this will throw if connection fails
      await astraStorage.getUserByUsername("pinky");
      console.log("Using Astra DB for storage - existing user found");
      activeStorage = astraStorage;
      return true;
    } catch (userError) {
      // If user doesn't exist but connection is OK, create a test user
      console.log("No existing user found, creating default user");
      try {
        await astraStorage.createUser({
          username: "pinky",
          displayName: "Pinky",
          email: "user@example.com",
          password: "password123" // Required field
        });
        console.log("Test user created successfully");
        activeStorage = astraStorage;
        return true;
      } catch (createError) {
        console.error("Error creating test user:", createError);
        throw createError;
      }
    }
  } catch (error) {
    console.error("Error connecting to Astra DB, using in-memory storage instead:", error);
    console.log("Using in-memory storage");
    activeStorage = storage;
    
    // Create default user in memory storage if needed
    const memUser = await storage.getUserByUsername("pinky");
    if (!memUser) {
      await storage.createUser({
        username: "pinky",
        displayName: "Pinky",
        email: "user@example.com",
        password: "password123" // Required field
      });
      console.log("Created default user in memory storage");
    }
    
    return false;
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Try to use Astra DB storage if available
  await useAstraDB();
  
  // API routes, all prefixed with /api
  
  // Current user endpoint - using demo user for now
  app.get("/api/user", async (req: Request, res: Response) => {
    const user = await activeStorage.getUserByUsername("pinky");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Don't return password in response
    const { password, ...safeUser } = user;
    res.json(safeUser);
  });
  
  // File endpoints
  app.get("/api/files", async (req: Request, res: Response) => {
    const user = await activeStorage.getUserByUsername("pinky");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    const files = await activeStorage.getFiles(user.id);
    res.json(files);
  });
  
  app.get("/api/files/recent", async (req: Request, res: Response) => {
    const user = await activeStorage.getUserByUsername("pinky");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const recentFiles = await activeStorage.getRecentFiles(user.id, limit);
    res.json(recentFiles);
  });
  
  app.get("/api/files/category/:category", async (req: Request, res: Response) => {
    const user = await activeStorage.getUserByUsername("pinky");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    const { category } = req.params;
    const files = await activeStorage.getFilesByCategory(user.id, category);
    res.json(files);
  });
  
  app.get("/api/files/source/:source", async (req: Request, res: Response) => {
    const user = await activeStorage.getUserByUsername("pinky");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    const { source } = req.params;
    const files = await activeStorage.getFilesBySource(user.id, source);
    res.json(files);
  });
  
  app.post("/api/files", async (req: Request, res: Response) => {
    const user = await activeStorage.getUserByUsername("pinky");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    try {
      const fileData = insertFileSchema.parse(req.body);
      const file = await activeStorage.createFile({
        ...fileData,
        userId: user.id
      });
      
      // Process the file with AI categorization
      const categorizedFile = await analyzeAndCategorizeFile(file);
      if (categorizedFile) {
        await activeStorage.updateFile(file.id, {
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
    const user = await activeStorage.getUserByUsername("pinky");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    const stats = await activeStorage.getFileStats(user.id);
    res.json(stats);
  });
  
  // Integration endpoints
  app.get("/api/integrations", async (req: Request, res: Response) => {
    const user = await activeStorage.getUserByUsername("pinky");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    const integrations = await activeStorage.getIntegrations(user.id);
    res.json(integrations);
  });
  
  app.post("/api/integrations", async (req: Request, res: Response) => {
    const user = await activeStorage.getUserByUsername("pinky");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    try {
      const integrationData = insertIntegrationSchema.parse(req.body);
      const integration = await activeStorage.createIntegration({
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
      const updatedIntegration = await activeStorage.updateIntegration(integrationId, updates);
      
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
    const user = await activeStorage.getUserByUsername("pinky");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    const active = req.query.active === 'true';
    let recommendations;
    
    if (active) {
      recommendations = await activeStorage.getActiveRecommendations(user.id);
    } else {
      recommendations = await activeStorage.getRecommendations(user.id);
    }
    
    res.json(recommendations);
  });
  
  app.post("/api/recommendations", async (req: Request, res: Response) => {
    const user = await activeStorage.getUserByUsername("pinky");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    try {
      const recommendationData = insertRecommendationSchema.parse(req.body);
      const recommendation = await activeStorage.createRecommendation({
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
      const updatedRecommendation = await activeStorage.updateRecommendation(recommendationId, updates);
      
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
    const user = await activeStorage.getUserByUsername("pinky");
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
        await activeStorage.createFile(fileData);
      }
      
      res.json({ message: "Scan completed", fileCount: files.length });
    } catch (error) {
      res.status(500).json({ message: "Error scanning files", error });
    }
  });
  
  app.get("/api/system/status", async (req: Request, res: Response) => {
    const user = await activeStorage.getUserByUsername("pinky");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    try {
      // Get all integrations
      const integrations = await activeStorage.getIntegrations(user.id);
      
      // Get file counts by source
      const local = await activeStorage.getFilesBySource(user.id, "local");
      const gdrive = await activeStorage.getFilesBySource(user.id, "google_drive");
      const dropbox = await activeStorage.getFilesBySource(user.id, "dropbox");
      const notion = await activeStorage.getFilesBySource(user.id, "notion");
      const ios = await activeStorage.getFilesBySource(user.id, "ios");
      const ubuntu = await activeStorage.getFilesBySource(user.id, "ubuntu");
      const windows = await activeStorage.getFilesBySource(user.id, "windows");
      
      // Get total processed files
      const allFiles = await activeStorage.getFiles(user.id);
      const processedFiles = allFiles.filter((file: File) => file.isProcessed);
      
      // Get file stats by category
      const fileStats = await activeStorage.getFileStats(user.id);
      
      // Check if we're using Astra DB or memory storage
      const usingAstraDb = activeStorage === astraStorage;
      
      res.json({
        database: {
          type: usingAstraDb ? "Astra DB" : "In-memory",
          status: "connected"
        },
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
            status: dropbox.length > 0 ? "connected" : "disconnected",
            fileCount: dropbox.length
          },
          notion: {
            status: notion.length > 0 ? "connected" : "disconnected",
            fileCount: notion.length
          },
          ios: {
            status: ios.length > 0 ? "connected" : "disconnected",
            fileCount: ios.length
          },
          ubuntu: {
            status: ubuntu.length > 0 ? "connected" : "disconnected",
            fileCount: ubuntu.length
          },
          windows: {
            status: windows.length > 0 ? "connected" : "disconnected",
            fileCount: windows.length
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
  
  // Database health check endpoint
  app.get("/api/system/db-status", async (req: Request, res: Response) => {
    try {
      // Check if we're connected to Astra DB
      const astraConnected = activeStorage === astraStorage;
      
      res.json({
        dbType: astraConnected ? "Astra DB" : "In-memory",
        status: "connected",
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ 
        message: "Error checking database status",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Platform synchronization endpoints
  app.post("/api/sync/dropbox/:integrationId", async (req: Request, res: Response) => {
    const user = await activeStorage.getUserByUsername("pinky");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    const { integrationId } = req.params;
    const result = await activeStorage.synchronizeDropbox(user.id, parseInt(integrationId));
    res.json(result);
  });

  app.post("/api/sync/ios/:integrationId", async (req: Request, res: Response) => {
    const user = await activeStorage.getUserByUsername("pinky");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    const { integrationId } = req.params;
    const result = await activeStorage.synchronizeIOS(user.id, parseInt(integrationId));
    res.json(result);
  });

  app.post("/api/sync/ubuntu/:integrationId", async (req: Request, res: Response) => {
    const user = await activeStorage.getUserByUsername("pinky");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    const { integrationId } = req.params;
    const result = await activeStorage.synchronizeUbuntu(user.id, parseInt(integrationId));
    res.json(result);
  });

  app.post("/api/sync/windows/:integrationId", async (req: Request, res: Response) => {
    const user = await activeStorage.getUserByUsername("pinky");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    const { integrationId } = req.params;
    const result = await activeStorage.synchronizeWindows(user.id, parseInt(integrationId));
    res.json(result);
  });

  // Platform-specific file endpoints
  app.get("/api/files/platform/dropbox", async (req: Request, res: Response) => {
    const user = await activeStorage.getUserByUsername("pinky");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    const files = await activeStorage.getDropboxFiles(user.id);
    res.json(files);
  });

  app.get("/api/files/platform/ios", async (req: Request, res: Response) => {
    const user = await activeStorage.getUserByUsername("pinky");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    const files = await activeStorage.getIOSFiles(user.id);
    res.json(files);
  });

  app.get("/api/files/platform/ubuntu", async (req: Request, res: Response) => {
    const user = await activeStorage.getUserByUsername("pinky");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    const files = await activeStorage.getUbuntuFiles(user.id);
    res.json(files);
  });

  app.get("/api/files/platform/windows", async (req: Request, res: Response) => {
    const user = await activeStorage.getUserByUsername("pinky");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    const files = await activeStorage.getWindowsFiles(user.id);
    res.json(files);
  });

  // Conflict resolution endpoint
  app.post("/api/files/resolve-conflicts", async (req: Request, res: Response) => {
    const user = await activeStorage.getUserByUsername("pinky");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    const fileIds = req.body.fileIds;
    if (!Array.isArray(fileIds)) {
      return res.status(400).json({ message: "Invalid request. Expected fileIds as an array." });
    }
    
    const result = await activeStorage.resolveFileConflicts(user.id, fileIds);
    res.json(result);
  });

  const httpServer = createServer(app);
  return httpServer;
}
