# Pricebook Ingestion System Design

## Overview

This system ingests the complete Vanos Insulation pricebook, handling both LIST PRICES and NET PRICES with category-based discounts.

## Pricebook Structure

### Discount Summary Sheet
- **Location:** Main sheet (gid=241638048)
- **Structure:**
  ```
  Group No. | Sec # | Section | Pg # | Price Page | Effective | Replacing | Discount
  CAEG171   | 1     | FIBREGLASS | 1.1 | FIBREGLASS PIPE WITH ASJ | 6-Jan-25 | 8-Jan-24 | 67.75%
  ```

### Price Pages
Each price page (separate sheet/tab) contains:
- Product specifications
- Variant combinations
- **LIST PRICES** (supplier list prices)
- **NET PRICES** (after discount applied)

## Data Flow

### Step 1: Parse Discount Summary
1. Read discount summary sheet
2. Extract:
   - Category/Group information
   - Discount percentages
   - Price page references
   - Effective dates

### Step 2: Process Each Price Page
For each price page:
1. Read product data
2. Extract LIST PRICES
3. Extract NET PRICES
4. Calculate discount if missing
5. Apply category discount if net price missing

### Step 3: Create Products & Variants
1. Create/update supplier
2. Create/update product with category
3. Create variants with pricing:
   ```javascript
   {
     pricing: {
       listPrice: 10.00,
       netPrice: 3.23,
       discountPercent: 67.75
     },
     suppliers: [{
       supplierId: supplierId,
       listPrice: 10.00,
       netPrice: 3.23,
       discountPercent: 67.75
     }]
   }
   ```

## Implementation Strategy

### Phase 1: Enhanced Product Model ✅
- Added `listPrice` and `netPrice` to variant pricing
- Added discount percentage tracking
- Maintained backward compatibility

### Phase 2: Discount Management System ✅
- Created `ProductPricing` model for advanced scenarios
- Documented pricing architecture
- Defined discount application strategy

### Phase 3: Pricebook Ingestion Script
- Parse discount summary
- Process each price page
- Handle both list and net prices
- Apply category discounts
- Create products with variants

### Phase 4: Validation & Testing
- Validate price data
- Check discount calculations
- Verify product creation
- Test with sample data

## Price Page Formats

### Format 1: Both LIST and NET Prices
```
Specification | LIST 1/2" | NET 1/2" | LIST 1" | NET 1" | ...
```

### Format 2: LIST Price Only (Apply Discount)
```
Specification | LIST 1/2" | LIST 1" | ...
```
→ Calculate NET: `netPrice = listPrice * (1 - discountPercent/100)`

### Format 3: NET Price Only (Calculate LIST)
```
Specification | NET 1/2" | NET 1" | ...
```
→ Calculate LIST: `listPrice = netPrice / (1 - discountPercent/100)`

## Category Mapping

| Category | Group No. | Discount | Example Products |
|----------|-----------|----------|------------------|
| FIBREGLASS | CAEG171 | 67.75% | FIBREGLASS PIPE WITH ASJ |
| FIBREGLASS | CAEG164 | 59.88% | FIBERGLASS FITTING 45 DEGREE |
| MINERAL WOOL | CAEG212 | 76.50% | MINERAL WOOL PIPE INSULATION |
| CALCIUM SILICATE | CAEG246 | 77.74% | CAL SIL PIPE |
| FOAMGLAS | CAEG147 | 41.35% | PIPE |
| URETHANE | CAEG193 | 74.93% | URETHANE PIPE INSULATION |
| ELASTOMERIC | CAEG188 | 64.30% | ARMAFLEX PIPE INSULATION |
| STYROFOAM | CAEG231 | 46.95% | PIPE INSULATION |

## Ingestion Script Structure

```javascript
// 1. Parse discount summary
const discountMap = parseDiscountSummary(discountSummarySheet);

// 2. For each price page
for (const page of pricePages) {
  const discount = discountMap[page.category];
  
  // 3. Parse price page
  const products = parsePricePage(page, discount);
  
  // 4. Create products
  for (const product of products) {
    await createProductWithVariants(product, discount);
  }
}
```

## Handling Missing Data

### Missing NET Price
- Calculate from LIST + discount: `netPrice = listPrice * (1 - discount/100)`

### Missing LIST Price
- Calculate from NET + discount: `listPrice = netPrice / (1 - discount/100)`

### Missing Discount
- Use category default discount
- Or calculate from prices: `discount = ((listPrice - netPrice) / listPrice) * 100`

## Validation Rules

1. **Net Price ≤ List Price:** Always validate
2. **Discount 0-100%:** Validate discount percentage
3. **Required Fields:** Product name, supplier, at least one price
4. **Date Validation:** Effective date ≤ current date

## Error Handling

- **Invalid Prices:** Log warning, skip variant
- **Missing Discount:** Use category default or skip
- **Duplicate Products:** Update existing, don't create duplicate
- **Invalid Dates:** Use current date as fallback

## Next Steps

1. ✅ Enhanced Product model
2. ✅ Discount management system
3. ⏳ Build pricebook ingestion script
4. ⏳ Test with sample price pages
5. ⏳ Process full pricebook
6. ⏳ Validate results

