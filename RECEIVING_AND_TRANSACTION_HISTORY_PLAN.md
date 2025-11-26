# Receiving & Transaction History Enhancement Plan

## Current State Analysis

### What Works:
1. ✅ PO Receipts are created with line items, photos, notes
2. ✅ Inventory transactions are created when receipts are received
3. ✅ Transactions are stored in Inventory model's `transactions` array
4. ✅ Basic transaction history view exists

### What's Missing:
1. ❌ Transaction history doesn't show receipt details (receipt number, PO link)
2. ❌ Transaction history doesn't show receipt notes
3. ❌ Receiving page only shows CREATE form, no list of existing receipts
4. ❌ Transactions don't properly link to PO Receipt documents
5. ❌ No way to view receipt details from transaction history

## Proposed Solution

### 1. Enhanced Transaction History Display

**Transaction History Should Show:**
- Receipt Number (if from PO receipt)
- Link to PO Receipt (clickable)
- Link to Purchase Order (clickable)
- Receipt Notes
- Bill of Lading photo thumbnail (if available)
- All receipt line item details
- Received By (user name)
- Delivery Date
- Location Placed

**Transaction Types:**
- **Receipt from PO:** Show receipt number, PO number, link to both
- **Issue to Job:** Show job number, cost code
- **Return from Job:** Show job number, return reason
- **Adjustment:** Show reason, approved by
- **Transfer:** Show from/to locations

### 2. Receiving Page Enhancement

**Two Views:**
1. **List View (Default):**
   - Table of all receipts
   - Columns: Receipt #, PO #, Job, Date, Received By, Status, Total, Actions
   - Filters: Date range, Job, PO, Status
   - Search: Receipt number, PO number
   - Sort: Date (newest first), Receipt #, PO #

2. **Create View:**
   - Current form (keep as-is)
   - Button to switch to list view

3. **Detail View:**
   - Full receipt details
   - Line items with quantities, conditions, notes
   - Photos (bill of lading + material photos)
   - Links to PO and Job
   - Related inventory transactions

### 3. Backend Changes Needed

**PO Receipt Controller:**
- ✅ Already has `getAllReceipts` endpoint
- ✅ Already has `getReceiptById` endpoint
- Need to ensure transactions include `receiptId` reference

**Inventory Controller:**
- Update `getInventoryTransactions` to:
  - Populate `receiptId` with PO Receipt details
  - Populate `purchaseOrderId` with PO details
  - Include receipt number, notes, photos in response

**PO Receipt Creation:**
- Ensure `receiptId` is stored in inventory transactions
- Store receipt number in transaction notes
- Link properly to PO Receipt document

### 4. Frontend Changes Needed

**TransactionHistoryView.jsx:**
- Display receipt number prominently
- Show clickable links to PO Receipt and PO
- Show receipt notes
- Show "Received By" user name
- Show delivery date and location
- Show bill of lading photo thumbnail (clickable)

**Receiving.jsx:**
- Add tabs: "Create Receipt" | "All Receipts"
- Create ReceiptsList component
- Create ReceiptDetailView component
- Add filters and search
- Add navigation between views

## Implementation Priority

1. **High Priority:**
   - Fix transaction history to show receipt details
   - Add receipt list view to Receiving page
   - Link transactions to PO Receipts properly

2. **Medium Priority:**
   - Add receipt detail view
   - Add filters/search to receipt list
   - Show photos in transaction history

3. **Low Priority:**
   - Export receipts
   - Receipt analytics/reports
   - Bulk operations

