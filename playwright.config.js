import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for testing both local and production environments
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list']
  ],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'local',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.LOCAL_URL || 'http://localhost:3000',
        // Set longer timeout for local dev server startup
        actionTimeout: 10000,
      },
    },
    {
      name: 'production',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.PRODUCTION_URL || 'https://task-management-kappa-plum.vercel.app',
        actionTimeout: 15000, // Longer timeout for production (network latency)
      },
      testMatch: /.*\.spec\.js/,
    },
  ],
  webServer: process.env.SKIP_LOCAL_SERVER ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI,
  },
});

