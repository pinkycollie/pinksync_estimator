import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ModuleCategory } from './workflowEngine';
import { AISpecialization } from './moduleConnector';
import { moduleConnector } from './moduleConnector';

/**
 * Opportunity type enum
 */
export enum OpportunityType {
  PARTNERSHIP = 'partnership',
  INVESTMENT = 'investment',
  ACQUISITION = 'acquisition',
  COLLABORATION = 'collaboration',
  STARTUP = 'startup',
  PROJECT = 'project'
}

/**
 * Opportunity source enum
 */
export enum OpportunitySource {
  WEB = 'web',
  DOCUMENT = 'document',
  NEWS = 'news',
  CONTACT = 'contact',
  EMAIL = 'email',
  DATABASE = 'database',
  API = 'api'
}

/**
 * Opportunity confidence enum
 */
export enum ConfidenceLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  VERY_HIGH = 'very_high'
}

/**
 * Business opportunity interface
 */
export interface BusinessOpportunity {
  id: string;
  title: string;
  description: string;
  type: OpportunityType;
  source: OpportunitySource;
  confidence: ConfidenceLevel;
  discoveredAt: Date;
  expiresAt?: Date;
  tags: string[];
  potentialValue?: {
    min?: number;
    max?: number;
    currency?: string;
  };
  contacts?: Array<{
    name: string;
    role?: string;
    email?: string;
    phone?: string;
  }>;
  relatedDocuments?: string[];
  metadata: Record<string, any>;
}

/**
 * Scan options interface
 */
export interface ScanOptions {
  opportunityTypes?: OpportunityType[];
  confidenceThreshold?: ConfidenceLevel;
  categories?: ModuleCategory[];
  maxResults?: number;
  includeExpired?: boolean;
  useSimilaritySearch?: boolean;
  similarityThreshold?: number;
}

/**
 * Business Opportunity Scanner
 * Uses AI to scan various sources for potential opportunities
 */
export class BusinessOpportunityScanner {
  private opportunities: BusinessOpportunity[] = [];
  
  constructor() {
    // Load saved opportunities if available
    this.loadOpportunities();
  }
  
  /**
   * Load saved opportunities
   */
  private loadOpportunities(): void {
    try {
      const dataDir = path.join(process.cwd(), 'data');
      const filePath = path.join(dataDir, 'opportunities.json');
      
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf8');
        this.opportunities = JSON.parse(data);
        
        // Convert string dates to Date objects
        this.opportunities.forEach(opportunity => {
          opportunity.discoveredAt = new Date(opportunity.discoveredAt);
          if (opportunity.expiresAt) {
            opportunity.expiresAt = new Date(opportunity.expiresAt);
          }
        });
      }
    } catch (error) {
      console.error('Error loading opportunities:', error);
      this.opportunities = [];
    }
  }
  
  /**
   * Save opportunities
   */
  private saveOpportunities(): void {
    try {
      const dataDir = path.join(process.cwd(), 'data');
      
      // Create data directory if it doesn't exist
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      const filePath = path.join(dataDir, 'opportunities.json');
      fs.writeFileSync(filePath, JSON.stringify(this.opportunities, null, 2));
    } catch (error) {
      console.error('Error saving opportunities:', error);
    }
  }
  
  /**
   * Add a new opportunity
   */
  addOpportunity(opportunity: Omit<BusinessOpportunity, 'id' | 'discoveredAt'>): BusinessOpportunity {
    const newOpportunity: BusinessOpportunity = {
      ...opportunity,
      id: uuidv4(),
      discoveredAt: new Date()
    };
    
    this.opportunities.push(newOpportunity);
    this.saveOpportunities();
    
    return newOpportunity;
  }
  
  /**
   * Get all opportunities
   */
  getOpportunities(options?: ScanOptions): BusinessOpportunity[] {
    if (!options) {
      return this.opportunities;
    }
    
    let filteredOpportunities = [...this.opportunities];
    
    // Filter by opportunity type
    if (options.opportunityTypes && options.opportunityTypes.length > 0) {
      filteredOpportunities = filteredOpportunities.filter(
        opportunity => options.opportunityTypes!.includes(opportunity.type)
      );
    }
    
    // Filter by confidence threshold
    if (options.confidenceThreshold) {
      const confidenceLevels = Object.values(ConfidenceLevel);
      const thresholdIndex = confidenceLevels.indexOf(options.confidenceThreshold);
      
      filteredOpportunities = filteredOpportunities.filter(opportunity => {
        const opportunityConfidenceIndex = confidenceLevels.indexOf(opportunity.confidence);
        return opportunityConfidenceIndex >= thresholdIndex;
      });
    }
    
    // Filter by category (in metadata)
    if (options.categories && options.categories.length > 0) {
      filteredOpportunities = filteredOpportunities.filter(
        opportunity => options.categories!.includes(opportunity.metadata.category)
      );
    }
    
    // Filter out expired opportunities
    if (!options.includeExpired) {
      const now = new Date();
      filteredOpportunities = filteredOpportunities.filter(
        opportunity => !opportunity.expiresAt || opportunity.expiresAt > now
      );
    }
    
    // Limit results
    if (options.maxResults && options.maxResults > 0) {
      filteredOpportunities = filteredOpportunities.slice(0, options.maxResults);
    }
    
    return filteredOpportunities;
  }
  
  /**
   * Get opportunity by ID
   */
  getOpportunityById(id: string): BusinessOpportunity | undefined {
    return this.opportunities.find(opportunity => opportunity.id === id);
  }
  
  /**
   * Update opportunity
   */
  updateOpportunity(id: string, updates: Partial<BusinessOpportunity>): BusinessOpportunity | undefined {
    const index = this.opportunities.findIndex(opportunity => opportunity.id === id);
    
    if (index === -1) {
      return undefined;
    }
    
    // Prevent updating id or discoveredAt
    const { id: _, discoveredAt: __, ...allowedUpdates } = updates;
    
    this.opportunities[index] = {
      ...this.opportunities[index],
      ...allowedUpdates
    };
    
    this.saveOpportunities();
    
    return this.opportunities[index];
  }
  
  /**
   * Delete opportunity
   */
  deleteOpportunity(id: string): boolean {
    const initialLength = this.opportunities.length;
    this.opportunities = this.opportunities.filter(opportunity => opportunity.id !== id);
    
    const deleted = initialLength > this.opportunities.length;
    
    if (deleted) {
      this.saveOpportunities();
    }
    
    return deleted;
  }
  
  /**
   * Scan documents for opportunities
   */
  async scanDocumentsForOpportunities(
    documentPaths: string[],
    options?: ScanOptions
  ): Promise<BusinessOpportunity[]> {
    if (!documentPaths || documentPaths.length === 0) {
      return [];
    }
    
    // Prepare document sources for scanning
    const sources = documentPaths.map(path => ({
      type: 'document',
      path
    }));
    
    // Use the module connector to scan for opportunities
    const result = await moduleConnector.scanBusinessOpportunities(sources);
    
    if (!result.success || !result.opportunities || result.opportunities.length === 0) {
      return [];
    }
    
    // Convert scan results to business opportunities
    const newOpportunities: BusinessOpportunity[] = [];
    
    for (const opportunity of result.opportunities) {
      const newOpportunity = this.addOpportunity({
        title: opportunity.title,
        description: opportunity.description,
        type: this.mapOpportunityType(opportunity.type),
        source: OpportunitySource.DOCUMENT,
        confidence: this.mapConfidenceLevel(opportunity.confidenceScore),
        tags: ['auto-detected', opportunity.type],
        metadata: {
          category: this.getOpportunityCategory(opportunity.type),
          originalSource: opportunity.source,
          confidenceScore: opportunity.confidenceScore,
          relevanceScore: opportunity.relevanceScore,
          estimatedValue: opportunity.estimatedValue
        }
      });
      
      newOpportunities.push(newOpportunity);
    }
    
    return newOpportunities;
  }
  
  /**
   * Map string opportunity type to enum
   */
  private mapOpportunityType(type: string): OpportunityType {
    switch (type.toLowerCase()) {
      case 'partnership':
        return OpportunityType.PARTNERSHIP;
      case 'investment':
        return OpportunityType.INVESTMENT;
      case 'acquisition':
        return OpportunityType.ACQUISITION;
      case 'collaboration':
        return OpportunityType.COLLABORATION;
      case 'startup':
        return OpportunityType.STARTUP;
      default:
        return OpportunityType.PROJECT;
    }
  }
  
  /**
   * Map confidence score to confidence level
   */
  private mapConfidenceLevel(score: number): ConfidenceLevel {
    if (score >= 0.9) {
      return ConfidenceLevel.VERY_HIGH;
    } else if (score >= 0.75) {
      return ConfidenceLevel.HIGH;
    } else if (score >= 0.5) {
      return ConfidenceLevel.MEDIUM;
    } else {
      return ConfidenceLevel.LOW;
    }
  }
  
  /**
   * Get opportunity category based on type
   */
  private getOpportunityCategory(type: string): ModuleCategory {
    switch (type.toLowerCase()) {
      case 'partnership':
      case 'collaboration':
        return ModuleCategory.BUSINESS_DEVELOPMENT;
      case 'investment':
      case 'startup':
        return ModuleCategory.INVESTMENTS;
      case 'real estate':
        return ModuleCategory.REAL_ESTATE;
      default:
        return ModuleCategory.BUSINESS_DEVELOPMENT;
    }
  }
  
  /**
   * Generate opportunity report
   */
  generateOpportunityReport(
    opportunities: BusinessOpportunity[],
    format: 'summary' | 'detailed' | 'metrics' = 'summary'
  ): Record<string, any> {
    if (opportunities.length === 0) {
      return { opportunities: 0, message: 'No opportunities found' };
    }
    
    // Sort by confidence level (highest first)
    const confidenceLevels = Object.values(ConfidenceLevel);
    const sortedOpportunities = [...opportunities].sort((a, b) => {
      const aIndex = confidenceLevels.indexOf(a.confidence);
      const bIndex = confidenceLevels.indexOf(b.confidence);
      return bIndex - aIndex;
    });
    
    // Generate appropriate report based on format
    switch (format) {
      case 'detailed':
        return {
          totalOpportunities: opportunities.length,
          generatedAt: new Date(),
          opportunities: sortedOpportunities
        };
        
      case 'metrics':
        // Group by type
        const typeCount: Record<string, number> = {};
        for (const opportunity of opportunities) {
          typeCount[opportunity.type] = (typeCount[opportunity.type] || 0) + 1;
        }
        
        // Group by confidence
        const confidenceCount: Record<string, number> = {};
        for (const opportunity of opportunities) {
          confidenceCount[opportunity.confidence] = (confidenceCount[opportunity.confidence] || 0) + 1;
        }
        
        // Calculate average potential value
        let totalMin = 0;
        let totalMax = 0;
        let valueCount = 0;
        for (const opportunity of opportunities) {
          if (opportunity.potentialValue) {
            if (opportunity.potentialValue.min !== undefined) {
              totalMin += opportunity.potentialValue.min;
              valueCount++;
            }
            if (opportunity.potentialValue.max !== undefined) {
              totalMax += opportunity.potentialValue.max;
            }
          }
        }
        
        const avgMin = valueCount > 0 ? totalMin / valueCount : 0;
        const avgMax = valueCount > 0 ? totalMax / valueCount : 0;
        
        return {
          totalOpportunities: opportunities.length,
          generatedAt: new Date(),
          byType: typeCount,
          byConfidence: confidenceCount,
          averagePotentialValue: {
            min: avgMin,
            max: avgMax,
            currency: opportunities[0]?.potentialValue?.currency || 'USD'
          },
          timeDistribution: {
            lastWeek: opportunities.filter(o => {
              const weekAgo = new Date();
              weekAgo.setDate(weekAgo.getDate() - 7);
              return o.discoveredAt >= weekAgo;
            }).length,
            lastMonth: opportunities.filter(o => {
              const monthAgo = new Date();
              monthAgo.setMonth(monthAgo.getMonth() - 1);
              return o.discoveredAt >= monthAgo;
            }).length,
            older: opportunities.filter(o => {
              const monthAgo = new Date();
              monthAgo.setMonth(monthAgo.getMonth() - 1);
              return o.discoveredAt < monthAgo;
            }).length
          }
        };
        
      case 'summary':
      default:
        return {
          totalOpportunities: opportunities.length,
          generatedAt: new Date(),
          topOpportunities: sortedOpportunities.slice(0, 5).map(o => ({
            id: o.id,
            title: o.title,
            type: o.type,
            confidence: o.confidence,
            discoveredAt: o.discoveredAt
          })),
          byType: Object.entries(OpportunityType).reduce((acc, [_, type]) => {
            acc[type] = opportunities.filter(o => o.type === type).length;
            return acc;
          }, {} as Record<string, number>)
        };
    }
  }
}

// Export singleton instance
export const opportunityScanner = new BusinessOpportunityScanner();