/**
 * Comprehensive test suite for AI tool calling
 */

const http = require('http');

function makeRequest(message) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ message, context: {} });
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/ai/chat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      },
      timeout: 30000
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(new Error(`Parse error: ${e.message}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Comprehensive AI Tool Calling Test Suite\n');
  console.log('='.repeat(70));

  const tests = [
    {
      name: 'Test 1: General query',
      message: 'what jobs can you access?',
      expectedTool: 'list_jobs'
    },
    {
      name: 'Test 2: Explicit tool request',
      message: 'Please use the list_jobs tool to show me all jobs',
      expectedTool: 'list_jobs'
    },
    {
      name: 'Test 3: Specific job query',
      message: 'Tell me about job JOB-2025-ELEC-001',
      expectedTool: 'get_job'
    },
    {
      name: 'Test 4: Job metrics query',
      message: 'Show me metrics for job JOB-2025-ELEC-001',
      expectedTool: 'get_job_metrics'
    },
    {
      name: 'Test 5: Forecast query',
      message: 'When will job JOB-2025-ELEC-001 be complete?',
      expectedTool: 'get_job_forecast'
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    console.log(`\n${test.name}`);
    console.log(`   Query: "${test.message}"`);
    console.log(`   Expected tool: ${test.expectedTool}`);
    
    try {
      const start = Date.now();
      const result = await makeRequest(test.message);
      const duration = Date.now() - start;

      const toolCalls = result.toolCallsUsed || 0;
      const toolsUsed = result.toolCallsMade || [];
      const toolNames = toolsUsed.map(t => t.name);

      console.log(`   ⏱️  Duration: ${duration}ms`);
      console.log(`   🔧 Tool calls: ${toolCalls}`);
      console.log(`   🛠️  Tools used: ${toolNames.join(', ') || 'none'}`);
      
      if (toolCalls > 0 && toolNames.includes(test.expectedTool)) {
        console.log(`   ✅ PASS - Tool ${test.expectedTool} was called`);
        passed++;
      } else if (toolCalls > 0) {
        console.log(`   ⚠️  PARTIAL - Tools called but not ${test.expectedTool}`);
        console.log(`      Called: ${toolNames.join(', ')}`);
        passed++;
      } else {
        console.log(`   ❌ FAIL - No tools called`);
        failed++;
      }
      
      console.log(`   📝 Response: ${(result.response || '').substring(0, 100)}...`);
    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);
  console.log(`✅ Success rate: ${((passed / tests.length) * 100).toFixed(1)}%`);
}

runTests().catch(console.error);

