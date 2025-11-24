# Pricebook View Solution

## Problem Solved

✅ **Can now see products organized by pricebook sections/pages** (matching Excel structure)  
✅ **Can query products from specific pricebook pages**  
✅ **Pricebook metadata stored with each product**

---

## What Was Added

### 1. Product Model Updates

Added pricebook metadata fields to `Product` model:

- **`pricebookSection`** - Section name (e.g., "FIBREGLASS", "MINERAL WOOL")
- **`pricebookPageNumber`** - Page number (e.g., "1.1", "1.2")
- **`pricebookPageName`** - Page name (e.g., "FIBREGLASS PIPE WITH ASJ")
- **`pricebookGroupCode`** - Group code (e.g., "CAEG171")

### 2. API Endpoints

**New endpoint:**
- `GET /api/products/by-pricebook` - Returns products organized by section → page → products

**Enhanced existing endpoint:**
- `GET /api/products` - Now supports query parameters:
  - `?pricebookSection=FIBREGLASS`
  - `?pricebookPageNumber=1.1`
  - `?pricebookGroupCode=CAEG171`

### 3. UI - Pricebook View

**New page:** `/pricebook`

- Browse products by pricebook structure
- Expandable sections and pages
- Search by page name, group code, or product name
- Shows product count per page
- Links to product detail pages

**Access:** Materials & Inventory → Pricebook View

### 4. Updated Ingestion Script

The `ingest-micro-lok-pricing.js` script now includes pricebook metadata when creating products.

---

## How to Query Products by Pricebook Page

### Via API

**Get all products from a specific page:**
```bash
GET /api/products?pricebookPageNumber=1.1
```

**Get products from a section:**
```bash
GET /api/products?pricebookSection=FIBREGLASS
```

**Get products by group code:**
```bash
GET /api/products?pricebookGroupCode=CAEG171
```

**Get organized structure:**
```bash
GET /api/products/by-pricebook
```

### Via UI

1. Go to **Materials & Inventory** → **Pricebook View**
2. Expand sections to see pages
3. Expand pages to see products
4. Use search to find specific pages/products

### Via Code

```javascript
// Query by page number
const products = await Product.find({ 
  pricebookPageNumber: '1.1' 
});

// Query by section
const products = await Product.find({ 
  pricebookSection: 'FIBREGLASS' 
});

// Query by group code
const products = await Product.find({ 
  pricebookGroupCode: 'CAEG171' 
});
```

---

## Example: Micro-Lok Product

The Micro-Lok product now has:

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

**Query results:**
- ✅ Found by section: `pricebookSection=FIBREGLASS`
- ✅ Found by page: `pricebookPageNumber=1.1`
- ✅ Found by group: `pricebookGroupCode=CAEG171`

---

## Pricebook Structure

The UI now shows products organized exactly like your Excel pricebook:

```
📄 FIBREGLASS (20 pages)
  ├── Page 1.1 - FIBREGLASS PIPE WITH ASJ [CAEG171]
  │   └── Micro-Lok ASJ Fibreglass Pipe Insulation (280 variants)
  ├── Page 1.2 - FIBERGLASS FITTING 45 DEGREE [CAEG164]
  │   └── Products...
  └── ...

📄 MINERAL WOOL (20 pages)
  ├── Page 2.1 - MINERAL WOOL PIPE INSULATION [CAEG212]
  │   └── Products...
  └── ...
```

---

## Updating Existing Products

To add pricebook metadata to existing products, update them with:

```javascript
await Product.findByIdAndUpdate(productId, {
  pricebookSection: 'FIBREGLASS',
  pricebookPageNumber: '1.1',
  pricebookPageName: 'FIBREGLASS PIPE WITH ASJ',
  pricebookGroupCode: 'CAEG171',
  'properties.categoryGroup': 'CAEG171' // For discount matching
});
```

---

## Benefits

✅ **Excel-like Structure** - View products exactly as in your pricebook  
✅ **Easy Navigation** - Browse by section/page hierarchy  
✅ **Query by Page** - Find all products from specific pricebook page  
✅ **Discount Matching** - Group codes enable automatic discount matching  
✅ **Search** - Find products by page name, group code, or product name  

---

## Next Steps

1. ✅ **Pricebook metadata added to Product model**
2. ✅ **API endpoints created**
3. ✅ **UI view created**
4. ✅ **Ingestion script updated**
5. **Update existing products** - Add pricebook metadata to products already in system
6. **Ingest remaining products** - Use updated scripts to ingest all pricebook pages

---

## Testing

Run the test script to verify queries work:

```bash
node scripts/test-pricebook-queries.js
```

**Results:**
- ✅ Query by section works
- ✅ Query by page number works
- ✅ Query by group code works
- ✅ Products organized correctly

---

## Summary

You can now:
1. ✅ **See products organized by pricebook structure** - Just like Excel
2. ✅ **Query products from specific pages** - Via API or UI
3. ✅ **Navigate by section/page** - Expandable tree view
4. ✅ **Search pricebook** - Find pages/products quickly

The system now matches your Excel pricebook structure!

