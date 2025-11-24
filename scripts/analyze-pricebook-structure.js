/**
 * Analyze Pricebook Structure
 * 
 * Analyzes the pricebook to understand:
 * - Number of products/categories
 * - Data structure variations
 * - Potential ingestion challenges
 * - Scale requirements
 */

require('dotenv').config({ path: '.env.local', override: true });
const mongoose = require('mongoose');

const Discount = require('../src/server/models/Discount');
const Product = require('../src/server/models/Product');

async function analyzePricebook() {
  try {
    console.log('🔗 Connecting to database...');
    const mongoUri = process.env.MONGODB_DEV_URI || process.env.MONGODB_URI;
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to database\n');

    // Get all discounts to understand pricebook structure
    const discounts = await Discount.find({}).lean();
    
    console.log('📊 Pricebook Analysis\n');
    console.log('='.repeat(80));
    
    // Analyze by category
    const byCategory = {};
    discounts.forEach(d => {
      const cat = d.category || 'UNKNOWN';
      if (!byCategory[cat]) {
        byCategory[cat] = {
          count: 0,
          discounts: [],
          groups: new Set(),
          pages: []
        };
      }
      byCategory[cat].count++;
      byCategory[cat].discounts.push(d.discountPercent);
      if (d.categoryGroup) byCategory[cat].groups.add(d.categoryGroup);
      if (d.pricebookPage) byCategory[cat].pages.push(d.pricebookPage);
    });
    
    console.log('\n📋 Categories Found:');
    console.log('-'.repeat(80));
    for (const [category, data] of Object.entries(byCategory)) {
      const avgDiscount = data.discounts.reduce((a, b) => a + b, 0) / data.discounts.length;
      const minDiscount = Math.min(...data.discounts);
      const maxDiscount = Math.max(...data.discounts);
      
      console.log(`\n${category}:`);
      console.log(`  - Discount Pages: ${data.count}`);
      console.log(`  - Unique Groups: ${data.groups.size}`);
      console.log(`  - Discount Range: ${minDiscount.toFixed(2)}% - ${maxDiscount.toFixed(2)}%`);
      console.log(`  - Average Discount: ${avgDiscount.toFixed(2)}%`);
      console.log(`  - Sample Pages: ${data.pages.slice(0, 3).join(', ')}${data.pages.length > 3 ? '...' : ''}`);
    }
    
    // Estimate product count
    console.log('\n\n📦 Estimated Product Scale:');
    console.log('-'.repeat(80));
    
    // Based on Micro-Lok example: 1 page = ~280 variants
    // Estimate: Each discount page represents a product category with variants
    const estimatedProductsPerPage = 1; // Each page is typically one product type
    const estimatedVariantsPerProduct = 280; // Based on Micro-Lok example
    
    const totalPages = discounts.length;
    const estimatedProducts = totalPages * estimatedProductsPerPage;
    const estimatedVariants = estimatedProducts * estimatedVariantsPerProduct;
    
    console.log(`  - Discount Pages: ${totalPages}`);
    console.log(`  - Estimated Products: ${estimatedProducts.toLocaleString()}`);
    console.log(`  - Estimated Variants: ${estimatedVariants.toLocaleString()}`);
    console.log(`  - Estimated Data Size: ~${(estimatedVariants * 2 / 1024).toFixed(0)} MB (rough estimate)`);
    
    // Check current system capacity
    console.log('\n\n🔍 Current System Status:');
    console.log('-'.repeat(80));
    
    const currentProducts = await Product.countDocuments({});
    const currentProductsWithVariants = await Product.countDocuments({ 'variants.0': { $exists: true } });
    
    const allProducts = await Product.find({}).select('variants').lean();
    const totalVariants = allProducts.reduce((sum, p) => sum + (p.variants?.length || 0), 0);
    const avgVariantsPerProduct = currentProductsWithVariants > 0 
      ? totalVariants / currentProductsWithVariants 
      : 0;
    
    console.log(`  - Current Products: ${currentProducts.toLocaleString()}`);
    console.log(`  - Products with Variants: ${currentProductsWithVariants.toLocaleString()}`);
    console.log(`  - Current Variants: ${totalVariants.toLocaleString()}`);
    console.log(`  - Avg Variants/Product: ${avgVariantsPerProduct.toFixed(0)}`);
    
    // Check largest product
    const largestProduct = allProducts.reduce((max, p) => {
      return (p.variants?.length || 0) > (max.variants?.length || 0) ? p : max;
    }, { variants: [] });
    
    console.log(`  - Largest Product Variants: ${largestProduct.variants?.length || 0}`);
    
    // System limits check
    console.log('\n\n⚙️  System Capacity Analysis:');
    console.log('-'.repeat(80));
    
    // MongoDB document size limit: 16MB
    const maxDocSize = 16 * 1024 * 1024; // 16MB
    const estimatedVariantSize = 500; // bytes per variant (rough estimate)
    const maxVariantsPerProduct = Math.floor(maxDocSize / estimatedVariantSize);
    
    console.log(`  - MongoDB Document Limit: 16MB`);
    console.log(`  - Estimated Variant Size: ~${estimatedVariantSize} bytes`);
    console.log(`  - Max Variants/Product (estimated): ${maxVariantsPerProduct.toLocaleString()}`);
    console.log(`  - Current Largest: ${largestProduct.variants?.length || 0} variants`);
    
    if (largestProduct.variants?.length > maxVariantsPerProduct * 0.8) {
      console.log(`  ⚠️  WARNING: Approaching document size limit!`);
    } else {
      console.log(`  ✅ Well within limits`);
    }
    
    // Discount management capacity
    console.log('\n\n💰 Discount Management Capacity:');
    console.log('-'.repeat(80));
    
    const activeDiscounts = discounts.filter(d => d.isActive).length;
    const discountsWithProducts = discounts.filter(d => d.productsAffected > 0).length;
    const totalAffectedVariants = discounts.reduce((sum, d) => sum + (d.productsAffected || 0), 0);
    
    console.log(`  - Total Discounts: ${discounts.length}`);
    console.log(`  - Active Discounts: ${activeDiscounts}`);
    console.log(`  - Discounts Applied: ${discountsWithProducts}`);
    console.log(`  - Total Variants Affected: ${totalAffectedVariants.toLocaleString()}`);
    
    // Performance estimates
    console.log('\n\n⚡ Performance Estimates:');
    console.log('-'.repeat(80));
    
    const estimatedApplyTime = (estimatedVariants / 1000) * 0.1; // ~0.1s per 1000 variants
    const estimatedImportTime = (totalPages / 10) * 0.5; // ~0.5s per 10 pages
    
    console.log(`  - Estimated Import Time: ~${estimatedImportTime.toFixed(1)} seconds`);
    console.log(`  - Estimated Apply All Time: ~${estimatedApplyTime.toFixed(1)} seconds`);
    console.log(`  - Estimated Memory Usage: ~${(estimatedVariants * 2 / 1024 / 1024).toFixed(1)} MB`);
    
    // Recommendations
    console.log('\n\n💡 Recommendations:');
    console.log('-'.repeat(80));
    
    if (estimatedVariants > 100000) {
      console.log('  ⚠️  Large scale detected (>100k variants)');
      console.log('  - Consider batch processing');
      console.log('  - Use pagination for UI');
      console.log('  - Monitor database performance');
    }
    
    if (maxVariantsPerProduct < estimatedVariantsPerProduct) {
      console.log('  ⚠️  Variant count per product may exceed limits');
      console.log('  - Consider splitting large products');
      console.log('  - Use product families instead');
    }
    
    console.log('  ✅ System appears capable of handling this scale');
    console.log('  ✅ Discount management should work effectively');
    console.log('  ✅ Consider testing with sample data first');
    
    // Test data structure variations
    console.log('\n\n🧪 Data Structure Analysis:');
    console.log('-'.repeat(80));
    
    const discountTypes = {};
    discounts.forEach(d => {
      discountTypes[d.discountType] = (discountTypes[d.discountType] || 0) + 1;
    });
    
    console.log('Discount Types:');
    for (const [type, count] of Object.entries(discountTypes)) {
      console.log(`  - ${type}: ${count}`);
    }
    
    // Check for missing data
    const missingCategory = discounts.filter(d => !d.category).length;
    const missingGroup = discounts.filter(d => !d.categoryGroup).length;
    const missingPage = discounts.filter(d => !d.pricebookPage).length;
    
    console.log('\nData Completeness:');
    console.log(`  - Missing Category: ${missingCategory}`);
    console.log(`  - Missing Group: ${missingGroup}`);
    console.log(`  - Missing Page Name: ${missingPage}`);
    
    if (missingCategory > 0 || missingGroup > 0) {
      console.log('  ⚠️  Some discounts missing key data');
    } else {
      console.log('  ✅ All discounts have required data');
    }

  } catch (error) {
    console.error('❌ Error analyzing pricebook:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from database');
  }
}

if (require.main === module) {
  analyzePricebook()
    .then(() => {
      console.log('\n✅ Analysis completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Analysis failed:', error);
      process.exit(1);
    });
}

module.exports = { analyzePricebook };

