#!/bin/bash

# Automated Deployment Script for Appello Task Management
# This script sets up MongoDB Atlas and deploys to Vercel

set -e  # Exit on any error

echo "🚀 Starting automated deployment process..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v vercel &> /dev/null; then
        print_error "Vercel CLI not found. Installing..."
        npm install -g vercel
    fi
    
    if ! command -v atlas &> /dev/null; then
        print_error "MongoDB Atlas CLI not found. Please install it first."
        exit 1
    fi
    
    print_success "All dependencies are installed!"
}

# MongoDB Atlas Setup
setup_mongodb() {
    print_status "Setting up MongoDB Atlas..."
    
    # Check if user is authenticated with Atlas
    if ! atlas auth whoami &> /dev/null; then
        print_warning "You need to authenticate with MongoDB Atlas first."
        print_status "Please run: atlas auth login"
        print_status "Opening authentication in browser..."
        atlas auth login
    fi
    
    # Generate a unique cluster name
    CLUSTER_NAME="appello-task-mgmt-$(date +%s)"
    PROJECT_NAME="Appello Task Management"
    
    print_status "Creating MongoDB Atlas project: $PROJECT_NAME"
    
    # Create project (will use existing if it exists)
    PROJECT_ID=$(atlas projects create "$PROJECT_NAME" --output json 2>/dev/null | jq -r '.id' || atlas projects list --output json | jq -r ".results[] | select(.name == \"$PROJECT_NAME\") | .id")
    
    if [ "$PROJECT_ID" = "null" ] || [ -z "$PROJECT_ID" ]; then
        print_error "Failed to create or find MongoDB Atlas project"
        exit 1
    fi
    
    print_success "Project created/found with ID: $PROJECT_ID"
    
    # Create M0 (free tier) cluster
    print_status "Creating MongoDB cluster: $CLUSTER_NAME"
    atlas clusters create "$CLUSTER_NAME" \
        --provider AWS \
        --region US_EAST_1 \
        --tier M0 \
        --projectId "$PROJECT_ID" \
        --tag env=production \
        --tag app=appello-task-management
    
    # Wait for cluster to be ready
    print_status "Waiting for cluster to be ready..."
    atlas clusters watch "$CLUSTER_NAME" --projectId "$PROJECT_ID"
    
    # Create database user
    DB_USERNAME="appello-user"
    DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    
    print_status "Creating database user: $DB_USERNAME"
    atlas dbusers create atlasAdmin \
        --username "$DB_USERNAME" \
        --password "$DB_PASSWORD" \
        --projectId "$PROJECT_ID"
    
    # Add IP access (allow all for Vercel)
    print_status "Setting up network access..."
    atlas accessLists create 0.0.0.0/0 \
        --comment "Vercel deployment access" \
        --projectId "$PROJECT_ID"
    
    # Get connection string
    print_status "Retrieving connection string..."
    CONNECTION_STRING=$(atlas clusters connectionStrings describe "$CLUSTER_NAME" --projectId "$PROJECT_ID" --type standard --output json | jq -r '.standardSrv')
    
    # Replace placeholder with actual credentials
    MONGODB_URI="${CONNECTION_STRING//<username>/$DB_USERNAME}"
    MONGODB_URI="${MONGODB_URI//<password>/$DB_PASSWORD}"
    MONGODB_URI="${MONGODB_URI//myFirstDatabase/appello-tasks-prod}"
    
    print_success "MongoDB Atlas setup complete!"
    print_success "Connection URI: $MONGODB_URI"
    
    # Save to .env file for local testing
    echo "MONGODB_URI=\"$MONGODB_URI\"" > .env.production
    echo "NODE_ENV=production" >> .env.production
    echo "JWT_SECRET=\"$(openssl rand -base64 64)\"" >> .env.production
    echo "JWT_EXPIRES_IN=7d" >> .env.production
    
    print_success "Environment variables saved to .env.production"
}

# Vercel Deployment
deploy_vercel() {
    print_status "Deploying to Vercel..."
    
    # Check if user is logged in to Vercel
    if ! vercel whoami &> /dev/null; then
        print_warning "You need to authenticate with Vercel first."
        print_status "Opening Vercel login..."
        vercel login
    fi
    
    # Deploy the project
    print_status "Deploying to Vercel..."
    VERCEL_URL=$(vercel --prod --yes --confirm 2>&1 | grep -o 'https://[^[:space:]]*\.vercel\.app')
    
    if [ -z "$VERCEL_URL" ]; then
        print_error "Failed to get Vercel deployment URL"
        exit 1
    fi
    
    print_success "Deployed to: $VERCEL_URL"
    
    # Set environment variables in Vercel
    print_status "Setting environment variables in Vercel..."
    
    # Read the MongoDB URI from .env.production
    source .env.production
    
    vercel env add MONGODB_URI production <<< "$MONGODB_URI"
    vercel env add NODE_ENV production <<< "production"
    vercel env add JWT_SECRET production <<< "$JWT_SECRET"
    vercel env add JWT_EXPIRES_IN production <<< "7d"
    vercel env add SOCKET_IO_ORIGINS production <<< "$VERCEL_URL"
    
    # Redeploy with environment variables
    print_status "Redeploying with environment variables..."
    vercel --prod --yes
    
    print_success "Vercel deployment complete!"
    
    return 0
}

# Main execution
main() {
    print_status "🚀 Appello Task Management - Automated Deployment"
    print_status "This script will set up MongoDB Atlas and deploy to Vercel"
    echo ""
    
    check_dependencies
    
    # Ask user for confirmation
    read -p "Do you want to proceed with MongoDB Atlas setup? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        setup_mongodb
    else
        print_warning "Skipping MongoDB Atlas setup"
    fi
    
    read -p "Do you want to proceed with Vercel deployment? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        deploy_vercel
        
        print_success "🎉 Deployment completed successfully!"
        print_success "Your application is now live and ready for team testing!"
        print_status "MongoDB Atlas cluster and database user created"
        print_status "Vercel deployment with environment variables configured"
        echo ""
        print_status "Next steps:"
        print_status "1. Share the Vercel URL with your team"
        print_status "2. Test the application functionality"
        print_status "3. Monitor logs in Vercel dashboard for any issues"
        
    else
        print_warning "Skipping Vercel deployment"
    fi
    
    print_success "Script completed!"
}

# Run main function
main "$@"
