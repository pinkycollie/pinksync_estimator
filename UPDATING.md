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

Dependabot groups related packages together:
- **radix-ui**: All `@radix-ui/*` packages (UI components)
- **react**: Core React packages (`react`, `react-dom`, `@types/react`, `@types/react-dom`)

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

## Related Documentation

- [CONTRIBUTING.md](CONTRIBUTING.md) - How to contribute to this project
- [SECURITY.md](SECURITY.md) - Security policies and vulnerability reporting
- [IMPROVEMENTS.md](IMPROVEMENTS.md) - Project roadmap and improvements
