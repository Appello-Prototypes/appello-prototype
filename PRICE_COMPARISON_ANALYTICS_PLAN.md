# Price Comparison Analytics for Estimators

## Research Summary

Based on ATLAS research and codebase analysis, estimators need:

1. **Quick Price Comparison**: "Where's my best cost?" - See all distributor prices side-by-side
2. **Relationship Value Analysis**: "I'm paying 2-3% more, is it worth it?" - Compare preferred vs non-preferred distributors
3. **Total Cost Calculations**: Calculate total cost for quantities needed for estimates/jobs
4. **Savings Opportunities**: Identify products with significant price differences between distributors
5. **Bulk Analysis**: Compare prices across multiple products at once

## Current State

✅ **What We Have:**
- Multi-distributor product support
- Price comparison badge showing price ranges
- Manufacturer/distributor filtering
- Individual product pricing display

❌ **What's Missing:**
- Side-by-side price comparison view
- Total cost calculations for quantities
- Savings opportunity identification
- Bulk price comparison across products
- Price trend analysis
- Preferred distributor cost premium analysis
- Best price recommendations

## Proposed Analytics Features

### 1. **Enhanced Price Comparison View**

**Location**: Product Catalog Panel → "Price Comparison" mode

**Features:**
- **Side-by-Side Comparison Table**
  - Columns: Product Name | Distributor A Price | Distributor B Price | Savings | Best Price Badge
  - Highlight best price in green
  - Show preferred distributor indicator
  - Calculate % savings vs worst price
  - Show price difference in $ and %

- **Quantity-Based Calculations**
  - Input field for quantity
  - Show total cost per distributor
  - Calculate total savings opportunity
  - Example: "Buying 100 units from Distributor A saves $250 vs Distributor B"

### 2. **Savings Opportunity Dashboard**

**New Component**: `SavingsOpportunityPanel`

**Features:**
- **Top Savings Opportunities**
  - Products with largest price differences between distributors
  - Sortable by: $ savings, % savings, total quantity needed
  - Show: Product name, best price, worst price, savings amount, preferred distributor premium

- **Preferred Distributor Premium Analysis**
  - "You're paying X% more to use preferred distributor"
  - "Total premium cost: $X for this selection"
  - Allow toggle to see "best price" vs "preferred distributor" totals

### 3. **Bulk Price Comparison**

**Feature**: Select multiple products → Compare total costs

**Use Case**: Estimator building an estimate with 20 products
- Select all products needed
- See total cost per distributor
- See total savings opportunity
- Export comparison report

### 4. **Price Trend Analysis** (Future)

**Feature**: Historical price tracking
- Track price changes over time
- Show price trends per distributor
- Alert on significant price increases

### 5. **Smart Recommendations**

**Feature**: AI-powered suggestions
- "Distributor A is best for Product X, but Distributor B is best for Product Y"
- "If you buy all products from Distributor A, you save $X total"
- "Consider splitting order: Product X from A, Product Y from B"

## Implementation Plan

### Phase 1: Enhanced Comparison View (Immediate)

**Files to Create/Modify:**
1. `src/client/src/components/PriceComparisonView.jsx` (New)
   - Side-by-side comparison table
   - Quantity input and calculations
   - Export functionality

2. `src/client/src/components/ProductCatalogPanel.jsx`
   - Add "Comparison Mode" toggle
   - Integrate PriceComparisonView
   - Add quantity input for bulk calculations

3. `src/client/src/components/ProductGrid.jsx`
   - Add checkbox selection for bulk comparison
   - Show comparison metrics in list view

### Phase 2: Savings Dashboard (Next)

**Files to Create:**
1. `src/client/src/components/SavingsOpportunityPanel.jsx`
   - Top savings opportunities list
   - Preferred distributor premium calculator
   - Filter by product type, manufacturer

2. `src/server/controllers/productController.js`
   - New endpoint: `GET /api/products/savings-opportunities`
   - Calculate savings opportunities across products
   - Return sorted by savings amount

### Phase 3: Bulk Comparison (Future)

**Files to Create:**
1. `src/client/src/components/BulkPriceComparison.jsx`
   - Multi-product selection
   - Total cost comparison
   - Export comparison report

## Detailed Feature Specifications

### Price Comparison View Component

```jsx
<PriceComparisonView 
  products={selectedProducts}
  quantity={quantity}
  showPreferredPremium={true}
  onDistributorSelect={(productId, distributorId) => {}}
/>
```

**Display:**
- Table with columns: Product | Distributors (side-by-side) | Best Price | Savings | Select
- Each distributor gets its own column
- Best price highlighted in green
- Preferred distributor badge
- Total cost row at bottom
- "Total Savings" vs worst option

### Savings Opportunity Panel

**Metrics:**
1. **Largest $ Savings**: Products where switching distributors saves the most money
2. **Largest % Savings**: Products with highest percentage difference
3. **Preferred Premium**: Cost of using preferred distributor vs best price
4. **Total Opportunity**: Sum of all potential savings

**Filters:**
- Product Type
- Manufacturer
- Minimum savings threshold ($ or %)
- Include/exclude preferred distributors

### API Endpoints Needed

1. `GET /api/products/savings-opportunities`
   - Query params: `manufacturerId`, `distributorId`, `productTypeId`, `minSavings`
   - Returns: Array of products with savings calculations

2. `POST /api/products/bulk-compare`
   - Body: `{ products: [{ productId, variantId, quantity }], distributorIds: [] }`
   - Returns: Comparison totals per distributor

## User Experience Flow

### Scenario: Estimator Building Estimate

1. **Open Product Catalog**
2. **Filter by Product Type** (e.g., "Pipe Insulation")
3. **Enable "Price Comparison" mode**
4. **Select products needed** (checkboxes)
5. **Enter quantities** for each product
6. **View comparison table** showing:
   - Each product with all distributor prices
   - Total cost per distributor
   - Total savings opportunity
   - Preferred distributor premium
7. **Make decision**:
   - Use best prices (mix of distributors)
   - Use preferred distributor (pay premium)
   - Export comparison report

### Scenario: Quick Price Check

1. **Search for product**
2. **See price comparison badge** (already implemented)
3. **Click badge** → Expand to see detailed comparison
4. **Enter quantity** → See total cost per distributor
5. **Select distributor** → Add to estimate/PO

## Success Metrics

- Time saved: Estimators can compare prices in seconds vs minutes
- Cost savings: Identified savings opportunities
- Decision confidence: Clear visibility into trade-offs
- Usage: % of estimates using price comparison features

## Next Steps

1. ✅ Research complete
2. ⏳ Design detailed UI mockups
3. ⏳ Implement Phase 1: Enhanced Comparison View
4. ⏳ Test with real estimator workflows
5. ⏳ Iterate based on feedback

