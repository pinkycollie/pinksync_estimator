/**
 * Anytype API Integration Utilities
 * 
 * Provides functions for interacting with the Anytype API
 * Anytype is a private, decentralized personal knowledge management system
 */

import fetch from 'node-fetch';
import { Integration } from '@shared/schema';

// Anytype API base URL
const ANYTYPE_API_BASE_URL = 'https://api.anytype.io/api/v1';

/**
 * Anytype API client
 */
export class AnytypeClient {
  private vaultKey: string;
  private apiEndpoint: string;
  private userId: string;
  private workspaceId?: string;
  
  constructor(config: {
    vaultKey: string;
    apiEndpoint?: string;
    userId: string;
    workspaceId?: string;
  }) {
    this.vaultKey = config.vaultKey;
    this.apiEndpoint = config.apiEndpoint || ANYTYPE_API_BASE_URL;
    this.userId = config.userId;
    this.workspaceId = config.workspaceId;
  }
  
  /**
   * Make an API request to Anytype
   */
  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: any
  ): Promise<T> {
    const url = `${this.apiEndpoint}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Anytype-Vault-Key': this.vaultKey,
      'X-Anytype-User-ID': this.userId
    };
    
    if (this.workspaceId) {
      headers['X-Anytype-Workspace-ID'] = this.workspaceId;
    }
    
    const response = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anytype API Error (${response.status}): ${errorText}`);
    }
    
    return response.json() as Promise<T>;
  }
  
  /**
   * Test the connection to Anytype API
   */
  async testConnection(): Promise<{ success: boolean; message: string; }> {
    try {
      await this.getUserInfo();
      return { success: true, message: 'Successfully connected to Anytype API' };
    } catch (error: any) {
      return { 
        success: false, 
        message: `Failed to connect to Anytype API: ${error.message}` 
      };
    }
  }
  
  /**
   * Get user information
   */
  async getUserInfo(): Promise<any> {
    return this.request<any>('/user', 'GET');
  }
  
  /**
   * Get available workspaces
   */
  async getWorkspaces(): Promise<any[]> {
    const response = await this.request<{ workspaces: any[] }>('/workspaces', 'GET');
    return response.workspaces || [];
  }
  
  /**
   * Get objects (notes, documents, etc.) from Anytype
   * @param limit Maximum number of objects to return
   * @param offset Pagination offset
   * @param query Optional search query
   */
  async getObjects(limit: number = 50, offset: number = 0, query?: string): Promise<any[]> {
    const queryParams = new URLSearchParams();
    queryParams.append('limit', limit.toString());
    queryParams.append('offset', offset.toString());
    
    if (query) {
      queryParams.append('query', query);
    }
    
    const response = await this.request<{ objects: any[] }>(
      `/objects?${queryParams.toString()}`,
      'GET'
    );
    
    return response.objects || [];
  }
  
  /**
   * Get a specific object by ID
   */
  async getObject(objectId: string): Promise<any> {
    return this.request<any>(`/objects/${objectId}`, 'GET');
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
    return this.request<any>('/objects', 'POST', data);
  }
  
  /**
   * Update an existing object
   */
  async updateObject(objectId: string, data: {
    title?: string;
    content?: string;
    relations?: Record<string, any>;
  }): Promise<any> {
    return this.request<any>(`/objects/${objectId}`, 'PUT', data);
  }
  
  /**
   * Delete an object
   */
  async deleteObject(objectId: string): Promise<void> {
    await this.request<void>(`/objects/${objectId}`, 'DELETE');
  }
  
  /**
   * Search for objects in Anytype
   */
  async searchObjects(query: string, limit: number = 20): Promise<any[]> {
    const response = await this.request<{ results: any[] }>(
      '/search',
      'POST',
      {
        query,
        limit,
      }
    );
    
    return response.results || [];
  }
  
  /**
   * Export data to Anytype from our system
   * @param data The data to export to Anytype
   */
  async exportData(data: {
    title: string;
    content: string;
    type?: string;
    tags?: string[];
  }): Promise<any> {
    // Prepare the relations (tags)
    const relations: Record<string, any> = {};
    
    if (data.tags && data.tags.length > 0) {
      relations.tags = data.tags;
    }
    
    return this.createObject({
      title: data.title,
      content: data.content,
      type: data.type || 'note',
      relations
    });
  }
}

/**
 * Create an Anytype client from an integration config
 */
export function createAnytypeClientFromIntegration(integration: Integration): AnytypeClient | null {
  if (integration.type !== 'anytype' || !integration.config) {
    return null;
  }
  
  const config = integration.config as any;
  
  if (!config.vaultKey || !config.userId) {
    throw new Error('Missing required Anytype configuration (vaultKey, userId)');
  }
  
  return new AnytypeClient({
    vaultKey: config.vaultKey,
    apiEndpoint: config.apiEndpoint,
    userId: config.userId,
    workspaceId: config.workspaceId
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
    const limit = options.limit || 100;
    const objects = await client.getObjects(limit);
    
    // Filter by last sync date if provided
    const filteredObjects = lastSynced
      ? objects.filter(obj => {
          const updatedAt = new Date(obj.updatedAt);
          return updatedAt > lastSynced;
        })
      : objects;
      
    // TODO: Convert Anytype objects to our system's format and store them
    // This would use the storage interface to create files or other records
    
    return {
      success: true,
      itemCount: filteredObjects.length,
    };
    
  } catch (error: any) {
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