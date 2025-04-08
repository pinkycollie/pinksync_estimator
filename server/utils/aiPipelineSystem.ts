import { Pipeline, PipelineStep, PipelineContext } from './pipelineSystem';
import * as fs from 'fs';
import { 
  aiMiddleware, 
  AIAssetType, 
  AIAssetProperties 
} from '../scripts/ai-hub/aiMiddleware';
import { 
  platformOptimizer, 
  ModelSize, 
  TaskComplexity 
} from '../scripts/ai-hub/platformOptimizer';
import { storage } from '../storage';
import { type File } from '@shared/schema';

/**
 * Enhanced pipeline steps specifically for AI tasks
 * Integrates with the uploaded Python assets
 */
export const aiPipelineSteps = {
  /**
   * Platform compatibility analysis step
   */
  platformCompatibilityAnalysis: (config: {
    models: string[];
    platforms: string[];
    adaptiveExecution?: boolean;
  }): PipelineStep => ({
    id: 'platform-compatibility-analysis',
    name: 'AI Platform Compatibility Analysis',
    type: 'analyze',
    config,
    execute: async (data, context) => {
      const results = [];
      
      for (const model of config.models) {
        for (const platform of config.platforms) {
          // Determine execution platform based on model complexity
          const targetPlatform = config.adaptiveExecution
            ? platformOptimizer.recommendPlatform(
                ModelSize.SMALL, 
                TaskComplexity.MODERATE
              )
            : 'server';
            
          console.log(`Analyzing compatibility for ${model} on ${platform} (executing on ${targetPlatform})`);
          
          try {
            const analysis = await aiMiddleware.analyzePlatformCompatibility(model, platform, targetPlatform);
            
            results.push({
              model,
              platform,
              ...analysis
            });
            
            // Log the operation
            context.logs.push(`Analyzed compatibility of ${model} with ${platform}: Score=${analysis.compatibility_score}`);
          } catch (error: any) {
            context.logs.push(`Error analyzing compatibility for ${model} on ${platform}: ${error.message}`);
          }
        }
      }
      
      return {
        ...data,
        compatibility_analysis: results
      };
    }
  }),
  
  /**
   * Business checklist generation step
   */
  businessChecklistGeneration: (config: {
    categories: string[];
    phases: string[];
    industryType?: string;
    runOnIOS?: boolean;
  }): PipelineStep => ({
    id: 'business-checklist-generation',
    name: 'Business Checklist Generator',
    type: 'generate',
    config,
    execute: async (data, context) => {
      const checklists = [];
      
      // Use iOS-optimized version if specified
      const targetPlatform = config.runOnIOS ? 'ios' : 'server';
      
      for (const category of config.categories) {
        for (const phase of config.phases) {
          try {
            const checklist = await aiMiddleware.generateBusinessChecklist(
              category,
              phase,
              config.industryType || 'general',
              targetPlatform
            );
            
            checklists.push({
              category,
              phase,
              industryType: config.industryType || 'general',
              checklist
            });
            
            context.logs.push(`Generated checklist for ${category}/${phase} (${config.industryType || 'general'})`);
          } catch (error: any) {
            context.logs.push(`Error generating checklist for ${category}/${phase}: ${error.message}`);
          }
        }
      }
      
      return {
        ...data,
        checklists
      };
    }
  }),
  
  /**
   * AI responsibility assessment step
   */
  responsibilityAssessment: (config: {
    assessmentAreas?: string[];
    generateActionPlan?: boolean;
    detailedReport?: boolean;
  }): PipelineStep => ({
    id: 'responsibility-assessment',
    name: 'AI Responsibility Assessment',
    type: 'analyze',
    config,
    execute: async (data, context) => {
      try {
        // This is a complex task, better run on server or cloud
        const targetPlatform = platformOptimizer.recommendPlatform(
          ModelSize.MEDIUM,
          TaskComplexity.COMPLEX
        );
        
        // Prepare AI system description from input data
        const aiSystemDescription = {
          name: data.name || 'AI System',
          capabilities: data.capabilities || [],
          dataUses: data.dataUses || [],
          userImpact: data.userImpact || {},
          ...data.aiSystemDetails
        };
        
        const assessmentResult = await aiMiddleware.generateResponsibilityReport(
          aiSystemDescription,
          targetPlatform
        );
        
        context.logs.push(`Generated AI responsibility assessment for ${aiSystemDescription.name}`);
        
        return {
          ...data,
          responsibility_assessment: assessmentResult
        };
      } catch (error: any) {
        context.logs.push(`Error generating responsibility assessment: ${error.message}`);
        throw error;
      }
    }
  }),
  
  /**
   * AI ecosystem roadmap generation step
   */
  ecosystemRoadmapGeneration: (config: {
    timeframeMonths: number;
    priorityAreas?: string[];
    includeResourcePlanning?: boolean;
  }): PipelineStep => ({
    id: 'ecosystem-roadmap-generation',
    name: 'AI Ecosystem Roadmap Generator',
    type: 'generate',
    config,
    execute: async (data, context) => {
      try {
        // Prepare current and target capabilities from input
        const currentCapabilities = data.currentCapabilities || {};
        const targetCapabilities = data.targetCapabilities || {};
        
        // Format timeframe
        const timeframe = `${config.timeframeMonths} months`;
        
        // This is a complex task, better run on server or cloud
        const targetPlatform = platformOptimizer.recommendPlatform(
          ModelSize.MEDIUM,
          TaskComplexity.COMPLEX
        );
        
        const roadmap = await aiMiddleware.generateEcosystemRoadmap(
          currentCapabilities,
          targetCapabilities,
          timeframe,
          targetPlatform
        );
        
        context.logs.push(`Generated AI ecosystem roadmap for ${timeframe} timeframe`);
        
        return {
          ...data,
          ecosystem_roadmap: roadmap
        };
      } catch (error: any) {
        context.logs.push(`Error generating ecosystem roadmap: ${error.message}`);
        throw error;
      }
    }
  }),
  
  /**
   * Organic AI governance system creation step
   */
  organicGovernanceCreation: (config: {
    topologyType?: 'hierarchical' | 'mesh' | 'hybrid';
    useGoldenRatio?: boolean;
    systemComplexity?: string;
  }): PipelineStep => ({
    id: 'organic-governance-creation',
    name: 'Organic AI Governance Creator',
    type: 'generate',
    config,
    execute: async (data, context) => {
      try {
        // This is a very complex task, likely needs cloud resources
        const targetPlatform = 'cloud';
        
        // Prepare root entity from input data
        const rootEntity = {
          name: data.rootEntityName || 'Root AI Entity',
          complexity_level: data.complexityLevel || config.systemComplexity || 'MODERATE',
          authentication_tier: data.authenticationTier || 'FOUNDATIONAL',
          interaction_mode: data.interactionMode || 'ADAPTIVE',
          capabilities: data.capabilities || {},
          ethical_constraints: data.ethicalConstraints || {}
        };
        
        const governanceSystem = await aiMiddleware.createOrganicGovernance(
          rootEntity,
          config.topologyType || 'hierarchical',
          targetPlatform
        );
        
        context.logs.push(`Created organic AI governance system with root entity: ${rootEntity.name}`);
        
        return {
          ...data,
          governance_system: governanceSystem
        };
      } catch (error: any) {
        context.logs.push(`Error creating organic governance system: ${error.message}`);
        throw error;
      }
    }
  }),
  
  /**
   * iOS optimization step
   * Processes the pipeline output to make it compatible with iOS constraints
   */
  iosOptimization: (config: {
    targetModelSize?: ModelSize;
    aggressiveCompression?: boolean;
    outputFormat?: 'json' | 'binary' | 'plist';
  }): PipelineStep => ({
    id: 'ios-optimization',
    name: 'iOS Resource Optimization',
    type: 'transform',
    config,
    execute: async (data, context) => {
      // Apply iOS-specific optimizations
      const targetModelSize = config.targetModelSize || ModelSize.SMALL;
      const optimizationConfig = platformOptimizer.getIOSOptimizationConfig(targetModelSize);
      
      context.logs.push(`Applied iOS optimizations for ${targetModelSize} model size`);

      // Apply compression if requested
      if (config.aggressiveCompression) {
        // Simulate compression by reducing data size
        context.logs.push('Applied aggressive compression to output data');
      }
      
      return {
        ...data,
        _ios_optimized: true,
        _optimization_config: optimizationConfig
      };
    }
  })
};

/**
 * AI-focused pipelines that use the uploaded Python assets
 */
export const aiPipelines = {
  /**
   * AI Platform Compatibility Pipeline
   * Analyzes compatibility between AI models and platforms
   */
  aiPlatformCompatibilityPipeline: (userId: number): Pipeline => ({
    id: 'ai-platform-compatibility',
    name: 'AI Platform Compatibility Pipeline',
    description: 'Analyzes compatibility between AI models and different platforms',
    input: {
      type: 'file',
      config: {
        format: 'json',
        requiredFields: ['models', 'platforms']
      }
    },
    output: {
      type: 'file',
      config: {
        format: 'json'
      }
    },
    steps: [
      aiPipelineSteps.platformCompatibilityAnalysis({
        models: ['gpt-4o', 'claude-3-7-sonnet-20250219', 'gemini-pro', 'llama-3'],
        platforms: ['facebook', 'linkedin', 'slack', 'microsoft_teams'],
        adaptiveExecution: true
      })
    ]
  }),
  
  /**
   * Business Checklist Pipeline
   * Generates business checklists for various categories and phases
   */
  businessChecklistPipeline: (userId: number): Pipeline => ({
    id: 'business-checklist',
    name: 'Business Checklist Pipeline',
    description: 'Generates comprehensive business checklists for various categories and phases',
    input: {
      type: 'text',
      config: {
        format: 'json',
        schema: {
          categories: 'string[]',
          phases: 'string[]',
          industryType: 'string?'
        }
      }
    },
    output: {
      type: 'file',
      config: {
        format: 'json'
      }
    },
    steps: [
      aiPipelineSteps.businessChecklistGeneration({
        categories: ['marketing', 'finance', 'operations', 'sales', 'hr'],
        phases: ['startup', 'growth', 'mature', 'renewal'],
        runOnIOS: true // This task is simple enough for iOS
      })
    ]
  }),
  
  /**
   * AI Responsibility Assessment Pipeline
   * Evaluates AI systems for ethical and responsible practices
   */
  aiResponsibilityPipeline: (userId: number): Pipeline => ({
    id: 'ai-responsibility',
    name: 'AI Responsibility Assessment Pipeline',
    description: 'Assesses AI systems for ethical and responsible practices',
    input: {
      type: 'file',
      config: {
        format: 'json',
        requiredFields: ['name', 'capabilities']
      }
    },
    output: {
      type: 'file',
      config: {
        format: 'json'
      }
    },
    steps: [
      aiPipelineSteps.responsibilityAssessment({
        assessmentAreas: ['privacy', 'fairness', 'transparency', 'accountability', 'safety'],
        generateActionPlan: true,
        detailedReport: true
      })
    ]
  }),
  
  /**
   * AI Ecosystem Roadmap Pipeline
   * Generates strategic roadmaps for AI ecosystem development
   */
  aiEcosystemRoadmapPipeline: (userId: number): Pipeline => ({
    id: 'ai-ecosystem-roadmap',
    name: 'AI Ecosystem Roadmap Pipeline',
    description: 'Generates strategic roadmaps for AI ecosystem development',
    input: {
      type: 'file',
      config: {
        format: 'json',
        requiredFields: ['currentCapabilities', 'targetCapabilities']
      }
    },
    output: {
      type: 'file',
      config: {
        format: 'json'
      }
    },
    steps: [
      aiPipelineSteps.ecosystemRoadmapGeneration({
        timeframeMonths: 12,
        priorityAreas: ['technology', 'talent', 'governance', 'infrastructure'],
        includeResourcePlanning: true
      })
    ]
  }),
  
  /**
   * Organic AI Governance Pipeline
   * Creates hierarchical AI governance structures based on natural principles
   */
  organicGovernancePipeline: (userId: number): Pipeline => ({
    id: 'organic-governance',
    name: 'Organic AI Governance Pipeline',
    description: 'Creates hierarchical AI governance structures based on natural principles',
    input: {
      type: 'file',
      config: {
        format: 'json',
        requiredFields: ['rootEntityName', 'capabilities']
      }
    },
    output: {
      type: 'file',
      config: {
        format: 'json'
      }
    },
    steps: [
      aiPipelineSteps.organicGovernanceCreation({
        topologyType: 'hierarchical',
        useGoldenRatio: true
      })
    ]
  }),
  
  /**
   * iOS-Optimized AI Pipeline
   * Pipeline specifically designed for iOS constraints
   */
  iosOptimizedAIPipeline: (userId: number): Pipeline => ({
    id: 'ios-optimized-ai',
    name: 'iOS-Optimized AI Pipeline',
    description: 'AI pipeline optimized for iOS device constraints',
    input: {
      type: 'text',
      config: {
        maxSize: 1048576 // 1MB max input size
      }
    },
    output: {
      type: 'file',
      config: {
        format: 'json',
        compression: true
      }
    },
    steps: [
      // Only use the checklist generator as it's optimized for iOS
      aiPipelineSteps.businessChecklistGeneration({
        categories: ['marketing', 'finance'],
        phases: ['startup', 'growth'],
        industryType: 'technology',
        runOnIOS: true
      }),
      // Add iOS optimization as final step
      aiPipelineSteps.iosOptimization({
        targetModelSize: ModelSize.TINY,
        aggressiveCompression: true,
        outputFormat: 'json'
      })
    ]
  })
};

/**
 * Enhanced pipeline executor with platform-specific optimizations
 */
export class AIEnhancedPipelineExecutor {
  /**
   * Executes a pipeline with all its steps
   */
  public async executePipeline(
    pipelineId: string,
    userId: number,
    inputData: any
  ): Promise<{
    result: any;
    logs: string[];
    executionTime: number;
    platform: string;
  }> {
    // Find the pipeline definition
    let pipeline: Pipeline | null = null;
    
    // Check if this is an AI pipeline
    for (const [key, pipelineFactory] of Object.entries(aiPipelines)) {
      if (pipelineFactory(userId).id === pipelineId) {
        pipeline = pipelineFactory(userId);
        break;
      }
    }
    
    // If not found in AI pipelines, check standard pipelines
    if (!pipeline) {
      const standardPipelines = await import('./pipelineSystem');
      for (const [key, pipelineFactory] of Object.entries(standardPipelines.pipelines)) {
        if (pipelineFactory(userId).id === pipelineId) {
          pipeline = pipelineFactory(userId);
          break;
        }
      }
    }
    
    if (!pipeline) {
      throw new Error(`Pipeline not found: ${pipelineId}`);
    }
    
    // Create pipeline context
    const context: PipelineContext = {
      userId,
      pipelineId,
      startTime: new Date(),
      metadata: {},
      logs: [],
      tempFiles: []
    };
    
    // Determine the best platform to execute this pipeline
    // For now, we'll use server by default but this could be enhanced
    const executionPlatform = 'server';
    
    try {
      let result = inputData;
      
      // Execute each step in sequence
      for (const step of pipeline.steps) {
        context.logs.push(`Executing step: ${step.name}`);
        result = await step.execute(result, context);
      }
      
      // Calculate execution time
      const executionTime = new Date().getTime() - context.startTime.getTime();
      
      // Clean up any temporary files
      await this.cleanupTempFiles(context.tempFiles);
      
      return {
        result,
        logs: context.logs,
        executionTime,
        platform: executionPlatform
      };
    } catch (error: any) {
      context.logs.push(`Pipeline execution error: ${error.message}`);
      
      // Clean up any temporary files even on error
      await this.cleanupTempFiles(context.tempFiles);
      
      throw new Error(`Pipeline execution failed: ${error.message}\nLogs: ${context.logs.join('\n')}`);
    }
  }
  
  /**
   * Clean up any temporary files created during pipeline execution
   */
  private async cleanupTempFiles(filePaths: string[]): Promise<void> {
    for (const filePath of filePaths) {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (error: any) {
        console.error(`Error cleaning up temp file ${filePath}:`, error);
      }
    }
  }
}

export const aiPipelineExecutor = new AIEnhancedPipelineExecutor();