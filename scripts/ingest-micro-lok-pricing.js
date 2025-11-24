/**
 * Ingest Micro-Lok ASJ Fibreglass Pipe Insulation Pricing Sheet
 * 
 * Processes the pricing sheet data and creates:
 * - Supplier (Crossroads C&I)
 * - Product with variants for each pipe size/thickness combination
 * - Stores list prices in variant suppliers
 * 
 * Usage:
 *   node scripts/ingest-micro-lok-pricing.js
 */

require('dotenv').config({ path: '.env.local', override: true });
const mongoose = require('mongoose');

// Import models
const Company = require('../src/server/models/Company');
const Product = require('../src/server/models/Product');
const ProductType = require('../src/server/models/ProductType');
const Discount = require('../src/server/models/Discount');

// Pricing data from Google Sheets (already fetched)
// Row format: [copperDiameter, ironDiameter, price1/2", price1", price1.5", price2", price2.5", price3", price3.5", price4"]
const PRICING_DATA = [
  ['5/8', '', '3.69', '4.47', '8.43', '13.11', '', '', '', ''],
  ['7/8', '1/2', '3.69', '4.47', '8.43', '13.11', '', '', '', ''],
  ['1 1/8', '3/4', '4.18', '4.89', '8.46', '13.53', '', '', '', ''],
  ['1 3/8', '1', '4.32', '5.22', '9.09', '14.41', '16.94', '22.92', '', ''],
  ['1 5/8', '1 1/4', '4.59', '5.64', '9.88', '15.22', '17.53', '23.4', '', ''],
  ['', '1 1/2', '5.28', '6.1', '10.33', '15.87', '18.45', '24.46', '31.57', ''],
  ['', '2', '5.64', '6.58', '11.4', '16.73', '19.36', '25.7', '31.82', ''],
  ['2 1/8', '', '5.64', '6.58', '11.4', '16.73', '19.94', '26.49', '32.81', ''],
  ['', '2 1/2', '5.95', '7.5', '12.22', '18.03', '22.26', '26.72', '', ''],
  ['2 5/8', '', '5.95', '7.5', '12.22', '18.03', '22.26', '27.53', '33.08', ''],
  ['', '3', '6.63', '8.04', '12.81', '19.11', '23.44', '28.42', '34.83', '46.16'],
  ['3 1/8', '', '6.63', '8.04', '12.81', '19.11', '24.12', '29.27', '34.84', '47.64'],
  ['', '3 1/2', '7.98', '8.72', '14', '20.72', '26.26', '32.3', '36.25', '47.48'],
  ['3 5/8', '', '8.01', '8.72', '14', '20.72', '26.26', '32.3', '36.26', '48.97'],
  ['', '4', '8.41', '10.63', '14.55', '22.29', '26.9', '33.68', '39.86', '51.07'],
  ['4 1/8', '', '8.41', '10.63', '14.55', '22.29', '27.71', '34.68', '39.87', '52.64'],
  ['', '4 1/2', '9.42', '10.96', '15.22', '24.01', '29.8', '37.07', '41.25', '52.39'],
  ['', '5', '10.54', '12.01', '16.33', '25.51', '33.09', '38.14', '43.05', '56.86'],
  ['5 1/8', '', '-', '12.01', '16.33', '25.51', '33.07', '39.26', '44.49', '58.63'],
  ['', '6', '11.8', '12.72', '17.22', '26.3', '38.59', '40.79', '46.06', '58.66'],
  ['6 1/8', '', '', '12.72', '17.22', '26.3', '39.73', '42.01', '47.5', '62.3'],
  ['', '7', '', '15.15', '19.11', '29.95', '38.87', '46.7', '50.36', '62.65'],
  ['', '8', '', '20.79', '24.13', '31.99', '41.23', '50.82', '52.77', '64.96'],
  ['', '9', '', '21.92', '25.15', '35.11', '45.15', '54.77', '56.89', '81.42'],
  ['', '10', '', '22.05', '26.01', '38.3', '49.16', '58.74', '69.44', '82.82'],
  ['', '11', '', '22.29', '27.86', '42.68', '53.26', '73.23', '75.43', '91.72'],
  ['', '12', '', '24.01', '29.54', '42.92', '59.65', '73.21', '77.48', '97.07'],
  ['', '14', '', '28.82', '35.2', '55.22', '69.72', '84.32', '88.8', '107.72'],
  ['', '15', '', '32.36', '44.02', '61.81', '78.11', '95.64', '93.36', '114.72'],
  ['', '16', '', '36.64', '44.61', '60.63', '78.47', '95.66', '97.9', '119.6'],
  ['', '17', '', '41.26', '47.81', '67.28', '85.55', '103.72', '104.75', '124.15'],
  ['', '18', '', '40.64', '50.47', '67.74', '86.63', '102.31', '108.41', '133.28'],
  ['', '19', '', '46.05', '53.74', '74', '93.5', '110.25', '113.93', '136.4'],
  ['', '20', '', '50.21', '54.78', '78.13', '96.79', '110.6', '121.62', '139.02'],
  ['', '21', '', '52.55', '58.76', '81.41', '101.06', '121.28', '128.65', '158.22'],
  ['', '22', '', '52.99', '60.29', '82.94', '107.35', '120.96', '127.66', '-'],
  ['', '23', '', '58.19', '61.89', '84.56', '111.98', '146.27', '-', '-'],
  ['', '24', '', '58.59', '65.11', '85.75', '153.92', '168.82', '178.15', '178.99']
];

// Insulation thicknesses (column headers)
const INSULATION_THICKNESSES = ['1/2"', '1"', '1 1/2"', '2"', '2 1/2"', '3"', '3 1/2"', '4"'];

/**
 * Parse pipe diameter from string
 */
function parsePipeDiameter(str) {
  if (!str || str.trim() === '' || str === '-') return null;
  return str.trim();
}

/**
 * Parse price from string
 */
function parsePrice(str) {
  if (!str || str.trim() === '' || str === '-') return null;
  const price = parseFloat(str.trim());
  return isNaN(price) ? null : price;
}

/**
 * Generate SKU for variant
 */
function generateSKU(pipeType, pipeDiameter, insulationThickness) {
  const pipeClean = pipeDiameter.replace(/\s+/g, '').replace(/"/g, '').replace(/\//g, '-');
  const thicknessClean = insulationThickness.replace(/\s+/g, '').replace(/"/g, '').replace(/\//g, '-');
  const typePrefix = pipeType === 'copper' ? 'C' : 'I';
  return `ML-${typePrefix}-${pipeClean}-${thicknessClean}`.toUpperCase();
}

/**
 * Generate variant name
 */
function generateVariantName(pipeType, pipeDiameter, insulationThickness) {
  const typeLabel = pipeType === 'copper' ? 'Copper' : 'Iron';
  return `${pipeDiameter}" ${typeLabel} Pipe - ${insulationThickness} Insulation`;
}

/**
 * Main processing function
 */
async function processPricingSheet() {
  try {
    console.log('🔗 Connecting to database...');
    const mongoUri = process.env.MONGODB_DEV_URI || process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_DEV_URI or MONGODB_URI must be set in .env.local');
    }
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to database');
    
    // Step 1: Create or update supplier
    console.log(`\n🏢 Creating/updating supplier: Crossroads C&I`);
    const supplier = await Company.findOneAndUpdate(
      { 
        name: 'Crossroads C&I',
        companyType: 'supplier'
      },
      {
        name: 'Crossroads C&I',
        companyType: 'supplier',
        supplierInfo: {
          catalogUrl: '',
          orderEmail: '',
          orderPhone: '',
          minimumOrder: 0,
          leadTimeDays: null
        },
        isActive: true,
        notes: 'Distributor for Micro-Lok ASJ Fibreglass Pipe Insulation'
      },
      { upsert: true, new: true }
    );
    console.log(`✅ Supplier created/updated: ${supplier._id}`);
    
    // Step 2: Ensure Pipe Insulation ProductType exists
    console.log(`\n📦 Ensuring Pipe Insulation ProductType exists...`);
    const pipeInsulationType = await ProductType.findOneAndUpdate(
      { slug: 'pipe-insulation' },
      {
        name: 'Pipe Insulation',
        slug: 'pipe-insulation',
        description: 'Fiberglass pipe insulation with various sizes, thicknesses, and pipe types',
        properties: [
          {
            key: 'pipe_type',
            label: 'Pipe Type',
            type: 'enum',
            required: true,
            options: [
              { value: 'copper', label: 'Copper' },
              { value: 'iron', label: 'Iron' }
            ],
            variantKey: true,
            display: { order: 1, group: 'Pipe Specifications' }
          },
          {
            key: 'pipe_diameter',
            label: 'Pipe Diameter',
            type: 'string',
            required: true,
            variantKey: true,
            display: { order: 2, group: 'Pipe Specifications' }
          },
          {
            key: 'insulation_thickness',
            label: 'Insulation Thickness',
            type: 'string',
            required: true,
            variantKey: true,
            display: { order: 3, group: 'Insulation Specifications' }
          },
          {
            key: 'facing',
            label: 'Facing Type',
            type: 'enum',
            required: false,
            options: [
              { value: 'asj', label: 'ASJ (All Service Jacket)' },
              { value: 'pvc', label: 'PVC' },
              { value: 'foil', label: 'Foil' },
              { value: 'none', label: 'None (Unfaced)' }
            ],
            defaultValue: 'asj',
            display: { order: 4, group: 'Insulation Specifications' }
          },
          {
            key: 'temperature_rating_min',
            label: 'Min Temperature (°F)',
            type: 'number',
            required: false,
            defaultValue: 0,
            display: { order: 5, group: 'Specifications' }
          },
          {
            key: 'temperature_rating_max',
            label: 'Max Temperature (°F)',
            type: 'number',
            required: false,
            defaultValue: 850,
            display: { order: 6, group: 'Specifications' }
          }
        ],
        variantSettings: {
          enabled: true,
          variantProperties: ['pipe_type', 'pipe_diameter', 'insulation_thickness'],
          namingTemplate: '{name} - {pipe_diameter}" {pipe_type} x {insulation_thickness}'
        },
        isActive: true
      },
      { upsert: true, new: true }
    );
    console.log(`✅ ProductType ready: ${pipeInsulationType._id}`);
    
    // Step 3: Parse pricing data and create variants
    console.log(`\n📋 Parsing pricing data and creating variants...`);
    const variants = [];
    let variantCount = 0;
    let skippedCount = 0;
    
    // Parse each row of pricing data
    for (const row of PRICING_DATA) {
      const copperDiameter = parsePipeDiameter(row[0]);
      const ironDiameter = parsePipeDiameter(row[1]);
      
      // Process each insulation thickness column (columns 2-9)
      for (let i = 0; i < INSULATION_THICKNESSES.length; i++) {
        const insulationThickness = INSULATION_THICKNESSES[i];
        const priceColumnIndex = i + 2; // Skip copper and iron diameter columns
        
        // Process Copper pipe variants
        if (copperDiameter) {
          const price = parsePrice(row[priceColumnIndex]);
          if (price !== null) {
            const variant = {
              sku: generateSKU('copper', copperDiameter, insulationThickness),
              name: generateVariantName('copper', copperDiameter, insulationThickness),
              properties: new Map([
                ['pipe_type', 'copper'],
                ['pipe_diameter', copperDiameter],
                ['insulation_thickness', insulationThickness],
                ['facing', 'asj'],
                ['temperature_rating_min', 0],
                ['temperature_rating_max', 850]
              ]),
              pricing: {
                listPrice: price, // List price from supplier
                lastPrice: price, // Legacy field - keep for backward compatibility
                netPrice: null, // Will be calculated when discount is applied
                discountPercent: null // Will be set when discount is applied
              },
              suppliers: [{
                supplierId: supplier._id,
                supplierPartNumber: generateSKU('copper', copperDiameter, insulationThickness),
                listPrice: price, // List price from supplier
                lastPrice: price, // Legacy field - keep for backward compatibility
                netPrice: null, // Will be calculated when discount is applied
                discountPercent: null, // Will be set when discount is applied
                isPreferred: true
              }],
              isActive: true
            };
            variants.push(variant);
            variantCount++;
          } else {
            skippedCount++;
          }
        }
        
        // Process Iron pipe variants
        if (ironDiameter) {
          const price = parsePrice(row[priceColumnIndex]);
          if (price !== null) {
            const variant = {
              sku: generateSKU('iron', ironDiameter, insulationThickness),
              name: generateVariantName('iron', ironDiameter, insulationThickness),
              properties: new Map([
                ['pipe_type', 'iron'],
                ['pipe_diameter', ironDiameter],
                ['insulation_thickness', insulationThickness],
                ['facing', 'asj'],
                ['temperature_rating_min', 0],
                ['temperature_rating_max', 850]
              ]),
              pricing: {
                listPrice: price, // List price from supplier
                lastPrice: price, // Legacy field - keep for backward compatibility
                netPrice: null, // Will be calculated when discount is applied
                discountPercent: null // Will be set when discount is applied
              },
              suppliers: [{
                supplierId: supplier._id,
                supplierPartNumber: generateSKU('iron', ironDiameter, insulationThickness),
                listPrice: price, // List price from supplier
                lastPrice: price, // Legacy field - keep for backward compatibility
                netPrice: null, // Will be calculated when discount is applied
                discountPercent: null, // Will be set when discount is applied
                isPreferred: true
              }],
              isActive: true
            };
            variants.push(variant);
            variantCount++;
          } else {
            skippedCount++;
          }
        }
      }
    }
    
    console.log(`✅ Parsed ${variantCount} variants (skipped ${skippedCount} invalid entries)`);
    
    // Step 4: Find matching discount for this product
    const discount = await Discount.findOne({
      categoryGroup: 'CAEG171',
      pricebookPageNumber: '1.1'
    }).lean();
    
    // Step 5: Create or update product
    console.log(`\n📦 Creating/updating product: Micro-Lok ASJ Fibreglass Pipe Insulation`);
    const product = await Product.findOneAndUpdate(
      { 
        name: 'Micro-Lok ASJ Fibreglass Pipe Insulation',
        'suppliers.supplierId': supplier._id
      },
      {
        name: 'Micro-Lok ASJ Fibreglass Pipe Insulation',
        description: 'Micro-Lok Fibreglass pipe insulation is made from glass fibers bonded with a thermosetting resin and is produced in 36" lengths. Jacketed with a reinforced vapour retarder facing and a factory applied, longitudinal acrylic adhesive closure system, designed for application temperatures from -18C to 454C (0F to 850F).',
        productTypeId: pipeInsulationType._id,
        unitOfMeasure: 'FT', // Lineal feet
        category: 'Insulation',
        // Pricebook metadata
        pricebookSection: 'FIBREGLASS',
        pricebookPageNumber: '1.1',
        pricebookPageName: 'FIBREGLASS PIPE WITH ASJ',
        pricebookGroupCode: 'CAEG171',
        suppliers: [{
          supplierId: supplier._id,
          isPreferred: true
        }],
        properties: new Map([
          ['effective_date', '2025-01-06'],
          ['replaces_date', '2024-01-08'],
          ['facing', 'ASJ'],
          ['length', '36"'],
          ['temperature_range_min_f', 0],
          ['temperature_range_max_f', 850],
          ['temperature_range_min_c', -18],
          ['temperature_range_max_c', 454],
          ['categoryGroup', 'CAEG171'] // For discount matching
        ]),
        variants: variants,
        // Product-level discount (from pricebook discount)
        productDiscount: discount ? {
          discountPercent: discount.discountPercent,
          effectiveDate: discount.effectiveDate || new Date(),
          notes: `From pricebook discount: ${discount.name}`
        } : undefined,
        isActive: true,
        notes: 'Pricing effective January 6, 2025. Replaces pricing from January 8, 2024. List prices - discount pricing to be applied.'
      },
      { upsert: true, new: true }
    );
    
    // Apply discount to variants if discount found
    if (discount && product.variants && product.variants.length > 0) {
      let updatedVariants = 0;
      product.variants.forEach(variant => {
        if (variant.pricing?.listPrice) {
          variant.pricing.discountPercent = discount.discountPercent;
          variant.pricing.netPrice = variant.pricing.listPrice * (1 - discount.discountPercent / 100);
          updatedVariants++;
        }
        
        // Update variant suppliers
        if (variant.suppliers && variant.suppliers.length > 0) {
          variant.suppliers.forEach(supplier => {
            if (supplier.listPrice) {
              supplier.discountPercent = discount.discountPercent;
              supplier.netPrice = supplier.listPrice * (1 - discount.discountPercent / 100);
            }
          });
        }
      });
      
      if (updatedVariants > 0) {
        await product.save();
        console.log(`   ✅ Applied ${discount.discountPercent}% discount to ${updatedVariants} variants`);
      }
    }
    
    console.log(`✅ Product created/updated: ${product._id}`);
    console.log(`   - Total Variants: ${product.variants.length}`);
    console.log(`   - Unit of Measure: ${product.unitOfMeasure}`);
    console.log(`   - Category: ${product.category}`);
    
    // Summary
    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Supplier: ${supplier.name} (${supplier._id})`);
    console.log(`   ✅ Product: ${product.name} (${product._id})`);
    console.log(`   ✅ Variants Created: ${product.variants.length}`);
    console.log(`   ✅ ProductType: ${pipeInsulationType.name} (${pipeInsulationType._id})`);
    
    // Show sample variants
    console.log(`\n📋 Sample Variants (first 5):`);
    product.variants.slice(0, 5).forEach((variant, index) => {
      console.log(`   ${index + 1}. ${variant.name} - SKU: ${variant.sku} - List Price: $${variant.pricing.lastPrice}/FT`);
    });
    
    console.log(`\n💡 Next Steps:`);
    console.log(`   1. Review the product and variants in the system`);
    console.log(`   2. Apply discount pricing as needed`);
    console.log(`   3. Use this script as a template for processing additional pricing sheets`);
    
  } catch (error) {
    console.error('❌ Error processing pricing sheet:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from database');
  }
}

// Main execution
if (require.main === module) {
  processPricingSheet()
    .then(() => {
      console.log('\n✅ Pricing sheet ingestion completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Pricing sheet ingestion failed:', error);
      process.exit(1);
    });
}

module.exports = { processPricingSheet };

