/**
 * Get Sheet GID Helper
 * 
 * Helps extract GID from Google Sheets URLs or hyperlinks.
 * 
 * Usage:
 *   node scripts/get-sheet-gid.js [url]
 * 
 * Or paste a URL/hyperlink and it will extract the GID.
 */

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function extractGid(url) {
  // Try to extract GID from various URL formats
  const patterns = [
    /[#&]gid=(\d+)/i,
    /gid=(\d+)/i,
    /\/edit#gid=(\d+)/i,
    /\/edit\?.*gid=(\d+)/i
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  let url = process.argv[2];
  
  if (!url) {
    console.log('\n📋 Sheet GID Extractor\n');
    console.log('Paste a Google Sheets URL or hyperlink that contains a GID.');
    console.log('Example: https://docs.google.com/spreadsheets/d/.../edit#gid=123456789\n');
    url = await question('URL or hyperlink: ');
  }
  
  if (!url || !url.trim()) {
    console.log('❌ No URL provided');
    rl.close();
    return;
  }
  
  const gid = extractGid(url.trim());
  
  if (gid) {
    console.log(`\n✅ Extracted GID: ${gid}\n`);
    console.log('Use this GID to fetch the sheet:');
    console.log(`  node scripts/import-next-sheet-with-gid.js ${gid}`);
  } else {
    console.log('\n❌ Could not extract GID from URL');
    console.log('Make sure the URL contains "gid=" followed by a number');
    console.log('Example: .../edit#gid=123456789');
  }
  
  rl.close();
}

main().catch((error) => {
  console.error('Error:', error);
  rl.close();
  process.exit(1);
});

