/**
 * Migration Script: Remove Legacy Supplier Fields
 * 
 * This script removes legacy supplierId and supplierCatalogNumber fields from products:
 * 1. Migrates supplierId to suppliers array if needed
 * 2. Removes supplierId and supplierCatalogNumber fields
 * 3. Removes supplierId from supplier arrays
 * 4. Updates all references
 * 
 * Usage:
 *   node scripts/remove-legacy-supplier-fields.js [--dry-run]
 * 
 * Example:
 *   node scripts/remove-legacy-supplier-fields.js --dry-run
 */

require('dotenv').config({ path: '.env.local', override: true });
const mongoose = require('mongoose');
const Product = require('../src/server/models/Product');

async function removeLegacySupplierFields(dryRun = false) {
  try {
    console.log('🔄 Starting Legacy Supplier Fields Removal...\n');
    
    // Connect to database
    const mongoUri = process.env.MONGODB_DEV_URI || process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_DEV_URI or MONGODB_URI must be set in .env.local');
    }
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to database\n');
    
    if (dryRun) {
      console.log('🔍 DRY RUN MODE - No changes will be made\n');
    }
    
    // Step 1: Find products with legacy fields
    console.log('📊 Step 1: Analyzing products...\n');
    
    const productsWithLegacySupplierId = await Product.find({
      $or: [
        { supplierId: { $exists: true, $ne: null } },
        { supplierCatalogNumber: { $exists: true, $ne: null } },
        { 'suppliers.supplierId': { $exists: true, $ne: null } },
        { 'variants.suppliers.supplierId': { $exists: true, $ne: null } }
      ]
    }).lean();
    
    console.log(`   Found ${productsWithLegacySupplierId.length} products with legacy fields\n`);
    
    if (productsWithLegacySupplierId.length === 0) {
      console.log('✅ No legacy fields found. Migration not needed.\n');
      await mongoose.disconnect();
      return;
    }
    
    // Step 2: Process each product
    console.log('🔄 Step 2: Processing products...\n');
    let updated = 0;
    let skipped = 0;
    
    for (const product of productsWithLegacySupplierId) {
      const updates = {};
      let needsUpdate = false;
      
      // Migrate product-level supplierId to suppliers array if needed
      if (product.supplierId && (!product.suppliers || product.suppliers.length === 0)) {
        // Find distributorId (should exist if product has supplierId)
        const distributorId = product.distributorId || product.supplierId;
        const manufacturerId = product.manufacturerId || product.supplierId;
        
        updates.suppliers = [{
          distributorId: distributorId,
          manufacturerId: manufacturerId,
          supplierPartNumber: product.supplierCatalogNumber || '',
          listPrice: product.lastPrice || null,
          netPrice: null,
          discountPercent: null,
          isPreferred: true
        }];
        needsUpdate = true;
      }
      
      // Remove supplierId from suppliers array
      if (product.suppliers && product.suppliers.length > 0) {
        updates.suppliers = product.suppliers.map(supplier => {
          const cleaned = { ...supplier };
          delete cleaned.supplierId;
          return cleaned;
        });
        needsUpdate = true;
      }
      
      // Remove supplierId from variant suppliers
      if (product.variants && product.variants.length > 0) {
        updates.variants = product.variants.map(variant => {
          const cleaned = { ...variant };
          if (cleaned.suppliers && cleaned.suppliers.length > 0) {
            cleaned.suppliers = cleaned.suppliers.map(supplier => {
              const cleanedSupplier = { ...supplier };
              delete cleanedSupplier.supplierId;
              return cleanedSupplier;
            });
          }
          return cleaned;
        });
        needsUpdate = true;
      }
      
      // Remove legacy fields
      if (product.supplierId || product.supplierCatalogNumber) {
        updates.$unset = {};
        if (product.supplierId) updates.$unset.supplierId = '';
        if (product.supplierCatalogNumber) updates.$unset.supplierCatalogNumber = '';
        needsUpdate = true;
      }
      
      // Always unset legacy fields even if no other updates needed
      if (!updates.$unset) {
        updates.$unset = {};
      }
      updates.$unset.supplierId = '';
      updates.$unset.supplierCatalogNumber = '';
      needsUpdate = true;
      
      if (needsUpdate) {
        if (!dryRun) {
          // Use updateOne with $unset to remove fields
          const unsetFields = { $unset: { supplierId: '', supplierCatalogNumber: '' } };
          const setFields = { ...updates };
          delete setFields.$unset; // Remove $unset from setFields
          
          // Combine updates
          const finalUpdates = { ...setFields, ...unsetFields };
          
          await Product.updateOne(
            { _id: product._id },
            finalUpdates
          );
        }
        updated++;
        console.log(`   ${dryRun ? 'Would update' : 'Updated'}: ${product.name}`);
      } else {
        skipped++;
      }
    }
    
    console.log(`\n✅ Migration complete!\n`);
    console.log(`   Products updated: ${updated}`);
    console.log(`   Products skipped: ${skipped}`);
    
    if (dryRun) {
      console.log(`\n⚠️  This was a dry run. Run without --dry-run to apply changes.`);
    }
    
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from database');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

removeLegacySupplierFields(dryRun);

