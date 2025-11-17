import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { 
  CurrencyDollarIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  DocumentArrowUpIcon
} from '@heroicons/react/24/outline'
import { api } from '../services/api'
import toast from 'react-hot-toast'

const EarnedVsBurned = () => {
  const { jobId } = useParams()
  const [analysis, setAnalysis] = useState([])
  const [totals, setTotals] = useState({})
  const [meta, setMeta] = useState({})
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('summary') // summary, detail, trends

  useEffect(() => {
    if (jobId) {
      fetchEarnedVsBurnedData()
    }
  }, [jobId])

  const fetchEarnedVsBurnedData = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/api/financial/${jobId}/earned-vs-burned`)
      setAnalysis(response.data.data)
      setTotals(response.data.totals)
      setMeta(response.data.meta)
    } catch (error) {
      toast.error('Failed to load earned vs burned analysis')
      console.error('Error fetching earned vs burned:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'on_budget':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case 'at_risk':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
      case 'over_budget':
        return <XCircleIcon className="h-5 w-5 text-red-500" />
      default:
        return <ChartBarIcon className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'on_budget':
        return 'bg-green-100 text-green-800'
      case 'at_risk':
        return 'bg-yellow-100 text-yellow-800'
      case 'over_budget':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const overallHealthStatus = totals.variancePercent >= 0 ? 'on_budget' :
                             totals.variancePercent >= -10 ? 'at_risk' : 'over_budget'

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CurrencyDollarIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Contract Value</div>
              <div className="text-xl font-bold text-gray-900">{formatCurrency(totals.contractValue)}</div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ChartBarIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Earned Value</div>
              <div className="text-xl font-bold text-gray-900">{formatCurrency(totals.earnedValue)}</div>
              <div className="text-xs text-gray-500">{totals.overallProgress?.toFixed(1)}% complete</div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <DocumentArrowUpIcon className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Total Burned</div>
              <div className="text-xl font-bold text-gray-900">{formatCurrency(totals.totalCost)}</div>
              <div className="text-xs text-gray-500">
                Labor: {formatCurrency(totals.laborCost)} | AP: {formatCurrency(totals.apCost)}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              {totals.variance >= 0 ? (
                <ArrowUpIcon className="h-8 w-8 text-green-600" />
              ) : (
                <ArrowDownIcon className="h-8 w-8 text-red-600" />
              )}
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Variance</div>
              <div className={`text-xl font-bold ${totals.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(Math.abs(totals.variance))}
              </div>
              <div className="text-xs text-gray-500">
                {totals.variancePercent?.toFixed(1)}% {totals.variance >= 0 ? 'under' : 'over'} budget
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              {getStatusIcon(overallHealthStatus)}
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Project Health</div>
              <div className="text-lg font-bold text-gray-900 capitalize">
                {overallHealthStatus.replace('_', ' ')}
              </div>
              <div className="text-xs text-gray-500">
                {meta.onBudgetCount} on budget, {meta.overBudgetCount} over budget
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* View Mode Selector */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">Earned vs Burned Analysis</h2>
          <div className="flex rounded-md shadow-sm">
            {[
              { id: 'summary', name: 'Summary' },
              { id: 'detail', name: 'Detailed View' },
              { id: 'trends', name: 'Trends' }
            ].map((mode) => (
              <button
                key={mode.id}
                onClick={() => setViewMode(mode.id)}
                className={`${
                  viewMode === mode.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                } relative inline-flex items-center px-4 py-2 text-sm font-medium border border-gray-300 first:rounded-l-md last:rounded-r-md`}
              >
                {mode.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Analysis Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Cost Code Analysis ({analysis.length} line items)
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Line Item
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  System/Area
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contract Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  % Complete
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Earned Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Labor Cost
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  AP Cost
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Burned
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Variance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {analysis.map((item) => (
                <tr key={`${item.lineNumber}-${item.costCode}`} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{item.lineNumber}</div>
                    <div className="text-sm text-gray-500">{item.costCode}</div>
                    <div className="text-xs text-gray-400 truncate max-w-xs">{item.description}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>
                      {item.system && (
                        <div className="text-xs text-blue-600">SYS: {item.system}</div>
                      )}
                      {item.area && (
                        <div className="text-xs text-green-600">AREA: {item.area}</div>
                      )}
                      {item.phase && (
                        <div className="text-xs text-purple-600">PHASE: {item.phase}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(item.contractValue)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${item.percentComplete}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-900">{item.percentComplete}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                    {formatCurrency(item.earnedValue)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <Link 
                      to={`/jobs/${jobId}/timelog-register?costCode=${item.costCode}`}
                      className="text-blue-600 hover:text-blue-500 hover:underline"
                    >
                      {formatCurrency(item.laborCost)}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <Link 
                      to={`/jobs/${jobId}/ap-register?costCode=${item.costCode}`}
                      className="text-blue-600 hover:text-blue-500 hover:underline"
                    >
                      {formatCurrency(item.apCost)}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                    {formatCurrency(item.totalCost)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`flex items-center ${item.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {item.variance >= 0 ? (
                        <ArrowUpIcon className="h-4 w-4 mr-1" />
                      ) : (
                        <ArrowDownIcon className="h-4 w-4 mr-1" />
                      )}
                      <span className="text-sm font-medium">
                        {formatCurrency(Math.abs(item.variance))}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {item.variancePercent?.toFixed(1)}%
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(item.status)}
                      <span className={`ml-2 inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(item.status)}`}>
                        {item.status.replace('_', ' ')}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Summary</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Earned vs Burned Ratio</span>
              <span className={`text-lg font-bold ${
                totals.earnedValue >= totals.totalCost ? 'text-green-600' : 'text-red-600'
              }`}>
                {(totals.earnedValue / totals.totalCost).toFixed(2)}:1
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Budget Utilization</span>
              <span className="text-lg font-bold text-gray-900">
                {((totals.totalCost / totals.contractValue) * 100).toFixed(1)}%
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Projected Final Cost</span>
              <span className="text-lg font-bold text-gray-900">
                {formatCurrency((totals.totalCost / totals.overallProgress) * 100)}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Projected Margin</span>
              <span className={`text-lg font-bold ${
                (totals.contractValue - (totals.totalCost / totals.overallProgress * 100)) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(totals.contractValue - (totals.totalCost / totals.overallProgress * 100))}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Cost Breakdown</h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded mr-2"></div>
                <span className="text-sm text-gray-700">Labor Cost</span>
              </div>
              <span className="text-sm font-medium text-gray-900">{formatCurrency(totals.laborCost)}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
                <span className="text-sm text-gray-700">Material/AP Cost</span>
              </div>
              <span className="text-sm font-medium text-gray-900">{formatCurrency(totals.apCost)}</span>
            </div>
            
            <div className="border-t border-gray-200 pt-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Total Burned</span>
                <span className="text-lg font-bold text-gray-900">{formatCurrency(totals.totalCost)}</span>
              </div>
            </div>
          </div>

          {/* Cost Distribution Chart Placeholder */}
          <div className="mt-6 h-32 bg-gray-50 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <ChartBarIcon className="mx-auto h-8 w-8 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">Cost Distribution Chart</p>
              <p className="text-xs text-gray-400">
                Labor: {((totals.laborCost / totals.totalCost) * 100).toFixed(1)}% | 
                Materials: {((totals.apCost / totals.totalCost) * 100).toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Items */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Recommended Actions</h3>
        
        <div className="space-y-3">
          {analysis.filter(item => item.status === 'over_budget').length > 0 && (
            <div className="flex items-start p-3 bg-red-50 rounded-lg">
              <XCircleIcon className="h-5 w-5 text-red-500 mr-3 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-red-800">
                  {analysis.filter(item => item.status === 'over_budget').length} line items over budget
                </div>
                <div className="text-sm text-red-600">
                  Review cost codes: {analysis.filter(item => item.status === 'over_budget').map(item => item.costCode).join(', ')}
                </div>
              </div>
            </div>
          )}
          
          {analysis.filter(item => item.status === 'at_risk').length > 0 && (
            <div className="flex items-start p-3 bg-yellow-50 rounded-lg">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 mr-3 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-yellow-800">
                  {analysis.filter(item => item.status === 'at_risk').length} line items at risk
                </div>
                <div className="text-sm text-yellow-600">
                  Monitor closely: {analysis.filter(item => item.status === 'at_risk').map(item => item.costCode).join(', ')}
                </div>
              </div>
            </div>
          )}
          
          {totals.variancePercent < -20 && (
            <div className="flex items-start p-3 bg-red-50 rounded-lg">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-3 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-red-800">
                  Project significantly over budget ({totals.variancePercent.toFixed(1)}%)
                </div>
                <div className="text-sm text-red-600">
                  Consider change orders or scope adjustments
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default EarnedVsBurned
