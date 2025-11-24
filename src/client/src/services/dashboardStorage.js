/**
 * Dashboard Storage Service
 * Handles saving and loading dashboard configurations
 */

const STORAGE_KEY = 'appello_dashboards'
const DEFAULT_DASHBOARD_KEY = 'appello_default_dashboard'

/**
 * Get all saved dashboards
 */
export function getAllDashboards() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []
    return JSON.parse(stored)
  } catch (error) {
    console.error('Error loading dashboards:', error)
    return []
  }
}

/**
 * Get a specific dashboard by ID
 */
export function getDashboard(id) {
  const dashboards = getAllDashboards()
  return dashboards.find(d => d.id === id)
}

/**
 * Save a dashboard configuration
 */
export function saveDashboard(dashboard) {
  try {
    const dashboards = getAllDashboards()
    const existingIndex = dashboards.findIndex(d => d.id === dashboard.id)
    
    if (existingIndex >= 0) {
      dashboards[existingIndex] = dashboard
    } else {
      dashboards.push(dashboard)
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dashboards))
    return true
  } catch (error) {
    console.error('Error saving dashboard:', error)
    return false
  }
}

/**
 * Delete a dashboard
 */
export function deleteDashboard(id) {
  try {
    const dashboards = getAllDashboards()
    const filtered = dashboards.filter(d => d.id !== id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
    return true
  } catch (error) {
    console.error('Error deleting dashboard:', error)
    return false
  }
}

/**
 * Get the default dashboard ID
 */
export function getDefaultDashboardId() {
  return localStorage.getItem(DEFAULT_DASHBOARD_KEY) || null
}

/**
 * Set the default dashboard ID
 */
export function setDefaultDashboardId(id) {
  localStorage.setItem(DEFAULT_DASHBOARD_KEY, id)
}

/**
 * Create a new dashboard with default configuration
 */
export function createDefaultDashboard(name = 'My Dashboard') {
  const id = `dashboard_${Date.now()}`
  const dashboard = {
    id,
    name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    layout: [],
    config: {
      columns: 12, // Grid columns
    },
  }
  saveDashboard(dashboard)
  return dashboard
}

/**
 * Generate a unique widget ID
 */
export function generateWidgetId() {
  return `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Create a master dashboard with all widgets organized logically
 */
export function createMasterDashboard() {
  const id = 'master_dashboard'
  
  // Helper to create widget
  const createWidget = (type, x, y, w, h, config = {}) => {
    return {
      i: generateWidgetId(),
      x,
      y,
      w,
      h,
      type,
      config,
    }
  }

  let yPos = 0
  
  const layout = [
    // ============================================
    // COMPREHENSIVE JOB PERFORMANCE TABLE
    // ============================================
    // Single comprehensive table widget showing all key metrics
    createWidget('jobPerformanceTable', 0, yPos, 12, 8, { filterStatus: 'all' }),
    yPos += 8,
    
    // ============================================
    // PORTFOLIO OVERVIEW
    // ============================================
    createWidget('portfolioPerformance', 0, yPos, 6, 6, {}),
    
    // ============================================
    // TASK MANAGEMENT
    // ============================================
    createWidget('taskStats', 6, yPos, 2, 2, { statType: 'totalTasks' }),
    createWidget('taskStats', 8, yPos, 2, 2, { statType: 'completedTasks' }),
    createWidget('taskStats', 10, yPos, 2, 2, { statType: 'overdueTasks' }),
    yPos += 2,
    
    createWidget('completionRate', 6, yPos, 2, 2, {}),
    createWidget('myTasks', 8, yPos, 4, 6, { status: 'in_progress', maxItems: 5 }),
    yPos += 2,
    
    // ============================================
    // TIME TRACKING & PROJECTS
    // ============================================
    createWidget('timeTracking', 0, yPos, 6, 4, { displayType: 'summary' }),
    createWidget('projects', 6, yPos, 6, 4, { maxItems: 3, showProgress: true }),
    yPos += 4,
  ]

  const dashboard = {
    id,
    name: 'Master Dashboard - All Widgets',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    layout,
    config: {
      columns: 12,
      isMaster: true, // Flag to identify master dashboard
    },
  }
  
  saveDashboard(dashboard)
  return dashboard
}

/**
 * Clear all dashboards (useful for resetting corrupted data)
 */
export function clearAllDashboards() {
  try {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(DEFAULT_DASHBOARD_KEY)
    return true
  } catch (error) {
    console.error('Error clearing dashboards:', error)
    return false
  }
}

