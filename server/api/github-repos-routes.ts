import { Router, Request, Response } from 'express';
import { z } from 'zod';

const router = Router();

/**
 * GitHub Repository Integration Routes
 * Integrates with @pinkycollie repositories:
 * - FibonRoseTrust (fibonrose)
 * - Nextjs-DeafAUTH (deafauth)
 * - PinkSync (pinksync)
 * - 360 Magicians related projects
 * - My Workspace projects
 */

// Repository configuration schema
const repoConfigSchema = z.object({
  name: z.string(),
  owner: z.string().default('pinkycollie'),
  branch: z.string().default('main'),
  enabled: z.boolean().default(true)
});

// Predefined @pinkycollie repositories for integration
const PINKYCOLLIE_REPOS = {
  fibonrose: {
    name: 'FibonRoseTrust',
    owner: 'pinkycollie',
    description: 'FibonRose Trust - TypeScript-based financial trust platform',
    language: 'TypeScript',
    url: 'https://github.com/pinkycollie/FibonRoseTrust',
    defaultBranch: 'main',
    features: ['Trust Management', 'Financial Planning', 'Document Processing']
  },
  deafauth: {
    name: 'Nextjs-DeafAUTH',
    owner: 'pinkycollie',
    description: 'DeafAUTH - Accessible authentication system for Deaf users',
    language: 'TypeScript',
    url: 'https://github.com/pinkycollie/Nextjs-DeafAUTH',
    defaultBranch: 'main',
    features: ['Accessibility', 'ASL Integration', 'Multi-factor Auth', 'Visual Alerts']
  },
  pinksync: {
    name: 'PinkSync',
    owner: 'pinkycollie',
    description: 'PinkSync integrated with 360 Magicians - File synchronization platform',
    language: 'TypeScript',
    url: 'https://github.com/pinkycollie/PinkSync',
    defaultBranch: 'feat-Pinksync-AI',
    features: ['Cross-platform Sync', 'AI-powered Organization', 'Cloud Integration']
  },
  '360magicians': {
    name: 'project-nexus-ai-orchestrator',
    owner: 'pinkycollie',
    description: '360 Magicians - AI orchestration and project management',
    language: 'TypeScript',
    url: 'https://github.com/pinkycollie/project-nexus-ai-orchestrator',
    defaultBranch: 'main',
    features: ['AI Orchestration', 'Project Management', 'Workflow Automation']
  },
  workspace: {
    name: 'pinksync_estimator',
    owner: 'pinkycollie',
    description: 'My Workspace - Neural complexity estimator and development hub',
    language: 'TypeScript',
    url: 'https://github.com/pinkycollie/pinksync_estimator',
    defaultBranch: 'main',
    features: ['Complexity Analysis', 'AI Integration', 'Development Tools']
  },
  pinkflow: {
    name: 'pinkflow',
    owner: 'pinkycollie',
    description: 'PinkFlow - Python-based workflow automation',
    language: 'Python',
    url: 'https://github.com/pinkycollie/pinkflow',
    defaultBranch: 'main',
    features: ['Workflow Automation', 'Task Scheduling', 'Integration Pipelines']
  },
  visualizer: {
    name: 'PinkSync-Visualizer',
    owner: 'pinkycollie',
    description: 'PinkSync Visualizer - Music visualization for Deaf users',
    language: 'TypeScript',
    url: 'https://github.com/pinkycollie/PinkSync-Visualizer',
    defaultBranch: 'main',
    topics: ['deaf', 'music', 'visualization'],
    features: ['Music Visualization', 'Haptic Feedback', 'Visual Patterns']
  },
  accessibilityValidator: {
    name: 'accessibility-validator',
    owner: 'pinkycollie',
    description: 'Accessibility Validator Backend - Python-based accessibility testing',
    language: 'Python',
    url: 'https://github.com/pinkycollie/accessibility-validator',
    defaultBranch: 'main',
    features: ['WCAG Compliance', 'Automated Testing', 'Accessibility Reports']
  }
};

// Get all configured repositories
router.get('/repos', (_req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      repositories: Object.entries(PINKYCOLLIE_REPOS).map(([key, repo]) => ({
        id: key,
        ...repo
      })),
      count: Object.keys(PINKYCOLLIE_REPOS).length
    });
  } catch (error: any) {
    console.error('Error fetching repositories:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch repositories'
    });
  }
});

// Get a specific repository configuration
router.get('/repos/:repoId', (req: Request, res: Response) => {
  try {
    const { repoId } = req.params;
    const repo = PINKYCOLLIE_REPOS[repoId as keyof typeof PINKYCOLLIE_REPOS];

    if (!repo) {
      return res.status(404).json({
        success: false,
        error: `Repository '${repoId}' not found`
      });
    }

    res.json({
      success: true,
      repository: {
        id: repoId,
        ...repo
      }
    });
  } catch (error: any) {
    console.error('Error fetching repository:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch repository'
    });
  }
});

// Get repository categories
router.get('/repos/category/:category', (req: Request, res: Response) => {
  try {
    const { category } = req.params;
    
    const categoryMapping: Record<string, string[]> = {
      'accessibility': ['deafauth', 'visualizer', 'accessibilityValidator'],
      'sync': ['pinksync', 'workspace', 'pinkflow'],
      'trust': ['fibonrose'],
      'ai': ['360magicians', 'workspace'],
      'all': Object.keys(PINKYCOLLIE_REPOS)
    };

    const repoIds = categoryMapping[category.toLowerCase()];
    
    if (!repoIds) {
      return res.status(404).json({
        success: false,
        error: `Category '${category}' not found`,
        availableCategories: Object.keys(categoryMapping)
      });
    }

    const repos = repoIds.map(id => ({
      id,
      ...PINKYCOLLIE_REPOS[id as keyof typeof PINKYCOLLIE_REPOS]
    })).filter(Boolean);

    res.json({
      success: true,
      category,
      repositories: repos,
      count: repos.length
    });
  } catch (error: any) {
    console.error('Error fetching repositories by category:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch repositories by category'
    });
  }
});

// Get repository insights and audit summary
router.get('/audit', (_req: Request, res: Response) => {
  try {
    const insights = {
      timestamp: new Date().toISOString(),
      summary: {
        totalRepositories: Object.keys(PINKYCOLLIE_REPOS).length,
        primaryLanguage: 'TypeScript',
        secondaryLanguages: ['Python'],
        focusAreas: ['Accessibility', 'AI/ML', 'File Synchronization', 'Trust Management']
      },
      repositoryHealth: Object.entries(PINKYCOLLIE_REPOS).map(([id, repo]) => ({
        id,
        name: repo.name,
        language: repo.language,
        hasDescription: !!repo.description,
        featureCount: repo.features?.length || 0,
        status: 'active'
      })),
      recommendations: [
        {
          priority: 'high',
          category: 'security',
          message: 'Update node-icloud dependency - has known vulnerability in tough-cookie',
          affectedRepos: ['workspace', 'pinksync']
        },
        {
          priority: 'medium',
          category: 'modernization',
          message: 'Consider migrating to Node.js 22 LTS across all projects',
          affectedRepos: ['all']
        },
        {
          priority: 'medium',
          category: 'standardization',
          message: 'Standardize on TypeScript 5.8+ for improved type checking',
          affectedRepos: ['fibonrose', 'deafauth', 'pinksync', '360magicians', 'workspace']
        },
        {
          priority: 'low',
          category: 'documentation',
          message: 'Add comprehensive API documentation using OpenAPI/Swagger',
          affectedRepos: ['all']
        }
      ],
      deprecations: [
        {
          package: '@astrajs/collections',
          reason: 'Replaced by @datastax/astra-db-ts with better security',
          action: 'Migrate to @datastax/astra-db-ts v2.x'
        },
        {
          package: 'node-icloud',
          reason: 'Has unfixed vulnerability in tough-cookie dependency',
          action: 'Consider alternative iCloud integration or implement custom solution'
        },
        {
          package: 'ts-node',
          reason: 'tsx is faster and more reliable alternative',
          action: 'Use tsx for TypeScript execution'
        }
      ],
      modernizationOpportunities: [
        {
          area: 'Runtime',
          current: 'Node.js 18/20',
          recommended: 'Node.js 22 LTS',
          benefits: ['Better performance', 'Native fetch API', 'Improved ES module support']
        },
        {
          area: 'Database',
          current: 'PostgreSQL 14',
          recommended: 'PostgreSQL 17',
          benefits: ['Performance improvements', 'JSON path queries', 'Better partitioning']
        },
        {
          area: 'Build Tool',
          current: 'Vite 7.x',
          recommended: 'Keep current',
          benefits: ['Already using latest version']
        },
        {
          area: 'Type System',
          current: 'TypeScript 5.6',
          recommended: 'TypeScript 5.8+',
          benefits: ['Better inference', 'Improved module resolution', 'Performance']
        }
      ]
    };

    res.json({
      success: true,
      audit: insights
    });
  } catch (error: any) {
    console.error('Error generating audit report:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate audit report'
    });
  }
});

// Get missing features report
router.get('/missing-features', (_req: Request, res: Response) => {
  try {
    const missingFeatures = {
      timestamp: new Date().toISOString(),
      analysis: [
        {
          repository: 'fibonrose',
          missingFeatures: [
            'Unit test coverage',
            'CI/CD pipeline configuration',
            'API rate limiting'
          ]
        },
        {
          repository: 'deafauth',
          missingFeatures: [
            'ASL video recognition integration',
            'Haptic feedback system',
            'Multi-language support'
          ]
        },
        {
          repository: 'pinksync',
          missingFeatures: [
            'End-to-end encryption',
            'Offline sync capability',
            'Conflict resolution UI'
          ]
        },
        {
          repository: '360magicians',
          missingFeatures: [
            'Agent monitoring dashboard',
            'Performance metrics collection',
            'Resource usage optimization'
          ]
        },
        {
          repository: 'workspace',
          missingFeatures: [
            'Comprehensive test suite',
            'API documentation',
            'Rate limiting middleware'
          ]
        }
      ],
      commonMissingAcrossProjects: [
        'Comprehensive error handling',
        'Logging and monitoring',
        'Performance benchmarks',
        'Security audit automation'
      ]
    };

    res.json({
      success: true,
      report: missingFeatures
    });
  } catch (error: any) {
    console.error('Error generating missing features report:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate missing features report'
    });
  }
});

// Taskade webhook integration configuration
// URL can be overridden via TASKADE_WEBHOOK_URL environment variable
const TASKADE_WEBHOOK_URL = process.env.TASKADE_WEBHOOK_URL || 
  'https://www.taskade.com/webhooks/flow/01KAZQXCKSVKE0ES46XYB8BYCJ/sync';

// Helper to mask sensitive URL parts for display
const maskWebhookUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    // Mask the flow ID if present
    if (pathParts.length > 3) {
      pathParts[pathParts.length - 2] = '***MASKED***';
    }
    urlObj.pathname = pathParts.join('/');
    return urlObj.toString();
  } catch {
    return '***CONFIGURED***';
  }
};

// Schema for webhook payload
const webhookPayloadSchema = z.object({
  event: z.string(),
  data: z.record(z.unknown()).optional(),
  timestamp: z.string().optional(),
  source: z.string().optional()
});

// Send event to Taskade webhook
router.post('/webhook/taskade/sync', async (req: Request, res: Response) => {
  try {
    const payload = webhookPayloadSchema.parse(req.body);
    
    const webhookPayload = {
      event: payload.event,
      data: payload.data || {},
      timestamp: payload.timestamp || new Date().toISOString(),
      source: payload.source || 'pinksync_estimator',
      repositories: Object.keys(PINKYCOLLIE_REPOS)
    };

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const response = await fetch(TASKADE_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(webhookPayload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return res.status(response.status).json({
          success: false,
          error: `Taskade webhook failed: ${response.statusText}`,
          statusCode: response.status
        });
      }

      res.json({
        success: true,
        message: 'Event sent to Taskade webhook',
        payload: webhookPayload
      });
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        return res.status(504).json({
          success: false,
          error: 'Webhook request timed out'
        });
      }
      throw fetchError;
    }
  } catch (error: any) {
    console.error('Error sending to Taskade webhook:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payload',
        details: error.errors
      });
    }
    
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send to Taskade webhook'
    });
  }
});

// Get Taskade webhook configuration
router.get('/webhook/taskade', (_req: Request, res: Response) => {
  const isConfigured = !!TASKADE_WEBHOOK_URL;
  
  res.json({
    success: true,
    webhook: {
      name: 'Taskade Sync',
      configured: isConfigured,
      url: maskWebhookUrl(TASKADE_WEBHOOK_URL),
      method: 'POST',
      description: 'Webhook for syncing repository events with Taskade',
      supportedEvents: [
        'repo.sync',
        'audit.complete',
        'security.alert',
        'deployment.status'
      ],
      usage: {
        endpoint: '/api/github/webhook/taskade/sync',
        method: 'POST',
        payload: {
          event: 'string (required)',
          data: 'object (optional)',
          timestamp: 'string (optional)',
          source: 'string (optional)'
        }
      }
    }
  });
});

export default router;
