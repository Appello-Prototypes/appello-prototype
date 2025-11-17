#!/bin/bash

# Quick Deployment Script - Uses Vercel's MongoDB Integration
# This is the easier approach using Vercel's marketplace integration

set -e

echo "🚀 Quick Deployment for Appello Task Management"
echo "This script will deploy to Vercel and guide you through MongoDB setup"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[ACTION NEEDED]${NC} $1"
}

# Check Vercel CLI
if ! command -v vercel &> /dev/null; then
    print_info "Installing Vercel CLI..."
    npm install -g vercel
fi

# Deploy to Vercel
print_info "Deploying to Vercel..."

# Login if needed
if ! vercel whoami &> /dev/null; then
    print_warning "Please log in to Vercel:"
    vercel login
fi

# Deploy
print_info "Deploying your application..."
vercel --prod --yes

print_success "🎉 Application deployed to Vercel!"

echo ""
print_warning "NEXT STEPS - MongoDB Setup:"
echo "1. Go to https://vercel.com/dashboard"
echo "2. Select your 'appello-prototype' project"
echo "3. Go to 'Integrations' tab"
echo "4. Search for 'MongoDB Atlas' and click 'Add Integration'"
echo "5. Follow the setup wizard to:"
echo "   - Create a free MongoDB Atlas account (if needed)"
echo "   - Create a new cluster"
echo "   - Automatically set the MONGODB_URI environment variable"
echo ""
print_warning "ADDITIONAL ENVIRONMENT VARIABLES NEEDED:"
echo "Go to Project Settings > Environment Variables and add:"
echo "- JWT_SECRET: $(openssl rand -base64 64)"
echo "- JWT_EXPIRES_IN: 7d"
echo "- NODE_ENV: production"
echo ""
print_info "After adding environment variables, your app will automatically redeploy!"
print_success "Your team will be able to access the app at your Vercel URL"
