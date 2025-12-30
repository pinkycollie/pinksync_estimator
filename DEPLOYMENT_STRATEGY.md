# Deployment Strategy

## Overview

This document outlines the deployment strategy for the PinkSync Estimator skeleton framework, with separate staging and production environments.

## Deployment Environments

### 🟦 Staging / Preview - GitHub Pages

**Purpose**: Accessibility showcase and preview environment

**Technology Stack**:
- Latest HTML5/CSS3
- Tailwind CSS v3+ (CDN)
- Semantic HTML5 markup
- WCAG 2.1 AAA compliant

**Features Showcased**:
- ✅ **Why**: Accessibility-first design rationale
- ✅ **How**: Step-by-step workflow visualization
- ✅ **When**: Use case scenarios
- ✅ **Where**: Deployment platform overview
- ✅ **Cost**: Pricing tiers and value proposition

**Deployment Process**:
1. Push to `main` or `copilot/*` branches
2. GitHub Actions automatically builds and deploys
3. Available at: `https://pinkycollie.github.io/pinksync_estimator/`

**Configuration**:
- Source: `docs/` directory
- Workflow: `.github/workflows/deploy-gh-pages.yml`
- Branch: Configured in repository settings

**Accessibility Features**:
- Screen reader compatible
- Keyboard navigation
- High contrast support
- Visual status indicators
- No audio dependencies
- ARIA labels and landmarks

### 🟩 Production - Coming Soon

**Status**: 🚧 Placeholder "Coming Soon" page

**Decision Point**: Platform will be determined at creation time based on:
- Project requirements
- Budget constraints
- Scalability needs
- Technical requirements
- Client preferences

**Platform Options**:

#### Option 1: Replit (Current Development)
- **Pros**: Already configured, instant deployment
- **Cons**: Development-focused, less suitable for production
- **Cost**: Free tier available, Pro at $7/month
- **Best For**: Rapid prototyping, development

#### Option 2: Vercel (Recommended for Frontend)
- **Pros**: Excellent for React/Next.js, automatic deployments
- **Cons**: Backend needs separate deployment
- **Cost**: Free tier generous, Pro at $20/month
- **Best For**: Frontend-heavy applications

#### Option 3: Railway
- **Pros**: Full-stack deployment, PostgreSQL included
- **Cons**: Higher cost, resource-based pricing
- **Cost**: Pay as you go, ~$20-50/month
- **Best For**: Full-stack with database

#### Option 4: Render
- **Pros**: Free tier available, easy deployment
- **Cons**: Free tier has limitations (spins down)
- **Cost**: Free tier, paid from $7/month
- **Best For**: Budget-conscious full-stack

#### Option 5: DigitalOcean App Platform
- **Pros**: Scalable, managed services
- **Cons**: More complex setup
- **Cost**: Starting at $5/month
- **Best For**: Production-grade applications

#### Option 6: Self-Hosted (VPS/Dedicated)
- **Pros**: Full control, potentially lower long-term cost
- **Cons**: Requires DevOps expertise
- **Cost**: $5-50/month depending on resources
- **Best For**: Large-scale or custom requirements

## Deployment Architecture

### Current Setup

```
Repository Structure:
├── docs/                    # GitHub Pages (Staging)
│   └── index.html          # Accessibility showcase
├── client/                  # React frontend (Production)
│   └── dist/               # Built assets
├── server/                  # Express backend (Production)
│   └── dist/               # Compiled TypeScript
└── .github/workflows/      # CI/CD pipelines
    └── deploy-gh-pages.yml # GitHub Pages deployment
```

### Recommended Production Architecture

```
Frontend (Vercel):
- React application
- Static assets
- CDN distribution
- Automatic previews

Backend (Railway/Render):
- Express API server
- PostgreSQL database
- Background workers
- Scheduled tasks

External Services:
- PinkFlow API
- PinkSync API
- FibonRose API
- Storage (S3/similar)
```

## Deployment Checklist

### Staging (GitHub Pages) - ✅ Complete

- [x] Create `docs/index.html` with showcase
- [x] Configure GitHub Actions workflow
- [x] Enable GitHub Pages in repository settings
- [x] Add accessibility features
- [x] Test deployment pipeline

### Production (TBD) - ⏳ Pending

- [ ] Determine deployment platform
- [ ] Configure environment variables
- [ ] Set up database
- [ ] Configure domain/DNS
- [ ] Set up SSL/TLS certificates
- [ ] Configure monitoring/logging
- [ ] Set up backup strategy
- [ ] Configure CI/CD pipeline
- [ ] Load testing
- [ ] Security audit

## Environment Variables

### Staging (GitHub Pages)
No backend, static HTML only. No environment variables needed.

### Production (Future)
Required environment variables:
```bash
# Database
DATABASE_URL=postgresql://...

# API Keys
PINKFLOW_API_KEY=...
PINKSYNC_API_KEY=...
FIBONROSE_API_KEY=...

# AI Services
OPENAI_API_KEY=...
HUGGINGFACE_API_KEY=...

# Platform
NODE_ENV=production
PORT=5000
```

## Cost Analysis

### Staging (GitHub Pages)
- **Cost**: $0/month
- **Bandwidth**: Unlimited (within GitHub limits)
- **Storage**: 1GB repository limit
- **Uptime**: 99.9% SLA

### Production Estimates

#### Budget Option (~$15/month)
- Frontend: Vercel Free Tier ($0)
- Backend: Render Free Tier ($0)
- Database: Render PostgreSQL ($7)
- External APIs: Pay-as-you-go ($5-10)
- **Total**: ~$15/month

#### Recommended Option (~$50/month)
- Frontend: Vercel Pro ($20)
- Backend: Railway Pro ($20)
- Database: Included with Railway
- External APIs: Pay-as-you-go ($10)
- **Total**: ~$50/month

#### Enterprise Option ($200+/month)
- Frontend: Vercel Enterprise (custom)
- Backend: Dedicated server ($50-100)
- Database: Managed PostgreSQL ($50-100)
- External APIs: Enterprise tier ($50+)
- CDN: Cloudflare Pro ($20)
- **Total**: $200+/month

## Security Considerations

### Staging
- No sensitive data
- No authentication required
- Static content only
- Public showcase

### Production
- Environment variables secured
- API keys in secrets manager
- HTTPS/TLS required
- Rate limiting enabled
- File integrity monitoring
- Regular security audits
- Backup strategy

## Monitoring & Analytics

### Staging
- GitHub Pages built-in analytics
- Optional: Google Analytics for visitors

### Production (Recommended)
- Uptime monitoring (UptimeRobot, Pingdom)
- Error tracking (Sentry)
- Performance monitoring (New Relic, Datadog)
- Log aggregation (Papertrail, Loggly)
- Analytics (Google Analytics, Plausible)

## Rollback Strategy

### Staging
- Git revert to previous commit
- GitHub Actions automatically redeploys

### Production
- Keep previous deployment artifacts
- Database migration rollback scripts
- Feature flags for gradual rollout
- Blue-green deployment for zero downtime

## Timeline

### Phase 1: Staging ✅ Complete
- Week 1: Setup GitHub Pages
- Status: Live and accessible

### Phase 2: Platform Selection ⏳ In Progress
- Week 2-3: Evaluate options
- Week 3-4: Make decision
- Requirements gathering ongoing

### Phase 3: Production Deployment 🔜 Upcoming
- Week 5-6: Platform setup
- Week 7: Migration and testing
- Week 8: Launch

## Support & Maintenance

### Staging
- Minimal maintenance required
- Content updates via Git commits
- No backend to maintain

### Production
- Regular security updates
- Database maintenance
- Performance optimization
- Backup verification
- Incident response plan

## Accessibility Compliance

### Staging ✅
- WCAG 2.1 Level AAA
- Screen reader tested
- Keyboard navigation
- High contrast mode
- Visual indicators

### Production
- Maintain WCAG 2.1 AAA
- Regular accessibility audits
- User feedback integration
- Assistive technology testing

## Next Steps

1. **Immediate**:
   - ✅ Deploy staging to GitHub Pages
   - ✅ Create accessibility showcase
   - ✅ Document deployment strategy

2. **Short-term** (1-2 weeks):
   - Gather production requirements
   - Evaluate platform options
   - Cost-benefit analysis
   - Make platform decision

3. **Medium-term** (1 month):
   - Set up production environment
   - Configure CI/CD pipeline
   - Security hardening
   - Load testing

4. **Long-term** (ongoing):
   - Monitor and optimize
   - Regular security audits
   - Feature enhancements
   - Scalability improvements

## Contact & Decision Making

Production deployment platform will be determined based on:
- Project timeline
- Budget allocation
- Technical requirements
- Client preferences
- Scalability needs

Decision to be made at project creation time with stakeholder input.

---

**Current Status**: 
- 🟢 Staging: Active on GitHub Pages
- 🟡 Production: Coming Soon (Platform TBD)
