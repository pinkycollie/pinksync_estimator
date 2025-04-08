import express from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { platformSyncManager } from '../utils/platformSyncManager';
import { 
  PlatformType, 
  SyncDirection,
  createPlatformConnectionSchema,
  updatePlatformConnectionSchema,
  InsertPlatformConnection,
  PlatformConnection
} from '../../shared/platformSyncSchema';

// Helper function to convert string platform type to enum
const toPlatformType = (platform: string): keyof typeof PlatformType => {
  const key = platform.toUpperCase() as keyof typeof PlatformType;
  if (Object.keys(PlatformType).includes(key)) {
    return key;
  }
  throw new Error(`Invalid platform type: ${platform}`);
};

// Helper function to convert string sync direction to enum
const toSyncDirection = (direction: string): keyof typeof SyncDirection => {
  const key = direction.toUpperCase() as keyof typeof SyncDirection;
  if (Object.keys(SyncDirection).includes(key)) {
    return key;
  }
  throw new Error(`Invalid sync direction: ${direction}`);
};

// Create router
const router = express.Router();

// Get all platform connections
router.get('/connections', async (req, res) => {
  try {
    const connections = await storage.getAllPlatformConnections();
    res.json(connections);
  } catch (error) {
    console.error('Error fetching platform connections:', error);
    res.status(500).json({ error: 'Failed to fetch platform connections' });
  }
});

// Get a specific platform connection
router.get('/connections/:id', async (req, res) => {
  try {
    const connection = await storage.getPlatformConnection(req.params.id);
    
    if (!connection) {
      return res.status(404).json({ error: 'Platform connection not found' });
    }
    
    res.json(connection);
  } catch (error) {
    console.error('Error fetching platform connection:', error);
    res.status(500).json({ error: 'Failed to fetch platform connection' });
  }
});

// Create a new platform connection
router.post('/connections', async (req, res) => {
  try {
    // Validate input
    const data = await createPlatformConnectionSchema.parseAsync(req.body);
    
    // Prepare base data
    let validatedData: Partial<InsertPlatformConnection> = {
      ...data
    };
    
    // Convert string platform type to enum value if provided as string
    if (typeof data.platform === 'string') {
      validatedData.platform = PlatformType[toPlatformType(data.platform)];
    }
    
    // Convert sync direction if provided as string
    if (typeof data.syncDirection === 'string') {
      validatedData.syncDirection = SyncDirection[toSyncDirection(data.syncDirection)];
    } else if (!data.syncDirection) {
      validatedData.syncDirection = SyncDirection.BIDIRECTIONAL;
    }
    
    // Ensure required fields
    if (!validatedData.name || !validatedData.rootPath || !validatedData.credentials || !validatedData.platform) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        details: 'Name, rootPath, credentials, and platform are required' 
      });
    }
    
    // Create connection in storage
    const connection = await storage.createPlatformConnection(validatedData);
    
    // Initialize in platform sync manager
    await platformSyncManager.addConnection(connection);
    
    res.status(201).json(connection);
  } catch (error) {
    console.error('Error creating platform connection:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    
    res.status(500).json({ error: 'Failed to create platform connection' });
  }
});

// Update a platform connection
router.patch('/connections/:id', async (req, res) => {
  try {
    // Validate input
    const data = await updatePlatformConnectionSchema.parseAsync(req.body);
    
    // Process and convert enum values if provided
    const validatedData: Partial<InsertPlatformConnection> = {
      ...data
    };
    
    // Convert platform type if provided
    if (typeof data.platform === 'string') {
      validatedData.platform = PlatformType[toPlatformType(data.platform)];
    }
    
    // Convert sync direction if provided
    if (typeof data.syncDirection === 'string') {
      validatedData.syncDirection = SyncDirection[toSyncDirection(data.syncDirection)];
    }
    
    // Update connection
    const updatedConnection = await storage.updatePlatformConnection(req.params.id, validatedData);
    
    if (!updatedConnection) {
      return res.status(404).json({ error: 'Platform connection not found' });
    }
    
    // Update in platform sync manager
    await platformSyncManager.updateConnection(req.params.id, validatedData);
    
    res.json(updatedConnection);
  } catch (error) {
    console.error('Error updating platform connection:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    
    res.status(500).json({ error: 'Failed to update platform connection' });
  }
});

// Delete a platform connection
router.delete('/connections/:id', async (req, res) => {
  try {
    // Delete from storage
    const deleted = await storage.deletePlatformConnection(req.params.id);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Platform connection not found' });
    }
    
    // Delete from platform sync manager
    await platformSyncManager.deleteConnection(req.params.id);
    
    res.status(204).end();
  } catch (error) {
    console.error('Error deleting platform connection:', error);
    res.status(500).json({ error: 'Failed to delete platform connection' });
  }
});

// Test a platform connection
router.post('/connections/:id/test', async (req, res) => {
  try {
    const connection = await storage.getPlatformConnection(req.params.id);
    
    if (!connection) {
      return res.status(404).json({ error: 'Platform connection not found' });
    }
    
    const testResult = await platformSyncManager.testConnection(req.params.id);
    
    res.json({ success: testResult });
  } catch (error) {
    console.error('Error testing platform connection:', error);
    res.status(500).json({ error: 'Failed to test platform connection' });
  }
});

// Start sync for a platform connection
router.post('/connections/:id/sync', async (req, res) => {
  try {
    const connection = await storage.getPlatformConnection(req.params.id);
    
    if (!connection) {
      return res.status(404).json({ error: 'Platform connection not found' });
    }
    
    const syncOperation = await platformSyncManager.startSync(req.params.id);
    
    if (!syncOperation) {
      return res.status(500).json({ error: 'Failed to start sync operation' });
    }
    
    res.status(201).json(syncOperation);
  } catch (error) {
    console.error('Error starting sync operation:', error);
    res.status(500).json({ error: 'Failed to start sync operation' });
  }
});

// Get sync operations for a connection
router.get('/connections/:id/sync', async (req, res) => {
  try {
    const connection = await storage.getPlatformConnection(req.params.id);
    
    if (!connection) {
      return res.status(404).json({ error: 'Platform connection not found' });
    }
    
    const operations = await storage.getSyncOperations(req.params.id);
    
    res.json(operations);
  } catch (error) {
    console.error('Error fetching sync operations:', error);
    res.status(500).json({ error: 'Failed to fetch sync operations' });
  }
});

// Get a specific sync operation
router.get('/sync/:id', async (req, res) => {
  try {
    const operation = await storage.getSyncOperation(req.params.id);
    
    if (!operation) {
      return res.status(404).json({ error: 'Sync operation not found' });
    }
    
    res.json(operation);
  } catch (error) {
    console.error('Error fetching sync operation:', error);
    res.status(500).json({ error: 'Failed to fetch sync operation' });
  }
});

// Get sync items for a connection
router.get('/connections/:id/items', async (req, res) => {
  try {
    const connection = await storage.getPlatformConnection(req.params.id);
    
    if (!connection) {
      return res.status(404).json({ error: 'Platform connection not found' });
    }
    
    const items = await storage.getSyncItems(req.params.id);
    
    res.json(items);
  } catch (error) {
    console.error('Error fetching sync items:', error);
    res.status(500).json({ error: 'Failed to fetch sync items' });
  }
});

// Get a specific sync item
router.get('/items/:id', async (req, res) => {
  try {
    const item = await storage.getSyncItem(req.params.id);
    
    if (!item) {
      return res.status(404).json({ error: 'Sync item not found' });
    }
    
    res.json(item);
  } catch (error) {
    console.error('Error fetching sync item:', error);
    res.status(500).json({ error: 'Failed to fetch sync item' });
  }
});

// Resolve a sync conflict
router.post('/items/:id/resolve', async (req, res) => {
  try {
    // Validate input
    const schema = z.object({
      resolution: z.enum(['local', 'remote', 'rename', 'manual'])
    });
    
    const { resolution } = schema.parse(req.body);
    
    const item = await storage.getSyncItem(req.params.id);
    
    if (!item) {
      return res.status(404).json({ error: 'Sync item not found' });
    }
    
    // Update the item with resolution
    const updatedItem = await storage.updateSyncItem(req.params.id, {
      conflictResolution: resolution
    });
    
    // Resolve in platform sync manager
    const resolvedItem = await platformSyncManager.resolveConflict(req.params.id, resolution);
    
    if (!resolvedItem) {
      return res.status(500).json({ error: 'Failed to resolve conflict' });
    }
    
    res.json(resolvedItem);
  } catch (error) {
    console.error('Error resolving sync conflict:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    
    res.status(500).json({ error: 'Failed to resolve sync conflict' });
  }
});

// Get platform types
router.get('/platform-types', (req, res) => {
  res.json(Object.values(PlatformType));
});

// Get sync direction types
router.get('/sync-directions', (req, res) => {
  res.json(Object.values(SyncDirection));
});

export default router;