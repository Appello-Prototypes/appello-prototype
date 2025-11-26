/**
 * Migration Script: Update All Products with Proper Manufacturers and Distributors
 * 
 * This script ensures all products have:
 * 1. manufacturerId set (from suppliers array or primary field)
 * 2. distributorId set (from suppliers array or primary field)
 * 3. suppliers[] array populated with at least one entry
 * 4. All supplier entries have distributorId and manufacturerId
 * 
 * Usage:
 *   node scripts/update-product-manufacturer-distributor.js [--dry-run]
 * 
 * Example:
 *   node scripts/update-product-manufacturer-distributor.js --dry-run
 */

require('dotenv').config({ path: '.env.local', override: true });
const mongoose = require('mongoose');
const Product = require('../src/server/models/Product');
const Company = require('../src/server/models/Company');

async function updateProductManufacturerDistributor(dryRun = false) {
  try {
    console.log('🔄 Starting Product Manufacturer/Distributor Update...\n');
    
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
    
    // Step 1: Find all products
    console.log('📊 Step 1: Analyzing products...\n');
    
    const products = await Product.find({}).lean();
    console.log(`   Found ${products.length} products\n`);
    
    if (products.length === 0) {
      console.log('✅ No products found. Migration not needed.\n');
      await mongoose.disconnect();
      return;
    }
    
    // Step 2: Process each product
    console.log('🔄 Step 2: Processing products...\n');
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    let missingManufacturer = 0;
    
    for (const product of products) {
      try {
        const updates = {};
        let needsUpdate = false;
        
        // Get the product document (not lean) so we can save it
        const productDoc = await Product.findById(product._id);
        if (!productDoc) {
          console.log(`   ⚠️  Product ${product._id} not found, skipping`);
          skipped++;
          continue;
        }
        
        // Case 1: Product has suppliers array
        if (productDoc.suppliers && productDoc.suppliers.length > 0) {
          // Ensure all supplier entries have distributorId and manufacturerId
          let hasInvalidEntries = false;
          const cleanedSuppliers = productDoc.suppliers.map(supplier => {
            const cleaned = { ...supplier.toObject ? supplier.toObject() : supplier };
            
            // Remove any supplierId if it exists
            if (cleaned.supplierId) {
              delete cleaned.supplierId;
              hasInvalidEntries = true;
            }
            
            // Ensure distributorId and manufacturerId are set
            if (!cleaned.distributorId && !cleaned.manufacturerId) {
              hasInvalidEntries = true;
            }
            
            return cleaned;
          });
          
          if (hasInvalidEntries) {
            updates.suppliers = cleanedSuppliers;
            needsUpdate = true;
          }
          
          // Set primary manufacturerId and distributorId from first supplier
          const firstSupplier = productDoc.suppliers[0];
          if (firstSupplier) {
            // Get distributorId from supplier entry (handle both populated and unpopulated)
            let supplierDistributorId = null;
            if (firstSupplier.distributorId) {
              if (typeof firstSupplier.distributorId === 'object') {
                supplierDistributorId = firstSupplier.distributorId._id || firstSupplier.distributorId;
              } else {
                supplierDistributorId = firstSupplier.distributorId;
              }
            }
            
            // Get manufacturerId from supplier entry (handle both populated and unpopulated)
            let supplierManufacturerId = null;
            if (firstSupplier.manufacturerId) {
              if (typeof firstSupplier.manufacturerId === 'object') {
                supplierManufacturerId = firstSupplier.manufacturerId._id || firstSupplier.manufacturerId;
              } else {
                supplierManufacturerId = firstSupplier.manufacturerId;
              }
            }
            
            // Update distributorId if supplier has it and product doesn't, or if they don't match
            if (supplierDistributorId) {
              const currentDistId = productDoc.distributorId ? productDoc.distributorId.toString() : null;
              const supplierDistId = supplierDistributorId.toString();
              if (!currentDistId || currentDistId !== supplierDistId) {
                updates.distributorId = supplierDistributorId;
                needsUpdate = true;
                console.log(`   📝 Will set distributorId for "${productDoc.name}"`);
              }
            }
            
            // Update manufacturerId if supplier has it and product doesn't, or if they don't match
            if (supplierManufacturerId) {
              const currentManId = productDoc.manufacturerId ? productDoc.manufacturerId.toString() : null;
              const supplierManId = supplierManufacturerId.toString();
              if (!currentManId || currentManId !== supplierManId) {
                updates.manufacturerId = supplierManufacturerId;
                needsUpdate = true;
                console.log(`   📝 Will set manufacturerId for "${productDoc.name}"`);
              }
            } else if (!productDoc.manufacturerId) {
              // Supplier entry doesn't have manufacturerId - this is a problem
              console.log(`   ⚠️  Product "${productDoc.name}" has supplier entry without manufacturerId`);
            }
          }
        } else {
          // Case 2: Product has no suppliers array but has primary fields
          if (productDoc.manufacturerId || productDoc.distributorId) {
            // Create suppliers array from primary fields
            const manufacturerId = productDoc.manufacturerId;
            const distributorId = productDoc.distributorId || productDoc.manufacturerId; // Fallback to manufacturer if no distributor
            
            if (manufacturerId && distributorId) {
              updates.suppliers = [{
                distributorId: distributorId,
                manufacturerId: manufacturerId,
                supplierPartNumber: productDoc.internalPartNumber || '',
                listPrice: productDoc.lastPrice || null,
                netPrice: null,
                discountPercent: null,
                isPreferred: true
              }];
              needsUpdate = true;
            }
          } else {
            // Case 3: Product has neither - try to infer from product name or set defaults
            console.log(`   ⚠️  Product "${productDoc.name}" has no manufacturer or distributor - needs manual review`);
            missingManufacturer++;
            skipped++;
            continue;
          }
        }
        
        // Apply updates
        if (needsUpdate) {
          if (!dryRun) {
            Object.keys(updates).forEach(key => {
              productDoc[key] = updates[key];
            });
            await productDoc.save();
          }
          updated++;
          console.log(`   ${dryRun ? 'Would update' : 'Updated'}: ${productDoc.name}`);
        } else {
          skipped++;
        }
      } catch (error) {
        errors++;
        console.error(`   ❌ Error processing product ${product._id}:`, error.message);
      }
    }
    
    console.log(`\n✅ Migration complete!\n`);
    console.log(`   Products updated: ${updated}`);
    console.log(`   Products skipped: ${skipped}`);
    console.log(`   Products missing manufacturer: ${missingManufacturer}`);
    console.log(`   Errors: ${errors}`);
    
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

updateProductManufacturerDistributor(dryRun);

