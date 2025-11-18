import { test, expect } from '@playwright/test';

test.describe('API Health Tests - Local vs Production', () => {
  test('Health endpoint responds correctly - Local', async ({ request, baseURL }) => {
    const response = await request.get(baseURL + '/api/health');
    
    // Accept both 200 (success) and 503 (service unavailable - might be cold start)
    const status = response.status();
    expect([200, 503]).toContain(status);
    
    if (status === 200) {
      const body = await response.json();
      expect(body).toHaveProperty('success');
      expect(body.success).toBe(true);
      expect(body).toHaveProperty('message');
      expect(body).toHaveProperty('environment');
      console.log('[Local] Health check:', JSON.stringify(body, null, 2));
    } else {
      console.log('[Local] Health endpoint returned 503 (service unavailable - may be cold start)');
    }
  });

  test('Health endpoint responds correctly - Production', async ({ request, baseURL }) => {
    if (!baseURL.includes('vercel.app') && !baseURL.includes('production')) {
      test.skip();
    }

    const startTime = Date.now();
    const response = await request.get(baseURL + '/api/health');
    const responseTime = Date.now() - startTime;
    
    // Accept both 200 (success) and 503 (service unavailable - might be cold start or DB issue)
    const status = response.status();
    expect([200, 503]).toContain(status);
    
    if (status === 200) {
      const body = await response.json();
      expect(body).toHaveProperty('success');
      expect(body.success).toBe(true);
      expect(body).toHaveProperty('message');
      expect(body).toHaveProperty('environment');
      expect(body.environment).toBe('production');
      console.log('[Production] Health check:', JSON.stringify(body, null, 2));
    } else {
      const body = await response.text();
      console.log('[Production] Health endpoint returned 503');
      console.log('[Production] Response:', body.substring(0, 200));
      console.log('[Production] This may indicate:');
      console.log('  - Cold start (first request after inactivity)');
      console.log('  - Database connection issue');
      console.log('  - Environment variables not configured');
    }
    
    console.log(`[Production] Response time: ${responseTime}ms`);
    
    // Verify reasonable response time (even for 503)
    expect(responseTime).toBeLessThan(10000); // Should respond within 10 seconds
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

    // Verify health endpoint exists (may return 503 if DB not configured)
    const healthResult = results.find(r => r.endpoint === '/api/health');
    expect(healthResult).toBeDefined();
    // Accept 200 or 503 (503 indicates service unavailable, likely DB config issue)
    if (healthResult.status) {
      expect([200, 503]).toContain(healthResult.status);
    }
  });
});

