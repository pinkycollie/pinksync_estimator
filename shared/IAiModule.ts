export type AiModuleResult = {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: Record<string, any>;
};

export interface IAiModule {
  id: string;
  name: string;
  specialization: string; // e.g., 'code-assistant', 'real-estate', 'document-summarizer'
  init?(opts?: { configPath?: string }): Promise<void>;
  healthCheck?(): Promise<{ healthy: boolean; details?: any }>;
  analyze?(input: { path?: string; text?: string; metadata?: Record<string, any> }, options?: any): Promise<AiModuleResult>;
  handleRequest?(payload: any): Promise<AiModuleResult>;
  shutdown?(): Promise<void>;
}
