import { spawn, exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import util from 'util';
import { storage } from '../storage';
import { type File, type Project, type DeploymentHistory, type CodeSource } from '@shared/schema';
import { HfInference } from '@huggingface/inference';
import fetch from 'node-fetch';

// Promisify exec
const execPromise = util.promisify(exec);

// Initialize API with Hugging Face
const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

/**
 * Comprehensive utility for managing the entire development lifecycle
 * from idea to production with special accessibility features for deaf communities
 */
export class IdeaToProduction {
  /**
   * Initializes a new project from an idea
   * @param userId User ID for the project owner
   * @param ideaText The initial idea text
   * @param accessibilityOptions Options for accessibility features
   * @returns The created project
   */
  public static async initializeFromIdea(
    userId: number,
    ideaText: string,
    accessibilityOptions: {
      visualCues: boolean;
      highContrast: boolean;
      simplifiedLanguage: boolean;
      signLanguageCompatible: boolean;
    } = {
      visualCues: true,
      highContrast: true,
      simplifiedLanguage: true,
      signLanguageCompatible: true
    }
  ): Promise<Project> {
    try {
      // Generate project details from the idea
      const projectDetailsPrompt = `Based on this idea, create a structured project outline.
Include a clear title, description, technology stack, main features, and project structure.
Make the language clear and accessible for deaf communities - avoid idioms and use simple, direct language.

Idea: ${ideaText}

Format as JSON:
{
  "title": "Project Title",
  "description": "Clear, concise description",
  "techStack": ["Technology 1", "Technology 2"],
  "mainFeatures": ["Feature 1", "Feature 2"],
  "projectStructure": ["Component 1", "Component 2"],
  "accessibilityConsiderations": ["Consideration 1", "Consideration 2"],
  "visualComponents": ["Component 1", "Component 2"]
}`;

      const projectResponse = await hf.textGeneration({
        model: 'google/flan-t5-xl',
        inputs: projectDetailsPrompt,
        parameters: { max_length: 1000 }
      });

      // Parse the project details
      let projectDetails;
      try {
        const jsonMatch = projectResponse.generated_text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          projectDetails = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Failed to extract JSON from response');
        }
      } catch (e) {
        console.error('Failed to parse project details JSON:', e);
        projectDetails = {
          title: 'New Project',
          description: ideaText.substring(0, 100),
          techStack: [],
          mainFeatures: [],
          projectStructure: [],
          accessibilityConsiderations: [],
          visualComponents: []
        };
      }

      // Add accessibility enhancements
      let accessibilityEnhancements = [];
      if (accessibilityOptions.visualCues) {
        accessibilityEnhancements.push('Visual workflow indicators');
        accessibilityEnhancements.push('Status icons instead of audio alerts');
      }
      if (accessibilityOptions.highContrast) {
        accessibilityEnhancements.push('High contrast UI elements');
        accessibilityEnhancements.push('Color coding for status and progress');
      }
      if (accessibilityOptions.simplifiedLanguage) {
        accessibilityEnhancements.push('Simplified technical language');
        accessibilityEnhancements.push('Visual code explanations');
      }
      if (accessibilityOptions.signLanguageCompatible) {
        accessibilityEnhancements.push('Compatible with sign language video overlays');
        accessibilityEnhancements.push('Support for visual annotations');
      }

      // Create the project
      const project = await storage.createProject({
        userId,
        title: projectDetails.title,
        description: projectDetails.description,
        status: 'planning',
        tags: projectDetails.techStack.join(','),
        visibility: 'private',
        metadata: {
          ideaText,
          generatedAt: new Date().toISOString(),
          techStack: projectDetails.techStack,
          mainFeatures: projectDetails.mainFeatures,
          projectStructure: projectDetails.projectStructure,
          accessibilityConsiderations: projectDetails.accessibilityConsiderations || [],
          visualComponents: projectDetails.visualComponents || [],
          accessibilityEnhancements,
          accessibilityOptions
        }
      });

      // Create initial README with visual aids
      const readmeContent = this.generateReadmeWithVisualAids(
        projectDetails.title,
        projectDetails.description,
        projectDetails.techStack,
        projectDetails.mainFeatures,
        accessibilityEnhancements
      );

      // Save README as a file
      await storage.createFile({
        userId,
        name: 'README.md',
        fileType: 'text/markdown',
        source: 'generated',
        fileCategory: 'Documentation',
        lastModified: new Date(),
        metadata: {
          projectId: project.id,
          generatedAt: new Date().toISOString(),
          isAccessible: true
        },
        contentSummary: 'Project README with visual aids',
        isProcessed: true
      });

      return project;
    } catch (error) {
      console.error('Error initializing project from idea:', error);
      throw new Error(`Failed to initialize project: ${error.message}`);
    }
  }

  /**
   * Create a new Git repository for a project
   * @param projectId Project ID
   * @param repoName Name for the repository
   * @param platform Platform for hosting the repository (github, gitlab, bitbucket)
   * @returns Information about the created repository
   */
  public static async createRepository(
    projectId: number,
    repoName: string,
    platform: 'github' | 'gitlab' | 'bitbucket' = 'github'
  ): Promise<{
    success: boolean;
    repoUrl: string;
    readmeUrl: string;
    visualGuide: string;
  }> {
    try {
      // Get the project
      const project = await storage.getProject(projectId);
      if (!project) {
        throw new Error(`Project not found: ${projectId}`);
      }

      // For demonstration purposes, we'll simulate repository creation
      // In a real implementation, this would use the GitHub/GitLab/Bitbucket API

      // Check if git is installed
      try {
        await execPromise('git --version');
      } catch (error) {
        throw new Error('Git is not installed on the system');
      }

      // Simulate repository creation
      const repoUrl = `https://${platform}.com/username/${repoName}`;
      
      // Generate a visual guide for Git operations
      const visualGuide = await this.generateGitVisualGuide(repoName, platform);

      // Update project metadata
      await storage.updateProject(projectId, {
        metadata: {
          ...project.metadata,
          repository: {
            url: repoUrl,
            platform,
            createdAt: new Date().toISOString(),
            visualGuide
          }
        }
      });

      // Return information about the repository
      return {
        success: true,
        repoUrl,
        readmeUrl: `${repoUrl}/blob/main/README.md`,
        visualGuide
      };
    } catch (error) {
      console.error('Error creating repository:', error);
      throw new Error(`Failed to create repository: ${error.message}`);
    }
  }

  /**
   * Prepare a project for development on Replit
   * @param projectId Project ID
   * @returns Information about the Replit project setup
   */
  public static async setupReplitProject(
    projectId: number
  ): Promise<{
    success: boolean;
    replitUrl: string;
    configFiles: string[];
    visualSetupGuide: string;
  }> {
    try {
      // Get the project
      const project = await storage.getProject(projectId);
      if (!project) {
        throw new Error(`Project not found: ${projectId}`);
      }

      // Create Replit configuration files
      const configFiles = await this.createReplitConfigs(project);

      // Generate a visual guide for Replit
      const visualSetupGuide = await this.generateReplitVisualGuide(project.title);

      // Simulate Replit project creation
      const replitUrl = `https://replit.com/@username/${project.title.replace(/\s+/g, '-').toLowerCase()}`;

      // Update project metadata
      await storage.updateProject(projectId, {
        metadata: {
          ...project.metadata,
          replit: {
            url: replitUrl,
            configFiles,
            setupAt: new Date().toISOString(),
            visualGuide: visualSetupGuide
          }
        }
      });

      return {
        success: true,
        replitUrl,
        configFiles,
        visualSetupGuide
      };
    } catch (error) {
      console.error('Error setting up Replit project:', error);
      throw new Error(`Failed to set up Replit project: ${error.message}`);
    }
  }

  /**
   * Set up Cursor AI integration for a project
   * @param projectId Project ID
   * @returns Information about the Cursor AI setup
   */
  public static async setupCursorAI(
    projectId: number
  ): Promise<{
    success: boolean;
    prompts: string[];
    settings: any;
    visualGuide: string;
  }> {
    try {
      // Get the project
      const project = await storage.getProject(projectId);
      if (!project) {
        throw new Error(`Project not found: ${projectId}`);
      }

      // Create Cursor AI configuration
      const cursorSettings = {
        "cursor.promptDirectory": "./prompts",
        "cursor.accessibilityMode": true,
        "cursor.visualFeedback": true,
        "cursor.highContrast": project.metadata?.accessibilityOptions?.highContrast || false,
        "cursor.simplifiedLanguage": project.metadata?.accessibilityOptions?.simplifiedLanguage || false
      };

      // Create default prompts for Cursor AI
      const prompts = [
        "Generate accessible code comment",
        "Create visual explanation of this code",
        "Simplify this technical implementation",
        "Add accessibility features to this component",
        "Create visual workflow diagram"
      ];

      // Generate a visual guide for Cursor AI
      const visualGuide = await this.generateCursorAIVisualGuide();

      // Update project metadata
      await storage.updateProject(projectId, {
        metadata: {
          ...project.metadata,
          cursorAI: {
            settings: cursorSettings,
            prompts,
            setupAt: new Date().toISOString(),
            visualGuide
          }
        }
      });

      return {
        success: true,
        prompts,
        settings: cursorSettings,
        visualGuide
      };
    } catch (error) {
      console.error('Error setting up Cursor AI:', error);
      throw new Error(`Failed to set up Cursor AI: ${error.message}`);
    }
  }

  /**
   * Configure a Netlify deployment for a project
   * @param projectId Project ID
   * @returns Information about the Netlify deployment configuration
   */
  public static async configureNetlifyDeployment(
    projectId: number
  ): Promise<{
    success: boolean;
    netlifyConfig: any;
    deployUrl: string;
    visualDeploymentGuide: string;
  }> {
    try {
      // Get the project
      const project = await storage.getProject(projectId);
      if (!project) {
        throw new Error(`Project not found: ${projectId}`);
      }

      // Create Netlify configuration
      const netlifyConfig = {
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

      // Generate Netlify TOML content
      const netlifyToml = `[build]
  publish = "dist"
  command = "npm run build"

[dev]
  command = "npm run dev"
  port = 8888
  framework = "#auto"

# Visual status indications for accessibility
[build.environment]
  NETLIFY_USE_VISUAL_STATUS = "true"

# Redirect all routes to index.html for SPA
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
`;

      // Generate a visual deployment guide
      const visualDeploymentGuide = await this.generateNetlifyVisualGuide();

      // Simulate Netlify site creation
      const deployUrl = `https://${project.title.replace(/\s+/g, '-').toLowerCase()}.netlify.app`;

      // Update project metadata
      await storage.updateProject(projectId, {
        metadata: {
          ...project.metadata,
          netlify: {
            config: netlifyConfig,
            deployUrl,
            setupAt: new Date().toISOString(),
            visualGuide: visualDeploymentGuide
          }
        }
      });

      // Create netlify.toml file
      await storage.createFile({
        userId: project.userId,
        name: 'netlify.toml',
        fileType: 'text/plain',
        source: 'generated',
        fileCategory: 'Configuration',
        lastModified: new Date(),
        metadata: {
          projectId: project.id,
          generatedAt: new Date().toISOString()
        },
        contentSummary: 'Netlify configuration file'
      });

      return {
        success: true,
        netlifyConfig,
        deployUrl,
        visualDeploymentGuide
      };
    } catch (error) {
      console.error('Error configuring Netlify deployment:', error);
      throw new Error(`Failed to configure Netlify deployment: ${error.message}`);
    }
  }

  /**
   * Create a CI/CD pipeline for a project
   * @param projectId Project ID
   * @returns Information about the created CI/CD pipeline
   */
  public static async createCICDPipeline(
    projectId: number
  ): Promise<{
    success: boolean;
    pipelineConfig: any;
    visualWorkflow: string;
  }> {
    try {
      // Get the project
      const project = await storage.getProject(projectId);
      if (!project) {
        throw new Error(`Project not found: ${projectId}`);
      }

      // Create CI/CD pipeline configuration
      const pipelineConfig = {
        name: `${project.title} CI/CD`,
        triggers: {
          push: {
            branches: ['main', 'development']
          },
          pullRequest: {
            branches: ['main']
          }
        },
        jobs: {
          build: {
            steps: [
              { name: "Checkout code", command: "git checkout $BRANCH_NAME" },
              { name: "Install dependencies", command: "npm install" },
              { name: "Run tests", command: "npm test" },
              { name: "Build", command: "npm run build" }
            ]
          },
          deploy: {
            steps: [
              { name: "Deploy to Netlify", command: "netlify deploy --prod" }
            ],
            needs: ["build"],
            onlyOn: ["main"]
          }
        },
        visualization: {
          useIcons: true,
          colorCoding: true,
          showStatus: true
        }
      };

      // Generate a visual workflow representation
      const visualWorkflow = await this.generateCICDVisualWorkflow(pipelineConfig);

      // Update project metadata
      await storage.updateProject(projectId, {
        metadata: {
          ...project.metadata,
          cicd: {
            config: pipelineConfig,
            createdAt: new Date().toISOString(),
            visualWorkflow
          }
        }
      });

      // Create GitHub workflow file
      const workflowYaml = `name: ${project.title} CI/CD

on:
  push:
    branches: [ main, development ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Use Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '16'
      - name: Install dependencies
        run: npm install
      - name: Run tests
        run: npm test
      - name: Build
        run: npm run build
      - name: Upload build
        uses: actions/upload-artifact@v2
        with:
          name: build
          path: dist

  deploy:
    if: github.ref == 'refs/heads/main'
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Download build
        uses: actions/download-artifact@v2
        with:
          name: build
          path: dist
      - name: Deploy to Netlify
        uses: netlify/actions/cli@master
        with:
          args: deploy --prod
        env:
          NETLIFY_AUTH_TOKEN: \${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: \${{ secrets.NETLIFY_SITE_ID }}
`;

      // Create workflow file
      await storage.createFile({
        userId: project.userId,
        name: '.github/workflows/main.yml',
        fileType: 'text/yaml',
        source: 'generated',
        fileCategory: 'Configuration',
        lastModified: new Date(),
        metadata: {
          projectId: project.id,
          generatedAt: new Date().toISOString()
        },
        contentSummary: 'GitHub Actions workflow for CI/CD'
      });

      return {
        success: true,
        pipelineConfig,
        visualWorkflow
      };
    } catch (error) {
      console.error('Error creating CI/CD pipeline:', error);
      throw new Error(`Failed to create CI/CD pipeline: ${error.message}`);
    }
  }

  /**
   * Track project deployment
   * @param projectId Project ID
   * @param environment Environment for the deployment (development, staging, production)
   * @param status Status of the deployment (success, failure)
   * @returns Information about the deployment
   */
  public static async trackDeployment(
    projectId: number,
    environment: 'development' | 'staging' | 'production',
    status: 'success' | 'failure'
  ): Promise<DeploymentHistory> {
    try {
      // Get the project
      const project = await storage.getProject(projectId);
      if (!project) {
        throw new Error(`Project not found: ${projectId}`);
      }

      // Create deployment record
      const deployment = await storage.createDeploymentHistory({
        projectId,
        environment,
        status,
        deployedAt: new Date(),
        userId: project.userId,
        metadata: {
          platform: 'netlify',
          url: project.metadata?.netlify?.deployUrl || '',
          visualStatus: status === 'success' 
            ? '✅ Visual indicator: Deployment successful' 
            : '❌ Visual indicator: Deployment failed'
        }
      });

      // Update project metadata
      const deployments = project.metadata?.deployments || [];
      deployments.push({
        id: deployment.id,
        environment,
        status,
        deployedAt: deployment.deployedAt.toISOString(),
        visualStatus: status === 'success' 
          ? '✅ Visual indicator: Deployment successful' 
          : '❌ Visual indicator: Deployment failed'
      });

      await storage.updateProject(projectId, {
        metadata: {
          ...project.metadata,
          deployments,
          lastDeployment: {
            environment,
            status,
            deployedAt: deployment.deployedAt.toISOString(),
            visualStatus: status === 'success' 
              ? '✅ Visual indicator: Deployment successful' 
              : '❌ Visual indicator: Deployment failed'
          }
        }
      });

      return deployment;
    } catch (error) {
      console.error('Error tracking deployment:', error);
      throw new Error(`Failed to track deployment: ${error.message}`);
    }
  }

  /**
   * Create an accessible project report with visual aids
   * @param projectId Project ID
   * @returns Information about the created report
   */
  public static async createAccessibleReport(
    projectId: number
  ): Promise<{
    success: boolean;
    reportFile: File;
    visualSummary: string;
  }> {
    try {
      // Get the project with deployments and files
      const project = await storage.getProject(projectId);
      if (!project) {
        throw new Error(`Project not found: ${projectId}`);
      }

      // Get files for the project
      const files = await storage.getProjectFiles(projectId);

      // Get deployments for the project
      const deployments = project.metadata?.deployments || [];

      // Generate an accessible report
      const reportContent = `# ${project.title} - Accessible Project Report

## 📊 Project Status: ${project.status}

![Project Status Visualization](https://via.placeholder.com/800x200.png?text=Project+Status+Visualization)

## 📋 Project Overview

${project.description}

## 🔑 Key Features

${project.metadata?.mainFeatures?.map((f, i) => `${i + 1}. ${f}`).join('\n') || 'No features defined'}

## 💻 Technology Stack

${project.metadata?.techStack?.map(t => `- ${t}`).join('\n') || 'No tech stack defined'}

## 📱 Accessibility Features

${project.metadata?.accessibilityEnhancements?.map(a => `- ${a}`).join('\n') || 'No accessibility enhancements defined'}

## 🚀 Deployment History

${deployments.map(d => `- ${new Date(d.deployedAt).toLocaleDateString()}: ${d.environment} - ${d.status} ${d.visualStatus}`).join('\n') || 'No deployments recorded'}

## 📁 Project Structure

Total files: ${files.length}

${files.map(f => `- ${f.name}`).join('\n')}

## 🔄 Development Workflow

![Development Workflow](https://via.placeholder.com/800x400.png?text=Visual+Development+Workflow)

1. Idea Capture
2. Project Setup
3. Development on Replit
4. Code Enhancement with Cursor AI
5. Testing
6. Deployment to Netlify
7. Monitoring

## 📈 Project Timeline

![Project Timeline](https://via.placeholder.com/800x200.png?text=Visual+Project+Timeline)

Report generated on ${new Date().toLocaleString()}
`;

      // Create a visual summary
      const visualSummary = `${project.title} Status:
✅ Project initialized
${project.metadata?.repository ? '✅' : '❌'} Git repository
${project.metadata?.replit ? '✅' : '❌'} Replit setup
${project.metadata?.cursorAI ? '✅' : '❌'} Cursor AI integration
${project.metadata?.netlify ? '✅' : '❌'} Netlify configuration
${project.metadata?.cicd ? '✅' : '❌'} CI/CD pipeline
${deployments.length > 0 ? '✅' : '❌'} Deployments`;

      // Save report as a file
      const reportFile = await storage.createFile({
        userId: project.userId,
        name: `${project.title} - Accessible Project Report.md`,
        fileType: 'text/markdown',
        source: 'generated',
        fileCategory: 'Documentation',
        lastModified: new Date(),
        metadata: {
          projectId: project.id,
          generatedAt: new Date().toISOString(),
          isAccessible: true,
          visualSummary
        },
        contentSummary: 'Accessible project report with visual aids',
        isProcessed: true
      });

      return {
        success: true,
        reportFile,
        visualSummary
      };
    } catch (error) {
      console.error('Error creating accessible report:', error);
      throw new Error(`Failed to create accessible report: ${error.message}`);
    }
  }

  // Helper methods

  /**
   * Generate README with visual aids for accessibility
   */
  private static generateReadmeWithVisualAids(
    title: string,
    description: string,
    techStack: string[],
    features: string[],
    accessibilityFeatures: string[]
  ): string {
    return `# ${title}

## 📋 Project Overview

${description}

## 🚀 Features

${features.map((f, i) => `${i + 1}. ${f}`).join('\n')}

## 💻 Technology Stack

${techStack.map(t => `- ${t}`).join('\n')}

## 🌈 Accessibility Features

${accessibilityFeatures.map(a => `- ${a}`).join('\n')}

## 📊 Project Structure

\`\`\`
project/
├── src/           # Source code
├── docs/          # Documentation
├── tests/         # Tests
└── README.md      # This file
\`\`\`

## 🔄 Development Workflow

![Development Workflow](https://via.placeholder.com/800x400.png?text=Visual+Development+Workflow)

1. Clone repository
2. Install dependencies
3. Start development server
4. Make changes
5. Run tests
6. Deploy

## 📝 Getting Started

\`\`\`bash
# Clone the repository
git clone <repository-url>

# Navigate to the project directory
cd project-name

# Install dependencies
npm install

# Start the development server
npm run dev
\`\`\`

## 📱 Accessibility

This project is designed with accessibility in mind, particularly for deaf communities. It includes:

- Visual-centric workflows
- Clear, simple language
- High contrast UI elements
- Visual alternatives to audio cues

## 📄 License

MIT

Created with ❤️ for accessibility
`;
  }

  /**
   * Generate a visual guide for Git operations
   */
  private static generateGitVisualGuide(
    repoName: string,
    platform: string
  ): string {
    return `# Visual Git Guide for ${repoName}

## 📊 Git Workflow Visualization

\`\`\`
Local Repo                        Remote Repo (${platform})
+-------------+                  +------------------+
| Work Area   |                  |                  |
| (Editing)   |                  |                  |
+-------------+                  |                  |
       ↓                         |                  |
+-------------+  git add .       |                  |
| Staging     |----------------->|                  |
| Area        |                  |                  |
+-------------+                  |                  |
       ↓                         |                  |
+-------------+  git commit -m   |                  |
| Local       |----------------->|                  |
| History     |                  |                  |
+-------------+                  |                  |
       ↓                         |                  |
+-------------+  git push        |  +-----------+   |
| Local       |----------------->|  | Remote    |   |
| Repository  |                  |  | Repository|   |
+-------------+                  |  +-----------+   |
                                 +------------------+
\`\`\`

## 🎬 Common Git Commands

| Action | Command | Visual Status |
|--------|---------|---------------|
| Clone repository | \`git clone https://${platform}.com/username/${repoName}.git\` | 📥 |
| Check status | \`git status\` | 📊 |
| Stage changes | \`git add .\` | ➕ |
| Commit changes | \`git commit -m "Message"\` | 💾 |
| Push to remote | \`git push\` | ⬆️ |
| Pull from remote | \`git pull\` | ⬇️ |
| Create branch | \`git checkout -b branch-name\` | 🌿 |
| Switch branch | \`git checkout branch-name\` | 🔄 |
| Merge branch | \`git merge branch-name\` | 🔀 |

## 🚦 Visual Status Indicators

- ✅ Success - Command completed successfully
- ❌ Error - Command failed
- 🔄 In Progress - Command is running
- 🔔 Notification - Important information

## 📚 Learn More

For more detailed instructions with visual guides, visit:
- [GitHub Visual Guide](https://guides.github.com/)
- [GitLab Docs](https://docs.gitlab.com/)
`;
  }

  /**
   * Create Replit configuration files
   */
  private static async createReplitConfigs(project: Project): Promise<string[]> {
    const configFiles = [];

    // .replit file
    const replitConfig = `
run = "npm run dev"
hidden = [".config", "package-lock.json"]

[packager]
language = "nodejs"
  [packager.features]
  packageSearch = true
  guessImports = true
  enabledForHosting = true

[languages.javascript]
pattern = "**/*.js"
syntax = "javascript"
  [languages.javascript.languageServer]
  start = ["typescript-language-server", "--stdio"]

[languages.typescript]
pattern = "**/*.ts"
syntax = "typescript"
  [languages.typescript.languageServer]
  start = ["typescript-language-server", "--stdio"]

[languages.jsx]
pattern = "**/*.jsx"
syntax = "jsx"
  [languages.jsx.languageServer]
  start = ["typescript-language-server", "--stdio"]

[languages.tsx]
pattern = "**/*.tsx"
syntax = "tsx"
  [languages.tsx.languageServer]
  start = ["typescript-language-server", "--stdio"]

[env]
REPLIT_VISUAL_FEEDBACK = "true"
REPLIT_HIGH_CONTRAST = "true"

[nix]
channel = "stable-22_11"
`;
    
    configFiles.push('.replit');

    // replit.nix file
    const replitNix = `{ pkgs }: {
  deps = [
    pkgs.nodejs-18_x
    pkgs.nodePackages.typescript
    pkgs.yarn
    pkgs.replitPackages.jest
  ];
}`;
    
    configFiles.push('replit.nix');

    // .gitignore file
    const gitignore = `# Replit specific
.replit
replit.nix
.config

# Node.js dependencies
node_modules/
npm-debug.log
yarn-debug.log
yarn-error.log

# Build outputs
dist/
build/
.next/
out/

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Editor files
.vscode/
.idea/
*.swp
*.swo

# OS files
.DS_Store
Thumbs.db
`;
    
    configFiles.push('.gitignore');

    return configFiles;
  }

  /**
   * Generate a visual guide for Replit
   */
  private static generateReplitVisualGuide(projectTitle: string): string {
    return `# Visual Replit Guide for ${projectTitle}

## 🖥️ Replit Interface Overview

\`\`\`
+--------------------------------------------------------+
|  +----------------+  +-------------------------------+  |
|  | Files          |  | Code Editor                   |  |
|  | [📁] src       |  | function App() {              |  |
|  | [📁] public    |  |   return (                    |  |
|  | [📄] .replit   |  |     <div>                     |  |
|  | [📄] package.j…|  |       <h1>Hello World</h1>    |  |
|  | [📄] README.md |  |     </div>                    |  |
|  +----------------+  |   );                          |  |
|                      | }                             |  |
|                      +-------------------------------+  |
|  +--------------------------------------------------------+
|  | Console                                             📊 |
|  | > npm run dev                                          |
|  | Server started at http://localhost:3000               |
|  | ✅ Compiled successfully!                             |
|  +--------------------------------------------------------+
+--------------------------------------------------------+
\`\`\`

## 🔄 Workflow Steps

1. **Access Your Replit Project**
   - Open your project at: https://replit.com/@username/${projectTitle.replace(/\s+/g, '-').toLowerCase()}
   - Visual indicator: 🌐 Browser opens Replit interface

2. **Edit Files**
   - Click on a file in the Files panel (left side)
   - Make changes in the editor (middle panel)
   - Visual indicator: ✏️ File is being edited

3. **Run Your Project**
   - Click the ▶️ Run button at the top
   - View output in the Console panel (bottom)
   - Visual indicator: 🚀 Project is running

4. **View Your Application**
   - Click on the 🔗 webview tab (may appear automatically)
   - Interact with your running application
   - Visual indicator: 👁️ Application is viewable

5. **Use Version Control**
   - Click on the 🔄 Version Control tab in the tools panel
   - Commit and push changes to your repository
   - Visual indicator: 💾 Changes are saved to repository

## 🎛️ Common Actions

| Action | How to Perform | Visual Indicator |
|--------|---------------|-----------------|
| Install a package | Type in console: \`npm install package-name\` | 📦 |
| Create a new file | Click + icon in Files panel | 📄 |
| Create a new folder | Click folder+ icon in Files panel | 📁 |
| Run tests | Type in console: \`npm test\` | 🧪 |
| Share your Repl | Click Share button at top right | 🔗 |
| Deploy your project | Click Deploy tab in tools panel | 🚀 |

## 💡 Accessibility Tips

- High contrast mode: Toggle in settings
- Keyboard shortcuts: Press Ctrl+/ to see all shortcuts
- Font size: Adjust in settings for better readability
- Command palette: Press Ctrl+P to open
`;
  }

  /**
   * Generate a visual guide for Cursor AI
   */
  private static generateCursorAIVisualGuide(): string {
    return `# Visual Cursor AI Guide

## 🧠 Cursor AI Interface Overview

\`\`\`
+--------------------------------------------------------+
|  +----------------+  +-------------------------------+  |
|  | Files          |  | Code Editor                   |  |
|  | [📁] src       |  | function Example() {          |  |
|  | [📁] prompts   |  |   // AI can help here         |  |
|  | [📄] README.md |  |   return (                    |  |
|  +----------------+  |     <div>                     |  |
|                      |       <h1>Component</h1>      |  |
|  +----------------+  |     </div>                    |  |
|  | AI Chat        |  |   );                          |  |
|  | > Help me with |  | }                             |  |
|  |   this code    |  |                               |  |
|  | < Here's how...|  +-------------------------------+  |
|  +----------------+  |                                  |
|                      |                                  |
+--------------------------------------------------------+
\`\`\`

## 🔮 Using AI Assistance

1. **Get Code Suggestions**
   - Type your code and wait for inline suggestions
   - Press Tab to accept suggestions
   - Visual indicator: 💡 Suggestion available

2. **Ask AI for Help**
   - Highlight code and press Ctrl+K (or Cmd+K on Mac)
   - Type your question in the AI chat panel
   - Visual indicator: 🤖 AI is processing

3. **Use Custom Prompts**
   - Open a prompt from the prompts directory
   - Fill in the template variables
   - Execute the prompt with Ctrl+Shift+L
   - Visual indicator: 📝 Prompt executed

4. **Generate Code**
   - Type a comment describing what you want
   - Press Ctrl+Enter to generate code
   - Visual indicator: ✨ Code generated

5. **Refactor Code**
   - Highlight code and press Ctrl+Shift+R
   - Describe how you want to refactor
   - Visual indicator: 🔄 Code refactored

## 📚 Accessibility-Focused Prompts

| Prompt Name | Purpose | How to Use |
|-------------|---------|-----------|
| AccessibleComponent | Generate accessible UI components | Select component code, run prompt |
| VisualExplanation | Create visual explanation of code | Select code, run prompt |
| SimplifyLanguage | Simplify technical language | Select text, run prompt |
| AddVisualCues | Add visual indicators to code | Select code, run prompt |
| AccessibilityAudit | Check for accessibility issues | Select component, run prompt |

## 🎛️ Accessibility Settings

- High contrast mode: Enabled in settings
- Visual feedback: Cursor uses icons and colors instead of sounds
- Simplified explanations: Technical concepts explained with visual examples
- Keyboard-focused workflow: Minimal mouse interaction needed
`;
  }

  /**
   * Generate a visual guide for Netlify
   */
  private static generateNetlifyVisualGuide(): string {
    return `# Visual Netlify Deployment Guide

## 🌐 Netlify Deployment Flow

\`\`\`
 Local Project                    Netlify Platform
+---------------+  git push     +-------------------+
| Your Code     |-------------->| GitHub/GitLab     |
+---------------+               +-------------------+
        |                                |
        | netlify deploy                 | auto trigger
        v                                v
+---------------+               +-------------------+
| Build Process |<--------------| Build Server      |
+---------------+               +-------------------+
        |                                |
        | successful build               | successful build
        v                                v
+---------------+               +-------------------+
| Preview URL   |<--------------| Preview Deploy    |
+---------------+               +-------------------+
        |                                |
        | approve                        | merge to main
        v                                v
+---------------+               +-------------------+
| Production    |<--------------| Production Deploy |
+---------------+               +-------------------+
\`\`\`

## 🚀 Deployment Steps

1. **Connect Your Repository**
   - Log in to Netlify
   - Click "New site from Git"
   - Select your Git provider (GitHub, GitLab, BitBucket)
   - Choose your repository
   - Visual indicator: 🔗 Repository connected

2. **Configure Build Settings**
   - Build command: \`npm run build\`
   - Publish directory: \`dist\` (or your build output folder)
   - Advanced settings: Add environment variables if needed
   - Visual indicator: ⚙️ Build settings configured

3. **Deploy Your Site**
   - Click "Deploy site"
   - Wait for the build process to complete
   - Visual indicator: 🚀 Deployment in progress
   - Visual indicator: ✅ Deployment complete

4. **View Your Deployed Site**
   - Click on the preview URL
   - Verify your site is working correctly
   - Visual indicator: 👁️ Site preview available

5. **Set Up Custom Domain**
   - Go to Site settings > Domain management
   - Add your custom domain
   - Configure DNS settings
   - Visual indicator: 🌐 Custom domain set up

## 🎛️ Important Netlify Features

| Feature | Purpose | Visual Indicator |
|---------|---------|-----------------|
| Branch deploys | Test changes before merging to main | 🌿 |
| Deploy previews | Preview pull requests | 👀 |
| Form handling | Process form submissions | 📝 |
| Functions | Run serverless functions | ⚡ |
| Identity | User authentication | 🔑 |
| Large Media | Handle large files | 🖼️ |

## 💡 Accessibility Tips

- Use visual deploy notifications instead of sounds
- Set up detailed status emails for deployment results
- Use high-contrast theme in Netlify dashboard
- Enable detailed logging for better troubleshooting visuals
`;
  }

  /**
   * Generate a visual CI/CD workflow
   */
  private static generateCICDVisualWorkflow(config: any): string {
    return `# Visual CI/CD Workflow Guide

## 🔄 CI/CD Pipeline Visualization

\`\`\`
                      +----------------+
                      | Code Changes   |
                      +----------------+
                               |
                               v
+-----------------+    +----------------+    +-----------------+
| Pull Request    |<---| Push to        |--->| Automated Tests |
| Created         |    | Branch         |    | Run             |
+-----------------+    +----------------+    +-----------------+
        |                      |                      |
        v                      v                      v
+-----------------+    +----------------+    +-----------------+
| Code Review     |    | Merge to       |    | Build Process   |
| Process         |    | Main           |    | Triggered       |
+-----------------+    +----------------+    +-----------------+
                               |                      |
                               v                      v
                      +----------------+    +-----------------+
                      | Deployment     |    | Tests Pass      |
                      | to Production  |<---| or Fail         |
                      +----------------+    +-----------------+
                               |
                               v
                      +----------------+
                      | Monitor        |
                      | Application    |
                      +----------------+
\`\`\`

## 🚦 Status Indicators

| Stage | Success | Failure | In Progress |
|-------|---------|---------|-------------|
| Build | 🟢 Build succeeded | 🔴 Build failed | 🟡 Building... |
| Tests | ✅ Tests passed | ❌ Tests failed | 🔄 Running tests... |
| Lint | 🟢 Code quality passed | 🔴 Code quality issues | 🟡 Checking code... |
| Deploy | 🚀 Deployed successfully | 💥 Deployment failed | 🔄 Deploying... |

## 📊 CI/CD Process Steps

1. **Code Changes**
   - Developer makes changes to the code
   - Commits to feature branch
   - Visual indicator: 📝 Code changes made

2. **Tests Run Automatically**
   - Unit tests, integration tests
   - Linting and code quality checks
   - Visual indicator: 🧪 Tests running

3. **Build Process**
   - Code is compiled and bundled
   - Assets are processed
   - Visual indicator: 🏗️ Building application

4. **Review and Approval**
   - Pull request reviewed by team
   - Changes approved or requested
   - Visual indicator: 👀 Code review in progress

5. **Deployment**
   - Code is deployed to the target environment
   - Environment variables are applied
   - Visual indicator: 🚀 Deploying to environment

6. **Verification**
   - Deployment is verified
   - Health checks are performed
   - Visual indicator: ✅ Deployment verified

## 🔍 Monitoring Dashboard

\`\`\`
+---------------------------------------------------------+
| Deployment Status                                       |
+---------------------------------------------------------+
| Environment | Status | Last Deployed | Build | Tests    |
+---------------------------------------------------------+
| Production  | 🟢 Up  | 2 hours ago   | ✅ Pass | ✅ Pass |
| Staging     | 🟢 Up  | 30 mins ago   | ✅ Pass | ✅ Pass |
| Development | 🟢 Up  | 5 mins ago    | ✅ Pass | ✅ Pass |
+---------------------------------------------------------+
\`\`\`

## 🚨 Troubleshooting Common Issues

| Issue | Visual Indicator | Solution |
|-------|-----------------|----------|
| Build fails | 🔴 Build failed | Check build logs for errors |
| Tests fail | ❌ Tests failed | Review failing tests in test report |
| Deployment fails | 💥 Deployment failed | Check deployment logs |
| Performance issues | ⚠️ Performance warning | Review performance metrics |
`;
  }
}