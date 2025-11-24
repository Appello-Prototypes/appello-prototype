/**
 * Import Discounts from Pricebook Discount Summary
 * 
 * Reads the discount summary sheet and creates/updates discount records
 * 
 * Usage:
 *   node scripts/import-pricebook-discounts.js [spreadsheet-id]
 */

require('dotenv').config({ path: '.env.local', override: true });
const mongoose = require('mongoose');

const Discount = require('../src/server/models/Discount');

// Discount data from pricebook discount summary sheet
// Format: [Group No., Sec #, Section, Pg #, Price Page, Effective date, Replacing date, Discount]
const DISCOUNT_DATA = [
  ['CAEG171', '1', 'FIBREGLASS', '1.1', 'FIBREGLASS PIPE WITH ASJ', '6-Jan-25', '8-Jan-24', '67.75%'],
  ['CAEG164', '', '', '1.2', 'FIBERGLASS FITTING 45 DEGREE', '6-Jan-25', '8-Jan-24', '59.88%'],
  ['CAEG164', '', '', '1.3', 'FIBERGLASS FITTING 90 DEGREE', '6-Jan-25', '8-Jan-24', '59.88%'],
  ['CAEG164', '', '', '1.4', 'FIBERGLASS FITTING TEES', '6-Jan-25', '8-Jan-24', '59.88%'],
  ['CAEG162', '', '', '1.5', 'FIBREGLASS RC DUCTLINER', '6-Jan-25', '8-Jan-24', '59.88%'],
  ['CAEG163', '', '', '', 'FIBREGLASS PM DUCTLINER', '6-Jan-25', '8-Jan-24', '59.88%'],
  ['CAEG160', '', '', '1.6', 'FIBREGLASS OTHER HVAC INSULATION', '6-Jan-25', '8-Jan-24', '59.88%'],
  ['CAEG156', '', '', '1.7', 'FACED BOARD ', '6-Jan-25', '8-Jan-24', '59.88%'],
  ['CAEG348', '', '', '', 'FACED BOARD ', '6-Jan-25', '8-Jan-24', '69.40%'],
  ['CAEG154', '', '', '', 'FACED BOARD ', '6-Jan-25', '8-Jan-24', '69.40%'],
  ['CAEG159', '', '', '1.8', 'PLAIN BOARD', '6-Jan-25', '8-Jan-24', '59.88%'],
  ['CAEG349', '', '', '', 'PLAIN BOARD', '6-Jan-25', '8-Jan-24', '59.88%'],
  ['CAEG155', '', '', '', 'PLAIN BOARD', '6-Jan-25', '8-Jan-24', '59.88%'],
  ['CAEG161', '', '', '', 'PLAIN BOARD', '6-Jan-25', '8-Jan-24', '59.88%'],
  ['CAEG172', '', '', '1.9', 'PIPE & TANK WRAP', '6-Jan-25', '8-Jan-24', '59.88%'],
  ['CAEG330', '', '', '', 'PIPE & TANK WRAP', '6-Jan-25', '8-Jan-24', '80.80%'],
  ['CAEG167', '', '', '1.10', 'DUCT WRAP', '6-Jan-25', '8-Jan-24', '59.88%'],
  ['CAEG322', '', '', '', 'DUCT WRAP', '6-Jan-25', '8-Jan-24', '59.88%'],
  ['CAEG165', '', '', '', 'DUCT WRAP', '6-Jan-25', '8-Jan-24', '59.88%'],
  ['CAEG266', '', '', '1.11', 'OEM PRODUCTS', '6-Jan-25', '8-Jan-24', '59.88%'],
  ['CAEG212', '2', ' MINERAL WOOL', '2.1', 'MINERAL WOOL PIPE INSULATION', '6-Jan-25', 'NEW LIST', '76.50%'],
  ['CAEG347', '', '', '2.2', 'MINERAL WOOL PIPE - JOHNS MANVILLE', '6-Jan-25', '2-Jul-24', '72.41%'],
  ['CAEG198', '', '', '2.3', 'MINERAL WOOL FITTING 45 DEGREE', '6-Jan-25', 'NEW LIST', '72.41%'],
  ['CAEG198', '', '', '2.4', 'MINERAL WOOL FITTING 90 DEGREE', '6-Jan-25', 'NEW LIST', '72.41%'],
  ['CAEG198', '', '', '2.5', 'MINERAL WOOL FITTING TEE', '6-Jan-25', 'NEW LIST', '72.41%'],
  ['CAEG321', '', '', '2.6', 'ROCKWOOL PIPE WITH ASJ', '6-Jan-25', 'NEW LIST', '72.41%'],
  ['CAEG211', '', '', '2.7', 'MINERAL WOOL - ROCKWOOL PIPE & TANK', '6-Jan-25', 'NEW LIST', '72.41%'],
  ['CAEG296', '', '', '2.8', 'MINERAL WOOL - CCI PIPE & TANK', '6-Jan-25', 'NEW LIST', '85.20%'],
  ['CAEG213', '', '', '2.9', 'INDUSTRIAL BOARD 2 TO 8LB DENSITY', '6-Jan-25', 'NEW LIST', '72.41%'],
  ['CAEG217', '', '', '2.10', 'INDUSTRIAL BOARD 10 TO 12LB DENSITY', '6-Jan-25', 'NEW LIST', '72.41%'],
  ['CAEG205', '', '', '2.11', 'INDUSTRIAL FLEXIBLE BATTS', '6-Jan-25', 'NEW LIST', '72.41%'],
  ['CAEG275', '', '', '2.12', 'JM MPT FIELD PREFORMED PIPE', '6-Jan-25', 'NEW LIST', '72.41%'],
  ['CAEG206', '', '', '2.13', 'ROCKWOOL FABROCK LT', '2-Jul-24', 'NEW LIST', '74.45%'],
  ['CAEG200', '', '', '2.14', 'COMMERCIAL WALL', '2-Jul-24', 'NEW LIST', '74.45%'],
  ['CAEG219', '', '', '2.15', 'ROCKWOOL ROCKBOARD ', '2-Jul-24', 'NEW LIST', '74.45%'],
  ['CAEG207', '', '', '2.16', 'ROCKWOOL PLUS MB / FIRE WALL', '2-Jul-24', 'NEW LIST', '74.45%'],
  ['CAEG201', '', '', '2.17', 'CURTAIN WALL APPLICATION', '2-Jul-24', 'NEW LIST', '74.45%'],
  ['CAEG221', '', '', '2.18', 'MINERAL WOOL SAFE & SAFE STRIPS', '2-Jul-24', 'NEW LIST', '74.45%'],
  ['CAEG323', '', '', '2.19', 'ROCKWOOL COMFORTBOARD 80 & 110', '2-Jul-24', 'NEW LIST', '74.45%'],
  ['CAEG218', '', '', '2.20', 'CCI CROSSROC PG - MINERAL WOOL', '6-Jan-25', 'NEW PAGE', '74.45%'],
  ['CAEG246', '3', '  T-12 CALCIUM SILICATE', '3.1', 'CAL SIL PIPE', '6-Jan-25', 'NEW LIST', '77.74%'],
  ['CAEG245', '', '', '3.2', 'CAL SIL PIPE FACTORY NESTED', '6-Jan-25', 'NEW LIST', '77.74%'],
  ['CAEG246', '', '', '3.3', 'CAL SIL QUADS & HEX ', '6-Jan-25', 'NEW LIST', '77.74%'],
  ['CAEG244', '', '', '3.4', 'CAL SIL BLOCK', '6-Jan-25', 'NEW LIST', '77.74%'],
  ['CAEG315', '', '', '3.5', 'CAL SIL FITTING 45 DEGREE', '6-Jan-25', 'NEW LIST', '77.74%'],
  ['CAEG316', '', '', '3.6', 'CAL SIL FITTING 90 DEGREE', '6-Jan-25', 'NEW LIST', '77.74%'],
  ['CAEG147', '4', 'FOAMGLAS', '4.1', 'PIPE', '6-Jan-25', '8-Jan-24', '41.35%'],
  ['CAEG147', '', '', '4.2', 'FOAMGLAS PIPE - SEGMENTS', '6-Jan-25', '8-Jan-24', '41.35%'],
  ['CAEG148', '', '', '4.3', 'FOAMGLAS CURVED SIDE WALL', '6-Jan-25', '8-Jan-24', '41.35%'],
  ['CAEG144', '', '', '4.4', 'FOAMGLAS BLOCK', '6-Jan-25', '8-Jan-24', '43.13%'],
  ['CAEG145 ', '', '', '4.5', 'FOAMGLAS ACCESSORIES', '6-Jan-25', '8-Jan-24', '41.55%'],
  ['CAEG270', '', '', '4.6', 'FOAMGLAS FITTINGS 45 DEG ELBOW', '6-Jan-25', '8-Jan-24', '41.35%'],
  ['CAEG270', '', '', '4.7', 'FOAMGLAS FITTINGS 90 DEG ELBOW', '6-Jan-25', '8-Jan-24', '41.35%'],
  ['CAEG270', '', '', '4.8', 'FOAMGLAS FITTINGS TEES', '6-Jan-25', '8-Jan-24', '41.35%'],
  ['CAEG193', '5', 'URETHANE', '5.1', 'URETHANE PIPE INSULATION', '6-Jan-25', '16-Jan-23', '74.93%'],
  ['CAEG193', '', '', '5.2', 'CURVED WALL SEGMENTS 2LB ', '6-Jan-25', '16-Jan-23', '74.93%'],
  ['CAEG190', '', '', '5.3', 'FITTING 45 DEG ELBOWS 2LB', '6-Jan-25', '16-Jan-23', '74.93%'],
  ['CAEG190', '', '', '5.4', 'FITTING 90 DEG ELBOWS 2LB', '6-Jan-25', '16-Jan-23', '74.93%'],
  ['CAEG190', '', '', '5.5', 'FITTING TEES 2LB', '6-Jan-25', '16-Jan-23', '74.93%'],
  ['CAEG317', '', '', '5.6', 'PIPE INSULATION 2LB W. ASJ', '6-Jan-25', '16-Jan-23', '74.93%'],
  ['CAEG188', '6', 'ELASTOMERIC (RUBBER)', '6.1', 'ARMAFLEX PIPE INSULATION', '6-Jan-25', '18-Apr-23', '64.30%'],
  ['CAEG173', '', '', '6.2', 'ARMAFLEX SELF SEAL TUBES', '6-Jan-25', '18-Apr-23', '64.30%'],
  ['CAEG186', '', '', '6.3', 'ARMAFLEX SHT&ROLL ', '6-Jan-25', '18-Apr-23', '64.30%'],
  ['CAEG194', '', '', '6.4', 'ARMAFLEX SHT&ROLL SS', '6-Jan-25', '18-Apr-23', '64.30%'],
  ['CAEG184', '', '', '6.5', 'ACCESSORIES', '6-Jan-25', '18-Apr-23', '27.70%'],
  ['CAEG185', '', '', '', 'ACCESSORIES', '6-Jan-25', '18-Apr-23', '21.90%'],
  ['CAEG268', '', '', '6.6', 'TUBOLIT SEMI-SLIT', '6-Jan-25', '18-Apr-23', '59.47%'],
  ['CAEG225', '', '', '6.7', 'TUBOLIT SELF SEAL', '6-Jan-25', '18-Apr-23', '59.47%'],
  ['CAEG289', '', '', '6.8', 'ARMAFLEX NH', '6-Jan-25', '18-Apr-23', '59.52%'],
  ['CAEG290', '', '', '6.9', 'UT SOLAFLEX', '6-Jan-25', '18-Apr-23', '58.74%'],
  ['CAEG350', '', '', '6.10', 'ARMAFIX ECOLIGHT PIPE SUPPORTS', '6-Jan-25', '18-Apr-23', '73.75%'],
  ['CAEG231', '7', 'STYROFOAM', '7.1', 'PIPE INSULATION', '6-Jan-25', '2-Jul-24', '46.95%'],
  ['CAEG232', '', '', '7.2', 'STYROFOAM FITTING 45 DEG ELBOW', '6-Jan-25', '2-Jul-24', '46.95%'],
  ['CAEG232', '', '', '7.3', 'STYROFOAM FITTING 90 DEG ELBOW', '6-Jan-25', '2-Jul-24', '46.95%'],
  ['CAEG232', '', '', '7.4', 'STYROFOAM FITTING TEES', '6-Jan-25', '2-Jul-24', '46.95%'],
  ['CAEG293', '', '', '7.5', 'PIPE INSULATION WITH ASJ', '6-Jan-25', '2-Jul-24', '46.95%'],
  ['CAEG134', '8', 'REFRACTORY PRODUCTS', '8.1', 'CERAMIC FIBER ROLLS - NUTEC', '8-Jan-24', 'NEW LIST', '80.00%'],
  ['CAEG338', '', '', '8.2', 'CERAMIC FIBER ROLLS - SUPERWOOL', '8-Jan-24', 'NEW LIST', '80.00%'],
  ['CAEG139', '', '', '', 'CERAMIC STRIPS', '8-Jan-24', 'NEW LIST', '80.00%'],
  ['CAEG339', '', '', '8.3', 'GLASS TAPE', '10-Jan-22', 'NEW PAGE', '43.90%'],
  ['CAEG340', '', '', '', 'CERTAINTEED HT BLANKET', '16-Jan-23', 'NEW LIST', '70.07%']
];

/**
 * Parse date string (e.g., "6-Jan-25", "NEW LIST")
 */
function parseDate(dateStr) {
  if (!dateStr || dateStr === 'NEW LIST' || dateStr === 'NEW PAGE') {
    return new Date(); // Use current date as fallback
  }
  
  // Parse formats like "6-Jan-25", "8-Jan-24"
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const day = parseInt(parts[0]);
    const monthMap = {
      'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
      'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
    };
    const month = monthMap[parts[1]];
    const year = 2000 + parseInt(parts[2]);
    return new Date(year, month, day);
  }
  
  return new Date();
}

/**
 * Parse discount percentage (e.g., "67.75%")
 */
function parseDiscount(discountStr) {
  if (!discountStr) return null;
  return parseFloat(discountStr.replace('%', ''));
}

/**
 * Import discounts from pricebook data
 */
async function importDiscounts() {
  try {
    console.log('🔗 Connecting to database...');
    const mongoUri = process.env.MONGODB_DEV_URI || process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_DEV_URI or MONGODB_URI must be set in .env.local');
    }
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to database\n');
    
    console.log('📊 Importing discounts from pricebook...');
    
    let created = 0;
    let updated = 0;
    let skipped = 0;
    
    // Track section info for rows that don't have it
    let currentSection = '';
    let currentSectionName = '';
    
    for (const row of DISCOUNT_DATA) {
      const [groupNo, section, sectionName, pageNum, pageName, effectiveDate, replacesDate, discount] = row;
      
      // Skip header rows
      if (!groupNo || groupNo === 'Group No.' || !pageName || !discount) {
        continue;
      }
      
      // Update current section info
      if (section) currentSection = section;
      if (sectionName && sectionName.trim()) currentSectionName = sectionName.trim();
      
      const discountPercent = parseDiscount(discount);
      if (!discountPercent) {
        skipped++;
        continue;
      }
      
      const effective = parseDate(effectiveDate);
      const replaces = replacesDate && replacesDate !== 'NEW LIST' && replacesDate !== 'NEW PAGE' 
        ? parseDate(replacesDate) 
        : null;
      
      // Build query - use combination of group and page number for uniqueness
      const query = {
        categoryGroup: groupNo
      };
      if (pageNum) {
        query.pricebookPageNumber = pageNum;
      } else {
        // If no page number, use page name as identifier
        query.pricebookPage = pageName.trim();
      }
      
      const discountDoc = await Discount.findOneAndUpdate(
        query,
        {
          name: pageName.trim(),
          code: groupNo,
          discountType: 'category',
          category: currentSectionName || 'UNKNOWN',
          categoryGroup: groupNo,
          section: currentSection || '',
          pricebookPage: pageName.trim(),
          pricebookPageNumber: pageNum || null,
          discountPercent: discountPercent,
          effectiveDate: effective,
          replacesDate: replaces,
          isActive: true,
          notes: `Imported from pricebook. Effective ${effectiveDate}, replaces ${replacesDate || 'N/A'}`
        },
        { upsert: true, new: true }
      );
      
      if (discountDoc.isNew) {
        created++;
      } else {
        updated++;
      }
    }
    
    console.log(`✅ Import completed:`);
    console.log(`   - Created: ${created}`);
    console.log(`   - Updated: ${updated}`);
    console.log(`   - Skipped: ${skipped}`);
    console.log(`   - Total: ${created + updated}`);
    
    // List summary by category
    const discounts = await Discount.find({ discountType: 'category' })
      .sort({ category: 1, discountPercent: -1 })
      .lean();
    
    const byCategory = {};
    discounts.forEach(d => {
      if (!byCategory[d.category]) byCategory[d.category] = [];
      byCategory[d.category].push(d);
    });
    
    console.log(`\n📋 Discounts by Category:`);
    for (const [category, items] of Object.entries(byCategory)) {
      const avgDiscount = items.reduce((sum, d) => sum + d.discountPercent, 0) / items.length;
      console.log(`   ${category}: ${items.length} discounts (avg: ${avgDiscount.toFixed(2)}%)`);
    }
    
  } catch (error) {
    console.error('❌ Error importing discounts:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from database');
  }
}

// Main execution
if (require.main === module) {
  importDiscounts()
    .then(() => {
      console.log('\n✅ Discount import completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Discount import failed:', error);
      process.exit(1);
    });
}

module.exports = { importDiscounts };

