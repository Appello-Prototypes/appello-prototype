/**
 * Direct test of Claude tool calling
 */

require('dotenv').config({ path: '.env.local' });
const Anthropic = require('@anthropic-ai/sdk');
const { jobTools, toolHandlers } = require('../src/server/services/ai/tools/jobTools');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

async function testDirect() {
  console.log('🧪 Direct Claude Tool Calling Test\n');
  
  // Convert tools
  const claudeTools = jobTools.map(tool => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.input_schema
  }));

  console.log(`📋 ${claudeTools.length} tools available`);
  console.log(`   First: ${claudeTools[0].name}\n`);

  try {
    console.log('📤 Sending request to Claude...');
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1000,
      system: 'You MUST use the list_jobs tool when asked about jobs. Do not make up data.',
      messages: [{
        role: 'user',
        content: 'What jobs can you access? Use the list_jobs tool.'
      }],
      tools: claudeTools
    });

    console.log('\n📥 Response received:');
    console.log(`   Content items: ${response.content.length}`);
    
    response.content.forEach((item, idx) => {
      console.log(`\n   Item ${idx + 1}:`);
      console.log(`   Type: ${item.type}`);
      if (item.type === 'tool_use') {
        console.log(`   ✅ TOOL CALLED: ${item.name}`);
        console.log(`   Input: ${JSON.stringify(item.input)}`);
      } else if (item.type === 'text') {
        console.log(`   Text: ${item.text.substring(0, 100)}...`);
      }
    });

    const toolUses = response.content.filter(item => item.type === 'tool_use');
    if (toolUses.length > 0) {
      console.log(`\n✅ SUCCESS: Claude called ${toolUses.length} tool(s)!`);
      
      // Execute tool
      const toolUse = toolUses[0];
      console.log(`\n🔧 Executing tool: ${toolUse.name}`);
      
      if (toolHandlers[toolUse.name]) {
        const mongoose = require('mongoose');
        const mongoUri = process.env.MONGODB_DEV_URI || process.env.MONGODB_URI;
        await mongoose.connect(mongoUri);
        console.log('   Database connected');
        
        const result = await toolHandlers[toolUse.name](toolUse.input);
        console.log(`   ✅ Tool result: ${result.total || result.jobs?.length || 0} jobs`);
        
        await mongoose.connection.close();
      }
    } else {
      console.log(`\n⚠️  Claude did NOT call any tools`);
      console.log(`   Response: ${response.content[0]?.text?.substring(0, 200)}`);
    }
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    console.error(error.stack);
  }
}

testDirect().catch(console.error);

