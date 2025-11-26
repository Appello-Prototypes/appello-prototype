import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { XMarkIcon, ClockIcon, FunnelIcon, DocumentTextIcon, LinkIcon, PhotoIcon } from '@heroicons/react/24/outline'
import { inventoryAPI } from '../../services/api'
import { format } from 'date-fns'

/**
 * Full Transaction History View
 * 
 * Displays paginated, filterable transaction history for an inventory item
 */
export default function TransactionHistoryView({ isOpen, onClose, inventoryId }) {
  const navigate = useNavigate()
  const [filterType, setFilterType] = useState('all')
  const [page, setPage] = useState(1)
  const pageSize = 20

  const { data: transactionsData, isLoading } = useQuery({
    queryKey: ['inventory-transactions', inventoryId, filterType, page],
    queryFn: () => inventoryAPI.getInventoryTransactions(inventoryId).then(res => {
      let transactions = res.data.data || []
      
      // Filter by type if needed
      if (filterType !== 'all') {
        transactions = transactions.filter(t => t.type === filterType)
      }
      
      // Paginate
      const start = (page - 1) * pageSize
      const end = start + pageSize
      const paginated = transactions.slice(start, end)
      
      return {
        transactions: paginated,
        total: transactions.length,
        page,
        pageSize,
        totalPages: Math.ceil(transactions.length / pageSize)
      }
    }),
    enabled: isOpen && !!inventoryId,
    staleTime: 30000
  })

  const transactions = transactionsData?.transactions || []
  const total = transactionsData?.total || 0
  const totalPages = transactionsData?.totalPages || 0

  if (!isOpen) return null

  const transactionTypes = [
    { value: 'all', label: 'All Types' },
    { value: 'receipt', label: 'Receipts' },
    { value: 'issue', label: 'Issues' },
    { value: 'return', label: 'Returns' },
    { value: 'adjustment', label: 'Adjustments' },
    { value: 'transfer', label: 'Transfers' },
    { value: 'write_off', label: 'Write-offs' }
  ]

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-6 border w-full max-w-4xl shadow-xl rounded-lg bg-white max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <ClockIcon className="h-6 w-6 text-blue-600" />
            <h3 className="text-xl font-semibold text-gray-900">Transaction History</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Filters */}
        <div className="mb-4 flex items-center gap-3 flex-shrink-0">
          <FunnelIcon className="h-5 w-5 text-gray-400" />
          <select
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value)
              setPage(1)
            }}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {transactionTypes.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
          <span className="text-sm text-gray-500">
            {total} transaction{total !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Transactions List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-sm text-gray-500">Loading transactions...</div>
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-sm text-gray-500">No transactions found</div>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((txn, idx) => (
                <div key={idx} className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded capitalize ${
                          txn.type === 'receipt' || txn.type === 'return' ? 'bg-green-100 text-green-700' :
                          txn.type === 'issue' || txn.type === 'write_off' ? 'bg-red-100 text-red-700' :
                          txn.type === 'adjustment' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {txn.type}
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          {txn.performedAt ? format(new Date(txn.performedAt), 'MM/dd/yyyy h:mm:ss a') : 'N/A'}
                        </span>
                        {txn.receipt?.receivedBy && (
                          <span className="text-xs text-gray-500">
                            by {txn.receipt.receivedBy.name || txn.performedBy?.name || 'Unknown'}
                          </span>
                        )}
                      </div>
                      
                      {/* Receipt Details */}
                      {txn.receipt && (
                        <div className="mt-2 p-2 bg-white rounded border border-gray-200">
                          <div className="flex items-center gap-2 mb-1">
                            <DocumentTextIcon className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-medium text-gray-900">
                              Receipt: {txn.receipt.receiptNumber}
                            </span>
                            <button
                              onClick={() => {
                                onClose()
                                navigate(`/receiving?receiptId=${txn.receiptId}`)
                              }}
                              className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                            >
                              <LinkIcon className="h-3 w-3" />
                              View Receipt
                            </button>
                          </div>
                          {txn.purchaseOrder && (
                            <div className="text-xs text-gray-600 ml-6">
                              PO: {txn.purchaseOrder.poNumber}
                              <button
                                onClick={() => {
                                  onClose()
                                  navigate(`/purchase-orders/${txn.purchaseOrder._id}`)
                                }}
                                className="ml-2 text-blue-600 hover:text-blue-700"
                              >
                                View PO
                              </button>
                            </div>
                          )}
                          {txn.receipt.deliveryDate && (
                            <div className="text-xs text-gray-600 ml-6">
                              Delivered: {format(new Date(txn.receipt.deliveryDate), 'MM/dd/yyyy')}
                            </div>
                          )}
                          {txn.receipt.locationPlaced && (
                            <div className="text-xs text-gray-600 ml-6">
                              Location: {txn.receipt.locationPlaced}
                            </div>
                          )}
                          {txn.receipt.billOfLadingPhoto && (
                            <div className="mt-2 ml-6">
                              <button
                                onClick={() => {
                                  const imageUrl = txn.receipt.billOfLadingPhoto.path?.startsWith('http')
                                    ? txn.receipt.billOfLadingPhoto.path
                                    : `${typeof window !== 'undefined' && window.location.hostname !== 'localhost' ? window.location.origin : import.meta.env.VITE_API_URL || 'http://localhost:3001'}${txn.receipt.billOfLadingPhoto.path?.startsWith('/') ? '' : '/'}${txn.receipt.billOfLadingPhoto.path}`
                                  window.open(imageUrl, '_blank')
                                }}
                                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                              >
                                <PhotoIcon className="h-3 w-3" />
                                View Bill of Lading
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Transaction Notes */}
                      {txn.notes && (
                        <div className="text-xs text-gray-600 mt-2">
                          <strong>Notes:</strong> {txn.notes}
                        </div>
                      )}
                      
                      {/* Condition (for receipts) */}
                      {txn.condition && txn.condition !== 'good' && (
                        <div className="text-xs text-yellow-600 mt-1">
                          Condition: {txn.condition.replace('_', ' ')}
                        </div>
                      )}
                      
                      {/* Location Transfer */}
                      {txn.fromLocation && txn.toLocation && (
                        <div className="text-xs text-gray-500 mt-1">
                          {txn.fromLocation} → {txn.toLocation}
                        </div>
                      )}
                      
                      {/* Reference (if no receipt) */}
                      {!txn.receipt && txn.referenceType && (
                        <div className="text-xs text-gray-500 mt-1">
                          Reference: {txn.referenceType}
                        </div>
                      )}
                    </div>
                    
                    <div className="text-right ml-4 flex-shrink-0">
                      <div className={`text-lg font-semibold ${
                        txn.type === 'receipt' || txn.type === 'return' ? 'text-green-600' :
                        txn.type === 'issue' || txn.type === 'write_off' ? 'text-red-600' :
                        'text-gray-600'
                      }`}>
                        {txn.type === 'receipt' || txn.type === 'return' ? '+' : ''}
                        {txn.type === 'adjustment' && txn.quantity > 0 ? '+' : ''}
                        {Math.abs(txn.quantity)}
                      </div>
                      {txn.unitCost && (
                        <div className="text-xs text-gray-500 mt-1">
                          ${txn.unitCost.toFixed(2)}/unit
                        </div>
                      )}
                      {txn.totalCost && (
                        <div className="text-xs text-gray-600 mt-1 font-medium">
                          ${txn.totalCost.toFixed(2)} total
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-gray-200 mt-4 flex-shrink-0">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

