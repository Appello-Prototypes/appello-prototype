/**
 * Test helpers for Playwright tests
 */

export class TestHelpers {
  constructor(page) {
    this.page = page;
  }

  /**
   * Wait for page to be fully loaded
   */
  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * Wait for API calls to complete
   */
  async waitForAPICalls() {
    await this.page.waitForLoadState('networkidle');
    // Wait a bit more for React Query to finish
    await this.page.waitForTimeout(1000);
  }

  /**
   * Take performance metrics
   */
  async getPerformanceMetrics() {
    const metrics = await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      const paint = performance.getEntriesByType('paint');
      
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
        totalTime: navigation.loadEventEnd - navigation.fetchStart,
        dnsTime: navigation.domainLookupEnd - navigation.domainLookupStart,
        connectTime: navigation.connectEnd - navigation.connectStart,
        responseTime: navigation.responseEnd - navigation.requestStart,
        domProcessingTime: navigation.domComplete - navigation.domInteractive,
      };
    });
    
    return metrics;
  }

  /**
   * Get network request metrics
   */
  async getNetworkMetrics() {
    const requests = [];
    
    this.page.on('request', request => {
      requests.push({
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType(),
        timestamp: Date.now(),
      });
    });

    return requests;
  }

  /**
   * Measure API response time
   */
  async measureAPIResponse(urlPattern) {
    const startTime = Date.now();
    const response = await this.page.waitForResponse(
      response => response.url().includes(urlPattern) && response.status() === 200
    );
    const endTime = Date.now();
    
    return {
      url: response.url(),
      status: response.status(),
      responseTime: endTime - startTime,
      size: (await response.body()).length,
    };
  }

  /**
   * Check for console errors
   */
  async getConsoleErrors() {
    const errors = [];
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    return errors;
  }

  /**
   * Compare two sets of metrics
   */
  compareMetrics(localMetrics, prodMetrics, threshold = 0.2) {
    const comparison = {};
    const differences = [];

    for (const key in localMetrics) {
      const local = localMetrics[key];
      const prod = prodMetrics[key];
      const diff = Math.abs(local - prod);
      const percentDiff = (diff / local) * 100;
      
      comparison[key] = {
        local,
        production: prod,
        difference: diff,
        percentDifference: percentDiff,
        withinThreshold: percentDiff <= (threshold * 100),
      };

      if (percentDiff > (threshold * 100)) {
        differences.push({
          metric: key,
          local,
          production: prod,
          difference: percentDiff.toFixed(2) + '%',
        });
      }
    }

    return {
      comparison,
      differences,
      allWithinThreshold: differences.length === 0,
    };
  }
}

