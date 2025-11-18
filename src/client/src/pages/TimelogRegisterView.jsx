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
  ExclamationTriangleIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'
import { api } from '../services/api'
import toast from 'react-hot-toast'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart
} from 'recharts'

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
  const [groupBy, setGroupBy] = useState('costCode')
  const [chartData, setChartData] = useState(null)
  const [groupedSummary, setGroupedSummary] = useState([])
  const [jobInfo, setJobInfo] = useState(null)

  useEffect(() => {
    if (jobId) {
      fetchTimelogData()
      fetchJobInfo()
    }
  }, [jobId, filters])

  useEffect(() => {
    if (timelogEntries.length > 0 && jobInfo) {
      processChartData()
    }
  }, [timelogEntries, groupBy, jobInfo])

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

  const fetchJobInfo = async () => {
    try {
      const response = await api.get(`/api/jobs/${jobId}`)
      setJobInfo(response.data.data)
    } catch (error) {
      console.error('Error fetching job info:', error)
    }
  }

  const processChartData = () => {
    if (!timelogEntries.length || !jobInfo) return

    const jobStart = new Date(jobInfo.startDate)
    const jobEnd = new Date(jobInfo.endDate)
    const jobDurationWeeks = Math.ceil((jobEnd - jobStart) / (1000 * 60 * 60 * 24 * 7))

    // Group entries by week and selected grouping dimension
    const laborByWeek = new Map()
    const groupTotals = new Map()

    timelogEntries.forEach(entry => {
      if (!entry.workDate) return

      const workDate = new Date(entry.workDate)
      const weekStart = new Date(workDate)
      weekStart.setDate(weekStart.getDate() - weekStart.getDay())
      weekStart.setHours(0, 0, 0, 0)
      
      const weekKey = weekStart.toISOString().split('T')[0]
      
      // Get grouping key based on selected dimension
      let groupKey = 'Unknown'
      let groupName = 'Unknown'
      
      switch (groupBy) {
        case 'costCode':
          groupKey = entry.costCode || 'Unknown'
          groupName = entry.costCodeName || entry.costCode || 'Unknown'
          break
        case 'system':
          groupKey = entry.systemId?._id?.toString() || entry.systemId || 'Unknown'
          groupName = entry.systemId?.name || 'Unknown System'
          break
        case 'area':
          groupKey = entry.areaId?._id?.toString() || entry.areaId || 'Unknown'
          groupName = entry.areaId?.name || 'Unknown Area'
          break
        case 'phase':
          groupKey = entry.phaseId?._id?.toString() || entry.phaseId || 'Unknown'
          groupName = entry.phaseId?.name || 'Unknown Phase'
          break
        case 'craft':
          groupKey = entry.craft || 'Unknown'
          groupName = entry.craft || 'Unknown'
          break
        case 'location':
          const area = entry.location?.area || 'Unknown'
          const zone = entry.location?.zone || ''
          groupKey = `${area}-${zone}`.trim()
          groupName = zone ? `${area} - ${zone}` : area
          break
        default:
          groupKey = entry.costCode || 'Unknown'
          groupName = entry.costCodeName || entry.costCode || 'Unknown'
      }

      if (!laborByWeek.has(weekKey)) {
        laborByWeek.set(weekKey, new Map())
      }

      const weekData = laborByWeek.get(weekKey)
      if (!weekData.has(groupKey)) {
        weekData.set(groupKey, { 
          hours: 0, 
          cost: 0, 
          entries: 0,
          regularHours: 0,
          overtimeHours: 0,
          doubleTimeHours: 0,
          regularCost: 0,
          overtimeCost: 0,
          doubleTimeCost: 0
        })
      }

      const groupData = weekData.get(groupKey)
      groupData.hours += entry.totalHours || 0
      groupData.cost += entry.totalCostWithBurden || entry.totalCost || 0
      groupData.entries += 1
      groupData.regularHours += entry.regularHours || 0
      groupData.overtimeHours += entry.overtimeHours || 0
      groupData.doubleTimeHours += entry.doubleTimeHours || 0
      groupData.regularCost += entry.regularCost || 0
      groupData.overtimeCost += entry.overtimeCost || 0
      groupData.doubleTimeCost += entry.doubleTimeCost || 0

      // Track totals by group
      if (!groupTotals.has(groupKey)) {
        groupTotals.set(groupKey, {
          totalHours: 0,
          totalCost: 0,
          name: groupName,
          entries: 0,
          regularHours: 0,
          overtimeHours: 0,
          doubleTimeHours: 0,
          regularCost: 0,
          overtimeCost: 0,
          doubleTimeCost: 0
        })
      }
      const total = groupTotals.get(groupKey)
      total.totalHours += entry.totalHours || 0
      total.totalCost += entry.totalCostWithBurden || entry.totalCost || 0
      total.entries += 1
      total.regularHours += entry.regularHours || 0
      total.overtimeHours += entry.overtimeHours || 0
      total.doubleTimeHours += entry.doubleTimeHours || 0
      total.regularCost += entry.regularCost || 0
      total.overtimeCost += entry.overtimeCost || 0
      total.doubleTimeCost += entry.doubleTimeCost || 0
    })

    // Get top groups by total hours
    const topGroups = Array.from(groupTotals.entries())
      .sort((a, b) => b[1].totalHours - a[1].totalHours)
      .slice(0, 5)
      .map(([key]) => key)

    // Build chart data - aggregate by week
    const chartDataArray = []
    const sortedWeeks = Array.from(laborByWeek.keys()).sort()

    sortedWeeks.forEach((weekKey) => {
      const weekData = laborByWeek.get(weekKey)
      const weekDate = new Date(weekKey)
      const weekNumber = Math.floor((weekDate - jobStart) / (1000 * 60 * 60 * 24 * 7)) + 1
      const progress = weekNumber / jobDurationWeeks
      const sCurveFactor = 3 * progress * progress - 2 * progress * progress * progress

      const dataPoint = {
        week: weekNumber,
        date: weekDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        actualHours: 0,
        actualCost: 0,
        regularHours: 0,
        overtimeHours: 0,
        doubleTimeHours: 0,
        regularCost: 0,
        overtimeCost: 0,
        doubleTimeCost: 0,
        sCurveFactor
      }

      // Sum actual hours and cost for all groups this week
      weekData.forEach((data, groupKey) => {
        dataPoint.actualHours += data.hours
        dataPoint.actualCost += data.cost
        dataPoint.regularHours += data.regularHours || 0
        dataPoint.overtimeHours += data.overtimeHours || 0
        dataPoint.doubleTimeHours += data.doubleTimeHours || 0
        dataPoint.regularCost += data.regularCost || 0
        dataPoint.overtimeCost += data.overtimeCost || 0
        dataPoint.doubleTimeCost += data.doubleTimeCost || 0

        // Add individual group data for top groups
        if (topGroups.includes(groupKey)) {
          const groupName = groupTotals.get(groupKey)?.name || groupKey
          const safeKey = groupKey.replace(/[^a-zA-Z0-9]/g, '_')
          dataPoint[`${safeKey}_hours`] = data.hours
          dataPoint[`${safeKey}_cost`] = data.cost
          dataPoint[`${safeKey}_name`] = groupName
        }
      })

      chartDataArray.push(dataPoint)
    })

    // Calculate planned hours using S-curve
    const totalActualHours = Array.from(groupTotals.values())
      .reduce((sum, total) => sum + total.totalHours, 0)

    let previousCumulative = 0
    chartDataArray.forEach((point) => {
      const cumulativePlannedHours = totalActualHours * point.sCurveFactor
      point.plannedHours = Math.max(0, cumulativePlannedHours - previousCumulative)
      previousCumulative = cumulativePlannedHours

      const avgHourlyRate = totalActualHours > 0
        ? (Array.from(groupTotals.values()).reduce((sum, total) => sum + total.totalCost, 0) / totalActualHours)
        : 50
      point.plannedCost = point.plannedHours * avgHourlyRate
    })

    // Prepare grouped summary for bar chart
    const groupedSummaryArray = Array.from(groupTotals.entries())
      .map(([key, data]) => ({
        key,
        name: data.name,
        totalHours: data.totalHours,
        totalCost: data.totalCost,
        entries: data.entries,
        regularHours: data.regularHours || 0,
        overtimeHours: data.overtimeHours || 0,
        doubleTimeHours: data.doubleTimeHours || 0,
        regularCost: data.regularCost || 0,
        overtimeCost: data.overtimeCost || 0,
        doubleTimeCost: data.doubleTimeCost || 0
      }))
      .sort((a, b) => b.totalHours - a.totalHours)

    setChartData({
      chartData: chartDataArray,
      topGroups,
      groupTotals: new Map(groupTotals),
      totalHours: totalActualHours,
      jobDurationWeeks
    })
    setGroupedSummary(groupedSummaryArray)
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

      {/* Overtime Summary Cards */}
      {(() => {
        const totalOTHours = timelogEntries.reduce((sum, e) => sum + (e.overtimeHours || 0), 0)
        const totalDTHours = timelogEntries.reduce((sum, e) => sum + (e.doubleTimeHours || 0), 0)
        const totalOTCost = timelogEntries.reduce((sum, e) => sum + (e.overtimeCost || 0) + (e.doubleTimeCost || 0), 0)
        const totalRegularHours = timelogEntries.reduce((sum, e) => sum + (e.regularHours || 0), 0)
        const totalRegularCost = timelogEntries.reduce((sum, e) => sum + (e.regularCost || 0), 0)
        const otPercentage = meta.totalHours > 0 ? (totalOTHours / meta.totalHours) * 100 : 0
        const otCostPercentage = meta.totalCost > 0 ? (totalOTCost / meta.totalCost) * 100 : 0
        
        return (
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Overtime Metrics</h2>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                otPercentage > 20 ? 'bg-red-100 text-red-800' :
                otPercentage > 10 ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              }`}>
                {otPercentage.toFixed(1)}% OT Hours
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="border-l-4 border-orange-500 pl-4">
                <div className="text-sm font-medium text-gray-500">Overtime Hours</div>
                <div className="text-2xl font-bold text-gray-900">{totalOTHours.toFixed(1)}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {totalDTHours > 0 && `${totalDTHours.toFixed(1)} DT hours`}
                </div>
              </div>
              
              <div className="border-l-4 border-red-500 pl-4">
                <div className="text-sm font-medium text-gray-500">Overtime Cost</div>
                <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalOTCost)}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {otCostPercentage.toFixed(1)}% of total cost
                </div>
              </div>
              
              <div className="border-l-4 border-blue-500 pl-4">
                <div className="text-sm font-medium text-gray-500">Regular Hours</div>
                <div className="text-2xl font-bold text-gray-900">{totalRegularHours.toFixed(1)}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {formatCurrency(totalRegularCost)} cost
                </div>
              </div>
              
              <div className="border-l-4 border-purple-500 pl-4">
                <div className="text-sm font-medium text-gray-500">OT Premium</div>
                <div className="text-2xl font-bold text-gray-900">
                  {totalRegularHours > 0 && totalOTHours > 0 
                    ? formatCurrency((totalOTCost / totalOTHours) - (totalRegularCost / totalRegularHours))
                    : '$0'}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Extra cost per OT hour
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Labor Distribution Charts */}
      {chartData && chartData.chartData.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Labor Distribution Analysis</h2>
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-700">Group by:</label>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="costCode">Cost Code</option>
                <option value="system">System</option>
                <option value="area">Area</option>
                <option value="phase">Phase</option>
                <option value="craft">Craft</option>
                <option value="location">Location</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Labor Hours Curve - Actual vs Planned */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Labor Hours Curve</h3>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={chartData.chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    interval="preserveStartEnd"
                  />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => {
                      if (name === 'plannedHours' || name === 'actualHours') {
                        return [`${value.toFixed(1)} hrs`, name === 'plannedHours' ? 'Planned (S-Curve)' : 'Actual']
                      }
                      return value
                    }}
                    contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="plannedHours" 
                    name="Planned (S-Curve)"
                    stroke="#94a3b8" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="actualHours" 
                    name="Actual Hours"
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-gray-700 font-medium mb-1">Labor Curve Analysis</p>
                <p className="text-xs text-gray-600">
                  Compare actual labor distribution against the planned S-curve. An ideal curve shows slow start, ramp up, peak, and slow finish.
                </p>
              </div>
            </div>

            {/* Top Groups Breakdown */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Top {groupBy === 'costCode' ? 'Cost Codes' : groupBy === 'system' ? 'Systems' : groupBy === 'area' ? 'Areas' : groupBy === 'phase' ? 'Phases' : groupBy === 'craft' ? 'Crafts' : 'Locations'} by Hours
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={groupedSummary.slice(0, 5)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => `${value.toFixed(1)} hrs`}
                    contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                  />
                  <Legend />
                  <Bar dataKey="totalHours" fill="#3b82f6" name="Total Hours" />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {groupedSummary.slice(0, 5).map((item, index) => (
                  <div key={item.key} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${
                        index === 0 ? 'bg-blue-500' :
                        index === 1 ? 'bg-green-500' :
                        index === 2 ? 'bg-purple-500' :
                        index === 3 ? 'bg-orange-500' : 'bg-gray-500'
                      }`} />
                      <span className="font-medium">{item.name}</span>
                    </div>
                    <span className="font-bold">{item.totalHours.toFixed(1)} hrs</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Overtime Charts */}
          {chartData && chartData.chartData.length > 0 && (
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Overtime Trend Over Time */}
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Overtime Trend</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={chartData.chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      interval="preserveStartEnd"
                    />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name) => {
                        if (name === 'regularHours') return [`${value.toFixed(1)} hrs`, 'Regular']
                        if (name === 'overtimeHours') return [`${value.toFixed(1)} hrs`, 'Overtime']
                        if (name === 'doubleTimeHours') return [`${value.toFixed(1)} hrs`, 'Double Time']
                        return value
                      }}
                      contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                    />
                    <Legend />
                    <Bar dataKey="regularHours" stackId="a" fill="#3b82f6" name="Regular Hours" />
                    <Bar dataKey="overtimeHours" stackId="a" fill="#f59e0b" name="Overtime Hours" />
                    <Bar dataKey="doubleTimeHours" stackId="a" fill="#ef4444" name="Double Time Hours" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Overtime Breakdown by Group */}
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Overtime by {groupBy === 'costCode' ? 'Cost Code' : groupBy === 'system' ? 'System' : groupBy === 'area' ? 'Area' : groupBy === 'phase' ? 'Phase' : groupBy === 'craft' ? 'Craft' : 'Location'}</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={groupedSummary.filter(item => item.overtimeHours > 0).slice(0, 5)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis />
                    <Tooltip 
                      formatter={(value) => `${value.toFixed(1)} hrs`}
                      contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                    />
                    <Legend />
                    <Bar dataKey="regularHours" fill="#3b82f6" name="Regular Hours" />
                    <Bar dataKey="overtimeHours" fill="#f59e0b" name="Overtime Hours" />
                    <Bar dataKey="doubleTimeHours" fill="#ef4444" name="Double Time Hours" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Grouped Summary Table */}
          {groupedSummary.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Summary by {groupBy === 'costCode' ? 'Cost Code' : groupBy === 'system' ? 'System' : groupBy === 'area' ? 'Area' : groupBy === 'phase' ? 'Phase' : groupBy === 'craft' ? 'Craft' : 'Location'}
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {groupBy === 'costCode' ? 'Cost Code' : groupBy === 'system' ? 'System' : groupBy === 'area' ? 'Area' : groupBy === 'phase' ? 'Phase' : groupBy === 'craft' ? 'Craft' : 'Location'}
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Hours</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Regular</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">OT</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">DT</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">OT %</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Cost</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">OT Cost</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Entries</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {groupedSummary.slice(0, 10).map((item) => {
                      const otPercentage = item.totalHours > 0 ? (item.overtimeHours / item.totalHours) * 100 : 0
                      return (
                        <tr key={item.key} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                            {item.name}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 font-medium">
                            {item.totalHours.toFixed(1)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-600">
                            {item.regularHours.toFixed(1)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-orange-600 font-medium">
                            {item.overtimeHours.toFixed(1)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-red-600">
                            {item.doubleTimeHours.toFixed(1)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                            <span className={`font-medium ${
                              otPercentage > 20 ? 'text-red-600' :
                              otPercentage > 10 ? 'text-yellow-600' :
                              'text-gray-600'
                            }`}>
                              {otPercentage.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                            {formatCurrency(item.totalCost)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-orange-600 font-medium">
                            {formatCurrency(item.overtimeCost + item.doubleTimeCost)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-500">
                            {item.entries}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

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
              {summary.map((item) => {
                const costCodeDisplay = item.costCodeName 
                  ? `${item._id} - ${item.costCodeName}`
                  : item._id;
                return (
                  <div key={item._id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900" title={costCodeDisplay}>
                        {costCodeDisplay}
                      </span>
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
                );
              })}
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
                      {entry.costCodeName ? (
                        <>
                          <div className="text-sm font-medium text-gray-900">
                            {entry.costCode} - {entry.costCodeName}
                          </div>
                          {entry.costCodeDescription && (
                            <div className="text-sm text-gray-500">{entry.costCodeDescription}</div>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="text-sm font-medium text-gray-900">{entry.costCode}</div>
                          <div className="text-sm text-gray-500">{entry.costCodeDescription}</div>
                        </>
                      )}
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
