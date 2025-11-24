import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeftIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import { Link } from 'react-router-dom'
import { materialRequestAPI, jobAPI, productAPI } from '../services/api'
import toast from 'react-hot-toast'

const UNITS = ['EA', 'FT', 'M', 'BOX', 'ROLL', 'SQ_FT', 'GAL', 'LB', 'KG', 'OTHER']
const PRIORITIES = ['urgent', 'standard', 'low']
const DELIVERY_LOCATIONS = ['jobsite', 'warehouse', 'pick_up']

export default function MaterialRequestForm() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [formData, setFormData] = useState({
    jobId: '',
    requiredByDate: '',
    priority: 'standard',
    deliveryLocation: 'jobsite',
    deliveryAddress: '',
    deliveryNotes: '',
    lineItems: [],
  })

  const { data: jobs } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => jobAPI.getJobs().then(res => res.data.data),
  })

  const mutation = useMutation({
    mutationFn: (data) => materialRequestAPI.createMaterialRequest(data),
    onSuccess: () => {
      toast.success('Material request created successfully')
      queryClient.invalidateQueries(['material-requests'])
      navigate('/material-requests')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create material request')
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (formData.lineItems.length === 0) {
      toast.error('Please add at least one line item')
      return
    }
    mutation.mutate(formData)
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const addLineItem = () => {
    setFormData(prev => ({
      ...prev,
      lineItems: [...prev.lineItems, {
        productName: '',
        description: '',
        quantity: '',
        unit: 'EA',
        notes: '',
      }]
    }))
  }

  const updateLineItem = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      lineItems: prev.lineItems.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }))
  }

  const removeLineItem = (index) => {
    setFormData(prev => ({
      ...prev,
      lineItems: prev.lineItems.filter((_, i) => i !== index)
    }))
  }

  // Auto-populate delivery address when job is selected
  React.useEffect(() => {
    if (formData.jobId && jobs) {
      const selectedJob = jobs.find(j => j._id === formData.jobId)
      if (selectedJob && selectedJob.address) {
        const address = selectedJob.address
        const addressStr = [
          address.street,
          address.city,
          address.province,
          address.postalCode
        ].filter(Boolean).join(', ')
        if (addressStr) {
          setFormData(prev => ({ ...prev, deliveryAddress: addressStr }))
        }
      }
    }
  }, [formData.jobId, jobs])

  return (
    <div>
      <div className="mb-6">
        <Link
          to="/material-requests"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Material Requests
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">New Material Request</h1>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Request Information</h2>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Job *
              </label>
              <select
                name="jobId"
                value={formData.jobId}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Select a job</option>
                {jobs?.map((job) => (
                  <option key={job._id} value={job._id}>
                    {job.jobNumber || job.name} - {job.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Required By Date *
              </label>
              <input
                type="date"
                name="requiredByDate"
                value={formData.requiredByDate}
                onChange={handleChange}
                required
                min={new Date().toISOString().split('T')[0]}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Priority *
              </label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                {PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Delivery Location *
              </label>
              <select
                name="deliveryLocation"
                value={formData.deliveryLocation}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                {DELIVERY_LOCATIONS.map((location) => (
                  <option key={location} value={location}>
                    {location.charAt(0).toUpperCase() + location.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Delivery Address
              </label>
              <input
                type="text"
                name="deliveryAddress"
                value={formData.deliveryAddress}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Delivery Notes
              </label>
              <textarea
                name="deliveryNotes"
                value={formData.deliveryNotes}
                onChange={handleChange}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            {/* Line Items */}
            <div className="md:col-span-2 mt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900">Line Items</h2>
                <button
                  type="button"
                  onClick={addLineItem}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <PlusIcon className="h-5 w-5 mr-1" />
                  Add Item
                </button>
              </div>

              {formData.lineItems.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                  <p className="text-gray-500">No line items added yet</p>
                  <button
                    type="button"
                    onClick={addLineItem}
                    className="mt-2 text-blue-600 hover:text-blue-700"
                  >
                    Add your first item
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.lineItems.map((item, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        <div className="md:col-span-4">
                          <label className="block text-sm font-medium text-gray-700">
                            Product Name *
                          </label>
                          <input
                            type="text"
                            value={item.productName || ''}
                            onChange={(e) => updateLineItem(index, 'productName', e.target.value)}
                            required
                            placeholder="e.g., 2x4 Lumber"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Description
                          </label>
                          <input
                            type="text"
                            value={item.description || ''}
                            onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                            placeholder="Optional details"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Quantity *
                          </label>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateLineItem(index, 'quantity', e.target.value)}
                            required
                            min="0"
                            step="0.01"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Unit *
                          </label>
                          <select
                            value={item.unit}
                            onChange={(e) => updateLineItem(index, 'unit', e.target.value)}
                            required
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          >
                            {UNITS.map((unit) => (
                              <option key={unit} value={unit}>
                                {unit}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Notes
                          </label>
                          <input
                            type="text"
                            value={item.notes || ''}
                            onChange={(e) => updateLineItem(index, 'notes', e.target.value)}
                            placeholder="Additional notes"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                        <div className="md:col-span-2 flex items-end">
                          <button
                            type="button"
                            onClick={() => removeLineItem(index)}
                            className="w-full px-3 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50"
                          >
                            <TrashIcon className="h-5 w-5 mx-auto" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <Link
              to="/material-requests"
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={mutation.isLoading || formData.lineItems.length === 0}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {mutation.isLoading ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

