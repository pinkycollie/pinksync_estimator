/**
 * AI Module Interface
 * 
 * This interface defines the contract for AI modules that can be used
 * within the Pinksync Estimator platform.
 */

export interface IAiModule {
  /** Unique identifier for the module */
  id: string;
  /** Human-readable name of the module */
  name: string;
  /** Description of what the module does */
  description: string;
  /** Version of the module */
  version: string;
  /** Whether the module is currently active */
  isActive: boolean;
  
  /** Initialize the module with configuration */
  init(config: Record<string, unknown>): Promise<void>;
  
  /** Check if the module is healthy */
  health(): Promise<{ status: 'ok' | 'error'; message?: string }>;
  
  /** Analyze input data */
  analyze(input: unknown): Promise<unknown>;
  
  /** Handle a request */
  handle(request: unknown): Promise<unknown>;
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