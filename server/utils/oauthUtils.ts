import { Request, Response } from 'express';
import crypto from 'crypto';
import querystring from 'querystring';
import fetch from 'node-fetch';
import { storage } from '../storage';
import { InsertIntegration, InsertFile } from '@shared/schema';
import type { Json } from 'type-fest';

export type OAuthPlatform = 'dropbox' | 'google' | 'github' | 'microsoft';

// In-memory store for OAuth state (should be replaced with a persistent store in production)
const stateCache = new Map<string, { platform: OAuthPlatform, userId: number, expiry: number }>();

/**
 * Generate a cryptographically secure random state string
 */
const generateState = (
  platform: OAuthPlatform, 
  userId: number
): string => {
  const state = crypto.randomBytes(32).toString('hex');
  
  // Store state with expiry (10 minutes)
  stateCache.set(state, {
    platform,
    userId,
    expiry: Date.now() + 10 * 60 * 1000
  });
  
  return state;
};

/**
 * Configuration for OAuth providers
 */
interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authUrl: string;
  tokenUrl: string;
  scope: string;
  userInfoUrl?: string;
}

/**
 * OAuth configurations for supported platforms
 */
const oauthConfigs: Record<OAuthPlatform, OAuthConfig> = {
  dropbox: {
    clientId: process.env.DROPBOX_CLIENT_ID || '',
    clientSecret: process.env.DROPBOX_CLIENT_SECRET || '',
    redirectUri: process.env.REPLIT_DOMAINS ? 
      `https://${process.env.REPLIT_DOMAINS.split(',')[0]}/api/oauth/callback/dropbox` : 
      'http://localhost:3000/api/oauth/callback/dropbox',
    authUrl: 'https://www.dropbox.com/oauth2/authorize',
    tokenUrl: 'https://api.dropboxapi.com/oauth2/token',
    scope: 'files.metadata.read files.content.read',
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: process.env.REPLIT_DOMAINS ? 
      `https://${process.env.REPLIT_DOMAINS.split(',')[0]}/api/oauth/callback/google` : 
      'http://localhost:3000/api/oauth/callback/google',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scope: 'https://www.googleapis.com/auth/drive.readonly',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
  },
  github: {
    clientId: process.env.GITHUB_CLIENT_ID || '',
    clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
    redirectUri: process.env.REPLIT_DOMAINS ? 
      `https://${process.env.REPLIT_DOMAINS.split(',')[0]}/api/oauth/callback/github` : 
      'http://localhost:3000/api/oauth/callback/github',
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    scope: 'repo',
  },
  microsoft: {
    clientId: process.env.MICROSOFT_CLIENT_ID || '',
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
    redirectUri: process.env.REPLIT_DOMAINS ? 
      `https://${process.env.REPLIT_DOMAINS.split(',')[0]}/api/oauth/callback/microsoft` : 
      'http://localhost:3000/api/oauth/callback/microsoft',
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    scope: 'files.read offline_access',
  },
};

/**
 * Generate authorization URL for OAuth flow
 */
export const getAuthorizationUrl = (platform: OAuthPlatform, userId: number): string => {
  const config = oauthConfigs[platform];
  
  if (!config.clientId) {
    throw new Error(`${platform} client ID not configured`);
  }
  
  const state = generateState(platform, userId);
  
  const params = {
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: config.scope,
    state,
  };
  
  return `${config.authUrl}?${querystring.stringify(params)}`;
};

/**
 * Handle OAuth callback and exchange code for tokens
 */
export const handleOAuthCallback = async (
  req: Request, 
  res: Response
): Promise<void> => {
  try {
    const { platform } = req.params;
    const { code, state } = req.query;
    
    if (!platform || !code || !state || typeof state !== 'string') {
      return res.status(400).send('Invalid callback parameters');
    }
    
    // Validate state
    const stateData = stateCache.get(state);
    if (!stateData) {
      return res.status(400).send('Invalid or expired state');
    }
    
    // Remove used state
    stateCache.delete(state);
    
    // Validate platform
    if (stateData.platform !== platform) {
      return res.status(400).send('Platform mismatch');
    }
    
    const config = oauthConfigs[platform as OAuthPlatform];
    
    // Exchange code for tokens
    const tokenResponse = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: querystring.stringify({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code: code,
        redirect_uri: config.redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    
    if (!tokenResponse.ok) {
      console.error(`Error exchanging code for tokens: ${await tokenResponse.text()}`);
      return res.status(500).send('Failed to exchange code for tokens');
    }
    
    const tokenData = await tokenResponse.json();
    
    // Calculate token expiry
    const expiresIn = tokenData.expires_in || 3600;
    const tokenExpiry = new Date(Date.now() + expiresIn * 1000);
    
    // Fetch user info if available
    let userInfo = null;
    if (config.userInfoUrl && tokenData.access_token) {
      try {
        const userInfoResponse = await fetch(config.userInfoUrl, {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
          },
        });
        
        if (userInfoResponse.ok) {
          userInfo = await userInfoResponse.json();
        }
      } catch (error) {
        console.error('Error fetching user info:', error);
      }
    }
    
    // Get platform-specific name (fallback to platform name)
    let integrationName = platform.charAt(0).toUpperCase() + platform.slice(1);
    if (userInfo) {
      if (platform === 'google' && userInfo.email) {
        integrationName = `Google Drive (${userInfo.email})`;
      } else if (platform === 'github' && userInfo.login) {
        integrationName = `GitHub (${userInfo.login})`;
      } else if (platform === 'microsoft' && userInfo.userPrincipalName) {
        integrationName = `OneDrive (${userInfo.userPrincipalName})`;
      }
    }
    
    // Check if integration already exists
    const existingIntegration = await storage.getIntegrationByType(stateData.userId, platform);
    
    if (existingIntegration) {
      // Update existing integration
      await storage.updateIntegration(existingIntegration.id, {
        name: integrationName,
        config: {
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token || null,
          tokenExpiry: tokenExpiry.toISOString(),
          userInfo,
        } as unknown as Json,
        isConnected: true,
      });
      
      return res.redirect(`/?platform=${platform}&status=reconnected`);
    } else {
      // Create new integration
      const integration: InsertIntegration = {
        userId: stateData.userId,
        name: integrationName,
        type: platform,
        config: {
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token || null,
          tokenExpiry: tokenExpiry.toISOString(),
          userInfo,
        } as unknown as Json,
        isConnected: true,
        lastSynced: null,
      };
      
      await storage.createIntegration(integration);
      
      return res.redirect(`/?platform=${platform}&status=connected`);
    }
  } catch (error) {
    console.error('Error in OAuth callback:', error);
    res.status(500).send('Error processing OAuth callback');
  }
};

/**
 * Get access token for a platform
 */
export const getAccessToken = async (userId: number, platform: OAuthPlatform): Promise<string | null> => {
  try {
    const integration = await storage.getIntegrationByType(userId, platform);
    
    if (!integration) {
      return null;
    }
    
    const config = integration.config as unknown as {
      accessToken: string;
      refreshToken: string | null;
      tokenExpiry: string;
    };
    
    if (!config || !config.accessToken) {
      return null;
    }
    
    // Check if token has expired
    const tokenExpiry = new Date(config.tokenExpiry);
    if (tokenExpiry < new Date()) {
      // Token has expired, try to refresh
      if (!config.refreshToken) {
        return null;
      }
      
      const refreshed = await refreshAccessToken(integration.id, platform, config.refreshToken);
      return refreshed ? (await storage.getIntegration(integration.id))?.config.accessToken : null;
    }
    
    return config.accessToken;
  } catch (error) {
    console.error(`Error getting access token for ${platform}:`, error);
    return null;
  }
};

/**
 * Refresh an expired access token
 */
export const refreshAccessToken = async (
  integrationId: number, 
  platform: OAuthPlatform, 
  refreshToken: string
): Promise<boolean> => {
  try {
    const config = oauthConfigs[platform];
    
    // Exchange refresh token for new access token
    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: querystring.stringify({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });
    
    if (!response.ok) {
      console.error(`Error refreshing token: ${await response.text()}`);
      return false;
    }
    
    const tokenData = await response.json();
    
    // Calculate token expiry
    const expiresIn = tokenData.expires_in || 3600;
    const tokenExpiry = new Date(Date.now() + expiresIn * 1000);
    
    // Update integration with new tokens
    await storage.updateIntegration(integrationId, {
      config: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || refreshToken, // Some providers don't return a new refresh token
        tokenExpiry: tokenExpiry.toISOString(),
      } as unknown as Json,
      isConnected: true,
    });
    
    return true;
  } catch (error) {
    console.error(`Error refreshing access token for ${platform}:`, error);
    return false;
  }
};

/**
 * Fetch files from a connected platform
 */
export const fetchFilesFromPlatform = async (
  userId: number, 
  platform: OAuthPlatform
): Promise<InsertFile[]> => {
  try {
    // Get access token
    const accessToken = await getAccessToken(userId, platform);
    
    if (!accessToken) {
      throw new Error(`No valid access token for ${platform}`);
    }
    
    // Dispatch to platform-specific fetch function
    switch (platform) {
      case 'dropbox':
        return fetchDropboxFiles(userId, accessToken);
      case 'google':
        return fetchGoogleDriveFiles(userId, accessToken);
      case 'github':
        return fetchGitHubFiles(userId, accessToken);
      case 'microsoft':
        return fetchOneDriveFiles(userId, accessToken);
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  } catch (error) {
    console.error(`Error fetching files from ${platform}:`, error);
    return [];
  }
};

/**
 * Fetch files from Dropbox
 */
const fetchDropboxFiles = async (userId: number, accessToken: string): Promise<InsertFile[]> => {
  const allFiles: InsertFile[] = [];
  let hasMore = true;
  let cursor: string | null = null;
  
  try {
    // First request to list files
    const response = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        path: '',
        recursive: true,
        include_media_info: true,
        include_deleted: false,
        include_has_explicit_shared_members: false,
        include_mounted_folders: true,
        limit: 300,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Dropbox API error: ${await response.text()}`);
    }
    
    const data = await response.json();
    cursor = data.cursor;
    hasMore = data.has_more;
    
    // Process entries
    const entries = data.entries.filter((entry: any) => entry['.tag'] === 'file');
    for (const entry of entries) {
      const fileCategory = categorizeFile(entry.name);
      
      allFiles.push({
        userId,
        name: entry.name,
        path: entry.path_display,
        fileType: entry.name.split('.').pop() || null,
        fileCategory,
        source: 'dropbox',
        lastModified: new Date(entry.server_modified),
        size: entry.size,
        isProcessed: false,
        metadata: {
          dropboxId: entry.id,
          rev: entry.rev,
          contentHash: entry.content_hash,
        },
      });
    }
    
    // Fetch more files if needed
    while (hasMore && cursor) {
      const moreFiles = await fetchMoreDropboxFiles(accessToken, cursor);
      if (!moreFiles.files.length) break;
      
      allFiles.push(...moreFiles.files);
      cursor = moreFiles.cursor;
      hasMore = moreFiles.hasMore;
    }
    
    return allFiles;
  } catch (error) {
    console.error('Error fetching Dropbox files:', error);
    return allFiles;
  }
};

/**
 * Fetch more files from Dropbox using cursor for pagination
 */
const fetchMoreDropboxFiles = async (accessToken: string, cursor: string): Promise<{ files: InsertFile[], cursor: string | null, hasMore: boolean }> => {
  try {
    const response = await fetch('https://api.dropboxapi.com/2/files/list_folder/continue', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cursor }),
    });
    
    if (!response.ok) {
      throw new Error(`Dropbox API error: ${await response.text()}`);
    }
    
    const data = await response.json();
    const files: InsertFile[] = [];
    
    // Process entries
    const entries = data.entries.filter((entry: any) => entry['.tag'] === 'file');
    for (const entry of entries) {
      const fileCategory = categorizeFile(entry.name);
      
      files.push({
        userId: 0, // This will be set by the caller
        name: entry.name,
        path: entry.path_display,
        fileType: entry.name.split('.').pop() || null,
        fileCategory,
        source: 'dropbox',
        lastModified: new Date(entry.server_modified),
        size: entry.size,
        isProcessed: false,
        metadata: {
          dropboxId: entry.id,
          rev: entry.rev,
          contentHash: entry.content_hash,
        },
      });
    }
    
    return {
      files,
      cursor: data.cursor,
      hasMore: data.has_more,
    };
  } catch (error) {
    console.error('Error fetching more Dropbox files:', error);
    return { files: [], cursor: null, hasMore: false };
  }
};

/**
 * Fetch files from Google Drive
 */
const fetchGoogleDriveFiles = async (userId: number, accessToken: string): Promise<InsertFile[]> => {
  const allFiles: InsertFile[] = [];
  let pageToken: string | null = null;
  
  try {
    // First request to list files
    let url = 'https://www.googleapis.com/drive/v3/files?fields=files(id,name,mimeType,modifiedTime,parents,size),nextPageToken&pageSize=100&q=trashed=false';
    
    do {
      const fullUrl = pageToken ? `${url}&pageToken=${pageToken}` : url;
      const response = await fetch(fullUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`Google Drive API error: ${await response.text()}`);
      }
      
      const data = await response.json();
      
      // Process files (exclude folders)
      const files = data.files.filter((file: any) => file.mimeType !== 'application/vnd.google-apps.folder');
      
      for (const file of files) {
        const fileCategory = categorizeFile(file.name);
        
        allFiles.push({
          userId,
          name: file.name,
          path: null, // Google Drive doesn't have traditional paths
          fileType: file.mimeType,
          fileCategory,
          source: 'google',
          lastModified: new Date(file.modifiedTime),
          size: file.size ? parseInt(file.size) : 0,
          isProcessed: false,
          metadata: {
            googleId: file.id,
            parents: file.parents,
          },
        });
      }
      
      pageToken = data.nextPageToken;
    } while (pageToken);
    
    return allFiles;
  } catch (error) {
    console.error('Error fetching Google Drive files:', error);
    return allFiles;
  }
};

/**
 * Fetch files from GitHub repositories
 */
const fetchGitHubFiles = async (userId: number, accessToken: string): Promise<InsertFile[]> => {
  const allFiles: InsertFile[] = [];
  
  try {
    // 1. Fetch user's repositories
    const reposResponse = await fetch('https://api.github.com/user/repos?sort=updated&per_page=100', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });
    
    if (!reposResponse.ok) {
      throw new Error(`GitHub API error: ${await reposResponse.text()}`);
    }
    
    const repos = await reposResponse.json();
    
    // 2. For each repository, get its contents
    for (const repo of repos.slice(0, 10)) { // Limit to 10 most recently updated repos to avoid rate limits
      const repoFiles: InsertFile[] = [];
      
      try {
        // Fetch default branch's files (recursively)
        await fetchGitHubRepoContents(
          accessToken, 
          userId, 
          repo.owner.login, 
          repo.name, 
          '', 
          repoFiles, 
          repo.default_branch
        );
        
        allFiles.push(...repoFiles);
      } catch (error) {
        console.error(`Error fetching files from repo ${repo.full_name}:`, error);
        continue; // Skip to next repo if this one fails
      }
    }
    
    return allFiles;
  } catch (error) {
    console.error('Error fetching GitHub files:', error);
    return allFiles;
  }
};

/**
 * Process GitHub repository contents recursively
 */
const fetchGitHubRepoContents = async (
  accessToken: string,
  userId: number,
  owner: string,
  repo: string,
  path: string,
  files: InsertFile[],
  branch: string
): Promise<void> => {
  try {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`GitHub API error for ${url}: ${await response.text()}`);
    }
    
    const contents = await response.json();
    
    // Handle array of items (directory contents)
    if (Array.isArray(contents)) {
      for (const item of contents) {
        if (item.type === 'file') {
          // Add file to results
          const fileCategory = categorizeFile(item.name);
          
          files.push({
            userId,
            name: item.name,
            path: item.path,
            fileType: item.name.split('.').pop() || null,
            fileCategory,
            source: 'github',
            lastModified: new Date(), // GitHub API doesn't provide modifiedTime in contents API
            size: item.size,
            isProcessed: false,
            metadata: {
              githubId: item.sha,
              repo: `${owner}/${repo}`,
              branch,
              htmlUrl: item.html_url,
            },
          });
        } else if (item.type === 'dir') {
          // Recursively fetch directory contents
          await fetchGitHubRepoContents(
            accessToken, 
            userId, 
            owner, 
            repo, 
            item.path, 
            files, 
            branch
          );
        }
      }
    }
  } catch (error) {
    console.error(`Error processing GitHub repository contents for ${owner}/${repo}/${path}:`, error);
    throw error;
  }
};

/**
 * Fetch files from OneDrive / Microsoft
 */
const fetchOneDriveFiles = async (userId: number, accessToken: string): Promise<InsertFile[]> => {
  const allFiles: InsertFile[] = [];
  let nextLink: string | null = 'https://graph.microsoft.com/v1.0/me/drive/root/children?$top=100&$select=id,name,size,file,folder,parentReference,lastModifiedDateTime';
  
  try {
    while (nextLink) {
      const response = await fetch(nextLink, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`OneDrive API error: ${await response.text()}`);
      }
      
      const data = await response.json();
      
      // Process files (exclude folders)
      const files = data.value.filter((item: any) => item.file);
      
      for (const file of files) {
        const fileCategory = categorizeFile(file.name);
        
        allFiles.push({
          userId,
          name: file.name,
          path: file.parentReference ? file.parentReference.path.replace('/drive/root:', '') : null,
          fileType: file.file.mimeType,
          fileCategory,
          source: 'microsoft',
          lastModified: new Date(file.lastModifiedDateTime),
          size: file.size,
          isProcessed: false,
          metadata: {
            onedriveId: file.id,
            driveId: file.parentReference ? file.parentReference.driveId : null,
          },
        });
      }
      
      // Check if there are more pages
      nextLink = data['@odata.nextLink'] || null;
    }
    
    return allFiles;
  } catch (error) {
    console.error('Error fetching OneDrive files:', error);
    return allFiles;
  }
};

/**
 * Simple file categorization based on extension
 */
const categorizeFile = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  
  // Documents
  if (['doc', 'docx', 'pdf', 'txt', 'rtf', 'odt', 'md', 'markdown'].includes(ext)) {
    return 'documents';
  }
  
  // Spreadsheets
  if (['xls', 'xlsx', 'csv', 'ods'].includes(ext)) {
    return 'spreadsheets';
  }
  
  // Presentations
  if (['ppt', 'pptx', 'key', 'odp'].includes(ext)) {
    return 'presentations';
  }
  
  // Images
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'tiff', 'tif'].includes(ext)) {
    return 'images';
  }
  
  // Audio
  if (['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac'].includes(ext)) {
    return 'audio';
  }
  
  // Video
  if (['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv', 'wmv'].includes(ext)) {
    return 'videos';
  }
  
  // Code
  if (['js', 'ts', 'py', 'java', 'c', 'cpp', 'cs', 'go', 'rb', 'php', 'html', 'css', 'jsx', 'tsx'].includes(ext)) {
    return 'code';
  }
  
  // Archives
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(ext)) {
    return 'archives';
  }
  
  return 'other';
};

/**
 * Clean up expired states periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [state, data] of stateCache.entries()) {
    if (data.expiry < now) {
      stateCache.delete(state);
    }
  }
}, 60 * 1000); // Run every minute