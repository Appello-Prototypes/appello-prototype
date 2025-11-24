import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import Widget from '../Widget'
import { ClockIcon } from '@heroicons/react/24/outline'
import { api } from '../../../services/api'
import { format } from 'date-fns'

export default function TimeTrackingWidget({ id, config, isEditing, onEdit, onRemove }) {
  const { data: timeEntriesSummary, isLoading } = useQuery({
    queryKey: ['time-entries-summary'],
    queryFn: async () => {
      const response = await api.get('/api/time-entries')
      const entries = response.data.data.timeEntries || []
      const totalHours = entries.reduce((sum, e) => sum + (e.totalHours || 0), 0)
      const totalCost = entries.reduce((sum, e) => sum + (e.totalCost || 0), 0)
      const thisWeekHours = entries
        .filter(e => {
          const entryDate = new Date(e.date)
          const weekAgo = new Date()
          weekAgo.setDate(weekAgo.getDate() - 7)
          return entryDate >= weekAgo
        })
        .reduce((sum, e) => sum + (e.totalHours || 0), 0)
      return { totalHours, totalCost, thisWeekHours, entryCount: entries.length }
    },
    staleTime: 60 * 1000,
  })

  const { data: recentTimeEntries } = useQuery({
    queryKey: ['recent-time-entries'],
    queryFn: () => api.get('/api/time-entries?limit=5').then(res => res.data.data.timeEntries),
    staleTime: 30 * 1000,
  })

  const displayType = config.displayType || 'summary' // 'summary' or 'recent'

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value || 0)
  }

  if (displayType === 'summary') {
    return (
      <Widget
        id={id}
        type="timeTracking"
        title="Time Tracking Summary"
        config={config}
        isLoading={isLoading}
        isEditing={isEditing}
        onEdit={onEdit}
        onRemove={onRemove}
      >
        {timeEntriesSummary && (
          <div className="space-y-3">
            <div>
              <div className="flex items-center mb-2">
                <ClockIcon className="h-5 w-5 text-blue-500 mr-2" />
                <div className="text-xs text-gray-500">Total Hours</div>
              </div>
              <div className="text-2xl font-bold text-gray-900">{timeEntriesSummary.totalHours.toFixed(1)}h</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-gray-500">This Week</div>
                <div className="text-lg font-medium text-blue-600">{timeEntriesSummary.thisWeekHours.toFixed(1)}h</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Total Cost</div>
                <div className="text-lg font-medium text-gray-900">{formatCurrency(timeEntriesSummary.totalCost)}</div>
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Entries</div>
              <div className="text-sm font-medium text-gray-600">{timeEntriesSummary.entryCount}</div>
            </div>
          </div>
        )}
      </Widget>
    )
  }

  return (
    <Widget
      id={id}
      type="timeTracking"
      title="Recent Time Entries"
      config={config}
      isLoading={isLoading}
      isEditing={isEditing}
      onEdit={onEdit}
      onRemove={onRemove}
    >
      {recentTimeEntries && recentTimeEntries.length > 0 ? (
        <div className="space-y-2">
          {recentTimeEntries.slice(0, config.maxItems || 5).map((entry) => (
            <div
              key={entry._id}
              className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {entry.costCode} - {entry.totalHours}h
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {entry.workDescription}
                </p>
                <p className="text-xs text-gray-400">
                  {entry.workerId?.name} • {format(new Date(entry.date), 'MMM d')}
                </p>
              </div>
              <div className="ml-2">
                <span className={`badge text-xs ${
                  entry.status === 'approved' ? 'badge-green' :
                  entry.status === 'submitted' ? 'badge-blue' : 'badge-gray'
                }`}>
                  {entry.status}
                </span>
              </div>
            </div>
          ))}
          <Link
            to="/time-entry"
            className="block text-center text-sm text-blue-600 hover:text-blue-500 pt-2"
          >
            View all →
          </Link>
        </div>
      ) : (
        <div className="text-sm text-gray-500">No time entries</div>
      )}
    </Widget>
  )
}

