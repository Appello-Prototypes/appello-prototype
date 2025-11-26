/**
 * Complex Product Data Seed Script
 * 
 * This script creates a comprehensive set of test data to validate:
 * 1. Multi-distributor product architecture
 * 2. Price sheet relationships (distributor-specific pricing)
 * 3. Cross-distributor price comparisons
 * 4. Manufacturer-distributor relationships
 * 
 * Scenario:
 * - 3 Manufacturers: Armacell, K-Flex USA, Johns Manville
 * - 3 Distributors: IMPRO, Crossroads C&I, Industrial Supply Co
 * - Products from same manufacturer sold by multiple distributors at different prices
 * - Variants with distributor-specific pricing
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const Company = require('../src/server/models/Company');
const Product = require('../src/server/models/Product');
const ProductType = require('../src/server/models/ProductType');

// Color helpers
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
};

const log = (message, color = 'reset') => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

async function connectDB() {
  const mongoUri = process.env.MONGODB_DEV_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MongoDB URI not found in environment variables');
  }
  
  await mongoose.connect(mongoUri);
  log('✅ Connected to MongoDB', 'green');
}

async function clearExistingData() {
  log('\n🗑️  Clearing existing test data...', 'yellow');
  
  // Clear products with test manufacturer/distributor names
  await Product.deleteMany({
    $or: [
      { name: { $regex: /^(Test|Seed|Armacell|K-Flex|Johns Manville|IMPRO|Crossroads|Industrial Supply)/i } }
    ]
  });
  
  // Clear companies with test names
  await Company.deleteMany({
    name: { 
      $in: [
        'Armacell (Test)',
        'K-Flex USA (Test)',
        'Johns Manville (Test)',
        'IMPRO (Test)',
        'Crossroads C&I (Test)',
        'Industrial Supply Co (Test)'
      ]
    }
  });
  
  log('✅ Cleared existing test data', 'green');
}

async function createCompanies() {
  log('\n🏢 Creating Companies...', 'blue');
  
  const manufacturers = [
    {
      name: 'Armacell (Test)',
      companyType: 'supplier',
      address: {
        city: 'Mebane',
        province: 'NC',
        country: 'USA'
      },
      contact: {
        email: 'info@armacell.com',
        phone: '1-800-ARMACELL'
      }
    },
    {
      name: 'K-Flex USA (Test)',
      companyType: 'supplier',
      address: {
        city: 'Lincolnton',
        province: 'NC',
        country: 'USA'
      },
      contact: {
        email: 'info@kflex.com',
        phone: '1-800-KFLEX-USA'
      }
    },
    {
      name: 'Johns Manville (Test)',
      companyType: 'supplier',
      address: {
        city: 'Denver',
        province: 'CO',
        country: 'USA'
      },
      contact: {
        email: 'info@jm.com',
        phone: '1-800-JM-INSUL'
      }
    }
  ];
  
  const distributors = [
    {
      name: 'IMPRO (Test)',
      companyType: 'distributor',
      address: {
        city: 'Toronto',
        province: 'ON',
        country: 'Canada'
      },
      contact: {
        email: 'sales@impro.com',
        phone: '1-800-IMPRO'
      }
    },
    {
      name: 'Crossroads C&I (Test)',
      companyType: 'distributor',
      address: {
        city: 'Calgary',
        province: 'AB',
        country: 'Canada'
      },
      contact: {
        email: 'sales@crossroads.com',
        phone: '1-800-CROSSROADS'
      }
    },
    {
      name: 'Industrial Supply Co (Test)',
      companyType: 'distributor',
      address: {
        city: 'Vancouver',
        province: 'BC',
        country: 'Canada'
      },
      contact: {
        email: 'sales@industrialsupply.com',
        phone: '1-800-INDUSTRIAL'
      }
    }
  ];
  
  const createdManufacturers = await Company.insertMany(manufacturers);
  const createdDistributors = await Company.insertMany(distributors);
  
  log(`✅ Created ${createdManufacturers.length} manufacturers`, 'green');
  log(`✅ Created ${createdDistributors.length} distributors`, 'green');
  
  // Create distributor-supplier relationships
  // IMPRO carries all manufacturers
  await Company.findByIdAndUpdate(createdDistributors[0]._id, {
    $addToSet: { distributorSuppliers: { $each: createdManufacturers.map(m => m._id) } }
  });
  
  // Crossroads carries Armacell and K-Flex
  await Company.findByIdAndUpdate(createdDistributors[1]._id, {
    $addToSet: { distributorSuppliers: { $each: [createdManufacturers[0]._id, createdManufacturers[1]._id] } }
  });
  
  // Industrial Supply carries K-Flex and Johns Manville
  await Company.findByIdAndUpdate(createdDistributors[2]._id, {
    $addToSet: { distributorSuppliers: { $each: [createdManufacturers[1]._id, createdManufacturers[2]._id] } }
  });
  
  log('✅ Created distributor-supplier relationships', 'green');
  
  return {
    manufacturers: createdManufacturers,
    distributors: createdDistributors
  };
}

async function getOrCreateProductType(name, slug) {
  let productType = await ProductType.findOne({ slug });
  if (!productType) {
    productType = await ProductType.create({
      name,
      slug,
      description: `Test product type: ${name}`,
      isActive: true
    });
  }
  return productType;
}

async function createProducts(companies) {
  log('\n📦 Creating Products...', 'blue');
  
  const { manufacturers, distributors } = companies;
  const [armacell, kflex, jm] = manufacturers;
  const [impro, crossroads, industrial] = distributors;
  
  // Get or create product types
  const pipeInsulationType = await getOrCreateProductType('Pipe Insulation', 'pipe-insulation');
  const ductLinerType = await getOrCreateProductType('Duct Liner', 'duct-liner');
  const boardType = await getOrCreateProductType('Insulation Board', 'insulation-board');
  
  const products = [];
  
  // ==========================================
  // PRODUCT 1: Elastomeric Pipe Insulation
  // ==========================================
  // Made by: Armacell
  // Sold by: IMPRO, Crossroads (different prices)
  // This demonstrates same product, same manufacturer, different distributor prices
  
  const elastomericProduct = await Product.create({
    name: 'Elastomeric Pipe Insulation - Armaflex',
    description: 'Flexible elastomeric pipe insulation for HVAC applications',
    productTypeId: pipeInsulationType._id,
    manufacturerId: armacell._id,
    distributorId: impro._id, // Primary distributor
    unitOfMeasure: 'FT',
    isActive: true,
    suppliers: [
      {
        distributorId: impro._id,
        manufacturerId: armacell._id,
        supplierPartNumber: 'ARMA-ELAST-001',
        listPrice: 2.50,
        netPrice: 2.00,
        discountPercent: 20,
        isPreferred: true
      },
      {
        distributorId: crossroads._id,
        manufacturerId: armacell._id,
        supplierPartNumber: 'ARMA-ELAST-001',
        listPrice: 2.75, // Higher list price
        netPrice: 2.10,  // But better net price after discount
        discountPercent: 23.6,
        isPreferred: false
      }
    ],
    variants: [
      {
        name: '1/2" x 3/8" Wall',
        sku: 'ARMA-ELAST-001-12-38',
        properties: new Map([
          ['interiorDiameter', 0.5],
          ['wallThickness', 0.375]
        ]),
        propertiesNormalized: new Map([
          ['interiorDiameter', 0.5],
          ['wallThickness', 0.375]
        ]),
        propertyUnits: new Map([
          ['interiorDiameter', 'inches'],
          ['wallThickness', 'inches']
        ]),
        packageQuantity: 126,
        packageUnit: 'FT',
        suppliers: [
          {
            distributorId: impro._id,
            manufacturerId: armacell._id,
            supplierPartNumber: 'ARMA-ELAST-001-12-38',
            listPrice: 2.50,
            netPrice: 2.00,
            discountPercent: 20,
            isPreferred: true
          },
          {
            distributorId: crossroads._id,
            manufacturerId: armacell._id,
            supplierPartNumber: 'ARMA-ELAST-001-12-38',
            listPrice: 2.75,
            netPrice: 2.10,
            discountPercent: 23.6,
            isPreferred: false
          }
        ],
        isActive: true
      },
      {
        name: '3/4" x 3/8" Wall',
        sku: 'ARMA-ELAST-001-34-38',
        properties: new Map([
          ['interiorDiameter', 0.75],
          ['wallThickness', 0.375]
        ]),
        propertiesNormalized: new Map([
          ['interiorDiameter', 0.75],
          ['wallThickness', 0.375]
        ]),
        propertyUnits: new Map([
          ['interiorDiameter', 'inches'],
          ['wallThickness', 'inches']
        ]),
        packageQuantity: 126,
        packageUnit: 'FT',
        suppliers: [
          {
            distributorId: impro._id,
            manufacturerId: armacell._id,
            supplierPartNumber: 'ARMA-ELAST-001-34-38',
            listPrice: 2.75,
            netPrice: 2.20,
            discountPercent: 20,
            isPreferred: true
          },
          {
            distributorId: crossroads._id,
            manufacturerId: armacell._id,
            supplierPartNumber: 'ARMA-ELAST-001-34-38',
            listPrice: 3.00,
            netPrice: 2.30,
            discountPercent: 23.3,
            isPreferred: false
          }
        ],
        isActive: true
      },
      {
        name: '1" x 1/2" Wall',
        sku: 'ARMA-ELAST-001-1-12',
        properties: new Map([
          ['interiorDiameter', 1.0],
          ['wallThickness', 0.5]
        ]),
        propertiesNormalized: new Map([
          ['interiorDiameter', 1.0],
          ['wallThickness', 0.5]
        ]),
        propertyUnits: new Map([
          ['interiorDiameter', 'inches'],
          ['wallThickness', 'inches']
        ]),
        packageQuantity: 84,
        packageUnit: 'FT',
        suppliers: [
          {
            distributorId: impro._id,
            manufacturerId: armacell._id,
            supplierPartNumber: 'ARMA-ELAST-001-1-12',
            listPrice: 3.25,
            netPrice: 2.60,
            discountPercent: 20,
            isPreferred: true
          },
          {
            distributorId: crossroads._id,
            manufacturerId: armacell._id,
            supplierPartNumber: 'ARMA-ELAST-001-1-12',
            listPrice: 3.50,
            netPrice: 2.70,
            discountPercent: 22.9,
            isPreferred: false
          }
        ],
        isActive: true
      }
    ]
  });
  
  products.push(elastomericProduct);
  log(`✅ Created: ${elastomericProduct.name} (${elastomericProduct.variants.length} variants, 2 distributors)`, 'green');
  
  // ==========================================
  // PRODUCT 2: K-Flex Pipe Insulation
  // ==========================================
  // Made by: K-Flex USA
  // Sold by: IMPRO, Crossroads, Industrial Supply (3 distributors!)
  // This demonstrates same product sold by 3 distributors with different pricing
  
  const kflexProduct = await Product.create({
    name: 'K-Flex Pipe Insulation - ST',
    description: 'Flexible elastomeric pipe insulation, closed cell',
    productTypeId: pipeInsulationType._id,
    manufacturerId: kflex._id,
    distributorId: impro._id, // Primary distributor
    unitOfMeasure: 'FT',
    isActive: true,
    suppliers: [
      {
        distributorId: impro._id,
        manufacturerId: kflex._id,
        supplierPartNumber: 'KFLEX-ST-001',
        listPrice: 2.30,
        netPrice: 1.84,
        discountPercent: 20,
        isPreferred: true
      },
      {
        distributorId: crossroads._id,
        manufacturerId: kflex._id,
        supplierPartNumber: 'KFLEX-ST-001',
        listPrice: 2.40,
        netPrice: 1.90,
        discountPercent: 20.8,
        isPreferred: false
      },
      {
        distributorId: industrial._id,
        manufacturerId: kflex._id,
        supplierPartNumber: 'KFLEX-ST-001',
        listPrice: 2.25, // Best list price
        netPrice: 1.80,  // Best net price
        discountPercent: 20,
        isPreferred: false
      }
    ],
    variants: [
      {
        name: '1/2" x 3/8" Wall',
        sku: 'KFLEX-ST-001-12-38',
        properties: new Map([
          ['interiorDiameter', 0.5],
          ['wallThickness', 0.375]
        ]),
        propertiesNormalized: new Map([
          ['interiorDiameter', 0.5],
          ['wallThickness', 0.375]
        ]),
        propertyUnits: new Map([
          ['interiorDiameter', 'inches'],
          ['wallThickness', 'inches']
        ]),
        packageQuantity: 126,
        packageUnit: 'FT',
        suppliers: [
          {
            distributorId: impro._id,
            manufacturerId: kflex._id,
            supplierPartNumber: 'KFLEX-ST-001-12-38',
            listPrice: 2.30,
            netPrice: 1.84,
            discountPercent: 20,
            isPreferred: true
          },
          {
            distributorId: crossroads._id,
            manufacturerId: kflex._id,
            supplierPartNumber: 'KFLEX-ST-001-12-38',
            listPrice: 2.40,
            netPrice: 1.90,
            discountPercent: 20.8,
            isPreferred: false
          },
          {
            distributorId: industrial._id,
            manufacturerId: kflex._id,
            supplierPartNumber: 'KFLEX-ST-001-12-38',
            listPrice: 2.25,
            netPrice: 1.80,
            discountPercent: 20,
            isPreferred: false
          }
        ],
        isActive: true
      },
      {
        name: '3/4" x 1/2" Wall',
        sku: 'KFLEX-ST-001-34-12',
        properties: new Map([
          ['interiorDiameter', 0.75],
          ['wallThickness', 0.5]
        ]),
        propertiesNormalized: new Map([
          ['interiorDiameter', 0.75],
          ['wallThickness', 0.5]
        ]),
        propertyUnits: new Map([
          ['interiorDiameter', 'inches'],
          ['wallThickness', 'inches']
        ]),
        packageQuantity: 84,
        packageUnit: 'FT',
        suppliers: [
          {
            distributorId: impro._id,
            manufacturerId: kflex._id,
            supplierPartNumber: 'KFLEX-ST-001-34-12',
            listPrice: 2.80,
            netPrice: 2.24,
            discountPercent: 20,
            isPreferred: true
          },
          {
            distributorId: crossroads._id,
            manufacturerId: kflex._id,
            supplierPartNumber: 'KFLEX-ST-001-34-12',
            listPrice: 2.90,
            netPrice: 2.30,
            discountPercent: 20.7,
            isPreferred: false
          },
          {
            distributorId: industrial._id,
            manufacturerId: kflex._id,
            supplierPartNumber: 'KFLEX-ST-001-34-12',
            listPrice: 2.70,
            netPrice: 2.16,
            discountPercent: 20,
            isPreferred: false
          }
        ],
        isActive: true
      }
    ]
  });
  
  products.push(kflexProduct);
  log(`✅ Created: ${kflexProduct.name} (${kflexProduct.variants.length} variants, 3 distributors)`, 'green');
  
  // ==========================================
  // PRODUCT 3: Johns Manville Duct Liner
  // ==========================================
  // Made by: Johns Manville
  // Sold by: IMPRO, Industrial Supply
  // Different pricing strategies
  
  const ductLinerProduct = await Product.create({
    name: 'Johns Manville Duct Liner - Microlite',
    description: 'Fiberglass duct liner for HVAC ductwork',
    productTypeId: ductLinerType._id,
    manufacturerId: jm._id,
    distributorId: impro._id,
    unitOfMeasure: 'SQ_FT',
    isActive: true,
    suppliers: [
      {
        distributorId: impro._id,
        manufacturerId: jm._id,
        supplierPartNumber: 'JM-DUCT-MICRO-001',
        listPrice: 1.85,
        netPrice: 1.48,
        discountPercent: 20,
        isPreferred: true
      },
      {
        distributorId: industrial._id,
        manufacturerId: jm._id,
        supplierPartNumber: 'JM-DUCT-MICRO-001',
        listPrice: 1.90,
        netPrice: 1.50,
        discountPercent: 21.1,
        isPreferred: false
      }
    ],
    variants: [
      {
        name: '1" Thickness',
        sku: 'JM-DUCT-MICRO-001-1',
        properties: new Map([
          ['thickness', 1.0]
        ]),
        propertiesNormalized: new Map([
          ['thickness', 1.0]
        ]),
        propertyUnits: new Map([
          ['thickness', 'inches']
        ]),
        packageQuantity: 100,
        packageUnit: 'SQ_FT',
        suppliers: [
          {
            distributorId: impro._id,
            manufacturerId: jm._id,
            supplierPartNumber: 'JM-DUCT-MICRO-001-1',
            listPrice: 1.85,
            netPrice: 1.48,
            discountPercent: 20,
            isPreferred: true
          },
          {
            distributorId: industrial._id,
            manufacturerId: jm._id,
            supplierPartNumber: 'JM-DUCT-MICRO-001-1',
            listPrice: 1.90,
            netPrice: 1.50,
            discountPercent: 21.1,
            isPreferred: false
          }
        ],
        isActive: true
      },
      {
        name: '2" Thickness',
        sku: 'JM-DUCT-MICRO-001-2',
        properties: new Map([
          ['thickness', 2.0]
        ]),
        propertiesNormalized: new Map([
          ['thickness', 2.0]
        ]),
        propertyUnits: new Map([
          ['thickness', 'inches']
        ]),
        packageQuantity: 50,
        packageUnit: 'SQ_FT',
        suppliers: [
          {
            distributorId: impro._id,
            manufacturerId: jm._id,
            supplierPartNumber: 'JM-DUCT-MICRO-001-2',
            listPrice: 3.20,
            netPrice: 2.56,
            discountPercent: 20,
            isPreferred: true
          },
          {
            distributorId: industrial._id,
            manufacturerId: jm._id,
            supplierPartNumber: 'JM-DUCT-MICRO-001-2',
            listPrice: 3.30,
            netPrice: 2.60,
            discountPercent: 21.2,
            isPreferred: false
          }
        ],
        isActive: true
      }
    ]
  });
  
  products.push(ductLinerProduct);
  log(`✅ Created: ${ductLinerProduct.name} (${ductLinerProduct.variants.length} variants, 2 distributors)`, 'green');
  
  // ==========================================
  // PRODUCT 4: Single Distributor Product
  // ==========================================
  // Made by: Armacell
  // Sold by: IMPRO only
  // This shows a product exclusive to one distributor
  
  const exclusiveProduct = await Product.create({
    name: 'Armacell Armaflex Board - Black',
    description: 'Rigid elastomeric insulation board',
    productTypeId: boardType._id,
    manufacturerId: armacell._id,
    distributorId: impro._id,
    unitOfMeasure: 'SQ_FT',
    isActive: true,
    suppliers: [
      {
        distributorId: impro._id,
        manufacturerId: armacell._id,
        supplierPartNumber: 'ARMA-BOARD-BLK-001',
        listPrice: 4.50,
        netPrice: 3.60,
        discountPercent: 20,
        isPreferred: true
      }
    ],
    variants: [
      {
        name: '1" x 4\' x 8\'',
        sku: 'ARMA-BOARD-BLK-001-1-4-8',
        properties: new Map([
          ['thickness', 1.0],
          ['width', 4],
          ['length', 8]
        ]),
        propertiesNormalized: new Map([
          ['thickness', 1.0],
          ['width', 4],
          ['length', 8]
        ]),
        propertyUnits: new Map([
          ['thickness', 'inches'],
          ['width', 'feet'],
          ['length', 'feet']
        ]),
        packageQuantity: 1,
        packageUnit: 'SQ_FT',
        suppliers: [
          {
            distributorId: impro._id,
            manufacturerId: armacell._id,
            supplierPartNumber: 'ARMA-BOARD-BLK-001-1-4-8',
            listPrice: 4.50,
            netPrice: 3.60,
            discountPercent: 20,
            isPreferred: true
          }
        ],
        isActive: true
      }
    ]
  });
  
  products.push(exclusiveProduct);
  log(`✅ Created: ${exclusiveProduct.name} (${exclusiveProduct.variants.length} variants, 1 distributor - exclusive)`, 'green');
  
  return products;
}

async function printSummary(companies, products) {
  log('\n' + '='.repeat(80), 'bright');
  log('📊 DATA SEED SUMMARY', 'bright');
  log('='.repeat(80), 'bright');
  
  log('\n🏭 MANUFACTURERS:', 'blue');
  companies.manufacturers.forEach(m => {
    log(`  • ${m.name} (${m.companyType})`, 'green');
  });
  
  log('\n🏪 DISTRIBUTORS:', 'blue');
  companies.distributors.forEach(d => {
    log(`  • ${d.name} (${d.companyType})`, 'green');
  });
  
  log('\n📦 PRODUCTS:', 'blue');
  products.forEach(p => {
    const distributors = [...new Set(p.suppliers.map(s => s.distributorId.toString()))];
    log(`  • ${p.name}`, 'green');
    log(`    - Manufacturer: ${p.manufacturerId}`, 'yellow');
    log(`    - Distributors: ${distributors.length}`, 'yellow');
    log(`    - Variants: ${p.variants.length}`, 'yellow');
  });
  
  log('\n💰 PRICING SCENARIOS:', 'blue');
  log('  1. Same product, same manufacturer, different distributors → Different prices', 'green');
  log('  2. Same product sold by 3 distributors → Price comparison opportunity', 'green');
  log('  3. Exclusive products → Single distributor only', 'green');
  log('  4. Variant-level pricing → Each variant has distributor-specific pricing', 'green');
  
  log('\n' + '='.repeat(80), 'bright');
}

async function main() {
  try {
    await connectDB();
    await clearExistingData();
    
    const companies = await createCompanies();
    const products = await createProducts(companies);
    
    await printSummary(companies, products);
    
    log('\n✅ Seed completed successfully!', 'green');
    log('\n💡 Next Steps:', 'blue');
    log('  1. View products in ProductList to see multi-distributor products', 'yellow');
    log('  2. Check ProductDetail to see distributor pricing comparison', 'yellow');
    log('  3. View CompanyOverview for distributors to see their manufacturers', 'yellow');
    log('  4. Use SupplierPriceComparison to compare prices across distributors', 'yellow');
    log('  5. Enhance PricebookView to show distributor-specific price sheets', 'yellow');
    
  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    log('\n👋 Database connection closed', 'yellow');
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { main };

