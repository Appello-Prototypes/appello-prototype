# Multi-Distributor Product Architecture

## Problem Statement

When the same product (same manufacturer, same product name) is sold by multiple distributors, each distributor:
- Sets their own prices (list, net, discount %)
- Has their own price sheets
- May have different variant pricing
- May have different discounts

**Example:**
- Product: "K-Flex EPDM Pipe Insulation"
- Manufacturer: K-Flex USA
- Distributor A (IMPRO): List $10/ft, Net $8/ft (20% discount)
- Distributor B (Crossroads): List $11/ft, Net $9/ft (18% discount)
- Same product, same manufacturer, different distributors = different prices

## Current Issues

1. **Product Identification**: Products are currently found by `name` only, which can create duplicates
2. **Supplier Array Replacement**: When importing, the entire `suppliers` array is replaced, losing other distributor entries
3. **Variant Supplier Replacement**: Same issue at variant level
4. **No Deduplication**: Same product from different distributors creates separate product records

## Solution: Product Uniqueness by Manufacturer + Name

### Core Principle

**One Product Record = One Unique Product (Manufacturer + Name)**
- Products are identified by: `manufacturerId + name`
- Multiple distributors can supply the same product
- Each distributor's pricing is stored in the `suppliers` array
- Variants also support multiple distributor entries

### Data Model

```javascript
Product {
  name: "K-Flex EPDM Pipe Insulation",
  manufacturerId: ObjectId("..."), // K-Flex USA
  distributorId: ObjectId("..."), // Primary/most recent distributor
  
  // Multiple distributor entries - each distributor has their own pricing
  suppliers: [
    {
      distributorId: ObjectId("..."), // IMPRO
      manufacturerId: ObjectId("..."), // K-Flex USA
      listPrice: 10.00,
      netPrice: 8.00,
      discountPercent: 20,
      isPreferred: true
    },
    {
      distributorId: ObjectId("..."), // Crossroads
      manufacturerId: ObjectId("..."), // K-Flex USA
      listPrice: 11.00,
      netPrice: 9.00,
      discountPercent: 18,
      isPreferred: false
    }
  ],
  
  variants: [
    {
      name: "1/2\" Copper - 1\" Thickness",
      suppliers: [
        {
          distributorId: ObjectId("..."), // IMPRO
          manufacturerId: ObjectId("..."),
          listPrice: 10.50,
          netPrice: 8.40,
          discountPercent: 20
        },
        {
          distributorId: ObjectId("..."), // Crossroads
          manufacturerId: ObjectId("..."),
          listPrice: 11.50,
          netPrice: 9.43,
          discountPercent: 18
        }
      ]
    }
  ]
}
```

### Import Logic Changes

#### Before (Current - Problematic)
```javascript
// Finds product by name only - can create duplicates
const product = await Product.findOneAndUpdate(
  { name: productName },
  {
    suppliers: [{ distributorId: currentDistributor._id, ... }] // REPLACES entire array
  },
  { upsert: true }
);
```

#### After (Proposed - Correct)
```javascript
// Finds product by manufacturer + name - ensures uniqueness
const product = await Product.findOneAndUpdate(
  { 
    name: productName,
    manufacturerId: manufacturer._id // KEY: Include manufacturer in query
  },
  {
    // Set primary distributor (most recent)
    distributorId: currentDistributor._id,
    manufacturerId: manufacturer._id,
    
    // Merge supplier entry instead of replacing
    $addToSet: {
      suppliers: {
        distributorId: currentDistributor._id,
        manufacturerId: manufacturer._id,
        listPrice: ...,
        netPrice: ...,
        discountPercent: ...
      }
    }
  },
  { upsert: true, new: true }
);

// Then update the supplier entry if it already exists (update pricing)
await Product.updateOne(
  { 
    _id: product._id,
    'suppliers.distributorId': currentDistributor._id
  },
  {
    $set: {
      'suppliers.$.listPrice': ...,
      'suppliers.$.netPrice': ...,
      'suppliers.$.discountPercent': ...
    }
  }
);
```

### Variant Import Logic

Similar approach for variants:
1. Find variant by properties (e.g., pipeDiameter + thickness)
2. If variant exists, merge/add distributor entry to `variants[].suppliers`
3. If variant doesn't exist, create it with distributor entry

### Price Sheet Organization

**Price sheets are organized by distributor:**
- Each distributor has their own price book
- When importing Distributor A's sheet:
  - Find products by `manufacturerId + name`
  - Add/update Distributor A's pricing
  - Keep Distributor B's pricing intact
- When importing Distributor B's sheet:
  - Find same products
  - Add/update Distributor B's pricing
  - Keep Distributor A's pricing intact

### UI Implications

1. **Product List**: Show all products, filter by distributor/manufacturer
2. **Product Detail**: Show all distributor options with pricing comparison
3. **Product Form**: Allow selecting/managing multiple distributors
4. **Price Comparison**: Show side-by-side pricing from different distributors

### Migration Strategy

1. **Identify Duplicates**: Find products with same `manufacturerId + name`
2. **Merge Products**: Combine duplicate products into one
3. **Merge Suppliers**: Combine `suppliers` arrays (deduplicate by distributorId)
4. **Merge Variants**: Match variants by properties, merge supplier entries
5. **Set Primary Distributor**: Use most recent or preferred distributor

### Benefits

✅ **No Duplication**: One product record per unique product
✅ **Multiple Distributors**: Same product can have multiple distributor entries
✅ **Price Comparison**: Easy to compare prices across distributors
✅ **Price Sheet Import**: Each distributor's sheet updates only their pricing
✅ **Data Integrity**: Manufacturer + Name ensures uniqueness
✅ **Flexible**: Can add/remove distributors without losing data

### Implementation Steps

1. ✅ Update Product model (already supports multiple suppliers)
2. ⏳ Update import scripts to use `manufacturerId + name` for finding products
3. ⏳ Update import scripts to merge supplier entries instead of replacing
4. ⏳ Update variant import logic to merge distributor entries
5. ⏳ Create migration script to deduplicate existing products
6. ⏳ Update UI to show/manage multiple distributors
7. ⏳ Update product queries to support distributor filtering

