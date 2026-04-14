# Replit Agent Instructions

This file provides context for the Replit Agent to understand and work with this project.

## Project Overview

**PinkSync Estimator** is an AI-powered productivity platform for multi-platform file synchronization, document management, and workflow automation.

## Quick Start Commands

```bash
# Install dependencies
npm install

# Start development server (port 5000)
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Type check
npm run check

# Push database schema
npm run db:push
```

## Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite
- **Backend**: Express.js, TypeScript
- **Database**: PostgreSQL 16+ with Drizzle ORM
- **AI Services**: OpenAI, HuggingFace, Anthropic (optional)

## Project Structure

```
├── client/           # React frontend application
├── server/           # Express.js backend API
│   ├── index.ts      # Server entry point (port 5000)
│   ├── routes.ts     # API route definitions
│   └── storage.ts    # Data storage layer
├── shared/           # Shared TypeScript types
├── .replit           # Replit configuration
└── package.json      # Dependencies and scripts
```

## Server Configuration

The server runs on **port 5000** (configured in `server/index.ts`):
- Frontend: http://localhost:5000
- API: http://localhost:5000/api/*

## Environment Variables (Secrets)

Required secrets in Replit's Secrets tab:

| Secret | Description | Required |
|--------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `OPENAI_API_KEY` | OpenAI API key | Optional |
| `HUGGINGFACE_API_KEY` | HuggingFace API key | Optional |
| `ANTHROPIC_API_KEY` | Anthropic API key | Optional |

## Database

Uses PostgreSQL with Drizzle ORM. Schema is in `shared/schema.ts`.

To update database schema:
```bash
npm run db:push
```

## Resuming Development

When returning to this project after it has been dormant:

1. **Dependencies**: Run `npm install` to ensure all packages are up to date
2. **Database**: Ensure PostgreSQL is running and `DATABASE_URL` is set
3. **Start**: Run `npm run dev` to start the development server
4. **Access**: Open http://localhost:5000 in the browser

## Common Tasks

### Adding a New API Endpoint
1. Add route handler in `server/routes.ts`
2. Add TypeScript types in `shared/schema.ts`

### Adding a New Frontend Page
1. Create component in `client/src/pages/`
2. Add route in `client/src/App.tsx`

### Modifying Database Schema
1. Update schema in `shared/schema.ts`
2. Run `npm run db:push` to apply changes

## Troubleshooting

### Port 5000 in use
The server must run on port 5000. If blocked, check for other processes.

### Database connection failed
Verify `DATABASE_URL` secret is set correctly in Replit Secrets.

### Module not found
Run `npm install` to reinstall dependencies.

## Documentation

- [README.md](README.md) - Project overview
- [LOCAL_SETUP.md](LOCAL_SETUP.md) - Local development setup
- [API_SPECIFICATION.md](API_SPECIFICATION.md) - API documentation
- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture
