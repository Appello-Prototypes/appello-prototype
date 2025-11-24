import React from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeftIcon, CheckCircleIcon, XCircleIcon, PaperAirplaneIcon, XMarkIcon, DocumentArrowDownIcon, EnvelopeIcon } from '@heroicons/react/24/outline'
import { purchaseOrderAPI } from '../services/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

export default function PurchaseOrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: po, isLoading } = useQuery({
    queryKey: ['purchase-order', id],
    queryFn: () => purchaseOrderAPI.getPurchaseOrder(id).then(res => res.data.data),
  })

  const submitForApprovalMutation = useMutation({
    mutationFn: () => purchaseOrderAPI.submitForApproval(id),
    onSuccess: () => {
      toast.success('PO submitted for approval')
      queryClient.invalidateQueries(['purchase-order', id])
      queryClient.invalidateQueries(['purchase-orders'])
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to submit for approval')
    },
  })

  const approveMutation = useMutation({
    mutationFn: () => purchaseOrderAPI.approvePO(id),
    onSuccess: () => {
      toast.success('PO approved successfully')
      queryClient.invalidateQueries(['purchase-order', id])
      queryClient.invalidateQueries(['purchase-orders'])
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to approve PO')
    },
  })

  const rejectMutation = useMutation({
    mutationFn: (reason) => purchaseOrderAPI.rejectPO(id, reason),
    onSuccess: () => {
      toast.success('PO rejected')
      queryClient.invalidateQueries(['purchase-order', id])
      queryClient.invalidateQueries(['purchase-orders'])
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to reject PO')
    },
  })

  const issueMutation = useMutation({
    mutationFn: () => purchaseOrderAPI.issuePO(id),
    onSuccess: () => {
      toast.success('PO issued successfully')
      queryClient.invalidateQueries(['purchase-order', id])
      queryClient.invalidateQueries(['purchase-orders'])
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to issue PO')
    },
  })

  const cancelMutation = useMutation({
    mutationFn: () => purchaseOrderAPI.cancelPO(id),
    onSuccess: () => {
      toast.success('PO cancelled')
      queryClient.invalidateQueries(['purchase-order', id])
      queryClient.invalidateQueries(['purchase-orders'])
      navigate('/purchase-orders')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to cancel PO')
    },
  })

  const handleReject = () => {
    const reason = window.prompt('Please provide a reason for rejection:')
    if (reason) {
      rejectMutation.mutate(reason)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!po) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-800">Purchase order not found</p>
      </div>
    )
  }

  const canSubmit = po.status === 'draft'
  const canApprove = po.status === 'pending_approval'
  const canReject = po.status === 'pending_approval'
  const canIssue = po.status === 'approved'
  const canCancel = ['draft', 'pending_approval', 'approved'].includes(po.status)
  const canDownloadPDF = ['approved', 'sent', 'partially_received', 'fully_received'].includes(po.status)
  const canSendEmail = po.status === 'sent' || po.status === 'approved'

  const handleDownloadPDF = async () => {
    try {
      const response = await purchaseOrderAPI.downloadPOPDF(po._id)
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `PO-${po.poNumber}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      toast.success('PDF downloaded successfully')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to download PDF')
    }
  }

  const handleSendEmail = async () => {
    try {
      const toEmail = window.prompt('Enter supplier email address:', po.supplierId?.email || '')
      if (!toEmail) {
        return
      }
      
      await purchaseOrderAPI.sendPOEmail(po._id, toEmail)
      toast.success('PO email sent successfully')
      queryClient.invalidateQueries(['purchase-order', id])
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send email')
    }
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          to="/purchase-orders"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Purchase Orders
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {po.poNumber || `PO-${po._id.slice(-6)}`}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Status: <span className="font-medium capitalize">{po.status.replace('_', ' ')}</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {canSubmit && (
                <button
                  onClick={() => submitForApprovalMutation.mutate()}
                  disabled={submitForApprovalMutation.isLoading}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  Submit for Approval
                </button>
              )}
              {canApprove && (
                <button
                  onClick={() => approveMutation.mutate()}
                  disabled={approveMutation.isLoading}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                >
                  <CheckCircleIcon className="h-5 w-5 mr-2" />
                  Approve
                </button>
              )}
              {canReject && (
                <button
                  onClick={handleReject}
                  disabled={rejectMutation.isLoading}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                >
                  <XCircleIcon className="h-5 w-5 mr-2" />
                  Reject
                </button>
              )}
              {canIssue && (
                <button
                  onClick={() => issueMutation.mutate()}
                  disabled={issueMutation.isLoading}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                >
                  <PaperAirplaneIcon className="h-5 w-5 mr-2" />
                  Issue PO
                </button>
              )}
              {canDownloadPDF && (
                <button
                  onClick={handleDownloadPDF}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
                  Download PDF
                </button>
              )}
              {canSendEmail && (
                <button
                  onClick={handleSendEmail}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <EnvelopeIcon className="h-5 w-5 mr-2" />
                  Send Email
                </button>
              )}
              {canCancel && (
                <button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to cancel this PO?')) {
                      cancelMutation.mutate()
                    }
                  }}
                  disabled={cancelMutation.isLoading}
                  className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 disabled:opacity-50"
                >
                  <XMarkIcon className="h-5 w-5 mr-2" />
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">PO Details</h2>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Supplier</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {po.supplierId?.name || 'N/A'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Job</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {po.jobId?.jobNumber || po.jobId?.name || 'N/A'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Required By</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {po.requiredByDate ? format(new Date(po.requiredByDate), 'MMM dd, yyyy') : 'N/A'}
                  </dd>
                </div>
                {po.costCode && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Cost Code</dt>
                    <dd className="mt-1 text-sm text-gray-900">{po.costCode}</dd>
                  </div>
                )}
                {po.shipToAddress && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Ship To</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {typeof po.shipToAddress === 'string' 
                        ? po.shipToAddress 
                        : [
                            po.shipToAddress.street,
                            po.shipToAddress.city,
                            po.shipToAddress.province,
                            po.shipToAddress.postalCode,
                            po.shipToAddress.country
                          ].filter(Boolean).join(', ')}
                    </dd>
                  </div>
                )}
                {po.deliveryInstructions && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Delivery Instructions</dt>
                    <dd className="mt-1 text-sm text-gray-900">{po.deliveryInstructions}</dd>
                  </div>
                )}
                {po.rejectionReason && (
                  <div>
                    <dt className="text-sm font-medium text-red-500">Rejection Reason</dt>
                    <dd className="mt-1 text-sm text-red-900">{po.rejectionReason}</dd>
                  </div>
                )}
              </dl>
            </div>

            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Line Items</h2>
              <div className="space-y-3">
                {po.lineItems && po.lineItems.length > 0 ? (
                  <>
                    {po.lineItems.map((item, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{item.description}</p>
                            <p className="text-sm text-gray-500 mt-1">
                              {item.quantity} {item.unit} @ ${item.unitPrice?.toFixed(2)}
                            </p>
                            {item.costCode && (
                              <p className="text-sm text-gray-500">Cost Code: {item.costCode}</p>
                            )}
                            {item.receivedQuantity !== undefined && (
                              <p className="text-sm text-gray-500">
                                Received: {item.receivedQuantity} {item.unit}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-gray-900">
                              ${item.extendedCost?.toFixed(2) || '0.00'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="border-t pt-3 mt-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Subtotal:</span>
                        <span className="font-medium">${po.subtotal?.toFixed(2) || '0.00'}</span>
                      </div>
                      {po.taxAmount > 0 && (
                        <div className="flex justify-between text-sm mt-1">
                          <span className="text-gray-500">Tax:</span>
                          <span className="font-medium">${po.taxAmount.toFixed(2)}</span>
                        </div>
                      )}
                      {po.freightAmount > 0 && (
                        <div className="flex justify-between text-sm mt-1">
                          <span className="text-gray-500">Freight:</span>
                          <span className="font-medium">${po.freightAmount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-base font-bold mt-2 pt-2 border-t">
                        <span>Total:</span>
                        <span>${po.totalAmount?.toFixed(2) || '0.00'}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-gray-500">No line items</p>
                )}
              </div>
            </div>
          </div>

          {po.supplierNotes && (
            <div className="mt-6 pt-6 border-t">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Supplier Notes</h3>
              <p className="text-sm text-gray-600">{po.supplierNotes}</p>
            </div>
          )}

          {po.internalNotes && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Internal Notes</h3>
              <p className="text-sm text-gray-600">{po.internalNotes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

