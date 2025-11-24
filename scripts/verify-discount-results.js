/**
 * Verify Discount Application Results
 * 
 * Checks that discounts were applied correctly to products
 */

require('dotenv').config({ path: '.env.local', override: true });
const mongoose = require('mongoose');

const Product = require('../src/server/models/Product');

async function verifyDiscountResults() {
  try {
    console.log('🔗 Connecting to database...');
    const mongoUri = process.env.MONGODB_DEV_URI || process.env.MONGODB_URI;
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to database\n');

    const product = await Product.findOne({ 
      name: 'Micro-Lok ASJ Fibreglass Pipe Insulation' 
    });
    
    if (!product) {
      console.log('❌ Product not found');
      return;
    }
    
    console.log(`📦 Product: ${product.name}`);
    console.log(`   Total Variants: ${product.variants.length}\n`);
    
    // Check pricing across variants
    let variantsWithListPrice = 0;
    let variantsWithNetPrice = 0;
    let variantsWithDiscount = 0;
    let correctCalculations = 0;
    let incorrectCalculations = 0;
    
    const sampleVariants = product.variants.slice(0, 10);
    
    console.log('📊 Sample Variants Pricing:\n');
    
    sampleVariants.forEach((variant, index) => {
      const listPrice = variant.pricing?.listPrice;
      const netPrice = variant.pricing?.netPrice;
      const discountPercent = variant.pricing?.discountPercent;
      
      if (listPrice) variantsWithListPrice++;
      if (netPrice) variantsWithNetPrice++;
      if (discountPercent) variantsWithDiscount++;
      
      if (listPrice && netPrice && discountPercent) {
        const expectedNet = listPrice * (1 - discountPercent / 100);
        const difference = Math.abs(netPrice - expectedNet);
        
        if (difference < 0.01) {
          correctCalculations++;
        } else {
          incorrectCalculations++;
        }
      }
      
      console.log(`${index + 1}. ${variant.name}`);
      console.log(`   List: $${listPrice?.toFixed(2) || 'N/A'} | Net: $${netPrice?.toFixed(2) || 'N/A'} | Discount: ${discountPercent?.toFixed(2) || 'N/A'}%`);
      
      if (listPrice && netPrice && discountPercent) {
        const expectedNet = listPrice * (1 - discountPercent / 100);
        const status = Math.abs(netPrice - expectedNet) < 0.01 ? '✅' : '❌';
        console.log(`   ${status} Expected Net: $${expectedNet.toFixed(2)}`);
      }
      console.log('');
    });
    
    // Overall statistics
    product.variants.forEach(variant => {
      if (variant.pricing?.listPrice) variantsWithListPrice++;
      if (variant.pricing?.netPrice) variantsWithNetPrice++;
      if (variant.pricing?.discountPercent) variantsWithDiscount++;
      
      if (variant.pricing?.listPrice && variant.pricing?.netPrice && variant.pricing?.discountPercent) {
        const expectedNet = variant.pricing.listPrice * (1 - variant.pricing.discountPercent / 100);
        const difference = Math.abs(variant.pricing.netPrice - expectedNet);
        if (difference < 0.01) {
          correctCalculations++;
        } else {
          incorrectCalculations++;
        }
      }
    });
    
    console.log('📈 Overall Statistics:');
    console.log(`   Variants with List Price: ${variantsWithListPrice}/${product.variants.length}`);
    console.log(`   Variants with Net Price: ${variantsWithNetPrice}/${product.variants.length}`);
    console.log(`   Variants with Discount %: ${variantsWithDiscount}/${product.variants.length}`);
    console.log(`   Correct Calculations: ${correctCalculations}`);
    console.log(`   Incorrect Calculations: ${incorrectCalculations}`);
    
    // Check supplier pricing
    const sampleVariant = product.variants[0];
    if (sampleVariant?.suppliers?.[0]) {
      const supplier = sampleVariant.suppliers[0];
      console.log(`\n🏢 Supplier Pricing (Sample Variant):`);
      console.log(`   List Price: $${supplier.listPrice?.toFixed(2) || 'N/A'}`);
      console.log(`   Net Price: $${supplier.netPrice?.toFixed(2) || 'N/A'}`);
      console.log(`   Discount %: ${supplier.discountPercent?.toFixed(2) || 'N/A'}%`);
    }
    
    if (correctCalculations === variantsWithNetPrice && variantsWithNetPrice === product.variants.length) {
      console.log(`\n✅ All variants have correct pricing!`);
    } else {
      console.log(`\n⚠️  Some variants may need attention`);
    }

  } catch (error) {
    console.error('❌ Error verifying results:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from database');
  }
}

if (require.main === module) {
  verifyDiscountResults()
    .then(() => {
      console.log('\n✅ Verification completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Verification failed:', error);
      process.exit(1);
    });
}

module.exports = { verifyDiscountResults };

