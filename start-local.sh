#!/bin/bash

# Local Development Startup Script
# This script starts the Appello Task Management application locally

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🚀 Starting Appello Task Management - Local Development${NC}"

# Kill any existing processes
echo -e "${YELLOW}🧹 Cleaning up existing processes...${NC}"
pkill -f "nodemon.*task-management" 2>/dev/null || true
pkill -f "vite.*task-management" 2>/dev/null || true
pkill -f "concurrently.*task-management" 2>/dev/null || true
sleep 2

# Set environment variables
export MONGODB_URI="mongodb+srv://Vercel-Admin-appello-prototype-db:YEkttUnBkYYGtTfq@appello-prototype-db.nrral5a.mongodb.net/appello-tasks-prod?retryWrites=true&w=majority"
export JWT_SECRET="your-super-secret-jwt-key-for-local-development"
export NODE_ENV="development"
export PORT="3001"

echo -e "${BLUE}📡 Environment Configuration:${NC}"
echo "  - MongoDB: Connected to production database"
echo "  - JWT Secret: Set"
echo "  - Node Environment: development"
echo "  - Server Port: 3001"
echo "  - Client Port: 3000"

# Start the application
echo -e "${BLUE}🎯 Starting development servers...${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop all servers${NC}"
echo ""

# Start both servers using the npm script
npm run dev
