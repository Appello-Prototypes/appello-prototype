# Overview Tab - Financial KPIs Analysis & Recommendations

## Executive Summary

After analyzing all available financial reports and KPIs across the application, this document identifies the **most critical metrics** that should be displayed on the Job Overview tab. The Overview tab should provide a **high-level financial health snapshot** that enables quick decision-making without requiring navigation to detailed reports.

---

## Available Financial Reports & KPIs Inventory

### 1. **Earned vs Burned (EVM Analysis)**
**Location:** `/jobs/:jobId/earned-vs-burned`

**Key Metrics Available:**
- Budget at Completion (BAC)
- Earned Value (EV)
- Actual Cost (AC)
- Cost Variance (CV) - *Critical*
- Cost Performance Index (CPI) - *Critical*
- Schedule Performance Index (SPI)
- Estimate at Completion (EAC)
- Estimate to Complete (ETC)
- Variance at Completion (VAC)
- To-Complete Performance Index (TCPI)
- Overall Progress %
- Labor Cost vs AP Cost breakdown
- Status indicators (on_budget, at_risk, over_budget)

### 2. **Cost to Complete**
**Location:** `/jobs/:jobId/cost-to-complete`

**Key Metrics Available:**
- Forecast Final Cost
- Forecast Final Value
- Margin at Completion (MAC) - *Critical*
- Forecast Variance vs Budget
- CPI (This Period)
- Cost to Date
- Earned to Date
- Latest Forecast Period

### 3. **AP Register**
**Location:** `/jobs/:jobId/ap-register`

**Key Metrics Available:**
- Total Invoices Count
- Total Amount
- Paid Amount
- Outstanding Amount - *Critical*
- Summary by Cost Code

### 4. **Timelog Register**
**Location:** `/jobs/:jobId/timelog-register`

**Key Metrics Available:**
- Total Hours
- Total Cost
- Time Entries Count
- Average Cost/Hour
- Summary by Cost Code

### 5. **Monthly Cost Report**
**Location:** `/jobs/:jobId/monthly-cost-report`

**Key Metrics Available:**
- Total SOV Budget
- Total Spent to Date
- Remaining Budget - *Critical*
- Budget Utilization % - *Critical*

### 6. **Progress Reports**
**Location:** `/jobs/:jobId/progress-reports`

**Key Metrics Available:**
- Latest Progress Report %
- Number of Progress Reports
- Latest Report Date
- Report Status

---

## Recommended Overview Tab Structure

### **Tier 1: Critical Financial Health Metrics** (Top Priority)

These metrics answer: **"Is this job profitable and on track?"**

#### 1. **Cost Performance Index (CPI)**
- **Why Critical:** Single most important metric for financial health
- **Display:** Large card with color coding (Green ≥1.0, Yellow 0.9-1.0, Red <0.9)
- **Sub-text:** "On Budget" / "At Risk" / "Over Budget"
- **Source:** Earned vs Burned analysis
- **Formula:** CPI = Earned Value / Actual Cost

#### 2. **Cost Variance (CV)**
- **Why Critical:** Shows actual dollar variance from budget
- **Display:** Currency amount with color (green if positive, red if negative)
- **Sub-text:** "$X under/over budget"
- **Source:** Earned vs Burned analysis
- **Formula:** CV = Earned Value - Actual Cost

#### 3. **Margin at Completion (Forecast)**
- **Why Critical:** Projects final profitability
- **Display:** Currency amount with percentage
- **Sub-text:** "Projected margin: X%"
- **Source:** Cost to Complete (latest forecast)
- **Formula:** MAC = Forecast Final Value - Forecast Final Cost

#### 4. **Budget Utilization %**
- **Why Critical:** Shows how much of budget has been spent
- **Display:** Progress bar with percentage
- **Sub-text:** "$X remaining of $Y budget"
- **Source:** Monthly Cost Report or calculated from SOV vs Actuals
- **Formula:** (Total Spent / Total Budget) × 100

---

### **Tier 2: Progress & Performance Metrics** (High Priority)

These metrics answer: **"How is the job progressing?"**

#### 5. **Overall Progress %**
- **Why Important:** Shows completion status
- **Display:** Progress bar with percentage
- **Sub-text:** "From latest progress report: [Date]"
- **Source:** Latest approved Progress Report
- **Note:** Link to progress reports page

#### 6. **Earned Value vs Actual Cost**
- **Why Important:** Visual comparison of value earned vs money spent
- **Display:** Two numbers side-by-side with trend indicator
- **Sub-text:** "EV: $X | AC: $Y"
- **Source:** Earned vs Burned analysis

#### 7. **Latest Progress Report Status**
- **Why Important:** Indicates if billing is up-to-date
- **Display:** Badge with report number and date
- **Sub-text:** "Report #X - [Date]"
- **Source:** Progress Reports (latest approved)

---

### **Tier 3: Cost Breakdown Summary** (Medium Priority)

These metrics answer: **"Where is the money going?"**

#### 8. **Total Budget (SOV Value)**
- **Why Important:** Baseline for all comparisons
- **Display:** Large currency amount
- **Sub-text:** "Contract value"
- **Source:** SOV summary (already displayed)

#### 9. **Total Spent to Date**
- **Why Important:** Actual costs incurred
- **Display:** Currency amount
- **Sub-text:** "Labor: $X | Materials: $Y"
- **Source:** Combined from Timelog + AP Register

#### 10. **Remaining Budget**
- **Why Important:** How much budget is left
- **Display:** Currency amount with color coding
- **Sub-text:** "X% of budget remaining"
- **Source:** Calculated (Total Budget - Total Spent)

#### 11. **Outstanding AP Amount**
- **Why Important:** Cash flow indicator
- **Display:** Currency amount
- **Sub-text:** "X invoices pending payment"
- **Source:** AP Register summary

---

### **Tier 4: Operational Metrics** (Keep Current)

These provide operational context but are less critical for financial overview:

- **Total Tasks** (keep - operational metric)
- **Total Hours** (keep - operational metric)
- **SOV Components** (keep - structural metric)

---

## Recommended Layout

### **Section 1: Financial Health Dashboard** (4-card grid)
```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│     CPI     │ Cost Var.   │ Margin @    │ Budget      │
│             │             │ Completion  │ Utilization │
└─────────────┴─────────────┴─────────────┴─────────────┘
```

### **Section 2: Progress & Performance** (3-card grid)
```
┌─────────────┬─────────────┬─────────────┐
│  Progress % │ EV vs AC    │ Latest PR   │
└─────────────┴─────────────┴─────────────┘
```

### **Section 3: Cost Summary** (4-card grid)
```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│ Total Budget│ Spent to    │ Remaining   │ Outstanding │
│             │ Date        │ Budget      │ AP          │
└─────────────┴─────────────┴─────────────┴─────────────┘
```

### **Section 4: Quick Links to Detailed Reports**
- Link cards to: Earned vs Burned, Cost to Complete, AP Register, Progress Reports

---

## Implementation Priority

### **Phase 1: Critical Metrics** (Must Have)
1. CPI with status indicator
2. Cost Variance
3. Budget Utilization %
4. Overall Progress %

### **Phase 2: Enhanced Financial View** (Should Have)
5. Margin at Completion
6. Earned Value vs Actual Cost comparison
7. Total Spent breakdown (Labor vs Materials)
8. Remaining Budget

### **Phase 3: Additional Context** (Nice to Have)
9. Latest Progress Report status
10. Outstanding AP amount
11. Cost trend indicators (improving/declining)

---

## Data Sources & API Endpoints

### **Primary Endpoints Needed:**

1. **Earned vs Burned Summary**
   - Endpoint: `GET /api/financial/:jobId/earned-vs-burned`
   - Use: `totals` object for CPI, CV, EV, AC

2. **Cost to Complete Latest Forecast**
   - Endpoint: `GET /api/financial/:jobId/cost-to-complete/forecasts`
   - Use: Latest forecast `summary.marginAtCompletion`

3. **AP Register Summary**
   - Endpoint: `GET /api/financial/:jobId/ap-register`
   - Use: `meta` object for totals and outstanding

4. **Timelog Register Summary**
   - Endpoint: `GET /api/financial/:jobId/timelog-register`
   - Use: `meta` object for labor totals

5. **Latest Progress Report**
   - Endpoint: `GET /api/financial/:jobId/progress-reports?status=approved`
   - Use: First result for progress % and date

6. **SOV Summary** (already available)
   - Endpoint: `GET /api/jobs/:jobId/sov-components`
   - Use: `summary.totalValue` for budget

---

## Color Coding Standards

### **CPI Status:**
- **Green (≥1.0):** On or under budget
- **Yellow (0.9-0.99):** At risk
- **Red (<0.9):** Over budget

### **Variance Status:**
- **Green (positive):** Under budget
- **Red (negative):** Over budget

### **Budget Utilization:**
- **Green (<75%):** Healthy
- **Yellow (75-90%):** Caution
- **Red (>90%):** Critical

### **Progress:**
- **Blue:** Standard progress indicator
- **Green:** On schedule
- **Yellow:** Behind schedule
- **Red:** Significantly behind

---

## User Experience Considerations

1. **At-a-Glance Understanding:** Users should understand financial health in <5 seconds
2. **Actionable Insights:** Metrics should indicate if action is needed
3. **Drill-Down Capability:** Clicking metrics should navigate to detailed reports
4. **Contextual Help:** Tooltips explaining what each metric means
5. **Real-Time Updates:** Metrics should reflect latest approved data
6. **Visual Hierarchy:** Most critical metrics should be largest/most prominent

---

## Success Criteria

The Overview tab should enable users to:
- ✅ Quickly assess if a job is profitable
- ✅ Identify jobs requiring immediate attention
- ✅ Understand progress vs budget status
- ✅ Navigate to detailed reports when needed
- ✅ Compare multiple jobs at a glance (if viewing project dashboard)

---

## Next Steps

1. **Create/Enhance API Endpoint:** Create a consolidated summary endpoint that returns all overview metrics in a single call
2. **Update JobOverview Component:** Add financial health section with Tier 1 metrics
3. **Add Visualizations:** Consider mini charts for trends (CPI over time, budget burn rate)
4. **Add Tooltips:** Help text explaining each metric
5. **Add Navigation Links:** Quick links to detailed financial reports
6. **Test with Real Data:** Verify calculations match detailed reports

---

## Notes

- **Performance:** Consider caching summary data to avoid multiple API calls
- **Permissions:** Ensure users have appropriate access to financial data
- **Data Freshness:** Indicate when data was last updated
- **Empty States:** Handle cases where no progress reports exist yet
- **Mobile Responsiveness:** Ensure metrics are readable on mobile devices

