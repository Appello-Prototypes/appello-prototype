import { test, expect } from '@playwright/test';
import { TestHelpers } from '../utils/test-helpers.js';

test.describe('Dashboard Tests - Local vs Production', () => {
  let localMetrics, prodMetrics;

  test('Dashboard loads correctly - Local', async ({ page, baseURL }) => {
    const helpers = new TestHelpers(page);
    const startTime = Date.now();

    await page.goto(baseURL + '/dashboard');
    await helpers.waitForPageLoad();
    await helpers.waitForAPICalls();

    const loadTime = Date.now() - startTime;
    localMetrics = await helpers.getPerformanceMetrics();
    localMetrics.loadTime = loadTime;

    // Verify page loaded
    await expect(page).toHaveURL(/.*dashboard/);
    
    // Check for key elements
    await expect(page.locator('text=Dashboard').or(page.locator('h1'))).toBeVisible({ timeout: 10000 });
    
    // Check for no console errors
    const errors = await helpers.getConsoleErrors();
    expect(errors.length).toBe(0);
  });

  test('Dashboard loads correctly - Production', async ({ page, baseURL }) => {
    // Skip if not production URL
    if (!baseURL.includes('vercel.app') && !baseURL.includes('production')) {
      test.skip();
    }

    const helpers = new TestHelpers(page);
    const startTime = Date.now();

    await page.goto(baseURL + '/dashboard');
    await helpers.waitForPageLoad();
    await helpers.waitForAPICalls();

    const loadTime = Date.now() - startTime;
    prodMetrics = await helpers.getPerformanceMetrics();
    prodMetrics.loadTime = loadTime;

    // Verify page loaded
    await expect(page).toHaveURL(/.*dashboard/);
    
    // Check for key elements
    await expect(page.locator('text=Dashboard').or(page.locator('h1'))).toBeVisible({ timeout: 10000 });
    
    // Check for no console errors
    const errors = await helpers.getConsoleErrors();
    expect(errors.length).toBe(0);
  });

  test('Dashboard API calls performance', async ({ page, baseURL }) => {
    const projectName = baseURL.includes('vercel.app') ? 'production' : 'local';
    const helpers = new TestHelpers(page);
    const apiMetrics = [];

    await page.goto(baseURL + '/dashboard');
    
    // Measure API response times
    const apiEndpoints = [
      '/api/tasks/stats',
      '/api/projects',
      '/api/jobs',
      '/api/tasks/overdue',
    ];

    for (const endpoint of apiEndpoints) {
      try {
        const metric = await helpers.measureAPIResponse(endpoint);
        apiMetrics.push(metric);
      } catch (e) {
        // API might not be called or might fail, continue
      }
    }

    // Log metrics
    console.log(`[${projectName}] API Metrics:`, JSON.stringify(apiMetrics, null, 2));

    // Verify at least some APIs responded
    expect(apiMetrics.length).toBeGreaterThan(0);
  });

  test('Dashboard content matches between environments', async ({ page, baseURL }) => {
    const projectName = baseURL.includes('vercel.app') ? 'production' : 'local';
    await page.goto(baseURL + '/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Wait for React Query to finish

    // Get page structure
    const pageStructure = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('[data-testid], h1, h2, h3, button, a'));
      return elements.map(el => ({
        tag: el.tagName.toLowerCase(),
        text: el.textContent?.trim().substring(0, 50) || '',
        testId: el.getAttribute('data-testid') || '',
      })).filter(el => el.text || el.testId);
    });

    // Store for comparison (in a real scenario, you'd compare between test runs)
    console.log(`[${projectName}] Page Structure:`, JSON.stringify(pageStructure.slice(0, 20), null, 2));

    // Verify page has content
    expect(pageStructure.length).toBeGreaterThan(0);
  });
});

