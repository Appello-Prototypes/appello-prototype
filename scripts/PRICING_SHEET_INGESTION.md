# Pricing Sheet Ingestion System

This system allows you to ingest supplier pricing sheets (like Google Sheets) and automatically create products with variants in the Appello system.

## Overview

The pricing sheet ingestion system processes supplier pricing data and creates:
- **Supplier** records (if they don't exist)
- **Product** records with all variations
- **Product Variants** for each combination of specifications
- **List Prices** stored in variant suppliers (discount pricing can be applied later)

## Current Implementation

### Micro-Lok ASJ Fibreglass Pipe Insulation

**Script:** `scripts/ingest-micro-lok-pricing.js`

This script processes the Micro-Lok ASJ Fibreglass Pipe Insulation pricing sheet and creates:
- Supplier: Crossroads C&I
- Product: Micro-Lok ASJ Fibreglass Pipe Insulation
- Variants: All combinations of:
  - Pipe Type: Copper or Iron
  - Pipe Diameter: Various sizes (5/8" to 24")
  - Insulation Thickness: 1/2", 1", 1 1/2", 2", 2 1/2", 3", 3 1/2", 4"
- List Prices: Stored per variant (discount pricing to be applied separately)

**Usage:**
```bash
node scripts/ingest-micro-lok-pricing.js
```

## Data Structure

### Pricing Sheet Format

The pricing sheet should follow this structure:
- **Row 1:** Headers (optional)
- **Rows 2+:** Data rows with format:
  ```
  [Copper Diameter, Iron Diameter, Price 1/2", Price 1", Price 1.5", Price 2", Price 2.5", Price 3", Price 3.5", Price 4"]
  ```

### Example Row:
```
['1 3/8', '1', '4.32', '5.22', '9.09', '14.41', '16.94', '22.92', '', '']
```

This creates variants for:
- 1 3/8" Copper Pipe with 1/2", 1", 1.5", 2", 2.5", 3" insulation
- 1" Iron Pipe with 1/2", 1", 1.5", 2", 2.5", 3" insulation

## Processing 1000+ Sheets

To process multiple pricing sheets, you have two options:

### Option 1: Create Individual Scripts (Recommended for Different Formats)

Create a new script for each supplier/product type:

1. **Copy the template:**
   ```bash
   cp scripts/ingest-micro-lok-pricing.js scripts/ingest-[supplier-name]-[product-type].js
   ```

2. **Update the configuration:**
   - Modify `PRICING_DATA` array with your sheet data
   - Update `INSULATION_THICKNESSES` or equivalent column headers
   - Update supplier name and product information
   - Adjust parsing functions if needed

3. **Run the script:**
   ```bash
   node scripts/ingest-[supplier-name]-[product-type].js
   ```

### Option 2: Google Sheets API Integration (For Automated Processing)

For processing 1000+ sheets automatically, integrate with Google Sheets API:

1. **Install Google Sheets API package:**
   ```bash
   npm install googleapis
   ```

2. **Set up Google API credentials:**
   - Create a service account in Google Cloud Console
   - Download credentials JSON file
   - Set `GOOGLE_SHEETS_CREDENTIALS` environment variable

3. **Use the generic script:**
   ```bash
   node scripts/ingest-pricing-sheet.js [spreadsheet-id] [sheet-name]
   ```

4. **Implement `fetchPricingDataFromGoogleSheets()` function:**
   ```javascript
   const { GoogleSpreadsheet } = require('google-spreadsheet');
   
   async function fetchPricingDataFromGoogleSheets(spreadsheetId, sheetName) {
     const doc = new GoogleSpreadsheet(spreadsheetId);
     await doc.useServiceAccountAuth(require(process.env.GOOGLE_SHEETS_CREDENTIALS));
     await doc.loadInfo();
     const sheet = doc.sheetsByTitle[sheetName];
     const rows = await sheet.getRows();
     return rows.map(row => row._rawData);
   }
   ```

## Extending for Different Product Types

### Step 1: Create/Update ProductType

Ensure the ProductType exists with appropriate properties:

```javascript
const productType = await ProductType.findOneAndUpdate(
  { slug: 'your-product-type-slug' },
  {
    name: 'Your Product Type',
    slug: 'your-product-type-slug',
    properties: [
      // Define properties that vary between products
      {
        key: 'property1',
        label: 'Property 1',
        type: 'enum', // or 'string', 'number', etc.
        variantKey: true, // Set to true if this creates variants
        options: [...] // For enum types
      }
    ],
    variantSettings: {
      enabled: true,
      variantProperties: ['property1', 'property2'], // Properties that create variants
      namingTemplate: '{name} - {property1} {property2}'
    }
  },
  { upsert: true, new: true }
);
```

### Step 2: Parse Your Data Format

Update the parsing logic to match your sheet format:

```javascript
// Example: Parse your specific data structure
for (const row of YOUR_DATA) {
  const property1 = parseProperty1(row[0]);
  const property2 = parseProperty2(row[1]);
  const prices = row.slice(2); // Prices for different variations
  
  // Create variants based on your logic
}
```

### Step 3: Generate Variants

Create variant objects with:
- `sku`: Unique SKU for the variant
- `name`: Human-readable name
- `properties`: Map of property values
- `pricing.lastPrice`: List price
- `suppliers`: Array with supplier info and list price

## Key Features

### ✅ Automatic Supplier Creation
- Creates supplier if it doesn't exist
- Updates supplier info if it exists

### ✅ Product Variants
- Creates variants for each valid combination
- Skips invalid entries (empty prices, "-", etc.)
- Generates unique SKUs

### ✅ List Price Storage
- Stores list prices in `variant.suppliers[].lastPrice`
- Stores list prices in `variant.pricing.lastPrice`
- Ready for discount pricing application

### ✅ Product Properties
- Stores product metadata (effective dates, specifications)
- Stores variant-specific properties (pipe type, diameter, thickness)

## Discount Pricing

List prices are stored in the system. To apply discount pricing:

1. **Manual Update:** Update prices through the UI
2. **Bulk Update Script:** Create a script to apply discount percentages
3. **Supplier Discount Rules:** Implement discount rules based on supplier agreements

Example discount application:
```javascript
// Apply 15% discount to all variants
product.variants.forEach(variant => {
  const listPrice = variant.pricing.lastPrice;
  const discountedPrice = listPrice * 0.85; // 15% discount
  variant.pricing.lastPrice = discountedPrice;
  variant.suppliers[0].lastPrice = discountedPrice;
});
await product.save();
```

## Troubleshooting

### Issue: Variants not created
- **Check:** Data format matches expected structure
- **Check:** Price parsing handles your format (empty strings, "-", etc.)
- **Check:** Pipe diameter parsing handles your format

### Issue: Duplicate products
- **Solution:** Script uses `findOneAndUpdate` with upsert, so it updates existing products
- **Check:** Product name matches exactly

### Issue: Map serialization errors
- **Solution:** Mongoose handles Map types automatically
- **Check:** Properties are set as `new Map([['key', 'value']])`

## Next Steps

1. **Test the current script:**
   ```bash
   node scripts/ingest-micro-lok-pricing.js
   ```

2. **Review created data:**
   - Check supplier in Companies list
   - Check product in Products list
   - Review variants and pricing

3. **Apply discount pricing:**
   - Create discount application script
   - Or update manually through UI

4. **Process additional sheets:**
   - Create new scripts for each supplier/product type
   - Or implement Google Sheets API integration

5. **Scale for 1000+ sheets:**
   - Implement batch processing
   - Add error handling and logging
   - Create monitoring dashboard

## Example: Processing Multiple Sheets

```bash
# Process Micro-Lok pricing
node scripts/ingest-micro-lok-pricing.js

# Process another supplier's pricing
node scripts/ingest-supplier2-pricing.js

# Process via Google Sheets API
node scripts/ingest-pricing-sheet.js 1jPiqGYX50h4xoppioH2dEb4Fo-NZL4Pch1l9AA5kgo8 "Sheet1"
```

## Notes

- **List Prices:** All prices stored are list prices. Discount pricing should be applied separately.
- **Unit of Measure:** Currently set to 'FT' (lineal feet). Adjust as needed for your products.
- **Database:** Scripts use `MONGODB_DEV_URI` for local development. Ensure `.env.local` is configured.
- **Idempotency:** Scripts are idempotent - running multiple times updates existing records rather than creating duplicates.

