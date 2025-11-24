/**
 * Pricebook Import Helper
 * 
 * Helper script to fetch sheet data and prepare import commands
 * 
 * Usage:
 *   node scripts/pricebook-import-helper.js
 */

require('dotenv').config({ path: '.env.local', override: true });

// Discount summary data from the pricebook
const DISCOUNT_SUMMARY = [
  { groupCode: 'CAEG171', section: '1', pageNumber: '1.1', pageName: 'FIBREGLASS PIPE WITH ASJ', discount: 67.75 },
  { groupCode: 'CAEG164', section: '1', pageNumber: '1.2', pageName: 'FIBERGLASS FITTING 45 DEGREE', discount: 59.88 },
  { groupCode: 'CAEG164', section: '1', pageNumber: '1.3', pageName: 'FIBERGLASS FITTING 90 DEGREE', discount: 59.88 },
  { groupCode: 'CAEG164', section: '1', pageNumber: '1.4', pageName: 'FIBERGLASS FITTING TEES', discount: 59.88 },
  { groupCode: 'CAEG162', section: '1', pageNumber: '1.5', pageName: 'FIBREGLASS RC DUCTLINER', discount: 59.88 },
  { groupCode: 'CAEG163', section: '1', pageNumber: '', pageName: 'FIBREGLASS PM DUCTLINER', discount: 59.88 },
  { groupCode: 'CAEG160', section: '1', pageNumber: '1.6', pageName: 'FIBREGLASS OTHER HVAC INSULATION', discount: 59.88 },
  { groupCode: 'CAEG156', section: '1', pageNumber: '1.7', pageName: 'FACED BOARD', discount: 59.88 },
  { groupCode: 'CAEG348', section: '1', pageNumber: '', pageName: 'FACED BOARD', discount: 69.40 },
  { groupCode: 'CAEG154', section: '1', pageNumber: '', pageName: 'FACED BOARD', discount: 69.40 },
  { groupCode: 'CAEG159', section: '1', pageNumber: '1.8', pageName: 'PLAIN BOARD', discount: 59.88 },
  { groupCode: 'CAEG349', section: '1', pageNumber: '', pageName: 'PLAIN BOARD', discount: 59.88 },
  { groupCode: 'CAEG155', section: '1', pageNumber: '', pageName: 'PLAIN BOARD', discount: 59.88 },
  { groupCode: 'CAEG161', section: '1', pageNumber: '', pageName: 'PLAIN BOARD', discount: 59.88 },
  { groupCode: 'CAEG172', section: '1', pageNumber: '1.9', pageName: 'PIPE & TANK WRAP', discount: 59.88 },
  { groupCode: 'CAEG330', section: '1', pageNumber: '', pageName: 'PIPE & TANK WRAP', discount: 80.80 },
  { groupCode: 'CAEG167', section: '1', pageNumber: '1.10', pageName: 'DUCT WRAP', discount: 59.88 },
  { groupCode: 'CAEG322', section: '1', pageNumber: '', pageName: 'DUCT WRAP', discount: 59.88 },
  { groupCode: 'CAEG165', section: '1', pageNumber: '', pageName: 'DUCT WRAP', discount: 59.88 },
  { groupCode: 'CAEG266', section: '1', pageNumber: '1.11', pageName: 'OEM PRODUCTS', discount: 59.88 },
  { groupCode: 'CAEG212', section: '2', pageNumber: '2.1', pageName: 'MINERAL WOOL PIPE INSULATION', discount: 76.50 },
  { groupCode: 'CAEG347', section: '2', pageNumber: '2.2', pageName: 'MINERAL WOOL PIPE - JOHNS MANVILLE', discount: 72.41 },
  { groupCode: 'CAEG198', section: '2', pageNumber: '2.3', pageName: 'MINERAL WOOL FITTING 45 DEGREE', discount: 72.41 },
  { groupCode: 'CAEG198', section: '2', pageNumber: '2.4', pageName: 'MINERAL WOOL FITTING 90 DEGREE', discount: 72.41 },
  { groupCode: 'CAEG198', section: '2', pageNumber: '2.5', pageName: 'MINERAL WOOL FITTING TEE', discount: 72.41 },
  { groupCode: 'CAEG321', section: '2', pageNumber: '2.6', pageName: 'ROCKWOOL PIPE WITH ASJ', discount: 72.41 },
  { groupCode: 'CAEG211', section: '2', pageNumber: '2.7', pageName: 'MINERAL WOOL - ROCKWOOL PIPE & TANK', discount: 72.41 },
  { groupCode: 'CAEG296', section: '2', pageNumber: '2.8', pageName: 'MINERAL WOOL - CCI PIPE & TANK', discount: 85.20 },
  { groupCode: 'CAEG213', section: '2', pageNumber: '2.9', pageName: 'INDUSTRIAL BOARD 2 TO 8LB DENSITY', discount: 72.41 },
  { groupCode: 'CAEG217', section: '2', pageNumber: '2.10', pageName: 'INDUSTRIAL BOARD 10 TO 12LB DENSITY', discount: 72.41 },
  { groupCode: 'CAEG205', section: '2', pageNumber: '2.11', pageName: 'INDUSTRIAL FLEXIBLE BATTS', discount: 72.41 },
  { groupCode: 'CAEG275', section: '2', pageNumber: '2.12', pageName: 'JM MPT FIELD PREFORMED PIPE', discount: 72.41 },
  { groupCode: 'CAEG206', section: '2', pageNumber: '2.13', pageName: 'ROCKWOOL FABROCK LT', discount: 74.45 },
  { groupCode: 'CAEG200', section: '2', pageNumber: '2.14', pageName: 'COMMERCIAL WALL', discount: 74.45 },
  { groupCode: 'CAEG219', section: '2', pageNumber: '2.15', pageName: 'ROCKWOOL ROCKBOARD', discount: 74.45 },
  { groupCode: 'CAEG207', section: '2', pageNumber: '2.16', pageName: 'ROCKWOOL PLUS MB / FIRE WALL', discount: 74.45 },
  { groupCode: 'CAEG201', section: '2', pageNumber: '2.17', pageName: 'CURTAIN WALL APPLICATION', discount: 74.45 },
  { groupCode: 'CAEG221', section: '2', pageNumber: '2.18', pageName: 'MINERAL WOOL SAFE & SAFE STRIPS', discount: 74.45 },
  { groupCode: 'CAEG323', section: '2', pageNumber: '2.19', pageName: 'ROCKWOOL COMFORTBOARD 80 & 110', discount: 74.45 },
  { groupCode: 'CAEG218', section: '2', pageNumber: '2.20', pageName: 'CCI CROSSROC PG - MINERAL WOOL', discount: 74.45 },
  { groupCode: 'CAEG246', section: '3', pageNumber: '3.1', pageName: 'CAL SIL PIPE', discount: 77.74 },
  { groupCode: 'CAEG245', section: '3', pageNumber: '3.2', pageName: 'CAL SIL PIPE FACTORY NESTED', discount: 77.74 },
  { groupCode: 'CAEG246', section: '3', pageNumber: '3.3', pageName: 'CAL SIL QUADS & HEX', discount: 77.74 },
  { groupCode: 'CAEG244', section: '3', pageNumber: '3.4', pageName: 'CAL SIL BLOCK', discount: 77.74 },
  { groupCode: 'CAEG315', section: '3', pageNumber: '3.5', pageName: 'CAL SIL FITTING 45 DEGREE', discount: 77.74 },
  { groupCode: 'CAEG316', section: '3', pageNumber: '3.6', pageName: 'CAL SIL FITTING 90 DEGREE', discount: 77.74 },
  { groupCode: 'CAEG147', section: '4', pageNumber: '4.1', pageName: 'PIPE', discount: 41.35 },
  { groupCode: 'CAEG147', section: '4', pageNumber: '4.2', pageName: 'FOAMGLAS PIPE - SEGMENTS', discount: 41.35 },
  { groupCode: 'CAEG148', section: '4', pageNumber: '4.3', pageName: 'FOAMGLAS CURVED SIDE WALL', discount: 41.35 },
  { groupCode: 'CAEG144', section: '4', pageNumber: '4.4', pageName: 'FOAMGLAS BLOCK', discount: 43.13 },
  { groupCode: 'CAEG145', section: '4', pageNumber: '4.5', pageName: 'FOAMGLAS ACCESSORIES', discount: 41.55 },
  { groupCode: 'CAEG270', section: '4', pageNumber: '4.6', pageName: 'FOAMGLAS FITTINGS 45 DEG ELBOW', discount: 41.35 },
  { groupCode: 'CAEG270', section: '4', pageNumber: '4.7', pageName: 'FOAMGLAS FITTINGS 90 DEG ELBOW', discount: 41.35 },
  { groupCode: 'CAEG270', section: '4', pageNumber: '4.8', pageName: 'FOAMGLAS FITTINGS TEES', discount: 41.35 },
  { groupCode: 'CAEG193', section: '5', pageNumber: '5.1', pageName: 'URETHANE PIPE INSULATION', discount: 74.93 },
  { groupCode: 'CAEG193', section: '5', pageNumber: '5.2', pageName: 'CURVED WALL SEGMENTS 2LB', discount: 74.93 },
  { groupCode: 'CAEG190', section: '5', pageNumber: '5.3', pageName: 'FITTING 45 DEG ELBOWS 2LB', discount: 74.93 },
  { groupCode: 'CAEG190', section: '5', pageNumber: '5.4', pageName: 'FITTING 90 DEG ELBOWS 2LB', discount: 74.93 },
  { groupCode: 'CAEG190', section: '5', pageNumber: '5.5', pageName: 'FITTING TEES 2LB', discount: 74.93 },
  { groupCode: 'CAEG317', section: '5', pageNumber: '5.6', pageName: 'PIPE INSULATION 2LB W. ASJ', discount: 74.93 },
  { groupCode: 'CAEG188', section: '6', pageNumber: '6.1', pageName: 'ARMAFLEX PIPE INSULATION', discount: 64.30 },
  { groupCode: 'CAEG173', section: '6', pageNumber: '6.2', pageName: 'ARMAFLEX SELF SEAL TUBES', discount: 64.30 },
  { groupCode: 'CAEG186', section: '6', pageNumber: '6.3', pageName: 'ARMAFLEX SHT&ROLL', discount: 64.30 },
  { groupCode: 'CAEG194', section: '6', pageNumber: '6.4', pageName: 'ARMAFLEX SHT&ROLL SS', discount: 64.30 },
  { groupCode: 'CAEG184', section: '6', pageNumber: '6.5', pageName: 'ACCESSORIES', discount: 27.70 },
  { groupCode: 'CAEG185', section: '6', pageNumber: '', pageName: 'ACCESSORIES', discount: 21.90 },
  { groupCode: 'CAEG268', section: '6', pageNumber: '6.6', pageName: 'TUBOLIT SEMI-SLIT', discount: 59.47 },
  { groupCode: 'CAEG225', section: '6', pageNumber: '6.7', pageName: 'TUBOLIT SELF SEAL', discount: 59.47 },
  { groupCode: 'CAEG289', section: '6', pageNumber: '6.8', pageName: 'ARMAFLEX NH', discount: 59.52 },
  { groupCode: 'CAEG290', section: '6', pageNumber: '6.9', pageName: 'UT SOLAFLEX', discount: 58.74 },
  { groupCode: 'CAEG350', section: '6', pageNumber: '6.10', pageName: 'ARMAFIX ECOLIGHT PIPE SUPPORTS', discount: 73.75 },
  { groupCode: 'CAEG231', section: '7', pageNumber: '7.1', pageName: 'PIPE INSULATION', discount: 46.95 },
  { groupCode: 'CAEG232', section: '7', pageNumber: '7.2', pageName: 'STYROFOAM FITTING 45 DEG ELBOW', discount: 46.95 },
  { groupCode: 'CAEG232', section: '7', pageNumber: '7.3', pageName: 'STYROFOAM FITTING 90 DEG ELBOW', discount: 46.95 },
  { groupCode: 'CAEG232', section: '7', pageNumber: '7.4', pageName: 'STYROFOAM FITTING TEES', discount: 46.95 },
  { groupCode: 'CAEG293', section: '7', pageNumber: '7.5', pageName: 'PIPE INSULATION WITH ASJ', discount: 46.95 },
  { groupCode: 'CAEG134', section: '8', pageNumber: '8.1', pageName: 'CERAMIC FIBER ROLLS - NUTEC', discount: 80.00 },
  { groupCode: 'CAEG338', section: '8', pageNumber: '8.2', pageName: 'CERAMIC FIBER ROLLS - SUPERWOOL', discount: 80.00 },
  { groupCode: 'CAEG139', section: '8', pageNumber: '', pageName: 'CERAMIC STRIPS', discount: 80.00 },
  { groupCode: 'CAEG339', section: '8', pageNumber: '8.3', pageName: 'GLASS TAPE', discount: 43.90 },
  { groupCode: 'CAEG340', section: '8', pageNumber: '', pageName: 'CERTAINTEED HT BLANKET', discount: 70.07 }
];

function generateImportCommands() {
  console.log('📋 Import Commands for Pricebook Sheets\n');
  console.log('Copy and run these commands one at a time:\n');
  
  DISCOUNT_SUMMARY.forEach((sheet, index) => {
    const pageNameEscaped = sheet.pageName.replace(/"/g, '\\"');
    console.log(`# ${index + 1}. ${sheet.pageName} (${sheet.pageNumber || 'no page #'})`);
    console.log(`node scripts/import-pricebook-sheet.js "${pageNameEscaped}" "" "${sheet.groupCode}" "${sheet.section}" "${sheet.pageNumber || ''}" "${sheet.discount}"`);
    console.log('');
  });
}

function showProgress() {
  const { loadProgress } = require('./import-pricebook-sheet');
  const progress = loadProgress();
  
  console.log('📊 Import Progress\n');
  console.log(`✅ Completed: ${progress.completed.length}`);
  console.log(`❌ Failed: ${progress.failed.length}`);
  console.log(`📄 Remaining: ${DISCOUNT_SUMMARY.length - progress.completed.length - progress.failed.length}\n`);
  
  if (progress.completed.length > 0) {
    console.log('Completed sheets:');
    progress.completed.forEach(s => {
      console.log(`  ✅ ${s.name} - ${s.result?.variantsCreated || 0} variants`);
    });
    console.log('');
  }
  
  if (progress.failed.length > 0) {
    console.log('Failed sheets:');
    progress.failed.forEach(s => {
      console.log(`  ❌ ${s.name} - ${s.error}`);
    });
    console.log('');
  }
}

if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'commands') {
    generateImportCommands();
  } else if (command === 'progress') {
    showProgress();
  } else {
    console.log('Usage:');
    console.log('  node scripts/pricebook-import-helper.js commands  # Generate import commands');
    console.log('  node scripts/pricebook-import-helper.js progress  # Show import progress');
  }
}

module.exports = { DISCOUNT_SUMMARY };

