import React, { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeftIcon, CheckCircleIcon, XCircleIcon, PaperAirplaneIcon, XMarkIcon, DocumentArrowDownIcon, EnvelopeIcon, TruckIcon } from '@heroicons/react/24/outline'
import { purchaseOrderAPI, poReceiptAPI } from '../services/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { formatCurrency } from '../utils/currency'
import StatusBadge from '../components/StatusBadge'
import StatusDropdown from '../components/StatusDropdown'
import ReceiptStatusDropdown from '../components/ReceiptStatusDropdown'

export default function PurchaseOrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: po, isLoading } = useQuery({
    queryKey: ['purchase-order', id],
    queryFn: () => purchaseOrderAPI.getPurchaseOrder(id).then(res => res.data.data),
  })

  // Fetch receipts for this PO
  const { data: receiptsData } = useQuery({
    queryKey: ['po-receipts', id],
    queryFn: () => poReceiptAPI.getReceipts({ purchaseOrderId: id }).then(res => res.data.data || []),
    enabled: !!id,
  })

  const updateStatusMutation = useMutation({
    mutationFn: (status) => purchaseOrderAPI.updatePurchaseOrder(id, { status }),
    onSuccess: () => {
      toast.success('Status updated successfully')
      queryClient.invalidateQueries(['purchase-order', id])
      queryClient.invalidateQueries(['purchase-orders'])
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update status')
    },
  })

  const handleStatusChange = (newStatus) => {
    if (newStatus !== po.status) {
      updateStatusMutation.mutate(newStatus)
    }
  }

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
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">
                {po.poNumber || `PO-${po._id.slice(-6)}`}
              </h1>
              <div className="mt-2 flex items-center gap-3">
                <span className="text-sm text-gray-500">Status:</span>
                <StatusBadge status={po.status} type="po" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-64">
                <StatusDropdown
                  value={po.status}
                  onChange={handleStatusChange}
                  type="po"
                  disabled={updateStatusMutation.isLoading}
                />
              </div>
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
            <div className="md:col-span-2">
              <h2 className="text-lg font-medium text-gray-900 mb-4">PO Information</h2>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Supplier
              </label>
              <div className="mt-1 text-sm text-gray-900">
                {po.supplierId?.name || 'N/A'}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Job
              </label>
              <div className="mt-1 text-sm text-gray-900">
                {po.jobId?.jobNumber || po.jobId?.name || 'N/A'}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Default Cost Code
              </label>
              <div className="mt-1 text-sm text-gray-900">
                {po.defaultCostCode || po.costCode || '-'}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Required By Date
              </label>
              <div className="mt-1 text-sm text-gray-900">
                {po.requiredByDate ? format(new Date(po.requiredByDate), 'MMM dd, yyyy') : 'N/A'}
              </div>
            </div>

            {po.shipToAddress && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Ship To Address
                </label>
                <div className="mt-1 text-sm text-gray-900">
                  {typeof po.shipToAddress === 'string' 
                    ? po.shipToAddress 
                    : [
                        po.shipToAddress.street,
                        po.shipToAddress.city,
                        po.shipToAddress.province,
                        po.shipToAddress.postalCode,
                        po.shipToAddress.country
                      ].filter(Boolean).join(', ')}
                </div>
              </div>
            )}

            {po.deliveryInstructions && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Delivery Instructions
                </label>
                <div className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                  {po.deliveryInstructions}
                </div>
              </div>
            )}

            {po.internalNotes && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Internal Notes
                </label>
                <div className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                  {po.internalNotes}
                </div>
              </div>
            )}

            {po.supplierNotes && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Supplier Notes (printed on PO)
                </label>
                <div className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                  {po.supplierNotes}
                </div>
              </div>
            )}

            {po.rejectionReason && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-red-700">
                  Rejection Reason
                </label>
                <div className="mt-1 text-sm text-red-900">
                  {po.rejectionReason}
                </div>
              </div>
            )}

            {/* Line Items */}
            <div className="md:col-span-2 mt-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Line Items</h2>
              {po.lineItems && po.lineItems.length > 0 ? (
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Product / Description
                        </th>
                        <th className="px-3 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider w-24">
                          Qty
                        </th>
                        <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider w-20">
                          Unit
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider w-40">
                          Unit Price
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider w-32">
                          Extended
                        </th>
                        <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider w-24">
                          Cost Code
                        </th>
                        {(po.lineItems.some(item => item.quantityReceived !== undefined && item.quantityReceived > 0)) && (
                          <th className="px-3 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider w-24">
                            Received
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {po.lineItems.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="space-y-1.5 min-w-[300px]">
                              <div className="text-sm font-medium text-gray-900">
                                {item.variantName ? `${item.productName || item.description} - ${item.variantName}` : (item.productName || item.description || 'N/A')}
                              </div>
                              {item.sku && (
                                <div className="text-xs text-gray-500">SKU: {item.sku}</div>
                              )}
                              {item.description && item.description !== item.productName && (
                                <div className="text-xs text-gray-500">{item.description}</div>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-right text-sm text-gray-900">
                            {item.quantity || item.quantityOrdered || 0}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-center text-sm text-gray-600">
                            {item.unit || 'EA'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-900">
                            {formatCurrency(item.unitPrice || 0)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                            {formatCurrency(item.extendedCost || 0)}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-center text-xs text-gray-600">
                            {item.costCode || '-'}
                          </td>
                          {(po.lineItems.some(item => item.quantityReceived !== undefined && item.quantityReceived > 0)) && (
                            <td className="px-3 py-3 whitespace-nowrap text-right text-sm text-gray-600">
                              {item.quantityReceived !== undefined ? `${item.quantityReceived} ${item.unit || 'EA'}` : '-'}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan={po.lineItems.some(item => item.quantityReceived !== undefined && item.quantityReceived > 0) ? 6 : 5} className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                          Subtotal:
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                          {formatCurrency(po.subtotal || 0)}
                        </td>
                        {po.lineItems.some(item => item.quantityReceived !== undefined && item.quantityReceived > 0) && <td></td>}
                      </tr>
                      {po.taxAmount > 0 && (
                        <tr>
                          <td colSpan={po.lineItems.some(item => item.quantityReceived !== undefined && item.quantityReceived > 0) ? 6 : 5} className="px-4 py-3 text-right text-sm text-gray-700">
                            Tax:
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-900">
                            {formatCurrency(po.taxAmount)}
                          </td>
                          {po.lineItems.some(item => item.quantityReceived !== undefined && item.quantityReceived > 0) && <td></td>}
                        </tr>
                      )}
                      {po.freightAmount > 0 && (
                        <tr>
                          <td colSpan={po.lineItems.some(item => item.quantityReceived !== undefined && item.quantityReceived > 0) ? 6 : 5} className="px-4 py-3 text-right text-sm text-gray-700">
                            Freight:
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-900">
                            {formatCurrency(po.freightAmount)}
                          </td>
                          {po.lineItems.some(item => item.quantityReceived !== undefined && item.quantityReceived > 0) && <td></td>}
                        </tr>
                      )}
                      <tr>
                        <td colSpan={po.lineItems.some(item => item.quantityReceived !== undefined && item.quantityReceived > 0) ? 6 : 5} className="px-4 py-3 text-right text-base font-bold text-gray-900">
                          Total:
                        </td>
                        <td className="px-4 py-3 text-right text-base font-bold text-gray-900">
                          {formatCurrency(po.total || po.totalAmount || 0)}
                        </td>
                        {po.lineItems.some(item => item.quantityReceived !== undefined && item.quantityReceived > 0) && <td></td>}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                  <p className="text-gray-500">No line items</p>
                </div>
              )}
            </div>
          </div>

          {/* Receipts Section */}
          <div className="mt-8 pt-8 border-t">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                <TruckIcon className="h-5 w-5" />
                Receipts ({receiptsData?.length || 0})
              </h2>
              <Link
                to={`/receiving?poId=${id}`}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Create Receipt
              </Link>
            </div>
            
            {receiptsData && receiptsData.length > 0 ? (
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Receipt #
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date Received
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Received By
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Delivery Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Value
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {receiptsData
                      .sort((a, b) => new Date(a.receivedAt) - new Date(b.receivedAt))
                      .map((receipt) => (
                        <tr key={receipt._id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <Link
                              to={`/receiving?receiptId=${receipt._id}`}
                              className="text-sm font-medium text-blue-600 hover:text-blue-700"
                            >
                              {receipt.receiptNumber || `REC-${receipt._id.slice(-6)}`}
                            </Link>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {receipt.receivedAt ? format(new Date(receipt.receivedAt), 'MMM dd, yyyy HH:mm') : '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                            {receipt.receivedBy?.name || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                            {receipt.deliveryDate ? format(new Date(receipt.deliveryDate), 'MMM dd, yyyy') : '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                            {receipt.locationPlaced || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                            ${(receipt.totalReceived || 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <ReceiptStatusDropdown
                              value={receipt.status || 'draft'}
                              onChange={(newStatus) => {
                                // TODO: Add mutation handler if needed
                                console.log('Update receipt status:', receipt._id, newStatus)
                              }}
                            />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <Link
                              to={`/receiving?receiptId=${receipt._id}`}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              View
                            </Link>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <TruckIcon className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                <p>No receipts yet</p>
                <Link
                  to={`/receiving?poId=${id}`}
                  className="mt-2 inline-block text-sm text-blue-600 hover:text-blue-700"
                >
                  Create first receipt
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


