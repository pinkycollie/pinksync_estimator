# Pinky's AI OS - Project Structure

## Overview
The project follows a modern full-stack architecture with a clear separation between client and server code. The codebase is organized to support a scalable, extensible system capable of handling multi-platform synchronization, document management, and intelligent task automation.

## Directory Structure

```
.
├── client/                      # Frontend React application
│   ├── src/
│   │   ├── assets/              # Static assets like images and fonts
│   │   ├── components/          # Reusable UI components
│   │   │   ├── common/          # General-purpose components
│   │   │   ├── layout/          # Layout components
│   │   │   ├── dashboard/       # Dashboard-specific components
│   │   │   ├── platform/        # Platform connection components
│   │   │   ├── document/        # Document management components
│   │   │   ├── workflow/        # Workflow editor components
│   │   │   └── ui/              # Shadcn UI components
│   │   ├── contexts/            # React context providers
│   │   ├── hooks/               # Custom React hooks
│   │   ├── lib/                 # Utility functions and constants
│   │   ├── pages/               # Page components
│   │   └── styles/              # Global styles and theme configurations
├── server/                      # Backend Express application
│   ├── api/                     # API route definitions
│   │   ├── auth-routes.ts       # Authentication routes
│   │   ├── communication-routes.ts # Communication routes
│   │   ├── document-routes.ts   # Document management routes
│   │   ├── real-estate-routes.ts # Real estate routes
│   │   ├── sync-routes.ts       # Platform sync routes
│   │   ├── system-routes.ts     # System management routes
│   │   └── workflow-routes.ts   # Workflow routes
│   ├── db/                      # Database connection and migrations
│   ├── middleware/              # Express middleware
│   ├── storage/                 # Storage implementations
│   │   ├── documentStorage.ts   # Document storage logic
│   │   ├── platformSyncStorage.ts # Platform sync storage logic
│   │   └── communicationStorage.ts # Communication storage logic
│   ├── utils/                   # Utility functions
│   │   ├── aiUtils.ts           # AI integration utilities
│   │   ├── communicationLogger.ts # Communication logging utilities
│   │   ├── documentUtils.ts     # Document handling utilities
│   │   ├── platformSyncManager.ts # Platform synchronization manager
│   │   ├── workflowEngine.ts    # Workflow execution engine
│   │   └── securityUtils.ts     # Security and encryption utilities
│   ├── vite.ts                  # Vite integration for development
│   ├── index.ts                 # Application entry point
│   ├── ngrokService.ts          # Ngrok tunnel service
│   ├── replitAuth.ts            # Replit authentication integration
│   ├── routes.ts                # Main route registration
│   └── storage.ts               # Storage interface and implementations
├── shared/                      # Shared code between client and server
│   ├── constants.ts             # Shared constants
│   ├── platformSyncSchema.ts    # Platform sync data schemas
│   ├── documentSchema.ts        # Document management schemas
│   └── types.ts                 # Shared TypeScript types
├── uploads/                     # Upload directory for file storage
├── drizzle.config.ts            # Drizzle ORM configuration
├── package.json                 # Project dependencies
├── tsconfig.json                # TypeScript configuration
├── vite.config.ts               # Vite configuration
├── tailwind.config.ts           # Tailwind CSS configuration
├── theme.json                   # Theme configuration
├── API_SPECIFICATION.md         # API documentation
├── DATABASE_SCHEMA.md           # Database schema documentation
├── FEATURE_SPECIFICATION.md     # Feature specification
└── IMPLEMENTATION_ROADMAP.md    # Implementation roadmap
```

## Key Components

### Client Components

1. **Navigation Component**
   - Main navigation structure for the application
   - Provides access to all application sections
   - Handles responsive layout for different screen sizes

2. **Layout Component**
   - Provides consistent layout structure for all pages
   - Manages sidebar, header, and content areas
   - Handles theme switching and responsive behavior

3. **Dashboard Components**
   - Overview widgets displaying system status
   - Recent activity timelines
   - Quick action buttons for common tasks

4. **Platform Connection Components**
   - Connection management interface
   - Platform-specific configuration forms
   - Sync status and history visualization

5. **Document Management Components**
   - Document browser with filtering and sorting
   - Document viewer with version history
   - Document categorization and tagging interface

6. **Workflow Editor Components**
   - Visual workflow designer
   - Step configuration panels
   - Workflow testing and execution controls

### Server Components

1. **Platform Sync Manager**
   - Manages connections to various platforms
   - Handles file synchronization between platforms
   - Provides conflict detection and resolution

2. **Document Utils**
   - Document processing and transformation utilities
   - Metadata extraction and categorization
   - Version management and diff generation

3. **Communication Logger**
   - Logs communications from various sources
   - Provides analysis and tagging capabilities
   - Maintains version history of communications

4. **Workflow Engine**
   - Executes document workflows
   - Manages checkpoints and validations
   - Handles batch processing and scheduling

5. **Replit Auth Integration**
   - Handles user authentication and session management
   - Integrates with Replit's OpenID Connect provider
   - Manages user profile information

6. **Ngrok Service**
   - Provides public URL access to the application
   - Monitors tunnel status and health
   - Simplifies external service integrations for development

## Database Models

The application uses both in-memory storage for development and PostgreSQL for production. Key data models include:

1. **User** - User account information and profiles
2. **PlatformConnection** - External platform connection details
3. **SyncOperation** - Platform synchronization operation records
4. **SyncItem** - Individual synchronized file or directory
5. **Document** - Document metadata across all platforms
6. **DocumentVersion** - Version history for documents
7. **Workflow** - Workflow definitions and triggers
8. **WorkflowExecution** - Execution records for workflows
9. **Communication** - Communication entries from various sources
10. **Property** - Real estate property information

## API Structure

The API follows RESTful principles with consistent endpoint patterns:

1. `/api/auth/*` - Authentication endpoints
2. `/api/sync/*` - Platform synchronization endpoints
3. `/api/documents/*` - Document management endpoints
4. `/api/workflows/*` - Workflow management endpoints
5. `/api/communications/*` - Communication management endpoints
6. `/api/real-estate/*` - Real estate management endpoints
7. `/api/system/*` - System management endpoints

## State Management

1. **Context API** - Used for global state management
2. **React Query** - Handles data fetching, caching, and updates
3. **LocalStorage** - Persists user preferences
4. **WebSocket** - Provides real-time updates for sync operations

## Authentication Flow

1. User clicks "Log in with Replit"
2. Application redirects to Replit's OpenID Connect provider
3. User authenticates with Replit
4. Replit redirects back to the application callback URL
5. Application verifies the authentication and creates a session
6. User is redirected to the dashboard or requested page

## Deployment Strategy

The application is designed to be deployed on Replit with the following considerations:

1. Express server handles both API requests and serves the frontend
2. Static assets are served from the `client/dist` directory
3. Environment variables control configuration for different environments
4. Ngrok tunneling provides external access during development
