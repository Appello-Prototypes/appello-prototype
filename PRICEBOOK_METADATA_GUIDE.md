# Pricebook Metadata Guide

## Overview

Products now include pricebook metadata to match the Excel pricebook structure, allowing you to:
- View products organized by pricebook sections and pages
- Query products from specific pricebook pages
- Match products to discounts by group code

## Pricebook Fields

Each product now has these fields:

- **`pricebookSection`** - Section name (e.g., "FIBREGLASS", "MINERAL WOOL")
- **`pricebookPageNumber`** - Page number (e.g., "1.1", "1.2", "2.1")
- **`pricebookPageName`** - Page name (e.g., "FIBREGLASS PIPE WITH ASJ")
- **`pricebookGroupCode`** - Group code (e.g., "CAEG171", "CAEG164")

## Querying Products by Pricebook

### Via API

**Get all products from a specific section:**
```
GET /api/products?pricebookSection=FIBREGLASS
```

**Get products from a specific page:**
```
GET /api/products?pricebookPageNumber=1.1
```

**Get products by group code:**
```
GET /api/products?pricebookGroupCode=CAEG171
```

**Get organized pricebook structure:**
```
GET /api/products/by-pricebook
```
Returns products organized by section → page → products

### Via UI

1. Navigate to **Materials & Inventory** → **Pricebook View**
2. Browse by section and page
3. Expand sections/pages to see products
4. Search by page name, group code, or product name

## Example: Micro-Lok Product

```javascript
{
  name: "Micro-Lok ASJ Fibreglass Pipe Insulation",
  pricebookSection: "FIBREGLASS",
  pricebookPageNumber: "1.1",
  pricebookPageName: "FIBREGLASS PIPE WITH ASJ",
  pricebookGroupCode: "CAEG171",
  category: "Insulation",
  properties: {
    categoryGroup: "CAEG171" // For discount matching
  }
}
```

## Updating Existing Products

To add pricebook metadata to existing products:

```javascript
// Update product with pricebook info
await Product.findByIdAndUpdate(productId, {
  pricebookSection: 'FIBREGLASS',
  pricebookPageNumber: '1.1',
  pricebookPageName: 'FIBREGLASS PIPE WITH ASJ',
  pricebookGroupCode: 'CAEG171',
  'properties.categoryGroup': 'CAEG171' // For discount matching
});
```

## Discount Matching

Products are matched to discounts using:
1. **Category** - `product.category` matches `discount.category`
2. **Group Code** - `product.properties.categoryGroup` matches `discount.categoryGroup`

Ensure both are set during ingestion for proper discount matching.

## Pricebook Structure

The pricebook is organized as:

```
Section (e.g., FIBREGLASS)
  └── Page 1.1 (FIBREGLASS PIPE WITH ASJ) - Group: CAEG171
      └── Products...
  └── Page 1.2 (FIBERGLASS FITTING 45 DEGREE) - Group: CAEG164
      └── Products...
```

## Benefits

✅ **Organized View** - See products exactly as in Excel pricebook  
✅ **Easy Navigation** - Browse by section/page structure  
✅ **Query by Page** - Find all products from specific pricebook page  
✅ **Discount Matching** - Automatic matching via group codes  
✅ **Excel-like Structure** - Matches your existing pricebook format

