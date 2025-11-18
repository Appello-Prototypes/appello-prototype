import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { formatDistanceToNow, format } from 'date-fns'
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'
import { 
  ClockIcon, 
  UserIcon, 
  TagIcon,
  CurrencyDollarIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'
import { taskAPI } from '../../services/api'
import toast from 'react-hot-toast'

const STATUS_COLUMNS = [
  { id: 'not_started', label: 'Not Started', color: 'bg-gray-100' },
  { id: 'in_progress', label: 'In Progress', color: 'bg-blue-100' },
  { id: 'on_hold', label: 'On Hold', color: 'bg-yellow-100' },
  { id: 'completed', label: 'Completed', color: 'bg-green-100' },
]

const getPriorityColor = (priority) => {
  const colors = {
    low: 'text-green-600 bg-green-100',
    medium: 'text-yellow-600 bg-yellow-100',
    high: 'text-orange-600 bg-orange-100',
    critical: 'text-red-600 bg-red-100'
  }
  return colors[priority] || colors.medium
}

const getStatusColor = (status) => {
  const colors = {
    not_started: 'text-gray-600 bg-gray-100',
    in_progress: 'text-blue-600 bg-blue-100',
    completed: 'text-green-600 bg-green-100',
    on_hold: 'text-yellow-600 bg-yellow-100',
    cancelled: 'text-red-600 bg-red-100'
  }
  return colors[status] || colors.not_started
}

// Helper function to format percentage with max 2 decimals
const formatPercentage = (value) => {
  if (value == null || value === undefined) return '0.00'
  const num = typeof value === 'string' ? parseFloat(value) : value
  return parseFloat(num.toFixed(2)).toString()
}

// Helper function to format currency with max 2 decimals
const formatCurrency = (value) => {
  if (value == null || value === undefined) return '$0.00'
  const num = typeof value === 'string' ? parseFloat(value) : value
  return `$${parseFloat(num.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function TaskCardView({ tasks, isLoading, onTaskUpdate }) {
  const [localTasks, setLocalTasks] = useState(tasks)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  // Update local tasks when props change - but don't update during drag
  React.useEffect(() => {
    if (!isDragging) {
      setLocalTasks(tasks)
    }
  }, [tasks, isDragging])

  // Group tasks by status - memoize to prevent unnecessary re-renders
  const groupedTasks = React.useMemo(() => {
    return STATUS_COLUMNS.reduce((acc, column) => {
      acc[column.id] = (localTasks || []).filter(task => {
        const taskStatus = task.status || 'not_started'
        return taskStatus === column.id
      })
      return acc
    }, {})
  }, [localTasks])

  const handleDragStart = (start) => {
    setIsDragging(true)
    // Log for debugging
    console.log('Drag started:', start.draggableId, 'from', start.source.droppableId)
  }

  const handleDragEnd = async (result) => {
    setIsDragging(false)
    const { destination, source, draggableId } = result

    // If dropped outside a droppable area, do nothing
    if (!destination) {
      return
    }

    // If dropped in the same position, do nothing
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return
    }

    const newStatus = destination.droppableId
    const taskId = draggableId

    // Find the task being moved - handle both string and ObjectId formats
    const task = localTasks.find(t => {
      const tId = typeof t._id === 'string' ? t._id : t._id?.toString()
      return tId === taskId
    })
    if (!task) {
      console.warn('Task not found for drag operation:', taskId)
      return
    }

    // If status hasn't changed, just reorder (we'll skip reordering for now)
    if (task.status === newStatus) {
      return
    }

    // Optimistic update
    const updatedTasks = localTasks.map(t => {
      const tId = typeof t._id === 'string' ? t._id : t._id?.toString()
      if (tId === taskId) {
        const completionPercentage = newStatus === 'completed' ? 100 : 
                                    newStatus === 'not_started' ? 0 : 
                                    t.completionPercentage || 0
        return {
          ...t,
          status: newStatus,
          completionPercentage
        }
      }
      return t
    })
    setLocalTasks(updatedTasks)
    setIsUpdating(true)

    try {
      // Update task status via API - use the actual task _id
      const actualTaskId = typeof task._id === 'string' ? task._id : task._id?.toString()
      const completionPercentage = newStatus === 'completed' ? 100 : 
                                  newStatus === 'not_started' ? 0 : 
                                  task.completionPercentage || 0

      await taskAPI.updateTaskStatus(actualTaskId, newStatus, completionPercentage)
      
      toast.success(`Task moved to ${STATUS_COLUMNS.find(c => c.id === newStatus)?.label || newStatus}`)
      
      // Refresh data from server
      if (onTaskUpdate) {
        onTaskUpdate()
      }
    } catch (error) {
      console.error('Error updating task status:', error)
      toast.error('Failed to update task status')
      
      // Revert optimistic update
      setLocalTasks(tasks)
    } finally {
      setIsUpdating(false)
    }
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card p-4 animate-pulse">
            <div className="h-6 bg-gray-200 rounded mb-4"></div>
            <div className="space-y-3">
              {[...Array(3)].map((_, j) => (
                <div key={j} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Don't render DragDropContext if no tasks
  if (!localTasks || localTasks.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {STATUS_COLUMNS.map(column => (
          <div key={column.id} className="flex flex-col">
            <div className={`card p-4 ${column.color} mb-2`}>
              <h3 className="font-semibold text-gray-900">{column.label}</h3>
              <p className="text-sm text-gray-600 mt-1">0 tasks</p>
            </div>
            <div className="card p-8 text-center text-gray-400 border-2 border-dashed border-gray-300 rounded-lg">
              <p className="text-sm">No tasks</p>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {STATUS_COLUMNS.map(column => (
          <Droppable key={`droppable-${column.id}`} droppableId={column.id}>
            {(provided, snapshot) => (
              <div 
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`flex flex-col drag-drop-column ${snapshot.isDraggingOver ? 'bg-blue-50 rounded-lg dragging-over' : ''}`}
              >
                <div className={`card p-4 ${column.color} mb-2`}>
                  <h3 className="font-semibold text-gray-900">{column.label}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {groupedTasks[column.id]?.length || 0} tasks
                  </p>
                </div>
                
                <div className="flex-1 space-y-3 overflow-y-auto max-h-[calc(100vh-300px)] min-h-[200px]">
                  {groupedTasks[column.id]?.map((task, index) => {
                    // Ensure draggableId is a stable string - use task._id consistently
                    const taskId = task._id
                    const draggableId = typeof taskId === 'string' 
                      ? taskId 
                      : (taskId?.toString ? taskId.toString() : String(taskId))
                    
                    // Skip if we can't get a valid ID
                    if (!draggableId || draggableId === 'undefined' || draggableId === 'null') {
                      console.warn('Invalid task ID for draggable:', task)
                      return null
                    }
                    
                    return (
                    <Draggable
                      key={`draggable-${draggableId}-${column.id}`}
                      draggableId={draggableId}
                      index={index}
                      isDragDisabled={isUpdating || isDragging}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`mb-3 draggable-card ${snapshot.isDragging ? 'opacity-75 rotate-2 shadow-xl dragging' : ''}`}
                        >
                          <div
                            {...provided.dragHandleProps}
                            className="card p-4 hover:shadow-lg transition-all bg-white cursor-grab active:cursor-grabbing select-none"
                          >
                            <Link
                              to={`/tasks/${task._id}`}
                              className="block"
                              onClick={(e) => {
                                // Prevent navigation when dragging
                                if (isDragging || snapshot.isDragging) {
                                  e.preventDefault()
                                  return false
                                }
                              }}
                            >
                              {/* Task Title */}
                              <h4 className="font-medium text-gray-900 mb-2 line-clamp-2">
                                {task.title}
                              </h4>

                              {/* Priority Badge */}
                              <div className="mb-2">
                                <span className={`badge ${getPriorityColor(task.priority)} text-xs`}>
                                  {task.priority}
                                </span>
                              </div>

                              {/* Cost Code */}
                              {task.costCode && (
                                <div className="flex items-center text-xs text-gray-600 mb-2">
                                  <CurrencyDollarIcon className="w-3 h-3 mr-1" />
                                  <span className="font-mono">{task.costCode}</span>
                                </div>
                              )}

                              {/* Timesheet Data */}
                              {task.timesheet && task.timesheet.totalHours > 0 && (
                                <div className="flex items-center text-xs text-gray-600 mb-2">
                                  <ClockIcon className="w-3 h-3 mr-1" />
                                  <span>
                                    {parseFloat(task.timesheet.totalHours.toFixed(2))}h 
                                    {task.timesheet.overtimeHours > 0 && (
                                      <span className="text-orange-600 ml-1">
                                        (+{parseFloat(task.timesheet.overtimeHours.toFixed(2))}h OT)
                                      </span>
                                    )}
                                  </span>
                                </div>
                              )}

                              {/* Hours Progress */}
                              {task.estimatedHours && (
                                <div className="mb-2">
                                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                                    <span>Hours</span>
                                    <span>
                                      {parseFloat((task.actualHours || 0).toFixed(2))} / {parseFloat(task.estimatedHours.toFixed(2))}
                                    </span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                                    <div
                                      className="bg-blue-600 h-1.5 rounded-full"
                                      style={{
                                        width: `${Math.min(
                                          ((task.actualHours || 0) / task.estimatedHours) * 100,
                                          100
                                        )}%`
                                      }}
                                    ></div>
                                  </div>
                                </div>
                              )}
                              
                              {/* Completion Percentage */}
                              {task.completionPercentage !== undefined && task.completionPercentage !== null && (
                                <div className="mb-2">
                                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                                    <span>Progress</span>
                                    <span>{formatPercentage(task.completionPercentage)}%</span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                                    <div
                                      className="bg-green-600 h-1.5 rounded-full"
                                      style={{
                                        width: `${Math.min(parseFloat(formatPercentage(task.completionPercentage)), 100)}%`
                                      }}
                                    ></div>
                                  </div>
                                </div>
                              )}

                              {/* Assigned To */}
                              {task.assignedTo && (
                                <div className="flex items-center text-xs text-gray-600 mb-2">
                                  <UserIcon className="w-3 h-3 mr-1" />
                                  <span>{task.assignedTo.name}</span>
                                </div>
                              )}

                              {/* Due Date */}
                              {task.dueDate && (
                                <div className="text-xs text-gray-500">
                                  Due: {format(new Date(task.dueDate), 'MMM d, yyyy')}
                                </div>
                              )}

                              {/* Job Reference */}
                              {task.jobId && (
                                <div className="text-xs text-gray-500 mt-2 pt-2 border-t">
                                  {task.jobId.jobNumber || task.jobId.name}
                                </div>
                              )}
                            </Link>
                          </div>
                        </div>
                      )}
                    </Draggable>
                    )
                  }).filter(Boolean)}
                  
                  {provided.placeholder}
                  
                  {(!groupedTasks[column.id] || groupedTasks[column.id].length === 0) && (
                    <div className="card p-8 text-center text-gray-400 border-2 border-dashed border-gray-300 rounded-lg">
                      <p className="text-sm">Drop tasks here</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Droppable>
        ))}
      </div>
    </DragDropContext>
  )
}

