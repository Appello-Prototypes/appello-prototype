import React, { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeftIcon, CheckCircleIcon, XCircleIcon, DocumentTextIcon } from '@heroicons/react/24/outline'
import { materialRequestAPI } from '../services/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import ConvertToPOModal from '../components/ConvertToPOModal'
import RejectRequestModal from '../components/RejectRequestModal'

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
    mutationFn: (data) => materialRequestAPI.convertToPO(id, data.supplierId, data.defaultCostCode),
    onSuccess: (response) => {
      toast.success('Purchase Order created successfully')
      const poId = response.data.data?._id || response.data.data?.purchaseOrderId
      if (poId) {
        navigate(`/purchase-orders/${poId}`)
      } else {
        navigate('/purchase-orders')
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to convert to PO')
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
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {request.requestNumber || `MR-${request._id.slice(-6)}`}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Status: <span className="font-medium capitalize">{request.status}</span>
              </p>
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
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Request Details</h2>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Job</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {request.jobId?.jobNumber || request.jobId?.name || 'N/A'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Requested By</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {request.requestedBy?.name || 'Unknown'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Required By</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {request.requiredByDate ? format(new Date(request.requiredByDate), 'MMM dd, yyyy') : 'N/A'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Priority</dt>
                  <dd className="mt-1 text-sm text-gray-900 capitalize">{request.priority}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Delivery Location</dt>
                  <dd className="mt-1 text-sm text-gray-900 capitalize">{request.deliveryLocation}</dd>
                </div>
                {request.deliveryAddress && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Delivery Address</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {typeof request.deliveryAddress === 'string' 
                        ? request.deliveryAddress 
                        : String(request.deliveryAddress)}
                    </dd>
                  </div>
                )}
                {request.deliveryNotes && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Delivery Notes</dt>
                    <dd className="mt-1 text-sm text-gray-900">{request.deliveryNotes}</dd>
                  </div>
                )}
                {request.rejectionReason && (
                  <div>
                    <dt className="text-sm font-medium text-red-500">Rejection Reason</dt>
                    <dd className="mt-1 text-sm text-red-900">{request.rejectionReason}</dd>
                  </div>
                )}
              </dl>
            </div>

            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Line Items</h2>
              <div className="space-y-3">
                {request.lineItems && request.lineItems.length > 0 ? (
                  request.lineItems.map((item, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{item.productName || item.description || 'N/A'}</p>
                          {item.description && item.description !== item.productName && (
                            <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                          )}
                          <p className="text-sm text-gray-500 mt-1">
                            {item.quantity} {item.unit?.replace('_', ' ')}
                          </p>
                          {item.notes && (
                            <p className="text-sm text-gray-500 mt-1">{item.notes}</p>
                          )}
                        </div>
                        {item.isApproved && (
                          <CheckCircleIcon className="h-5 w-5 text-green-500" />
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500">No line items</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Convert to PO Modal */}
      {showConvertModal && (
        <ConvertToPOModal
          isOpen={showConvertModal}
          onClose={() => setShowConvertModal(false)}
          onConvert={handleConvertSubmit}
          jobId={request?.jobId?._id || request?.jobId}
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

