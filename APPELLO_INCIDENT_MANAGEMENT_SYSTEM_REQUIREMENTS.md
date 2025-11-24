# Appello Incident Management System - Comprehensive Requirements Document

**Date:** November 2025  
**Author:** Strategic Operations Partner AI  
**Purpose:** Define complete incident management system requirements based on customer feedback, regulatory compliance, and industry best practices

---

## EXECUTIVE SUMMARY

Appello's Incident Management System (IMS) will transform existing form functionality into a comprehensive safety management platform. The system must integrate seamlessly with current forms, notes, documents, and tracking capabilities to provide end-to-end incident lifecycle management, regulatory compliance, and actionable safety intelligence.

**Key Drivers:**
- **Customer Demand:** Rival Insulation (Nick Newman, CSP) and Vanos Insulations have explicitly requested incident management capabilities
- **Regulatory Compliance:** Must support COR, WHMIS, Green Book (Ontario), OSHA, and WSIB requirements
- **Strategic Integration:** Links existing forms to incidents, enabling comprehensive safety metrics and reporting
- **Business Value:** Enables safety metrics dashboards (TRIR, DART, EMR, OSHA rates) that customers need for insurance, bidding, and compliance

---

## 1. CUSTOMER REQUIREMENTS & FEEDBACK

### 1.1 Rival Insulation Requirements (Nick Newman, CSP)

**Source:** Email correspondence May 2025, Rival Onboarding Session April 2025

**Critical Requirements:**
1. **Safety Metrics Dashboard:**
   - Total Recordable Incident Rate (TRIR) calculation
   - DART (Days Away, Restricted, or Transferred) rate calculation
   - Formula: `# of injuries × 200,000 / hours worked = rate`
   - OSHA rates
   - EMR (Experience Modification Rate) tracking
   - Audit tracking

2. **Incident Input/Management:**
   - Where to input actual incidents to populate metrics
   - Incident lifecycle tracking (status changes over time)
   - Ability to change incident classification (e.g., "minor injury no lost time" → "lost time injury" after 48 hours)

3. **Toolbox Talk Forms:**
   - Weekly completion requirement for all workers
   - Need clarity on individual forms vs. shared form with multiple signatures

**Timeline:** Corey estimated 2-3 months minimum (May 2025), but noted this has been on roadmap for 2.5 years without sufficient customer demand to prioritize.

### 1.2 Vanos Insulations Requirements

**Source:** ATLAS meeting transcripts, form bug reports

**Current Usage:**
- Using Appello forms for safety compliance (JHA, equipment inspections, incident reports)
- Incident Reports Form exists but needs enhancement
- Working Alone Safety Form
- Fall Arrest Equipment Inspection forms
- Basic P.P.E. Confirmation and Inspection Form

**Gaps Identified:**
- Forms exist but lack connection to incident management system
- No centralized incident tracking
- Limited reporting capabilities for WSIB and regulatory compliance

### 1.3 General Customer Feedback (ATLAS Analysis)

**Common Themes:**
- "Incident management system requested" appears in multiple customer onboarding sessions
- Need for WSIB injury rates and reporting
- Link between forms and incidents is critical
- Track lifecycle of injured workers through recovery/return-to-work process
- Total time loss due to injury tracking (required for WSIB submissions)

**Corey's Vision (from ATLAS transcripts):**
> "So if there is an injury, then that form creates incident that incident gets categorized and then you can track the life cycle of that person going through that."

> "Incident management is the natural next step to forms - connecting them to incidents and being able to do all your health and safety reporting."

---

## 2. REGULATORY COMPLIANCE REQUIREMENTS

### 2.1 Canadian Standards

#### COR (Certificate of Recognition)
**Requirements:**
- Systematic documentation of health and safety practices
- Incident tracking and reporting
- Corrective action management
- Audit trail maintenance
- Performance metrics tracking
- Regular audits and reviews

**Appello IMS Must Support:**
- Document all incidents (injuries, near misses, property damage)
- Track corrective actions and their effectiveness
- Maintain comprehensive audit trails
- Generate compliance reports for COR audits
- Track safety performance metrics over time

#### WHMIS (Workplace Hazardous Materials Information System)
**Requirements:**
- Hazardous material incident reporting
- Safety data sheet (SDS) management
- Worker training records for hazardous materials
- Incident investigation for hazardous material exposures

**Appello IMS Must Support:**
- Categorize incidents involving hazardous materials
- Link incidents to WHMIS training records
- Track hazardous material exposures
- Generate WHMIS-specific incident reports

#### Green Book (Ontario Occupational Health and Safety Act)
**Requirements:**
- Report workplace injuries and illnesses
- Report critical injuries (within 24 hours)
- Report fatalities (immediately)
- Maintain records of all workplace injuries
- Joint Health and Safety Committee (JHSC) involvement
- Investigation requirements for critical injuries

**Appello IMS Must Support:**
- Critical injury reporting workflow (24-hour notification)
- Fatality reporting workflow (immediate notification)
- JHSC notification and involvement tracking
- Investigation documentation requirements
- Record retention (minimum 3 years, recommended 10+ years)

#### WSIB (Workplace Safety Insurance Board - Ontario)
**Requirements:**
- Report lost time injuries
- Track total time loss due to injury
- Calculate injury rates: `(Number of injuries × 200,000) / Total hours worked`
- Submit annual reports
- Track return-to-work programs
- Modified work tracking

**Appello IMS Must Support:**
- Lost time injury (LTI) tracking
- Days away from work calculation
- Hours worked integration (from TimeSheetRecord)
- WSIB report generation
- Return-to-work date tracking
- Modified work assignment tracking

### 2.2 American Standards

#### OSHA (Occupational Safety and Health Administration)
**Requirements:**
- OSHA Form 300: Log of Work-Related Injuries and Illnesses
- OSHA Form 300A: Summary of Work-Related Injuries and Illnesses (annual posting)
- OSHA Form 301: Injury and Illness Incident Report
- Report fatalities within 8 hours
- Report severe injuries (amputation, loss of eye, hospitalization) within 24 hours
- Maintain records for 5 years minimum

**Appello IMS Must Support:**
- Automated generation of Forms 300, 300A, 301
- Fatal injury reporting workflow (8-hour notification)
- Severe injury reporting workflow (24-hour notification)
- Recordable vs. non-recordable incident classification
- OSHA recordkeeping requirements compliance

**Key Metrics:**
- **TRIR (Total Recordable Incident Rate):** `(Number of recordable injuries × 200,000) / Total hours worked`
- **DART (Days Away, Restricted, or Transferred):** `(Number of DART cases × 200,000) / Total hours worked`
- **LTIFR (Lost Time Injury Frequency Rate):** `(Number of lost time injuries × 1,000,000) / Total hours worked`

#### EMR (Experience Modification Rate)
**Requirements:**
- Workers' compensation insurance rating factor
- Based on 3-year rolling history of claims
- Affects insurance premiums
- Must track all workers' compensation claims

**Appello IMS Must Support:**
- Link incidents to workers' compensation claims
- Track claim status and costs
- Calculate EMR impact
- Historical EMR tracking

---

## 3. SYSTEM ARCHITECTURE & INTEGRATION

### 3.1 Integration with Existing Appello Systems

#### Forms Integration
**Current State:**
- `SafetyForm` table exists with form definitions
- `Feedback` table stores form submissions
- `JobSafetyForm` links forms to jobs
- Form versioning via `FormWrapper`

**Incident Management Integration:**
- **Form Submission → Incident Creation:**
  - When an "Incident Report" form is submitted, automatically create an `Incident` record
  - Link form submission (`Feedback`) to incident via `IncidentFormSubmission` junction table
  - Extract incident details from form responses

- **Incident → Form Linking:**
  - Link multiple forms to a single incident (initial report, investigation, follow-up)
  - Support forms: Incident Reports, Investigation Forms, Corrective Action Forms, Return-to-Work Forms

#### Notes & Documents Integration
**Current State:**
- `Note`/`Comment` system exists
- `Asset` table for documents/photos
- `Folder` system for organization

**Incident Management Integration:**
- **Incident Notes:**
  - Link notes to incidents for investigation details, witness statements, follow-up actions
  - Support threaded conversations
  - Track note authors and timestamps

- **Incident Documents:**
  - Attach photos, videos, documents to incidents
  - Link to `Asset` table
  - Support multiple document types: photos, medical reports, investigation reports, corrective action plans

#### Time Tracking Integration
**Current State:**
- `TimeSheetRecord` tracks hours worked
- Hours allocated to jobs, cost codes, users

**Incident Management Integration:**
- **Hours Worked Calculation:**
  - Aggregate hours from `TimeSheetRecord` for TRIR/DART calculations
  - Filter by date range, company, division, job
  - Support rolling 12-month calculations

- **Lost Time Tracking:**
  - Track days away from work for injured workers
  - Calculate restricted work days
  - Track modified work assignments

#### Job Integration
**Current State:**
- `Job` table with full job hierarchy
- Jobs linked to companies, locations, buildings

**Incident Management Integration:**
- **Job Association:**
  - Link incidents to specific jobs
  - Track incidents by job, project, customer
  - Job-level safety metrics

- **Location Tracking:**
  - Link incidents to buildings, locations
  - Geographic incident analysis
  - Site-specific safety trends

#### User/Employee Integration
**Current State:**
- `User` table with employee records
- Training/certification tracking

**Incident Management Integration:**
- **Affected Workers:**
  - Link incidents to affected employees
  - Track multiple affected workers per incident
  - Track witness information
  - Track supervisor/manager involvement

- **Training Correlation:**
  - Link incidents to training records
  - Identify training gaps
  - Track certification compliance at time of incident

### 3.2 Data Model Structure

#### Core Incident Entity
```typescript
Incident {
  id: string
  companyId: string
  jobId?: string
  buildingId?: string
  locationId?: string
  
  // Reporting
  reportedByUserId: string
  reportedDate: DateTime
  incidentDate: DateTime
  incidentTime?: Time
  
  // Classification
  incidentTypeId: string (PropertyValue: Injury, Illness, Near Miss, Property Damage, Environmental)
  severityId: string (PropertyValue: Fatal, Critical, Lost Time, Medical Treatment, First Aid, Near Miss)
  statusId: string (PropertyValue: Reported, Under Investigation, Awaiting Action, Resolved, Closed)
  
  // Regulatory Classification
  isRecordable: boolean (OSHA)
  isLostTime: boolean
  isCritical: boolean (Green Book)
  requiresWSIBReport: boolean
  requiresOSHAReport: boolean
  
  // Details
  description: string
  locationDescription: string
  weatherConditions?: string
  equipmentInvolved?: string[]
  
  // Regulatory Tracking
  wsibClaimNumber?: string
  oshaReportNumber?: string
  reportDate?: DateTime
  
  // Lifecycle Tracking
  createdAt: DateTime
  updatedAt: DateTime
  closedDate?: DateTime
  
  // Audit
  createdByUserId: string
  updatedByUserId: string
}
```

#### Incident-Affected Workers
```typescript
IncidentAffectedUser {
  id: string
  incidentId: string
  userId: string
  
  // Injury Details
  bodyPartAffected?: string
  injuryType?: string (PropertyValue: Cut, Bruise, Fracture, Strain, etc.)
  treatmentType?: string (PropertyValue: First Aid, Medical Treatment, Hospitalization)
  
  // Lost Time Tracking
  daysAwayFromWork: number
  daysRestrictedWork: number
  daysTransferredWork: number
  returnToWorkDate?: DateTime
  modifiedWorkStartDate?: DateTime
  modifiedWorkEndDate?: DateTime
  
  // Workers' Compensation
  workersCompClaimNumber?: string
  claimStatus?: string
  claimCost?: Decimal
  
  // Medical
  medicalProvider?: string
  treatmentNotes?: string
}
```

#### Incident-Form Linking
```typescript
IncidentFormSubmission {
  id: string
  incidentId: string
  feedbackId: string (form submission)
  formType: string (PropertyValue: Initial Report, Investigation, Corrective Action, Follow-up, Return-to-Work)
  submittedDate: DateTime
  submittedByUserId: string
}
```

#### Incident Notes
```typescript
IncidentNote {
  id: string
  incidentId: string
  noteId: string (references Note table)
  noteType: string (PropertyValue: Investigation, Witness Statement, Corrective Action, Follow-up, General)
  isConfidential: boolean
}
```

#### Corrective Actions
```typescript
CorrectiveAction {
  id: string
  incidentId: string
  
  // Action Details
  description: string
  assignedToUserId: string
  dueDate: DateTime
  statusId: string (PropertyValue: Open, In Progress, Completed, Overdue, Cancelled)
  completedDate?: DateTime
  
  // Effectiveness
  effectivenessReviewDate?: DateTime
  effectivenessNotes?: string
  isEffective: boolean?
  
  // Tracking
  createdAt: DateTime
  updatedAt: DateTime
}
```

#### Root Cause Analysis
```typescript
RootCauseAnalysis {
  id: string
  incidentId: string
  
  // Analysis Method
  analysisMethod: string (PropertyValue: 5 Why, Fishbone, ICAM, TapRoot, Other)
  
  // Root Causes
  immediateCause?: string
  underlyingCause?: string
  rootCause?: string
  
  // Contributing Factors
  humanFactors?: string[]
  equipmentFactors?: string[]
  environmentalFactors?: string[]
  systemFactors?: string[]
  
  // Analysis Team
  analyzedByUserIds: string[]
  analysisDate: DateTime
  analysisNotes?: string
}
```

---

## 4. FUNCTIONAL REQUIREMENTS

### 4.1 Incident Reporting

#### 4.1.1 Initial Incident Report
**Requirements:**
- Mobile-friendly incident reporting form
- Real-time submission capability
- Offline support (sync when connectivity returns)
- Photo/video attachment
- GPS location capture
- Multiple reporting channels:
  - Mobile app
  - Web portal
  - Form submission (existing form system)

**Data Capture:**
- Who: Affected worker(s), witnesses, reporter
- What: Incident type, description, severity
- When: Date and time of incident
- Where: Job, location, building, specific area
- How: What happened (narrative)
- Why: Initial assessment (can be updated during investigation)

**Workflow:**
1. User submits incident report (via form or direct creation)
2. System creates `Incident` record
3. Automatic notifications sent based on severity:
   - Critical/Fatal: Immediate notification to safety manager, executive team
   - Lost Time: Notification to safety manager, HR, supervisor
   - Medical Treatment: Notification to safety manager
   - First Aid/Near Miss: Notification to safety manager
4. Incident status set to "Reported"
5. Form submission linked to incident via `IncidentFormSubmission`

#### 4.1.2 Regulatory Reporting Triggers
**Automated Notifications:**
- **Fatal Injury (OSHA):** Notify within 8 hours
- **Severe Injury (OSHA):** Notify within 24 hours (amputation, loss of eye, hospitalization)
- **Critical Injury (Green Book):** Notify within 24 hours
- **WSIB Lost Time:** Notify for reporting requirements

**Notification Recipients:**
- Safety Manager/Director
- HR Manager
- Company Executive
- Regulatory contacts (if configured)
- Affected worker's supervisor

### 4.2 Incident Investigation

#### 4.2.1 Investigation Workflow
**Requirements:**
- Assign investigation team
- Track investigation progress
- Document findings
- Root cause analysis
- Corrective action identification

**Investigation Steps:**
1. **Investigation Assignment:**
   - Assign investigator(s)
   - Set investigation deadline
   - Status: "Under Investigation"

2. **Evidence Collection:**
   - Link photos, videos, documents
   - Record witness statements (via forms or notes)
   - Document scene conditions
   - Equipment inspection records

3. **Root Cause Analysis:**
   - Select analysis method (5 Why, Fishbone, ICAM, TapRoot)
   - Document immediate, underlying, and root causes
   - Identify contributing factors

4. **Investigation Report:**
   - Generate investigation report
   - Link investigation form submission
   - Status: "Awaiting Action"

#### 4.2.2 Investigation Forms
**Form Types:**
- Incident Investigation Form
- Witness Statement Form
- Root Cause Analysis Form
- Scene Documentation Form

**Integration:**
- Forms submitted during investigation automatically linked to incident
- Form responses populate investigation fields
- Photos from forms attached to incident

### 4.3 Corrective Action Management

#### 4.3.1 Corrective Action Workflow
**Requirements:**
- Assign corrective actions from investigation
- Track action completion
- Verify effectiveness
- Prevent recurrence

**Workflow:**
1. **Action Creation:**
   - Create corrective action from investigation findings
   - Assign to responsible person
   - Set due date
   - Link to incident

2. **Action Tracking:**
   - Status: Open → In Progress → Completed
   - Track progress updates
   - Send reminders for overdue actions

3. **Effectiveness Review:**
   - Schedule effectiveness review date
   - Document review findings
   - Mark as effective/ineffective
   - Create follow-up actions if ineffective

4. **Preventive Actions:**
   - Identify similar risks
   - Create preventive actions
   - Link to multiple incidents if applicable

#### 4.3.2 Corrective Action Forms
**Form Types:**
- Corrective Action Plan Form
- Action Completion Form
- Effectiveness Review Form

### 4.4 Incident Lifecycle Management

#### 4.4.1 Status Workflow
**Status Progression:**
1. **Reported:** Initial report submitted
2. **Under Investigation:** Investigation in progress
3. **Awaiting Action:** Investigation complete, corrective actions pending
4. **Action In Progress:** Corrective actions being implemented
5. **Resolved:** All actions completed, incident resolved
6. **Closed:** Incident closed (after effectiveness review period)

**Status Change Tracking:**
- Log all status changes with timestamp
- Record who changed status and why
- Support status rollback if needed

#### 4.4.2 Classification Updates
**Dynamic Classification:**
- Initial classification may change over time
- Example: "Minor injury, no lost time" → "Lost time injury" after worker misses work
- Track classification history
- Update regulatory flags (isRecordable, isLostTime, requiresWSIBReport)

**Classification Change Triggers:**
- Worker misses work → Update to "Lost Time"
- Medical treatment required → Update to "Medical Treatment"
- Hospitalization → Update to "Severe Injury" (OSHA)
- Worker returns to work → Update return-to-work date

### 4.5 Return-to-Work Management

#### 4.5.1 Return-to-Work Tracking
**Requirements:**
- Track days away from work
- Track restricted work days
- Track transferred work days
- Modified work assignments
- Full-duty return date

**Data Tracking:**
- Days away from work: Days worker completely absent
- Restricted work days: Days worker on modified duties
- Transferred work days: Days worker in different role
- Modified work assignment details
- Medical clearance dates

**Forms:**
- Return-to-Work Plan Form
- Modified Work Assignment Form
- Medical Clearance Form

### 4.6 Lost Time Injury Tracking

#### 4.6.1 Lost Time Calculation
**Requirements:**
- Track days away from work per incident
- Calculate total lost time days
- Support WSIB reporting requirements
- Calculate DART metrics

**Calculation Logic:**
- **Days Away:** Calendar days worker absent (excluding day of injury, including return day)
- **Restricted Days:** Days worker on modified duties
- **Transferred Days:** Days worker in different role
- **DART Days:** Sum of days away + restricted + transferred

#### 4.6.2 WSIB Integration
**Requirements:**
- Track WSIB claim numbers
- Link incidents to WSIB claims
- Generate WSIB reports
- Track claim status and costs

---

## 5. REPORTING & ANALYTICS

### 5.1 Safety Metrics Dashboard

#### 5.1.1 Key Performance Indicators (KPIs)

**TRIR (Total Recordable Incident Rate)**
- **Formula:** `(Number of recordable injuries × 200,000) / Total hours worked`
- **Calculation Period:** Rolling 12 months
- **Filtering:** By company, division, job, date range
- **Display:** Current rate, trend over time, comparison to industry benchmark

**DART (Days Away, Restricted, or Transferred)**
- **Formula:** `(Number of DART cases × 200,000) / Total hours worked`
- **Calculation Period:** Rolling 12 months
- **Filtering:** By company, division, job, date range
- **Display:** Current rate, trend over time

**LTIFR (Lost Time Injury Frequency Rate)**
- **Formula:** `(Number of lost time injuries × 1,000,000) / Total hours worked`
- **Calculation Period:** Rolling 12 months
- **Filtering:** By company, division, job, date range

**LTIIR (Lost Time Injury Incidence Rate)**
- **Formula:** `(Number of lost time injuries × 200,000) / Total hours worked`
- **Calculation Period:** Rolling 12 months

**EMR (Experience Modification Rate)**
- **Tracking:** Workers' compensation EMR
- **Display:** Current EMR, historical trend, impact on premiums
- **Integration:** Link to workers' compensation claims

**OSHA Rates**
- **TRIR:** Total Recordable Incident Rate
- **DART:** Days Away, Restricted, or Transferred
- **LTIFR:** Lost Time Injury Frequency Rate
- **Display:** All rates with industry benchmarks

#### 5.1.2 Dashboard Components

**Real-Time Metrics:**
- Total incidents (current period)
- Lost time incidents
- Days away from work (total)
- Recordable incidents
- Near misses

**Trend Analysis:**
- Incident trends over time (line chart)
- Severity distribution (pie chart)
- Incident type breakdown (bar chart)
- Monthly/quarterly/annual comparisons

**Geographic Analysis:**
- Incidents by location/job
- Heat map of incident locations
- Site-specific safety performance

**Leading Indicators:**
- Near miss reporting rate
- Safety form completion rate
- Training compliance rate
- Equipment inspection failure rate

### 5.2 Regulatory Reports

#### 5.2.1 OSHA Reports

**OSHA Form 300 (Log of Work-Related Injuries and Illnesses)**
- **Requirements:** List all recordable injuries/illnesses
- **Fields:** Employee name, job title, date of injury, where event occurred, description, classification
- **Generation:** Automated from incident records
- **Export:** PDF, Excel formats

**OSHA Form 300A (Summary)**
- **Requirements:** Annual summary posted in workplace
- **Fields:** Total cases, days away, days of job transfer/restriction, total recordable cases
- **Generation:** Automated calculation from Form 300 data
- **Posting:** February 1 - April 30 annually

**OSHA Form 301 (Injury and Illness Incident Report)**
- **Requirements:** Detailed report for each recordable incident
- **Fields:** Employee information, injury details, treatment, incident description
- **Generation:** Automated from incident records
- **Timeline:** Complete within 7 days of incident

#### 5.2.2 WSIB Reports

**WSIB Annual Report**
- **Requirements:** Annual submission to WSIB
- **Fields:** Total hours worked, number of injuries, lost time days, injury rates
- **Calculation:** `(Number of injuries × 200,000) / Total hours worked`
- **Generation:** Automated from incident and timesheet data

**WSIB Lost Time Report**
- **Requirements:** Report lost time injuries
- **Fields:** Incident details, days away, return-to-work dates, claim information
- **Timeline:** Report within 3 days of lost time determination

#### 5.2.3 COR Audit Reports

**COR Compliance Report**
- **Requirements:** Documentation for COR audit
- **Fields:** Incident logs, investigation reports, corrective actions, training records
- **Generation:** Comprehensive report linking incidents, forms, notes, documents

### 5.3 Custom Reports

#### 5.3.1 Incident Reports
**Report Types:**
- Incident Detail Report
- Incident Summary Report
- Investigation Report
- Corrective Action Report
- Return-to-Work Report

**Filtering Options:**
- Date range
- Incident type
- Severity
- Status
- Job/Location
- Affected worker
- Investigator

**Export Formats:**
- PDF
- Excel
- CSV

#### 5.3.2 Trend Analysis Reports
**Report Types:**
- Incident trends over time
- Incident type analysis
- Severity distribution
- Location/job analysis
- Root cause analysis summary
- Corrective action effectiveness

### 5.4 Analytics & Insights

#### 5.4.1 Predictive Analytics
**Capabilities:**
- Identify high-risk jobs/locations
- Predict incident likelihood based on patterns
- Identify training gaps
- Equipment failure correlation

#### 5.4.2 Benchmarking
**Capabilities:**
- Compare to industry benchmarks
- Internal benchmarking (divisions, jobs)
- Year-over-year comparisons
- Best practice identification

---

## 6. USER INTERFACE REQUIREMENTS

### 6.1 Incident List View

**Features:**
- Filterable, sortable table
- Quick filters: Status, Severity, Type, Date Range
- Search functionality
- Bulk actions
- Export capabilities

**Columns:**
- Incident ID
- Date/Time
- Type
- Severity
- Status
- Affected Worker(s)
- Job/Location
- Reported By
- Days Away (if applicable)

### 6.2 Incident Detail View

**Sections:**
1. **Overview Tab:**
   - Basic incident information
   - Affected workers
   - Status and classification
   - Regulatory flags

2. **Investigation Tab:**
   - Investigation details
   - Root cause analysis
   - Witness statements
   - Evidence (photos, documents)

3. **Actions Tab:**
   - Corrective actions
   - Preventive actions
   - Action status and tracking

4. **Forms Tab:**
   - Linked forms (initial report, investigation, follow-up)
   - Form submissions timeline

5. **Notes Tab:**
   - Incident notes
   - Threaded conversations
   - Investigation notes

6. **Documents Tab:**
   - Attached documents
   - Photos/videos
   - Medical reports
   - Investigation reports

7. **Timeline Tab:**
   - Complete incident lifecycle
   - Status changes
   - Form submissions
   - Action completions
   - Return-to-work milestones

### 6.3 Mobile Interface

**Requirements:**
- Mobile-optimized incident reporting
- Photo/video capture
- GPS location capture
- Offline support
- Quick incident lookup
- Status updates

**Key Screens:**
- Incident Report Form
- Incident List
- Incident Detail (simplified)
- Quick Actions (status update, add note)

### 6.4 Dashboard Views

**Safety Metrics Dashboard:**
- Real-time KPIs (TRIR, DART, LTIFR)
- Trend charts
- Incident summary cards
- Recent incidents list
- Overdue actions alert

**Executive Dashboard:**
- High-level safety metrics
- Incident trends
- Cost impact (workers' compensation)
- Compliance status

---

## 7. INTEGRATION REQUIREMENTS

### 7.1 Existing Appello Modules

#### Forms Module
- **Integration:** Form submissions create/link to incidents
- **Bidirectional:** Incidents can trigger form assignments
- **Data Flow:** Form responses populate incident fields

#### Time Tracking Module
- **Integration:** Hours worked data for rate calculations
- **Data Flow:** Aggregate TimeSheetRecord hours for TRIR/DART calculations
- **Filtering:** By date range, company, division, job

#### Training & Compliance Module
- **Integration:** Link incidents to training records
- **Data Flow:** Identify training gaps, track certification compliance
- **Analytics:** Training effectiveness correlation

#### Equipment Module
- **Integration:** Link incidents to equipment
- **Data Flow:** Equipment failure incidents, inspection history
- **Analytics:** Equipment-related incident trends

#### Job Management Module
- **Integration:** Link incidents to jobs
- **Data Flow:** Job-level safety metrics
- **Analytics:** Job safety performance

### 7.2 External Systems

#### Workers' Compensation Systems
- **Integration:** Export incident data for claims
- **Data Flow:** Claim numbers, status, costs
- **Format:** CSV, API (if available)

#### Payroll Systems
- **Integration:** Hours worked data import
- **Data Flow:** Hours for rate calculations
- **Format:** CSV export from payroll

#### Regulatory Reporting Systems
- **Integration:** Export for regulatory submissions
- **Data Flow:** OSHA, WSIB report formats
- **Format:** PDF, Excel, CSV

---

## 8. SECURITY & COMPLIANCE

### 8.1 Access Control

**Role-Based Permissions:**
- **Safety Manager:** Full access, can create/edit/close incidents
- **Supervisor:** Can create incidents, view assigned incidents
- **Worker:** Can report incidents, view own incidents
- **HR:** Can view incidents, manage return-to-work
- **Executive:** Dashboard access, reports
- **Auditor:** Read-only access, export capabilities

**Data Privacy:**
- Medical information confidentiality
- Witness statement protection
- Investigation confidentiality
- HIPAA compliance (if applicable)

### 8.2 Audit Trail

**Requirements:**
- Log all incident changes
- Track who changed what and when
- Maintain complete history
- Support regulatory audits

**Tracked Changes:**
- Status changes
- Classification updates
- Field modifications
- Note additions
- Document attachments
- Action assignments/completions

### 8.3 Data Retention

**Requirements:**
- Minimum 3 years (Green Book)
- Recommended 10+ years
- OSHA: 5 years minimum
- WSIB: As required by jurisdiction

**Retention Policies:**
- Configurable retention periods
- Archive old incidents
- Secure deletion after retention period

---

## 9. IMPLEMENTATION PRIORITIES

### Phase 1: Core Incident Management (MVP)
**Timeline:** 2-3 months  
**Priority:** High (Customer demand)

**Features:**
1. Incident creation and basic tracking
2. Link forms to incidents
3. Basic status workflow
4. Affected worker tracking
5. Lost time calculation
6. Basic TRIR/DART calculations
7. Simple dashboard with key metrics

### Phase 2: Investigation & Actions
**Timeline:** 1-2 months after Phase 1

**Features:**
1. Investigation workflow
2. Root cause analysis
3. Corrective action management
4. Action tracking and reminders
5. Effectiveness reviews

### Phase 3: Advanced Reporting
**Timeline:** 1-2 months after Phase 2

**Features:**
1. OSHA Form 300/300A/301 generation
2. WSIB report generation
3. Advanced analytics
4. Trend analysis
5. Benchmarking

### Phase 4: Return-to-Work & Advanced Features
**Timeline:** 1-2 months after Phase 3

**Features:**
1. Return-to-work tracking
2. Modified work assignments
3. Workers' compensation integration
4. EMR tracking
5. Predictive analytics

---

## 10. SUCCESS METRICS

### 10.1 Customer Adoption
- Number of customers using incident management
- Number of incidents reported per month
- Form-to-incident conversion rate

### 10.2 System Usage
- Incident creation rate
- Investigation completion rate
- Corrective action completion rate
- Report generation frequency

### 10.3 Business Value
- Customer retention (safety-focused customers)
- New customer acquisition (safety as differentiator)
- Upsell opportunities (safety module)
- Customer satisfaction scores

### 10.4 Compliance
- Regulatory report generation accuracy
- Audit readiness
- Compliance with reporting deadlines
- Data completeness

---

## 11. APPENDIX

### 11.1 Key Customer Quotes

**Nick Newman (Rival Insulation), May 2025:**
> "Any safety dashboard updates based on feedback provided? Provide calculation for RIR/DART to Corey (# of injuries x 200,000 / hours worked = rate)"

> "Where are people inputting or where would we input the actual incident to get them ready?"

**Corey Shelson (Appello), April 2025:**
> "So if there is an injury, then that form creates incident that incident gets categorized and then you can track the life cycle of that person going through that."

> "Incident management is the natural next step to forms - connecting them to incidents and being able to do all your health and safety reporting."

### 11.2 Regulatory Reference Links

- **OSHA:** https://www.osha.gov/recordkeeping
- **WSIB:** https://www.wsib.ca
- **COR:** Various provincial programs
- **WHMIS:** https://www.ccohs.ca/oshanswers/legisl/whmis.html
- **Green Book:** Ontario Occupational Health and Safety Act

### 11.3 Industry Benchmarks

**Construction Industry (NAICS 23) Average Rates:**
- TRIR: ~3.0-4.0
- DART: ~1.5-2.0
- LTIFR: ~0.5-1.0

**Target Rates (Best-in-Class):**
- TRIR: <1.0
- DART: <0.5
- LTIFR: <0.2

---

## CONCLUSION

Appello's Incident Management System will transform the platform from a forms management tool into a comprehensive safety management system. By integrating incidents with existing forms, notes, documents, and time tracking, Appello will provide customers with the safety intelligence they need for regulatory compliance, insurance management, and continuous improvement.

The system addresses explicit customer demand from Rival Insulation and Vanos Insulations while positioning Appello as a complete safety solution for ICI contractors. The phased implementation approach ensures rapid delivery of core functionality while building toward advanced features that differentiate Appello in the market.

**Next Steps:**
1. Review and approve requirements document
2. Prioritize Phase 1 features with product team
3. Begin data model design and API specification
4. Create user stories and acceptance criteria
5. Design UI/UX mockups
6. Begin development sprint planning

---

**Document Version:** 1.0  
**Last Updated:** November 2025  
**Status:** Draft for Review

