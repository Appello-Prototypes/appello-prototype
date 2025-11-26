/**
 * Test API endpoint tool calling
 */

const http = require('http');

function testAPI(message) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      message: message,
      context: {}
    });

    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/ai/chat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          resolve(result);
        } catch (e) {
          reject(new Error(`Parse error: ${e.message}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log('🧪 API Tool Calling Tests\n');
  console.log('='.repeat(60));

  const tests = [
    {
      name: 'General query - should call list_jobs',
      message: 'what jobs can you access?'
    },
    {
      name: 'Explicit tool request',
      message: 'Please use the list_jobs tool to show me all jobs'
    },
    {
      name: 'Specific job query',
      message: 'Tell me about job JOB-2025-ELEC-001'
    }
  ];

  for (const test of tests) {
    console.log(`\n📝 Test: ${test.name}`);
    console.log(`   Query: "${test.message}"`);
    
    try {
      const start = Date.now();
      const result = await testAPI(test.message);
      const duration = Date.now() - start;

      console.log(`   ✅ Success: ${result.success}`);
      console.log(`   ⏱️  Duration: ${duration}ms`);
      console.log(`   🔧 Tool calls: ${result.toolCallsUsed || 0}`);
      
      if (result.toolCallsMade && result.toolCallsMade.length > 0) {
        console.log(`   🛠️  Tools used:`);
        result.toolCallsMade.forEach(tool => {
          console.log(`      - ${tool.name}`);
        });
      } else {
        console.log(`   ⚠️  No tools called`);
      }
      
      console.log(`   📝 Response length: ${result.response?.length || 0} chars`);
      console.log(`   📄 Preview: ${(result.response || '').substring(0, 100)}...`);
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ API tests complete!');
}

runTests().catch(console.error);

