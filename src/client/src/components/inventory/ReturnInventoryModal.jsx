import React, { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { XMarkIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'
import { inventoryAPI, jobAPI } from '../../services/api'
import toast from 'react-hot-toast'

/**
 * Return Inventory from Job Modal
 * 
 * Allows users to return inventory items from jobs back to inventory
 */
export default function ReturnInventoryModal({ isOpen, onClose, inventory, jobId: preselectedJobId }) {
  const queryClient = useQueryClient()
  const [jobId, setJobId] = useState(preselectedJobId || '')
  const [quantity, setQuantity] = useState('')
  const [selectedSerialNumbers, setSelectedSerialNumbers] = useState([])
  const [condition, setCondition] = useState('good')
  const [location, setLocation] = useState(inventory?.primaryLocation || '')
  const [notes, setNotes] = useState('')

  const isBulk = inventory?.inventoryType === 'bulk'

  // Fetch jobs for dropdown
  const { data: jobsData } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => jobAPI.getJobs().then(res => res.data.data),
    enabled: isOpen
  })

  // Fetch issued inventory for selected job (if we had this endpoint)
  // For now, we'll let user manually enter quantities

  const returnMutation = useMutation({
    mutationFn: (data) => inventoryAPI.addTransaction(inventory._id, data),
    onSuccess: () => {
      toast.success('Inventory returned successfully')
      queryClient.invalidateQueries(['inventory'])
      queryClient.invalidateQueries(['inventory-product', inventory?.productId?._id])
      queryClient.invalidateQueries(['inventory', inventory?._id])
      onClose()
      // Reset form
      setJobId('')
      setQuantity('')
      setSelectedSerialNumbers([])
      setCondition('good')
      setLocation(inventory?.primaryLocation || '')
      setNotes('')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to return inventory')
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
    } else {
      if (selectedSerialNumbers.length === 0) {
        toast.error('Please select at least one serialized unit')
        return
      }
    }

    if (!location.trim()) {
      toast.error('Please enter a return location')
      return
    }

    const transactionData = {
      type: 'return',
      quantity: isBulk ? parseFloat(quantity) : selectedSerialNumbers.length,
      serialNumbers: isBulk ? [] : selectedSerialNumbers,
      referenceType: 'work_order',
      referenceId: jobId,
      toLocation: location.trim(),
      notes: notes.trim() || condition !== 'good' ? `Returned in ${condition} condition. ${notes.trim()}` : undefined
    }

    returnMutation.mutate(transactionData)
  }

  const toggleSerialNumber = (serialNumber) => {
    setSelectedSerialNumbers(prev => 
      prev.includes(serialNumber)
        ? prev.filter(s => s !== serialNumber)
        : [...prev, serialNumber]
    )
  }

  if (!isOpen || !inventory) return null

  // For serialized items, show units that are assigned/in_use
  const issuedSerialized = inventory?.serializedUnits?.filter(u => 
    u.status === 'assigned' || u.status === 'in_use'
  ) || []

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-6 border w-full max-w-2xl shadow-xl rounded-lg bg-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <ArrowLeftIcon className="h-6 w-6 text-green-600" />
            <h3 className="text-xl font-semibold text-gray-900">Return Inventory from Job</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={returnMutation.isLoading}
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Product Info */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium text-gray-900">
            {inventory.productId?.name || 'Unknown Product'}
          </p>
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
              disabled={returnMutation.isLoading || !!preselectedJobId}
            >
              <option value="">Select a job...</option>
              {jobsData?.map((job) => (
                <option key={job._id} value={job._id}>
                  {job.jobNumber} - {job.name}
                </option>
              ))}
            </select>
          </div>

          {/* Quantity (Bulk) or Serial Numbers (Serialized) */}
          {isBulk ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity to Return <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={returnMutation.isLoading}
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Units to Return <span className="text-red-500">*</span>
              </label>
              {issuedSerialized.length === 0 ? (
                <div className="border border-gray-300 rounded-md p-4 text-center">
                  <p className="text-sm text-gray-500">No units currently issued</p>
                </div>
              ) : (
                <div className="border border-gray-300 rounded-md p-3 max-h-64 overflow-y-auto">
                  <div className="space-y-2">
                    {issuedSerialized.map((unit) => (
                      <label
                        key={unit.serialNumber}
                        className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedSerialNumbers.includes(unit.serialNumber)}
                          onChange={() => toggleSerialNumber(unit.serialNumber)}
                          className="mr-3"
                          disabled={returnMutation.isLoading}
                        />
                        <div className="flex-1">
                          <span className="text-sm font-medium text-gray-900">{unit.serialNumber}</span>
                          <span className="text-xs text-gray-500 ml-2">({unit.status})</span>
                          {unit.location && (
                            <span className="text-xs text-gray-500 ml-2">- {unit.location}</span>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {selectedSerialNumbers.length > 0 && (
                <p className="mt-2 text-xs text-blue-600">
                  {selectedSerialNumbers.length} unit{selectedSerialNumbers.length !== 1 ? 's' : ''} selected
                </p>
              )}
            </div>
          )}

          {/* Return Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Return Location <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Warehouse A, Jobsite Storage"
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={returnMutation.isLoading}
            />
          </div>

          {/* Condition */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Condition
            </label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={returnMutation.isLoading}
            >
              <option value="good">Good</option>
              <option value="damaged">Damaged</option>
              <option value="needs_repair">Needs Repair</option>
              <option value="scrap">Scrap</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Additional notes about this return..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={returnMutation.isLoading}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              disabled={returnMutation.isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={returnMutation.isLoading || !jobId || !location.trim() || (isBulk && !quantity) || (!isBulk && selectedSerialNumbers.length === 0)}
            >
              {returnMutation.isLoading ? 'Returning...' : 'Return Inventory'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

