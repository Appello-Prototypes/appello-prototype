# Discount Management System - User Guide

## Overview

The Discount Management System provides a centralized way to manage and apply discounts to products. You can view all discounts, apply them individually or in bulk, and update pricing automatically.

## Accessing Discount Management

### Via UI (Recommended)
1. Navigate to **Materials & Inventory** → **Discount Management** in the sidebar
2. Or go directly to: `/discounts`

### Via Command Line
```bash
# List all discounts
node scripts/manage-discounts.js list

# Apply a specific discount
node scripts/manage-discounts.js apply <discount-id>

# Apply all active discounts
node scripts/manage-discounts.js apply-all
```

## Features

### 1. View All Discounts
- See all discounts in a table format
- Filter by status (Active/Inactive)
- Search by name, category, or group code
- View statistics:
  - Total discounts
  - Active discounts
  - Variants affected
  - Average discount percentage

### 2. Apply Single Discount
- Click the **Apply** button (🔄) next to any discount
- Updates all matching products/variants
- Shows how many variants were updated

### 3. Bulk Update (Apply All Discounts)
- Click **"Apply All Discounts"** button
- Applies all active discounts at once
- Updates pricing for all matching products
- Shows summary of updates

### 4. Create/Edit Discounts
- Click **"Add Discount"** to create new discount
- Click **Edit** (✏️) to modify existing discount
- Set discount percentage, effective dates, category, etc.

## Bulk Update Process

### Step 1: Import Discounts from Pricebook
```bash
node scripts/import-pricebook-discounts.js
```
This imports all discounts from your pricebook discount summary.

### Step 2: Review Discounts
- Go to Discount Management page in UI
- Review all discounts
- Check discount percentages
- Verify effective dates

### Step 3: Apply Discounts

**Option A: Apply All (Recommended)**
1. Click **"Apply All Discounts"** button
2. Confirm the action
3. Wait for processing
4. Review results

**Option B: Apply Individual Discounts**
1. Find the discount you want to apply
2. Click the **Apply** button (🔄)
3. Review results

### Step 4: Verify Results
- Check product detail pages
- Verify net prices are calculated correctly
- Confirm discount percentages are set

## What Gets Updated

When you apply a discount, the system updates:

1. **Variant Pricing:**
   - `netPrice` = `listPrice × (1 - discountPercent/100)`
   - `discountPercent` = discount percentage

2. **Variant Suppliers:**
   - `netPrice` = calculated net price
   - `discountPercent` = discount percentage

3. **Product-Level Suppliers:**
   - `netPrice` = calculated net price
   - `discountPercent` = discount percentage

## Example: Applying FIBREGLASS Discount

1. **Find Discount:**
   - Search for "FIBREGLASS PIPE WITH ASJ"
   - See discount: 67.75%

2. **Apply Discount:**
   - Click Apply button
   - System finds all FIBREGLASS products
   - Updates all variants

3. **Result:**
   - List Price: $3.69 → Net Price: $1.19
   - List Price: $4.47 → Net Price: $1.44
   - All variants updated with 67.75% discount

## Updating Discounts When Pricebook Changes

### When Pricebook Updates:

1. **Re-import Discounts:**
   ```bash
   node scripts/import-pricebook-discounts.js
   ```
   - Updates existing discounts
   - Creates new ones
   - Keeps discount history

2. **Re-apply Discounts:**
   - Go to Discount Management UI
   - Click "Apply All Discounts"
   - Or apply individual discounts

3. **Verify:**
   - Check product pricing
   - Confirm net prices updated

## Command Line Reference

### List Discounts
```bash
node scripts/manage-discounts.js list
```

### Apply Single Discount
```bash
node scripts/manage-discounts.js apply <discount-id>
```

### Apply All Discounts
```bash
node scripts/manage-discounts.js apply-all
```

### Import from Pricebook
```bash
node scripts/import-pricebook-discounts.js
```

## Tips

1. **Always review before applying** - Check discount percentages are correct
2. **Apply all discounts** - Use "Apply All" for bulk updates
3. **Verify results** - Check a few products after applying
4. **Keep discounts active** - Only active discounts can be applied
5. **Use effective dates** - Track when discounts are valid

## Troubleshooting

### Discount Not Applying
- Check discount is **Active**
- Verify **Effective Date** is in the past
- Check **Expires Date** is in the future (if set)
- Ensure products match discount criteria (category/group)

### Wrong Net Price
- Verify list price exists on variants
- Check discount percentage is correct
- Formula: `netPrice = listPrice × (1 - discountPercent/100)`

### Products Not Found
- Check product category matches discount category
- Verify product has variants with list prices
- Check discount type matches product type

## Summary

The Discount Management System provides:
- ✅ **UI for managing discounts** - Easy to use interface
- ✅ **Bulk updates** - Apply all discounts at once
- ✅ **Individual control** - Apply specific discounts
- ✅ **Automatic calculation** - Net prices calculated automatically
- ✅ **Pricebook integration** - Import from pricebook easily

**Access:** Materials & Inventory → Discount Management

