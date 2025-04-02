import { InsertFile, FileCategory, FileSource } from "@shared/schema";
import path from "path";
import { analyzeAndCategorizeFile } from "./aiUtils";

// Simulated local files for demonstration
const LOCAL_FILE_SAMPLES = [
  {
    name: "analysis.py",
    path: "/home/user/projects/data-analysis/analysis.py",
    fileType: "py",
    source: FileSource.LOCAL,
    lastModified: new Date(Date.now() - 86400000), // Yesterday
  },
  {
    name: "AI-Chat-Session-20230812.json",
    path: "/home/user/downloads/AI-Chat-Session-20230812.json",
    fileType: "json",
    source: FileSource.LOCAL,
    lastModified: new Date(Date.now() - 172800000), // 2 days ago
  },
  {
    name: "Project Requirements.txt",
    path: "/home/user/documents/project/requirements.txt",
    fileType: "txt",
    source: FileSource.LOCAL,
    lastModified: new Date(Date.now() - 345600000), // 4 days ago
  },
  {
    name: "main.js",
    path: "/home/user/projects/web-app/main.js",
    fileType: "js",
    source: FileSource.LOCAL,
    lastModified: new Date(Date.now() - 172800000), // 2 days ago
  }
];

// Simulated Google Drive files for demonstration
const GDRIVE_FILE_SAMPLES = [
  {
    name: "Project Proposal.docx",
    sourceId: "1abc123",
    fileType: "docx",
    source: FileSource.GOOGLE_DRIVE,
    lastModified: new Date(), // Today
  },
  {
    name: "dashboard-mockup.png",
    sourceId: "2def456",
    fileType: "png",
    source: FileSource.GOOGLE_DRIVE,
    lastModified: new Date(Date.now() - 259200000), // 3 days ago
  },
  {
    name: "budget.xlsx",
    sourceId: "3ghi789",
    fileType: "xlsx",
    source: FileSource.GOOGLE_DRIVE,
    lastModified: new Date(Date.now() - 432000000), // 5 days ago
  }
];

/**
 * Scans local files and returns them as InsertFile objects
 */
export async function scanLocalFiles(userId: number): Promise<InsertFile[]> {
  // In a real app, we'd scan the filesystem
  // For now, return sample data
  return LOCAL_FILE_SAMPLES.map(file => {
    const fileCategory = getCategoryFromExtension(file.fileType);
    return {
      ...file,
      userId,
      fileCategory,
      isProcessed: true,
      metadata: { size: Math.floor(Math.random() * 1024 * 1024) }, // Random size
    };
  });
}

/**
 * Scans Google Drive files and returns them as InsertFile objects
 */
export async function scanGoogleDriveFiles(userId: number): Promise<InsertFile[]> {
  // In a real app, we'd use the Google Drive API
  // For now, return sample data
  return GDRIVE_FILE_SAMPLES.map(file => {
    const fileCategory = getCategoryFromExtension(file.fileType);
    return {
      ...file,
      userId,
      fileCategory,
      isProcessed: true,
      metadata: { size: Math.floor(Math.random() * 1024 * 1024) }, // Random size
    };
  });
}

/**
 * Basic file categorization based on extension
 * In a real app, this would be more sophisticated and use AI
 */
function getCategoryFromExtension(extension: string): string {
  const docExtensions = ['txt', 'doc', 'docx', 'pdf', 'odt', 'rtf', 'md'];
  const codeExtensions = ['py', 'js', 'ts', 'html', 'css', 'java', 'c', 'cpp', 'php', 'go', 'rs', 'swift'];
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'];
  const videoExtensions = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'];
  const audioExtensions = ['mp3', 'wav', 'ogg', 'flac', 'aac'];
  const chatExtensions = ['json']; // Assuming json is used for chat logs

  extension = extension.toLowerCase();

  if (docExtensions.includes(extension)) return FileCategory.DOCUMENT;
  if (codeExtensions.includes(extension)) return FileCategory.CODE;
  if (imageExtensions.includes(extension)) return FileCategory.IMAGE;
  if (videoExtensions.includes(extension)) return FileCategory.VIDEO;
  if (audioExtensions.includes(extension)) return FileCategory.AUDIO;
  if (chatExtensions.includes(extension)) return FileCategory.CHAT_LOG;
  
  return FileCategory.OTHER;
}
