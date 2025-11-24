/**
 * Seed Units of Measure
 * 
 * Creates standard units of measure for construction materials.
 * Includes both Imperial and Metric systems with industry-standard values.
 */

require('dotenv').config({ path: '.env.local', override: true });
const mongoose = require('mongoose');
const UnitOfMeasure = require('../src/server/models/UnitOfMeasure');

const unitsOfMeasure = [
  // ============================================
  // LENGTH - IMPERIAL
  // ============================================
  {
    code: 'IN',
    name: 'Inches',
    abbreviation: 'in',
    symbol: '"',
    system: 'imperial',
    category: 'length',
    conversionFactor: 1,
    baseUnit: 'IN',
    usedFor: ['dimension', 'thickness', 'diameter', 'width', 'height', 'length'],
    decimalPlaces: 2,
    displayFormat: 'fraction',
    standardValues: [
      { displayValue: '1/8"', normalizedValue: 0.125, aliases: ['0.125', '1/8', '0.125"'] },
      { displayValue: '1/4"', normalizedValue: 0.25, aliases: ['0.25', '1/4', '0.25"', '1/4"'] },
      { displayValue: '3/8"', normalizedValue: 0.375, aliases: ['0.375', '3/8', '0.375"'] },
      { displayValue: '1/2"', normalizedValue: 0.5, aliases: ['0.5', '1/2', '0.5"', '1/2"'] },
      { displayValue: '5/8"', normalizedValue: 0.625, aliases: ['0.625', '5/8', '0.625"'] },
      { displayValue: '3/4"', normalizedValue: 0.75, aliases: ['0.75', '3/4', '0.75"', '3/4"'] },
      { displayValue: '7/8"', normalizedValue: 0.875, aliases: ['0.875', '7/8', '0.875"'] },
      { displayValue: '1"', normalizedValue: 1.0, aliases: ['1', '1.0', '1"'] },
      { displayValue: '1 1/8"', normalizedValue: 1.125, aliases: ['1.125', '1-1/8', '1.125"'] },
      { displayValue: '1 1/4"', normalizedValue: 1.25, aliases: ['1.25', '1-1/4', '1.25"', '1 1/4'] },
      { displayValue: '1 3/8"', normalizedValue: 1.375, aliases: ['1.375', '1-3/8', '1.375"'] },
      { displayValue: '1 1/2"', normalizedValue: 1.5, aliases: ['1.5', '1-1/2', '1.5"', '1 1/2'] },
      { displayValue: '1 5/8"', normalizedValue: 1.625, aliases: ['1.625', '1-5/8', '1.625"'] },
      { displayValue: '1 3/4"', normalizedValue: 1.75, aliases: ['1.75', '1-3/4', '1.75"'] },
      { displayValue: '1 7/8"', normalizedValue: 1.875, aliases: ['1.875', '1-7/8', '1.875"'] },
      { displayValue: '2"', normalizedValue: 2.0, aliases: ['2', '2.0', '2"'] },
      { displayValue: '2 1/2"', normalizedValue: 2.5, aliases: ['2.5', '2-1/2', '2.5"', '2 1/2'] },
      { displayValue: '3"', normalizedValue: 3.0, aliases: ['3', '3.0', '3"'] },
      { displayValue: '3 1/2"', normalizedValue: 3.5, aliases: ['3.5', '3-1/2', '3.5"', '3 1/2'] },
      { displayValue: '4"', normalizedValue: 4.0, aliases: ['4', '4.0', '4"'] },
      { displayValue: '5"', normalizedValue: 5.0, aliases: ['5', '5.0', '5"'] },
      { displayValue: '6"', normalizedValue: 6.0, aliases: ['6', '6.0', '6"'] },
      { displayValue: '8"', normalizedValue: 8.0, aliases: ['8', '8.0', '8"'] },
      { displayValue: '10"', normalizedValue: 10.0, aliases: ['10', '10.0', '10"'] },
      { displayValue: '12"', normalizedValue: 12.0, aliases: ['12', '12.0', '12"'] },
      { displayValue: '14"', normalizedValue: 14.0, aliases: ['14', '14.0', '14"'] },
      { displayValue: '16"', normalizedValue: 16.0, aliases: ['16', '16.0', '16"'] },
      { displayValue: '18"', normalizedValue: 18.0, aliases: ['18', '18.0', '18"'] },
      { displayValue: '20"', normalizedValue: 20.0, aliases: ['20', '20.0', '20"'] },
      { displayValue: '24"', normalizedValue: 24.0, aliases: ['24', '24.0', '24"'] },
      { displayValue: '30"', normalizedValue: 30.0, aliases: ['30', '30.0', '30"'] },
      { displayValue: '36"', normalizedValue: 36.0, aliases: ['36', '36.0', '36"'] },
      { displayValue: '42"', normalizedValue: 42.0, aliases: ['42', '42.0', '42"'] },
      { displayValue: '48"', normalizedValue: 48.0, aliases: ['48', '48.0', '48"'] }
    ]
  },
  {
    code: 'FT',
    name: 'Feet',
    abbreviation: 'ft',
    symbol: "'",
    system: 'imperial',
    category: 'length',
    conversionFactor: 12, // 1 foot = 12 inches
    baseUnit: 'IN',
    usedFor: ['length', 'height', 'width'],
    decimalPlaces: 2,
    displayFormat: 'decimal',
    standardValues: [
      { displayValue: '1', normalizedValue: 1.0, aliases: ['1.0', '1ft'] },
      { displayValue: '2', normalizedValue: 2.0, aliases: ['2.0', '2ft'] },
      { displayValue: '3', normalizedValue: 3.0, aliases: ['3.0', '3ft'] },
      { displayValue: '4', normalizedValue: 4.0, aliases: ['4.0', '4ft'] },
      { displayValue: '5', normalizedValue: 5.0, aliases: ['5.0', '5ft'] },
      { displayValue: '6', normalizedValue: 6.0, aliases: ['6.0', '6ft'] },
      { displayValue: '8', normalizedValue: 8.0, aliases: ['8.0', '8ft'] },
      { displayValue: '10', normalizedValue: 10.0, aliases: ['10.0', '10ft'] },
      { displayValue: '12', normalizedValue: 12.0, aliases: ['12.0', '12ft'] },
      { displayValue: '15', normalizedValue: 15.0, aliases: ['15.0', '15ft'] },
      { displayValue: '20', normalizedValue: 20.0, aliases: ['20.0', '20ft'] },
      { displayValue: '25', normalizedValue: 25.0, aliases: ['25.0', '25ft'] },
      { displayValue: '30', normalizedValue: 30.0, aliases: ['30.0', '30ft'] },
      { displayValue: '50', normalizedValue: 50.0, aliases: ['50.0', '50ft'] },
      { displayValue: '75', normalizedValue: 75.0, aliases: ['75.0', '75ft'] },
      { displayValue: '100', normalizedValue: 100.0, aliases: ['100.0', '100ft'] }
    ]
  },
  
  // ============================================
  // LENGTH - METRIC
  // ============================================
  {
    code: 'MM',
    name: 'Millimeters',
    abbreviation: 'mm',
    symbol: 'mm',
    system: 'metric',
    category: 'length',
    conversionFactor: 0.0393701, // 1 mm = 0.0393701 inches
    baseUnit: 'MM',
    usedFor: ['dimension', 'thickness', 'diameter'],
    decimalPlaces: 0,
    displayFormat: 'decimal',
    standardValues: [
      { displayValue: '6', normalizedValue: 6, aliases: ['6mm'] },
      { displayValue: '10', normalizedValue: 10, aliases: ['10mm'] },
      { displayValue: '12', normalizedValue: 12, aliases: ['12mm'] },
      { displayValue: '15', normalizedValue: 15, aliases: ['15mm'] },
      { displayValue: '20', normalizedValue: 20, aliases: ['20mm'] },
      { displayValue: '25', normalizedValue: 25, aliases: ['25mm'] },
      { displayValue: '32', normalizedValue: 32, aliases: ['32mm'] },
      { displayValue: '40', normalizedValue: 40, aliases: ['40mm'] },
      { displayValue: '50', normalizedValue: 50, aliases: ['50mm'] },
      { displayValue: '65', normalizedValue: 65, aliases: ['65mm'] },
      { displayValue: '80', normalizedValue: 80, aliases: ['80mm'] },
      { displayValue: '100', normalizedValue: 100, aliases: ['100mm'] },
      { displayValue: '125', normalizedValue: 125, aliases: ['125mm'] },
      { displayValue: '150', normalizedValue: 150, aliases: ['150mm'] },
      { displayValue: '200', normalizedValue: 200, aliases: ['200mm'] },
      { displayValue: '250', normalizedValue: 250, aliases: ['250mm'] },
      { displayValue: '300', normalizedValue: 300, aliases: ['300mm'] },
      { displayValue: '400', normalizedValue: 400, aliases: ['400mm'] },
      { displayValue: '500', normalizedValue: 500, aliases: ['500mm'] },
      { displayValue: '600', normalizedValue: 600, aliases: ['600mm'] },
      { displayValue: '800', normalizedValue: 800, aliases: ['800mm'] },
      { displayValue: '1000', normalizedValue: 1000, aliases: ['1000mm', '1m'] },
      { displayValue: '1200', normalizedValue: 1200, aliases: ['1200mm'] }
    ]
  },
  {
    code: 'CM',
    name: 'Centimeters',
    abbreviation: 'cm',
    symbol: 'cm',
    system: 'metric',
    category: 'length',
    conversionFactor: 0.393701, // 1 cm = 0.393701 inches
    baseUnit: 'MM',
    usedFor: ['dimension', 'thickness'],
    decimalPlaces: 1,
    displayFormat: 'decimal',
    standardValues: [
      { displayValue: '1', normalizedValue: 1.0, aliases: ['1.0', '1cm'] },
      { displayValue: '2', normalizedValue: 2.0, aliases: ['2.0', '2cm'] },
      { displayValue: '2.5', normalizedValue: 2.5, aliases: ['2.5cm'] },
      { displayValue: '3', normalizedValue: 3.0, aliases: ['3.0', '3cm'] },
      { displayValue: '4', normalizedValue: 4.0, aliases: ['4.0', '4cm'] },
      { displayValue: '5', normalizedValue: 5.0, aliases: ['5.0', '5cm'] },
      { displayValue: '6', normalizedValue: 6.0, aliases: ['6.0', '6cm'] },
      { displayValue: '7.5', normalizedValue: 7.5, aliases: ['7.5cm'] },
      { displayValue: '10', normalizedValue: 10.0, aliases: ['10.0', '10cm'] },
      { displayValue: '15', normalizedValue: 15.0, aliases: ['15.0', '15cm'] },
      { displayValue: '20', normalizedValue: 20.0, aliases: ['20.0', '20cm'] },
      { displayValue: '25', normalizedValue: 25.0, aliases: ['25.0', '25cm'] },
      { displayValue: '30', normalizedValue: 30.0, aliases: ['30.0', '30cm'] },
      { displayValue: '40', normalizedValue: 40.0, aliases: ['40.0', '40cm'] },
      { displayValue: '50', normalizedValue: 50.0, aliases: ['50.0', '50cm'] },
      { displayValue: '60', normalizedValue: 60.0, aliases: ['60.0', '60cm'] },
      { displayValue: '80', normalizedValue: 80.0, aliases: ['80.0', '80cm'] },
      { displayValue: '100', normalizedValue: 100.0, aliases: ['100.0', '100cm', '1m'] },
      { displayValue: '120', normalizedValue: 120.0, aliases: ['120.0', '120cm'] }
    ]
  },
  {
    code: 'M',
    name: 'Meters',
    abbreviation: 'm',
    symbol: 'm',
    system: 'metric',
    category: 'length',
    conversionFactor: 39.3701, // 1 m = 39.3701 inches
    baseUnit: 'MM',
    usedFor: ['length', 'height', 'width'],
    decimalPlaces: 2,
    displayFormat: 'decimal',
    standardValues: [
      { displayValue: '0.5', normalizedValue: 0.5, aliases: ['0.5m'] },
      { displayValue: '1', normalizedValue: 1.0, aliases: ['1.0', '1m'] },
      { displayValue: '1.5', normalizedValue: 1.5, aliases: ['1.5m'] },
      { displayValue: '2', normalizedValue: 2.0, aliases: ['2.0', '2m'] },
      { displayValue: '2.5', normalizedValue: 2.5, aliases: ['2.5m'] },
      { displayValue: '3', normalizedValue: 3.0, aliases: ['3.0', '3m'] },
      { displayValue: '4', normalizedValue: 4.0, aliases: ['4.0', '4m'] },
      { displayValue: '5', normalizedValue: 5.0, aliases: ['5.0', '5m'] },
      { displayValue: '6', normalizedValue: 6.0, aliases: ['6.0', '6m'] },
      { displayValue: '8', normalizedValue: 8.0, aliases: ['8.0', '8m'] },
      { displayValue: '10', normalizedValue: 10.0, aliases: ['10.0', '10m'] },
      { displayValue: '12', normalizedValue: 12.0, aliases: ['12.0', '12m'] },
      { displayValue: '15', normalizedValue: 15.0, aliases: ['15.0', '15m'] },
      { displayValue: '20', normalizedValue: 20.0, aliases: ['20.0', '20m'] },
      { displayValue: '25', normalizedValue: 25.0, aliases: ['25.0', '25m'] },
      { displayValue: '30', normalizedValue: 30.0, aliases: ['30.0', '30m'] }
    ]
  },
  
  // ============================================
  // AREA
  // ============================================
  {
    code: 'SQ_FT',
    name: 'Square Feet',
    abbreviation: 'sq ft',
    symbol: 'ft²',
    system: 'imperial',
    category: 'area',
    conversionFactor: 1,
    baseUnit: 'SQ_FT',
    usedFor: ['area', 'coverage'],
    decimalPlaces: 2,
    displayFormat: 'decimal',
    standardValues: [
      { displayValue: '25', normalizedValue: 25, aliases: ['25sqft'] },
      { displayValue: '50', normalizedValue: 50, aliases: ['50sqft'] },
      { displayValue: '96', normalizedValue: 96, aliases: ['96sqft'] },
      { displayValue: '108', normalizedValue: 108, aliases: ['108sqft'] },
      { displayValue: '128', normalizedValue: 128, aliases: ['128sqft'] },
      { displayValue: '192', normalizedValue: 192, aliases: ['192sqft'] },
      { displayValue: '200', normalizedValue: 200, aliases: ['200sqft'] },
      { displayValue: '240', normalizedValue: 240, aliases: ['240sqft'] },
      { displayValue: '256', normalizedValue: 256, aliases: ['256sqft'] },
      { displayValue: '276', normalizedValue: 276, aliases: ['276sqft'] },
      { displayValue: '280', normalizedValue: 280, aliases: ['280sqft'] },
      { displayValue: '300', normalizedValue: 300, aliases: ['300sqft'] },
      { displayValue: '392', normalizedValue: 392, aliases: ['392sqft'] },
      { displayValue: '400', normalizedValue: 400, aliases: ['400sqft'] },
      { displayValue: '467', normalizedValue: 467, aliases: ['467sqft'] },
      { displayValue: '492', normalizedValue: 492, aliases: ['492sqft'] }
    ]
  },
  {
    code: 'SQ_M',
    name: 'Square Meters',
    abbreviation: 'm²',
    symbol: 'm²',
    system: 'metric',
    category: 'area',
    conversionFactor: 10.7639, // 1 m² = 10.7639 ft²
    baseUnit: 'SQ_M',
    usedFor: ['area', 'coverage'],
    decimalPlaces: 2,
    displayFormat: 'decimal',
    standardValues: [
      { displayValue: '1', normalizedValue: 1.0, aliases: ['1m²'] },
      { displayValue: '2', normalizedValue: 2.0, aliases: ['2m²'] },
      { displayValue: '3', normalizedValue: 3.0, aliases: ['3m²'] },
      { displayValue: '5', normalizedValue: 5.0, aliases: ['5m²'] },
      { displayValue: '10', normalizedValue: 10.0, aliases: ['10m²'] },
      { displayValue: '15', normalizedValue: 15.0, aliases: ['15m²'] },
      { displayValue: '20', normalizedValue: 20.0, aliases: ['20m²'] },
      { displayValue: '25', normalizedValue: 25.0, aliases: ['25m²'] },
      { displayValue: '30', normalizedValue: 30.0, aliases: ['30m²'] },
      { displayValue: '40', normalizedValue: 40.0, aliases: ['40m²'] },
      { displayValue: '50', normalizedValue: 50.0, aliases: ['50m²'] }
    ]
  },
  
  // ============================================
  // WEIGHT
  // ============================================
  {
    code: 'LB',
    name: 'Pounds',
    abbreviation: 'lb',
    symbol: 'lb',
    system: 'imperial',
    category: 'weight',
    conversionFactor: 1,
    baseUnit: 'LB',
    usedFor: ['weight', 'density'],
    decimalPlaces: 2,
    displayFormat: 'decimal',
    standardValues: [
      { displayValue: '0.75', normalizedValue: 0.75, aliases: ['3/4', '0.75lb'] },
      { displayValue: '1', normalizedValue: 1.0, aliases: ['1.0', '1lb'] },
      { displayValue: '1.5', normalizedValue: 1.5, aliases: ['1.5lb'] },
      { displayValue: '2', normalizedValue: 2.0, aliases: ['2.0', '2lb'] },
      { displayValue: '2.25', normalizedValue: 2.25, aliases: ['2.25lb'] },
      { displayValue: '2.5', normalizedValue: 2.5, aliases: ['2.5lb'] },
      { displayValue: '3', normalizedValue: 3.0, aliases: ['3.0', '3lb'] },
      { displayValue: '4', normalizedValue: 4.0, aliases: ['4.0', '4lb'] },
      { displayValue: '5', normalizedValue: 5.0, aliases: ['5.0', '5lb'] },
      { displayValue: '6', normalizedValue: 6.0, aliases: ['6.0', '6lb'] }
    ]
  },
  {
    code: 'KG',
    name: 'Kilograms',
    abbreviation: 'kg',
    symbol: 'kg',
    system: 'metric',
    category: 'weight',
    conversionFactor: 2.20462, // 1 kg = 2.20462 lb
    baseUnit: 'KG',
    usedFor: ['weight', 'density'],
    decimalPlaces: 2,
    displayFormat: 'decimal',
    standardValues: [
      { displayValue: '0.5', normalizedValue: 0.5, aliases: ['0.5kg'] },
      { displayValue: '1', normalizedValue: 1.0, aliases: ['1.0', '1kg'] },
      { displayValue: '2', normalizedValue: 2.0, aliases: ['2.0', '2kg'] },
      { displayValue: '5', normalizedValue: 5.0, aliases: ['5.0', '5kg'] },
      { displayValue: '10', normalizedValue: 10.0, aliases: ['10.0', '10kg'] },
      { displayValue: '15', normalizedValue: 15.0, aliases: ['15.0', '15kg'] },
      { displayValue: '20', normalizedValue: 20.0, aliases: ['20.0', '20kg'] },
      { displayValue: '25', normalizedValue: 25.0, aliases: ['25.0', '25kg'] }
    ]
  },
  
  // ============================================
  // TEMPERATURE
  // ============================================
  {
    code: 'F',
    name: 'Fahrenheit',
    abbreviation: '°F',
    symbol: '°F',
    system: 'imperial',
    category: 'temperature',
    conversionFactor: 1,
    baseUnit: 'F',
    usedFor: ['temperature'],
    decimalPlaces: 0,
    displayFormat: 'decimal',
    standardValues: [
      { displayValue: '0', normalizedValue: 0, aliases: ['0°F'] },
      { displayValue: '32', normalizedValue: 32, aliases: ['32°F'] },
      { displayValue: '40', normalizedValue: 40, aliases: ['40°F'] },
      { displayValue: '100', normalizedValue: 100, aliases: ['100°F'] },
      { displayValue: '150', normalizedValue: 150, aliases: ['150°F'] },
      { displayValue: '200', normalizedValue: 200, aliases: ['200°F'] },
      { displayValue: '250', normalizedValue: 250, aliases: ['250°F'] },
      { displayValue: '300', normalizedValue: 300, aliases: ['300°F'] },
      { displayValue: '350', normalizedValue: 350, aliases: ['350°F'] },
      { displayValue: '400', normalizedValue: 400, aliases: ['400°F'] },
      { displayValue: '500', normalizedValue: 500, aliases: ['500°F'] },
      { displayValue: '600', normalizedValue: 600, aliases: ['600°F'] },
      { displayValue: '700', normalizedValue: 700, aliases: ['700°F'] },
      { displayValue: '850', normalizedValue: 850, aliases: ['850°F'] },
      { displayValue: '1000', normalizedValue: 1000, aliases: ['1000°F'] }
    ]
  },
  {
    code: 'C',
    name: 'Celsius',
    abbreviation: '°C',
    symbol: '°C',
    system: 'metric',
    category: 'temperature',
    conversionFactor: 1.8, // °C to °F: multiply by 1.8 and add 32
    baseUnit: 'C',
    usedFor: ['temperature'],
    decimalPlaces: 0,
    displayFormat: 'decimal',
    standardValues: [
      { displayValue: '0', normalizedValue: 0, aliases: ['0°C'] },
      { displayValue: '10', normalizedValue: 10, aliases: ['10°C'] },
      { displayValue: '20', normalizedValue: 20, aliases: ['20°C'] },
      { displayValue: '50', normalizedValue: 50, aliases: ['50°C'] },
      { displayValue: '100', normalizedValue: 100, aliases: ['100°C'] },
      { displayValue: '150', normalizedValue: 150, aliases: ['150°C'] },
      { displayValue: '200', normalizedValue: 200, aliases: ['200°C'] },
      { displayValue: '250', normalizedValue: 250, aliases: ['250°C'] },
      { displayValue: '300', normalizedValue: 300, aliases: ['300°C'] },
      { displayValue: '400', normalizedValue: 400, aliases: ['400°C'] },
      { displayValue: '500', normalizedValue: 500, aliases: ['500°C'] }
    ]
  },
  
  // ============================================
  // OTHER COMMON UNITS
  // ============================================
  {
    code: 'EA',
    name: 'Each',
    abbreviation: 'ea',
    symbol: 'ea',
    system: 'both',
    category: 'other',
    conversionFactor: 1,
    baseUnit: 'EA',
    usedFor: ['count', 'quantity'],
    decimalPlaces: 0,
    displayFormat: 'decimal'
  },
  {
    code: 'LF',
    name: 'Lineal Feet',
    abbreviation: 'LF',
    symbol: 'LF',
    system: 'imperial',
    category: 'length',
    conversionFactor: 12, // Same as feet
    baseUnit: 'IN',
    usedFor: ['length'],
    decimalPlaces: 2,
    displayFormat: 'decimal',
    standardValues: [
      { displayValue: '3.28', normalizedValue: 3.28, aliases: ['3.28LF'] },
      { displayValue: '4.92', normalizedValue: 4.92, aliases: ['4.92LF'] },
      { displayValue: '6.56', normalizedValue: 6.56, aliases: ['6.56LF'] },
      { displayValue: '8.2', normalizedValue: 8.2, aliases: ['8.2LF'] },
      { displayValue: '9.84', normalizedValue: 9.84, aliases: ['9.84LF'] },
      { displayValue: '11.48', normalizedValue: 11.48, aliases: ['11.48LF'] },
      { displayValue: '13.12', normalizedValue: 13.12, aliases: ['13.12LF'] },
      { displayValue: '16.4', normalizedValue: 16.4, aliases: ['16.4LF'] },
      { displayValue: '19.68', normalizedValue: 19.68, aliases: ['19.68LF'] },
      { displayValue: '22.96', normalizedValue: 22.96, aliases: ['22.96LF'] },
      { displayValue: '27', normalizedValue: 27.0, aliases: ['27LF'] },
      { displayValue: '50', normalizedValue: 50.0, aliases: ['50LF'] },
      { displayValue: '57', normalizedValue: 57.0, aliases: ['57LF'] },
      { displayValue: '69', normalizedValue: 69.0, aliases: ['69LF'] },
      { displayValue: '70', normalizedValue: 70.0, aliases: ['70LF'] },
      { displayValue: '75', normalizedValue: 75.0, aliases: ['75LF'] },
      { displayValue: '100', normalizedValue: 100.0, aliases: ['100LF'] }
    ]
  },
  {
    code: 'GAL',
    name: 'Gallons',
    abbreviation: 'gal',
    symbol: 'gal',
    system: 'imperial',
    category: 'volume',
    conversionFactor: 1,
    baseUnit: 'GAL',
    usedFor: ['volume', 'liquid'],
    decimalPlaces: 2,
    displayFormat: 'decimal'
  },
  {
    code: 'L',
    name: 'Liters',
    abbreviation: 'L',
    symbol: 'L',
    system: 'metric',
    category: 'volume',
    conversionFactor: 0.264172, // 1 L = 0.264172 gal
    baseUnit: 'L',
    usedFor: ['volume', 'liquid'],
    decimalPlaces: 2,
    displayFormat: 'decimal',
    standardValues: [
      { displayValue: '17', normalizedValue: 17, aliases: ['17L'] },
      { displayValue: '18.93', normalizedValue: 18.93, aliases: ['18.93L'] }
    ]
  }
];

async function seedUnitsOfMeasure() {
  const mongoUri = process.env.MONGODB_DEV_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_DEV_URI or MONGODB_URI must be set');
  }
  const dbName = mongoUri.match(/\/\/([^/]+)\/([^?]+)/)?.[2] || 'unknown';
  console.log(`📊 Database: ${dbName}`);
  
  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB');

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  for (const unit of unitsOfMeasure) {
    try {
      const existing = await UnitOfMeasure.findOneAndUpdate(
        { code: unit.code },
        unit,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      if (existing) {
        if (existing.createdAt.getTime() === existing.updatedAt.getTime()) {
          console.log(`✅ Created: ${unit.name} (${unit.code})`);
          createdCount++;
        } else {
          console.log(`🔄 Updated: ${unit.name} (${unit.code})`);
          updatedCount++;
        }
      } else {
        console.log(`✅ Created: ${unit.name} (${unit.code})`);
        createdCount++;
      }
    } catch (error) {
      if (error.code === 11000) {
        console.warn(`⚠️ Skipped (duplicate key): ${unit.code}`);
        skippedCount++;
      } else {
        console.error(`❌ Error seeding ${unit.code}:`, error.message);
      }
    }
  }

  console.log(`\n📊 Summary:\n   Created: ${createdCount}\n   Updated: ${updatedCount}\n   Skipped: ${skippedCount}\n   Total: ${createdCount + updatedCount + skippedCount}\n`);
  console.log('✅ Units of Measure seeding complete!');
}

seedUnitsOfMeasure().then(() => {
  mongoose.disconnect();
}).catch(err => {
  console.error('Seed failed:', err);
  mongoose.disconnect();
});

