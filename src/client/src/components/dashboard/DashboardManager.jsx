import React, { useState, useEffect } from 'react'
import { 
  getAllDashboards, 
  getDashboard, 
  saveDashboard, 
  deleteDashboard,
  getDefaultDashboardId,
  setDefaultDashboardId,
  createDefaultDashboard,
  createMasterDashboard,
} from '../../services/dashboardStorage'
import { WIDGET_TYPES } from './widgets'
import DashboardEditor from './DashboardEditor'
import DashboardViewer from './DashboardViewer'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  StarIcon,
} from '@heroicons/react/24/outline'
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid'

export default function DashboardManager() {
  const [dashboards, setDashboards] = useState([])
  const [currentDashboard, setCurrentDashboard] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [defaultId, setDefaultId] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newDashboardName, setNewDashboardName] = useState('')

  useEffect(() => {
    loadDashboards()
    ensureMasterDashboard()
  }, [])

  const ensureMasterDashboard = () => {
    const dashboards = getAllDashboards()
    const masterDashboard = dashboards.find(d => d.id === 'master_dashboard' || d.config?.isMaster)
    
    if (!masterDashboard) {
      createMasterDashboard()
    }
  }

  const loadDashboards = () => {
    const allDashboards = getAllDashboards()
    const defaultDashboardId = getDefaultDashboardId()
    
    // Check if we have corrupted dashboards (widgets without types)
    const hasCorruptedDashboards = allDashboards.some(dashboard => 
      dashboard.layout?.some(item => !item.type)
    )
    
    // Migrate dashboards: ensure all layout items have a type property
    const migratedDashboards = allDashboards.map(dashboard => {
      if (!dashboard.layout || !Array.isArray(dashboard.layout)) {
        return { ...dashboard, layout: [] }
      }
      
      const migratedLayout = dashboard.layout
        .map(item => {
          // If item doesn't have a type, it's invalid - remove it
          if (!item.type) {
            console.warn('Removing widget without type:', item)
            return null
          }
          return item
        })
        .filter(Boolean) // Remove null items
      
      if (migratedLayout.length !== dashboard.layout.length) {
        // Layout was modified, save the migrated version
        const migratedDashboard = {
          ...dashboard,
          layout: migratedLayout,
          updatedAt: new Date().toISOString(),
        }
        saveDashboard(migratedDashboard)
        return migratedDashboard
      }
      
      return dashboard
    })
    
    setDashboards(migratedDashboards)
    setDefaultId(defaultDashboardId)
    
    // Load default dashboard or first dashboard
    let dashboardToLoad = null
    
    if (defaultDashboardId) {
      dashboardToLoad = migratedDashboards.find(d => d.id === defaultDashboardId)
    }
    
    if (!dashboardToLoad && migratedDashboards.length > 0) {
      dashboardToLoad = migratedDashboards[0]
      setDefaultDashboardId(dashboardToLoad.id)
    }
    
    // If no valid dashboard exists or all are empty, create a default one
    if (!dashboardToLoad || (dashboardToLoad.layout && dashboardToLoad.layout.length === 0 && hasCorruptedDashboards)) {
      // Create a default dashboard with some widgets
      const defaultDashboard = createDefaultDashboard('Default Dashboard')
      const defaultLayout = [
        { i: 'widget_1', x: 0, y: 0, w: 2, h: 2, type: 'taskStats', config: { statType: 'totalTasks' } },
        { i: 'widget_2', x: 2, y: 0, w: 2, h: 2, type: 'completionRate', config: {} },
        { i: 'widget_3', x: 4, y: 0, w: 4, h: 3, type: 'jobPerformance', config: { displayType: 'summary' } },
        { i: 'widget_4', x: 8, y: 0, w: 3, h: 3, type: 'timeTracking', config: { displayType: 'summary' } },
        { i: 'widget_5', x: 0, y: 2, w: 3, h: 4, type: 'projects', config: { maxItems: 3 } },
        { i: 'widget_6', x: 3, y: 2, w: 3, h: 4, type: 'myTasks', config: { status: 'in_progress' } },
      ]
      defaultDashboard.layout = defaultLayout
      saveDashboard(defaultDashboard)
      setCurrentDashboard(defaultDashboard)
      setDefaultDashboardId(defaultDashboard.id)
      setDashboards([defaultDashboard])
    } else if (dashboardToLoad) {
      setCurrentDashboard(dashboardToLoad)
    }
  }

  const handleSave = (dashboard) => {
    saveDashboard(dashboard)
    setCurrentDashboard(dashboard)
    setIsEditing(false)
    loadDashboards()
  }

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this dashboard?')) {
      deleteDashboard(id)
      loadDashboards()
      
      if (currentDashboard?.id === id) {
        const remaining = dashboards.filter(d => d.id !== id)
        if (remaining.length > 0) {
          setCurrentDashboard(remaining[0])
          setDefaultDashboardId(remaining[0].id)
        } else {
          setCurrentDashboard(null)
        }
      }
    }
  }

  const handleSetDefault = (id) => {
    setDefaultDashboardId(id)
    setDefaultId(id)
    const dashboard = getDashboard(id)
    if (dashboard) {
      setCurrentDashboard(dashboard)
    }
  }

  const handleCreateDashboard = () => {
    if (!newDashboardName.trim()) return
    
    const newDashboard = createDefaultDashboard(newDashboardName.trim())
    saveDashboard(newDashboard)
    setCurrentDashboard(newDashboard)
    setDefaultDashboardId(newDashboard.id)
    setNewDashboardName('')
    setShowCreateModal(false)
    loadDashboards()
  }

  const handleSelectDashboard = (dashboard) => {
    setCurrentDashboard(dashboard)
    setIsEditing(false)
  }

  return (
    <div className="space-y-4">
      {/* Dashboard Selector */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">Dashboards</h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            New Dashboard
          </button>
        </div>

        {/* Dashboard List */}
        <div className="space-y-2">
          {/* Master Dashboard Button */}
          <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="font-semibold text-gray-900 flex items-center">
                  <span className="mr-2">📊</span>
                  Master Dashboard - Widget Reference
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  Complete reference dashboard with all {Object.keys(WIDGET_TYPES).length} widgets organized by functional area
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    const master = dashboards.find(d => d.id === 'master_dashboard' || d.config?.isMaster)
                    if (master) {
                      handleSelectDashboard(master)
                    } else {
                      const newMaster = createMasterDashboard()
                      handleSelectDashboard(newMaster)
                      loadDashboards()
                    }
                  }}
                  className="btn-primary text-sm"
                >
                  Open Master Dashboard
                </button>
                <button
                  onClick={() => {
                    if (window.confirm('This will recreate the Master Dashboard with all widgets. Continue?')) {
                      const newMaster = createMasterDashboard()
                      handleSelectDashboard(newMaster)
                      loadDashboards()
                    }
                  }}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  title="Refresh Master Dashboard"
                >
                  Refresh
                </button>
              </div>
            </div>
          </div>
          
          {dashboards.map((dashboard) => (
            <div
              key={dashboard.id}
              className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                currentDashboard?.id === dashboard.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => handleSelectDashboard(dashboard)}
            >
              <div className="flex items-center flex-1">
                <div className="flex-1">
                  <div className="font-medium text-gray-900 flex items-center">
                    {(dashboard.id === 'master_dashboard' || dashboard.config?.isMaster) && (
                      <span className="mr-2">📊</span>
                    )}
                    {dashboard.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {dashboard.layout?.length || 0} widgets • Updated {new Date(dashboard.updatedAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleSetDefault(dashboard.id)
                  }}
                  className="text-gray-400 hover:text-yellow-500"
                  title="Set as default"
                >
                  {defaultId === dashboard.id ? (
                    <StarSolidIcon className="h-5 w-5 text-yellow-500" />
                  ) : (
                    <StarIcon className="h-5 w-5" />
                  )}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setCurrentDashboard(dashboard)
                    setIsEditing(true)
                  }}
                  className="text-gray-400 hover:text-blue-600"
                  title="Edit dashboard"
                >
                  <PencilIcon className="h-5 w-5" />
                </button>
                {(dashboards.length > 1 && dashboard.id !== 'master_dashboard' && !dashboard.config?.isMaster) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(dashboard.id)
                    }}
                    className="text-gray-400 hover:text-red-600"
                    title="Delete dashboard"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                )}
                {(dashboard.id === 'master_dashboard' || dashboard.config?.isMaster) && (
                  <span className="text-xs text-blue-600 font-medium px-2 py-1 bg-blue-50 rounded">
                    Master
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Dashboard Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Dashboard</h3>
            <input
              type="text"
              value={newDashboardName}
              onChange={(e) => setNewDashboardName(e.target.value)}
              placeholder="Dashboard name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md mb-4"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleCreateDashboard()
                }
              }}
              autoFocus
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setNewDashboardName('')
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateDashboard}
                className="btn-primary"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard Content */}
      {currentDashboard && (
        <div>
          {isEditing ? (
            <DashboardEditor
              dashboard={currentDashboard}
              onSave={handleSave}
              onCancel={() => setIsEditing(false)}
              onDelete={handleDelete}
            />
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{currentDashboard.name}</h1>
                  <p className="text-sm text-gray-500">
                    {currentDashboard.layout?.length || 0} widgets
                  </p>
                </div>
                <button
                  onClick={() => setIsEditing(true)}
                  className="btn-primary flex items-center"
                >
                  <PencilIcon className="h-4 w-4 mr-2" />
                  Edit Dashboard
                </button>
              </div>
              <DashboardViewer dashboard={currentDashboard} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

