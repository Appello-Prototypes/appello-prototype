# Database Setup Guide

This guide walks you through setting up separate development and production databases.

## Overview

We use **separate databases** for development and production:
- **Production**: `appello-tasks-prod` (used by Vercel)
- **Development**: `appello-tasks-dev` (used for local development)

This ensures:
- ✅ Safety - Local changes don't affect production
- ✅ Testing - Can test destructive operations safely
- ✅ Freedom - Can seed/reset development data freely

## Step 1: Create Development Database in MongoDB Atlas

1. **Log into MongoDB Atlas**: https://cloud.mongodb.com/
2. **Navigate to your cluster**: `appello-prototype-db`
3. **Go to Collections** → Click **"Create Database"**
4. **Database Name**: `appello-tasks-dev`
5. **Collection Name**: (leave empty, will be created automatically)
6. **Click "Create"**

The database will be created on the same cluster as production (no extra cost).

## Step 2: Configure Local Environment

1. **Copy the example file**:
   ```bash
   cp env.local.example .env.local
   ```

2. **Edit `.env.local`** and set:
   ```bash
   # Development database (for local development)
   MONGODB_DEV_URI=mongodb+srv://Vercel-Admin-appello-prototype-db:YEkttUnBkYYGtTfq@appello-prototype-db.nrral5a.mongodb.net/appello-tasks-dev?retryWrites=true&w=majority
   
   # Production database (read-only, for schema sync)
   MONGODB_URI=mongodb+srv://Vercel-Admin-appello-prototype-db:YEkttUnBkYYGtTfq@appello-prototype-db.nrral5a.mongodb.net/appello-tasks-prod?retryWrites=true&w=majority
   ```

   **Important**: Replace the connection string with your actual MongoDB Atlas connection string if different.

## Step 3: Sync Schema from Production

After creating the dev database, sync the schema (indexes, structure) from production:

```bash
npm run db:sync
```

This will:
- Copy all indexes from production to development
- Ensure both databases have the same structure
- **NOT copy any data** (schemas only)

## Step 4: Create Indexes

Create all necessary indexes in the development database:

```bash
npm run db:indexes
```

## Step 5: Verify Setup

Verify both databases are configured correctly:

```bash
node scripts/verify-db-setup.js
```

You should see:
- ✅ Production database connected
- ✅ Development database connected
- ✅ They use different database names

## Step 6: Seed Development Database (Optional)

If you want test data in development:

```bash
npm run seed
```

**Note**: This will only seed the database specified in `MONGODB_DEV_URI`.

## Verification Checklist

- [ ] Development database created in MongoDB Atlas
- [ ] `.env.local` file created with `MONGODB_DEV_URI`
- [ ] Schema synced from production (`npm run db:sync`)
- [ ] Indexes created (`npm run db:indexes`)
- [ ] Setup verified (`node scripts/verify-db-setup.js`)
- [ ] Local server connects to dev database
- [ ] Production (Vercel) uses prod database

## How It Works

### Local Development

When running `npm run dev`:
- Server checks `NODE_ENV` (should be `development`)
- Uses `MONGODB_DEV_URI` from `.env.local`
- Connects to `appello-tasks-dev` database
- Logs: `🔌 Connecting to DEVELOPMENT database: appello-tasks-dev`

### Production (Vercel)

When deployed to Vercel:
- `NODE_ENV` is `production` or `VERCEL` is set
- Uses `MONGODB_URI` from Vercel environment variables
- Connects to `appello-tasks-prod` database
- Logs: `🔌 Connecting to PRODUCTION database: appello-tasks-prod`

## Keeping Databases in Sync

### When to Sync

- After schema changes in production
- When setting up a new development environment
- After migrations or index changes
- Before major development work

### How to Sync

```bash
# Sync schema from production to development
npm run db:sync

# Or manually:
node scripts/sync-db-schema.js prod-to-dev
```

### What Gets Synced

- ✅ **Indexes** - All database indexes
- ✅ **Collection structure** - Collection names
- ❌ **Data** - NO data is copied
- ❌ **Validation rules** - May need manual attention

## Troubleshooting

### "MONGODB_DEV_URI not set"

**Solution**: Create `.env.local` file with `MONGODB_DEV_URI` set.

### "Production and Development use the same database"

**Solution**: 
1. Create `appello-tasks-dev` database in MongoDB Atlas
2. Update `.env.local` with `MONGODB_DEV_URI` pointing to dev database
3. Run `node scripts/verify-db-setup.js` to verify

### "Connection failed"

**Possible causes**:
1. Database doesn't exist - Create it in MongoDB Atlas
2. Network access not configured - Add your IP to MongoDB Atlas Network Access
3. Wrong connection string - Verify credentials and database name

### "Schema sync failed"

**Solution**:
1. Verify both databases exist
2. Check connection strings are correct
3. Ensure network access allows connections
4. Try creating indexes manually: `npm run db:indexes`

## Best Practices

1. **Always use dev database locally** - Never modify production from local
2. **Sync regularly** - Keep schemas in sync before major work
3. **Test locally first** - Verify changes work in dev before deploying
4. **Use E2E tests** - Verify both environments match
5. **Document schema changes** - Note changes in commit messages

## Quick Reference

```bash
# Verify database setup
node scripts/verify-db-setup.js

# Sync schema from prod to dev
npm run db:sync

# Create indexes
npm run db:indexes

# Start local development (uses dev database)
npm run dev

# Test local environment
npm run test:e2e:local
```

