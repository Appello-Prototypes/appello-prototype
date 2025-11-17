# Playwright E2E Tests

Comprehensive end-to-end tests for both local and production environments.

## Overview

This test suite ensures that:
- Local and production environments behave identically
- Performance metrics are within acceptable thresholds
- All critical workflows function correctly
- API endpoints respond correctly

## Test Structure

```
tests/
├── e2e/
│   ├── dashboard.spec.js      # Dashboard page tests
│   ├── navigation.spec.js     # Navigation and routing tests
│   ├── api-health.spec.js      # API health and response tests
│   ├── performance.spec.js    # Performance metrics tests
│   └── comparison.spec.js     # Environment comparison tests
└── utils/
    └── test-helpers.js        # Test utility functions
```

## Running Tests

### Run All Tests (Local + Production)

```bash
npm run test:e2e
```

### Run Local Tests Only

```bash
npm run test:e2e:local
```

### Run Production Tests Only

```bash
npm run test:e2e:production
```

### Run Tests with UI

```bash
npm run test:e2e:ui
```

### View Test Report

```bash
npm run test:e2e:report
```

## Environment Variables

Set these environment variables to customize test URLs:

```bash
# Local environment URL (default: http://localhost:3000)
export LOCAL_URL=http://localhost:3000

# Production environment URL (default: https://appello-prototype.vercel.app)
export PRODUCTION_URL=https://appello-prototype.vercel.app

# Skip local server startup (if server is already running)
export SKIP_LOCAL_SERVER=true
```

## Test Coverage

### Dashboard Tests
- Page load verification
- Performance metrics collection
- API call verification
- Content structure validation

### Navigation Tests
- All main routes tested
- Navigation performance
- Route loading verification

### API Health Tests
- Health endpoint verification
- API response time measurement
- Endpoint availability check

### Performance Tests
- Page load metrics (FCP, LCP, TTI)
- Network request analysis
- Memory usage monitoring
- Resource size tracking

### Comparison Tests
- Side-by-side environment comparison
- Performance difference analysis
- API response time comparison
- Generated comparison reports

## Test Results

Test results are saved in:
- `test-results/` - Test execution results
- `test-results/comparison-results.json` - Environment comparison data
- `test-results/comparison-report.json` - Generated comparison report
- `playwright-report/` - HTML test report

## Performance Thresholds

Tests verify that:
- First Contentful Paint (FCP) < 3 seconds
- Total page load < 10 seconds
- API response times < 5 seconds
- Memory usage < 50MB
- No failed network requests

## Comparison Criteria

The comparison tests ensure:
- Load times are within 50% difference between environments
- API response times are similar
- Page structure matches between environments
- No console errors in either environment

## Continuous Integration

To run tests in CI:

```bash
# Install dependencies
npm install
npx playwright install --with-deps chromium

# Run tests
npm run test:e2e
```

## Troubleshooting

### Local Server Not Starting

If the local server doesn't start automatically:
1. Start it manually: `npm run dev`
2. Set `SKIP_LOCAL_SERVER=true`
3. Run tests: `npm run test:e2e:local`

### Production Tests Failing

1. Verify production URL is accessible
2. Check environment variables are set correctly
3. Verify API endpoints are responding
4. Check network connectivity

### Performance Tests Failing

1. Check network conditions
2. Verify server resources
3. Review performance thresholds
4. Check for resource-heavy operations

## Best Practices

1. **Run tests before deployment** - Ensure local matches production
2. **Monitor performance trends** - Track metrics over time
3. **Review comparison reports** - Identify performance regressions
4. **Fix failing tests immediately** - Don't let tests become stale

## Example Output

```
Running 15 tests using 2 workers

  ✓ [local] Dashboard loads correctly (2.3s)
  ✓ [production] Dashboard loads correctly (3.1s)
  ✓ [local] Navigate to Projects (1.8s)
  ✓ [production] Navigate to Projects (2.4s)
  ...

Test Results:
  - Local average load time: 2.1s
  - Production average load time: 2.8s
  - Performance difference: 33% (within threshold)

Comparison Report saved to: test-results/comparison-report.json
```

