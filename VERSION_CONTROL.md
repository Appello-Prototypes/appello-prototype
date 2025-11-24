# Version Control Process for Appello Lab

This document describes the formal version control and deployment process for Appello Lab.

## Version Format

Appello Lab uses **Semantic Versioning** (SemVer) with the format: `major.minor.patch`

- **Major** (X.0.0): Breaking changes, major feature additions
- **Minor** (0.X.0): New features, backward compatible
- **Patch** (0.0.X): Bug fixes, minor improvements

## Version Management Scripts

### Getting Current Version

```bash
npm run version:get
# or
node scripts/version.js get
```

### Incrementing Versions

```bash
# Increment patch version (1.1.0 → 1.1.1)
npm run version:patch

# Increment minor version (1.1.0 → 1.2.0)
npm run version:minor

# Increment major version (1.1.0 → 2.0.0)
npm run version:major
```

### Setting Specific Version

```bash
npm run version:set 1.2.3
# or
node scripts/version.js set 1.2.3
```

## Release Process

### Preparing a Release

The `prepare-release.js` script automates the release preparation process:

```bash
# Prepare patch release (bug fixes)
npm run release:patch

# Prepare minor release (new features)
npm run release:minor

# Prepare major release (breaking changes)
npm run release:major
```

### What the Release Script Does

1. **Checks for uncommitted changes** - Ensures working directory is clean
2. **Checks current branch** - Warns if not on main/master
3. **Increments version** - Updates `package.json` version
4. **Creates git commit** - Commits version change with message: `chore: bump version to X.Y.Z`
5. **Creates git tag** - Creates annotated tag: `vX.Y.Z` with message: `Release X.Y.Z`
6. **Provides next steps** - Instructions for pushing to GitHub

### Complete Release Workflow

1. **Make your changes** locally
2. **Test thoroughly** with dev database:
   ```bash
   npm run test:e2e:local
   ```
3. **Commit your changes**:
   ```bash
   git add .
   git commit -m "feat: description of changes"
   ```
4. **Prepare the release**:
   ```bash
   npm run release:patch  # or :minor or :major
   ```
5. **Push to GitHub**:
   ```bash
   git push origin main
   git push origin v1.2.3  # Replace with actual version tag
   ```
6. **Vercel auto-deploys** from GitHub
7. **Verify deployment**:
   ```bash
   npm run test:e2e:production
   ```

## Version Display

The application displays the current version in:

1. **Sidebar header** - Shows version and environment
2. **Top navigation bar** - Shows version badge
3. **API endpoint** - `/api/version` returns version info

## Version Information API

The `/api/version` endpoint returns:

```json
{
  "success": true,
  "version": "1.2.3",
  "environment": "production",
  "buildTime": "2024-01-01T00:00:00.000Z",
  "nodeEnv": "production",
  "vercel": true
}
```

## Best Practices

### When to Increment Versions

- **Patch**: Bug fixes, typo corrections, minor UI improvements
- **Minor**: New features, new API endpoints, new pages/components
- **Major**: Breaking API changes, database schema changes, major refactoring

### Version Commit Messages

The release script automatically creates commits with the format:
```
chore: bump version to X.Y.Z
```

### Tagging

Always push tags after creating a release:
```bash
git push origin v1.2.3
```

### Pre-Release Checklist

- [ ] All tests pass locally
- [ ] Database schema synced (if changed)
- [ ] Documentation updated
- [ ] Version incremented
- [ ] Git tag created
- [ ] Changes pushed to GitHub
- [ ] Production deployment verified

## Troubleshooting

### Version Not Updating

If the version doesn't appear to update:

1. Check `package.json` - Verify version field
2. Check API endpoint - `/api/version` should return new version
3. Clear browser cache - Hard refresh (Cmd+Shift+R / Ctrl+Shift+R)
4. Check Vercel deployment - Verify environment variables

### Release Script Fails

If the release script fails:

1. **Uncommitted changes**: Commit or stash your changes first
2. **Wrong branch**: Switch to main/master branch
3. **Git not initialized**: Ensure you're in a git repository
4. **Package.json missing**: Ensure `package.json` exists in project root

## Integration with Deployment

### Vercel Auto-Deployment

Vercel automatically deploys when you push to GitHub. The version is read from `package.json` at build time.

### Environment Detection

The application automatically detects the environment:
- **Development**: `localhost` or `NODE_ENV=development`
- **Production**: Vercel deployment or `NODE_ENV=production`

## Version History

Track version history in:
- Git tags: `git tag -l`
- GitHub Releases: Create releases from tags
- CHANGELOG.md: Document changes per version (optional)

## Example Workflow

```bash
# 1. Make changes
git checkout -b feature/new-dashboard
# ... make changes ...

# 2. Test locally
npm run test:e2e:local

# 3. Commit changes
git add .
git commit -m "feat: add enhanced dashboard metrics"
git push origin feature/new-dashboard

# 4. Merge to main (via PR)
git checkout main
git merge feature/new-dashboard

# 5. Prepare minor release
npm run release:minor

# 6. Push to GitHub
git push origin main
git push origin v1.2.0

# 7. Verify deployment
npm run test:e2e:production
```

## Scripts Reference

| Script | Command | Description |
|--------|---------|-------------|
| Get version | `npm run version:get` | Display current version |
| Patch increment | `npm run version:patch` | Increment patch version |
| Minor increment | `npm run version:minor` | Increment minor version |
| Major increment | `npm run version:major` | Increment major version |
| Set version | `npm run version:set 1.2.3` | Set specific version |
| Prepare patch release | `npm run release:patch` | Full patch release workflow |
| Prepare minor release | `npm run release:minor` | Full minor release workflow |
| Prepare major release | `npm run release:major` | Full major release workflow |

