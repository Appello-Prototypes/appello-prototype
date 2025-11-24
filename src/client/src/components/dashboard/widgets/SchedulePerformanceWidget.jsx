import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import Widget from '../Widget'
import { api } from '../../../services/api'
import { ClockIcon, CalendarIcon } from '@heroicons/react/24/outline'

export default function SchedulePerformanceWidget({ id, config, isEditing, onEdit, onRemove }) {
  const { jobId } = useParams()
  const targetJobId = config.jobId || jobId

  const { data: scheduleData, isLoading } = useQuery({
    queryKey: ['schedule-performance', targetJobId],
    queryFn: async () => {
      if (!targetJobId) return null

      try {
        const earnedVsBurnedResponse = await api.get(`/api/financial/${targetJobId}/earned-vs-burned`)
          .catch(() => ({ data: { totals: {} } }))

        const evm = earnedVsBurnedResponse.data?.totals || {}
        const spi = evm.spi || 0
        const scheduleVariance = evm.scheduleVariance || 0

        return {
          spi,
          scheduleVariance,
        }
      } catch (error) {
        console.error('Error fetching schedule data:', error)
        return null
      }
    },
    enabled: !!targetJobId,
    staleTime: 60 * 1000,
  })

  const { data: job } = useQuery({
    queryKey: ['job', targetJobId],
    queryFn: () => api.get(`/api/jobs/${targetJobId}`).then(res => res.data.data),
    enabled: !!targetJobId,
    staleTime: 60 * 1000,
  })

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value || 0)
  }

  if (!targetJobId) {
    return (
      <Widget
        id={id}
        type="schedulePerformance"
        title="Schedule Performance"
        config={config}
        isLoading={false}
        isEditing={isEditing}
        onEdit={onEdit}
        onRemove={onRemove}
      >
        <div className="text-sm text-gray-500">Select a job to view schedule performance</div>
      </Widget>
    )
  }

  if (!scheduleData) {
    return (
      <Widget
        id={id}
        type="schedulePerformance"
        title={job ? `${job.name} - Schedule` : 'Schedule Performance'}
        config={config}
        isLoading={isLoading}
        isEditing={isEditing}
        onEdit={onEdit}
        onRemove={onRemove}
      >
        <div className="text-sm text-gray-500">No schedule data available</div>
      </Widget>
    )
  }

  const { spi, scheduleVariance } = scheduleData

  const getScheduleStatus = () => {
    if (spi === 0) return { label: 'No Data', color: 'gray', bgColor: 'bg-gray-50', textColor: 'text-gray-600' }
    if (spi >= 1.0) return { label: 'On Schedule', color: 'green', bgColor: 'bg-green-50', textColor: 'text-green-700' }
    if (spi >= 0.9) return { label: 'At Risk', color: 'yellow', bgColor: 'bg-yellow-50', textColor: 'text-yellow-700' }
    return { label: 'Behind Schedule', color: 'red', bgColor: 'bg-red-50', textColor: 'text-red-700' }
  }

  const status = getScheduleStatus()

  return (
    <Widget
      id={id}
      type="schedulePerformance"
      title={job ? `${job.name} - Schedule Performance` : 'Schedule Performance'}
      config={config}
      isLoading={isLoading}
      isEditing={isEditing}
      onEdit={onEdit}
      onRemove={onRemove}
    >
      <div className="space-y-4">
        {/* SPI Display */}
        <div className={`${status.bgColor} rounded-lg p-4 text-center`}>
          <div className="text-xs text-gray-600 mb-1">Schedule Performance Index</div>
          <div className={`text-3xl font-bold ${status.textColor} mb-2`}>
            {spi > 0 ? spi.toFixed(3) : 'N/A'}
          </div>
          <div className={`text-sm font-medium ${status.textColor}`}>
            {status.label}
          </div>
        </div>

        {/* Schedule Variance */}
        <div className="pt-3 border-t border-gray-200">
          <div className="text-xs text-gray-500 mb-1">Schedule Variance</div>
          <div className={`text-xl font-bold ${
            scheduleVariance >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {scheduleVariance >= 0 ? '+' : ''}{formatCurrency(scheduleVariance)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {scheduleVariance >= 0 ? 'Ahead of schedule' : 'Behind schedule'}
          </div>
        </div>

        {/* Visual Indicator */}
        <div className="pt-3 border-t border-gray-200">
          <div className="text-xs text-gray-500 mb-2">Schedule Progress</div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full ${
                spi >= 1.0 ? 'bg-green-500' :
                spi >= 0.9 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(spi * 100, 100)}%` }}
            />
          </div>
        </div>

        {targetJobId && (
          <Link
            to={`/jobs/${targetJobId}`}
            className="block text-center text-sm text-blue-600 hover:text-blue-500 pt-2 border-t border-gray-200"
          >
            View Schedule Details →
          </Link>
        )}
      </div>
    </Widget>
  )
}

