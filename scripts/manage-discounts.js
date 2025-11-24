/**
 * Discount Management Script
 * 
 * Manage master discount list and apply discounts to products
 * 
 * Usage:
 *   node scripts/manage-discounts.js list                    # List all discounts
 *   node scripts/manage-discounts.js create <config-file>    # Create discounts from config
 *   node scripts/manage-discounts.js apply <discount-id>      # Apply discount to products
 *   node scripts/manage-discounts.js apply-all                # Apply all active discounts
 *   node scripts/manage-discounts.js import-pricebook <spreadsheet-id> # Import from pricebook
 */

require('dotenv').config({ path: '.env.local', override: true });
const mongoose = require('mongoose');

const Discount = require('../src/server/models/Discount');
const Product = require('../src/server/models/Product');
const Company = require('../src/server/models/Company');

/**
 * List all discounts
 */
async function listDiscounts() {
  try {
    await mongoose.connect(process.env.MONGODB_DEV_URI || process.env.MONGODB_URI);
    
    const discounts = await Discount.find({})
      .sort({ discountType: 1, category: 1, effectiveDate: -1 })
      .lean();
    
    console.log(`\n📋 Discounts (${discounts.length} total)\n`);
    
    if (discounts.length === 0) {
      console.log('No discounts found.');
      return;
    }
    
    // Group by type
    const byType = {};
    discounts.forEach(d => {
      if (!byType[d.discountType]) byType[d.discountType] = [];
      byType[d.discountType].push(d);
    });
    
    for (const [type, items] of Object.entries(byType)) {
      console.log(`\n${type.toUpperCase()} DISCOUNTS (${items.length}):`);
      console.log('─'.repeat(80));
      
      items.forEach(d => {
        const active = d.isActive && (!d.expiresDate || new Date(d.expiresDate) > new Date()) ? '✅' : '❌';
        const name = d.name || d.category || d.categoryGroup || d.customerName || 'Unnamed';
        console.log(`${active} ${d._id.toString().substring(0, 8)} | ${name.padEnd(30)} | ${d.discountPercent.toFixed(2)}%`);
        if (d.categoryGroup) console.log(`   Group: ${d.categoryGroup} | Page: ${d.pricebookPage || 'N/A'}`);
        if (d.effectiveDate) console.log(`   Effective: ${new Date(d.effectiveDate).toLocaleDateString()}`);
        if (d.productsAffected > 0) console.log(`   Applied to: ${d.productsAffected} products/variants`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error listing discounts:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
  }
}

/**
 * Create discounts from pricebook discount summary
 */
async function importFromPricebook(spreadsheetId) {
  try {
    await mongoose.connect(process.env.MONGODB_DEV_URI || process.env.MONGODB_URI);
    
    console.log('📊 Importing discounts from pricebook...');
    console.log(`   Spreadsheet ID: ${spreadsheetId}`);
    
    // TODO: Fetch from Google Sheets API
    // For now, using sample data structure
    const discountData = [
      { groupNo: 'CAEG171', section: '1', sectionName: 'FIBREGLASS', page: '1.1', pageName: 'FIBREGLASS PIPE WITH ASJ', effectiveDate: '2025-01-06', replacesDate: '2024-01-08', discount: 67.75 },
      { groupNo: 'CAEG164', section: '1', sectionName: 'FIBREGLASS', page: '1.2', pageName: 'FIBERGLASS FITTING 45 DEGREE', effectiveDate: '2025-01-06', replacesDate: '2024-01-08', discount: 59.88 },
      // ... more discounts
    ];
    
    let created = 0;
    let updated = 0;
    
    for (const item of discountData) {
      const discount = await Discount.findOneAndUpdate(
        {
          categoryGroup: item.groupNo,
          pricebookPageNumber: item.page
        },
        {
          name: item.pageName,
          code: item.groupNo,
          discountType: 'category',
          category: item.sectionName,
          categoryGroup: item.groupNo,
          section: item.section,
          pricebookPage: item.pageName,
          pricebookPageNumber: item.page,
          discountPercent: item.discount,
          effectiveDate: new Date(item.effectiveDate),
          replacesDate: new Date(item.replacesDate),
          isActive: true
        },
        { upsert: true, new: true }
      );
      
      if (discount.isNew) {
        created++;
      } else {
        updated++;
      }
    }
    
    console.log(`✅ Imported discounts: ${created} created, ${updated} updated`);
    
  } catch (error) {
    console.error('❌ Error importing discounts:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
  }
}

/**
 * Apply discount to products
 */
async function applyDiscount(discountId) {
  try {
    await mongoose.connect(process.env.MONGODB_DEV_URI || process.env.MONGODB_URI);
    
    const discount = await Discount.findById(discountId);
    if (!discount) {
      throw new Error(`Discount not found: ${discountId}`);
    }
    
    if (!discount.isActive) {
      console.log('⚠️  Discount is not active. Skipping.');
      return;
    }
    
    console.log(`\n💰 Applying discount: ${discount.name || discount.categoryGroup}`);
    console.log(`   Discount: ${discount.discountPercent}%`);
    
    let updatedProducts = 0;
    let updatedVariants = 0;
    
    // Find products to update based on discount type
    let query = {};
    
    if (discount.discountType === 'category') {
      if (discount.category) {
        query.category = discount.category;
      }
      if (discount.categoryGroup) {
        // Match products with this category group in properties
        query['properties.categoryGroup'] = discount.categoryGroup;
      }
    } else if (discount.discountType === 'product') {
      query._id = discount.productId;
    } else if (discount.discountType === 'supplier') {
      query['suppliers.supplierId'] = discount.supplierId;
    }
    
    const products = await Product.find(query);
    console.log(`   Found ${products.length} products to update`);
    
    for (const product of products) {
      let productUpdated = false;
      
      // Update product-level pricing
      if (product.suppliers && product.suppliers.length > 0) {
        product.suppliers.forEach(supplier => {
          if (supplier.listPrice) {
            supplier.netPrice = supplier.listPrice * (1 - discount.discountPercent / 100);
            supplier.discountPercent = discount.discountPercent;
            productUpdated = true;
          }
        });
      }
      
      // Update variant pricing
      if (product.variants && product.variants.length > 0) {
        product.variants.forEach(variant => {
          if (variant.pricing?.listPrice) {
            variant.pricing.netPrice = variant.pricing.listPrice * (1 - discount.discountPercent / 100);
            variant.pricing.discountPercent = discount.discountPercent;
            updatedVariants++;
            productUpdated = true;
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
      
      if (productUpdated) {
        await product.save();
        updatedProducts++;
      }
    }
    
    // Update discount record
    discount.lastApplied = new Date();
    discount.productsAffected = updatedVariants;
    await discount.save();
    
    console.log(`✅ Applied discount:`);
    console.log(`   - Products updated: ${updatedProducts}`);
    console.log(`   - Variants updated: ${updatedVariants}`);
    
  } catch (error) {
    console.error('❌ Error applying discount:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
  }
}

/**
 * Apply all active discounts
 */
async function applyAllDiscounts() {
  try {
    await mongoose.connect(process.env.MONGODB_DEV_URI || process.env.MONGODB_URI);
    
    const discounts = await Discount.find({ isActive: true });
    console.log(`\n💰 Applying ${discounts.length} active discounts...\n`);
    
    for (const discount of discounts) {
      try {
        await applyDiscount(discount._id);
      } catch (error) {
        console.error(`❌ Failed to apply discount ${discount._id}:`, error.message);
      }
    }
    
    console.log('\n✅ Finished applying all discounts');
    
  } catch (error) {
    console.error('❌ Error applying all discounts:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
  }
}

// Main execution
if (require.main === module) {
  const command = process.argv[2];
  const arg = process.argv[3];
  
  (async () => {
    try {
      switch (command) {
        case 'list':
          await listDiscounts();
          break;
        case 'create':
          console.log('Create command - config file support coming soon');
          break;
        case 'apply':
          if (!arg) {
            console.error('❌ Error: Discount ID required');
            console.error('Usage: node scripts/manage-discounts.js apply <discount-id>');
            process.exit(1);
          }
          await applyDiscount(arg);
          break;
        case 'apply-all':
          await applyAllDiscounts();
          break;
        case 'import-pricebook':
          if (!arg) {
            console.error('❌ Error: Spreadsheet ID required');
            console.error('Usage: node scripts/manage-discounts.js import-pricebook <spreadsheet-id>');
            process.exit(1);
          }
          await importFromPricebook(arg);
          break;
        default:
          console.log('Discount Management Script');
          console.log('\nUsage:');
          console.log('  node scripts/manage-discounts.js list');
          console.log('  node scripts/manage-discounts.js apply <discount-id>');
          console.log('  node scripts/manage-discounts.js apply-all');
          console.log('  node scripts/manage-discounts.js import-pricebook <spreadsheet-id>');
          process.exit(1);
      }
      
      process.exit(0);
    } catch (error) {
      console.error('\n❌ Command failed:', error);
      process.exit(1);
    }
  })();
}

module.exports = { listDiscounts, applyDiscount, applyAllDiscounts, importFromPricebook };

