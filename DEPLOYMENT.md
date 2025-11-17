# Deployment Guide

## GitHub Repository
This application is deployed from: https://github.com/Appello-Prototypes/appello-prototype.git

## Vercel Deployment

### Environment Variables Required

Before deploying to Vercel, you need to set up the following environment variables in your Vercel dashboard:

#### Required Variables:
```
NODE_ENV=production
PORT=3001
MONGODB_URI=mongodb+srv://your-username:your-password@your-cluster.mongodb.net/appello-tasks-prod
JWT_SECRET=your-production-jwt-secret-key-make-this-very-secure
JWT_EXPIRES_IN=7d
```

#### Optional Variables:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@appello.com
SMTP_PASS=your-email-password
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760
APPELLO_API_BASE_URL=https://api.appello.com
APPELLO_API_KEY=your-appello-api-key
SOCKET_IO_ORIGINS=https://your-vercel-app.vercel.app
LOG_LEVEL=info
LOG_FILE=./logs/app.log
```

### Deployment Steps:

1. **Connect to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Sign in with GitHub
   - Import the repository: `Appello-Prototypes/appello-prototype`

2. **Configure Build Settings:**
   - Framework Preset: Other
   - Build Command: `npm run vercel-build`
   - Output Directory: `src/client/dist`
   - Install Command: `npm install`

3. **Set Environment Variables:**
   - In Vercel dashboard, go to Settings > Environment Variables
   - Add all the required variables listed above

4. **Deploy:**
   - Click "Deploy"
   - Vercel will automatically build and deploy your application

### Database Setup

You'll need a MongoDB database. Options:

1. **MongoDB Atlas (Recommended):**
   - Go to [mongodb.com/atlas](https://mongodb.com/atlas)
   - Create a free cluster
   - Get the connection string
   - Add it as `MONGODB_URI` in Vercel environment variables

2. **Alternative MongoDB Providers:**
   - Railway
   - PlanetScale (with MongoDB compatibility)
   - Self-hosted MongoDB

### Post-Deployment

After successful deployment:

1. **Seed the Database:**
   - You may need to run the seed script manually or create an API endpoint to initialize data
   
2. **Test the Application:**
   - Visit your Vercel URL
   - Test user registration/login
   - Test core functionality

3. **Monitor:**
   - Check Vercel function logs for any issues
   - Monitor database connections

### Troubleshooting

- **Build Failures:** Check the build logs in Vercel dashboard
- **Database Connection Issues:** Verify MONGODB_URI and network access
- **API Errors:** Check function logs in Vercel dashboard
- **Static Files:** Ensure the client build is properly configured

## Local Development

To run locally:

```bash
# Install dependencies
npm install
cd src/client && npm install && cd ../..

# Set up environment
cp env.example .env
# Edit .env with your local configuration

# Run development server
npm run dev
```

## Architecture

- **Frontend:** React + Vite (Static Build)
- **Backend:** Node.js + Express (Serverless Functions)
- **Database:** MongoDB
- **Deployment:** Vercel
- **Real-time:** Socket.io (WebSocket support)
