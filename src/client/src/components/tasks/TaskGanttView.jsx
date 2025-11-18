import React, { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addDays } from 'date-fns'
import { 
  ChevronLeftIcon, 
  ChevronRightIcon,
  CalendarIcon,
  ClockIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline'

const getStatusColor = (status) => {
  const colors = {
    not_started: 'bg-gray-300',
    in_progress: 'bg-blue-500',
    completed: 'bg-green-500',
    on_hold: 'bg-yellow-500',
    cancelled: 'bg-red-300'
  }
  return colors[status] || colors.not_started
}

const getPriorityColor = (priority) => {
  const colors = {
    low: 'border-green-500',
    medium: 'border-yellow-500',
    high: 'border-orange-500',
    critical: 'border-red-500'
  }
  return colors[priority] || colors.medium
}

export default function TaskGanttView({ tasks, isLoading, onTaskUpdate }) {
  const [viewStart, setViewStart] = useState(() => {
    // Start from the earliest task start date or current date
    const dates = tasks
      .map(t => t.startDate ? new Date(t.startDate) : null)
      .filter(Boolean)
    if (dates.length > 0) {
      return startOfWeek(new Date(Math.min(...dates)), { weekStartsOn: 0 })
    }
    return startOfWeek(new Date(), { weekStartsOn: 0 })
  })

  const [weeksToShow] = useState(12) // Show 12 weeks by default
  const [rowHeight] = useState(50) // Height of each task row

  // Calculate date range
  const viewEnd = addDays(viewStart, weeksToShow * 7)
  const days = eachDayOfInterval({ start: viewStart, end: viewEnd })

  // Filter tasks that have dates
  const tasksWithDates = useMemo(() => {
    return tasks
      .filter(task => task.startDate || task.dueDate)
      .map(task => {
        const startDate = task.startDate ? new Date(task.startDate) : null
        const dueDate = task.dueDate ? new Date(task.dueDate) : null
        
        // Calculate duration
        let duration = 1 // Default 1 day
        if (startDate && dueDate) {
          duration = Math.max(1, Math.ceil((dueDate - startDate) / (1000 * 60 * 60 * 24)) + 1)
        } else if (startDate) {
          duration = 7 // Default 1 week if only start date
        } else if (dueDate) {
          duration = 7 // Default 1 week if only due date
        }

        return {
          ...task,
          startDate,
          dueDate,
          duration,
          displayStart: startDate || (dueDate ? addDays(dueDate, -duration + 1) : new Date())
        }
      })
      .sort((a, b) => {
        // Sort by start date, then by priority
        if (a.displayStart && b.displayStart) {
          return a.displayStart - b.displayStart
        }
        return 0
      })
  }, [tasks])

  const navigateWeeks = (direction) => {
    setViewStart(prev => addDays(prev, direction * 7))
  }

  const getTaskPosition = (task) => {
    if (!task.displayStart) return { left: 0, width: 0 }
    
    const startIndex = days.findIndex(day => isSameDay(day, task.displayStart))
    if (startIndex === -1) return { left: 0, width: 0 }

    const cellWidth = 100 / days.length
    const left = (startIndex / days.length) * 100
    const width = Math.max((task.duration / days.length) * 100, cellWidth)

    return { left, width }
  }

  const isTaskVisible = (task) => {
    if (!task.displayStart) return false
    const taskEnd = addDays(task.displayStart, task.duration)
    return task.displayStart <= viewEnd && taskEnd >= viewStart
  }

  if (isLoading) {
    return (
      <div className="card p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigateWeeks(-1)}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>
            <div className="flex items-center space-x-2">
              <CalendarIcon className="w-5 h-5 text-gray-500" />
              <span className="font-medium">
                {format(viewStart, 'MMM d')} - {format(viewEnd, 'MMM d, yyyy')}
              </span>
            </div>
            <button
              onClick={() => navigateWeeks(1)}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <ChevronRightIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewStart(startOfWeek(new Date(), { weekStartsOn: 0 }))}
              className="px-4 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Today
            </button>
          </div>
          <div className="text-sm text-gray-600">
            {tasksWithDates.length} tasks with dates
          </div>
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="card overflow-x-auto">
        <div className="min-w-full" style={{ minWidth: `${days.length * 40}px` }}>
          {/* Header - Date columns */}
          <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
            <div className="flex">
              <div className="w-64 p-4 border-r border-gray-200 font-medium text-gray-900">
                Task
              </div>
              <div className="flex-1 flex">
                {days.map((day, index) => {
                  const isWeekStart = index === 0 || day.getDay() === 0
                  return (
                    <div
                      key={day.toISOString()}
                      className={`flex-1 p-2 text-xs text-center border-r border-gray-200 ${
                        isWeekStart ? 'bg-gray-50 font-medium' : ''
                      }`}
                      style={{ minWidth: '40px' }}
                    >
                      {isWeekStart && (
                        <div className="font-semibold">{format(day, 'MMM d')}</div>
                      )}
                      <div className="text-gray-500">{format(day, 'EEE')}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Task Rows */}
          <div className="divide-y divide-gray-200">
            {tasksWithDates.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p>No tasks with dates found</p>
                <p className="text-sm mt-2">Add start dates or due dates to tasks to see them on the Gantt chart</p>
              </div>
            ) : (
              tasksWithDates.map((task, index) => {
                if (!isTaskVisible(task)) return null

                const { left, width } = getTaskPosition(task)
                const isOverdue = task.dueDate && task.dueDate < new Date() && task.status !== 'completed'

                return (
                  <div
                    key={task._id}
                    className="relative flex items-center hover:bg-gray-50"
                    style={{ height: `${rowHeight}px` }}
                  >
                    {/* Task Info Column */}
                    <div className="w-64 p-4 border-r border-gray-200 flex-shrink-0">
                      <Link
                        to={`/tasks/${task._id}`}
                        className="block group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600">
                              {task.title}
                            </h4>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(task.status)} text-white`}>
                                {task.status.replace('_', ' ')}
                              </span>
                              <span className={`text-xs border-l-2 pl-2 ${getPriorityColor(task.priority)}`}>
                                {task.priority}
                              </span>
                            </div>
                            <div className="flex items-center space-x-3 mt-1 text-xs text-gray-500">
                              {task.costCode && (
                                <span className="flex items-center">
                                  <CurrencyDollarIcon className="w-3 h-3 mr-1" />
                                  {task.costCode}
                                </span>
                              )}
                              {task.timesheet?.totalHours > 0 && (
                                <span className="flex items-center">
                                  <ClockIcon className="w-3 h-3 mr-1" />
                                  {task.timesheet.totalHours.toFixed(1)}h
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>
                    </div>

                    {/* Timeline Column */}
                    <div className="flex-1 relative h-full">
                      {/* Task Bar */}
                      <div
                        className={`absolute top-2 bottom-2 rounded ${getStatusColor(task.status)} ${
                          isOverdue ? 'ring-2 ring-red-500' : ''
                        } shadow-sm hover:shadow-md transition-shadow cursor-pointer`}
                        style={{
                          left: `${left}%`,
                          width: `${width}%`,
                          minWidth: '20px'
                        }}
                        title={`${task.title}\n${task.displayStart ? format(task.displayStart, 'MMM d') : ''} - ${task.dueDate ? format(task.dueDate, 'MMM d') : ''}\n${task.duration} days`}
                      >
                        <div className="h-full flex items-center px-2">
                          <span className="text-xs text-white font-medium truncate">
                            {task.title.length > 15 ? task.title.substring(0, 15) + '...' : task.title}
                          </span>
                        </div>
                      </div>

                      {/* Progress indicator */}
                      {task.completionPercentage > 0 && (
                        <div
                          className="absolute top-0 bottom-0 bg-green-400 opacity-50 rounded-l"
                          style={{
                            left: `${left}%`,
                            width: `${(width * task.completionPercentage) / 100}%`,
                            minWidth: '2px'
                          }}
                        />
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="card p-4">
        <div className="flex items-center space-x-6 text-sm">
          <span className="font-medium text-gray-700">Legend:</span>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-gray-300 rounded"></div>
            <span>Not Started</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span>In Progress</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span>Completed</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-yellow-500 rounded"></div>
            <span>On Hold</span>
          </div>
        </div>
      </div>
    </div>
  )
}

