# How to Delete the `appello-prototype` Vercel Project

## Steps to Delete the Project

### Option 1: Via Vercel Dashboard (Recommended)

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/dashboard
   - Sign in if needed

2. **Find the Project**
   - Look for the project named **`appello-prototype`**
   - Click on it to open the project

3. **Go to Settings**
   - Click on **Settings** tab (top navigation)
   - Scroll down to the bottom of the settings page

4. **Delete the Project**
   - Find the **"Delete Project"** section (usually at the very bottom)
   - Click **"Delete"** button
   - You'll be asked to confirm by typing the project name: `appello-prototype`
   - Type it and confirm deletion

### Option 2: Via Vercel CLI

```bash
# List all projects
vercel projects ls

# Delete the specific project
vercel projects rm appello-prototype
```

## After Deletion

Once deleted:
- ✅ The URL `https://appello-prototype.vercel.app` will stop working
- ✅ All deployments for that project will be removed
- ✅ The project will no longer auto-deploy from GitHub

## Verify GitHub Connection

After deleting, make sure your **`task-management`** project is connected to GitHub:

1. Go to Vercel Dashboard → **`task-management`** project
2. Click **Settings** → **Git**
3. Verify it shows:
   - **Repository**: `Appello-Prototypes/appello-prototype`
   - **Production Branch**: `main`
   - **Auto-deploy**: Enabled

If it's not connected:
1. Click **"Connect Git Repository"**
2. Select `Appello-Prototypes/appello-prototype`
3. Configure:
   - **Root Directory**: `/` (or leave default)
   - **Framework Preset**: Other
   - **Build Command**: `npm run vercel-build`
   - **Output Directory**: `src/client/dist`
4. Click **"Deploy"**

## Production URL

After deletion, your single production URL will be:
- **Production**: https://task-management-kappa-plum.vercel.app
- **Health Check**: https://task-management-kappa-plum.vercel.app/api/health

## Notes

- Deleting a Vercel project is **permanent** and cannot be undone
- All environment variables for that project will be deleted
- If you need them later, you'll need to recreate the project and set env vars again
- The GitHub repository will remain unchanged

