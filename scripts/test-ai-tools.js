/**
 * Test script for AI Tool Calling
 * Tests tool definitions, handlers, and Claude integration
 */

require('dotenv').config({ path: '.env.local' });
const { jobTools, toolHandlers } = require('../src/server/services/ai/tools/jobTools');
const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

async function testToolDefinitions() {
  console.log('\n=== Test 1: Tool Definitions ===');
  console.log(`Total tools: ${jobTools.length}`);
  jobTools.forEach((tool, idx) => {
    console.log(`\n${idx + 1}. ${tool.name}`);
    console.log(`   Description: ${tool.description.substring(0, 80)}...`);
    console.log(`   Has schema: ${!!tool.input_schema}`);
    console.log(`   Properties: ${Object.keys(tool.input_schema?.properties || {}).join(', ')}`);
  });
}

async function testToolHandlers() {
  console.log('\n=== Test 2: Tool Handlers ===');
  
  try {
    console.log('\nTesting list_jobs...');
    const result = await toolHandlers.list_jobs({});
    console.log(`✅ Success: ${result.success}`);
    console.log(`   Total jobs: ${result.total}`);
    console.log(`   Jobs returned: ${result.jobs?.length || 0}`);
    if (result.jobs && result.jobs.length > 0) {
      console.log(`   First job: ${result.jobs[0].jobNumber} - ${result.jobs[0].name}`);
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }

  try {
    console.log('\nTesting get_job with JOB-2025-ELEC-001...');
    const result = await toolHandlers.get_job({ jobIdentifier: 'JOB-2025-ELEC-001' });
    console.log(`✅ Success: ${result.success}`);
    console.log(`   Job: ${result.job.jobNumber} - ${result.job.name}`);
    console.log(`   Status: ${result.job.status}`);
    console.log(`   Progress: ${result.job.overallProgress}%`);
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

async function testClaudeToolFormat() {
  console.log('\n=== Test 3: Claude Tool Format ===');
  
  // Convert to Claude format
  const claudeTools = jobTools.map(tool => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.input_schema
  }));

  console.log(`Converted ${claudeTools.length} tools to Claude format`);
  console.log('\nFirst tool format:');
  console.log(JSON.stringify(claudeTools[0], null, 2));
  
  return claudeTools;
}

async function testClaudeWithTools() {
  console.log('\n=== Test 4: Claude API with Tools ===');
  
  const claudeTools = await testClaudeToolFormat();
  
  try {
    console.log('\nMaking API call with tools...');
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1000,
      system: 'You are a helpful assistant. You have access to tools - use them when asked about jobs.',
      messages: [{
        role: 'user',
        content: 'What jobs can you access? Please use the list_jobs tool to get real data.'
      }],
      tools: claudeTools
    });

    console.log('\nResponse content types:');
    response.content.forEach((item, idx) => {
      console.log(`  ${idx + 1}. Type: ${item.type}`);
      if (item.type === 'tool_use') {
        console.log(`     Tool: ${item.name}`);
        console.log(`     Input: ${JSON.stringify(item.input)}`);
      } else if (item.type === 'text') {
        console.log(`     Text: ${item.text.substring(0, 100)}...`);
      }
    });

    // Check if tools were called
    const toolUses = response.content.filter(item => item.type === 'tool_use');
    if (toolUses.length > 0) {
      console.log(`\n✅ Claude called ${toolUses.length} tool(s)!`);
      return { response, toolUses };
    } else {
      console.log('\n⚠️  Claude did not call any tools');
      return { response, toolUses: [] };
    }
  } catch (error) {
    console.log(`\n❌ Error: ${error.message}`);
    console.log(error.stack);
    return null;
  }
}

async function testFullToolCallFlow() {
  console.log('\n=== Test 5: Full Tool Call Flow ===');
  
  const claudeTools = await testClaudeToolFormat();
  
  try {
    // Initial request
    let response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1000,
      system: 'You MUST use tools to get data. When asked about jobs, call list_jobs().',
      messages: [{
        role: 'user',
        content: 'What jobs can you access?'
      }],
      tools: claudeTools
    });

    const messages = [{
      role: 'user',
      content: 'What jobs can you access?'
    }];

    let toolCallCount = 0;
    const maxIterations = 5;

    for (let i = 0; i < maxIterations; i++) {
      console.log(`\nIteration ${i + 1}:`);
      
      const toolUses = response.content.filter(item => item.type === 'tool_use');
      const textContent = response.content.find(item => item.type === 'text');

      if (textContent && toolUses.length === 0) {
        console.log('✅ Got final response');
        console.log(`Response: ${textContent.text.substring(0, 200)}...`);
        break;
      }

      if (toolUses.length > 0) {
        toolCallCount++;
        console.log(`🔧 Claude called ${toolUses.length} tool(s)`);
        
        // Add assistant's tool use
        messages.push({
          role: 'assistant',
          content: response.content
        });

        // Execute tools and add results
        const toolResults = [];
        for (const toolUse of toolUses) {
          console.log(`   Executing: ${toolUse.name}`);
          if (toolHandlers[toolUse.name]) {
            try {
              const result = await toolHandlers[toolUse.name](toolUse.input);
              toolResults.push({
                type: 'tool_result',
                tool_use_id: toolUse.id,
                content: JSON.stringify(result)
              });
              console.log(`   ✅ Success`);
            } catch (error) {
              console.log(`   ❌ Error: ${error.message}`);
              toolResults.push({
                type: 'tool_result',
                tool_use_id: toolUse.id,
                content: JSON.stringify({ error: error.message })
              });
            }
          }
        }

        messages.push({
          role: 'user',
          content: toolResults
        });

        // Continue conversation
        response = await anthropic.messages.create({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 1000,
          system: 'You MUST use tools to get data.',
          messages: messages,
          tools: claudeTools
        });
      } else {
        console.log('⚠️  No tool calls, no text - unexpected state');
        break;
      }
    }

    console.log(`\n📊 Summary: ${toolCallCount} tool call(s) made`);
    return { success: true, toolCallCount };
  } catch (error) {
    console.log(`\n❌ Error: ${error.message}`);
    console.log(error.stack);
    return { success: false, error: error.message };
  }
}

async function runAllTests() {
  console.log('🧪 AI Tool Calling Test Suite\n');
  console.log('='.repeat(60));

  // Connect to database first
  const dbConnected = await connectDB();
  if (!dbConnected) {
    console.log('\n⚠️  Skipping database-dependent tests');
  }

  await testToolDefinitions();
  
  if (dbConnected) {
    await testToolHandlers();
  } else {
    console.log('\n⚠️  Skipping tool handler tests (no DB connection)');
  }
  
  await testClaudeToolFormat();
  await testClaudeWithTools();
  
  if (dbConnected) {
    await testFullToolCallFlow();
  } else {
    console.log('\n⚠️  Skipping full flow test (no DB connection)');
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Test suite complete!');
  
  // Close database connection
  if (dbConnected) {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Run tests
runAllTests().catch(console.error);

