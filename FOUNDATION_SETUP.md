# Foundation Setup - Complete Guide

This guide ensures you have a solid foundation before making improvements to the application.

## ✅ Foundation Checklist

### 1. Database Setup

- [ ] **Separate databases configured**
  - Production: `appello-tasks-prod`
  - Development: `appello-tasks-dev`
  - Run: `node scripts/verify-db-setup.js`

- [ ] **Schema synchronized**
  - Dev database has same structure as prod
  - Run: `npm run db:sync`

- [ ] **Indexes created**
  - All indexes exist in dev database
  - Run: `npm run db:indexes`

### 2. Environment Configuration

- [ ] **Local environment set up**
  - `.env.local` file exists
  - `MONGODB_DEV_URI` points to dev database
  - `MONGODB_URI` points to prod database (read-only)

- [ ] **Production environment configured**
  - Vercel has `MONGODB_URI` set (production database)
  - All required environment variables set
  - Run: `vercel env ls`

### 3. Local Development

- [ ] **Server starts successfully**
  - Run: `npm run dev`
  - Server connects to dev database
  - No connection errors

- [ ] **API endpoints work**
  - Health check: `curl http://localhost:3001/api/health`
  - Returns 200 status
  - Database shows as connected

### 4. Production Deployment

- [ ] **Deployment successful**
  - Code pushed to GitHub
  - Vercel auto-deploys
  - Deployment status: Ready

- [ ] **Production API works**
  - Health check: `curl https://appello-prototype.vercel.app/api/health`
  - Returns 200 status (or 503 if cold start)
  - Database shows as connected

### 5. E2E Testing

- [ ] **Local tests pass**
  - Run: `npm run test:e2e:local`
  - All critical tests pass
  - No timeout errors

- [ ] **Production tests pass**
  - Run: `npm run test:e2e:production`
  - Tests complete successfully
  - Performance metrics acceptable

- [ ] **Comparison report generated**
  - Run: `npm run test:e2e`
  - Comparison report created
  - Environments match (within thresholds)

### 6. Documentation

- [ ] **All documentation reviewed**
  - `DEPLOYMENT_WORKFLOW.md` - Deployment process
  - `DATABASE_SETUP.md` - Database configuration
  - `VERCEL_DEPLOYMENT.md` - Vercel setup
  - `PLAYWRIGHT_TESTING.md` - Testing guide

## Quick Setup Commands

```bash
# 1. Verify database setup
node scripts/verify-db-setup.js

# 2. Sync schema from prod to dev
npm run db:sync

# 3. Create indexes
npm run db:indexes

# 4. Start local development
npm run dev

# 5. Test local environment
npm run test:e2e:local

# 6. Test production environment
npm run test:e2e:production

# 7. Test both and compare
npm run test:e2e
```

## Current Status

Run this to check your foundation status:

```bash
# Check database setup
node scripts/verify-db-setup.js

# Check local server
curl http://localhost:3001/api/health

# Check production
curl https://appello-prototype.vercel.app/api/health

# Run all tests
npm run test:e2e
```

## Next Steps After Foundation is Ready

Once all checklist items are complete:

1. ✅ **Start making improvements** - Safe to modify code
2. ✅ **Test locally first** - Always test in dev before deploying
3. ✅ **Run E2E tests** - Verify changes work in both environments
4. ✅ **Deploy confidently** - Foundation ensures safe deployments

## Troubleshooting

### Database Issues

**Problem**: "Production and Development use the same database"

**Solution**:
1. Create `appello-tasks-dev` in MongoDB Atlas
2. Update `.env.local` with `MONGODB_DEV_URI`
3. Run `node scripts/verify-db-setup.js`

### API Issues

**Problem**: API returns 503

**Solution**:
1. Check database connection
2. Verify environment variables
3. Check MongoDB Atlas network access
4. Review server logs

### Test Failures

**Problem**: E2E tests fail

**Solution**:
1. Ensure local server is running (`npm run dev`)
2. Verify database connections
3. Check environment variables
4. Review test logs and screenshots

## Foundation Principles

1. **Safety First** - Never modify production from local
2. **Test Everything** - Use E2E tests to verify changes
3. **Keep in Sync** - Regular schema synchronization
4. **Document Changes** - Update docs with improvements
5. **Monitor Performance** - Track metrics over time

## Support

If you encounter issues:

1. Check the relevant documentation:
   - Database: `DATABASE_SETUP.md`
   - Deployment: `DEPLOYMENT_WORKFLOW.md`
   - Testing: `PLAYWRIGHT_TESTING.md`

2. Run verification scripts:
   - `node scripts/verify-db-setup.js`
   - `npm run test:e2e`

3. Review logs:
   - Local: Server console output
   - Production: Vercel function logs

