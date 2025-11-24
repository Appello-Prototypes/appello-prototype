/**
 * Migration Script: Migrate Properties to Global Property Definitions
 * 
 * This script updates all ProductTypes, Products, and Specifications to use
 * canonical property keys from PropertyDefinitions instead of custom keys.
 * 
 * Usage:
 *   node scripts/migrate-properties-to-global-definitions.js [--dry-run] [--verbose]
 * 
 * Options:
 *   --dry-run    Show what would be changed without actually updating
 *   --verbose    Show detailed output for each change
 */

require('dotenv').config({ path: '.env.local', override: true });
const mongoose = require('mongoose');
const PropertyDefinition = require('../src/server/models/PropertyDefinition');
const ProductType = require('../src/server/models/ProductType');
const Product = require('../src/server/models/Product');
const Specification = require('../src/server/models/Specification');

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isVerbose = args.includes('--verbose');

// Statistics
const stats = {
  productTypes: { total: 0, updated: 0, propertiesUpdated: 0 },
  products: { total: 0, updated: 0, propertiesUpdated: 0, variantsUpdated: 0 },
  specifications: { total: 0, updated: 0, propertiesUpdated: 0 },
  errors: []
};

/**
 * Build a mapping of all possible keys (canonical + aliases) to canonical keys
 */
async function buildPropertyKeyMapping() {
  const propertyDefinitions = await PropertyDefinition.find({ isActive: true });
  const mapping = {};
  
  for (const pd of propertyDefinitions) {
    const canonicalKey = pd.key;
    
    // Map canonical key to itself
    mapping[canonicalKey] = canonicalKey;
    
    // Map all aliases to canonical key
    if (pd.aliases && pd.aliases.length > 0) {
      for (const alias of pd.aliases) {
        mapping[alias.toLowerCase()] = canonicalKey;
      }
    }
    
    // Also map common variations
    const variations = [
      canonicalKey.replace(/_/g, ''), // pipe_diameter -> pipediameter
      canonicalKey.replace(/_/g, '-'), // pipe_diameter -> pipe-diameter
    ];
    for (const variation of variations) {
      if (variation !== canonicalKey) {
        mapping[variation] = canonicalKey;
      }
    }
  }
  
  return { mapping, propertyDefinitions };
}

/**
 * Find matching PropertyDefinition for a property key
 */
function findMatchingPropertyDefinition(key, propertyDefinitions) {
  if (!key) return null;
  
  const normalizedKey = key.toLowerCase().trim();
  
  // Direct match
  let match = propertyDefinitions.find(pd => pd.key === normalizedKey);
  if (match) return match;
  
  // Alias match
  match = propertyDefinitions.find(pd => 
    pd.aliases && pd.aliases.some(alias => alias.toLowerCase() === normalizedKey)
  );
  if (match) return match;
  
  // Common variations
  const variations = [
    normalizedKey.replace(/_/g, ''),
    normalizedKey.replace(/_/g, '-'),
    normalizedKey.replace(/-/g, '_'),
  ];
  
  for (const variation of variations) {
    match = propertyDefinitions.find(pd => pd.key === variation);
    if (match) return match;
    
    match = propertyDefinitions.find(pd => 
      pd.aliases && pd.aliases.some(alias => alias.toLowerCase() === variation)
    );
    if (match) return match;
  }
  
  return null;
}

/**
 * Get canonical key for a property key
 * Maps all variations to canonical keys, including common patterns
 */
function getCanonicalKey(key, mapping) {
  if (!key) return key;
  
  const normalizedKey = key.toLowerCase().trim();
  
  // Check direct mapping first
  if (mapping[normalizedKey]) {
    return mapping[normalizedKey];
  }
  
  // Check common variations
  const variations = [
    normalizedKey,
    normalizedKey.replace(/_/g, ''),
    normalizedKey.replace(/_/g, '-'),
    normalizedKey.replace(/-/g, '_'),
    normalizedKey.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase(), // camelCase -> snake_case
  ];
  
  for (const variation of variations) {
    if (mapping[variation]) {
      return mapping[variation];
    }
  }
  
  // If no mapping found, return original (will be handled as custom)
  return key;
}

/**
 * Update ProductType properties
 */
async function migrateProductTypes(mapping, propertyDefinitions) {
  console.log('\n📦 Migrating ProductTypes...\n');
  
  const productTypes = await ProductType.find({});
  stats.productTypes.total = productTypes.length;
  
  for (const productType of productTypes) {
    let updated = false;
    let propertiesUpdated = 0;
    
    if (!productType.properties || productType.properties.length === 0) {
      continue;
    }
    
    const updatedProperties = productType.properties.map(prop => {
      const oldKey = prop.key;
      const canonicalKey = getCanonicalKey(oldKey, mapping);
      const propDef = findMatchingPropertyDefinition(oldKey, propertyDefinitions);
      
      if (oldKey !== canonicalKey || propDef) {
        updated = true;
        propertiesUpdated++;
        
        if (isVerbose) {
          console.log(`  ProductType "${productType.name}": Property "${oldKey}" → "${canonicalKey}"`);
        }
        
        // Update property with PropertyDefinition data if found
        const updatedProp = {
          ...prop,
          key: canonicalKey
        };
        
        if (propDef) {
          // Update label if not set or different
          if (!updatedProp.label || updatedProp.label === oldKey) {
            updatedProp.label = propDef.label;
          }
          
          // Map PropertyDefinition dataType to ProductType type
          // ProductType only supports: 'string', 'number', 'boolean', 'date', 'enum', 'multiselect'
          const dataTypeMapping = {
            'text': 'string',
            'fraction': 'string', // Fractions stored as strings in ProductType
            'number': 'number',
            'boolean': 'boolean',
            'date': 'date',
            'enum': 'enum'
          };
          
          if (propDef.dataType && dataTypeMapping[propDef.dataType]) {
            const mappedType = dataTypeMapping[propDef.dataType];
            if (updatedProp.type !== mappedType) {
              updatedProp.type = mappedType;
            }
          }
          
          // Update options if PropertyDefinition has enum options
          if (propDef.enumOptions && propDef.enumOptions.length > 0 && 
              (!updatedProp.options || updatedProp.options.length === 0)) {
            updatedProp.options = propDef.enumOptions.map(opt => ({
              value: opt.value,
              label: opt.label
            }));
          }
          
          // Update display settings
          if (!updatedProp.display) updatedProp.display = {};
          if (propDef.display?.placeholder && !updatedProp.display.placeholder) {
            updatedProp.display.placeholder = propDef.display.placeholder;
          }
          if (propDef.description && !updatedProp.display.helpText) {
            updatedProp.display.helpText = propDef.description;
          }
        }
        
        return updatedProp;
      }
      
      return prop;
    });
    
    // Update variantProperties keys
    const updatedVariantProperties = productType.variantSettings?.variantProperties?.map(key => 
      getCanonicalKey(key, mapping)
    ) || [];
    
    if (updated || JSON.stringify(updatedVariantProperties) !== JSON.stringify(productType.variantSettings?.variantProperties || [])) {
      if (!isDryRun) {
        productType.properties = updatedProperties;
        if (productType.variantSettings) {
          productType.variantSettings.variantProperties = updatedVariantProperties;
        }
        await productType.save();
      }
      
      stats.productTypes.updated++;
      stats.productTypes.propertiesUpdated += propertiesUpdated;
      
      console.log(`  ✅ ${productType.name}: Updated ${propertiesUpdated} properties${isDryRun ? ' (dry-run)' : ''}`);
    }
  }
  
  console.log(`\n📊 ProductTypes: ${stats.productTypes.updated}/${stats.productTypes.total} updated, ${stats.productTypes.propertiesUpdated} properties migrated`);
}

/**
 * Update Product properties and variant properties
 */
async function migrateProducts(mapping) {
  console.log('\n📦 Migrating Products...\n');
  
  const products = await Product.find({});
  stats.products.total = products.length;
  
  for (const product of products) {
    let updated = false;
    let propertiesUpdated = 0;
    let variantsUpdated = 0;
    
    // Update product properties Map
    if (product.properties && product.properties instanceof Map && product.properties.size > 0) {
      const oldProps = Object.fromEntries(product.properties);
      const newProps = new Map();
      
      for (const [oldKey, value] of Object.entries(oldProps)) {
        const canonicalKey = getCanonicalKey(oldKey, mapping);
        newProps.set(canonicalKey, value);
        
        if (oldKey !== canonicalKey) {
          updated = true;
          propertiesUpdated++;
          if (isVerbose) {
            console.log(`  Product "${product.name}": Property "${oldKey}" → "${canonicalKey}"`);
          }
        }
      }
      
      if (updated && !isDryRun) {
        product.properties = newProps;
      }
    }
    
    // Update variant properties
    if (product.variants && product.variants.length > 0) {
      for (const variant of product.variants) {
        if (variant.properties && variant.properties instanceof Map && variant.properties.size > 0) {
          const oldVariantProps = Object.fromEntries(variant.properties);
          const newVariantProps = new Map();
          let variantUpdated = false;
          
          for (const [oldKey, value] of Object.entries(oldVariantProps)) {
            const canonicalKey = getCanonicalKey(oldKey, mapping);
            newVariantProps.set(canonicalKey, value);
            
            if (oldKey !== canonicalKey) {
              variantUpdated = true;
              variantsUpdated++;
              if (isVerbose) {
                console.log(`  Product "${product.name}" Variant "${variant.name || variant.sku}": Property "${oldKey}" → "${canonicalKey}"`);
              }
            }
          }
          
          if (variantUpdated && !isDryRun) {
            variant.properties = newVariantProps;
          }
        }
      }
    }
    
    if (updated || variantsUpdated > 0) {
      if (!isDryRun) {
        await product.save();
      }
      
      stats.products.updated++;
      stats.products.propertiesUpdated += propertiesUpdated;
      stats.products.variantsUpdated += variantsUpdated;
      
      if (propertiesUpdated > 0 || variantsUpdated > 0) {
        console.log(`  ✅ ${product.name}: Updated ${propertiesUpdated} properties, ${variantsUpdated} variant properties${isDryRun ? ' (dry-run)' : ''}`);
      }
    }
  }
  
  console.log(`\n📊 Products: ${stats.products.updated}/${stats.products.total} updated, ${stats.products.propertiesUpdated} properties migrated, ${stats.products.variantsUpdated} variant properties migrated`);
}

/**
 * Update Specification properties
 */
async function migrateSpecifications(mapping) {
  console.log('\n📦 Migrating Specifications...\n');
  
  const specifications = await Specification.find({});
  stats.specifications.total = specifications.length;
  
  for (const spec of specifications) {
    let updated = false;
    let propertiesUpdated = 0;
    
    // Update requiredProperties Map
    if (spec.requiredProperties && spec.requiredProperties instanceof Map && spec.requiredProperties.size > 0) {
      const oldProps = Object.fromEntries(spec.requiredProperties);
      const newProps = new Map();
      
      for (const [oldKey, value] of Object.entries(oldProps)) {
        const canonicalKey = getCanonicalKey(oldKey, mapping);
        newProps.set(canonicalKey, value);
        
        if (oldKey !== canonicalKey) {
          updated = true;
          propertiesUpdated++;
          if (isVerbose) {
            console.log(`  Specification "${spec.name}": Property "${oldKey}" → "${canonicalKey}"`);
          }
        }
      }
      
      if (updated && !isDryRun) {
        spec.requiredProperties = newProps;
      }
    }
    
    // Update propertyMatchingRules propertyKey
    if (spec.propertyMatchingRules && spec.propertyMatchingRules.length > 0) {
      const updatedRules = spec.propertyMatchingRules.map(rule => {
        const oldKey = rule.propertyKey;
        const canonicalKey = getCanonicalKey(oldKey, mapping);
        
        if (oldKey !== canonicalKey) {
          updated = true;
          propertiesUpdated++;
          if (isVerbose) {
            console.log(`  Specification "${spec.name}": Rule property "${oldKey}" → "${canonicalKey}"`);
          }
        }
        
        return {
          ...rule,
          propertyKey: canonicalKey
        };
      });
      
      if (updated && !isDryRun) {
        spec.propertyMatchingRules = updatedRules;
      }
    }
    
    if (updated) {
      if (!isDryRun) {
        await spec.save();
      }
      
      stats.specifications.updated++;
      stats.specifications.propertiesUpdated += propertiesUpdated;
      
      console.log(`  ✅ ${spec.name}: Updated ${propertiesUpdated} properties${isDryRun ? ' (dry-run)' : ''}`);
    }
  }
  
  console.log(`\n📊 Specifications: ${stats.specifications.total} total, ${stats.specifications.updated} updated, ${stats.specifications.propertiesUpdated} properties migrated`);
}

/**
 * Main migration function
 */
async function runMigration() {
  try {
    console.log('🚀 Starting Property Migration to Global Definitions\n');
    console.log(`Mode: ${isDryRun ? 'DRY RUN (no changes will be saved)' : 'LIVE (changes will be saved)'}`);
    console.log(`Verbose: ${isVerbose ? 'ON' : 'OFF'}\n`);
    
    // Connect to database (prefer dev for local development)
    const mongoUri = process.env.MONGODB_DEV_URI || process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_DEV_URI or MONGODB_URI must be set in .env.local');
    }
    
    const dbName = mongoUri.match(/\/\/([^/]+)\/([^?]+)/)?.[2] || 'unknown';
    console.log(`📊 Database: ${dbName}`);
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');
    
    // Build property key mapping
    console.log('📋 Building property key mapping...');
    const { mapping, propertyDefinitions } = await buildPropertyKeyMapping();
    console.log(`✅ Found ${propertyDefinitions.length} Property Definitions`);
    console.log(`✅ Built mapping for ${Object.keys(mapping).length} keys\n`);
    
    // Run migrations
    await migrateProductTypes(mapping, propertyDefinitions);
    await migrateProducts(mapping);
    await migrateSpecifications(mapping);
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`ProductTypes:    ${stats.productTypes.updated}/${stats.productTypes.total} updated (${stats.productTypes.propertiesUpdated} properties)`);
    console.log(`Products:         ${stats.products.updated}/${stats.products.total} updated (${stats.products.propertiesUpdated} properties, ${stats.products.variantsUpdated} variant properties)`);
    console.log(`Specifications:   ${stats.specifications.updated}/${stats.specifications.total} updated (${stats.specifications.propertiesUpdated} properties)`);
    
    if (stats.errors.length > 0) {
      console.log(`\n⚠️  Errors: ${stats.errors.length}`);
      stats.errors.forEach(err => console.error(`  - ${err}`));
    }
    
    if (isDryRun) {
      console.log('\n⚠️  DRY RUN MODE - No changes were saved');
      console.log('   Run without --dry-run to apply changes');
    } else {
      console.log('\n✅ Migration completed successfully!');
    }
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    stats.errors.push(error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

// Run migration
runMigration();

