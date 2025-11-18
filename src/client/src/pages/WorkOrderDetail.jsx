import React, { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import {
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  ClockIcon,
  UserIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlusIcon,
  BuildingOffice2Icon
} from '@heroicons/react/24/outline'
import { workOrderAPI, taskAPI } from '../services/api'

const getStatusColor = (status) => {
  const colors = {
    draft: 'text-gray-600 bg-gray-100',
    pending: 'text-yellow-600 bg-yellow-100',
    issued: 'text-blue-600 bg-blue-100',
    acknowledged: 'text-indigo-600 bg-indigo-100',
    in_progress: 'text-blue-600 bg-blue-100',
    completed: 'text-green-600 bg-green-100',
    closed: 'text-gray-600 bg-gray-100',
    cancelled: 'text-red-600 bg-red-100'
  }
  return colors[status] || colors.draft
}

const formatStatus = (status) => {
  return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
}

export default function WorkOrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showAddNote, setShowAddNote] = useState(false)
  const [newNote, setNewNote] = useState('')

  const { data: workOrderData, isLoading, error } = useQuery({
    queryKey: ['work-order', id],
    queryFn: () => workOrderAPI.getWorkOrder(id).then(res => res.data.data),
    enabled: !!id
  })

  const workOrder = workOrderData
  const tasks = workOrderData?.tasks || []
  const aggregatedData = workOrderData?.aggregatedData || { totalEstimatedHours: 0, totalActualHours: 0 }

  const deleteMutation = useMutation({
    mutationFn: () => workOrderAPI.deleteWorkOrder(id),
    onSuccess: () => {
      toast.success('Work order deleted successfully')
      navigate(`/jobs/${workOrder?.jobId}/work-orders`)
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete work order')
    }
  })

  const statusMutation = useMutation({
    mutationFn: ({ status, completionPercentage }) =>
      workOrderAPI.updateStatus(id, status, completionPercentage),
    onSuccess: () => {
      toast.success('Status updated successfully')
      queryClient.invalidateQueries(['work-order', id])
      queryClient.invalidateQueries(['work-orders'])
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update status')
    }
  })

  const addNoteMutation = useMutation({
    mutationFn: (note) => workOrderAPI.addFieldNote(id, note),
    onSuccess: () => {
      toast.success('Field note added successfully')
      setNewNote('')
      setShowAddNote(false)
      queryClient.invalidateQueries(['work-order', id])
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to add field note')
    }
  })

  const handleStatusChange = (status) => {
    statusMutation.mutate({ status, completionPercentage: workOrder?.completionPercentage })
  }

  const handleAddNote = (e) => {
    e.preventDefault()
    if (!newNote.trim()) return
    addNoteMutation.mutate(newNote)
  }

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="card p-6 space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  if (error || !workOrder) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900">Work order not found</h3>
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
            <h1 className="text-2xl font-bold text-gray-900">{workOrder.workOrderNumber}</h1>
            <p className="text-sm text-gray-500 mt-1">{workOrder.title}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <span className={`badge ${getStatusColor(workOrder.status)}`}>
            {formatStatus(workOrder.status)}
          </span>
          <Link
            to={`/work-orders/${id}/edit`}
            className="btn-secondary flex items-center gap-2"
          >
            <PencilIcon className="h-4 w-4" />
            Edit
          </Link>
          <button
            onClick={() => {
              if (confirm('Are you sure you want to delete this work order?')) {
                deleteMutation.mutate()
              }
            }}
            className="btn-danger flex items-center gap-2"
            disabled={deleteMutation.isLoading}
          >
            <TrashIcon className="h-4 w-4" />
            Delete
          </button>
        </div>
      </div>

      {/* Status Actions */}
      <div className="flex items-center space-x-3">
        {workOrder.status === 'draft' && (
          <button
            onClick={() => handleStatusChange('pending')}
            className="btn-primary"
            disabled={statusMutation.isLoading}
          >
            Submit for Approval
          </button>
        )}
        {workOrder.status === 'pending' && (
          <button
            onClick={() => handleStatusChange('issued')}
            className="btn-primary"
            disabled={statusMutation.isLoading}
          >
            Mark as Issued
          </button>
        )}
        {workOrder.status === 'issued' && (
          <button
            onClick={() => handleStatusChange('in_progress')}
            className="btn-primary"
            disabled={statusMutation.isLoading}
          >
            Start Work
          </button>
        )}
        {workOrder.status === 'in_progress' && (
          <button
            onClick={() => handleStatusChange('completed')}
            className="btn-success"
            disabled={statusMutation.isLoading}
          >
            Mark Complete
          </button>
        )}
        {workOrder.status === 'completed' && (
          <button
            onClick={() => handleStatusChange('closed')}
            className="btn-secondary"
            disabled={statusMutation.isLoading}
          >
            Close Work Order
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Work Order Information */}
          <div className="card p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Work Order Information</h3>
            
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700">Description</h4>
                <p className="mt-1 text-gray-900">
                  {workOrder.description || 'No description provided'}
                </p>
              </div>

              {workOrder.scopeOfWork && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700">Scope of Work</h4>
                  <p className="mt-1 text-gray-900 whitespace-pre-wrap">{workOrder.scopeOfWork}</p>
                </div>
              )}

              {workOrder.specifications && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700">Specifications</h4>
                  <p className="mt-1 text-gray-900 whitespace-pre-wrap">{workOrder.specifications}</p>
                </div>
              )}
            </div>
          </div>

          {/* Associated Tasks */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Associated Tasks</h3>
              <Link
                to={`/tasks/create?workOrderId=${id}&jobId=${workOrder.jobId}`}
                className="btn-primary flex items-center gap-2"
              >
                <PlusIcon className="h-4 w-4" />
                Add Task
              </Link>
            </div>

            {tasks.length === 0 ? (
              <div className="text-center py-8">
                <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">No tasks associated with this work order</p>
                <Link
                  to={`/tasks/create?workOrderId=${id}&jobId=${workOrder.jobId}`}
                  className="mt-4 btn-primary inline-flex items-center gap-2"
                >
                  <PlusIcon className="h-4 w-4" />
                  Create First Task
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.map((task) => (
                  <Link
                    key={task._id}
                    to={`/tasks/${task._id}`}
                    className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{task.title}</h4>
                        <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
                          <span className={`badge ${
                            task.status === 'completed' ? 'bg-green-100 text-green-800' :
                            task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {task.status.replace('_', ' ')}
                          </span>
                          {task.assignedTo && (
                            <span className="flex items-center gap-1">
                              <UserIcon className="h-4 w-4" />
                              {task.assignedTo.name}
                            </span>
                          )}
                          {task.completionPercentage > 0 && (
                            <span>{task.completionPercentage}% complete</span>
                          )}
                        </div>
                      </div>
                      <div className="ml-4 text-right">
                        {task.estimatedHours && (
                          <div className="text-sm text-gray-500">Est: {task.estimatedHours}h</div>
                        )}
                        {task.actualHours > 0 && (
                          <div className="text-sm font-medium text-gray-900">
                            Actual: {task.actualHours.toFixed(2)}h
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Field Notes */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Field Notes</h3>
              <button
                onClick={() => setShowAddNote(!showAddNote)}
                className="btn-secondary flex items-center gap-2"
              >
                <PlusIcon className="h-4 w-4" />
                Add Note
              </button>
            </div>

            {showAddNote && (
              <form onSubmit={handleAddNote} className="mb-4">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Enter field note..."
                  className="form-textarea mb-2"
                  rows={3}
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddNote(false)
                      setNewNote('')
                    }}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" disabled={addNoteMutation.isLoading}>
                    Add Note
                  </button>
                </div>
              </form>
            )}

            {workOrder.fieldNotes && workOrder.fieldNotes.length > 0 ? (
              <div className="space-y-3">
                {workOrder.fieldNotes.map((note, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-gray-900">{note.note}</p>
                    <p className="mt-2 text-xs text-gray-500">
                      {note.createdBy?.name || 'Unknown'} • {format(new Date(note.createdAt), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No field notes yet</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Details */}
          <div className="card p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Details</h3>
            
            <div className="space-y-4">
              {workOrder.jobId && (
                <div className="flex items-center space-x-3">
                  <BuildingOffice2Icon className="h-5 w-5 text-gray-400" />
                  <div>
                    <div className="text-sm font-medium text-gray-700">Job</div>
                    <div className="text-gray-900">
                      {typeof workOrder.jobId === 'object' ? workOrder.jobId.name : 'Loading...'}
                    </div>
                    {typeof workOrder.jobId === 'object' && workOrder.jobId.jobNumber && (
                      <div className="text-xs text-gray-500">{workOrder.jobId.jobNumber}</div>
                    )}
                  </div>
                </div>
              )}

              {workOrder.issuedBy && (
                <div className="flex items-center space-x-3">
                  <UserIcon className="h-5 w-5 text-gray-400" />
                  <div>
                    <div className="text-sm font-medium text-gray-700">Issued By</div>
                    <div className="text-gray-900">{workOrder.issuedBy}</div>
                  </div>
                </div>
              )}

              {workOrder.assignedTo && (
                <div className="flex items-center space-x-3">
                  <UserIcon className="h-5 w-5 text-gray-400" />
                  <div>
                    <div className="text-sm font-medium text-gray-700">Assigned To</div>
                    <div className="text-gray-900">
                      {typeof workOrder.assignedTo === 'object' ? workOrder.assignedTo.name : 'Unassigned'}
                    </div>
                  </div>
                </div>
              )}

              {workOrder.issuedDate && (
                <div className="flex items-center space-x-3">
                  <ClockIcon className="h-5 w-5 text-gray-400" />
                  <div>
                    <div className="text-sm font-medium text-gray-700">Issued Date</div>
                    <div className="text-gray-900">
                      {format(new Date(workOrder.issuedDate), 'MMM d, yyyy')}
                    </div>
                  </div>
                </div>
              )}

              {workOrder.dueDate && (
                <div className="flex items-center space-x-3">
                  <ClockIcon className="h-5 w-5 text-gray-400" />
                  <div>
                    <div className="text-sm font-medium text-gray-700">Due Date</div>
                    <div className="text-gray-900">
                      {format(new Date(workOrder.dueDate), 'MMM d, yyyy')}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Time Tracking */}
          <div className="card p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Time Tracking</h3>
            
            <div className="space-y-3">
              {workOrder.estimatedHours && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-700">Estimated Hours</span>
                  <span className="font-semibold text-gray-900">{workOrder.estimatedHours}</span>
                </div>
              )}
              {aggregatedData.totalEstimatedHours > 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-700">From Tasks (Est.)</span>
                  <span className="text-gray-900">{aggregatedData.totalEstimatedHours.toFixed(2)}</span>
                </div>
              )}
              {workOrder.actualHours > 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-700">Actual Hours</span>
                  <span className={`font-semibold ${
                    workOrder.actualHours > (workOrder.estimatedHours || 0)
                      ? 'text-red-600'
                      : 'text-green-600'
                  }`}>
                    {workOrder.actualHours.toFixed(2)}
                  </span>
                </div>
              )}
              {aggregatedData.totalActualHours > 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-700">From Tasks (Actual)</span>
                  <span className="text-gray-900">{aggregatedData.totalActualHours.toFixed(2)}</span>
                </div>
              )}
              {workOrder.completionPercentage > 0 && (
                <div className="mt-4">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-gray-700">Progress</span>
                    <span className="text-sm font-medium text-gray-900">
                      {workOrder.completionPercentage}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${workOrder.completionPercentage}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Work Breakdown */}
          {(workOrder.systemId || workOrder.areaId || workOrder.phaseId) && (
            <div className="card p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Work Breakdown</h3>
              
              <div className="space-y-3 text-sm">
                {workOrder.systemId && (
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">System:</span>
                    <span className="text-gray-900">
                      {typeof workOrder.systemId === 'object' ? workOrder.systemId.name : 'N/A'}
                    </span>
                  </div>
                )}
                {workOrder.areaId && (
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">Area:</span>
                    <span className="text-gray-900">
                      {typeof workOrder.areaId === 'object' ? workOrder.areaId.name : 'N/A'}
                    </span>
                  </div>
                )}
                {workOrder.phaseId && (
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">Phase:</span>
                    <span className="text-gray-900">
                      {typeof workOrder.phaseId === 'object' ? workOrder.phaseId.name : 'N/A'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

