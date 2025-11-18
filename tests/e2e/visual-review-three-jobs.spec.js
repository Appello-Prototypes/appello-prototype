import { test, expect } from '@playwright/test';

/**
 * Visual review of the three scenario jobs using Playwright
 * Navigates through all pages and checks for errors and missing data
 */

const JOB_NUMBERS = [
  'JOB-2025-INS-001',
  'JOB-2025-MECH-001',
  'JOB-2025-ELEC-001'
];

test.describe('Visual Review of Three Scenario Jobs', () => {
  let jobIds = {};

  test.beforeAll(async ({ request }) => {
    // Get job IDs via API - wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    try {
      const response = await request.get('/api/jobs', { timeout: 30000 });
      const result = await response.json();
      
      if (result.success && result.data) {
        for (const job of result.data) {
          if (JOB_NUMBERS.includes(job.jobNumber)) {
            jobIds[job.jobNumber] = job._id;
            console.log(`Found ${job.jobNumber}: ${job._id}`);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
      // Try direct database lookup as fallback
      const mongoose = require('mongoose');
      require('dotenv').config({ path: '.env.local' });
      const Job = require('../../src/server/models/Job');
      await mongoose.connect(process.env.MONGODB_DEV_URI || process.env.MONGODB_URI);
      for (const jobNumber of JOB_NUMBERS) {
        const job = await Job.findOne({ jobNumber });
        if (job) {
          jobIds[jobNumber] = job._id.toString();
        }
      }
      await mongoose.disconnect();
    }
  });

  for (const jobNumber of JOB_NUMBERS) {
    test.describe(`Job: ${jobNumber}`, () => {
      const jobId = jobIds[jobNumber];

      test('Overview page loads correctly', async ({ page }) => {
        if (!jobId) {
          test.skip();
          return;
        }

        await page.goto(`/jobs/${jobId}`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        // Check for job number in page
        await expect(page.locator('body')).toContainText(jobNumber, { timeout: 5000 });

        // Check for error messages
        const errorText = await page.locator('text=/error/i, text=/failed/i, text=/not found/i').count();
        expect(errorText).toBe(0);

        // Take screenshot
        await page.screenshot({ path: `test-results/${jobNumber}-overview.png`, fullPage: true });
      });

      test('Job Financial Summary - Check forecasted final cost', async ({ page, request }) => {
        if (!jobId) {
          test.skip();
          return;
        }

        await page.goto(`/jobs/${jobId}/job-financial-summary`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);

        // Check API response
        const apiResponse = await request.get(`/api/financial/${jobId}/job-financial-summary`);
        const data = await apiResponse.json();
        
        expect(apiResponse.ok()).toBe(true);
        expect(data.success).toBe(true);

        if (data.data?.summary?.months) {
          const monthsWithForecast = data.data.summary.months.filter(m => m.forecastedFinalCost > 0);
          expect(monthsWithForecast.length).toBeGreaterThan(0);
        }

        // Check page for forecasted final cost row
        const forecastRow = page.locator('text=/Forecasted Final Cost/i');
        if (await forecastRow.count() > 0) {
          // Check that values are not all dashes
          const table = page.locator('table').first();
          const rows = await table.locator('tr').all();
          
          let foundForecastRow = false;
          for (const row of rows) {
            const text = await row.textContent();
            if (text && text.includes('Forecasted Final Cost')) {
              foundForecastRow = true;
              const cells = await row.locator('td').all();
              let hasValue = false;
              for (const cell of cells.slice(1)) { // Skip first cell (label)
                const cellText = await cell.textContent();
                if (cellText && cellText.trim() !== '-' && cellText.trim() !== '' && !cellText.includes('$0')) {
                  hasValue = true;
                  break;
                }
              }
              expect(hasValue).toBe(true);
              break;
            }
          }
          expect(foundForecastRow).toBe(true);
        }

        await page.screenshot({ path: `test-results/${jobNumber}-financial-summary.png`, fullPage: true });
      });

      test('Cost to Complete page loads with forecasts', async ({ page, request }) => {
        if (!jobId) {
          test.skip();
          return;
        }

        await page.goto(`/jobs/${jobId}/cost-to-complete`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);

        // Check API
        const apiResponse = await request.get(`/api/financial/${jobId}/cost-to-complete/forecasts`);
        const data = await apiResponse.json();
        
        expect(apiResponse.ok()).toBe(true);
        if (data.success && data.data) {
          expect(data.data.length).toBeGreaterThan(0);
        }

        await page.screenshot({ path: `test-results/${jobNumber}-cost-to-complete.png`, fullPage: true });
      });

      test('Timelog Register has entries', async ({ page, request }) => {
        if (!jobId) {
          test.skip();
          return;
        }

        await page.goto(`/jobs/${jobId}/timelog-register`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);

        // Check API
        const apiResponse = await request.get(`/api/financial/${jobId}/timelog-register`);
        const data = await apiResponse.json();
        
        expect(apiResponse.ok()).toBe(true);
        if (data.success && data.data) {
          expect(data.data.length).toBeGreaterThan(0);
        }

        await page.screenshot({ path: `test-results/${jobNumber}-timelog-register.png`, fullPage: true });
      });

      test('AP Register has entries', async ({ page, request }) => {
        if (!jobId) {
          test.skip();
          return;
        }

        await page.goto(`/jobs/${jobId}/ap-register`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);

        // Check API
        const apiResponse = await request.get(`/api/financial/${jobId}/ap-register`);
        const data = await apiResponse.json();
        
        expect(apiResponse.ok()).toBe(true);
        if (data.success && data.data) {
          expect(data.data.length).toBeGreaterThan(0);
        }

        await page.screenshot({ path: `test-results/${jobNumber}-ap-register.png`, fullPage: true });
      });

      test('Progress Reports page loads', async ({ page, request }) => {
        if (!jobId) {
          test.skip();
          return;
        }

        await page.goto(`/jobs/${jobId}/progress-reports`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);

        // Check API
        const apiResponse = await request.get(`/api/financial/${jobId}/progress-reports?status=approved`);
        const data = await apiResponse.json();
        
        expect(apiResponse.ok()).toBe(true);
        if (data.success && data.data) {
          expect(data.data.length).toBeGreaterThan(0);
        }

        await page.screenshot({ path: `test-results/${jobNumber}-progress-reports.png`, fullPage: true });
      });

      test('Earned vs Burned page loads', async ({ page, request }) => {
        if (!jobId) {
          test.skip();
          return;
        }

        await page.goto(`/jobs/${jobId}/earned-vs-burned`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);

        // Check API
        const apiResponse = await request.get(`/api/financial/${jobId}/earned-vs-burned`);
        const data = await apiResponse.json();
        
        expect(apiResponse.ok()).toBe(true);
        expect(data.success).toBe(true);

        await page.screenshot({ path: `test-results/${jobNumber}-earned-vs-burned.png`, fullPage: true });
      });

      test('SOV Line Items page loads', async ({ page, request }) => {
        if (!jobId) {
          test.skip();
          return;
        }

        await page.goto(`/jobs/${jobId}/sov-line-items`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);

        // Check API
        const apiResponse = await request.get(`/api/jobs/${jobId}/sov-components`);
        const data = await apiResponse.json();
        
        expect(apiResponse.ok()).toBe(true);
        if (data.success && data.data?.lineItems) {
          expect(data.data.lineItems.length).toBeGreaterThan(0);
        }

        await page.screenshot({ path: `test-results/${jobNumber}-sov-line-items.png`, fullPage: true });
      });

      test('Monthly Cost Report page loads', async ({ page, request }) => {
        if (!jobId) {
          test.skip();
          return;
        }

        await page.goto(`/jobs/${jobId}/monthly-cost-report`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);

        // Check API
        const apiResponse = await request.get(`/api/financial/${jobId}/monthly-cost-report`);
        const data = await apiResponse.json();
        
        expect(apiResponse.ok()).toBe(true);
        expect(data.success).toBe(true);

        await page.screenshot({ path: `test-results/${jobNumber}-monthly-cost-report.png`, fullPage: true });
      });
    });
  }
});

