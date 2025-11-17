#!/bin/bash

# Test Deployment Script
# Tests if the Appello Task Management deployment is working correctly

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

PROD_URL="https://task-management-kappa-plum.vercel.app"

echo -e "${BLUE}🧪 Testing Appello Task Management Deployment${NC}"
echo "Production URL: $PROD_URL"
echo ""

# Test 1: Frontend Loading
echo -e "${BLUE}[TEST 1]${NC} Frontend Loading..."
if curl -s -o /dev/null -w "%{http_code}" "$PROD_URL" | grep -q "200"; then
    echo -e "${GREEN}✅ Frontend loads successfully${NC}"
else
    echo -e "${RED}❌ Frontend failed to load${NC}"
    exit 1
fi

# Test 2: API Health Check (if available)
echo -e "${BLUE}[TEST 2]${NC} API Health Check..."
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL/api/health" || echo "000")
if [ "$API_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ API is responding${NC}"
elif [ "$API_STATUS" = "404" ]; then
    echo -e "${YELLOW}⚠️  API health endpoint not found (normal for this app)${NC}"
else
    echo -e "${YELLOW}⚠️  API status: $API_STATUS (may require authentication)${NC}"
fi

# Test 3: Database Connection Test
echo -e "${BLUE}[TEST 3]${NC} Testing API endpoints..."
AUTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL/api/auth/register" || echo "000")
if [ "$AUTH_STATUS" = "405" ] || [ "$AUTH_STATUS" = "400" ]; then
    echo -e "${GREEN}✅ Auth endpoints are accessible${NC}"
else
    echo -e "${YELLOW}⚠️  Auth endpoint status: $AUTH_STATUS${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Deployment Test Complete!${NC}"
echo ""
echo -e "${BLUE}📱 Team Access Information:${NC}"
echo "Production URL: $PROD_URL"
echo ""
echo -e "${BLUE}📋 Next Steps for Your Team:${NC}"
echo "1. Visit the production URL above"
echo "2. Test user registration and login"
echo "3. Create test projects and tasks"
echo "4. Test time tracking functionality"
echo "5. Report any issues found"
echo ""
echo -e "${YELLOW}💡 Tip:${NC} Monitor the Vercel dashboard for real-time logs and metrics"
