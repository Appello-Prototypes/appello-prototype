# MongoDB Atlas Setup Guide

This guide explains how to configure MongoDB Atlas for both local development and Vercel production deployments.

## Quick Start Checklist

- [ ] Create `.env.local` file with `MONGODB_URI`
- [ ] Verify MongoDB Atlas Network Access allows your IP (or 0.0.0.0/0 for development)
- [ ] Set `MONGODB_URI` in Vercel environment variables
- [ ] Test local connection: `npm run dev` and visit `http://localhost:3001/api/health`
- [ ] Test production: Push to GitHub and verify Vercel deployment works

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB Atlas connection string | `mongodb+srv://user:pass@cluster.mongodb.net/db?retryWrites=true&w=majority` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3001` |
| `NODE_ENV` | Environment mode | `development` |
| `JWT_SECRET` | JWT signing secret | Required for auth |
| `SOCKET_IO_ORIGINS` | Allowed WebSocket origins | `http://localhost:3000` |

## Local Development Setup

### Step 1: Create `.env.local` File

Copy the example file:
```bash
cp .env.local.example .env.local
```

Edit `.env.local` and set your `MONGODB_URI`:
```bash
MONGODB_URI=mongodb+srv://username:password@cluster-name.mongodb.net/database-name?retryWrites=true&w=majority
```

### Step 2: Get MongoDB Atlas Connection String

1. Log in to [MongoDB Atlas](https://cloud.mongodb.com/)
2. Navigate to your cluster
3. Click **Connect** → **Connect your application**
4. Copy the connection string
5. Replace `<password>` with your database user password
6. Replace `<dbname>` with your database name (e.g., `appello-tasks-prod`)

### Step 3: Configure Network Access

**For Local Development:**
- Go to Atlas Dashboard → **Network Access**
- Click **Add IP Address**
- Click **Allow Access from Anywhere** (0.0.0.0/0) for development, OR
- Add your current IP address specifically

**Security Note:** Using 0.0.0.0/0 allows access from anywhere. For production, restrict to specific IPs or Vercel's IP ranges.

### Step 4: Test Local Connection

Start the development server:
```bash
npm run dev
```

Check the console for connection messages:
- ✅ `Connected to MongoDB Atlas` = Success
- ❌ `MongoDB connection error` = Check your URI and network access

Test the health endpoint:
```bash
curl http://localhost:3001/api/health
```

Expected response:
```json
{
  "success": true,
  "message": "Appello Task Management API is running",
  "database": {
    "status": "connected",
    "readyState": 1
  }
}
```

## Vercel Production Setup

### Step 1: Set Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variables:

| Name | Value | Environment |
|------|-------|-------------|
| `MONGODB_URI` | Your MongoDB Atlas connection string | Production, Preview, Development |
| `NODE_ENV` | `production` | Production |
| `JWT_SECRET` | Your JWT secret | Production, Preview, Development |

**Important:** 
- ✅ Set `MONGODB_URI` in Vercel environment variables (NOT in `vercel.json`)
- ❌ Do NOT hardcode MongoDB URI in `vercel.json` (security risk)

### Step 2: Configure MongoDB Atlas Network Access for Vercel

Vercel uses dynamic IPs, so you have two options:

**Option A: Allow All IPs (Easier, Less Secure)**
- Add `0.0.0.0/0` to Network Access list
- ⚠️ Only recommended if your database user has limited permissions

**Option B: Use MongoDB Atlas IP Access List (More Secure)**
- MongoDB Atlas automatically allows Vercel IPs when accessed via serverless functions
- Ensure your connection string uses the correct format

### Step 3: Deploy and Verify

1. Push your code to GitHub:
   ```bash
   git add .
   git commit -m "Configure MongoDB connection"
   git push
   ```

2. Vercel will automatically deploy

3. Check deployment logs in Vercel dashboard for connection messages

4. Test production endpoint:
   ```bash
   curl https://your-app.vercel.app/api/health
   ```

## Troubleshooting

### Local: "MongoDB connection error" or Slow Loading

**Possible Causes:**

1. **Missing `.env.local` file**
   - Solution: Create `.env.local` with `MONGODB_URI`

2. **Incorrect MongoDB URI**
   - Check: Password is URL-encoded (special characters like `@`, `:`, `/` need encoding)
   - Check: Database name matches your Atlas database

3. **Network Access Not Configured**
   - Solution: Add your IP to MongoDB Atlas Network Access

4. **Firewall/VPN Blocking Connection**
   - Solution: Disable VPN or firewall temporarily to test

5. **Connection Timeout**
   - Check: Your internet connection
   - Check: MongoDB Atlas cluster is running (not paused)

**Debug Steps:**
```bash
# Check if .env.local is loaded
node -e "require('dotenv').config(); console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'Set' : 'Missing')"

# Test connection directly
node -e "require('dotenv').config(); const mongoose = require('mongoose'); mongoose.connect(process.env.MONGODB_URI).then(() => { console.log('✅ Connected'); process.exit(0); }).catch(err => { console.error('❌ Error:', err.message); process.exit(1); })"
```

### Production: "Database connection unavailable"

**Possible Causes:**

1. **Environment Variable Not Set in Vercel**
   - Solution: Verify `MONGODB_URI` is set in Vercel dashboard

2. **Network Access Not Configured**
   - Solution: Add `0.0.0.0/0` to MongoDB Atlas Network Access (or specific Vercel IPs)

3. **Connection String Format**
   - Ensure connection string includes `?retryWrites=true&w=majority`

**Debug Steps:**
1. Check Vercel Function Logs in dashboard
2. Look for connection error messages
3. Verify environment variables are set correctly

### Both Environments: Connection Works But Queries Are Slow

**Possible Causes:**

1. **Cold Start (Serverless)**
   - First request after inactivity may be slow (connection establishment)
   - Subsequent requests should be fast

2. **Large Dataset**
   - Add indexes to frequently queried fields
   - Use `.lean()` for read-only queries

3. **Network Latency**
   - Ensure MongoDB Atlas cluster region matches your deployment region

## Connection Pattern Explained

The application uses a **serverless-safe connection pattern**:

- **Local Development**: Connection established on server start, reused for all requests
- **Vercel Serverless**: Connection cached globally, reused across function invocations
- **Connection Pooling**: Max 10 connections, optimized for serverless

This pattern prevents:
- Multiple connections per request (serverless)
- Connection leaks
- Slow cold starts

## Security Best Practices

1. ✅ **Never commit `.env.local`** - Already in `.gitignore`
2. ✅ **Use environment variables** - Not hardcoded in code
3. ✅ **Restrict Network Access** - Use specific IPs when possible
4. ✅ **Use Strong Passwords** - For MongoDB database users
5. ✅ **Rotate Credentials** - Regularly update passwords
6. ✅ **Monitor Access Logs** - Check MongoDB Atlas logs for suspicious activity

## Additional Resources

- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Mongoose Connection Guide](https://mongoosejs.com/docs/connections.html)

