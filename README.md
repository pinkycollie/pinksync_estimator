# Pinksync Estimator (Archived)

> ⚠️ **This repository is archived.** It represents early prototype work and is preserved for historical reference.

## About this project

This was one of my first real projects. At the time I was a student working in Replit and learning by doing — I wasn't yet familiar with many of the tooling and workflows people commonly use today (for example, GitHub Actions, project generators, and CI/CD pipelines). I learned how to look for tools and figure things out as I went, and Replit taught me a lot about rapid iteration, prototyping, and shipping simple apps quickly.

This repository captures that early learning stage: there are experiments, rough edges, and decisions made while I was still discovering better ways to structure and automate development. Over time I learned about more robust workflows (adding automated tests and CI, using generators to scaffold projects, and moving development to a local environment), and those lessons shaped how I work now.

## What this project contains

### Original Prototype (Replit-based)

The main prototype is an AI-powered productivity platform with:

- **Multi-platform file synchronization** (Ubuntu, Windows, iOS, Dropbox, Google Drive)
- **AI-powered file organization** with automatic categorization
- **Task automation workflows**
- **Deaf-centric accessibility features** (visual cues, high contrast, simplified language)
- **Business intelligence tools** for entrepreneurs

### Tools Directory

A standalone CLI utility extracted from the prototype:

#### File Analyzer (`tools/file-analyzer.ts`)

A command-line tool for analyzing and categorizing files, featuring:
- Automatic file categorization (document, code, image, video, etc.)
- Visual indicators (emoji) for accessibility
- JSON output for integration with other tools
- Recursive directory scanning

```bash
# Usage
npx tsx tools/file-analyzer.ts <file-or-directory> [options]

# Examples
npx tsx tools/file-analyzer.ts ./src
npx tsx tools/file-analyzer.ts ./project --json
npx tsx tools/file-analyzer.ts ./src --summary
```

## Project Structure

```
├── client/               # React frontend (prototype UI)
├── server/               # Express backend with various utilities
│   ├── api/             # API routes
│   ├── routes/          # Additional route handlers
│   ├── storage/         # Storage implementations
│   └── utils/           # Utility modules (AI, pipelines, etc.)
├── shared/              # Shared TypeScript types and schemas
├── tools/               # Standalone CLI tools (post-archive additions)
│   ├── file-analyzer.ts      # File analysis CLI tool
│   └── file-analyzer.test.ts # Tests for the tool
└── docs/                # Documentation files
    ├── ARCHITECTURE.md
    ├── FEATURE_SPECIFICATION.md
    ├── TECHNICAL_REPORT.md
    └── ...
```

## Key Documentation

- [Architecture Overview](./ARCHITECTURE.md) - System design and components
- [Feature Specification](./FEATURE_SPECIFICATION.md) - Detailed feature requirements
- [Technical Report](./TECHNICAL_REPORT.md) - Technical implementation details
- [Database Schema](./DATABASE_SCHEMA.md) - Data model documentation

## Running the Tools

### Prerequisites

- Node.js 18 or higher
- npm or pnpm

### Install dependencies

```bash
npm install --legacy-peer-deps
```

### Run the File Analyzer

```bash
npx tsx tools/file-analyzer.ts --help
npx tsx tools/file-analyzer.ts ./some-directory
```

### Run Tests

```bash
npx tsx tools/file-analyzer.test.ts
```

## Accessibility Features

This project was designed with deaf communities in mind:

- **Visual indicators**: Emoji and icons replace audio cues
- **High contrast**: Support for high contrast UI modes
- **Simplified language**: Technical concepts explained clearly
- **Visual feedback**: All status updates are visual, not auditory

## Lessons Learned

Building this prototype taught me:

1. **Start simple**: Complex architectures are hard to maintain in early stages
2. **Test early**: Adding tests later is much harder
3. **Document as you go**: Future-you will thank present-you
4. **Use established tools**: Don't reinvent wheels
5. **Accessibility matters**: Design for all users from the start

## License

MIT

## Archive Notice

This repository is archived and no longer actively maintained. The code is preserved for:
- Historical reference
- Learning purposes
- Code archaeology

Feel free to explore, learn from, or fork this project for your own experiments!
