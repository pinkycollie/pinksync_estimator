import { Dropbox, files as DropboxFiles } from 'dropbox';
import SFTPClient from 'ssh2-sftp-client';
import fetch from 'node-fetch';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { storage } from '../storage';
import { 
  SyncStatus,
  PlatformConnection,
  PlatformType,
  SyncDirection,
  InsertSyncOperation,
  SyncItem,
  InsertSyncItem
} from '../../shared/platformSyncSchema';
import { processFile } from './documentUtils';

/**
 * Type definitions for file metadata across different platforms
 */
type FileMetadata = {
  path: string;
  size: number;
  isDirectory: boolean;
  modifiedTime: Date;
  hash?: string;
  mimeType?: string;
};

type ConflictResolution = 'local' | 'remote' | 'rename' | 'manual';

/**
 * Platform Sync Manager
 * Manages file synchronization across multiple platforms
 */
class PlatformSyncManager {
  private connections: Map<string, PlatformConnection> = new Map();
  private activeOperations: Map<string, boolean> = new Map();
  private readonly uploadDir: string;
  
  constructor() {
    this.uploadDir = path.join(process.cwd(), 'uploads');
    this.ensureDirectoryExists(this.uploadDir);
  }
  
  /**
   * Initialize the sync manager with existing connections
   */
  async initialize(): Promise<void> {
    try {
      const connections = await storage.getAllPlatformConnections();
      
      for (const connection of connections) {
        this.connections.set(connection.id, connection);
      }
      
      console.log(`Initialized PlatformSyncManager with ${connections.length} connections`);
    } catch (error) {
      console.error('Error initializing PlatformSyncManager:', error);
    }
  }
  
  /**
   * Add a new connection to sync manager
   */
  async addConnection(connection: PlatformConnection): Promise<void> {
    this.connections.set(connection.id, connection);
  }
  
  /**
   * Update an existing connection
   */
  async updateConnection(id: string, updates: Partial<PlatformConnection>): Promise<void> {
    const connection = this.connections.get(id);
    if (!connection) {
      throw new Error(`Connection with ID ${id} not found`);
    }
    
    this.connections.set(id, { ...connection, ...updates });
  }
  
  /**
   * Delete a connection
   */
  async deleteConnection(id: string): Promise<void> {
    this.connections.delete(id);
  }
  
  /**
   * Test a connection to verify credentials and access
   */
  async testConnection(id: string): Promise<boolean> {
    const connection = this.connections.get(id);
    if (!connection) {
      throw new Error(`Connection with ID ${id} not found`);
    }
    
    try {
      switch (connection.platform) {
        case PlatformType.DROPBOX:
          return await this.testDropboxConnection(connection);
        case PlatformType.UBUNTU:
          return await this.testSftpConnection(connection);
        case PlatformType.WINDOWS:
          return await this.testSftpConnection(connection);
        case PlatformType.IOS:
          return await this.testWebdavConnection(connection);
        case PlatformType.WEB:
          return true; // Web storage is local, so always works
        default:
          return false;
      }
    } catch (error) {
      console.error(`Error testing connection ${id}:`, error);
      return false;
    }
  }
  
  /**
   * Start a sync operation for a connection
   */
  async startSync(id: string): Promise<InsertSyncOperation | null> {
    const connection = this.connections.get(id);
    if (!connection) {
      throw new Error(`Connection with ID ${id} not found`);
    }
    
    // Check if a sync is already in progress
    if (this.activeOperations.get(id)) {
      throw new Error(`Sync already in progress for connection ${id}`);
    }
    
    // Mark as active
    this.activeOperations.set(id, true);
    
    // Create a new sync operation
    const operation: InsertSyncOperation = {
      id: uuidv4(),
      connectionId: id,
      status: SyncStatus.IN_PROGRESS,
      startTime: new Date(),
      endTime: null,
      itemsProcessed: 0,
      itemsTotal: null,
      bytesTransferred: 0,
      errors: [],
      conflictItems: []
    };
    
    // Save operation to storage
    const savedOperation = await storage.createSyncOperation(operation);
    
    // Start sync process in background
    this.runSyncProcess(id, savedOperation.id)
      .catch(error => console.error(`Error in sync process for ${id}:`, error));
    
    return savedOperation;
  }
  
  /**
   * Resolve a sync conflict for an item
   */
  async resolveConflict(itemId: string, resolution: ConflictResolution): Promise<SyncItem | null> {
    const item = await storage.getSyncItem(itemId);
    if (!item) {
      throw new Error(`Sync item with ID ${itemId} not found`);
    }
    
    try {
      const connection = this.connections.get(item.connectionId);
      if (!connection) {
        throw new Error(`Connection with ID ${item.connectionId} not found`);
      }
      
      // Update the item with the resolution
      const updatedItem = await storage.updateSyncItem(itemId, {
        conflictResolution: resolution,
        syncStatus: SyncStatus.PENDING // Mark for re-sync
      });
      
      if (!updatedItem) {
        throw new Error(`Failed to update sync item ${itemId}`);
      }
      
      // Perform the resolution action based on the choice
      switch (resolution) {
        case 'local':
          // Keep local version - upload to remote
          if (!item.isDirectory) {
            await this.uploadFileToRemote(connection, updatedItem);
          }
          break;
        case 'remote':
          // Keep remote version - download to local
          if (!item.isDirectory) {
            await this.downloadFileFromRemote(connection, updatedItem);
          }
          break;
        case 'rename':
          // Rename local file and keep both versions
          if (!item.isDirectory) {
            await this.handleRenameResolution(connection, updatedItem);
          }
          break;
        case 'manual':
          // Manual resolution - just mark as resolved
          break;
      }
      
      // Update the item status after resolution
      return await storage.updateSyncItem(itemId, {
        syncStatus: SyncStatus.COMPLETED,
        conflict: false
      });
      
    } catch (error) {
      console.error(`Error resolving conflict for item ${itemId}:`, error);
      return null;
    }
  }
  
  /**
   * Run the actual sync process for a connection
   * This runs in the background after startSync is called
   */
  private async runSyncProcess(connectionId: string, operationId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      await this.failOperation(operationId, 'Connection not found');
      return;
    }
    
    try {
      // Get remote files
      const remoteFiles = await this.listRemoteFiles(connection);
      
      // Get existing items from storage
      const existingItems = await storage.getSyncItems(connectionId);
      const existingItemsByPath = new Map<string, SyncItem>();
      for (const item of existingItems) {
        existingItemsByPath.set(item.path, item);
      }
      
      // Create local directory for this connection if it doesn't exist
      const localDir = this.getLocalDirectoryPath(connection);
      this.ensureDirectoryExists(localDir);
      
      // Get local files
      const localFiles = await this.listLocalFiles(connection);
      
      // Calculate items to sync
      const itemsToCreate: InsertSyncItem[] = [];
      const itemsToUpdate: Array<{ id: string, updates: Partial<InsertSyncItem> }> = [];
      const totalItems = remoteFiles.length + localFiles.length;
      
      // Update operation with total items
      await storage.updateSyncOperation(operationId, {
        itemsTotal: totalItems
      });
      
      // Process based on sync direction
      if (connection.syncDirection === SyncDirection.DOWNLOAD || 
          connection.syncDirection === SyncDirection.BIDIRECTIONAL) {
        // Process remote files (download to local)
        for (const remoteFile of remoteFiles) {
          const existingItem = existingItemsByPath.get(remoteFile.path);
          
          if (!existingItem) {
            // New file to track
            itemsToCreate.push({
              id: uuidv4(),
              connectionId,
              path: remoteFile.path,
              isDirectory: remoteFile.isDirectory,
              size: remoteFile.size,
              mimeType: remoteFile.mimeType || null,
              hash: remoteFile.hash || null,
              lastSyncedAt: null,
              syncStatus: SyncStatus.PENDING,
              conflict: false,
              localModified: null,
              remoteModified: remoteFile.modifiedTime,
              conflictResolution: null
            });
          } else {
            // Check for changes
            const hasChanged = existingItem.hash !== remoteFile.hash ||
                              (existingItem.remoteModified && remoteFile.modifiedTime > existingItem.remoteModified);
            
            if (hasChanged) {
              // Item has changed - update record
              itemsToUpdate.push({
                id: existingItem.id,
                updates: {
                  size: remoteFile.size,
                  mimeType: remoteFile.mimeType || null,
                  hash: remoteFile.hash || null,
                  remoteModified: remoteFile.modifiedTime,
                  syncStatus: SyncStatus.PENDING
                }
              });
            }
          }
        }
      }
      
      if (connection.syncDirection === SyncDirection.UPLOAD || 
          connection.syncDirection === SyncDirection.BIDIRECTIONAL) {
        // Process local files (upload to remote)
        for (const localFile of localFiles) {
          const existingItem = existingItemsByPath.get(localFile.path);
          
          if (!existingItem) {
            // New file to track
            itemsToCreate.push({
              id: uuidv4(),
              connectionId,
              path: localFile.path,
              isDirectory: localFile.isDirectory,
              size: localFile.size,
              mimeType: localFile.mimeType || null,
              hash: localFile.hash || null,
              lastSyncedAt: null,
              syncStatus: SyncStatus.PENDING,
              conflict: false,
              localModified: localFile.modifiedTime,
              remoteModified: null,
              conflictResolution: null
            });
          } else {
            // Check for changes
            const hasChanged = existingItem.hash !== localFile.hash ||
                              (existingItem.localModified && localFile.modifiedTime > existingItem.localModified);
            
            if (hasChanged) {
              // Item has changed - update record
              itemsToUpdate.push({
                id: existingItem.id,
                updates: {
                  size: localFile.size,
                  mimeType: localFile.mimeType || null,
                  hash: localFile.hash || null,
                  localModified: localFile.modifiedTime,
                  syncStatus: SyncStatus.PENDING
                }
              });
            }
          }
        }
      }
      
      // Process bidirectional conflicts
      if (connection.syncDirection === SyncDirection.BIDIRECTIONAL) {
        this.detectConflicts(itemsToUpdate, existingItems, connectionId, operationId);
      }
      
      // Save all changes to the database in batches
      if (itemsToCreate.length > 0) {
        await storage.batchCreateSyncItems(itemsToCreate);
      }
      
      if (itemsToUpdate.length > 0) {
        await storage.batchUpdateSyncItems(itemsToUpdate);
      }
      
      // Process actual file transfers
      const allItems = await storage.getSyncItems(connectionId);
      await this.processFileTransfers(connection, allItems, operationId);
      
      // Update the operation as completed
      await storage.updateSyncOperation(operationId, {
        status: SyncStatus.COMPLETED,
        endTime: new Date()
      });
    } catch (error) {
      await this.failOperation(operationId, `Sync failed: ${error}`);
    } finally {
      // Mark as no longer active
      this.activeOperations.set(connectionId, false);
    }
  }
  
  /**
   * Detect and mark conflicts in bidirectional sync
   */
  private async detectConflicts(
    itemsToUpdate: Array<{ id: string, updates: Partial<InsertSyncItem> }>,
    existingItems: SyncItem[],
    connectionId: string,
    operationId: string
  ): Promise<void> {
    const conflictItems: string[] = [];
    
    for (const item of existingItems) {
      // Skip directories for conflict detection
      if (item.isDirectory) continue;
      
      // Check if both local and remote have modifications
      if (item.localModified && item.remoteModified) {
        // Find if this item is being updated
        const updateIndex = itemsToUpdate.findIndex(u => u.id === item.id);
        
        if (updateIndex >= 0) {
          // Item is being updated - mark as conflict
          itemsToUpdate[updateIndex].updates.conflict = true;
          itemsToUpdate[updateIndex].updates.syncStatus = SyncStatus.CONFLICT;
          conflictItems.push(item.id);
        } else {
          // Item not being updated but may still have conflict from previous sync
          if (!item.conflict) {
            // Check timestamps to see if there might be a conflict
            if (Math.abs(item.localModified.getTime() - item.remoteModified.getTime()) > 60000) {
              // More than 1 minute difference - likely a conflict
              itemsToUpdate.push({
                id: item.id,
                updates: {
                  conflict: true,
                  syncStatus: SyncStatus.CONFLICT
                }
              });
              conflictItems.push(item.id);
            }
          }
        }
      }
    }
    
    // Update operation with conflict items
    if (conflictItems.length > 0) {
      await storage.updateSyncOperation(operationId, {
        conflictItems,
        status: SyncStatus.CONFLICT
      });
    }
  }
  
  /**
   * Process all file transfers for items that need syncing
   */
  private async processFileTransfers(
    connection: PlatformConnection,
    items: SyncItem[],
    operationId: string
  ): Promise<void> {
    let itemsProcessed = 0;
    let bytesTransferred = 0;
    const errors: { path: string, message: string }[] = [];
    
    for (const item of items) {
      // Skip items with conflicts
      if (item.conflict) {
        continue;
      }
      
      // Skip items that don't need syncing
      if (item.syncStatus !== SyncStatus.PENDING) {
        continue;
      }
      
      try {
        if (connection.syncDirection === SyncDirection.DOWNLOAD || 
            connection.syncDirection === SyncDirection.BIDIRECTIONAL) {
          // Handle remote to local transfer (download)
          if (!item.isDirectory && item.remoteModified) {
            // Only download if we have a remote modification time (indicates file exists remotely)
            const downloadResult = await this.downloadFileFromRemote(connection, item);
            bytesTransferred += downloadResult.bytesTransferred;
          }
        }
        
        if (connection.syncDirection === SyncDirection.UPLOAD || 
            connection.syncDirection === SyncDirection.BIDIRECTIONAL) {
          // Handle local to remote transfer (upload)
          if (!item.isDirectory && item.localModified) {
            // Only upload if we have a local modification time (indicates file exists locally)
            const uploadResult = await this.uploadFileToRemote(connection, item);
            bytesTransferred += uploadResult.bytesTransferred;
          }
        }
        
        // Mark item as synced
        await storage.updateSyncItem(item.id, {
          lastSyncedAt: new Date(),
          syncStatus: SyncStatus.COMPLETED
        });
        
        itemsProcessed++;
        
        // Update operation periodically
        if (itemsProcessed % 10 === 0) {
          await storage.updateSyncOperation(operationId, {
            itemsProcessed,
            bytesTransferred
          });
        }
      } catch (error) {
        console.error(`Error syncing item ${item.path}:`, error);
        
        // Mark as failed
        await storage.updateSyncItem(item.id, {
          syncStatus: SyncStatus.FAILED
        });
        
        // Record error
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push({ path: item.path, message: errorMessage });
      }
    }
    
    // Final operation update
    await storage.updateSyncOperation(operationId, {
      itemsProcessed,
      bytesTransferred,
      errors
    });
  }
  
  /**
   * Upload a file to the remote platform
   */
  private async uploadFileToRemote(
    connection: PlatformConnection,
    item: SyncItem
  ): Promise<{ bytesTransferred: number }> {
    const localPath = this.getLocalFilePath(connection, item.path);
    
    if (!fs.existsSync(localPath)) {
      throw new Error(`Local file does not exist: ${localPath}`);
    }
    
    const fileStats = fs.statSync(localPath);
    const fileContent = fs.readFileSync(localPath);
    
    switch (connection.platform) {
      case PlatformType.DROPBOX:
        return await this.uploadToDropbox(connection, item.path, fileContent);
      case PlatformType.UBUNTU:
      case PlatformType.WINDOWS:
        return await this.uploadToSftp(connection, item.path, localPath);
      case PlatformType.IOS:
        return await this.uploadToWebdav(connection, item.path, fileContent);
      case PlatformType.WEB:
        // No remote upload needed for web storage
        return { bytesTransferred: 0 };
      default:
        throw new Error(`Unsupported platform: ${connection.platform}`);
    }
  }
  
  /**
   * Download a file from the remote platform
   */
  private async downloadFileFromRemote(
    connection: PlatformConnection,
    item: SyncItem
  ): Promise<{ bytesTransferred: number }> {
    const localPath = this.getLocalFilePath(connection, item.path);
    this.ensureDirectoryExists(path.dirname(localPath));
    
    switch (connection.platform) {
      case PlatformType.DROPBOX:
        return await this.downloadFromDropbox(connection, item.path, localPath);
      case PlatformType.UBUNTU:
      case PlatformType.WINDOWS:
        return await this.downloadFromSftp(connection, item.path, localPath);
      case PlatformType.IOS:
        return await this.downloadFromWebdav(connection, item.path, localPath);
      case PlatformType.WEB:
        // No remote download needed for web storage
        return { bytesTransferred: 0 };
      default:
        throw new Error(`Unsupported platform: ${connection.platform}`);
    }
  }
  
  /**
   * Handle the "rename" conflict resolution
   */
  private async handleRenameResolution(
    connection: PlatformConnection,
    item: SyncItem
  ): Promise<void> {
    const localPath = this.getLocalFilePath(connection, item.path);
    const filename = path.basename(localPath);
    const directory = path.dirname(localPath);
    const extension = path.extname(filename);
    const nameWithoutExt = path.basename(filename, extension);
    
    // Create new filename with conflict suffix
    const newFilename = `${nameWithoutExt} (conflict-${Date.now()})${extension}`;
    const newPath = path.join(directory, newFilename);
    
    // Create new path in the sync item format
    const itemDirectory = path.dirname(item.path);
    const newItemPath = path.join(itemDirectory, newFilename).replace(/\\/g, '/');
    
    // Download the remote file as a new file
    if (item.remoteModified) {
      // Create a temporary sync item with the new path
      const tempItem: SyncItem = {
        ...item,
        path: newItemPath
      };
      
      // Download the remote file to the new path
      await this.downloadFileFromRemote(connection, tempItem);
      
      // Create a new sync item for the renamed file
      await storage.createSyncItem({
        id: uuidv4(),
        connectionId: connection.id,
        path: newItemPath,
        isDirectory: item.isDirectory,
        size: item.size,
        mimeType: item.mimeType,
        hash: item.hash,
        lastSyncedAt: new Date(),
        syncStatus: SyncStatus.COMPLETED,
        conflict: false,
        localModified: new Date(),
        remoteModified: item.remoteModified,
        conflictResolution: null
      });
    }
  }
  
  /**
   * Get a list of files from a Dropbox account
   */
  private async listRemoteFiles(connection: PlatformConnection): Promise<FileMetadata[]> {
    switch (connection.platform) {
      case PlatformType.DROPBOX:
        return await this.listDropboxFiles(connection);
      case PlatformType.UBUNTU:
      case PlatformType.WINDOWS:
        return await this.listSftpFiles(connection);
      case PlatformType.IOS:
        return await this.listWebdavFiles(connection);
      case PlatformType.WEB:
        // Web storage is local-only
        return [];
      default:
        throw new Error(`Unsupported platform: ${connection.platform}`);
    }
  }
  
  /**
   * List files in the local directory for a connection
   */
  private async listLocalFiles(connection: PlatformConnection): Promise<FileMetadata[]> {
    const localDir = this.getLocalDirectoryPath(connection);
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
      return [];
    }
    
    return await this.scanDirectory(localDir, connection.rootPath);
  }
  
  /**
   * Recursively scan a local directory
   */
  private async scanDirectory(dir: string, rootPath: string, relativePath: string = ''): Promise<FileMetadata[]> {
    const files: FileMetadata[] = [];
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stats = fs.statSync(fullPath);
      const itemRelativePath = path.join(relativePath, item).replace(/\\/g, '/');
      const normalizedPath = path.join(rootPath, itemRelativePath).replace(/\\/g, '/');
      
      if (stats.isDirectory()) {
        // Add directory entry
        files.push({
          path: normalizedPath,
          size: 0,
          isDirectory: true,
          modifiedTime: stats.mtime
        });
        
        // Scan subdirectory recursively
        const subFiles = await this.scanDirectory(fullPath, rootPath, itemRelativePath);
        files.push(...subFiles);
      } else {
        // Generate hash for the file
        const hash = await this.getFileHash(fullPath);
        
        // Detect mime type
        const mimeType = this.getMimeType(item);
        
        // Add file entry
        files.push({
          path: normalizedPath,
          size: stats.size,
          isDirectory: false,
          modifiedTime: stats.mtime,
          hash,
          mimeType
        });
      }
    }
    
    return files;
  }
  
  /**
   * Calculate a hash for a file
   */
  private async getFileHash(filePath: string): Promise<string> {
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
  }
  
  /**
   * Get the mime type for a file based on its extension
   */
  private getMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    
    // Map common extensions to mime types
    const mimeTypes: Record<string, string> = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.txt': 'text/plain',
      '.md': 'text/markdown',
      '.csv': 'text/csv',
      '.zip': 'application/zip',
      '.mp3': 'audio/mpeg',
      '.mp4': 'video/mp4',
      '.wav': 'audio/wav',
      '.xml': 'application/xml',
      '.py': 'text/x-python',
      '.rb': 'text/x-ruby',
      '.java': 'text/x-java',
      '.c': 'text/x-c',
      '.cpp': 'text/x-c++',
      '.php': 'application/x-php'
    };
    
    return mimeTypes[ext] || 'application/octet-stream';
  }
  
  /**
   * Test a Dropbox connection
   */
  private async testDropboxConnection(connection: PlatformConnection): Promise<boolean> {
    try {
      const dbx = this.getDropboxClient(connection);
      const result = await dbx.usersGetCurrentAccount();
      return true;
    } catch (error) {
      console.error('Dropbox connection test failed:', error);
      return false;
    }
  }
  
  /**
   * Test an SFTP connection (Ubuntu/Windows)
   */
  private async testSftpConnection(connection: PlatformConnection): Promise<boolean> {
    const client = new SFTPClient();
    
    try {
      await client.connect({
        host: connection.credentials.host,
        port: connection.credentials.port || 22,
        username: connection.credentials.username,
        password: connection.credentials.password,
        privateKey: connection.credentials.privateKey
      });
      
      // Try to access the remote directory
      await client.list(connection.rootPath);
      
      await client.end();
      return true;
    } catch (error) {
      console.error('SFTP connection test failed:', error);
      
      if (client.sftp) {
        await client.end();
      }
      
      return false;
    }
  }
  
  /**
   * Test a WebDAV connection (iOS)
   */
  private async testWebdavConnection(connection: PlatformConnection): Promise<boolean> {
    try {
      const headers: Record<string, string> = {
        'Depth': '1'
      };
      
      // Add authentication
      if (connection.credentials.username && connection.credentials.password) {
        const authString = `${connection.credentials.username}:${connection.credentials.password}`;
        headers['Authorization'] = `Basic ${Buffer.from(authString).toString('base64')}`;
      }
      
      // Make a PROPFIND request to list files
      const response = await fetch(`${connection.credentials.url}${connection.rootPath}`, {
        method: 'PROPFIND',
        headers
      });
      
      return response.status === 207; // 207 is the success status for WebDAV multistatus
    } catch (error) {
      console.error('WebDAV connection test failed:', error);
      return false;
    }
  }
  
  /**
   * List files from Dropbox
   */
  private async listDropboxFiles(connection: PlatformConnection): Promise<FileMetadata[]> {
    const dbx = this.getDropboxClient(connection);
    const files: FileMetadata[] = [];
    let hasMore = true;
    let cursor: string | undefined;
    
    try {
      // Initial list folder request
      const result = await dbx.filesListFolder({
        path: connection.rootPath,
        recursive: true
      });
      
      // Process the entries
      for (const entry of result.result.entries) {
        if (entry['.tag'] === 'file') {
          files.push({
            path: entry.path_display || entry.path_lower || '',
            size: (entry as DropboxFiles.FileMetadata).size,
            isDirectory: false,
            modifiedTime: new Date((entry as DropboxFiles.FileMetadata).server_modified),
            hash: (entry as DropboxFiles.FileMetadata).content_hash
          });
        } else if (entry['.tag'] === 'folder') {
          files.push({
            path: entry.path_display || entry.path_lower || '',
            size: 0,
            isDirectory: true,
            modifiedTime: new Date()
          });
        }
      }
      
      hasMore = result.result.has_more;
      cursor = result.result.cursor;
      
      // Continue if there are more entries
      while (hasMore && cursor) {
        const continuedResult = await dbx.filesListFolderContinue({ cursor });
        
        for (const entry of continuedResult.result.entries) {
          if (entry['.tag'] === 'file') {
            files.push({
              path: entry.path_display || entry.path_lower || '',
              size: (entry as DropboxFiles.FileMetadata).size,
              isDirectory: false,
              modifiedTime: new Date((entry as DropboxFiles.FileMetadata).server_modified),
              hash: (entry as DropboxFiles.FileMetadata).content_hash
            });
          } else if (entry['.tag'] === 'folder') {
            files.push({
              path: entry.path_display || entry.path_lower || '',
              size: 0,
              isDirectory: true,
              modifiedTime: new Date()
            });
          }
        }
        
        hasMore = continuedResult.result.has_more;
        cursor = continuedResult.result.cursor;
      }
      
      return files;
    } catch (error) {
      console.error('Error listing Dropbox files:', error);
      throw error;
    }
  }
  
  /**
   * List files via SFTP (Ubuntu/Windows)
   */
  private async listSftpFiles(connection: PlatformConnection): Promise<FileMetadata[]> {
    const client = new SFTPClient();
    const files: FileMetadata[] = [];
    
    try {
      await client.connect({
        host: connection.credentials.host,
        port: connection.credentials.port || 22,
        username: connection.credentials.username,
        password: connection.credentials.password,
        privateKey: connection.credentials.privateKey
      });
      
      // Recursive function to scan directories
      const scanSftpDir = async (remotePath: string, relativePath: string = ''): Promise<void> => {
        const list = await client.list(remotePath);
        
        for (const item of list) {
          const itemName = item.name;
          const itemPath = path.posix.join(remotePath, itemName);
          const normalizedPath = path.posix.join(connection.rootPath, relativePath, itemName);
          
          if (item.type === 'd') {
            // Directory
            files.push({
              path: normalizedPath,
              size: 0,
              isDirectory: true,
              modifiedTime: item.modifyTime || new Date()
            });
            
            // Recursively scan subdirectory
            await scanSftpDir(itemPath, path.posix.join(relativePath, itemName));
          } else if (item.type === '-') {
            // Regular file
            files.push({
              path: normalizedPath,
              size: item.size,
              isDirectory: false,
              modifiedTime: item.modifyTime || new Date(),
              mimeType: this.getMimeType(itemName)
            });
          }
        }
      };
      
      // Start scanning from the root path
      await scanSftpDir(connection.rootPath);
      
      await client.end();
      return files;
    } catch (error) {
      console.error('Error listing SFTP files:', error);
      
      if (client.sftp) {
        await client.end();
      }
      
      throw error;
    }
  }
  
  /**
   * List files via WebDAV (iOS)
   */
  private async listWebdavFiles(connection: PlatformConnection): Promise<FileMetadata[]> {
    const files: FileMetadata[] = [];
    
    try {
      const scanWebdavDir = async (remotePath: string): Promise<void> => {
        const headers: Record<string, string> = {
          'Depth': '1',
          'Content-Type': 'application/xml'
        };
        
        // Add authentication
        if (connection.credentials.username && connection.credentials.password) {
          const authString = `${connection.credentials.username}:${connection.credentials.password}`;
          headers['Authorization'] = `Basic ${Buffer.from(authString).toString('base64')}`;
        }
        
        // Make a PROPFIND request to list files
        const response = await fetch(`${connection.credentials.url}${remotePath}`, {
          method: 'PROPFIND',
          headers
        });
        
        if (response.status !== 207) {
          throw new Error(`WebDAV error: ${response.status} ${response.statusText}`);
        }
        
        const text = await response.text();
        
        // Parse the XML response (simplified version)
        // In a real implementation, use a proper XML parser
        const responseXml = text;
        const responses = responseXml.split('<d:response>').slice(1);
        
        for (const responseText of responses) {
          const hrefMatch = responseText.match(/<d:href>(.*?)<\/d:href>/);
          const isCollection = responseText.includes('<d:resourcetype><d:collection/></d:resourcetype>');
          const contentLengthMatch = responseText.match(/<d:getcontentlength>(.*?)<\/d:getcontentlength>/);
          const lastModifiedMatch = responseText.match(/<d:getlastmodified>(.*?)<\/d:getlastmodified>/);
          
          if (hrefMatch) {
            let href = hrefMatch[1];
            // Remove the base URL part if present
            const urlObj = new URL(connection.credentials.url);
            const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
            if (href.startsWith(baseUrl)) {
              href = href.substring(baseUrl.length);
            }
            
            // Skip the current directory entry
            if (href === remotePath || href === `${remotePath}/`) {
              continue;
            }
            
            const size = contentLengthMatch ? parseInt(contentLengthMatch[1], 10) : 0;
            const modifiedTime = lastModifiedMatch ? new Date(lastModifiedMatch[1]) : new Date();
            
            files.push({
              path: href,
              size,
              isDirectory: isCollection,
              modifiedTime,
              mimeType: isCollection ? undefined : this.getMimeType(href)
            });
            
            // Recursively scan subdirectories
            if (isCollection && !href.includes('..')) {
              await scanWebdavDir(href);
            }
          }
        }
      };
      
      // Start scanning from the root path
      await scanWebdavDir(connection.rootPath);
      
      return files;
    } catch (error) {
      console.error('Error listing WebDAV files:', error);
      throw error;
    }
  }
  
  /**
   * Upload a file to Dropbox
   */
  private async uploadToDropbox(
    connection: PlatformConnection,
    remotePath: string,
    fileContent: Buffer
  ): Promise<{ bytesTransferred: number }> {
    try {
      const dbx = this.getDropboxClient(connection);
      
      // Ensure the path is formatted correctly for Dropbox
      if (!remotePath.startsWith('/')) {
        remotePath = '/' + remotePath;
      }
      
      const result = await dbx.filesUpload({
        path: remotePath,
        contents: fileContent,
        mode: { '.tag': 'overwrite' }
      });
      
      return { bytesTransferred: fileContent.length };
    } catch (error) {
      console.error(`Error uploading to Dropbox ${remotePath}:`, error);
      throw error;
    }
  }
  
  /**
   * Download a file from Dropbox
   */
  private async downloadFromDropbox(
    connection: PlatformConnection,
    remotePath: string,
    localPath: string
  ): Promise<{ bytesTransferred: number }> {
    try {
      const dbx = this.getDropboxClient(connection);
      
      // Ensure the path is formatted correctly for Dropbox
      if (!remotePath.startsWith('/')) {
        remotePath = '/' + remotePath;
      }
      
      const result = await dbx.filesDownload({ path: remotePath });
      
      // Write file to disk
      if ('fileBinary' in result.result) {
        fs.writeFileSync(localPath, result.result.fileBinary as Buffer);
        
        // Process the file (e.g., for document indexing)
        await processFile(localPath);
        
        return { bytesTransferred: (result.result as any).size || 0 };
      } else {
        throw new Error('Failed to download file from Dropbox');
      }
    } catch (error) {
      console.error(`Error downloading from Dropbox ${remotePath}:`, error);
      throw error;
    }
  }
  
  /**
   * Upload a file via SFTP (Ubuntu/Windows)
   */
  private async uploadToSftp(
    connection: PlatformConnection,
    remotePath: string,
    localPath: string
  ): Promise<{ bytesTransferred: number }> {
    const client = new SFTPClient();
    
    try {
      await client.connect({
        host: connection.credentials.host,
        port: connection.credentials.port || 22,
        username: connection.credentials.username,
        password: connection.credentials.password,
        privateKey: connection.credentials.privateKey
      });
      
      // Ensure the remote directory exists
      const remoteDir = path.posix.dirname(remotePath);
      await this.ensureRemoteSftpDirectory(client, remoteDir);
      
      // Upload the file
      const fileStats = fs.statSync(localPath);
      await client.fastPut(localPath, remotePath);
      
      await client.end();
      return { bytesTransferred: fileStats.size };
    } catch (error) {
      console.error(`Error uploading to SFTP ${remotePath}:`, error);
      
      if (client.sftp) {
        await client.end();
      }
      
      throw error;
    }
  }
  
  /**
   * Download a file via SFTP (Ubuntu/Windows)
   */
  private async downloadFromSftp(
    connection: PlatformConnection,
    remotePath: string,
    localPath: string
  ): Promise<{ bytesTransferred: number }> {
    const client = new SFTPClient();
    
    try {
      await client.connect({
        host: connection.credentials.host,
        port: connection.credentials.port || 22,
        username: connection.credentials.username,
        password: connection.credentials.password,
        privateKey: connection.credentials.privateKey
      });
      
      // Get file stats to determine size
      const stats = await client.stat(remotePath);
      
      // Ensure local directory exists
      this.ensureDirectoryExists(path.dirname(localPath));
      
      // Download the file
      await client.fastGet(remotePath, localPath);
      
      // Process the file (e.g., for document indexing)
      await processFile(localPath);
      
      await client.end();
      return { bytesTransferred: stats.size };
    } catch (error) {
      console.error(`Error downloading from SFTP ${remotePath}:`, error);
      
      if (client.sftp) {
        await client.end();
      }
      
      throw error;
    }
  }
  
  /**
   * Upload a file via WebDAV (iOS)
   */
  private async uploadToWebdav(
    connection: PlatformConnection,
    remotePath: string,
    fileContent: Buffer
  ): Promise<{ bytesTransferred: number }> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/octet-stream'
      };
      
      // Add authentication
      if (connection.credentials.username && connection.credentials.password) {
        const authString = `${connection.credentials.username}:${connection.credentials.password}`;
        headers['Authorization'] = `Basic ${Buffer.from(authString).toString('base64')}`;
      }
      
      // Make sure the parent directory exists
      await this.ensureWebdavDirectory(connection, path.posix.dirname(remotePath));
      
      // Make a PUT request to upload the file
      const response = await fetch(`${connection.credentials.url}${remotePath}`, {
        method: 'PUT',
        headers,
        body: fileContent
      });
      
      if (response.status >= 400) {
        throw new Error(`WebDAV upload error: ${response.status} ${response.statusText}`);
      }
      
      return { bytesTransferred: fileContent.length };
    } catch (error) {
      console.error(`Error uploading to WebDAV ${remotePath}:`, error);
      throw error;
    }
  }
  
  /**
   * Download a file via WebDAV (iOS)
   */
  private async downloadFromWebdav(
    connection: PlatformConnection,
    remotePath: string,
    localPath: string
  ): Promise<{ bytesTransferred: number }> {
    try {
      const headers: Record<string, string> = {};
      
      // Add authentication
      if (connection.credentials.username && connection.credentials.password) {
        const authString = `${connection.credentials.username}:${connection.credentials.password}`;
        headers['Authorization'] = `Basic ${Buffer.from(authString).toString('base64')}`;
      }
      
      // Make a GET request to download the file
      const response = await fetch(`${connection.credentials.url}${remotePath}`, {
        method: 'GET',
        headers
      });
      
      if (response.status >= 400) {
        throw new Error(`WebDAV download error: ${response.status} ${response.statusText}`);
      }
      
      // Get the file content
      const buffer = await response.arrayBuffer();
      
      // Ensure directory exists
      this.ensureDirectoryExists(path.dirname(localPath));
      
      // Write to local file
      fs.writeFileSync(localPath, Buffer.from(buffer));
      
      // Process the file (e.g., for document indexing)
      await processFile(localPath);
      
      // Get content length
      const contentLength = parseInt(response.headers.get('content-length') || '0', 10);
      
      return { bytesTransferred: contentLength || buffer.byteLength };
    } catch (error) {
      console.error(`Error downloading from WebDAV ${remotePath}:`, error);
      throw error;
    }
  }
  
  /**
   * Ensure a directory exists on the SFTP server
   */
  private async ensureRemoteSftpDirectory(client: SFTPClient, remotePath: string): Promise<void> {
    const dirs = remotePath.split('/').filter(Boolean);
    let currentPath = '';
    
    for (const dir of dirs) {
      currentPath += '/' + dir;
      
      try {
        const stats = await client.stat(currentPath);
        
        if (!stats.isDirectory()) {
          throw new Error(`Path exists but is not a directory: ${currentPath}`);
        }
      } catch (error) {
        // If the error is "No such file", create the directory
        try {
          await client.mkdir(currentPath);
        } catch (mkdirError) {
          console.error(`Error creating directory ${currentPath}:`, mkdirError);
          throw mkdirError;
        }
      }
    }
  }
  
  /**
   * Ensure a directory exists on the WebDAV server
   */
  private async ensureWebdavDirectory(connection: PlatformConnection, remotePath: string): Promise<void> {
    const dirs = remotePath.split('/').filter(Boolean);
    let currentPath = '';
    
    for (const dir of dirs) {
      currentPath += '/' + dir;
      
      try {
        // Check if directory exists
        const headers: Record<string, string> = {
          'Depth': '0'
        };
        
        // Add authentication
        if (connection.credentials.username && connection.credentials.password) {
          const authString = `${connection.credentials.username}:${connection.credentials.password}`;
          headers['Authorization'] = `Basic ${Buffer.from(authString).toString('base64')}`;
        }
        
        const checkResponse = await fetch(`${connection.credentials.url}${currentPath}`, {
          method: 'PROPFIND',
          headers
        });
        
        if (checkResponse.status >= 400) {
          // Directory doesn't exist, create it
          const createResponse = await fetch(`${connection.credentials.url}${currentPath}`, {
            method: 'MKCOL',
            headers: {
              ...(headers.Authorization ? { Authorization: headers.Authorization } : {})
            }
          });
          
          if (createResponse.status >= 400) {
            throw new Error(`Failed to create WebDAV directory: ${createResponse.status} ${createResponse.statusText}`);
          }
        }
      } catch (error) {
        console.error(`Error ensuring WebDAV directory ${currentPath}:`, error);
        throw error;
      }
    }
  }
  
  /**
   * Ensure a local directory exists
   */
  private ensureDirectoryExists(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
  
  /**
   * Get a Dropbox client instance
   */
  private getDropboxClient(connection: PlatformConnection): Dropbox {
    return new Dropbox({ 
      accessToken: connection.credentials.accessToken,
      fetch
    });
  }
  
  /**
   * Get the local directory path for a connection
   */
  private getLocalDirectoryPath(connection: PlatformConnection): string {
    return path.join(this.uploadDir, connection.id);
  }
  
  /**
   * Get the local file path for a specific remote file
   */
  private getLocalFilePath(connection: PlatformConnection, remotePath: string): string {
    // Normalize the remote path (remove leading slash and connection root path)
    let normalizedPath = remotePath;
    if (normalizedPath.startsWith('/')) {
      normalizedPath = normalizedPath.substring(1);
    }
    
    // If the remote path starts with the connection root path, remove it
    const rootPath = connection.rootPath.startsWith('/') 
      ? connection.rootPath.substring(1) 
      : connection.rootPath;
    
    if (normalizedPath.startsWith(rootPath)) {
      normalizedPath = normalizedPath.substring(rootPath.length);
    }
    
    if (normalizedPath.startsWith('/')) {
      normalizedPath = normalizedPath.substring(1);
    }
    
    return path.join(this.getLocalDirectoryPath(connection), normalizedPath);
  }
  
  /**
   * Mark an operation as failed
   */
  private async failOperation(operationId: string, errorMessage: string): Promise<void> {
    await storage.updateSyncOperation(operationId, {
      status: SyncStatus.FAILED,
      endTime: new Date(),
      errors: [{ path: '', message: errorMessage }]
    });
  }
}

// Create and export the singleton instance
export const platformSyncManager = new PlatformSyncManager();

// Initialize on startup
platformSyncManager.initialize()
  .catch(error => console.error('Failed to initialize PlatformSyncManager:', error));