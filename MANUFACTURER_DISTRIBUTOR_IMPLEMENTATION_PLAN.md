# Manufacturer/Distributor Implementation Plan

## Executive Summary

This plan outlines the enhancement of the Appello system to properly distinguish between **Manufacturers** (who make products) and **Distributors** (who supply products to us). The key insight is that products flow: **Manufacturer → Distributor → Us (Contractor)**.

## Current State Analysis

### Database Models

**Company Model:**
- Has `companyType` enum: `['supplier', 'subcontractor', 'client', 'vendor', 'other']`
- No distinction between manufacturer and distributor
- Used generically for all supplier relationships

**Product Model:**
- Has `suppliers` array (supplierInfoSchema) with `supplierId` references
- Variants also have `suppliers` array
- No manufacturer/distributor distinction
- Pricing stored at supplier level

**Purchase Order Model:**
- Uses `supplierId` (the company we order from - this is the distributor)
- Line items reference products but don't track manufacturer

### Current UI Components

**Product Views:**
- ProductDetail.jsx - Shows suppliers but doesn't distinguish manufacturer/distributor
- ProductList.jsx - Filters by supplier (generic)
- ProductForm.jsx - Allows selecting suppliers

**Company Views:**
- CompanyList.jsx - Shows all companies with type filter
- CompanyProducts.jsx - Shows products from a company
- CompanyLayout.jsx - Navigation for company details

**Purchase Order Views:**
- PurchaseOrderForm.jsx - Selects supplier (distributor) for ordering

## Business Requirements

1. **Distributor = IMPRO** (the company we buy from)
2. **Manufacturer = Supplier listed on each sheet** (e.g., Armacell, K-Flex USA)
3. Products must track both manufacturer and distributor
4. Views must show:
   - Distributor → Manufacturers → Products hierarchy
   - Product detail showing both manufacturer and distributor
   - Filter/search by distributor or manufacturer
5. Purchase orders use distributor (IMPRO) as supplierId
6. Import scripts must set manufacturer from sheet and distributor as IMPRO

## Implementation Plan

### Phase 1: Database Schema Updates

#### 1.1 Update Company Model
**File:** `src/server/models/Company.js`

**Changes:**
- Add `companyRole` field to distinguish manufacturer/distributor
- Keep `companyType` for backward compatibility
- Add indexes for efficient queries

```javascript
companyRole: {
  type: String,
  enum: ['manufacturer', 'distributor', 'both', null], // null = legacy/unknown
  default: null
}
```

**Migration Strategy:**
- Existing companies default to `null` (unknown)
- Set IMPRO to `distributor`
- Set manufacturers from pricebook sheets to `manufacturer`
- Allow companies to be both (e.g., a company that manufactures and distributes)

#### 1.2 Update Product Model
**File:** `src/server/models/Product.js`

**Changes:**
- Add `manufacturerId` field (reference to Company)
- Add `distributorId` field (reference to Company) 
- Update `supplierInfoSchema` to include `manufacturerId` and `distributorId`
- Keep `suppliers` array for backward compatibility

```javascript
// Product-level manufacturer/distributor
manufacturerId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Company'
},
distributorId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Company'
},

// Enhanced supplier info schema
const supplierInfoSchema = new mongoose.Schema({
  supplierId: { ... }, // This is the distributor (who we buy from)
  manufacturerId: { ... }, // Manufacturer who makes the product
  distributorId: { ... }, // Distributor who supplies it (same as supplierId usually)
  // ... existing fields
});
```

**Migration Strategy:**
- For existing products: try to infer manufacturer from supplier name
- For new imports: explicitly set manufacturer and distributor

#### 1.3 Update Variant Supplier Schema
**File:** `src/server/models/Product.js` (variant suppliers)

**Changes:**
- Add manufacturer/distributor fields to variant suppliers array
- Maintain consistency with product-level fields

### Phase 2: Import Script Updates

#### 2.1 Update Import Scripts
**Files:**
- `scripts/import-pricebook-sheet.js`
- `scripts/process-vanos-sheet.js`
- `scripts/import-vanos-pricebook-from-csv.js`

**Changes:**
1. Create/find IMPRO distributor company
2. Extract manufacturer from sheet (e.g., "Armacell", "K-Flex USA")
3. Create/find manufacturer company
4. Set both `manufacturerId` and `distributorId` on products
5. Set manufacturer/distributor in supplier info arrays

**Example:**
```javascript
// In processElastomericPipeInsulationSheet or similar
const distributor = await Company.findOneAndUpdate(
  { name: 'IMPRO', companyRole: 'distributor' },
  { name: 'IMPRO', companyType: 'supplier', companyRole: 'distributor', isActive: true },
  { upsert: true, new: true }
);

// Extract manufacturer from sheet data (row with "Supplier")
const manufacturerName = extractManufacturerFromSheet(data); // e.g., "Armacell"
const manufacturer = await Company.findOneAndUpdate(
  { name: manufacturerName, companyRole: 'manufacturer' },
  { name: manufacturerName, companyType: 'supplier', companyRole: 'manufacturer', isActive: true },
  { upsert: true, new: true }
);

// Set on product
product.manufacturerId = manufacturer._id;
product.distributorId = distributor._id;
product.suppliers = [{
  supplierId: distributor._id, // Distributor (who we buy from)
  manufacturerId: manufacturer._id, // Manufacturer (who makes it)
  distributorId: distributor._id,
  // ... pricing fields
}];
```

### Phase 3: API Updates

#### 3.1 Product Controller
**File:** `src/server/controllers/productController.js`

**New Endpoints:**
- `GET /api/products/by-distributor/:distributorId` - Products from a distributor
- `GET /api/products/by-manufacturer/:manufacturerId` - Products from a manufacturer
- `GET /api/distributors/:distributorId/manufacturers` - Manufacturers for a distributor
- `GET /api/distributors/:distributorId/products` - All products from distributor

**Updated Endpoints:**
- `GET /api/products` - Add filters for `manufacturerId`, `distributorId`
- `GET /api/products/:id` - Include manufacturer and distributor in response

#### 3.2 Company Controller
**File:** `src/server/controllers/companyController.js`

**New Endpoints:**
- `GET /api/companies/distributors` - List all distributors
- `GET /api/companies/manufacturers` - List all manufacturers
- `GET /api/companies/:id/manufacturers` - If distributor, show manufacturers they carry
- `GET /api/companies/:id/distributors` - If manufacturer, show distributors who carry them

**Updated Endpoints:**
- `GET /api/companies` - Add filter for `companyRole`
- `GET /api/companies/:id/products` - Distinguish manufacturer vs distributor products

### Phase 4: Frontend Updates

#### 4.1 Product Detail Page
**File:** `src/client/src/pages/ProductDetail.jsx`

**Changes:**
- Show Manufacturer prominently (who makes it)
- Show Distributor prominently (who supplies it to us)
- Update suppliers section to show manufacturer/distributor distinction
- Add links to manufacturer and distributor company pages

**UI Mockup:**
```
Product Information
├── Manufacturer: Armacell [link to company]
├── Distributor: IMPRO [link to company]
└── Suppliers
    └── IMPRO (Distributor)
        ├── Manufacturer: Armacell
        ├── List Price: $X.XX
        └── Net Price: $X.XX
```

#### 4.2 Product List Page
**File:** `src/client/src/pages/ProductList.jsx`

**Changes:**
- Add Manufacturer filter dropdown
- Add Distributor filter dropdown
- Show manufacturer and distributor in product cards/list
- Update search to include manufacturer/distributor names

#### 4.3 Company Pages

**4.3.1 Distributor View**
**File:** `src/client/src/pages/CompanyProducts.jsx` (enhanced)

**New View:** `src/client/src/pages/DistributorView.jsx`

**Features:**
- Show all manufacturers this distributor carries
- For each manufacturer, show product count
- Expandable sections: Manufacturer → Products
- Filter/search within distributor's catalog

**UI Structure:**
```
IMPRO (Distributor)
├── Manufacturers (5)
│   ├── Armacell (12 products)
│   │   ├── Product 1
│   │   ├── Product 2
│   │   └── ...
│   ├── K-Flex USA (8 products)
│   └── ...
└── Statistics
    ├── Total Products: 120
    ├── Total Manufacturers: 5
    └── ...
```

**4.3.2 Manufacturer View**
**File:** `src/client/src/pages/ManufacturerView.jsx` (new)

**Features:**
- Show all distributors who carry this manufacturer
- Show all products from this manufacturer
- Filter by distributor

**4.3.3 Company Layout Updates**
**File:** `src/client/src/components/CompanyLayout.jsx`

**Changes:**
- Add "Manufacturers" tab for distributors
- Add "Distributors" tab for manufacturers
- Show role badge (Manufacturer/Distributor)

#### 4.4 Product Form
**File:** `src/client/src/pages/ProductForm.jsx`

**Changes:**
- Add Manufacturer dropdown (filtered to manufacturers)
- Add Distributor dropdown (filtered to distributors)
- Update supplier selection to show manufacturer/distributor relationship
- Validation: If distributor selected, require manufacturer

#### 4.5 Purchase Order Form
**File:** `src/client/src/pages/PurchaseOrderForm.jsx`

**Changes:**
- Supplier dropdown = Distributors only
- When selecting products, show manufacturer info
- Product selection shows: Product Name (Manufacturer) format

### Phase 5: New Views & Navigation

#### 5.1 Distributor Catalog View
**New File:** `src/client/src/pages/DistributorCatalog.jsx`

**Purpose:** Browse all products organized by distributor → manufacturer → products

**Features:**
- List all distributors
- Expand distributor to see manufacturers
- Expand manufacturer to see products
- Search/filter at any level
- Quick stats (product counts, etc.)

#### 5.2 Manufacturer Catalog View
**New File:** `src/client/src/pages/ManufacturerCatalog.jsx`

**Purpose:** Browse all products organized by manufacturer → distributors → products

**Features:**
- List all manufacturers
- Show which distributors carry each manufacturer
- Show products from each manufacturer
- Filter by distributor

#### 5.3 Navigation Updates
**File:** `src/client/src/App.jsx`

**Add Routes:**
- `/distributors` - List all distributors
- `/distributors/:id` - Distributor detail (with manufacturers)
- `/manufacturers` - List all manufacturers
- `/manufacturers/:id` - Manufacturer detail (with distributors)
- `/distributors/:id/manufacturers` - Manufacturers for a distributor
- `/distributors/:id/products` - All products from distributor

### Phase 6: Data Migration

#### 6.1 Migration Script
**New File:** `scripts/migrate-manufacturer-distributor.js`

**Purpose:**
1. Identify IMPRO as distributor
2. For existing products, try to infer manufacturer:
   - Check supplier names
   - Check product descriptions
   - Use heuristics (e.g., "Armacell" in name = Armacell manufacturer)
3. Set manufacturerId and distributorId where possible
4. Mark unknown as `null` for manual review

**Strategy:**
- Non-destructive: Don't delete existing data
- Additive: Add new fields, keep old ones
- Gradual: Can run multiple times, only updates what's missing

### Phase 7: Testing & Validation

#### 7.1 Unit Tests
- Test Company model with companyRole
- Test Product model with manufacturerId/distributorId
- Test import scripts with manufacturer/distributor

#### 7.2 Integration Tests
- Test API endpoints with manufacturer/distributor filters
- Test UI components showing manufacturer/distributor
- Test purchase order flow with distributor

#### 7.3 Data Validation
- Verify all imported products have manufacturer and distributor
- Verify IMPRO is set as distributor
- Verify manufacturers are correctly identified

## Implementation Order

### Step 1: Database Schema (Phase 1)
1. Update Company model - add companyRole
2. Update Product model - add manufacturerId, distributorId
3. Update supplierInfoSchema - add manufacturer/distributor fields
4. Create migration script
5. Run migration on dev database

### Step 2: Import Scripts (Phase 2)
1. Update import scripts to set manufacturer/distributor
2. Test with ELTUA sheet
3. Verify data structure

### Step 3: API Updates (Phase 3)
1. Update product controller
2. Update company controller
3. Add new endpoints
4. Test API endpoints

### Step 4: Frontend Updates (Phase 4)
1. Update ProductDetail page
2. Update ProductList page
3. Update ProductForm
4. Update Company pages
5. Create new distributor/manufacturer views

### Step 5: New Views (Phase 5)
1. Create DistributorCatalog view
2. Create ManufacturerCatalog view
3. Add navigation routes
4. Test navigation flow

### Step 6: Data Migration (Phase 6)
1. Run migration script on dev
2. Review results
3. Fix any issues
4. Run on production

### Step 7: Testing (Phase 7)
1. Test all new features
2. Test import workflow
3. Test purchase order flow
4. User acceptance testing

## Key Design Decisions

### 1. Backward Compatibility
- Keep existing `suppliers` array
- Keep `supplierId` field (legacy)
- Add new fields alongside, don't break existing code
- Gradual migration path

### 2. Company Role vs Type
- `companyType`: supplier/client/subcontractor (business relationship)
- `companyRole`: manufacturer/distributor (supply chain role)
- A company can be both manufacturer and distributor
- A company can be supplier (companyType) and manufacturer (companyRole)

### 3. Product-Level vs Supplier-Level
- Product has `manufacturerId` and `distributorId` (primary)
- Each supplier entry in `suppliers` array also has manufacturer/distributor
- Allows products to have multiple distributors with different manufacturers
- Primary manufacturer/distributor at product level for simplicity

### 4. IMPRO as Distributor
- IMPRO is always the distributor for Vanos pricebook
- Other distributors can be added later
- Products can have multiple distributors (future enhancement)

## Success Criteria

1. ✅ All imported products have manufacturer and distributor set
2. ✅ Product detail pages show both manufacturer and distributor
3. ✅ Can view distributor → manufacturers → products hierarchy
4. ✅ Can filter products by manufacturer or distributor
5. ✅ Purchase orders correctly use distributor as supplier
6. ✅ Existing functionality continues to work
7. ✅ No data loss during migration

## Risks & Mitigation

### Risk 1: Breaking Existing Functionality
**Mitigation:** 
- Keep all existing fields
- Add new fields alongside
- Gradual rollout with feature flags

### Risk 2: Data Migration Issues
**Mitigation:**
- Test migration on dev first
- Create backup before production migration
- Allow manual correction of inferred data

### Risk 3: Performance Impact
**Mitigation:**
- Add indexes on manufacturerId, distributorId
- Optimize queries with proper population
- Monitor query performance

## Timeline Estimate

- **Phase 1 (Schema):** 2-3 hours
- **Phase 2 (Import Scripts):** 2-3 hours
- **Phase 3 (API):** 3-4 hours
- **Phase 4 (Frontend Updates):** 4-6 hours
- **Phase 5 (New Views):** 3-4 hours
- **Phase 6 (Migration):** 2-3 hours
- **Phase 7 (Testing):** 2-3 hours

**Total:** ~18-26 hours

## Next Steps

1. Review and approve this plan
2. Start with Phase 1 (Database Schema)
3. Test incrementally
4. Deploy to production after full testing

