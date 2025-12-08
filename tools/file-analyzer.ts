#!/usr/bin/env npx tsx
/**
 * Pinksync File Analyzer CLI Tool
 * 
 * A standalone command-line utility for analyzing and categorizing files.
 * This tool extracts the core file analysis functionality from the Pinksync
 * prototype for use as a portable utility.
 * 
 * Usage:
 *   npx tsx tools/file-analyzer.ts <file-or-directory>
 *   npx tsx tools/file-analyzer.ts --help
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
enum FileCategory {
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
const VISUAL_INDICATORS: Record<FileCategory, string> = {
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
const EXTENSION_CATEGORIES: Record<string, FileCategory> = {
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
const NAME_PATTERNS: Array<{ pattern: RegExp; category: FileCategory }> = [
  { pattern: /chat|conversation|message/i, category: FileCategory.CHAT_LOG },
  { pattern: /note|memo|todo/i, category: FileCategory.NOTE },
  { pattern: /research|paper|thesis|report/i, category: FileCategory.DOCUMENT },
  { pattern: /readme|changelog|license/i, category: FileCategory.DOCUMENT },
];

interface FileAnalysisResult {
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

interface AnalysisSummary {
  totalFiles: number;
  totalDirectories: number;
  categories: Record<FileCategory, number>;
  totalSize: number;
  totalSizeFormatted: string;
}

/**
 * Format file size in human-readable format
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Determine file category based on extension and name patterns
 */
function determineCategory(fileName: string): FileCategory {
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
function analyzeFile(filePath: string): FileAnalysisResult {
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
function analyzeDirectory(dirPath: string, results: FileAnalysisResult[] = []): FileAnalysisResult[] {
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
    } catch (error) {
      // Skip files that can't be accessed, but log the error for debugging
      console.debug(`Could not access ${itemPath}:`, error);
    }
  }
  
  return results;
}

/**
 * Generate analysis summary
 */
function generateSummary(results: FileAnalysisResult[]): AnalysisSummary {
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
 * Print help message
 */
function printHelp(): void {
  console.log(`
📊 Pinksync File Analyzer
========================

A command-line tool for analyzing and categorizing files.

Usage:
  npx tsx tools/file-analyzer.ts <file-or-directory> [options]

Options:
  --json       Output results in JSON format
  --summary    Show only summary, not individual files
  --help       Show this help message

Examples:
  npx tsx tools/file-analyzer.ts ./src
  npx tsx tools/file-analyzer.ts ./document.pdf
  npx tsx tools/file-analyzer.ts ./project --json
  npx tsx tools/file-analyzer.ts ./src --summary

Categories:
  ${VISUAL_INDICATORS[FileCategory.DOCUMENT]} Document  - PDFs, Word docs, text files
  ${VISUAL_INDICATORS[FileCategory.CODE]} Code      - Source code files
  ${VISUAL_INDICATORS[FileCategory.IMAGE]} Image     - Pictures and graphics
  ${VISUAL_INDICATORS[FileCategory.VIDEO]} Video     - Video files
  ${VISUAL_INDICATORS[FileCategory.AUDIO]} Audio     - Music and audio files
  ${VISUAL_INDICATORS[FileCategory.NOTE]} Note      - Notes and memos
  ${VISUAL_INDICATORS[FileCategory.CHAT_LOG]} Chat Log  - Conversation logs
  ${VISUAL_INDICATORS[FileCategory.OTHER]} Other     - Other file types

Accessibility:
  This tool uses visual indicators (emoji) instead of color
  coding to make output accessible for all users.
`);
}

/**
 * Print results in table format
 */
function printResults(results: FileAnalysisResult[], showSummaryOnly: boolean): void {
  if (!showSummaryOnly) {
    console.log('\n📋 File Analysis Results');
    console.log('='.repeat(70));
    
    for (const result of results) {
      if (result.isDirectory) {
        console.log(`📁 ${result.name}/`);
      } else {
        console.log(`${result.indicator} ${result.name}`);
        console.log(`   Category: ${result.category} | Size: ${result.sizeFormatted}`);
      }
    }
  }
  
  const summary = generateSummary(results);
  
  console.log('\n📊 Summary');
  console.log('='.repeat(40));
  console.log(`Total Files: ${summary.totalFiles}`);
  console.log(`Total Directories: ${summary.totalDirectories}`);
  console.log(`Total Size: ${summary.totalSizeFormatted}`);
  console.log('\nBy Category:');
  
  for (const [category, count] of Object.entries(summary.categories)) {
    if (count > 0) {
      const indicator = VISUAL_INDICATORS[category as FileCategory];
      console.log(`  ${indicator} ${category}: ${count}`);
    }
  }
}

/**
 * Main entry point
 */
function main(): void {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help')) {
    printHelp();
    process.exit(0);
  }
  
  const jsonOutput = args.includes('--json');
  const summaryOnly = args.includes('--summary');
  const targetPath = args.find(arg => !arg.startsWith('--'));
  
  if (!targetPath) {
    console.error('❌ Error: No file or directory path provided');
    process.exit(1);
  }
  
  const absolutePath = path.resolve(targetPath);
  
  if (!fs.existsSync(absolutePath)) {
    console.error(`❌ Error: Path does not exist: ${absolutePath}`);
    process.exit(1);
  }
  
  const stats = fs.statSync(absolutePath);
  let results: FileAnalysisResult[];
  
  if (stats.isDirectory()) {
    if (!jsonOutput) {
      console.log(`\n🔍 Analyzing directory: ${absolutePath}`);
    }
    results = analyzeDirectory(absolutePath);
  } else {
    if (!jsonOutput) {
      console.log(`\n🔍 Analyzing file: ${absolutePath}`);
    }
    results = [analyzeFile(absolutePath)];
  }
  
  if (jsonOutput) {
    const output = {
      results,
      summary: generateSummary(results),
    };
    console.log(JSON.stringify(output, null, 2));
  } else {
    printResults(results, summaryOnly);
    console.log('\n✅ Analysis complete!');
  }
}

main();
