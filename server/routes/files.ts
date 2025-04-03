import express from 'express';
import { storage } from '../storage';
import { generateHfEmbedding } from '../utils/huggingfaceUtils';

const router = express.Router();

/**
 * Get all files for a user
 * GET /api/files
 */
router.get('/', async (req, res) => {
  try {
    const userId = parseInt(req.query.userId as string);
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    const files = await storage.getFiles(userId);
    res.json(files);
  } catch (error) {
    console.error('Error fetching files:', error);
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

/**
 * Get files by category
 * GET /api/files/category/:category
 */
router.get('/category/:category', async (req, res) => {
  try {
    const userId = parseInt(req.query.userId as string);
    const category = req.params.category;
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    const files = await storage.getFilesByCategory(userId, category);
    res.json(files);
  } catch (error) {
    console.error(`Error fetching files by category ${req.params.category}:`, error);
    res.status(500).json({ error: 'Failed to fetch files by category' });
  }
});

/**
 * Get files by source
 * GET /api/files/source/:source
 */
router.get('/source/:source', async (req, res) => {
  try {
    const userId = parseInt(req.query.userId as string);
    const source = req.params.source;
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    const files = await storage.getFilesBySource(userId, source);
    res.json(files);
  } catch (error) {
    console.error(`Error fetching files by source ${req.params.source}:`, error);
    res.status(500).json({ error: 'Failed to fetch files by source' });
  }
});

/**
 * Get recent files
 * GET /api/files/recent
 */
router.get('/recent', async (req, res) => {
  try {
    const userId = parseInt(req.query.userId as string);
    const limit = parseInt(req.query.limit as string) || 10;
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    const files = await storage.getRecentFiles(userId, limit);
    res.json(files);
  } catch (error) {
    console.error('Error fetching recent files:', error);
    res.status(500).json({ error: 'Failed to fetch recent files' });
  }
});

/**
 * Get file by ID
 * GET /api/files/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const fileId = parseInt(req.params.id);
    const userId = parseInt(req.query.userId as string);
    
    if (isNaN(fileId) || isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid ID parameters' });
    }
    
    const file = await storage.getFile(fileId);
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Check if user owns this file
    if (file.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized to access this file' });
    }
    
    res.json(file);
  } catch (error) {
    console.error(`Error fetching file ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to fetch file' });
  }
});

/**
 * Process a file for vector search
 * POST /api/files/:id/process
 */
router.post('/:id/process', async (req, res) => {
  try {
    const fileId = parseInt(req.params.id);
    const userId = parseInt(req.query.userId as string);
    
    if (isNaN(fileId) || isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid ID parameters' });
    }
    
    // Check if user owns this file
    const file = await storage.getFile(fileId);
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    if (file.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized to process this file' });
    }
    
    // Process the file
    const processedFile = await storage.processFileForVectorSearch(fileId);
    
    if (!processedFile) {
      return res.status(500).json({ error: 'Failed to process file' });
    }
    
    res.json({
      success: true,
      file: processedFile
    });
  } catch (error) {
    console.error(`Error processing file ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to process file' });
  }
});

/**
 * Process all unprocessed files for a user
 * POST /api/files/process-all
 */
router.post('/process-all', async (req, res) => {
  try {
    const userId = parseInt(req.query.userId as string);
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    // Process all files
    const processedCount = await storage.processAllUserFilesForVectorSearch(userId);
    
    res.json({
      success: true,
      processedCount
    });
  } catch (error) {
    console.error('Error processing files:', error);
    res.status(500).json({ error: 'Failed to process files' });
  }
});

/**
 * Search files using vector similarity
 * GET /api/files/search/vector
 */
router.get('/search/vector', async (req, res) => {
  try {
    const userId = parseInt(req.query.userId as string);
    const query = req.query.query as string;
    const limit = parseInt(req.query.limit as string) || 10;
    const threshold = parseFloat(req.query.threshold as string) || 0.7;
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query parameter is required' });
    }
    
    // Search files
    const files = await storage.searchFilesByVector(userId, query, limit, threshold);
    
    res.json(files);
  } catch (error) {
    console.error('Error searching files by vector:', error);
    res.status(500).json({ error: 'Failed to search files' });
  }
});

/**
 * Find similar files to a specific file
 * GET /api/files/:id/similar
 */
router.get('/:id/similar', async (req, res) => {
  try {
    const fileId = parseInt(req.params.id);
    const userId = parseInt(req.query.userId as string);
    const limit = parseInt(req.query.limit as string) || 5;
    const threshold = parseFloat(req.query.threshold as string) || 0.7;
    
    if (isNaN(fileId) || isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid ID parameters' });
    }
    
    // Check if user owns this file
    const file = await storage.getFile(fileId);
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    if (file.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized to access this file' });
    }
    
    // Find similar files
    const similarFiles = await storage.findSimilarFiles(fileId, limit, threshold);
    
    res.json(similarFiles);
  } catch (error) {
    console.error(`Error finding similar files to ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to find similar files' });
  }
});

/**
 * Get file statistics by category
 * GET /api/files/stats/categories
 */
router.get('/stats/categories', async (req, res) => {
  try {
    const userId = parseInt(req.query.userId as string);
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    const stats = await storage.getFileStats(userId);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching file statistics:', error);
    res.status(500).json({ error: 'Failed to fetch file statistics' });
  }
});

export default router;