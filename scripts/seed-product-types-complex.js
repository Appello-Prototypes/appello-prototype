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

if (!mongoUri) {
  console.error('MONGODB_URI or MONGODB_DEV_URI environment variable is not set');
  process.exit(1);
}

const connectDB = async () => {
  try {
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const seedProductTypes = async () => {
  console.log('\n🌱 Seeding Product Types...\n');

  // 1. Pipe Insulation Product Type (with variants: size, thickness, facing)
  const pipeInsulationType = await ProductType.findOneAndUpdate(
    { slug: 'pipe-insulation' },
    {
      name: 'Pipe Insulation',
      slug: 'pipe-insulation',
      description: 'Fiberglass pipe insulation with various sizes, thicknesses, and facings',
      properties: [
        {
          key: 'pipe_size',
          label: 'Pipe Size',
          type: 'enum',
          required: true,
          options: [
            { value: '1/2', label: '1/2"' },
            { value: '3/4', label: '3/4"' },
            { value: '1', label: '1"' },
            { value: '1_1/4', label: '1 1/4"' },
            { value: '1_1/2', label: '1 1/2"' },
            { value: '2', label: '2"' },
            { value: '3', label: '3"' },
            { value: '4', label: '4"' },
            { value: '6', label: '6"' }
          ],
          variantKey: true,
          display: { order: 1, group: 'Dimensions' }
        },
        {
          key: 'thickness',
          label: 'Thickness',
          type: 'enum',
          required: true,
          options: [
            { value: '1', label: '1"' },
            { value: '1_5', label: '1.5"' },
            { value: '2', label: '2"' },
            { value: '3', label: '3"' }
          ],
          variantKey: true,
          display: { order: 2, group: 'Dimensions' }
        },
        {
          key: 'facing',
          label: 'Facing Type',
          type: 'enum',
          required: true,
          options: [
            { value: 'asj', label: 'ASJ (All Service Jacket)' },
            { value: 'pvc', label: 'PVC' },
            { value: 'foil', label: 'Foil' },
            { value: 'none', label: 'None (Unfaced)' }
          ],
          variantKey: true,
          display: { order: 3, group: 'Specifications' }
        },
        {
          key: 'r_value',
          label: 'R-Value',
          type: 'number',
          required: false,
          validation: { min: 0, max: 50 },
          display: { order: 4, group: 'Specifications', helpText: 'Thermal resistance value' }
        },
        {
          key: 'temperature_rating',
          label: 'Temperature Rating (°F)',
          type: 'number',
          required: false,
          validation: { min: -100, max: 1000 },
          display: { order: 5, group: 'Specifications' }
        },
        {
          key: 'fire_rated',
          label: 'Fire Rated',
          type: 'boolean',
          required: false,
          defaultValue: false,
          display: { order: 6, group: 'Specifications' }
        }
      ],
      variantSettings: {
        enabled: true,
        variantProperties: ['pipe_size', 'thickness', 'facing'],
        namingTemplate: '{name} - {pipe_size}" x {thickness}" {facing}'
      },
      isActive: true
    },
    { upsert: true, new: true }
  );
  console.log('✅ Created Pipe Insulation product type');

  // 2. Ductwork Product Type (with variants: size, gauge, shape)
  const ductworkType = await ProductType.findOneAndUpdate(
    { slug: 'ductwork' },
    {
      name: 'Ductwork',
      slug: 'ductwork',
      description: 'Sheet metal ductwork in various sizes, gauges, and shapes',
      properties: [
        {
          key: 'width',
          label: 'Width (inches)',
          type: 'number',
          required: true,
          validation: { min: 4, max: 120 },
          variantKey: true,
          display: { order: 1, group: 'Dimensions' }
        },
        {
          key: 'height',
          label: 'Height (inches)',
          type: 'number',
          required: true,
          validation: { min: 4, max: 120 },
          variantKey: true,
          display: { order: 2, group: 'Dimensions' }
        },
        {
          key: 'gauge',
          label: 'Gauge',
          type: 'enum',
          required: true,
          options: [
            { value: '26', label: '26 Gauge' },
            { value: '24', label: '24 Gauge' },
            { value: '22', label: '22 Gauge' },
            { value: '20', label: '20 Gauge' }
          ],
          variantKey: true,
          display: { order: 3, group: 'Specifications' }
        },
        {
          key: 'shape',
          label: 'Shape',
          type: 'enum',
          required: true,
          options: [
            { value: 'rectangular', label: 'Rectangular' },
            { value: 'round', label: 'Round' },
            { value: 'oval', label: 'Oval' }
          ],
          variantKey: false,
          display: { order: 4, group: 'Specifications' }
        },
        {
          key: 'material',
          label: 'Material',
          type: 'enum',
          required: true,
          options: [
            { value: 'galvanized', label: 'Galvanized Steel' },
            { value: 'stainless', label: 'Stainless Steel' },
            { value: 'aluminum', label: 'Aluminum' }
          ],
          display: { order: 5, group: 'Specifications' }
        },
        {
          key: 'insulated',
          label: 'Insulated',
          type: 'boolean',
          required: false,
          defaultValue: false,
          display: { order: 6, group: 'Specifications' }
        }
      ],
      variantSettings: {
        enabled: true,
        variantProperties: ['width', 'height', 'gauge'],
        namingTemplate: '{name} - {width}" x {height}" {gauge}ga'
      },
      isActive: true
    },
    { upsert: true, new: true }
  );
  console.log('✅ Created Ductwork product type');

  // 3. HVAC Equipment Type (no variants, just properties)
  const hvacEquipmentType = await ProductType.findOneAndUpdate(
    { slug: 'hvac-equipment' },
    {
      name: 'HVAC Equipment',
      slug: 'hvac-equipment',
      description: 'HVAC units, fans, and related equipment',
      properties: [
        {
          key: 'capacity',
          label: 'Capacity (tons)',
          type: 'number',
          required: true,
          validation: { min: 0.5, max: 100 },
          display: { order: 1, group: 'Specifications' }
        },
        {
          key: 'voltage',
          label: 'Voltage',
          type: 'enum',
          required: true,
          options: [
            { value: '120', label: '120V' },
            { value: '208', label: '208V' },
            { value: '240', label: '240V' },
            { value: '480', label: '480V' }
          ],
          display: { order: 2, group: 'Electrical' }
        },
        {
          key: 'phase',
          label: 'Phase',
          type: 'enum',
          required: true,
          options: [
            { value: 'single', label: 'Single Phase' },
            { value: 'three', label: 'Three Phase' }
          ],
          display: { order: 3, group: 'Electrical' }
        },
        {
          key: 'efficiency_rating',
          label: 'Efficiency Rating (SEER)',
          type: 'number',
          required: false,
          validation: { min: 10, max: 30 },
          display: { order: 4, group: 'Specifications', helpText: 'Seasonal Energy Efficiency Ratio' }
        },
        {
          key: 'warranty_years',
          label: 'Warranty (years)',
          type: 'number',
          required: false,
          validation: { min: 1, max: 20 },
          display: { order: 5, group: 'Warranty' }
        },
        {
          key: 'features',
          label: 'Features',
          type: 'multiselect',
          required: false,
          options: [
            { value: 'wifi', label: 'WiFi Enabled' },
            { value: 'smart_thermostat', label: 'Smart Thermostat Compatible' },
            { value: 'variable_speed', label: 'Variable Speed' },
            { value: 'quiet_operation', label: 'Quiet Operation' },
            { value: 'energy_star', label: 'Energy Star Certified' }
          ],
          display: { order: 6, group: 'Features' }
        }
      ],
      variantSettings: {
        enabled: false
      },
      isActive: true
    },
    { upsert: true, new: true }
  );
  console.log('✅ Created HVAC Equipment product type');

  // 4. Fasteners Type (with variants: size, material, finish)
  const fastenersType = await ProductType.findOneAndUpdate(
    { slug: 'fasteners' },
    {
      name: 'Fasteners',
      slug: 'fasteners',
      description: 'Screws, bolts, and other fasteners',
      properties: [
        {
          key: 'size',
          label: 'Size',
          type: 'string',
          required: true,
          variantKey: true,
          display: { order: 1, group: 'Dimensions', placeholder: 'e.g., #8, 1/4", M6' }
        },
        {
          key: 'length',
          label: 'Length (inches)',
          type: 'number',
          required: true,
          validation: { min: 0.125, max: 12 },
          variantKey: true,
          display: { order: 2, group: 'Dimensions' }
        },
        {
          key: 'material',
          label: 'Material',
          type: 'enum',
          required: true,
          options: [
            { value: 'steel', label: 'Steel' },
            { value: 'stainless', label: 'Stainless Steel' },
            { value: 'aluminum', label: 'Aluminum' },
            { value: 'brass', label: 'Brass' },
            { value: 'zinc', label: 'Zinc Plated' }
          ],
          variantKey: true,
          display: { order: 3, group: 'Specifications' }
        },
        {
          key: 'head_type',
          label: 'Head Type',
          type: 'enum',
          required: true,
          options: [
            { value: 'flat', label: 'Flat' },
            { value: 'pan', label: 'Pan' },
            { value: 'round', label: 'Round' },
            { value: 'hex', label: 'Hex' },
            { value: 'phillips', label: 'Phillips' }
          ],
          display: { order: 4, group: 'Specifications' }
        },
        {
          key: 'thread_type',
          label: 'Thread Type',
          type: 'enum',
          required: false,
          options: [
            { value: 'coarse', label: 'Coarse' },
            { value: 'fine', label: 'Fine' },
            { value: 'machine', label: 'Machine Thread' },
            { value: 'wood', label: 'Wood Thread' }
          ],
          display: { order: 5, group: 'Specifications' }
        }
      ],
      variantSettings: {
        enabled: true,
        variantProperties: ['size', 'length', 'material'],
        namingTemplate: '{name} - {size} x {length}" {material}'
      },
      isActive: true
    },
    { upsert: true, new: true }
  );
  console.log('✅ Created Fasteners product type');

  return {
    pipeInsulationType,
    ductworkType,
    hvacEquipmentType,
    fastenersType
  };
};

const seedProducts = async (productTypes, suppliers) => {
  console.log('\n🌱 Seeding Products with Variants...\n');

  // Get or create suppliers
  let supplier1 = await Company.findOne({ name: 'Test Supplier 1' });
  if (!supplier1) {
    supplier1 = await Company.create({
      name: 'Test Supplier 1',
      companyType: 'supplier',
      contact: { email: 'supplier1@test.com', phone: '555-0001' },
      isActive: true
    });
  }

  let supplier2 = await Company.findOne({ name: 'Test Supplier 2' });
  if (!supplier2) {
    supplier2 = await Company.create({
      name: 'Test Supplier 2',
      companyType: 'supplier',
      contact: { email: 'supplier2@test.com', phone: '555-0002' },
      isActive: true
    });
  }

  // 1. Pipe Insulation Product with Variants
  const pipeInsulationProduct = await Product.findOneAndUpdate(
    { name: 'Fiberglass Pipe Insulation' },
    {
      name: 'Fiberglass Pipe Insulation',
      description: 'High-quality fiberglass pipe insulation for HVAC applications',
      productTypeId: productTypes.pipeInsulationType._id,
      internalPartNumber: 'PI-FG-001',
      properties: new Map([
        ['r_value', 4.2],
        ['temperature_rating', 350],
        ['fire_rated', true]
      ]),
      unitOfMeasure: 'FT',
      category: 'Insulation',
      standardCost: 2.50,
      suppliers: [{
        supplierId: supplier1._id,
        supplierPartNumber: 'SUP-PI-001',
        lastPrice: 2.75,
        isPreferred: true
      }],
      variants: [
        {
          name: 'Fiberglass Pipe Insulation - 1/2" x 1" ASJ',
          sku: 'PI-1/2-1-ASJ',
          properties: new Map([
            ['pipe_size', '1/2'],
            ['thickness', '1'],
            ['facing', 'asj']
          ]),
          pricing: {
            standardCost: 2.50,
            lastPrice: 2.75
          },
          suppliers: [{
            supplierId: supplier1._id,
            supplierPartNumber: 'SUP-PI-1/2-1-ASJ',
            lastPrice: 2.75
          }],
          isActive: true
        },
        {
          name: 'Fiberglass Pipe Insulation - 2" x 2" ASJ',
          sku: 'PI-2-2-ASJ',
          properties: new Map([
            ['pipe_size', '2'],
            ['thickness', '2'],
            ['facing', 'asj']
          ]),
          pricing: {
            standardCost: 4.25,
            lastPrice: 4.75
          },
          suppliers: [{
            supplierId: supplier1._id,
            supplierPartNumber: 'SUP-PI-2-2-ASJ',
            lastPrice: 4.75
          }],
          isActive: true
        },
        {
          name: 'Fiberglass Pipe Insulation - 4" x 3" PVC',
          sku: 'PI-4-3-PVC',
          properties: new Map([
            ['pipe_size', '4'],
            ['thickness', '3'],
            ['facing', 'pvc']
          ]),
          pricing: {
            standardCost: 8.50,
            lastPrice: 9.25
          },
          suppliers: [{
            supplierId: supplier2._id,
            supplierPartNumber: 'SUP-PI-4-3-PVC',
            lastPrice: 9.25
          }],
          isActive: true
        }
      ],
      isActive: true
    },
    { upsert: true, new: true }
  );
  console.log(`✅ Created Pipe Insulation product with ${pipeInsulationProduct.variants.length} variants`);

  // 2. Ductwork Product with Variants
  const ductworkProduct = await Product.findOneAndUpdate(
    { name: 'Galvanized Steel Ductwork' },
    {
      name: 'Galvanized Steel Ductwork',
      description: 'Standard galvanized steel ductwork for HVAC systems',
      productTypeId: productTypes.ductworkType._id,
      internalPartNumber: 'DW-GS-001',
      properties: new Map([
        ['shape', 'rectangular'],
        ['material', 'galvanized'],
        ['insulated', false]
      ]),
      unitOfMeasure: 'FT',
      category: 'Ductwork',
      standardCost: 12.00,
      suppliers: [{
        supplierId: supplier1._id,
        supplierPartNumber: 'SUP-DW-001',
        lastPrice: 13.50,
        isPreferred: true
      }],
      variants: [
        {
          name: 'Galvanized Steel Ductwork - 12" x 8" 26ga',
          sku: 'DW-12x8-26',
          properties: new Map([
            ['width', 12],
            ['height', 8],
            ['gauge', '26']
          ]),
          pricing: {
            standardCost: 10.50,
            lastPrice: 11.75
          },
          suppliers: [{
            supplierId: supplier1._id,
            supplierPartNumber: 'SUP-DW-12x8-26',
            lastPrice: 11.75
          }],
          isActive: true
        },
        {
          name: 'Galvanized Steel Ductwork - 24" x 12" 24ga',
          sku: 'DW-24x12-24',
          properties: new Map([
            ['width', 24],
            ['height', 12],
            ['gauge', '24']
          ]),
          pricing: {
            standardCost: 18.75,
            lastPrice: 21.00
          },
          suppliers: [{
            supplierId: supplier1._id,
            supplierPartNumber: 'SUP-DW-24x12-24',
            lastPrice: 21.00
          }],
          isActive: true
        },
        {
          name: 'Galvanized Steel Ductwork - 36" x 18" 22ga',
          sku: 'DW-36x18-22',
          properties: new Map([
            ['width', 36],
            ['height', 18],
            ['gauge', '22']
          ]),
          pricing: {
            standardCost: 28.50,
            lastPrice: 32.00
          },
          suppliers: [{
            supplierId: supplier2._id,
            supplierPartNumber: 'SUP-DW-36x18-22',
            lastPrice: 32.00
          }],
          isActive: true
        }
      ],
      isActive: true
    },
    { upsert: true, new: true }
  );
  console.log(`✅ Created Ductwork product with ${ductworkProduct.variants.length} variants`);

  // 3. HVAC Equipment Product (no variants)
  const hvacProduct = await Product.findOneAndUpdate(
    { name: 'Carrier Infinity 19VS Heat Pump' },
    {
      name: 'Carrier Infinity 19VS Heat Pump',
      description: 'High-efficiency variable speed heat pump system',
      productTypeId: productTypes.hvacEquipmentType._id,
      internalPartNumber: 'HVAC-CAR-19VS',
      properties: new Map([
        ['capacity', 3],
        ['voltage', '240'],
        ['phase', 'single'],
        ['efficiency_rating', 19],
        ['warranty_years', 10],
        ['features', ['wifi', 'smart_thermostat', 'variable_speed', 'energy_star']]
      ]),
      unitOfMeasure: 'EA',
      category: 'HVAC Equipment',
      standardCost: 4500.00,
      suppliers: [{
        supplierId: supplier2._id,
        supplierPartNumber: 'SUP-HVAC-CAR-19VS',
        lastPrice: 4750.00,
        isPreferred: true
      }],
      isActive: true
    },
    { upsert: true, new: true }
  );
  console.log('✅ Created HVAC Equipment product (no variants)');

  // 4. Fasteners Product with Variants
  const fastenersProduct = await Product.findOneAndUpdate(
    { name: 'Sheet Metal Screws' },
    {
      name: 'Sheet Metal Screws',
      description: 'Self-tapping sheet metal screws',
      productTypeId: productTypes.fastenersType._id,
      internalPartNumber: 'FAST-SMS-001',
      properties: new Map([
        ['head_type', 'pan'],
        ['thread_type', 'machine']
      ]),
      unitOfMeasure: 'EA',
      category: 'Fasteners',
      standardCost: 0.15,
      suppliers: [{
        supplierId: supplier1._id,
        supplierPartNumber: 'SUP-FAST-SMS',
        lastPrice: 0.18,
        isPreferred: true
      }],
      variants: [
        {
          name: 'Sheet Metal Screws - #8 x 1/2" Steel',
          sku: 'FAST-8-0.5-STEEL',
          properties: new Map([
            ['size', '#8'],
            ['length', 0.5],
            ['material', 'steel']
          ]),
          pricing: {
            standardCost: 0.12,
            lastPrice: 0.15
          },
          suppliers: [{
            supplierId: supplier1._id,
            supplierPartNumber: 'SUP-FAST-8-0.5-STEEL',
            lastPrice: 0.15
          }],
          isActive: true
        },
        {
          name: 'Sheet Metal Screws - #10 x 1" Stainless',
          sku: 'FAST-10-1-STAINLESS',
          properties: new Map([
            ['size', '#10'],
            ['length', 1],
            ['material', 'stainless']
          ]),
          pricing: {
            standardCost: 0.35,
            lastPrice: 0.42
          },
          suppliers: [{
            supplierId: supplier2._id,
            supplierPartNumber: 'SUP-FAST-10-1-STAINLESS',
            lastPrice: 0.42
          }],
          isActive: true
        },
        {
          name: 'Sheet Metal Screws - #8 x 3/4" Zinc',
          sku: 'FAST-8-0.75-ZINC',
          properties: new Map([
            ['size', '#8'],
            ['length', 0.75],
            ['material', 'zinc']
          ]),
          pricing: {
            standardCost: 0.18,
            lastPrice: 0.22
          },
          suppliers: [{
            supplierId: supplier1._id,
            supplierPartNumber: 'SUP-FAST-8-0.75-ZINC',
            lastPrice: 0.22
          }],
          isActive: true
        }
      ],
      isActive: true
    },
    { upsert: true, new: true }
  );
  console.log(`✅ Created Fasteners product with ${fastenersProduct.variants.length} variants`);

  return {
    pipeInsulationProduct,
    ductworkProduct,
    hvacProduct,
    fastenersProduct
  };
};

const main = async () => {
  try {
    await connectDB();

    console.log('🚀 Starting Complex Product Type & Variant Seeding...\n');

    // Seed product types
    const productTypes = await seedProductTypes();

    // Seed products with variants
    const products = await seedProducts(productTypes);

    console.log('\n✅ Seeding Complete!\n');
    console.log('📊 Summary:');
    console.log(`   - Product Types: 4`);
    console.log(`   - Products: 4`);
    console.log(`   - Total Variants: ${products.pipeInsulationProduct.variants.length + products.ductworkProduct.variants.length + products.fastenersProduct.variants.length}`);
    console.log(`   - Products with Variants: 3`);
    console.log(`   - Products without Variants: 1`);

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

main();

