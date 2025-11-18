/**
 * Database Schema Sync Script
 * 
 * Syncs schema (indexes, validations) from production to development database
 * This ensures both databases have the same structure without copying data
 */

require('dotenv').config();
require('dotenv').config({ path: '.env.local', override: true });
const mongoose = require('mongoose');

// Import all models to register their schemas
const User = require('../src/server/models/User');
const Task = require('../src/server/models/Task');
const Project = require('../src/server/models/Project');
const Job = require('../src/server/models/Job');
const TimeEntry = require('../src/server/models/TimeEntry');
const ScheduleOfValues = require('../src/server/models/ScheduleOfValues');
const ProgressReport = require('../src/server/models/ProgressReport');
const APRegister = require('../src/server/models/APRegister');
const TimelogRegister = require('../src/server/models/TimelogRegister');

async function syncSchema(sourceUri, targetUri, sourceName, targetName) {
  console.log(`\n🔄 Syncing schema from ${sourceName} to ${targetName}...\n`);

  // Connect to source database
  const sourceConn = await mongoose.createConnection(sourceUri).asPromise();
  console.log(`✅ Connected to ${sourceName}`);

  // Connect to target database
  const targetConn = await mongoose.createConnection(targetUri).asPromise();
  console.log(`✅ Connected to ${targetName}`);

  try {
    // Get all collections from source
    const collections = await sourceConn.db.listCollections().toArray();
    console.log(`\n📋 Found ${collections.length} collections to sync\n`);

    for (const collectionInfo of collections) {
      const collectionName = collectionInfo.name;
      
      // Skip system collections
      if (collectionName.startsWith('system.')) {
        continue;
      }

      console.log(`\n📦 Syncing collection: ${collectionName}`);

      // Check if collection exists in source
      const sourceCollections = await sourceConn.db.listCollections({ name: collectionName }).toArray();
      if (sourceCollections.length === 0) {
        console.log(`   ⚠️  Collection doesn't exist in source, skipping`);
        continue;
      }

      // Get indexes from source
      let sourceIndexes;
      try {
        sourceIndexes = await sourceConn.db.collection(collectionName).indexes();
        console.log(`   Found ${sourceIndexes.length} indexes`);
      } catch (error) {
        console.log(`   ⚠️  Could not get indexes: ${error.message}`);
        continue;
      }

      // Get existing indexes from target (collection may not exist yet)
      let targetIndexes = [];
      let targetIndexKeys = [];
      try {
        targetIndexes = await targetConn.db.collection(collectionName).indexes();
        targetIndexKeys = targetIndexes.map(idx => JSON.stringify(idx.key));
      } catch (error) {
        // Collection doesn't exist yet, that's okay - we'll create it with indexes
        console.log(`   ℹ️  Collection doesn't exist in target yet, will create with indexes`);
      }

      // Create missing indexes in target
      for (const index of sourceIndexes) {
        const indexKey = JSON.stringify(index.key);
        
        if (!targetIndexKeys.includes(indexKey)) {
          try {
            // Remove _id from index spec if it's the default
            const indexSpec = { ...index };
            delete indexSpec.v;
            delete indexSpec.ns;
            
            await targetConn.db.collection(collectionName).createIndex(
              index.key,
              {
                unique: index.unique || false,
                sparse: index.sparse || false,
                background: true,
                name: index.name,
              }
            );
            console.log(`   ✅ Created index: ${index.name || JSON.stringify(index.key)}`);
          } catch (error) {
            console.log(`   ⚠️  Could not create index ${index.name}: ${error.message}`);
          }
        } else {
          console.log(`   ✓ Index already exists: ${index.name || JSON.stringify(index.key)}`);
        }
      }

      // Get validation rules from source (if any)
      const sourceValidation = await sourceConn.db.command({
        listCollections: 1,
        filter: { name: collectionName }
      });
      
      if (sourceValidation.cursor.firstBatch[0]?.options?.validator) {
        console.log(`   📝 Validation rules found (manual sync may be needed)`);
      }
    }

    console.log(`\n✅ Schema sync completed!\n`);

  } catch (error) {
    console.error(`\n❌ Error syncing schema:`, error);
    throw error;
  } finally {
    await sourceConn.close();
    await targetConn.close();
    console.log(`🔌 Connections closed\n`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const direction = args[0] || 'prod-to-dev'; // Default: sync prod -> dev

  const prodUri = process.env.MONGODB_URI;
  const devUri = process.env.MONGODB_DEV_URI || prodUri?.replace('appello-tasks-prod', 'appello-tasks-dev');

  if (!prodUri) {
    console.error('❌ MONGODB_URI not set');
    process.exit(1);
  }

  if (!devUri) {
    console.error('❌ MONGODB_DEV_URI not set and could not infer from MONGODB_URI');
    process.exit(1);
  }

  if (direction === 'prod-to-dev') {
    await syncSchema(prodUri, devUri, 'Production', 'Development');
  } else if (direction === 'dev-to-prod') {
    console.log('⚠️  WARNING: Syncing dev to prod. This is usually not recommended.');
    await syncSchema(devUri, prodUri, 'Development', 'Production');
  } else {
    console.error('❌ Invalid direction. Use "prod-to-dev" or "dev-to-prod"');
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { syncSchema };

