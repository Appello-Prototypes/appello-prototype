/**
 * Migration Script: Normalize Existing Product Properties
 * 
 * Adds propertiesNormalized and propertyUnits to all existing products and variants.
 * This enables cross-unit search/filtering.
 */

require('dotenv').config({ path: '.env.local', override: true });
const mongoose = require('mongoose');
const Product = require('../src/server/models/Product');
const { normalizeProperties } = require('../src/server/services/propertyNormalizationService');

async function migrateProductsNormalizeProperties() {
  const mongoUri = process.env.MONGODB_DEV_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_DEV_URI or MONGODB_URI must be set');
  }
  const dbName = mongoUri.match(/\/\/([^/]+)\/([^?]+)/)?.[2] || 'unknown';
  console.log(`📊 Database: ${dbName}`);
  
  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB');

  const products = await Product.find({});
  console.log(`\n📦 Found ${products.length} products to migrate\n`);

  let updatedCount = 0;
  let productsNormalizedCount = 0;
  let variantsNormalizedCount = 0;
  let skippedCount = 0;

  for (const product of products) {
    let productUpdated = false;

    // Normalize product-level properties
    if (product.properties && (product.properties instanceof Map ? product.properties.size > 0 : Object.keys(product.properties).length > 0)) {
      try {
        const { propertiesNormalized, propertyUnits } = await normalizeProperties(product.properties);
        
        if (propertiesNormalized.size > 0 || propertyUnits.size > 0) {
          product.propertiesNormalized = propertiesNormalized;
          product.propertyUnits = propertyUnits;
          productUpdated = true;
          productsNormalizedCount++;
          
          if (propertiesNormalized.size > 0) {
            console.log(`  ✅ "${product.name}": Normalized ${propertiesNormalized.size} properties`);
          }
        }
      } catch (error) {
        console.error(`  ❌ Error normalizing properties for "${product.name}":`, error.message);
        skippedCount++;
        continue;
      }
    }

    // Normalize variant properties
    if (product.variants && product.variants.length > 0) {
      let variantsUpdated = false;
      
      for (const variant of product.variants) {
        if (variant.properties && (variant.properties instanceof Map ? variant.properties.size > 0 : Object.keys(variant.properties).length > 0)) {
          try {
            const { propertiesNormalized, propertyUnits } = await normalizeProperties(variant.properties);
            
            if (propertiesNormalized.size > 0 || propertyUnits.size > 0) {
              variant.propertiesNormalized = propertiesNormalized;
              variant.propertyUnits = propertyUnits;
              variantsUpdated = true;
              variantsNormalizedCount++;
            }
          } catch (error) {
            console.error(`  ❌ Error normalizing variant properties for "${product.name}" variant "${variant.name}":`, error.message);
          }
        }
      }
      
      if (variantsUpdated) {
        productUpdated = true;
      }
    }

    if (productUpdated) {
      try {
        await product.save();
        updatedCount++;
      } catch (error) {
        console.error(`  ❌ Error saving "${product.name}":`, error.message);
        skippedCount++;
      }
    }
  }

  console.log(`\n📊 Summary:\n   Products Updated: ${updatedCount}/${products.length}\n   Products with Normalized Properties: ${productsNormalizedCount}\n   Variants Normalized: ${variantsNormalizedCount}\n   Skipped: ${skippedCount}\n`);
  console.log('✅ Migration complete!');
}

migrateProductsNormalizeProperties().then(() => {
  mongoose.disconnect();
}).catch(err => {
  console.error('Migration failed:', err);
  mongoose.disconnect();
});

