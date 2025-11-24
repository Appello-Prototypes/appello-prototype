# Estimator Workflow Research: Systems, Areas, and Specifications
## Research Findings for Industrial/Commercial Subcontractors

**Date:** November 24, 2024  
**Focus:** Mechanical Insulators, HVAC, Electrical, and Mechanical Contractors  
**Application Context:** Appello Task Management System  
**Status:** Comprehensive Analysis Complete - Ready for Implementation

---

## Document Overview

This document provides:
1. **Research Findings** from ATLAS on estimator workflows
2. **Current Architecture Analysis** of product properties and variants
3. **Gap Analysis** for specification-driven workflows
4. **Property Architecture Deep Dive** with data refactoring recommendations
5. **Implementation Roadmap** with prioritized phases
6. **Technical Specifications** for all required components

---

## Executive Summary

Based on research using ATLAS and analysis of the Appello product database and application functionality, estimators for industrial/commercial subcontractors work within a **specification-driven framework** where:

1. **Systems** (chilled water, steam, HVAC, etc.) have defined specifications
2. **Areas** (floors, zones, buildings) may have different requirements
3. **Product selection** is driven by pipe size, insulation thickness, jacketing material, and other specifications
4. **Automation** can significantly reduce errors and speed up the estimation process

---

## Key Findings from ATLAS Research

### 1. Specification-Driven Workflow

From ATLAS research, the ideal workflow described by users is:

> *"In this area, these systems in these areas have these specifications. Should be able to create the specification within the system. So I could say like chilled water under two inch gets one inch fiberglass insulation from Crossroads. Once you set up this for all the systems in areas, then it doesn't matter who's ordering materials for that job. They don't have to think anything more than: what's the system in area, what's the target, what am I insulating? It's iron pipe, and then it'll say, okay, well, what is the size of the iron pipe? Well, it's two-inch. And the system will already know, well, since it's two-inch iron pipe in this system, for this system area, this is what the spec calls for."*

**Key Insight:** Estimators need to define **specification rules** that automatically determine product selection based on:
- System type (chilled water, steam, HVAC, etc.)
- Area/location
- Pipe/material type (iron, copper, etc.)
- Size/diameter
- Other specifications (temperature, pressure, etc.)

### 2. Common Specification Parameters

Based on the product database analysis, common specification parameters include:

#### Pipe Insulation Specifications:
- **Pipe Type:** Copper, Iron, Steel
- **Pipe Diameter:** 1/2", 3/4", 1", 1-1/2", 2", 2-1/2", 3", 3-1/2", 4", etc.
- **Insulation Thickness:** 1/2", 1", 1-1/2", 2", 2-1/2", 3", 3-1/2", 4"
- **Insulation Material:** Fiberglass, Mineral Wool, Foam, etc.
- **Facing/Jacketing:** ASJ (All Service Jacket), FSK (Foil Scrim Kraft), PVC, Metal, etc.
- **Temperature Rating:** Operating temperature range
- **Density:** 3/4 lb, 1 lb, 1.5 lb, etc.

#### Ductwork Specifications:
- **Dimensions:** Width x Height (e.g., 48" x 96")
- **Thickness:** 1", 1-1/2", 2", etc.
- **Gauge:** 26, 24, 22, 20 gauge
- **Shape:** Rectangular, Round, Oval
- **Material:** Galvanized steel, Stainless steel, etc.

#### Duct Wrap Specifications:
- **Thickness:** 1", 1-1/2", 2", etc.
- **Dimensions:** Width x Length (e.g., 48" X 100')
- **Density:** 3/4 lb, 1 lb, 1.5 lb
- **Facing:** FSK, Plain Foil, etc.

### 3. Current Application Capabilities

#### Existing Data Models:

**Job Model** (`src/server/models/Job.js`):
- Supports `systems[]` array with name, description, code, budgetHours, budgetCost
- Supports `areas[]` array with name, description, code, floor, zone
- Supports `phases[]` for work breakdown
- Supports `costCodes[]` for cost tracking
- Supports `scheduleOfValues[]` with system/area/phase breakdown

**Product Model** (`src/server/models/Product.js`):
- Supports variants with configurable properties (Map structure)
- Variants can have different pricing per supplier
- Properties stored as key-value pairs (e.g., `pipe_type: 'copper'`, `pipe_diameter: '2"', `insulation_thickness: '1"'`)
- Supports supplier-specific pricing at both product and variant levels

**ProductType Model** (`src/server/models/ProductType.js`):
- Defines configurable properties with types (string, number, enum, multiselect)
- Supports variant settings with `variantProperties[]` array
- Properties can be marked as `variantKey: true` to create variants
- Supports property grouping and display ordering

**PurchaseOrder Model** (`src/server/models/PurchaseOrder.js`):
- Line items support `productId`, `variantId`, `variantName`, `sku`
- Stores `configuredProperties` for each line item
- Links to jobs, suppliers, cost codes

#### Current Functionality:

1. **Product Search & Selection:**
   - Autocomplete search with supplier filtering
   - Returns both base products and variants
   - Variants include pricing, SKU, and properties

2. **Product Configuration:**
   - Dynamic property fields based on ProductType
   - Variant matching based on configured properties
   - Automatic pricing updates when variant matches

3. **Purchase Order Creation:**
   - Product selection with variant support
   - Property configuration per line item
   - Pricing automatically calculated from variant/product

---

## Gap Analysis: What's Missing for Specification-Driven Workflow

### 1. **System/Area Specification Rules**

**Current State:** Systems and Areas exist in Job model, but no specification rules linking them to products.

**Needed:** A **Specification** model that defines:
```javascript
{
  jobId: ObjectId,
  systemId: ObjectId, // or system name
  areaId: ObjectId,   // or area name (optional - can be system-wide)
  
  // Conditions
  pipeType: ['copper', 'iron'], // or null for any
  maxPipeDiameter: '2"',        // or null for any
  minPipeDiameter: null,
  
  // Product Selection Rules
  productTypeId: ObjectId,      // e.g., "Pipe Insulation"
  requiredProperties: {
    insulation_thickness: '1"',
    facing: 'ASJ',
    insulation_material: 'fiberglass'
  },
  
  // Supplier Preference
  preferredSupplierId: ObjectId, // e.g., Crossroads C&I
  allowOtherSuppliers: Boolean,
  
  // Priority (if multiple specs match)
  priority: Number
}
```

### 2. **Specification Matching Engine**

**Needed:** Logic that:
1. Takes user input: System, Area, Pipe Type, Pipe Size
2. Finds matching specifications (by priority)
3. Automatically selects product/variant based on specification rules
4. Pre-fills product configuration with required properties

**Example Flow:**
```
User: "I need insulation for 2" iron pipe in Chilled Water system, Area A"
System:
  1. Finds spec: "Chilled Water system, Area A, iron pipe, max 2", requires 1" fiberglass ASJ"
  2. Searches products: Pipe Insulation with variants matching:
     - pipe_type: 'iron'
     - pipe_diameter: '2"'
     - insulation_thickness: '1"'
     - facing: 'ASJ'
  3. Returns matching variant(s) with pricing
  4. Pre-configures properties in PO form
```

### 3. **Specification Templates**

**Needed:** Reusable specification templates that can be:
- Created once per job
- Applied to multiple systems/areas
- Modified per area if needed
- Copied from previous jobs

**Example Template:**
```
Template: "Standard Chilled Water Insulation"
- System: Chilled Water
- Pipe Type: Any
- Rules:
  - Under 2": 1" fiberglass ASJ
  - 2" to 4": 1-1/2" fiberglass ASJ
  - Over 4": 2" fiberglass ASJ
- Supplier: Crossroads C&I
```

### 4. **Enhanced Product Selection UI**

**Current:** Product search shows all products/variants for supplier

**Needed:** 
- **Specification-aware search:** When system/area/pipe info is provided, filter to matching variants
- **Quick selection:** "Select by Specification" button that uses spec rules
- **Visual indicators:** Show which variants match current spec requirements
- **Bulk selection:** Select multiple sizes/thicknesses at once based on spec rules

### 5. **Estimate Integration**

**Current:** Estimates exist but don't leverage specifications

**Needed:**
- **Specification-based takeoff:** Import pipe sizes from drawings, auto-apply specs
- **Bulk material generation:** Generate PO line items for all pipes in a system/area
- **Specification validation:** Warn if selected product doesn't match spec
- **Specification reporting:** Show which specs were used for each estimate

---

## Recommended Implementation Approach

### Phase 1: Specification Model & Basic Rules

1. **Create Specification Schema:**
   ```javascript
   // src/server/models/Specification.js
   {
     jobId: ObjectId,
     systemId: ObjectId,
     areaId: ObjectId (optional),
     name: String,
     description: String,
     
     // Matching Conditions
     conditions: {
       pipeType: [String],      // ['copper', 'iron']
       minDiameter: String,      // '1/2"'
       maxDiameter: String,      // '2"'
       temperatureRange: { min, max },
       // ... other conditions
     },
     
     // Product Selection
     productTypeId: ObjectId,
     requiredProperties: Map,    // { insulation_thickness: '1"', facing: 'ASJ' }
     preferredSupplierId: ObjectId,
     
     priority: Number,
     isActive: Boolean
   }
   ```

2. **Specification Matching Service:**
   ```javascript
   // src/server/services/specificationService.js
   findMatchingSpecs(jobId, systemId, areaId, pipeType, diameter)
   applySpecificationToProductSearch(spec, searchParams)
   ```

### Phase 2: Enhanced Product Selection

1. **Update PurchaseOrderForm:**
   - Add System/Area/Pipe Type/Pipe Size fields
   - Add "Find by Specification" button
   - Auto-filter product search based on spec
   - Pre-fill product configuration from spec

2. **Update ProductSearch Component:**
   - Accept specification context
   - Highlight matching variants
   - Show spec compliance indicators

### Phase 3: Specification Templates

1. **Template Management:**
   - Create/edit templates
   - Apply templates to jobs
   - Template library (company-wide)

2. **Template Application:**
   - Bulk apply to multiple systems/areas
   - Override per area if needed

### Phase 4: Estimate Integration

1. **Specification-Based Takeoff:**
   - Import pipe list (CSV, drawing data)
   - Auto-apply specifications
   - Generate material list

2. **Bulk PO Generation:**
   - Generate PO line items from estimate
   - Group by supplier
   - Validate against specifications

---

## Product Database Considerations

### Current Product Structure Supports Specifications:

✅ **Variants with Properties:**
- Products can have multiple variants (e.g., different thicknesses, sizes)
- Properties stored as Map: `{ pipe_type: 'copper', pipe_diameter: '2"', insulation_thickness: '1"' }`
- Variants can be matched based on property values

✅ **Supplier-Specific Pricing:**
- Variants have supplier-specific pricing
- Can enforce supplier preferences in specifications

✅ **Product Types:**
- ProductTypes define configurable properties
- Properties can be marked as `variantKey: true`
- Supports enum/multiselect for standardized values

### Current Property Architecture Analysis

#### Property Storage Mechanism:
- **Database Schema:** Properties stored as `Map` type in MongoDB
- **Runtime Behavior:** When retrieved with `.lean()`, Maps become plain JavaScript objects
- **Value Types:** Properties are **primarily text-based (strings)**, even for numeric concepts:
  - Pipe diameter: `"2"`, `"1/2"`, `"1 1/2"` (strings, not numbers)
  - Thickness: `"1"`, `"1-1/2"`, `"2"` (strings)
  - Pipe type: `"copper"`, `"iron"` (strings)
  - Facing: `"asj"`, `"pvc"`, `"foil"` (strings)

#### Property Key Inconsistencies Found:

**Analysis of actual database products revealed:**

1. **Pipe Diameter/Size:**
   - `pipe_size` (used in seed-product-types-complex.js)
   - `pipe_diameter` (used in ingest-pricing-sheet.js, import-pricebook-sheet.js)
   - Both refer to the same concept but use different keys

2. **Thickness:**
   - `thickness` (generic, used in seed-product-types-complex.js)
   - `insulation_thickness` (specific, used in ingest scripts)
   - `wall_thickness` (for fittings)

3. **Naming Conventions:**
   - Mix of snake_case (`pipe_diameter`, `insulation_thickness`) and camelCase (`pipeType`)
   - No consistent pattern across product types

4. **Property Value Formats:**
   - Pipe diameters: `"5/8"`, `"1"`, `"1 1/2"`, `"2"` (fractional strings)
   - Thickness: `"1/2\""`, `"1\""`, `"1 1/2\""` (with/without quotes)
   - Inconsistent normalization (some scripts normalize, others don't)

#### Current Property Keys in Database:
```
- facing
- fitting_type
- gauge
- height
- insulation_thickness
- length
- material
- pipe_diameter
- pipe_size
- pipe_type
- size
- temperature_rating_max
- temperature_rating_min
- thickness
- wall_thickness
- width
```

### Critical Issues for Specification-Driven Workflow:

#### 1. **No Global Property Registry**
- Each ProductType defines properties independently
- Same concept (pipe diameter) uses different keys (`pipe_size` vs `pipe_diameter`)
- No way to query "all products with pipe diameter 2 inches" across product types

#### 2. **Text-Based Values Limit Matching**
- Properties stored as strings: `"2"`, `"1 1/2"`, `"1/2"`
- Cannot do numeric comparisons (e.g., "under 2 inch")
- Cannot do range queries without parsing strings
- Inconsistent formats make matching unreliable

#### 3. **No Property Standardization**
- Different ProductTypes use different property keys for same concepts
- No canonical property definitions
- No property aliases/mapping system

#### 4. **Variant Matching Limitations**
Current `findMatchingVariant()` function:
- Does exact string matching (case-insensitive)
- Cannot handle ranges (e.g., "under 2 inch")
- Cannot handle partial matches (e.g., "1-1/2" vs "1.5")
- Cannot handle unit conversions

### Data Refactoring Requirements:

#### Option 1: Global Property Registry (Recommended)

**Create a new `PropertyDefinition` model:**
```javascript
const propertyDefinitionSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true }, // Canonical key: 'pipe_diameter'
  label: { type: String, required: true }, // Display label: 'Pipe Diameter'
  category: { type: String }, // 'dimension', 'material', 'specification'
  dataType: { 
    type: String, 
    enum: ['text', 'number', 'fraction', 'enum', 'boolean'],
    required: true 
  },
  unit: { type: String }, // 'inches', 'feet', 'pounds', null
  normalization: {
    // How to normalize values for matching
    parseFunction: String, // 'parseInches', 'parseFraction', etc.
    comparisonType: String // 'exact', 'numeric', 'range'
  },
  // Standard values/enum options
  standardValues: [{
    value: String,
    normalizedValue: Number, // For numeric comparison
    aliases: [String] // Alternative representations
  }],
  // Aliases for this property (other keys that mean the same thing)
  aliases: [String], // ['pipe_size', 'diameter']
  isVariantKey: { type: Boolean, default: false }
});
```

**Benefits:**
- Single source of truth for property definitions
- Enables cross-product-type queries
- Supports normalization and matching logic
- Allows property aliases for backward compatibility

#### Option 2: Property Mapping Layer (Less Invasive)

**Create a property mapping service:**
```javascript
// src/server/services/propertyMappingService.js

const PROPERTY_MAPPINGS = {
  // Canonical property keys
  pipe_diameter: {
    aliases: ['pipe_size', 'diameter'],
    normalize: (value) => parseInches(value),
    compare: (a, b) => compareInches(a, b)
  },
  insulation_thickness: {
    aliases: ['thickness', 'wall_thickness'],
    normalize: (value) => parseInches(value),
    compare: (a, b) => compareInches(a, b)
  },
  // ...
};

function normalizePropertyKey(key) {
  // Find canonical key from alias
  for (const [canonical, config] of Object.entries(PROPERTY_MAPPINGS)) {
    if (canonical === key || config.aliases.includes(key)) {
      return canonical;
    }
  }
  return key; // Return as-is if no mapping
}
```

**Benefits:**
- No database migration required
- Works with existing data
- Can be implemented incrementally

#### Option 3: Hybrid Approach (Recommended for Implementation)

1. **Create Global Property Registry** (new model)
2. **Implement Property Mapping Service** (for backward compatibility)
3. **Gradually Migrate** ProductTypes to use canonical properties
4. **Enhance Variant Matching** to use normalization functions

### Enhanced Variant Matching Requirements:

**Current Limitations:**
```javascript
// Current: Exact string matching
findMatchingVariant(variants, { pipe_diameter: '2"' })
// Only matches if variant has exactly "2""
```

**Needed: Intelligent Matching:**
```javascript
// Enhanced: Range and normalized matching
findMatchingVariant(variants, { 
  pipe_diameter: { min: null, max: '2"' } // "under 2 inch"
})
// Matches: "1"", "1 1/2"", "2""
// Uses: parseInches() to convert strings to numbers for comparison
```

**Normalization Functions Needed:**
```javascript
// src/server/utils/propertyNormalization.js

/**
 * Parse inches from various string formats
 * "2" -> 2.0
 * "1 1/2" -> 1.5
 * "1/2" -> 0.5
 * "1-1/2" -> 1.5
 */
function parseInches(value) {
  if (typeof value === 'number') return value;
  if (!value) return null;
  
  const str = String(value).replace(/"/g, '').trim();
  
  // Handle fractions: "1 1/2" or "1-1/2"
  const fractionMatch = str.match(/(\d+)\s*[- ]\s*(\d+)\/(\d+)/);
  if (fractionMatch) {
    const whole = parseFloat(fractionMatch[1]);
    const num = parseFloat(fractionMatch[2]);
    const den = parseFloat(fractionMatch[3]);
    return whole + (num / den);
  }
  
  // Handle simple fractions: "1/2"
  const simpleFractionMatch = str.match(/(\d+)\/(\d+)/);
  if (simpleFractionMatch) {
    const num = parseFloat(simpleFractionMatch[1]);
    const den = parseFloat(simpleFractionMatch[2]);
    return num / den;
  }
  
  // Handle whole numbers: "2"
  const wholeMatch = str.match(/^(\d+)$/);
  if (wholeMatch) {
    return parseFloat(wholeMatch[1]);
  }
  
  return null;
}

/**
 * Compare two inch values (handles strings and numbers)
 */
function compareInches(a, b) {
  const aNum = parseInches(a);
  const bNum = parseInches(b);
  if (aNum === null || bNum === null) return false;
  return Math.abs(aNum - bNum) < 0.01; // Allow small floating point differences
}

/**
 * Check if value is within range
 */
function isInRange(value, min, max) {
  const num = parseInches(value);
  if (num === null) return false;
  if (min !== null && num < parseInches(min)) return false;
  if (max !== null && num > parseInches(max)) return false;
  return true;
}
```

### Specification Property Mapping:

**Specification Model Enhancement:**
```javascript
const specificationSchema = new mongoose.Schema({
  // ... existing fields ...
  
  // Enhanced property requirements with normalization
  requiredProperties: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  
  // Property matching rules
  propertyMatchingRules: [{
    propertyKey: String, // Canonical property key
    matchType: {
      type: String,
      enum: ['exact', 'range', 'min', 'max', 'enum']
    },
    value: mongoose.Schema.Types.Mixed, // Exact value or range object
    normalize: Boolean // Whether to normalize before matching
  }]
});
```

**Example Specification:**
```javascript
{
  systemId: 'chilled-water',
  conditions: {
    pipeTypes: ['iron'],
    maxDiameter: '2"' // Will match "1"", "1 1/2"", "2""
  },
  requiredProperties: {
    insulation_thickness: '1"', // Exact match required
    facing: 'asj' // Exact match required
  },
  propertyMatchingRules: [
    {
      propertyKey: 'pipe_diameter',
      matchType: 'max',
      value: '2"',
      normalize: true // Use parseInches() for comparison
    }
  ]
}
```

### Implementation Roadmap:

#### Phase 1: Property Normalization Utilities
1. Create `src/server/utils/propertyNormalization.js`
2. Implement `parseInches()`, `compareInches()`, `isInRange()`
3. Add unit tests for edge cases

#### Phase 2: Property Mapping Service
1. Create `src/server/services/propertyMappingService.js`
2. Define canonical property keys and aliases
3. Implement normalization mapping

#### Phase 3: Enhanced Variant Matching
1. Update `findMatchingVariant()` to use normalization
2. Support range queries
3. Support property aliases

#### Phase 4: Global Property Registry (Optional)
1. Create `PropertyDefinition` model
2. Migrate existing ProductTypes
3. Update product creation/update to use registry

#### Phase 5: Specification Integration
1. Create Specification model with enhanced property matching
2. Implement specification matching engine
3. Integrate with product search

### Enhancements Needed:

1. **Property Standardization:**
   - Create canonical property keys (`pipe_diameter`, `insulation_thickness`, etc.)
   - Implement property aliases for backward compatibility
   - Standardize value formats (normalize fractional inches)

2. **Specification Property Mapping:**
   - Map specification conditions to product properties
   - Handle partial matches (e.g., "under 2 inch" matches "1 inch", "1-1/2 inch")
   - Support range queries with normalization

3. **Variant Matching Logic:**
   - Enhance `findMatchingVariant()` to handle:
     - Range queries (diameter ranges) with normalization
     - Multiple property matches with aliases
     - Priority-based selection
     - Numeric comparisons for text-based values

---

## Workflow Examples

### Example 1: Standard Chilled Water Insulation

**Setup (One-time per job):**
1. Estimator creates specification:
   - System: "Chilled Water"
   - Condition: Iron pipe, any diameter
   - Rule: Under 2" → 1" fiberglass ASJ, 2" and over → 1-1/2" fiberglass ASJ
   - Supplier: Crossroads C&I

**Usage (During PO creation):**
1. User selects: System="Chilled Water", Pipe Type="Iron", Diameter="1-1/2""
2. System finds matching spec
3. System searches products: Pipe Insulation, supplier=Crossroads, properties match spec
4. System returns variant: "Pipe Insulation - 1-1/2" Iron - 1" ASJ"
5. Properties pre-filled: `{ pipe_type: 'iron', pipe_diameter: '1-1/2"', insulation_thickness: '1"', facing: 'ASJ' }`
6. Pricing automatically loaded from variant

### Example 2: Area-Specific Requirements

**Setup:**
1. Estimator creates base spec for "Chilled Water" system
2. Creates override spec for "Chilled Water" system, Area="Mechanical Room":
   - Same conditions but requires 2" thickness (instead of 1")
   - Higher priority

**Usage:**
1. User selects: System="Chilled Water", Area="Mechanical Room", Pipe="2" Iron"
2. System finds area-specific spec (higher priority)
3. Returns variant with 2" thickness

### Example 3: Bulk Material Takeoff

**Setup:**
1. Estimator imports pipe list from drawing:
   ```
   System: Chilled Water, Area: Floor 1, Pipe: 2" Iron, Qty: 150 LF
   System: Chilled Water, Area: Floor 1, Pipe: 3" Iron, Qty: 75 LF
   System: Steam, Area: Basement, Pipe: 4" Iron, Qty: 200 LF
   ```

2. System applies specifications to each line
3. Generates material list:
   ```
   - Pipe Insulation - 2" Iron - 1-1/2" ASJ: 150 LF
   - Pipe Insulation - 3" Iron - 1-1/2" ASJ: 75 LF
   - Pipe Insulation - 4" Iron - 2" ASJ: 200 LF
   ```

4. Groups by supplier, generates PO

---

## Integration with Existing Features

### Schedule of Values (SOV)
- Specifications can be linked to SOV line items
- Material costs calculated from spec-based product selection
- SOV can drive specification requirements

### Cost Codes
- Specifications can be assigned to cost codes
- Material costs tracked by cost code
- Reporting by specification compliance

### Time Tracking
- Time entries can reference specifications
- Labor costs associated with spec-compliant work
- Productivity analysis by specification type

### Progress Reports
- Track material usage against specifications
- Report on specification compliance
- Forecast remaining materials based on specs

---

## Technical Recommendations

### 1. Property Normalization Utilities (Prerequisite)

**Create: `src/server/utils/propertyNormalization.js`**
```javascript
/**
 * Property normalization utilities for specification matching
 * Handles conversion of text-based property values to comparable formats
 */

/**
 * Parse inches from various string formats
 * Supports: "2"", "1 1/2"", "1/2"", "1-1/2"", "2.5""
 */
export function parseInches(value) {
  // Implementation as described above
}

/**
 * Compare two inch values (handles strings and numbers)
 */
export function compareInches(a, b, tolerance = 0.01) {
  // Implementation as described above
}

/**
 * Check if value is within range
 */
export function isInRange(value, min, max) {
  // Implementation as described above
}

/**
 * Normalize property value based on property key
 */
export function normalizePropertyValue(key, value) {
  const inchProperties = ['pipe_diameter', 'pipe_size', 'insulation_thickness', 
                          'thickness', 'wall_thickness', 'width', 'height'];
  
  if (inchProperties.includes(key)) {
    return parseInches(value);
  }
  
  // Add other normalization functions as needed
  return value;
}
```

### 2. Property Mapping Service (Prerequisite)

**Create: `src/server/services/propertyMappingService.js`**
```javascript
/**
 * Maps property keys to canonical keys and provides normalization
 */

const PROPERTY_MAPPINGS = {
  pipe_diameter: {
    canonicalKey: 'pipe_diameter',
    aliases: ['pipe_size', 'diameter'],
    category: 'dimension',
    dataType: 'fraction',
    unit: 'inches',
    normalize: parseInches,
    compare: compareInches
  },
  insulation_thickness: {
    canonicalKey: 'insulation_thickness',
    aliases: ['thickness'],
    category: 'dimension',
    dataType: 'fraction',
    unit: 'inches',
    normalize: parseInches,
    compare: compareInches
  },
  // ... more mappings
};

export function getCanonicalKey(key) {
  // Find canonical key from alias
  for (const [canonical, config] of Object.entries(PROPERTY_MAPPINGS)) {
    if (canonical === key || config.aliases.includes(key)) {
      return canonical;
    }
  }
  return key;
}

export function normalizeProperty(key, value) {
  const mapping = PROPERTY_MAPPINGS[getCanonicalKey(key)];
  if (mapping && mapping.normalize) {
    return mapping.normalize(value);
  }
  return value;
}
```

### 3. Database Schema

**New Model: Specification**
```javascript
const specificationSchema = new mongoose.Schema({
  jobId: { type: ObjectId, ref: 'Job', required: true },
  systemId: { type: ObjectId, ref: 'System' }, // or system name string
  areaId: { type: ObjectId, ref: 'Area' },     // optional
  
  name: String,
  description: String,
  
  // Matching conditions (all optional - null means "any")
  conditions: {
    pipeTypes: [String],           // ['copper', 'iron']
    minDiameter: String,            // '1/2"'
    maxDiameter: String,            // '2"'
    temperatureRange: {
      min: Number,
      max: Number
    }
  },
  
  // Product selection rules
  productTypeId: { type: ObjectId, ref: 'ProductType' },
  requiredProperties: Map,          // { insulation_thickness: '1"', facing: 'ASJ' }
  preferredSupplierId: { type: ObjectId, ref: 'Company' },
  allowOtherSuppliers: { type: Boolean, default: false },
  
  priority: { type: Number, default: 0 }, // Higher = more specific
  isActive: { type: Boolean, default: true },
  
  // Template reference (if created from template)
  templateId: { type: ObjectId, ref: 'SpecificationTemplate' }
});
```

**New Model: SpecificationTemplate**
```javascript
const specificationTemplateSchema = new mongoose.Schema({
  name: String,
  description: String,
  companyId: ObjectId, // null = company-wide template
  
  // Same structure as Specification but without jobId
  conditions: {...},
  productTypeId: ObjectId,
  requiredProperties: Map,
  preferredSupplierId: ObjectId
});
```

### 4. Service Layer

**Specification Service:**
```javascript
// src/server/services/specificationService.js
const { normalizePropertyValue, compareInches, isInRange } = require('../utils/propertyNormalization');
const { getCanonicalKey, normalizeProperty } = require('./propertyMappingService');

class SpecificationService {
  /**
   * Find matching specifications for given context
   * @param {Object} context - { jobId, systemId, areaId, pipeType, diameter, ... }
   * @returns {Array} Matching specifications sorted by priority
   */
  async findMatchingSpecs(context) {
    const { jobId, systemId, areaId, pipeType, diameter } = context;
    
    // Build query
    const query = {
      jobId: new mongoose.Types.ObjectId(jobId),
      isActive: true,
      $or: [
        { systemId: systemId ? new mongoose.Types.ObjectId(systemId) : null },
        { systemId: null } // System-wide specs
      ]
    };
    
    if (areaId) {
      query.$or.push({ areaId: new mongoose.Types.ObjectId(areaId) });
    }
    
    const specs = await Specification.find(query).lean();
    
    // Filter by conditions with normalization
    const matchingSpecs = specs.filter(spec => {
      // Check pipe type
      if (spec.conditions.pipeTypes && pipeType) {
        if (!spec.conditions.pipeTypes.includes(pipeType.toLowerCase())) {
          return false;
        }
      }
      
      // Check diameter range (with normalization)
      if (diameter) {
        const diameterNum = normalizeProperty('pipe_diameter', diameter);
        
        if (spec.conditions.minDiameter) {
          const minNum = normalizeProperty('pipe_diameter', spec.conditions.minDiameter);
          if (diameterNum < minNum) return false;
        }
        
        if (spec.conditions.maxDiameter) {
          const maxNum = normalizeProperty('pipe_diameter', spec.conditions.maxDiameter);
          if (diameterNum > maxNum) return false;
        }
      }
      
      return true;
    });
    
    // Sort by priority (higher = more specific)
    return matchingSpecs.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }
  
  /**
   * Apply specification to product search parameters
   * @param {Object} spec - Specification object
   * @param {Object} searchParams - Current search parameters
   * @returns {Object} Enhanced search parameters
   */
  applySpecToProductSearch(spec, searchParams) {
    const enhanced = { ...searchParams };
    
    // Add product type filter
    if (spec.productTypeId) {
      enhanced.productTypeId = spec.productTypeId;
    }
    
    // Add supplier filter
    if (spec.preferredSupplierId && !spec.allowOtherSuppliers) {
      enhanced.supplierId = spec.preferredSupplierId;
    }
    
    // Add property filters (will be used in variant matching)
    if (spec.requiredProperties) {
      enhanced.requiredProperties = spec.requiredProperties instanceof Map
        ? Object.fromEntries(spec.requiredProperties)
        : spec.requiredProperties;
    }
    
    // Add property matching rules
    if (spec.propertyMatchingRules) {
      enhanced.propertyMatchingRules = spec.propertyMatchingRules;
    }
    
    return enhanced;
  }
  
  /**
   * Find variants matching specification requirements
   * @param {Object} product - Product object with variants
   * @param {Object} spec - Specification object
   * @returns {Array} Matching variants
   */
  findVariantsMatchingSpec(product, spec) {
    if (!product.variants || product.variants.length === 0) return [];
    
    // Check product type match
    if (spec.productTypeId) {
      const productTypeId = product.productTypeId?._id || product.productTypeId;
      if (productTypeId.toString() !== spec.productTypeId.toString()) {
        return [];
      }
    }
    
    // Match variants against specification
    return product.variants.filter(variant => {
      if (!variant.isActive) return false;
      
      const variantProps = variant.properties instanceof Map
        ? Object.fromEntries(variant.properties)
        : variant.properties || {};
      
      // Check required properties (exact matches)
      if (spec.requiredProperties) {
        const requiredProps = spec.requiredProperties instanceof Map
          ? Object.fromEntries(spec.requiredProperties)
          : spec.requiredProperties;
        
        for (const [key, requiredValue] of Object.entries(requiredProps)) {
          const canonicalKey = getCanonicalKey(key);
          const variantValue = variantProps[canonicalKey] || variantProps[key];
          
          if (!variantValue) return false;
          
          // Normalize and compare
          if (spec.propertyMatchingRules) {
            const rule = spec.propertyMatchingRules.find(r => 
              getCanonicalKey(r.propertyKey) === canonicalKey
            );
            
            if (rule && rule.normalize) {
              // Use normalized comparison
              const normalizedRequired = normalizeProperty(canonicalKey, requiredValue);
              const normalizedVariant = normalizeProperty(canonicalKey, variantValue);
              
              if (rule.matchType === 'exact') {
                if (Math.abs(normalizedRequired - normalizedVariant) > 0.01) {
                  return false;
                }
              } else if (rule.matchType === 'max') {
                if (normalizedVariant > normalizedRequired) return false;
              } else if (rule.matchType === 'min') {
                if (normalizedVariant < normalizedRequired) return false;
              }
            } else {
              // Exact string match (case-insensitive)
              if (String(variantValue).toLowerCase() !== String(requiredValue).toLowerCase()) {
                return false;
              }
            }
          } else {
            // Default: exact match (case-insensitive)
            if (String(variantValue).toLowerCase() !== String(requiredValue).toLowerCase()) {
              return false;
            }
          }
        }
      }
      
      return true;
    });
  }
  
  /**
   * Get recommended product/variant for specification context
   * @param {Object} context - Specification context
   * @returns {Object} Recommended product and variant
   */
  async getRecommendedProduct(context) {
    const specs = await this.findMatchingSpecs(context);
    if (specs.length === 0) return null;
    
    const bestSpec = specs[0]; // Highest priority
    
    // Search for products matching spec
    const searchParams = this.applySpecToProductSearch(bestSpec, {
      supplierId: bestSpec.preferredSupplierId
    });
    
    // Use product search API with spec filters
    const products = await Product.find({
      productTypeId: bestSpec.productTypeId,
      isActive: true,
      // Add supplier filter if needed
    })
    .populate('productTypeId')
    .lean();
    
    // Find matching variants
    for (const product of products) {
      const matchingVariants = this.findVariantsMatchingSpec(product, bestSpec);
      if (matchingVariants.length > 0) {
        return {
          product,
          variant: matchingVariants[0], // Return first match
          specification: bestSpec
        };
      }
    }
    
    return null;
  }
}
```

### 3. API Endpoints

```javascript
// Specifications
POST   /api/jobs/:jobId/specifications
GET    /api/jobs/:jobId/specifications
GET    /api/specifications/:id
PATCH  /api/specifications/:id
DELETE /api/specifications/:id

// Specification Templates
GET    /api/specification-templates
POST   /api/specification-templates
GET    /api/specification-templates/:id
PATCH  /api/specification-templates/:id
DELETE /api/specification-templates/:id

// Specification Matching
POST   /api/specifications/match
  Body: { jobId, systemId, areaId, pipeType, diameter }
  Returns: { specifications: [...], recommendedProduct: {...} }

// Bulk Apply Specifications
POST   /api/jobs/:jobId/specifications/apply-template
  Body: { templateId, systems: [...], areas: [...] }
```

### 4. Frontend Components

**New Components:**
- `SpecificationForm.jsx` - Create/edit specifications
- `SpecificationSelector.jsx` - Select spec when creating PO
- `SpecificationTemplateManager.jsx` - Manage templates
- `SpecificationMatchIndicator.jsx` - Show if product matches spec

**Enhanced Components:**
- `PurchaseOrderForm.jsx` - Add spec selection, auto-fill from spec
- `ProductSearch.jsx` - Filter by specification context
- `ProductConfiguration.jsx` - Show spec requirements, validate compliance

---

## Benefits of Specification-Driven Workflow

### For Estimators:
1. **Faster Estimation:** Define specs once, reuse across projects
2. **Consistency:** Same specs applied consistently
3. **Accuracy:** Reduces human error in product selection
4. **Compliance:** Ensures materials meet project requirements

### For Project Managers:
1. **Simplified Ordering:** Field workers don't need to know specs
2. **Error Prevention:** System prevents wrong product selection
3. **Audit Trail:** Track which specs were used for each order
4. **Change Management:** Update specs, automatically update future orders

### For Field Workers:
1. **Simple Interface:** Just select system/area/pipe info
2. **Automatic Selection:** System finds right product
3. **Less Training:** Don't need to memorize specs
4. **Mobile Friendly:** Quick selection on mobile devices

---

## Implementation Priority & Next Steps

### Phase 0: Property Architecture Foundation (CRITICAL - Do First)

**Priority: HIGH** - Required before specifications can work reliably

1. **Create Property Normalization Utilities**
   - File: `src/server/utils/propertyNormalization.js`
   - Functions: `parseInches()`, `compareInches()`, `isInRange()`
   - Unit tests for all edge cases
   - **Estimated Time:** 2-3 hours

2. **Create Property Mapping Service**
   - File: `src/server/services/propertyMappingService.js`
   - Define canonical property keys
   - Implement alias mapping
   - **Estimated Time:** 2-3 hours

3. **Enhance Variant Matching**
   - Update `src/client/src/utils/productPricing.js`
   - Add normalization support
   - Add range query support
   - **Estimated Time:** 3-4 hours

4. **Data Audit & Migration Planning**
   - Audit all existing products for property key inconsistencies
   - Create migration script to standardize property keys
   - Document property key standards
   - **Estimated Time:** 4-6 hours

### Phase 1: Specification Model & Basic CRUD (Week 1)

1. **Create Specification Model**
   - File: `src/server/models/Specification.js`
   - Include property matching rules
   - **Estimated Time:** 2-3 hours

2. **Create Specification Controller**
   - File: `src/server/controllers/specificationController.js`
   - CRUD operations
   - **Estimated Time:** 3-4 hours

3. **Create Specification Service**
   - File: `src/server/services/specificationService.js`
   - Matching logic with normalization
   - **Estimated Time:** 6-8 hours

4. **API Endpoints**
   - POST/GET/PATCH/DELETE `/api/jobs/:jobId/specifications`
   - POST `/api/specifications/match`
   - **Estimated Time:** 2-3 hours

### Phase 2: Enhanced Product Selection (Week 2)

1. **Update PurchaseOrderForm**
   - Add System/Area/Pipe Type/Pipe Size fields
   - Add "Find by Specification" button
   - Auto-filter product search
   - **Estimated Time:** 6-8 hours

2. **Update ProductSearch Component**
   - Accept specification context
   - Highlight matching variants
   - Show spec compliance indicators
   - **Estimated Time:** 4-6 hours

3. **Update ProductConfiguration**
   - Show specification requirements
   - Validate against spec
   - **Estimated Time:** 3-4 hours

### Phase 3: Specification Templates (Week 3)

1. **Template Model & CRUD**
   - File: `src/server/models/SpecificationTemplate.js`
   - Template management endpoints
   - **Estimated Time:** 4-6 hours

2. **Template Application UI**
   - Template selector
   - Bulk apply to systems/areas
   - **Estimated Time:** 6-8 hours

### Phase 4: Estimate Integration (Week 4)

1. **Specification-Based Takeoff**
   - Import pipe list (CSV)
   - Auto-apply specifications
   - Generate material list
   - **Estimated Time:** 8-10 hours

2. **Bulk PO Generation**
   - Generate PO line items from estimate
   - Group by supplier
   - Validate against specifications
   - **Estimated Time:** 6-8 hours

## Data Refactoring Considerations

### Current State Assessment:

**Property Key Inconsistencies:**
- `pipe_size` vs `pipe_diameter` (both in use)
- `thickness` vs `insulation_thickness` vs `wall_thickness` (all in use)
- Mix of snake_case and camelCase

**Value Format Inconsistencies:**
- Pipe diameters: `"2"`, `"1/2"`, `"1 1/2"`, `"1-1/2"` (various formats)
- Some with quotes, some without
- No normalization applied consistently

### Migration Strategy:

**Option A: Gradual Migration (Recommended)**
1. Implement property mapping service (handles aliases)
2. New products use canonical keys
3. Existing products continue to work via aliases
4. Gradually migrate during product updates

**Option B: Bulk Migration**
1. Create migration script
2. Update all products to use canonical keys
3. Update all ProductTypes
4. One-time effort, but higher risk

**Recommendation:** Use Option A (Gradual Migration) because:
- Lower risk (existing functionality continues to work)
- Can be done incrementally
- No downtime required
- Easier to test and validate

### Property Standardization Plan:

**Canonical Property Keys:**
```javascript
// Dimensions
pipe_diameter        // NOT: pipe_size, diameter
insulation_thickness // NOT: thickness, wall_thickness
width                // Already consistent
height               // Already consistent
length               // Already consistent

// Materials & Specifications
pipe_type            // NOT: pipeType
facing               // Already consistent
material             // Already consistent
gauge                // Already consistent

// Specifications
temperature_rating_min
temperature_rating_max
density
```

**Value Normalization:**
- All inch-based values normalized to decimal (e.g., "1 1/2" → 1.5)
- Stored as strings for display, but compared as numbers
- Normalization functions handle all formats

## Testing Requirements

### Unit Tests Needed:

1. **Property Normalization:**
   - Test `parseInches()` with all formats
   - Test `compareInches()` with edge cases
   - Test `isInRange()` with various ranges

2. **Property Mapping:**
   - Test alias resolution
   - Test canonical key lookup
   - Test backward compatibility

3. **Specification Matching:**
   - Test exact matches
   - Test range matches
   - Test priority sorting
   - Test property alias handling

4. **Variant Matching:**
   - Test with normalized values
   - Test with property aliases
   - Test range queries

### Integration Tests Needed:

1. **End-to-End Specification Workflow:**
   - Create specification
   - Search products with spec
   - Select variant matching spec
   - Create PO with spec-matched product

2. **Template Application:**
   - Create template
   - Apply to job
   - Verify specifications created
   - Test product selection

## Risk Assessment

### Low Risk:
- Property normalization utilities (isolated, testable)
- Property mapping service (backward compatible)
- Specification model (new feature, doesn't break existing)

### Medium Risk:
- Enhanced variant matching (affects existing PO creation)
- Property key migration (if done as bulk update)

### Mitigation Strategies:
1. **Feature Flags:** Enable specification features gradually
2. **Backward Compatibility:** Support both old and new property keys
3. **Gradual Rollout:** Test with one product type first
4. **Rollback Plan:** Keep old matching logic as fallback

## Success Metrics

### Technical Metrics:
- Property normalization accuracy: >99%
- Specification matching accuracy: >95%
- Variant matching performance: <100ms per product

### Business Metrics:
- Time to create PO: Reduce by 50%
- Product selection errors: Reduce by 80%
- Specification compliance: 100% (enforced by system)

## Next Steps

1. **Immediate:** 
   - Create property normalization utilities
   - Create property mapping service
   - Enhance variant matching with normalization

2. **Short-term:** 
   - Create Specification model and basic CRUD
   - Implement specification matching in product search
   - Update PurchaseOrderForm with spec selection

3. **Medium-term:** 
   - Add specification templates and bulk application
   - Integrate with estimates and material takeoff

4. **Long-term:** 
   - Property key migration (gradual)
   - Advanced specification features (conditional logic, formulas)

---

## References

- ATLAS Research: User workflow descriptions for specification-driven material selection
- Product Database: Analysis of Product, ProductType, and Variant models
- Application Models: Job, ScheduleOfValues, PurchaseOrder, TimeEntry models
- Industry Standards: Mechanical insulation specifications (NFPA 90A, 90B)

---

**Document Status:** Draft for Review  
**Last Updated:** November 24, 2024

