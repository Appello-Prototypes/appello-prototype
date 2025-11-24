# Configurable Dashboard System

## Overview

Appello Lab now features a powerful, configurable dashboard system that allows you to:
- Create multiple custom dashboards
- Drag and drop widgets to arrange them
- Resize widgets to fit your needs
- Save and switch between different dashboards
- Use pre-built widgets for common metrics

## Features

### Grid System
- **12-column grid** for flexible layouts
- Widgets can span: **Full width (12 cols)**, **1/2 width (6 cols)**, **1/3 width (4 cols)**, **1/4 width (3 cols)**, or any custom width
- **Drag and drop** to rearrange widgets
- **Resize handles** to adjust widget dimensions
- **Auto-compact** layout to prevent gaps

### Available Widgets

1. **Task Statistics** (`taskStats`)
   - Display task counts (total, completed, in progress, overdue, due today, high priority)
   - Configurable: Choose which stat to display
   - Default size: 2x2

2. **Job Performance** (`jobPerformance`)
   - Show job performance metrics including CPI and progress
   - Two display modes: Summary or detailed table
   - Default size: 4x3

3. **Time Tracking** (`timeTracking`)
   - Display time entry summaries or recent entries
   - Shows total hours, weekly hours, and costs
   - Default size: 3x3

4. **Projects** (`projects`)
   - List active projects with progress bars
   - Configurable number of items to display
   - Default size: 3x4

5. **My Tasks** (`myTasks`)
   - Display your personal tasks
   - Filterable by status (in_progress, completed, etc.)
   - Default size: 3x4

6. **Completion Rate** (`completionRate`)
   - Show overall task completion percentage
   - Visual progress bar
   - Default size: 2x2

## Usage

### Creating a Dashboard

1. Click **"New Dashboard"** button
2. Enter a name for your dashboard
3. Click **"Create"**

### Editing a Dashboard

1. Select a dashboard from the list
2. Click **"Edit Dashboard"** button
3. Use **"Add Widget"** to add new widgets
4. **Drag widgets** to rearrange them
5. **Resize widgets** using the corner handle
6. Click **"Save"** when done

### Managing Dashboards

- **Set Default**: Click the star icon to set a dashboard as default
- **Delete**: Click the trash icon to delete a dashboard (requires at least one dashboard to remain)
- **Switch**: Click on any dashboard in the list to view it

### Widget Configuration

Each widget has configurable options:
- **Task Stats**: Choose which statistic to display
- **Job Performance**: Choose summary or table view, set max items
- **Time Tracking**: Choose summary or recent entries view
- **Projects**: Set max items to display, toggle progress bars
- **My Tasks**: Filter by status, set max items

## Storage

- Dashboards are saved to **localStorage** (browser storage)
- Each dashboard configuration includes:
  - Dashboard name and metadata
  - Widget layout (position, size, type)
  - Widget-specific configuration
- Default dashboard is automatically loaded on page load

## Grid Layout Details

The grid system uses a **12-column layout**:
- **Full width**: 12 columns (w: 12)
- **Half width**: 6 columns (w: 6)
- **Third width**: 4 columns (w: 4)
- **Quarter width**: 3 columns (w: 3)
- **Custom widths**: Any value from 1-12

Widget height is measured in **grid units** (each unit = 60px):
- Small widgets: 2 units (h: 2) = 120px
- Medium widgets: 3 units (h: 3) = 180px
- Large widgets: 4 units (h: 4) = 240px

## Technical Details

### Components

- **DashboardManager**: Main component that manages dashboard list and switching
- **DashboardEditor**: Editor interface with drag-and-drop
- **DashboardViewer**: Read-only dashboard display
- **Widget**: Base widget component
- **Widget Components**: Individual widget implementations

### Storage Service

- `dashboardStorage.js`: Handles saving/loading dashboard configurations
- Uses localStorage for persistence
- Functions: `getAllDashboards()`, `saveDashboard()`, `deleteDashboard()`, `getDefaultDashboardId()`

### Grid Library

- Uses `react-grid-layout` for drag-and-drop functionality
- Responsive grid system with 12 columns
- Supports both drag and resize operations

## Best Practices

1. **Organize by Purpose**: Create separate dashboards for different roles (Executive, Project Manager, Field Worker)
2. **Use Appropriate Sizes**: Larger widgets for important metrics, smaller for quick glances
3. **Group Related Metrics**: Place related widgets near each other
4. **Set a Default**: Mark your most-used dashboard as default
5. **Regular Updates**: Update dashboard layouts as your needs change

## Future Enhancements

Potential future features:
- Widget configuration modal for advanced settings
- Export/import dashboard configurations
- Share dashboards with team members
- Custom widget creation
- Widget refresh intervals
- Dashboard templates

