# PinkSync Estimator - AI OS Platform

[![CodeQL Advanced](https://github.com/pinkycollie/pinksync_estimator/actions/workflows/codeql.yml/badge.svg?branch=main)](https://github.com/pinkycollie/pinksync_estimator/actions/workflows/codeql.yml)
[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![AI Powered](https://img.shields.io/badge/AI%20Powered-OpenAI%20%7C%20HuggingFace-FF6F00?logo=openai&logoColor=white)](https://openai.com/)
[![Accessibility](https://img.shields.io/badge/Accessibility-Deaf%20Community%20Focused-0077B5?logo=accessibility&logoColor=white)](FEATURE_SPECIFICATION.md)
[![Contributions Welcome](https://img.shields.io/badge/Contributions-Welcome-brightgreen?logo=github)](CONTRIBUTING.md)

An AI-powered productivity platform for multi-platform file synchronization, document management, and workflow automation. This project includes accessible features designed with the deaf community in mind, as well as the original **PinkSync Universal Estimator** for cost estimation and analysis.

## About This Project

This started as an early learning project built on Replit. It has since evolved into a more structured codebase suitable for community contributions. While some rough edges remain from the learning stage, the project demonstrates:

- **PinkSync Universal Estimator**: The original cost estimation platform for AI inference, sync operations, and project delivery metrics across 10+ industries
- Multi-platform file synchronization (Ubuntu, Windows, iOS, Dropbox, Google Drive)
- AI-powered document categorization and analysis
- Workflow automation for document processing
- Accessibility-focused features for visual-centric workflows

## Features

### 🩷 PinkSync Universal Estimator

The original platform created for forecasting resource usage, timing, and costs for data synchronization and AI inference:

- **Industry-specific cost multipliers** for Healthcare, Finance, Education, Government, Retail, Manufacturing, Technology, Legal, Real Estate, and Entertainment
- **AI inference cost analysis** including tokens, GPU utilization, and memory usage
- **User management tier analysis** (Free, Basic, Professional, Enterprise)
- **Project delivery metrics** and efficiency tracking
- **Risk assessment and recommendations** engine
- **Cross-industry benchmarking** capabilities

Access the estimator at `/estimator` in the web application or use the Python modules directly:

```python
# Core estimator
from pinksync_estimator import PinkSyncEstimator

# Universal estimator with multi-industry support
from universal_estimator import UniversalPinkSyncEstimator
```

### 📁 File Synchronization & Management

- Multi-platform sync across Ubuntu, Windows, iOS, and cloud services
- Real-time file monitoring and automated backups
- AI-powered document categorization

### 🎯 Accessibility Features

- Visual-centric workflows designed for the deaf community
- High-contrast modes and customizable visual alerts
- SignYapse API integration for sign language translation

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 16+
- Python 3.11+ (for AI analysis scripts)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/pinkycollie/pinksync_estimator.git
   cd pinksync_estimator
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables (see `.env.example` for required variables)

4. Start the development server:
   ```bash
   npm run dev
   ```

The server will start at **http://localhost:5000**.

### Moving from Replit to Local

If you're migrating from Replit, see [LOCAL_SETUP.md](LOCAL_SETUP.md) for detailed instructions on:
- Exporting your project from Replit
- Setting up PostgreSQL locally
- Configuring environment variables
- Running on port 5000 (same as Replit)

## Project Structure

See [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) for detailed architecture documentation.

- `client/` - React frontend application
- `server/` - Express.js backend API
- `shared/` - Shared TypeScript types and schemas

## Configuration

This project requires several environment variables for full functionality. See `.env.example` for a template. **Never commit actual API keys or secrets to the repository.**

### Required Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `HUGGINGFACE_API_KEY` | HuggingFace API key for embeddings | Optional |
| `OPENAI_API_KEY` | OpenAI API key for AI features | Optional |

## Contributing

Contributions are welcome! Please read the contributing guidelines before submitting pull requests.

## Security

Please see [SECURITY.md](SECURITY.md) for security policies and how to report vulnerabilities.

## License

This project is licensed under the MIT License - see the package.json file for details.

## Documentation

- [API Specification](API_SPECIFICATION.md)
- [Database Schema](DATABASE_SCHEMA.md)
- [Architecture Overview](ARCHITECTURE.md)
- [Feature Specification](FEATURE_SPECIFICATION.md)
- [Implementation Roadmap](IMPLEMENTATION_ROADMAP.md)
- [Local Setup Guide](LOCAL_SETUP.md) - Moving from Replit to local development
- [Replit Agent Instructions](REPLIT_AGENT.md) - Context for Replit Agent
