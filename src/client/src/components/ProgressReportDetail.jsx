import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { XMarkIcon, InformationCircleIcon } from '@heroicons/react/24/outline'
import { api } from '../services/api'
import toast from 'react-hot-toast'

export default function ProgressReportDetail({ report, jobId, job, onClose }) {
  const queryClient = useQueryClient()
  const isEdit = !!report
  const [formData, setFormData] = useState({
    reportNumber: '',
    reportDate: format(new Date(), 'yyyy-MM-dd'),
    completedByName: '',
    lineItems: []
  })

  const { data: reportData, isLoading } = useQuery({
    queryKey: ['progress-report', jobId, report?._id],
    queryFn: () => api.get(`/api/financial/${jobId}/progress-report/${report._id}`).then(res => res.data.data),
    enabled: isEdit && !!report?._id
  })

  const { data: previousReport } = useQuery({
    queryKey: ['previous-progress-report', jobId, formData.reportDate],
    queryFn: () => api.get(`/api/financial/${jobId}/progress-reports`).then(res => {
      const reports = res.data.data
      const currentDate = new Date(formData.reportDate)
      const previous = reports.find(r => new Date(r.reportDate) < currentDate)
      return previous || null
    }),
    enabled: !!jobId && !!formData.reportDate
  })

  const createMutation = useMutation({
    mutationFn: (data) => api.post(`/api/financial/${jobId}/progress-report`, data),
    onSuccess: () => {
      toast.success('Progress report created successfully')
      onClose()
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create progress report')
    }
  })

  const updateMutation = useMutation({
    mutationFn: (data) => api.put(`/api/financial/${jobId}/progress-report/${report._id}`, data),
    onSuccess: () => {
      toast.success('Progress report updated successfully')
      onClose()
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update progress report')
    }
  })

  useEffect(() => {
    if (isEdit && reportData) {
      setFormData({
        reportNumber: reportData.reportNumber,
        reportDate: format(new Date(reportData.reportDate), 'yyyy-MM-dd'),
        completedByName: reportData.completedByName || '',
        lineItems: reportData.lineItems || []
      })
    } else if (!isEdit) {
      // Create new report - get next report number
      // Fetch existing reports to determine next number
      api.get(`/api/financial/${jobId}/progress-reports`).then(res => {
        const reports = res.data.data || []
        const reportNumbers = reports.map(r => {
          const match = r.reportNumber.match(/PR-(\d+)/)
          return match ? parseInt(match[1]) : 0
        })
        const maxNumber = reportNumbers.length > 0 ? Math.max(...reportNumbers) : 0
        const nextReportNumber = `PR-${String(maxNumber + 1).padStart(2, '0')}`
        
        setFormData({
          reportNumber: nextReportNumber,
          reportDate: format(new Date(), 'yyyy-MM-dd'),
          completedByName: '',
          lineItems: []
        })
      }).catch(() => {
        // Fallback if fetch fails
        setFormData({
          reportNumber: 'PR-01',
          reportDate: format(new Date(), 'yyyy-MM-dd'),
          completedByName: '',
          lineItems: []
        })
      })
    }
  }, [isEdit, reportData, previousReport])

  // Initialize line items from SOV when creating new report
  useEffect(() => {
    if (!isEdit && jobId && formData.lineItems.length === 0 && formData.reportDate) {
      // Fetch SOV items directly
      api.get(`/api/sov/job/${jobId}`).then(sovRes => {
        const sovItems = sovRes.data.data || []
        if (sovItems.length === 0) return
        
        const lineItemsMap = new Map()
        
        sovItems.forEach(sov => {
          const areaName = sov.areaId?.name || 'Unknown Area'
          const systemName = sov.systemId?.name || 'Unknown System'
          const key = `${areaName}-${systemName}`

          if (!lineItemsMap.has(key)) {
            lineItemsMap.set(key, {
              scheduleOfValuesId: sov._id,
              areaId: sov.areaId?._id,
              areaName,
              systemId: sov.systemId?._id,
              systemName,
              description: sov.description || '',
              assignedCost: sov.totalValue || 0,
              submittedCTD: { amount: 0, percent: 0 },
              approvedCTD: { amount: 0, percent: 0 },
              previousComplete: { amount: 0, percent: 0 },
              holdbackPercent: 10
            })
          } else {
            const existing = lineItemsMap.get(key)
            existing.assignedCost += sov.totalValue || 0
          }
        })

        // Populate previous complete from previous report
        if (previousReport && previousReport.lineItems) {
          previousReport.lineItems.forEach(prevItem => {
            const key = `${prevItem.areaName}-${prevItem.systemName}`
            if (lineItemsMap.has(key)) {
              const currentItem = lineItemsMap.get(key)
              currentItem.previousComplete = {
                amount: prevItem.approvedCTD?.amount || 0,
                percent: prevItem.approvedCTD?.percent || 0
              }
            }
          })
        }

        setFormData(prev => ({
          ...prev,
          lineItems: Array.from(lineItemsMap.values())
        }))
      }).catch(err => {
        console.error('Error fetching SOV items:', err)
      })
    }
  }, [isEdit, jobId, formData.reportDate, formData.reportNumber, previousReport])

  const handleLineItemChange = (index, field, value) => {
    const updatedLineItems = [...formData.lineItems]
    const item = { ...updatedLineItems[index] }

    if (field.startsWith('submittedCTD.')) {
      const subField = field.split('.')[1]
      item.submittedCTD = { ...item.submittedCTD, [subField]: Number(value) }
      if (subField === 'percent') {
        item.submittedCTD.amount = Math.round(((item.assignedCost * Number(value)) / 100) * 100) / 100
        item.submittedCTD.percent = Math.round(Number(value) * 100) / 100
      } else if (subField === 'amount') {
        item.submittedCTD.amount = Math.round(Number(value) * 100) / 100
        item.submittedCTD.percent = item.assignedCost > 0 ? Math.round(((Number(value) / item.assignedCost) * 100) * 100) / 100 : 0
      }
    } else if (field.startsWith('approvedCTD.')) {
      const subField = field.split('.')[1]
      item.approvedCTD = { ...item.approvedCTD, [subField]: Number(value) }
      if (subField === 'percent') {
        item.approvedCTD.amount = Math.round(((item.assignedCost * Number(value)) / 100) * 100) / 100
        item.approvedCTD.percent = Math.round(Number(value) * 100) / 100
      } else if (subField === 'amount') {
        item.approvedCTD.amount = Math.round(Number(value) * 100) / 100
        item.approvedCTD.percent = item.assignedCost > 0 ? Math.round(((Number(value) / item.assignedCost) * 100) * 100) / 100 : 0
      }
    } else {
      item[field] = value
    }

    // Recalculate due this period
    const amountThisPeriod = Math.round((item.approvedCTD.amount - item.previousComplete.amount) * 100) / 100
    item.holdbackThisPeriod = Math.round(((amountThisPeriod * (item.holdbackPercent || 10)) / 100) * 100) / 100
    item.dueThisPeriod = Math.round((amountThisPeriod - item.holdbackThisPeriod) * 100) / 100

    updatedLineItems[index] = item
    setFormData({ ...formData, lineItems: updatedLineItems })
  }

  const handleSave = () => {
    const reportPeriodStart = new Date(formData.reportDate)
    reportPeriodStart.setDate(1) // First day of month
    const reportPeriodEnd = new Date(reportPeriodStart)
    reportPeriodEnd.setMonth(reportPeriodEnd.getMonth() + 1)
    reportPeriodEnd.setDate(0) // Last day of month

    const data = {
      reportNumber: formData.reportNumber,
      reportDate: formData.reportDate,
      reportPeriodStart: format(reportPeriodStart, 'yyyy-MM-dd'),
      reportPeriodEnd: format(reportPeriodEnd, 'yyyy-MM-dd'),
      completedByName: formData.completedByName,
      lineItems: formData.lineItems
    }

    if (isEdit) {
      updateMutation.mutate(data)
    } else {
      createMutation.mutate(data)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0)
  }

  const formatPercent = (value) => {
    return Number(value || 0).toFixed(2)
  }

  const isLocked = report?.status === 'invoiced' || report?.invoiceId
  const calculatedPercentCTD = formData.lineItems.length > 0
    ? Math.round((formData.lineItems.reduce((sum, item) => sum + (item.approvedCTD?.amount || 0), 0) /
      formData.lineItems.reduce((sum, item) => sum + (item.assignedCost || 0), 1) * 100) * 100) / 100
    : 0
  const previousPercentCTD = Math.round((previousReport?.summary?.calculatedPercentCTD || 0) * 100) / 100
  const totalDueThisPeriod = Math.round(formData.lineItems.reduce((sum, item) => sum + (item.dueThisPeriod || 0), 0) * 100) / 100

  if (isEdit && isLoading) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-7xl max-h-[90vh] overflow-y-auto">
          <div className="animate-pulse">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-7xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-5 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEdit ? 'Edit Progress Report' : 'Create Progress Report'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-8 space-y-8">
          {/* Report Details */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                As of:
              </label>
              <input
                type="date"
                value={formData.reportDate}
                onChange={(e) => setFormData({ ...formData, reportDate: e.target.value })}
                disabled={isLocked}
                className="form-input w-full"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Report Completed By:
              </label>
              <input
                type="text"
                value={formData.completedByName}
                onChange={(e) => setFormData({ ...formData, completedByName: e.target.value })}
                disabled={isLocked}
                className="form-input w-full"
                placeholder="Enter name"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                For Job:
              </label>
              <div className="text-gray-900 py-2">
                {job ? `${job.jobNumber} - ${job.name}` : 'Loading...'}
              </div>
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Customer:
              </label>
              <div className="text-gray-900 py-2">
                {job?.client?.name || '—'}
              </div>
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Job Value:
              </label>
              <div className="text-gray-900 py-2">
                {formatCurrency(job?.contractValue || 0)}
              </div>
            </div>
          </div>

          {/* Warning Banner */}
          {isLocked && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-5 flex items-start gap-4">
              <InformationCircleIcon className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-800 leading-relaxed">
                <strong>This progress report has already been associated with an invoice.</strong> Any changes will be automatically reflected on the invoice.
              </div>
            </div>
          )}

          {/* Summary Boxes */}
          <div className="grid grid-cols-4 gap-5">
            <div className="bg-purple-100 rounded-lg p-5">
              <div className="text-sm text-purple-700 font-medium mb-2">Previous Report</div>
              <div className="text-lg font-bold text-purple-900">
                {previousReport ? `${previousReport.reportNumber} - ${format(new Date(previousReport.reportDate), 'yyyy-MM-dd')}` : '—'}
              </div>
            </div>
            <div className="bg-yellow-100 rounded-lg p-5">
              <div className="text-sm text-yellow-700 font-medium mb-2">Previous % CTD</div>
              <div className="text-lg font-bold text-yellow-900">
                {formatPercent(previousPercentCTD)}%
              </div>
            </div>
            <div className="bg-blue-100 rounded-lg p-5">
              <div className="text-sm text-blue-700 font-medium mb-2">Calculated % CTD</div>
              <div className="text-lg font-bold text-blue-900">
                {formatPercent(calculatedPercentCTD)}%
              </div>
            </div>
            <div className="bg-green-100 rounded-lg p-5">
              <div className="text-sm text-green-700 font-medium mb-2">Due This Period</div>
              <div className="text-lg font-bold text-green-900">
                {formatCurrency(totalDueThisPeriod)}
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="overflow-x-auto -mx-8 px-8">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                    Area
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                    System
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider min-w-[200px]">
                    Description
                  </th>
                  <th className="px-5 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                    Assigned Cost
                  </th>
                  <th className="px-5 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <span>Submitted CTD</span>
                      <InformationCircleIcon className="h-4 w-4 text-gray-400" />
                    </div>
                    <div className="text-gray-500 font-normal mt-0.5">($)</div>
                  </th>
                  <th className="px-5 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <span>Submitted CTD</span>
                      <InformationCircleIcon className="h-4 w-4 text-gray-400" />
                    </div>
                    <div className="text-gray-500 font-normal mt-0.5">(%)</div>
                  </th>
                  <th className="px-5 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                    Approved CTD ($)
                  </th>
                  <th className="px-5 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                    Approved CTD (%)
                  </th>
                  <th className="px-5 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                    Previous Complete ($)
                  </th>
                  <th className="px-5 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <span>Previous Complete</span>
                      <InformationCircleIcon className="h-4 w-4 text-gray-400" />
                    </div>
                    <div className="text-gray-500 font-normal mt-0.5">(%)</div>
                  </th>
                  <th className="px-5 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <span>Holdback (10%)</span>
                      <InformationCircleIcon className="h-4 w-4 text-gray-400" />
                    </div>
                    <div className="text-gray-500 font-normal mt-0.5">($)</div>
                  </th>
                  <th className="px-5 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                    Due This Period ($)
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {formData.lineItems.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                      {item.areaName}
                    </td>
                    <td className="px-5 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                      {item.systemName}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600 leading-relaxed">
                      {item.description || '—'}
                    </td>
                    <td className="px-5 py-4 text-sm text-right text-gray-900 font-medium whitespace-nowrap">
                      {formatCurrency(item.assignedCost)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <input
                          type="number"
                          value={Number(item.submittedCTD?.amount || 0).toFixed(2)}
                          onChange={(e) => handleLineItemChange(index, 'submittedCTD.amount', e.target.value)}
                          disabled={isLocked}
                          className="w-28 text-right form-input text-sm px-3 py-2"
                          step="0.01"
                        />
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <input
                          type="number"
                          value={formatPercent(item.submittedCTD?.percent)}
                          onChange={(e) => handleLineItemChange(index, 'submittedCTD.percent', e.target.value)}
                          disabled={isLocked}
                          className="w-20 text-right form-input text-sm px-3 py-2"
                          step="0.01"
                          max="100"
                        />
                        <span className="text-sm text-gray-500">%</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <input
                          type="number"
                          value={Number(item.approvedCTD?.amount || 0).toFixed(2)}
                          onChange={(e) => handleLineItemChange(index, 'approvedCTD.amount', e.target.value)}
                          disabled={isLocked}
                          className="w-28 text-right form-input text-sm px-3 py-2"
                          step="0.01"
                        />
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <input
                          type="number"
                          value={formatPercent(item.approvedCTD?.percent)}
                          onChange={(e) => handleLineItemChange(index, 'approvedCTD.percent', e.target.value)}
                          disabled={isLocked}
                          className="w-20 text-right form-input text-sm px-3 py-2"
                          step="0.01"
                          max="100"
                        />
                        <span className="text-sm text-gray-500">%</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-right text-gray-900 font-medium whitespace-nowrap">
                      {formatCurrency(item.previousComplete?.amount || 0)}
                    </td>
                    <td className="px-5 py-4 text-sm text-right text-gray-900 font-medium whitespace-nowrap">
                      {formatPercent(item.previousComplete?.percent)}%
                    </td>
                    <td className="px-5 py-4 text-sm text-right text-gray-900 font-medium whitespace-nowrap">
                      {formatCurrency(item.holdbackThisPeriod || 0)}
                    </td>
                    <td className="px-5 py-4 text-sm text-right font-semibold text-gray-900 whitespace-nowrap">
                      {formatCurrency(item.dueThisPeriod || 0)}
                    </td>
                  </tr>
                ))}
                {/* Grand Total Row */}
                <tr className="bg-gray-100 border-t-2 border-gray-300 font-semibold">
                  <td colSpan="3" className="px-5 py-4 text-sm font-bold text-gray-900">
                    Grand Total
                  </td>
                  <td className="px-5 py-4 text-sm text-right font-bold text-gray-900 whitespace-nowrap">
                    {formatCurrency(formData.lineItems.reduce((sum, item) => sum + (item.assignedCost || 0), 0))}
                  </td>
                  <td className="px-5 py-4 text-sm text-right font-bold text-gray-900 whitespace-nowrap">
                    {formatCurrency(formData.lineItems.reduce((sum, item) => sum + (item.submittedCTD?.amount || 0), 0))}
                  </td>
                  <td className="px-5 py-4 text-sm text-right font-bold text-gray-900 whitespace-nowrap">
                    {formatPercent(
                      formData.lineItems.reduce((sum, item) => sum + (item.submittedCTD?.amount || 0), 0) /
                      formData.lineItems.reduce((sum, item) => sum + (item.assignedCost || 0), 1) * 100
                    )}%
                  </td>
                  <td className="px-5 py-4 text-sm text-right font-bold text-gray-900 whitespace-nowrap">
                    {formatCurrency(formData.lineItems.reduce((sum, item) => sum + (item.approvedCTD?.amount || 0), 0))}
                  </td>
                  <td className="px-5 py-4 text-sm text-right font-bold text-gray-900 whitespace-nowrap">
                    {formatPercent(calculatedPercentCTD)}%
                  </td>
                  <td className="px-5 py-4 text-sm text-right font-bold text-gray-900 whitespace-nowrap">
                    {formatCurrency(formData.lineItems.reduce((sum, item) => sum + (item.previousComplete?.amount || 0), 0))}
                  </td>
                  <td className="px-5 py-4 text-sm text-right font-bold text-gray-900 whitespace-nowrap">
                    {formatPercent(previousPercentCTD)}%
                  </td>
                  <td className="px-5 py-4 text-sm text-right font-bold text-gray-900 whitespace-nowrap">
                    {formatCurrency(formData.lineItems.reduce((sum, item) => sum + (item.holdbackThisPeriod || 0), 0))}
                  </td>
                  <td className="px-5 py-4 text-sm text-right font-bold text-gray-900 whitespace-nowrap">
                    {formatCurrency(totalDueThisPeriod)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-6 py-2.5 border border-gray-300 rounded-md text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isLocked || createMutation.isLoading || updateMutation.isLoading}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {createMutation.isLoading || updateMutation.isLoading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

