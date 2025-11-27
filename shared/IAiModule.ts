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
}