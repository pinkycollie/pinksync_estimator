import { Router, Request, Response } from 'express';
import { z } from 'zod';

const router = Router();

/**
 * MBTQ.dev Ecosystem - GitHub Repository Integration Routes
 * Deaf-First Innovation Hub - @pinkycollie repositories
 * 
 * Core Services:
 * - FibonRose Trust: AI-Powered Professional Verification & Trust System
 * - DeafAUTH: Identity & Prompted Accessibility Layer for Next.js
 * - PinkSync: Layer 1 Accessibility Orchestration Platform
 * - PinkFlow: Deaf-First Innovation Ecosystem Process Orchestrator
 * - 360Magicians: AI-powered Business Automation Agents
 * - Accessibility Validator: Deaf-First Accessibility Automation
 */

// Repository configuration schema
const repoConfigSchema = z.object({
  name: z.string(),
  owner: z.string().default('pinkycollie'),
  branch: z.string().default('main'),
  enabled: z.boolean().default(true)
});

// MBTQ.dev Ecosystem Repositories (from live GitHub API scan)
const PINKYCOLLIE_REPOS = {
  // === Core Services ===
  fibonrose: {
    name: 'FibonRoseTrust',
    owner: 'pinkycollie',
    description: 'AI-Powered Universal Professional Verification & Trust System for the Deaf community',
    language: 'TypeScript',
    url: 'https://github.com/pinkycollie/FibonRoseTrust',
    defaultBranch: 'main',
    ecosystem: 'mbtq',
    category: 'trust',
    stack: ['TypeScript', 'Supabase', 'PostgreSQL', 'OpenAI'],
    features: ['Professional Verification', 'Trust Scoring', 'AI Matching', 'Fraud Detection']
  },
  deafauth: {
    name: 'Nextjs-DeafAUTH',
    owner: 'pinkycollie',
    description: 'Identity & Prompted Accessibility Layer for Next.js - treats accessibility preferences as first-class identity metadata',
    language: 'TypeScript',
    url: 'https://github.com/pinkycollie/Nextjs-DeafAUTH',
    defaultBranch: 'main',
    ecosystem: 'mbtq',
    category: 'accessibility',
    stack: ['TypeScript', 'Next.js', 'React'],
    features: ['Accessibility Profiles', 'Contextual Prompts', 'Delivery Tracking', 'Privacy Controls']
  },
  pinksync: {
    name: 'PinkSync',
    owner: 'pinkycollie',
    description: 'Layer 1 Accessibility Orchestration Platform - unified gateway for deaf communities',
    language: 'TypeScript',
    url: 'https://github.com/pinkycollie/PinkSync',
    defaultBranch: 'feat-Pinksync-AI',
    ecosystem: 'mbtq',
    category: 'sync',
    stack: ['TypeScript', 'Node.js', 'WebSocket', 'React'],
    features: ['Event Orchestration', 'Real-time Sync', 'API Broker', 'PinkFlow Engine']
  },
  pinkflow: {
    name: 'pinkflow',
    owner: 'pinkycollie',
    description: 'Deaf-First Innovation Ecosystem - process orchestration with MagicianCore and 360Magicians',
    language: 'Python',
    url: 'https://github.com/pinkycollie/pinkflow',
    defaultBranch: 'main',
    ecosystem: 'mbtq',
    category: 'sync',
    stack: ['Python', 'FastAPI', 'React', 'TypeScript', 'SQLAlchemy'],
    features: ['Process Orchestration', 'Partner Onboarding', 'Governance', 'AI Agents']
  },
  accessibilityValidator: {
    name: 'accessibility-validator',
    owner: 'pinkycollie',
    description: 'Deaf-First Accessibility Automation - validates ASL flow and bypasses audio-only UX',
    language: 'Python',
    url: 'https://github.com/pinkycollie/accessibility-validator',
    defaultBranch: 'main',
    ecosystem: 'mbtq',
    category: 'accessibility',
    stack: ['Python', 'FastAPI', 'Next.js', 'TypeScript'],
    features: ['ASL Flow Validation', 'Audio-Bypass Detection', 'Deaf-First Scoring', 'WCAG+']
  },
  '360magicians': {
    name: 'project-nexus-ai-orchestrator',
    owner: 'pinkycollie',
    description: 'AI-powered Business Automation Agents - handles Idea → Build → Grow → Managed lifecycle',
    language: 'TypeScript',
    url: 'https://github.com/pinkycollie/project-nexus-ai-orchestrator',
    defaultBranch: 'main',
    ecosystem: 'mbtq',
    category: 'ai',
    stack: ['TypeScript', 'React', 'Vite', 'shadcn-ui'],
    features: ['AI Agents', 'Business Automation', 'Workflow Management', 'Lovable Integration']
  },
  
  // === Supporting Projects ===
  visualizer: {
    name: 'PinkSync-Visualizer',
    owner: 'pinkycollie',
    description: 'Music Visualizer for Deaf users - visual representation of audio',
    language: 'TypeScript',
    url: 'https://github.com/pinkycollie/PinkSync-Visualizer',
    defaultBranch: 'main',
    ecosystem: 'mbtq',
    category: 'accessibility',
    topics: ['deaf', 'music', 'visualization'],
    features: ['Music Visualization', 'Haptic Feedback', 'Visual Patterns']
  },
  vr4deaf: {
    name: 'VR4Deaf-Tx',
    owner: 'pinkycollie',
    description: 'VR Training Platform for Deaf community',
    language: 'TypeScript',
    url: 'https://github.com/pinkycollie/VR4Deaf-Tx',
    defaultBranch: 'main',
    ecosystem: 'mbtq',
    category: 'accessibility',
    features: ['VR Training', 'Deaf-First Design', 'Immersive Learning']
  },
  vr4deafOrg: {
    name: 'vr4deaf.org',
    owner: 'pinkycollie',
    description: 'VR4Deaf Organization Portal',
    language: 'TypeScript',
    url: 'https://github.com/pinkycollie/vr4deaf.org',
    defaultBranch: 'vendor-portal',
    ecosystem: 'mbtq',
    category: 'platform',
    features: ['Vendor Portal', 'Organization Management']
  },
  signingBot: {
    name: 'Signing-Bot',
    owner: 'pinkycollie',
    description: 'Flask-based Signing Platform',
    language: 'Python',
    url: 'https://github.com/pinkycollie/Signing-Bot',
    defaultBranch: 'main',
    ecosystem: 'mbtq',
    category: 'accessibility',
    stack: ['Python', 'Flask'],
    features: ['Sign Language Bot', 'Automation']
  },
  deafFirstPlatform: {
    name: 'DEAF-FIRST-PLATFORM',
    owner: 'pinkycollie',
    description: 'Deaf-First Platform Hub',
    language: 'JavaScript',
    url: 'https://github.com/pinkycollie/DEAF-FIRST-PLATFORM',
    defaultBranch: 'main',
    ecosystem: 'mbtq',
    category: 'platform',
    features: ['Platform Hub', 'Deaf-First Design']
  },
  deafWebComponents: {
    name: 'deaf-web-components',
    owner: 'pinkycollie',
    description: 'Reusable Deaf-Friendly Web Components',
    url: 'https://github.com/pinkycollie/deaf-web-components',
    defaultBranch: 'main',
    ecosystem: 'mbtq',
    category: 'accessibility',
    features: ['Web Components', 'Accessibility', 'Reusable']
  },
  
  // === Current Workspace ===
  workspace: {
    name: 'pinksync_estimator',
    owner: 'pinkycollie',
    description: 'Neural complexity estimator and development hub - current workspace',
    language: 'TypeScript',
    url: 'https://github.com/pinkycollie/pinksync_estimator',
    defaultBranch: 'main',
    ecosystem: 'mbtq',
    category: 'sync',
    stack: ['TypeScript', 'React', 'Express', 'PostgreSQL', 'Drizzle'],
    features: ['Complexity Analysis', 'AI Integration', 'Development Tools']
  },
  
  // === Infrastructure ===
  agentSdk: {
    name: 'agent-sdk',
    owner: 'pinkycollie',
    description: 'Agent SDK for MBTQ ecosystem',
    url: 'https://github.com/pinkycollie/agent-sdk',
    defaultBranch: 'main',
    ecosystem: 'mbtq',
    category: 'infrastructure',
    features: ['SDK', 'Agent Development']
  },
  platformCore: {
    name: 'platform-core',
    owner: 'pinkycollie',
    description: 'Platform Core for MBTQ ecosystem',
    url: 'https://github.com/pinkycollie/platform-core',
    defaultBranch: 'main',
    ecosystem: 'mbtq',
    category: 'infrastructure',
    features: ['Core Platform', 'Shared Services']
  },
  mbtqHub: {
    name: 'mbtq-ecosystem-hub',
    owner: 'pinkycollie',
    description: 'MBTQ Ecosystem Hub',
    url: 'https://github.com/pinkycollie/mbtq-ecosystem-hub',
    defaultBranch: 'main',
    ecosystem: 'mbtq',
    category: 'platform',
    features: ['Ecosystem Hub', 'Integration']
  },
  
  // === Business Platforms ===
  smartTax: {
    name: 'smarttaxplatform',
    owner: 'pinkycollie',
    description: 'Smart Tax Platform',
    url: 'https://github.com/pinkycollie/smarttaxplatform',
    defaultBranch: 'main',
    category: 'business',
    features: ['Tax Management', 'Financial Tools']
  },
  smartInsurance: {
    name: 'smartinsuranceplatform',
    owner: 'pinkycollie',
    description: 'Smart Insurance Platform',
    url: 'https://github.com/pinkycollie/smartinsuranceplatform',
    defaultBranch: 'main',
    category: 'business',
    features: ['Insurance Management', 'Policy Tools']
  },
  smartProperty: {
    name: 'smartpropertymanagement',
    owner: 'pinkycollie',
    description: 'Smart Property Management',
    url: 'https://github.com/pinkycollie/smartpropertymanagement',
    defaultBranch: 'main',
    category: 'business',
    features: ['Property Management', 'Real Estate Tools']
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
      count: Object.keys(PINKYCOLLIE_REPOS).length,
      stats: {
        totalOwned: 109,
        publicAccessible: 33,
        privateRepositories: 76,
        configuredHere: Object.keys(PINKYCOLLIE_REPOS).length
      },
      note: 'Private repositories require authenticated GitHub API access to scan'
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
    
    // Dynamic category mapping based on repo 'category' field
    const categoryMapping: Record<string, string[]> = {
      'accessibility': ['deafauth', 'visualizer', 'accessibilityValidator', 'vr4deaf', 'signingBot', 'deafWebComponents'],
      'sync': ['pinksync', 'workspace', 'pinkflow'],
      'trust': ['fibonrose'],
      'ai': ['360magicians'],
      'platform': ['deafFirstPlatform', 'vr4deafOrg', 'mbtqHub'],
      'infrastructure': ['agentSdk', 'platformCore'],
      'business': ['smartTax', 'smartInsurance', 'smartProperty'],
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
    })).filter(repo => repo.name); // Filter out undefined repos

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
      ecosystem: 'MBTQ.dev - Deaf-First Innovation Hub',
      summary: {
        totalRepositories: Object.keys(PINKYCOLLIE_REPOS).length,
        primaryLanguage: 'TypeScript',
        secondaryLanguages: ['Python', 'JavaScript'],
        focusAreas: ['Deaf-First Accessibility', 'AI/ML', 'Trust Systems', 'Process Orchestration']
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
