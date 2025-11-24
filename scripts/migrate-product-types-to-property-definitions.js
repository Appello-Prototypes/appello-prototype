/**
 * Migrate ProductType Properties to Reference PropertyDefinitions
 * 
 * Links ProductType properties to global PropertyDefinitions to enable:
 * - Unit of measure display
 * - Standard values dropdowns
 * - Consistent property definitions across product types
 */

require('dotenv').config({ path: '.env.local', override: true });
const mongoose = require('mongoose');
const ProductType = require('../src/server/models/ProductType');
const PropertyDefinition = require('../src/server/models/PropertyDefinition');

async function migrateProductTypesToPropertyDefinitions() {
  const mongoUri = process.env.MONGODB_DEV_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_DEV_URI or MONGODB_URI must be set');
  }
  const dbName = mongoUri.match(/\/\/([^/]+)\/([^?]+)/)?.[2] || 'unknown';
  console.log(`📊 Database: ${dbName}`);
  
  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB');

  // Fetch all PropertyDefinitions
  const propertyDefinitions = await PropertyDefinition.find({ isActive: true }).lean();
  console.log(`\n📋 Found ${propertyDefinitions.length} Property Definitions\n`);

  // Create lookup map by key
  const propDefMap = new Map();
  propertyDefinitions.forEach(pd => {
    propDefMap.set(pd.key, pd);
    // Also map aliases
    if (pd.aliases && pd.aliases.length > 0) {
      pd.aliases.forEach(alias => {
        if (!propDefMap.has(alias)) {
          propDefMap.set(alias, pd);
        }
      });
    }
  });

  // Fetch all ProductTypes
  const productTypes = await ProductType.find({});
  console.log(`📦 Found ${productTypes.length} Product Types\n`);

  let updatedCount = 0;
  let propertiesLinkedCount = 0;

  for (const productType of productTypes) {
    if (!productType.properties || productType.properties.length === 0) {
      continue;
    }

    let productTypeUpdated = false;
    const updatedProperties = productType.properties.map(prop => {
      const propKey = prop.key;
      const propDef = propDefMap.get(propKey);

      if (propDef) {
        // Link to PropertyDefinition
        const updatedProp = {
          ...prop.toObject ? prop.toObject() : prop,
          propertyDefinitionId: propDef._id,
          // Update unit information from PropertyDefinition
          unit: propDef.unit || prop.unit,
          unitOfMeasureId: propDef.unitOfMeasureId || prop.unitOfMeasureId,
          unitSystem: propDef.unitSystem || prop.unitSystem || 'imperial',
          // Update label if PropertyDefinition has better one
          label: propDef.label || prop.label,
          // Update type if PropertyDefinition has better mapping
          type: propDef.dataType === 'fraction' ? 'string' : 
                propDef.dataType === 'enum' ? 'enum' : 
                propDef.dataType === 'boolean' ? 'boolean' :
                propDef.dataType === 'date' ? 'date' :
                propDef.dataType === 'number' ? 'number' :
                prop.type,
          // Update options if PropertyDefinition has enumOptions
          options: propDef.enumOptions?.map(opt => ({ value: opt.value, label: opt.label })) || prop.options || [],
          // Update display settings
          display: {
            ...prop.display,
            placeholder: propDef.display?.placeholder || prop.display?.placeholder,
            helpText: propDef.description || propDef.display?.helpText || prop.display?.helpText
          }
        };

        productTypeUpdated = true;
        propertiesLinkedCount++;
        
        console.log(`  ✅ "${productType.name}": Linked "${propKey}" → PropertyDefinition "${propDef.label}" (${propDef.unit || 'no unit'})`);
        
        return updatedProp;
      } else {
        // Property not found in PropertyDefinitions - keep as is but log warning
        console.log(`  ⚠️  "${productType.name}": Property "${propKey}" not found in PropertyDefinitions (keeping as custom)`);
        return prop.toObject ? prop.toObject() : prop;
      }
    });

    if (productTypeUpdated) {
      productType.properties = updatedProperties;
      await productType.save();
      updatedCount++;
      console.log(`  ✅ Updated ProductType: ${productType.name}\n`);
    }
  }

  console.log(`\n📊 Summary:\n   ProductTypes Updated: ${updatedCount}/${productTypes.length}\n   Properties Linked: ${propertiesLinkedCount}\n`);
  console.log('✅ Migration complete!');
}

migrateProductTypesToPropertyDefinitions().then(() => {
  mongoose.disconnect();
}).catch(err => {
  console.error('Migration failed:', err);
  mongoose.disconnect();
});

