# Deployment Guide

> **Note**: This is a template repository. Automated deployment has been intentionally disabled to allow each client project to configure deployment according to their specific requirements.

## Overview

This guide provides instructions for deploying this application to various platforms. Choose the deployment strategy that best fits your project requirements.

## Deployment Options

### Option 1: Vercel (Recommended for Quick Setup)

Vercel provides seamless deployment for Node.js applications with automatic CI/CD.

#### Steps:

1. **Install Vercel CLI** (optional):
   ```bash
   npm install -g vercel
   ```

2. **Connect to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Vercel will automatically detect the configuration from `vercel.json`

3. **Configure Environment Variables**:
   - In Vercel dashboard, add your environment variables:
     - `DATABASE_URL` - PostgreSQL connection string
     - `HUGGINGFACE_API_KEY` - (Optional) HuggingFace API key
     - `OPENAI_API_KEY` - (Optional) OpenAI API key
     - Any other required API keys

4. **Deploy**:
   - Push to your main branch
   - Vercel will automatically build and deploy

#### Customizing Vercel Configuration:

Edit `vercel.json` to modify:
- Build commands
- Output directories
- API routes
- Environment variables

### Option 2: Replit Deployment

If you're developing on Replit and want to deploy there:

1. **Enable Deployment in `.replit`**:
   Uncomment and configure the deployment section:
   ```toml
   [deployment]
   deploymentTarget = "autoscale"
   build = ["npm", "run", "build"]
   run = ["npm", "run", "start"]
   ```

2. **Configure Environment Variables**:
   - In Replit Secrets, add required environment variables
   - See `.env.example` for required variables

3. **Deploy**:
   - Click "Deploy" in Replit interface
   - Follow the deployment wizard

### Option 3: Docker Deployment

For containerized deployment using Docker Compose:

1. **Use Dev Container Configuration**:
   - The `.devcontainer` folder contains Docker configuration
   - Modify `docker-compose.yml` for production use

2. **Build and Run**:
   ```bash
   docker-compose up -d
   ```

3. **Configure for Production**:
   - Set up proper volume mounts
   - Configure networking
   - Set up reverse proxy (nginx/traefik)

### Option 4: Traditional VPS/Server

For deployment on a traditional server (Ubuntu, Debian, etc.):

1. **Prerequisites**:
   - Node.js 20+
   - PostgreSQL 16+
   - Nginx (for reverse proxy)

2. **Setup**:
   ```bash
   # Clone repository
   git clone <your-repo-url>
   cd pinksync_estimator
   
   # Install dependencies
   npm install
   
   # Build application
   npm run build
   
   # Set up environment variables
   cp .env.example .env
   # Edit .env with your configuration
   
   # Start with PM2
   npm install -g pm2
   pm2 start dist/index.js --name "pinksync-api"
   pm2 startup
   pm2 save
   ```

3. **Configure Nginx**:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location /api/ {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
       
       location / {
           root /path/to/pinksync_estimator/client/dist;
           try_files $uri $uri/ /index.html;
       }
   }
   ```

### Option 5: AWS/Azure/GCP

For cloud platform deployment:

1. **AWS Elastic Beanstalk**:
   - Create a new application
   - Use Node.js platform
   - Deploy using EB CLI or console

2. **Azure App Service**:
   - Create a new Web App
   - Configure for Node.js
   - Deploy via GitHub Actions or Azure CLI

3. **Google Cloud Run**:
   - Containerize the application
   - Deploy using `gcloud run deploy`

## Database Setup

Regardless of deployment platform, you'll need a PostgreSQL database:

### Database Options:

1. **Managed Services** (Recommended):
   - [Neon](https://neon.tech) - Serverless PostgreSQL
   - [Supabase](https://supabase.com) - PostgreSQL with additional features
   - AWS RDS, Azure Database, or Google Cloud SQL

2. **Self-Hosted**:
   - Install PostgreSQL on your server
   - Configure connection string in environment variables

### Initialize Database:

```bash
# Push schema to database
npm run db:push
```

## Environment Variables

Create a `.env` file or configure environment variables in your deployment platform:

```env
# Required
DATABASE_URL=postgresql://user:password@host:port/database

# Optional - AI Features
HUGGINGFACE_API_KEY=your_huggingface_key
OPENAI_API_KEY=your_openai_key

# Node Environment
NODE_ENV=production
```

See `.env.example` for a complete list of available environment variables.

## CI/CD Configuration

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm install
      
      - name: Build
        run: npm run build
      
      - name: Deploy to [Your Platform]
        run: |
          # Add deployment commands here
```

## Security Considerations

Before deploying to production:

1. **Environment Variables**:
   - Never commit `.env` files
   - Use secrets management
   - Rotate API keys regularly

2. **Database**:
   - Use SSL connections
   - Restrict network access
   - Regular backups

3. **Application**:
   - Keep dependencies updated
   - Monitor for security vulnerabilities
   - Implement rate limiting
   - Use HTTPS/TLS

## Monitoring and Maintenance

After deployment:

1. **Set up monitoring**:
   - Application logs
   - Error tracking (e.g., Sentry)
   - Performance monitoring

2. **Regular updates**:
   - Update dependencies monthly
   - Apply security patches immediately
   - Monitor database performance

3. **Backups**:
   - Daily database backups
   - Test recovery procedures
   - Document disaster recovery plan

## Troubleshooting

Common deployment issues:

### Build Failures
- Check Node.js version (20+ required)
- Verify all dependencies are installed
- Check build logs for specific errors

### Database Connection Issues
- Verify DATABASE_URL format
- Check network access rules
- Confirm PostgreSQL version (16+ required)

### Application Won't Start
- Check environment variables
- Verify port availability
- Review application logs

## Support

For additional help:
- Review [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) for architecture details
- Check [TECHNICAL_REPORT.md](TECHNICAL_REPORT.md) for implementation details
- See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines

---

**Remember**: This is a template. Customize the deployment strategy based on your specific requirements, security policies, and infrastructure.
