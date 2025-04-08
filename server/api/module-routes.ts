import { Router } from 'express';
import { workflowEngine, ModuleCategory, CheckpointStatus } from '../utils/workflowEngine';
import { moduleConnector, AISpecialization } from '../utils/moduleConnector';
import { replitIntegration } from '../utils/replitIntegration';
import { opportunityScanner, OpportunityType, OpportunitySource, ConfidenceLevel } from '../utils/businessOpportunityScanner';
import { platformAnalyzer, PlatformType, ModelCapability } from '../utils/aiPlatformAnalyzer';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// Set up storage for file uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads');
    
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniquePrefix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `${uniquePrefix}-${file.originalname}`);
  }
});

const upload = multer({ storage });

// Create router
const router = Router();

// Get all modules
router.get('/modules', (_req, res) => {
  const modules = workflowEngine.getModules();
  res.json({ modules });
});

// Get modules by category
router.get('/modules/category/:category', (req, res) => {
  const category = req.params.category as ModuleCategory;
  
  if (!Object.values(ModuleCategory).includes(category)) {
    return res.status(400).json({ 
      error: 'Invalid module category',
      validCategories: Object.values(ModuleCategory)
    });
  }
  
  const modules = workflowEngine.getModulesByCategory(category);
  res.json({ modules });
});

// Get module by ID
router.get('/modules/:moduleId', (req, res) => {
  const { moduleId } = req.params;
  const module = workflowEngine.getModule(moduleId);
  
  if (!module) {
    return res.status(404).json({ error: 'Module not found' });
  }
  
  res.json({ module });
});

// Get checkpoints for module
router.get('/modules/:moduleId/checkpoints', (req, res) => {
  const { moduleId } = req.params;
  const checkpoints = workflowEngine.getCheckpointsForModule(moduleId);
  
  res.json({ checkpoints });
});

// Update checkpoint status
router.post('/checkpoints/:checkpointId/status', (req, res) => {
  const { checkpointId } = req.params;
  const { status, metadata } = req.body;
  
  if (!Object.values(CheckpointStatus).includes(status)) {
    return res.status(400).json({ 
      error: 'Invalid checkpoint status',
      validStatuses: Object.values(CheckpointStatus)
    });
  }
  
  const checkpoint = workflowEngine.updateCheckpointStatus(
    checkpointId,
    status as CheckpointStatus,
    metadata
  );
  
  if (!checkpoint) {
    return res.status(404).json({ error: 'Checkpoint not found' });
  }
  
  res.json({ checkpoint });
});

// Get module completion percentage
router.get('/modules/:moduleId/completion', (req, res) => {
  const { moduleId } = req.params;
  const percentage = workflowEngine.getModuleCompletionPercentage(moduleId);
  
  res.json({ moduleId, completionPercentage: percentage });
});

// Execute module workflow
router.post('/modules/:moduleId/execute', (req, res) => {
  const { moduleId } = req.params;
  const { userId } = req.body;
  
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }
  
  workflowEngine.executeModuleWorkflow(moduleId, userId)
    .then(execution => {
      if (!execution) {
        return res.status(404).json({ error: 'Failed to create workflow execution' });
      }
      
      res.json({ execution });
    })
    .catch(error => {
      res.status(500).json({ error: error.message });
    });
});

// Get AI modules
router.get('/ai-modules', (_req, res) => {
  const aiModules = moduleConnector.getAIModules();
  res.json({ aiModules });
});

// Get AI modules by specialization
router.get('/ai-modules/specialization/:specialization', (req, res) => {
  const specialization = req.params.specialization as AISpecialization;
  
  if (!Object.values(AISpecialization).includes(specialization)) {
    return res.status(400).json({ 
      error: 'Invalid AI specialization',
      validSpecializations: Object.values(AISpecialization)
    });
  }
  
  const aiModules = moduleConnector.getAIModulesBySpecialization(specialization);
  res.json({ aiModules });
});

// Process document with AI
router.post('/ai-modules/:aiModuleId/process-document', upload.single('document'), (req, res) => {
  const { aiModuleId } = req.params;
  const file = req.file;
  const { metadata } = req.body;
  
  if (!file) {
    return res.status(400).json({ error: 'No document file uploaded' });
  }
  
  // Parse metadata if provided as string
  const parsedMetadata = metadata ? 
    (typeof metadata === 'string' ? JSON.parse(metadata) : metadata) : 
    undefined;
  
  moduleConnector.processDocumentWithAI(file.path, aiModuleId, parsedMetadata)
    .then(result => {
      res.json(result);
    })
    .catch(error => {
      res.status(500).json({ error: error.message });
    });
});

// Process real estate document
router.post('/ai-modules/real-estate/process', upload.single('document'), (req, res) => {
  const file = req.file;
  const { documentType } = req.body;
  
  if (!file) {
    return res.status(400).json({ error: 'No document file uploaded' });
  }
  
  if (!documentType) {
    return res.status(400).json({ error: 'Document type is required' });
  }
  
  moduleConnector.processRealEstateDocument(file.path, documentType)
    .then(result => {
      res.json(result);
    })
    .catch(error => {
      res.status(500).json({ error: error.message });
    });
});

// Scan business opportunities
router.post('/business/scan-opportunities', upload.array('documents'), (req, res) => {
  const files = req.files as Express.Multer.File[];
  
  if (!files || files.length === 0) {
    return res.status(400).json({ error: 'No document files uploaded' });
  }
  
  const filePaths = files.map(file => file.path);
  
  // Parse scan options if provided
  let scanOptions;
  if (req.body.options) {
    try {
      scanOptions = JSON.parse(req.body.options);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid scan options format' });
    }
  }
  
  opportunityScanner.scanDocumentsForOpportunities(filePaths, scanOptions)
    .then(opportunities => {
      res.json({ opportunities });
    })
    .catch(error => {
      res.status(500).json({ error: error.message });
    });
});

// Get business opportunities
router.get('/business/opportunities', (req, res) => {
  // Parse query parameters for filtering
  const opportunityTypes = req.query.types ? 
    (req.query.types as string).split(',') as OpportunityType[] : 
    undefined;
  
  const confidenceThreshold = req.query.confidenceThreshold as ConfidenceLevel || undefined;
  
  const categories = req.query.categories ? 
    (req.query.categories as string).split(',') as ModuleCategory[] : 
    undefined;
  
  const maxResults = req.query.maxResults ? 
    parseInt(req.query.maxResults as string) : 
    undefined;
  
  const includeExpired = req.query.includeExpired === 'true';
  
  const options = {
    opportunityTypes,
    confidenceThreshold,
    categories,
    maxResults,
    includeExpired
  };
  
  const opportunities = opportunityScanner.getOpportunities(options);
  res.json({ opportunities });
});

// Generate opportunity report
router.get('/business/opportunities/report', (req, res) => {
  const format = (req.query.format as 'summary' | 'detailed' | 'metrics') || 'summary';
  
  // Get filtered opportunities
  const opportunityTypes = req.query.types ? 
    (req.query.types as string).split(',') as OpportunityType[] : 
    undefined;
  
  const confidenceThreshold = req.query.confidenceThreshold as ConfidenceLevel || undefined;
  
  const options = {
    opportunityTypes,
    confidenceThreshold,
    includeExpired: req.query.includeExpired === 'true'
  };
  
  const opportunities = opportunityScanner.getOpportunities(options);
  const report = opportunityScanner.generateOpportunityReport(opportunities, format);
  
  res.json(report);
});

// Replit Authentication
router.post('/replit/authenticate', (req, res) => {
  const { apiToken } = req.body;
  
  if (!apiToken) {
    return res.status(400).json({ error: 'API token is required' });
  }
  
  // Create new instance with the provided token
  const ReplitIntegrationService = replitIntegration.constructor as any;
  const customReplitIntegration = new ReplitIntegrationService(apiToken);
  
  customReplitIntegration.authenticate()
    .then((authenticated: boolean) => {
      if (!authenticated) {
        return res.status(401).json({ error: 'Failed to authenticate with Replit API' });
      }
      
      res.json({ success: true, message: 'Successfully authenticated with Replit API' });
    })
    .catch((error: any) => {
      res.status(500).json({ error: error.message });
    });
});

// List Replit projects
router.get('/replit/projects', (req, res) => {
  replitIntegration.listProjects()
    .then(projects => {
      res.json({ projects });
    })
    .catch(error => {
      res.status(500).json({ error: error.message });
    });
});

// Platform Analysis - Get Platform Profiles
router.get('/platform-analysis/platforms', (_req, res) => {
  const platforms = platformAnalyzer.listPlatformProfiles();
  res.json({ platforms });
});

// Platform Analysis - Get Platforms by Type
router.get('/platform-analysis/platforms/type/:type', (req, res) => {
  const type = req.params.type as PlatformType;
  
  if (!Object.values(PlatformType).includes(type)) {
    return res.status(400).json({ 
      error: 'Invalid platform type',
      validTypes: Object.values(PlatformType)
    });
  }
  
  const platforms = platformAnalyzer.getPlatformsByType(type);
  res.json({ platforms });
});

// Platform Analysis - Analyze Model Compatibility
router.get('/platform-analysis/compatibility/:modelName/:platformName', (req, res) => {
  const { modelName, platformName } = req.params;
  
  const analysis = platformAnalyzer.analyzeModelCompatibility(modelName, platformName);
  
  if (!analysis) {
    return res.status(404).json({ 
      error: 'Could not perform compatibility analysis',
      reason: 'Either model or platform not found'
    });
  }
  
  res.json(analysis);
});

// Platform Analysis - Find Best Model for Platform
router.get('/platform-analysis/best-model/:platformName', (req, res) => {
  const { platformName } = req.params;
  
  // Parse desired capabilities from query
  const capabilities = req.query.capabilities ? 
    (req.query.capabilities as string).split(',') as ModelCapability[] : 
    [];
  
  const bestModel = platformAnalyzer.findBestModelForPlatform(platformName, capabilities);
  
  if (!bestModel) {
    return res.status(404).json({ 
      error: 'Could not find compatible model',
      reason: 'Either platform not found or no model matches desired capabilities'
    });
  }
  
  res.json(bestModel);
});

// Export router
export default router;