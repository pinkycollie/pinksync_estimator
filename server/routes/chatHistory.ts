import { Router, Request, Response } from "express";
import { upload, handleUploadErrors, parseJsonFile, cleanupTempFile, detectFileType } from "../utils/fileUploadUtils";
import { importChatGPTExport, importClaudeExport } from "../utils/chatImportUtils";
import { isAuthenticated } from "../replitAuth";
import { insertAiChatHistorySchema, insertAiChatMessageSchema } from "@shared/schema";
import type { IStorage } from "../storage";
import { storage } from "../storage";

// Always use PostgreSQL storage
let activeStorage: IStorage = storage;

// Placeholder function that always returns the PostgreSQL storage
export const useActiveStorage = async () => {
  activeStorage = storage;
  return true;
};

// Initialize router
const router = Router();

// Upload and import AI chat history - supports ChatGPT exports
router.post(
  "/import",
  isAuthenticated,
  upload.single("file"),
  handleUploadErrors,
  async (req: Request, res: Response) => {
    const user = req.user as any;
    
    // Check if we have a file
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: "No file uploaded" 
      });
    }

    // Get the type of file
    const fileType = detectFileType(req.file);
    
    try {
      // Parse the uploaded file
      const parsedData = parseJsonFile(req.file.path);
      
      if (!parsedData) {
        return res.status(400).json({ 
          success: false, 
          error: "Failed to parse file. Ensure it is a valid JSON file." 
        });
      }

      // Process the data based on detected platform
      let result;
      if (fileType.platform === "chatgpt") {
        // Import ChatGPT data
        result = await importChatGPTExport(user.id || 1, parsedData, activeStorage);
      } else if (fileType.platform === "claude") {
        // Import Claude data
        result = await importClaudeExport(user.id || 1, parsedData, activeStorage);
      } else {
        // Try to determine from content structure
        if (Array.isArray(parsedData) && parsedData.length > 0 && 
            parsedData[0].id && parsedData[0].title && Array.isArray(parsedData[0].messages)) {
          // Looks like ChatGPT format
          result = await importChatGPTExport(user.id || 1, parsedData, activeStorage);
        } else {
          return res.status(400).json({ 
            success: false, 
            error: "Unable to determine chat platform format. Please ensure this is a valid ChatGPT or Claude export file." 
          });
        }
      }
      
      // Return import results
      res.json(result);
    } catch (error) {
      console.error("Error importing chat history:", error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error during import" 
      });
    } finally {
      // Clean up temporary file
      cleanupTempFile(req.file.path);
    }
  }
);

// Get all chat histories for a user
router.get("/", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const userId = user?.id || 1; // Default to user 1 if not authenticated
    
    const platform = req.query.platform as string;
    let chatHistories;
    
    if (platform) {
      // Get by platform if specified
      chatHistories = await activeStorage.getChatHistoriesByPlatform(userId, platform);
    } else {
      // Get all
      chatHistories = await activeStorage.getChatHistories(userId);
    }
    
    res.json(chatHistories);
  } catch (error) {
    console.error("Error fetching chat histories:", error);
    res.status(500).json({ error: "Failed to retrieve chat histories" });
  }
});

// Get a specific chat history by ID
router.get("/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const chatId = parseInt(req.params.id);
    const chatHistory = await activeStorage.getChatHistory(chatId);
    
    if (!chatHistory) {
      return res.status(404).json({ error: "Chat history not found" });
    }
    
    // Check if this user owns this chat history
    const user = req.user as any;
    if (chatHistory.userId !== user?.id && user?.id !== 1) { // Allow admin user 1 to access any history
      return res.status(403).json({ error: "You don't have permission to access this chat history" });
    }
    
    // Get messages for this chat
    const messages = await activeStorage.getChatMessages(chatId);
    
    res.json({
      ...chatHistory,
      messages
    });
  } catch (error) {
    console.error("Error fetching chat history:", error);
    res.status(500).json({ error: "Failed to retrieve chat history" });
  }
});

// Delete a chat history
router.delete("/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const chatId = parseInt(req.params.id);
    const chatHistory = await activeStorage.getChatHistory(chatId);
    
    if (!chatHistory) {
      return res.status(404).json({ error: "Chat history not found" });
    }
    
    // Check if this user owns this chat history
    const user = req.user as any;
    if (chatHistory.userId !== user?.id && user?.id !== 1) {
      return res.status(403).json({ error: "You don't have permission to delete this chat history" });
    }
    
    // Delete the chat history
    const result = await activeStorage.deleteChatHistory(chatId);
    
    res.json({ success: result });
  } catch (error) {
    console.error("Error deleting chat history:", error);
    res.status(500).json({ error: "Failed to delete chat history" });
  }
});

// Update a chat history (e.g., to add tags or update title)
router.patch("/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const chatId = parseInt(req.params.id);
    const chatHistory = await activeStorage.getChatHistory(chatId);
    
    if (!chatHistory) {
      return res.status(404).json({ error: "Chat history not found" });
    }
    
    // Check if this user owns this chat history
    const user = req.user as any;
    if (chatHistory.userId !== user?.id && user?.id !== 1) {
      return res.status(403).json({ error: "You don't have permission to update this chat history" });
    }
    
    // Update the chat history
    const updatedChat = await activeStorage.updateChatHistory(chatId, req.body);
    
    res.json(updatedChat);
  } catch (error) {
    console.error("Error updating chat history:", error);
    res.status(500).json({ error: "Failed to update chat history" });
  }
});

// Search across chat histories
router.get("/search/:query", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const userId = user?.id || 1;
    const query = req.params.query;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    
    const results = await activeStorage.searchChatHistories(userId, query, limit);
    
    res.json(results);
  } catch (error) {
    console.error("Error searching chat histories:", error);
    res.status(500).json({ error: "Failed to search chat histories" });
  }
});

export default router;