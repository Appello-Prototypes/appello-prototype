/**
 * End-to-end test: Verify tools are actually being called
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const { jobTools, toolHandlers } = require('../src/server/services/ai/tools/jobTools');
const responseGenerator = require('../src/server/services/ai/responseGenerator');

async function connectDB() {
  const mongoUri = process.env.MONGODB_DEV_URI || process.env.MONGODB_URI;
  await mongoose.connect(mongoUri);
  console.log('✅ Database connected');
}

async function test() {
  console.log('🧪 End-to-End Tool Calling Test\n');
  
  await connectDB();
  
  const message = 'what jobs can you access?';
  const context = {};
  const data = {}; // Empty - force tool usage
  
  console.log(`📝 Message: "${message}"`);
  console.log(`🔧 Tools available: ${jobTools.length}`);
  console.log(`📊 Data provided: ${Object.keys(data).length} keys\n`);
  
  try {
    console.log('📤 Calling generateResponseWithTools...');
    const result = await responseGenerator.generateResponseWithTools(
      message,
      data,
      context,
      jobTools,
      toolHandlers
    );
    
    console.log('\n📥 Result received:');
    console.log(`   ✅ Success: ${!!result.response}`);
    console.log(`   🔧 Tool calls: ${result.toolCallsUsed || 0}`);
    console.log(`   🛠️  Tools made: ${(result.toolCallsMade || []).map(t => t.name).join(', ') || 'none'}`);
    console.log(`   📝 Response length: ${result.response?.length || 0}`);
    console.log(`   📄 Response preview: ${(result.response || '').substring(0, 200)}...`);
    
    if (result.toolCallsUsed > 0) {
      console.log('\n✅ SUCCESS: Tools were called!');
    } else {
      console.log('\n⚠️  WARNING: No tools were called');
    }
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
  }
}

test().catch(console.error);

