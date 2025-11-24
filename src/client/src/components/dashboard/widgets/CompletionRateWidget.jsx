import React from 'react'
import { useQuery } from '@tanstack/react-query'
import Widget from '../Widget'
import { CheckCircleIcon } from '@heroicons/react/24/outline'
import { taskAPI } from '../../../services/api'

export default function CompletionRateWidget({ id, config, isEditing, onEdit, onRemove }) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => taskAPI.getDashboardStats().then(res => res.data.data),
  })

  const showDetails = config.showDetails !== false

  return (
    <Widget
      id={id}
      type="completionRate"
      title="Task Completion Rate"
      config={config}
      isLoading={isLoading}
      isEditing={isEditing}
      onEdit={onEdit}
      onRemove={onRemove}
    >
      {stats && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <CheckCircleIcon className="h-8 w-8 text-green-500 mr-3" />
              <div>
                <div className="text-3xl font-bold text-gray-900">{stats.completionRate}%</div>
                {showDetails && (
                  <div className="text-sm text-gray-500">
                    {stats.completedTasks} of {stats.totalTasks} tasks
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-green-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${stats.completionRate}%` }}
            ></div>
          </div>
          {showDetails && (
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-gray-500">Completed</div>
                <div className="font-medium text-green-600">{stats.completedTasks}</div>
              </div>
              <div>
                <div className="text-gray-500">Remaining</div>
                <div className="font-medium text-gray-600">{stats.totalTasks - stats.completedTasks}</div>
              </div>
            </div>
          )}
        </div>
      )}
    </Widget>
  )
}

