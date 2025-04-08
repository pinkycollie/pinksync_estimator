import { HfInference } from '@huggingface/inference';
import fs from 'fs';
import path from 'path';
import { storage } from '../storage';
import { type File, type CodeSource } from '@shared/schema';
import { spawn } from 'child_process';

// Initialize API with Hugging Face
const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

/**
 * Code Enhancement Utilities for Platform Integration
 * Supports: Cursor AI, Replit, and Netlify
 */
export class CodeEnhancement {
  /**
   * Analyzes code and provides quality metrics and improvements
   * @param fileId ID of the code file to analyze
   * @returns Analysis results with metrics and suggestions
   */
  public static async analyzeCode(fileId: number): Promise<{
    language: string;
    metrics: {
      complexity: number;
      maintainability: number;
      testability: number;
      accessibility: number;
    };
    suggestions: {
      type: 'improvement' | 'bug' | 'security' | 'performance' | 'accessibility';
      line?: number;
      description: string;
      severity: 'low' | 'medium' | 'high';
      suggestion: string;
    }[];
    documentation: {
      completeness: number;
      suggestedImprovements: string[];
    };
  }> {
    // Get the file from storage
    const file = await storage.getFile(fileId);
    if (!file) {
      throw new Error(`File not found: ${fileId}`);
    }

    // Only analyze code files
    if (!this.isCodeFile(file)) {
      throw new Error(`File is not a code file: ${file.name}`);
    }

    // Get the file content
    const content = await this.getFileContent(file);
    if (!content) {
      throw new Error(`Failed to read file content: ${file.path}`);
    }

    // Determine language
    const language = this.detectLanguage(file.name, content);

    try {
      // Create analysis prompt
      const analysisPrompt = `Analyze this ${language} code and provide quality metrics and suggestions for improvement:
Code:
\`\`\`${language}
${content.substring(0, 5000)}
\`\`\`

Provide the following in your analysis:
1. Complexity score (1-10)
2. Maintainability score (1-10)
3. Testability score (1-10)
4. Accessibility score (1-10)
5. List specific bugs or issues with line numbers
6. Suggestions for improvement
7. Security concerns
8. Performance optimizations
9. Documentation quality (1-10)`;

      const analysis = await hf.textGeneration({
        model: 'google/flan-t5-xl',
        inputs: analysisPrompt,
        parameters: { max_length: 1000, temperature: 0.2 }
      });

      // Parse the analysis results
      const complexityMatch = analysis.generated_text.match(/Complexity[^0-9]*([0-9]+)/i);
      const maintainabilityMatch = analysis.generated_text.match(/Maintainability[^0-9]*([0-9]+)/i);
      const testabilityMatch = analysis.generated_text.match(/Testability[^0-9]*([0-9]+)/i);
      const accessibilityMatch = analysis.generated_text.match(/Accessibility[^0-9]*([0-9]+)/i);
      const documentationMatch = analysis.generated_text.match(/Documentation[^0-9]*([0-9]+)/i);

      // Extract suggestions
      const suggestions = [];
      
      // Look for bug patterns
      const bugRegex = /(?:bug|issue|error)[^\n.]*(?:line[s]?[^\n0-9]*([0-9]+)[^\n]*)/gi;
      let bugMatch;
      while ((bugMatch = bugRegex.exec(analysis.generated_text)) !== null) {
        suggestions.push({
          type: 'bug',
          line: parseInt(bugMatch[1]),
          description: bugMatch[0],
          severity: this.determineSeverity(bugMatch[0]),
          suggestion: this.extractSuggestion(bugMatch[0], analysis.generated_text)
        });
      }
      
      // Look for security patterns
      const securityRegex = /(?:security|vulnerability|exploit)[^\n.]*/gi;
      let securityMatch;
      while ((securityMatch = securityRegex.exec(analysis.generated_text)) !== null) {
        suggestions.push({
          type: 'security',
          description: securityMatch[0],
          severity: this.determineSeverity(securityMatch[0]),
          suggestion: this.extractSuggestion(securityMatch[0], analysis.generated_text)
        });
      }
      
      // Look for performance patterns
      const performanceRegex = /(?:performance|optimization|slow|inefficient)[^\n.]*/gi;
      let performanceMatch;
      while ((performanceMatch = performanceRegex.exec(analysis.generated_text)) !== null) {
        suggestions.push({
          type: 'performance',
          description: performanceMatch[0],
          severity: this.determineSeverity(performanceMatch[0]),
          suggestion: this.extractSuggestion(performanceMatch[0], analysis.generated_text)
        });
      }
      
      // Look for accessibility patterns
      const accessibilityRegex = /(?:accessibility|a11y|aria|screen reader)[^\n.]*/gi;
      let accessibilityMatch;
      while ((accessibilityMatch = accessibilityRegex.exec(analysis.generated_text)) !== null) {
        suggestions.push({
          type: 'accessibility',
          description: accessibilityMatch[0],
          severity: this.determineSeverity(accessibilityMatch[0]),
          suggestion: this.extractSuggestion(accessibilityMatch[0], analysis.generated_text)
        });
      }

      // If we have too few suggestions, ask for general improvements
      if (suggestions.length < 3) {
        const improvementPrompt = `List 3 specific ways to improve this ${language} code:
\`\`\`${language}
${content.substring(0, 3000)}
\`\`\`
Format each improvement as: "1. [description]"`;

        const improvementResponse = await hf.textGeneration({
          model: 'google/flan-t5-xl',
          inputs: improvementPrompt,
          parameters: { max_length: 500 }
        });

        // Extract improvements
        const improvements = improvementResponse.generated_text.split(/\d+\.\s/).filter(Boolean);
        
        for (const improvement of improvements) {
          suggestions.push({
            type: 'improvement',
            description: improvement.trim(),
            severity: 'low',
            suggestion: improvement.trim()
          });
        }
      }

      // Get documentation suggestions
      const docPrompt = `Analyze the documentation in this ${language} code and suggest 3 specific documentation improvements:
\`\`\`${language}
${content.substring(0, 3000)}
\`\`\`
Format as a numbered list:`;

      const docResponse = await hf.textGeneration({
        model: 'google/flan-t5-xl',
        inputs: docPrompt,
        parameters: { max_length: 500 }
      });

      // Extract documentation suggestions
      const docSuggestions = docResponse.generated_text
        .split(/\d+\.\s/)
        .filter(Boolean)
        .map(suggestion => suggestion.trim());

      // Create the analysis result
      const result = {
        language,
        metrics: {
          complexity: complexityMatch ? Math.min(10, Math.max(1, parseInt(complexityMatch[1]))) : 5,
          maintainability: maintainabilityMatch ? Math.min(10, Math.max(1, parseInt(maintainabilityMatch[1]))) : 5,
          testability: testabilityMatch ? Math.min(10, Math.max(1, parseInt(testabilityMatch[1]))) : 5,
          accessibility: accessibilityMatch ? Math.min(10, Math.max(1, parseInt(accessibilityMatch[1]))) : 5
        },
        suggestions: suggestions.slice(0, 10), // Limit to top 10 suggestions
        documentation: {
          completeness: documentationMatch ? Math.min(10, Math.max(1, parseInt(documentationMatch[1]))) : 5,
          suggestedImprovements: docSuggestions
        }
      };

      // Update file metadata
      await storage.updateFile(fileId, {
        metadata: {
          ...file.metadata,
          analysis: {
            ...file.metadata?.analysis,
            code: result,
            analyzedAt: new Date().toISOString()
          }
        },
        isProcessed: true
      });

      return result;
    } catch (error) {
      console.error('Error analyzing code:', error);
      throw new Error(`Failed to analyze code: ${error.message}`);
    }
  }

  /**
   * Generates documentation for code
   * @param fileId ID of the code file to document
   * @returns Generated documentation in markdown format
   */
  public static async generateDocumentation(fileId: number): Promise<{
    markdown: string;
    functions: Array<{
      name: string;
      description: string;
      params: Array<{ name: string; type: string; description: string }>;
      returnType: string;
      returnDescription: string;
    }>;
    classes: Array<{
      name: string;
      description: string;
      methods: string[];
      properties: string[];
    }>;
  }> {
    // Get the file from storage
    const file = await storage.getFile(fileId);
    if (!file) {
      throw new Error(`File not found: ${fileId}`);
    }

    // Only analyze code files
    if (!this.isCodeFile(file)) {
      throw new Error(`File is not a code file: ${file.name}`);
    }

    // Get the file content
    const content = await this.getFileContent(file);
    if (!content) {
      throw new Error(`Failed to read file content: ${file.path}`);
    }

    // Determine language
    const language = this.detectLanguage(file.name, content);

    try {
      // Generate documentation
      const docPrompt = `Generate comprehensive documentation for this ${language} code. Include:
1. Overview of what the code does
2. For each function/method: name, description, parameters (with types), return values
3. For each class: description, properties, methods
4. Usage examples

Code:
\`\`\`${language}
${content.substring(0, 6000)}
\`\`\`

Format as markdown.`;

      const docResponse = await hf.textGeneration({
        model: 'google/flan-t5-xl',
        inputs: docPrompt,
        parameters: { max_length: 1500 }
      });

      const markdown = docResponse.generated_text;

      // Extract functions and classes for structured data
      const funcClassPrompt = `Extract all functions and classes from this ${language} code as JSON. Format as:
{
  "functions": [
    {
      "name": "functionName",
      "description": "what the function does",
      "params": [{"name": "paramName", "type": "paramType", "description": "param description"}],
      "returnType": "returnType",
      "returnDescription": "description of return value"
    }
  ],
  "classes": [
    {
      "name": "ClassName",
      "description": "what the class does",
      "methods": ["methodName1", "methodName2"],
      "properties": ["propertyName1", "propertyName2"]
    }
  ]
}

Code:
\`\`\`${language}
${content.substring(0, 4000)}
\`\`\``;

      const structuredResponse = await hf.textGeneration({
        model: 'google/flan-t5-xl',
        inputs: funcClassPrompt,
        parameters: { max_length: 1500 }
      });

      // Parse the JSON response
      let functions = [];
      let classes = [];
      
      try {
        // Extract JSON object from the response (it might be embedded in text)
        const jsonMatch = structuredResponse.generated_text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsedData = JSON.parse(jsonMatch[0]);
          functions = parsedData.functions || [];
          classes = parsedData.classes || [];
        }
      } catch (e) {
        console.error('Failed to parse JSON:', e);
        // Fallback to empty arrays, we still have the markdown
      }

      // Save as a code source for future reference
      await storage.createCodeSource({
        userId: file.userId,
        title: `Documentation: ${file.name}`,
        description: `Auto-generated documentation for ${file.name}`,
        language,
        snippet: content.substring(0, 1000),
        source: 'auto-generated',
        tags: `documentation,${language},generated`,
        relatedProjects: file.metadata?.projectId ? [file.metadata.projectId] : [],
        metadata: {
          generatedAt: new Date().toISOString(),
          sourceFileId: fileId,
          markdown,
          functions,
          classes
        }
      });

      // Update the file metadata
      await storage.updateFile(fileId, {
        metadata: {
          ...file.metadata,
          documentation: {
            generatedAt: new Date().toISOString(),
            hasDocumentation: true
          }
        }
      });

      return {
        markdown,
        functions,
        classes
      };
    } catch (error) {
      console.error('Error generating documentation:', error);
      throw new Error(`Failed to generate documentation: ${error.message}`);
    }
  }

  /**
   * Checks if code is ready for deployment to various platforms
   * @param fileId ID of the code file to check
   * @param platform Target platform (replit, netlify, vercel)
   * @returns Deployment readiness report
   */
  public static async checkDeploymentReadiness(
    fileId: number,
    platform: 'replit' | 'netlify' | 'vercel' | 'cursorai'
  ): Promise<{
    isReady: boolean;
    platform: string;
    checks: Array<{
      name: string;
      passed: boolean;
      message: string;
      severity: 'low' | 'medium' | 'high';
    }>;
    missingFiles: string[];
    configIssues: string[];
    recommendations: string[];
  }> {
    // Get the file from storage
    const file = await storage.getFile(fileId);
    if (!file) {
      throw new Error(`File not found: ${fileId}`);
    }

    // Get the directory path if this is a file within a project
    const dirPath = file.path ? path.dirname(file.path) : null;
    if (!dirPath || !fs.existsSync(dirPath)) {
      throw new Error(`Invalid directory path: ${dirPath}`);
    }

    // Check for deployment readiness based on platform
    const checks = [];
    const missingFiles = [];
    const configIssues = [];
    const recommendations = [];

    try {
      // Common checks for all platforms
      this.checkForGitIgnore(dirPath, checks, missingFiles);
      this.checkForPackageJson(dirPath, checks, missingFiles);
      this.checkForReadme(dirPath, checks, missingFiles);
      
      // Platform-specific checks
      switch (platform) {
        case 'replit':
          this.checkForReplitConfig(dirPath, checks, missingFiles, configIssues);
          break;
        case 'netlify':
          this.checkForNetlifyConfig(dirPath, checks, missingFiles, configIssues);
          break;
        case 'vercel':
          this.checkForVercelConfig(dirPath, checks, missingFiles, configIssues);
          break;
        case 'cursorai':
          // Cursor AI doesn't need deployment configs, but check for prompt templates
          this.checkForCursorAIConfig(dirPath, checks, missingFiles, configIssues);
          break;
      }
      
      // Check for environment variables and secrets
      this.checkForEnvFile(dirPath, checks, missingFiles, configIssues);
      
      // Generate platform-specific recommendations
      const recommendationsPrompt = `Generate 3 specific recommendations for deploying a project to ${platform}. 
Consider best practices for deployment, security, and performance.
Format as a numbered list:`;

      const recommendationsResponse = await hf.textGeneration({
        model: 'google/flan-t5-xl',
        inputs: recommendationsPrompt,
        parameters: { max_length: 500 }
      });

      // Parse recommendations
      recommendations.push(
        ...recommendationsResponse.generated_text
          .split(/\d+\.\s/)
          .filter(Boolean)
          .map(rec => rec.trim())
      );

      // Determine overall readiness
      const criticalChecks = checks.filter(check => check.severity === 'high');
      const criticalIssues = criticalChecks.filter(check => !check.passed);
      const isReady = criticalIssues.length === 0;

      return {
        isReady,
        platform,
        checks,
        missingFiles,
        configIssues,
        recommendations
      };
    } catch (error) {
      console.error('Error checking deployment readiness:', error);
      throw new Error(`Failed to check deployment readiness: ${error.message}`);
    }
  }

  /**
   * Prepares a Netlify deployment package
   * @param fileId ID of the main file within the project to deploy
   * @returns Information about the prepared deployment
   */
  public static async prepareNetlifyDeployment(fileId: number): Promise<{
    success: boolean;
    projectName: string;
    deploymentFiles: string[];
    netlifyConfig: any;
    deployCommands: string[];
  }> {
    // Get the file from storage
    const file = await storage.getFile(fileId);
    if (!file) {
      throw new Error(`File not found: ${fileId}`);
    }

    // Get the directory path if this is a file within a project
    const dirPath = file.path ? path.dirname(file.path) : null;
    if (!dirPath || !fs.existsSync(dirPath)) {
      throw new Error(`Invalid directory path: ${dirPath}`);
    }

    // Generate or find the Netlify configuration
    let netlifyConfig: any = {};
    const netlifyTomlPath = path.join(dirPath, 'netlify.toml');
    
    if (fs.existsSync(netlifyTomlPath)) {
      try {
        // Simple TOML parsing (for a complete solution, use a proper TOML parser)
        const tomlContent = fs.readFileSync(netlifyTomlPath, 'utf8');
        netlifyConfig = this.parseNetlifyToml(tomlContent);
      } catch (error) {
        console.error('Error parsing netlify.toml:', error);
        netlifyConfig = {}; // Reset if parsing fails
      }
    }

    // If no config exists, create a basic one
    if (Object.keys(netlifyConfig).length === 0) {
      netlifyConfig = {
        build: {
          publish: "dist",
          command: "npm run build"
        },
        dev: {
          command: "npm run dev",
          port: 8888,
          framework: "#auto"
        }
      };
      
      // Check for build output directory
      const possibleDistDirs = ['dist', 'build', 'public', 'output', '_site'];
      for (const dir of possibleDistDirs) {
        if (fs.existsSync(path.join(dirPath, dir))) {
          netlifyConfig.build.publish = dir;
          break;
        }
      }
      
      // Write the config to file
      try {
        const tomlContent = this.generateNetlifyToml(netlifyConfig);
        fs.writeFileSync(netlifyTomlPath, tomlContent);
      } catch (error) {
        console.error('Error writing netlify.toml:', error);
      }
    }

    // Get project name from package.json or directory name
    let projectName = path.basename(dirPath);
    const packageJsonPath = path.join(dirPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        if (packageJson.name) {
          projectName = packageJson.name;
        }
      } catch (error) {
        console.error('Error parsing package.json:', error);
      }
    }

    // Get list of deployment files (exclude node_modules, .git, etc.)
    const deploymentFiles = this.listDeploymentFiles(dirPath);

    // Generate deploy commands
    const deployCommands = [
      "netlify login",
      `netlify init --manual --name ${projectName}`,
      "netlify build",
      "netlify deploy --prod"
    ];

    return {
      success: true,
      projectName,
      deploymentFiles,
      netlifyConfig,
      deployCommands
    };
  }

  /**
   * Prepares a Replit deployment
   * @param fileId ID of the main file within the project to deploy
   * @returns Information about the prepared deployment
   */
  public static async prepareReplitDeployment(fileId: number): Promise<{
    success: boolean;
    projectName: string;
    deploymentFiles: string[];
    replitConfig: any;
    deploySteps: string[];
  }> {
    // Get the file from storage
    const file = await storage.getFile(fileId);
    if (!file) {
      throw new Error(`File not found: ${fileId}`);
    }

    // Get the directory path if this is a file within a project
    const dirPath = file.path ? path.dirname(file.path) : null;
    if (!dirPath || !fs.existsSync(dirPath)) {
      throw new Error(`Invalid directory path: ${dirPath}`);
    }

    // Generate or find the Replit configuration
    let replitConfig: any = {};
    const replitConfigPath = path.join(dirPath, '.replit');
    
    if (fs.existsSync(replitConfigPath)) {
      try {
        const configContent = fs.readFileSync(replitConfigPath, 'utf8');
        replitConfig = this.parseReplitConfig(configContent);
      } catch (error) {
        console.error('Error parsing .replit config:', error);
        replitConfig = {}; // Reset if parsing fails
      }
    }

    // If no config exists, create a basic one
    if (Object.keys(replitConfig).length === 0) {
      // Determine language and run command
      let language = 'nodejs';
      let runCommand = 'npm run start';
      
      // Check if package.json exists and read the start script
      const packageJsonPath = path.join(dirPath, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        try {
          const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
          if (packageJson.scripts && packageJson.scripts.start) {
            runCommand = packageJson.scripts.start;
          }
        } catch (error) {
          console.error('Error parsing package.json:', error);
        }
      }
      
      // Check for Python files
      const pythonFiles = fs.readdirSync(dirPath).filter(f => f.endsWith('.py'));
      if (pythonFiles.length > 0) {
        language = 'python';
        runCommand = `python ${pythonFiles[0]}`;
      }
      
      replitConfig = {
        language,
        run: runCommand,
        entrypoint: language === 'nodejs' ? 'index.js' : pythonFiles[0]
      };
      
      // Write the config to file
      try {
        const configContent = this.generateReplitConfig(replitConfig);
        fs.writeFileSync(replitConfigPath, configContent);
      } catch (error) {
        console.error('Error writing .replit config:', error);
      }
    }

    // Get project name from package.json or directory name
    let projectName = path.basename(dirPath);
    const packageJsonPath = path.join(dirPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        if (packageJson.name) {
          projectName = packageJson.name;
        }
      } catch (error) {
        console.error('Error parsing package.json:', error);
      }
    }

    // Get list of deployment files (exclude node_modules, .git, etc.)
    const deploymentFiles = this.listDeploymentFiles(dirPath);

    // Generate deploy steps
    const deploySteps = [
      "1. Create a new Replit project",
      "2. Upload all project files",
      "3. Run the project on Replit",
      "4. Use Replit's 'Deploy' feature to publish your app"
    ];

    return {
      success: true,
      projectName,
      deploymentFiles,
      replitConfig,
      deploySteps
    };
  }

  // Helper methods

  private static isCodeFile(file: File): boolean {
    const codeExtensions = [
      '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.c', '.cpp', '.h', '.cs', 
      '.php', '.rb', '.go', '.swift', '.kt', '.rs', '.html', '.css', '.scss',
      '.json', '.yaml', '.yml', '.md', '.sh', '.bash', '.ps1', '.sql', '.xml'
    ];
    
    const extension = path.extname(file.name).toLowerCase();
    return codeExtensions.includes(extension);
  }

  private static async getFileContent(file: File): Promise<string | null> {
    // First check if content is in metadata
    if (file.metadata?.contentText) {
      return file.metadata.contentText;
    }
    
    // Otherwise try to read from filesystem
    if (file.path && fs.existsSync(file.path)) {
      try {
        return fs.readFileSync(file.path, 'utf-8');
      } catch (err) {
        console.error(`Failed to read file: ${file.path}`, err);
        return null;
      }
    }
    
    return null;
  }

  private static detectLanguage(fileName: string, content: string): string {
    const extension = path.extname(fileName).toLowerCase();
    
    switch (extension) {
      case '.js':
        return 'javascript';
      case '.jsx':
        return 'jsx';
      case '.ts':
        return 'typescript';
      case '.tsx':
        return 'tsx';
      case '.py':
        return 'python';
      case '.java':
        return 'java';
      case '.c':
        return 'c';
      case '.cpp':
        return 'cpp';
      case '.h':
        return 'c';
      case '.cs':
        return 'csharp';
      case '.php':
        return 'php';
      case '.rb':
        return 'ruby';
      case '.go':
        return 'go';
      case '.swift':
        return 'swift';
      case '.kt':
        return 'kotlin';
      case '.rs':
        return 'rust';
      case '.html':
        return 'html';
      case '.css':
        return 'css';
      case '.scss':
        return 'scss';
      case '.json':
        return 'json';
      case '.yaml':
      case '.yml':
        return 'yaml';
      case '.md':
        return 'markdown';
      case '.sh':
      case '.bash':
        return 'bash';
      case '.ps1':
        return 'powershell';
      case '.sql':
        return 'sql';
      case '.xml':
        return 'xml';
      default:
        // Try to detect by content if extension doesn't help
        if (content.includes('def ') && content.includes('import ')) {
          return 'python';
        }
        if (content.includes('function ') && content.includes('const ')) {
          return 'javascript';
        }
        if (content.includes('class ') && content.includes('public ')) {
          return 'java';
        }
        if (content.includes('<!DOCTYPE html>') || content.includes('<html>')) {
          return 'html';
        }
        return 'unknown';
    }
  }

  private static determineSeverity(text: string): 'low' | 'medium' | 'high' {
    const lowPhrases = ['minor', 'style', 'suggestion', 'could', 'might', 'consider'];
    const highPhrases = ['critical', 'security', 'crash', 'exception', 'error', 'vulnerability', 'must', 'required'];
    
    const textLower = text.toLowerCase();
    
    if (highPhrases.some(phrase => textLower.includes(phrase))) {
      return 'high';
    }
    
    if (lowPhrases.some(phrase => textLower.includes(phrase))) {
      return 'low';
    }
    
    return 'medium';
  }

  private static extractSuggestion(problem: string, fullText: string): string {
    // Try to find a suggestion that follows the problem description
    const problemIndex = fullText.indexOf(problem);
    if (problemIndex !== -1) {
      const textAfterProblem = fullText.substring(problemIndex + problem.length, problemIndex + problem.length + 300);
      const suggestionMatch = textAfterProblem.match(/suggestion:?\s*([^.!?\n]+[.!?])/i);
      if (suggestionMatch) {
        return suggestionMatch[1].trim();
      }
      
      // If no explicit suggestion, take the next sentence
      const nextSentenceMatch = textAfterProblem.match(/\s*([^.!?\n]+[.!?])/);
      if (nextSentenceMatch) {
        return nextSentenceMatch[1].trim();
      }
    }
    
    // Default suggestion if none found
    if (problem.toLowerCase().includes('security')) {
      return 'Review for security vulnerabilities and apply appropriate protection.';
    }
    
    if (problem.toLowerCase().includes('performance')) {
      return 'Optimize for better performance.';
    }
    
    return 'Refactor this code to improve quality.';
  }

  // Deployment readiness helper methods
  
  private static checkForGitIgnore(dirPath: string, checks: any[], missingFiles: string[]) {
    const gitIgnorePath = path.join(dirPath, '.gitignore');
    if (fs.existsSync(gitIgnorePath)) {
      const content = fs.readFileSync(gitIgnorePath, 'utf8');
      const hasNodeModules = content.includes('node_modules');
      const hasBuildDir = content.includes('dist') || content.includes('build');
      const hasEnvFiles = content.includes('.env');
      
      checks.push({
        name: 'GitIgnore exists',
        passed: true,
        message: '.gitignore file found',
        severity: 'medium'
      });
      
      checks.push({
        name: 'node_modules in .gitignore',
        passed: hasNodeModules,
        message: hasNodeModules ? 'node_modules properly ignored' : 'node_modules should be added to .gitignore',
        severity: 'medium'
      });
      
      checks.push({
        name: 'Build directory in .gitignore',
        passed: hasBuildDir,
        message: hasBuildDir ? 'Build directory properly ignored' : 'Build directory should be added to .gitignore',
        severity: 'low'
      });
      
      checks.push({
        name: 'Environment files in .gitignore',
        passed: hasEnvFiles,
        message: hasEnvFiles ? 'Environment files properly ignored' : '.env files should be added to .gitignore',
        severity: 'high'
      });
    } else {
      checks.push({
        name: 'GitIgnore exists',
        passed: false,
        message: 'No .gitignore file found',
        severity: 'medium'
      });
      
      missingFiles.push('.gitignore');
    }
  }

  private static checkForPackageJson(dirPath: string, checks: any[], missingFiles: string[]) {
    const packageJsonPath = path.join(dirPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        
        checks.push({
          name: 'package.json exists',
          passed: true,
          message: 'package.json file found',
          severity: 'high'
        });
        
        checks.push({
          name: 'package.json has name',
          passed: !!packageJson.name,
          message: packageJson.name ? 'Project name defined' : 'package.json missing name field',
          severity: 'medium'
        });
        
        checks.push({
          name: 'package.json has scripts',
          passed: !!packageJson.scripts && Object.keys(packageJson.scripts).length > 0,
          message: packageJson.scripts && Object.keys(packageJson.scripts).length > 0 
            ? 'Scripts defined in package.json' 
            : 'No scripts defined in package.json',
          severity: 'medium'
        });
        
        checks.push({
          name: 'package.json has dependencies',
          passed: !!packageJson.dependencies && Object.keys(packageJson.dependencies).length > 0,
          message: packageJson.dependencies && Object.keys(packageJson.dependencies).length > 0
            ? 'Dependencies defined in package.json'
            : 'No dependencies defined in package.json',
          severity: 'medium'
        });
      } catch (error) {
        checks.push({
          name: 'package.json valid',
          passed: false,
          message: 'package.json exists but is not valid JSON',
          severity: 'high'
        });
      }
    } else {
      checks.push({
        name: 'package.json exists',
        passed: false,
        message: 'No package.json file found',
        severity: 'high'
      });
      
      missingFiles.push('package.json');
    }
  }

  private static checkForReadme(dirPath: string, checks: any[], missingFiles: string[]) {
    const readmePath = path.join(dirPath, 'README.md');
    if (fs.existsSync(readmePath)) {
      const content = fs.readFileSync(readmePath, 'utf8');
      const hasContent = content.length > 100;
      const hasInstallSection = content.toLowerCase().includes('install') || content.toLowerCase().includes('setup');
      const hasUsageSection = content.toLowerCase().includes('usage') || content.toLowerCase().includes('example');
      
      checks.push({
        name: 'README exists',
        passed: true,
        message: 'README.md file found',
        severity: 'medium'
      });
      
      checks.push({
        name: 'README has content',
        passed: hasContent,
        message: hasContent ? 'README has sufficient content' : 'README is too short',
        severity: 'low'
      });
      
      checks.push({
        name: 'README has installation section',
        passed: hasInstallSection,
        message: hasInstallSection ? 'Installation instructions found' : 'No installation instructions found',
        severity: 'medium'
      });
      
      checks.push({
        name: 'README has usage section',
        passed: hasUsageSection,
        message: hasUsageSection ? 'Usage instructions found' : 'No usage instructions found',
        severity: 'medium'
      });
    } else {
      checks.push({
        name: 'README exists',
        passed: false,
        message: 'No README.md file found',
        severity: 'medium'
      });
      
      missingFiles.push('README.md');
    }
  }

  private static checkForNetlifyConfig(dirPath: string, checks: any[], missingFiles: string[], configIssues: string[]) {
    const netlifyTomlPath = path.join(dirPath, 'netlify.toml');
    if (fs.existsSync(netlifyTomlPath)) {
      try {
        const content = fs.readFileSync(netlifyTomlPath, 'utf8');
        const hasBuildSection = content.includes('[build]');
        const hasPublishDir = content.includes('publish ');
        const hasBuildCommand = content.includes('command ');
        
        checks.push({
          name: 'netlify.toml exists',
          passed: true,
          message: 'netlify.toml file found',
          severity: 'high'
        });
        
        checks.push({
          name: 'netlify.toml has build section',
          passed: hasBuildSection,
          message: hasBuildSection ? 'Build section found' : 'No build section found',
          severity: 'high'
        });
        
        checks.push({
          name: 'netlify.toml has publish directory',
          passed: hasPublishDir,
          message: hasPublishDir ? 'Publish directory defined' : 'No publish directory defined',
          severity: 'high'
        });
        
        checks.push({
          name: 'netlify.toml has build command',
          passed: hasBuildCommand,
          message: hasBuildCommand ? 'Build command defined' : 'No build command defined',
          severity: 'high'
        });
        
        if (!hasBuildSection || !hasPublishDir || !hasBuildCommand) {
          configIssues.push('netlify.toml missing required configurations');
        }
      } catch (error) {
        checks.push({
          name: 'netlify.toml valid',
          passed: false,
          message: 'netlify.toml exists but could not be read',
          severity: 'high'
        });
        
        configIssues.push('netlify.toml could not be read');
      }
    } else {
      checks.push({
        name: 'netlify.toml exists',
        passed: false,
        message: 'No netlify.toml file found',
        severity: 'high'
      });
      
      missingFiles.push('netlify.toml');
      configIssues.push('Missing netlify.toml configuration file');
    }
    
    // Check for _redirects or _headers files
    const redirectsPath = path.join(dirPath, '_redirects');
    if (!fs.existsSync(redirectsPath)) {
      checks.push({
        name: '_redirects exists',
        passed: false,
        message: 'No _redirects file found (optional but recommended)',
        severity: 'low'
      });
    }
  }

  private static checkForVercelConfig(dirPath: string, checks: any[], missingFiles: string[], configIssues: string[]) {
    const vercelConfigPath = path.join(dirPath, 'vercel.json');
    if (fs.existsSync(vercelConfigPath)) {
      try {
        const content = fs.readFileSync(vercelConfigPath, 'utf8');
        const config = JSON.parse(content);
        
        checks.push({
          name: 'vercel.json exists',
          passed: true,
          message: 'vercel.json file found',
          severity: 'high'
        });
        
        checks.push({
          name: 'vercel.json has valid JSON',
          passed: true,
          message: 'vercel.json contains valid JSON',
          severity: 'high'
        });
        
        // Check for specific config
        const hasBuildCommand = config.buildCommand || (config.builds && config.builds.length > 0);
        checks.push({
          name: 'vercel.json has build configuration',
          passed: !!hasBuildCommand,
          message: hasBuildCommand ? 'Build configuration found' : 'No build configuration found',
          severity: 'medium'
        });
        
        if (!hasBuildCommand) {
          configIssues.push('vercel.json missing build configuration');
        }
      } catch (error) {
        checks.push({
          name: 'vercel.json valid',
          passed: false,
          message: 'vercel.json exists but is not valid JSON',
          severity: 'high'
        });
        
        configIssues.push('vercel.json contains invalid JSON');
      }
    } else {
      // Vercel works without a config file, but it's best practice to have one
      checks.push({
        name: 'vercel.json exists',
        passed: false,
        message: 'No vercel.json file found (optional but recommended)',
        severity: 'medium'
      });
      
      missingFiles.push('vercel.json');
    }
  }

  private static checkForReplitConfig(dirPath: string, checks: any[], missingFiles: string[], configIssues: string[]) {
    const replitConfigPath = path.join(dirPath, '.replit');
    if (fs.existsSync(replitConfigPath)) {
      try {
        const content = fs.readFileSync(replitConfigPath, 'utf8');
        const hasLanguage = content.includes('language');
        const hasRun = content.includes('run');
        
        checks.push({
          name: '.replit config exists',
          passed: true,
          message: '.replit configuration file found',
          severity: 'high'
        });
        
        checks.push({
          name: '.replit has language setting',
          passed: hasLanguage,
          message: hasLanguage ? 'Language setting found' : 'No language setting found',
          severity: 'high'
        });
        
        checks.push({
          name: '.replit has run command',
          passed: hasRun,
          message: hasRun ? 'Run command found' : 'No run command found',
          severity: 'high'
        });
        
        if (!hasLanguage || !hasRun) {
          configIssues.push('.replit missing required configurations');
        }
      } catch (error) {
        checks.push({
          name: '.replit valid',
          passed: false,
          message: '.replit exists but could not be read',
          severity: 'high'
        });
        
        configIssues.push('.replit could not be read');
      }
    } else {
      checks.push({
        name: '.replit config exists',
        passed: false,
        message: 'No .replit configuration file found',
        severity: 'high'
      });
      
      missingFiles.push('.replit');
      configIssues.push('Missing .replit configuration file');
    }
    
    // Check for .replit/replit.nix to enable Nix
    const replitNixPath = path.join(dirPath, 'replit.nix');
    if (!fs.existsSync(replitNixPath)) {
      checks.push({
        name: 'replit.nix exists',
        passed: false,
        message: 'No replit.nix file found (needed for custom dependencies)',
        severity: 'medium'
      });
    }
  }

  private static checkForCursorAIConfig(dirPath: string, checks: any[], missingFiles: string[], configIssues: string[]) {
    // Cursor AI doesn't have specific config files, but check for prompt templates
    const promptsDir = path.join(dirPath, 'prompts');
    if (fs.existsSync(promptsDir) && fs.statSync(promptsDir).isDirectory()) {
      const promptFiles = fs.readdirSync(promptsDir).filter(f => f.endsWith('.md') || f.endsWith('.txt'));
      
      checks.push({
        name: 'Cursor AI prompts directory exists',
        passed: true,
        message: 'Prompts directory found',
        severity: 'medium'
      });
      
      checks.push({
        name: 'Cursor AI prompt templates exist',
        passed: promptFiles.length > 0,
        message: promptFiles.length > 0 
          ? `${promptFiles.length} prompt templates found`
          : 'No prompt templates found in prompts directory',
        severity: 'low'
      });
    } else {
      checks.push({
        name: 'Cursor AI prompts directory exists',
        passed: false,
        message: 'No prompts directory found (recommended for Cursor AI projects)',
        severity: 'low'
      });
    }
    
    // Check for Cursor AI extension settings
    const vscodeDirPath = path.join(dirPath, '.vscode');
    const settingsPath = path.join(vscodeDirPath, 'settings.json');
    if (fs.existsSync(settingsPath)) {
      try {
        const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        const hasCursorSettings = !!settings['cursor.promptDirectory'] || 
                                 Object.keys(settings).some(key => key.startsWith('cursor.'));
        
        checks.push({
          name: 'Cursor AI settings exist',
          passed: hasCursorSettings,
          message: hasCursorSettings 
            ? 'Cursor AI settings found in VS Code settings'
            : 'No Cursor AI settings found in VS Code settings',
          severity: 'low'
        });
      } catch (error) {
        console.error('Error parsing VS Code settings:', error);
      }
    }
  }

  private static checkForEnvFile(dirPath: string, checks: any[], missingFiles: string[], configIssues: string[]) {
    // Check for .env or similar files
    const envFiles = ['.env', '.env.local', '.env.development', '.env.example'];
    const foundEnvFiles = envFiles.filter(file => fs.existsSync(path.join(dirPath, file)));
    
    checks.push({
      name: 'Environment files exist',
      passed: foundEnvFiles.length > 0,
      message: foundEnvFiles.length > 0 
        ? `Found environment files: ${foundEnvFiles.join(', ')}`
        : 'No environment files found',
      severity: 'medium'
    });
    
    if (foundEnvFiles.length === 0) {
      missingFiles.push('.env or .env.example');
      configIssues.push('Missing environment configuration files');
    } else {
      // Check if .env.example exists when .env exists
      if (foundEnvFiles.includes('.env') && !foundEnvFiles.includes('.env.example')) {
        configIssues.push('Missing .env.example file for documenting required environment variables');
        checks.push({
          name: '.env.example exists',
          passed: false,
          message: '.env file exists but no .env.example found for documentation',
          severity: 'medium'
        });
      }
    }
  }

  private static parseNetlifyToml(content: string): any {
    // Simple TOML parser (for a complete solution, use a proper TOML parser)
    const result: any = {};
    let currentSection = '';
    
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine === '' || trimmedLine.startsWith('#')) {
        continue;
      }
      
      const sectionMatch = trimmedLine.match(/\[(.*)\]/);
      if (sectionMatch) {
        currentSection = sectionMatch[1].trim();
        result[currentSection] = {};
        continue;
      }
      
      if (currentSection) {
        const keyValueMatch = trimmedLine.match(/([^=]+)=(.+)/);
        if (keyValueMatch) {
          const key = keyValueMatch[1].trim();
          let value = keyValueMatch[2].trim();
          
          // Handle quoted strings
          if ((value.startsWith('"') && value.endsWith('"')) || 
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.substring(1, value.length - 1);
          }
          
          result[currentSection][key] = value;
        }
      }
    }
    
    return result;
  }

  private static generateNetlifyToml(config: any): string {
    let tomlContent = '';
    
    for (const [section, values] of Object.entries(config)) {
      tomlContent += `[${section}]\n`;
      
      for (const [key, value] of Object.entries(values as object)) {
        if (typeof value === 'string' && value.includes(' ')) {
          tomlContent += `${key} = "${value}"\n`;
        } else {
          tomlContent += `${key} = ${value}\n`;
        }
      }
      
      tomlContent += '\n';
    }
    
    return tomlContent;
  }

  private static parseReplitConfig(content: string): any {
    // Simple parser for .replit config
    const result: any = {};
    
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine === '' || trimmedLine.startsWith('#')) {
        continue;
      }
      
      const keyValueMatch = trimmedLine.match(/([^=]+)=(.+)/);
      if (keyValueMatch) {
        const key = keyValueMatch[1].trim();
        let value = keyValueMatch[2].trim();
        
        // Handle quoted strings
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.substring(1, value.length - 1);
        }
        
        result[key] = value;
      }
    }
    
    return result;
  }

  private static generateReplitConfig(config: any): string {
    let configContent = '';
    
    for (const [key, value] of Object.entries(config)) {
      if (typeof value === 'string' && value.includes(' ')) {
        configContent += `${key} = "${value}"\n`;
      } else {
        configContent += `${key} = ${value}\n`;
      }
    }
    
    return configContent;
  }

  private static listDeploymentFiles(dirPath: string): string[] {
    const ignorePatterns = [
      'node_modules', '.git', 'dist', 'build', '.env', '.DS_Store',
      '*.log', 'logs', 'npm-debug.log*', 'yarn-debug.log*', 'yarn-error.log*'
    ];
    
    const files: string[] = [];
    
    const scan = (directory: string, relativePath: string = '') => {
      const items = fs.readdirSync(directory);
      
      for (const item of items) {
        if (ignorePatterns.some(pattern => {
          if (pattern.includes('*')) {
            const regex = new RegExp(pattern.replace('*', '.*'));
            return regex.test(item);
          }
          return item === pattern;
        })) {
          continue;
        }
        
        const itemPath = path.join(directory, item);
        const itemRelativePath = relativePath ? path.join(relativePath, item) : item;
        
        if (fs.statSync(itemPath).isDirectory()) {
          scan(itemPath, itemRelativePath);
        } else {
          files.push(itemRelativePath);
        }
      }
    };
    
    scan(dirPath);
    return files;
  }
}