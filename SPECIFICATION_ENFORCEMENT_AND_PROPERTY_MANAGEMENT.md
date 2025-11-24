# Specification Enforcement & Global Property Management

## Overview

This document outlines the implementation of:
1. **Specification Enforcement**: Specifications limit what can be ordered for a job
2. **Global Property Management**: Structured property definitions ensure consistent data across the application

---

## Problem Statement

### Current Issues:

1. **No Specification Enforcement**
   - Users can order any product, even if it doesn't match job specifications
   - No validation that products comply with specification requirements
   - Text-based inputs lead to inconsistencies ("1"", "1-1/2"", "1 1/2"" all mean the same thing)

2. **No Global Property Registry**
   - Each ProductType defines properties independently
   - Same concept uses different keys (`pipe_size` vs `pipe_diameter`)
   - No way to ensure consistent property values across product types
   - No validation that property values match expected formats

---

## Solution Architecture

### 1. Global Property Definition System

**New Model: `PropertyDefinition`**

A global registry of all properties used across the application:

```javascript
{
  key: 'pipe_diameter',           // Canonical key (unique)
  label: 'Pipe Diameter',         // Display label
  category: 'dimension',          // Category grouping
  dataType: 'fraction',           // Data type (text, number, fraction, enum)
  unit: 'inches',                 // Unit of measure
  
  // Normalization
  normalization: {
    function: 'parseInches',       // How to normalize values
    tolerance: 0.01               // Comparison tolerance
  },
  
  // Enum options (if enum type)
  enumOptions: [
    { value: 'copper', label: 'Copper', aliases: ['cu'] },
    { value: 'iron', label: 'Iron', aliases: ['steel'] }
  ],
  
  // Standard values with normalized representations
  standardValues: [
    { displayValue: '1 1/2"', normalizedValue: 1.5, aliases: ['1-1/2"', '1.5"'] }
  ],
  
  // Aliases (other keys that mean the same thing)
  aliases: ['pipe_size', 'diameter'],
  
  // Validation rules
  validation: {
    min: 0.125,
    max: 48,
    required: false
  }
}
```

**Benefits:**
- Single source of truth for property definitions
- Consistent property keys across all product types
- Normalized values for reliable matching
- Validation rules enforced at the model level
- Enum options ensure consistent values

### 2. Specification Enforcement

**New Service: `specificationEnforcementService`**

Enforces that products/variants match active specifications:

```javascript
// Check if product matches specifications
const compliance = await checkSpecificationCompliance(
  product,
  jobId,
  systemId,
  areaId,
  pipeType,
  pipeDiameter
);

// Returns:
{
  allowed: true/false,           // Can this product be ordered?
  matchingSpecs: [...],           // Which specs does it match?
  violations: [...]                // What violations exist?
}
```

**Enforcement Points:**

1. **Product Search** (`/api/products/search/autocomplete`)
   - When `jobId`, `systemId`, `areaId` are provided
   - Filters results to only products matching active specifications
   - Returns compliance warnings for products that don't match

2. **Purchase Order Creation** (`/api/purchase-orders`)
   - Validates each line item against specifications
   - Returns errors if products don't match specs
   - Option to allow override with warning

3. **Material Request Creation** (`/api/material-requests`)
   - Validates products against specifications
   - Shows warnings for non-compliant products

---

## Implementation Plan

### Phase 1: Global Property Registry ✅

**Created:**
- `src/server/models/PropertyDefinition.js` - Global property definitions
- Property management API endpoints (CRUD)
- Property management UI

**Next Steps:**
1. Seed initial property definitions (pipe_diameter, insulation_thickness, facing, etc.)
2. Migrate existing ProductType properties to use PropertyDefinitions
3. Update ProductTypeForm to select from PropertyDefinitions instead of free-form

### Phase 2: Specification Enforcement ✅

**Created:**
- `src/server/services/specificationEnforcementService.js` - Enforcement logic

**Next Steps:**
1. Update `productController.searchProducts` to filter by specifications
2. Update `purchaseOrderController.createPurchaseOrder` to validate against specs
3. Update `materialRequestController` to validate against specs
4. Add compliance warnings/errors to frontend

### Phase 3: Frontend Integration

**Updates Needed:**

1. **ProductSearch Component**
   - Show compliance warnings for products that don't match specs
   - Disable selection of non-compliant products (or show warning)
   - Display which specifications products match

2. **PurchaseOrderForm**
   - Show specification violations when adding line items
   - Require confirmation before adding non-compliant products
   - Display active specifications for the selected job/system/area

3. **SpecificationForm**
   - Use PropertyDefinition dropdowns instead of free text
   - Validate property values against PropertyDefinition rules
   - Show enum options for enum-type properties

---

## Usage Examples

### Example 1: Property Definition

**Create Property Definition:**
```javascript
POST /api/property-definitions
{
  key: 'pipe_diameter',
  label: 'Pipe Diameter',
  category: 'dimension',
  dataType: 'fraction',
  unit: 'inches',
  normalization: {
    function: 'parseInches',
    tolerance: 0.01
  },
  standardValues: [
    { displayValue: '1/2"', normalizedValue: 0.5 },
    { displayValue: '1"', normalizedValue: 1.0 },
    { displayValue: '1 1/2"', normalizedValue: 1.5 },
    { displayValue: '2"', normalizedValue: 2.0 }
  ],
  aliases: ['pipe_size', 'diameter'],
  validation: {
    min: 0.125,
    max: 48
  }
}
```

### Example 2: Specification Enforcement

**Product Search with Enforcement:**
```javascript
GET /api/products/search/autocomplete?q=insulation&supplierId=123&jobId=456&systemId=789&pipeType=iron&pipeDiameter=2"

// Response includes compliance info:
{
  products: [...],
  compliance: {
    allowed: true,
    matchingSpecs: [{ name: 'Chilled Water - Iron Pipe' }],
    violations: []
  }
}
```

**Purchase Order Validation:**
```javascript
POST /api/purchase-orders
{
  jobId: '456',
  lineItems: [{
    productId: '789',
    systemId: 'chilled-water',
    areaId: 'floor-1',
    pipeType: 'iron',
    pipeDiameter: '2"'
  }]
}

// If product doesn't match spec:
{
  success: false,
  message: 'Product does not match specification requirements',
  violations: [{
    specName: 'Chilled Water - Iron Pipe',
    reason: 'Property insulation_thickness does not match specification requirement: 1"'
  }]
}
```

---

## Migration Strategy

### Step 1: Create Property Definitions
1. Identify all unique property keys currently in use
2. Create PropertyDefinition records for each
3. Map aliases (e.g., `pipe_size` → `pipe_diameter`)

### Step 2: Update ProductTypes
1. Update ProductTypeForm to use PropertyDefinitions
2. Migrate existing ProductType.properties to reference PropertyDefinitions
3. Validate property values against PropertyDefinition rules

### Step 3: Enable Specification Enforcement
1. Add enforcement to product search (optional filter first)
2. Add enforcement to PO creation (warnings first, then required)
3. Add enforcement to material requests

### Step 4: Data Cleanup
1. Normalize existing property values using PropertyDefinition normalization
2. Update products/variants to use canonical property keys
3. Remove duplicate/alias property keys

---

## Benefits

### For Estimators:
- **Consistency**: Same property definitions across all product types
- **Validation**: System ensures property values are valid
- **Enforcement**: Specifications actually limit what can be ordered

### For Field Workers:
- **Simplified Selection**: Only see products that match specifications
- **Error Prevention**: Can't accidentally order wrong products
- **Clear Guidance**: See which specifications apply

### For Data Quality:
- **Normalized Values**: "1 1/2"", "1-1/2"", "1.5"" all normalized to 1.5
- **Consistent Keys**: `pipe_diameter` used everywhere, not `pipe_size`
- **Validated Data**: Property values must match PropertyDefinition rules

---

## Next Steps

1. **Create Property Management UI** - Admin interface for managing PropertyDefinitions
2. **Seed Initial Properties** - Create PropertyDefinitions for common properties
3. **Update Product Search** - Add specification filtering
4. **Update PO Creation** - Add specification validation
5. **Update Specification Form** - Use PropertyDefinitions instead of free text
6. **Add Compliance Warnings** - Show users when products don't match specs

---

## Files Created/Modified

### New Files:
- `src/server/models/PropertyDefinition.js` - Global property definitions
- `src/server/services/specificationEnforcementService.js` - Enforcement logic
- `SPECIFICATION_ENFORCEMENT_AND_PROPERTY_MANAGEMENT.md` - This document

### Files to Update:
- `src/server/controllers/productController.js` - Add specification filtering
- `src/server/controllers/purchaseOrderController.js` - Add specification validation
- `src/client/src/components/ProductSearch.jsx` - Show compliance warnings
- `src/client/src/pages/PurchaseOrderForm.jsx` - Show specification violations
- `src/client/src/pages/SpecificationForm.jsx` - Use PropertyDefinitions

---

**Status**: Foundation complete. Ready for implementation.

