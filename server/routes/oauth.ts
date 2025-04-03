import express from 'express';
import { 
  getAuthorizationUrl, 
  handleOAuthCallback, 
  fetchFilesFromPlatform,
  OAuthPlatform
} from '../utils/oauthUtils';
import { storage } from '../storage';

const router = express.Router();

/**
 * Start OAuth flow for a platform
 * GET /api/oauth/authorize/:platform
 */
router.get('/authorize/:platform', async (req, res) => {
  try {
    const platform = req.params.platform as OAuthPlatform;
    const userId = parseInt(req.query.userId as string);
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    // Check if platform is supported
    if (!['dropbox', 'google', 'github', 'microsoft'].includes(platform)) {
      return res.status(400).json({ error: `Unsupported platform: ${platform}` });
    }
    
    // Get authorization URL
    const authUrl = getAuthorizationUrl(platform, userId);
    
    // Redirect to the platform's authorization page
    res.redirect(authUrl);
  } catch (error) {
    console.error('Error in OAuth authorization:', error);
    res.status(500).json({ error: 'Failed to start OAuth flow' });
  }
});

/**
 * Handle OAuth callback from a platform
 * GET /api/oauth/callback/:platform
 */
router.get('/callback/:platform', handleOAuthCallback);

/**
 * Get user's integrations
 * GET /api/oauth/integrations
 */
router.get('/integrations', async (req, res) => {
  try {
    const userId = parseInt(req.query.userId as string);
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    const integrations = await storage.getIntegrations(userId);
    
    // Remove sensitive data before sending to client
    const safeIntegrations = integrations.map(integration => ({
      id: integration.id,
      userId: integration.userId,
      type: integration.type,
      name: integration.name,
      status: integration.status,
      lastSync: integration.lastSync,
      createdAt: integration.createdAt,
      tokenExpiry: integration.tokenExpiry,
      // Don't include accessToken and refreshToken
    }));
    
    res.json(safeIntegrations);
  } catch (error) {
    console.error('Error fetching integrations:', error);
    res.status(500).json({ error: 'Failed to fetch integrations' });
  }
});

/**
 * Delete an integration
 * DELETE /api/oauth/integrations/:id
 */
router.delete('/integrations/:id', async (req, res) => {
  try {
    const integrationId = parseInt(req.params.id);
    const userId = parseInt(req.query.userId as string);
    
    if (isNaN(integrationId) || isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid ID parameters' });
    }
    
    // Verify the integration belongs to the user
    const integration = await storage.getIntegration(integrationId);
    
    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }
    
    if (integration.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this integration' });
    }
    
    const success = await storage.deleteIntegration(integrationId);
    
    if (success) {
      res.json({ success: true, message: 'Integration deleted successfully' });
    } else {
      res.status(500).json({ error: 'Failed to delete integration' });
    }
  } catch (error) {
    console.error('Error deleting integration:', error);
    res.status(500).json({ error: 'Failed to delete integration' });
  }
});

/**
 * Synchronize files from a platform
 * POST /api/oauth/sync/:platform
 */
router.post('/sync/:platform', async (req, res) => {
  try {
    const platform = req.params.platform as OAuthPlatform;
    const userId = parseInt(req.query.userId as string);
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    // Check if platform is supported
    if (!['dropbox', 'google', 'github', 'microsoft'].includes(platform)) {
      return res.status(400).json({ error: `Unsupported platform: ${platform}` });
    }
    
    // Get integration
    const integration = await storage.getIntegrationByType(userId, platform);
    
    if (!integration) {
      return res.status(404).json({ error: `No integration found for ${platform}` });
    }
    
    if (integration.status !== 'active') {
      return res.status(400).json({ error: `Integration for ${platform} is not active` });
    }
    
    // Fetch files from the platform
    const fetchedFiles = await fetchFilesFromPlatform(userId, platform);
    
    // Get existing files for this user and platform
    const existingFiles = await storage.getFilesBySource(userId, platform);
    
    // Prepare for batch operations
    const newFiles = [];
    const updatedFiles = [];
    const unchanged = [];
    
    // Compare fetched files with existing ones
    for (const fetchedFile of fetchedFiles) {
      const existingFile = existingFiles.find(file => {
        // Match by platform-specific ID stored in metadata
        if (platform === 'dropbox' && file.metadata?.dropboxId === fetchedFile.metadata?.dropboxId) {
          return true;
        }
        if (platform === 'google' && file.metadata?.googleId === fetchedFile.metadata?.googleId) {
          return true;
        }
        if (platform === 'github' && file.metadata?.githubId === fetchedFile.metadata?.githubId) {
          return true;
        }
        if (platform === 'microsoft' && file.metadata?.onedriveId === fetchedFile.metadata?.onedriveId) {
          return true;
        }
        return false;
      });
      
      if (!existingFile) {
        // New file
        newFiles.push(fetchedFile);
      } else if (
        // Check if file has been modified
        fetchedFile.lastModified.getTime() > existingFile.lastModified.getTime() ||
        fetchedFile.size !== existingFile.size
      ) {
        // Updated file
        fetchedFile.id = existingFile.id; // Preserve the original ID
        updatedFiles.push(fetchedFile);
      } else {
        // Unchanged file
        unchanged.push(existingFile);
      }
    }
    
    // Save new files
    for (const newFile of newFiles) {
      await storage.createFile({
        userId: newFile.userId,
        name: newFile.name,
        path: newFile.path,
        fileType: newFile.fileType,
        fileCategory: newFile.fileCategory,
        size: newFile.size,
        source: newFile.source,
        lastModified: newFile.lastModified,
        isProcessed: false,
        metadata: newFile.metadata
      });
    }
    
    // Update modified files
    for (const updatedFile of updatedFiles) {
      await storage.updateFile(updatedFile.id, {
        name: updatedFile.name,
        path: updatedFile.path,
        fileType: updatedFile.fileType,
        fileCategory: updatedFile.fileCategory,
        size: updatedFile.size,
        lastModified: updatedFile.lastModified,
        isProcessed: false, // Mark for reprocessing
        metadata: updatedFile.metadata
      });
    }
    
    // Update last sync time for the integration
    await storage.updateIntegration(integration.id, {
      lastSync: new Date()
    });
    
    res.json({
      success: true,
      stats: {
        total: fetchedFiles.length,
        new: newFiles.length,
        updated: updatedFiles.length,
        unchanged: unchanged.length
      }
    });
  } catch (error) {
    console.error(`Error synchronizing ${req.params.platform}:`, error);
    res.status(500).json({ error: `Failed to synchronize ${req.params.platform}` });
  }
});

/**
 * Get files from a platform
 * GET /api/oauth/files/:platform
 */
router.get('/files/:platform', async (req, res) => {
  try {
    const platform = req.params.platform as OAuthPlatform;
    const userId = parseInt(req.query.userId as string);
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    // Check if platform is supported
    if (!['dropbox', 'google', 'github', 'microsoft', 'all'].includes(platform)) {
      return res.status(400).json({ error: `Unsupported platform: ${platform}` });
    }
    
    let files;
    
    if (platform === 'all') {
      // Get all files for this user
      files = await storage.getFiles(userId);
    } else {
      // Get files for specific platform
      files = await storage.getFilesBySource(userId, platform);
    }
    
    res.json(files);
  } catch (error) {
    console.error(`Error fetching files from ${req.params.platform}:`, error);
    res.status(500).json({ error: `Failed to fetch files from ${req.params.platform}` });
  }
});

export default router;