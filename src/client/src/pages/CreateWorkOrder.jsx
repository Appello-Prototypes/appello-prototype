import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  ArrowLeftIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { workOrderAPI, jobAPI } from '../services/api'

export default function CreateWorkOrder() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const jobId = searchParams.get('jobId')
  const queryClient = useQueryClient()

  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm({
    defaultValues: {
      jobId: jobId || '',
      title: '',
      description: '',
      issuedBy: '',
      priority: 'medium',
      status: 'draft',
      estimatedHours: '',
      dueDate: ''
    }
  })

  const { data: jobData } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => jobAPI.getJob(jobId).then(res => res.data.data),
    enabled: !!jobId,
    staleTime: 5 * 60 * 1000
  })

  const createMutation = useMutation({
    mutationFn: (data) => workOrderAPI.createWorkOrder(data),
    onSuccess: (response) => {
      toast.success('Work order created successfully!')
      queryClient.invalidateQueries(['work-orders'])
      navigate(`/work-orders/${response.data.data._id}`)
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create work order')
    }
  })

  const onSubmit = (data) => {
    // Process form data
    const workOrderData = {
      ...data,
      jobId: data.jobId || jobId,
      projectId: jobData?.projectId,
      estimatedHours: data.estimatedHours ? parseFloat(data.estimatedHours) : undefined,
      dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : undefined,
      issuedDate: new Date().toISOString(),
      receivedDate: new Date().toISOString()
    }

    createMutation.mutate(workOrderData)
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
            <h1 className="text-2xl font-bold text-gray-900">Create Work Order</h1>
            {jobData && (
              <p className="text-sm text-gray-500 mt-1">
                {jobData.name} ({jobData.jobNumber})
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-6">
        {/* Basic Information */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                {...register('title', { required: 'Title is required' })}
                type="text"
                className="form-input"
                placeholder="Enter work order title"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                {...register('description')}
                rows={4}
                className="form-textarea"
                placeholder="Enter work order description"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Issued By <span className="text-red-500">*</span>
              </label>
              <input
                {...register('issuedBy', { required: 'Issued by is required' })}
                type="text"
                className="form-input"
                placeholder="Client/GC name"
              />
              {errors.issuedBy && (
                <p className="mt-1 text-sm text-red-600">{errors.issuedBy.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select {...register('priority')} className="form-select">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select {...register('status')} className="form-select">
                <option value="draft">Draft</option>
                <option value="pending">Pending</option>
                <option value="issued">Issued</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Due Date
              </label>
              <input
                {...register('dueDate')}
                type="date"
                className="form-input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estimated Hours
              </label>
              <input
                {...register('estimatedHours')}
                type="number"
                step="0.5"
                min="0"
                className="form-input"
                placeholder="0"
              />
            </div>
          </div>
        </div>

        {/* Scope of Work */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Scope of Work</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Scope of Work
            </label>
            <textarea
              {...register('scopeOfWork')}
              rows={6}
              className="form-textarea"
              placeholder="Describe the scope of work in detail..."
            />
          </div>
        </div>

        {/* Specifications */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Specifications</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Specifications
            </label>
            <textarea
              {...register('specifications')}
              rows={6}
              className="form-textarea"
              placeholder="Enter specifications, requirements, or special instructions..."
            />
          </div>
        </div>

        {/* Hidden jobId field */}
        {jobId && (
          <input type="hidden" {...register('jobId')} value={jobId} />
        )}

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={createMutation.isLoading}
          >
            {createMutation.isLoading ? 'Creating...' : 'Create Work Order'}
          </button>
        </div>
      </form>
    </div>
  )
}

