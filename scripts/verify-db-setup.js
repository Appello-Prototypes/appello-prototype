/**
 * Verify Database Setup
 * 
 * Verifies that both development and production databases are configured correctly
 * and checks their connection status
 */

require('dotenv').config();
require('dotenv').config({ path: '.env.local', override: true });
const mongoose = require('mongoose');

async function verifyDatabase(uri, name) {
  console.log(`\n🔍 Verifying ${name} database...`);
  console.log(`   URI: ${uri.replace(/:[^:@]+@/, ':****@')}`);
  
  try {
    const conn = await mongoose.createConnection(uri).asPromise();
    const dbName = conn.db.databaseName;
    const collections = await conn.db.listCollections().toArray();
    
    console.log(`   ✅ Connected successfully`);
    console.log(`   📊 Database: ${dbName}`);
    console.log(`   📦 Collections: ${collections.length}`);
    
    // List collections (excluding system collections)
    const userCollections = collections
      .filter(c => !c.name.startsWith('system.'))
      .map(c => c.name);
    
    if (userCollections.length > 0) {
      console.log(`   📋 Collections: ${userCollections.join(', ')}`);
    }
    
    await conn.close();
    return { success: true, dbName, collections: userCollections };
  } catch (error) {
    console.log(`   ❌ Connection failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('\n🔍 Database Setup Verification\n');
  console.log('=' .repeat(50));
  
  const prodUri = process.env.MONGODB_URI;
  const devUri = process.env.MONGODB_DEV_URI;
  
  const results = {
    production: null,
    development: null,
  };
  
  // Verify production database
  if (prodUri) {
    results.production = await verifyDatabase(prodUri, 'Production');
  } else {
    console.log('\n⚠️  MONGODB_URI not set (production)');
  }
  
  // Verify development database
  if (devUri) {
    results.development = await verifyDatabase(devUri, 'Development');
  } else {
    console.log('\n⚠️  MONGODB_DEV_URI not set (development)');
    console.log('   Using MONGODB_URI for development (not recommended)');
    if (prodUri) {
      results.development = await verifyDatabase(prodUri, 'Development (using prod URI)');
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('\n📊 Summary:\n');
  
  if (results.production) {
    console.log(`Production: ${results.production.success ? '✅ Connected' : '❌ Failed'}`);
    if (results.production.success) {
      console.log(`   Database: ${results.production.dbName}`);
      console.log(`   Collections: ${results.production.collections.length}`);
    }
  }
  
  if (results.development) {
    console.log(`Development: ${results.development.success ? '✅ Connected' : '❌ Failed'}`);
    if (results.development.success) {
      console.log(`   Database: ${results.development.dbName}`);
      console.log(`   Collections: ${results.development.collections.length}`);
    }
  }
  
  // Check if databases are different
  if (results.production?.success && results.development?.success) {
    const prodDb = results.production.dbName;
    const devDb = results.development.dbName;
    
    if (prodDb === devDb) {
      console.log('\n⚠️  WARNING: Production and Development are using the same database!');
      console.log('   This is not recommended. Use separate databases.');
    } else {
      console.log('\n✅ Production and Development use separate databases');
    }
  }
  
  console.log('\n');
  
  // Exit with error if any database failed
  const allSuccess = Object.values(results).every(r => r === null || r.success);
  process.exit(allSuccess ? 0 : 1);
}

if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { verifyDatabase };

