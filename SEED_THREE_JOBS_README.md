# Three Scenario Jobs Seed Script

## Overview

This seed script creates comprehensive datasets for three different industrial construction jobs, each with realistic scenarios and patterns that exercise the platform's reporting and KPI capabilities.

## Jobs Created

1. **JOB-2025-INS-001**: Mechanical Insulation - Petrochemical Plant (6 months)
2. **JOB-2025-MECH-001**: Mechanical (Piping/HVAC) - Hospital HVAC (8 months)
3. **JOB-2025-ELEC-001**: Electrical - Data Center (10 months)

## What Gets Created

For each job, the script creates:

- ✅ **Project** - Parent project record
- ✅ **Job** - Job record with full details
- ✅ **Systems** - Work breakdown systems (Materials, Labor, etc.)
- ✅ **Areas** - Physical areas/zones
- ✅ **Phases** - Project phases
- ✅ **SOV Line Items** - 6-10 line items per job with cost codes
- ✅ **GL Categories & Accounts** - Chart of accounts structure
- ✅ **Progress Reports** - Monthly reports (6-10 per job)
- ✅ **Time Entries** - Weekly entries showing productivity patterns
- ✅ **AP Register Entries** - Material/equipment invoices
- ✅ **Users** - If they don't already exist

## Key Patterns Visible in Data

### Job 1 (Insulation) - Weather Impact & Material Escalation
- **Jan-Feb**: Cold weather causes 30% productivity loss
- **March**: Material costs escalate 25%
- **April**: Rework required on 15% of work
- **May-June**: Overtime push to recover schedule

### Job 2 (Mechanical) - Coordination & Change Orders
- **Feb-Apr**: Coordination delays with other trades
- **May**: Change orders add 20% to scope
- **July**: Equipment delivery delays
- **Aug-Sep**: Overtime push to meet deadline

### Job 3 (Electrical) - Slow Start & Testing Delays
- **Mar-May**: Very slow start (permits, site access)
- **Jun-Aug**: Material cost volatility
- **Sep-Oct**: Testing and commissioning delays
- **Nov-Dec**: Final completion

## Usage

### Prerequisites

1. Ensure `.env.local` is configured with `MONGODB_DEV_URI`
2. Make sure you're using the **development database** (not production)

### Run the Script

```bash
node scripts/seed-three-scenario-jobs.js
```

### Safety Check

The script includes a safety check - it will **NOT** overwrite existing jobs. If jobs with these numbers already exist, it will skip seeding and display a message.

To regenerate the data:
1. Delete the existing jobs first (via UI or MongoDB)
2. Run the script again

## What to Look For in the Platform

After seeding, explore these areas to see the patterns:

### 1. Cost-to-Complete Reports
- Job 1: Should show increasing variance due to weather and material escalation
- Job 2: Should show change order impact and equipment delays
- Job 3: Should show slow start and testing phase delays

### 2. Earned vs Burned Charts
- All jobs show periods where burn rate exceeds earn rate
- Job 1: Burn spikes in final months
- Job 2: Burn spikes during overtime push
- Job 3: Steady burn with testing phase slowdown

### 3. Progress Reports
- Submitted CTD vs Approved CTD discrepancies
- Holdback patterns visible
- Period-over-period progress trends

### 4. Time Entry Analysis
- Job 1: Weather conditions in early entries
- Job 1: Rework descriptions in April
- Job 2: Coordination delay descriptions
- Job 2: Overtime hours in final months
- Job 3: Testing phase entries

### 5. AP Register Analysis
- Job 1: Material cost escalation visible in March invoices
- Job 2: Large equipment invoice in June
- Job 3: Material cost volatility in summer months

### 6. Cost Code Performance
- Some cost codes consistently over budget
- Material cost codes show volatility
- Labor cost codes show productivity issues

## Data Volume

- **Projects**: 3
- **Jobs**: 3
- **SOV Line Items**: ~26 total
- **Progress Reports**: 24 total (6 + 8 + 10)
- **Time Entries**: ~2,000+ total
- **AP Register Entries**: 24 total

## Notes

- All dates are in 2025
- All amounts are in CAD
- Time entries are weekly (Monday-Friday)
- Progress reports are monthly
- AP entries are monthly

## Troubleshooting

### Script fails to connect
- Check `.env.local` has `MONGODB_DEV_URI` set
- Verify MongoDB connection is working

### Jobs already exist
- The script will skip if jobs exist
- Delete existing jobs first if you want to regenerate

### Missing data
- Check console output for errors
- Verify all models are properly imported
- Check MongoDB logs for issues

## Related Documentation

- See `THREE_JOB_SCENARIOS.md` for detailed scenario descriptions
- See `DEPLOYMENT_WORKFLOW.md` for database setup
- See `DATABASE_SETUP.md` for database configuration

