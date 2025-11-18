#!/usr/bin/env node

/**
 * Seed Both Databases
 * Seeds both development and production databases with the same fresh data
 */

const { spawn } = require('child_process');
const path = require('path');

async function seedDatabase(envVar, dbName) {
  return new Promise((resolve, reject) => {
    console.log(`\n🌱 Seeding ${dbName} database...`);
    
    const seedScript = spawn('node', [path.join(__dirname, 'seed-complete-fresh.js')], {
      env: {
        ...process.env,
        [envVar]: process.env[envVar],
        // Override to use the specific database
        MONGODB_URI: process.env[envVar],
        MONGODB_DEV_URI: process.env[envVar]
      },
      stdio: 'inherit',
      shell: false
    });

    seedScript.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ Successfully seeded ${dbName}`);
        resolve();
      } else {
        console.error(`❌ Failed to seed ${dbName} (exit code: ${code})`);
        reject(new Error(`Seed failed with code ${code}`));
      }
    });

    seedScript.on('error', (error) => {
      console.error(`❌ Error seeding ${dbName}:`, error);
      reject(error);
    });
  });
}

async function seedBothDatabases() {
  try {
    require('dotenv').config({ path: '.env.local' });

    const devUri = process.env.MONGODB_DEV_URI;
    const prodUri = process.env.MONGODB_URI;

    if (!devUri) {
      console.error('❌ MONGODB_DEV_URI not set in .env.local');
      process.exit(1);
    }

    if (!prodUri) {
      console.error('❌ MONGODB_URI not set in .env.local');
      process.exit(1);
    }

    console.log('🚀 Starting seed process for both databases...');
    console.log('⚠️  WARNING: This will DELETE ALL existing data in both databases!');

    // Seed development database
    await seedDatabase('MONGODB_DEV_URI', 'Development (appello-tasks-dev)');

    // Seed production database
    await seedDatabase('MONGODB_URI', 'Production (appello-tasks-prod)');

    console.log('\n✅ Successfully seeded both databases!');
    console.log('📊 Both databases now have identical data:');
    console.log('   - 1 Project');
    console.log('   - 2 Jobs');
    console.log('   - 12 SOV Line Items');
    console.log('   - 10 Progress Reports');
    console.log('   - 3 Users');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

seedBothDatabases();

