/**
 * AI Module Interface
 * Base interface for AI-powered modules in the system
 */

export interface ModuleInput {
  [key: string]: any;
}

export interface ModuleOutput {
  [key: string]: any;
}

export interface OperationParams {
  [key: string]: any;
}

export interface IAiModule {
  id: string;
  name: string;
  description: string;
  version: string;
  
  /**
   * Initialize the module
   */
  init(): Promise<void>;
  
  /**
   * Check module health
   */
  health(): Promise<boolean>;
  
  /**
   * Analyze input data
   */
  analyze(input: ModuleInput): Promise<ModuleOutput>;
  
  /**
   * Handle module-specific operations
   */
  handle(operation: string, params: OperationParams): Promise<ModuleOutput>;
}