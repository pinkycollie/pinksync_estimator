import * as fs from 'fs';
import * as path from 'path';
import * as chokidar from 'chokidar';
import { glob } from 'glob';
import { storage } from '../storage';
import { automationService } from './automationService';
import { 
  FileEventType, 
  TriggerType,
  FileWatchConfig
} from '@shared/schema';

interface FileWatcher {
  id: number;
  watcher: chokidar.FSWatcher;
  config: FileWatchConfig;
}

class FileMonitoringService {
  private watchInstances: Map<number, FileWatcher> = new Map();
  private userId: number = 1; // Default user id, will be set per user session
  private isInitialized: boolean = false;

  /**
   * Initialize the file monitoring service
   */
  async initialize(): Promise<void> {
    try {
      console.log("Initializing file monitoring service...");
      
      try {
        // Get all active file watchers
        const activeWatchers = await storage.getActiveFileWatchConfigs(this.userId);
        
        console.log(`Found ${activeWatchers.length} active file watchers to initialize`);
        
        // Start each active watcher
        for (const config of activeWatchers) {
          await this.startWatching(config);
        }
        
        this.isInitialized = true;
        console.log("File monitoring service initialized successfully");
      } catch (err) {
        console.error("Error initializing file watchers:", err);
      }
    } catch (error) {
      console.error("Failed to initialize file monitoring service:", error);
      throw error;
    }
  }

  /**
   * Set the current user for the service
   */
  setUserId(userId: number): void {
    this.userId = userId;
  }

  /**
   * Get all active file watchers for the current user
   */
  async getActiveWatchers(): Promise<FileWatcher[]> {
    return Array.from(this.watchInstances.values());
  }

  /**
   * Start watching a directory or file based on the config
   */
  async startWatching(config: FileWatchConfig): Promise<boolean> {
    try {
      // Skip inactive watchers
      if (!config.isActive) {
        console.log(`Watch config ${config.id} is not active, skipping`);
        return false;
      }
      
      // Cancel any existing watcher with this ID
      await this.stopWatching(config.id);
      
      console.log(`Starting file watcher for ${config.path} (ID: ${config.id})`);
      
      // Parse file patterns
      const filePatterns = config.filePatterns ? JSON.parse(config.filePatterns) : [];
      const ignorePatterns = config.ignorePatterns ? JSON.parse(config.ignorePatterns) : [];
      
      // Update last run time
      await storage.updateFileWatchConfig(config.id, {
        lastRunAt: new Date()
      });
      
      try {
        // Initialize chokidar watcher
        const watchOptions: chokidar.WatchOptions = {
          persistent: true,
          ignoreInitial: true,
          followSymlinks: false,
          ignored: ignorePatterns,
          ignorePermissionErrors: true,
          awaitWriteFinish: {
            stabilityThreshold: 2000,
            pollInterval: 250
          }
        };
        
        // Create the watcher
        const watcher = chokidar.watch(config.path, watchOptions);
        
        // Setup event handlers
        watcher.on('add', (filePath) => {
          this.handleFileEvent(FileEventType.ADDED, filePath, config);
        });
        
        watcher.on('change', (filePath) => {
          this.handleFileEvent(FileEventType.MODIFIED, filePath, config);
        });
        
        watcher.on('unlink', (filePath) => {
          this.handleFileEvent(FileEventType.DELETED, filePath, config);
        });
        
        // Handle errors
        watcher.on('error', (err) => {
          console.error(`Error in file watcher ${config.id}:`, err);
          
          // Update the file watch config to mark the error
          storage.updateFileWatchConfig(config.id, {
            isActive: false,
            lastRunAt: new Date()
          }).catch(err => {
            console.error(`Failed to update file watch config ${config.id}:`, err);
          });
        });
        
        // Handle ready event
        watcher.on('ready', () => {
          console.log(`File watcher ${config.id} ready and watching ${config.path}`);
          
          // Update the file watch config to confirm it's started
          storage.updateFileWatchConfig(config.id, {
            isActive: true,
            lastRunAt: new Date()
          }).catch(err => {
            console.error(`Failed to update file watch config ${config.id}:`, err);
          });
        });
        
        // Store the watcher instance
        this.watchInstances.set(config.id, {
          id: config.id,
          watcher,
          config
        });
        
        return true;
      } catch (err) {
        console.error(`Error setting up file watcher ${config.id}:`, err);
        return false;
      }
    } catch (error) {
      console.error(`Error starting file watcher:`, error);
      return false;
    }
  }

  /**
   * Stop watching a specific path
   */
  async stopWatching(watcherId: number): Promise<boolean> {
    try {
      const watcher = this.watchInstances.get(watcherId);
      
      if (!watcher) {
        console.log(`No watcher found with ID ${watcherId}`);
        return false;
      }
      
      // Close the watcher
      await watcher.watcher.close();
      
      // Remove from our map
      this.watchInstances.delete(watcherId);
      
      console.log(`Stopped file watcher ${watcherId} for ${watcher.config.path}`);
      return true;
    } catch (error) {
      console.error(`Error stopping file watcher ${watcherId}:`, error);
      return false;
    }
  }

  /**
   * Stop all watchers
   */
  async stopAllWatchers(): Promise<void> {
    try {
      for (const id of this.watchInstances.keys()) {
        await this.stopWatching(id);
      }
      
      console.log('All file watchers stopped');
    } catch (error) {
      console.error('Error stopping all file watchers:', error);
    }
  }

  /**
   * Handle file events and trigger automation workflows
   */
  private async handleFileEvent(
    eventType: FileEventType,
    filePath: string,
    config: FileWatchConfig
  ): Promise<void> {
    try {
      console.log(`File event: ${eventType} - ${filePath}`);
      
      // Extract file information
      const fileName = path.basename(filePath);
      const extension = path.extname(filePath).substring(1); // Remove the leading dot
      const stats = fs.existsSync(filePath) ? fs.statSync(filePath) : null;
      
      // Check if the file matches the configured patterns
      if (config.filePatterns) {
        const patterns = JSON.parse(config.filePatterns);
        if (patterns.length > 0 && !(await this.matchesPattern(filePath, patterns))) {
          console.log(`File ${filePath} doesn't match any of the configured patterns, ignoring event`);
          return;
        }
      }
      
      // File event data
      const eventData = {
        eventType,
        filePath,
        fileName,
        extension,
        fileSize: stats?.size || 0,
        modifiedTime: stats?.mtime || new Date(),
        isDirectory: stats?.isDirectory() || false,
        watcherId: config.id,
        watcherName: config.name,
        fileCategory: this.guessFileCategory(extension),
        autoImport: config.autoImport || false
      };
      
      // Trigger automation workflows for this file event
      console.log(`Triggering automation workflows for file event ${eventType} on ${filePath}`);
      const triggeredCount = await automationService.triggerWorkflowsByEvent(
        TriggerType.FILE_EVENT,
        eventData,
        this.userId
      );
      
      console.log(`Triggered ${triggeredCount} workflows for file event ${eventType} on ${filePath}`);
      
      // If auto-import is enabled for this watcher, import the file
      if (config.autoImport && eventType === FileEventType.ADDED) {
        try {
          // Import the file
          const fileData = {
            name: fileName,
            path: filePath,
            source: "local",
            fileType: extension,
            fileCategory: this.guessFileCategory(extension),
            lastModified: stats?.mtime || new Date(),
            userId: this.userId
          };
          
          // Create the file record
          await storage.createFile(fileData);
          console.log(`Auto-imported file ${filePath}`);
        } catch (importError) {
          console.error(`Error auto-importing file ${filePath}:`, importError);
        }
      }
    } catch (error) {
      console.error(`Error handling file event:`, error);
    }
  }

  /**
   * Check if a file path matches any of the given patterns
   */
  private async matchesPattern(filePath: string, patterns: string[]): Promise<boolean> {
    try {
      for (const pattern of patterns) {
        // Use glob to check if the file matches the pattern
        const matches = await glob(pattern, { nodir: true });
        if (matches.includes(filePath)) {
          return true;
        }
        
        // Also try a more direct match
        if (filePath.includes(pattern) || path.basename(filePath).match(pattern)) {
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error(`Error matching file pattern:`, error);
      return false;
    }
  }

  /**
   * Guess the file category based on file extension
   */
  private guessFileCategory(extension: string): string {
    // Normalize extension to lowercase
    const ext = extension.toLowerCase();
    
    // Common document types
    if (['doc', 'docx', 'rtf', 'odt', 'pdf', 'txt', 'md', 'tex'].includes(ext)) {
      return 'document';
    }
    
    // Image types
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'svg', 'webp'].includes(ext)) {
      return 'image';
    }
    
    // Video types
    if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm'].includes(ext)) {
      return 'video';
    }
    
    // Audio types
    if (['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'].includes(ext)) {
      return 'audio';
    }
    
    // Code types
    if (['js', 'ts', 'py', 'java', 'c', 'cpp', 'cs', 'php', 'rb', 'go', 'rust', 'html', 'css', 'scss', 'jsx', 'tsx'].includes(ext)) {
      return 'code';
    }
    
    // Data types
    if (['json', 'csv', 'xml', 'yaml', 'yml', 'ini', 'toml', 'sqlitedb', 'db'].includes(ext)) {
      return 'data';
    }
    
    // Note types
    if (['md', 'txt', 'note'].includes(ext)) {
      return 'note';
    }
    
    // Chat log types
    if (['chat', 'log'].includes(ext)) {
      return 'chat_log';
    }
    
    // Default for unknown types
    return 'other';
  }
}

export const fileMonitoringService = new FileMonitoringService();