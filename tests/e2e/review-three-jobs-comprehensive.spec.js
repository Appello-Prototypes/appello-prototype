import { test, expect } from '@playwright/test';

/**
 * Comprehensive review of the three scenario jobs
 * Checks all pages and API endpoints for missing data and errors
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

test.describe('Comprehensive Review of Three Scenario Jobs', () => {
  let jobIds = {};
  let issues = [];

  test('Get job IDs and verify jobs exist', async ({ request }) => {
    const response = await request.get('/api/jobs');
    const result = await response.json();
    
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    
    for (const job of result.data) {
      if (JOB_NUMBERS.includes(job.jobNumber)) {
        jobIds[job.jobNumber] = job._id;
        console.log(`Found ${job.jobNumber}: ${job._id}`);
      }
    }
    
    // Verify all three jobs exist
    for (const jobNumber of JOB_NUMBERS) {
      if (!jobIds[jobNumber]) {
        issues.push(`Missing job: ${jobNumber}`);
      }
    }
    
    expect(Object.keys(jobIds).length).toBe(3);
  });

  for (const jobNumber of JOB_NUMBERS) {
    test.describe(`Job: ${jobNumber}`, () => {
      test.beforeEach(async ({ page }) => {
        const jobId = jobIds[jobNumber];
        if (!jobId) {
          test.skip();
          return;
        }
        
        // Navigate directly to job overview
        await page.goto(`/jobs/${jobId}`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
      });

      test('Check Overview page', async ({ page, request }) => {
        const jobId = jobIds[jobNumber];
        
        // Check API endpoint
        const apiResponse = await request.get(`/api/jobs/${jobId}`);
        const jobData = await apiResponse.json();
        
        expect(jobData.success).toBe(true);
        expect(jobData.data).toBeDefined();
        
        // Check page loads
        await expect(page.locator('h1, h2')).toContainText([jobNumber, 'Overview']);
        
        // Check for error messages
        const errorMessages = await page.locator('text=/error/i, text=/failed/i, text=/not found/i').count();
        if (errorMessages > 0) {
          issues.push(`${jobNumber} Overview: Error messages found`);
        }
      });

      test('Check Job Financial Summary', async ({ page, request }) => {
        const jobId = jobIds[jobNumber];
        
        await page.goto(`/jobs/${jobId}/job-financial-summary`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
        
        // Check API endpoint
        const apiResponse = await request.get(`/api/financial/${jobId}/job-financial-summary`);
        const summaryData = await apiResponse.json();
        
        expect(summaryData.success).toBe(true);
        
        if (summaryData.data?.summary?.months) {
          const months = summaryData.data.summary.months;
          
          // Check if forecasted final cost is populated
          const monthsWithForecast = months.filter(m => m.forecastedFinalCost > 0);
          if (monthsWithForecast.length === 0) {
            issues.push(`${jobNumber} Job Financial Summary: No forecasted final cost values found`);
          }
          
          // Check for other missing data
          months.forEach((month, index) => {
            if (!month.forecastedFinalCost || month.forecastedFinalCost === 0) {
              issues.push(`${jobNumber} Job Financial Summary: Month ${index + 1} missing forecasted final cost`);
            }
            if (!month.jobToDateCost && month.jobToDateCost !== 0) {
              issues.push(`${jobNumber} Job Financial Summary: Month ${index + 1} missing job to date cost`);
            }
          });
        }
        
        // Check page for errors
        const errors = await page.locator('text=/error/i, text=/failed/i').count();
        if (errors > 0) {
          issues.push(`${jobNumber} Job Financial Summary: Error messages on page`);
        }
      });

      test('Check Progress Reports', async ({ page, request }) => {
        const jobId = jobIds[jobNumber];
        
        await page.goto(`/jobs/${jobId}/progress-reports`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
        
        // Check API endpoint
        const apiResponse = await request.get(`/api/financial/${jobId}/progress-reports?status=approved`);
        const reportsData = await apiResponse.json();
        
        expect(apiResponse.ok()).toBe(true);
        
        if (reportsData.success && reportsData.data) {
          if (reportsData.data.length === 0) {
            issues.push(`${jobNumber} Progress Reports: No progress reports found`);
          }
        }
      });

      test('Check Cost to Complete', async ({ page, request }) => {
        const jobId = jobIds[jobNumber];
        
        await page.goto(`/jobs/${jobId}/cost-to-complete`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
        
        // Check API endpoint
        const apiResponse = await request.get(`/api/financial/${jobId}/cost-to-complete/forecasts`);
        const forecastsData = await apiResponse.json();
        
        expect(apiResponse.ok()).toBe(true);
        
        if (forecastsData.success && forecastsData.data) {
          if (forecastsData.data.length === 0) {
            issues.push(`${jobNumber} Cost to Complete: No forecasts found`);
          } else {
            // Check if forecasts have summary data
            forecastsData.data.forEach((forecast, index) => {
              if (!forecast.summary?.forecastFinalCost && forecast.summary?.forecastFinalCost !== 0) {
                issues.push(`${jobNumber} Cost to Complete: Forecast ${forecast.forecastPeriod} missing forecastFinalCost`);
              }
            });
          }
        }
      });

      test('Check Timelog Register', async ({ page, request }) => {
        const jobId = jobIds[jobNumber];
        
        await page.goto(`/jobs/${jobId}/timelog-register`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
        
        // Check API endpoint
        const apiResponse = await request.get(`/api/financial/${jobId}/timelog-register`);
        const timelogData = await apiResponse.json();
        
        expect(apiResponse.ok()).toBe(true);
        
        if (timelogData.success && timelogData.data) {
          if (timelogData.data.length === 0) {
            issues.push(`${jobNumber} Timelog Register: No timelog entries found`);
          }
        }
      });

      test('Check AP Register', async ({ page, request }) => {
        const jobId = jobIds[jobNumber];
        
        await page.goto(`/jobs/${jobId}/ap-register`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
        
        // Check API endpoint
        const apiResponse = await request.get(`/api/financial/${jobId}/ap-register`);
        const apData = await apiResponse.json();
        
        expect(apiResponse.ok()).toBe(true);
        
        if (apData.success && apData.data) {
          if (apData.data.length === 0) {
            issues.push(`${jobNumber} AP Register: No AP entries found`);
          }
        }
      });

      test('Check Earned vs Burned', async ({ page, request }) => {
        const jobId = jobIds[jobNumber];
        
        await page.goto(`/jobs/${jobId}/earned-vs-burned`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
        
        // Check API endpoint
        const apiResponse = await request.get(`/api/financial/${jobId}/earned-vs-burned`);
        const evbData = await apiResponse.json();
        
        expect(apiResponse.ok()).toBe(true);
        
        if (evbData.success && evbData.data) {
          // Check for required data
          if (!evbData.data.totals) {
            issues.push(`${jobNumber} Earned vs Burned: Missing totals data`);
          }
        }
      });

      test('Check SOV Line Items', async ({ page, request }) => {
        const jobId = jobIds[jobNumber];
        
        await page.goto(`/jobs/${jobId}/sov-line-items`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
        
        // Check API endpoint
        const apiResponse = await request.get(`/api/jobs/${jobId}/sov-components`);
        const sovData = await apiResponse.json();
        
        expect(apiResponse.ok()).toBe(true);
        
        if (sovData.success && sovData.data) {
          if (!sovData.data.lineItems || sovData.data.lineItems.length === 0) {
            issues.push(`${jobNumber} SOV Line Items: No SOV items found`);
          }
        }
      });

      test('Check Monthly Cost Report', async ({ page, request }) => {
        const jobId = jobIds[jobNumber];
        
        await page.goto(`/jobs/${jobId}/monthly-cost-report`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
        
        // Check API endpoint
        const apiResponse = await request.get(`/api/financial/${jobId}/monthly-cost-report`);
        const costData = await apiResponse.json();
        
        expect(apiResponse.ok()).toBe(true);
        
        if (costData.success && costData.data) {
          if (!costData.data.months || costData.data.months.length === 0) {
            issues.push(`${jobNumber} Monthly Cost Report: No monthly data found`);
          }
        }
      });
    });
  }

  test.afterAll(async () => {
    // Print all issues found
    if (issues.length > 0) {
      console.log('\n=== ISSUES FOUND ===');
      issues.forEach(issue => console.log(`- ${issue}`));
      console.log(`\nTotal issues: ${issues.length}`);
    } else {
      console.log('\n✅ No issues found!');
    }
  });
});







