/**
 * Migration Script: Deduplicate Products for Multi-Distributor Support
 * 
 * This script finds products with the same manufacturer + name and merges them
 * into a single product record with multiple distributor entries in suppliers array.
 * 
 * Usage:
 *   node scripts/migrate-multi-distributor-products.js [--dry-run]
 * 
 * Example:
 *   node scripts/migrate-multi-distributor-products.js --dry-run
 */

require('dotenv').config({ path: '.env.local', override: true });
const mongoose = require('mongoose');
const Product = require('../src/server/models/Product');
const Company = require('../src/server/models/Company');

async function migrateMultiDistributorProducts(dryRun = false) {
  try {
    console.log('🔄 Starting Multi-Distributor Product Migration...\n');
    
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
    
    // Step 1: Find all products and group by manufacturer + name
    console.log('📊 Step 1: Analyzing products...\n');
    const allProducts = await Product.find({}).lean();
    console.log(`   Found ${allProducts.length} total products\n`);
    
    // Group products by manufacturerId + name
    const productGroups = {};
    const productsWithoutManufacturer = [];
    
    for (const product of allProducts) {
      const key = product.manufacturerId 
        ? `${product.manufacturerId.toString()}_${product.name}`
        : `NO_MANUFACTURER_${product.name}`;
      
      if (!productGroups[key]) {
        productGroups[key] = [];
      }
      productGroups[key].push(product);
    }
    
    // Find duplicates (groups with more than one product)
    const duplicateGroups = Object.entries(productGroups).filter(
      ([key, products]) => products.length > 1 && !key.startsWith('NO_MANUFACTURER_')
    );
    
    console.log(`   Found ${duplicateGroups.length} product groups with duplicates\n`);
    
    if (duplicateGroups.length === 0) {
      console.log('✅ No duplicates found. Migration not needed.\n');
      await mongoose.disconnect();
      return;
    }
    
    // Step 2: Process each duplicate group
    console.log('🔄 Step 2: Processing duplicate groups...\n');
    let merged = 0;
    let kept = 0;
    let deleted = 0;
    
    for (const [key, products] of duplicateGroups) {
      // Sort by creation date (keep oldest as primary)
      products.sort((a, b) => {
        const dateA = a.createdAt || a._id.getTimestamp();
        const dateB = b.createdAt || b._id.getTimestamp();
        return dateA - dateB;
      });
      
      const primaryProduct = products[0];
      const duplicates = products.slice(1);
      
      console.log(`   Processing: "${primaryProduct.name}" (${products.length} duplicates)`);
      
      if (!dryRun) {
        // Merge suppliers from duplicates into primary
        const allSuppliers = [...(primaryProduct.suppliers || [])];
        const seenDistributors = new Set();
        
        // Track distributors from primary product
        for (const supplier of primaryProduct.suppliers || []) {
          if (supplier.distributorId) {
            seenDistributors.add(supplier.distributorId.toString());
          }
        }
        
        // Merge suppliers from duplicates
        for (const duplicate of duplicates) {
          // Merge product-level suppliers
          for (const supplier of duplicate.suppliers || []) {
            const distId = supplier.distributorId ? supplier.distributorId.toString() : null;
            if (distId && !seenDistributors.has(distId)) {
              allSuppliers.push(supplier);
              seenDistributors.add(distId);
            }
          }
          
          // Merge variants
          const primaryDoc = await Product.findById(primaryProduct._id);
          const duplicateDoc = await Product.findById(duplicate._id);
          
          if (primaryDoc && duplicateDoc) {
            // For each variant in duplicate, find matching variant in primary by properties
            for (const dupVariant of duplicateDoc.variants || []) {
              const dupProps = dupVariant.properties instanceof Map
                ? Object.fromEntries(dupVariant.properties)
                : dupVariant.properties || {};
              
              // Find matching variant in primary
              const matchingVariantIndex = primaryDoc.variants.findIndex(primVariant => {
                const primProps = primVariant.properties instanceof Map
                  ? Object.fromEntries(primVariant.properties)
                  : primVariant.properties || {};
                
                // Compare properties (simple string comparison)
                const primKeys = Object.keys(primProps).sort();
                const dupKeys = Object.keys(dupProps).sort();
                
                if (primKeys.length !== dupKeys.length) return false;
                
                return primKeys.every(key => 
                  primProps[key] === dupProps[key]
                );
              });
              
              if (matchingVariantIndex >= 0) {
                // Merge supplier entries from duplicate variant into primary variant
                const primaryVariant = primaryDoc.variants[matchingVariantIndex];
                const primaryVariantSuppliers = new Set(
                  (primaryVariant.suppliers || []).map(s => 
                    s.distributorId ? s.distributorId.toString() : null
                  ).filter(Boolean)
                );
                
                // Add suppliers from duplicate variant that don't exist in primary
                for (const dupSupplier of dupVariant.suppliers || []) {
                  const distId = dupSupplier.distributorId ? dupSupplier.distributorId.toString() : null;
                  if (distId && !primaryVariantSuppliers.has(distId)) {
                    if (!primaryVariant.suppliers) primaryVariant.suppliers = [];
                    primaryVariant.suppliers.push(dupSupplier);
                    primaryVariantSuppliers.add(distId);
                  }
                }
              } else {
                // Variant doesn't exist in primary - add it
                primaryDoc.variants.push(dupVariant);
              }
            }
            
            // Update primary product with merged suppliers
            primaryDoc.suppliers = allSuppliers;
            
            // Set primary distributor to most recent
            if (duplicate.distributorId) {
              primaryDoc.distributorId = duplicate.distributorId;
            }
            
            await primaryDoc.save();
            
            // Delete duplicate product
            await Product.findByIdAndDelete(duplicate._id);
            deleted++;
          }
        }
        
        kept++;
        merged += duplicates.length;
      } else {
        console.log(`     Would merge ${duplicates.length} duplicates into primary`);
        kept++;
        merged += duplicates.length;
      }
    }
    
    console.log(`\n✅ Migration complete!\n`);
    console.log(`   Products kept: ${kept}`);
    console.log(`   Products merged: ${merged}`);
    console.log(`   Products deleted: ${dryRun ? '0 (dry run)' : deleted}`);
    
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

migrateMultiDistributorProducts(dryRun);

