import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import {
  ClockIcon,
  BuildingOffice2Icon,
  CurrencyDollarIcon,
  UserIcon,
  CalendarIcon,
  WrenchScrewdriverIcon,
  CheckCircleIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'
import { api } from '../services/api'

export default function TimeEntry() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const taskId = searchParams.get('taskId')
  
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      date: format(new Date(), 'yyyy-MM-dd'),
      regularHours: 8,
      overtimeHours: 0,
      doubleTimeHours: 0,
      craft: 'insulation',
      category: 'concealed_pipe',
      entryMethod: 'web_portal'
    }
  })

  const watchedProject = watch('projectId')
  const watchedTask = watch('taskId')

  // Get projects for selection
  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get('/api/projects').then(res => res.data.data)
  })

  // Get project details when selected
  const { data: projectDetails } = useQuery({
    queryKey: ['project', watchedProject],
    queryFn: () => api.get(`/api/projects/${watchedProject}`).then(res => res.data.data),
    enabled: !!watchedProject
  })

  // Get tasks for the selected project
  const { data: projectTasks } = useQuery({
    queryKey: ['project-tasks', watchedProject],
    queryFn: () => api.get(`/api/tasks?projectId=${watchedProject}`).then(res => res.data.data.tasks),
    enabled: !!watchedProject
  })

  // Get task details if pre-selected
  const { data: selectedTask } = useQuery({
    queryKey: ['task', watchedTask || taskId],
    queryFn: () => api.get(`/api/tasks/${watchedTask || taskId}`).then(res => res.data.data),
    enabled: !!(watchedTask || taskId)
  })

  // Get users for worker selection
  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/api/users').then(res => res.data.data)
  })

  const createTimeEntryMutation = useMutation({
    mutationFn: (data) => api.post('/api/time-entries', data),
    onSuccess: () => {
      toast.success('Time entry logged successfully!')
      queryClient.invalidateQueries(['time-entries'])
      queryClient.invalidateQueries(['project-cost-codes'])
      navigate('/my-tasks')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to log time entry')
    }
  })

  React.useEffect(() => {
    if (selectedTask) {
      setValue('projectId', selectedTask.projectId)
      setValue('taskId', selectedTask._id)
      setValue('costCode', selectedTask.costCode)
      setValue('craft', selectedTask.craft)
      setValue('category', selectedTask.category)
      setValue('workDescription', `Work on ${selectedTask.title}`)
    }
  }, [selectedTask, setValue])

  const onSubmit = (data) => {
    // Calculate total hours
    const totalHours = (data.regularHours || 0) + (data.overtimeHours || 0) + (data.doubleTimeHours || 0)
    
    const timeEntryData = {
      ...data,
      totalHours,
      workerId: '691a47f0ffde71091f637a09', // Demo user ID - Mike Worker
      status: 'submitted'
    }
    
    createTimeEntryMutation.mutate(timeEntryData)
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
            <h1 className="text-2xl font-bold text-gray-900">Log Time Entry</h1>
            <p className="text-sm text-gray-500">
              Record your work hours against specific cost codes
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <CalendarIcon className="h-5 w-5 mr-2 text-blue-600" />
            Date & Worker Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Work Date *
              </label>
              <input
                {...register('date', { required: 'Date is required' })}
                type="date"
                className="form-input"
              />
              {errors.date && <p className="mt-1 text-sm text-red-600">{errors.date.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Worker
              </label>
              <select {...register('workerId')} className="form-select">
                <option value="691a47f0ffde71091f637a09">Mike Worker (Demo)</option>
                {users?.filter(u => u.role === 'field_worker').map(user => (
                  <option key={user._id} value={user._id}>
                    {user.name} ({user.position})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Project & Task Selection */}
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <BuildingOffice2Icon className="h-5 w-5 mr-2 text-green-600" />
            Project & Task
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project *
              </label>
              <select 
                {...register('projectId', { required: 'Project is required' })}
                className="form-select"
              >
                <option value="">Select Project</option>
                {projects?.map(project => (
                  <option key={project._id} value={project._id}>
                    {project.projectNumber} - {project.name}
                  </option>
                ))}
              </select>
              {errors.projectId && <p className="mt-1 text-sm text-red-600">{errors.projectId.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Task (Optional)
              </label>
              <select {...register('taskId')} className="form-select">
                <option value="">Select Task</option>
                {projectTasks?.map(task => (
                  <option key={task._id} value={task._id}>
                    {task.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Cost Code & Work Details */}
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <CurrencyDollarIcon className="h-5 w-5 mr-2 text-purple-600" />
            Cost Code & Work Details
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cost Code *
              </label>
              <select 
                {...register('costCode', { required: 'Cost code is required' })}
                className="form-select"
              >
                <option value="">Select Cost Code</option>
                {projectDetails?.costCodes?.map(code => (
                  <option key={code.code} value={code.code}>
                    {code.code} - {code.description}
                  </option>
                ))}
              </select>
              {errors.costCode && <p className="mt-1 text-sm text-red-600">{errors.costCode.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Craft *
              </label>
              <select {...register('craft')} className="form-select">
                <option value="insulation">Insulation</option>
                <option value="painting">Painting</option>
                <option value="heat_tracing">Heat Tracing</option>
                <option value="fireproofing">Fireproofing</option>
                <option value="general">General</option>
                <option value="equipment">Equipment</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Work Category
              </label>
              <select {...register('category')} className="form-select">
                <option value="concealed_pipe">Concealed Pipe</option>
                <option value="exposed_pipe">Exposed Pipe</option>
                <option value="equipment">Equipment</option>
                <option value="ductwork">Ductwork</option>
                <option value="vessels">Vessels</option>
                <option value="valves">Valves</option>
                <option value="preparation">Preparation</option>
                <option value="cleanup">Cleanup</option>
                <option value="material_handling">Material Handling</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location/Area
              </label>
              <input
                {...register('location.area')}
                className="form-input"
                placeholder="e.g., Unit 200A, Pipe Rack Level 1"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Work Description *
              </label>
              <textarea
                {...register('workDescription', { required: 'Work description is required' })}
                rows={3}
                className="form-textarea"
                placeholder="Describe the work performed, materials used, and any issues encountered..."
              />
              {errors.workDescription && <p className="mt-1 text-sm text-red-600">{errors.workDescription.message}</p>}
            </div>
          </div>
        </div>

        {/* Time Breakdown */}
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <ClockIcon className="h-5 w-5 mr-2 text-orange-600" />
            Time Breakdown
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Regular Hours *
              </label>
              <input
                {...register('regularHours', { 
                  required: 'Regular hours is required',
                  min: { value: 0, message: 'Hours must be positive' },
                  max: { value: 24, message: 'Cannot exceed 24 hours' }
                })}
                type="number"
                step="0.25"
                className="form-input"
              />
              {errors.regularHours && <p className="mt-1 text-sm text-red-600">{errors.regularHours.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Overtime Hours
              </label>
              <input
                {...register('overtimeHours', { 
                  min: { value: 0, message: 'Hours must be positive' },
                  max: { value: 12, message: 'Cannot exceed 12 hours' }
                })}
                type="number"
                step="0.25"
                className="form-input"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Double Time Hours
              </label>
              <input
                {...register('doubleTimeHours', { 
                  min: { value: 0, message: 'Hours must be positive' },
                  max: { value: 8, message: 'Cannot exceed 8 hours' }
                })}
                type="number"
                step="0.25"
                className="form-input"
                placeholder="0"
              />
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-gray-700">Total Hours:</span>
              <span className="font-bold text-gray-900">
                {(watch('regularHours') || 0) + (watch('overtimeHours') || 0) + (watch('doubleTimeHours') || 0)} hours
              </span>
            </div>
          </div>
        </div>

        {/* Units Completed */}
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <WrenchScrewdriverIcon className="h-5 w-5 mr-2 text-green-600" />
            Units Completed (Optional)
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity Completed
              </label>
              <input
                {...register('unitsCompleted.quantity')}
                type="number"
                step="0.1"
                className="form-input"
                placeholder="120"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit of Measure
              </label>
              <select {...register('unitsCompleted.unit')} className="form-select">
                <option value="">Select Unit</option>
                <option value="LF">Linear Feet (LF)</option>
                <option value="SF">Square Feet (SF)</option>
                <option value="EA">Each (EA)</option>
                <option value="CY">Cubic Yards (CY)</option>
                <option value="TON">Tons (TON)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit Description
              </label>
              <input
                {...register('unitsCompleted.description')}
                className="form-input"
                placeholder="e.g., 12 inch pipe insulation"
              />
            </div>
          </div>
        </div>

        {/* Weather & Conditions */}
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Weather & Site Conditions (Optional)
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Temperature (°F)
              </label>
              <input
                {...register('weatherConditions.temperature')}
                type="number"
                className="form-input"
                placeholder="72"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Weather Conditions
              </label>
              <select {...register('weatherConditions.conditions')} className="form-select">
                <option value="">Select Conditions</option>
                <option value="sunny">Sunny</option>
                <option value="cloudy">Cloudy</option>
                <option value="rainy">Rainy</option>
                <option value="snowy">Snowy</option>
                <option value="windy">Windy</option>
                <option value="extreme_heat">Extreme Heat</option>
                <option value="extreme_cold">Extreme Cold</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Wind Speed (mph)
              </label>
              <input
                {...register('weatherConditions.windSpeed')}
                type="number"
                className="form-input"
                placeholder="5"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createTimeEntryMutation.isLoading}
            className="btn-primary"
          >
            <CheckCircleIcon className="h-4 w-4 mr-2" />
            {createTimeEntryMutation.isLoading ? 'Logging...' : 'Log Time Entry'}
          </button>
        </div>
      </form>

      {/* Quick Reference */}
      {selectedTask && (
        <div className="card p-6 bg-blue-50">
          <h4 className="font-medium text-blue-900 mb-2">Task Reference</h4>
          <div className="text-sm text-blue-800">
            <p><strong>Task:</strong> {selectedTask.title}</p>
            <p><strong>Cost Code:</strong> {selectedTask.costCode}</p>
            {selectedTask.estimatedHours && (
              <p><strong>Estimated Hours:</strong> {selectedTask.estimatedHours}</p>
            )}
            {selectedTask.unitsToInstall?.quantity && (
              <p><strong>Units to Install:</strong> {selectedTask.unitsToInstall.quantity} {selectedTask.unitsToInstall.unit}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
