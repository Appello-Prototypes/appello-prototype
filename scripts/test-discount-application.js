/**
 * Test Discount Application
 * 
 * Tests applying a discount and verifies products are updated correctly
 */

require('dotenv').config({ path: '.env.local', override: true });
const mongoose = require('mongoose');

const Discount = require('../src/server/models/Discount');
const Product = require('../src/server/models/Product');

async function testDiscountApplication() {
  try {
    console.log('🔗 Connecting to database...');
    const mongoUri = process.env.MONGODB_DEV_URI || process.env.MONGODB_URI;
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to database\n');

    // Find FIBREGLASS PIPE WITH ASJ discount
    const discount = await Discount.findOne({ 
      pricebookPage: 'FIBREGLASS PIPE WITH ASJ' 
    });
    
    if (!discount) {
      console.log('❌ Discount not found');
      return;
    }
    
    console.log(`📋 Found Discount:`);
    console.log(`   Name: ${discount.name}`);
    console.log(`   Category: ${discount.category}`);
    console.log(`   Group: ${discount.categoryGroup}`);
    console.log(`   Discount: ${discount.discountPercent}%`);
    console.log(`   Effective: ${discount.effectiveDate.toLocaleDateString()}\n`);

    // Find products that match this discount
    // For now, let's test with the Micro-Lok product which is in Insulation category
    const products = await Product.find({ 
      category: 'Insulation',
      name: { $regex: /FIBREGLASS|Micro-Lok/i }
    });
    
    console.log(`📦 Found ${products.length} products to test with\n`);
    
    if (products.length === 0) {
      console.log('⚠️  No products found matching discount criteria');
      console.log('   This is expected if products don\'t have matching category/group');
      console.log('   Let\'s check what products exist:\n');
      
      const allProducts = await Product.find({}).limit(5).select('name category');
      console.log('Sample products:');
      allProducts.forEach(p => {
        console.log(`   - ${p.name} (Category: ${p.category || 'N/A'})`);
      });
      return;
    }

    // Test with first product
    const testProduct = products[0];
    console.log(`🧪 Testing with product: ${testProduct.name}`);
    console.log(`   Current variants: ${testProduct.variants.length}`);
    
    // Check current pricing
    const sampleVariant = testProduct.variants[0];
    if (sampleVariant) {
      console.log(`\n📊 Before Discount Application:`);
      console.log(`   Variant: ${sampleVariant.name}`);
      console.log(`   List Price: $${sampleVariant.pricing?.listPrice || 'N/A'}`);
      console.log(`   Net Price: $${sampleVariant.pricing?.netPrice || 'N/A'}`);
      console.log(`   Discount %: ${sampleVariant.pricing?.discountPercent || 'N/A'}%`);
    }

    // Apply discount
    console.log(`\n💰 Applying discount...`);
    
    let updatedVariants = 0;
    let updatedProducts = 0;
    
    for (const product of products) {
      let productUpdated = false;
      
      // Update variant pricing
      if (product.variants && product.variants.length > 0) {
        product.variants.forEach(variant => {
          if (variant.pricing?.listPrice) {
            const oldNetPrice = variant.pricing.netPrice;
            variant.pricing.netPrice = variant.pricing.listPrice * (1 - discount.discountPercent / 100);
            variant.pricing.discountPercent = discount.discountPercent;
            updatedVariants++;
            productUpdated = true;
            
            if (updatedVariants === 1) {
              console.log(`\n✅ Updated variant: ${variant.name}`);
              console.log(`   List Price: $${variant.pricing.listPrice.toFixed(2)}`);
              console.log(`   Net Price: $${variant.pricing.netPrice.toFixed(2)} (was: $${oldNetPrice?.toFixed(2) || 'N/A'})`);
              console.log(`   Discount: ${variant.pricing.discountPercent.toFixed(2)}%`);
              console.log(`   Calculation: $${variant.pricing.listPrice.toFixed(2)} × (1 - ${discount.discountPercent/100}) = $${variant.pricing.netPrice.toFixed(2)}`);
            }
          }
          
          // Update variant suppliers
          if (variant.suppliers && variant.suppliers.length > 0) {
            variant.suppliers.forEach(supplier => {
              if (supplier.listPrice) {
                supplier.netPrice = supplier.listPrice * (1 - discount.discountPercent / 100);
                supplier.discountPercent = discount.discountPercent;
              }
            });
          }
        });
      }
      
      // Update product-level suppliers
      if (product.suppliers && product.suppliers.length > 0) {
        product.suppliers.forEach(supplier => {
          if (supplier.listPrice) {
            supplier.netPrice = supplier.listPrice * (1 - discount.discountPercent / 100);
            supplier.discountPercent = discount.discountPercent;
            productUpdated = true;
          }
        });
      }
      
      if (productUpdated) {
        await product.save();
        updatedProducts++;
      }
    }
    
    // Verify results
    console.log(`\n✅ Discount Application Results:`);
    console.log(`   Products updated: ${updatedProducts}`);
    console.log(`   Variants updated: ${updatedVariants}`);
    
    // Reload and verify
    const updatedProduct = await Product.findById(testProduct._id);
    const updatedVariant = updatedProduct.variants[0];
    
    if (updatedVariant) {
      console.log(`\n📊 After Discount Application:`);
      console.log(`   Variant: ${updatedVariant.name}`);
      console.log(`   List Price: $${updatedVariant.pricing?.listPrice?.toFixed(2) || 'N/A'}`);
      console.log(`   Net Price: $${updatedVariant.pricing?.netPrice?.toFixed(2) || 'N/A'}`);
      console.log(`   Discount %: ${updatedVariant.pricing?.discountPercent?.toFixed(2) || 'N/A'}%`);
      
      // Verify calculation
      if (updatedVariant.pricing?.listPrice && updatedVariant.pricing?.netPrice) {
        const calculatedNet = updatedVariant.pricing.listPrice * (1 - discount.discountPercent / 100);
        const difference = Math.abs(updatedVariant.pricing.netPrice - calculatedNet);
        
        if (difference < 0.01) {
          console.log(`\n✅ Verification: Net price calculation is correct!`);
        } else {
          console.log(`\n⚠️  Warning: Net price calculation may be off by $${difference.toFixed(4)}`);
        }
      }
    }
    
    // Update discount record
    discount.lastApplied = new Date();
    discount.productsAffected = updatedVariants;
    await discount.save();
    
    console.log(`\n✅ Test completed successfully!`);

  } catch (error) {
    console.error('❌ Error testing discount:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from database');
  }
}

if (require.main === module) {
  testDiscountApplication()
    .then(() => {
      console.log('\n✅ Discount test completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Discount test failed:', error);
      process.exit(1);
    });
}

module.exports = { testDiscountApplication };

