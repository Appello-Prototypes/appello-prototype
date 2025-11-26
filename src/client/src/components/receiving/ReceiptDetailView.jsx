import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { 
  ArrowLeftIcon,
  DocumentTextIcon,
  CalendarIcon,
  MapPinIcon,
  UserIcon,
  PhotoIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { poReceiptAPI } from '../../services/api'
import { format } from 'date-fns'
import { formatCurrency } from '../../utils/currency'
import ReceiptStatusDropdown from '../ReceiptStatusDropdown'
import toast from 'react-hot-toast'

// Helper to get full image URL
const getImageUrl = (path) => {
  if (!path) return null
  // If already a full URL, return as-is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }
  // Otherwise, construct full URL using API base URL
  const baseURL = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
    ? window.location.origin
    : import.meta.env.VITE_API_URL || 'http://localhost:3001'
  return `${baseURL}${path.startsWith('/') ? path : `/${path}`}`
}

/**
 * Receipt Detail View Component
 * 
 * Shows full details of a PO receipt including line items, photos, and links
 */
export default function ReceiptDetailView({ receiptId, onBack }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: receipt, isLoading } = useQuery({
    queryKey: ['po-receipt', receiptId],
    queryFn: () => poReceiptAPI.getReceipt(receiptId).then(res => res.data.data),
    enabled: !!receiptId
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ receiptId, status }) => poReceiptAPI.updateReceipt(receiptId, { status }),
    onSuccess: () => {
      toast.success('Status updated successfully')
      queryClient.invalidateQueries(['po-receipt', receiptId])
      queryClient.invalidateQueries(['po-receipts'])
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update status')
    },
  })

  const handleStatusChange = (newStatus) => {
    updateStatusMutation.mutate({ receiptId, status: newStatus })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-gray-500">Loading receipt details...</div>
      </div>
    )
  }

  if (!receipt) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-gray-500">Receipt not found</p>
        {onBack && (
          <button
            onClick={onBack}
            className="mt-4 text-sm text-blue-600 hover:text-blue-700"
          >
            ← Back
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
          )}
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {receipt.receiptNumber || 'Receipt Details'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              PO Receipt Information
            </p>
          </div>
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <ReceiptStatusDropdown
            value={receipt.status || 'draft'}
            onChange={handleStatusChange}
            disabled={updateStatusMutation.isLoading}
          />
        </div>
      </div>

      {/* Receipt Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <DocumentTextIcon className="h-5 w-5 text-gray-400" />
            <h3 className="text-sm font-medium text-gray-900">Purchase Order</h3>
          </div>
          <button
            onClick={() => navigate(`/purchase-orders/${receipt.purchaseOrderId?._id || receipt.purchaseOrderId}`)}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            {receipt.purchaseOrderId?.poNumber || 'N/A'}
          </button>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <CalendarIcon className="h-5 w-5 text-gray-400" />
            <h3 className="text-sm font-medium text-gray-900">Delivery Date</h3>
          </div>
          <div className="text-sm text-gray-900">
            {receipt.deliveryDate ? format(new Date(receipt.deliveryDate), 'MM/dd/yyyy') : 'N/A'}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <UserIcon className="h-5 w-5 text-gray-400" />
            <h3 className="text-sm font-medium text-gray-900">Received By</h3>
          </div>
          <div className="text-sm text-gray-900">
            {receipt.receivedBy?.name || 'Unknown'}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {receipt.receivedAt ? format(new Date(receipt.receivedAt), 'MM/dd/yyyy h:mm a') : ''}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <MapPinIcon className="h-5 w-5 text-gray-400" />
            <h3 className="text-sm font-medium text-gray-900">Location Placed</h3>
          </div>
          <div className="text-sm text-gray-900">
            {receipt.locationPlaced || 'Not specified'}
          </div>
        </div>
      </div>

      {/* Bill of Lading Photo */}
      {receipt.billOfLadingPhoto && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
            <PhotoIcon className="h-5 w-5" />
            Bill of Lading
          </h3>
          <div className="relative">
            <img
              src={getImageUrl(receipt.billOfLadingPhoto.path)}
              alt="Bill of Lading"
              className="max-w-md rounded-lg border border-gray-200 cursor-pointer hover:opacity-90"
              onError={(e) => {
                console.error('Failed to load bill of lading image:', receipt.billOfLadingPhoto.path)
                e.target.style.display = 'none'
              }}
              onClick={() => window.open(getImageUrl(receipt.billOfLadingPhoto.path), '_blank')}
            />
            <div className="mt-2 text-xs text-gray-500">
              {receipt.billOfLadingPhoto.originalName || 'Bill of Lading'}
            </div>
          </div>
        </div>
      )}

      {/* Material Photos */}
      {receipt.materialPhotos && receipt.materialPhotos.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
            <PhotoIcon className="h-5 w-5" />
            Material Photos ({receipt.materialPhotos.length})
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {receipt.materialPhotos.map((photo, idx) => (
              <div key={idx} className="relative">
                <img
                  src={getImageUrl(photo.path)}
                  alt={photo.description || `Material photo ${idx + 1}`}
                  className="w-full h-32 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90"
                  onError={(e) => {
                    console.error('Failed to load material photo:', photo.path)
                    e.target.style.display = 'none'
                  }}
                  onClick={() => window.open(getImageUrl(photo.path), '_blank')}
                />
                {photo.description && (
                  <div className="mt-1 text-xs text-gray-500 truncate">
                    {photo.description}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Receipt Line Items */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-4">Received Items</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ordered</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Received</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Condition</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {receipt.receiptItems?.map((item, idx) => (
                <tr key={idx}>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {item.productName || 'N/A'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {item.quantityOrdered} {item.unit}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {item.quantityReceived} {item.unit}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {formatCurrency(item.unitPrice || 0)}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {formatCurrency(item.extendedCost || 0)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${
                      item.condition === 'good' ? 'bg-green-100 text-green-700' :
                      item.condition === 'damaged' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {item.condition || 'good'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {item.conditionNotes || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td colSpan="4" className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                  Total Received:
                </td>
                <td className="px-4 py-3 text-sm font-bold text-gray-900">
                  {formatCurrency(receipt.totalReceived || 0)}
                </td>
                <td colSpan="2"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Notes */}
      {receipt.notes && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Notes</h3>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{receipt.notes}</p>
        </div>
      )}
    </div>
  )
}

