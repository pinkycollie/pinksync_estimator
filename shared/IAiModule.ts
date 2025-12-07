/**
 * AI Module Interface
 * Base interface for AI-powered modules in the system
 */
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
  analyze(input: any): Promise<any>;
  
  /**
   * Handle module-specific operations
   */
  handle(operation: string, params: any): Promise<any>;
}