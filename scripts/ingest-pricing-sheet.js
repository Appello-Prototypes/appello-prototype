/**
 * Ingest Pricing Sheet Script
 * 
 * Processes Google Sheets pricing data and creates:
 * - Supplier (if doesn't exist)
 * - Product with variants for each pipe size/thickness combination
 * - Stores list prices in variant suppliers
 * 
 * Usage:
 *   node scripts/ingest-pricing-sheet.js [spreadsheet-id] [sheet-name]
 * 
 * Example:
 *   node scripts/ingest-pricing-sheet.js 1jPiqGYX50h4xoppioH2dEb4Fo-NZL4Pch1l9AA5kgo8 "Sheet1"
 */

require('dotenv').config({ path: '.env.local', override: true });
const mongoose = require('mongoose');

// Import models
const Company = require('../src/server/models/Company');
const Product = require('../src/server/models/Product');
const ProductType = require('../src/server/models/ProductType');

// Configuration
const CONFIG = {
  // Supplier information (from sheet header)
  supplierName: 'Crossroads C&I', // Or 'Micro-Lok' - adjust based on sheet
  supplierInfo: {
    catalogUrl: '',
    orderEmail: '',
    orderPhone: '',
    minimumOrder: 0,
    leadTimeDays: null
  },
  
  // Product information (from sheet)
  productName: 'Micro-Lok ASJ Fibreglass Pipe Insulation',
  productDescription: 'Micro-Lok Fibreglass pipe insulation is made from glass fibers bonded with a thermosetting resin and is produced in 36" lengths. Jacketed with a reinforced vapour retarder facing and a factory applied, longitudinal acrylic adhesive closure system, designed for application temperatures from -18C to 454C (0F to 850F).',
  
  // Pricing sheet metadata
  effectiveDate: '2025-01-06',
  replacesDate: '2024-01-08',
  
  // Unit of measure
  unitOfMeasure: 'FT', // Lineal feet
  
  // Product category
  category: 'Insulation',
  
  // Insulation thicknesses (column headers)
  insulationThicknesses: ['1/2"', '1"', '1 1/2"', '2"', '2 1/2"', '3"', '3 1/2"', '4"']
};

/**
 * Parse pipe diameter from string
 * Handles formats like "5/8", "1 1/8", "2 1/2", etc.
 */
function parsePipeDiameter(str) {
  if (!str || str.trim() === '' || str === '-') return null;
  return str.trim();
}

/**
 * Parse price from string
 * Handles formats like "3.69", "-", empty strings
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
  const pipeClean = pipeDiameter.replace(/\s+/g, '').replace(/"/g, '');
  const thicknessClean = insulationThickness.replace(/\s+/g, '').replace(/"/g, '');
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
 * Normalize pipe diameter for properties
 */
function normalizePipeDiameter(diameter) {
  return diameter.replace(/\s+/g, '_').replace(/"/g, '');
}

/**
 * Normalize insulation thickness for properties
 */
function normalizeInsulationThickness(thickness) {
  return thickness.replace(/\s+/g, '_').replace(/"/g, '');
}

/**
 * Process pricing sheet data
 */
async function processPricingSheet(spreadsheetId, sheetName = 'Sheet1') {
  try {
    console.log('🔗 Connecting to database...');
    const mongoUri = process.env.MONGODB_DEV_URI || process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_DEV_URI or MONGODB_URI must be set in .env.local');
    }
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to database');
    
    // Get pricing data from Google Sheets
    console.log(`\n📊 Fetching pricing data from Google Sheets...`);
    console.log(`   Spreadsheet ID: ${spreadsheetId}`);
    console.log(`   Sheet Name: ${sheetName}`);
    
    // For now, we'll use the data structure we already fetched
    // In production, you'd fetch this via Google Sheets API
    // This is a placeholder - you'll need to implement Google Sheets API integration
    const pricingData = await fetchPricingDataFromGoogleSheets(spreadsheetId, sheetName);
    
    if (!pricingData || pricingData.length === 0) {
      throw new Error('No pricing data found in sheet');
    }
    
    console.log(`✅ Fetched ${pricingData.length} rows of pricing data`);
    
    // Step 1: Create or update supplier
    console.log(`\n🏢 Creating/updating supplier: ${CONFIG.supplierName}`);
    const supplier = await Company.findOneAndUpdate(
      { 
        name: CONFIG.supplierName,
        companyType: 'supplier'
      },
      {
        name: CONFIG.supplierName,
        companyType: 'supplier',
        supplierInfo: CONFIG.supplierInfo,
        isActive: true
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
    
    // Parse the sheet data structure
    // Assuming data structure: [copperDiameter, ironDiameter, price1/2", price1", price1.5", price2", price2.5", price3", price3.5", price4"]
    for (const row of pricingData) {
      const copperDiameter = parsePipeDiameter(row[0]);
      const ironDiameter = parsePipeDiameter(row[1]);
      
      // Process each insulation thickness column
      for (let i = 0; i < CONFIG.insulationThicknesses.length; i++) {
        const insulationThickness = CONFIG.insulationThicknesses[i];
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
                lastPrice: price // List price
              },
              suppliers: [{
                supplierId: supplier._id,
                supplierPartNumber: generateSKU('copper', copperDiameter, insulationThickness),
                lastPrice: price, // List price
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
                lastPrice: price // List price
              },
              suppliers: [{
                supplierId: supplier._id,
                supplierPartNumber: generateSKU('iron', ironDiameter, insulationThickness),
                lastPrice: price, // List price
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
    
    // Step 4: Create or update product
    console.log(`\n📦 Creating/updating product: ${CONFIG.productName}`);
    const product = await Product.findOneAndUpdate(
      { 
        name: CONFIG.productName,
        'suppliers.supplierId': supplier._id
      },
      {
        name: CONFIG.productName,
        description: CONFIG.productDescription,
        productTypeId: pipeInsulationType._id,
        unitOfMeasure: CONFIG.unitOfMeasure,
        category: CONFIG.category,
        suppliers: [{
          supplierId: supplier._id,
          isPreferred: true
        }],
        properties: new Map([
          ['effective_date', CONFIG.effectiveDate],
          ['replaces_date', CONFIG.replacesDate],
          ['facing', 'ASJ'],
          ['length', '36"'],
          ['temperature_range_min_f', 0],
          ['temperature_range_max_f', 850],
          ['temperature_range_min_c', -18],
          ['temperature_range_max_c', 454]
        ]),
        variants: variants,
        isActive: true,
        notes: `Pricing effective ${CONFIG.effectiveDate}. Replaces pricing from ${CONFIG.replacesDate}. List prices - discount pricing to be applied.`
      },
      { upsert: true, new: true }
    );
    
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
    
    console.log(`\n💡 Next Steps:`);
    console.log(`   1. Review the product and variants in the system`);
    console.log(`   2. Apply discount pricing as needed`);
    console.log(`   3. Use this script to process additional pricing sheets`);
    
  } catch (error) {
    console.error('❌ Error processing pricing sheet:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from database');
  }
}

/**
 * Fetch pricing data from Google Sheets
 * TODO: Implement Google Sheets API integration
 * For now, returns the parsed data structure we already have
 */
async function fetchPricingDataFromGoogleSheets(spreadsheetId, sheetName) {
  // This is a placeholder - you'll need to implement Google Sheets API integration
  // For now, we'll use the data structure we already fetched via Firecrawl
  
  // The actual data structure from the sheet:
  // Row format: [copperDiameter, ironDiameter, price1/2", price1", price1.5", price2", price2.5", price3", price3.5", price4"]
  
  // Example data structure (you'll replace this with actual Google Sheets API call):
  const sampleData = [
    ['5/8', '', '3.69', '4.47', '8.43', '13.11', '', '', '', ''],
    ['7/8', '1/2', '3.69', '4.47', '8.43', '13.11', '', '', '', ''],
    ['1 1/8', '3/4', '4.18', '4.89', '8.46', '13.53', '', '', '', ''],
    ['1 3/8', '1', '4.32', '5.22', '9.09', '14.41', '16.94', '22.92', '', ''],
    // ... more rows
  ];
  
  // TODO: Replace with actual Google Sheets API integration
  // Using @google-cloud/sheets or googleapis package
  // Example:
  // const { GoogleSpreadsheet } = require('google-spreadsheet');
  // const doc = new GoogleSpreadsheet(spreadsheetId);
  // await doc.useServiceAccountAuth(credentials);
  // await doc.loadInfo();
  // const sheet = doc.sheetsByTitle[sheetName];
  // const rows = await sheet.getRows();
  // return rows.map(row => row._rawData);
  
  throw new Error('Google Sheets API integration not yet implemented. Please implement fetchPricingDataFromGoogleSheets() function.');
}

// Main execution
if (require.main === module) {
  const spreadsheetId = process.argv[2];
  const sheetName = process.argv[3] || 'Sheet1';
  
  if (!spreadsheetId) {
    console.error('❌ Error: Spreadsheet ID is required');
    console.error('Usage: node scripts/ingest-pricing-sheet.js <spreadsheet-id> [sheet-name]');
    process.exit(1);
  }
  
  processPricingSheet(spreadsheetId, sheetName)
    .then(() => {
      console.log('\n✅ Pricing sheet ingestion completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Pricing sheet ingestion failed:', error);
      process.exit(1);
    });
}

module.exports = { processPricingSheet, fetchPricingDataFromGoogleSheets };

