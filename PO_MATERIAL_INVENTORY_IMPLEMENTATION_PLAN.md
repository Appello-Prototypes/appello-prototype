# Purchase Order & Material Inventory MVP - Implementation Plan

**Status:** Phase 1 - Database Models Complete ✅  
**Date:** December 2024  
**Next Checkpoint:** API Routes & Controllers

---

## IMPLEMENTATION OVERVIEW

This document tracks the implementation of the Purchase Order & Material Inventory MVP as specified in `APPELLO_PO_MATERIAL_INVENTORY_MVP_SPEC.md`.

### MVP Scope Summary
- **Product Database** (simple, no variants)
- **Material Request** (field → office workflow)
- **Purchase Order Creation** (with approval workflow)
- **Material Receiving** (mobile, offline-capable)
- **Invoice Matching** (manual process)
- **Basic Inventory** (optional, simple tracking)
- **Job Cost Integration** (committed cost tracking)

---

## PHASE 1: DATABASE MODELS ✅ COMPLETE

### Models Created

1. **Company.js** - Supplier/Vendor management
   - Company types: supplier, subcontractor, client, vendor
   - Contact information, addresses
   - Payment terms, supplier-specific info
   - Text search indexes

2. **Product.js** - Simple product catalog
   - Name, description, supplier link
   - Last price, standard cost
   - Unit of measure (EA, FT, M, BOX, etc.)
   - Category (optional)
   - Text search indexes

3. **MaterialRequest.js** - Field material requests
   - Request number (auto-generated: MR-YYYY-####)
   - Job/project assignment
   - Requestor, priority, required-by date
   - Delivery location (jobsite/warehouse/pickup)
   - Line items (product or free text)
   - Photo attachments
   - Status workflow: submitted → approved → po_issued → delivered → closed

4. **PurchaseOrder.js** - Purchase order management
   - PO number (auto-generated: PO-YYYY-####)
   - Supplier, job, buyer
   - Line items with receiving tracking
   - Financial totals (subtotal, tax, freight, total)
   - Approval workflow: draft → pending_approval → approved → sent
   - Revision tracking
   - Committed cost tracking

5. **POReceipt.js** - Material receiving
   - Receipt number (auto-generated: REC-YYYY-####)
   - PO reference
   - Bill of lading photo (critical)
   - Material photos
   - Receipt line items with condition tracking
   - Over-receipt approval
   - Offline sync support

6. **Inventory.js** - Basic inventory tracking
   - Product + location (compound unique index)
   - On-hand quantity
   - Cost tracking (last cost, average cost)
   - Low stock alerts
   - Valuation calculation

7. **InventoryTransaction.js** - Inventory transaction history
   - Transaction types: receipt, issue, return, adjustment, transfer
   - Job/cost code linking
   - Source references (PO, receipt)
   - Audit trail

### Database Indexes Created
- Text search indexes on Company.name, Product.name/description
- Compound indexes for efficient queries
- Status indexes for filtering
- Date indexes for sorting

---

## PHASE 2: API ROUTES & CONTROLLERS ✅ COMPLETE

### Routes Created ✅
1. ✅ `/api/companies` - Company/Supplier CRUD, autocomplete search
2. ✅ `/api/products` - Product CRUD, autocomplete search, CSV import
3. ✅ `/api/material-requests` - Material request CRUD, approve/reject, convert to PO
4. ✅ `/api/purchase-orders` - PO CRUD, approval workflow, issue/cancel
5. ✅ `/api/po-receipts` - Receipt CRUD, open POs for job, offline sync
6. ✅ `/api/inventory` - Inventory CRUD, issue/return/adjust, transactions

### Controllers Implemented ✅
- ✅ `companyController.js` - Company management, search
- ✅ `productController.js` - Product management, autocomplete, CSV import
- ✅ `materialRequestController.js` - Request workflow, convert to PO
- ✅ `purchaseOrderController.js` - PO creation, approval workflow, issue/cancel
- ✅ `poReceiptController.js` - Receiving workflow, offline sync, over-receipt handling
- ✅ `inventoryController.js` - Inventory management, transactions

### Key Features Implemented ✅
- ✅ **Product Autocomplete** - Search products by name (text search)
- ✅ **CSV Import** - Simple column mapping for price sheets
- ✅ **PO Approval** - Two-level approval (auto <$X, manual ≥$X) - configurable threshold
- ⏭️ **PDF Generation** - TODO: Phase 3
- ⏭️ **Email Integration** - TODO: Phase 3
- ✅ **Offline Sync** - Queue receipts when offline, sync when online
- ⏭️ **Committed Cost Posting** - TODO: Phase 4 (Job Cost Integration)

---

## PHASE 3: FRONTEND PAGES (AFTER API)

### Pages to Create
1. **Material Request Pages**
   - Mobile: Create material request
   - Office: Material request dashboard
   - Office: Request detail view (approve/reject/convert)

2. **Purchase Order Pages**
   - Office: Create PO (manual or from request)
   - Office: PO list/dashboard
   - Office: PO detail view (approve/issue/revision)
   - Office: PO approval queue

3. **Receiving Pages**
   - Mobile: Receive materials (offline-capable)
   - Mobile: View open POs
   - Office: Receipt review/approval

4. **Product Management Pages**
   - Office: Product list/search
   - Office: Create/edit product
   - Office: CSV import wizard

5. **Inventory Pages** (if enabled)
   - Office: Inventory list
   - Office: Issue to job
   - Office: Returns, adjustments

6. **Reporting Pages**
   - Purchasing dashboard
   - PO reports
   - Material request reports
   - Job cost integration views

---

## PHASE 4: INTEGRATION & TESTING

### Job Cost Integration
- Committed cost tracking on Job model
- Cost code posting on receipt
- Real-time cost updates

### Accounting Integration
- Link APRegister to PurchaseOrder
- Invoice matching interface
- CSV export for accounting systems

### Testing
- Unit tests for models
- Integration tests for API endpoints
- E2E tests for workflows
- Offline sync testing

---

## CHECKPOINT: PHASE 2 COMPLETE ✅

**What's Done:**
- ✅ All 7 database models created
- ✅ All 6 API route files created
- ✅ All 6 controller files created
- ✅ Routes registered in server index.js
- ✅ Business logic implemented:
  - PO approval workflow (auto <$X, manual ≥$X)
  - Material request → PO conversion
  - Receipt processing with over-receipt detection
  - Inventory transactions
- ✅ No linting errors

**What's Next:**
- ⏭️ Phase 3: PDF generation and email integration
- ⏭️ Phase 4: Job cost integration (committed cost posting)
- ⏭️ Phase 5: Frontend pages

**API Endpoints Available:**
- `/api/companies` - Company/Supplier management
- `/api/products` - Product catalog with search
- `/api/material-requests` - Material request workflow
- `/api/purchase-orders` - Purchase order management
- `/api/po-receipts` - Material receiving
- `/api/inventory` - Inventory management

**Ready for Testing:**
All API endpoints are ready for testing. You can:
1. Test API endpoints using Postman or curl
2. Create test data (companies, products, material requests, POs)
3. Test workflows (request → approve → convert to PO → receive)

---

## NEXT STEPS

1. **Phase 3** - PDF generation, email integration
2. **Phase 4** - Job cost integration (committed cost posting)
3. **Phase 5** - Frontend pages
4. **Phase 6** - Integration and testing

---

**Last Updated:** Phase 2 Complete - API Ready for Testing

