import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage, memStorage, dbStorage, MemStorage } from "./storage";
import type { IStorage } from "./storage"; 
// Import removed - no longer using Replit storage
// Import removed - no longer using Astra storage
import { setupAuth, isAuthenticated } from "./replitAuth";
import { z } from "zod";
import { insertFileSchema, insertIntegrationSchema, insertRecommendationSchema, type InsertFile, type File } from "@shared/schema";
import { analyzeAndCategorizeFile } from "./utils/aiUtils";
import { scanLocalFiles, scanGoogleDriveFiles } from "./utils/fileUtils";
import { zodResolver } from "@hookform/resolvers/zod";
import filesRouter from "./routes/files";
import oauthRouter from "./routes/oauth";
import chatHistoryRouter from "./routes/chatHistory";
import entrepreneurRouter from "./routes/entrepreneur";

// Set up storage with PostgreSQL by default, with fallbacks
let activeStorage: IStorage = storage; // This is dbStorage by default

/**
 * Utility to attempt to use PostgreSQL Database storage
 */
const usePostgresStorage = async (): Promise<boolean> => {
  try {
    console.log("Attempting to use PostgreSQL Database for storage");
    
    // Try to see if we can use PostgreSQL Database
    if (process.env.DATABASE_URL) {
      // Test query to verify connection
      await dbStorage.getUser(1);
      activeStorage = dbStorage;
      console.log("Successfully connected to PostgreSQL Database");
      return true;
    } else {
      console.log("DATABASE_URL not found, PostgreSQL not available");
    }
    
    // Fall back to memory storage
    console.log("Falling back to in-memory storage");
    activeStorage = memStorage;
    
    // Create a default user in memory if needed
    try {
      const memUser = await memStorage.getUserByUsername("pinky");
      if (!memUser) {
        await memStorage.createUser({
          username: "pinky",
          displayName: "Pinky Kim",
          email: "pinky@example.com",
          password: "password123" // Required field
        });
        console.log("Created default user 'pinky' in memory storage");
      } else {
        console.log("Using existing user 'pinky' from memory storage");
      }
    } catch (memErr) {
      console.error("Failed to initialize memory storage user:", memErr);
    }
    
    return false;
  } catch (error) {
    console.error("Failed to connect to PostgreSQL Database:", error);
    console.log("Falling back to in-memory storage");
    activeStorage = memStorage;
    
    return false;
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Try to use PostgreSQL Database storage
  await usePostgresStorage();
  
  // Set up Replit Auth
  await setupAuth(app);
  
  // Authentication routes
  app.get('/api/auth/user', (req: any, res) => {
    res.json(req.session?.passport?.user || null);
  });
  
  // API routes, all prefixed with /api
  
  // Mount modular route handlers
  app.use('/api/files', filesRouter);
  app.use('/api/oauth', oauthRouter);
  app.use('/api/chat-history', chatHistoryRouter);
  app.use('/api/entrepreneur', entrepreneurRouter);
  
  // Create user endpoint
  app.post("/api/user", async (req: Request, res: Response) => {
    try {
      const { username, password, displayName, email } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }
      
      // Check if user already exists
      const existingUser = await activeStorage.getUserByUsername(username);
      if (existingUser) {
        return res.status(409).json({ message: "User already exists" });
      }
      
      // Create the user
      const user = await activeStorage.createUser({
        username,
        password,
        displayName: displayName || null,
        email: email || null
      });
      
      return res.status(201).json({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        email: user.email
      });
    } catch (error: any) {
      console.error("Error creating user:", error);
      return res.status(500).json({ message: error.message || "Failed to create user" });
    }
  });
  
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
      // Pre-process date fields before validation
      const requestData = { 
        ...req.body,
        userId: user.id // Ensure userId is set
      };
      
      if (requestData.lastModified && typeof requestData.lastModified === 'string') {
        requestData.lastModified = new Date(requestData.lastModified);
      }
      
      const fileData = insertFileSchema.parse(requestData);
      const file = await activeStorage.createFile(fileData);
      
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
      console.error("Error creating file:", error);
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
      
      // Check which database we're connected to
      let dbType = "In-memory";
      if (activeStorage === dbStorage) {
        dbType = "PostgreSQL";
      } else {
        dbType = "In-memory";
      }
      
      res.json({
        database: {
          type: dbType,
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
      // Check which database we're connected to
      let dbType = "In-memory";
      if (activeStorage === dbStorage) {
        dbType = "PostgreSQL";
      } else {
        dbType = "In-memory";
      }
      
      res.json({
        dbType,
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
  
  app.post("/api/sync/anytype/:integrationId", async (req: Request, res: Response) => {
    const user = await activeStorage.getUserByUsername("pinky");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    const { integrationId } = req.params;
    const result = await activeStorage.synchronizeAnytype(user.id, parseInt(integrationId));
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

  // Vector search endpoints
  
  // Process a file for vector search (generate embeddings)
  app.post("/api/files/:id/process-vector", async (req: Request, res: Response) => {
    const fileId = parseInt(req.params.id);
    
    if (isNaN(fileId)) {
      return res.status(400).json({ message: "Invalid file ID" });
    }
    
    try {
      // Get the user
      const user = await activeStorage.getUserByUsername("pinky");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get the file to verify it belongs to the user
      const file = await activeStorage.getFile(fileId);
      
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }
      
      if (file.userId !== user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Process the file for vector search
      const processedFile = await activeStorage.processFileForVectorSearch(fileId);
      
      if (!processedFile) {
        return res.status(500).json({ message: "Failed to process file" });
      }
      
      return res.json({ 
        success: true, 
        file: processedFile,
        message: "File processed successfully"
      });
    } catch (error: any) {
      console.error("Error processing file for vector search:", error);
      return res.status(500).json({ message: error.message || "Failed to process file" });
    }
  });
  
  // Process all unprocessed files for a user to add vector embeddings
  app.post("/api/files/process-all-vectors", async (req: Request, res: Response) => {
    try {
      // Get the user
      const user = await activeStorage.getUserByUsername("pinky");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Process all unprocessed files
      const processedCount = await activeStorage.processAllUserFilesForVectorSearch(user.id);
      
      return res.json({ 
        success: true, 
        processedCount,
        message: `${processedCount} files processed successfully`
      });
    } catch (error: any) {
      console.error("Error processing files for vector search:", error);
      return res.status(500).json({ message: error.message || "Failed to process files" });
    }
  });
  
  // Search files using semantic vector search
  app.get("/api/files/vector-search", async (req: Request, res: Response) => {
    const query = req.query.query as string;
    const limitParam = req.query.limit as string;
    const thresholdParam = req.query.threshold as string;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ message: "Search query is required" });
    }
    
    const limit = limitParam ? parseInt(limitParam) : 10;
    const threshold = thresholdParam ? parseFloat(thresholdParam) : 0.7;
    
    if (isNaN(limit) || isNaN(threshold)) {
      return res.status(400).json({ message: "Invalid limit or threshold" });
    }
    
    try {
      // Get the user
      const user = await activeStorage.getUserByUsername("pinky");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Use mock embeddings if OpenAI API key isn't available
      if (!process.env.OPENAI_API_KEY) {
        console.log("OpenAI API key not found, will use mock embeddings for vector search");
      }
      
      // Perform vector search
      const results = await activeStorage.searchFilesByVector(user.id, query, limit, threshold);
      
      return res.json({ 
        success: true, 
        results,
        count: results.length,
        query
      });
    } catch (error: any) {
      console.error("Error searching files by vector:", error);
      return res.status(500).json({ message: error.message || "Failed to search files" });
    }
  });
  
  // Find files similar to a specific file
  app.get("/api/files/:id/similar", async (req: Request, res: Response) => {
    const fileId = parseInt(req.params.id);
    const limitParam = req.query.limit as string;
    const thresholdParam = req.query.threshold as string;
    
    if (isNaN(fileId)) {
      return res.status(400).json({ message: "Invalid file ID" });
    }
    
    const limit = limitParam ? parseInt(limitParam) : 5;
    const threshold = thresholdParam ? parseFloat(thresholdParam) : 0.7;
    
    if (isNaN(limit) || isNaN(threshold)) {
      return res.status(400).json({ message: "Invalid limit or threshold" });
    }
    
    try {
      // Get the user
      const user = await activeStorage.getUserByUsername("pinky");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get the file to verify it belongs to the user
      const file = await activeStorage.getFile(fileId);
      
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }
      
      if (file.userId !== user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Use mock embeddings if OpenAI API key isn't available
      if (!process.env.OPENAI_API_KEY) {
        console.log("OpenAI API key not found, will use mock embeddings for similar file search");
      }
      
      // Find similar files
      const similarFiles = await activeStorage.findSimilarFiles(fileId, limit, threshold);
      
      return res.json({ 
        success: true, 
        results: similarFiles,
        count: similarFiles.length,
        sourceFile: file.name
      });
    } catch (error: any) {
      console.error("Error finding similar files:", error);
      return res.status(500).json({ message: error.message || "Failed to find similar files" });
    }
  });
  
  // Ngrok status endpoint - this is separate from the /api/system/ngrok-status endpoint
  // that is registered in ngrokService.ts
  app.get("/api/system/ngrok", async (_req, res) => {
    try {
      res.json({
        active: !!app.locals.ngrokUrl,
        url: app.locals.ngrokUrl || null,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({ 
        message: "Error checking ngrok status",
        error: error?.message || String(error)
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
