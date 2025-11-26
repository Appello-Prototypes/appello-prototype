# Distributor-Supplier Relationships Implementation

## Overview

This document describes the implementation of distributor-supplier relationships, allowing:
- Distributors to have multiple suppliers (manufacturers)
- Suppliers to sell to multiple distributors
- Products to be associated with distributor-supplier combinations
- Different pricing for the same product from different distributors

## Key Concepts

### Company Types
- **Distributor**: Companies we buy from (e.g., IMPRO)
- **Supplier**: Companies that manufacture products (e.g., K-Flex USA, Armacell)
- **Customer**: Companies we sell to
- **Subcontractor**: Subcontracting companies

### Relationships
- **Distributor → Suppliers**: Many-to-many relationship
  - A distributor can work with multiple suppliers
  - A supplier can work with multiple distributors
  - Tracked in `Company.distributorSuppliers` array

### Product Pricing
- **Distributors set the price** - not suppliers
- Same product can have different prices from different distributors
- Product variants track pricing per distributor-supplier combination
- Pricing stored in `Product.suppliers[]` and `Product.variants[].suppliers[]`

## Data Model

### Company Model
```javascript
{
  companyType: 'distributor' | 'supplier' | 'customer' | 'subcontractor' | 'other',
  distributorSuppliers: [{
    supplierId: ObjectId, // Reference to supplier (manufacturer)
    isActive: Boolean,
    addedDate: Date,
    notes: String
  }]
}
```

### Product Model
```javascript
{
  manufacturerId: ObjectId, // Primary manufacturer
  distributorId: ObjectId,  // Primary distributor
  suppliers: [{
    distributorId: ObjectId,    // REQUIRED - Distributor who sets the price
    supplierId: ObjectId,      // Legacy field
    manufacturerId: ObjectId,   // REQUIRED - Supplier/manufacturer
    listPrice: Number,          // Price set by distributor
    netPrice: Number,           // Price set by distributor
    discountPercent: Number,
    isPreferred: Boolean
  }],
  variants: [{
    suppliers: [{
      distributorId: ObjectId,    // REQUIRED - Distributor who sets the price
      manufacturerId: ObjectId,   // REQUIRED - Supplier/manufacturer
      listPrice: Number,          // Price set by distributor
      netPrice: Number            // Price set by distributor
    }]
  }]
}
```

## API Endpoints

### Distributor-Supplier Relationships

#### GET `/api/companies/:id/distributor-suppliers`
Get all suppliers for a distributor

#### GET `/api/companies/:id/supplier-distributors`
Get all distributors for a supplier

#### POST `/api/companies/:id/distributor-suppliers`
Add a supplier to a distributor
```json
{
  "supplierId": "supplier_id",
  "notes": "Optional notes"
}
```

#### DELETE `/api/companies/:id/distributor-suppliers/:supplierId`
Remove a supplier from a distributor

## Import Scripts

Import scripts automatically:
1. Create distributor-supplier relationships when importing products
2. Set `distributorId` as the primary field (distributor sets the price)
3. Set `manufacturerId` to the supplier/manufacturer
4. Store pricing per distributor-supplier combination

## Usage Examples

### Adding a Supplier to a Distributor
```javascript
// Via API
POST /api/companies/{distributorId}/distributor-suppliers
{
  "supplierId": "manufacturer_id",
  "notes": "Started carrying this manufacturer in 2025"
}
```

### Querying Products by Distributor-Supplier Combination
```javascript
// Find products from a specific distributor-supplier combination
Product.find({
  'suppliers.distributorId': distributorId,
  'suppliers.manufacturerId': manufacturerId
})
```

### Finding All Suppliers for a Distributor
```javascript
// Via API
GET /api/companies/{distributorId}/distributor-suppliers

// Direct query
const distributor = await Company.findById(distributorId)
  .populate('distributorSuppliers.supplierId');
```

## Migration Notes

- Existing products with `supplierId` are migrated to use `distributorId`
- `supplierId` field kept for backward compatibility
- Import scripts automatically create distributor-supplier relationships
- All pricing is now tracked per distributor-supplier combination

## Important Notes

1. **Distributors set the price** - Always use `distributorId` when setting prices
2. **Same product, different distributors** - Can have different prices
3. **Relationships are bidirectional** - Can query from distributor or supplier side
4. **Automatic relationship creation** - Import scripts create relationships automatically

