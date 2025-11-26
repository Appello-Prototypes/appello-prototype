/**
 * Import Pricebook Sheet - One Sheet at a Time
 * 
 * Processes a single sheet from the pricebook Google Sheets document.
 * Tracks progress and tests after each import.
 * 
 * Usage:
 *   node scripts/import-pricebook-sheet.js [sheet-name] [gid]
 * 
 * Example:
 *   node scripts/import-pricebook-sheet.js "FIBREGLASS PIPE WITH ASJ" 241638048
 */

require('dotenv').config({ path: '.env.local', override: true });
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Import models
const Company = require('../src/server/models/Company');
const Product = require('../src/server/models/Product');
const ProductType = require('../src/server/models/ProductType');
const Discount = require('../src/server/models/Discount');

/**
 * Get or create IMPRO distributor
 */
async function getImportDistributor() {
  return await Company.findOneAndUpdate(
    { name: 'IMPRO', companyType: 'distributor' },
    {
      name: 'IMPRO',
      companyType: 'distributor',
      isActive: true
    },
    { upsert: true, new: true }
  );
}

/**
 * Find or create product by manufacturer + name (ensures uniqueness across distributors)
 * This is the key function for multi-distributor support - same product from different
 * distributors will share the same product record, with separate pricing in suppliers array
 */
async function findOrCreateProductByManufacturer(productData, manufacturer, distributor) {
  const { name, description, productTypeId, pricebookSection, pricebookPageNumber, pricebookPageName, pricebookGroupCode, unitOfMeasure } = productData;
  
  // Build query: find by manufacturer + name (ensures uniqueness)
  const query = {
    name: name
  };
  
  // Include manufacturerId in query if available (key for uniqueness)
  if (manufacturer && manufacturer._id) {
    query.manufacturerId = manufacturer._id;
  }
  
  // Find existing product
  let product = await Product.findOne(query);
  
  if (product) {
    // Product exists - update primary distributor and merge supplier entry
    product.distributorId = distributor._id; // Set as primary (most recent)
    if (manufacturer && manufacturer._id) {
      product.manufacturerId = manufacturer._id;
    }
    
    // Update other fields if provided
    if (description) product.description = description;
    if (productTypeId) product.productTypeId = productTypeId;
    if (pricebookSection !== undefined) product.pricebookSection = pricebookSection;
    if (pricebookPageNumber !== undefined) product.pricebookPageNumber = pricebookPageNumber;
    if (pricebookPageName) product.pricebookPageName = pricebookPageName;
    if (pricebookGroupCode) product.pricebookGroupCode = pricebookGroupCode;
    if (unitOfMeasure) product.unitOfMeasure = unitOfMeasure;
    
    // Check if supplier entry for this distributor already exists
    const existingSupplierIndex = product.suppliers.findIndex(
      s => s.distributorId && s.distributorId.toString() === distributor._id.toString()
    );
    
    if (existingSupplierIndex >= 0) {
      // Update existing supplier entry
      const existingSupplier = product.suppliers[existingSupplierIndex].toObject();
      product.suppliers[existingSupplierIndex] = {
        ...existingSupplier,
        distributorId: distributor._id,
        manufacturerId: manufacturer ? manufacturer._id : existingSupplier.manufacturerId,
        ...productData.supplierEntry // Merge new data
      };
    } else {
      // Add new supplier entry (don't replace existing ones)
      product.suppliers.push({
        distributorId: distributor._id,
        manufacturerId: manufacturer ? manufacturer._id : null,
        ...productData.supplierEntry
      });
    }
    
    await product.save();
  } else {
    // Product doesn't exist - create new one
    product = await Product.create({
      name,
      description,
      productTypeId,
      manufacturerId: manufacturer ? manufacturer._id : null,
      distributorId: distributor._id,
      suppliers: [{
        distributorId: distributor._id,
        manufacturerId: manufacturer ? manufacturer._id : null,
        ...productData.supplierEntry
      }],
      pricebookSection,
      pricebookPageNumber,
      pricebookPageName,
      pricebookGroupCode,
      unitOfMeasure: unitOfMeasure || 'EA',
      isActive: true
    });
  }
  
  return product;
}

/**
 * Merge variant supplier entry - adds or updates distributor pricing for a variant
 * Returns the updated variant object (for Mongoose subdocuments)
 */
function mergeVariantSupplierEntry(variant, distributorId, manufacturerId, supplierEntry) {
  // Convert variant suppliers to array if needed
  if (!variant.suppliers) {
    variant.suppliers = [];
  }
  
  // Find existing supplier entry for this distributor
  const existingIndex = variant.suppliers.findIndex(
    s => s.distributorId && s.distributorId.toString() === distributorId.toString()
  );
  
  if (existingIndex >= 0) {
    // Update existing entry
    const existing = variant.suppliers[existingIndex].toObject ? 
      variant.suppliers[existingIndex].toObject() : 
      variant.suppliers[existingIndex];
    variant.suppliers[existingIndex] = {
      ...existing,
      distributorId,
      manufacturerId,
      ...supplierEntry
    };
  } else {
    // Add new entry
    variant.suppliers.push({
      distributorId,
      manufacturerId,
      ...supplierEntry
    });
  }
  
  return variant;
}

/**
 * Create or update distributor-supplier relationship
 * This tracks which suppliers (manufacturers) each distributor works with
 */
async function createDistributorSupplierRelationship(distributorId, supplierId) {
  const distributor = await Company.findById(distributorId);
  if (!distributor || distributor.companyType !== 'distributor') {
    return;
  }

  const supplier = await Company.findById(supplierId);
  if (!supplier || supplier.companyType !== 'supplier') {
    return;
  }

  // Check if relationship already exists
  if (!distributor.distributorSuppliers) {
    distributor.distributorSuppliers = [];
  }

  const existingRelationship = distributor.distributorSuppliers.find(
    ds => ds.supplierId.toString() === supplierId.toString()
  );

  if (!existingRelationship) {
    distributor.distributorSuppliers.push({
      supplierId: supplierId,
      isActive: true,
      addedDate: new Date()
    });
    await distributor.save();
  } else if (!existingRelationship.isActive) {
    existingRelationship.isActive = true;
    await distributor.save();
  }
}

/**
 * Extract manufacturer name from sheet data
 * Looks for "Supplier" field in sheet metadata rows
 */
function extractManufacturerFromSheet(data) {
  // Look for rows with "Supplier" label
  for (let i = 0; i < Math.min(20, data.length); i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;
    
    const rowText = row.map(c => String(c).toLowerCase()).join(' ');
    
    // Check if this row contains "Supplier" label
    if (rowText.includes('supplier')) {
      // Find the value after "Supplier" (usually in next column or same row)
      for (let j = 0; j < row.length; j++) {
        const cell = String(row[j] || '').toLowerCase().trim();
        if (cell === 'supplier' && j + 1 < row.length) {
          const manufacturerName = String(row[j + 1] || '').trim();
          if (manufacturerName && manufacturerName !== '' && manufacturerName !== 'supplier') {
            return manufacturerName;
          }
        }
      }
      
      // Also check if supplier name is in the row itself
      for (let j = 0; j < row.length; j++) {
        const cell = String(row[j] || '').trim();
        // Skip empty cells and common labels
        if (cell && cell !== '' && 
            !cell.toLowerCase().includes('supplier') &&
            !cell.toLowerCase().includes('category') &&
            !cell.toLowerCase().includes('class') &&
            cell.length > 2) {
          // Check if this looks like a company name (not a label)
          if (!cell.toLowerCase().includes('description') &&
              !cell.toLowerCase().includes('discount') &&
              !cell.match(/^\d+\.?\d*%?$/)) {
            return cell;
          }
        }
      }
    }
  }
  
  return null;
}

/**
 * Get or create manufacturer company
 */
async function getOrCreateManufacturer(manufacturerName) {
  if (!manufacturerName || manufacturerName.trim() === '') {
    return null;
  }
  
  const cleanName = manufacturerName.trim();
  
  // Manufacturers are suppliers who make products
  return await Company.findOneAndUpdate(
    { 
      name: cleanName,
      companyType: 'supplier'
    },
    {
      name: cleanName,
      companyType: 'supplier',
      isActive: true
    },
    { upsert: true, new: true }
  );
}

// Progress tracking file
const PROGRESS_FILE = path.join(__dirname, 'pricebook-import-progress.json');

// Load progress
function loadProgress() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    }
  } catch (error) {
    console.warn('⚠️  Could not load progress file:', error.message);
  }
  return {
    completed: [],
    failed: [],
    lastUpdated: null
  };
}

// Save progress
function saveProgress(progress) {
  try {
    progress.lastUpdated = new Date().toISOString();
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
  } catch (error) {
    console.error('❌ Could not save progress:', error.message);
  }
}

// Mark sheet as completed
function markCompleted(sheetName, result) {
  const progress = loadProgress();
  if (!progress.completed.find(s => s.name === sheetName)) {
    progress.completed.push({
      name: sheetName,
      completedAt: new Date().toISOString(),
      result: result
    });
    saveProgress(progress);
  }
}

// Mark sheet as failed
function markFailed(sheetName, error) {
  const progress = loadProgress();
  if (!progress.failed.find(s => s.name === sheetName)) {
    progress.failed.push({
      name: sheetName,
      failedAt: new Date().toISOString(),
      error: error.message || String(error)
    });
    saveProgress(progress);
  }
}

/**
 * Fetch sheet data from Google Sheets
 * Supports: data file, command-line JSON, or Google Sheets API
 */
async function fetchSheetData(sheetName, gid, providedData = null) {
  const spreadsheetId = '1qneee4diiEOsfEs9XS06AR0JImZZ9QSFMxz1lOiHjOM';
  
  console.log(`📊 Fetching sheet: ${sheetName}`);
  console.log(`   Spreadsheet ID: ${spreadsheetId}`);
  if (gid) console.log(`   Sheet GID: ${gid}`);
  
  // If data provided directly (from command line or function call)
  if (providedData) {
    console.log(`   ✅ Using provided data (${providedData.length} rows)`);
    return providedData;
  }
  
  // Check if data file exists (for manual data input)
  const dataFile = path.join(__dirname, `sheet-data-${sheetName.replace(/[^a-zA-Z0-9]/g, '_')}.json`);
  if (fs.existsSync(dataFile)) {
    console.log(`   📁 Loading data from file: ${dataFile}`);
    return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  }
  
  // If no data file, return empty and prompt user
  console.log(`\n⚠️  No data file found. Options:`);
  console.log(`   1. Create ${dataFile} with sheet data as JSON array`);
  console.log(`   2. Provide data via command line: --data '[[row1], [row2]]'`);
  console.log(`   3. Use Google Workspace MCP tool to fetch data\n`);
  
  throw new Error(`Sheet data not found. Please create ${dataFile} with the sheet data as a JSON array of rows, or provide data via --data flag.`);
}

/**
 * Analyze sheet structure to determine format
 */
function analyzeSheetStructure(data) {
  if (!data || data.length === 0) {
    throw new Error('Sheet is empty');
  }

  // Look for common patterns
  const analysis = {
    hasHeaders: false,
    headerRow: null,
    dataStartRow: 0,
    columns: [],
    format: 'unknown'
  };

  // Check rows for headers (look further down for fitting sheets and duct liners)
  for (let i = 0; i < Math.min(35, data.length); i++) {
    const row = data[i];
    if (row && row.length > 0) {
      const rowText = row.map(c => String(c).toLowerCase()).join(' ');
      
      // For elastomeric pipe insulation, look for "INTERIOR DIAMETER" + "COPPER TUBE SIZE" (high priority)
      const isElastomericHeader = rowText.includes('interior diameter') && rowText.includes('copper tube size');
      
      if (isElastomericHeader) {
        analysis.hasHeaders = true;
        analysis.headerRow = i;
        // Data starts 3 rows later (after header, codes row, and sub-header row)
        analysis.dataStartRow = i + 3;
        analysis.columns = row;
        break;
      }
      
      // For fitting matrix, look for "NOMINAL PIPE SIZE" specifically
      const isFittingHeader = rowText.includes('nominal') && rowText.includes('pipe') && rowText.includes('size');
      
      if (isFittingHeader) {
        analysis.hasHeaders = true;
        analysis.headerRow = i;
        analysis.dataStartRow = i + 1;
        analysis.columns = row;
        break;
      }
      
      // For board format, look for "PRODUCT" in first column AND "THICKNESS" (with or without "INSULATION")
      const firstCell = String(row[0] || '').toLowerCase();
      const isBoardHeader = firstCell.includes('product') && 
                            (rowText.includes('insulation thickness') || rowText.includes('thickness')) &&
                            (rowText.includes('sq.ft') || rowText.includes('sq ft') || rowText.includes('bundle')) &&
                            rowText.includes('price');
      
      if (isBoardHeader) {
        analysis.hasHeaders = true;
        analysis.headerRow = i;
        analysis.dataStartRow = i + 1;
        analysis.columns = row;
        break;
      }
      
      // For OEM format, look for "THICKNESS" header with "DIMENSIONS" and "SQ.FT. PER"
      const isOemHeader = rowText.includes('thickness') && 
                          rowText.includes('dimension') &&
                          (rowText.includes('sq.ft. per') || rowText.includes('sq ft per')) &&
                          rowText.includes('price per');
      
      if (isOemHeader) {
        analysis.hasHeaders = true;
        analysis.headerRow = i;
        analysis.dataStartRow = i + 1;
        analysis.columns = row;
        break;
      }
      
      // For duct liner, look for "ROLL THICKNESS" specifically (check first cell)
      const firstCellDuct = String(row[0] || '').toLowerCase();
      const isDuctLinerHeader = firstCellDuct.includes('roll thickness') && 
                                 rowText.includes('dimension') &&
                                 (rowText.includes('price per') || rowText.includes('sq.ft') || rowText.includes('sq ft'));
      
      if (isDuctLinerHeader) {
        analysis.hasHeaders = true;
        analysis.headerRow = i;
        analysis.dataStartRow = i + 1;
        analysis.columns = row;
        break;
      }
      
      // For pipe & tank wrap format, look for "PRODUCT" + "THICKNESS" + "DIMENSIONS" + "PRICE PER"
      const isPipeTankWrapHeader = rowText.includes('product') && 
                                    rowText.includes('thickness') &&
                                    rowText.includes('dimension') &&
                                    (rowText.includes('price per') || rowText.includes('price/sq'));
      
      if (isPipeTankWrapHeader) {
        analysis.hasHeaders = true;
        analysis.headerRow = i;
        analysis.dataStartRow = i + 1;
        analysis.columns = row;
        break;
      }
      
      // Check if this looks like a header row (but not if it's just a title or description)
      // Must have multiple non-empty cells that look like column headers
      // Exclude rows that are clearly descriptions (contain "designed", "manufactured", "available", etc.)
      const isDescription = rowText.includes('designed') || 
                            rowText.includes('manufactured') || 
                            rowText.includes('available') ||
                            rowText.includes('johns manville') ||
                            (rowText.length > 200); // Long text is likely description
      
      if (!isDescription) {
        const nonEmptyCells = row.filter(cell => cell && String(cell).trim() !== '').length;
        const hasTextHeaders = nonEmptyCells >= 3 && row.some(cell => 
          typeof cell === 'string' && 
          (cell.toLowerCase().includes('copper') || 
           cell.toLowerCase().includes('iron') ||
           (cell.toLowerCase().includes('diameter') && cell.toLowerCase().includes('pipe')) ||
           (cell.toLowerCase().includes('thickness') && cell.toLowerCase().includes('insulation')))
        );
        
        // Check for mineral wool pipe format with simpler structure (PIPE DIAMETER + PRICE PER LINEAL FOOT)
        const isMineralWoolSimple = row.some(cell => 
          typeof cell === 'string' && 
          cell.toLowerCase().includes('pipe diameter')
        ) && row.some(cell => 
          typeof cell === 'string' && 
          cell.toLowerCase().includes('price per lineal foot')
        );
        
        if ((hasTextHeaders || isMineralWoolSimple) && !analysis.hasHeaders) {
          analysis.hasHeaders = true;
          analysis.headerRow = i;
          // For mineral wool simple format, data starts after thickness row (2-3 rows later)
          // We'll set dataStartRow after finding thickness row
          analysis.columns = row;
          if (!isMineralWoolSimple) {
            analysis.dataStartRow = i + 1;
            break;
          }
        }
        
        // If we found mineral wool simple format header, look for thickness row
        if (isMineralWoolSimple && analysis.hasHeaders && i === analysis.headerRow + 2) {
          const hasThicknessValues = row && row.some(cell => {
            const cellStr = String(cell).trim();
            return cellStr.match(/^\d+["']?$/) || cellStr.match(/^\d+\s*-\s*\d+\/\d+["']?$/);
          });
          if (hasThicknessValues) {
            analysis.dataStartRow = i + 1;
            break;
          }
        }
      }
    }
  }

  // Determine format based on structure
  if (analysis.columns.length > 0) {
    const headers = analysis.columns.map(h => String(h).toLowerCase());
    
    // Pipe insulation format (copper/iron diameter columns + thickness price columns)
    if (headers.some(h => h.includes('copper')) && headers.some(h => h.includes('iron'))) {
      analysis.format = 'pipe-insulation';
    }
    // Mineral wool pipe format (pipe diameter rows × insulation thickness columns)
    // Can have LF/BOX and PRICE/LF sub-columns OR just prices directly
    else if (headers.some(h => h.includes('pipe diameter')) && 
             (headers.some(h => h.includes('price per lineal foot')) || 
              headers.some(h => h.includes('lf') || h.includes('price')))) {
      // Verify by checking next few rows for thickness pattern
      let hasThicknessPattern = false;
      for (let i = analysis.headerRow + 1; i < Math.min(analysis.headerRow + 4, data.length); i++) {
        const nextRow = data[i];
        if (nextRow && nextRow.some(cell => {
          const cellStr = String(cell).trim();
          return cellStr.match(/^\d+["']?$/) || cellStr.match(/^\d+\s*-\s*\d+\/\d+["']?$/);
        })) {
          hasThicknessPattern = true;
          break;
        }
      }
      if (hasThicknessPattern) {
        analysis.format = 'mineral-wool-pipe';
      }
    }
    // Fitting matrix format (pipe size as rows, wall thickness as columns)
    else if (headers.some(h => h.includes('nominal') || h.includes('pipe size')) && 
             headers.length > 5 && headers.some(h => h.match(/["']?\d/))) {
      analysis.format = 'fitting-matrix';
    }
    // Board format (product name rows followed by thickness rows) - check before generic matrix
    else if (headers.some(h => h.includes('product')) && 
             (headers.some(h => h.includes('insulation thickness')) || headers.some(h => h.includes('thickness'))) &&
             (headers.some(h => h.includes('sq.ft') || h.includes('sq ft')) || headers.some(h => h.includes('bundle'))) &&
             headers.some(h => h.includes('price'))) {
      analysis.format = 'board';
    }
    // OEM format (thickness header with dimensions, sq.ft per sheet/roll) - check before duct-liner
    else if (headers.some(h => h.includes('thickness')) && 
             headers.some(h => h.includes('dimension')) &&
             (headers.some(h => h.includes('sq.ft. per') || h.includes('sq ft per')) || 
              headers.some(h => h.includes('sheet') || h.includes('roll'))) &&
             headers.some(h => h.includes('price per'))) {
      analysis.format = 'board'; // Use same handler
    }
    // Duct liner format (thickness × dimensions table)
    else if (headers.some(h => h.includes('roll thickness') || h.includes('thickness')) && 
             headers.some(h => h.includes('dimension')) &&
             headers.some(h => h.includes('price per'))) {
      analysis.format = 'duct-liner';
    }
    // Pipe & tank wrap format (PRODUCT + THICKNESS + DIMENSIONS + PRICE PER)
    else if (headers.some(h => h.includes('product')) && 
             headers.some(h => h.includes('thickness')) &&
             headers.some(h => h.includes('dimension')) &&
             headers.some(h => h.includes('price per'))) {
      analysis.format = 'duct-liner'; // Use same handler
    }
    // HVAC board format (similar to duct liner but with different headers)
    else if ((headers.some(h => h.includes('thickness')) || headers.some(h => h.includes('dimension'))) && 
             headers.some(h => h.includes('sq.ft') || h.includes('sq ft')) &&
             headers.some(h => h.includes('price per'))) {
      analysis.format = 'duct-liner'; // Use same handler
    }
    // Simple table format (product name, size, price)
    else if (headers.some(h => h.includes('product') || h.includes('name')) && 
             headers.some(h => h.includes('price'))) {
      analysis.format = 'simple-table';
    }
    // Elastomeric pipe insulation format (Interior Diameter + Copper Tube Size + thickness columns with List/NET/lf-ctn)
    else if (headers.some(h => h.includes('interior diameter')) && 
             headers.some(h => h.includes('copper tube size')) &&
             headers.some(h => h.match(/["']?\d+\/?\d*["']?/))) {
      // Check if next row has thickness values (like "3/8''", "1/2''")
      const nextRow = data[analysis.headerRow + 1];
      if (nextRow && nextRow.some(cell => {
        const cellStr = String(cell).trim();
        return cellStr.match(/^\d+\/?\d*["']?$/) || cellStr.match(/^\d+\s*-\s*\d+\/\d+["']?$/);
      })) {
        analysis.format = 'elastomeric-pipe-insulation';
      }
    }
    // Matrix format (sizes as rows, thicknesses as columns) - generic fallback
    else if (headers.length > 5 && headers.some(h => h.match(/\d/))) {
      analysis.format = 'matrix';
    }
  }

  return analysis;
}

/**
 * Process pipe insulation format sheet
 */
async function processPipeInsulationSheet(data, analysis, sheetInfo) {
  const { groupCode, section, pageNumber, pageName, discountPercent } = sheetInfo;
  
  // Get IMPRO distributor
  const distributor = await getImportDistributor();
  
  // Extract manufacturer from sheet
  const manufacturerName = extractManufacturerFromSheet(data);
  const manufacturer = manufacturerName ? await getOrCreateManufacturer(manufacturerName) : null;
  
  // Create distributor-supplier relationship if manufacturer exists
  if (manufacturer && distributor) {
    await createDistributorSupplierRelationship(distributor._id, manufacturer._id);
  }
  
  // For backward compatibility, supplier = distributor (who we buy from)
  const supplier = distributor;

  // Get or create product type
  const productType = await ProductType.findOneAndUpdate(
    { slug: 'pipe-insulation' },
    {
      name: 'Pipe Insulation',
      slug: 'pipe-insulation',
      description: 'Fiberglass pipe insulation',
      properties: [
        { key: 'pipeType', label: 'Pipe Type', type: 'enum', options: [
          { label: 'Copper', value: 'copper' },
          { label: 'Iron', value: 'iron' }
        ]},
        { key: 'pipeDiameter', label: 'Pipe Diameter', type: 'string' },
        { key: 'insulationThickness', label: 'Insulation Thickness', type: 'string' }
      ],
      variantSettings: {
        variantProperties: ['pipeType', 'pipeDiameter', 'insulationThickness']
      }
    },
    { upsert: true, new: true }
  );

  // Extract data rows (skip header)
  const dataRows = data.slice(analysis.dataStartRow);
  
  // Parse thicknesses from header (columns after copper/iron)
  const thicknessColumns = [];
  for (let i = 2; i < analysis.columns.length; i++) {
    const header = String(analysis.columns[i] || '').trim();
    if (header && header.match(/\d/)) {
      thicknessColumns.push({ index: i, thickness: header });
    }
  }

  const variants = [];
  
  // Process each data row
  for (const row of dataRows) {
    if (!row || row.length < 2) continue;
    
    const copperDiameter = String(row[0] || '').trim();
    const ironDiameter = String(row[1] || '').trim();
    
    // Process copper pipe variants
    if (copperDiameter && copperDiameter !== '-' && copperDiameter !== '') {
      for (const thicknessCol of thicknessColumns) {
        const priceStr = String(row[thicknessCol.index] || '').trim();
        if (priceStr && priceStr !== '-' && priceStr !== '') {
          const price = parseFloat(priceStr);
          if (!isNaN(price) && price > 0) {
            variants.push({
              pipeType: 'copper',
              pipeDiameter: copperDiameter,
              insulationThickness: thicknessCol.thickness,
              listPrice: price
            });
          }
        }
      }
    }
    
    // Process iron pipe variants
    if (ironDiameter && ironDiameter !== '-' && ironDiameter !== '') {
      for (const thicknessCol of thicknessColumns) {
        const priceStr = String(row[thicknessCol.index] || '').trim();
        if (priceStr && priceStr !== '-' && priceStr !== '') {
          const price = parseFloat(priceStr);
          if (!isNaN(price) && price > 0) {
            variants.push({
              pipeType: 'iron',
              pipeDiameter: ironDiameter,
              insulationThickness: thicknessCol.thickness,
              listPrice: price
            });
          }
        }
      }
    }
  }

  if (variants.length === 0) {
    throw new Error('No valid variants found in sheet');
  }

  // Create or update product using multi-distributor helper
  const productName = pageName || `Product from ${sheetInfo.pageNumber || 'unknown'}`;
  
  const product = await findOrCreateProductByManufacturer(
    {
      name: productName,
      description: `Product from ${pageName}${manufacturer ? ` by ${manufacturer.name}` : ''}`,
      productTypeId: productType._id,
      pricebookSection: section,
      pricebookPageNumber: pageNumber,
      pricebookPageName: pageName,
      pricebookGroupCode: groupCode,
      unitOfMeasure: 'FT',
      supplierEntry: {
        listPrice: null, // Variant-specific pricing
        isPreferred: true
      }
    },
    manufacturer,
    distributor
  );

  // Process variants - merge supplier entries instead of replacing
  const newVariants = [];
  
  for (const v of variants) {
    const variantName = `${v.pipeDiameter}" ${v.pipeType === 'copper' ? 'Copper' : 'Iron'} Pipe - ${v.insulationThickness} Insulation`;
    const variantSku = `ML-${v.pipeType === 'copper' ? 'C' : 'I'}-${v.pipeDiameter.replace(/\s+/g, '').replace(/"/g, '').replace(/\//g, '-')}-${v.insulationThickness.replace(/\s+/g, '').replace(/"/g, '').replace(/\//g, '-')}`.toUpperCase();
    
    // Find existing variant by properties
    const existingVariantIndex = product.variants.findIndex(existing => {
      const props = existing.properties instanceof Map 
        ? Object.fromEntries(existing.properties) 
        : existing.properties || {};
      return props.pipeType === v.pipeType && 
             props.pipeDiameter === v.pipeDiameter && 
             props.insulationThickness === v.insulationThickness;
    });
    
    if (existingVariantIndex >= 0) {
      // Merge supplier entry into existing variant
      const existingVariant = product.variants[existingVariantIndex];
      mergeVariantSupplierEntry(
        existingVariant,
        distributor._id,
        manufacturer ? manufacturer._id : null,
        {
          listPrice: v.listPrice,
          netPrice: discountPercent ? v.listPrice * (1 - discountPercent / 100) : null,
          discountPercent: discountPercent || null,
          isPreferred: true
        }
      );
      // Update pricing to reflect this distributor's pricing
      existingVariant.pricing = {
        listPrice: v.listPrice,
        netPrice: discountPercent ? v.listPrice * (1 - discountPercent / 100) : null,
        discountPercent: discountPercent || null
      };
    } else {
      // Create new variant with distributor supplier entry
      newVariants.push({
        name: variantName,
        sku: variantSku,
        properties: new Map([
          ['pipeType', v.pipeType],
          ['pipeDiameter', v.pipeDiameter],
          ['insulationThickness', v.insulationThickness]
        ]),
        pricing: {
          listPrice: v.listPrice,
          netPrice: discountPercent ? v.listPrice * (1 - discountPercent / 100) : null,
          discountPercent: discountPercent || null
        },
        suppliers: [{
          manufacturerId: manufacturer ? manufacturer._id : null,
          distributorId: distributor._id,
          listPrice: v.listPrice,
          netPrice: discountPercent ? v.listPrice * (1 - discountPercent / 100) : null,
          discountPercent: discountPercent || null,
          isPreferred: true
        }],
        isActive: true
      });
    }
  }
  
  // Add new variants to product
  if (newVariants.length > 0) {
    product.variants.push(...newVariants);
  }
  
  // Save product with updated variants
  await product.save();

  // Apply product-level discount if available
  if (discountPercent) {
    product.productDiscount = {
      discountPercent: discountPercent,
      effectiveDate: new Date()
    };
    await product.save();
  }

  return {
    productId: product._id,
    productName: product.name,
    variantsCreated: variants.length,
    format: 'pipe-insulation'
  };
}

/**
 * Process fitting matrix format sheet (pipe sizes as rows, wall thicknesses as columns)
 */
async function processFittingMatrixSheet(data, analysis, sheetInfo) {
  const { groupCode, section, pageNumber, pageName, discountPercent } = sheetInfo;
  
  // Get IMPRO distributor
  const distributor = await getImportDistributor();
  
  // Extract manufacturer from sheet
  const manufacturerName = extractManufacturerFromSheet(data);
  const manufacturer = manufacturerName ? await getOrCreateManufacturer(manufacturerName) : null;
  
  // Create distributor-supplier relationship if manufacturer exists
  if (manufacturer && distributor) {
    await createDistributorSupplierRelationship(distributor._id, manufacturer._id);
  }
  
  // For backward compatibility, supplier = distributor (who we buy from)
  const supplier = distributor;

  // Determine product type based on page name
  let productTypeSlug = 'pipe-fittings';
  let productTypeName = 'Pipe Fittings';
  let fittingType = '45-degree';
  
  if (pageName && pageName.toLowerCase().includes('45')) {
    fittingType = '45-degree';
  } else if (pageName && pageName.toLowerCase().includes('90')) {
    fittingType = '90-degree';
  } else if (pageName && pageName.toLowerCase().includes('tee')) {
    fittingType = 'tee';
  }

  // Get or create product type
  const productType = await ProductType.findOneAndUpdate(
    { slug: productTypeSlug },
    {
      name: productTypeName,
      slug: productTypeSlug,
      description: 'Fiberglass pipe fittings',
      properties: [
        { key: 'pipeSize', label: 'Pipe Size', type: 'string' },
        { key: 'wallThickness', label: 'Wall Thickness', type: 'string' },
        { key: 'fittingType', label: 'Fitting Type', type: 'enum', options: [
          { label: '45 Degree', value: '45-degree' },
          { label: '90 Degree', value: '90-degree' },
          { label: 'Tee', value: 'tee' }
        ]}
      ],
      variantSettings: {
        variantProperties: ['pipeSize', 'wallThickness', 'fittingType']
      }
    },
    { upsert: true, new: true }
  );

  // Extract header row (wall thicknesses)
  const headerRow = analysis.columns;
  const wallThicknesses = [];
  for (let i = 1; i < headerRow.length; i++) {
    const thickness = String(headerRow[i] || '').trim();
    if (thickness && thickness !== '' && thickness !== '-') {
      // Remove $ and clean up
      const cleanThickness = thickness.replace(/\$/g, '').replace(/["']/g, '').trim();
      if (cleanThickness.match(/\d/)) {
        wallThicknesses.push({ index: i, thickness: cleanThickness });
      }
    }
  }

  // Extract data rows
  const dataRows = data.slice(analysis.dataStartRow);
  const variants = [];

  // Process each data row
  for (const row of dataRows) {
    if (!row || row.length < 2) continue;
    
    const pipeSize = String(row[0] || '').trim();
    if (!pipeSize || pipeSize === '-' || pipeSize === '') continue;
    
    // Clean pipe size (remove quotes, etc.)
    const cleanPipeSize = pipeSize.replace(/["']/g, '').trim();
    
    // Process each wall thickness column
    for (const thicknessCol of wallThicknesses) {
      const priceStr = String(row[thicknessCol.index] || '').trim();
      if (priceStr && priceStr !== '-' && priceStr !== '') {
        // Remove $ and commas, parse price
        const cleanPrice = priceStr.replace(/\$/g, '').replace(/,/g, '').trim();
        const price = parseFloat(cleanPrice);
        if (!isNaN(price) && price > 0) {
          variants.push({
            pipeSize: cleanPipeSize,
            wallThickness: thicknessCol.thickness,
            fittingType: fittingType,
            listPrice: price
          });
        }
      }
    }
  }

  if (variants.length === 0) {
    throw new Error('No valid variants found in sheet');
  }

  // Create or update product using multi-distributor helper
  const productName = pageName || `Fiberglass ${fittingType} Fittings`;
  
  const product = await findOrCreateProductByManufacturer(
    {
      name: productName,
      description: `Fiberglass ${fittingType} pipe fittings${manufacturer ? ` by ${manufacturer.name}` : ''}`,
      productTypeId: productType._id,
      pricebookSection: section || '',
      pricebookPageNumber: pageNumber || '',
      pricebookPageName: pageName || '',
      pricebookGroupCode: groupCode || '',
      unitOfMeasure: 'EA',
      supplierEntry: {
        supplierPartNumber: '',
        listPrice: null, // Product-level pricing handled at variant level
        netPrice: null,
        discountPercent: discountPercent || null,
        isPreferred: true
      }
    },
    manufacturer,
    distributor
  );
  
  // Process variants - merge supplier entries instead of replacing
  const newVariants = [];
  
  for (const v of variants) {
    const variantSku = `FIB-${fittingType}-${v.pipeSize.replace(/[^0-9]/g, '')}-${v.wallThickness.replace(/[^0-9]/g, '')}`;
    const variantName = `${v.pipeSize} Pipe - ${v.wallThickness} Wall - ${fittingType}`;
    
    // Find existing variant by properties
    const existingVariantIndex = product.variants.findIndex(existing => {
      const props = existing.properties instanceof Map 
        ? Object.fromEntries(existing.properties) 
        : existing.properties || {};
      return props.pipe_size === v.pipeSize && 
             props.wall_thickness === v.wallThickness && 
             props.fitting_type === v.fittingType;
    });
    
    if (existingVariantIndex >= 0) {
      // Merge supplier entry into existing variant
      const existingVariant = product.variants[existingVariantIndex];
      mergeVariantSupplierEntry(
        existingVariant,
        distributor._id,
        manufacturer ? manufacturer._id : null,
        {
          supplierPartNumber: '',
          listPrice: v.listPrice,
          netPrice: discountPercent ? v.listPrice * (1 - discountPercent / 100) : null,
          discountPercent: discountPercent || null,
          isPreferred: true
        }
      );
      // Update pricing to reflect this distributor's pricing
      existingVariant.pricing = {
        listPrice: v.listPrice,
        netPrice: discountPercent ? v.listPrice * (1 - discountPercent / 100) : null,
        discountPercent: discountPercent || null
      };
    } else {
      // Create new variant with distributor supplier entry
      newVariants.push({
        sku: variantSku,
        name: variantName,
        properties: new Map([
          ['pipe_size', v.pipeSize],
          ['wall_thickness', v.wallThickness],
          ['fitting_type', v.fittingType]
        ]),
        pricing: {
          listPrice: v.listPrice,
          netPrice: discountPercent ? v.listPrice * (1 - discountPercent / 100) : null,
          discountPercent: discountPercent || null
        },
        suppliers: [{
          manufacturerId: manufacturer ? manufacturer._id : null,
          distributorId: distributor._id,
          supplierPartNumber: '',
          listPrice: v.listPrice,
          netPrice: discountPercent ? v.listPrice * (1 - discountPercent / 100) : null,
          discountPercent: discountPercent || null,
          isPreferred: true
        }],
        isActive: true
      });
    }
  }
  
  // Add new variants to product
  if (newVariants.length > 0) {
    product.variants.push(...newVariants);
  }
  
  // Save product with updated variants
  await product.save();

  // Apply product-level discount if available
  if (discountPercent) {
    product.productDiscount = {
      discountPercent: discountPercent,
      effectiveDate: new Date()
    };
    await product.save();
  }

  return {
    productId: product._id,
    productName: product.name,
    variantsCreated: variants.length,
    format: 'fitting-matrix'
  };
}

/**
 * Process mineral wool pipe insulation format sheet (pipe diameter × insulation thickness matrix)
 */
async function processMineralWoolPipeSheet(data, analysis, sheetInfo) {
  const { groupCode, section, pageNumber, pageName, discountPercent } = sheetInfo;
  
  // Get IMPRO distributor
  const distributor = await getImportDistributor();
  
  // Extract manufacturer from sheet
  const manufacturerName = extractManufacturerFromSheet(data);
  const manufacturer = manufacturerName ? await getOrCreateManufacturer(manufacturerName) : null;
  
  // Create distributor-supplier relationship if manufacturer exists
  if (manufacturer && distributor) {
    await createDistributorSupplierRelationship(distributor._id, manufacturer._id);
  }
  
  // For backward compatibility, supplier = distributor (who we buy from)
  const supplier = distributor;

  // Get or create product type
  const productType = await ProductType.findOneAndUpdate(
    { slug: 'mineral-wool-pipe-insulation' },
    {
      name: 'Mineral Wool Pipe Insulation',
      slug: 'mineral-wool-pipe-insulation',
      description: 'Rockwool mineral wool pipe insulation',
      properties: [
        { key: 'pipeDiameter', label: 'Pipe Diameter', type: 'string' },
        { key: 'insulationThickness', label: 'Insulation Thickness', type: 'string' },
        { key: 'lfPerBox', label: 'Lineal Feet Per Box', type: 'number' }
      ],
      variantSettings: {
        variantProperties: ['pipeDiameter', 'insulationThickness']
      }
    },
    { upsert: true, new: true }
  );

  const headerRow = analysis.columns;
  const dataRows = data.slice(analysis.dataStartRow);
  
  // Find thickness header row (row with thickness values like "1\"", "1-1/2\"", etc.)
  // It should be 1-2 rows after the main header row
  let thicknessHeaderRow = null;
  let thicknessHeaderRowIndex = -1;
  let lfBoxHeaderRow = null;
  let lfBoxHeaderRowIndex = -1;
  let hasLfBoxFormat = false;
  
  for (let i = analysis.headerRow; i < Math.min(analysis.headerRow + 5, data.length); i++) {
    const row = data[i];
    if (!row) continue;
    
    // Check if this is the thickness header row (has thickness values)
    const hasThicknessValues = row.some(cell => {
      const cellStr = String(cell).trim();
      return cellStr.match(/^\d+["']?$/) || cellStr.match(/^\d+\s*-\s*\d+\/\d+["']?$/);
    });
    
    // Check if this is the LF/BOX header row
    const hasLfBoxHeaders = row.some(cell => {
      const cellStr = String(cell).toLowerCase();
      return cellStr.includes('lf') && cellStr.includes('box');
    });
    
    if (hasThicknessValues && !thicknessHeaderRow) {
      thicknessHeaderRow = row;
      thicknessHeaderRowIndex = i;
    }
    
    if (hasLfBoxHeaders && !lfBoxHeaderRow) {
      lfBoxHeaderRow = row;
      lfBoxHeaderRowIndex = i;
      hasLfBoxFormat = true;
    }
  }
  
  if (!thicknessHeaderRow) {
    throw new Error('Could not find thickness header row');
  }

  // Extract thickness values and their column positions
  const thicknessColumns = [];
  
  if (hasLfBoxFormat && lfBoxHeaderRow) {
    // Format with LF/BOX and PRICE/LF sub-columns
    // Find thickness values in thicknessHeaderRow
    for (let i = 1; i < thicknessHeaderRow.length; i++) {
      const cell = String(thicknessHeaderRow[i] || '').trim();
      if (cell && (cell.match(/^\d+["']?$/) || cell.match(/^\d+\s*-\s*\d+\/\d+["']?$/))) {
        // Find corresponding LF/BOX and PRICE/LF columns
        let lfBoxCol = -1;
        let priceLfCol = -1;
        
        // Search around column i for LF/BOX and PRICE/LF
        for (let j = Math.max(1, i - 1); j < Math.min(i + 3, lfBoxHeaderRow.length); j++) {
          const headerCell = String(lfBoxHeaderRow[j] || '').toLowerCase();
          if (headerCell.includes('lf') && headerCell.includes('box')) {
            lfBoxCol = j;
          }
          if (headerCell.includes('price') && headerCell.includes('lf')) {
            priceLfCol = j;
          }
        }
        
        if (lfBoxCol !== -1 && priceLfCol !== -1) {
          thicknessColumns.push({
            thickness: cell.replace(/["']/g, '').trim(),
            lfBoxCol: lfBoxCol,
            priceLfCol: priceLfCol,
            hasLfBox: true
          });
        }
      }
    }
  } else {
    // Simple format - prices directly in thickness columns
    for (let i = 1; i < thicknessHeaderRow.length; i++) {
      const cell = String(thicknessHeaderRow[i] || '').trim();
      if (cell && (cell.match(/^\d+["']?$/) || cell.match(/^\d+\s*-\s*\d+\/\d+["']?$/))) {
        thicknessColumns.push({
          thickness: cell.replace(/["']/g, '').trim(),
          priceCol: i,
          hasLfBox: false
        });
      }
    }
  }

  if (thicknessColumns.length === 0) {
    throw new Error('Could not find thickness columns');
  }

  // Process data rows (pipe diameters)
  const variants = [];
  const pipeDiameterCol = 0; // Pipe diameter is in first column
  
  // Start from row after the LF/BOX header row
  const variantStartRow = thicknessHeaderRowIndex + 2;
  
  for (let i = variantStartRow; i < dataRows.length; i++) {
    const row = dataRows[i];
    if (!row || row.length === 0) continue;
    
    // Check for footer
    const rowText = row.map(c => String(c)).join(' ').toLowerCase();
    if (rowText.includes('invoice') || rowText.includes('please call')) break;
    
    const pipeDiameter = String(row[pipeDiameterCol] || '').trim();
    // Skip rows that are just "DL" markers or don't have valid pipe diameter
    if (!pipeDiameter || pipeDiameter === '-' || pipeDiameter === 'DL' || !pipeDiameter.match(/\d/)) continue;
    
    // Process each thickness column
    for (const thicknessCol of thicknessColumns) {
      let listPrice = null;
      let lfPerBoxNum = null;
      
      if (thicknessCol.hasLfBox) {
        // Format with LF/BOX and PRICE/LF columns
        const lfPerBox = row[thicknessCol.lfBoxCol] ? String(row[thicknessCol.lfBoxCol]).trim() : '';
        const pricePerLf = row[thicknessCol.priceLfCol] ? String(row[thicknessCol.priceLfCol]).trim() : '';
        
        if (lfPerBox === '-' || pricePerLf === '-' || pricePerLf === ' - ' || !pricePerLf.match(/\$/)) continue;
        
        // Parse price
        const cleanPrice = pricePerLf.replace(/\$/g, '').replace(/,/g, '').trim();
        listPrice = parseFloat(cleanPrice);
        lfPerBoxNum = lfPerBox !== '-' ? parseFloat(lfPerBox.replace(/,/g, '').trim()) : null;
      } else {
        // Simple format - price directly in thickness column
        const priceStr = row[thicknessCol.priceCol] ? String(row[thicknessCol.priceCol]).trim() : '';
        
        if (priceStr === '-' || priceStr === ' - ' || !priceStr.match(/\$/)) continue;
        
        // Parse price
        const cleanPrice = priceStr.replace(/\$/g, '').replace(/,/g, '').trim();
        listPrice = parseFloat(cleanPrice);
      }
      
      if (!isNaN(listPrice) && listPrice > 0) {
        variants.push({
          pipeDiameter: pipeDiameter,
          insulationThickness: thicknessCol.thickness,
          lfPerBox: lfPerBoxNum,
          listPrice: listPrice
        });
      }
    }
  }

  if (variants.length === 0) {
    throw new Error('No valid variants found in sheet');
  }

  // Create single product with all variants
  const productName = pageName || 'Rockwool Mineral Wool Pipe Insulation';
  const product = await Product.findOneAndUpdate(
    {
      name: productName,
      'suppliers.distributorId': supplier._id,
      productTypeId: productType._id,
      pricebookPageName: pageName,
      pricebookPageNumber: pageNumber,
      pricebookSection: section,
      pricebookGroupCode: groupCode
    },
    {
      name: productName,
      description: `Rockwool mineral wool pipe insulation${manufacturer ? ` by ${manufacturer.name}` : ''}`,
      productTypeId: productType._id,
      manufacturerId: manufacturer ? manufacturer._id : null,
      distributorId: distributor._id,
      suppliers: [{
        distributorId: distributor._id, // Distributor (who we buy from) - DISTRIBUTORS SET THE PRICE
        manufacturerId: manufacturer ? manufacturer._id : null,
        supplierPartNumber: '',
        listPrice: null,
        netPrice: null,
        discountPercent: discountPercent || null,
        isPreferred: true
      }],
      pricebookPageName: pageName,
      pricebookPageNumber: pageNumber,
      pricebookSection: section,
      pricebookGroupCode: groupCode,
      isActive: true,
      $setOnInsert: {
        variants: variants.map(v => ({
          name: `${v.pipeDiameter}" Pipe - ${v.insulationThickness}" Insulation`,
          properties: new Map([
            ['pipe_diameter', v.pipeDiameter],
            ['insulation_thickness', v.insulationThickness],
            ...(v.lfPerBox ? [['lf_per_box', v.lfPerBox]] : [])
          ]),
          pricing: {
            listPrice: v.listPrice,
            netPrice: discountPercent ? v.listPrice * (1 - discountPercent / 100) : null,
            discountPercent: discountPercent || null,
            isPreferred: true
          },
          suppliers: [{
            manufacturerId: manufacturer ? manufacturer._id : null,
            distributorId: distributor._id,
            supplierPartNumber: '',
            listPrice: v.listPrice,
            netPrice: discountPercent ? v.listPrice * (1 - discountPercent / 100) : null,
            discountPercent: discountPercent || null,
            isPreferred: true
          }],
          isActive: true
        }))
      }
    },
    { upsert: true, new: true, runValidators: true }
  );

  // If product already exists, update variants
  if (product.variants.length === 0 || product.variants.length !== variants.length) {
    product.variants = variants.map(v => ({
      name: `${v.pipeDiameter}" Pipe - ${v.insulationThickness}" Insulation`,
      properties: new Map([
        ['pipe_diameter', v.pipeDiameter],
        ['insulation_thickness', v.insulationThickness],
        ...(v.lfPerBox ? [['lf_per_box', v.lfPerBox]] : [])
      ]),
      pricing: {
        listPrice: v.listPrice,
        netPrice: discountPercent ? v.listPrice * (1 - discountPercent / 100) : null,
        discountPercent: discountPercent || null,
        isPreferred: true
      },
      suppliers: [{
        distributorId: distributor._id, // Distributor (who we buy from) - DISTRIBUTORS SET THE PRICE
        manufacturerId: manufacturer ? manufacturer._id : null,
        supplierPartNumber: '',
        listPrice: v.listPrice,
        netPrice: discountPercent ? v.listPrice * (1 - discountPercent / 100) : null,
        discountPercent: discountPercent || null,
        isPreferred: true
      }],
      isActive: true
    }));
    await product.save();
  }

  if (discountPercent) {
    product.productDiscount = {
      discountPercent: discountPercent,
      effectiveDate: new Date()
    };
    await product.save();
  }

  return {
    productId: product._id,
    productName: product.name,
    variantsCreated: variants.length,
    format: 'mineral-wool-pipe'
  };
}

/**
 * Process elastomeric pipe insulation format sheet
 * Format: Interior Diameter + Copper Tube Size + thickness columns with List/NET/lf-ctn
 */
async function processElastomericPipeInsulationSheet(data, analysis, sheetInfo) {
  const { groupCode, section, pageNumber, pageName, discountPercent } = sheetInfo;
  
  // Get IMPRO distributor
  const distributor = await getImportDistributor();
  
  // Extract manufacturer from sheet
  const manufacturerName = extractManufacturerFromSheet(data);
  const manufacturer = manufacturerName ? await getOrCreateManufacturer(manufacturerName) : null;
  
  // Create distributor-supplier relationship if manufacturer exists
  if (manufacturer && distributor) {
    await createDistributorSupplierRelationship(distributor._id, manufacturer._id);
  }
  
  // For backward compatibility, supplier = distributor (who we buy from)
  const supplier = distributor;

  // Get or create product type
  const productType = await ProductType.findOneAndUpdate(
    { slug: 'elastomeric-pipe-insulation' },
    {
      name: 'Elastomeric Pipe Insulation',
      slug: 'elastomeric-pipe-insulation',
      description: 'Elastomeric pipe insulation',
      properties: [
        { key: 'interiorDiameter', label: 'Interior Diameter', type: 'string' },
        { key: 'copperTubeSize', label: 'Copper Tube Size', type: 'string' },
        { key: 'insulationThickness', label: 'Insulation Thickness', type: 'string' }
      ],
      variantSettings: {
        variantProperties: ['interiorDiameter', 'copperTubeSize', 'insulationThickness']
      }
    },
    { upsert: true, new: true }
  );

  const headerRow = data[analysis.headerRow];
  const codeRow = data[analysis.headerRow + 1]; // Codes row (0038, 0048, etc.)
  const subHeaderRow = data[analysis.headerRow + 2]; // "List", "NET", "lf/ctn" row
  const dataRows = data.slice(analysis.dataStartRow);

  // Find column indices
  const interiorDiameterCol = headerRow.findIndex(h => String(h).toLowerCase().includes('interior diameter'));
  const copperTubeSizeCol = headerRow.findIndex(h => String(h).toLowerCase().includes('copper tube size'));
  
  // Find code column (usually empty in header row but has codes in codeRow)
  let codeCol = -1;
  if (codeRow) {
    for (let i = 0; i < codeRow.length; i++) {
      const codeVal = String(codeRow[i] || '').trim();
      if (codeVal && codeVal.match(/^\d{4}$/)) {
        codeCol = i;
        break;
      }
    }
  }

  // Parse thickness columns from header row
  // Structure: thickness header, empty, empty, then next thickness header
  // Sub-header row has: List, NET, lf/ctn repeated for each thickness
  const thicknessColumns = [];
  
  for (let col = 0; col < headerRow.length; col++) {
    const thicknessHeader = String(headerRow[col] || '').trim();
    
    // Check if this looks like a thickness header (e.g., "3/8''", "1/2''", "1\"")
    const thicknessMatch = thicknessHeader.match(/(\d+(?:\/\d+)?(?:-\d+\/\d+)?)\s*["']/);
    if (thicknessMatch) {
      const thickness = thicknessMatch[1] + '"';
      
      // Find List, NET, lf/ctn columns in sub-header row starting from this column
      let listCol = -1, netCol = -1, lfCtnCol = -1;
      
      // Look for "List", "NET", "lf/ctn" in sub-header row starting from col
      for (let i = col; i < Math.min(col + 5, subHeaderRow.length); i++) {
        const subHeader = String(subHeaderRow[i] || '').toLowerCase().trim();
        if (subHeader === 'list' && listCol === -1) {
          listCol = i;
        } else if (subHeader === 'net' && netCol === -1 && listCol !== -1) {
          netCol = i;
        } else if ((subHeader.includes('lf') || subHeader.includes('ctn')) && lfCtnCol === -1 && netCol !== -1) {
          lfCtnCol = i;
          break; // Found all three columns for this thickness
        }
      }
      
      if (listCol !== -1 && netCol !== -1 && lfCtnCol !== -1) {
        thicknessColumns.push({
          thickness: thickness,
          listCol: listCol,
          netCol: netCol,
          lfCtnCol: lfCtnCol
        });
      }
    }
  }

  if (thicknessColumns.length === 0) {
    throw new Error('No thickness columns found in sheet');
  }

  const variants = [];
  
  // Process each data row
  for (const row of dataRows) {
    if (!row || row.length < Math.max(interiorDiameterCol, copperTubeSizeCol) + 1) continue;
    
    const interiorDiameter = String(row[interiorDiameterCol] || '').trim();
    const copperTubeSize = String(row[copperTubeSizeCol] || '').trim();
    const code = codeCol !== -1 ? String(row[codeCol] || '').trim() : '';
    
    if (!interiorDiameter || interiorDiameter === '-' || interiorDiameter === '') continue;
    
    // Process each thickness
    for (const thicknessCol of thicknessColumns) {
      const listPriceStr = thicknessCol.listCol !== -1 ? String(row[thicknessCol.listCol] || '').trim() : '';
      
      // Skip if price is #N/A or empty
      if (listPriceStr === '#N/A' || listPriceStr === '' || listPriceStr === '-') continue;
      
      // Try to parse price (might be a formula result)
      const cleanPrice = listPriceStr.replace(/\$/g, '').replace(/,/g, '').replace(/#N\/A/gi, '').trim();
      const listPrice = parseFloat(cleanPrice);
      
      if (isNaN(listPrice) || listPrice <= 0) continue;
      
      // Get NET price if available
      let netPrice = null;
      if (thicknessCol.netCol !== -1 && row[thicknessCol.netCol]) {
        const netPriceStr = String(row[thicknessCol.netCol] || '').trim();
        if (netPriceStr !== '#N/A' && netPriceStr !== '' && netPriceStr !== '-') {
          const cleanNet = netPriceStr.replace(/\$/g, '').replace(/,/g, '').replace(/#N\/A/gi, '').trim();
          const parsedNet = parseFloat(cleanNet);
          if (!isNaN(parsedNet) && parsedNet > 0) {
            netPrice = parsedNet;
          }
        }
      }
      
      // Get lf/ctn if available
      let lfPerCtn = null;
      if (thicknessCol.lfCtnCol !== -1 && row[thicknessCol.lfCtnCol]) {
        const lfCtnStr = String(row[thicknessCol.lfCtnCol] || '').trim();
        if (lfCtnStr !== '' && lfCtnStr !== '-') {
          const cleanLf = lfCtnStr.replace(/,/g, '').trim();
          const parsedLf = parseFloat(cleanLf);
          if (!isNaN(parsedLf) && parsedLf > 0) {
            lfPerCtn = parsedLf;
          }
        }
      }
      
      // Calculate discount if NET price is available but discountPercent not provided
      let finalDiscountPercent = discountPercent;
      if (!finalDiscountPercent && netPrice && listPrice > 0) {
        finalDiscountPercent = ((listPrice - netPrice) / listPrice) * 100;
      }
      
      variants.push({
        interiorDiameter: interiorDiameter,
        copperTubeSize: copperTubeSize || '',
        insulationThickness: thicknessCol.thickness,
        code: code,
        listPrice: listPrice,
        netPrice: netPrice || (finalDiscountPercent ? listPrice * (1 - finalDiscountPercent / 100) : null),
        discountPercent: finalDiscountPercent,
        lfPerCtn: lfPerCtn
      });
    }
  }

  if (variants.length === 0) {
    throw new Error('No valid variants found in sheet');
  }

  // Create or update product
  const productName = pageName || 'Elastomeric Pipe Insulation';
  const product = await Product.findOneAndUpdate(
    { name: productName },
    {
      name: productName,
      productTypeId: productType._id,
      description: `${productName}${manufacturer ? ` from ${manufacturer.name}` : ''}`,
      pricebookSection: section || '',
      pricebookPageNumber: pageNumber || '',
      pricebookPageName: pageName || '',
      pricebookGroupCode: groupCode || '',
      manufacturerId: manufacturer ? manufacturer._id : null,
      distributorId: distributor._id,
      suppliers: [{
        distributorId: distributor._id, // Distributor (who we buy from) - DISTRIBUTORS SET THE PRICE
        manufacturerId: manufacturer ? manufacturer._id : null,
        supplierPartNumber: '',
        listPrice: null,
        netPrice: null,
        discountPercent: discountPercent || null,
        isPreferred: true
      }],
      variants: variants.map(v => ({
        sku: `ELT-${v.code || v.interiorDiameter.replace(/[^0-9]/g, '')}-${v.insulationThickness.replace(/[^0-9]/g, '')}`,
        name: `${v.interiorDiameter} Interior - ${v.copperTubeSize || 'N/A'} CTS - ${v.insulationThickness} Thickness`,
        properties: new Map([
          ['interior_diameter', v.interiorDiameter],
          ['copper_tube_size', v.copperTubeSize || ''],
          ['insulation_thickness', v.insulationThickness],
          ...(v.code ? [['code', v.code]] : []),
          ...(v.lfPerCtn ? [['lf_per_ctn', v.lfPerCtn]] : [])
        ]),
        pricing: {
          listPrice: v.listPrice,
          netPrice: v.netPrice,
          discountPercent: v.discountPercent || null
        },
        suppliers: [{
          manufacturerId: manufacturer ? manufacturer._id : null,
          distributorId: distributor._id,
          supplierPartNumber: v.code || '',
          listPrice: v.listPrice,
          netPrice: v.netPrice,
          discountPercent: v.discountPercent || null,
          isPreferred: true
        }],
        isActive: true
      })),
      isActive: true
    },
    { upsert: true, new: true }
  );

  // Apply product-level discount if available
  if (discountPercent) {
    product.productDiscount = {
      discountPercent: discountPercent,
      effectiveDate: new Date()
    };
    await product.save();
  }

  return {
    productId: product._id,
    productName: product.name,
    variantsCreated: variants.length,
    format: 'elastomeric-pipe-insulation'
  };
}

/**
 * Process duct liner format sheet (thickness × dimensions table)
 * Note: This sheet may contain multiple products (RC and PM)
 */
async function processDuctLinerSheet(data, analysis, sheetInfo) {
  const { groupCode, section, pageNumber, pageName, discountPercent } = sheetInfo;
  
  // Get IMPRO distributor
  const distributor = await getImportDistributor();
  
  // Extract manufacturer from sheet
  const manufacturerName = extractManufacturerFromSheet(data);
  const manufacturer = manufacturerName ? await getOrCreateManufacturer(manufacturerName) : null;
  
  // Create distributor-supplier relationship if manufacturer exists
  if (manufacturer && distributor) {
    await createDistributorSupplierRelationship(distributor._id, manufacturer._id);
  }
  
  // For backward compatibility, supplier = distributor (who we buy from)
  const supplier = distributor;

  // Get or create product type
  const productType = await ProductType.findOneAndUpdate(
    { slug: 'duct-liner' },
    {
      name: 'Duct Liner',
      slug: 'duct-liner',
      description: 'Fiberglass duct liner insulation',
      properties: [
        { key: 'thickness', label: 'Thickness', type: 'string' },
        { key: 'dimensions', label: 'Dimensions', type: 'string' },
        { key: 'sqFtPerRoll', label: 'Square Feet Per Roll', type: 'number' },
        { key: 'productType', label: 'Product Type', type: 'enum', options: [
          { label: 'RC', value: 'rc' },
          { label: 'PM', value: 'pm' }
        ]}
      ],
      variantSettings: {
        variantProperties: ['thickness', 'dimensions', 'productType']
      }
    },
    { upsert: true, new: true }
  );

  // Find product sections in the sheet
  // Look for product name headers (various patterns)
  const productSections = [];
  
  // Pattern 1: "LIST PRICES - JM LINACOUSTIC RC" or "LIST PRICES - JM DUCT LINER PM"
  const rcSectionStart = data.findIndex(row => 
    row && row.some(cell => String(cell).includes('LINACOUSTIC RC'))
  );
  const pmSectionStart = data.findIndex(row => 
    row && row.some(cell => String(cell).includes('DUCT LINER PM'))
  );
  
  // Pattern 2: Product names as headers (e.g., "JM R300 DUCT BOARD", "CERTAINTEED RIGID LINER BOARD")
  const productNamePatterns = [
    /JM R300/i,
    /CERTAINTEED RIGID LINER/i,
    /SPIRACOUSTIC/i,
    /JM LINACOUSTIC RC/i,
    /JM DUCT LINER PM/i
  ];
  
  productNamePatterns.forEach((pattern, idx) => {
    const sectionStart = data.findIndex(row => 
      row && row.some(cell => pattern.test(String(cell)))
    );
    if (sectionStart !== -1) {
      productSections.push({ start: sectionStart, pattern });
    }
  });

  const results = [];
  
  // Process RC section if found
  if (rcSectionStart !== -1) {
    const rcHeaderRow = data.findIndex((row, idx) => 
      idx > rcSectionStart && 
      row && row.some(cell => {
        const cellLower = String(cell).toLowerCase();
        return cellLower.includes('roll thickness') || 
               (cellLower.includes('thickness') && cellLower.includes('dimension'));
      })
    );
    
    if (rcHeaderRow !== -1) {
      const rcResult = await processDuctLinerProduct(
        data, rcHeaderRow, 'JM LINACOUSTIC RC', 'rc', 
        supplier, productType, sheetInfo, discountPercent, null, distributor, manufacturer
      );
      results.push(rcResult);
    }
  }
  
  // Process PM section if found
  if (pmSectionStart !== -1) {
    const pmHeaderRow = data.findIndex((row, idx) => 
      idx > pmSectionStart && 
      row && row.some(cell => {
        const cellLower = String(cell).toLowerCase();
        return cellLower.includes('roll thickness') || 
               (cellLower.includes('thickness') && cellLower.includes('dimension'));
      })
    );
    
    if (pmHeaderRow !== -1) {
      const pmResult = await processDuctLinerProduct(
        data, pmHeaderRow, 'JM DUCT LINER PM', 'pm',
        supplier, productType, sheetInfo, discountPercent, null, distributor, manufacturer
      );
      results.push(pmResult);
    }
  }
  
  // Process other product sections (R300, CERTAINTEED, SPIRACOUSTIC, PIPE & TANK WRAP, DUCT WRAP)
  const otherProducts = [
    { name: 'JM R300 DUCT BOARD', pattern: /JM R300/i, type: 'r300' },
    { name: 'CERTAINTEED RIGID LINER BOARD WITH TOUGHGARD FACING', pattern: /CERTAINTEED RIGID LINER/i, type: 'certainteed' },
    { name: 'JM SPIRACOUSTIC PLUS', pattern: /SPIRACOUSTIC/i, type: 'spiracoustic' },
    { name: 'JM MICROFLEX & CERTAINTEED CRIMPWRAP PIPE & TANK with FSK', pattern: /MICROFLEX.*CRIMPWRAP/i, type: 'microflex' },
    { name: 'CCI FIBREGLASS PIPE & TANK with FSK', pattern: /CCI.*PIPE.*TANK/i, type: 'cci-pipe-tank' },
    { name: '3/4 lb. FSK FLEXIBLE DUCT WRAP', pattern: /3\/4.*lb.*FSK.*FLEXIBLE.*DUCT/i, type: 'duct-wrap-075' },
    { name: '1 lb. FSK FLEXIBLE DUCT WRAP', pattern: /^1 lb\. FSK FLEXIBLE DUCT WRAP$/i, type: 'duct-wrap-1' },
    { name: '1.5 lb. FSK FLEXIBLE DUCT WRAP', pattern: /1\.5.*lb.*FSK.*FLEXIBLE.*DUCT/i, type: 'duct-wrap-15' },
    { name: 'PLAIN DUCTWRAP', pattern: /^PLAIN DUCTWRAP$/i, type: 'duct-wrap-plain' },
    { name: 'FITTING WRAP - PLAIN FOIL', pattern: /FITTING WRAP.*PLAIN FOIL/i, type: 'fitting-wrap' },
    { name: 'R-FLEX FSK OR AP', pattern: /R-FLEX FSK OR AP/i, type: 'r-flex' },
    { name: 'R-FLEX HT - FSK (HIGH TEMP MINERAL FIBER)', pattern: /R-FLEX HT/i, type: 'r-flex-ht' },
    { name: 'LINACOUSTIC', pattern: /^LINACOUSTIC$/i, type: 'linacoustic' }
  ];
  
  for (const product of otherProducts) {
    const sectionStart = data.findIndex(row => 
      row && row.some(cell => product.pattern.test(String(cell)))
    );
    
    if (sectionStart !== -1) {
      // Look for header row BEFORE product name (most common case)
      // First try to find header row before the product name
      let headerRow = -1;
      for (let i = sectionStart - 1; i >= 0 && i >= sectionStart - 10; i--) {
        const row = data[i];
        if (row && row.length > 0) {
          const rowText = row.map(c => String(c)).join(' ').toLowerCase();
          if (rowText.includes('roll thickness') && 
              (rowText.includes('dimension') || rowText.includes('roll width'))) {
            headerRow = i;
            break;
          }
        }
      }
      
      // If not found before, look after product name
      if (headerRow === -1) {
        headerRow = data.findIndex((row, idx) => 
          idx > sectionStart && idx < sectionStart + 5 &&
          row && row.some(cell => {
            const cellLower = String(cell).toLowerCase();
            return cellLower.includes('roll thickness') && 
                   (cellLower.includes('dimension') || cellLower.includes('roll width'));
          })
        );
      }
      
      // If still not found, use the analysis header row
      if (headerRow === -1 && analysis.headerRow !== null) {
        headerRow = analysis.headerRow;
      }
      
      if (headerRow !== -1) {
        const result = await processDuctLinerProduct(
          data, headerRow, product.name, product.type,
          supplier, productType, sheetInfo, discountPercent, sectionStart, distributor, manufacturer
        );
        if (result && result.variantsCreated > 0) {
          results.push(result);
        }
      }
    }
  }

  if (results.length === 0) {
    throw new Error('No duct liner products found in sheet');
  }

  return {
    productsCreated: results.length,
    results: results,
    format: 'duct-liner'
  };
}

/**
 * Process board format sheet (product name rows followed by thickness variant rows)
 */
async function processBoardSheet(data, analysis, sheetInfo) {
  const { groupCode, section, pageNumber, pageName, discountPercent } = sheetInfo;
  
  // Get IMPRO distributor
  const distributor = await getImportDistributor();
  
  // Extract manufacturer from sheet
  const manufacturerName = extractManufacturerFromSheet(data);
  const manufacturer = manufacturerName ? await getOrCreateManufacturer(manufacturerName) : null;
  
  // Create distributor-supplier relationship if manufacturer exists
  if (manufacturer && distributor) {
    await createDistributorSupplierRelationship(distributor._id, manufacturer._id);
  }
  
  // For backward compatibility, supplier = distributor (who we buy from)
  const supplier = distributor;

  // Get or create product type
  const productType = await ProductType.findOneAndUpdate(
    { slug: 'fiberglass-board' },
    {
      name: 'Fiberglass Board',
      slug: 'fiberglass-board',
      description: 'Fiberglass insulation board',
      properties: [
        { key: 'thickness', label: 'Thickness', type: 'string' },
        { key: 'density', label: 'Density (LB/CU.FT)', type: 'string' },
        { key: 'sqFtPerBundle', label: 'Square Feet Per Bundle', type: 'number' },
        { key: 'productCode', label: 'Product Code', type: 'string' }
      ],
      variantSettings: {
        variantProperties: ['thickness', 'density', 'productCode']
      }
    },
    { upsert: true, new: true }
  );

  const headerRow = analysis.columns;
  const dataRows = data.slice(analysis.dataStartRow);
  
  // Check if this is OEM format (product name and header on same row)
  // In OEM format, column 0 has product name, column 1+ has headers
  const isOemFormat = headerRow[0] && String(headerRow[0]).trim() !== '' && 
                      !String(headerRow[0]).toLowerCase().includes('product') &&
                      !String(headerRow[0]).toLowerCase().includes('thickness') &&
                      String(headerRow[1] || '').toLowerCase().includes('thickness');
  
  // Find column indices
  const productCol = headerRow.findIndex(h => String(h).toLowerCase().includes('product'));
  const thicknessCol = headerRow.findIndex(h => String(h).toLowerCase().includes('thickness') || String(h).toLowerCase().includes('insulation thickness'));
  const sqFtCol = headerRow.findIndex(h => {
    const hLower = String(h).toLowerCase();
    return hLower.includes('sq.ft') || hLower.includes('sq ft') || hLower.includes('sqft') || hLower.includes('sq.ft./bdl') || hLower.includes('sq.ft / bundle');
  });
  const pricePerSqFtCol = headerRow.findIndex(h => {
    const hLower = String(h).toLowerCase();
    return hLower.includes('price') && hLower.includes('sq');
  });
  const pricePerBundleCol = headerRow.findIndex(h => {
    const hLower = String(h).toLowerCase();
    return hLower.includes('price') && (hLower.includes('bundle') || hLower.includes('carton') || hLower.includes('sheet') || hLower.includes('roll') || hLower.includes('bdle'));
  });

  const results = [];
  let currentProduct = null;
  const variants = [];

  // Process data rows
  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    if (!row || row.length === 0) {
      // Empty row - save current product if we have variants
      if (currentProduct && variants.length > 0) {
        const result = await createBoardProduct(
          currentProduct, variants, supplier, productType, sheetInfo, discountPercent, distributor, manufacturer
        );
        results.push(result);
        variants.length = 0; // Clear for next product
      }
      currentProduct = null;
      continue;
    }

    // Check if this is a section header or footer
    const rowText = row.map(c => String(c)).join(' ').toLowerCase();
    if (rowText.includes('list prices') && !rowText.includes('product')) {
      // Section header - skip
      continue;
    }
    if (rowText.includes('standard dimensions') || rowText.includes('invoice') || rowText.includes('fsk on both') ||
        rowText.includes('all products meet') || rowText.includes('adhesives') || rowText.includes('tapes')) {
      // Footer - save current product and break
      if (currentProduct && variants.length > 0) {
        const result = await createBoardProduct(
          currentProduct, variants, supplier, productType, sheetInfo, discountPercent, distributor, manufacturer
        );
        results.push(result);
      }
      break;
    }

    // Handle OEM format (product name in column 0, header starts in column 1)
    if (isOemFormat && i === 0) {
      // First row is product name + header row
      const productName = String(row[0] || '').trim();
      if (productName && productName !== '') {
        // Extract density from product name if present
        const densityMatch = productName.match(/(\d+(?:\.\d+)?)\s*LB/i);
        const codeMatch = productName.match(/(JM\s*\d+|CB\d+)/i);
        
        currentProduct = {
          name: productName,
          density: densityMatch ? densityMatch[1] + ' LB/CU.FT' : '',
          productCode: codeMatch ? codeMatch[1].toUpperCase() : ''
        };
        // Continue to process variant rows
        continue;
      }
    }

    // Check if this is a product name row (has product name in product column or column 0 for OEM)
    const productNameCell = isOemFormat ? String(row[0] || '').trim() : 
                           (productCol !== -1 ? String(row[productCol] || '').trim() : '');
    // Product name can start with number (e.g., "1.1 LB./CU.FT.") but should contain "LB" or product code
    // Also check for product codes like "1230", "1240", "1260", "1280" (just numbers)
    const isProductNameRow = productNameCell && productNameCell !== '' && 
                              (productNameCell.includes('LB') || 
                               productNameCell.includes('JM') || 
                               productNameCell.includes('CB') ||
                               productNameCell.includes('Type') ||
                               productNameCell.includes('WHISPERTONE') ||
                               productNameCell.includes('MICROLITE') ||
                               productNameCell.includes('TUFSKIN') ||
                               productNameCell.includes('INDUSTRIAL') ||
                               productNameCell.includes('FLEX') ||
                               productNameCell.includes('BATT') ||
                               productNameCell.includes('ROCKWOOL') ||
                               productNameCell.includes('PROROX') ||
                               productNameCell.match(/^\d{4}$/) || // 4-digit product codes like "1230"
                               !productNameCell.match(/^\d+$/)); // Not just a number (unless it's a product code)
    
    if (isProductNameRow) {
      // This is a product name row
      // Save previous product if exists
      if (currentProduct && variants.length > 0) {
        const result = await createBoardProduct(
          currentProduct, variants, supplier, productType, sheetInfo, discountPercent, distributor, manufacturer
        );
        results.push(result);
        variants.length = 0;
      }
      
      // Parse product name to extract density and product code
      const productName = productNameCell.replace(/\n/g, ' ').trim();
      const densityMatch = productName.match(/(\d+(?:\.\d+)?)\s*LB/i);
      const codeMatch = productName.match(/(JM\s*\d+|CB\d+)/i);
      
      // Save previous product if exists
      if (currentProduct && variants.length > 0) {
        const result = await createBoardProduct(
          currentProduct, variants, supplier, productType, sheetInfo, discountPercent, distributor, manufacturer
        );
        results.push(result);
        variants.length = 0;
      }
      
      currentProduct = {
        name: productName,
        density: densityMatch ? densityMatch[1] + ' LB/CU.FT' : '',
        productCode: codeMatch ? codeMatch[1].toUpperCase() : ''
      };
      
      // For OEM format, if this row has header info, skip to next row for variants
      if (isOemFormat && String(row[thicknessCol] || '').toLowerCase().includes('thickness')) {
        // This is the header row, skip it
        continue;
      }
      
      // Check if this row also has thickness data (some products have single thickness)
      const thickness = thicknessCol !== -1 ? String(row[thicknessCol] || '').trim() : '';
      if (thickness && thickness !== '' && thickness.match(/\d/) && !thickness.toLowerCase().includes('thickness')) {
        const variant = parseBoardVariant(row, thicknessCol, sqFtCol, pricePerSqFtCol, pricePerBundleCol, currentProduct);
        if (variant) {
          variants.push(variant);
        }
      }
    } else {
      // This is a thickness variant row (product column is empty)
      if (currentProduct) {
        const thickness = thicknessCol !== -1 ? String(row[thicknessCol] || '').trim() : '';
        if (thickness && thickness !== '' && thickness.match(/\d/)) {
          const variant = parseBoardVariant(row, thicknessCol, sqFtCol, pricePerSqFtCol, pricePerBundleCol, currentProduct);
          if (variant) {
            variants.push(variant);
          }
        }
      }
    }
  }

  // Save last product
  if (currentProduct && variants.length > 0) {
    const result = await createBoardProduct(
      currentProduct, variants, supplier, productType, sheetInfo, discountPercent
    );
    results.push(result);
  }

  if (results.length === 0) {
    throw new Error('No board products found in sheet');
  }

  return {
    productsCreated: results.length,
    results: results,
    format: 'board'
  };
}

/**
 * Parse a board variant row
 */
function parseBoardVariant(row, thicknessCol, sqFtCol, pricePerSqFtCol, pricePerBundleCol, product) {
  let thickness = String(row[thicknessCol] || '').trim();
  if (!thickness || thickness === '-') return null;
  
  // Extract just the thickness part if it contains product info (e.g., "1 1/2\" - 3/4 LB." -> "1 1/2\"")
  if (thickness.includes(' - ')) {
    thickness = thickness.split(' - ')[0].trim();
  }
  // Remove product codes/suffixes (e.g., "2.2\" -  3/4 LB. JOHNS MANVILLE" -> "2.2\"")
  if (thickness.includes('JOHNS MANVILLE') || thickness.includes('JM')) {
    thickness = thickness.split(/JOHNS MANVILLE|JM/i)[0].trim();
  }
  // Remove MOQ markers
  thickness = thickness.replace(/\s*\(MOQ\)/i, '').trim();

  // Get price per bundle (preferred) or calculate from price per sq ft
  let listPrice = null;
  
  if (pricePerBundleCol !== -1 && row[pricePerBundleCol]) {
    const priceStr = String(row[pricePerBundleCol] || '').trim();
    if (priceStr && priceStr !== '-' && priceStr !== '#REF!') {
      const cleanPrice = priceStr.replace(/\$/g, '').replace(/,/g, '').trim();
      listPrice = parseFloat(cleanPrice);
    }
  }
  
  // Fallback to price per sq ft × sq ft per bundle
  if (!listPrice && pricePerSqFtCol !== -1 && sqFtCol !== -1 && row[pricePerSqFtCol] && row[sqFtCol]) {
    const pricePerSqFtStr = String(row[pricePerSqFtCol] || '').trim();
    const sqFtStr = String(row[sqFtCol] || '').trim();
    if (pricePerSqFtStr && sqFtStr && pricePerSqFtStr !== '-' && sqFtStr !== '-') {
      const pricePerSqFt = parseFloat(pricePerSqFtStr.replace(/\$/g, '').replace(/,/g, '').trim());
      const sqFt = parseFloat(sqFtStr.replace(/,/g, '').trim());
      if (!isNaN(pricePerSqFt) && !isNaN(sqFt)) {
        listPrice = pricePerSqFt * sqFt;
      }
    }
  }
  
  if (!listPrice || isNaN(listPrice) || listPrice <= 0) return null;

  const sqFtPerBundle = sqFtCol !== -1 && row[sqFtCol] ? 
    parseFloat(String(row[sqFtCol]).replace(/,/g, '').trim()) : null;

  return {
    thickness: thickness.trim(),
    density: product.density,
    productCode: product.productCode,
    sqFtPerBundle: sqFtPerBundle,
    listPrice: listPrice
  };
}

/**
 * Create a board product with variants
 */
async function createBoardProduct(product, variants, supplier, productType, sheetInfo, discountPercent, distributor = null, manufacturer = null) {
  const { groupCode, section, pageNumber, pageName } = sheetInfo;
  
  // Use distributor if provided, otherwise fall back to supplier
  const dist = distributor || supplier;
  
  const productName = product.name.replace(/\n/g, ' ').trim();
  
  const productDoc = await Product.findOneAndUpdate(
    { name: productName },
    {
      name: productName,
      productTypeId: productType._id,
      description: `${productName} fiberglass board${manufacturer ? ` by ${manufacturer.name}` : ''}`,
      pricebookSection: section || '',
      pricebookPageNumber: pageNumber || '',
      pricebookPageName: pageName || '',
      pricebookGroupCode: groupCode || '',
      manufacturerId: manufacturer ? manufacturer._id : null,
      distributorId: dist._id,
      suppliers: [{
        manufacturerId: manufacturer ? manufacturer._id : null,
        distributorId: dist._id,
        supplierPartNumber: product.productCode || '',
        listPrice: null,
        netPrice: null,
        discountPercent: discountPercent || null,
        isPreferred: true
      }],
      variants: variants.map(v => ({
        sku: `BOARD-${product.productCode || 'UNK'}-${v.thickness.replace(/[^0-9]/g, '')}`,
        name: `${productName} - ${v.thickness}`,
        properties: new Map([
          ['thickness', v.thickness],
          ['density', v.density],
          ['product_code', v.productCode],
          ...(v.sqFtPerBundle ? [['sq_ft_per_bundle', v.sqFtPerBundle]] : [])
        ]),
        pricing: {
          listPrice: v.listPrice,
          netPrice: discountPercent ? v.listPrice * (1 - discountPercent / 100) : null,
          discountPercent: discountPercent || null
        },
        suppliers: [{
          supplierId: dist._id, // Distributor (who we buy from)
          manufacturerId: manufacturer ? manufacturer._id : null,
          distributorId: dist._id,
          supplierPartNumber: product.productCode || '',
          listPrice: v.listPrice,
          netPrice: discountPercent ? v.listPrice * (1 - discountPercent / 100) : null,
          discountPercent: discountPercent || null,
          isPreferred: true
        }],
        isActive: true
      })),
      isActive: true
    },
    { upsert: true, new: true }
  );

  // Apply product-level discount if available
  if (discountPercent) {
    productDoc.productDiscount = {
      discountPercent: discountPercent,
      effectiveDate: new Date()
    };
    await productDoc.save();
  }

  return {
    productId: productDoc._id,
    productName: productDoc.name,
    variantsCreated: variants.length
  };
}

/**
 * Process a single duct liner product from the sheet
 */
async function processDuctLinerProduct(data, headerRowIndex, productName, productTypeCode, supplier, productType, sheetInfo, discountPercent, productNameRowIndex = null, distributor = null, manufacturer = null) {
  const { groupCode, section, pageNumber, pageName } = sheetInfo;
  
  const headerRow = data[headerRowIndex];
  // If product name row is specified, start from after that row; otherwise use header row + 1
  const startRow = productNameRowIndex !== null ? productNameRowIndex + 1 : headerRowIndex + 1;
  const dataRows = data.slice(startRow);
  
  // Find column indices (flexible matching)
  const thicknessCol = headerRow.findIndex(h => {
    const hLower = String(h).toLowerCase();
    return hLower.includes('thickness') || hLower.includes('roll thickness');
  });
  const dimensionsCol = headerRow.findIndex(h => String(h).toLowerCase().includes('dimension'));
  const sqFtCol = headerRow.findIndex(h => {
    const hLower = String(h).toLowerCase();
    return hLower.includes('sq.ft') || hLower.includes('sq ft') || hLower.includes('sqft');
  });
  const pricePerSqFtCol = headerRow.findIndex(h => {
    const hLower = String(h).toLowerCase();
    return hLower.includes('price per sq') || hLower.includes('price/sq');
  });
  const pricePerRollCol = headerRow.findIndex(h => {
    const hLower = String(h).toLowerCase();
    return (hLower.includes('price per') && (hLower.includes('roll') || hLower.includes('carton'))) ||
           hLower.includes('price per carton');
  });
  
  const variants = [];
  
  // Process data rows until we hit an empty row or next section
  for (const row of dataRows) {
    if (!row || row.length === 0) {
      // Empty row - if we have variants, we're done with this product
      if (variants.length > 0) break;
      continue;
    }
    
    // Check if this is the start of a new section or product
    const rowText = row.map(c => String(c)).join(' ').toLowerCase();
    if (rowText.includes('list prices') || rowText.includes('invoice') || 
        rowText.includes('all products meet') || rowText.includes('adhesives') || rowText.includes('tapes')) break;
    
    // Check if this is another product name row (but not the current product)
    // Product name rows typically don't have dimensions or prices, and are standalone descriptions
    const firstCell = String(row[0] || '').trim();
    const hasDimensions = dimensionsCol !== -1 && row[dimensionsCol] && String(row[dimensionsCol]).trim() !== '';
    const hasPrice = (pricePerRollCol !== -1 && row[pricePerRollCol] && String(row[pricePerRollCol]).trim() !== '' && String(row[pricePerRollCol]).trim() !== '$0.00') ||
                     (pricePerSqFtCol !== -1 && row[pricePerSqFtCol] && String(row[pricePerSqFtCol]).trim() !== '' && String(row[pricePerSqFtCol]).trim() !== '$0.00');
    
    // Product name rows are standalone (no dimensions, no prices) and match specific patterns
    // They also don't contain thickness measurements (numbers with quotes)
    const hasThicknessMeasurement = firstCell.match(/\d+\s*["']/);
    
    // If it looks like a product name (contains keywords, no dimensions/prices/thickness) and is different product
    if (firstCell && firstCell !== '' && !hasDimensions && !hasPrice && !hasThicknessMeasurement &&
        (firstCell.includes('lb.') || firstCell.includes('DUCT WRAP') || firstCell.includes('FITTING WRAP') ||
         firstCell.includes('R-FLEX') || firstCell.includes('LINACOUSTIC') || firstCell.includes('PLAIN')) &&
        firstCell.toLowerCase() !== productName.toLowerCase() &&
        !firstCell.toLowerCase().startsWith(productName.toLowerCase().split(' ')[0])) {
      // New product - break if we have variants
      if (variants.length > 0) break;
      continue;
    }
    
    // Handle cases where thickness might be in dimensions column (e.g., SPIRACOUSTIC)
    let thickness = thicknessCol !== -1 ? String(row[thicknessCol] || '').trim() : '';
    let dimensions = dimensionsCol !== -1 ? String(row[dimensionsCol] || '').trim() : '';
    
    // For SPIRACOUSTIC, dimensions column contains "1\" x 48\" x 120\""
    if (!thickness && dimensions && dimensions.match(/\d+\"/)) {
      // Extract thickness from dimensions (first number with ")
      const thicknessMatch = dimensions.match(/(\d+(?:\s*-\s*\d+\/\d+)?)\"/);
      if (thicknessMatch) {
        thickness = thicknessMatch[1] + '"';
      }
    }
    
    if (!thickness || !dimensions || thickness === '-' || dimensions === '-') continue;
    
    // Extract just the thickness part if it contains product info (e.g., "1 1/2\" - 3/4 LB." -> "1 1/2\"")
    if (thickness.includes(' - ')) {
      thickness = thickness.split(' - ')[0].trim();
    }
    // Remove product codes/suffixes (e.g., "2.2\" -  3/4 LB. JOHNS MANVILLE" -> "2.2\"")
    if (thickness.includes('JOHNS MANVILLE') || thickness.includes('JM')) {
      thickness = thickness.split(/JOHNS MANVILLE|JM/i)[0].trim();
    }
    
    // Clean thickness (remove "Non-Stock" etc.)
    const cleanThickness = thickness.replace(/Non-Stock/i, '').trim();
    
    // Skip if thickness doesn't look valid (should contain a number and quote)
    if (!cleanThickness.match(/\d/)) continue;
    
    // Get price per roll (preferred) or calculate from price per sq ft
    let listPrice = null;
    
    if (pricePerRollCol !== -1 && row[pricePerRollCol]) {
      const priceStr = String(row[pricePerRollCol] || '').trim();
      if (priceStr && priceStr !== '-' && priceStr !== '#REF!') {
        const cleanPrice = priceStr.replace(/\$/g, '').replace(/,/g, '').trim();
        listPrice = parseFloat(cleanPrice);
      }
    }
    
    // Fallback to price per sq ft × sq ft per roll
    if (!listPrice && pricePerSqFtCol !== -1 && sqFtCol !== -1 && row[pricePerSqFtCol] && row[sqFtCol]) {
      const pricePerSqFtStr = String(row[pricePerSqFtCol] || '').trim();
      const sqFtStr = String(row[sqFtCol] || '').trim();
      if (pricePerSqFtStr && sqFtStr && pricePerSqFtStr !== '-' && sqFtStr !== '-') {
        const pricePerSqFt = parseFloat(pricePerSqFtStr.replace(/\$/g, '').replace(/,/g, '').trim());
        const sqFt = parseFloat(sqFtStr.replace(/,/g, '').trim());
        if (!isNaN(pricePerSqFt) && !isNaN(sqFt)) {
          listPrice = pricePerSqFt * sqFt;
        }
      }
    }
    
    if (listPrice && !isNaN(listPrice) && listPrice > 0) {
      const sqFtPerRoll = sqFtCol !== -1 && row[sqFtCol] ? 
        parseFloat(String(row[sqFtCol]).replace(/,/g, '').trim()) : null;
      
      variants.push({
        thickness: cleanThickness,
        dimensions: dimensions,
        sqFtPerRoll: sqFtPerRoll,
        productType: productTypeCode,
        listPrice: listPrice
      });
    }
  }

  if (variants.length === 0) {
    // Skip products with no valid variants (e.g., $0.00 prices)
    return null;
  }

  // Use distributor if provided, otherwise fall back to supplier
  const dist = distributor || supplier;
  
  // Create or update product
  const product = await Product.findOneAndUpdate(
    { name: productName },
    {
      name: productName,
      productTypeId: productType._id,
      description: `${productName} duct liner${manufacturer ? ` by ${manufacturer.name}` : ''}`,
      pricebookSection: section || '',
      pricebookPageNumber: pageNumber || '',
      pricebookPageName: pageName || '',
      pricebookGroupCode: groupCode || '',
      manufacturerId: manufacturer ? manufacturer._id : null,
      distributorId: dist._id,
      suppliers: [{
        manufacturerId: manufacturer ? manufacturer._id : null,
        distributorId: dist._id,
        supplierPartNumber: '',
        listPrice: null,
        netPrice: null,
        discountPercent: discountPercent || null,
        isPreferred: true
      }],
      variants: variants.map(v => ({
        sku: `DUCT-${productTypeCode.toUpperCase()}-${v.thickness.replace(/[^0-9]/g, '')}-${v.dimensions.replace(/[^0-9X]/g, '')}`,
        name: `${productName} - ${v.thickness} - ${v.dimensions}`,
        properties: new Map([
          ['thickness', v.thickness],
          ['dimensions', v.dimensions],
          ['product_type', v.productType],
          ...(v.sqFtPerRoll ? [['sq_ft_per_roll', v.sqFtPerRoll]] : [])
        ]),
        pricing: {
          listPrice: v.listPrice,
          netPrice: discountPercent ? v.listPrice * (1 - discountPercent / 100) : null,
          discountPercent: discountPercent || null
        },
        suppliers: [{
          supplierId: dist._id, // Distributor (who we buy from)
          manufacturerId: manufacturer ? manufacturer._id : null,
          distributorId: dist._id,
          supplierPartNumber: '',
          listPrice: v.listPrice,
          netPrice: discountPercent ? v.listPrice * (1 - discountPercent / 100) : null,
          discountPercent: discountPercent || null,
          isPreferred: true
        }],
        isActive: true
      })),
      isActive: true
    },
    { upsert: true, new: true }
  );

  // Apply product-level discount if available
  if (discountPercent) {
    product.productDiscount = {
      discountPercent: discountPercent,
      effectiveDate: new Date()
    };
    await product.save();
  }

  return {
    productId: product._id,
    productName: product.name,
    variantsCreated: variants.length
  };
}

/**
 * Test import by verifying product was created correctly
 */
async function testImport(productId, expectedVariants) {
  const product = await Product.findById(productId).lean();
  
  if (!product) {
    throw new Error('Product not found after import');
  }

  const actualVariants = product.variants?.length || 0;
  if (actualVariants !== expectedVariants) {
    throw new Error(`Variant count mismatch: expected ${expectedVariants}, got ${actualVariants}`);
  }

  // Check that variants have pricing
  const variantsWithPricing = product.variants.filter(v => 
    v.pricing?.listPrice && v.pricing.listPrice > 0
  ).length;

  if (variantsWithPricing === 0) {
    throw new Error('No variants have pricing data');
  }

  console.log(`✅ Test passed: ${actualVariants} variants, ${variantsWithPricing} with pricing`);
  return true;
}

/**
 * Main import function
 */
async function importSheet(sheetName, gid, sheetInfo = {}, providedData = null) {
  try {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📄 Processing Sheet: ${sheetName}`);
    console.log(`${'='.repeat(60)}`);

    // Check if already completed
    const progress = loadProgress();
    if (progress.completed.find(s => s.name === sheetName)) {
      console.log(`⏭️  Sheet already completed, skipping...`);
      return { skipped: true };
    }

    // Connect to database
    const mongoUri = process.env.MONGODB_DEV_URI || process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_DEV_URI or MONGODB_URI must be set');
    }
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to database');

    // Fetch sheet data
    console.log(`\n📊 Fetching sheet data...`);
    const sheetData = await fetchSheetData(sheetName, gid, providedData);
    
    if (!sheetData || sheetData.length === 0) {
      throw new Error('No data found in sheet. Please provide sheet data manually or implement Google Sheets API.');
    }

    // Analyze structure
    console.log(`\n🔍 Analyzing sheet structure...`);
    const analysis = analyzeSheetStructure(sheetData);
    console.log(`   Format detected: ${analysis.format}`);
    console.log(`   Has headers: ${analysis.hasHeaders}`);
    console.log(`   Data starts at row: ${analysis.dataStartRow}`);

    // Process based on format
    let result;
    switch (analysis.format) {
      case 'pipe-insulation':
        result = await processPipeInsulationSheet(sheetData, analysis, sheetInfo);
        break;
      case 'fitting-matrix':
        result = await processFittingMatrixSheet(sheetData, analysis, sheetInfo);
        break;
      case 'duct-liner':
        result = await processDuctLinerSheet(sheetData, analysis, sheetInfo);
        break;
      case 'board':
        result = await processBoardSheet(sheetData, analysis, sheetInfo);
        break;
      case 'mineral-wool-pipe':
        result = await processMineralWoolPipeSheet(sheetData, analysis, sheetInfo);
        break;
      case 'elastomeric-pipe-insulation':
        result = await processElastomericPipeInsulationSheet(sheetData, analysis, sheetInfo);
        break;
      default:
        throw new Error(`Unsupported format: ${analysis.format}. Please implement handler for this format.`);
    }

    // Test import
    console.log(`\n🧪 Testing import...`);
    if (result.productId) {
      await testImport(result.productId, result.variantsCreated);
    } else if (result.results && result.results.length > 0) {
      // Multiple products (e.g., duct liner with RC and PM)
      for (const productResult of result.results) {
        await testImport(productResult.productId, productResult.variantsCreated);
      }
    }

    // Mark as completed
    markCompleted(sheetName, result);
    
    if (result.productId) {
      console.log(`\n✅ Successfully imported: ${result.productName}`);
      console.log(`   Variants created: ${result.variantsCreated}`);
      console.log(`   Product ID: ${result.productId}`);
    } else if (result.results && result.results.length > 0) {
      console.log(`\n✅ Successfully imported ${result.results.length} product(s):`);
      result.results.forEach(r => {
        console.log(`   - ${r.productName}: ${r.variantsCreated} variants (ID: ${r.productId})`);
      });
    }

    await mongoose.disconnect();
    return result;

  } catch (error) {
    markFailed(sheetName, error);
    console.error(`\n❌ Error importing sheet ${sheetName}:`, error.message);
    await mongoose.disconnect();
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  const args = process.argv.slice(2);
  let sheetName, gid, groupCode, section, pageNumber, discountPercent, dataArg;
  
  // Parse arguments (support --data flag)
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--data' && args[i + 1]) {
      try {
        dataArg = JSON.parse(args[i + 1]);
        i++; // Skip next arg
      } catch (e) {
        console.error('Error parsing --data JSON:', e.message);
        process.exit(1);
      }
    } else if (!sheetName) {
      sheetName = args[i];
    } else if (!gid && args[i] !== '') {
      gid = args[i];
    } else if (!groupCode) {
      groupCode = args[i];
    } else if (!section) {
      section = args[i];
    } else if (!pageNumber) {
      pageNumber = args[i];
    } else if (!discountPercent) {
      discountPercent = args[i] ? parseFloat(args[i]) : null;
    }
  }
  
  if (!sheetName) {
    console.error('Usage: node scripts/import-pricebook-sheet.js [sheet-name] [gid] [group-code] [section] [page-number] [discount-percent] [--data JSON]');
    console.error('\nExample:');
    console.error('  node scripts/import-pricebook-sheet.js "FIBREGLASS PIPE WITH ASJ" "" CAEG171 FIBREGLASS 1.1 67.75');
    console.error('  node scripts/import-pricebook-sheet.js "Sheet Name" "" CODE SEC 1.1 50 --data \'[[row1], [row2]]\'');
    process.exit(1);
  }

  const sheetInfo = {
    groupCode: groupCode || '',
    section: section || '',
    pageNumber: pageNumber || '',
    pageName: sheetName,
    discountPercent: discountPercent
  };

  // Import with provided data if available
  importSheet(sheetName, gid, sheetInfo, dataArg)
    .then(() => {
      console.log('\n✅ Import completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Import failed:', error.message);
      process.exit(1);
    });
}

module.exports = { importSheet, loadProgress, saveProgress };

