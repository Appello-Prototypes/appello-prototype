import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import Widget from '../Widget'
import { api } from '../../../services/api'
import {
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'

export default function AccountsPayableWidget({ id, config, isEditing, onEdit, onRemove }) {
  const { jobId } = useParams()
  const targetJobId = config.jobId || jobId
  const displayType = config.displayType || 'summary' // 'summary' or 'detailed'

  const { data: apData, isLoading } = useQuery({
    queryKey: ['ap-register', targetJobId],
    queryFn: async () => {
      if (!targetJobId) return null

      try {
        const response = await api.get(`/api/financial/${targetJobId}/ap-register`)
        const data = response.data.data || []
        const meta = response.data.meta || {}

        // Calculate summary
        const totalInvoices = data.length
        const totalAmount = meta.totalAmount || data.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0)
        const paidAmount = meta.paidAmount || data
          .filter(inv => inv.paymentStatus === 'paid')
          .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0)
        const outstandingAmount = totalAmount - paidAmount

        // Status breakdown
        const byStatus = {
          pending: data.filter(inv => inv.paymentStatus === 'pending').length,
          approved: data.filter(inv => inv.paymentStatus === 'approved').length,
          paid: data.filter(inv => inv.paymentStatus === 'paid').length,
          disputed: data.filter(inv => inv.paymentStatus === 'disputed').length,
        }

        // Aging analysis
        const now = new Date()
        const aging = {
          '0-30': 0,
          '31-60': 0,
          '61-90': 0,
          '90+': 0,
        }

        data.forEach(inv => {
          if (inv.paymentStatus !== 'paid' && inv.dueDate) {
            const daysPastDue = Math.floor((now - new Date(inv.dueDate)) / (1000 * 60 * 60 * 24))
            if (daysPastDue <= 30) aging['0-30'] += inv.totalAmount || 0
            else if (daysPastDue <= 60) aging['31-60'] += inv.totalAmount || 0
            else if (daysPastDue <= 90) aging['61-90'] += inv.totalAmount || 0
            else aging['90+'] += inv.totalAmount || 0
          }
        })

        return {
          totalInvoices,
          totalAmount,
          paidAmount,
          outstandingAmount,
          byStatus,
          aging,
          invoices: data.slice(0, config.maxItems || 10),
        }
      } catch (error) {
        console.error('Error fetching AP data:', error)
        return null
      }
    },
    enabled: !!targetJobId,
    staleTime: 60 * 1000,
  })

  const { data: job } = useQuery({
    queryKey: ['job', targetJobId],
    queryFn: () => api.get(`/api/jobs/${targetJobId}`).then(res => res.data.data),
    enabled: !!targetJobId,
    staleTime: 60 * 1000,
  })

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value || 0)
  }

  if (!targetJobId) {
    return (
      <Widget
        id={id}
        type="accountsPayable"
        title="Accounts Payable"
        config={config}
        isLoading={false}
        isEditing={isEditing}
        onEdit={onEdit}
        onRemove={onRemove}
      >
        <div className="text-sm text-gray-500">Select a job to view AP summary</div>
      </Widget>
    )
  }

  if (!apData) {
    return (
      <Widget
        id={id}
        type="accountsPayable"
        title={job ? `${job.name} - AP` : 'Accounts Payable'}
        config={config}
        isLoading={isLoading}
        isEditing={isEditing}
        onEdit={onEdit}
        onRemove={onRemove}
      >
        <div className="text-sm text-gray-500">No AP data available</div>
      </Widget>
    )
  }

  if (displayType === 'summary') {
    return (
      <Widget
        id={id}
        type="accountsPayable"
        title={job ? `${job.name} - AP Summary` : 'Accounts Payable Summary'}
        config={config}
        isLoading={isLoading}
        isEditing={isEditing}
        onEdit={onEdit}
        onRemove={onRemove}
      >
        <div className="space-y-4">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-gray-500 mb-1">Total Invoices</div>
              <div className="text-lg font-bold text-gray-900">{apData.totalInvoices}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Outstanding</div>
              <div className="text-lg font-bold text-red-600">{formatCurrency(apData.outstandingAmount)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Total Amount</div>
              <div className="text-lg font-bold text-gray-900">{formatCurrency(apData.totalAmount)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Paid</div>
              <div className="text-lg font-bold text-green-600">{formatCurrency(apData.paidAmount)}</div>
            </div>
          </div>

          {/* Status Breakdown */}
          <div className="pt-3 border-t border-gray-200">
            <div className="text-xs font-medium text-gray-700 mb-2">By Status</div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <div className="flex items-center">
                  <ClockIcon className="h-4 w-4 text-yellow-500 mr-1" />
                  <span className="text-gray-600">Pending</span>
                </div>
                <span className="font-medium">{apData.byStatus.pending}</span>
              </div>
              <div className="flex justify-between text-sm">
                <div className="flex items-center">
                  <CheckCircleIcon className="h-4 w-4 text-blue-500 mr-1" />
                  <span className="text-gray-600">Approved</span>
                </div>
                <span className="font-medium">{apData.byStatus.approved}</span>
              </div>
              <div className="flex justify-between text-sm">
                <div className="flex items-center">
                  <CheckCircleIcon className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-gray-600">Paid</span>
                </div>
                <span className="font-medium">{apData.byStatus.paid}</span>
              </div>
              {apData.byStatus.disputed > 0 && (
                <div className="flex justify-between text-sm">
                  <div className="flex items-center">
                    <ExclamationTriangleIcon className="h-4 w-4 text-red-500 mr-1" />
                    <span className="text-gray-600">Disputed</span>
                  </div>
                  <span className="font-medium">{apData.byStatus.disputed}</span>
                </div>
              )}
            </div>
          </div>

          {/* Aging Analysis */}
          <div className="pt-3 border-t border-gray-200">
            <div className="text-xs font-medium text-gray-700 mb-2">Aging Analysis</div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">0-30 days:</span>
                <span className="font-medium">{formatCurrency(apData.aging['0-30'])}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">31-60 days:</span>
                <span className="font-medium text-yellow-600">{formatCurrency(apData.aging['31-60'])}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">61-90 days:</span>
                <span className="font-medium text-orange-600">{formatCurrency(apData.aging['61-90'])}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">90+ days:</span>
                <span className="font-medium text-red-600">{formatCurrency(apData.aging['90+'])}</span>
              </div>
            </div>
          </div>

          {targetJobId && (
            <Link
              to={`/jobs/${targetJobId}`}
              className="block text-center text-sm text-blue-600 hover:text-blue-500 pt-2 border-t border-gray-200"
            >
              View AP Register →
            </Link>
          )}
        </div>
      </Widget>
    )
  }

  // Detailed view
  return (
    <Widget
      id={id}
      type="accountsPayable"
      title={job ? `${job.name} - AP Details` : 'Accounts Payable'}
      config={config}
      isLoading={isLoading}
      isEditing={isEditing}
      onEdit={onEdit}
      onRemove={onRemove}
    >
      <div className="space-y-2">
        {apData.invoices && apData.invoices.length > 0 ? (
          apData.invoices.map((invoice) => (
            <div key={invoice._id} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {invoice.invoiceNumber}
                  </div>
                  <div className="text-xs text-gray-500">
                    {invoice.vendor?.name || 'Unknown Vendor'}
                  </div>
                </div>
                <div className="text-right ml-2">
                  <div className="text-sm font-medium text-gray-900">
                    {formatCurrency(invoice.totalAmount)}
                  </div>
                  <div className={`text-xs px-1.5 py-0.5 rounded ${
                    invoice.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' :
                    invoice.paymentStatus === 'approved' ? 'bg-blue-100 text-blue-700' :
                    invoice.paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {invoice.paymentStatus}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-sm text-gray-500">No invoices found</div>
        )}
      </div>
    </Widget>
  )
}

