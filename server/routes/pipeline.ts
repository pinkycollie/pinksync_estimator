import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { pipelineManager, initializePipelines, pipelines } from '../utils/pipelineSystem';
import { storage } from '../storage';
import { isAuthenticated } from '../replitAuth';
import fs from 'fs';
import path from 'path';
import multer from 'multer';

// Initialize the pipeline system
initializePipelines();

// Set up file upload handling
const uploadDir = path.resolve('uploads', 'pipeline-inputs');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
      cb(null, `${file.fieldname}-${uniqueSuffix}-${file.originalname}`);
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

const router = Router();

// Schema for listing pipelines
const listPipelinesSchema = z.object({
  userId: z.number().optional(),
});

// Get all available pipelines
router.get('/', async (req: Request, res: Response) => {
  try {
    const pipelineList = pipelineManager.listPipelines();
    
    res.json({
      success: true,
      pipelines: pipelineList.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        inputType: p.input.type,
        outputType: p.output.type,
        stepCount: p.steps.length
      }))
    });
  } catch (error: any) {
    console.error('Error listing pipelines:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to list pipelines'
    });
  }
});

// Get a specific pipeline by ID
router.get('/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const pipeline = pipelineManager.getPipeline(id);
    
    if (!pipeline) {
      return res.status(404).json({
        success: false,
        message: `Pipeline not found: ${id}`
      });
    }
    
    res.json({
      success: true,
      pipeline: {
        id: pipeline.id,
        name: pipeline.name,
        description: pipeline.description,
        input: pipeline.input,
        output: pipeline.output,
        steps: pipeline.steps.map(step => ({
          id: step.id,
          name: step.name,
          type: step.type
        }))
      }
    });
  } catch (error: any) {
    console.error(`Error getting pipeline ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get pipeline'
    });
  }
});

// Schema for executing a pipeline with text input
const executePipelineWithTextSchema = z.object({
  pipelineId: z.string(),
  text: z.string()
});

// Execute a pipeline with text input
router.post('/execute/text', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = await storage.getUserByUsername('pinky');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const { pipelineId, text } = executePipelineWithTextSchema.parse(req.body);
    const pipeline = pipelineManager.getPipeline(pipelineId);
    
    if (!pipeline) {
      return res.status(404).json({
        success: false,
        message: `Pipeline not found: ${pipelineId}`
      });
    }
    
    if (pipeline.input.type !== 'text') {
      return res.status(400).json({
        success: false,
        message: `Pipeline ${pipelineId} does not accept text input`
      });
    }
    
    const result = await pipelineManager.executePipeline(pipelineId, user.id, text);
    
    res.json({
      success: result.success,
      result
    });
  } catch (error: any) {
    console.error('Error executing pipeline with text input:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to execute pipeline'
    });
  }
});

// Schema for executing a pipeline with JSON input
const executePipelineWithJsonSchema = z.object({
  pipelineId: z.string(),
  data: z.any()
});

// Execute a pipeline with JSON input
router.post('/execute/json', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = await storage.getUserByUsername('pinky');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const { pipelineId, data } = executePipelineWithJsonSchema.parse(req.body);
    const pipeline = pipelineManager.getPipeline(pipelineId);
    
    if (!pipeline) {
      return res.status(404).json({
        success: false,
        message: `Pipeline not found: ${pipelineId}`
      });
    }
    
    const result = await pipelineManager.executePipeline(pipelineId, user.id, data);
    
    res.json({
      success: result.success,
      result
    });
  } catch (error: any) {
    console.error('Error executing pipeline with JSON input:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to execute pipeline'
    });
  }
});

// Execute a pipeline with file input
router.post('/execute/file', isAuthenticated, upload.single('file'), async (req: Request, res: Response) => {
  try {
    const user = await storage.getUserByUsername('pinky');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }
    
    const { pipelineId } = req.body;
    if (!pipelineId) {
      return res.status(400).json({
        success: false,
        message: 'Pipeline ID is required'
      });
    }
    
    const pipeline = pipelineManager.getPipeline(pipelineId);
    if (!pipeline) {
      return res.status(404).json({
        success: false,
        message: `Pipeline not found: ${pipelineId}`
      });
    }
    
    // Read file content
    const filePath = req.file.path;
    let fileData;
    
    try {
      // Try to parse as JSON
      const fileContent = fs.readFileSync(filePath, 'utf8');
      fileData = JSON.parse(fileContent);
    } catch (err) {
      // If we can't parse JSON, use the raw file content
      fileData = fs.readFileSync(filePath);
    }
    
    // Execute the pipeline
    const result = await pipelineManager.executePipeline(pipelineId, user.id, fileData);
    
    res.json({
      success: result.success,
      result
    });
  } catch (error: any) {
    console.error('Error executing pipeline with file input:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to execute pipeline'
    });
  }
});

// Create a new Python processing module
router.post('/module/python', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = await storage.getUserByUsername('pinky');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const { name, code } = req.body;
    
    if (!name || !code) {
      return res.status(400).json({
        success: false,
        message: 'Module name and code are required'
      });
    }
    
    // Create directory for the module
    const moduleDir = path.resolve('server', 'scripts', 'custom');
    if (!fs.existsSync(moduleDir)) {
      fs.mkdirSync(moduleDir, { recursive: true });
    }
    
    // Sanitize the name for filesystem
    const safeName = name.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
    const scriptPath = path.join(moduleDir, `${safeName}.py`);
    
    // Write the script file
    fs.writeFileSync(scriptPath, code);
    
    // Make the script executable
    fs.chmodSync(scriptPath, '755');
    
    res.json({
      success: true,
      name: safeName,
      path: scriptPath,
      message: 'Python module created successfully'
    });
  } catch (error: any) {
    console.error('Error creating Python module:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create Python module'
    });
  }
});

// Create a custom Node.js module
router.post('/module/node', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = await storage.getUserByUsername('pinky');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const { name, code } = req.body;
    
    if (!name || !code) {
      return res.status(400).json({
        success: false,
        message: 'Module name and code are required'
      });
    }
    
    // Create directory for the module
    const moduleDir = path.resolve('uploads', 'modules', name);
    if (!fs.existsSync(moduleDir)) {
      fs.mkdirSync(moduleDir, { recursive: true });
    }
    
    // Create package.json
    const packageJson = {
      name,
      version: '1.0.0',
      description: `Custom module created by user ${user.id}`,
      main: 'index.js',
      scripts: {
        test: 'echo "Error: no test specified" && exit 1'
      },
      keywords: ['custom', 'module'],
      author: user.username,
      license: 'ISC'
    };
    
    fs.writeFileSync(
      path.join(moduleDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );
    
    // Write the module code
    fs.writeFileSync(path.join(moduleDir, 'index.js'), code);
    
    res.json({
      success: true,
      name,
      path: moduleDir,
      message: 'Node.js module created successfully'
    });
  } catch (error: any) {
    console.error('Error creating Node.js module:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create Node.js module'
    });
  }
});

export default router;