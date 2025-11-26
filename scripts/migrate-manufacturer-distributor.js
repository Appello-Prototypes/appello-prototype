/**
 * Migration Script: Set Manufacturer/Distributor for Existing Products
 * 
 * This script:
 * 1. Identifies IMPRO as distributor
 * 2. Tries to infer manufacturers from existing products
 * 3. Sets manufacturerId and distributorId where possible
 * 4. Marks unknown as null for manual review
 * 
 * Usage:
 *   node scripts/migrate-manufacturer-distributor.js [--dry-run]
 */

require('dotenv').config({ path: '.env.local', override: true });
const mongoose = require('mongoose');
const Company = require('../src/server/models/Company');
const Product = require('../src/server/models/Product');

// Common manufacturer name patterns
const MANUFACTURER_PATTERNS = [
  { pattern: /armacell/i, name: 'Armacell' },
  { pattern: /k-flex/i, name: 'K-Flex USA' },
  { pattern: /johns.?manville|jm\s/i, name: 'Johns Manville' },
  { pattern: /certainteed/i, name: 'CertainTeed' },
  { pattern: /owens.?corning/i, name: 'Owens Corning' },
  { pattern: /rockwool/i, name: 'Rockwool' },
  { pattern: /knauf/i, name: 'Knauf' },
  { pattern: /roxul/i, name: 'Roxul' },
];

async function migrateManufacturerDistributor(dryRun = false) {
  try {
    console.log('🔌 Connecting to database...');
    await mongoose.connect(process.env.MONGODB_DEV_URI);
    console.log('✅ Connected to database\n');

    if (dryRun) {
      console.log('🔍 DRY RUN MODE - No changes will be saved\n');
    }

    // Step 1: Ensure IMPRO distributor exists
    console.log('📦 Step 1: Setting up IMPRO distributor...');
    const distributor = await Company.findOneAndUpdate(
      { name: 'IMPRO', companyType: 'distributor' },
      {
        name: 'IMPRO',
        companyType: 'distributor',
        isActive: true
      },
      { upsert: true, new: true }
    );
    console.log(`   ✅ IMPRO distributor: ${distributor._id}\n`);

    // Step 2: Get all products without manufacturer/distributor
    console.log('📊 Step 2: Finding products to migrate...');
    const productsToMigrate = await Product.find({
      $or: [
        { manufacturerId: { $exists: false } },
        { manufacturerId: null },
        { distributorId: { $exists: false } },
        { distributorId: null }
      ],
      isActive: true
    }).lean();

    console.log(`   Found ${productsToMigrate.length} products to migrate\n`);

    if (productsToMigrate.length === 0) {
      console.log('✅ No products need migration');
      await mongoose.disconnect();
      return;
    }

    // Step 3: Process each product
    console.log('🔄 Step 3: Processing products...\n');
    let updated = 0;
    let skipped = 0;
    const manufacturerStats = {};
    const unknownProducts = [];

    for (const product of productsToMigrate) {
      let manufacturer = null;
      let needsUpdate = false;
      const updates = {};

      // Try to infer manufacturer from product name/description
      const searchText = `${product.name} ${product.description || ''}`.toLowerCase();
      
      for (const { pattern, name } of MANUFACTURER_PATTERNS) {
        if (pattern.test(searchText)) {
          // Get or create manufacturer (manufacturers are suppliers who make products)
          manufacturer = await Company.findOneAndUpdate(
            { name: name, companyType: 'supplier' },
            {
              name: name,
              companyType: 'supplier',
              isActive: true
            },
            { upsert: true, new: true }
          );
          break;
        }
      }

      // Check suppliers array for manufacturer hints
      if (!manufacturer && product.suppliers && product.suppliers.length > 0) {
        for (const supplier of product.suppliers) {
          if (supplier.supplierId) {
            const supplierCompany = await Company.findById(supplier.supplierId).lean();
            if (supplierCompany) {
              const supplierName = supplierCompany.name.toLowerCase();
              for (const { pattern, name } of MANUFACTURER_PATTERNS) {
                if (pattern.test(supplierName)) {
                  manufacturer = await Company.findOneAndUpdate(
                    { name: name, companyType: 'supplier' },
                    {
                      name: name,
                      companyType: 'supplier',
                      isActive: true
                    },
                    { upsert: true, new: true }
                  );
                  break;
                }
              }
              if (manufacturer) break;
            }
          }
        }
      }

      // Set manufacturer if found
      if (manufacturer) {
        if (!product.manufacturerId || product.manufacturerId.toString() !== manufacturer._id.toString()) {
          updates.manufacturerId = manufacturer._id;
          needsUpdate = true;
          manufacturerStats[manufacturer.name] = (manufacturerStats[manufacturer.name] || 0) + 1;
        }
      }

      // Set distributor (always IMPRO for Vanos products)
      if (!product.distributorId || product.distributorId.toString() !== distributor._id.toString()) {
        updates.distributorId = distributor._id;
        needsUpdate = true;
      }

      // Update product if needed
      if (needsUpdate) {
        if (!dryRun) {
          await Product.findByIdAndUpdate(product._id, { $set: updates });
        }
        updated++;
        console.log(`   ✅ ${product.name}`);
        if (manufacturer) {
          console.log(`      Manufacturer: ${manufacturer.name}`);
        } else {
          console.log(`      Manufacturer: Unknown (needs manual review)`);
          unknownProducts.push({ id: product._id, name: product.name });
        }
        console.log(`      Distributor: IMPRO`);
      } else {
        skipped++;
      }
    }

    // Step 4: Update supplier arrays in products
    console.log('\n📝 Step 4: Updating supplier arrays...');
    let supplierArraysUpdated = 0;

    const productsWithSuppliers = await Product.find({
      'suppliers.0': { $exists: true },
      isActive: true
    }).lean();

    for (const product of productsWithSuppliers) {
      let needsSupplierUpdate = false;
      const supplierUpdates = [];

      for (const supplier of product.suppliers) {
        const supplierUpdate = { ...supplier };
        
        // Set distributorId in supplier array (usually same as supplierId)
        if (!supplier.distributorId && product.distributorId) {
          supplierUpdate.distributorId = product.distributorId;
          needsSupplierUpdate = true;
        }

        // Set manufacturerId in supplier array if product has one
        if (!supplier.manufacturerId && product.manufacturerId) {
          supplierUpdate.manufacturerId = product.manufacturerId;
          needsSupplierUpdate = true;
        }

        supplierUpdates.push(supplierUpdate);
      }

      if (needsSupplierUpdate) {
        if (!dryRun) {
          await Product.findByIdAndUpdate(product._id, {
            $set: { suppliers: supplierUpdates }
          });
        }
        supplierArraysUpdated++;
      }
    }

    console.log(`   ✅ Updated ${supplierArraysUpdated} products' supplier arrays\n`);

    // Summary
    console.log('📊 Migration Summary:');
    console.log(`   Products updated: ${updated}`);
    console.log(`   Products skipped: ${skipped}`);
    console.log(`   Supplier arrays updated: ${supplierArraysUpdated}`);
    console.log(`   Products needing manual review: ${unknownProducts.length}`);
    
    if (Object.keys(manufacturerStats).length > 0) {
      console.log('\n   Manufacturers found:');
      for (const [name, count] of Object.entries(manufacturerStats)) {
        console.log(`      ${name}: ${count} products`);
      }
    }

    if (unknownProducts.length > 0) {
      console.log('\n   Products needing manual manufacturer assignment:');
      unknownProducts.slice(0, 10).forEach(p => {
        console.log(`      - ${p.name} (ID: ${p.id})`);
      });
      if (unknownProducts.length > 10) {
        console.log(`      ... and ${unknownProducts.length - 10} more`);
      }
    }

    if (dryRun) {
      console.log('\n⚠️  This was a DRY RUN - no changes were saved');
      console.log('   Run without --dry-run to apply changes');
    } else {
      console.log('\n✅ Migration complete!');
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Migration error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run migration
const dryRun = process.argv.includes('--dry-run');
migrateManufacturerDistributor(dryRun)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

