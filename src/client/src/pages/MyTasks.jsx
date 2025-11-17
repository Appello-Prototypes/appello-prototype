import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CalendarIcon,
  PlayIcon,
  PauseIcon,
  FunnelIcon
} from '@heroicons/react/24/outline'
import { taskAPI } from '../services/api'
import { formatDistanceToNow, format, isToday, isTomorrow } from 'date-fns'

export default function MyTasks() {
  const [activeTab, setActiveTab] = useState('all')
  const [statusFilter, setStatusFilter] = useState('')

  const { data: myTasks, isLoading } = useQuery({
    queryKey: ['my-tasks', statusFilter],
    queryFn: () => taskAPI.getMyTasks({ status: statusFilter }).then(res => res.data.data),
    staleTime: 30 * 1000
  })

  const tabs = [
    { id: 'all', name: 'All Tasks', icon: ClockIcon },
    { id: 'in_progress', name: 'Active', icon: PlayIcon },
    { id: 'completed', name: 'Completed', icon: CheckCircleIcon },
    { id: 'overdue', name: 'Overdue', icon: ExclamationTriangleIcon }
  ]

  const getFilteredTasks = () => {
    if (!myTasks) return []
    
    switch (activeTab) {
      case 'in_progress':
        return myTasks.filter(task => task.status === 'in_progress')
      case 'completed':
        return myTasks.filter(task => task.status === 'completed')
      case 'overdue':
        return myTasks.filter(task => 
          task.dueDate && 
          new Date(task.dueDate) < new Date() && 
          task.status !== 'completed'
        )
      default:
        return myTasks
    }
  }

  const getTasksByTimeframe = () => {
    const tasks = getFilteredTasks()
    const today = []
    const tomorrow = []
    const upcoming = []
    const noDate = []

    tasks.forEach(task => {
      if (!task.dueDate) {
        noDate.push(task)
      } else if (isToday(new Date(task.dueDate))) {
        today.push(task)
      } else if (isTomorrow(new Date(task.dueDate))) {
        tomorrow.push(task)
      } else {
        upcoming.push(task)
      }
    })

    return { today, tomorrow, upcoming, noDate }
  }

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'border-l-green-400 bg-green-50',
      medium: 'border-l-yellow-400 bg-yellow-50',
      high: 'border-l-orange-400 bg-orange-50',
      critical: 'border-l-red-500 bg-red-50'
    }
    return colors[priority] || colors.medium
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-600" />
      case 'in_progress':
        return <PlayIcon className="h-5 w-5 text-blue-600" />
      case 'on_hold':
        return <PauseIcon className="h-5 w-5 text-yellow-600" />
      default:
        return <ClockIcon className="h-5 w-5 text-gray-400" />
    }
  }

  const TaskCard = ({ task }) => (
    <Link
      to={`/tasks/${task._id}`}
      className={`block p-4 border-l-4 rounded-r-lg hover:shadow-md transition-all ${getPriorityColor(task.priority)}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            {getStatusIcon(task.status)}
            <h3 className="text-lg font-medium text-gray-900 truncate">
              {task.title}
            </h3>
          </div>
          
          {task.description && (
            <p className="text-sm text-gray-600 line-clamp-2 mb-2">
              {task.description}
            </p>
          )}
          
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            {task.costCode && (
              <span className="font-medium">
                {task.costCode}
              </span>
            )}
            
            {task.estimatedHours && (
              <span>
                {task.estimatedHours}h estimated
              </span>
            )}
            
            {task.craft && (
              <span className="capitalize">
                {task.craft}
              </span>
            )}
          </div>
        </div>
        
        <div className="ml-4 text-right">
          {task.completionPercentage > 0 && (
            <div className="text-2xl font-bold text-blue-600 mb-1">
              {task.completionPercentage}%
            </div>
          )}
          
          {task.dueDate && (
            <div className={`text-sm ${
              new Date(task.dueDate) < new Date() && task.status !== 'completed'
                ? 'text-red-600 font-medium'
                : 'text-gray-500'
            }`}>
              {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}
            </div>
          )}
        </div>
      </div>
    </Link>
  )

  const TaskSection = ({ title, tasks, icon: Icon }) => (
    <div className="card">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <Icon className="h-5 w-5 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
          <span className="badge badge-gray">{tasks.length}</span>
        </div>
      </div>
      <div className="p-6">
        {tasks.length > 0 ? (
          <div className="space-y-3">
            {tasks.map(task => (
              <TaskCard key={task._id} task={task} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Icon className="h-12 w-12 mx-auto text-gray-300 mb-2" />
            <p>No tasks {title.toLowerCase()}</p>
          </div>
        )}
      </div>
    </div>
  )

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/4 animate-pulse"></div>
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    )
  }

  const { today, tomorrow, upcoming, noDate } = getTasksByTimeframe()
  const filteredTasks = getFilteredTasks()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl">
            My Tasks
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Your personal task dashboard with ICI contractor workflow integration
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map(tab => {
            const TaskIcon = tab.icon
            const isActive = activeTab === tab.id
            const taskCount = tab.id === 'all' ? filteredTasks.length : 
              tab.id === 'overdue' ? filteredTasks.filter(t => 
                t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed'
              ).length :
              filteredTasks.filter(t => t.status === tab.id).length

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  isActive
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
              >
                <TaskIcon className="h-4 w-4" />
                <span>{tab.name}</span>
                {taskCount > 0 && (
                  <span className={`badge text-xs ${isActive ? 'badge-blue' : 'badge-gray'}`}>
                    {taskCount}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Task Sections */}
      {activeTab === 'all' && (
        <div className="space-y-6">
          {today.length > 0 && (
            <TaskSection title="Due Today" tasks={today} icon={CalendarIcon} />
          )}
          
          {tomorrow.length > 0 && (
            <TaskSection title="Due Tomorrow" tasks={tomorrow} icon={CalendarIcon} />
          )}
          
          {upcoming.length > 0 && (
            <TaskSection title="Upcoming" tasks={upcoming} icon={ClockIcon} />
          )}
          
          {noDate.length > 0 && (
            <TaskSection title="No Due Date" tasks={noDate} icon={ClockIcon} />
          )}
          
          {filteredTasks.length === 0 && (
            <div className="text-center py-12">
              <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No tasks assigned</h3>
              <p className="mt-1 text-sm text-gray-500">
                You don't have any tasks assigned to you yet.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Filtered Views */}
      {activeTab !== 'all' && (
        <div className="space-y-3">
          {filteredTasks.map(task => (
            <TaskCard key={task._id} task={task} />
          ))}
          
          {filteredTasks.length === 0 && (
            <div className="text-center py-12">
              <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No {activeTab.replace('_', ' ')} tasks
              </h3>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
