import iCloud from 'node-icloud';
import type { Integration } from '@shared/schema';
import { FileCategory, FileSource } from '@shared/schema';
import path from 'path';

export interface iCloudConfig {
  username: string;  // Apple ID
  password: string;  // Apple ID password
  trustToken?: string;  // Trust token for 2FA if required
  options?: {
    saveDirectory?: string;
    dataDirectory?: string;
  };
}

export function createiCloudClientFromIntegration(integration: Integration): any | null {
  if (!integration || integration.type !== 'ios') {
    return null;
  }
  
  try {
    const config = integration.config as iCloudConfig;
    
    if (!config || !config.username || !config.password) {
      console.error('Invalid iOS integration config');
      return null;
    }
    
    return new iCloud(config.username, config.password, {
      saveDirectory: config.options?.saveDirectory || './icloud_data',
      dataDirectory: config.options?.dataDirectory || './icloud_metadata',
      trustDevice: true
    });
  } catch (error) {
    console.error('Error creating iCloud client:', error);
    return null;
  }
}

export async function testiCloudConnection(iCloudClient: any): Promise<{ success: boolean; message?: string }> {
  return new Promise<{ success: boolean; message?: string }>((resolve) => {
    iCloudClient.on('ready', () => {
      resolve({ 
        success: true, 
        message: `Connected to iCloud as ${iCloudClient.accountInfo.dsInfo.fullName || iCloudClient.accountInfo.dsInfo.appleId}` 
      });
    });
    
    iCloudClient.on('err', (error: any) => {
      console.error('iCloud connection error:', error);
      resolve({ 
        success: false, 
        message: error.message || 'Failed to connect to iCloud' 
      });
    });
    
    // Set a timeout in case the connection hangs
    setTimeout(() => {
      resolve({ 
        success: false, 
        message: 'iCloud connection timeout' 
      });
    }, 60000); // 60 seconds timeout
  });
}

export function determineFileCategory(fileType: string, fileName: string): FileCategory {
  const fileExtension = path.extname(fileName).toLowerCase();
  
  // Document types
  if (['.doc', '.docx', '.pdf', '.txt', '.rtf', '.odt', '.pages'].includes(fileExtension)) {
    return FileCategory.DOCUMENT;
  }
  
  // Code types
  if (['.js', '.ts', '.py', '.java', '.c', '.cpp', '.html', '.css', '.php', '.rb', '.go', '.rs', '.swift'].includes(fileExtension)) {
    return FileCategory.CODE;
  }
  
  // Image types
  if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.svg', '.webp', '.heic'].includes(fileExtension)) {
    return FileCategory.IMAGE;
  }
  
  // Video types
  if (['.mp4', '.mov', '.avi', '.wmv', '.flv', '.webm', '.mkv', '.m4v'].includes(fileExtension)) {
    return FileCategory.VIDEO;
  }
  
  // Audio types
  if (['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac'].includes(fileExtension)) {
    return FileCategory.AUDIO;
  }
  
  // Note types
  if (['.md', '.markdown', '.note'].includes(fileExtension)) {
    return FileCategory.NOTE;
  }
  
  return FileCategory.OTHER;
}

export async function synchronizeFromiCloud(
  iCloudClient: any,
  userId: number
): Promise<{ files: any[]; errors?: string[] }> {
  return new Promise<{ files: any[]; errors?: string[] }>((resolve) => {
    const errors: string[] = [];
    const processedFiles: any[] = [];
    
    iCloudClient.on('ready', async () => {
      try {
        // Get files from iCloud Drive
        if (iCloudClient.drive) {
          const driveItems = await getFilesRecursively(iCloudClient.drive);
          
          for (const item of driveItems) {
            try {
              const fileExtension = path.extname(item.name).toLowerCase();
              const fileType = fileExtension.replace('.', '');
              const fileCategory = determineFileCategory(fileType, item.name);
              
              const fileData = {
                userId,
                name: item.name,
                path: item.path,
                fileType,
                fileCategory,
                size: item.size,
                lastModified: new Date(item.dateModified),
                isProcessed: false,
                source: FileSource.IOS,
                sourceId: item.id,
                metadata: {
                  id: item.id,
                  etag: item.etag,
                  type: item.type,
                  parentId: item.parentId
                }
              };
              
              processedFiles.push(fileData);
            } catch (itemError: any) {
              console.error(`Error processing iCloud file ${item.name}:`, itemError);
              errors.push(`Failed to process ${item.name}: ${itemError.message}`);
            }
          }
        }
        
        // Get files from Photos if available
        if (iCloudClient.photos) {
          const photoItems = await iCloudClient.photos.all;
          
          for (const photo of photoItems) {
            try {
              const fileExtension = photo.filename ? path.extname(photo.filename).toLowerCase() : '.jpg';
              const fileType = fileExtension.replace('.', '');
              const fileCategory = photo.mediaType === 'video' ? FileCategory.VIDEO : FileCategory.IMAGE;
              
              const fileData = {
                userId,
                name: photo.filename || `photo_${photo.id}.jpg`,
                path: `/photos/${photo.id}`,
                fileType,
                fileCategory,
                size: photo.size || 0,
                lastModified: new Date(photo.createdDate),
                isProcessed: false,
                source: FileSource.IOS,
                sourceId: photo.id,
                metadata: {
                  id: photo.id,
                  mediaType: photo.mediaType,
                  createdDate: photo.createdDate,
                  dimensions: photo.dimensions,
                  location: photo.location
                }
              };
              
              processedFiles.push(fileData);
            } catch (photoError: any) {
              console.error(`Error processing iCloud photo:`, photoError);
              errors.push(`Failed to process photo: ${photoError.message}`);
            }
          }
        }
        
        resolve({ 
          files: processedFiles,
          errors: errors.length > 0 ? errors : undefined
        });
      } catch (error: any) {
        console.error('Error synchronizing from iCloud:', error);
        resolve({
          files: processedFiles,
          errors: [...errors, error.message || 'Unknown error during iCloud synchronization']
        });
      }
    });
    
    iCloudClient.on('err', (error: any) => {
      console.error('iCloud error during synchronization:', error);
      resolve({
        files: [],
        errors: [error.message || 'iCloud connection error during synchronization']
      });
    });
    
    // Set a timeout in case the process hangs
    setTimeout(() => {
      if (processedFiles.length > 0) {
        resolve({ 
          files: processedFiles,
          errors: [...errors, 'iCloud synchronization timeout, partial results returned']
        });
      } else {
        resolve({ 
          files: [],
          errors: ['iCloud synchronization timeout, no files processed']
        });
      }
    }, 120000); // 2 minutes timeout
  });
}

async function getFilesRecursively(folder: any, currentPath: string = ''): Promise<any[]> {
  try {
    const items = await folder.items();
    let allFiles: any[] = [];
    
    for (const item of items) {
      const itemPath = currentPath ? `${currentPath}/${item.name}` : item.name;
      
      if (item.type === 'folder') {
        const subFiles = await getFilesRecursively(item, itemPath);
        allFiles = [...allFiles, ...subFiles];
      } else {
        allFiles.push({
          ...item,
          path: itemPath
        });
      }
    }
    
    return allFiles;
  } catch (error) {
    console.error('Error listing iCloud files recursively:', error);
    return [];
  }
}

export async function downloadiCloudFile(iCloudClient: any, fileId: string): Promise<Buffer | null> {
  try {
    // Find the file in the drive
    const file = await findFileById(iCloudClient.drive, fileId);
    
    if (!file) {
      console.error(`File with ID ${fileId} not found in iCloud Drive`);
      return null;
    }
    
    // Download the file
    const fileContent = await file.download();
    return Buffer.from(fileContent);
  } catch (error) {
    console.error('Error downloading file from iCloud:', error);
    return null;
  }
}

async function findFileById(folder: any, fileId: string): Promise<any | null> {
  try {
    const items = await folder.items();
    
    for (const item of items) {
      if (item.id === fileId) {
        return item;
      }
      
      if (item.type === 'folder') {
        const found = await findFileById(item, fileId);
        if (found) {
          return found;
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error finding file by ID in iCloud:', error);
    return null;
  }
}