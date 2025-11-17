import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import {
  ChartBarIcon,
  BuildingOffice2Icon,
  CurrencyDollarIcon,
  ClockIcon,
  CheckCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import { api } from '../services/api'

export default function ProgressReport() {
  const { projectId } = useParams()
  const queryClient = useQueryClient()
  const [editingItem, setEditingItem] = useState(null)

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => api.get(`/api/projects/${projectId}`).then(res => res.data.data),
    enabled: !!projectId
  })

  const { data: progressReport, isLoading: progressLoading } = useQuery({
    queryKey: ['progress-report', projectId],
    queryFn: () => api.get(`/api/projects/${projectId}/progress-report`).then(res => res.data.data),
    enabled: !!projectId
  })

  const { data: scheduleOfValues, isLoading: sovLoading } = useQuery({
    queryKey: ['schedule-of-values', projectId],
    queryFn: () => api.get(`/api/projects/${projectId}/schedule-of-values`).then(res => res.data.data),
    enabled: !!projectId
  })

  const { register, handleSubmit, reset, setValue } = useForm()

  const updateProgressMutation = useMutation({
    mutationFn: ({ systemId, areaId, progressPercentage }) => {
      // In a real implementation, this would update specific system/area progress
      return api.put(`/api/projects/${projectId}/progress`, {
        systemId,
        areaId,
        progressPercentage
      })
    },
    onSuccess: () => {
      toast.success('Progress updated successfully!')
      queryClient.invalidateQueries(['progress-report', projectId])
      setEditingItem(null)
    },
    onError: (error) => {
      toast.error('Failed to update progress')
    }
  })

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const getProgressColor = (percentage) => {
    if (percentage >= 90) return 'bg-green-500'
    if (percentage >= 70) return 'bg-blue-500'
    if (percentage >= 50) return 'bg-yellow-500'
    if (percentage >= 25) return 'bg-orange-500'
    return 'bg-red-500'
  }

  const handleProgressEdit = (item) => {
    setEditingItem(item)
    setValue('progressPercentage', item.progressPercentage)
  }

  const onSubmit = (data) => {
    if (editingItem) {
      updateProgressMutation.mutate({
        systemId: editingItem.systemId,
        areaId: editingItem.areaId,
        progressPercentage: data.progressPercentage
      })
    }
  }

  if (projectLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="card p-6">
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900">Project not found</h3>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Progress Report</h1>
            <p className="text-sm text-gray-500">
              {project.name} • {project.projectNumber}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-gray-900">{project.overallProgress}%</div>
            <p className="text-sm text-gray-500">Overall Progress</p>
            <p className="text-xs text-gray-400">
              Report Date: {format(new Date(), 'MMM d, yyyy h:mm a')}
            </p>
          </div>
        </div>

        {/* Overall Progress Bar */}
        <div className="mt-6">
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div
              className={`h-4 rounded-full transition-all duration-500 ${getProgressColor(project.overallProgress)}`}
              style={{ width: `${project.overallProgress}%` }}
            ></div>
          </div>
          <div className="mt-2 flex justify-between text-sm text-gray-600">
            <span>Contract Value: {formatCurrency(project.contractValue)}</span>
            <span>Earned Value: {formatCurrency(project.earnedValue || 0)}</span>
          </div>
        </div>
      </div>

      {/* Progress by System & Area */}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Progress by System & Area</h3>
          <p className="text-sm text-gray-500">
            Field supervisor progress reporting for billing and earned value calculations
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  System
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Area
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Progress
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tasks
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Earned Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {progressLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-12"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20"></div></td>
                    <td className="px-6 py-4"><div className="h-8 bg-gray-200 rounded w-16"></div></td>
                  </tr>
                ))
              ) : progressReport?.breakdown?.length > 0 ? (
                progressReport.breakdown.map((item) => (
                  <tr key={`${item.system}-${item.area}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{item.system}</div>
                        <div className="text-sm text-gray-500">{item.systemCode}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{item.area}</div>
                        <div className="text-sm text-gray-500">{item.areaCode}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className={`h-2 rounded-full ${getProgressColor(item.progressPercentage)}`}
                            style={{ width: `${item.progressPercentage}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {item.progressPercentage}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.completedTasks}/{item.totalTasks}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(item.earnedValue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleProgressEdit(item)}
                        className="text-blue-600 hover:text-blue-500 text-sm font-medium"
                      >
                        Update
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center">
                    <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No progress data</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Progress will appear as tasks are completed
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Schedule of Values Progress */}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Schedule of Values Progress</h3>
          <p className="text-sm text-gray-500">
            Line item progress for client billing and earned value
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Line Item
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Progress
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Earned Value
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sovLoading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-40"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                  </tr>
                ))
              ) : scheduleOfValues?.length > 0 ? (
                scheduleOfValues.map((item) => (
                  <tr key={item._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{item.lineItem}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{item.description}</div>
                      <div className="text-sm text-gray-500">
                        {item.quantity} {item.unit} @ {formatCurrency(item.unitPrice)}/{item.unit}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(item.totalValue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className={`h-2 rounded-full ${getProgressColor(item.progressPercentage || 0)}`}
                            style={{ width: `${item.progressPercentage || 0}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {item.progressPercentage || 0}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                      {formatCurrency(item.earnedValue || 0)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center">
                    <CurrencyDollarIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No schedule of values data</h3>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Progress Update Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Update Progress: {editingItem.system} - {editingItem.area}
            </h3>
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Progress Percentage
                </label>
                <input
                  {...register('progressPercentage', { 
                    required: 'Progress percentage is required',
                    min: { value: 0, message: 'Must be at least 0%' },
                    max: { value: 100, message: 'Cannot exceed 100%' }
                  })}
                  type="number"
                  min="0"
                  max="100"
                  className="form-input"
                />
              </div>
              
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-sm text-gray-600">
                  <p><strong>System:</strong> {editingItem.system}</p>
                  <p><strong>Area:</strong> {editingItem.area}</p>
                  <p><strong>Current Progress:</strong> {editingItem.progressPercentage}%</p>
                  <p><strong>Tasks:</strong> {editingItem.completedTasks}/{editingItem.totalTasks} completed</p>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={updateProgressMutation.isLoading}
                >
                  <ArrowPathIcon className="h-4 w-4 mr-2" />
                  Update Progress
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-6 text-center">
          <div className="text-2xl font-bold text-blue-600">
            {project.systems?.length || 0}
          </div>
          <div className="text-sm text-gray-500">Systems</div>
        </div>
        
        <div className="card p-6 text-center">
          <div className="text-2xl font-bold text-green-600">
            {project.areas?.length || 0}
          </div>
          <div className="text-sm text-gray-500">Areas</div>
        </div>
        
        <div className="card p-6 text-center">
          <div className="text-2xl font-bold text-purple-600">
            {scheduleOfValues?.length || 0}
          </div>
          <div className="text-sm text-gray-500">SOV Line Items</div>
        </div>
        
        <div className="card p-6 text-center">
          <div className="text-2xl font-bold text-orange-600">
            {formatCurrency(
              scheduleOfValues?.reduce((sum, item) => sum + (item.earnedValue || 0), 0) || 0
            )}
          </div>
          <div className="text-sm text-gray-500">Total Earned</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="btn-primary">
            <CheckCircleIcon className="h-4 w-4 mr-2" />
            Submit Progress Report
          </button>
          
          <button className="btn-secondary">
            <ChartBarIcon className="h-4 w-4 mr-2" />
            Generate Invoice
          </button>
          
          <button className="btn-secondary">
            <ClockIcon className="h-4 w-4 mr-2" />
            Time Summary
          </button>
        </div>
      </div>
    </div>
  )
}
