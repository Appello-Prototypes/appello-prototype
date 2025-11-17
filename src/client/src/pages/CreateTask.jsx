import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { api } from '../services/api'
import {
  DocumentTextIcon,
  ClockIcon,
  CurrencyDollarIcon,
  MapPinIcon
} from '@heroicons/react/24/outline'

export default function CreateTask() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [selectedProject, setSelectedProject] = useState('')
  
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      priority: 'medium',
      status: 'not_started',
      progressReportingMethod: 'percentage',
      category: 'insulation',
      craft: 'insulation'
    }
  })

  const watchedProject = watch('projectId')

  // Get all projects
  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get('/api/projects').then(res => res.data.data)
  })

  // Get jobs for the selected project
  const { data: jobs } = useQuery({
    queryKey: ['jobs', watchedProject],
    queryFn: () => api.get(`/api/jobs?projectId=${watchedProject}`).then(res => res.data.data),
    enabled: !!watchedProject
  })

  // Get job details when selected
  const watchedJob = watch('jobId')
  const { data: jobDetails } = useQuery({
    queryKey: ['job', watchedJob],
    queryFn: () => api.get(`/api/jobs/${watchedJob}`).then(res => res.data.data),
    enabled: !!watchedJob
  })

  // Get SOV components for the selected job
  const { data: sovComponents } = useQuery({
    queryKey: ['sov-components', watchedJob],
    queryFn: () => api.get(`/api/jobs/${watchedJob}/sov-components`).then(res => res.data.data),
    enabled: !!watchedJob
  })

  // Get users for assignment
  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/api/users').then(res => res.data.data)
  })

  const createTaskMutation = useMutation({
    mutationFn: (taskData) => api.post('/api/tasks', taskData),
    onSuccess: () => {
      toast.success('Task created successfully!')
      queryClient.invalidateQueries(['tasks'])
      navigate('/tasks')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create task')
    }
  })

  const onSubmit = (data) => {
    createTaskMutation.mutate(data)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl">
            Create New Task
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Create a task with full ICI contractor workflow integration
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <DocumentTextIcon className="h-5 w-5 mr-2 text-blue-600" />
            Basic Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Task Title *
              </label>
              <input
                {...register('title', { required: 'Title is required' })}
                type="text"
                className="form-input"
                placeholder="e.g., Hot Oil Header Insulation - ISO-HOS-001"
              />
              {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority *
              </label>
              <select {...register('priority')} className="form-select">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                {...register('description')}
                rows={3}
                className="form-textarea"
                placeholder="Detailed task description including specifications, requirements, and safety considerations..."
              />
            </div>
          </div>
        </div>

        {/* Project & Work Breakdown Structure */}
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <MapPinIcon className="h-5 w-5 mr-2 text-green-600" />
            Project & Work Breakdown Structure
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
                Job *
              </label>
              <select 
                {...register('jobId', { required: 'Job is required' })}
                className="form-select"
              >
                <option value="">Select Job</option>
                {jobs?.map(job => (
                  <option key={job._id} value={job._id}>
                    {job.jobNumber} - {job.name}
                  </option>
                ))}
              </select>
              {errors.jobId && <p className="mt-1 text-sm text-red-600">{errors.jobId.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assigned To *
              </label>
              <select 
                {...register('assignedTo', { required: 'Assignment is required' })}
                className="form-select"
              >
                <option value="">Select Worker</option>
                {users?.map(user => (
                  <option key={user._id} value={user._id}>
                    {user.name} ({user.role?.replace('_', ' ')})
                  </option>
                ))}
              </select>
              {errors.assignedTo && <p className="mt-1 text-sm text-red-600">{errors.assignedTo.message}</p>}
            </div>

            {jobDetails && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    System
                  </label>
                  <select {...register('systemId')} className="form-select">
                    <option value="">Select System</option>
                    {sovComponents?.systems?.map(system => (
                      <option key={system._id} value={system._id}>
                        {system.code} - {system.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Area
                  </label>
                  <select {...register('areaId')} className="form-select">
                    <option value="">Select Area</option>
                    {sovComponents?.areas?.map(area => (
                      <option key={area._id} value={area._id}>
                        {area.code} - {area.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phase
                  </label>
                  <select {...register('phaseId')} className="form-select">
                    <option value="">Select Phase</option>
                    {sovComponents?.phases?.map(phase => (
                      <option key={phase._id} value={phase._id}>
                        {phase.code} - {phase.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Module
                  </label>
                  <select {...register('moduleId')} className="form-select">
                    <option value="">Select Module</option>
                    {sovComponents?.modules?.map(module => (
                      <option key={module._id} value={module._id}>
                        {module.code} - {module.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Component
                  </label>
                  <select {...register('componentId')} className="form-select">
                    <option value="">Select Component</option>
                    {sovComponents?.components?.map(component => (
                      <option key={component._id} value={component._id}>
                        {component.code} - {component.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Test Package
                  </label>
                  <select {...register('testPackageId')} className="form-select">
                    <option value="">Select Test Package</option>
                    {jobDetails.testPackages?.map(pkg => (
                      <option key={pkg._id} value={pkg._id}>
                        {pkg.name} - {pkg.description}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Cost Code & Time Estimation */}
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <ClockIcon className="h-5 w-5 mr-2 text-purple-600" />
            Cost Code & Time Estimation
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
                {jobDetails?.costCodes?.map(code => (
                  <option key={code.code} value={code.code}>
                    {code.code} - {code.description}
                  </option>
                ))}
              </select>
              {errors.costCode && <p className="mt-1 text-sm text-red-600">{errors.costCode.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estimated Hours
              </label>
              <input
                {...register('estimatedHours', { min: 0 })}
                type="number"
                step="0.5"
                className="form-input"
                placeholder="8.0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select {...register('category')} className="form-select">
                <option value="insulation">Insulation</option>
                <option value="heat_tracing">Heat Tracing</option>
                <option value="fireproofing">Fireproofing</option>
                <option value="painting">Painting</option>
                <option value="jacketing">Jacketing</option>
                <option value="preparation">Preparation</option>
                <option value="inspection">Inspection</option>
                <option value="maintenance">Maintenance</option>
                <option value="safety">Safety</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Craft
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
          </div>
        </div>

        {/* Units and Progress Tracking */}
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <CurrencyDollarIcon className="h-5 w-5 mr-2 text-green-600" />
            Units & Progress Tracking
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Progress Method
              </label>
              <select {...register('progressReportingMethod')} className="form-select">
                <option value="percentage">Percentage Complete</option>
                <option value="units_installed">Units Installed</option>
                <option value="dollar_complete">Dollar Complete</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity to Install
              </label>
              <input
                {...register('unitsToInstall.quantity')}
                type="number"
                step="0.1"
                className="form-input"
                placeholder="240"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit of Measure
              </label>
              <select {...register('unitsToInstall.unit')} className="form-select">
                <option value="">Select Unit</option>
                <option value="LF">Linear Feet (LF)</option>
                <option value="SF">Square Feet (SF)</option>
                <option value="EA">Each (EA)</option>
                <option value="CY">Cubic Yards (CY)</option>
                <option value="TON">Tons (TON)</option>
                <option value="HR">Hours (HR)</option>
              </select>
            </div>

            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit Description
              </label>
              <input
                {...register('unitsToInstall.description')}
                type="text"
                className="form-input"
                placeholder="e.g., 12 inch pipe insulation with aluminum jacketing"
              />
            </div>
          </div>
        </div>

        {/* Schedule & Approval */}
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Schedule & Approval
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Due Date
              </label>
              <input
                {...register('dueDate')}
                type="datetime-local"
                className="form-input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                {...register('startDate')}
                type="datetime-local"
                className="form-input"
              />
            </div>

            <div className="md:col-span-2">
              <div className="flex items-center">
                <input
                  {...register('requiresFieldSupervisorApproval')}
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-900">
                  Requires Field Supervisor Approval
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Tags */}
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Tags & Notes
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tags (comma-separated)
              </label>
              <input
                {...register('tags')}
                type="text"
                className="form-input"
                placeholder="high-temp, mineral-wool, urgent"
              />
              <p className="mt-1 text-xs text-gray-500">
                Separate multiple tags with commas
              </p>
            </div>
          </div>
        </div>

        {/* Submit Buttons */}
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
            disabled={createTaskMutation.isLoading}
            className="btn-primary"
          >
            {createTaskMutation.isLoading ? 'Creating...' : 'Create Task'}
          </button>
        </div>
      </form>
    </div>
  )
}
