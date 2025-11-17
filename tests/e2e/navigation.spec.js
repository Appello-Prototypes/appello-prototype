import { test, expect } from '@playwright/test';
import { TestHelpers } from '../utils/test-helpers.js';

test.describe('Navigation Tests - Local vs Production', () => {
  const routes = [
    { path: '/dashboard', name: 'Dashboard' },
    { path: '/projects', name: 'Projects' },
    { path: '/jobs', name: 'Jobs' },
    { path: '/tasks', name: 'Tasks' },
    { path: '/my-tasks', name: 'My Tasks' },
    { path: '/tasks/create', name: 'Create Task' },
    { path: '/time-entry', name: 'Time Entry' },
  ];

  for (const route of routes) {
    test(`Navigate to ${route.name} - Local`, async ({ page, baseURL }) => {
      const helpers = new TestHelpers(page);
      const startTime = Date.now();

      await page.goto(baseURL + route.path);
      await helpers.waitForPageLoad();
      await helpers.waitForAPICalls();

      const loadTime = Date.now() - startTime;
      const metrics = await helpers.getPerformanceMetrics();

      // Verify navigation
      await expect(page).toHaveURL(new RegExp(`.*${route.path.replace('/', '')}`));
      
      // Verify page loaded without errors
      const errors = await helpers.getConsoleErrors();
      expect(errors.length).toBe(0);

      console.log(`[Local] ${route.name} - Load Time: ${loadTime}ms, FCP: ${metrics.firstContentfulPaint?.toFixed(2)}ms`);
    });

    test(`Navigate to ${route.name} - Production`, async ({ page, baseURL }) => {
      if (!baseURL.includes('vercel.app') && !baseURL.includes('production')) {
        test.skip();
      }

      const helpers = new TestHelpers(page);
      const startTime = Date.now();

      await page.goto(baseURL + route.path);
      await helpers.waitForPageLoad();
      await helpers.waitForAPICalls();

      const loadTime = Date.now() - startTime;
      const metrics = await helpers.getPerformanceMetrics();

      // Verify navigation
      await expect(page).toHaveURL(new RegExp(`.*${route.path.replace('/', '')}`));
      
      // Verify page loaded without errors
      const errors = await helpers.getConsoleErrors();
      expect(errors.length).toBe(0);

      console.log(`[Production] ${route.name} - Load Time: ${loadTime}ms, FCP: ${metrics.firstContentfulPaint?.toFixed(2)}ms`);
    });
  }

  test('Navigation performance comparison', async ({ page, baseURL }) => {
    const projectName = baseURL.includes('vercel.app') ? 'production' : 'local';
    const helpers = new TestHelpers(page);
    const navigationTimes = [];

    for (const route of routes.slice(0, 5)) { // Test first 5 routes
      const startTime = Date.now();
      await page.goto(baseURL + route.path);
      await helpers.waitForPageLoad();
      const endTime = Date.now();
      
      navigationTimes.push({
        route: route.name,
        time: endTime - startTime,
      });
    }

    const avgTime = navigationTimes.reduce((sum, n) => sum + n.time, 0) / navigationTimes.length;
    console.log(`[${projectName}] Average navigation time: ${avgTime.toFixed(2)}ms`);
    console.log(`[${projectName}] Navigation times:`, navigationTimes);

    // Verify reasonable performance
    expect(avgTime).toBeLessThan(10000); // Should load within 10 seconds
  });
});

