/**
 * PinkFlow TestContainer Integration
 * 
 * Connects to pinkflow testcontainer for:
 * - Test validation
 * - Implementation options
 * - Approval workflows
 * - Implementation tracking
 * 
 * Repository: github.com/pinkycollie/pinkflow
 */

// Using global fetch (built-in in Node.js 18+)

export interface TestContainerConfig {
  apiUrl: string;
  apiKey?: string;
  timeout?: number;
}

export interface TestValidationRequest {
  projectId: string;
  testSuite: string;
  testCases: Array<{
    name: string;
    description: string;
    expectedResult: string;
  }>;
}

export interface ValidationResult {
  success: boolean;
  testsPassed: number;
  testsFailed: number;
  details: Array<{
    test: string;
    status: 'pass' | 'fail' | 'skip';
    message?: string;
  }>;
}

export interface ImplementationOption {
  id: string;
  name: string;
  description: string;
  complexity: 'low' | 'medium' | 'high';
  estimatedTime: string;
  accessibility: 'full' | 'partial' | 'none';
  deafCommunityFriendly: boolean;
}

export interface ApprovalRequest {
  projectId: string;
  implementationOptionId: string;
  requestedBy: string;
  accessibilityRequirements: string[];
}

export interface ApprovalStatus {
  approved: boolean;
  approvedBy?: string;
  approvedAt?: string;
  comments?: string;
  conditions?: string[];
}

export class PinkFlowConnector {
  private config: TestContainerConfig;

  constructor(config: TestContainerConfig) {
    this.config = {
      timeout: 30000,
      ...config
    };
  }

  /**
   * Validate project implementation
   */
  async validateImplementation(request: TestValidationRequest): Promise<ValidationResult> {
    try {
      const response = await fetch(`${this.config.apiUrl}/api/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`Validation failed: ${response.statusText}`);
      }

      return await response.json() as ValidationResult;
    } catch (error) {
      console.error('PinkFlow validation error:', error);
      throw error;
    }
  }

  /**
   * Get implementation options for a project
   */
  async getImplementationOptions(projectId: string): Promise<ImplementationOption[]> {
    try {
      const response = await fetch(
        `${this.config.apiUrl}/api/implementation-options?projectId=${projectId}`,
        {
          headers: {
            ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to get options: ${response.statusText}`);
      }

      return await response.json() as ImplementationOption[];
    } catch (error) {
      console.error('PinkFlow get options error:', error);
      return [];
    }
  }

  /**
   * Submit implementation for approval
   */
  async submitForApproval(request: ApprovalRequest): Promise<ApprovalStatus> {
    try {
      const response = await fetch(`${this.config.apiUrl}/api/approval`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`Approval submission failed: ${response.statusText}`);
      }

      return await response.json() as ApprovalStatus;
    } catch (error) {
      console.error('PinkFlow approval error:', error);
      throw error;
    }
  }

  /**
   * Check approval status
   */
  async checkApprovalStatus(projectId: string): Promise<ApprovalStatus> {
    try {
      const response = await fetch(
        `${this.config.apiUrl}/api/approval/status?projectId=${projectId}`,
        {
          headers: {
            ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to check status: ${response.statusText}`);
      }

      return await response.json() as ApprovalStatus;
    } catch (error) {
      console.error('PinkFlow status check error:', error);
      throw error;
    }
  }

  /**
   * Test connection to PinkFlow container
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.apiUrl}/health`);
      return response.ok;
    } catch (error) {
      console.error('PinkFlow connection test failed:', error);
      return false;
    }
  }
}

// Factory function to create connector with environment variables
export function createPinkFlowConnector(): PinkFlowConnector {
  const apiUrl = process.env.PINKFLOW_API_URL || 'https://pinkflow.pinkycollie.dev';
  const apiKey = process.env.PINKFLOW_API_KEY;

  return new PinkFlowConnector({
    apiUrl,
    apiKey
  });
}

export const pinkFlowConnector = createPinkFlowConnector();
