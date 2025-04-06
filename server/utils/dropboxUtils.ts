import { Dropbox } from 'dropbox';
import fetch from 'isomorphic-fetch';
import type { Integration } from '@shared/schema';
import { files } from '@shared/schema';
import { File, FileCategory, FileSource } from '@shared/schema';
import path from 'path';

export interface DropboxConfig {
  accessToken: string;
  refreshToken?: string;
  appKey?: string;
  appSecret?: string;
}

export function createDropboxClientFromIntegration(integration: Integration): Dropbox | null {
  if (!integration || integration.type !== 'dropbox') {
    return null;
  }
  
  try {
    const config = integration.config as DropboxConfig;
    
    if (!config || !config.accessToken) {
      console.error('Invalid Dropbox integration config');
      return null;
    }
    
    return new Dropbox({ 
      accessToken: config.accessToken,
      refreshToken: config.refreshToken,
      clientId: config.appKey,
      clientSecret: config.appSecret,
      fetch
    });
  } catch (error) {
    console.error('Error creating Dropbox client:', error);
    return null;
  }
}

export async function testDropboxConnection(dbx: Dropbox): Promise<{ success: boolean; message?: string }> {
  try {
    const response = await dbx.usersGetCurrentAccount();
    return { 
      success: true, 
      message: `Connected to Dropbox as ${response.result.name.display_name}` 
    };
  } catch (error: any) {
    console.error('Dropbox connection test failed:', error);
    return { 
      success: false, 
      message: error.message || 'Failed to connect to Dropbox' 
    };
  }
}

export async function listDropboxFiles(dbx: Dropbox, folderPath: string = ''): Promise<any[]> {
  try {
    const response = await dbx.filesListFolder({
      path: folderPath,
      recursive: false,
      include_media_info: true
    });
    
    return response.result.entries;
  } catch (error) {
    console.error('Error listing Dropbox files:', error);
    return [];
  }
}

export function determineFileCategory(fileType: string, fileName: string): FileCategory {
  const fileExtension = path.extname(fileName).toLowerCase();
  
  // Document types
  if (['.doc', '.docx', '.pdf', '.txt', '.rtf', '.odt'].includes(fileExtension)) {
    return FileCategory.DOCUMENT;
  }
  
  // Code types
  if (['.js', '.ts', '.py', '.java', '.c', '.cpp', '.html', '.css', '.php', '.rb', '.go', '.rs'].includes(fileExtension)) {
    return FileCategory.CODE;
  }
  
  // Image types
  if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.svg', '.webp'].includes(fileExtension)) {
    return FileCategory.IMAGE;
  }
  
  // Video types
  if (['.mp4', '.mov', '.avi', '.wmv', '.flv', '.webm', '.mkv'].includes(fileExtension)) {
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

export async function synchronizeFromDropbox(
  dbx: Dropbox, 
  userId: number,
  storagePath: string = ''
): Promise<{ files: any[]; errors?: string[] }> {
  try {
    const errors: string[] = [];
    const dbxFiles = await listDropboxFiles(dbx, storagePath);
    const processedFiles: any[] = [];
    
    for (const entry of dbxFiles) {
      try {
        // Skip folders for now
        if (entry['.tag'] === 'folder') {
          continue;
        }
        
        const fileExtension = path.extname(entry.name).toLowerCase();
        const fileType = fileExtension.replace('.', '');
        const fileCategory = determineFileCategory(fileType, entry.name);
        
        const fileData = {
          userId,
          name: entry.name,
          path: entry.path_display,
          fileType,
          fileCategory,
          size: entry.size,
          lastModified: new Date(entry.server_modified),
          isProcessed: false,
          source: FileSource.DROPBOX,
          metadata: {
            id: entry.id,
            rev: entry.rev,
            contentHash: entry.content_hash,
            parentFolderId: entry.parent_shared_folder_id
          }
        };
        
        processedFiles.push(fileData);
      } catch (error: any) {
        console.error(`Error processing Dropbox file ${entry.name}:`, error);
        errors.push(`Failed to process ${entry.name}: ${error.message}`);
      }
    }
    
    return { 
      files: processedFiles,
      errors: errors.length > 0 ? errors : undefined
    };
  } catch (error: any) {
    console.error('Error synchronizing from Dropbox:', error);
    return {
      files: [],
      errors: [error.message || 'Unknown error during Dropbox synchronization']
    };
  }
}

export async function downloadDropboxFile(dbx: Dropbox, filePath: string): Promise<Buffer | null> {
  try {
    const response = await dbx.filesDownload({ path: filePath });
    // @ts-ignore - The Dropbox type definitions are incorrect
    const fileBlob = response.result.fileBlob;
    
    if (!fileBlob) {
      console.error('No file blob returned from Dropbox');
      return null;
    }
    
    // Convert blob to buffer
    const arrayBuffer = await fileBlob.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error('Error downloading file from Dropbox:', error);
    return null;
  }
}