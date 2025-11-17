import React, { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { 
  ViewColumnsIcon,
  Squares2X2Icon,
  ChartBarIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline'
import { api } from '../services/api'
import toast from 'react-hot-toast'

const EnhancedTaskView = () => {
  const { jobId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const [tasks, setTasks] = useState([])
  const [sovComponents, setSovComponents] = useState({})
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState(searchParams.get('view') || 'card')
  const [groupBy, setGroupBy] = useState(searchParams.get('groupBy') || '')
  const [filters, setFilters] = useState({
    status: [],
    priority: [],
    systemId: [],
    areaId: [],
    phaseId: [],
    assignedTo: []
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const viewTypes = [
    { id: 'card', name: 'Card View', icon: Squares2X2Icon },
    { id: 'table', name: 'Table View', icon: ViewColumnsIcon },
    { id: 'gantt', name: 'Gantt View', icon: ChartBarIcon }
  ]

  const groupByOptions = [
    { value: '', label: 'No Grouping' },
    { value: 'system', label: 'By System' },
    { value: 'area', label: 'By Area' },
    { value: 'phase', label: 'By Phase' },
    { value: 'status', label: 'By Status' },
    { value: 'priority', label: 'By Priority' },
    { value: 'assignedTo', label: 'By Assignee' }
  ]

  useEffect(() => {
    if (jobId) {
      fetchData()
    }
  }, [jobId, view, groupBy, filters])

  useEffect(() => {
    // Update URL params
    const params = new URLSearchParams()
    if (view !== 'card') params.set('view', view)
    if (groupBy) params.set('groupBy', groupBy)
    setSearchParams(params)
  }, [view, groupBy, setSearchParams])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch SOV components and tasks in parallel
      const [sovResponse, tasksResponse] = await Promise.all([
        api.get(`/api/jobs/${jobId}/sov-components`),
        api.get(`/api/jobs/${jobId}/tasks-enhanced`, {
          params: {
            view,
            groupBy: groupBy || undefined,
            filterBy: Object.keys(filters).some(key => filters[key].length > 0) 
              ? JSON.stringify(filters) 
              : undefined
          }
        })
      ])

      setSovComponents(sovResponse.data.data)
      setTasks(tasksResponse.data.data)
    } catch (error) {
      toast.error('Failed to load task data')
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (filterType, value, checked) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: checked 
        ? [...prev[filterType], value]
        : prev[filterType].filter(v => v !== value)
    }))
  }

  const clearFilters = () => {
    setFilters({
      status: [],
      priority: [],
      systemId: [],
      areaId: [],
      phaseId: [],
      assignedTo: []
    })
  }

  const getStatusColor = (status) => {
    const colors = {
      'not_started': 'bg-gray-100 text-gray-800',
      'in_progress': 'bg-blue-100 text-blue-800',
      'completed': 'bg-green-100 text-green-800',
      'on_hold': 'bg-yellow-100 text-yellow-800',
      'cancelled': 'bg-red-100 text-red-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getPriorityColor = (priority) => {
    const colors = {
      'low': 'bg-green-100 text-green-800',
      'medium': 'bg-yellow-100 text-yellow-800',
      'high': 'bg-orange-100 text-orange-800',
      'critical': 'bg-red-100 text-red-800'
    }
    return colors[priority] || 'bg-gray-100 text-gray-800'
  }

  const renderCardView = () => {
    const displayTasks = Array.isArray(tasks) ? tasks : []
    
    if (groupBy && typeof tasks === 'object' && !Array.isArray(tasks)) {
      return (
        <div className="space-y-6">
          {Object.entries(tasks).map(([groupName, groupTasks]) => (
            <div key={groupName} className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">{groupName}</h3>
                <p className="text-sm text-gray-500">{groupTasks.length} tasks</p>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupTasks.map(renderTaskCard)}
              </div>
            </div>
          ))}
        </div>
      )
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayTasks.map(renderTaskCard)}
      </div>
    )
  }

  const renderTaskCard = (task) => (
    <div key={task._id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-900 line-clamp-2">{task.title}</h3>
        <div className="flex items-center space-x-2 ml-2">
          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(task.status)}`}>
            {task.status.replace('_', ' ')}
          </span>
          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(task.priority)}`}>
            {task.priority}
          </span>
        </div>
      </div>
      
      {task.description && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{task.description}</p>
      )}
      
      <div className="space-y-2 text-xs text-gray-500">
        {task.assignedTo && (
          <div className="flex items-center">
            <span className="font-medium">Assigned:</span>
            <span className="ml-1">{task.assignedTo.name}</span>
          </div>
        )}
        {task.dueDate && (
          <div className="flex items-center">
            <span className="font-medium">Due:</span>
            <span className="ml-1">{new Date(task.dueDate).toLocaleDateString()}</span>
          </div>
        )}
        {task.systemId && (
          <div className="flex items-center">
            <span className="font-medium">System:</span>
            <span className="ml-1">{task.systemId.code} - {task.systemId.name}</span>
          </div>
        )}
        {task.areaId && (
          <div className="flex items-center">
            <span className="font-medium">Area:</span>
            <span className="ml-1">{task.areaId.code} - {task.areaId.name}</span>
          </div>
        )}
      </div>
      
      {task.completionPercentage > 0 && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>Progress</span>
            <span>{task.completionPercentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full" 
              style={{ width: `${task.completionPercentage}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )

  const renderTableView = () => {
    const displayTasks = Array.isArray(tasks) ? tasks : []
    
    return (
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Task
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned To
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  System
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Area
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Progress
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {displayTasks.map((task) => (
                <tr key={task.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{task.title}</div>
                    <div className="text-sm text-gray-500">{task.costCode}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(task.status)}`}>
                      {task.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {typeof task.assignedTo === 'string' ? task.assignedTo : task.assignedTo?.name || 'Unassigned'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {task.system || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {task.area || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-900">{task.progress}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const renderGanttView = () => {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center py-12">
          <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Gantt View</h3>
          <p className="mt-1 text-sm text-gray-500">
            Gantt chart visualization will be implemented here
          </p>
          <p className="mt-2 text-xs text-gray-400">
            This would show tasks as timeline bars with dependencies, durations, and progress
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* Controls */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* View Toggle */}
            <div className="flex rounded-md shadow-sm">
              {viewTypes.map((viewType) => {
                const Icon = viewType.icon
                return (
                  <button
                    key={viewType.id}
                    onClick={() => setView(viewType.id)}
                    className={`${
                      view === viewType.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    } relative inline-flex items-center px-3 py-2 text-sm font-medium border border-gray-300 first:rounded-l-md last:rounded-r-md`}
                  >
                    <Icon className="h-4 w-4 mr-1" />
                    {viewType.name}
                  </button>
                )
              })}
            </div>

            {/* Group By */}
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              {groupByOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="relative">
              <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Filters */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <FunnelIcon className="h-4 w-4 mr-2" />
              Filters
            </button>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {/* Status Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Status</label>
                <div className="space-y-1">
                  {['not_started', 'in_progress', 'completed', 'on_hold'].map((status) => (
                    <label key={status} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.status.includes(status)}
                        onChange={(e) => handleFilterChange('status', status, e.target.checked)}
                        className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-xs text-gray-700">{status.replace('_', ' ')}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Priority Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Priority</label>
                <div className="space-y-1">
                  {['low', 'medium', 'high', 'critical'].map((priority) => (
                    <label key={priority} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.priority.includes(priority)}
                        onChange={(e) => handleFilterChange('priority', priority, e.target.checked)}
                        className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-xs text-gray-700">{priority}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* System Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">System</label>
                <div className="space-y-1 max-h-20 overflow-y-auto">
                  {sovComponents.systems?.map((system) => (
                    <label key={system._id} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.systemId.includes(system._id)}
                        onChange={(e) => handleFilterChange('systemId', system._id, e.target.checked)}
                        className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-xs text-gray-700">{system.code}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Area Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Area</label>
                <div className="space-y-1 max-h-20 overflow-y-auto">
                  {sovComponents.areas?.map((area) => (
                    <label key={area._id} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.areaId.includes(area._id)}
                        onChange={(e) => handleFilterChange('areaId', area._id, e.target.checked)}
                        className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-xs text-gray-700">{area.code}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Phase Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Phase</label>
                <div className="space-y-1 max-h-20 overflow-y-auto">
                  {sovComponents.phases?.map((phase) => (
                    <label key={phase._id} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.phaseId.includes(phase._id)}
                        onChange={(e) => handleFilterChange('phaseId', phase._id, e.target.checked)}
                        className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-xs text-gray-700">{phase.code}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Clear Filters */}
              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="text-xs text-blue-600 hover:text-blue-500"
                >
                  Clear all filters
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div>
        {view === 'card' && renderCardView()}
        {view === 'table' && renderTableView()}
        {view === 'gantt' && renderGanttView()}
      </div>
    </div>
  )
}

export default EnhancedTaskView
