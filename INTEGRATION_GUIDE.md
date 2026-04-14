# Skeleton Framework Foundation - Integration Guide

## Overview

This skeleton framework provides a modular, accessible foundation for financial analysis, project management, and proposal generation systems, with special focus on deaf community initiatives.

## Architecture Components

### 1. External Module Connectors

Located in `/server/connectors/`, these provide integration with specialized services:

#### PinkFlow TestContainer
- **Purpose**: Test validation, implementation options, approval workflows
- **Repository**: github.com/pinkycollie/pinkflow
- **Features**:
  - Test validation and execution
  - Implementation option evaluation
  - Approval workflow management
  - DeafAuth integration

#### PinkSync
- **Purpose**: Multi-platform synchronization with accessibility features
- **Features**:
  - DeafAuth authentication
  - Cross-platform data sync
  - Accessibility profile management
  - Conflict resolution

#### FibonRose
- **Purpose**: Fibonacci-based project estimation and resource optimization
- **Repository**: github.com/pinkycollie/fibonrose
- **Features**:
  - Project complexity estimation
  - Resource allocation optimization
  - Timeline prediction
  - Accessibility-aware planning

### 2. File Integrity System

Located in `/tools/file-integrity-checker.ts` and `/server/utils/iosSyncProtection.ts`

#### Problem Addressed
TypeScript files being converted to MPEG format during iOS/iPhone synchronization.

#### Solution Components
- **File type validation**: Detect corrupted files
- **Automated backups**: Pre-modification file backup
- **Integrity monitoring**: Continuous file type checking
- **iOS sync protection**: Safeguards against conversion issues

#### Usage

```bash
# Scan repository for corrupted files
npm run integrity:scan

# Check specific file
npm run integrity:check path/to/file.ts

# Create backup before modification
npm run integrity:backup path/to/file.ts

# Generate full integrity report
npm run integrity:report
```

## Development Environment Labels

### Replit - Development Environment
- **Purpose**: Primary development platform
- **Configuration**: `.replit` file
- **Environment Variables**: 
  - `REPLIT_DB_URL`
  - `REPLIT_DOMAINS`
- **Features**:
  - Cloud-based IDE
  - Instant deployment
  - Collaborative editing
  - No local setup required

### Vercel - Frontend Deployment
- **Purpose**: Production frontend hosting
- **Configuration**: `vercel.json`
- **Features**:
  - Automatic deployments
  - Edge network distribution
  - Serverless functions
  - Preview deployments

## Technology Stack

### Current Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **UI Components**: Radix UI + TailwindCSS

### Recommended for Financial/Analysis Use Cases

#### Backend Options
1. **PHP (Laravel/Symfony)**: 
   - Mature ecosystem
   - Strong financial libraries
   - Enterprise support
   - Good for complex business logic

2. **Node.js + TypeScript (Current)**:
   - Type safety
   - Modern tooling
   - Large ecosystem
   - Real-time capabilities

3. **Python (Django/FastAPI)**:
   - Data science libraries
   - Machine learning integration
   - Financial analysis tools
   - Pandas/NumPy support

#### Frontend Framework Comparison

| Framework | Pros | Cons | Recommendation |
|-----------|------|------|----------------|
| React | Large ecosystem, flexible | Complexity, build setup | ✅ Current choice |
| Next.js | SSR, API routes, file routing | Opinionated, vendor lock-in | ✅ Consider for upgrade |
| PHP Blade | Server-side rendering, simple | Less interactive | ⚠️  For traditional apps |
| Vue.js | Gentle learning curve, fast | Smaller ecosystem | ✅ Alternative option |

## Accessibility Features

### Deaf Community Support

1. **Visual Communication Protocols**
   - High contrast mode support
   - Visual status indicators
   - Sign language compatibility
   - Text alternatives for all audio

2. **DeafAuth Integration**
   - Accessibility profile management
   - Sign language preferences
   - Visual authentication methods
   - Communication preference tracking

3. **UI/UX Considerations**
   - Clear visual feedback
   - No audio-dependent features
   - Text-based notifications
   - Video sign language support

## API Endpoints

### Module Connector Routes

```typescript
// PinkFlow TestContainer
POST /api/pinkflow/validate
GET  /api/pinkflow/implementation-options/:projectId
POST /api/pinkflow/approval
GET  /api/pinkflow/approval/status/:projectId

// PinkSync
POST /api/pinksync/auth/deaf-auth
POST /api/pinksync/sync
GET  /api/pinksync/sync/status/:userId

// FibonRose
POST /api/fibonrose/estimate
POST /api/fibonrose/optimize
GET  /api/fibonrose/fibonacci/:complexity
```

### Existing Routes

```typescript
// File Management
GET  /api/files
POST /api/files/upload
GET  /api/files/:id

// Platform Sync
GET  /api/sync/connections
POST /api/sync/connections
PATCH /api/sync/connections/:id

// Communication
GET  /api/communications
POST /api/communications

// AI Features
POST /api/ai/analyze
POST /api/ai/chat
```

## Security & Privacy

### Protected Patterns (.gitignore)

```
# Sensitive files
*.key, *.pem, *.cert
*secret*, *password*
credentials.json

# Backups
.file-backups/
*.bak, *.backup

# iOS sync artifacts
*.mpeg, *.mp4, *.mp3
```

### Environment Variables

All sensitive configuration in `.env` file:
- API keys
- Database credentials
- OAuth secrets
- Module connector keys

## Deployment Guide

### Replit (Development)

1. Fork or clone repository
2. Configure environment variables in Secrets
3. Run `npm install`
4. Run `npm run dev`

### Vercel (Production Frontend)

1. Connect GitHub repository
2. Configure build settings:
   - Framework: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
3. Add environment variables
4. Deploy

### Backend Deployment Options

1. **Replit Autoscale**: Automatic scaling, included
2. **Railway**: Container-based, PostgreSQL included
3. **Render**: Free tier, automatic deployments
4. **DigitalOcean App Platform**: Scalable, managed

## Best Practices

### File Management
1. Always use Git for version control
2. Run integrity scans before commits
3. Create backups before major changes
4. Avoid iOS sync for development folders

### Module Integration
1. Test connections before deployment
2. Implement retry logic for API calls
3. Handle offline scenarios gracefully
4. Log all external service interactions

### Accessibility
1. Test with screen readers
2. Ensure keyboard navigation
3. Provide text alternatives
4. Use high contrast ratios

## Troubleshooting

### File Corruption Issues
**Problem**: TypeScript files converted to MPEG
**Solution**: 
1. Run `npm run integrity:scan`
2. Restore from `.file-backups/`
3. Disable iCloud sync for development folders
4. Use Git for synchronization

### Module Connection Failures
**Problem**: Cannot connect to external modules
**Solution**:
1. Verify API URLs in `.env`
2. Check API keys are correct
3. Test with `testConnection()` method
4. Check network/firewall settings

### Build Failures
**Problem**: TypeScript compilation errors
**Solution**:
1. Run `npm run check`
2. Fix type errors
3. Update dependencies if needed
4. Check for corrupted files

## Recommended Tools & Snippets

### Development Tools
- **VSCode Extensions**:
  - ESLint
  - Prettier
  - TypeScript Error Translator
  - Accessibility Insights

### Testing Tools
- **Jest**: Unit testing
- **Playwright**: E2E testing
- **Lighthouse**: Accessibility auditing
- **axe DevTools**: Accessibility testing

### Code Quality
- **ESLint**: Linting
- **Prettier**: Formatting
- **Husky**: Git hooks
- **lint-staged**: Pre-commit checks

## Future Enhancements

1. **PHP Migration Path**:
   - API compatibility layer
   - Gradual service migration
   - Shared authentication

2. **Enhanced Accessibility**:
   - Video sign language interpreter
   - Real-time captioning
   - Visual alert system

3. **Advanced Analytics**:
   - Financial forecasting
   - Risk assessment
   - Compliance tracking

4. **Container Orchestration**:
   - Docker deployment
   - Kubernetes scaling
   - Service mesh integration

## Support & Resources

- **Documentation**: See `/docs` folder
- **API Spec**: `API_SPECIFICATION.md`
- **Architecture**: `ARCHITECTURE.md`
- **Contributing**: `CONTRIBUTING.md`
- **Security**: `SECURITY.md`

## Related Repositories

- **PinkFlow**: github.com/pinkycollie/pinkflow
- **FibonRose**: github.com/pinkycollie/fibonrose
- **NegraRosa**: github.com/pinkycollie/negrarosa
