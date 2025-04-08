import { DatabaseStorage } from './database-storage';
import { MemStorage } from './storage';
import { extendDatabaseStorageWithAiHub } from './database-storage-extension';
import { extendMemStorageWithAiHub } from './mem-storage-extension';

// Extend the storage classes with AI Hub functionality
extendDatabaseStorageWithAiHub(DatabaseStorage);
extendMemStorageWithAiHub(MemStorage);

// Re-export the storage
export { storage } from './storage';