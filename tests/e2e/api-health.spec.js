import { test, expect } from '@playwright/test';

test.describe('API Health Tests - Local vs Production', () => {
  test('Health endpoint responds correctly - Local', async ({ request, baseURL }) => {
    const response = await request.get(baseURL + '/api/health');
    
    expect(response.status()).toBe(200);
    const body = await response.json();
    
    expect(body).toHaveProperty('success');
    expect(body.success).toBe(true);
    expect(body).toHaveProperty('message');
    expect(body).toHaveProperty('environment');
    
    console.log('[Local] Health check:', JSON.stringify(body, null, 2));
  });

  test('Health endpoint responds correctly - Production', async ({ request, baseURL }) => {
    if (!baseURL.includes('vercel.app') && !baseURL.includes('production')) {
      test.skip();
    }

    const startTime = Date.now();
    const response = await request.get(baseURL + '/api/health');
    const responseTime = Date.now() - startTime;
    
    expect(response.status()).toBe(200);
    const body = await response.json();
    
    expect(body).toHaveProperty('success');
    expect(body.success).toBe(true);
    expect(body).toHaveProperty('message');
    expect(body).toHaveProperty('environment');
    expect(body.environment).toBe('production');
    
    console.log('[Production] Health check:', JSON.stringify(body, null, 2));
    console.log(`[Production] Response time: ${responseTime}ms`);
    
    // Verify reasonable response time
    expect(responseTime).toBeLessThan(5000); // Should respond within 5 seconds
  });

  test('API response times comparison', async ({ request, baseURL }) => {
    const projectName = baseURL.includes('vercel.app') ? 'production' : 'local';
    const endpoints = [
      '/api/health',
      '/api/projects',
      '/api/jobs',
      '/api/tasks',
    ];

    const results = [];

    for (const endpoint of endpoints) {
      try {
        const startTime = Date.now();
        const response = await request.get(baseURL + endpoint);
        const responseTime = Date.now() - startTime;
        
        results.push({
          endpoint,
          status: response.status(),
          responseTime,
          success: response.ok(),
        });
      } catch (error) {
        results.push({
          endpoint,
          error: error.message,
          success: false,
        });
      }
    }

    console.log(`[${projectName}] API Response Times:`, JSON.stringify(results, null, 2));

    // Verify at least health endpoint works
    const healthResult = results.find(r => r.endpoint === '/api/health');
    expect(healthResult).toBeDefined();
    expect(healthResult.success).toBe(true);
  });
});

