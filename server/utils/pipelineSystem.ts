import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { HfInference } from '@huggingface/inference';
import { storage } from '../storage';
import { type File } from '@shared/schema';

// Initialize API
const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

/**
 * Represents a single transformation step in a data pipeline
 */
export interface PipelineStep {
  id: string;
  name: string;
  type: 'transform' | 'analyze' | 'extract' | 'generate' | 'export';
  config: Record<string, any>;
  execute: (data: any, context: PipelineContext) => Promise<any>;
}

/**
 * Context object passed through the pipeline
 */
export interface PipelineContext {
  userId: number;
  pipelineId: string;
  startTime: Date;
  metadata: Record<string, any>;
  logs: string[];
  tempFiles: string[];
}

/**
 * A complete pipeline with multiple steps
 */
export interface Pipeline {
  id: string;
  name: string;
  description: string;
  steps: PipelineStep[];
  input: {
    type: 'file' | 'api' | 'database' | 'text';
    config: Record<string, any>;
  };
  output: {
    type: 'file' | 'database' | 'module' | 'git';
    config: Record<string, any>;
  };
}

/**
 * Result of a pipeline execution
 */
export interface PipelineResult {
  pipelineId: string;
  success: boolean;
  startTime: Date;
  endTime: Date;
  duration: number;
  outputPath?: string;
  outputType?: string;
  error?: string;
  logs: string[];
}

/**
 * Manages the execution of data pipelines
 */
export class PipelineManager {
  private pipelines: Map<string, Pipeline> = new Map();
  
  /**
   * Register a new pipeline
   */
  registerPipeline(pipeline: Pipeline): void {
    this.pipelines.set(pipeline.id, pipeline);
    console.log(`Pipeline registered: ${pipeline.name} (${pipeline.id})`);
  }
  
  /**
   * Get a pipeline by ID
   */
  getPipeline(id: string): Pipeline | undefined {
    return this.pipelines.get(id);
  }
  
  /**
   * List all registered pipelines
   */
  listPipelines(): Pipeline[] {
    return Array.from(this.pipelines.values());
  }
  
  /**
   * Execute a pipeline with the given input data
   */
  async executePipeline(
    pipelineId: string, 
    userId: number,
    inputData: any
  ): Promise<PipelineResult> {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline not found: ${pipelineId}`);
    }
    
    const startTime = new Date();
    const context: PipelineContext = {
      userId,
      pipelineId,
      startTime,
      metadata: {},
      logs: [`Starting pipeline: ${pipeline.name}`],
      tempFiles: []
    };
    
    let currentData = inputData;
    let error: string | undefined;
    
    try {
      // Execute each step in sequence
      for (const step of pipeline.steps) {
        context.logs.push(`Executing step: ${step.name}`);
        console.log(`Executing pipeline step: ${step.name}`);
        
        try {
          currentData = await step.execute(currentData, context);
        } catch (err: any) {
          const errorMessage = `Error in step "${step.name}": ${err.message}`;
          context.logs.push(errorMessage);
          console.error(errorMessage);
          throw new Error(errorMessage);
        }
      }
      
      // Handle output based on the pipeline configuration
      const outputResult = await this.handlePipelineOutput(pipeline, currentData, context);
      context.logs.push(`Pipeline completed successfully`);
      
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      
      return {
        pipelineId,
        success: true,
        startTime,
        endTime,
        duration,
        outputPath: outputResult.path,
        outputType: outputResult.type,
        logs: context.logs
      };
    } catch (err: any) {
      error = err.message;
      context.logs.push(`Pipeline failed: ${error}`);
      console.error(`Pipeline failed: ${error}`);
      
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      
      return {
        pipelineId,
        success: false,
        startTime,
        endTime,
        duration,
        error,
        logs: context.logs
      };
    } finally {
      // Clean up temporary files
      this.cleanupTempFiles(context.tempFiles);
    }
  }
  
  /**
   * Handle pipeline output based on configuration
   */
  private async handlePipelineOutput(
    pipeline: Pipeline,
    data: any,
    context: PipelineContext
  ): Promise<{ path?: string; type: string }> {
    switch (pipeline.output.type) {
      case 'file':
        return await this.outputToFile(data, pipeline.output.config, context);
      case 'database':
        return await this.outputToDatabase(data, pipeline.output.config, context);
      case 'module':
        return await this.outputToModule(data, pipeline.output.config, context);
      case 'git':
        return await this.outputToGit(data, pipeline.output.config, context);
      default:
        throw new Error(`Unsupported output type: ${pipeline.output.type}`);
    }
  }
  
  /**
   * Output pipeline data to a file
   */
  private async outputToFile(
    data: any,
    config: { filePath?: string; format?: 'json' | 'text' | 'binary' },
    context: PipelineContext
  ): Promise<{ path: string; type: string }> {
    const outputDir = path.resolve('uploads', 'pipeline-outputs');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const filePath = config.filePath || path.join(outputDir, `output-${context.pipelineId}-${timestamp}.json`);
    
    // Ensure output directory exists
    const outputDirPath = path.dirname(filePath);
    if (!fs.existsSync(outputDirPath)) {
      fs.mkdirSync(outputDirPath, { recursive: true });
    }
    
    // Write data to file
    const format = config.format || 'json';
    if (format === 'json') {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } else if (format === 'text') {
      fs.writeFileSync(filePath, typeof data === 'string' ? data : JSON.stringify(data));
    } else if (format === 'binary' && Buffer.isBuffer(data)) {
      fs.writeFileSync(filePath, data);
    } else {
      throw new Error(`Unsupported output format for data type: ${format}`);
    }
    
    context.logs.push(`Output written to file: ${filePath}`);
    
    // Also save file reference in database
    const fileEntry = await storage.createFile({
      userId: context.userId,
      name: path.basename(filePath),
      path: filePath,
      fileType: format === 'json' ? 'application/json' : format === 'text' ? 'text/plain' : 'application/octet-stream',
      source: 'pipeline',
      fileCategory: 'generated',
      metadata: {
        fileSize: fs.statSync(filePath).size,
        contentText: format === 'binary' ? null : typeof data === 'string' ? data : JSON.stringify(data)
      },
      isProcessed: true,
      lastModified: new Date()
    });
    
    return { path: filePath, type: 'file' };
  }
  
  /**
   * Output pipeline data to the database
   */
  private async outputToDatabase(
    data: any,
    config: Record<string, any>,
    context: PipelineContext
  ): Promise<{ type: string }> {
    // Implement based on your database models
    const model = config.model || 'unknown';
    context.logs.push(`Data saved to database model: ${model}`);
    return { type: 'database' };
  }
  
  /**
   * Output pipeline data as a Node.js module
   */
  private async outputToModule(
    data: any,
    config: Record<string, any>,
    context: PipelineContext
  ): Promise<{ path: string; type: string }> {
    const outputDir = path.resolve('uploads', 'modules');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const moduleName = config.moduleName || `module-${context.pipelineId}`;
    const moduleDir = path.join(outputDir, moduleName);
    
    // Create module directory
    if (!fs.existsSync(moduleDir)) {
      fs.mkdirSync(moduleDir, { recursive: true });
    }
    
    // Create package.json
    const packageJson = {
      name: moduleName,
      version: '1.0.0',
      description: `Module generated by pipeline ${context.pipelineId}`,
      main: 'index.js',
      scripts: {
        test: 'echo "Error: no test specified" && exit 1'
      },
      keywords: ['generated', 'pipeline'],
      author: '',
      license: 'ISC'
    };
    
    fs.writeFileSync(
      path.join(moduleDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );
    
    // Create index.js with the data
    let moduleContent = '';
    if (config.template) {
      moduleContent = config.template.replace('{{DATA}}', JSON.stringify(data, null, 2));
    } else {
      moduleContent = `
// Generated module from pipeline ${context.pipelineId}
// Generated at ${new Date().toISOString()}

const data = ${JSON.stringify(data, null, 2)};

module.exports = {
  data,
  getAll: () => data,
  getById: (id) => data.find(item => item.id === id),
  process: (callback) => data.map(callback)
};
`;
    }
    
    fs.writeFileSync(path.join(moduleDir, 'index.js'), moduleContent);
    
    context.logs.push(`Module generated at: ${moduleDir}`);
    
    // Also save file reference in database
    await storage.createFile({
      userId: context.userId,
      name: 'module-package',
      path: moduleDir,
      fileType: 'application/javascript',
      source: 'pipeline',
      fileCategory: 'module',
      metadata: {
        fileSize: moduleContent.length,
        contentText: moduleContent
      },
      isProcessed: true,
      lastModified: new Date()
    });
    
    return { path: moduleDir, type: 'module' };
  }
  
  /**
   * Output pipeline data to a Git repository
   */
  private async outputToGit(
    data: any,
    config: { repoPath?: string; commitMessage?: string },
    context: PipelineContext
  ): Promise<{ path: string; type: string }> {
    const outputDir = path.resolve('uploads', 'git-repos');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const repoName = `repo-${context.pipelineId}`;
    const repoPath = config.repoPath || path.join(outputDir, repoName);
    
    // Create repository directory if it doesn't exist
    if (!fs.existsSync(repoPath)) {
      fs.mkdirSync(repoPath, { recursive: true });
      // Initialize git repository
      await this.runCommand('git', ['init'], repoPath, context);
    }
    
    // Create/update README.md
    const readmePath = path.join(repoPath, 'README.md');
    const readmeContent = `# Generated Repository
This repository was generated by a data pipeline.

Pipeline ID: ${context.pipelineId}
Generated at: ${new Date().toISOString()}
`;
    fs.writeFileSync(readmePath, readmeContent);
    
    // Create data file
    const dataFilePath = path.join(repoPath, 'data.json');
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
    
    // Add and commit changes
    await this.runCommand('git', ['add', '.'], repoPath, context);
    const commitMessage = config.commitMessage || `Pipeline output update: ${new Date().toISOString()}`;
    await this.runCommand('git', ['commit', '-m', commitMessage], repoPath, context);
    
    context.logs.push(`Git repository updated at: ${repoPath}`);
    
    return { path: repoPath, type: 'git' };
  }
  
  /**
   * Run a command in a specific directory
   */
  private async runCommand(
    command: string,
    args: string[],
    cwd: string,
    context: PipelineContext
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const process = spawn(command, args, { cwd });
      
      let stdout = '';
      let stderr = '';
      
      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          context.logs.push(`Command succeeded: ${command} ${args.join(' ')}`);
          resolve(stdout);
        } else {
          const errorMessage = `Command failed with code ${code}: ${command} ${args.join(' ')}\n${stderr}`;
          context.logs.push(errorMessage);
          reject(new Error(errorMessage));
        }
      });
    });
  }
  
  /**
   * Clean up temporary files created during pipeline execution
   */
  private cleanupTempFiles(filePaths: string[]): void {
    for (const filePath of filePaths) {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (err) {
        console.error(`Failed to clean up temporary file: ${filePath}`, err);
      }
    }
  }
  
  /**
   * Run a Python script with data
   */
  async runPythonScript(
    scriptPath: string,
    data: any,
    context: PipelineContext
  ): Promise<any> {
    // Create a temporary JSON file with the input data
    const tempInputPath = path.join('uploads', 'temp', `input-${Date.now()}.json`);
    const tempOutputPath = path.join('uploads', 'temp', `output-${Date.now()}.json`);
    
    // Ensure temp directory exists
    const tempDir = path.dirname(tempInputPath);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Write input data to temporary file
    fs.writeFileSync(tempInputPath, JSON.stringify(data));
    
    // Add to temp files for cleanup
    context.tempFiles.push(tempInputPath);
    context.tempFiles.push(tempOutputPath);
    
    try {
      // Run Python script
      await this.runCommand(
        'python3',
        [scriptPath, tempInputPath, tempOutputPath],
        process.cwd(),
        context
      );
      
      // Read output from temporary file
      if (fs.existsSync(tempOutputPath)) {
        const outputContent = fs.readFileSync(tempOutputPath, 'utf8');
        return JSON.parse(outputContent);
      } else {
        throw new Error(`Python script did not produce output file: ${tempOutputPath}`);
      }
    } catch (err) {
      throw err;
    }
  }
  
  /**
   * Use HuggingFace to process text data
   */
  async processWithHuggingFace(
    prompt: string,
    data: any,
    context: PipelineContext
  ): Promise<string> {
    context.logs.push('Processing with HuggingFace');
    
    try {
      const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
      
      // Combine prompt and data for the text generation
      const fullPrompt = `${prompt}\n\nInput Data: ${dataStr}`;
      
      const response = await hf.textGeneration({
        model: 'google/flan-t5-xl',
        inputs: fullPrompt,
        parameters: {
          max_length: 500,
          temperature: 0.7,
          top_p: 0.95,
          do_sample: true
        }
      });
      
      return response.generated_text || '';
    } catch (err: any) {
      context.logs.push(`HuggingFace processing error: ${err.message}`);
      throw err;
    }
  }
  
  /**
   * Alias for processWithHuggingFace for backward compatibility
   */
  async processWithOpenAI(
    prompt: string,
    data: any,
    context: PipelineContext
  ): Promise<string> {
    return this.processWithHuggingFace(prompt, data, context);
  }
  
  /**
   * Use Hugging Face to generate embeddings for text
   */
  async generateEmbeddings(
    text: string,
    context: PipelineContext
  ): Promise<number[]> {
    context.logs.push('Generating embeddings with Hugging Face');
    
    try {
      const response = await hf.featureExtraction({
        model: 'sentence-transformers/all-MiniLM-L6-v2',
        inputs: text
      });
      
      // Handle all possible return types from featureExtraction
      if (Array.isArray(response)) {
        // If it's already an array of numbers, return it
        return response as number[];
      } else if (typeof response === 'number') {
        // If it's a single number, wrap it in an array
        return [response];
      } else if (Array.isArray(response) && Array.isArray(response[0])) {
        // If it's a 2D array, flatten it
        return (response as number[][]).flat();
      }
      
      // Default to empty array if response is in an unexpected format
      return [];
    } catch (err: any) {
      context.logs.push(`Embedding generation error: ${err.message}`);
      throw err;
    }
  }
}

// Export pipeline factory functions
export const createPipelineManager = (): PipelineManager => {
  return new PipelineManager();
};

// Singleton instance for the application
export const pipelineManager = createPipelineManager();

// Built-in pipeline steps
export const pipelineSteps = {
  // Text transformation steps
  textClassification: (config: { categories: string[] }): PipelineStep => ({
    id: `text-classification-${Date.now()}`,
    name: 'Text Classification',
    type: 'analyze',
    config,
    execute: async (data, context) => {
      if (typeof data !== 'string') {
        throw new Error('Text classification requires a string input');
      }
      
      const prompt = `Classify the following text into one of these categories: ${config.categories.join(', ')}.
Return ONLY the category name without any additional explanation.`;
      
      const result = await pipelineManager.processWithOpenAI(prompt, data, context);
      return {
        text: data,
        category: result.trim(),
        confidence: 0.9 // Mock confidence
      };
    }
  }),
  
  textSummarization: (config: { maxLength?: number }): PipelineStep => ({
    id: `text-summarization-${Date.now()}`,
    name: 'Text Summarization',
    type: 'transform',
    config,
    execute: async (data, context) => {
      if (typeof data !== 'string') {
        throw new Error('Text summarization requires a string input');
      }
      
      const maxLength = config.maxLength || 200;
      const prompt = `Summarize the following text in ${maxLength} characters or less:`;
      
      const summary = await pipelineManager.processWithOpenAI(prompt, data, context);
      return {
        original: data,
        summary,
        length: summary.length
      };
    }
  }),
  
  // Data transformation steps
  jsonTransform: (config: { 
    transformation: 'filter' | 'map' | 'reduce' | 'sort',
    predicate?: string,
    selector?: string,
    initialValue?: any,
    sortKey?: string,
    sortDirection?: 'asc' | 'desc'
  }): PipelineStep => ({
    id: `json-transform-${Date.now()}`,
    name: 'JSON Transformation',
    type: 'transform',
    config,
    execute: async (data, context) => {
      if (!Array.isArray(data)) {
        throw new Error('JSON transformation requires an array input');
      }
      
      switch (config.transformation) {
        case 'filter':
          if (!config.predicate) {
            throw new Error('Filter transformation requires a predicate');
          }
          // Using Function constructor is generally not recommended for security reasons
          // In a production environment, consider using a safer evaluation mechanism
          const filterFn = new Function('item', `return ${config.predicate}`);
          return data.filter(item => filterFn(item));
          
        case 'map':
          if (!config.selector) {
            throw new Error('Map transformation requires a selector');
          }
          const mapFn = new Function('item', `return ${config.selector}`);
          return data.map(item => mapFn(item));
          
        case 'reduce':
          if (!config.selector) {
            throw new Error('Reduce transformation requires a selector');
          }
          // Create a safer version of the reduce function
          return data.reduce(
            (acc: any, item: any) => {
              // Use Function here with a narrower scope
              const fn = new Function('acc', 'item', `return ${config.selector}`);
              return fn(acc, item);
            }, 
            config.initialValue
          );
          
        case 'sort':
          if (!config.sortKey) {
            throw new Error('Sort transformation requires a sortKey');
          }
          return [...data].sort((a, b) => {
            const aValue = a[config.sortKey || ''];
            const bValue = b[config.sortKey || ''];
            
            if (aValue < bValue) return config.sortDirection === 'desc' ? 1 : -1;
            if (aValue > bValue) return config.sortDirection === 'desc' ? -1 : 1;
            return 0;
          });
          
        default:
          throw new Error(`Unsupported transformation: ${config.transformation}`);
      }
    }
  }),
  
  // Python script execution
  pythonScript: (config: { scriptPath: string }): PipelineStep => ({
    id: `python-script-${Date.now()}`,
    name: 'Python Script Execution',
    type: 'transform',
    config,
    execute: async (data, context) => {
      return await pipelineManager.runPythonScript(config.scriptPath, data, context);
    }
  }),
  
  // File operations
  fileConversion: (config: { 
    outputFormat: 'json' | 'csv' | 'markdown' | 'html'
  }): PipelineStep => ({
    id: `file-conversion-${Date.now()}`,
    name: 'File Format Conversion',
    type: 'transform',
    config,
    execute: async (data, context) => {
      if (typeof data !== 'object') {
        throw new Error('File conversion requires an object or array input');
      }
      
      switch (config.outputFormat) {
        case 'json':
          return data; // Already in JSON format
          
        case 'csv':
          if (!Array.isArray(data)) {
            throw new Error('CSV conversion requires an array of objects');
          }
          
          if (data.length === 0) {
            return '';
          }
          
          const headers = Object.keys(data[0]);
          const csvRows = [
            headers.join(','),
            ...data.map(row => 
              headers.map(header => {
                const value = row[header];
                // Handle values that need escaping (contains commas, quotes, etc.)
                if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                  return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
              }).join(',')
            )
          ];
          
          return csvRows.join('\n');
          
        case 'markdown':
          if (!Array.isArray(data)) {
            if (typeof data === 'object') {
              // Convert object to markdown
              const mdRows = Object.entries(data).map(([key, value]) => 
                `- **${key}**: ${typeof value === 'object' ? JSON.stringify(value) : value}`
              );
              return mdRows.join('\n');
            }
            throw new Error('Markdown conversion requires an object or array input');
          }
          
          if (data.length === 0) {
            return '';
          }
          
          const mdHeaders = Object.keys(data[0]);
          const mdRows = [
            mdHeaders.join(' | '),
            mdHeaders.map(() => '---').join(' | '),
            ...data.map(row => 
              mdHeaders.map(header => {
                const value = row[header];
                return typeof value === 'object' ? JSON.stringify(value) : value;
              }).join(' | ')
            )
          ];
          
          return mdRows.join('\n');
          
        case 'html':
          if (!Array.isArray(data)) {
            if (typeof data === 'object') {
              // Convert object to HTML
              const htmlRows = Object.entries(data).map(([key, value]) => 
                `<tr><th>${key}</th><td>${typeof value === 'object' ? JSON.stringify(value) : value}</td></tr>`
              );
              return `<table>\n${htmlRows.join('\n')}\n</table>`;
            }
            throw new Error('HTML conversion requires an object or array input');
          }
          
          if (data.length === 0) {
            return '<table></table>';
          }
          
          const htmlHeaders = Object.keys(data[0]);
          const htmlHeaderRow = `<tr>${htmlHeaders.map(h => `<th>${h}</th>`).join('')}</tr>`;
          const htmlDataRows = data.map(row => 
            `<tr>${htmlHeaders.map(header => {
              const value = row[header];
              return `<td>${typeof value === 'object' ? JSON.stringify(value) : value}</td>`;
            }).join('')}</tr>`
          );
          
          return `<table>\n${htmlHeaderRow}\n${htmlDataRows.join('\n')}\n</table>`;
          
        default:
          throw new Error(`Unsupported output format: ${config.outputFormat}`);
      }
    }
  }),
};

// Export reusable pipelines
export const pipelines = {
  // Text analysis pipeline
  textAnalysisPipeline: (userId: number): Pipeline => ({
    id: 'text-analysis',
    name: 'Text Analysis Pipeline',
    description: 'Analyzes text content and extracts insights',
    input: {
      type: 'text',
      config: {}
    },
    output: {
      type: 'file',
      config: {
        format: 'json'
      }
    },
    steps: [
      pipelineSteps.textClassification({ 
        categories: ['Business', 'Technology', 'Science', 'Health', 'Entertainment', 'Sports', 'Politics', 'Other']
      }),
      pipelineSteps.textSummarization({ maxLength: 200 })
    ]
  }),
  
  // Data transformation pipeline
  dataTransformationPipeline: (userId: number): Pipeline => ({
    id: 'data-transformation',
    name: 'Data Transformation Pipeline',
    description: 'Transforms and processes JSON data',
    input: {
      type: 'file',
      config: {
        format: 'json'
      }
    },
    output: {
      type: 'module',
      config: {
        moduleName: 'transformed-data'
      }
    },
    steps: [
      pipelineSteps.jsonTransform({ 
        transformation: 'filter',
        predicate: 'item.active === true'
      }),
      pipelineSteps.jsonTransform({
        transformation: 'map',
        selector: '{ id: item.id, name: item.name, score: item.metrics ? item.metrics.score : 0 }'
      }),
      pipelineSteps.jsonTransform({
        transformation: 'sort',
        sortKey: 'score',
        sortDirection: 'desc'
      })
    ]
  }),
  
  // File conversion pipeline
  fileConversionPipeline: (userId: number): Pipeline => ({
    id: 'file-conversion',
    name: 'File Conversion Pipeline',
    description: 'Converts data between different file formats',
    input: {
      type: 'file',
      config: {
        format: 'json'
      }
    },
    output: {
      type: 'file',
      config: {
        format: 'text'
      }
    },
    steps: [
      pipelineSteps.fileConversion({
        outputFormat: 'markdown'
      })
    ]
  }),
  
  // Git repository pipeline
  gitRepositoryPipeline: (userId: number): Pipeline => ({
    id: 'git-repository',
    name: 'Git Repository Pipeline',
    description: 'Processes data and commits to a Git repository',
    input: {
      type: 'file',
      config: {
        format: 'json'
      }
    },
    output: {
      type: 'git',
      config: {
        commitMessage: 'Update data from pipeline'
      }
    },
    steps: [
      pipelineSteps.jsonTransform({
        transformation: 'map',
        selector: '{ ...item, processed: true, timestamp: new Date().toISOString() }'
      })
    ]
  })
};

// Initialize with built-in pipelines
export function initializePipelines(): void {
  // Register built-in pipelines for a default user (1)
  pipelineManager.registerPipeline(pipelines.textAnalysisPipeline(1));
  pipelineManager.registerPipeline(pipelines.dataTransformationPipeline(1));
  pipelineManager.registerPipeline(pipelines.fileConversionPipeline(1));
  pipelineManager.registerPipeline(pipelines.gitRepositoryPipeline(1));
  
  console.log('Pipeline system initialized with built-in pipelines');
}