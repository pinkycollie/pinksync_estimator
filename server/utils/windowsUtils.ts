import SFTPClient from 'ssh2-sftp-client';
import type { Integration } from '@shared/schema';
import { FileCategory, FileSource } from '@shared/schema';
import path from 'path';

export interface WindowsSFTPConfig {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
  passphrase?: string;
  basePath?: string;
}

export function createWindowsClientFromIntegration(integration: Integration): SFTPClient | null {
  if (!integration || integration.type !== 'windows') {
    return null;
  }
  
  try {
    const config = integration.config as WindowsSFTPConfig;
    
    if (!config || !config.host || !config.username) {
      console.error('Invalid Windows integration config');
      return null;
    }
    
    const client = new SFTPClient();
    
    return client;
  } catch (error) {
    console.error('Error creating Windows SFTP client:', error);
    return null;
  }
}

export async function testWindowsConnection(client: SFTPClient, config: WindowsSFTPConfig): Promise<{ success: boolean; message?: string }> {
  try {
    await client.connect({
      host: config.host,
      port: config.port || 22,
      username: config.username,
      password: config.password,
      privateKey: config.privateKey,
      passphrase: config.passphrase
    });
    
    // Test list files
    await client.list(config.basePath || '/');
    
    await client.end();
    
    return { 
      success: true, 
      message: `Connected to Windows at ${config.host} as ${config.username}` 
    };
  } catch (error: any) {
    console.error('Windows connection test failed:', error);
    
    // Close connection if open
    try {
      await client.end();
    } catch {}
    
    return { 
      success: false, 
      message: error.message || 'Failed to connect to Windows server' 
    };
  }
}

export function determineFileCategory(fileType: string, fileName: string): FileCategory {
  const fileExtension = path.extname(fileName).toLowerCase();
  
  // Document types
  if (['.doc', '.docx', '.pdf', '.txt', '.rtf', '.odt'].includes(fileExtension)) {
    return FileCategory.DOCUMENT;
  }
  
  // Code types
  if (['.js', '.ts', '.py', '.java', '.c', '.cpp', '.html', '.css', '.php', '.rb', '.go', '.rs', '.bat', '.ps1'].includes(fileExtension)) {
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

export async function synchronizeFromWindows(
  client: SFTPClient,
  config: WindowsSFTPConfig,
  userId: number
): Promise<{ files: any[]; errors?: string[] }> {
  try {
    const errors: string[] = [];
    const processedFiles: any[] = [];
    
    await client.connect({
      host: config.host,
      port: config.port || 22,
      username: config.username,
      password: config.password,
      privateKey: config.privateKey,
      passphrase: config.passphrase
    });
    
    const basePath = config.basePath || '/';
    const remoteFiles = await listFilesRecursively(client, basePath);
    
    for (const fileInfo of remoteFiles) {
      try {
        const relativePath = fileInfo.path.replace(basePath, '');
        const fileExtension = path.extname(fileInfo.name).toLowerCase();
        const fileType = fileExtension.replace('.', '');
        const fileCategory = determineFileCategory(fileType, fileInfo.name);
        
        const fileData = {
          userId,
          name: fileInfo.name,
          path: relativePath,
          fileType,
          fileCategory,
          size: fileInfo.size,
          lastModified: new Date(fileInfo.modifyTime),
          isProcessed: false,
          source: FileSource.WINDOWS,
          sourceId: relativePath, // Use the relative path as a unique identifier
          metadata: {
            absolutePath: fileInfo.path,
            permissions: fileInfo.rights,
            owner: fileInfo.owner,
            group: fileInfo.group,
            type: fileInfo.type
          }
        };
        
        processedFiles.push(fileData);
      } catch (fileError: any) {
        console.error(`Error processing Windows file ${fileInfo.name}:`, fileError);
        errors.push(`Failed to process ${fileInfo.name}: ${fileError.message}`);
      }
    }
    
    await client.end();
    
    return { 
      files: processedFiles,
      errors: errors.length > 0 ? errors : undefined
    };
  } catch (error: any) {
    console.error('Error synchronizing from Windows:', error);
    
    // Close connection if open
    try {
      await client.end();
    } catch {}
    
    return {
      files: [],
      errors: [error.message || 'Unknown error during Windows synchronization']
    };
  }
}

async function listFilesRecursively(client: SFTPClient, remotePath: string, fileList: any[] = []): Promise<any[]> {
  try {
    const items = await client.list(remotePath);
    
    for (const item of items) {
      const itemPath = path.posix.join(remotePath, item.name);
      
      // Skip system folders and files
      if (['$Recycle.Bin', 'System Volume Information', 'Windows', 'Program Files', 'Program Files (x86)'].includes(item.name)) {
        continue;
      }
      
      if (item.type === 'd') {
        // Directory, recurse
        await listFilesRecursively(client, itemPath, fileList);
      } else if (item.type === '-') {
        // Regular file
        fileList.push({
          ...item,
          path: itemPath
        });
      }
    }
    
    return fileList;
  } catch (error) {
    console.error(`Error listing files in ${remotePath}:`, error);
    return fileList;
  }
}

export async function downloadWindowsFile(client: SFTPClient, config: WindowsSFTPConfig, filePath: string): Promise<Buffer | null> {
  try {
    await client.connect({
      host: config.host,
      port: config.port || 22,
      username: config.username,
      password: config.password,
      privateKey: config.privateKey,
      passphrase: config.passphrase
    });
    
    const absolutePath = config.basePath 
      ? path.posix.join(config.basePath, filePath.startsWith('/') ? filePath.substring(1) : filePath)
      : filePath;
      
    const fileStream = await client.get(absolutePath);
    
    await client.end();
    
    return Buffer.from(fileStream);
  } catch (error) {
    console.error('Error downloading file from Windows:', error);
    
    // Close connection if open
    try {
      await client.end();
    } catch {}
    
    return null;
  }
}