import { File, FileCategory } from "@shared/schema";
import path from "path";

/**
 * Analyzes a file and attempts to categorize it using AI techniques
 * For the MVP, this uses simple heuristics based on file extension
 * In a production app, this would use natural language processing and machine learning
 */
export async function analyzeAndCategorizeFile(file: File): Promise<File | null> {
  if (!file) return null;

  // Extract extension from filename
  const extension = path.extname(file.name).toLowerCase().replace('.', '');
  let category = file.fileCategory;

  // If no category assigned yet, try to determine it
  if (!category) {
    category = determineCategory(file, extension);
  }

  return {
    ...file,
    fileCategory: category,
    isProcessed: true
  };
}

/**
 * Determines the category of a file based on its extension and contents
 * This is a simplified version. In a real app, this would use NLP and ML
 */
function determineCategory(file: File, extension: string): string {
  // Basic extension mapping
  const extensionCategories: Record<string, string> = {
    // Documents
    'pdf': FileCategory.DOCUMENT,
    'doc': FileCategory.DOCUMENT,
    'docx': FileCategory.DOCUMENT,
    'txt': FileCategory.DOCUMENT,
    'md': FileCategory.DOCUMENT,
    'odt': FileCategory.DOCUMENT,
    
    // Code
    'py': FileCategory.CODE,
    'js': FileCategory.CODE,
    'ts': FileCategory.CODE,
    'html': FileCategory.CODE,
    'css': FileCategory.CODE,
    'c': FileCategory.CODE,
    'cpp': FileCategory.CODE,
    'java': FileCategory.CODE,
    'go': FileCategory.CODE,
    'rs': FileCategory.CODE,
    'php': FileCategory.CODE,
    
    // Images
    'jpg': FileCategory.IMAGE,
    'jpeg': FileCategory.IMAGE,
    'png': FileCategory.IMAGE,
    'gif': FileCategory.IMAGE,
    'svg': FileCategory.IMAGE,
    'webp': FileCategory.IMAGE,
    
    // Videos
    'mp4': FileCategory.VIDEO,
    'avi': FileCategory.VIDEO,
    'mov': FileCategory.VIDEO,
    'wmv': FileCategory.VIDEO,
    
    // Audio
    'mp3': FileCategory.AUDIO,
    'wav': FileCategory.AUDIO,
    'ogg': FileCategory.AUDIO,
    
    // Notes (assuming specific applications)
    'note': FileCategory.NOTE,
    
    // Chat logs
    'json': FileCategory.CHAT_LOG, // Assuming json is used for chat logs
  };

  // Check if filename contains keywords
  const lowerName = file.name.toLowerCase();
  
  if (lowerName.includes('chat') || lowerName.includes('conversation')) {
    return FileCategory.CHAT_LOG;
  }
  
  if (lowerName.includes('note') || lowerName.includes('memo')) {
    return FileCategory.NOTE;
  }
  
  if (lowerName.includes('research') || lowerName.includes('paper')) {
    return FileCategory.DOCUMENT;
  }

  // Use extension mapping if available
  if (extension in extensionCategories) {
    return extensionCategories[extension];
  }

  // Default category if nothing matches
  return FileCategory.OTHER;
}

/**
 * Generates file recommendations based on analysis
 * For MVP this is placeholder functionality
 */
export function generateRecommendations(files: File[]): string[] {
  const recommendations = [];
  
  // Check for code organization potential
  const codeFiles = files.filter(file => file.fileCategory === FileCategory.CODE);
  if (codeFiles.length > 10) {
    recommendations.push("Organize your code files into a structured project");
  }
  
  // Check for document backup recommendations
  const documents = files.filter(file => file.fileCategory === FileCategory.DOCUMENT);
  if (documents.length > 5 && !files.some(file => file.source === 'google_drive')) {
    recommendations.push("Back up your important documents to cloud storage");
  }
  
  // Check for potential integrations
  if (files.some(file => file.name.toLowerCase().includes('notion'))) {
    recommendations.push("Connect to Notion for better knowledge management");
  }
  
  return recommendations;
}
