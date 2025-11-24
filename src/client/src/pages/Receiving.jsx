import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CameraIcon, CheckCircleIcon, PhotoIcon } from '@heroicons/react/24/outline'
import { poReceiptAPI, jobAPI, purchaseOrderAPI, uploadAPI } from '../services/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

export default function Receiving() {
  const [selectedJobId, setSelectedJobId] = useState('')
  const [selectedPOId, setSelectedPOId] = useState('')
  const [receiptData, setReceiptData] = useState({
    deliveryDate: new Date().toISOString().split('T')[0],
    locationPlaced: '',
    lineItems: [],
    billOfLadingPhoto: null,
    materialPhotos: [],
  })

  const queryClient = useQueryClient()

  const { data: jobs } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => jobAPI.getJobs().then(res => res.data.data),
  })

  const { data: openPOs } = useQuery({
    queryKey: ['open-pos', selectedJobId],
    queryFn: () => poReceiptAPI.getOpenPOsForJob(selectedJobId).then(res => res.data.data),
    enabled: !!selectedJobId,
  })

  // Note: We'll fetch PO details manually when selected

  const mutation = useMutation({
    mutationFn: (data) => poReceiptAPI.createReceipt(data),
    onSuccess: () => {
      toast.success('Receipt created successfully')
      queryClient.invalidateQueries(['po-receipts'])
      queryClient.invalidateQueries(['purchase-orders'])
      // Reset form
      setSelectedJobId('')
      setSelectedPOId('')
      setReceiptData({
        deliveryDate: new Date().toISOString().split('T')[0],
        locationPlaced: '',
        lineItems: [],
        billOfLadingPhoto: null,
        materialPhotos: [],
      })
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create receipt')
    },
  })

  const handlePOSelect = async (poId) => {
    setSelectedPOId(poId)
    // Fetch PO details
    try {
      const response = await purchaseOrderAPI.getPurchaseOrder(poId)
      const po = response.data.data
      if (po && po.lineItems) {
        setReceiptData(prev => ({
          ...prev,
          lineItems: po.lineItems.map(item => ({
            poLineItemId: item._id,
            product: item.product,
            description: item.description,
            quantityReceived: '',
            unit: item.unit,
            condition: 'good',
            notes: '',
          }))
        }))
      }
    } catch (error) {
      console.error('Failed to load PO details:', error)
      toast.error('Failed to load PO details')
    }
  }

  const updateLineItem = (index, field, value) => {
    setReceiptData(prev => ({
      ...prev,
      lineItems: prev.lineItems.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedPOId || receiptData.lineItems.length === 0) {
      toast.error('Please select a PO and add receipt line items')
      return
    }

    if (!receiptData.billOfLadingPhoto) {
      toast.error('Please upload a bill of lading photo')
      return
    }

    try {
      // Upload bill of lading photo first
      let billOfLadingPhotoData = null
      if (receiptData.billOfLadingPhoto.file) {
        const uploadResponse = await uploadAPI.uploadPhoto(receiptData.billOfLadingPhoto.file)
        billOfLadingPhotoData = uploadResponse.data.data
      } else if (receiptData.billOfLadingPhoto.path) {
        // Already uploaded
        billOfLadingPhotoData = receiptData.billOfLadingPhoto
      }

      // Upload material photos if any
      const materialPhotosData = []
      for (const photo of receiptData.materialPhotos) {
        if (photo.file) {
          const uploadResponse = await uploadAPI.uploadPhoto(photo.file)
          materialPhotosData.push(uploadResponse.data.data)
        } else if (photo.path) {
          materialPhotosData.push(photo)
        }
      }

      const submitData = {
        purchaseOrderId: selectedPOId,
        jobId: selectedJobId,
        deliveryDate: receiptData.deliveryDate,
        locationPlaced: receiptData.locationPlaced,
        billOfLadingPhoto: billOfLadingPhotoData,
        materialPhotos: materialPhotosData,
        lineItems: receiptData.lineItems.map(item => ({
          poLineItemId: item.poLineItemId,
          quantityReceived: parseFloat(item.quantityReceived) || 0,
          unit: item.unit,
          condition: item.condition,
          notes: item.notes,
        })),
      }

      mutation.mutate(submitData)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to upload photos')
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Material Receiving</h1>
        <p className="mt-1 text-sm text-gray-500">Record material receipts against purchase orders</p>
      </div>

      <div className="bg-white shadow rounded-lg">
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Job *
              </label>
              <select
                value={selectedJobId}
                onChange={(e) => {
                  setSelectedJobId(e.target.value)
                  setSelectedPOId('')
                  setReceiptData(prev => ({ ...prev, lineItems: [] }))
                }}
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
                Purchase Order *
              </label>
              <select
                value={selectedPOId}
                onChange={(e) => handlePOSelect(e.target.value)}
                required
                disabled={!selectedJobId}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100"
              >
                <option value="">Select a PO</option>
                {openPOs?.map((po) => (
                  <option key={po._id} value={po._id}>
                    {po.poNumber || `PO-${po._id.slice(-6)}`} - {po.supplierId?.name || 'N/A'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Delivery Date *
              </label>
              <input
                type="date"
                value={receiptData.deliveryDate}
                onChange={(e) => setReceiptData(prev => ({ ...prev, deliveryDate: e.target.value }))}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Location Placed
              </label>
              <input
                type="text"
                value={receiptData.locationPlaced}
                onChange={(e) => setReceiptData(prev => ({ ...prev, locationPlaced: e.target.value }))}
                placeholder="e.g., Floor 3, North Wing"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            {/* Bill of Lading Photo */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bill of Lading Photo *
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                {receiptData.billOfLadingPhoto ? (
                  <div className="text-center">
                    <img 
                      src={receiptData.billOfLadingPhoto.preview || receiptData.billOfLadingPhoto.path} 
                      alt="Bill of Lading" 
                      className="max-h-64 mx-auto rounded-lg mb-2"
                    />
                    <p className="text-sm text-gray-600">{receiptData.billOfLadingPhoto.originalName || 'Photo uploaded'}</p>
                    <button
                      type="button"
                      onClick={() => setReceiptData(prev => ({ ...prev, billOfLadingPhoto: null }))}
                      className="mt-2 text-sm text-red-600 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={async (e) => {
                          const file = e.target.files[0]
                          if (file) {
                            try {
                              // Create preview
                              const preview = URL.createObjectURL(file)
                              setReceiptData(prev => ({
                                ...prev,
                                billOfLadingPhoto: {
                                  file,
                                  preview,
                                  originalName: file.name
                                }
                              }))
                            } catch (error) {
                              toast.error('Failed to load image')
                            }
                          }
                        }}
                        className="hidden"
                      />
                      <CameraIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <p className="mt-2 text-sm text-gray-500">Click to capture or upload photo</p>
                      <p className="mt-1 text-xs text-gray-400">Supports JPEG, PNG, GIF</p>
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Receipt Line Items */}
            {receiptData.lineItems.length > 0 && (
              <div className="md:col-span-2 mt-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Received Items</h2>
                <div className="space-y-4">
                  {receiptData.lineItems.map((item, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        <div className="md:col-span-5">
                          <p className="font-medium text-gray-900">{item.description}</p>
                          <p className="text-sm text-gray-500">Unit: {item.unit}</p>
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Quantity Received *
                          </label>
                          <input
                            type="number"
                            value={item.quantityReceived}
                            onChange={(e) => updateLineItem(index, 'quantityReceived', e.target.value)}
                            required
                            min="0"
                            step="0.01"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Condition *
                          </label>
                          <select
                            value={item.condition}
                            onChange={(e) => updateLineItem(index, 'condition', e.target.value)}
                            required
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          >
                            <option value="good">Good</option>
                            <option value="damaged">Damaged</option>
                            <option value="incorrect_item">Incorrect Item</option>
                          </select>
                        </div>
                        <div className="md:col-span-3">
                          <label className="block text-sm font-medium text-gray-700">
                            Notes
                          </label>
                          <input
                            type="text"
                            value={item.notes}
                            onChange={(e) => updateLineItem(index, 'notes', e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => {
                setSelectedJobId('')
                setSelectedPOId('')
                setReceiptData({
                  deliveryDate: new Date().toISOString().split('T')[0],
                  locationPlaced: '',
                  lineItems: [],
                })
              }}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Clear
            </button>
            <button
              type="submit"
              disabled={mutation.isLoading || !selectedPOId || receiptData.lineItems.length === 0}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              <CheckCircleIcon className="h-5 w-5 mr-2" />
              {mutation.isLoading ? 'Processing...' : 'Record Receipt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

