/**
 * Fix Distributor/Manufacturer Relationships
 * 
 * This script reviews all imported products and fixes their distributor/manufacturer
 * relationships based on the pricebook CSV files:
 * - IMPRO PRICEBOOK.csv: All products should have IMPRO as distributor
 * - CROSSROADS PRICEBOOK.csv: All products should have Crossroads C&I as distributor
 * 
 * Manufacturers are determined from the sheet/page names in the pricebooks.
 */

require('dotenv').config({ path: '.env.local', override: true });
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Import models
const Company = require('../src/server/models/Company');
const Product = require('../src/server/models/Product');

// Manufacturer name mappings from sheet names
const MANUFACTURER_MAPPINGS = {
  // IMPRO pricebook manufacturers (from sheet names)
  'ELTUA': 'Armacell',
  'ELTUK': 'Armacell',
  'ELTCA': 'Armacell',
  'ELTCK': 'Armacell',
  'ELTLSA': 'Armacell',
  'ELTLSK': 'Armacell',
  'ELRSA': 'Armacell',
  'ELRSK': 'Armacell',
  'ELRSAA': 'Armacell',
  'ELRSAK': 'Armacell',
  'IPSA': 'Armacell',
  'IPSK': 'Armacell',
  'APK': 'Armacell',
  'APX': 'Armacell',
  'CWA': 'Armacell',
  'KWAK': 'Armacell',
  'WFA': 'Armacell',
  'ETBLK': 'Armacell',
  'DFO': 'Armacell',
  'DFK': 'Armacell',
  'CHAR DBL': 'Armacell',
  'CHAR FDBL': 'Armacell',
  'MPR': 'Armacell',
  'EWR': 'Armacell',
  'MPSR': 'Armacell',
  'MX': 'Armacell',
  'RBR': 'Armacell',
  'FM RHT': 'Armacell',
  'FM RW RHM': 'Armacell',
  'FWR': 'Armacell',
  'FM RP FW': 'Armacell',
  'FM CR CUR': 'Armacell',
  'FM AFB': 'Armacell',
  'FM AFBS': 'Armacell',
  'ESLIN': 'Armacell',
  'BASO': 'Armacell',
  'TNS': 'Armacell',
  'ACO': 'Armacell',
  'NS': 'Armacell',
  'POLY': 'Armacell',
  'VENT': 'Armacell',
  'ALRLI': 'Armacell',
  'ALRLJ': 'Armacell',
  'CHAR AL': 'Armacell',
  'ALCRB': 'Armacell',
  'ALCRPEI': 'Armacell',
  'ALCRPEJ': 'Armacell',
  'AL90I': 'Armacell',
  'AL90J': 'Armacell',
  'AL45I': 'Armacell',
  'AL45J': 'Armacell',
  'ALTI': 'Armacell',
  'ALTJ': 'Armacell',
  'ALCI': 'Armacell',
  'ALCJ': 'Armacell',
  'PP': 'Armacell',
  'SSRL': 'Armacell',
  'SSCRJ': 'Armacell',
  'SSCRI': 'Armacell',
  'SS90I': 'Armacell',
  'SS90J': 'Armacell',
  'SS45I': 'Armacell',
  'SS45J': 'Armacell',
  'PVCRL': 'Armacell',
  'PVCCR': 'Armacell',
  'CHAR PVC': 'Armacell',
  'PVCCRSA': 'Armacell',
  'PVC90': 'Armacell',
  'PVC90LR': 'Armacell',
  'PVC9045TVCT': 'Armacell',
  'PVC45': 'Armacell',
  'PVCT': 'Armacell',
  'PVCC': 'Armacell',
  'PVCJ': 'Armacell',
  'PVCB': 'Armacell',
  'MEMB': 'Armacell',
  'MEMBB': 'Armacell',
  'SATGTWF': 'Armacell',
  'MEMBRE': 'Armacell',
  'MEMBAK': 'Armacell',
  'APPBAK': 'Armacell',
  'COA': 'Armacell',
  'COP': 'Armacell',
  'COPO': 'Armacell',
  'SCP': 'Armacell',
  'BAK100': 'Armacell',
  'BAK200': 'Armacell',
  'BAK700800': 'Armacell',
  'PPOLR': 'Armacell',
  'RG2400': 'Armacell',
  'ADHF': 'Armacell',
  '3MF': 'Armacell',
  'ANC': 'Armacell',
  'CLS': 'Armacell',
  'DRI': 'Armacell',
  'RIV': 'Armacell',
  'BAA': 'Armacell',
  'BASS': 'Armacell',
  'RUB': 'Armacell',
  'SEL': 'Armacell',
  'ACCM': 'Armacell',
  'BRO': 'Armacell',
  'PS': 'Armacell',
  'ACC': 'Armacell',
  'OUT': 'Armacell',
  'THBMB': 'Armacell',
  'MISC': 'Armacell',
  'AMIA': 'Armacell',
  'CERAB': 'Armacell',
  'PIRPP': 'Armacell',
  'PIRFP': 'Armacell',
  'PIRF': 'Armacell',
  'SMPP': 'Armacell',
  'SMFP': 'Armacell',
  'SMF': 'Armacell',
  'FGP': 'Armacell',
  'FGF': 'Armacell',
  'FGFI': 'Armacell',
  
  // Crossroads pricebook manufacturers (from page names)
  'FIBREGLASS': 'Johns Manville', // or other fiberglass manufacturers
  'MINERAL WOOL': 'Rockwool', // or Johns Manville
  'CALSIL': 'Calcium Silicate',
  'FOAMGLAS': 'Foamglas',
  'URETHANE': 'Various',
  'ARMAFLEX': 'Armacell',
  'STYROFOAM': 'Dow',
  'NUTEC': 'Nutec',
  'SUPERWOOL': 'Thermal Ceramics',
  'DOW STYROFOAM': 'Dow',
  'METAL BUILDING': 'Various',
  'ALUM': 'Various',
  'ALUMINUM': 'Various',
  'SS': 'Various',
  'PVC': 'Various',
  'HENRY': 'Henry',
  '3M': '3M',
  'NUCO': 'Nuco',
  'ASPEN': 'Aspen Aerogels',
  'DYNAIR': 'Dynair',
  'LEWCO': 'Lewco',
  'BUCKAROO': 'Buckaroo Tools'
};

// Extract manufacturer from page name
function extractManufacturerFromPageName(pageName) {
  if (!pageName) return null;
  
  const upperPageName = pageName.toUpperCase();
  
  // Check for specific manufacturer mentions (most specific first)
  if (upperPageName.includes('JM ') || upperPageName.includes(' JOHNS MANVILLE') || upperPageName.includes('JOHN MANVILLE')) {
    return 'Johns Manville';
  }
  if (upperPageName.includes('ROCKWOOL') || upperPageName.includes('ROCK BOARD')) {
    return 'Rockwool';
  }
  if (upperPageName.includes('ARMACELL') || upperPageName.includes('ARMAFLEX')) {
    return 'Armacell';
  }
  if (upperPageName.includes('K-FLEX') || upperPageName.includes('KFLEX')) {
    return 'K-Flex USA';
  }
  if (upperPageName.includes('DOW') && (upperPageName.includes('STYROFOAM') || upperPageName.includes('HIGHLOAD') || upperPageName.includes('CAVITYMATE'))) {
    return 'Dow';
  }
  if (upperPageName.includes('FOAMGLAS') || upperPageName.includes('FOAM GLAS')) {
    return 'Foamglas';
  }
  if (upperPageName.includes('CALSIL') || upperPageName.includes('CAL SIL') || upperPageName.includes('CALCIUM SILICATE')) {
    return 'Calcium Silicate';
  }
  if (upperPageName.includes('3M')) {
    return '3M';
  }
  if (upperPageName.includes('HENRY')) {
    return 'Henry';
  }
  if (upperPageName.includes('NUTEC')) {
    return 'Nutec';
  }
  if (upperPageName.includes('SUPERWOOL')) {
    return 'Thermal Ceramics';
  }
  if (upperPageName.includes('ASPEN')) {
    return 'Aspen Aerogels';
  }
  if (upperPageName.includes('DYNAIR')) {
    return 'Dynair';
  }
  if (upperPageName.includes('LEWCO')) {
    return 'Lewco';
  }
  if (upperPageName.includes('BUCKAROO')) {
    return 'Buckaroo Tools';
  }
  if (upperPageName.includes('CCI') && upperPageName.includes('MW')) {
    return 'Rockwool'; // CCI MW = Rockwool
  }
  if (upperPageName.includes('FABROCK')) {
    return 'Rockwool';
  }
  if (upperPageName.includes('COMFORT')) {
    return 'Rockwool';
  }
  if (upperPageName.includes('CROSSROCK')) {
    return 'Rockwool';
  }
  if (upperPageName.includes('SAFE')) {
    return 'Rockwool';
  }
  
  // Check section-based mappings (less specific)
  if (upperPageName.includes('FIBREGLASS') || upperPageName.includes('FIBERGLASS')) {
    // Default to Johns Manville for fiberglass unless specified otherwise
    return 'Johns Manville';
  }
  if (upperPageName.includes('MINERAL WOOL') || upperPageName.includes('MIN WOOL') || upperPageName.includes('MIN. WOOL')) {
    // Default to Rockwool for mineral wool unless specified otherwise
    return 'Rockwool';
  }
  
  return null;
}

// Load pricebook mappings
async function loadPricebookMappings() {
  const improSheets = new Set();
  const crossroadsSheets = new Set();
  
  // Load IMPRO pricebook
  const improPath = path.join(__dirname, 'IMPRO PRICEBOOK.csv');
  if (fs.existsSync(improPath)) {
    const content = fs.readFileSync(improPath, 'utf-8');
    const lines = content.split('\n');
    for (let i = 1; i < lines.length; i++) { // Skip header
      const line = lines[i].trim();
      if (line) {
        const match = line.match(/^([^,]+),/);
        if (match && match[1]) {
          improSheets.add(match[1].trim());
        }
      }
    }
  }
  
  // Load Crossroads pricebook
  const crossroadsPath = path.join(__dirname, 'CROSSROADS PRICEBOOK.csv');
  if (fs.existsSync(crossroadsPath)) {
    const content = fs.readFileSync(crossroadsPath, 'utf-8');
    const lines = content.split('\n');
    for (let i = 1; i < lines.length; i++) { // Skip header
      const line = lines[i].trim();
      if (line) {
        const match = line.match(/^([^,]+),/);
        if (match && match[1]) {
          crossroadsSheets.add(match[1].trim());
        }
      }
    }
  }
  
  return { improSheets, crossroadsSheets };
}

// Determine distributor from pricebook metadata
function determineDistributor(product, improSheets, crossroadsSheets) {
  // Check if product has pricebook metadata that matches a sheet name
  const pageName = product.pricebookPageName || '';
  const groupCode = product.pricebookGroupCode || '';
  const pageNumber = product.pricebookPageNumber || '';
  const section = product.pricebookSection || '';
  
  // Crossroads sheets typically have format like "1.1 FIBREGLASS PIPE ASJ LIST" or "1.1 FIBREGLASS PIPE ASJ NET"
  // IMPRO sheets are typically just codes like "ELTUA", "APK", etc.
  
  // Primary check: Crossroads products have page numbers like "1.1", "2.3", etc.
  if (pageNumber && /^\d+\.\d+/.test(pageNumber)) {
    return 'Crossroads C&I';
  }
  
  // Secondary check: Match by group code (IMPRO uses codes like "ELTUA", "APK")
  if (groupCode) {
    const groupCodeUpper = groupCode.toUpperCase().trim();
    if (improSheets.has(groupCodeUpper)) {
      return 'IMPRO';
    }
  }
  
  // Tertiary check: Match page name to Crossroads sheet names
  const pageNameUpper = pageName.toUpperCase();
  for (const sheetName of crossroadsSheets) {
    const sheetNameUpper = sheetName.toUpperCase();
    // Remove "LIST" and "NET" suffixes for matching
    const cleanPageName = pageNameUpper.replace(/\s+(LIST|NET)$/, '').trim();
    const cleanSheetName = sheetNameUpper.replace(/\s+(LIST|NET)$/, '').trim();
    
    // Check if page name contains key parts of sheet name
    if (cleanPageName.includes(cleanSheetName) || cleanSheetName.includes(cleanPageName)) {
      return 'Crossroads C&I';
    }
    
    // Also check if removing page number prefix matches
    const pageNameWithoutNumber = cleanPageName.replace(/^\d+\.\d+\s+/, '');
    if (pageNameWithoutNumber.includes(cleanSheetName) || cleanSheetName.includes(pageNameWithoutNumber)) {
      return 'Crossroads C&I';
    }
  }
  
  // Check if page name matches IMPRO sheet patterns (short codes)
  if (pageName && pageName.length < 10 && !pageName.includes(' ')) {
    if (improSheets.has(pageName.toUpperCase())) {
      return 'IMPRO';
    }
  }
  
  // Default: if no clear match, return null for manual review
  return null;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  
  console.log('🔍 Fixing Distributor/Manufacturer Relationships\n');
  if (dryRun) {
    console.log('⚠️  DRY RUN MODE - No changes will be saved\n');
  }
  
  // Connect to database
  const mongoUri = process.env.MONGODB_DEV_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_DEV_URI or MONGODB_URI environment variable is not set');
  }
  
  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 5000,
  });
  console.log('✅ Connected to database\n');
  
  // Load pricebook mappings
  console.log('📚 Loading pricebook mappings...');
  const { improSheets, crossroadsSheets } = await loadPricebookMappings();
  console.log(`   IMPRO sheets: ${improSheets.size}`);
  console.log(`   Crossroads sheets: ${crossroadsSheets.size}\n`);
  
  // Get or create distributors
  console.log('🏢 Setting up distributors...');
  const improDistributor = await Company.findOneAndUpdate(
    { name: 'IMPRO', companyType: 'distributor' },
    {
      name: 'IMPRO',
      companyType: 'distributor',
      isActive: true
    },
    { upsert: true, new: true }
  );
  console.log(`   ✅ IMPRO: ${improDistributor._id}`);
  
  const crossroadsDistributor = await Company.findOneAndUpdate(
    { name: { $regex: /crossroads/i }, companyType: 'distributor' },
    {
      name: 'Crossroads C&I',
      companyType: 'distributor',
      isActive: true
    },
    { upsert: true, new: true }
  );
  console.log(`   ✅ Crossroads C&I: ${crossroadsDistributor._id}\n`);
  
  // Get all products
  console.log('📦 Loading products...');
  const products = await Product.find({ isActive: true })
    .populate('manufacturerId', 'name')
    .populate('distributorId', 'name')
    .lean();
  console.log(`   Found ${products.length} products\n`);
  
  // Track changes
  const stats = {
    total: products.length,
    fixedDistributor: 0,
    fixedManufacturer: 0,
    fixedSupplierEntries: 0,
    createdRelationships: 0,
    needsReview: []
  };
  
  // Process each product
  console.log('🔧 Processing products...\n');
  
  for (const product of products) {
    let updated = false;
    const updates = {};
    const productUpdates = {};
    
    // Determine correct distributor
    const correctDistributorName = determineDistributor(product, improSheets, crossroadsSheets);
    let correctDistributor = null;
    
    if (correctDistributorName === 'IMPRO') {
      correctDistributor = improDistributor;
    } else if (correctDistributorName === 'Crossroads C&I') {
      correctDistributor = crossroadsDistributor;
    }
    
    // Determine manufacturer from page name or group code
    let manufacturerName = extractManufacturerFromPageName(product.pricebookPageName);
    
    // For IMPRO products, check group code against manufacturer mappings
    if (!manufacturerName && correctDistributorName === 'IMPRO' && product.pricebookGroupCode) {
      const groupCode = product.pricebookGroupCode.toUpperCase().trim();
      manufacturerName = MANUFACTURER_MAPPINGS[groupCode] || null;
    }
    
    // If still no manufacturer found but product already has one, keep it
    if (!manufacturerName && product.manufacturerId && product.manufacturerId.name) {
      manufacturerName = product.manufacturerId.name;
    }
    
    let manufacturer = null;
    if (manufacturerName) {
      manufacturer = await Company.findOneAndUpdate(
        { name: manufacturerName, companyType: 'supplier' },
        {
          name: manufacturerName,
          companyType: 'supplier',
          isActive: true
        },
        { upsert: true, new: true }
      );
    }
    
    // Check if distributor needs fixing
    if (correctDistributor) {
      const currentDistributorId = product.distributorId ? product.distributorId._id.toString() : null;
      const correctDistributorId = correctDistributor._id.toString();
      
      if (currentDistributorId !== correctDistributorId) {
        productUpdates.distributorId = correctDistributor._id;
        stats.fixedDistributor++;
        updated = true;
      }
    } else {
      stats.needsReview.push({
        productId: product._id,
        productName: product.name,
        reason: 'Could not determine distributor from pricebook metadata'
      });
    }
    
    // Check if manufacturer needs fixing
    if (manufacturer) {
      const currentManufacturerId = product.manufacturerId ? product.manufacturerId._id.toString() : null;
      const correctManufacturerId = manufacturer._id.toString();
      
      if (currentManufacturerId !== correctManufacturerId) {
        productUpdates.manufacturerId = manufacturer._id;
        stats.fixedManufacturer++;
        updated = true;
      }
      
      // Create distributor-supplier relationship
      if (correctDistributor) {
        const distributor = await Company.findById(correctDistributor._id);
        if (distributor && distributor.companyType === 'distributor') {
          if (!distributor.distributorSuppliers) {
            distributor.distributorSuppliers = [];
          }
          
          const hasRelationship = distributor.distributorSuppliers.some(
            ds => ds.supplierId.toString() === manufacturer._id.toString()
          );
          
          if (!hasRelationship) {
            distributor.distributorSuppliers.push({
              supplierId: manufacturer._id,
              isActive: true,
              addedDate: new Date()
            });
            if (!dryRun) {
              await distributor.save();
            }
            stats.createdRelationships++;
          }
        }
      }
    }
    
    // Fix supplier entries
    if (correctDistributor && manufacturer) {
      const supplierEntries = product.suppliers || [];
      let supplierEntryFixed = false;
      
      // Find or create supplier entry for correct distributor
      const supplierEntryIndex = supplierEntries.findIndex(
        s => s.distributorId && s.distributorId.toString() === correctDistributor._id.toString()
      );
      
      if (supplierEntryIndex >= 0) {
        // Update existing entry
        const entry = supplierEntries[supplierEntryIndex];
        if (!entry.manufacturerId || entry.manufacturerId.toString() !== manufacturer._id.toString()) {
          supplierEntries[supplierEntryIndex] = {
            ...entry,
            manufacturerId: manufacturer._id,
            distributorId: correctDistributor._id
          };
          supplierEntryFixed = true;
          stats.fixedSupplierEntries++;
        }
      } else {
        // Add new entry
        supplierEntries.push({
          distributorId: correctDistributor._id,
          manufacturerId: manufacturer._id,
          listPrice: product.pricing?.listPrice || null,
          netPrice: product.pricing?.netPrice || null,
          discountPercent: product.pricing?.discountPercent || null,
          isPreferred: true
        });
        supplierEntryFixed = true;
        stats.fixedSupplierEntries++;
      }
      
      if (supplierEntryFixed) {
        productUpdates.suppliers = supplierEntries;
        updated = true;
      }
    }
    
    // Apply updates
    if (updated && !dryRun) {
      await Product.updateOne(
        { _id: product._id },
        { $set: productUpdates }
      );
    }
    
    // Progress indicator
    if ((products.indexOf(product) + 1) % 100 === 0) {
      process.stdout.write(`   Processed ${products.indexOf(product) + 1}/${products.length}...\r`);
    }
  }
  
  console.log(`\n✅ Processing complete!\n`);
  
  // Print statistics
  console.log('📊 Statistics:');
  console.log(`   Total products: ${stats.total}`);
  console.log(`   Fixed distributor: ${stats.fixedDistributor}`);
  console.log(`   Fixed manufacturer: ${stats.fixedManufacturer}`);
  console.log(`   Fixed supplier entries: ${stats.fixedSupplierEntries}`);
  console.log(`   Created relationships: ${stats.createdRelationships}`);
  console.log(`   Needs review: ${stats.needsReview.length}`);
  
  if (stats.needsReview.length > 0) {
    console.log('\n⚠️  Products needing manual review:');
    stats.needsReview.slice(0, 10).forEach(item => {
      console.log(`   - ${item.productName} (${item.reason})`);
    });
    if (stats.needsReview.length > 10) {
      console.log(`   ... and ${stats.needsReview.length - 10} more`);
    }
  }
  
  await mongoose.disconnect();
  console.log('\n✅ Done!');
}

main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});

