import { test, expect } from '@playwright/test';
import { TestHelpers } from '../utils/test-helpers.js';

test.describe('Performance Tests - Local vs Production', () => {
  test('Page load performance metrics', async ({ page, baseURL }) => {
    const projectName = baseURL.includes('vercel.app') ? 'production' : 'local';
    const helpers = new TestHelpers(page);
    
    await page.goto(baseURL + '/dashboard');
    await helpers.waitForPageLoad();
    
    const metrics = await helpers.getPerformanceMetrics();
    
    console.log(`[${projectName}] Performance Metrics:`, JSON.stringify(metrics, null, 2));
    
    // Verify metrics exist
    expect(metrics.totalTime).toBeGreaterThan(0);
    expect(metrics.firstContentfulPaint).toBeGreaterThan(0);
    
    // Performance thresholds
    expect(metrics.firstContentfulPaint).toBeLessThan(3000); // FCP should be under 3s
    expect(metrics.totalTime).toBeLessThan(10000); // Total load should be under 10s
  });

  test('Lighthouse-style performance audit', async ({ page, baseURL }) => {
    const projectName = baseURL.includes('vercel.app') ? 'production' : 'local';
    await page.goto(baseURL + '/dashboard');
    
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      const paint = performance.getEntriesByType('paint');
      const resources = performance.getEntriesByType('resource');
      
      return {
        // Core Web Vitals
        FCP: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
        LCP: 0, // Would need to measure largest contentful paint
        TTI: navigation.domInteractive - navigation.fetchStart,
        TBT: 0, // Total blocking time - would need to calculate
        
        // Load metrics
        DOMContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
        Load: navigation.loadEventEnd - navigation.fetchStart,
        
        // Resource metrics
        totalResources: resources.length,
        totalSize: resources.reduce((sum, r) => sum + (r.transferSize || 0), 0),
        jsSize: resources.filter(r => r.name.endsWith('.js')).reduce((sum, r) => sum + (r.transferSize || 0), 0),
        cssSize: resources.filter(r => r.name.endsWith('.css')).reduce((sum, r) => sum + (r.transferSize || 0), 0),
      };
    });
    
    console.log(`[${projectName}] Lighthouse Metrics:`, JSON.stringify(performanceMetrics, null, 2));
    
    // Verify reasonable resource usage
    expect(performanceMetrics.totalResources).toBeGreaterThan(0);
    expect(performanceMetrics.FCP).toBeLessThan(3000);
  });

  test('Network request analysis', async ({ page, baseURL }) => {
    const projectName = baseURL.includes('vercel.app') ? 'production' : 'local';
    const requests = [];
    const responses = [];
    
    page.on('request', request => {
      requests.push({
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType(),
      });
    });
    
    page.on('response', response => {
      responses.push({
        url: response.url(),
        status: response.status(),
        headers: response.headers(),
      });
    });
    
    await page.goto(baseURL + '/dashboard');
    await page.waitForLoadState('networkidle');
    
    const apiRequests = requests.filter(r => r.url.includes('/api/'));
    const failedRequests = responses.filter(r => r.status >= 400);
    
    console.log(`[${projectName}] Total Requests: ${requests.length}`);
    console.log(`[${projectName}] API Requests: ${apiRequests.length}`);
    console.log(`[${projectName}] Failed Requests: ${failedRequests.length}`);
    
    // Verify no failed requests
    expect(failedRequests.length).toBe(0);
    
    // Verify API requests were made
    expect(apiRequests.length).toBeGreaterThan(0);
  });

  test('Memory usage check', async ({ page, baseURL }) => {
    const projectName = baseURL.includes('vercel.app') ? 'production' : 'local';
    await page.goto(baseURL + '/dashboard');
    await page.waitForLoadState('networkidle');
    
    const memoryInfo = await page.evaluate(() => {
      if (performance.memory) {
        return {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
          jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
        };
      }
      return null;
    });
    
    if (memoryInfo) {
      console.log(`[${projectName}] Memory Usage:`, JSON.stringify(memoryInfo, null, 2));
      
      // Verify reasonable memory usage (less than 50MB)
      const usedMB = memoryInfo.usedJSHeapSize / (1024 * 1024);
      expect(usedMB).toBeLessThan(50);
    }
  });
});

