# Work Orders and Tasks - Seeded Data Summary

## Overview

Successfully seeded **16 realistic work orders** with **63 associated tasks** across the three scenario jobs, demonstrating the power of the Work Order → Tasks relationship structure.

## What Was Created

### Job 1: Mechanical Insulation - Petrochemical Plant (JOB-2025-INS-001)
**5 Work Orders** with **18 Tasks**

1. **WO-2025-INS-001-001**: Process Unit A - Hot Piping Insulation
   - 5 tasks covering different pipe sizes and jacketing
   - Status: Completed
   - Demonstrates: Main scope work order with multiple craft tasks

2. **WO-2025-INS-001-002**: Process Unit A - Vessel Insulation
   - 4 tasks for vertical and horizontal vessels
   - Status: Completed
   - Demonstrates: Equipment-specific work order

3. **WO-2025-INS-001-003**: Material Escalation - Additional Insulation Materials
   - 2 tasks for material procurement
   - Status: Completed
   - **Change Order**: Yes
   - Demonstrates: Change order work order for material escalation scenario

4. **WO-2025-INS-001-004**: Rework - Process Unit A Quality Issues
   - 3 tasks for rework and quality improvements
   - Status: Completed
   - Demonstrates: Rework work order addressing quality issues scenario

5. **WO-2025-INS-001-005**: Process Unit B - Hot Piping Insulation
   - 4 tasks with accelerated schedule
   - Status: Completed
   - Demonstrates: Recovery/acceleration work order with overtime

### Job 2: Mechanical (Piping/HVAC) - Hospital HVAC (JOB-2025-MECH-001)
**5 Work Orders** with **21 Tasks**

1. **WO-2025-MECH-001-001**: Main HVAC Ductwork Installation - Wing A
   - 4 tasks for supply/return ducts and testing
   - Status: Completed
   - Demonstrates: Main scope work order

2. **WO-2025-MECH-001-002**: HVAC Piping Installation - Chilled Water System
   - 4 tasks for supply/return piping and testing
   - Status: Completed
   - Demonstrates: System-specific work order

3. **WO-2025-MECH-001-003**: Change Order - Additional Ductwork for Wing B
   - 4 tasks for additional scope
   - Status: Completed
   - **Change Order**: Yes
   - Demonstrates: Change order work order for scope creep scenario

4. **WO-2025-MECH-001-004**: HVAC Equipment Installation - Air Handling Units
   - 5 tasks including equipment delivery and installation
   - Status: Completed
   - Demonstrates: Equipment installation work order with delivery delays scenario

5. **WO-2025-MECH-001-005**: Final Push - Complete All Remaining Work
   - 4 tasks for final completion with overtime
   - Status: Completed
   - Demonstrates: Overtime push work order to meet deadline

### Job 3: Electrical - Data Center (JOB-2025-ELEC-001)
**6 Work Orders** with **24 Tasks**

1. **WO-2025-ELEC-001-001**: Main Power Distribution - Phase 1
   - 4 tasks for switchgear and feeders
   - Status: Completed
   - Demonstrates: Phased work order for slow start scenario

2. **WO-2025-ELEC-001-002**: UPS and Backup Power Systems
   - 5 tasks including extensive testing
   - Status: Completed
   - Demonstrates: Critical systems work order with testing requirements

3. **WO-2025-ELEC-001-003**: Data Center Lighting Installation
   - 3 tasks for fixtures and controls
   - Status: Completed
   - Demonstrates: Standard installation work order

4. **WO-2025-ELEC-001-004**: Fire Alarm and Life Safety Systems
   - 4 tasks with extensive testing
   - Status: Completed
   - Demonstrates: Testing and commissioning work order

5. **WO-2025-ELEC-001-005**: Low-Voltage Systems - Subcontractor Work
   - 4 tasks for subcontractor oversight
   - Status: Completed
   - Demonstrates: Subcontractor management work order

6. **WO-2025-ELEC-001-006**: Final Commissioning and Testing
   - 4 tasks for final testing and documentation
   - Status: Completed
   - Demonstrates: Final commissioning work order

## Key Features Demonstrated

### 1. **Work Order Types**
- **Standard Work Orders**: Main scope work (e.g., piping installation)
- **Change Orders**: Additional scope (marked with `isChangeOrder: true`)
- **Rework Work Orders**: Quality issues and corrections
- **Equipment Work Orders**: Equipment-specific installations
- **Testing/Commissioning Work Orders**: Final testing and handover

### 2. **Task Breakdown Patterns**
- **By Craft**: Tasks organized by craft (insulation, general, equipment)
- **By Size/Type**: Tasks broken down by pipe size, vessel type, etc.
- **By Phase**: Tasks organized by installation phase (prep, install, test, complete)
- **By Priority**: Tasks assigned appropriate priority levels

### 3. **Realistic Scenarios**
- **Weather Impact**: Work orders affected by weather delays
- **Material Escalation**: Change orders for material cost increases
- **Quality Issues**: Rework work orders
- **Equipment Delays**: Work orders delayed by equipment delivery
- **Overtime Push**: Work orders with accelerated schedules
- **Testing Delays**: Work orders with extensive testing requirements
- **Subcontractor Management**: Work orders requiring subcontractor oversight

### 4. **Data Relationships**
- **Work Order → Job**: All work orders linked to their jobs
- **Work Order → Tasks**: Multiple tasks per work order (2-5 tasks each)
- **Task → Work Order**: Tasks reference their parent work order
- **Work Order → WBS**: Work orders linked to systems, areas, phases
- **Work Order → Users**: Work orders assigned to supervisors/managers
- **Task → Users**: Tasks assigned to field workers

## How to Explore the Data

### 1. **Work Order List View**
Navigate to: `/jobs/:jobId/work-orders`
- See all work orders for a job
- Filter by status, priority
- View task counts and progress
- See completion percentages

### 2. **Work Order Detail View**
Navigate to: `/work-orders/:id`
- View full work order details
- See all associated tasks
- View field notes
- Track time and costs
- Update status

### 3. **Task Views with Work Order Filter**
Navigate to: `/jobs/:jobId/tasks-enhanced`
- Filter tasks by work order
- See which tasks belong to which work orders
- Track progress at both work order and task levels

### 4. **Task Detail View**
Navigate to: `/tasks/:id`
- See work order information in sidebar
- Link to parent work order
- Understand task context within work order

## Data Statistics

- **Total Work Orders**: 16
- **Total Tasks**: 63
- **Average Tasks per Work Order**: ~4 tasks
- **Work Orders with Change Orders**: 2
- **Completed Work Orders**: 16 (all seeded as completed)
- **Tasks Status Distribution**:
  - Completed: Majority (based on work order status)
  - In Progress: Some (for in-progress work orders)
  - Not Started: Few (for draft/pending work orders)

## Business Value Demonstrated

### 1. **Client Reporting**
- Report progress by work order (client-facing)
- Track change orders separately
- Show work order status and completion

### 2. **Internal Operations**
- Break down work orders into manageable tasks
- Assign tasks to specific crews
- Track time and costs at task level
- Aggregate data back to work order level

### 3. **Financial Management**
- Track costs by work order for billing
- Identify change orders for additional billing
- Monitor work order profitability
- Compare estimated vs actual costs

### 4. **Project Management**
- Understand work order dependencies
- Track work order progress
- Identify bottlenecks
- Manage change orders effectively

## Next Steps

1. **Explore Work Orders**: Navigate to job work orders pages
2. **Filter Tasks**: Use work order filter in task views
3. **View Details**: Click on work orders to see associated tasks
4. **Create New Work Orders**: Use the create work order form
5. **Link Existing Tasks**: Add tasks to work orders via work order detail page

## Script Usage

To reseed the data:
```bash
node scripts/seed-work-orders-and-tasks.js
```

The script will:
- Skip existing work orders (won't duplicate)
- Create new work orders and tasks
- Link everything properly
- Assign users and WBS structures


