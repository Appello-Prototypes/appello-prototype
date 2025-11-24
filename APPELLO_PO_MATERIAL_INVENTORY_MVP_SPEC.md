# APPELLO PURCHASE ORDER & MATERIAL ORDERING
## MVP SPECIFICATION (3-4 Month Development)

**Document Version:** 2.0 (MVP-Focused)  
**Date:** November 20, 2025  
**Prepared For:** Corey Shelson, CEO - Appello Inc.  
**Target Launch:** Q1 2026  
**Development Timeline:** 12-18 weeks

---

## EXECUTIVE SUMMARY

### MVP Scope & Philosophy

**Core Principle:** Build the simplest solution that solves the critical customer pain point: **Field needs materials → Office orders from supplier → Field receives → Costs post to job**

**What This MVP Solves:**
- Field workers can request materials via mobile app
- Office staff can create purchase orders and send to suppliers
- Field workers can receive materials and link to POs
- Material costs automatically post to job cost codes
- Basic inventory tracking (optional, simple)

**What This MVP Does NOT Include:**
- Complex product catalogs with variants (Shopify-style PIM)
- Multi-location inventory with reservations
- Advanced approval workflows with rules engines
- Automated three-way match (manual process)
- Supplier portals
- Advanced analytics and reporting
- Cycle counting, lot tracking, ABC classification

**Success Criteria:**
- Field can request materials (mobile) ✅
- Office can create PO (simple form) ✅
- Field can receive materials (mobile, bill of lading) ✅
- Costs post to job (automatic) ✅
- Launch in 3-4 months ✅

---

## 1. PRODUCT DATABASE (SIMPLE)

### 1.1 Core Philosophy

**Not a catalog system. Not Shopify. Just products that can be ordered.**

- Simple product records: Name, description, supplier, last price
- Manual entry with autocomplete (learns from past entries)
- CSV import for price sheets (simple column mapping)
- No variants, no hierarchies, no complex relationships

### 1.2 Product Record Structure

**Required Fields:**
- **Product Name:** Free text (e.g., "2 inch Fiberglass Pipe Insulation")
- **Description:** Optional free text
- **Supplier:** Link to Company (AP type)
- **Last Price:** Last purchase price (auto-updated on PO receipt)
- **Unit of Measure:** EA, FT, M, BOX, ROLL, SQ FT, GAL, LB (dropdown)
- **Category:** Optional (for filtering/reporting)

**Optional Fields:**
- **Supplier Catalog #:** Supplier's SKU (for reference)
- **Standard Cost:** Budget/estimate price (manual entry)
- **Notes:** Free text

**No Variants, No Complex Structure:**
- If customer needs "2 inch, 1 inch thick, ASJ facing" → Create separate product: "2" FG Insulation 1" ASJ"
- Simple = Fast to enter, easy to find

### 1.3 Product Entry Methods

**1. Manual Entry (Primary):**
- User types product name → System autocompletes from existing products
- If not found → Create new product (simple form)
- Fast, no barriers

**2. CSV Import (Price Sheet Import):**
- Customer uploads CSV file
- Mapping wizard: "Column A = Product Name, Column B = Price, Column C = Supplier"
- Import creates products (or updates existing if name matches)
- **No AI, no PDF extraction** - just CSV mapping

**3. Quick Create from PO:**
- When creating PO, user types product name
- If not in database → "Create product?" → Quick form → Add to PO
- Products created on-the-fly

### 1.4 Product Search & Selection

**Simple Search:**
- Type product name → Autocomplete suggestions
- Filter by supplier (optional)
- Filter by category (optional)
- **No complex hierarchies, no variants, no SKU matching**

**Selection in PO:**
- Search product → Select → Auto-fill description, supplier, last price
- User can edit price (override last price)
- User can edit description (add job-specific notes)

---

## 2. MATERIAL REQUEST (FIELD → OFFICE)

### 2.1 Enhance Existing Material Orders

**Current State:** Material orders already exist in Appello (basic form)

**Enhancement:** Add workflow to convert material orders → Purchase Orders

### 2.2 Mobile Material Request Form

**Field User Workflow:**

1. **Select Job** (from assigned jobs)
2. **Create Material Request**
3. **Enter Request Details:**
   - **Required-by Date:** Date picker
   - **Priority:** Urgent / Standard / Low (dropdown)
   - **Delivery Location:** 
     - Jobsite (auto-populated address)
     - Warehouse
     - Pick up
   - **Delivery Notes:** Free text (e.g., "Floor 3, loading dock C, gate code 1234#")

4. **Add Line Items:**
   - **Method 1:** Search products (if in database)
   - **Method 2:** Free text description (office will translate to product)
   - **Quantity:** Numeric entry
   - **Unit:** EA, FT, BOX, etc. (dropdown)
   - **Notes:** Free text (e.g., "Must match existing", "GC approved equal OK")

5. **Attach Photos:**
   - Photo of existing material (for matching)
   - Photo of drawing/spec
   - Photo of site conditions

6. **Submit Request**

### 2.3 Office Material Request Dashboard

**View All Requests:**
- List view: Job, Requestor, Items, Required-by Date, Status
- **Filters:** Priority, Status, Job, Required-by Date
- **Sort:** By required-by date (urgent first)

**Request Detail View:**
- Full request details
- Line items with photos/notes
- **Actions:**
  - Approve → Convert to PO
  - Reject (with reason)
  - Request Clarification (send message to field)

**Convert to PO:**
- Select supplier for request
- System creates draft PO with request items
- Office reviews, edits, issues PO

### 2.4 Request Status Tracking

**Statuses:**
- Submitted (field submitted, office reviewing)
- Approved (office approved, converting to PO)
- PO Issued (PO created and sent to supplier)
- Delivered (materials received)
- Closed (fulfilled or cancelled)

**Field Visibility:**
- Field sees status of their requests
- Push notifications: "Your request #45 approved", "PO #678 issued", "Materials delivered"

---

## 3. PURCHASE ORDER CREATION

### 3.1 PO Creation Workflow

**Entry Points:**
1. **From Material Request:** Convert approved request → PO
2. **Manual PO:** Office creates blank PO, adds items

### 3.2 PO Header

**Required Fields:**
- **PO Number:** Auto-generated (format: `PO-[YEAR]-[SEQUENCE]` or `[JOB#]-[SUPPLIER#]-[SEQ]`)
- **Supplier:** Select from Companies (AP type)
- **Job:** Select job/project
- **Cost Code:** Default cost code (can override per line)
- **Required-by Date:** Delivery deadline
- **Buyer:** Office user creating PO (auto-filled)

**Optional Fields:**
- **Ship-to Address:** Auto-populated from job, editable
- **Delivery Instructions:** Free text (e.g., "Call foreman 30 min before arrival")
- **Internal Notes:** Office-only notes
- **Supplier Notes:** Notes printed on PO (visible to supplier)

### 3.3 PO Line Items

**Add Line Items:**
1. **Search Product:** Type product name → Select from database
   - OR **Quick Create:** Type product name → "Create product?" → Quick form → Add to PO
2. **Enter Details:**
   - **Product:** Selected from database (or newly created)
   - **Description:** Auto-filled, editable (can add job-specific notes)
   - **Quantity:** Numeric entry
   - **Unit:** EA, FT, BOX, etc. (from product or manual)
   - **Unit Price:** Auto-filled from last price, editable
   - **Extended Cost:** Auto-calculated (qty × price)
   - **Cost Code:** Inherit from header or override per line

**Line Item Actions:**
- Add line
- Remove line
- Edit line
- Copy line (for similar items)

### 3.4 PO Calculations

**Simple Totals:**
- Subtotal: Sum of line extended costs
- Tax: Calculated per tax code (if applicable)
- Freight: Manual entry (if applicable)
- **Total:** Subtotal + Tax + Freight

**Committed Cost Posting:**
- When PO approved/sent → Total PO amount posts to job as "committed cost"
- Real-time update to job costing: "Material budget $50K, committed $35K, available $15K"

### 3.5 PO Approval (Simple Two-Level)

**Approval Rules:**
- **Auto-approve:** PO total < $X (configurable, e.g., $1,000)
- **Require Approval:** PO total ≥ $X → Requires PM/Owner approval

**Approval Workflow:**
1. Buyer creates PO → Clicks "Submit for Approval"
2. If < $X → Auto-approved → Ready to issue
3. If ≥ $X → Sent to approver (PM/Owner)
4. Approver receives notification (email + in-app)
5. Approver clicks → Views PO → Approve or Reject
6. If approved → PO ready to issue
7. If rejected → Returns to buyer with reason

**No Complex Rules:**
- No rules engine
- No conditional logic
- No test mode
- Just: Dollar threshold → Approver

### 3.6 PO Issuance

**Issue PO:**
1. Click "Issue PO" button
2. System generates PDF:
   - Company logo, contact info
   - PO header (number, date, supplier, job)
   - Line items table (item, description, qty, unit, price, extended)
   - Totals (subtotal, tax, freight, total)
   - Delivery instructions
   - Payment terms
3. Email to supplier:
   - To: Supplier contact email (from company record)
   - Subject: "PO #[NUMBER] - [JOB NAME]"
   - Body: Professional message template
   - Attachment: PO PDF
4. PO status updates: "Sent"
5. Internal notifications:
   - PM notified: "PO #[X] issued to [Supplier] for Job #[Y]"
   - Field requestor notified: "Your material request converted to PO #[X]"

**PO Revision:**
- Click "Revise PO" → Create revision
- Make changes (quantities, prices, items)
- Re-approval if revision exceeds threshold
- Re-issue to supplier (email with "PO Change Order" document)

**PO Cancellation:**
- Click "Cancel PO" → Enter reason
- Email supplier: "PO #[X] cancelled"
- Release committed cost from job

---

## 4. MATERIAL RECEIVING

### 4.1 Mobile Receiving Workflow

**Field User Workflow:**

1. **Select Job** (from assigned jobs)
2. **View Open POs** for selected job
3. **Select PO** to receive against
4. **Receiving Screen:**
   - PO header: Supplier, PO #, total
   - Line items table: Item, Ordered Qty, Received to Date, Remaining Qty
   - For each line:
     - **Quantity Received:** Enter qty received today
     - **Condition:** Good / Damaged / Incorrect Item (radio buttons)
     - **Notes:** Free text (if damaged or incorrect)

5. **Bill of Lading Photo:**
   - **Critical:** Take photo of bill of lading/packing slip
   - **Why:** Proof of delivery, delivery ticket # for invoice matching
   - **Storage:** Photo stored, linked to receipt

6. **Material Photos:**
   - Photo of delivered material (optional)
   - Photo of placement location (optional, e.g., "Floor 3 mechanical room")

7. **Delivery Details:**
   - **Received By:** Auto-filled (current user)
   - **Delivery Date/Time:** Auto-filled (current timestamp), editable
   - **Location Placed:** Free text (e.g., "Floor 3, North Wing" or "Warehouse 1, Aisle 3")

8. **Submit Receipt**

### 4.2 Receiving Validation

**Over-Receipt Tolerance:**
- Configurable: Allow over-receipt up to X% (e.g., ±5%)
- If within tolerance → Auto-accepted
- If exceeds tolerance → Notify PM: "Over-receipt: Ordered 500 FT, received 600 FT - approve?"

**Partial Receipt:**
- Ordered 500 FT, received 400 FT → System creates backorder: 100 FT
- PO line status: "Partially Received"
- Backorder tracking: "100 FT backordered, ETA TBD"

**Damaged Goods:**
- User marks items as damaged → System flags for review
- Notify buyer: "50 FT received damaged on PO #[X] - review needed"
- Buyer contacts supplier: Request replacement or credit

### 4.3 Receipt Processing

**System Actions on Receipt:**

1. **Update PO Line Status:**
   - Ordered: 500 FT
   - Received: 400 FT
   - Backorder: 100 FT
   - Status: "Partially Received"

2. **Update Job Cost:**
   - Post received qty × unit price to job cost code
   - Update committed cost: Shift from "on order" to "received"

3. **Update Inventory (if stock item):**
   - Increase on-hand quantity at receiving location
   - Update inventory valuation (average cost method)

4. **Notifications:**
   - Field requestor: "Your materials delivered to [location]"
   - PM: "PO #[X] partially received - $3,000 of $5,000"
   - Accounting: "PO #[X] received - expect invoice for $3,000"

### 4.4 Offline Receiving

**Critical for Field:**
- Construction sites have poor connectivity
- Field must be able to receive materials offline

**Offline Workflow:**
1. Field opens app → Caches open POs for assigned jobs
2. Receives materials offline → Enters quantities, takes photos
3. Receipts queued locally
4. When online → Auto-syncs receipts to server
5. Visual indicator: "📵 Offline - will sync when connected"

---

## 5. INVOICE MATCHING (MANUAL PROCESS)

### 5.1 Three-Way Match (Manual)

**Current Reality:** AP person manually matches invoices to POs (they're doing this anyway)

**MVP Approach:** System assists manual matching, doesn't automate it

### 5.2 Invoice Entry

**AP Workflow:**
1. Supplier invoice received (email PDF, paper mail)
2. AP enters invoice into Appello:
   - **Supplier:** Select from Companies
   - **Invoice #:** Enter invoice number
   - **Invoice Date:** Enter date
   - **Due Date:** Enter due date
   - **Total Amount:** Enter total
   - **Line Items:** Enter items (description, qty, price) OR just total
   - **Tax:** Enter tax amount
   - **Freight:** Enter freight (if applicable)

3. **Link to PO:**
   - Search for related PO(s):
     - By PO number (if on invoice)
     - By supplier + job + date range
     - By delivery ticket number (from receipt)
   - Select PO(s) → Link invoice to PO

### 5.3 Manual Matching

**System Displays Comparison:**
- **PO Total:** $5,000
- **PO Received:** $3,000 (400 FT of 500 FT)
- **Invoice Total:** $3,015
- **Variance:** $15 (0.5%)

**AP Reviews:**
- If match (or small variance) → Approve invoice
- If large variance → Contact supplier or buyer for resolution
- If no PO match → Investigate (emergency purchase? wrong customer?)

**No Auto-Matching:**
- AP person makes the decision
- System just shows the comparison
- Simple, matches current workflow

### 5.4 Invoice Approval & Posting

**Approval:**
- AP approves invoice → Ready for payment
- If variance > threshold → Require PM approval

**Posting to Accounting:**
- Approved invoice syncs to accounting system (QBO, Sage, etc.)
- GL mapping: Inventory account (if stock) OR COGS account (if direct to job)
- Job/cost code dimensions (if accounting supports)
- Committed cost finalized: Becomes actual cost

---

## 6. INVENTORY MANAGEMENT (BASIC, OPTIONAL)

### 6.1 Simple Inventory Tracking

**Philosophy:** Most customers don't track inventory. Make it optional and simple.

**Enable/Disable:**
- Admin setting: "Enable Inventory Tracking" (Yes/No)
- If disabled → Skip inventory, direct-to-job only
- If enabled → Basic stock tracking

### 6.2 Inventory Structure

**Single Warehouse (or Multiple Simple Locations):**
- **Locations:** Warehouse 1, Warehouse 2, Jobsite (simple list)
- **No complex hierarchies:** Just locations

**Product Inventory:**
- **On-Hand Quantity:** Per location
- **Location:** Where stored (warehouse/jobsite)
- **Last Cost:** Last purchase price (from PO receipts)

**No Advanced Features:**
- No reservations
- No transfers (manual process if needed)
- No cycle counting
- No lot tracking
- No ABC classification
- Just: Quantity, Location, Cost

### 6.3 Inventory Transactions

**Receipts:**
- When material received → If stock item → Increase on-hand qty at location
- Update inventory valuation (average cost method)

**Issues to Job:**
- Field or office: "Issue [item] from inventory to Job #[X]"
- Enter quantity → System:
  - Decreases on-hand qty at source location
  - Posts cost to job (qty × unit cost)
  - Updates job cost code

**Returns from Job:**
- Field or office: "Return [item] from Job #[X] to inventory"
- Enter quantity, condition → System:
  - Increases on-hand qty at warehouse
  - Credits job cost

**Adjustments:**
- Manual adjustment: "Adjust inventory for [item]"
- Enter reason (damage, theft, found, etc.)
- Enter adjustment qty (+ or -)
- Requires approval if > threshold

### 6.4 Inventory Reports (Basic)

**Simple Reports:**
- **Inventory Valuation:** Total value by location, by category
- **Stock Levels:** On-hand quantities, low stock alerts
- **No advanced analytics:** No turns, no ABC, no forecasting

---

## 7. JOB COST INTEGRATION

### 7.1 Committed Cost Tracking

**Material Cost Lifecycle:**
1. **Budgeted:** SOV line item has material budget (from estimate)
2. **Committed (on PO):** PO issued → Committed cost posted
3. **Received:** Material delivered → Committed cost becomes "received"
4. **Actual:** Invoice approved → Actual cost finalized

**Real-Time Updates:**
- Job costing dashboard shows: Budget, Committed, Actual, Available
- PM sees: "Material budget $50K, committed $35K, actual $10K, available $15K"

### 7.2 Cost Code Integration

**PO → Cost Code:**
- Each PO line item assigned to cost code
- PO amount posts to cost code's committed cost
- When received → Shows as "material received, pending invoice"
- When invoiced → Shows as actual cost

**Inventory Issue → Cost Code:**
- When material issued from inventory → Cost immediately posts to cost code actual
- No lag time

### 7.3 SOV Integration (Optional)

**If Job Uses SOV:**
- PO line items can map to SOV line items
- Material cost visible in SOV cost tracking
- Earned value calculation incorporates material actuals

**If Job Doesn't Use SOV:**
- Costs post to cost codes only
- Simple, works for all customers

---

## 8. REPORTING (BASIC)

### 8.1 Operational Dashboards

**Purchasing Dashboard:**
- **Open POs:** List of POs by status (Draft, Pending Approval, Sent, Partially Received)
- **Material Requests:** List of open requests, aging report
- **Upcoming Deliveries:** POs with required-by dates this week

**Field Dashboard (Mobile):**
- **My Material Requests:** Status of requests
- **Upcoming Deliveries:** Materials arriving soon

### 8.2 Basic Reports

**PO Reports:**
- Open POs by job
- PO aging (POs open >X days)
- PO status summary

**Material Request Reports:**
- Request aging (requests open >X hours)
- Request fill rate (% fulfilled on time)

**Job Cost Reports:**
- Material costs by job (budget vs. committed vs. actual)
- Material costs by cost code

**Inventory Reports (if enabled):**
- Inventory valuation by location
- Low stock alerts

**No Advanced Analytics:**
- No price trends
- No supplier performance
- No inventory turns
- Just basic operational reports

---

## 9. INTEGRATION WITH EXISTING SYSTEMS

### 9.1 Material Orders Migration

**Current State:** Material orders already exist in Appello

**Migration Path:**
1. **Existing Material Orders:** Keep as-is (don't break existing workflows)
2. **New Material Requests:** Use new workflow (enhanced version)
3. **Conversion:** Office can convert existing material orders → POs
4. **Dual System:** Both systems work during transition period

### 9.2 Accounting Integration

**QuickBooks Online:**
- PO costs → Committed cost (if QBO supports)
- Invoice approval → Sync vendor bill to QBO
- Job cost dimensions → Map to QBO job costing

**Sage 50:**
- CSV export for POs, invoices
- Manual import process (until real-time sync available)

**Other Accounting Systems:**
- CSV export
- API integration (if available)

### 9.3 Job Costing Integration

**Existing Job Costing Module:**
- PO costs → Job cost codes (automatic)
- Receipt costs → Job cost codes (automatic)
- Inventory issues → Job cost codes (automatic)
- Committed cost tracking → Real-time updates

---

## 10. MOBILE EXPERIENCE

### 10.1 Mobile-First Design

**Core Principle:** Field users should NEVER need laptop/desktop

**Material Request:**
- Large tap targets
- Autocomplete search
- Voice-to-text for notes
- Camera integration (photos)
- GPS auto-capture for delivery location

**Receiving:**
- Barcode scanning (if packing slip has QR/barcode)
- Photo capture (bill of lading, material condition)
- Offline mode (queue receipts, sync when online)
- Simple UI (minimal fields, fast workflow)

**Inventory Issues:**
- Quick-issue workflow (4 taps: Job → Item → Qty → Issue)
- Recent jobs pinned for speed

### 10.2 Offline Capability

**Critical for Construction Sites:**
- Cache open POs for offline access
- Queue receipts offline → Sync when connected
- Visual indicator: "📵 Offline - will sync when connected"

---

## 11. SECURITY & PERMISSIONS

### 11.1 Role-Based Access (Simple)

**Field Roles:**
- Create material requests
- View request status (own requests)
- Receive materials
- Issue materials from jobsite stock (if inventory enabled)

**Office Purchasing:**
- View all material requests
- Create/edit/issue POs
- Approve/reject requests
- Receive materials (warehouse)

**Project Manager:**
- View all material activity for assigned jobs
- Approve POs above threshold
- Approve inventory adjustments

**Accounting/AP:**
- View POs and receipts
- Enter invoices
- Match invoices to POs
- Approve invoices
- **Cannot create POs** (separation of duties)

**Admin:**
- Full access
- Configure settings (approval thresholds, inventory enable/disable)

### 11.2 Data Scoping

**Job-Based Scoping:**
- Users only see POs/requests for jobs they're assigned to
- Purchasing sees all POs (no job restriction)

---

## 12. IMPLEMENTATION ROADMAP

### Phase 1: MVP (12-18 weeks)

**Weeks 1-3: Product Database**
- Simple product records (name, description, supplier, price)
- Manual entry with autocomplete
- CSV import for price sheets (simple mapping)
- Product search and selection

**Weeks 4-6: Material Request Enhancement**
- Enhance existing material orders
- Mobile request form
- Office request dashboard
- Convert request → PO workflow

**Weeks 7-9: PO Creation**
- PO header and line items
- Simple approval (two-level)
- PO issuance (PDF generation, email)
- PO revision and cancellation

**Weeks 10-12: Receiving**
- Mobile receiving workflow
- Bill of lading photo capture
- Receipt processing (update PO, job cost, inventory)
- Offline receiving capability

**Weeks 13-15: Invoice Matching & Inventory**
- Manual invoice entry and matching
- Invoice approval and posting
- Basic inventory tracking (optional)
- Inventory transactions (receipts, issues, returns)

**Weeks 16-18: Integration & Testing**
- Job cost integration
- Accounting integration (QBO, Sage)
- Basic reporting
- Testing, bug fixes, polish

### Phase 2: Enhancements (6-12 months post-MVP)

**Based on Customer Feedback:**
- Price books (if customers request)
- Enhanced approval workflows (if needed)
- Inventory transfers (if multi-location customers)
- Basic three-way match automation (if requested)
- Additional reporting (if requested)

### Phase 3: Advanced Features (12+ months)

**Only if Customer Demand:**
- Supplier portal
- Advanced analytics
- Cycle counting
- Lot tracking
- Product variants (if needed)

---

## 13. SUCCESS METRICS

### MVP Success Criteria

**Functional:**
- ✅ Field can request materials (mobile)
- ✅ Office can create PO (simple form)
- ✅ Field can receive materials (mobile, bill of lading)
- ✅ Costs post to job (automatic)
- ✅ Basic inventory tracking (if enabled)

**Performance:**
- Material request → PO creation: <5 minutes
- PO creation → Issue: <10 minutes
- Receiving workflow: <2 minutes per PO
- Offline sync: Automatic when online

**Customer Satisfaction:**
- Solves core pain point (material ordering)
- Reduces manual work (no more pick ticket photos, delivery number spreadsheets)
- Integrates with existing job costing

**Timeline:**
- Launch in 3-4 months (12-18 weeks)
- Phased rollout (pilot customers first)

---

## 14. RISK MITIGATION

### Technical Risks

**Price Sheet Import:**
- **Risk:** CSV import might not work for all customers
- **Mitigation:** Manual entry fallback, simple mapping wizard
- **Acceptance:** Start with manual entry, add CSV import later if needed

**Offline Receiving:**
- **Risk:** Offline sync might fail
- **Mitigation:** Robust sync logic, manual sync option
- **Acceptance:** Test thoroughly on construction sites

**Accounting Integration:**
- **Risk:** QBO/Sage integration might have issues
- **Mitigation:** CSV export fallback, manual process option
- **Acceptance:** Start with CSV, add real-time sync later

### Scope Risks

**Feature Creep:**
- **Risk:** Customers request advanced features during development
- **Mitigation:** Stick to MVP scope, defer advanced features to Phase 2
- **Acceptance:** "That's a great idea for Phase 2"

**Over-Engineering:**
- **Risk:** Building features customers don't need
- **Mitigation:** Regular customer feedback, focus on core workflows
- **Acceptance:** Start simple, add complexity only if needed

---

## 15. OUT OF SCOPE (EXPLICITLY)

### Not in MVP

**Product Management:**
- ❌ Product variants (Shopify-style)
- ❌ Complex product hierarchies
- ❌ Supplier catalogs with SKU mapping
- ❌ Price books with version control
- ❌ AI-powered product matching

**Approval Workflows:**
- ❌ Rules engine
- ❌ Conditional approvals
- ❌ Multi-level approval chains
- ❌ Test mode

**Inventory Management:**
- ❌ Multi-location inventory with transfers
- ❌ Reservations and allocations
- ❌ Cycle counting
- ❌ Lot/batch tracking
- ❌ ABC classification
- ❌ Inventory forecasting

**Matching & Automation:**
- ❌ Automated three-way match
- ❌ Auto-matching invoices to POs
- ❌ Variance tolerance rules
- ❌ Auto-approval of variances

**Supplier Features:**
- ❌ Supplier portal
- ❌ Supplier self-service
- ❌ Supplier performance tracking

**Reporting & Analytics:**
- ❌ Price trend analysis
- ❌ Supplier performance metrics
- ❌ Inventory turns analysis
- ❌ Advanced cost analytics

**These features can be added in Phase 2/3 based on customer demand.**

---

## APPENDIX: MVP vs. FULL SPEC COMPARISON

| Feature | Full Spec | MVP Spec | Rationale |
|---------|-----------|----------|-----------|
| Product Database | Shopify PIM (variants, hierarchies) | Simple products (name, supplier, price) | Customers don't need variants, price sheets are blocker |
| Approval | Rules engine, multi-level | Two-level (auto <$X, approve >$X) | Customers have simple approval needs |
| Receiving | Automated matching | Manual process | Customers manually match anyway |
| Inventory | Multi-location, reservations, transfers | Simple stock tracking (optional) | Most customers don't track inventory |
| Matching | Automated three-way match | Manual matching | Requires perfect data customers don't have |
| Reporting | Advanced analytics | Basic operational reports | Customers want to order materials, not analyze trends |
| **Development Time** | **13-20 months** | **3-4 months** | **MVP focuses on core workflows** |

---

## CONCLUSION

**This MVP specification focuses on solving the core customer pain point: Field needs materials → Office orders → Field receives → Costs post to job.**

**Key Principles:**
1. **Start Simple:** Build the minimum needed to solve the problem
2. **Match Reality:** Match current customer workflows, don't over-engineer
3. **Iterate:** Add features based on customer feedback
4. **Focus:** Core workflows first, advanced features later

**Success = Customers can order materials end-to-end in Appello, costs post to jobs automatically, launch in 3-4 months.**

---

**Document Status:** MVP Specification Complete  
**Next Steps:** Review with product team, prioritize development, begin Phase 1 implementation

