/**
 * Anytype Integration Utilities
 * 
 * Provides functions for interacting with Anytype using the Any-Sync protocol
 * Anytype is a private, decentralized personal knowledge management system
 * 
 * Based on documentation at https://tech.anytype.io/any-sync/overview
 */

import fetch from 'node-fetch';
import { Integration } from '@shared/schema';

// Anytype local middleware URL (default assuming standard local installation)
const ANYTYPE_LOCAL_URL = 'http://localhost:3000/api';

/**
 * Anytype client for interacting with a local Anytype instance
 * This uses Anytype's middleware API which is typically available on localhost
 * when Anytype is running locally
 */
export class AnytypeClient {
  private vaultKey: string;
  private localApiUrl: string;
  private spaceId?: string; // Space ID (formerly workspace)
  
  constructor(config: {
    vaultKey: string;
    localApiUrl?: string; 
    spaceId?: string;
  }) {
    this.vaultKey = config.vaultKey;
    this.localApiUrl = config.localApiUrl || ANYTYPE_LOCAL_URL;
    this.spaceId = config.spaceId;
  }
  
  /**
   * Make an API request to the Anytype local middleware
   */
  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: any
  ): Promise<T> {
    const url = `${this.localApiUrl}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Vault-Key': this.vaultKey
    };
    
    if (this.spaceId) {
      headers['X-Space-Id'] = this.spaceId;
    }
    
    try {
      console.log(`Making Anytype API request to: ${method} ${url}`);
      
      const response = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
      }).catch(err => {
        console.error(`Network error in Anytype request: ${err.message}`);
        if (err.code === 'ECONNREFUSED' || err.message.includes('ECONNREFUSED')) {
          throw new Error('Cannot connect to Anytype. Is the application running locally?');
        } else if (err.code === 'ETIMEDOUT' || err.message.includes('timeout')) {
          throw new Error('Connection to Anytype timed out. Is the application responding?');
        }
        throw err;
      });
      
      if (!response.ok) {
        let errorText = '';
        try {
          errorText = await response.text();
        } catch (e) {
          errorText = 'Unable to read error response';
        }
        
        console.error(`Anytype API Error: ${response.status} ${errorText}`);
        
        // Provide more helpful error messages for common status codes
        switch (response.status) {
          case 401:
            throw new Error('Unauthorized: Invalid vault key or authentication failed');
          case 403:
            throw new Error('Forbidden: You do not have permission to access this resource');
          case 404:
            throw new Error('Not Found: The requested resource does not exist');
          case 429:
            throw new Error('Too Many Requests: Rate limit exceeded');
          case 500:
            throw new Error('Server Error: Anytype server encountered an error');
          default:
            throw new Error(`Anytype API Error (${response.status}): ${errorText}`);
        }
      }
      
      try {
        const result = await response.json();
        return result as T;
      } catch (jsonError) {
        console.error('Error parsing JSON response from Anytype:', jsonError);
        throw new Error('Invalid response from Anytype: Unable to parse JSON');
      }
    } catch (error: any) {
      // Add request context to error messages
      if (error.message && !error.message.includes('Anytype API')) {
        error.message = `Anytype API [${method} ${endpoint}]: ${error.message}`;
      }
      console.error(`Anytype request failed:`, error);
      throw error;
    }
  }
  
  /**
   * Test the connection to Anytype middleware
   */
  async testConnection(): Promise<{ success: boolean; message: string; }> {
    try {
      // First make a simpler request to check basic connectivity
      const spaces = await this.getSpaces();
      
      if (!spaces || spaces.length === 0) {
        return { 
          success: false, 
          message: 'Connected to Anytype, but no spaces were found. Please create a space first.' 
        };
      }
      
      // If spaceId wasn't provided, use the first available space
      if (!this.spaceId && spaces.length > 0) {
        this.spaceId = spaces[0].id;
        console.log(`No space ID provided, using the first available space: ${this.spaceId}`);
      }
      
      return { 
        success: true, 
        message: `Successfully connected to Anytype with ${spaces.length} spaces available` 
      };
    } catch (error: any) {
      console.error("Anytype connection test failed:", error);
      
      // Provide more specific error messages for common issues
      if (error.message.includes('ECONNREFUSED')) {
        return { 
          success: false, 
          message: 'Cannot connect to Anytype. Is the application running on your computer? Check that Anytype is open and running.' 
        };
      } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        return { 
          success: false, 
          message: 'Authentication failed. Please check your vault key and try again.' 
        };
      } else if (error.message.includes('404')) {
        return { 
          success: false, 
          message: 'The Anytype API endpoint was not found. Please check your API URL configuration.' 
        };
      }
      
      return { 
        success: false, 
        message: `Failed to connect to Anytype: ${error.message}` 
      };
    }
  }
  
  /**
   * Get available spaces (workspaces)
   */
  async getSpaces(): Promise<any[]> {
    const response = await this.request<{ spaces: any[] }>('/spaces', 'GET');
    return response.spaces || [];
  }
  
  /**
   * Get objects (pages, notes, etc.) from the current space
   */
  async getObjects(limit: number = 50, offset: number = 0): Promise<any[]> {
    if (!this.spaceId) {
      throw new Error('Space ID is required to get objects');
    }
    
    const response = await this.request<{ objects: any[] }>(
      `/objects?limit=${limit}&offset=${offset}`,
      'GET'
    );
    
    return response.objects || [];
  }
  
  /**
   * Get a specific object by ID
   */
  async getObject(objectId: string): Promise<any> {
    if (!this.spaceId) {
      throw new Error('Space ID is required to get an object');
    }
    
    return this.request<any>(`/objects/${objectId}`, 'GET');
  }
  
  /**
   * Search for objects in the current space
   */
  async searchObjects(query: string, limit: number = 20): Promise<any[]> {
    if (!this.spaceId) {
      throw new Error('Space ID is required to search objects');
    }
    
    const response = await this.request<{ objects: any[] }>(
      '/search',
      'POST',
      {
        query,
        limit,
      }
    );
    
    return response.objects || [];
  }
  
  /**
   * Create a new object in Anytype
   */
  async createObject(data: {
    title: string;
    content?: string;
    type?: string;
    relations?: Record<string, any>;
  }): Promise<any> {
    if (!this.spaceId) {
      throw new Error('Space ID is required to create an object');
    }
    
    return this.request<any>(
      '/objects',
      'POST',
      {
        ...data,
        spaceId: this.spaceId
      }
    );
  }
  
  /**
   * Export data to Anytype from our system
   */
  async exportData(data: {
    title: string;
    content: string;
    type?: string;
    tags?: string[];
  }): Promise<any> {
    const relations: Record<string, any> = {};
    
    if (data.tags && data.tags.length > 0) {
      relations.tags = data.tags.map(tag => ({ name: tag }));
    }
    
    return this.createObject({
      title: data.title,
      content: data.content,
      type: data.type || 'basic',
      relations
    });
  }
}

/**
 * Create an Anytype client from an integration config
 */
export function createAnytypeClientFromIntegration(integration: Integration): AnytypeClient | null {
  if (!integration) {
    console.error('Cannot create Anytype client: integration object is null or undefined');
    return null;
  }
  
  if (integration.type !== 'anytype') {
    console.error(`Cannot create Anytype client: integration type is "${integration.type}" not "anytype"`);
    return null;
  }
  
  if (!integration.config) {
    console.error('Cannot create Anytype client: integration config is missing');
    return null;
  }
  
  const config = integration.config as Record<string, any>;
  
  // Log all available config properties for debugging
  console.log('Anytype integration config:', 
    Object.keys(config).map(k => `${k}: ${typeof config[k] === 'string' ? 'String' : typeof config[k]}`).join(', ')
  );
  
  if (!config.vaultKey) {
    throw new Error('Missing required Anytype configuration: vaultKey is required for authentication');
  }
  
  // Set default API URL if needed
  let apiUrl = config.localApiUrl || config.apiEndpoint || 'http://localhost:3000/api';
  
  // Ensure URL has correct format
  if (!apiUrl.startsWith('http')) {
    apiUrl = `http://${apiUrl}`;
  }
  
  // Ensure URL ends with /api
  if (!apiUrl.endsWith('/api')) {
    apiUrl = apiUrl.endsWith('/') ? `${apiUrl}api` : `${apiUrl}/api`;
  }
  
  console.log(`Creating Anytype client with API URL: ${apiUrl}`);
  
  return new AnytypeClient({
    vaultKey: config.vaultKey,
    localApiUrl: apiUrl,
    spaceId: config.spaceId || config.workspaceId
  });
}

/**
 * Synchronize data from Anytype to our system
 */
export async function synchronizeFromAnytype(
  client: AnytypeClient,
  userId: number,
  lastSynced?: Date,
  options: {
    limit?: number;
    types?: string[];
  } = {}
): Promise<{
  success: boolean;
  itemCount: number;
  errors?: string[];
}> {
  try {
    console.log(`Synchronizing from Anytype for user ${userId}...`);
    const limit = options.limit || 100;
    
    // Test connection first to avoid cryptic errors
    const connectionTest = await client.testConnection();
    if (!connectionTest.success) {
      return {
        success: false,
        itemCount: 0,
        errors: [connectionTest.message]
      };
    }
    
    console.log(`Anytype connection test successful: ${connectionTest.message}`);
    console.log(`Fetching up to ${limit} objects from Anytype...`);
    
    const objects = await client.getObjects(limit);
    console.log(`Retrieved ${objects.length} objects from Anytype`);
    
    // Filter by last sync date if provided
    const filteredObjects = lastSynced
      ? objects.filter(obj => {
          if (!obj.updatedAt) return true; // Include if no date
          try {
            const updatedAt = new Date(obj.updatedAt);
            return updatedAt > lastSynced;
          } catch (e) {
            console.warn(`Failed to parse date for object: ${obj.id}`, e);
            return true; // Include on error
          }
        })
      : objects;
    
    console.log(`${filteredObjects.length} objects need to be imported since last sync ${lastSynced?.toISOString() || 'never'}`);
    
    // Dynamically import storage to avoid circular dependencies
    const { storage } = await import('../storage');
    
    // Convert and store objects
    let successCount = 0;
    for (const obj of filteredObjects) {
      try {
        // Determine file type based on Anytype object type or relation
        let fileCategory;
        if (obj.layout === 'note' || obj.type === 'note') {
          fileCategory = 'note';
        } else if (obj.layout === 'code' || obj.type === 'code') {
          fileCategory = 'code';
        } else if (obj.layout === 'media' || 
                  obj.type === 'image' || 
                  obj.type === 'audio' || 
                  obj.type === 'video') {
          fileCategory = obj.type || 'media';
        } else if (obj.layout === 'document' || obj.type === 'document') {
          fileCategory = 'document';
        } else {
          fileCategory = 'note'; // Default
        }
        
        // Get content if possible
        let content = '';
        try {
          if (obj.id) {
            const fullObject = await client.getObject(obj.id);
            content = fullObject.content || fullObject.text || '';
          }
        } catch (e) {
          console.warn(`Couldn't fetch content for object ${obj.id}:`, e);
        }
        
        // Create content summary
        const summary = content.length > 150 
          ? content.substring(0, 150) + '...'
          : content;
        
        // Create a file record for this Anytype object
        const file = await storage.createFile({
          name: obj.title || 'Untitled Anytype Object',
          path: `anytype://${obj.id}`,
          fileType: obj.type || 'document',
          fileCategory: fileCategory,
          source: 'anytype',
          sourceId: obj.id,
          lastModified: obj.updatedAt ? new Date(obj.updatedAt) : new Date(),
          userId: userId,
          metadata: {
            anytypeObject: obj,
            type: obj.type || 'object',
            content: content,
            relations: obj.relations || {}
          },
          isProcessed: false,
          contentSummary: summary
        });
        
        if (file) {
          successCount++;
        }
      } catch (objError) {
        console.error(`Error importing Anytype object ${obj.id || 'unknown'}:`, objError);
      }
    }
    
    return {
      success: true,
      itemCount: successCount,
    };
    
  } catch (error: any) {
    console.error(`Anytype synchronization failed:`, error);
    return {
      success: false,
      itemCount: 0,
      errors: [error.message]
    };
  }
}

/**
 * Export data from our system to Anytype
 */
export async function exportToAnytype(
  client: AnytypeClient,
  data: {
    title: string;
    content: string;
    type?: string;
    tags?: string[];
  }[]
): Promise<{
  success: boolean;
  itemCount: number;
  errors?: string[];
}> {
  const results = {
    success: true,
    itemCount: 0,
    errors: [] as string[]
  };
  
  for (const item of data) {
    try {
      await client.exportData(item);
      results.itemCount++;
    } catch (error: any) {
      results.success = false;
      results.errors!.push(`Failed to export "${item.title}": ${error.message}`);
    }
  }
  
  return results;
}