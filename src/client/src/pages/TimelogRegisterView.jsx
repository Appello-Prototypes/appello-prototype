import React, { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { 
  ClockIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  UserIcon,
  CurrencyDollarIcon,
  CalendarDaysIcon,
  WrenchScrewdriverIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { api } from '../services/api'
import toast from 'react-hot-toast'

const TimelogRegisterView = () => {
  const { jobId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const [timelogEntries, setTimelogEntries] = useState([])
  const [summary, setSummary] = useState([])
  const [meta, setMeta] = useState({})
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState({
    worker: searchParams.get('worker') || '',
    costCode: searchParams.get('costCode') || '',
    craft: searchParams.get('craft') || '',
    startDate: searchParams.get('startDate') || '',
    endDate: searchParams.get('endDate') || ''
  })
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    if (jobId) {
      fetchTimelogData()
    }
  }, [jobId, filters])

  const fetchTimelogData = async () => {
    try {
      setLoading(true)
      const params = {}
      if (filters.startDate) params.startDate = filters.startDate
      if (filters.endDate) params.endDate = filters.endDate
      if (filters.worker) params.worker = filters.worker
      if (filters.costCode) params.costCode = filters.costCode
      if (filters.craft) params.craft = filters.craft

      const response = await api.get(`/api/financial/${jobId}/timelog-register`, { params })
      setTimelogEntries(response.data.data)
      setSummary(response.data.summary)
      setMeta(response.data.meta)
    } catch (error) {
      toast.error('Failed to load timelog register data')
      console.error('Error fetching timelog data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    
    // Update URL params
    const params = new URLSearchParams()
    Object.entries(newFilters).forEach(([k, v]) => {
      if (v) params.set(k, v)
    })
    setSearchParams(params)
  }

  const clearFilters = () => {
    setFilters({
      worker: '',
      costCode: '',
      craft: '',
      startDate: '',
      endDate: ''
    })
    setSearchParams({})
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const getCraftColor = (craft) => {
    const colors = {
      'insulation': 'bg-blue-100 text-blue-800',
      'painting': 'bg-green-100 text-green-800',
      'heat_tracing': 'bg-purple-100 text-purple-800',
      'fireproofing': 'bg-red-100 text-red-800',
      'equipment': 'bg-orange-100 text-orange-800',
      'general': 'bg-gray-100 text-gray-800'
    }
    return colors[craft] || 'bg-gray-100 text-gray-800'
  }

  const getTradeLevelColor = (level) => {
    const colors = {
      'apprentice': 'bg-yellow-100 text-yellow-800',
      'journeyman': 'bg-blue-100 text-blue-800',
      'foreman': 'bg-green-100 text-green-800',
      'supervisor': 'bg-purple-100 text-purple-800',
      'general_foreman': 'bg-indigo-100 text-indigo-800'
    }
    return colors[level] || 'bg-gray-100 text-gray-800'
  }

  const filteredEntries = timelogEntries.filter(entry => 
    entry.workerId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.costCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.workDescription.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ClockIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Total Hours</div>
              <div className="text-2xl font-bold text-gray-900">{(meta.totalHours || 0).toFixed(1)}</div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Total Cost</div>
              <div className="text-2xl font-bold text-gray-900">{formatCurrency(meta.totalCost || 0)}</div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <UserIcon className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Time Entries</div>
              <div className="text-2xl font-bold text-gray-900">{meta.total || 0}</div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <WrenchScrewdriverIcon className="h-8 w-8 text-orange-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Avg Cost/Hour</div>
              <div className="text-2xl font-bold text-gray-900">
                {meta.totalHours > 0 ? formatCurrency(meta.totalCost / meta.totalHours) : '$0'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-medium text-gray-900">Timelog Register</h2>
            <div className="relative">
              <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search workers, cost codes, descriptions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <FunnelIcon className="h-4 w-4 mr-2" />
              Filters
            </button>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Worker</label>
                <input
                  type="text"
                  value={filters.worker}
                  onChange={(e) => handleFilterChange('worker', e.target.value)}
                  placeholder="Worker name"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Cost Code</label>
                <input
                  type="text"
                  value={filters.costCode}
                  onChange={(e) => handleFilterChange('costCode', e.target.value)}
                  placeholder="Cost code"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Craft</label>
                <select
                  value={filters.craft}
                  onChange={(e) => handleFilterChange('craft', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">All Crafts</option>
                  <option value="insulation">Insulation</option>
                  <option value="painting">Painting</option>
                  <option value="heat_tracing">Heat Tracing</option>
                  <option value="fireproofing">Fireproofing</option>
                  <option value="equipment">Equipment</option>
                  <option value="general">General</option>
                  <option value="supervision">Supervision</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Date Range</label>
                <div className="flex space-x-2">
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                    className="flex-1 border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                    className="flex-1 border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="text-xs text-blue-600 hover:text-blue-500"
                >
                  Clear all filters
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Cost Code Summary */}
      {summary.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Labor Summary by Cost Code</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {summary.map((item) => (
                <div key={item._id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">{item._id}</span>
                    <span className="text-sm text-gray-500">{item.entries} entries</span>
                  </div>
                  <div className="text-lg font-bold text-gray-900">{formatCurrency(item.totalCost)}</div>
                  <div className="text-xs text-gray-500">
                    {item.totalHours.toFixed(1)} hours | Avg: {formatCurrency(item.totalCost / item.totalHours)}/hr
                  </div>
                  {item.overtimeHours > 0 && (
                    <div className="text-xs text-orange-600">
                      OT: {item.overtimeHours.toFixed(1)} hrs
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Timelog Register Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Timelog Register ({filteredEntries.length} entries)
          </h3>
        </div>

        {filteredEntries.length === 0 ? (
          <div className="text-center py-12">
            <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No timelog entries found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {timelogEntries.length === 0 ? 'No timelog entries for this job yet.' : 'Try adjusting your search or filters.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Worker
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cost Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hours
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Labor Cost
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Cost
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Units
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Work Description
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEntries.map((entry) => (
                  <tr key={entry._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(entry.workDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{entry.workerId?.name}</div>
                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getCraftColor(entry.craft)}`}>
                              {entry.craft}
                            </span>
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getTradeLevelColor(entry.tradeLevel)}`}>
                              {entry.tradeLevel.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{entry.costCode}</div>
                      <div className="text-sm text-gray-500">{entry.costCodeDescription}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{entry.totalHours}h</div>
                      {entry.overtimeHours > 0 && (
                        <div className="text-xs text-orange-600">+{entry.overtimeHours}h OT</div>
                      )}
                      {entry.doubleTimeHours > 0 && (
                        <div className="text-xs text-red-600">+{entry.doubleTimeHours}h DT</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="text-sm font-medium">${entry.baseHourlyRate.toFixed(2)}/hr</div>
                      {entry.overtimeHours > 0 && (
                        <div className="text-xs text-orange-600">OT: ${entry.overtimeRate.toFixed(2)}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(entry.totalLaborCost)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{formatCurrency(entry.totalCostWithBurden)}</div>
                      <div className="text-xs text-gray-500">
                        Burden: {formatCurrency(entry.totalBurdenCost)} ({(entry.burdenRate * 100).toFixed(0)}%)
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {entry.unitsCompleted?.quantity > 0 ? (
                        <div className="text-sm text-gray-900">
                          <div>{entry.unitsCompleted.quantity} {entry.unitsCompleted.unit}</div>
                          <div className="text-xs text-gray-500">
                            {entry.productivityRate?.toFixed(1)} {entry.unitsCompleted.unit}/hr
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                      <div className="truncate" title={entry.workDescription}>
                        {entry.workDescription}
                      </div>
                      {entry.location?.area && (
                        <div className="text-xs text-gray-400 mt-1">
                          {entry.location.area} - {entry.location.zone}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default TimelogRegisterView
