# Vercel Deployment Guide

This guide documents the complete process for deploying the Task Management application to Vercel production.

## Prerequisites

- Vercel CLI installed (`npm install -g vercel`)
- Logged into Vercel (`vercel login`)
- MongoDB Atlas database configured
- All environment variables ready

## Current Production URL

**Production URL:** https://task-management-kappa-plum.vercel.app

## Environment Variables Checklist

### Required Variables (Production)

These variables MUST be set in Vercel for production:

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `MONGODB_URI` | MongoDB Atlas connection string | `mongodb+srv://user:pass@cluster.mongodb.net/db?retryWrites=true&w=majority` |
| `JWT_SECRET` | Secret key for JWT tokens | Strong random string (64+ characters) |
| `JWT_EXPIRES_IN` | JWT token expiration | `7d` |
| `SOCKET_IO_ORIGINS` | Allowed WebSocket origins | `https://task-management-kappa-plum.vercel.app` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SMTP_HOST` | Email server host | `smtp.gmail.com` |
| `SMTP_PORT` | Email server port | `587` |
| `SMTP_USER` | Email username | - |
| `SMTP_PASS` | Email password | - |
| `UPLOAD_PATH` | File upload directory | `./uploads` |
| `MAX_FILE_SIZE` | Max file size in bytes | `10485760` (10MB) |
| `APPELLO_API_BASE_URL` | Main Appello API URL | `https://api.appello.com` |
| `APPELLO_API_KEY` | Appello API key | - |
| `LOG_LEVEL` | Logging level | `info` |
| `CLIENT_URL` | Frontend URL | Auto-detected |

## Deployment Process

### Step 1: Verify Local Environment

```bash
# Ensure you're in the project root
cd /Users/coreyshelson/task-management

# Check Vercel login status
vercel whoami

# Verify project connection
vercel project ls
```

### Step 2: Check Environment Variables

```bash
# List current production environment variables
vercel env ls

# Pull production env vars for comparison (creates .env.production.local)
vercel env pull .env.production.local production
```

### Step 3: Ensure Build Works Locally

```bash
# Install dependencies
npm install
cd src/client && npm install && cd ../..

# Test build
npm run build

# Verify build output exists
ls -la src/client/dist
```

### Step 4: Deploy to Production

```bash
# Deploy to production
vercel --prod

# Or with auto-confirm (non-interactive)
vercel --prod --yes
```

### Step 5: Verify Deployment

1. Check deployment status:
   ```bash
   vercel ls
   ```

2. Visit the production URL:
   - https://task-management-kappa-plum.vercel.app

3. Test API health endpoint:
   ```bash
   curl https://task-management-kappa-plum.vercel.app/api/health
   ```

## Environment Variable Management

### Adding/Updating Environment Variables

```bash
# Add a new environment variable
vercel env add VARIABLE_NAME production

# Update existing variable (remove old, add new)
vercel env rm VARIABLE_NAME production
vercel env add VARIABLE_NAME production
```

### Setting Multiple Variables

For bulk updates, use the Vercel dashboard:
1. Go to https://vercel.com/dashboard
2. Select project: `task-management`
3. Go to Settings > Environment Variables
4. Add/Edit variables as needed
5. Redeploy: `vercel --prod`

## Build Configuration

The project uses `vercel.json` for configuration:

- **Build Command:** `npm run vercel-build` (runs `npm run build:client`)
- **Output Directory:** `src/client/dist`
- **Serverless Functions:** `src/server/index.js` handles all `/api/*` routes
- **Static Files:** Served from `src/client/dist`

## Post-Deployment Checklist

- [ ] Verify production URL is accessible
- [ ] Test API endpoints (`/api/health`)
- [ ] Test authentication flow
- [ ] Verify MongoDB connection (check logs)
- [ ] Test WebSocket connections (if applicable)
- [ ] Verify CORS settings work correctly
- [ ] Check Vercel function logs for errors

## Troubleshooting

### Build Failures

1. Check build logs in Vercel dashboard
2. Verify `package.json` scripts are correct
3. Ensure `src/client/package.json` exists and has build script
4. Check for missing dependencies

### Environment Variable Issues

1. Verify variables are set for `production` environment
2. Check variable names match exactly (case-sensitive)
3. Ensure no extra spaces or quotes in values
4. Redeploy after adding variables: `vercel --prod`

### Database Connection Issues

1. Verify `MONGODB_URI` is correct
2. Check MongoDB Atlas Network Access allows Vercel IPs (0.0.0.0/0)
3. Verify database user has correct permissions
4. Check connection string format

### CORS Issues

1. Verify `SOCKET_IO_ORIGINS` includes production URL
2. Check `CLIENT_URL` matches production URL
3. Review CORS configuration in `src/server/index.js`

## Quick Deploy Command

For a quick production deployment:

```bash
# One-liner: build, verify, deploy
npm run build && vercel --prod --yes
```

## Local vs Production Sync

To ensure local matches production:

1. **Pull production env vars:**
   ```bash
   vercel env pull .env.production.local production
   ```

2. **Compare with local `.env`:**
   ```bash
   diff .env .env.production.local
   ```

3. **Note:** Never commit `.env.production.local` to git (it's in `.gitignore`)

## Database Setup Scripts

After deployment, you may need to run database setup scripts:

```bash
# These scripts should be run via API endpoints or MongoDB Atlas shell
# Available scripts in /scripts directory:
# - create-indexes.js
# - seed.js
# - init-production-db.js
```

## Monitoring

- **Vercel Dashboard:** https://vercel.com/dashboard
- **Function Logs:** Available in Vercel dashboard under project > Functions
- **Analytics:** Available in Vercel dashboard under project > Analytics

## Rollback

If deployment fails:

```bash
# List recent deployments
vercel ls

# Promote a previous deployment
vercel promote <deployment-url>
```

## Next Steps After Deployment

1. Test all critical user flows
2. Monitor error logs for 24-48 hours
3. Set up monitoring/alerts if needed
4. Document any production-specific configurations
5. Update team on deployment status

