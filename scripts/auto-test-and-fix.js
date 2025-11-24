/**
 * Automated Test Runner with Auto-Fix
 * 
 * Runs Playwright tests, analyzes results, fixes issues, and re-runs automatically
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const TEST_FILE = process.argv[2] || 'tests/e2e/multi-unit-step-by-step.spec.js';
const MAX_ITERATIONS = 3;
const TIMEOUT = 60000; // 60 seconds per test run

function runTests() {
  console.log(`\n🧪 Running tests: ${TEST_FILE}\n`);
  
  try {
    const output = execSync(
      `npx playwright test ${TEST_FILE} --project=local --reporter=json 2>&1`,
      { 
        encoding: 'utf-8',
        timeout: TIMEOUT,
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      }
    );
    
    return { success: true, output };
  } catch (error) {
    return { success: false, output: error.stdout || error.message, error };
  }
}

function parseTestResults(output) {
  try {
    // Try to find JSON output
    const jsonMatch = output.match(/\{[\s\S]*"status":[\s\S]*\}/);
    if (jsonMatch) {
      const json = JSON.parse(jsonMatch[0]);
      return {
        passed: json.stats?.passed || 0,
        failed: json.stats?.failed || 0,
        total: json.stats?.total || 0,
        tests: json.tests || []
      };
    }
    
    // Fallback: parse text output
    const passedMatch = output.match(/(\d+)\s+passed/);
    const failedMatch = output.match(/(\d+)\s+failed/);
    
    return {
      passed: passedMatch ? parseInt(passedMatch[1]) : 0,
      failed: failedMatch ? parseInt(failedMatch[1]) : 0,
      total: 0,
      tests: []
    };
  } catch (e) {
    return { passed: 0, failed: 0, total: 0, tests: [] };
  }
}

function analyzeFailures(output, results) {
  const issues = [];
  
  // Check for common issues
  if (output.includes('not visible') || output.includes('Timeout')) {
    issues.push({
      type: 'element_not_found',
      message: 'Elements not found - may need longer waits or different selectors'
    });
  }
  
  if (output.includes('API') && output.includes('error')) {
    issues.push({
      type: 'api_error',
      message: 'API errors detected - check server status'
    });
  }
  
  if (output.includes('normalized') && output.includes('0')) {
    issues.push({
      type: 'normalization_missing',
      message: 'Products missing normalized properties - may need migration'
    });
  }
  
  // Check specific test failures
  if (results.tests) {
    results.tests.forEach(test => {
      if (test.status === 'failed') {
        issues.push({
          type: 'test_failure',
          test: test.title,
          message: test.error?.message || 'Test failed'
        });
      }
    });
  }
  
  return issues;
}

function fixIssues(issues) {
  const fixes = [];
  
  issues.forEach(issue => {
    switch (issue.type) {
      case 'normalization_missing':
        console.log('🔧 Fix: Running property normalization migration...');
        try {
          execSync('node scripts/migrate-products-normalize-properties.js', { 
            encoding: 'utf-8',
            timeout: 30000 
          });
          fixes.push('✅ Ran normalization migration');
        } catch (e) {
          fixes.push(`❌ Migration failed: ${e.message}`);
        }
        break;
        
      case 'api_error':
        console.log('🔧 Fix: Checking API health...');
        try {
          const health = execSync('curl -s http://localhost:3001/api/health', { 
            encoding: 'utf-8',
            timeout: 5000 
          });
          if (health.includes('success')) {
            fixes.push('✅ API is healthy');
          } else {
            fixes.push('⚠️ API may not be running');
          }
        } catch (e) {
          fixes.push('⚠️ Could not check API health');
        }
        break;
        
      case 'element_not_found':
        fixes.push('⚠️ UI elements not found - may need to update test selectors');
        break;
    }
  });
  
  return fixes;
}

async function main() {
  console.log('🚀 Automated Test Runner with Auto-Fix\n');
  console.log(`📋 Test File: ${TEST_FILE}`);
  console.log(`🔄 Max Iterations: ${MAX_ITERATIONS}\n`);
  
  let iteration = 0;
  let allPassed = false;
  
  while (iteration < MAX_ITERATIONS && !allPassed) {
    iteration++;
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 ITERATION ${iteration}/${MAX_ITERATIONS}`);
    console.log('='.repeat(60));
    
    // Run tests
    const { success, output } = runTests();
    
    // Save output
    const outputFile = `/tmp/test-output-${iteration}.log`;
    fs.writeFileSync(outputFile, output);
    console.log(`\n💾 Output saved to: ${outputFile}`);
    
    // Parse results
    const results = parseTestResults(output);
    console.log(`\n📊 Results:`);
    console.log(`   Passed: ${results.passed}`);
    console.log(`   Failed: ${results.failed}`);
    console.log(`   Total: ${results.total || results.passed + results.failed}`);
    
    // Check if all passed
    if (results.failed === 0 && results.passed > 0) {
      console.log('\n✅ All tests passed!');
      allPassed = true;
      break;
    }
    
    // Analyze failures
    const issues = analyzeFailures(output, results);
    
    if (issues.length > 0) {
      console.log(`\n🔍 Found ${issues.length} issues:`);
      issues.forEach((issue, i) => {
        console.log(`   ${i + 1}. [${issue.type}] ${issue.message}`);
      });
      
      // Fix issues
      console.log('\n🔧 Attempting fixes...');
      const fixes = fixIssues(issues);
      fixes.forEach(fix => console.log(`   ${fix}`));
      
      // Wait a bit for fixes to take effect
      if (fixes.length > 0) {
        console.log('\n⏳ Waiting 3 seconds for fixes to take effect...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    } else {
      console.log('\n⚠️ No automatic fixes available for these failures');
      break;
    }
  }
  
  // Final summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('📋 FINAL SUMMARY');
  console.log('='.repeat(60));
  
  if (allPassed) {
    console.log('✅ All tests passed after fixes!');
  } else {
    console.log(`⚠️ Some tests still failing after ${iteration} iterations`);
    console.log('📝 Review test output files in /tmp/ for details');
  }
  
  console.log(`\n📁 Output files:`);
  for (let i = 1; i <= iteration; i++) {
    console.log(`   /tmp/test-output-${i}.log`);
  }
}

main().catch(console.error);

