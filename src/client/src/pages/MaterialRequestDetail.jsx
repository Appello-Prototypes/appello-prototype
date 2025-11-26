import React, { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeftIcon, CheckCircleIcon, XCircleIcon, DocumentTextIcon } from '@heroicons/react/24/outline'
import { materialRequestAPI, productAPI } from '../services/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import ConvertToPOMultiModal from '../components/ConvertToPOMultiModal'
import RejectRequestModal from '../components/RejectRequestModal'
import StatusBadge from '../components/StatusBadge'
import StatusDropdown from '../components/StatusDropdown'
import PriorityDropdown from '../components/PriorityDropdown'

export default function MaterialRequestDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showConvertModal, setShowConvertModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)

  const { data: request, isLoading } = useQuery({
    queryKey: ['material-request', id],
    queryFn: () => materialRequestAPI.getMaterialRequest(id).then(res => res.data.data),
  })

  // Fetch full product details with suppliers for each line item
  const { data: enrichedRequest } = useQuery({
    queryKey: ['material-request-enriched', id, request],
    queryFn: async () => {
      if (!request?.lineItems) return request
      
      // Fetch full product details for each line item
      const enrichedItems = await Promise.all(
        request.lineItems.map(async (item) => {
          // Skip if no productId or if already populated
          if (!item.productId) return item
          
          // Extract product ID (could be string or object)
          const productId = typeof item.productId === 'object' 
            ? (item.productId._id || item.productId.id || item.productId)
            : item.productId
          
          // If already populated with suppliers, use it
          if (typeof item.productId === 'object' && item.productId.suppliers) {
            return item
          }
          
          try {
            const productIdStr = productId?.toString ? productId.toString() : String(productId)
            const productResponse = await productAPI.getProduct(productIdStr)
            const fullProduct = productResponse.data.data
            return {
              ...item,
              productId: fullProduct // Replace with full product object
            }
          } catch (error) {
            console.error(`Error fetching product ${productId}:`, error)
            return item
          }
        })
      )
      
      return {
        ...request,
        lineItems: enrichedItems
      }
    },
    enabled: !!request && !!request.lineItems?.length,
    staleTime: 30000
  })

  const displayRequest = enrichedRequest || request

  const updateStatusMutation = useMutation({
    mutationFn: (status) => materialRequestAPI.updateMaterialRequest(id, { status }),
    onSuccess: () => {
      toast.success('Status updated successfully')
      queryClient.invalidateQueries(['material-request', id])
      queryClient.invalidateQueries(['material-requests'])
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update status')
    },
  })

  const updatePriorityMutation = useMutation({
    mutationFn: (priority) => materialRequestAPI.updateMaterialRequest(id, { priority }),
    onSuccess: () => {
      toast.success('Priority updated successfully')
      queryClient.invalidateQueries(['material-request', id])
      queryClient.invalidateQueries(['material-requests'])
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update priority')
    },
  })

  const handleStatusChange = (newStatus) => {
    if (newStatus !== request.status) {
      updateStatusMutation.mutate(newStatus)
    }
  }

  const handlePriorityChange = (newPriority) => {
    if (newPriority !== request.priority) {
      updatePriorityMutation.mutate(newPriority)
    }
  }

  const approveMutation = useMutation({
    mutationFn: () => materialRequestAPI.approveRequest(id),
    onSuccess: () => {
      toast.success('Request approved successfully')
      queryClient.invalidateQueries(['material-request', id])
      queryClient.invalidateQueries(['material-requests'])
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to approve request')
    },
  })

  const rejectMutation = useMutation({
    mutationFn: (reason) => materialRequestAPI.rejectRequest(id, reason),
    onSuccess: () => {
      toast.success('Request rejected')
      queryClient.invalidateQueries(['material-request', id])
      queryClient.invalidateQueries(['material-requests'])
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to reject request')
    },
  })

  const convertToPOMutation = useMutation({
    mutationFn: (data) => materialRequestAPI.convertToPOs(id, data.conversions),
    onSuccess: (response) => {
      const createdPOs = response.data.data?.purchaseOrders || []
      if (createdPOs.length === 1) {
        toast.success('Purchase Order created successfully')
        navigate(`/purchase-orders/${createdPOs[0]._id}`)
      } else if (createdPOs.length > 1) {
        toast.success(`${createdPOs.length} Purchase Orders created successfully`)
        navigate('/purchase-orders')
      } else {
        toast.success('Purchase Orders created successfully')
        navigate('/purchase-orders')
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to convert to PO(s)')
    },
  })

  const handleReject = () => {
    setShowRejectModal(true)
  }

  const handleRejectSubmit = (reason) => {
    rejectMutation.mutate(reason, {
      onSuccess: () => {
        setShowRejectModal(false)
      }
    })
  }

  const handleConvertToPO = () => {
    setShowConvertModal(true)
  }

  const handleConvertSubmit = (data) => {
    convertToPOMutation.mutate(data, {
      onSuccess: () => {
        setShowConvertModal(false)
      }
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!request) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-800">Material request not found</p>
      </div>
    )
  }

  const canApprove = request.status === 'submitted'
  const canReject = request.status === 'submitted'
  const canConvertToPO = request.status === 'approved' && !request.purchaseOrderId

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
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">
                {request.requestNumber || `MR-${request._id.slice(-6)}`}
              </h1>
              <div className="mt-2 flex items-center gap-3">
                <span className="text-sm text-gray-500">Status:</span>
                <StatusBadge status={request.status} type="mr" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-64">
                <StatusDropdown
                  value={request.status}
                  onChange={handleStatusChange}
                  type="mr"
                  disabled={updateStatusMutation.isLoading}
                />
              </div>
            </div>
            {canApprove && (
              <div className="flex space-x-2">
                <button
                  onClick={() => approveMutation.mutate()}
                  disabled={approveMutation.isLoading}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                >
                  <CheckCircleIcon className="h-5 w-5 mr-2" />
                  Approve
                </button>
                <button
                  onClick={handleReject}
                  disabled={rejectMutation.isLoading}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                >
                  <XCircleIcon className="h-5 w-5 mr-2" />
                  Reject
                </button>
              </div>
            )}
            {canConvertToPO && (
              <button
                onClick={handleConvertToPO}
                disabled={convertToPOMutation.isLoading}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                <DocumentTextIcon className="h-5 w-5 mr-2" />
                Convert to PO
              </button>
            )}
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Request Information</h2>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Job
              </label>
              <div className="mt-1 text-sm text-gray-900">
                {request.jobId?.jobNumber || request.jobId?.name || 'N/A'}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Required By Date
              </label>
              <div className="mt-1 text-sm text-gray-900">
                {request.requiredByDate ? format(new Date(request.requiredByDate), 'MMM dd, yyyy') : 'N/A'}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Priority
              </label>
              <div className="mt-1">
                <PriorityDropdown
                  value={request.priority || 'standard'}
                  onChange={handlePriorityChange}
                  disabled={updatePriorityMutation.isLoading}
                  className="w-48"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Delivery Location
              </label>
              <div className="mt-1 text-sm text-gray-900 capitalize">
                {request.deliveryLocation || 'jobsite'}
              </div>
            </div>

            {request.deliveryAddress && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Delivery Address
                </label>
                <div className="mt-1 text-sm text-gray-900">
                  {typeof request.deliveryAddress === 'string' 
                    ? request.deliveryAddress 
                    : String(request.deliveryAddress)}
                </div>
              </div>
            )}

            {request.deliveryNotes && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Delivery Notes
                </label>
                <div className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                  {request.deliveryNotes}
                </div>
              </div>
            )}

            {request.requestedBy && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Requested By
                </label>
                <div className="mt-1 text-sm text-gray-900">
                  {request.requestedBy?.name || 'Unknown'}
                </div>
              </div>
            )}

            {request.rejectionReason && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-red-700">
                  Rejection Reason
                </label>
                <div className="mt-1 text-sm text-red-900">
                  {request.rejectionReason}
                </div>
              </div>
            )}

            {/* Line Items */}
            <div className="md:col-span-2 mt-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Line Items</h2>
              {displayRequest?.lineItems && displayRequest.lineItems.length > 0 ? (
                <div className="space-y-4">
                  {displayRequest.lineItems.map((item, index) => {
                    const product = item.productId
                    const variant = product?.variants?.find(v => 
                      v._id?.toString() === item.variantId?.toString()
                    )
                    const suppliers = variant?.suppliers || product?.suppliers || []
                    
                    return (
                      <div key={index} className="border border-gray-200 rounded-lg p-4 bg-white">
                        <div className="space-y-4">
                          {/* Product Row */}
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                            <div className="md:col-span-5">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Product
                              </label>
                              <div className="bg-gray-50 border border-gray-300 rounded-md px-3 py-2">
                                <div className="text-sm font-medium text-gray-900">
                                  {item.productName || item.description || 'N/A'}
                                </div>
                                {item.variantName && (
                                  <div className="text-xs text-gray-500 mt-0.5">
                                    Variant: {item.variantName}
                                  </div>
                                )}
                                {item.description && item.description !== item.productName && (
                                  <div className="text-xs text-gray-500 mt-0.5">
                                    {item.description}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Quantity
                              </label>
                              <div className="text-sm text-gray-900 bg-gray-50 border border-gray-300 rounded-md px-3 py-2">
                                {item.quantity || 0}
                              </div>
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Unit
                              </label>
                              <div className="text-sm text-gray-900 bg-gray-50 border border-gray-300 rounded-md px-3 py-2">
                                {item.unit?.replace('_', ' ') || 'EA'}
                              </div>
                            </div>
                            <div className="md:col-span-3">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Notes
                              </label>
                              <div className="text-sm text-gray-900 bg-gray-50 border border-gray-300 rounded-md px-3 py-2">
                                {item.notes || '-'}
                              </div>
                            </div>
                          </div>

                          {/* Suppliers Section */}
                          {suppliers.length > 0 && (
                            <div className="border-t border-gray-200 pt-3">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Available Suppliers
                              </label>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                {suppliers.map((supplierInfo, supplierIndex) => {
                                  const supplier = supplierInfo.supplierId || supplierInfo.supplier
                                  const supplierName = supplier?.name || 'Unknown Supplier'
                                  const partNumber = supplierInfo.supplierPartNumber || '-'
                                  const price = supplierInfo.netPrice || supplierInfo.listPrice || supplierInfo.lastPrice || 0
                                  const isPreferred = supplierInfo.isPreferred || false
                                  
                                  return (
                                    <div
                                      key={supplierIndex}
                                      className={`p-2 rounded-md border ${
                                        isPreferred
                                          ? 'bg-blue-50 border-blue-200'
                                          : 'bg-gray-50 border-gray-200'
                                      }`}
                                    >
                                      <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-1.5">
                                            <span className="text-sm font-medium text-gray-900 truncate">
                                              {supplierName}
                                            </span>
                                            {isPreferred && (
                                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                                Preferred
                                              </span>
                                            )}
                                          </div>
                                          {partNumber !== '-' && (
                                            <div className="text-xs text-gray-600 mt-0.5">
                                              Part #: {partNumber}
                                            </div>
                                          )}
                                          {price > 0 && (
                                            <div className="text-xs text-gray-700 mt-0.5 font-medium">
                                              ${price.toFixed(2)} / {item.unit || 'EA'}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                  <p className="text-gray-500">No line items</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Convert to PO Modal */}
      {showConvertModal && (
        <ConvertToPOMultiModal
          isOpen={showConvertModal}
          onClose={() => setShowConvertModal(false)}
          onConvert={handleConvertSubmit}
          materialRequest={displayRequest}
          isLoading={convertToPOMutation.isLoading}
        />
      )}

      {/* Reject Request Modal */}
      {showRejectModal && (
        <RejectRequestModal
          isOpen={showRejectModal}
          onClose={() => setShowRejectModal(false)}
          onReject={handleRejectSubmit}
          isLoading={rejectMutation.isLoading}
        />
      )}
    </div>
  )
}

