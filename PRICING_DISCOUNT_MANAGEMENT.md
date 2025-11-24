# Pricing & Discount Management System

## Overview

The pricing and discount management system handles both **LIST PRICES** and **NET PRICES** for products, supporting customer-specific discounts, category-based discounts, and effective date management.

## Architecture

### Data Model

#### Product Model Enhancements

**Variant Pricing:**
```javascript
pricing: {
  listPrice: Number,      // List price from supplier
  netPrice: Number,       // Net price after discount
  discountPercent: Number, // Discount percentage (0-100)
  discountAmount: Number   // Discount amount
}
```

**Variant Suppliers:**
```javascript
suppliers: [{
  supplierId: ObjectId,
  listPrice: Number,      // List price from supplier
  netPrice: Number,       // Net price after discount
  discountPercent: Number // Discount percentage
}]
```

#### ProductPricing Model (Optional Advanced Features)

For advanced pricing scenarios, use the `ProductPricing` model which supports:
- Customer-specific pricing
- Pricing tiers (volume discounts)
- Category-based discounts
- Effective date management

## Pricing Structure

### 1. List Price
- **Source:** Supplier's published list price
- **Storage:** `variant.pricing.listPrice` or `variant.suppliers[].listPrice`
- **Purpose:** Base price before any discounts

### 2. Net Price
- **Source:** Calculated from list price and discount, or provided directly
- **Storage:** `variant.pricing.netPrice` or `variant.suppliers[].netPrice`
- **Purpose:** Final price after discount applied

### 3. Discount Percentage
- **Source:** From pricebook discount summary or calculated
- **Storage:** `variant.pricing.discountPercent` or `variant.suppliers[].discountPercent`
- **Calculation:** `discountPercent = ((listPrice - netPrice) / listPrice) * 100`

## Pricebook Structure

### Discount Summary Sheet
- **Customer:** Vanos Insulation
- **Effective Date:** 1/6/2025
- **Structure:**
  - Group No. (e.g., CAEG171)
  - Section # (e.g., 1, 2, 3)
  - Section Name (e.g., FIBREGLASS, MINERAL WOOL)
  - Page # (e.g., 1.1, 1.2)
  - Price Page Name (e.g., "FIBREGLASS PIPE WITH ASJ")
  - Effective Date
  - Replacing Date
  - **Discount** (e.g., 67.75%)

### Price Pages
Each price page contains:
- Product variants with specifications
- **LIST PRICES** (supplier list prices)
- **NET PRICES** (after discount applied)
- Product details (sizes, thicknesses, etc.)

## Discount Application Strategy

### Option 1: Store Both Prices (Recommended)
Store both list and net prices directly in the product variants:

```javascript
variant.pricing = {
  listPrice: 10.00,
  netPrice: 3.23,        // After 67.75% discount
  discountPercent: 67.75
}
```

**Advantages:**
- Fast lookups (no calculation needed)
- Historical accuracy (prices don't change if discount changes)
- Supports price overrides

### Option 2: Store List Price + Discount
Store list price and discount percentage, calculate net price:

```javascript
variant.pricing = {
  listPrice: 10.00,
  discountPercent: 67.75,
  netPrice: 3.23  // Calculated: 10.00 * (1 - 0.6775)
}
```

**Advantages:**
- Single source of truth for discount
- Easy to update discount across all products
- Can recalculate if discount changes

### Recommended Approach: Hybrid
- **Store both** list and net prices for performance
- **Store discount percent** for reporting and updates
- **Calculate net price** if missing: `netPrice = listPrice * (1 - discountPercent/100)`

## Ingestion Workflow

### Step 1: Parse Discount Summary
1. Read discount summary sheet
2. Extract discount percentages per category/page
3. Map categories to product groups

### Step 2: Parse Price Pages
For each price page:
1. Read product data (variants, specifications)
2. Extract LIST PRICES
3. Extract NET PRICES (if provided)
4. Calculate discount if only one price provided
5. Apply category discount if net price not provided

### Step 3: Create Products & Variants
1. Create/update supplier
2. Create/update product
3. Create variants with pricing:
   ```javascript
   {
     pricing: {
       listPrice: listPrice,
       netPrice: netPrice,
       discountPercent: discountPercent
     },
     suppliers: [{
       supplierId: supplierId,
       listPrice: listPrice,
       netPrice: netPrice,
       discountPercent: discountPercent
     }]
   }
   ```

## Discount Management

### Category-Based Discounts
Discounts are applied at the category/page level:
- **FIBREGLASS PIPE WITH ASJ:** 67.75%
- **MINERAL WOOL PIPE INSULATION:** 76.50%
- **CAL SIL PIPE:** 77.74%

### Customer-Specific Discounts
For customer-specific pricing:
1. Use `ProductPricing` model
2. Store customer-specific net prices
3. Override standard pricing when customer is specified

### Updating Discounts
To update discounts across products:
1. Update discount percentage in pricebook
2. Re-run ingestion script (idempotent - updates existing)
3. Or use bulk update script:
   ```javascript
   // Update discount for all products in category
   Product.updateMany(
     { category: 'FIBREGLASS' },
     { $set: { 'variants.$[].pricing.discountPercent': 67.75 } }
   )
   ```

## Usage Examples

### Get Price for Product Variant
```javascript
const variant = product.variants[0];
const listPrice = variant.pricing.listPrice;
const netPrice = variant.pricing.netPrice || 
                 variant.pricing.listPrice * (1 - variant.pricing.discountPercent / 100);
```

### Get Price for Customer
```javascript
// Check for customer-specific pricing
const customerPrice = productPricing.getPriceForCustomer(customerId);
const price = customerPrice.netPrice || standardNetPrice;
```

### Calculate Discount
```javascript
const discountPercent = ((listPrice - netPrice) / listPrice) * 100;
```

## Best Practices

1. **Always Store List Price:** Required for reporting and margin calculations
2. **Store Net Price:** Improves performance, avoids calculation errors
3. **Store Discount Percent:** Enables easy updates and reporting
4. **Use Effective Dates:** Track when prices change
5. **Maintain History:** Keep old pricing records for historical analysis
6. **Validate Prices:** Ensure net price <= list price
7. **Handle Missing Data:** Calculate net price if only list + discount provided

## Migration Strategy

### Existing Products
For products already in the system:
1. Set `listPrice` = current `lastPrice`
2. Calculate `netPrice` = `listPrice * (1 - discountPercent/100)`
3. Set `discountPercent` from pricebook
4. Keep `lastPrice` for backward compatibility

### New Products
For new products from pricebook:
1. Store both list and net prices
2. Calculate and store discount percent
3. Store in both `pricing` and `suppliers[]` arrays

## Reporting

### Price Analysis
- Compare list vs net prices
- Calculate average discount by category
- Track discount changes over time
- Identify products with missing pricing

### Margin Analysis
- Calculate margin: `(sellingPrice - netPrice) / sellingPrice`
- Compare margins across categories
- Identify high/low margin products

## Next Steps

1. ✅ Enhanced Product model with listPrice/netPrice support
2. ✅ Created ProductPricing model for advanced scenarios
3. ⏳ Build pricebook ingestion script
4. ⏳ Create discount management UI
5. ⏳ Build reporting dashboards
6. ⏳ Implement bulk discount update tools

