const mongoose = require('mongoose');
require('dotenv').config();
require('dotenv').config({ path: '.env.local', override: true });

const ProductType = require('../src/server/models/ProductType');
const Product = require('../src/server/models/Product');
const Company = require('../src/server/models/Company');

// Determine which database to use
let mongoUri;
if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
  mongoUri = process.env.MONGODB_URI;
} else {
  mongoUri = process.env.MONGODB_DEV_URI || process.env.MONGODB_URI;
}

const connectDB = async () => {
  try {
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const testProductTypes = async () => {
  console.log('📋 Testing Product Types...\n');

  const productTypes = await ProductType.find({ isActive: true })
    .sort({ name: 1 })
    .lean();

  console.log(`Found ${productTypes.length} product types:\n`);

  for (const type of productTypes) {
    console.log(`📦 ${type.name}`);
    console.log(`   Slug: ${type.slug}`);
    console.log(`   Properties: ${type.properties.length}`);
    console.log(`   Variants Enabled: ${type.variantSettings?.enabled ? 'Yes' : 'No'}`);
    if (type.variantSettings?.enabled) {
      console.log(`   Variant Properties: ${type.variantSettings.variantProperties.join(', ')}`);
    }
    console.log('');
  }

  return productTypes;
};

const testProducts = async () => {
  console.log('📦 Testing Products...\n');

  const products = await Product.find({ isActive: true })
    .populate('productTypeId', 'name slug')
    .populate('suppliers.supplierId', 'name')
    .sort({ name: 1 })
    .lean();

  console.log(`Found ${products.length} products:\n`);

  for (const product of products) {
    console.log(`🔧 ${product.name}`);
    console.log(`   Type: ${product.productTypeId?.name || 'None'}`);
    console.log(`   Internal Part #: ${product.internalPartNumber || 'N/A'}`);
    console.log(`   Unit: ${product.unitOfMeasure}`);
    
    // Display properties
    if (product.properties && product.properties instanceof Map) {
      const props = Object.fromEntries(product.properties);
      if (Object.keys(props).length > 0) {
        console.log(`   Properties:`);
        for (const [key, value] of Object.entries(props)) {
          const displayValue = Array.isArray(value) ? value.join(', ') : value;
          console.log(`     - ${key}: ${displayValue}`);
        }
      }
    } else if (product.properties && typeof product.properties === 'object') {
      if (Object.keys(product.properties).length > 0) {
        console.log(`   Properties:`);
        for (const [key, value] of Object.entries(product.properties)) {
          const displayValue = Array.isArray(value) ? value.join(', ') : value;
          console.log(`     - ${key}: ${displayValue}`);
        }
      }
    }

    // Display variants
    if (product.variants && product.variants.length > 0) {
      console.log(`   Variants: ${product.variants.length}`);
      product.variants.forEach((variant, idx) => {
        console.log(`     ${idx + 1}. ${variant.name || `Variant ${idx + 1}`}`);
        if (variant.sku) console.log(`        SKU: ${variant.sku}`);
        
        // Display variant properties
        if (variant.properties) {
          const variantProps = variant.properties instanceof Map
            ? Object.fromEntries(variant.properties)
            : variant.properties;
          
          if (Object.keys(variantProps).length > 0) {
            console.log(`        Properties:`);
            for (const [key, value] of Object.entries(variantProps)) {
              console.log(`          - ${key}: ${value}`);
            }
          }
        }

        if (variant.pricing?.lastPrice) {
          console.log(`        Price: $${variant.pricing.lastPrice.toFixed(2)}`);
        }
      });
    } else {
      console.log(`   Variants: None`);
    }

    // Display suppliers
    if (product.suppliers && product.suppliers.length > 0) {
      console.log(`   Suppliers: ${product.suppliers.length}`);
      product.suppliers.forEach((supplier, idx) => {
        const supplierName = supplier.supplierId?.name || 'Unknown';
        console.log(`     ${idx + 1}. ${supplierName}`);
        if (supplier.supplierPartNumber) {
          console.log(`        Part #: ${supplier.supplierPartNumber}`);
        }
        if (supplier.lastPrice) {
          console.log(`        Price: $${supplier.lastPrice.toFixed(2)}`);
        }
      });
    }

    console.log('');
  }

  return products;
};

const testVariantGeneration = async () => {
  console.log('🧪 Testing Variant Generation Logic...\n');

  const pipeInsulationType = await ProductType.findOne({ slug: 'pipe-insulation' }).lean();
  if (!pipeInsulationType) {
    console.log('❌ Pipe Insulation type not found');
    return;
  }

  const pipeProduct = await Product.findOne({ name: 'Fiberglass Pipe Insulation' })
    .populate('productTypeId')
    .lean();

  if (!pipeProduct) {
    console.log('❌ Pipe Insulation product not found');
    return;
  }

  console.log(`✅ Found product: ${pipeProduct.name}`);
  console.log(`   Product Type: ${pipeProduct.productTypeId?.name}`);
  console.log(`   Variants Enabled: ${pipeProduct.productTypeId?.variantSettings?.enabled}`);
  console.log(`   Variant Properties: ${pipeProduct.productTypeId?.variantSettings?.variantProperties.join(', ')}`);
  console.log(`   Number of Variants: ${pipeProduct.variants?.length || 0}\n`);

  if (pipeProduct.variants && pipeProduct.variants.length > 0) {
    console.log('📋 Variant Details:');
    pipeProduct.variants.forEach((variant, idx) => {
      console.log(`\n   Variant ${idx + 1}:`);
      console.log(`     Name: ${variant.name}`);
      console.log(`     SKU: ${variant.sku || 'N/A'}`);
      
      const variantProps = variant.properties instanceof Map
        ? Object.fromEntries(variant.properties)
        : variant.properties || {};

      console.log(`     Properties:`);
      for (const [key, value] of Object.entries(variantProps)) {
        console.log(`       ${key}: ${value}`);
      }

      if (variant.pricing) {
        console.log(`     Pricing:`);
        if (variant.pricing.standardCost) {
          console.log(`       Standard Cost: $${variant.pricing.standardCost.toFixed(2)}`);
        }
        if (variant.pricing.lastPrice) {
          console.log(`       Last Price: $${variant.pricing.lastPrice.toFixed(2)}`);
        }
      }
    });
  }
};

const testPropertyValidation = async () => {
  console.log('\n🔍 Testing Property Validation...\n');

  const hvacType = await ProductType.findOne({ slug: 'hvac-equipment' }).lean();
  if (!hvacType) {
    console.log('❌ HVAC Equipment type not found');
    return;
  }

  const hvacProduct = await Product.findOne({ name: 'Carrier Infinity 19VS Heat Pump' }).lean();
  if (!hvacProduct) {
    console.log('❌ HVAC product not found');
    return;
  }

  console.log(`✅ Testing product: ${hvacProduct.name}`);
  console.log(`   Product Type: ${hvacType.name}\n`);

  const productProps = hvacProduct.properties instanceof Map
    ? Object.fromEntries(hvacProduct.properties)
    : hvacProduct.properties || {};

  console.log('📋 Property Values:');
  hvacType.properties.forEach(propDef => {
    const value = productProps[propDef.key];
    const displayValue = Array.isArray(value) ? value.join(', ') : (value !== undefined ? value : 'Not set');
    
    console.log(`   ${propDef.label} (${propDef.type}): ${displayValue}`);
    
    // Validate required properties
    if (propDef.required && (value === undefined || value === null || value === '')) {
      console.log(`     ⚠️  WARNING: Required property is missing!`);
    }

    // Validate enum values
    if (propDef.type === 'enum' && value && propDef.options) {
      const validOption = propDef.options.find(opt => opt.value === value);
      if (!validOption) {
        console.log(`     ⚠️  WARNING: Invalid enum value!`);
      }
    }

    // Validate multiselect values
    if (propDef.type === 'multiselect' && Array.isArray(value)) {
      value.forEach(val => {
        const validOption = propDef.options?.find(opt => opt.value === val);
        if (!validOption) {
          console.log(`     ⚠️  WARNING: Invalid multiselect value: ${val}`);
        }
      });
    }

    // Validate number ranges
    if (propDef.type === 'number' && value !== undefined && propDef.validation) {
      if (propDef.validation.min !== undefined && value < propDef.validation.min) {
        console.log(`     ⚠️  WARNING: Value below minimum (${propDef.validation.min})!`);
      }
      if (propDef.validation.max !== undefined && value > propDef.validation.max) {
        console.log(`     ⚠️  WARNING: Value above maximum (${propDef.validation.max})!`);
      }
    }
  });
};

const main = async () => {
  try {
    await connectDB();

    console.log('🧪 Testing Product Types & Variants System\n');
    console.log('=' .repeat(60) + '\n');

    // Test 1: Product Types
    const productTypes = await testProductTypes();
    console.log('=' .repeat(60) + '\n');

    // Test 2: Products
    const products = await testProducts();
    console.log('=' .repeat(60) + '\n');

    // Test 3: Variant Generation
    await testVariantGeneration();
    console.log('=' .repeat(60) + '\n');

    // Test 4: Property Validation
    await testPropertyValidation();
    console.log('=' .repeat(60) + '\n');

    // Summary
    console.log('📊 Test Summary:');
    console.log(`   ✅ Product Types: ${productTypes.length}`);
    console.log(`   ✅ Products: ${products.length}`);
    const totalVariants = products.reduce((sum, p) => sum + (p.variants?.length || 0), 0);
    console.log(`   ✅ Total Variants: ${totalVariants}`);
    const productsWithVariants = products.filter(p => p.variants && p.variants.length > 0).length;
    console.log(`   ✅ Products with Variants: ${productsWithVariants}`);
    console.log(`   ✅ Products without Variants: ${products.length - productsWithVariants}`);

    await mongoose.connection.close();
    console.log('\n✅ Tests complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Test error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

main();

