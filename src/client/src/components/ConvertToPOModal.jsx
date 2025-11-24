import React, { useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { useQuery } from '@tanstack/react-query'
import { companyAPI, jobAPI } from '../services/api'

export default function ConvertToPOModal({ isOpen, onClose, onConvert, jobId, isLoading }) {
  const [supplierId, setSupplierId] = useState('')
  const [defaultCostCode, setDefaultCostCode] = useState('')

  // Fetch suppliers
  const { data: suppliers, isLoading: suppliersLoading } = useQuery({
    queryKey: ['companies', 'supplier'],
    queryFn: async () => {
      const response = await companyAPI.getCompanies({ companyType: 'supplier' })
      return response.data.data || []
    },
    enabled: isOpen,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })

  // Fetch job details to get cost codes
  const { data: job } = useQuery({
    queryKey: ['job', jobId],
    queryFn: async () => {
      const response = await jobAPI.getJob(jobId)
      return response.data.data
    },
    enabled: isOpen && !!jobId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })

  const costCodes = job?.costCodes || []

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!supplierId) {
      return
    }
    onConvert({ supplierId, defaultCostCode: defaultCostCode || undefined })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-6 border w-full max-w-md shadow-xl rounded-lg bg-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900">Convert to Purchase Order</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isLoading}
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Supplier <span className="text-red-500">*</span>
            </label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              required
              disabled={isLoading || suppliersLoading}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">Select a supplier...</option>
              {suppliers?.map((supplier) => (
                <option key={supplier._id} value={supplier._id}>
                  {supplier.name}
                  {supplier.contactPerson?.name && ` - ${supplier.contactPerson.name}`}
                </option>
              ))}
            </select>
            {suppliersLoading && (
              <p className="mt-1 text-xs text-gray-500">Loading suppliers...</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Default Cost Code
            </label>
            {costCodes.length > 0 ? (
              <select
                value={defaultCostCode}
                onChange={(e) => setDefaultCostCode(e.target.value)}
                disabled={isLoading}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Select a cost code (optional)</option>
                {costCodes.map((code) => (
                  <option key={code.code} value={code.code}>
                    {code.code} - {code.description || code.name || 'No description'}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={defaultCostCode}
                onChange={(e) => setDefaultCostCode(e.target.value)}
                placeholder="Enter cost code (optional)"
                disabled={isLoading}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            )}
            <p className="mt-1 text-xs text-gray-500">
              {costCodes.length > 0 
                ? 'Select a cost code from the job, or leave blank'
                : 'Enter a cost code if needed'}
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !supplierId || suppliersLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating...' : 'Create Purchase Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

