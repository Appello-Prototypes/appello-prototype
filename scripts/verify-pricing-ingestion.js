/**
 * Verify Pricing Ingestion
 * 
 * Quick script to verify the Micro-Lok pricing data was ingested correctly
 */

require('dotenv').config({ path: '.env.local', override: true });
const mongoose = require('mongoose');

const Company = require('../src/server/models/Company');
const Product = require('../src/server/models/Product');
const ProductType = require('../src/server/models/ProductType');

async function verifyIngestion() {
  try {
    console.log('🔗 Connecting to database...');
    const mongoUri = process.env.MONGODB_DEV_URI || process.env.MONGODB_URI;
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to database\n');

    // Check supplier
    const supplier = await Company.findOne({ name: 'Crossroads C&I', companyType: 'supplier' });
    if (!supplier) {
      console.log('❌ Supplier not found');
      return;
    }
    console.log('✅ Supplier Found:');
    console.log(`   Name: ${supplier.name}`);
    console.log(`   ID: ${supplier._id}`);
    console.log(`   Type: ${supplier.companyType}`);
    console.log(`   Active: ${supplier.isActive}\n`);

    // Check product
    const product = await Product.findOne({ name: 'Micro-Lok ASJ Fibreglass Pipe Insulation' })
      .populate('productTypeId')
      .populate('suppliers.supplierId');
    
    if (!product) {
      console.log('❌ Product not found');
      return;
    }
    
    console.log('✅ Product Found:');
    console.log(`   Name: ${product.name}`);
    console.log(`   ID: ${product._id}`);
    console.log(`   Description: ${product.description?.substring(0, 100)}...`);
    console.log(`   Product Type: ${product.productTypeId?.name || 'N/A'}`);
    console.log(`   Unit of Measure: ${product.unitOfMeasure}`);
    console.log(`   Category: ${product.category}`);
    console.log(`   Total Variants: ${product.variants?.length || 0}`);
    console.log(`   Active: ${product.isActive}\n`);

    // Check variants
    if (product.variants && product.variants.length > 0) {
      console.log('✅ Variants Summary:');
      console.log(`   Total Variants: ${product.variants.length}`);
      
      // Count by pipe type
      const copperVariants = product.variants.filter(v => {
        const props = v.properties instanceof Map ? Object.fromEntries(v.properties) : v.properties;
        return props?.pipe_type === 'copper';
      }).length;
      const ironVariants = product.variants.filter(v => {
        const props = v.properties instanceof Map ? Object.fromEntries(v.properties) : v.properties;
        return props?.pipe_type === 'iron';
      }).length;
      
      console.log(`   Copper Variants: ${copperVariants}`);
      console.log(`   Iron Variants: ${ironVariants}`);
      
      // Price range
      const prices = product.variants
        .map(v => v.pricing?.lastPrice)
        .filter(p => p != null)
        .sort((a, b) => a - b);
      
      if (prices.length > 0) {
        console.log(`   Price Range: $${prices[0].toFixed(2)} - $${prices[prices.length - 1].toFixed(2)} per FT`);
      }
      
      // Sample variants
      console.log('\n📋 Sample Variants (first 10):');
      product.variants.slice(0, 10).forEach((variant, index) => {
        const props = variant.properties instanceof Map ? Object.fromEntries(variant.properties) : variant.properties;
        const pipeType = props?.pipe_type || 'N/A';
        const pipeDiameter = props?.pipe_diameter || 'N/A';
        const thickness = props?.insulation_thickness || 'N/A';
        const price = variant.pricing?.lastPrice || variant.suppliers?.[0]?.lastPrice || 'N/A';
        console.log(`   ${index + 1}. ${variant.name || 'N/A'}`);
        console.log(`      SKU: ${variant.sku || 'N/A'}`);
        console.log(`      ${pipeDiameter}" ${pipeType} - ${thickness} - $${typeof price === 'number' ? price.toFixed(2) : price}/FT`);
      });
    }

    // Check suppliers on variants
    const variantsWithSuppliers = product.variants.filter(v => 
      v.suppliers && v.suppliers.length > 0
    ).length;
    console.log(`\n✅ Variants with Supplier Info: ${variantsWithSuppliers}/${product.variants.length}`);

  } catch (error) {
    console.error('❌ Error verifying ingestion:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from database');
  }
}

if (require.main === module) {
  verifyIngestion()
    .then(() => {
      console.log('\n✅ Verification completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Verification failed:', error);
      process.exit(1);
    });
}

module.exports = { verifyIngestion };

