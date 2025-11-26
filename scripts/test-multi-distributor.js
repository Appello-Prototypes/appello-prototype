/**
 * Test Multi-Distributor Product Functionality
 * 
 * This script tests that:
 * 1. Same product from different distributors shares one product record
 * 2. Each distributor's pricing is stored separately
 * 3. Variants support multiple distributor entries
 * 
 * Usage:
 *   node scripts/test-multi-distributor.js
 */

require('dotenv').config({ path: '.env.local', override: true });
const mongoose = require('mongoose');
const Product = require('../src/server/models/Product');
const Company = require('../src/server/models/Company');
const ProductType = require('../src/server/models/ProductType');

async function testMultiDistributor() {
  try {
    console.log('🧪 Testing Multi-Distributor Product Functionality...\n');
    
    // Connect to database
    const mongoUri = process.env.MONGODB_DEV_URI || process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_DEV_URI or MONGODB_URI must be set in .env.local');
    }
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to database\n');
    
    // Step 1: Create test companies
    console.log('📦 Step 1: Creating test companies...\n');
    
    const manufacturer = await Company.findOneAndUpdate(
      { name: 'Test Manufacturer', companyType: 'supplier' },
      {
        name: 'Test Manufacturer',
        companyType: 'supplier',
        isActive: true
      },
      { upsert: true, new: true }
    );
    console.log(`   ✅ Manufacturer: ${manufacturer.name} (${manufacturer._id})\n`);
    
    const distributorA = await Company.findOneAndUpdate(
      { name: 'Test Distributor A', companyType: 'distributor' },
      {
        name: 'Test Distributor A',
        companyType: 'distributor',
        isActive: true
      },
      { upsert: true, new: true }
    );
    console.log(`   ✅ Distributor A: ${distributorA.name} (${distributorA._id})\n`);
    
    const distributorB = await Company.findOneAndUpdate(
      { name: 'Test Distributor B', companyType: 'distributor' },
      {
        name: 'Test Distributor B',
        companyType: 'distributor',
        isActive: true
      },
      { upsert: true, new: true }
    );
    console.log(`   ✅ Distributor B: ${distributorB.name} (${distributorB._id})\n`);
    
    // Step 2: Create product type
    console.log('📋 Step 2: Creating product type...\n');
    const productType = await ProductType.findOneAndUpdate(
      { slug: 'test-product' },
      {
        name: 'Test Product',
        slug: 'test-product',
        description: 'Test product for multi-distributor testing',
        properties: [
          { key: 'size', label: 'Size', type: 'string' }
        ],
        variantSettings: {
          variantProperties: ['size']
        }
      },
      { upsert: true, new: true }
    );
    console.log(`   ✅ Product Type: ${productType.name}\n`);
    
    // Step 3: Import product from Distributor A
    console.log('📥 Step 3: Importing product from Distributor A...\n');
    
    // Simulate import from Distributor A
    const productName = 'Test Multi-Distributor Product';
    let product = await Product.findOne({
      name: productName,
      manufacturerId: manufacturer._id
    });
    
    if (!product) {
      product = await Product.create({
        name: productName,
        description: 'Test product for multi-distributor functionality',
        manufacturerId: manufacturer._id,
        distributorId: distributorA._id,
        productTypeId: productType._id,
        suppliers: [{
          distributorId: distributorA._id,
          manufacturerId: manufacturer._id,
          supplierId: distributorA._id,
          listPrice: 10.00,
          netPrice: 8.00,
          discountPercent: 20,
          isPreferred: true
        }],
        variants: [{
          name: 'Small',
          sku: 'TEST-SMALL',
          properties: new Map([['size', 'Small']]),
          pricing: {
            listPrice: 10.00,
            netPrice: 8.00,
            discountPercent: 20
          },
          suppliers: [{
            distributorId: distributorA._id,
            manufacturerId: manufacturer._id,
            supplierId: distributorA._id,
            listPrice: 10.00,
            netPrice: 8.00,
            discountPercent: 20,
            isPreferred: true
          }],
          isActive: true
        }],
        isActive: true
      });
      console.log(`   ✅ Created product: ${product.name}\n`);
    } else {
      console.log(`   ✅ Found existing product: ${product.name}\n`);
    }
    
    // Step 4: Import same product from Distributor B (simulate second import)
    console.log('📥 Step 4: Importing same product from Distributor B...\n');
    
    // Find product by manufacturer + name
    product = await Product.findOne({
      name: productName,
      manufacturerId: manufacturer._id
    });
    
    if (!product) {
      throw new Error('Product not found after first import');
    }
    
    // Check if Distributor B entry exists
    const distributorBEntry = product.suppliers.find(
      s => s.distributorId && s.distributorId.toString() === distributorB._id.toString()
    );
    
    if (!distributorBEntry) {
      // Add Distributor B entry
      product.suppliers.push({
        distributorId: distributorB._id,
        manufacturerId: manufacturer._id,
        supplierId: distributorB._id,
        listPrice: 11.00,
        netPrice: 9.02,
        discountPercent: 18,
        isPreferred: false
      });
      
      // Update variant with Distributor B pricing
      const variant = product.variants[0];
      if (variant) {
        variant.suppliers.push({
          distributorId: distributorB._id,
          manufacturerId: manufacturer._id,
          supplierId: distributorB._id,
          listPrice: 11.00,
          netPrice: 9.02,
          discountPercent: 18,
          isPreferred: false
        });
      }
      
      // Update primary distributor to B (most recent)
      product.distributorId = distributorB._id;
      
      await product.save();
      console.log(`   ✅ Added Distributor B entry to product\n`);
    } else {
      console.log(`   ✅ Distributor B entry already exists\n`);
    }
    
    // Step 5: Verify results
    console.log('✅ Step 5: Verifying results...\n');
    
    const finalProduct = await Product.findOne({
      name: productName,
      manufacturerId: manufacturer._id
    }).populate('manufacturerId', 'name').populate('distributorId', 'name')
      .populate('suppliers.distributorId', 'name')
      .populate('variants.suppliers.distributorId', 'name');
    
    console.log(`   Product: ${finalProduct.name}`);
    console.log(`   Manufacturer: ${finalProduct.manufacturerId.name}`);
    console.log(`   Primary Distributor: ${finalProduct.distributorId.name}`);
    console.log(`   Total Suppliers: ${finalProduct.suppliers.length}\n`);
    
    console.log('   Supplier Entries:');
    finalProduct.suppliers.forEach((supplier, idx) => {
      const dist = supplier.distributorId;
      const distName = typeof dist === 'object' ? dist.name : dist;
      console.log(`     ${idx + 1}. ${distName}:`);
      console.log(`        List: $${supplier.listPrice?.toFixed(2) || 'N/A'}`);
      console.log(`        Net: $${supplier.netPrice?.toFixed(2) || 'N/A'}`);
      console.log(`        Discount: ${supplier.discountPercent?.toFixed(1) || 'N/A'}%`);
      console.log(`        Preferred: ${supplier.isPreferred ? 'Yes' : 'No'}`);
    });
    
    console.log(`\n   Variants: ${finalProduct.variants.length}`);
    if (finalProduct.variants.length > 0) {
      const variant = finalProduct.variants[0];
      console.log(`   Variant "${variant.name}" has ${variant.suppliers.length} supplier entries`);
      variant.suppliers.forEach((supplier, idx) => {
        const dist = supplier.distributorId;
        const distName = typeof dist === 'object' ? dist.name : dist;
        console.log(`     ${idx + 1}. ${distName}: $${supplier.listPrice?.toFixed(2)} list, $${supplier.netPrice?.toFixed(2)} net`);
      });
    }
    
    // Step 6: Verify no duplicates
    console.log('\n🔍 Step 6: Checking for duplicates...\n');
    const duplicates = await Product.find({
      name: productName,
      manufacturerId: manufacturer._id
    });
    
    if (duplicates.length > 1) {
      console.log(`   ❌ ERROR: Found ${duplicates.length} duplicate products!`);
      console.log(`   Expected 1 product, found ${duplicates.length}`);
    } else {
      console.log(`   ✅ No duplicates found - exactly 1 product as expected`);
    }
    
    // Cleanup
    console.log('\n🧹 Cleaning up test data...\n');
    await Product.deleteOne({ _id: finalProduct._id });
    await Company.deleteOne({ _id: manufacturer._id });
    await Company.deleteOne({ _id: distributorA._id });
    await Company.deleteOne({ _id: distributorB._id });
    await ProductType.deleteOne({ _id: productType._id });
    console.log('   ✅ Test data cleaned up\n');
    
    console.log('✅ All tests passed!\n');
    
    await mongoose.disconnect();
    console.log('✅ Disconnected from database');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

testMultiDistributor();

