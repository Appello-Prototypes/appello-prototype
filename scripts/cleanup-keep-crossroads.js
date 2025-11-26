require('dotenv').config({ path: '.env.local', override: true });
const mongoose = require('mongoose');

// Import models
const Company = require('../src/server/models/Company');
const Product = require('../src/server/models/Product');
const MaterialRequest = require('../src/server/models/MaterialRequest');
const PurchaseOrder = require('../src/server/models/PurchaseOrder');
const POReceipt = require('../src/server/models/POReceipt');
const Inventory = require('../src/server/models/Inventory');
const InventoryTransaction = require('../src/server/models/InventoryTransaction');

async function cleanupKeepCrossroads() {
  try {
    console.log('🧹 Starting cleanup - keeping only Crossroads supplier...\n');

    const mongoUri = process.env.MONGODB_DEV_URI || process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_DEV_URI or MONGODB_URI must be set');
    }
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Step 1: Find Crossroads supplier (case-insensitive, matches "Crossroads" anywhere in name)
    console.log('Step 1: Finding Crossroads supplier...');
    const crossroads = await Company.findOne({
      name: { $regex: /crossroads/i },
      companyType: 'supplier'
    });

    if (!crossroads) {
      throw new Error('Crossroads supplier not found! Please create it first or check the name.');
    }
    console.log(`  ✅ Found Crossroads: ${crossroads.name} (ID: ${crossroads._id})\n`);

    // Step 2: Delete all other suppliers
    console.log('Step 2: Deleting all suppliers except Crossroads...');
    const deletedSuppliers = await Company.deleteMany({
      companyType: 'supplier',
      _id: { $ne: crossroads._id }
    });
    console.log(`  ✅ Deleted ${deletedSuppliers.deletedCount} suppliers\n`);

    // Step 3: Find all products associated with Crossroads
    console.log('Step 3: Finding products associated with Crossroads...');
    const crossroadsId = crossroads._id;
    const crossroadsIdStr = crossroadsId.toString();

    // Find products that have Crossroads as supplier (check both legacy supplierId and new suppliers array)
    const crossroadsProducts = await Product.find({
      $or: [
        { supplierId: crossroadsId },
        { 'suppliers.supplierId': crossroadsId },
        { 'variants.suppliers.supplierId': crossroadsId }
      ]
    }).select('_id name');

    const crossroadsProductIds = crossroadsProducts.map(p => p._id);
    console.log(`  ✅ Found ${crossroadsProductIds.length} products associated with Crossroads\n`);

    // Step 4: Delete all products NOT associated with Crossroads
    console.log('Step 4: Deleting products not associated with Crossroads...');
    const deletedProducts = await Product.deleteMany({
      _id: { $nin: crossroadsProductIds }
    });
    console.log(`  ✅ Deleted ${deletedProducts.deletedCount} products\n`);

    // Step 5: Clean up products - remove non-Crossroads suppliers from remaining products
    console.log('Step 5: Cleaning up supplier references in remaining products...');
    const allRemainingProducts = await Product.find({});
    let cleanedProducts = 0;
    
    for (const product of allRemainingProducts) {
      let modified = false;

      // Clean legacy supplierId
      if (product.supplierId && product.supplierId.toString() !== crossroadsIdStr) {
        product.supplierId = null;
        modified = true;
      }

      // Clean suppliers array
      if (product.suppliers && product.suppliers.length > 0) {
        const originalLength = product.suppliers.length;
        product.suppliers = product.suppliers.filter(s => {
          const sId = s.supplierId?.toString ? s.supplierId.toString() : String(s.supplierId);
          return sId === crossroadsIdStr;
        });
        if (product.suppliers.length !== originalLength) {
          modified = true;
        }
      }

      // Clean variant suppliers
      if (product.variants && product.variants.length > 0) {
        product.variants.forEach(variant => {
          if (variant.suppliers && variant.suppliers.length > 0) {
            const originalLength = variant.suppliers.length;
            variant.suppliers = variant.suppliers.filter(s => {
              const sId = s.supplierId?.toString ? s.supplierId.toString() : String(s.supplierId);
              return sId === crossroadsIdStr;
            });
            if (variant.suppliers.length !== originalLength) {
              modified = true;
            }
          }
        });
      }

      if (modified) {
        await product.save();
        cleanedProducts++;
      }
    }
    console.log(`  ✅ Cleaned up ${cleanedProducts} products\n`);

    // Step 6: Delete all Material Requests
    console.log('Step 6: Deleting all Material Requests...');
    const deletedMaterialRequests = await MaterialRequest.deleteMany({});
    console.log(`  ✅ Deleted ${deletedMaterialRequests.deletedCount} Material Requests\n`);

    // Step 7: Delete all Purchase Orders
    console.log('Step 7: Deleting all Purchase Orders...');
    const deletedPurchaseOrders = await PurchaseOrder.deleteMany({});
    console.log(`  ✅ Deleted ${deletedPurchaseOrders.deletedCount} Purchase Orders\n`);

    // Step 8: Delete all PO Receipts
    console.log('Step 8: Deleting all PO Receipts...');
    const deletedPOReceipts = await POReceipt.deleteMany({});
    console.log(`  ✅ Deleted ${deletedPOReceipts.deletedCount} PO Receipts\n`);

    // Step 9: Delete all Inventory Transactions
    console.log('Step 9: Deleting all Inventory Transactions...');
    const deletedInventoryTransactions = await InventoryTransaction.deleteMany({});
    console.log(`  ✅ Deleted ${deletedInventoryTransactions.deletedCount} Inventory Transactions\n`);

    // Step 10: Delete all Inventory records
    console.log('Step 10: Deleting all Inventory records...');
    const deletedInventory = await Inventory.deleteMany({});
    console.log(`  ✅ Deleted ${deletedInventory.deletedCount} Inventory records\n`);

    console.log('\n✨ Cleanup complete!\n');
    console.log('📊 Summary:');
    console.log(`   - Crossroads supplier: KEPT (${crossroads.name})`);
    console.log(`   - Other suppliers: DELETED (${deletedSuppliers.deletedCount})`);
    console.log(`   - Crossroads products: KEPT (${crossroadsProductIds.length})`);
    console.log(`   - Other products: DELETED (${deletedProducts.deletedCount})`);
    console.log(`   - Products cleaned: ${cleanedProducts}`);
    console.log(`   - Material Requests: DELETED (${deletedMaterialRequests.deletedCount})`);
    console.log(`   - Purchase Orders: DELETED (${deletedPurchaseOrders.deletedCount})`);
    console.log(`   - PO Receipts: DELETED (${deletedPOReceipts.deletedCount})`);
    console.log(`   - Inventory Transactions: DELETED (${deletedInventoryTransactions.deletedCount})`);
    console.log(`   - Inventory records: DELETED (${deletedInventory.deletedCount})`);

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB\n');
  }
}

cleanupKeepCrossroads();

