import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import Widget from '../Widget'
import { ClipboardDocumentListIcon } from '@heroicons/react/24/outline'
import { taskAPI } from '../../../services/api'
import { formatDistanceToNow } from 'date-fns'

export default function MyTasksWidget({ id, config, isEditing, onEdit, onRemove }) {
  const { data: myTasks, isLoading } = useQuery({
    queryKey: ['my-tasks-preview'],
    queryFn: () => taskAPI.getMyTasks({ status: config.status || 'in_progress' }).then(res => res.data.data),
    staleTime: 60 * 1000,
  })

  const maxItems = config.maxItems || 5
  const status = config.status || 'in_progress'

  const getPriorityBadge = (priority) => {
    const badges = {
      low: 'badge-green',
      medium: 'badge-yellow',
      high: 'badge-orange',
      critical: 'badge-red',
    }
    return badges[priority] || badges.medium
  }

  const getStatusBadge = (status) => {
    const badges = {
      not_started: 'badge-gray',
      in_progress: 'badge-blue',
      completed: 'badge-green',
      on_hold: 'badge-yellow',
      cancelled: 'badge-red',
    }
    return badges[status] || badges.gray
  }

  const title = config.title || `My ${status.replace('_', ' ')} Tasks`

  return (
    <Widget
      id={id}
      type="myTasks"
      title={title}
      config={config}
      isLoading={isLoading}
      isEditing={isEditing}
      onEdit={onEdit}
      onRemove={onRemove}
    >
      {myTasks && myTasks.length > 0 ? (
        <div className="space-y-2">
          {myTasks.slice(0, maxItems).map((task) => (
            <Link
              key={task._id}
              to={`/tasks/${task._id}`}
              className="block hover:bg-gray-50 p-2 rounded-lg transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {task.title}
                  </p>
                  <p className="text-xs text-gray-500">
                    Due: {task.dueDate ? formatDistanceToNow(new Date(task.dueDate), { addSuffix: true }) : 'No due date'}
                  </p>
                </div>
                <div className="flex items-center space-x-1 ml-2">
                  <span className={`badge text-xs ${getPriorityBadge(task.priority)}`}>
                    {task.priority}
                  </span>
                  <span className={`badge text-xs ${getStatusBadge(task.status)}`}>
                    {task.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </Link>
          ))}
          {myTasks.length > maxItems && (
            <Link
              to="/my-tasks"
              className="block text-center text-sm text-blue-600 hover:text-blue-500 pt-2"
            >
              View all {myTasks.length} tasks →
            </Link>
          )}
        </div>
      ) : (
        <div className="text-sm text-gray-500 flex items-center justify-center h-20">
          <div className="text-center">
            <ClipboardDocumentListIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p>No tasks found</p>
          </div>
        </div>
      )}
    </Widget>
  )
}

