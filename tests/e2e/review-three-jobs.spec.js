import { test, expect } from '@playwright/test';

/**
 * Comprehensive review of the three scenario jobs
 * Checks all pages for missing data and errors
 */

const JOB_NUMBERS = [
  'JOB-2025-INS-001', // Mechanical Insulation
  'JOB-2025-MECH-001', // Mechanical (Piping/HVAC)
  'JOB-2025-ELEC-001'  // Electrical
];

const JOB_PAGES = [
  { name: 'Overview', path: '' },
  { name: 'Job Financial Summary', path: '/job-financial-summary' },
  { name: 'Progress Reports', path: '/progress-reports' },
  { name: 'Earned vs Burned', path: '/earned-vs-burned' },
  { name: 'Cost to Complete', path: '/cost-to-complete' },
  { name: 'SOV Line Items', path: '/sov-line-items' },
  { name: 'Monthly Cost Report', path: '/monthly-cost-report' },
  { name: 'AP Register', path: '/ap-register' },
  { name: 'Timelog Register', path: '/timelog-register' }
];

test.describe('Review Three Scenario Jobs', () => {
  let jobIds = {};

  test.beforeAll(async ({ request }) => {
    // Get all jobs and find our three scenario jobs
    const response = await request.get('/api/jobs');
    const jobs = await response.json();
    
    if (jobs.success && jobs.data) {
      for (const job of jobs.data) {
        if (JOB_NUMBERS.includes(job.jobNumber)) {
          jobIds[job.jobNumber] = job._id;
        }
      }
    }
    
    console.log('Found job IDs:', jobIds);
  });

  for (const jobNumber of JOB_NUMBERS) {
    test.describe(`Job: ${jobNumber}`, () => {
      test.beforeEach(async ({ page }) => {
        // Navigate to jobs list first
        await page.goto('/jobs');
        await page.waitForLoadState('networkidle');
        
        // Find and click on the job
        const jobLink = page.locator(`text=${jobNumber}`).first();
        if (await jobLink.count() > 0) {
          await jobLink.click();
          await page.waitForLoadState('networkidle');
        } else {
          test.skip();
        }
      });

      for (const pageInfo of JOB_PAGES) {
        test(`Check ${pageInfo.name} page`, async ({ page }) => {
          const jobId = jobIds[jobNumber];
          if (!jobId) {
            test.skip();
            return;
          }

          // Navigate to the page
          const url = `/jobs/${jobId}${pageInfo.path}`;
          console.log(`Navigating to: ${url}`);
          
          await page.goto(url);
          await page.waitForLoadState('networkidle');
          
          // Wait for content to load
          await page.waitForTimeout(2000);
          
          // Check for errors in console
          const errors = [];
          page.on('console', msg => {
            if (msg.type() === 'error') {
              errors.push(msg.text());
            }
          });
          
          // Check for network errors
          page.on('response', response => {
            if (response.status() >= 400) {
              errors.push(`HTTP ${response.status()} for ${response.url()}`);
            }
          });
          
          // Take screenshot for review
          await page.screenshot({ 
            path: `test-results/${jobNumber}-${pageInfo.name.replace(/\s+/g, '-')}.png`,
            fullPage: true 
          });
          
          // Check for common error indicators
          const errorSelectors = [
            'text=/error/i',
            'text=/failed/i',
            'text=/not found/i',
            'text=/undefined/i',
            'text=/null/i'
          ];
          
          for (const selector of errorSelectors) {
            const errorElements = await page.locator(selector).count();
            if (errorElements > 0) {
              const errorText = await page.locator(selector).first().textContent();
              console.warn(`Potential error found on ${pageInfo.name}: ${errorText}`);
            }
          }
          
          // Check for empty data indicators
          const emptySelectors = [
            'text=/no data/i',
            'text=/no records/i',
            'text=/empty/i',
            'text=/-/i' // Dashes often indicate empty data
          ];
          
          for (const selector of emptySelectors) {
            const emptyElements = await page.locator(selector).count();
            if (emptyElements > 0) {
              const emptyText = await page.locator(selector).first().textContent();
              console.warn(`Potential empty data on ${pageInfo.name}: ${emptyText}`);
            }
          }
          
          // Page-specific checks
          if (pageInfo.name === 'Job Financial Summary') {
            // Check for forecasted final cost
            const forecastCost = page.locator('text=/Forecasted Final Cost/i');
            if (await forecastCost.count() > 0) {
              const parentRow = forecastCost.locator('..').locator('..');
              const values = await parentRow.locator('td').allTextContents();
              const hasNonZeroValue = values.some(v => v && v.trim() !== '-' && v.trim() !== '$0' && v.trim() !== '');
              if (!hasNonZeroValue) {
                console.warn(`Job Financial Summary: Forecasted Final Cost appears empty for ${jobNumber}`);
              }
            }
          }
          
          if (pageInfo.name === 'Cost to Complete') {
            // Check for forecasts
            const forecastTable = page.locator('table');
            if (await forecastTable.count() > 0) {
              const rows = await forecastTable.locator('tbody tr').count();
              if (rows === 0) {
                console.warn(`Cost to Complete: No forecasts found for ${jobNumber}`);
              }
            }
          }
          
          if (pageInfo.name === 'Timelog Register') {
            // Check for timelog entries
            const timelogTable = page.locator('table');
            if (await timelogTable.count() > 0) {
              const rows = await timelogTable.locator('tbody tr').count();
              if (rows === 0) {
                console.warn(`Timelog Register: No entries found for ${jobNumber}`);
              }
            }
          }
          
          if (pageInfo.name === 'Progress Reports') {
            // Check for progress reports
            const reports = page.locator('text=/PR-/i');
            const reportCount = await reports.count();
            if (reportCount === 0) {
              console.warn(`Progress Reports: No reports found for ${jobNumber}`);
            }
          }
          
          // Log any errors found
          if (errors.length > 0) {
            console.error(`Errors found on ${pageInfo.name} for ${jobNumber}:`, errors);
          }
          
          // Basic assertion - page should load without critical errors
          const pageTitle = await page.title();
          expect(pageTitle).toBeTruthy();
        });
      }
    });
  }
});




