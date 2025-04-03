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

// Simulated Dropbox files for demonstration
const DROPBOX_FILE_SAMPLES = [
  {
    name: "Project Proposal.docx",
    path: "/Documents/Work/Project Proposal.docx",
    fileType: "docx",
    source: FileSource.DROPBOX,
    sourceId: "dbx_1",
    lastModified: new Date(),
  },
  {
    name: "Financial Report.xlsx",
    path: "/Documents/Finance/Financial Report.xlsx",
    fileType: "xlsx",
    source: FileSource.DROPBOX,
    sourceId: "dbx_2",
    lastModified: new Date(Date.now() - 86400000), // Yesterday
  }
];

// Simulated iOS files for demonstration
const IOS_FILE_SAMPLES = [
  {
    name: "Voice Memo.m4a",
    path: "/Recordings/Voice Memo.m4a",
    fileType: "m4a",
    source: FileSource.IOS,
    sourceId: "ios_1",
    lastModified: new Date(),
  },
  {
    name: "Notes from Meeting.txt",
    path: "/Notes/Notes from Meeting.txt",
    fileType: "txt",
    source: FileSource.IOS,
    sourceId: "ios_2",
    lastModified: new Date(Date.now() - 172800000), // 2 days ago
  },
  {
    name: "Screenshot.png",
    path: "/Photos/Screenshot.png",
    fileType: "png",
    source: FileSource.IOS,
    sourceId: "ios_3",
    lastModified: new Date(Date.now() - 3600000), // 1 hour ago
  }
];

// Simulated Ubuntu files for demonstration
const UBUNTU_FILE_SAMPLES = [
  {
    name: "app.py",
    path: "/home/user/projects/python/app.py",
    fileType: "py",
    source: FileSource.UBUNTU,
    sourceId: "ubuntu_1",
    lastModified: new Date(),
  },
  {
    name: "data.csv",
    path: "/home/user/data/data.csv",
    fileType: "csv",
    source: FileSource.UBUNTU,
    sourceId: "ubuntu_2",
    lastModified: new Date(Date.now() - 259200000), // 3 days ago
  },
  {
    name: "config.json",
    path: "/home/user/config/config.json",
    fileType: "json",
    source: FileSource.UBUNTU,
    sourceId: "ubuntu_3",
    lastModified: new Date(Date.now() - 432000000), // 5 days ago
  }
];

// Simulated Windows files for demonstration
const WINDOWS_FILE_SAMPLES = [
  {
    name: "Quarterly Report.pptx",
    path: "C:\\Users\\User\\Documents\\Presentations\\Quarterly Report.pptx",
    fileType: "pptx",
    source: FileSource.WINDOWS,
    sourceId: "win_1",
    lastModified: new Date(),
  },
  {
    name: "Project Timeline.xlsx",
    path: "C:\\Users\\User\\Documents\\Project\\Timeline.xlsx",
    fileType: "xlsx",
    source: FileSource.WINDOWS,
    sourceId: "win_2",
    lastModified: new Date(Date.now() - 172800000), // 2 days ago
  },
  {
    name: "Requirements.docx",
    path: "C:\\Users\\User\\Documents\\Project\\Requirements.docx",
    fileType: "docx",
    source: FileSource.WINDOWS,
    sourceId: "win_3",
    lastModified: new Date(Date.now() - 86400000), // Yesterday
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
 * Scans Dropbox files and returns them as InsertFile objects
 */
export async function scanDropboxFiles(userId: number): Promise<InsertFile[]> {
  // In a real app, we'd use the Dropbox API
  return DROPBOX_FILE_SAMPLES.map(file => {
    const fileCategory = getCategoryFromExtension(file.fileType);
    return {
      ...file,
      userId,
      fileCategory,
      isProcessed: true,
      metadata: { 
        size: Math.floor(Math.random() * 1024 * 1024),
        shared: Math.random() > 0.5 // Randomly set as shared or not
      },
    };
  });
}

/**
 * Scans iOS files and returns them as InsertFile objects
 */
export async function scanIOSFiles(userId: number): Promise<InsertFile[]> {
  // In a real app, we'd use iCloud API or iOS file sharing
  return IOS_FILE_SAMPLES.map(file => {
    const fileCategory = getCategoryFromExtension(file.fileType);
    return {
      ...file,
      userId,
      fileCategory,
      isProcessed: true,
      metadata: { 
        size: Math.floor(Math.random() * 1024 * 1024),
        device: "iPhone 14 Pro",
        created: new Date(Date.now() - 604800000) // 1 week ago
      },
    };
  });
}

/**
 * Scans Ubuntu files and returns them as InsertFile objects
 */
export async function scanUbuntuFiles(userId: number): Promise<InsertFile[]> {
  // In a real app, we'd use SSH/SFTP or dedicated Linux client
  return UBUNTU_FILE_SAMPLES.map(file => {
    const fileCategory = getCategoryFromExtension(file.fileType);
    return {
      ...file,
      userId,
      fileCategory,
      isProcessed: true,
      metadata: { 
        size: Math.floor(Math.random() * 1024 * 1024),
        permissions: "0644",
        owner: "user"
      },
    };
  });
}

/**
 * Scans Windows files and returns them as InsertFile objects
 */
export async function scanWindowsFiles(userId: number): Promise<InsertFile[]> {
  // In a real app, we'd use a Windows sync client or OneDrive
  return WINDOWS_FILE_SAMPLES.map(file => {
    const fileCategory = getCategoryFromExtension(file.fileType);
    return {
      ...file,
      userId,
      fileCategory,
      isProcessed: true,
      metadata: { 
        size: Math.floor(Math.random() * 1024 * 1024),
        system: "Windows 11",
        attributes: "Archive"
      },
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
