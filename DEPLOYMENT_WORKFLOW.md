# End-to-End Deployment Workflow

This document outlines the complete deployment workflow that ensures database synchronization, proper testing, and safe deployments.

## Architecture Overview

### Database Strategy

- **Production Database**: `appello-tasks-prod` (used by Vercel production)
- **Development Database**: `appello-tasks-dev` (used for local development)
- **Test Database**: `appello-tasks-test` (for automated tests)

### Key Principles

1. **Never modify production data from local development**
2. **Keep schemas synchronized** between dev and prod
3. **Test everything locally** before deploying
4. **Use E2E tests** to verify both environments match
5. **Sync schema changes** from production to development

## Workflow Stages

### Stage 1: Local Development

```bash
# 1. Ensure you're using the development database
# Check .env.local has MONGODB_DEV_URI set
cat .env.local | grep MONGODB_DEV_URI

# 2. Start local development server
npm run dev

# 3. Make your changes
# - Code changes
# - Schema changes (if any)
# - Test locally
```

### Stage 2: Schema Synchronization

After making schema changes or when setting up a new environment:

```bash
# Sync schema from production to development
# This ensures dev database has the same structure as prod
node scripts/sync-db-schema.js prod-to-dev

# Or create/update indexes in development
node scripts/create-indexes.js
```

**Important**: Always sync FROM production TO development, never the reverse.

### Stage 3: Local Testing

```bash
# Run E2E tests against local environment
npm run test:e2e:local

# Verify all tests pass
# Check for any console errors
# Verify API endpoints work
```

### Stage 4: Commit and Push

```bash
# Commit your changes
git add .
git commit -m "Your descriptive commit message"

# Push to GitHub
git push origin main
```

### Stage 5: Production Deployment

Vercel automatically deploys from GitHub:

1. **GitHub receives push** → Triggers Vercel deployment
2. **Vercel builds** → Runs `npm run vercel-build`
3. **Vercel deploys** → Uses production environment variables
4. **Production uses** → `MONGODB_URI` (production database)

### Stage 6: Production Testing

```bash
# Run E2E tests against production
npm run test:e2e:production

# Verify production deployment
curl https://appello-prototype.vercel.app/api/health
```

### Stage 7: Verification

```bash
# Run full E2E test suite (both environments)
npm run test:e2e

# Review comparison report
cat test-results/comparison-report.json

# Verify environments match
# - Same API responses
# - Similar performance
# - No errors
```

## Database Sync Process

### When to Sync

1. **After schema changes** in production
2. **When setting up** a new development environment
3. **After migrations** or index changes
4. **Before major development** work

### How to Sync

```bash
# Sync schema (indexes, structure) from prod to dev
node scripts/sync-db-schema.js prod-to-dev

# Create/update indexes in development
node scripts/create-indexes.js
```

### What Gets Synced

- ✅ **Indexes** - All database indexes
- ✅ **Collection structure** - Collection names and basic structure
- ❌ **Data** - NO data is copied (schemas only)
- ❌ **Validation rules** - May need manual sync

### Safety Checks

The sync script:
- ✅ Never modifies production database
- ✅ Only syncs FROM prod TO dev
- ✅ Creates indexes safely (background mode)
- ✅ Skips system collections
- ✅ Logs all operations

## Environment Variables

### Local Development (.env.local)

```bash
# Development database (used for local dev)
MONGODB_DEV_URI=mongodb+srv://.../appello-tasks-dev

# Production database (read-only, for schema sync)
MONGODB_URI=mongodb+srv://.../appello-tasks-prod

NODE_ENV=development
JWT_SECRET=your-dev-secret
```

### Production (Vercel)

```bash
# Production database (used by Vercel)
MONGODB_URI=mongodb+srv://.../appello-tasks-prod

NODE_ENV=production
JWT_SECRET=your-production-secret
```

## E2E Testing Strategy

### Test Execution

```bash
# Test local environment only
npm run test:e2e:local

# Test production environment only
npm run test:e2e:production

# Test both environments and compare
npm run test:e2e
```

### What Tests Verify

1. **API Health** - Endpoints respond correctly
2. **Page Loading** - All routes load successfully
3. **Performance** - Load times within thresholds
4. **Functionality** - Features work in both environments
5. **Consistency** - Environments behave similarly

### Comparison Reports

After running full test suite:
- `test-results/comparison-results.json` - Raw test data
- `test-results/comparison-report.json` - Generated comparison

## Pre-Deployment Checklist

Before deploying to production:

- [ ] All local tests pass (`npm run test:e2e:local`)
- [ ] Schema synced from prod to dev (`node scripts/sync-db-schema.js`)
- [ ] Code committed and pushed to GitHub
- [ ] Environment variables verified in Vercel
- [ ] No console errors in local development
- [ ] API endpoints tested locally
- [ ] Database indexes created (`node scripts/create-indexes.js`)

## Post-Deployment Checklist

After deployment:

- [ ] Production deployment successful (check Vercel dashboard)
- [ ] Production health check passes (`/api/health`)
- [ ] E2E tests pass for production (`npm run test:e2e:production`)
- [ ] Comparison report shows environments match
- [ ] No errors in Vercel function logs
- [ ] Performance metrics acceptable

## Troubleshooting

### Schema Out of Sync

**Symptoms**: Local queries fail, indexes missing, validation errors

**Solution**:
```bash
node scripts/sync-db-schema.js prod-to-dev
node scripts/create-indexes.js
```

### Production API Errors

**Symptoms**: 503 errors, database connection failures

**Solution**:
1. Check Vercel environment variables
2. Verify `MONGODB_URI` is set correctly
3. Check MongoDB Atlas network access
4. Review Vercel function logs

### E2E Tests Failing

**Symptoms**: Tests timeout, API calls fail

**Solution**:
1. Ensure local server is running (`npm run dev`)
2. Check database connections
3. Verify environment variables
4. Review test logs and screenshots

## Best Practices

1. **Always sync FROM prod TO dev** - Never reverse
2. **Test locally first** - Don't deploy untested code
3. **Use E2E tests** - Verify both environments match
4. **Review comparison reports** - Catch discrepancies early
5. **Keep schemas in sync** - Run sync script regularly
6. **Monitor production** - Check logs after deployment
7. **Document changes** - Note schema changes in commits

## Quick Reference

```bash
# Start local development
npm run dev

# Sync schema from prod to dev
node scripts/sync-db-schema.js prod-to-dev

# Create indexes
node scripts/create-indexes.js

# Test local
npm run test:e2e:local

# Test production
npm run test:e2e:production

# Test both and compare
npm run test:e2e

# Deploy to production
git push origin main  # Auto-deploys via Vercel
```

## Database Setup Commands

### Initial Setup

```bash
# 1. Create development database in MongoDB Atlas
#    - Use same cluster as production
#    - Name it: appello-tasks-dev

# 2. Set up local environment
cp env.local.example .env.local
# Edit .env.local with MONGODB_DEV_URI

# 3. Sync schema from production
node scripts/sync-db-schema.js prod-to-dev

# 4. Create indexes
node scripts/create-indexes.js

# 5. Seed development database (optional)
npm run seed
```

## Continuous Integration

For CI/CD pipelines:

1. **On Pull Request**:
   - Run `npm run test:e2e:local`
   - Verify schema is synced

2. **On Merge to Main**:
   - Auto-deploy to Vercel
   - Run `npm run test:e2e:production`
   - Generate comparison report

3. **Weekly**:
   - Sync schema from prod to dev
   - Review performance metrics
   - Update indexes if needed

