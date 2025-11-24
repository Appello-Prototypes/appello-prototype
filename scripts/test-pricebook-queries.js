/**
 * Test Pricebook Queries
 * 
 * Tests querying products by pricebook metadata
 */

require('dotenv').config({ path: '.env.local', override: true });
const mongoose = require('mongoose');

const Product = require('../src/server/models/Product');

async function testPricebookQueries() {
  try {
    console.log('🔗 Connecting to database...');
    const mongoUri = process.env.MONGODB_DEV_URI || process.env.MONGODB_URI;
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to database\n');

    console.log('🧪 Testing Pricebook Queries\n');
    console.log('='.repeat(80));

    // Test 1: Query by section
    console.log('\n📊 TEST 1: Query by Section (FIBREGLASS)');
    console.log('-'.repeat(80));
    const sectionProducts = await Product.find({ pricebookSection: 'FIBREGLASS' })
      .select('name pricebookSection pricebookPageNumber pricebookPageName pricebookGroupCode')
      .lean();
    console.log(`  ✅ Found ${sectionProducts.length} products`);
    sectionProducts.forEach(p => {
      console.log(`     - ${p.name}`);
      console.log(`       Page: ${p.pricebookPageNumber} | Group: ${p.pricebookGroupCode || 'N/A'}`);
    });

    // Test 2: Query by page number
    console.log('\n📊 TEST 2: Query by Page Number (1.1)');
    console.log('-'.repeat(80));
    const pageProducts = await Product.find({ pricebookPageNumber: '1.1' })
      .select('name pricebookPageNumber pricebookPageName')
      .lean();
    console.log(`  ✅ Found ${pageProducts.length} products`);
    pageProducts.forEach(p => {
      console.log(`     - ${p.name} (${p.pricebookPageName})`);
    });

    // Test 3: Query by group code
    console.log('\n📊 TEST 3: Query by Group Code (CAEG171)');
    console.log('-'.repeat(80));
    const groupProducts = await Product.find({ pricebookGroupCode: 'CAEG171' })
      .select('name pricebookGroupCode')
      .lean();
    console.log(`  ✅ Found ${groupProducts.length} products`);
    groupProducts.forEach(p => {
      console.log(`     - ${p.name}`);
    });

    // Test 4: Check products without pricebook metadata
    console.log('\n📊 TEST 4: Products Without Pricebook Metadata');
    console.log('-'.repeat(80));
    const productsWithoutMetadata = await Product.find({
      $or: [
        { pricebookSection: { $exists: false } },
        { pricebookSection: null },
        { pricebookSection: '' }
      ]
    })
      .select('name category')
      .limit(5)
      .lean();
    console.log(`  ⚠️  Found ${productsWithoutMetadata.length} products without pricebook metadata`);
    if (productsWithoutMetadata.length > 0) {
      console.log('  Sample products:');
      productsWithoutMetadata.forEach(p => {
        console.log(`     - ${p.name} (Category: ${p.category || 'N/A'})`);
      });
    }

    // Test 5: Summary by section
    console.log('\n📊 TEST 5: Summary by Section');
    console.log('-'.repeat(80));
    const allProducts = await Product.find({ pricebookSection: { $exists: true, $ne: null, $ne: '' } })
      .select('pricebookSection pricebookPageNumber')
      .lean();
    
    const bySection = {};
    allProducts.forEach(p => {
      const section = p.pricebookSection;
      if (!bySection[section]) {
        bySection[section] = { products: 0, pages: new Set() };
      }
      bySection[section].products++;
      if (p.pricebookPageNumber) {
        bySection[section].pages.add(p.pricebookPageNumber);
      }
    });

    for (const [section, data] of Object.entries(bySection)) {
      console.log(`  ${section}:`);
      console.log(`    - Products: ${data.products}`);
      console.log(`    - Pages: ${data.pages.size}`);
    }

    console.log('\n✅ All tests completed');

  } catch (error) {
    console.error('❌ Error testing pricebook queries:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from database');
  }
}

if (require.main === module) {
  testPricebookQueries()
    .then(() => {
      console.log('\n✅ Pricebook query test completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Pricebook query test failed:', error);
      process.exit(1);
    });
}

module.exports = { testPricebookQueries };

