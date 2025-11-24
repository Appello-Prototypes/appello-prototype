# Discount Management System

## Overview

The discount management system provides a centralized way to manage and apply discounts to products. It supports category-based discounts from pricebooks, customer-specific pricing, and bulk updates.

## Features

✅ **Master Discount List** - Centralized discount management  
✅ **Category-Based Discounts** - Import from pricebook discount summary  
✅ **Bulk Updates** - Apply discounts to multiple products/variants at once  
✅ **Effective Date Management** - Track when discounts are active  
✅ **Product Tracking** - See how many products are affected by each discount  

## Components

### 1. Discount Model (`src/server/models/Discount.js`)

Stores discount rules with:
- Discount type (category, customer, product, supplier, group, universal)
- Category/Group information (from pricebook)
- Discount percentage/amount
- Effective dates
- Pricebook references

### 2. Management Scripts

#### `scripts/import-pricebook-discounts.js`
Imports discounts from pricebook discount summary sheet.

**Usage:**
```bash
node scripts/import-pricebook-discounts.js
```

**What it does:**
- Reads discount data from pricebook
- Creates/updates discount records
- Groups by category
- Shows summary statistics

#### `scripts/manage-discounts.js`
Main discount management script.

**Usage:**
```bash
# List all discounts
node scripts/manage-discounts.js list

# Apply a specific discount
node scripts/manage-discounts.js apply <discount-id>

# Apply all active discounts
node scripts/manage-discounts.js apply-all

# Import from pricebook (future)
node scripts/manage-discounts.js import-pricebook <spreadsheet-id>
```

## Workflow

### Step 1: Import Discounts from Pricebook

```bash
node scripts/import-pricebook-discounts.js
```

This creates discount records for each category/page in the pricebook:
- **FIBREGLASS PIPE WITH ASJ:** 67.75%
- **MINERAL WOOL PIPE INSULATION:** 76.50%
- **CAL SIL PIPE:** 77.74%
- etc.

### Step 2: Review Discounts

```bash
node scripts/manage-discounts.js list
```

Shows all discounts grouped by type, with:
- Discount percentage
- Effective dates
- Number of products affected
- Status (active/inactive)

### Step 3: Apply Discounts to Products

#### Apply Single Discount
```bash
node scripts/manage-discounts.js apply <discount-id>
```

#### Apply All Active Discounts
```bash
node scripts/manage-discounts.js apply-all
```

This will:
1. Find products matching the discount criteria (category, group, etc.)
2. Calculate net prices: `netPrice = listPrice * (1 - discountPercent/100)`
3. Update product variants with:
   - `netPrice`
   - `discountPercent`
4. Update supplier pricing
5. Track how many products were updated

## Discount Types

### Category-Based Discounts
- **Type:** `category`
- **Matches:** Products by category or categoryGroup
- **Example:** All "FIBREGLASS" products get 67.75% discount

### Customer-Specific Discounts
- **Type:** `customer`
- **Matches:** Products for specific customer
- **Example:** Vanos Insulation gets special pricing

### Product-Specific Discounts
- **Type:** `product`
- **Matches:** Specific product ID
- **Example:** Special discount on one product

### Supplier-Specific Discounts
- **Type:** `supplier`
- **Matches:** All products from a supplier
- **Example:** All Crossroads C&I products get discount

## Example: Applying FIBREGLASS Discount

```bash
# 1. List discounts to find FIBREGLASS discount ID
node scripts/manage-discounts.js list

# Output shows:
# ✅ 69235e28... | FIBREGLASS PIPE WITH ASJ | 67.75%
#    Group: CAEG171 | Page: 1.1

# 2. Apply the discount
node scripts/manage-discounts.js apply 69235e28...

# Output:
# 💰 Applying discount: FIBREGLASS PIPE WITH ASJ
#    Discount: 67.75%
#    Found 1 products to update
# ✅ Applied discount:
#    - Products updated: 1
#    - Variants updated: 280
```

## Price Updates

When discounts are applied, products are updated with:

```javascript
variant.pricing = {
  listPrice: 10.00,      // Original list price
  netPrice: 3.23,        // Calculated: 10.00 * (1 - 0.6775)
  discountPercent: 67.75 // Applied discount
}
```

## Updating Discounts

### When Pricebook Changes

1. **Update discount summary sheet** in Google Sheets
2. **Re-import discounts:**
   ```bash
   node scripts/import-pricebook-discounts.js
   ```
   - Updates existing discounts
   - Creates new ones
   - Deactivates expired ones

3. **Re-apply discounts:**
   ```bash
   node scripts/manage-discounts.js apply-all
   ```
   - Updates all products with new pricing

### Manual Discount Updates

Edit discount records directly in database or create UI for discount management.

## Best Practices

1. **Always import discounts first** before applying
2. **Review discounts** before bulk applying
3. **Test with single discount** before applying all
4. **Keep discount history** - don't delete, deactivate instead
5. **Track effective dates** - discounts expire automatically

## Future Enhancements

- [ ] UI for discount management
- [ ] Bulk discount updates via UI
- [ ] Discount history/audit trail
- [ ] Automatic discount application on product creation
- [ ] Customer-specific discount overrides
- [ ] Volume-based discount tiers

## Troubleshooting

### Discount Not Applying
- Check discount is active: `isActive: true`
- Check effective date: `effectiveDate <= now`
- Check expiration date: `expiresDate >= now` (if set)
- Verify product matches discount criteria

### Wrong Net Price Calculated
- Verify `listPrice` exists on variants
- Check discount percentage is correct
- Formula: `netPrice = listPrice * (1 - discountPercent/100)`

### Duplicate Discounts
- Use unique combination: `categoryGroup + pricebookPageNumber`
- Check for existing discounts before creating

## Summary

The discount management system provides:
- ✅ Centralized discount storage
- ✅ Easy import from pricebooks
- ✅ Bulk application to products
- ✅ Category-based pricing
- ✅ Effective date tracking

This makes it easy to:
1. Import discounts from pricebook
2. Review and manage discounts
3. Apply discounts to products in bulk
4. Update pricing when pricebooks change

