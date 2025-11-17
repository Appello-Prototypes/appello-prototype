import { test, expect } from '@playwright/test';
import { TestHelpers } from '../utils/test-helpers.js';
import fs from 'fs';
import path from 'path';

test.describe('Environment Comparison Tests', () => {
  const resultsFile = path.join(process.cwd(), 'test-results', 'comparison-results.json');
  
  test('Compare dashboard load times', async ({ page, baseURL }) => {
    const projectName = baseURL.includes('vercel.app') ? 'production' : 'local';
    const helpers = new TestHelpers(page);
    const startTime = Date.now();
    
    await page.goto(baseURL + '/dashboard');
    await helpers.waitForPageLoad();
    await helpers.waitForAPICalls();
    
    const loadTime = Date.now() - startTime;
    const metrics = await helpers.getPerformanceMetrics();
    
    const result = {
      environment: projectName,
      url: baseURL,
      loadTime,
      metrics,
      timestamp: new Date().toISOString(),
    };
    
    // Save results for comparison
    const resultsDir = path.dirname(resultsFile);
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }
    
    let allResults = {};
    if (fs.existsSync(resultsFile)) {
      allResults = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
    }
    
    allResults[projectName] = result;
    fs.writeFileSync(resultsFile, JSON.stringify(allResults, null, 2));
    
    console.log(`[${projectName}] Dashboard load time: ${loadTime}ms`);
  });

  test('Compare API response times', async ({ request, baseURL }) => {
    const projectName = baseURL.includes('vercel.app') ? 'production' : 'local';
    const endpoints = ['/api/health', '/api/projects', '/api/jobs'];
    const results = {};
    
    for (const endpoint of endpoints) {
      try {
        const startTime = Date.now();
        const response = await request.get(baseURL + endpoint);
        const responseTime = Date.now() - startTime;
        
        results[endpoint] = {
          status: response.status(),
          responseTime,
          success: response.ok(),
        };
      } catch (error) {
        results[endpoint] = {
          error: error.message,
          success: false,
        };
      }
    }
    
    // Save API results
    const resultsDir = path.dirname(resultsFile);
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }
    
    let allResults = {};
    if (fs.existsSync(resultsFile)) {
      allResults = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
    }
    
    if (!allResults[projectName]) {
      allResults[projectName] = {};
    }
    allResults[projectName].apiResults = results;
    fs.writeFileSync(resultsFile, JSON.stringify(allResults, null, 2));
    
    console.log(`[${projectName}] API Results:`, JSON.stringify(results, null, 2));
  });

  test('Generate comparison report', async () => {
    // This test runs after both local and production tests
    if (!fs.existsSync(resultsFile)) {
      test.skip();
      return;
    }
    
    const allResults = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
    const local = allResults.local;
    const production = allResults.production;
    
    if (!local || !production) {
      console.log('Waiting for both environments to complete tests...');
      test.skip();
      return;
    }
    
    const comparison = {
      dashboard: {
        localLoadTime: local.loadTime,
        productionLoadTime: production.loadTime,
        difference: production.loadTime - local.loadTime,
        percentDifference: ((production.loadTime - local.loadTime) / local.loadTime * 100).toFixed(2) + '%',
      },
      metrics: {},
    };
    
    // Compare performance metrics
    if (local.metrics && production.metrics) {
      for (const key in local.metrics) {
        if (typeof local.metrics[key] === 'number') {
          comparison.metrics[key] = {
            local: local.metrics[key],
            production: production.metrics[key],
            difference: production.metrics[key] - local.metrics[key],
            percentDifference: ((production.metrics[key] - local.metrics[key]) / local.metrics[key] * 100).toFixed(2) + '%',
          };
        }
      }
    }
    
    // Compare API results
    if (local.apiResults && production.apiResults) {
      comparison.api = {};
      for (const endpoint in local.apiResults) {
        if (local.apiResults[endpoint].responseTime && production.apiResults[endpoint].responseTime) {
          comparison.api[endpoint] = {
            local: local.apiResults[endpoint].responseTime,
            production: production.apiResults[endpoint].responseTime,
            difference: production.apiResults[endpoint].responseTime - local.apiResults[endpoint].responseTime,
            percentDifference: ((production.apiResults[endpoint].responseTime - local.apiResults[endpoint].responseTime) / local.apiResults[endpoint].responseTime * 100).toFixed(2) + '%',
          };
        }
      }
    }
    
    const reportFile = path.join(process.cwd(), 'test-results', 'comparison-report.json');
    fs.writeFileSync(reportFile, JSON.stringify(comparison, null, 2));
    
    console.log('\n=== COMPARISON REPORT ===');
    console.log(JSON.stringify(comparison, null, 2));
    console.log('========================\n');
    
    // Verify environments are similar (within 50% difference)
    const loadTimeDiff = Math.abs(comparison.dashboard.percentDifference.replace('%', ''));
    expect(parseFloat(loadTimeDiff)).toBeLessThan(50); // Should be within 50% difference
  });
});

