import { pythonBridge } from './pythonBridge';
import { platformOptimizer, ModelSize, TaskComplexity, PlatformDefaults } from './platformOptimizer';

// Supported AI scripts from uploaded assets
export enum AIAssetType {
  PLATFORM_ANALYZER = 'ai-platform-analyzer.py',
  CHECKLIST_AGENT = 'checklist-agent.py',
  CHECKLIST_AGENT_V2 = 'checklist-agent 2.py',
  CHECKLIST_AGENT_V3 = 'checklist-agent 3.py',
  RESPONSIBILITY_CHECKLIST = 'ai-responsibility-checklist.py',
  ECOSYSTEM_ROADMAP = 'ai-ecosystem-roadmap.py',
  ORGANIC_GOVERNANCE = 'organic-ai-governance.py'
}

// Mapping of asset types to their complexity and model size
export const AIAssetProperties: Record<AIAssetType, { 
  complexity: TaskComplexity, 
  modelSize: ModelSize,
  description: string
}> = {
  [AIAssetType.PLATFORM_ANALYZER]: {
    complexity: TaskComplexity.MODERATE,
    modelSize: ModelSize.SMALL,
    description: 'Analyzes platform compatibility for AI models'
  },
  [AIAssetType.CHECKLIST_AGENT]: {
    complexity: TaskComplexity.SIMPLE,
    modelSize: ModelSize.TINY,
    description: 'Generates business checklists with validations'
  },
  [AIAssetType.CHECKLIST_AGENT_V2]: {
    complexity: TaskComplexity.MODERATE,
    modelSize: ModelSize.SMALL,
    description: 'Enhanced business checklist generator with industry specifics'
  },
  [AIAssetType.CHECKLIST_AGENT_V3]: {
    complexity: TaskComplexity.MODERATE,
    modelSize: ModelSize.SMALL,
    description: 'Comprehensive business checklist generator'
  },
  [AIAssetType.RESPONSIBILITY_CHECKLIST]: {
    complexity: TaskComplexity.COMPLEX,
    modelSize: ModelSize.MEDIUM,
    description: 'Generates AI responsibility assessment reports'
  },
  [AIAssetType.ECOSYSTEM_ROADMAP]: {
    complexity: TaskComplexity.COMPLEX,
    modelSize: ModelSize.MEDIUM,
    description: 'Creates AI ecosystem development roadmaps'
  },
  [AIAssetType.ORGANIC_GOVERNANCE]: {
    complexity: TaskComplexity.VERY_COMPLEX,
    modelSize: ModelSize.LARGE,
    description: 'Implements hierarchical AI governance structures'
  }
};

/**
 * AI Middleware handles the execution of AI assets with appropriate
 * platform optimizations
 */
export class AIMiddleware {
  /**
   * Execute an AI asset with platform-specific optimizations
   */
  public async executeAIAsset(
    assetType: AIAssetType,
    inputData: any,
    platform: keyof typeof PlatformDefaults = 'server'
  ): Promise<any> {
    // Get asset properties
    const assetProps = AIAssetProperties[assetType];
    
    if (!assetProps) {
      throw new Error(`Unknown AI asset type: ${assetType}`);
    }
    
    // Check if we need to optimize for iOS
    let targetPlatform = platform;
    
    // Auto-determine best platform if not explicitly specified
    if (platform === 'auto') {
      targetPlatform = platformOptimizer.recommendPlatform(
        assetProps.modelSize, 
        assetProps.complexity
      );
      console.log(`Auto-selected platform: ${targetPlatform} for asset: ${assetType}`);
    }
    
    // For iOS, check if we can run it directly or need to offload
    if (targetPlatform === 'ios') {
      const canRunOnIOS = platformOptimizer.canRunOnPlatform(
        assetProps.modelSize, 
        assetProps.complexity, 
        'ios'
      );
      
      if (!canRunOnIOS) {
        console.log(`Asset ${assetType} too complex for iOS, offloading to cloud`);
        targetPlatform = 'cloud';
      } else {
        // Ensure we have optimized version for iOS
        await pythonBridge.optimizeForIOS(assetType);
      }
    }
    
    // Get optimization config for iOS if applicable
    const optimizationConfig = targetPlatform === 'ios' 
      ? platformOptimizer.getIOSOptimizationConfig(assetProps.modelSize)
      : {};
    
    // Add optimization parameters to input data if iOS
    const enhancedInputData = targetPlatform === 'ios'
      ? { ...inputData, optimizationConfig }
      : inputData;
    
    // Execute the AI asset with platform-specific settings
    return pythonBridge.executePythonScript({
      scriptName: assetType,
      inputData: enhancedInputData,
      platform: targetPlatform as 'server' | 'ios' | 'cloud',
      timeout: this.calculateTimeout(assetProps.complexity, targetPlatform)
    });
  }
  
  /**
   * Calculate appropriate timeout based on complexity and platform
   */
  private calculateTimeout(
    complexity: TaskComplexity, 
    platform: keyof typeof PlatformDefaults
  ): number {
    // Base timeout in milliseconds
    const baseTimeout = 30000;
    
    // Multiplier based on complexity
    const complexityMultiplier = {
      [TaskComplexity.SIMPLE]: 1,
      [TaskComplexity.MODERATE]: 2,
      [TaskComplexity.COMPLEX]: 4,
      [TaskComplexity.VERY_COMPLEX]: 8
    };
    
    // Platform-specific adjustment (iOS is more constrained)
    const platformAdjustment: Record<keyof typeof PlatformDefaults, number> = {
      ios: 0.8, // Shorter timeout for iOS
      server: 1.5,
      cloud: 3.0, // Cloud allows longer running processes
      android: 0.8
    };
    
    return baseTimeout * complexityMultiplier[complexity] * platformAdjustment[platform];
  }
  
  /**
   * Execute AI Platform Analyzer
   */
  public async analyzePlatformCompatibility(
    modelName: string,
    platform: string,
    optimizationTarget: keyof typeof PlatformDefaults = 'server'
  ): Promise<any> {
    return this.executeAIAsset(
      AIAssetType.PLATFORM_ANALYZER,
      {
        operation: 'analyze_compatibility',
        model: modelName,
        platform: platform
      },
      optimizationTarget
    );
  }
  
  /**
   * Find optimal AI models for a platform
   */
  public async findOptimalModels(
    platform: string,
    requiredCapabilities: string[] = [],
    optimizationTarget: keyof typeof PlatformDefaults = 'server'
  ): Promise<any> {
    return this.executeAIAsset(
      AIAssetType.PLATFORM_ANALYZER,
      {
        operation: 'find_optimal_models',
        platform,
        required_capabilities: requiredCapabilities
      },
      optimizationTarget
    );
  }
  
  /**
   * Generate business checklist
   */
  public async generateBusinessChecklist(
    category: string,
    phase: string,
    industryType: string = 'general',
    optimizationTarget: keyof typeof PlatformDefaults = 'ios' // Using optimized version by default
  ): Promise<any> {
    return this.executeAIAsset(
      AIAssetType.CHECKLIST_AGENT_V2, // Using the enhanced version
      {
        category,
        phase,
        industry_type: industryType
      },
      optimizationTarget
    );
  }
  
  /**
   * Generate AI responsibility report
   */
  public async generateResponsibilityReport(
    aiSystem: any,
    optimizationTarget: keyof typeof PlatformDefaults = 'server'
  ): Promise<any> {
    return this.executeAIAsset(
      AIAssetType.RESPONSIBILITY_CHECKLIST,
      {
        ai_system: aiSystem,
        generate_full_report: true
      },
      optimizationTarget
    );
  }
  
  /**
   * Generate AI ecosystem roadmap
   */
  public async generateEcosystemRoadmap(
    currentCapabilities: any,
    targetCapabilities: any,
    timeframe: string,
    optimizationTarget: keyof typeof PlatformDefaults = 'server'
  ): Promise<any> {
    return this.executeAIAsset(
      AIAssetType.ECOSYSTEM_ROADMAP,
      {
        current_capabilities: currentCapabilities,
        target_capabilities: targetCapabilities,
        timeframe: timeframe,
        include_resource_planning: true
      },
      optimizationTarget
    );
  }
  
  /**
   * Create organic AI governance system
   */
  public async createOrganicGovernance(
    rootEntity: any,
    topologyType: string = 'hierarchical',
    optimizationTarget: keyof typeof PlatformDefaults = 'cloud' // This is complex, so default to cloud
  ): Promise<any> {
    return this.executeAIAsset(
      AIAssetType.ORGANIC_GOVERNANCE,
      {
        root_entity: rootEntity,
        topology_type: topologyType,
        use_golden_ratio: true,
        calculate_systemic_potential: true
      },
      optimizationTarget
    );
  }
}

export const aiMiddleware = new AIMiddleware();