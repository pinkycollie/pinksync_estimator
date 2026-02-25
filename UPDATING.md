# Keeping Dependencies Up to Date

This document explains how dependencies and files in this repository are kept up to date.

## Automated Updates with Dependabot

This repository uses [GitHub Dependabot](https://docs.github.com/en/code-security/dependabot) to automatically create pull requests when dependencies have updates available.

### How It Works

1. **Weekly Scans**: Dependabot runs every Monday to check for outdated dependencies
2. **Automatic PRs**: When updates are found, Dependabot creates pull requests
3. **Grouped Updates**: Related packages are grouped together to reduce PR noise

### What Dependabot Monitors

| Ecosystem | Directory | Labels |
|-----------|-----------|--------|
| npm (JavaScript/TypeScript) | `/` | `dependencies`, `javascript` |
| pip (Python) | `/` | `dependencies`, `python` |
| GitHub Actions | `/` | `dependencies`, `github-actions` |

### Package Groups

Dependabot groups related packages together to reduce PR noise and ensure compatible updates:

**npm packages:**
- **radix-ui**: All `@radix-ui/*` packages (UI components)
- **react**: Core React packages (`react`, `react-dom`, `@types/react`, `@types/react-dom`)
- **ai-packages**: AI/ML packages (`@anthropic-ai/*`, `@huggingface/*`, `openai`)
- **database**: Database packages (`@datastax/*`, `@neondatabase/*`, `drizzle-*`)
- **typescript-tooling**: TypeScript and build tools (`typescript`, `@types/node`, `tsx`, `esbuild`)
- **dev-minor**: Development dependencies (minor and patch updates only)

**Python packages:**
- **flask**: Flask and web packages (`flask*`, `gunicorn`)
- **testing**: Testing packages (`pytest*`)

## Manual Dependency Updates

### Checking for Outdated Packages

To see which npm packages are outdated:

```bash
npm outdated
```

To see which Python packages are outdated:

```bash
pip list --outdated
```

### Updating npm Dependencies

Update all packages to their latest versions within semver ranges:

```bash
npm update
```

Update a specific package:

```bash
npm update <package-name>
```

Update to the latest version (may include breaking changes):

```bash
npm install <package-name>@latest
```

### Updating Python Dependencies

Update all packages:

```bash
pip install --upgrade -r requirements.txt
```

Or if using `uv`:

```bash
uv sync --upgrade
```

## Best Practices for Updating

1. **Review Changelogs**: Before updating major versions, review the package's changelog for breaking changes

2. **Test After Updates**: After updating dependencies, run:
   ```bash
   npm run check  # TypeScript type checking
   npm run build  # Build the project
   ```

3. **Update Lock Files**: Commit both `package.json` and `package-lock.json` together

4. **Handle Breaking Changes**: For major version updates:
   - Create a dedicated branch
   - Read migration guides
   - Update code as needed
   - Test thoroughly before merging

## Handling Dependabot PRs

When Dependabot creates a pull request:

1. **Review the Changes**: Check the PR description for release notes and changelogs
2. **Check CI Status**: Ensure all CI checks pass
3. **Test Locally** (for major updates): Pull the branch and test locally if needed
4. **Merge**: If everything looks good, merge the PR

## Security Updates

For security vulnerabilities:

- Dependabot Security Advisories will create high-priority PRs
- These should be reviewed and merged promptly
- CodeQL scans run on each PR to catch potential security issues

## Keeping Documentation Up to Date

Documentation files should be updated when:

- New features are added
- APIs change
- Dependencies with significant updates are merged
- New workflows or processes are introduced

## Troubleshooting

### Dependabot PRs Failing

If Dependabot PRs consistently fail:

1. Check the CI logs for specific errors
2. Consider if the update requires code changes
3. You may need to manually update and fix compatibility issues

### Conflicting Updates

If multiple package updates conflict:

1. Update packages together in a single PR
2. Test the combination of updates before merging

## Cost Considerations for Updates

Before upgrading tools, frameworks, or dependencies, evaluate the costs involved to make informed decisions.

### Before Updating: Assessment Costs

| Cost Category | Description | Estimate Time |
|---------------|-------------|---------------|
| **Research** | Review changelogs, breaking changes, migration guides | 1-4 hours per major update |
| **Compatibility Check** | Verify compatibility with existing codebase and other dependencies | 1-2 hours |
| **Risk Assessment** | Evaluate security implications and stability | 30 min - 1 hour |

### During Update: Implementation Costs

| Cost Category | Description | Estimate Time |
|---------------|-------------|---------------|
| **Minor/Patch Updates** | Usually seamless, minimal changes needed | 15-30 minutes |
| **Major Version Updates** | May require code refactoring, API changes | 2-8 hours |
| **Framework Migration** | Complete rewrite of affected components | 1-5 days |
| **Testing** | Manual and automated testing after updates | 1-4 hours |
| **CI/CD Updates** | Update workflows, build configurations | 30 min - 2 hours |

### After Update: Maintenance Costs

| Cost Category | Description | Frequency |
|---------------|-------------|-----------|
| **Bug Fixes** | Address issues introduced by updates | As needed |
| **Performance Tuning** | Optimize for new version features | One-time |
| **Documentation Updates** | Update internal docs and guides | One-time |
| **Team Training** | Familiarize team with new APIs/features | One-time |

### Cost-Benefit Analysis Template

Before making significant updates, use this template to document your analysis.
Fill in time estimates using ranges (e.g., "2-4 hours") and check the appropriate options:

```
Update: [Package/Framework Name] v[Old] → v[New]

COSTS:
- Development time: ___ hours (e.g., 2-4 hours)
- Testing time: ___ hours (e.g., 1-2 hours)
- Risk of breaking changes: Low / Medium / High
- Rollback complexity: Easy / Moderate / Complex

BENEFITS:
- Security fixes: Yes / No
- Performance improvements: Yes / No (estimate: __%)
- New features needed: Yes / No
- Maintenance/support: Active / Deprecated
- Bundle size change: +/- __ KB

DECISION: Proceed / Defer / Skip
REASON: ___________________________
```

### Infrastructure Cost Impacts

Some updates may affect hosting or service costs:

| Update Type | Potential Cost Impact |
|-------------|----------------------|
| **Node.js version upgrade** | May require updated hosting plan |
| **Database driver updates** | Usually neutral |
| **AI/ML package updates** | Check API pricing changes |
| **Build tool updates** | May affect CI/CD minutes |

### Recommended Update Cadence

| Update Type | Frequency | Priority |
|-------------|-----------|----------|
| **Security patches** | Immediately | Critical |
| **Bug fixes (patch)** | Weekly | High |
| **Minor features** | Monthly | Medium |
| **Major versions** | Quarterly review | Plan carefully |

### Tracking Update Costs

For significant updates, document in your PR:

1. **Time spent** on research and implementation
2. **Issues encountered** and how they were resolved
3. **Performance impact** (before/after metrics if applicable)
4. **Breaking changes** that required code modifications
5. **Lessons learned** for future updates

## Related Documentation

- [CONTRIBUTING.md](CONTRIBUTING.md) - How to contribute to this project
- [SECURITY.md](SECURITY.md) - Security policies and vulnerability reporting
- [IMPROVEMENTS.md](IMPROVEMENTS.md) - Project roadmap and improvements
