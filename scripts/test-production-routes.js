#!/usr/bin/env node
/**
 * Production Route Testing Script
 * Tests all routes in the production environment
 */

const https = require('https');
const { URL } = require('url');

const BASE_URL = 'https://task-management-kappa-plum.vercel.app';

// All routes to test
const routes = [
  // Authentication
  { path: '/login', name: 'Login', requiresAuth: false },
  { path: '/auth/callback', name: 'Auth Callback', requiresAuth: false },
  
  // Main routes
  { path: '/', name: 'Root (redirects to dashboard)', requiresAuth: true },
  { path: '/dashboard', name: 'Dashboard', requiresAuth: true },
  
  // Projects
  { path: '/projects', name: 'Project List', requiresAuth: true },
  
  // Jobs
  { path: '/jobs', name: 'Job List', requiresAuth: true },
  
  // Tasks
  { path: '/tasks', name: 'Task List', requiresAuth: true },
  { path: '/tasks/create', name: 'Create Task', requiresAuth: true },
  { path: '/my-tasks', name: 'My Tasks', requiresAuth: true },
  { path: '/operations/tasks', name: 'Operations Tasks', requiresAuth: true },
  
  // Work Orders
  { path: '/work-orders', name: 'Work Order List', requiresAuth: true },
  { path: '/work-orders/create', name: 'Create Work Order', requiresAuth: true },
  
  // Time Entry
  { path: '/time-entry', name: 'Time Entry', requiresAuth: true },
  
  // Companies
  { path: '/companies', name: 'Company List', requiresAuth: true },
  { path: '/companies/create', name: 'Create Company', requiresAuth: true },
  
  // Products
  { path: '/products', name: 'Product List', requiresAuth: true },
  { path: '/products/create', name: 'Create Product', requiresAuth: true },
  
  // Product Types
  { path: '/product-types', name: 'Product Type List', requiresAuth: true },
  { path: '/product-types/create', name: 'Create Product Type', requiresAuth: true },
  
  // Property Definitions
  { path: '/property-definitions', name: 'Property Definition List', requiresAuth: true },
  { path: '/property-definitions/create', name: 'Create Property Definition', requiresAuth: true },
  
  // Material Requests
  { path: '/material-requests', name: 'Material Request List', requiresAuth: true },
  { path: '/material-requests/create', name: 'Create Material Request', requiresAuth: true },
  
  // Purchase Orders
  { path: '/purchase-orders', name: 'Purchase Order List', requiresAuth: true },
  { path: '/purchase-orders/create', name: 'Create Purchase Order', requiresAuth: true },
  
  // Receiving
  { path: '/receiving', name: 'Receiving', requiresAuth: true },
  
  // Discounts & Pricebook
  { path: '/discounts', name: 'Discount Management', requiresAuth: true },
  { path: '/pricebook', name: 'Pricebook View', requiresAuth: true },
  
  // Settings
  { path: '/settings', name: 'Settings', requiresAuth: true },
];

// API endpoints to test
const apiEndpoints = [
  { path: '/api/health', name: 'Health Check', method: 'GET' },
  { path: '/api/version', name: 'Version', method: 'GET' },
  { path: '/api/projects', name: 'Projects API', method: 'GET' },
  { path: '/api/jobs', name: 'Jobs API', method: 'GET' },
  { path: '/api/tasks', name: 'Tasks API', method: 'GET' },
  { path: '/api/companies', name: 'Companies API', method: 'GET' },
  { path: '/api/products', name: 'Products API', method: 'GET' },
  { path: '/api/purchase-orders', name: 'Purchase Orders API', method: 'GET' },
];

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const reqOptions = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'Production-Test-Script/1.0',
        ...options.headers,
      },
    };

    const req = https.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
          contentType: res.headers['content-type'] || '',
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

async function testRoute(route) {
  const url = `${BASE_URL}${route.path}`;
  const startTime = Date.now();
  
  try {
    const response = await makeRequest(url);
    const duration = Date.now() - startTime;
    
    const isHTML = response.contentType.includes('text/html');
    const isJS = response.contentType.includes('application/javascript') || 
                 response.contentType.includes('text/javascript');
    const isJSON = response.contentType.includes('application/json');
    
    // Check for common issues
    const issues = [];
    
    if (response.statusCode === 404) {
      issues.push('404 Not Found');
    } else if (response.statusCode >= 500) {
      issues.push(`Server Error: ${response.statusCode}`);
    }
    
    // Check if HTML contains error messages
    if (isHTML) {
      if (response.body.includes('404') || response.body.includes('NOT_FOUND')) {
        issues.push('Contains 404 error in HTML');
      }
      if (response.body.includes('Error') && response.body.includes('500')) {
        issues.push('Contains 500 error in HTML');
      }
      // Check if it's actually serving index.html (should contain React app markers)
      if (!response.body.includes('root') && !response.body.includes('react') && 
          !response.body.includes('Appello')) {
        issues.push('HTML does not appear to be React app');
      }
    }
    
    // Check MIME type for JS routes
    if (route.path.includes('.js') && !isJS && response.statusCode === 200) {
      issues.push(`Wrong MIME type: ${response.contentType} (expected JavaScript)`);
    }
    
    return {
      route: route.name,
      path: route.path,
      status: response.statusCode,
      contentType: response.contentType,
      duration,
      size: response.body.length,
      issues,
      success: response.statusCode >= 200 && response.statusCode < 400 && issues.length === 0,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      route: route.name,
      path: route.path,
      status: 'ERROR',
      error: error.message,
      duration,
      issues: [error.message],
      success: false,
    };
  }
}

async function testAPIEndpoint(endpoint) {
  const url = `${BASE_URL}${endpoint.path}`;
  const startTime = Date.now();
  
  try {
    const response = await makeRequest(url, { method: endpoint.method });
    const duration = Date.now() - startTime;
    
    let parsedBody;
    try {
      parsedBody = JSON.parse(response.body);
    } catch (e) {
      parsedBody = null;
    }
    
    const issues = [];
    if (response.statusCode >= 500) {
      issues.push(`Server Error: ${response.statusCode}`);
    }
    if (response.statusCode === 404) {
      issues.push('404 Not Found');
    }
    if (!response.contentType.includes('application/json')) {
      issues.push(`Wrong content type: ${response.contentType}`);
    }
    if (parsedBody && parsedBody.success === false) {
      issues.push(`API returned error: ${parsedBody.message || parsedBody.error || 'Unknown error'}`);
    }
    
    return {
      endpoint: endpoint.name,
      path: endpoint.path,
      status: response.statusCode,
      contentType: response.contentType,
      duration,
      success: parsedBody?.success !== false && response.statusCode < 400 && issues.length === 0,
      issues,
      response: parsedBody,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      endpoint: endpoint.name,
      path: endpoint.path,
      status: 'ERROR',
      error: error.message,
      duration,
      issues: [error.message],
      success: false,
    };
  }
}

async function runTests() {
  console.log('🧪 Production Route Testing');
  console.log('=' .repeat(60));
  console.log(`Base URL: ${BASE_URL}\n`);
  
  // Test client routes
  console.log('📄 Testing Client Routes...\n');
  const routeResults = [];
  
  for (const route of routes) {
    process.stdout.write(`Testing ${route.name}... `);
    const result = await testRoute(route);
    routeResults.push(result);
    
    if (result.success) {
      console.log(`✅ ${result.status} (${result.duration}ms)`);
    } else {
      console.log(`❌ ${result.status} - ${result.issues.join(', ')}`);
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('\n\n🔌 Testing API Endpoints...\n');
  const apiResults = [];
  
  for (const endpoint of apiEndpoints) {
    process.stdout.write(`Testing ${endpoint.name}... `);
    const result = await testAPIEndpoint(endpoint);
    apiResults.push(result);
    
    if (result.success) {
      console.log(`✅ ${result.status} (${result.duration}ms)`);
    } else {
      console.log(`❌ ${result.status} - ${result.issues.join(', ')}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Summary
  console.log('\n\n' + '='.repeat(60));
  console.log('📊 Test Summary');
  console.log('='.repeat(60));
  
  const successfulRoutes = routeResults.filter(r => r.success).length;
  const failedRoutes = routeResults.filter(r => !r.success).length;
  const successfulAPIs = apiResults.filter(r => r.success).length;
  const failedAPIs = apiResults.filter(r => !r.success).length;
  
  console.log(`\nClient Routes: ${successfulRoutes}/${routeResults.length} passed`);
  if (failedRoutes > 0) {
    console.log('\n❌ Failed Routes:');
    routeResults.filter(r => !r.success).forEach(r => {
      console.log(`   - ${r.route} (${r.path}): ${r.issues.join(', ')}`);
    });
  }
  
  console.log(`\nAPI Endpoints: ${successfulAPIs}/${apiResults.length} passed`);
  if (failedAPIs > 0) {
    console.log('\n❌ Failed APIs:');
    apiResults.filter(r => !r.success).forEach(r => {
      console.log(`   - ${r.endpoint} (${r.path}): ${r.issues.join(', ')}`);
    });
  }
  
  const totalSuccess = successfulRoutes + successfulAPIs;
  const totalTests = routeResults.length + apiResults.length;
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Overall: ${totalSuccess}/${totalTests} tests passed`);
  console.log(`Success Rate: ${((totalSuccess / totalTests) * 100).toFixed(1)}%`);
  console.log('='.repeat(60));
  
  // Exit with error code if any tests failed
  if (failedRoutes > 0 || failedAPIs > 0) {
    process.exit(1);
  }
}

runTests().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

