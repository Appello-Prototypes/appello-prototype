import React, { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import {
  ArrowLeftIcon,
  ClockIcon,
  UserIcon,
  BuildingOffice2Icon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  PencilIcon,
  CheckCircleIcon,
  XMarkIcon,
  PlayIcon,
  PauseIcon
} from '@heroicons/react/24/outline'
import { api } from '../services/api'

export default function TaskDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [showProgressUpdate, setShowProgressUpdate] = useState(false)

  const { data: task, isLoading, error } = useQuery({
    queryKey: ['task', id],
    queryFn: () => api.get(`/api/tasks/${id}`).then(res => res.data.data),
    enabled: !!id
  })

  const { data: project } = useQuery({
    queryKey: ['project', task?.projectId],
    queryFn: () => api.get(`/api/projects/${task.projectId}`).then(res => res.data.data),
    enabled: !!task?.projectId
  })

  const { data: workOrder } = useQuery({
    queryKey: ['work-order', task?.workOrderId],
    queryFn: () => api.get(`/api/work-orders/${task.workOrderId}`).then(res => res.data.data),
    enabled: !!task?.workOrderId
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  const updateTaskMutation = useMutation({
    mutationFn: (data) => api.put(`/api/tasks/${id}`, data),
    onSuccess: () => {
      toast.success('Task updated successfully!')
      queryClient.invalidateQueries(['task', id])
      queryClient.invalidateQueries(['tasks'])
      setIsEditing(false)
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update task')
    }
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ status, completionPercentage }) => 
      api.put(`/api/tasks/${id}/status`, { status, completionPercentage }),
    onSuccess: () => {
      toast.success('Status updated successfully!')
      queryClient.invalidateQueries(['task', id])
      queryClient.invalidateQueries(['tasks'])
      setShowProgressUpdate(false)
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update status')
    }
  })

  const deleteTaskMutation = useMutation({
    mutationFn: () => api.delete(`/api/tasks/${id}`),
    onSuccess: () => {
      toast.success('Task deleted successfully!')
      navigate('/tasks')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete task')
    }
  })

  React.useEffect(() => {
    if (task && isEditing) {
      reset({
        ...task,
        dueDate: task.dueDate ? format(new Date(task.dueDate), "yyyy-MM-dd'T'HH:mm") : '',
        startDate: task.startDate ? format(new Date(task.startDate), "yyyy-MM-dd'T'HH:mm") : '',
        tags: task.tags?.join(', ') || ''
      })
    }
  }, [task, isEditing, reset])

  const onSubmit = (data) => {
    // Process tags
    if (typeof data.tags === 'string') {
      data.tags = data.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
    }
    updateTaskMutation.mutate(data)
  }

  const handleStatusChange = (status) => {
    if (status === 'completed') {
      updateStatusMutation.mutate({ status, completionPercentage: 100 })
    } else if (status === 'in_progress') {
      setShowProgressUpdate(true)
    } else {
      updateStatusMutation.mutate({ status, completionPercentage: task.completionPercentage })
    }
  }

  const handleProgressSubmit = (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    const completionPercentage = parseInt(formData.get('completionPercentage'))
    const unitsInstalled = parseFloat(formData.get('unitsInstalled'))
    
    const updateData = {
      status: 'in_progress',
      completionPercentage
    }
    
    if (unitsInstalled !== undefined && !isNaN(unitsInstalled)) {
      updateData.unitsInstalled = unitsInstalled
    }
    
    updateStatusMutation.mutate(updateData)
  }

  const getStatusColor = (status) => {
    const colors = {
      not_started: 'bg-gray-100 text-gray-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      on_hold: 'bg-yellow-100 text-yellow-800',
      cancelled: 'bg-red-100 text-red-800'
    }
    return colors[status] || colors.not_started
  }

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800'
    }
    return colors[priority] || colors.medium
  }

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="card p-6 space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (error || !task) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900">Task not found</h3>
        <button onClick={() => navigate(-1)} className="mt-4 btn-primary">
          Go Back
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{task.title}</h1>
            <p className="text-sm text-gray-500">
              {task.workOrderNumber && `Work Order: ${task.workOrderNumber} • `}
              Created {format(new Date(task.createdAt), 'MMM d, yyyy')}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <span className={`badge ${getStatusColor(task.status)}`}>
            {task.status.replace('_', ' ').toUpperCase()}
          </span>
          <span className={`badge ${getPriorityColor(task.priority)}`}>
            {task.priority.toUpperCase()}
          </span>
          
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="btn-secondary"
          >
            <PencilIcon className="h-4 w-4 mr-2" />
            {isEditing ? 'Cancel Edit' : 'Edit'}
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center space-x-3">
        {task.status === 'not_started' && (
          <button
            onClick={() => handleStatusChange('in_progress')}
            className="btn-primary"
            disabled={updateStatusMutation.isLoading}
          >
            <PlayIcon className="h-4 w-4 mr-2" />
            Start Task
          </button>
        )}
        
        {task.status === 'in_progress' && (
          <>
            <button
              onClick={() => setShowProgressUpdate(true)}
              className="btn-primary"
            >
              <ClockIcon className="h-4 w-4 mr-2" />
              Update Progress
            </button>
            <button
              onClick={() => handleStatusChange('completed')}
              className="btn-success"
              disabled={updateStatusMutation.isLoading}
            >
              <CheckCircleIcon className="h-4 w-4 mr-2" />
              Mark Complete
            </button>
            <button
              onClick={() => handleStatusChange('on_hold')}
              className="btn-secondary"
              disabled={updateStatusMutation.isLoading}
            >
              <PauseIcon className="h-4 w-4 mr-2" />
              Put On Hold
            </button>
          </>
        )}
        
        {(task.status === 'completed' || task.status === 'on_hold') && (
          <button
            onClick={() => handleStatusChange('in_progress')}
            className="btn-primary"
            disabled={updateStatusMutation.isLoading}
          >
            <PlayIcon className="h-4 w-4 mr-2" />
            Resume Task
          </button>
        )}
      </div>

      {/* Progress Update Modal */}
      {showProgressUpdate && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Update Progress</h3>
            <form onSubmit={handleProgressSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Completion Percentage
                </label>
                <input
                  name="completionPercentage"
                  type="number"
                  min="0"
                  max="100"
                  defaultValue={task.completionPercentage}
                  className="form-input"
                  required
                />
              </div>
              
              {task.unitsToInstall?.quantity && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Units Installed ({task.unitsToInstall.unit})
                  </label>
                  <input
                    name="unitsInstalled"
                    type="number"
                    step="0.1"
                    min="0"
                    max={task.unitsToInstall.quantity}
                    defaultValue={task.unitsInstalled || 0}
                    className="form-input"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Total: {task.unitsToInstall.quantity} {task.unitsToInstall.unit}
                  </p>
                </div>
              )}
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowProgressUpdate(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={updateStatusMutation.isLoading}
                >
                  Update Progress
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Task Information */}
          {isEditing ? (
            <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Edit Task</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  {...register('title', { required: 'Title is required' })}
                  className="form-input"
                />
                {errors.title && <p className="text-sm text-red-600">{errors.title.message}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  {...register('description')}
                  rows={4}
                  className="form-textarea"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select {...register('priority')} className="form-select">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Hours</label>
                  <input
                    {...register('estimatedHours')}
                    type="number"
                    step="0.5"
                    className="form-input"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                <input
                  {...register('tags')}
                  className="form-input"
                  placeholder="Comma-separated tags"
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={updateTaskMutation.isLoading}
                >
                  Save Changes
                </button>
              </div>
            </form>
          ) : (
            <div className="card p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Task Information</h3>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700">Description</h4>
                  <p className="mt-1 text-gray-900">
                    {task.description || 'No description provided'}
                  </p>
                </div>
                
                {task.tags && task.tags.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Tags</h4>
                    <div className="flex flex-wrap gap-2">
                      {task.tags.map((tag, index) => (
                        <span key={index} className="badge badge-gray">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Progress Tracking */}
          <div className="card p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Progress Tracking</h3>
            
            <div className="space-y-6">
              {/* Progress Bar */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Completion</span>
                  <span className="text-lg font-bold text-gray-900">{task.completionPercentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div
                    className="bg-blue-600 h-4 rounded-full transition-all duration-500"
                    style={{ width: `${task.completionPercentage}%` }}
                  ></div>
                </div>
              </div>
              
              {/* Units Progress */}
              {task.unitsToInstall?.quantity && (
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">
                      {task.unitsInstalled || 0}
                    </div>
                    <div className="text-sm text-gray-500">Installed</div>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {task.unitsToInstall.quantity}
                    </div>
                    <div className="text-sm text-gray-500">Total Required</div>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {task.unitsToInstall.quantity - (task.unitsInstalled || 0)}
                    </div>
                    <div className="text-sm text-gray-500">Remaining</div>
                  </div>
                </div>
              )}
              
              {task.unitsToInstall?.description && (
                <div className="text-center text-sm text-gray-600">
                  <span className="font-medium">{task.unitsToInstall.unit}:</span> {task.unitsToInstall.description}
                </div>
              )}
            </div>
          </div>

          {/* Time Tracking */}
          <div className="card p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Time Tracking</h3>
            
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Estimated Hours</span>
                  <span className="text-lg font-bold text-gray-900">{task.estimatedHours || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Actual Hours</span>
                  <span className="text-lg font-bold text-blue-600">
                    {task.actualHours ? parseFloat(task.actualHours.toFixed(2)) : 0}
                  </span>
                </div>
                {task.estimatedHours && (
                  <div className="mt-2 text-sm">
                    <span className={`font-medium ${
                      (task.actualHours || 0) <= task.estimatedHours ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {(task.actualHours || 0) <= task.estimatedHours ? 'On Budget' : 'Over Budget'} 
                      ({parseFloat((task.estimatedHours - (task.actualHours || 0)).toFixed(2))} hrs variance)
                    </span>
                  </div>
                )}
              </div>
              
              <div>
                <Link 
                  to={`/time-entry?taskId=${task._id}`}
                  className="w-full btn-primary block text-center"
                >
                  <ClockIcon className="h-4 w-4 mr-2 inline" />
                  Log Time Entry
                </Link>
                <p className="mt-2 text-xs text-gray-500 text-center">
                  Cost Code: {task.costCode}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Assignment & Dates */}
          <div className="card p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Details</h3>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <UserIcon className="h-5 w-5 text-gray-400" />
                <div>
                  <div className="text-sm font-medium text-gray-700">Assigned To</div>
                  <div className="text-gray-900">{task.assignedTo?.name}</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <BuildingOffice2Icon className="h-5 w-5 text-gray-400" />
                <div>
                  <div className="text-sm font-medium text-gray-700">Project</div>
                  <div className="text-gray-900">{project?.name || 'Loading...'}</div>
                  <div className="text-xs text-gray-500">{project?.projectNumber}</div>
                </div>
              </div>
              
              {task.dueDate && (
                <div className="flex items-center space-x-3">
                  <ClockIcon className="h-5 w-5 text-gray-400" />
                  <div>
                    <div className="text-sm font-medium text-gray-700">Due Date</div>
                    <div className="text-gray-900">
                      {format(new Date(task.dueDate), 'MMM d, yyyy h:mm a')}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ICI Contractor Details */}
          <div className="card p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Work Breakdown</h3>
            
            <div className="space-y-3 text-sm">
              {task.costCode && (
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Cost Code:</span>
                  <span className="text-gray-900">{task.costCode}</span>
                </div>
              )}
              
              {task.craft && (
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Craft:</span>
                  <span className="text-gray-900 capitalize">{task.craft}</span>
                </div>
              )}
              
              {task.category && (
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Category:</span>
                  <span className="text-gray-900 capitalize">{task.category.replace('_', ' ')}</span>
                </div>
              )}
              
              {project && (
                <>
                  {task.systemId && (
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">System:</span>
                      <span className="text-gray-900">
                        {typeof task.systemId === 'object' && task.systemId?.name 
                          ? task.systemId.name 
                          : project.systems?.find(s => String(s._id) === String(task.systemId))?.name || 'N/A'}
                      </span>
                    </div>
                  )}
                  
                  {task.areaId && (
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">Area:</span>
                      <span className="text-gray-900">
                        {typeof task.areaId === 'object' && task.areaId?.name 
                          ? task.areaId.name 
                          : project.areas?.find(a => String(a._id) === String(task.areaId))?.name || 'N/A'}
                      </span>
                    </div>
                  )}
                  
                  {task.phaseId && (
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">Phase:</span>
                      <span className="text-gray-900">
                        {typeof task.phaseId === 'object' && task.phaseId?.name 
                          ? task.phaseId.name 
                          : project.phases?.find(p => String(p._id) === String(task.phaseId))?.name || 'N/A'}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Work Order Information */}
          {workOrder && (
            <div className="card p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Work Order</h3>
              
              <div className="space-y-3">
                <Link
                  to={`/work-orders/${workOrder._id}`}
                  className="block p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{workOrder.workOrderNumber}</div>
                      <div className="text-sm text-gray-600 mt-1">{workOrder.title}</div>
                    </div>
                    <DocumentTextIcon className="h-5 w-5 text-gray-400" />
                  </div>
                </Link>
                {workOrder.status && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">Status:</span>
                    <span className={`badge ${
                      workOrder.status === 'completed' ? 'bg-green-100 text-green-800' :
                      workOrder.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {workOrder.status.replace('_', ' ')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="card p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Actions</h3>
            
            <div className="space-y-3">
              {workOrder ? (
                <Link
                  to={`/work-orders/${workOrder._id}`}
                  className="w-full btn-secondary text-left flex items-center"
                >
                  <DocumentTextIcon className="h-4 w-4 mr-2" />
                  View Work Order
                </Link>
              ) : (
                <button className="w-full btn-secondary text-left" disabled>
                  <DocumentTextIcon className="h-4 w-4 mr-2" />
                  No Work Order
                </button>
              )}
              
              <button className="w-full btn-secondary text-left">
                <ClockIcon className="h-4 w-4 mr-2" />
                Time History
              </button>
              
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to delete this task?')) {
                    deleteTaskMutation.mutate()
                  }
                }}
                className="w-full btn-danger text-left"
                disabled={deleteTaskMutation.isLoading}
              >
                <XMarkIcon className="h-4 w-4 mr-2" />
                Delete Task
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
