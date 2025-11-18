# Work Order System Implementation

## Overview

A comprehensive work order management system designed for ICI (Industrial, Commercial, Institutional) subcontractors, integrated with the existing task management system.

## Architecture Decision: One Work Order → Many Tasks

**Recommended Pattern:** One Work Order → Many Tasks

### Rationale:
- **Work Orders** are issued by clients/general contractors and contain:
  - Scope of work
  - Drawings and specifications
  - Client requirements
  - Change orders
  
- **Tasks** are internal breakdowns that:
  - Assign work to specific crews/foremen
  - Track progress at a granular level
  - Enable time tracking and cost code assignment
  - Support field operations

### Benefits:
- Track progress by work order for client reporting
- Bill/invoice by work order
- Manage change orders effectively
- Break down complex work orders into manageable tasks
- Maintain flexibility (tasks can exist without work orders)

## Database Schema

### WorkOrder Model
- **workOrderNumber**: Unique identifier (auto-generated)
- **jobId**: Required - links to Job
- **projectId**: Optional - links to Project
- **title**, **description**: Work order details
- **issuedBy**: Client/GC information
- **status**: draft, pending, issued, acknowledged, in_progress, completed, closed, cancelled
- **priority**: low, medium, high, critical
- **systemId**, **areaId**, **phaseId**: Work breakdown structure
- **costCodes**: Array of cost codes with estimates
- **drawings**: Array of drawing references
- **estimatedHours**, **actualHours**: Time tracking
- **estimatedCost**, **actualCost**: Financial tracking
- **isChangeOrder**: Boolean flag for change orders
- **fieldNotes**: Array of field notes/comments
- **attachments**: File attachments

### Task Model Updates
- **workOrderId**: Optional reference to WorkOrder
- **workOrderNumber**: Legacy field (kept for backward compatibility)

## API Endpoints

### Work Orders
- `GET /api/work-orders` - List work orders with filters
- `GET /api/work-orders/:id` - Get single work order
- `POST /api/work-orders` - Create work order
- `PUT /api/work-orders/:id` - Update work order
- `DELETE /api/work-orders/:id` - Delete work order

### Work Order Tasks
- `GET /api/work-orders/:id/tasks` - Get tasks for work order
- `POST /api/work-orders/:id/add-task` - Add task to work order
- `POST /api/work-orders/:id/remove-task` - Remove task from work order

### Work Order Actions
- `POST /api/work-orders/:id/update-status` - Update status
- `POST /api/work-orders/:id/add-field-note` - Add field note

## Frontend Pages

1. **WorkOrderList** (`/jobs/:jobId/work-orders`)
   - List all work orders for a job
   - Filter by status, priority, assignedTo
   - Search by work order number, title
   - Show task counts and progress

2. **WorkOrderDetail** (`/work-orders/:id`)
   - Full work order details
   - Associated tasks list
   - Field notes
   - Attachments
   - Status updates

3. **CreateWorkOrder** (`/work-orders/create?jobId=:jobId`)
   - Create new work order
   - Link to job
   - Set scope, drawings, cost codes
   - Optionally create tasks

## Integration Points

### Task System
- Tasks can be created independently or linked to work orders
- Task list views can filter by work order
- Task detail page shows work order information
- Work order detail shows all associated tasks

### Job System
- Work orders belong to jobs
- Job detail page shows work order summary
- Work orders inherit job's cost codes, systems, areas, phases

### Progress Reporting
- Work order progress calculated from task completion
- Aggregated hours and costs from tasks
- Status updates cascade to tasks (optional)

## Usage Examples

### Creating a Work Order with Tasks
1. Create work order from client/GC requirements
2. Add scope, drawings, specifications
3. Assign cost codes and estimates
4. Create tasks to break down the work
5. Assign tasks to crews/foremen

### Managing Work Orders
1. View work order list by job
2. Filter by status (pending, in progress, completed)
3. Track progress through associated tasks
4. Add field notes as work progresses
5. Update status as work order progresses

### Change Orders
1. Create new work order with `isChangeOrder: true`
2. Link to original work order via `originalWorkOrderId`
3. Create tasks for change order work
4. Track separately for billing

## Best Practices

1. **Work Order Creation**
   - Always link to a job
   - Include detailed scope and specifications
   - Set realistic due dates
   - Assign appropriate priority

2. **Task Management**
   - Break work orders into logical tasks
   - Assign tasks to appropriate crews
   - Use cost codes consistently
   - Track progress regularly

3. **Status Management**
   - Update work order status as work progresses
   - Use field notes for important updates
   - Complete work orders when all tasks are done

4. **Reporting**
   - Use work orders for client reporting
   - Use tasks for internal progress tracking
   - Aggregate data at work order level for billing

## Future Enhancements

- Work order templates
- Automated task generation from work orders
- Work order approval workflows
- Integration with billing/invoicing
- Work order printing/PDF generation
- Mobile field access for work orders

