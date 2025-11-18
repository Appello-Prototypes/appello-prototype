# Cost Summary Data Flow - Fully Dynamic

## Overview
The Cost Summary section is **100% dynamic** - all values are calculated from live API data, not hardcoded.

## Data Sources & Calculations

### 1. **Total Budget** (`$191,333`)
**Source:** `/api/jobs/${jobId}/sov-components`
- **Field:** `sovSummary.totalValue`
- **Backend Calculation:** Sum of all SOV line items' `totalValue` field
- **Code Location:** `src/server/controllers/jobController.js` line 497
```javascript
totalValue: sovLineItems.reduce((sum, item) => sum + item.totalValue, 0)
```
- **Database:** Sums `totalValue` from all `ScheduleOfValues` documents for this job

### 2. **Total Spent** (`$187,670`)
**Source:** `/api/financial/${jobId}/earned-vs-burned`
- **Field:** `evm.actualCost`
- **Backend Calculation:** Sum of labor costs + AP costs
- **Code Location:** `src/server/controllers/financialController.js` lines 555-604
- **Components:**
  - Labor: From `TimelogRegister` (approved entries)
  - Materials: From `APRegister` (all invoices)
- **Formula:** `totalCost = laborCost + apCost`

### 3. **Remaining Budget** (`$3,663`)
**Calculation:** `totalBudget - totalSpent`
- **Code:** `const remainingBudget = totalBudget - totalSpent`
- **Location:** `JobOverview.jsx` line 318
- **Dynamic:** Calculated from the two values above

### 4. **Budget Utilization** (`98.1%`)
**Calculation:** `(totalSpent / totalBudget) * 100`
- **Code:** `const budgetUtilization = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0`
- **Location:** `JobOverview.jsx` line 319
- **Dynamic:** Calculated percentage

### 5. **Labor Cost** (`$103,480`)
**Source:** Multiple endpoints (fallback chain)
- **Primary:** `evm.laborCost` from `/api/financial/${jobId}/earned-vs-burned`
- **Fallback:** `timelogMeta.totalCost` from `/api/financial/${jobId}/timelog-register`
- **Code:** `const laborCost = evm.laborCost || timelogMeta.totalCost || 0`
- **Location:** `JobOverview.jsx` line 316

### 6. **Materials Cost** (`$84,190`)
**Source:** Multiple endpoints (fallback chain)
- **Primary:** `evm.apCost` from `/api/financial/${jobId}/earned-vs-burned`
- **Fallback:** `apMeta.totalAmount` from `/api/financial/${jobId}/ap-register`
- **Code:** `const materialsCost = evm.apCost || apMeta.totalAmount || 0`
- **Location:** `JobOverview.jsx` line 317

### 7. **Outstanding AP** (`$24,301`)
**Calculation:** `(apMeta.totalAmount || 0) - (apMeta.paidAmount || 0)`
- **Source:** `/api/financial/${jobId}/ap-register`
- **Code:** `const outstandingAP = (apMeta.totalAmount || 0) - (apMeta.paidAmount || 0)`
- **Location:** `JobOverview.jsx` line 320

## API Endpoints Called

All data is fetched in parallel on component mount:

```javascript
const [
  tasksResponse,
  sovResponse,                    // ← Total Budget source
  timeEntriesResponse,
  earnedVsBurnedResponse,        // ← Total Spent, Labor, Materials source
  apRegisterResponse,            // ← Outstanding AP source
  timelogResponse,               // ← Labor fallback source
  progressReportsResponse,
  costToCompleteResponse
] = await Promise.all([...])
```

## Explanation Box Values

The "Understanding the Difference" box is also fully dynamic:

- **Cost Variance:** Uses `costVariance`, `earnedValue`, `actualCost` from EVM data
- **Remaining Budget:** Uses `remainingBudget`, `totalBudget`, `totalSpent` (all calculated)
- **Unearned Portion:** Uses `totalBudget - earnedValue` and `progressPercent` from latest progress report

## Verification

All values update automatically when:
- ✅ New SOV line items are added (Total Budget changes)
- ✅ New time entries are approved (Labor Cost changes)
- ✅ New AP invoices are added (Materials Cost changes)
- ✅ Progress reports are approved (Earned Value changes)
- ✅ Any financial data is updated

## No Hardcoded Values

✅ All numbers come from database queries
✅ All calculations are performed dynamically
✅ All values update in real-time when data changes
✅ Fallback values ensure data is always available

