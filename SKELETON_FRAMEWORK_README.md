# Skeleton Framework Foundation

## Quick Start Guide

This is a clean, modular skeleton framework for building financial analysis, project management, and accessibility-focused applications for deaf community initiatives.

### What's Included

✅ **File Integrity Protection** - Prevents TypeScript file corruption during iOS sync  
✅ **Module Connectors** - Integration with pinkflow, pinksync, fibonrose  
✅ **Accessibility Framework** - DeafAuth, visual cues, sign language support  
✅ **Development Setup** - Configured for Replit (dev) and Vercel (frontend)  
✅ **Security Best Practices** - Environment variables, .gitignore patterns  

### Getting Started

1. **Clone the Repository**
   ```bash
   git clone https://github.com/pinkycollie/pinksync_estimator.git
   cd pinksync_estimator
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Run Development Server**
   ```bash
   npm run dev
   ```

5. **Check File Integrity (Important!)**
   ```bash
   npm run integrity:scan
   ```

### Key Commands

```bash
# Development
npm run dev                    # Start development server
npm run build                  # Build for production
npm run check                  # TypeScript type checking

# File Integrity
npm run integrity:scan         # Scan for corrupted files
npm run integrity:check <file> # Check specific file
npm run integrity:backup <file># Create backup
npm run integrity:report       # Generate full report

# Database
npm run db:push                # Push database schema
```

### Architecture Overview

```
pinksync_estimator/
├── client/                    # React frontend
│   ├── src/
│   │   ├── components/       # UI components
│   │   ├── pages/           # Page components
│   │   └── hooks/           # Custom React hooks
├── server/                    # Express backend
│   ├── api/                  # API routes
│   ├── connectors/           # External module connectors
│   │   ├── pinkflow-connector.ts
│   │   ├── pinksync-connector.ts
│   │   └── fibonrose-connector.ts
│   ├── utils/                # Utility functions
│   └── routes/               # Route handlers
├── shared/                    # Shared types & schemas
├── tools/                     # Development tools
│   └── file-integrity-checker.ts
└── docs/                      # Documentation
```

### External Module Integration

#### PinkFlow TestContainer
Test validation and approval workflows for deaf community initiatives.

```typescript
import { pinkFlowConnector } from './server/connectors';

// Validate implementation
const result = await pinkFlowConnector.validateImplementation({
  projectId: 'proj-123',
  testSuite: 'accessibility',
  testCases: [...]
});
```

#### PinkSync
Multi-platform synchronization with DeafAuth support.

```typescript
import { pinkSyncConnector } from './server/connectors';

// Sync with DeafAuth
await pinkSyncConnector.authenticateWithDeafAuth({
  userId: 'user-123',
  accessibilityProfile: {
    signLanguagePreference: 'ASL',
    visualCuesEnabled: true,
    highContrastMode: true
  }
});
```

#### FibonRose
Fibonacci-based project estimation engine.

```typescript
import { fibonRoseConnector } from './server/connectors';

// Estimate project
const estimate = await fibonRoseConnector.estimateProject({
  projectName: 'Accessibility Portal',
  features: ['sign-language', 'visual-alerts'],
  accessibilityRequirements: {...}
});
```

### File Corruption Protection

**Problem**: iOS/iPhone sync converts TypeScript files to MPEG format.

**Solution**: Automated file integrity checking and backups.

```bash
# Before committing changes
npm run integrity:scan

# If corruption detected
# Files are automatically backed up in .file-backups/
```

### Development Platforms

#### Replit (Development Environment)
- Cloud-based IDE
- No local setup required
- Collaborative editing
- Instant deployment

Configuration in `.replit` file.

#### Vercel (Frontend Deployment)
- Automatic deployments from Git
- Edge network distribution
- Preview deployments
- Serverless functions

Configuration in `vercel.json` file.

### Technology Stack

**Frontend**
- React 18 with TypeScript
- Vite for build tooling
- TailwindCSS + Radix UI
- Wouter for routing

**Backend**
- Node.js + Express
- TypeScript
- PostgreSQL + Drizzle ORM
- RESTful API

**AI/ML**
- OpenAI integration
- HuggingFace models
- Vector embeddings

### Accessibility Features

**Deaf Community Focus**
- Visual status indicators (no audio dependence)
- Sign language support framework
- High contrast mode
- Text alternatives for all content
- DeafAuth authentication system

**Technical Implementation**
- ARIA labels
- Keyboard navigation
- Screen reader compatibility
- Visual feedback for all actions

### API Documentation

See `INTEGRATION_GUIDE.md` for complete API documentation.

**Key Endpoints**:
- `/api/pinkflow/*` - Test validation and approvals
- `/api/pinksync/*` - Synchronization and DeafAuth
- `/api/fibonrose/*` - Project estimation
- `/api/files/*` - File management
- `/api/sync/*` - Platform synchronization

### Security & Privacy

**Protected Information**
- API keys in `.env` (never committed)
- User credentials encrypted
- DeafAuth profile data protected
- File backups in `.file-backups/` (gitignored)

**Best Practices**
- Use environment variables for secrets
- Run integrity checks before commits
- Keep backups of important files
- Use Git for version control, not iOS sync

### Deployment

#### Replit
1. Import from GitHub
2. Set environment variables in Secrets
3. Run automatically

#### Vercel
1. Connect GitHub repository
2. Configure build settings
3. Add environment variables
4. Deploy

#### Other Platforms
- Railway
- Render
- DigitalOcean App Platform
- Heroku

### Troubleshooting

**TypeScript file converted to MPEG?**
```bash
npm run integrity:scan
# Restore from .file-backups/
# Disable iCloud sync for development folder
```

**Module connector not working?**
```bash
# Check .env configuration
# Verify API keys
# Test connection:
# await connector.testConnection()
```

**Build failing?**
```bash
npm run check  # Check TypeScript errors
npm install    # Reinstall dependencies
npm run integrity:scan  # Check for file corruption
```

### Contributing

See `CONTRIBUTING.md` for contribution guidelines.

### Documentation

- **Integration Guide**: `INTEGRATION_GUIDE.md`
- **API Specification**: `API_SPECIFICATION.md`
- **Architecture**: `ARCHITECTURE.md`
- **Security**: `SECURITY.md`
- **Feature Spec**: `FEATURE_SPECIFICATION.md`

### Related Projects

- **PinkFlow**: github.com/pinkycollie/pinkflow
- **FibonRose**: github.com/pinkycollie/fibonrose
- **NegraRosa**: github.com/pinkycollie/negrarosa

### License

MIT License - See package.json

### Support

For issues, questions, or contributions, please open an issue on GitHub.

---

**Note**: This is a skeleton framework foundation. No company or brand names are embedded in the core architecture. The framework is designed to be adapted for various use cases including:

- Financial analysis platforms
- Project management systems
- Accessibility proposal generators
- Deaf community initiatives
- Resource estimation tools
- Multi-platform synchronization

**Development Platform Labels**:
- 🟦 Replit: Development environment
- 🟩 Vercel: Frontend deployment

**Module Integration Labels**:
- 🔵 PinkFlow: Test container & validation
- 🟣 PinkSync: DeafAuth & synchronization  
- 🟠 FibonRose: Estimation engine
