import OpenAI from 'openai';
import { File } from '@shared/schema';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const exists = promisify(fs.exists);

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user

/**
 * Extracts text content from a file based on its type
 * @param filePath Path to the file
 * @param fileType Type of the file
 * @returns Extracted text content
 */
export async function extractTextFromFile(filePath: string, fileType: string): Promise<string> {
  try {
    // For now, just read the file as text, but this could be extended to handle various file types
    const buffer = await readFile(filePath);
    
    switch (fileType.toLowerCase()) {
      // Text-based files
      case 'text/plain':
      case 'text/markdown':
      case 'text/html':
      case 'text/css':
      case 'text/javascript':
      case 'application/json':
      case 'application/xml':
        return buffer.toString('utf8');
        
      // Binary files or unsupported formats
      default:
        return `[Binary file of type ${fileType}]`;
    }
  } catch (error) {
    console.error('Error extracting text from file:', error);
    return '';
  }
}

/**
 * Generate vector embeddings for a piece of text
 * @param text Text to generate embeddings for
 * @returns Vector embeddings as an array of numbers
 */
export async function generateEmbeddings(text: string): Promise<number[]> {
  try {
    // Truncate text if it's too long
    const truncatedText = text.slice(0, 8000);
    
    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: truncatedText,
    });
    
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embeddings:', error);
    return [];
  }
}

/**
 * Analyzes file content using AI to determine category and metadata
 * @param file File object with metadata
 * @param content Text content of the file
 * @returns Updated file metadata
 */
export async function analyzeFileContent(file: File, content: string): Promise<{
  fileCategory: string;
  contentSummary: string;
  metadata: any;
}> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an AI assistant that analyzes files to categorize them and extract useful metadata.
          
Please analyze the file with the following information:

File name: ${file.name}
File type: ${file.fileType}
Source: ${file.source}
Content: 

${content.slice(0, 4000)} ${content.length > 4000 ? '... [content truncated]' : ''}

Respond with a JSON object containing the following fields:
1. 'fileCategory': A single category that best describes this file (e.g., 'document', 'code', 'image', 'project', 'idea', 'data', etc.)
2. 'contentSummary': A concise summary (1-3 sentences) of what this file contains
3. 'metadata': An object with relevant attributes about this file, including:
   - 'topics': An array of key topics in the file
   - 'programmingLanguage': If code, what language (null if not code)
   - 'possibleProjects': An array of project types this might belong to
   - 'completeness': A value from 0-1 indicating how complete/finished this file seems
   - 'complexity': A value from 0-1 indicating the complexity of the content
   - 'potentialReuse': A value from 0-1 indicating how reusable this content might be`
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 1000
    });
    
    const content = response.choices[0].message.content || '{}';
    const result = JSON.parse(content);
    
    return {
      fileCategory: result.fileCategory || 'uncategorized',
      contentSummary: result.contentSummary || '',
      metadata: result.metadata || {}
    };
  } catch (error) {
    console.error('Error analyzing file content:', error);
    return {
      fileCategory: 'uncategorized',
      contentSummary: 'Failed to analyze content',
      metadata: {}
    };
  }
}

/**
 * Creates boilerplate project structure based on project type
 * @param projectName Name of the project
 * @param projectType Type of project (e.g., web, api, mobile)
 * @param framework Framework to use (e.g., react, express, flutter)
 * @param basePath Base path where to create the project
 * @returns Object containing created files and project structure
 */
export async function createProjectBoilerplate(
  projectName: string,
  projectType: string,
  framework: string,
  basePath: string
): Promise<{ files: string[]; structure: any }> {
  try {
    // Create project directory
    const projectPath = path.join(basePath, projectName);
    
    if (!await exists(projectPath)) {
      await mkdir(projectPath, { recursive: true });
    }
    
    const createdFiles: string[] = [];
    const projectStructure: any = {
      directories: [],
      files: []
    };
    
    // Generate project structure based on type and framework
    switch (projectType.toLowerCase()) {
      case 'web':
        await createWebProject(projectPath, framework, createdFiles, projectStructure);
        break;
        
      case 'api':
        await createApiProject(projectPath, framework, createdFiles, projectStructure);
        break;
        
      case 'mobile':
        await createMobileProject(projectPath, framework, createdFiles, projectStructure);
        break;
        
      default:
        await createBasicProject(projectPath, createdFiles, projectStructure);
        break;
    }
    
    return {
      files: createdFiles,
      structure: projectStructure
    };
  } catch (error) {
    console.error('Error creating project boilerplate:', error);
    return {
      files: [],
      structure: {}
    };
  }
}

/**
 * Creates a web project boilerplate
 * @param projectPath Path to the project directory
 * @param framework Framework to use
 * @param createdFiles Array to track created files
 * @param projectStructure Object to track project structure
 */
async function createWebProject(
  projectPath: string,
  framework: string,
  createdFiles: string[],
  projectStructure: any
) {
  // Create directories
  const directories = ['src', 'public', 'src/components', 'src/pages'];
  
  for (const dir of directories) {
    const dirPath = path.join(projectPath, dir);
    if (!await exists(dirPath)) {
      await mkdir(dirPath, { recursive: true });
    }
    projectStructure.directories.push(dir);
  }
  
  // Create package.json
  const packageJson = {
    name: path.basename(projectPath),
    version: '0.1.0',
    private: true,
    scripts: {
      start: 'npm run dev',
      dev: 'vite',
      build: 'vite build',
      preview: 'vite preview'
    },
    dependencies: {} as Record<string, string>,
    devDependencies: {} as Record<string, string>
  };
  
  // Add framework-specific dependencies
  switch (framework.toLowerCase()) {
    case 'react':
      packageJson.dependencies['react'] = '^18.2.0';
      packageJson.dependencies['react-dom'] = '^18.2.0';
      packageJson.dependencies['react-router-dom'] = '^6.11.1';
      packageJson.devDependencies['@vitejs/plugin-react'] = '^4.0.0';
      packageJson.devDependencies['vite'] = '^4.3.5';
      break;
      
    case 'vue':
      packageJson.dependencies['vue'] = '^3.3.4';
      packageJson.dependencies['vue-router'] = '^4.2.1';
      packageJson.devDependencies['@vitejs/plugin-vue'] = '^4.2.3';
      packageJson.devDependencies['vite'] = '^4.3.5';
      break;
      
    case 'angular':
      packageJson.dependencies['@angular/core'] = '^16.0.0';
      packageJson.dependencies['@angular/common'] = '^16.0.0';
      packageJson.dependencies['@angular/router'] = '^16.0.0';
      packageJson.devDependencies['@angular-devkit/build-angular'] = '^16.0.0';
      break;
  }
  
  const packageJsonPath = path.join(projectPath, 'package.json');
  await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
  createdFiles.push('package.json');
  projectStructure.files.push('package.json');
  
  // Create index.html
  const indexHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${path.basename(projectPath)}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`;
  
  const indexHtmlPath = path.join(projectPath, 'index.html');
  await writeFile(indexHtmlPath, indexHtml);
  createdFiles.push('index.html');
  projectStructure.files.push('index.html');
  
  // Create README.md
  const readme = `# ${path.basename(projectPath)}

## Description
A web application built with ${framework}.

## Getting Started
1. Install dependencies:
   \`\`\`
   npm install
   \`\`\`

2. Start the development server:
   \`\`\`
   npm run dev
   \`\`\`

3. Build for production:
   \`\`\`
   npm run build
   \`\`\`
`;
  
  const readmePath = path.join(projectPath, 'README.md');
  await writeFile(readmePath, readme);
  createdFiles.push('README.md');
  projectStructure.files.push('README.md');
  
  // Create more framework-specific files
  if (framework.toLowerCase() === 'react') {
    await createReactFiles(projectPath, createdFiles, projectStructure);
  } else if (framework.toLowerCase() === 'vue') {
    await createVueFiles(projectPath, createdFiles, projectStructure);
  }
}

/**
 * Creates React-specific files for a web project
 * @param projectPath Path to the project directory
 * @param createdFiles Array to track created files
 * @param projectStructure Object to track project structure
 */
async function createReactFiles(
  projectPath: string,
  createdFiles: string[],
  projectStructure: any
) {
  // Create src/main.jsx
  const mainJsx = `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`;
  
  const mainJsxPath = path.join(projectPath, 'src', 'main.jsx');
  await writeFile(mainJsxPath, mainJsx);
  createdFiles.push('src/main.jsx');
  projectStructure.files.push('src/main.jsx');
  
  // Create src/App.jsx
  const appJsx = `import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="App">
      <header className="App-header">
        <h1>${path.basename(projectPath)}</h1>
        <p>
          <button onClick={() => setCount((count) => count + 1)}>
            count is {count}
          </button>
        </p>
      </header>
    </div>
  )
}

export default App`;
  
  const appJsxPath = path.join(projectPath, 'src', 'App.jsx');
  await writeFile(appJsxPath, appJsx);
  createdFiles.push('src/App.jsx');
  projectStructure.files.push('src/App.jsx');
  
  // Create src/index.css
  const indexCss = `body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

code {
  font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
    monospace;
}`;
  
  const indexCssPath = path.join(projectPath, 'src', 'index.css');
  await writeFile(indexCssPath, indexCss);
  createdFiles.push('src/index.css');
  projectStructure.files.push('src/index.css');
  
  // Create src/App.css
  const appCss = `.App {
  text-align: center;
}

.App-header {
  background-color: #282c34;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: calc(10px + 2vmin);
  color: white;
}

button {
  font-size: 1rem;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.25rem;
  background-color: #61dafb;
  color: #282c34;
  cursor: pointer;
  transition: background-color 0.3s;
}

button:hover {
  background-color: #4fa3cc;
}`;
  
  const appCssPath = path.join(projectPath, 'src', 'App.css');
  await writeFile(appCssPath, appCss);
  createdFiles.push('src/App.css');
  projectStructure.files.push('src/App.css');
  
  // Create vite.config.js
  const viteConfig = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
})`;
  
  const viteConfigPath = path.join(projectPath, 'vite.config.js');
  await writeFile(viteConfigPath, viteConfig);
  createdFiles.push('vite.config.js');
  projectStructure.files.push('vite.config.js');
}

/**
 * Creates Vue-specific files for a web project
 * @param projectPath Path to the project directory
 * @param createdFiles Array to track created files
 * @param projectStructure Object to track project structure
 */
async function createVueFiles(
  projectPath: string,
  createdFiles: string[],
  projectStructure: any
) {
  // Create src/main.js
  const mainJs = `import { createApp } from 'vue'
import App from './App.vue'
import './style.css'

createApp(App).mount('#app')`;
  
  const mainJsPath = path.join(projectPath, 'src', 'main.js');
  await writeFile(mainJsPath, mainJs);
  createdFiles.push('src/main.js');
  projectStructure.files.push('src/main.js');
  
  // Create src/App.vue
  const appVue = `<script setup>
import { ref } from 'vue'

const count = ref(0)
</script>

<template>
  <div class="app">
    <header class="app-header">
      <h1>${path.basename(projectPath)}</h1>
      <p>
        <button @click="count++">
          count is {{ count }}
        </button>
      </p>
    </header>
  </div>
</template>

<style scoped>
.app {
  text-align: center;
}

.app-header {
  background-color: #282c34;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: calc(10px + 2vmin);
  color: white;
}

button {
  font-size: 1rem;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.25rem;
  background-color: #42b883;
  color: #282c34;
  cursor: pointer;
  transition: background-color 0.3s;
}

button:hover {
  background-color: #33a06f;
}
</style>`;
  
  const appVuePath = path.join(projectPath, 'src', 'App.vue');
  await writeFile(appVuePath, appVue);
  createdFiles.push('src/App.vue');
  projectStructure.files.push('src/App.vue');
  
  // Create src/style.css
  const styleCss = `body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

code {
  font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
    monospace;
}`;
  
  const styleCssPath = path.join(projectPath, 'src', 'style.css');
  await writeFile(styleCssPath, styleCss);
  createdFiles.push('src/style.css');
  projectStructure.files.push('src/style.css');
  
  // Create vite.config.js
  const viteConfig = `import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
})`;
  
  const viteConfigPath = path.join(projectPath, 'vite.config.js');
  await writeFile(viteConfigPath, viteConfig);
  createdFiles.push('vite.config.js');
  projectStructure.files.push('vite.config.js');
}

/**
 * Creates an API project boilerplate
 * @param projectPath Path to the project directory
 * @param framework Framework to use
 * @param createdFiles Array to track created files
 * @param projectStructure Object to track project structure
 */
async function createApiProject(
  projectPath: string,
  framework: string,
  createdFiles: string[],
  projectStructure: any
) {
  // Create directories
  const directories = ['src', 'src/routes', 'src/models', 'src/controllers', 'src/middleware', 'src/utils'];
  
  for (const dir of directories) {
    const dirPath = path.join(projectPath, dir);
    if (!await exists(dirPath)) {
      await mkdir(dirPath, { recursive: true });
    }
    projectStructure.directories.push(dir);
  }
  
  // Create package.json
  const packageJson = {
    name: path.basename(projectPath),
    version: '0.1.0',
    private: true,
    scripts: {
      start: 'node dist/index.js',
      dev: 'tsx src/index.ts',
      build: 'tsc',
    },
    dependencies: {
      'express': '^4.18.2',
      'cors': '^2.8.5',
      'dotenv': '^16.0.3',
    } as Record<string, string>,
    devDependencies: {
      '@types/express': '^4.17.17',
      '@types/cors': '^2.8.13',
      '@types/node': '^18.16.3',
      'typescript': '^5.0.4',
      'tsx': '^3.12.7'
    } as Record<string, string>
  };
  
  // Add framework-specific dependencies
  switch (framework.toLowerCase()) {
    case 'express':
      // Already added above
      break;
      
    case 'fastapi':
      // Not a Node.js framework, would need different setup
      break;
      
    case 'nestjs':
      packageJson.dependencies['@nestjs/common'] = '^9.4.0';
      packageJson.dependencies['@nestjs/core'] = '^9.4.0';
      packageJson.dependencies['@nestjs/platform-express'] = '^9.4.0';
      packageJson.dependencies['reflect-metadata'] = '^0.1.13';
      packageJson.dependencies['rxjs'] = '^7.8.1';
      break;
  }
  
  const packageJsonPath = path.join(projectPath, 'package.json');
  await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
  createdFiles.push('package.json');
  projectStructure.files.push('package.json');
  
  // Create tsconfig.json
  const tsconfig = {
    "compilerOptions": {
      "target": "ES2022",
      "module": "NodeNext",
      "moduleResolution": "NodeNext",
      "esModuleInterop": true,
      "strict": true,
      "outDir": "./dist",
      "skipLibCheck": true,
      "forceConsistentCasingInFileNames": true
    },
    "include": ["src/**/*"],
    "exclude": ["node_modules", "dist"]
  };
  
  const tsconfigPath = path.join(projectPath, 'tsconfig.json');
  await writeFile(tsconfigPath, JSON.stringify(tsconfig, null, 2));
  createdFiles.push('tsconfig.json');
  projectStructure.files.push('tsconfig.json');
  
  // Create .env
  const env = `PORT=3000
NODE_ENV=development`;
  
  const envPath = path.join(projectPath, '.env');
  await writeFile(envPath, env);
  createdFiles.push('.env');
  projectStructure.files.push('.env');
  
  // Create README.md
  const readme = `# ${path.basename(projectPath)} API

## Description
An API built with ${framework}.

## Getting Started
1. Install dependencies:
   \`\`\`
   npm install
   \`\`\`

2. Start the development server:
   \`\`\`
   npm run dev
   \`\`\`

3. Build for production:
   \`\`\`
   npm run build
   \`\`\`

4. Start production server:
   \`\`\`
   npm start
   \`\`\`
`;
  
  const readmePath = path.join(projectPath, 'README.md');
  await writeFile(readmePath, readme);
  createdFiles.push('README.md');
  projectStructure.files.push('README.md');
  
  // Create src/index.ts
  const indexTs = `import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import routes from './routes';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', routes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

// Start server
app.listen(port, () => {
  console.log(\`Server running at http://localhost:\${port}\`);
});

export default app;`;
  
  const indexTsPath = path.join(projectPath, 'src', 'index.ts');
  await writeFile(indexTsPath, indexTs);
  createdFiles.push('src/index.ts');
  projectStructure.files.push('src/index.ts');
  
  // Create src/routes/index.ts
  const routesIndexTs = `import { Router } from 'express';
import itemRoutes from './item.routes';

const router = Router();

router.use('/items', itemRoutes);

export default router;`;
  
  const routesIndexTsPath = path.join(projectPath, 'src', 'routes', 'index.ts');
  await writeFile(routesIndexTsPath, routesIndexTs);
  createdFiles.push('src/routes/index.ts');
  projectStructure.files.push('src/routes/index.ts');
  
  // Create src/routes/item.routes.ts
  const itemRoutesTs = `import { Router } from 'express';
import { getItems, getItem, createItem, updateItem, deleteItem } from '../controllers/item.controller';

const router = Router();

router.get('/', getItems);
router.get('/:id', getItem);
router.post('/', createItem);
router.put('/:id', updateItem);
router.delete('/:id', deleteItem);

export default router;`;
  
  const itemRoutesTsPath = path.join(projectPath, 'src', 'routes', 'item.routes.ts');
  await writeFile(itemRoutesTsPath, itemRoutesTs);
  createdFiles.push('src/routes/item.routes.ts');
  projectStructure.files.push('src/routes/item.routes.ts');
  
  // Create src/controllers/item.controller.ts
  const itemControllerTs = `import { Request, Response } from 'express';

// Mock item data
const items = [
  { id: 1, name: 'Item 1', description: 'Description 1' },
  { id: 2, name: 'Item 2', description: 'Description 2' },
];

export const getItems = (req: Request, res: Response) => {
  res.json(items);
};

export const getItem = (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const item = items.find(item => item.id === id);
  
  if (!item) {
    return res.status(404).json({ message: 'Item not found' });
  }
  
  res.json(item);
};

export const createItem = (req: Request, res: Response) => {
  const { name, description } = req.body;
  
  if (!name || !description) {
    return res.status(400).json({ message: 'Name and description are required' });
  }
  
  const newItem = {
    id: items.length + 1,
    name,
    description,
  };
  
  items.push(newItem);
  
  res.status(201).json(newItem);
};

export const updateItem = (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const { name, description } = req.body;
  
  const itemIndex = items.findIndex(item => item.id === id);
  
  if (itemIndex === -1) {
    return res.status(404).json({ message: 'Item not found' });
  }
  
  items[itemIndex] = {
    ...items[itemIndex],
    name: name || items[itemIndex].name,
    description: description || items[itemIndex].description,
  };
  
  res.json(items[itemIndex]);
};

export const deleteItem = (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  
  const itemIndex = items.findIndex(item => item.id === id);
  
  if (itemIndex === -1) {
    return res.status(404).json({ message: 'Item not found' });
  }
  
  const deletedItem = items.splice(itemIndex, 1)[0];
  
  res.json(deletedItem);
};`;
  
  const itemControllerTsPath = path.join(projectPath, 'src', 'controllers', 'item.controller.ts');
  await writeFile(itemControllerTsPath, itemControllerTs);
  createdFiles.push('src/controllers/item.controller.ts');
  projectStructure.files.push('src/controllers/item.controller.ts');
}

/**
 * Creates a mobile project boilerplate
 * @param projectPath Path to the project directory
 * @param framework Framework to use
 * @param createdFiles Array to track created files
 * @param projectStructure Object to track project structure
 */
async function createMobileProject(
  projectPath: string,
  framework: string,
  createdFiles: string[],
  projectStructure: any
) {
  // For now, just create a basic React Native project
  // Create directories
  const directories = ['src', 'src/components', 'src/screens', 'src/assets', 'src/navigation'];
  
  for (const dir of directories) {
    const dirPath = path.join(projectPath, dir);
    if (!await exists(dirPath)) {
      await mkdir(dirPath, { recursive: true });
    }
    projectStructure.directories.push(dir);
  }
  
  // Create package.json
  const packageJson = {
    name: path.basename(projectPath),
    version: '0.1.0',
    private: true,
    scripts: {
      start: 'expo start',
      android: 'expo start --android',
      ios: 'expo start --ios',
      web: 'expo start --web'
    },
    dependencies: {
      'react': '^18.2.0',
      'react-native': '0.71.7',
      'expo': '^48.0.15',
      'expo-status-bar': '~1.4.4',
      'react-native-safe-area-context': '^4.5.2',
    } as Record<string, string>,
    devDependencies: {
      '@types/react': '^18.2.0',
      '@types/react-native': '^0.71.6',
      'typescript': '^5.0.4'
    } as Record<string, string>
  };
  
  const packageJsonPath = path.join(projectPath, 'package.json');
  await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
  createdFiles.push('package.json');
  projectStructure.files.push('package.json');
  
  // Create tsconfig.json
  const tsconfig = {
    "compilerOptions": {
      "allowSyntheticDefaultImports": true,
      "jsx": "react-native",
      "lib": ["dom", "esnext"],
      "moduleResolution": "node",
      "noEmit": true,
      "skipLibCheck": true,
      "resolveJsonModule": true,
      "strict": true
    },
    "extends": "expo/tsconfig.base"
  };
  
  const tsconfigPath = path.join(projectPath, 'tsconfig.json');
  await writeFile(tsconfigPath, JSON.stringify(tsconfig, null, 2));
  createdFiles.push('tsconfig.json');
  projectStructure.files.push('tsconfig.json');
  
  // Create App.tsx
  const appTsx = `import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { useState } from 'react';

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>${path.basename(projectPath)}</Text>
      <TouchableOpacity 
        style={styles.button}
        onPress={() => setCount(prevCount => prevCount + 1)}
      >
        <Text style={styles.buttonText}>Count: {count}</Text>
      </TouchableOpacity>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
});`;
  
  const appTsxPath = path.join(projectPath, 'App.tsx');
  await writeFile(appTsxPath, appTsx);
  createdFiles.push('App.tsx');
  projectStructure.files.push('App.tsx');
  
  // Create README.md
  const readme = `# ${path.basename(projectPath)}

## Description
A mobile application built with React Native.

## Getting Started
1. Install dependencies:
   \`\`\`
   npm install
   \`\`\`

2. Start the development server:
   \`\`\`
   npm start
   \`\`\`

3. Run on iOS:
   \`\`\`
   npm run ios
   \`\`\`

4. Run on Android:
   \`\`\`
   npm run android
   \`\`\`
`;
  
  const readmePath = path.join(projectPath, 'README.md');
  await writeFile(readmePath, readme);
  createdFiles.push('README.md');
  projectStructure.files.push('README.md');
  
  // Create babel.config.js
  const babelConfig = `module.exports = {
  presets: ['babel-preset-expo'],
};`;
  
  const babelConfigPath = path.join(projectPath, 'babel.config.js');
  await writeFile(babelConfigPath, babelConfig);
  createdFiles.push('babel.config.js');
  projectStructure.files.push('babel.config.js');
  
  // Create app.json
  const appJson = {
    "expo": {
      "name": path.basename(projectPath),
      "slug": path.basename(projectPath).toLowerCase().replace(/\s+/g, '-'),
      "version": "1.0.0",
      "orientation": "portrait",
      "icon": "./src/assets/icon.png",
      "userInterfaceStyle": "light",
      "splash": {
        "image": "./src/assets/splash.png",
        "resizeMode": "contain",
        "backgroundColor": "#ffffff"
      },
      "assetBundlePatterns": [
        "**/*"
      ],
      "ios": {
        "supportsTablet": true
      },
      "android": {
        "adaptiveIcon": {
          "foregroundImage": "./src/assets/adaptive-icon.png",
          "backgroundColor": "#ffffff"
        }
      },
      "web": {
        "favicon": "./src/assets/favicon.png"
      }
    }
  };
  
  const appJsonPath = path.join(projectPath, 'app.json');
  await writeFile(appJsonPath, JSON.stringify(appJson, null, 2));
  createdFiles.push('app.json');
  projectStructure.files.push('app.json');
}

/**
 * Creates a basic project boilerplate
 * @param projectPath Path to the project directory
 * @param createdFiles Array to track created files
 * @param projectStructure Object to track project structure
 */
async function createBasicProject(
  projectPath: string,
  createdFiles: string[],
  projectStructure: any
) {
  // Create directories
  const directories = ['src', 'docs'];
  
  for (const dir of directories) {
    const dirPath = path.join(projectPath, dir);
    if (!await exists(dirPath)) {
      await mkdir(dirPath, { recursive: true });
    }
    projectStructure.directories.push(dir);
  }
  
  // Create package.json
  const packageJson = {
    name: path.basename(projectPath),
    version: '0.1.0',
    private: true,
    scripts: {
      start: 'node dist/index.js',
      dev: 'tsx src/index.ts',
      build: 'tsc',
    },
    dependencies: {} as Record<string, string>,
    devDependencies: {
      '@types/node': '^18.16.3',
      'typescript': '^5.0.4',
      'tsx': '^3.12.7'
    } as Record<string, string>
  };
  
  const packageJsonPath = path.join(projectPath, 'package.json');
  await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
  createdFiles.push('package.json');
  projectStructure.files.push('package.json');
  
  // Create tsconfig.json
  const tsconfig = {
    "compilerOptions": {
      "target": "ES2022",
      "module": "NodeNext",
      "moduleResolution": "NodeNext",
      "esModuleInterop": true,
      "strict": true,
      "outDir": "./dist",
      "skipLibCheck": true,
      "forceConsistentCasingInFileNames": true
    },
    "include": ["src/**/*"],
    "exclude": ["node_modules", "dist"]
  };
  
  const tsconfigPath = path.join(projectPath, 'tsconfig.json');
  await writeFile(tsconfigPath, JSON.stringify(tsconfig, null, 2));
  createdFiles.push('tsconfig.json');
  projectStructure.files.push('tsconfig.json');
  
  // Create README.md
  const readme = `# ${path.basename(projectPath)}

## Description
A basic project.

## Getting Started
1. Install dependencies:
   \`\`\`
   npm install
   \`\`\`

2. Start the development server:
   \`\`\`
   npm run dev
   \`\`\`

3. Build for production:
   \`\`\`
   npm run build
   \`\`\`

4. Start production server:
   \`\`\`
   npm start
   \`\`\`
`;
  
  const readmePath = path.join(projectPath, 'README.md');
  await writeFile(readmePath, readme);
  createdFiles.push('README.md');
  projectStructure.files.push('README.md');
  
  // Create src/index.ts
  const indexTs = `// ${path.basename(projectPath)} entry point

function main() {
  console.log('Hello, world!');
}

main();`;
  
  const indexTsPath = path.join(projectPath, 'src', 'index.ts');
  await writeFile(indexTsPath, indexTs);
  createdFiles.push('src/index.ts');
  projectStructure.files.push('src/index.ts');
  
  // Create .gitignore
  const gitignore = `# dependencies
/node_modules

# production
/dist
/build

# misc
.DS_Store
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

npm-debug.log*
yarn-debug.log*
yarn-error.log*`;
  
  const gitignorePath = path.join(projectPath, '.gitignore');
  await writeFile(gitignorePath, gitignore);
  createdFiles.push('.gitignore');
  projectStructure.files.push('.gitignore');
}

/**
 * Creates GitHub Actions workflow file for a project
 * @param projectPath Path to the project directory
 * @param repositoryUrl GitHub repository URL
 * @returns Object with workflow file path and content
 */
export async function createGitHubActionsWorkflow(
  projectPath: string,
  repositoryUrl: string
): Promise<{ filePath: string; content: string }> {
  try {
    // Create .github/workflows directory
    const workflowsDir = path.join(projectPath, '.github', 'workflows');
    if (!await exists(workflowsDir)) {
      await mkdir(workflowsDir, { recursive: true });
    }
    
    // Create CI/CD workflow file
    const workflowContent = `name: CI/CD Pipeline

on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build
      run: npm run build
    
    - name: Test
      run: npm test || true
    
    - name: Upload build artifacts
      uses: actions/upload-artifact@v3
      with:
        name: build-artifacts
        path: dist/

  deploy:
    needs: build-and-test
    if: github.event_name == 'push' && (github.ref == 'refs/heads/main' || github.ref == 'refs/heads/master')
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Download build artifacts
      uses: actions/download-artifact@v3
      with:
        name: build-artifacts
        path: dist/
    
    - name: Set up Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    
    - name: Deploy to Replit
      run: |
        echo "Deploying to Replit..."
        # Add Replit deployment steps here
    
    - name: Deploy to Vercel
      run: |
        echo "Deploying to Vercel..."
        # Add Vercel deployment steps here`;
    
    const workflowPath = path.join(workflowsDir, 'ci-cd.yml');
    await writeFile(workflowPath, workflowContent);
    
    return {
      filePath: workflowPath,
      content: workflowContent
    };
  } catch (error) {
    console.error('Error creating GitHub Actions workflow:', error);
    throw error;
  }
}