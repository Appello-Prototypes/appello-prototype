# Meeting Action Items - November 24, 2024
## Impromptu Zoom Meeting with Matt Vanos

**Meeting Recording:** https://fathom.video/share/k4pbPE3yiMT-dEoXiMyVg3MPMFNcRRoF  
**Duration:** 30 minutes  
**Date:** November 24, 2024

---

## Executive Summary

**Current State:**
- ✅ Product database with 57 Crossroads products (~5,000 variants)
- ✅ Purchase order creation (manual workflow)
- ✅ Product browsing/filtering system
- ✅ Discount management with price history
- ✅ Basic material request form
- ✅ PO PDF generation

**Goal:** Replace Vanos's current material management system with this prototype ASAP (75-80% ready for production use)

**Key Insight:** Start with simple, predefined approved product lists per job (not complex property-based filters). Build MR → fulfillment → multi-MR → PO workflow.

---

## PRIORITIZED ACTION ITEMS

### 🔴 CRITICAL PRIORITY (Blocking Production Use)

#### 1. **Ingest Additional Supplier Price Books**
**Priority:** P0 - CRITICAL  
**Timeline:** Immediate  
**Owner:** Corey (with Matt providing data)

**Tasks:**
- [ ] Receive Excel price books from Matt for:
  - [ ] Embro
  - [ ] Multiglass (50 spreadsheets - shared folder)
  - [ ] Caradoc Thermal
- [ ] Process 5-6 price sheets per supplier using existing AI ingestion system
- [ ] Verify all suppliers appear in product database
- [ ] Test product browsing/filtering across all suppliers

**Success Criteria:**
- All 4 suppliers (Crossroads, Embro, Multiglass, Caradoc Thermal) have products in system
- Can browse/filter products from any supplier
- Product database shows supplier diversity

**Reference:** Meeting timestamp 15:05-15:42, 24:25-27:15

---

#### 2. **Build Material Request Form (Mark's Workflow)**
**Priority:** P0 - CRITICAL  
**Timeline:** Week 1  
**Owner:** Corey

**Requirements:**
- [ ] Create material request form that connects to product database
- [ ] Allow ordering ANY product from spec (across all suppliers)
- [ ] Start WITHOUT spec enforcement initially (open request form)
- [ ] Form fields:
  - Job selection
  - Required-by date
  - Priority (urgent/standard/low)
  - Delivery location (jobsite/warehouse/pickup)
  - Line items: Search products → Add quantity → Add notes
  - Photo attachments
- [ ] Form should be intuitive for field workers

**Success Criteria:**
- Mark can create material requests easily
- Form connects to product database
- Can add multiple line items
- Can attach photos

**Reference:** Meeting timestamp 17:55-18:32

---

#### 3. **Build Fulfillment Process (Inventory vs Supplier)**
**Priority:** P0 - CRITICAL  
**Timeline:** Week 1-2  
**Owner:** Corey

**Requirements:**
- [ ] When processing material request, system determines:
  - Can fulfill from inventory? → Mark as "inventory"
  - Need to order? → Mark as "supplier"
- [ ] Add fulfillment source field to material request line items:
  - `fulfillmentSource`: 'inventory' | 'supplier'
  - `supplierId`: If supplier, which one
  - `inventoryLocation`: If inventory, where
- [ ] UI for Mark to process requests:
  - View material request
  - For each line item, select: "Fulfill from inventory" or "Order from supplier"
  - If supplier, select which supplier
- [ ] When fulfilled from inventory:
  - Still track cost to job
  - Update inventory (if tracking enabled)
  - Mark line item as fulfilled

**Success Criteria:**
- Mark can process material requests
- Can distinguish inventory vs supplier fulfillment
- Inventory fulfillment still tracks to job cost
- Clear workflow for fulfillment decisions

**Reference:** Meeting timestamp 19:56-20:55

---

#### 4. **Multi-Material Request → PO Generation**
**Priority:** P0 - CRITICAL  
**Timeline:** Week 2  
**Owner:** Corey

**Requirements:**
- [ ] Build batch PO generation from multiple material requests
- [ ] Workflow:
  1. Select one or many material requests (e.g., "6 material requests this morning")
  2. Click "Generate Purchase Orders"
  3. System analyzes all line items:
     - Groups by supplier
     - Groups by job (for multi-job POs)
     - Creates separate PO per supplier
  4. System generates: "You need 8 POs" (one per supplier)
  5. Each PO contains items from multiple jobs (if applicable)
- [ ] PO generation logic:
  - Group line items by `supplierId` (from fulfillment selection)
  - For each supplier, create one PO
  - Include all jobs that have items from that supplier
  - Break down line items by job in PO
- [ ] Review screen:
  - Show all generated POs
  - Allow editing before finalizing
  - Show which MRs contributed to each PO
- [ ] After generation:
  - Update MR status to "po_issued"
  - Link MRs to generated POs
  - Allow downloading PDFs for each PO

**Success Criteria:**
- Can select multiple material requests
- System auto-generates POs grouped by supplier
- POs can contain items from multiple jobs
- Clear review/edit workflow before sending

**Reference:** Meeting timestamp 16:25-17:46

---

### 🟠 HIGH PRIORITY (Needed for Production)

#### 5. **Add Package Quantity to Product Descriptions**
**Priority:** P1 - HIGH  
**Timeline:** Week 1  
**Owner:** Corey

**Requirements:**
- [ ] Add `packageQuantity` field to product variants (especially pipe covering)
- [ ] Display package quantity in:
  - Product variant descriptions
  - PO line item descriptions
  - PO PDFs
- [ ] Format: "126 feet in box" or "Package: 126 FT"
- [ ] Extract from price sheets if available (may be on separate sheet)

**Example:**
- Product: "Pipe Covering 1/2" x 1""
- Description: "Package: 126 FT" (if available)

**Success Criteria:**
- Package quantity visible in product browsing
- Package quantity appears on PO PDFs
- Helps users order correct quantities

**Reference:** Meeting timestamp 6:00-7:52

---

#### 6. **Create Vanos-Only Instance**
**Priority:** P1 - HIGH  
**Timeline:** Week 1  
**Owner:** Corey

**Requirements:**
- [ ] Create separate deployment/instance for Vanos
- [ ] Import all product data (Crossroads + new suppliers)
- [ ] Add "Vanos Shop" as a supplier (for internal inventory)
- [ ] Configure for Vanos-specific workflows
- [ ] Ensure data isolation from other instances

**Success Criteria:**
- Vanos has dedicated instance
- All products available
- Vanos Shop appears as supplier option
- Ready for production use

**Reference:** Meeting timestamp 22:39-23:35

---

#### 7. **Shop Printout/Receiving Document**
**Priority:** P1 - HIGH  
**Timeline:** Week 2  
**Owner:** Corey

**Requirements:**
- [ ] Create printout that goes to shop for picking/packing
- [ ] Should include:
  - Material request number
  - Job information
  - Line items with quantities
  - Delivery location/instructions
  - Photos (if applicable)
- [ ] Format: Clean, printable document
- [ ] Use case: Shop workers pick materials from inventory

**Success Criteria:**
- Can print shop pick list from material request
- Clear, readable format
- Includes all necessary information

**Reference:** Meeting timestamp 14:47-14:59

---

### 🟡 MEDIUM PRIORITY (Enhancements)

#### 8. **Job Specification System (Simple Approach)**
**Priority:** P2 - MEDIUM  
**Timeline:** Week 3  
**Owner:** Corey

**Requirements:**
- [ ] Build simple specification system:
  - Per job, define list of approved products
  - NOT property-based filters (too complex)
  - Just: "These 7 products are approved for this job"
- [ ] Specification UI:
  - Job → Specification tab
  - Add products to approved list
  - Remove products from approved list
- [ ] Material request enforcement:
  - When creating MR, only show approved products
  - Allow override with permission (future)
- [ ] Start without enforcement, add later

**Success Criteria:**
- Can define approved products per job
- Simple, intuitive interface
- Can be enforced in material requests (optional)

**Reference:** Meeting timestamp 8:41-13:16

---

#### 9. **Cost Code Integration**
**Priority:** P2 - MEDIUM  
**Timeline:** Week 3-4  
**Owner:** Corey

**Requirements:**
- [ ] Connect material costs to job cost codes
- [ ] When fulfilling from inventory:
  - Still assign cost code
  - Post cost to job
- [ ] When creating PO:
  - Assign cost code per line item
  - Post committed cost to job
- [ ] Integration with existing cost code system

**Success Criteria:**
- Material costs post to correct cost codes
- Inventory fulfillment tracks costs
- PO costs tracked properly

**Reference:** Meeting timestamp 20:45-21:16

---

#### 10. **PO PDF Enhancements**
**Priority:** P2 - MEDIUM  
**Timeline:** Week 2  
**Owner:** Corey

**Requirements:**
- [ ] Enhance PO PDF with:
  - Package quantities (if available)
  - Better formatting
  - Job breakdown (if multi-job PO)
  - More professional appearance
- [ ] Test with suppliers for feedback

**Success Criteria:**
- Professional-looking PO PDFs
- All relevant information included
- Suppliers can easily process

**Reference:** Meeting timestamp 6:00-6:59

---

### 🟢 LOW PRIORITY (Future Enhancements)

#### 11. **AI Text-to-Material Request**
**Priority:** P3 - LOW  
**Timeline:** Future  
**Owner:** Corey

**Requirements:**
- [ ] Build AI-powered text input for material requests
- [ ] User types: "I need 200 feet of 1/2" x 1" pipe insulation"
- [ ] AI parses and creates material request line items
- [ ] Similar to pre-demo assessment AI feature

**Success Criteria:**
- Can create MRs via natural language
- Accurate parsing of quantities/products

**Reference:** Meeting timestamp 27:23-28:42

---

#### 12. **Spec Override Permissions**
**Priority:** P3 - LOW  
**Timeline:** Future  
**Owner:** Corey

**Requirements:**
- [ ] Add permission system for spec overrides
- [ ] Certain users can order non-spec products
- [ ] Track override reasons

**Success Criteria:**
- Permission-based spec enforcement
- Audit trail for overrides

**Reference:** Meeting timestamp 8:41-9:21

---

## IMPLEMENTATION NOTES

### Current System Capabilities
- ✅ Product database with variants (5,000+ variants from Crossroads)
- ✅ Supplier management
- ✅ Product browsing with filters
- ✅ Discount management
- ✅ Price history
- ✅ Manual PO creation
- ✅ PO PDF generation
- ✅ Basic material request form

### Missing Critical Features
- ❌ Multi-MR → PO batch generation
- ❌ Fulfillment workflow (inventory vs supplier)
- ❌ Material request connected to product database
- ❌ Shop printout/receiving document
- ❌ Additional supplier price books ingested

### Development Strategy
1. **Rapid Prototyping:** Build features in AI prototype → validate with Matt → hand off to dev team
2. **Iterative:** Deploy to Vanos → get feedback → iterate quickly
3. **Data First:** Get all price books ingested before building workflows

### Key Workflows to Build

**Workflow 1: Material Request → Fulfillment**
```
Field creates MR → Office reviews → 
  → Fulfill from inventory? → Update inventory → Cost to job
  → Order from supplier? → Generate PO
```

**Workflow 2: Multi-MR → PO Generation**
```
Select 6 MRs → Click "Generate POs" → 
  System groups by supplier → Creates 8 POs (one per supplier) → 
  Review/edit → Download PDFs → Send to suppliers
```

**Workflow 3: Shop Fulfillment**
```
MR approved → Print shop pick list → 
  Shop picks materials → Update inventory → 
  Mark MR as fulfilled → Cost to job
```

---

## DATA REQUIREMENTS

### Price Books Needed (from Matt)
- [x] Crossroads (already ingested - 57 products)
- [ ] Embro (Excel format)
- [ ] Multiglass (50 spreadsheets - shared folder)
- [ ] Caradoc Thermal (Excel format)

### Supplier Setup
- [ ] Add "Vanos Shop" as supplier (for internal inventory)
- [ ] Configure all 4 external suppliers

---

## SUCCESS METRICS

### Phase 1: Data Ingestion (Week 1)
- [ ] All 4 suppliers have products in system
- [ ] 5-6 price sheets per supplier processed
- [ ] Product database shows supplier diversity

### Phase 2: Core Workflows (Week 2)
- [ ] Material request form connected to product database
- [ ] Fulfillment workflow functional
- [ ] Multi-MR → PO generation working
- [ ] Shop printout available

### Phase 3: Production Ready (Week 3)
- [ ] Vanos instance deployed
- [ ] All workflows tested
- [ ] Ready to replace old system

---

## NEXT STEPS

1. **Immediate (Today):**
   - [ ] Matt sends price books (Embro, Multiglass, Caradoc Thermal)
   - [ ] Start ingesting price books

2. **This Week:**
   - [ ] Complete price book ingestion
   - [ ] Build material request form (connected to products)
   - [ ] Build fulfillment workflow
   - [ ] Add package quantity to products

3. **Next Week:**
   - [ ] Build multi-MR → PO generation
   - [ ] Create shop printout
   - [ ] Deploy Vanos instance
   - [ ] Test all workflows

---

## REFERENCES

- **Meeting Recording:** https://fathom.video/share/k4pbPE3yiMT-dEoXiMyVg3MPMFNcRRoF
- **Current Product Count:** 57 products (Crossroads), ~5,000 variants
- **Target:** Replace Vanos's current material management system
- **Timeline:** ASAP (75-80% ready now, need critical features)

---

**Document Created:** November 24, 2024  
**Last Updated:** November 24, 2024  
**Status:** Active - Implementation in Progress


