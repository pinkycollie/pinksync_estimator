/**
 * Pinksync File Analyzer
 * 
 * A module for analyzing and categorizing files.
 * This module provides the core file analysis functionality that can be used
 * by both CLI tools and HTTP API endpoints.
 * 
 * Features:
 *   - Automatic file categorization (document, code, image, video, etc.)
 *   - Content-based analysis for better categorization
 *   - Visual indicators for accessibility
 *   - JSON output for integration with other tools
 */

import fs from 'fs';
import path from 'path';

// File category enum
export enum FileCategory {
  DOCUMENT = "document",
  CODE = "code",
  IMAGE = "image",
  VIDEO = "video",
  AUDIO = "audio",
  NOTE = "note",
  CHAT_LOG = "chat_log",
  OTHER = "other",
}

// Visual indicators for accessibility (deaf-centric design)
export const VISUAL_INDICATORS: Record<FileCategory, string> = {
  [FileCategory.DOCUMENT]: "📄",
  [FileCategory.CODE]: "💻",
  [FileCategory.IMAGE]: "🖼️",
  [FileCategory.VIDEO]: "🎬",
  [FileCategory.AUDIO]: "🎵",
  [FileCategory.NOTE]: "📝",
  [FileCategory.CHAT_LOG]: "💬",
  [FileCategory.OTHER]: "📦",
};

// Extension to category mapping
export const EXTENSION_CATEGORIES: Record<string, FileCategory> = {
  // Documents
  'pdf': FileCategory.DOCUMENT,
  'doc': FileCategory.DOCUMENT,
  'docx': FileCategory.DOCUMENT,
  'txt': FileCategory.DOCUMENT,
  'md': FileCategory.DOCUMENT,
  'odt': FileCategory.DOCUMENT,
  'rtf': FileCategory.DOCUMENT,
  
  // Code
  'py': FileCategory.CODE,
  'js': FileCategory.CODE,
  'ts': FileCategory.CODE,
  'jsx': FileCategory.CODE,
  'tsx': FileCategory.CODE,
  'html': FileCategory.CODE,
  'css': FileCategory.CODE,
  'scss': FileCategory.CODE,
  'c': FileCategory.CODE,
  'cpp': FileCategory.CODE,
  'h': FileCategory.CODE,
  'java': FileCategory.CODE,
  'go': FileCategory.CODE,
  'rs': FileCategory.CODE,
  'php': FileCategory.CODE,
  'rb': FileCategory.CODE,
  'swift': FileCategory.CODE,
  'kt': FileCategory.CODE,
  'sh': FileCategory.CODE,
  'bash': FileCategory.CODE,
  'sql': FileCategory.CODE,
  'json': FileCategory.CODE,
  'yaml': FileCategory.CODE,
  'yml': FileCategory.CODE,
  'toml': FileCategory.CODE,
  'xml': FileCategory.CODE,
  
  // Images
  'jpg': FileCategory.IMAGE,
  'jpeg': FileCategory.IMAGE,
  'png': FileCategory.IMAGE,
  'gif': FileCategory.IMAGE,
  'svg': FileCategory.IMAGE,
  'webp': FileCategory.IMAGE,
  'bmp': FileCategory.IMAGE,
  'ico': FileCategory.IMAGE,
  
  // Videos
  'mp4': FileCategory.VIDEO,
  'avi': FileCategory.VIDEO,
  'mov': FileCategory.VIDEO,
  'wmv': FileCategory.VIDEO,
  'mkv': FileCategory.VIDEO,
  'webm': FileCategory.VIDEO,
  
  // Audio
  'mp3': FileCategory.AUDIO,
  'wav': FileCategory.AUDIO,
  'ogg': FileCategory.AUDIO,
  'flac': FileCategory.AUDIO,
  'm4a': FileCategory.AUDIO,
  'aac': FileCategory.AUDIO,
};

// Name patterns for content-based categorization
export const NAME_PATTERNS: Array<{ pattern: RegExp; category: FileCategory }> = [
  { pattern: /chat|conversation|message/i, category: FileCategory.CHAT_LOG },
  { pattern: /note|memo|todo/i, category: FileCategory.NOTE },
  { pattern: /research|paper|thesis|report/i, category: FileCategory.DOCUMENT },
  { pattern: /readme|changelog|license/i, category: FileCategory.DOCUMENT },
];

export interface FileAnalysisResult {
  path: string;
  name: string;
  extension: string;
  category: FileCategory;
  indicator: string;
  size: number;
  sizeFormatted: string;
  lastModified: Date;
  isDirectory: boolean;
}

export interface AnalysisSummary {
  totalFiles: number;
  totalDirectories: number;
  categories: Record<FileCategory, number>;
  totalSize: number;
  totalSizeFormatted: string;
}

export interface AnalysisOutput {
  results: FileAnalysisResult[];
  summary: AnalysisSummary;
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Determine file category based on extension and name patterns
 */
export function determineCategory(fileName: string): FileCategory {
  // Check name patterns first
  for (const { pattern, category } of NAME_PATTERNS) {
    if (pattern.test(fileName)) {
      return category;
    }
  }
  
  // Get extension
  const extension = path.extname(fileName).toLowerCase().replace('.', '');
  
  // Check extension mapping
  if (extension in EXTENSION_CATEGORIES) {
    return EXTENSION_CATEGORIES[extension];
  }
  
  return FileCategory.OTHER;
}

/**
 * Analyze a single file
 */
export function analyzeFile(filePath: string): FileAnalysisResult {
  const stats = fs.statSync(filePath);
  const fileName = path.basename(filePath);
  const extension = path.extname(fileName).toLowerCase().replace('.', '');
  const category = stats.isDirectory() ? FileCategory.OTHER : determineCategory(fileName);
  
  return {
    path: filePath,
    name: fileName,
    extension,
    category,
    indicator: VISUAL_INDICATORS[category],
    size: stats.size,
    sizeFormatted: formatFileSize(stats.size),
    lastModified: stats.mtime,
    isDirectory: stats.isDirectory(),
  };
}

/**
 * Recursively analyze a directory
 */
export function analyzeDirectory(dirPath: string, results: FileAnalysisResult[] = []): FileAnalysisResult[] {
  const items = fs.readdirSync(dirPath);
  
  for (const item of items) {
    // Skip hidden files and common ignored directories
    if (item.startsWith('.') || item === 'node_modules' || item === 'dist' || item === '__pycache__') {
      continue;
    }
    
    const itemPath = path.join(dirPath, item);
    
    try {
      const stats = fs.statSync(itemPath);
      
      if (stats.isDirectory()) {
        results.push({
          path: itemPath,
          name: item,
          extension: '',
          category: FileCategory.OTHER,
          indicator: '📁',
          size: 0,
          sizeFormatted: '-',
          lastModified: stats.mtime,
          isDirectory: true,
        });
        analyzeDirectory(itemPath, results);
      } else {
        results.push(analyzeFile(itemPath));
      }
    } catch {
      // Skip files that can't be accessed
    }
  }
  
  return results;
}

/**
 * Generate analysis summary
 */
export function generateSummary(results: FileAnalysisResult[]): AnalysisSummary {
  const categories: Record<FileCategory, number> = {
    [FileCategory.DOCUMENT]: 0,
    [FileCategory.CODE]: 0,
    [FileCategory.IMAGE]: 0,
    [FileCategory.VIDEO]: 0,
    [FileCategory.AUDIO]: 0,
    [FileCategory.NOTE]: 0,
    [FileCategory.CHAT_LOG]: 0,
    [FileCategory.OTHER]: 0,
  };
  
  let totalSize = 0;
  let totalFiles = 0;
  let totalDirectories = 0;
  
  for (const result of results) {
    if (result.isDirectory) {
      totalDirectories++;
    } else {
      totalFiles++;
      totalSize += result.size;
      categories[result.category]++;
    }
  }
  
  return {
    totalFiles,
    totalDirectories,
    categories,
    totalSize,
    totalSizeFormatted: formatFileSize(totalSize),
  };
}

/**
 * Analyze a path (file or directory) and return the complete analysis output
 */
export function analyzePath(targetPath: string, recursive: boolean = true): AnalysisOutput {
  const absolutePath = path.resolve(targetPath);
  
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Path does not exist: ${absolutePath}`);
  }
  
  const stats = fs.statSync(absolutePath);
  let results: FileAnalysisResult[];
  
  if (stats.isDirectory()) {
    results = recursive ? analyzeDirectory(absolutePath) : analyzeDirectoryNonRecursive(absolutePath);
  } else {
    results = [analyzeFile(absolutePath)];
  }
  
  return {
    results,
    summary: generateSummary(results),
  };
}

/**
 * Analyze a directory without recursion
 */
function analyzeDirectoryNonRecursive(dirPath: string): FileAnalysisResult[] {
  const results: FileAnalysisResult[] = [];
  const items = fs.readdirSync(dirPath);
  
  for (const item of items) {
    // Skip hidden files and common ignored directories (consistent with recursive version)
    if (item.startsWith('.') || item === 'node_modules' || item === 'dist' || item === '__pycache__') {
      continue;
    }
    
    const itemPath = path.join(dirPath, item);
    
    try {
      const stats = fs.statSync(itemPath);
      
      if (stats.isDirectory()) {
        results.push({
          path: itemPath,
          name: item,
          extension: '',
          category: FileCategory.OTHER,
          indicator: '📁',
          size: 0,
          sizeFormatted: '-',
          lastModified: stats.mtime,
          isDirectory: true,
        });
      } else {
        results.push(analyzeFile(itemPath));
      }
    } catch {
      // Skip files that can't be accessed
    }
  }
  
  return results;
}

/**
 * Get all supported file categories
 */
export function getCategories(): Array<{ category: FileCategory; indicator: string }> {
  return Object.values(FileCategory).map(category => ({
    category,
    indicator: VISUAL_INDICATORS[category],
  }));
}

/**
 * Get all supported file extensions with their categories
 */
export function getExtensionMappings(): Array<{ extension: string; category: FileCategory }> {
  return Object.entries(EXTENSION_CATEGORIES).map(([extension, category]) => ({
    extension,
    category,
  }));
}
