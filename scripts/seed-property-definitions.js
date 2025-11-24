/**
 * Comprehensive Property Definitions Seed
 * 
 * Creates ALL global property definitions based on analysis of all ProductTypes and Products.
 * Goal: 100% standardization - no custom properties.
 */

require('dotenv').config({ path: '.env.local', override: true });
const mongoose = require('mongoose');
const PropertyDefinition = require('../src/server/models/PropertyDefinition');

const propertyDefinitions = [
  // ============================================
  // DIMENSIONS
  // ============================================
  {
    key: 'pipe_diameter',
    label: 'Pipe Diameter',
    description: 'Nominal pipe diameter, typically in inches.',
    category: 'dimension',
    dataType: 'fraction',
    unit: 'inches',
    normalization: { function: 'parseInches', tolerance: 0.01 },
    aliases: ['pipe_size', 'diameter', 'size'],
    display: { inputType: 'text', placeholder: 'e.g., 1/2, 2, 3 1/2' }
  },
  {
    key: 'insulation_thickness',
    label: 'Insulation Thickness',
    description: 'Thickness of insulation material, typically in inches.',
    category: 'dimension',
    dataType: 'fraction',
    unit: 'inches',
    normalization: { function: 'parseInches', tolerance: 0.01 },
    aliases: ['thickness', 'insulation_t', 'wall_thickness'],
    display: { inputType: 'text', placeholder: 'e.g., 1, 1 1/2, 2' }
  },
  {
    key: 'wall_thickness',
    label: 'Wall Thickness',
    description: 'Wall thickness of pipe or fitting, typically in inches.',
    category: 'dimension',
    dataType: 'fraction',
    unit: 'inches',
    normalization: { function: 'parseInches', tolerance: 0.01 },
    aliases: ['wall_t'],
    display: { inputType: 'text', placeholder: 'e.g., SCH 40, 0.25' }
  },
  {
    key: 'width',
    label: 'Width',
    description: 'Width dimension, typically in inches.',
    category: 'dimension',
    dataType: 'number',
    unit: 'inches',
    normalization: { function: 'parseNumber', tolerance: 0.01 },
    display: { inputType: 'number', placeholder: 'e.g., 12, 24' }
  },
  {
    key: 'height',
    label: 'Height',
    description: 'Height dimension, typically in inches.',
    category: 'dimension',
    dataType: 'number',
    unit: 'inches',
    normalization: { function: 'parseNumber', tolerance: 0.01 },
    display: { inputType: 'number', placeholder: 'e.g., 12, 24' }
  },
  {
    key: 'length',
    label: 'Length',
    description: 'Length dimension, typically in feet or inches.',
    category: 'dimension',
    dataType: 'number',
    unit: 'feet',
    normalization: { function: 'parseNumber', tolerance: 0.01 },
    display: { inputType: 'number', placeholder: 'e.g., 10, 20' }
  },
  {
    key: 'dimensions',
    label: 'Dimensions',
    description: 'Product dimensions (width x height x length or similar).',
    category: 'dimension',
    dataType: 'text',
    display: { inputType: 'text', placeholder: 'e.g., 48" X 100\'' }
  },
  {
    key: 'gauge',
    label: 'Gauge',
    description: 'Material gauge (e.g., for sheet metal).',
    category: 'dimension',
    dataType: 'number',
    display: { inputType: 'number', placeholder: 'e.g., 24, 26' },
    enumOptions: [
      { value: '20', label: '20 Gauge' },
      { value: '22', label: '22 Gauge' },
      { value: '24', label: '24 Gauge' },
      { value: '26', label: '26 Gauge' }
    ]
  },
  {
    key: 'size',
    label: 'Size',
    description: 'General size designation (e.g., fastener size).',
    category: 'dimension',
    dataType: 'text',
    display: { inputType: 'text', placeholder: 'e.g., #8, #10' }
  },

  // ============================================
  // MATERIALS
  // ============================================
  {
    key: 'pipe_type',
    label: 'Pipe Type',
    description: 'Material type of the pipe.',
    category: 'material',
    dataType: 'enum',
    normalization: { function: 'toLowerCase' },
    enumOptions: [
      { value: 'copper', label: 'Copper', aliases: ['cu'] },
      { value: 'iron', label: 'Iron', aliases: ['ci'] },
      { value: 'steel', label: 'Steel', aliases: ['ss', 'cs'] },
      { value: 'pvc', label: 'PVC' },
      { value: 'cpvc', label: 'CPVC' },
      { value: 'duct', label: 'Ductwork', aliases: ['duct'] }
    ],
    display: { inputType: 'select' }
  },
  {
    key: 'facing',
    label: 'Facing Type',
    description: 'Facing or jacketing material for insulation.',
    category: 'material',
    dataType: 'enum',
    normalization: { function: 'toLowerCase' },
    enumOptions: [
      { value: 'asj', label: 'ASJ (All Service Jacket)', aliases: ['all service jacket'] },
      { value: 'fsk', label: 'FSK (Foil Scrim Kraft)', aliases: ['foil scrim kraft'] },
      { value: 'pvc', label: 'PVC Jacket' },
      { value: 'foil', label: 'Foil' },
      { value: 'none', label: 'None (Unfaced)', aliases: ['unfaced'] }
    ],
    display: { inputType: 'select' }
  },
  {
    key: 'material',
    label: 'Material',
    description: 'General material type.',
    category: 'material',
    dataType: 'enum',
    normalization: { function: 'toLowerCase' },
    enumOptions: [
      { value: 'fiberglass', label: 'Fiberglass' },
      { value: 'mineral_wool', label: 'Mineral Wool', aliases: ['rockwool'] },
      { value: 'foam_glass', label: 'Foam Glass' },
      { value: 'elastomeric', label: 'Elastomeric' },
      { value: 'steel', label: 'Steel' },
      { value: 'stainless', label: 'Stainless Steel', aliases: ['ss'] },
      { value: 'zinc', label: 'Zinc' },
      { value: 'galvanized_steel', label: 'Galvanized Steel', aliases: ['galv'] }
    ],
    display: { inputType: 'select' }
  },
  {
    key: 'density',
    label: 'Density',
    description: 'Material density, typically in pounds per cubic foot.',
    category: 'material',
    dataType: 'text',
    unit: 'LB/CU.FT',
    display: { inputType: 'text', placeholder: 'e.g., 2.25 LB/CU.FT' }
  },

  // ============================================
  // SPECIFICATIONS
  // ============================================
  {
    key: 'fitting_type',
    label: 'Fitting Type',
    description: 'Type of pipe fitting.',
    category: 'specification',
    dataType: 'enum',
    normalization: { function: 'toLowerCase' },
    aliases: ['fittingtype'],
    enumOptions: [
      { value: '45-degree', label: '45 Degree', aliases: ['45', '45deg'] },
      { value: '90-degree', label: '90 Degree', aliases: ['90', '90deg', 'elbow'] },
      { value: 'tee', label: 'Tee', aliases: ['t'] },
      { value: 'reducer', label: 'Reducer' },
      { value: 'coupling', label: 'Coupling' },
      { value: 'cap', label: 'Cap' }
    ],
    display: { inputType: 'select' }
  },
  {
    key: 'head_type',
    label: 'Head Type',
    description: 'Type of fastener head.',
    category: 'specification',
    dataType: 'enum',
    normalization: { function: 'toLowerCase' },
    enumOptions: [
      { value: 'flat', label: 'Flat Head' },
      { value: 'pan', label: 'Pan Head' },
      { value: 'round', label: 'Round Head' },
      { value: 'hex', label: 'Hex Head' },
      { value: 'phillips', label: 'Phillips' },
      { value: 'slotted', label: 'Slotted' }
    ],
    display: { inputType: 'select' }
  },
  {
    key: 'thread_type',
    label: 'Thread Type',
    description: 'Type of thread on fastener.',
    category: 'specification',
    dataType: 'enum',
    normalization: { function: 'toLowerCase' },
    enumOptions: [
      { value: 'coarse', label: 'Coarse Thread' },
      { value: 'fine', label: 'Fine Thread' },
      { value: 'machine', label: 'Machine Thread' },
      { value: 'wood', label: 'Wood Thread' }
    ],
    display: { inputType: 'select' }
  },
  {
    key: 'shape',
    label: 'Shape',
    description: 'Shape of ductwork or product.',
    category: 'specification',
    dataType: 'enum',
    normalization: { function: 'toLowerCase' },
    enumOptions: [
      { value: 'rectangular', label: 'Rectangular' },
      { value: 'round', label: 'Round' },
      { value: 'oval', label: 'Oval' },
      { value: 'square', label: 'Square' }
    ],
    display: { inputType: 'select' }
  },
  {
    key: 'product_type',
    label: 'Product Type',
    description: 'Specific product type or model designation.',
    category: 'specification',
    dataType: 'enum',
    normalization: { function: 'toLowerCase' },
    aliases: ['producttype'],
    enumOptions: [
      { value: 'rc', label: 'RC' },
      { value: 'pm', label: 'PM' },
      { value: 'r300', label: 'R300' },
      { value: 'certainteed', label: 'Certainteed' },
      { value: 'spiracoustic', label: 'Spiracoustic' },
      { value: 'microflex', label: 'Microflex' },
      { value: 'cci-pipe-tank', label: 'CCI Pipe & Tank' },
      { value: 'duct-wrap-075', label: 'Duct Wrap 3/4 lb' },
      { value: 'duct-wrap-1', label: 'Duct Wrap 1 lb' },
      { value: 'duct-wrap-15', label: 'Duct Wrap 1.5 lb' }
    ],
    display: { inputType: 'select' }
  },
  {
    key: 'product_code',
    label: 'Product Code',
    description: 'Manufacturer product code or model number.',
    category: 'specification',
    dataType: 'text',
    aliases: ['productcode'],
    display: { inputType: 'text', placeholder: 'e.g., JM 813, CB300' }
  },
  {
    key: 'insulated',
    label: 'Insulated',
    description: 'Whether the product is insulated.',
    category: 'specification',
    dataType: 'boolean',
    display: { inputType: 'checkbox' }
  },

  // ============================================
  // PERFORMANCE
  // ============================================
  {
    key: 'temperature_rating_min',
    label: 'Min Temperature (°F)',
    description: 'Minimum operating temperature in Fahrenheit.',
    category: 'performance',
    dataType: 'number',
    unit: '°F',
    display: { inputType: 'number', placeholder: 'e.g., 32' }
  },
  {
    key: 'temperature_rating_max',
    label: 'Max Temperature (°F)',
    description: 'Maximum operating temperature in Fahrenheit.',
    category: 'performance',
    dataType: 'number',
    unit: '°F',
    display: { inputType: 'number', placeholder: 'e.g., 850' }
  },
  {
    key: 'r_value',
    label: 'R-Value',
    description: 'Thermal resistance R-value.',
    category: 'performance',
    dataType: 'number',
    display: { inputType: 'number', placeholder: 'e.g., 4.2, 6.5' }
  },
  {
    key: 'fire_rated',
    label: 'Fire Rated',
    description: 'Indicates if the product has a fire rating.',
    category: 'performance',
    dataType: 'boolean',
    display: { inputType: 'checkbox' }
  },
  {
    key: 'capacity',
    label: 'Capacity',
    description: 'Product capacity (e.g., HVAC tons, flow rate).',
    category: 'performance',
    dataType: 'number',
    unit: 'tons',
    display: { inputType: 'number', placeholder: 'e.g., 2, 3.5' }
  },
  {
    key: 'voltage',
    label: 'Voltage',
    description: 'Electrical voltage requirement.',
    category: 'performance',
    dataType: 'enum',
    enumOptions: [
      { value: '120', label: '120V' },
      { value: '208', label: '208V' },
      { value: '240', label: '240V' },
      { value: '480', label: '480V' }
    ],
    display: { inputType: 'select' }
  },
  {
    key: 'phase',
    label: 'Phase',
    description: 'Electrical phase.',
    category: 'performance',
    dataType: 'enum',
    enumOptions: [
      { value: 'single', label: 'Single Phase' },
      { value: 'three', label: 'Three Phase' }
    ],
    display: { inputType: 'select' }
  },
  {
    key: 'efficiency_rating',
    label: 'Efficiency Rating',
    description: 'Energy efficiency rating (e.g., SEER for HVAC).',
    category: 'performance',
    dataType: 'number',
    unit: 'SEER',
    display: { inputType: 'number', placeholder: 'e.g., 14, 16, 18' }
  },
  {
    key: 'warranty_years',
    label: 'Warranty (Years)',
    description: 'Warranty period in years.',
    category: 'performance',
    dataType: 'number',
    unit: 'years',
    display: { inputType: 'number', placeholder: 'e.g., 1, 5, 10' }
  },

  // ============================================
  // QUANTITY / PACKAGING
  // ============================================
  {
    key: 'sq_ft_per_roll',
    label: 'Square Feet Per Roll',
    description: 'Square footage per roll.',
    category: 'other',
    dataType: 'number',
    unit: 'sq ft',
    aliases: ['sqftperroll'],
    display: { inputType: 'number', placeholder: 'e.g., 400, 500' }
  },
  {
    key: 'sq_ft_per_bundle',
    label: 'Square Feet Per Bundle',
    description: 'Square footage per bundle.',
    category: 'other',
    dataType: 'number',
    unit: 'sq ft',
    aliases: ['sqftperbundle'],
    display: { inputType: 'number', placeholder: 'e.g., 96, 128' }
  },
  {
    key: 'lf_per_box',
    label: 'Lineal Feet Per Box',
    description: 'Lineal feet per box.',
    category: 'other',
    dataType: 'number',
    unit: 'LF',
    aliases: ['lfperbox'],
    display: { inputType: 'number', placeholder: 'e.g., 13.12, 19.68' }
  },

  // ============================================
  // FEATURES / OTHER
  // ============================================
  {
    key: 'features',
    label: 'Features',
    description: 'Product features or options.',
    category: 'other',
    dataType: 'enum',
    normalization: { function: 'toLowerCase' },
    enumOptions: [
      { value: 'wifi', label: 'WiFi' },
      { value: 'smart_thermostat', label: 'Smart Thermostat' },
      { value: 'variable_speed', label: 'Variable Speed' },
      { value: 'quiet_operation', label: 'Quiet Operation' },
      { value: 'energy_star', label: 'Energy Star' }
    ],
    display: { inputType: 'multiselect' }
  }
];

async function seedPropertyDefinitions() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGODB_DEV_URI);
  console.log('✅ Connected to MongoDB');

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  for (const def of propertyDefinitions) {
    try {
      const existing = await PropertyDefinition.findOneAndUpdate(
        { key: def.key },
        def,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      if (existing) {
        if (existing.createdAt.getTime() === existing.updatedAt.getTime()) {
          console.log(`✅ Created: ${def.label} (${def.key})`);
          createdCount++;
        } else {
          console.log(`🔄 Updated: ${def.label} (${def.key})`);
          updatedCount++;
        }
      } else {
        console.log(`✅ Created: ${def.label} (${def.key})`);
        createdCount++;
      }
    } catch (error) {
      if (error.code === 11000) {
        console.warn(`⚠️ Skipped (duplicate key): ${def.key}`);
        skippedCount++;
      } else {
        console.error(`❌ Error seeding ${def.key}:`, error.message);
      }
    }
  }

  console.log(`\n📊 Summary:\n   Created: ${createdCount}\n   Updated: ${updatedCount}\n   Skipped: ${skippedCount}\n   Total: ${createdCount + updatedCount + skippedCount}\n`);
  console.log('✅ Comprehensive seeding complete!');
}

seedPropertyDefinitions().then(() => {
  mongoose.disconnect();
}).catch(err => {
  console.error('Seed failed:', err);
  mongoose.disconnect();
});

