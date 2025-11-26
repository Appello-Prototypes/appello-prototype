import React, { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { XMarkIcon, ArrowRightIcon } from '@heroicons/react/24/outline'
import { inventoryAPI, jobAPI } from '../../services/api'
import toast from 'react-hot-toast'

/**
 * Issue Inventory to Job Modal
 * 
 * Allows users to issue inventory items to jobs with cost code assignment
 */
export default function IssueInventoryModal({ isOpen, onClose, inventory }) {
  const queryClient = useQueryClient()
  const [jobId, setJobId] = useState('')
  const [costCode, setCostCode] = useState('')
  const [quantity, setQuantity] = useState('')
  const [selectedSerialNumbers, setSelectedSerialNumbers] = useState([])
  const [notes, setNotes] = useState('')

  const isBulk = inventory?.inventoryType === 'bulk'
  const availableQuantity = inventory?.quantityAvailable || 0
  const availableSerialized = inventory?.serializedUnits?.filter(u => u.status === 'available') || []

  // Fetch jobs for dropdown
  const { data: jobsData } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => jobAPI.getJobs().then(res => res.data.data),
    enabled: isOpen
  })

  const issueMutation = useMutation({
    mutationFn: (data) => inventoryAPI.addTransaction(inventory._id, data),
    onSuccess: () => {
      toast.success('Inventory issued successfully')
      queryClient.invalidateQueries(['inventory'])
      queryClient.invalidateQueries(['inventory-product', inventory?.productId?._id])
      queryClient.invalidateQueries(['inventory', inventory?._id])
      onClose()
      // Reset form
      setJobId('')
      setCostCode('')
      setQuantity('')
      setSelectedSerialNumbers([])
      setNotes('')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to issue inventory')
    }
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!jobId) {
      toast.error('Please select a job')
      return
    }

    if (isBulk) {
      const qty = parseFloat(quantity)
      if (!qty || qty <= 0) {
        toast.error('Please enter a valid quantity')
        return
      }
      if (qty > availableQuantity) {
        toast.error(`Insufficient quantity. Available: ${availableQuantity}`)
        return
      }
    } else {
      if (selectedSerialNumbers.length === 0) {
        toast.error('Please select at least one serialized unit')
        return
      }
    }

    const transactionData = {
      type: 'issue',
      quantity: isBulk ? -parseFloat(quantity) : -selectedSerialNumbers.length,
      serialNumbers: isBulk ? [] : selectedSerialNumbers,
      referenceType: 'work_order',
      referenceId: jobId,
      notes: notes.trim() || undefined
    }

    issueMutation.mutate(transactionData)
  }

  const toggleSerialNumber = (serialNumber) => {
    setSelectedSerialNumbers(prev => 
      prev.includes(serialNumber)
        ? prev.filter(s => s !== serialNumber)
        : [...prev, serialNumber]
    )
  }

  if (!isOpen || !inventory) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-6 border w-full max-w-2xl shadow-xl rounded-lg bg-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <ArrowRightIcon className="h-6 w-6 text-blue-600" />
            <h3 className="text-xl font-semibold text-gray-900">Issue Inventory to Job</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={issueMutation.isLoading}
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Product Info */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium text-gray-900">
            {inventory.productId?.name || 'Unknown Product'}
          </p>
          {isBulk ? (
            <p className="text-xs text-gray-500 mt-1">
              Available: <span className="font-medium text-blue-600">{availableQuantity}</span> {inventory.productId?.unitOfMeasure || ''}
            </p>
          ) : (
            <p className="text-xs text-gray-500 mt-1">
              Available Units: <span className="font-medium text-blue-600">{availableSerialized.length}</span>
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Job Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Job <span className="text-red-500">*</span>
            </label>
            <select
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={issueMutation.isLoading}
            >
              <option value="">Select a job...</option>
              {jobsData?.map((job) => (
                <option key={job._id} value={job._id}>
                  {job.jobNumber} - {job.name}
                </option>
              ))}
            </select>
          </div>

          {/* Cost Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cost Code (optional)
            </label>
            <input
              type="text"
              value={costCode}
              onChange={(e) => setCostCode(e.target.value.toUpperCase())}
              placeholder="e.g., 01-100"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={issueMutation.isLoading}
            />
          </div>

          {/* Quantity (Bulk) or Serial Numbers (Serialized) */}
          {isBulk ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity to Issue <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={availableQuantity}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={issueMutation.isLoading}
              />
              <p className="mt-1 text-xs text-gray-500">
                Maximum: {availableQuantity} {inventory.productId?.unitOfMeasure || ''}
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Serialized Units <span className="text-red-500">*</span>
              </label>
              <div className="border border-gray-300 rounded-md p-3 max-h-64 overflow-y-auto">
                {availableSerialized.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No available units</p>
                ) : (
                  <div className="space-y-2">
                    {availableSerialized.map((unit) => (
                      <label
                        key={unit.serialNumber}
                        className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedSerialNumbers.includes(unit.serialNumber)}
                          onChange={() => toggleSerialNumber(unit.serialNumber)}
                          className="mr-3"
                          disabled={issueMutation.isLoading}
                        />
                        <div className="flex-1">
                          <span className="text-sm font-medium text-gray-900">{unit.serialNumber}</span>
                          {unit.location && (
                            <span className="text-xs text-gray-500 ml-2">({unit.location})</span>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              {selectedSerialNumbers.length > 0 && (
                <p className="mt-2 text-xs text-blue-600">
                  {selectedSerialNumbers.length} unit{selectedSerialNumbers.length !== 1 ? 's' : ''} selected
                </p>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Additional notes about this issue..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={issueMutation.isLoading}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              disabled={issueMutation.isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={issueMutation.isLoading || !jobId || (isBulk && !quantity) || (!isBulk && selectedSerialNumbers.length === 0)}
            >
              {issueMutation.isLoading ? 'Issuing...' : 'Issue Inventory'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

