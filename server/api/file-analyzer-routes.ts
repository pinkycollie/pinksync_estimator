/**
 * File Analyzer API Routes
 * 
 * HTTP API endpoints for file analysis functionality.
 * Provides REST-like endpoints for analyzing files and directories.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  analyzePath,
  analyzeFile,
  getCategories,
  getExtensionMappings,
  FileCategory,
  AnalysisOutput,
  FileAnalysisResult,
} from '../../tools/file-analyzer';
import fs from 'fs';
import path from 'path';

const router = Router();

// Validation schemas
const analyzePathSchema = z.object({
  path: z.string().min(1, 'Path is required'),
  recursive: z.boolean().optional().default(true),
});

const analyzeFileSchema = z.object({
  path: z.string().min(1, 'File path is required'),
});

const filterResultsSchema = z.object({
  path: z.string().min(1, 'Path is required'),
  recursive: z.boolean().optional().default(true),
  category: z.nativeEnum(FileCategory).optional(),
  extension: z.string().optional(),
  minSize: z.number().optional(),
  maxSize: z.number().optional(),
});

/**
 * GET /api/file-analyzer/categories
 * Get all supported file categories with their visual indicators
 */
router.get('/categories', (_req: Request, res: Response) => {
  try {
    console.log('[FileAnalyzer] GET /categories');
    const categories = getCategories();
    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error('[FileAnalyzer] Error fetching categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch categories',
    });
  }
});

/**
 * GET /api/file-analyzer/extensions
 * Get all supported file extensions with their category mappings
 */
router.get('/extensions', (_req: Request, res: Response) => {
  try {
    console.log('[FileAnalyzer] GET /extensions');
    const extensions = getExtensionMappings();
    res.json({
      success: true,
      data: extensions,
    });
  } catch (error) {
    console.error('[FileAnalyzer] Error fetching extensions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch extensions',
    });
  }
});

/**
 * POST /api/file-analyzer/analyze
 * Analyze a file or directory
 */
router.post('/analyze', (req: Request, res: Response) => {
  try {
    console.log('[FileAnalyzer] POST /analyze', { body: req.body });
    
    // Validate input
    const validationResult = analyzePathSchema.safeParse(req.body);
    if (!validationResult.success) {
      console.log('[FileAnalyzer] Validation failed:', validationResult.error.errors);
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: validationResult.error.errors,
      });
    }
    
    const { path: targetPath, recursive } = validationResult.data;
    
    // Resolve the path
    const absolutePath = path.resolve(targetPath);
    
    // Check if path exists
    if (!fs.existsSync(absolutePath)) {
      console.log('[FileAnalyzer] Path not found:', absolutePath);
      return res.status(404).json({
        success: false,
        error: 'Path not found',
        path: absolutePath,
      });
    }
    
    // Perform analysis
    const analysis = analyzePath(absolutePath, recursive);
    
    console.log('[FileAnalyzer] Analysis complete:', {
      totalFiles: analysis.summary.totalFiles,
      totalDirectories: analysis.summary.totalDirectories,
    });
    
    res.json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[FileAnalyzer] Error analyzing path:', errorMessage);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze path',
      details: errorMessage,
    });
  }
});

/**
 * POST /api/file-analyzer/analyze-file
 * Analyze a single file
 */
router.post('/analyze-file', (req: Request, res: Response) => {
  try {
    console.log('[FileAnalyzer] POST /analyze-file', { body: req.body });
    
    // Validate input
    const validationResult = analyzeFileSchema.safeParse(req.body);
    if (!validationResult.success) {
      console.log('[FileAnalyzer] Validation failed:', validationResult.error.errors);
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: validationResult.error.errors,
      });
    }
    
    const { path: filePath } = validationResult.data;
    
    // Resolve the path
    const absolutePath = path.resolve(filePath);
    
    // Check if path exists
    if (!fs.existsSync(absolutePath)) {
      console.log('[FileAnalyzer] File not found:', absolutePath);
      return res.status(404).json({
        success: false,
        error: 'File not found',
        path: absolutePath,
      });
    }
    
    // Check if it's a file (not a directory)
    const stats = fs.statSync(absolutePath);
    if (stats.isDirectory()) {
      console.log('[FileAnalyzer] Path is a directory:', absolutePath);
      return res.status(400).json({
        success: false,
        error: 'Path is a directory, not a file. Use /analyze endpoint for directories.',
        path: absolutePath,
      });
    }
    
    // Perform analysis
    const result = analyzeFile(absolutePath);
    
    console.log('[FileAnalyzer] File analysis complete:', {
      name: result.name,
      category: result.category,
    });
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[FileAnalyzer] Error analyzing file:', errorMessage);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze file',
      details: errorMessage,
    });
  }
});

/**
 * POST /api/file-analyzer/summary
 * Get just the summary for a path (without individual file results)
 */
router.post('/summary', (req: Request, res: Response) => {
  try {
    console.log('[FileAnalyzer] POST /summary', { body: req.body });
    
    // Validate input
    const validationResult = analyzePathSchema.safeParse(req.body);
    if (!validationResult.success) {
      console.log('[FileAnalyzer] Validation failed:', validationResult.error.errors);
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: validationResult.error.errors,
      });
    }
    
    const { path: targetPath, recursive } = validationResult.data;
    
    // Resolve the path
    const absolutePath = path.resolve(targetPath);
    
    // Check if path exists
    if (!fs.existsSync(absolutePath)) {
      console.log('[FileAnalyzer] Path not found:', absolutePath);
      return res.status(404).json({
        success: false,
        error: 'Path not found',
        path: absolutePath,
      });
    }
    
    // Perform analysis
    const analysis = analyzePath(absolutePath, recursive);
    
    console.log('[FileAnalyzer] Summary generated:', {
      totalFiles: analysis.summary.totalFiles,
      totalDirectories: analysis.summary.totalDirectories,
    });
    
    res.json({
      success: true,
      data: {
        path: absolutePath,
        summary: analysis.summary,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[FileAnalyzer] Error generating summary:', errorMessage);
    res.status(500).json({
      success: false,
      error: 'Failed to generate summary',
      details: errorMessage,
    });
  }
});

/**
 * POST /api/file-analyzer/filter
 * Analyze a path and filter results by category, extension, or size
 */
router.post('/filter', (req: Request, res: Response) => {
  try {
    console.log('[FileAnalyzer] POST /filter', { body: req.body });
    
    // Validate all input with combined schema
    const validationResult = filterResultsSchema.safeParse(req.body);
    if (!validationResult.success) {
      console.log('[FileAnalyzer] Validation failed:', validationResult.error.errors);
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: validationResult.error.errors,
      });
    }
    
    const { path: targetPath, recursive, category, extension, minSize, maxSize } = validationResult.data;
    
    // Resolve the path
    const absolutePath = path.resolve(targetPath);
    
    // Check if path exists
    if (!fs.existsSync(absolutePath)) {
      console.log('[FileAnalyzer] Path not found:', absolutePath);
      return res.status(404).json({
        success: false,
        error: 'Path not found',
        path: absolutePath,
      });
    }
    
    // Perform analysis
    const analysis = analyzePath(absolutePath, recursive);
    
    // Apply filters
    let filteredResults = analysis.results.filter((result: FileAnalysisResult) => {
      // Skip directories from filtering (unless specifically looking for them)
      if (result.isDirectory) {
        return false;
      }
      
      // Filter by category
      if (category && result.category !== category) {
        return false;
      }
      
      // Filter by extension
      if (extension && result.extension.toLowerCase() !== extension.toLowerCase()) {
        return false;
      }
      
      // Filter by minimum size
      if (minSize !== undefined && result.size < minSize) {
        return false;
      }
      
      // Filter by maximum size
      if (maxSize !== undefined && result.size > maxSize) {
        return false;
      }
      
      return true;
    });
    
    console.log('[FileAnalyzer] Filtered results:', {
      original: analysis.results.length,
      filtered: filteredResults.length,
    });
    
    res.json({
      success: true,
      data: {
        path: absolutePath,
        filters: {
          category,
          extension,
          minSize,
          maxSize,
        },
        results: filteredResults,
        count: filteredResults.length,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[FileAnalyzer] Error filtering results:', errorMessage);
    res.status(500).json({
      success: false,
      error: 'Failed to filter results',
      details: errorMessage,
    });
  }
});

/**
 * GET /api/file-analyzer/health
 * Health check for the file analyzer API
 */
router.get('/health', (_req: Request, res: Response) => {
  console.log('[FileAnalyzer] GET /health');
  res.json({
    success: true,
    status: 'ok',
    service: 'file-analyzer',
    timestamp: new Date().toISOString(),
  });
});

export default router;
