/**
 * Parse Sheet URLs CSV
 * 
 * Extracts sheet names and GIDs from the CSV file
 */

const fs = require('fs');
const path = require('path');

const CSV_FILE = path.join(__dirname, '..', 'VANOS INSULATION- CCI CATALOGUE - JANUARY, 2025 - Sheet URLs.csv');

function parseCSV() {
  const content = fs.readFileSync(CSV_FILE, 'utf8');
  const lines = content.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',');
  
  const sheets = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // Handle CSV parsing (simple split, may need improvement for quoted values)
    const parts = line.split(',');
    if (parts.length >= 2) {
      const sheetName = parts[0].trim();
      const url = parts.slice(1).join(',').trim(); // In case URL contains commas
      
      // Extract GID from URL
      const gidMatch = url.match(/gid=(\d+)/);
      if (gidMatch) {
        sheets.push({
          name: sheetName,
          url: url,
          gid: gidMatch[1]
        });
      }
    }
  }
  
  return sheets;
}

if (require.main === module) {
  const sheets = parseCSV();
  console.log(`Found ${sheets.length} sheets with GIDs`);
  console.log('\nFirst 5:');
  sheets.slice(0, 5).forEach(s => {
    console.log(`  ${s.name}: GID=${s.gid}`);
  });
}

module.exports = { parseCSV };

