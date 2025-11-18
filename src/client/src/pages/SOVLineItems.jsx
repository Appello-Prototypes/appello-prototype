import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { 
  PlusIcon, 
  TrashIcon, 
  PencilIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  CheckIcon,
  XMarkIcon,
  ArrowPathIcon,
  Cog6ToothIcon,
  FunnelIcon,
  BuildingOffice2Icon,
  MapPinIcon,
  ClockIcon,
  CubeIcon,
  WrenchScrewdriverIcon
} from '@heroicons/react/24/outline'
import { api } from '../services/api'
import toast from 'react-hot-toast'

const SOVLineItems = () => {
  const { jobId } = useParams()
  const [sovItems, setSovItems] = useState([])
  const [sovStructure, setSovStructure] = useState(null)
  const [jobData, setJobData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showColumnSettings, setShowColumnSettings] = useState(false)
  const [showSOVSetup, setShowSOVSetup] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [dirtyRow, setDirtyRow] = useState(null)
  
  // SOV Setup state
  const [sovSetupActiveTab, setSovSetupActiveTab] = useState('systems')
  const [sovSetupComponents, setSovSetupComponents] = useState({
    systems: [],
    areas: [],
    phases: [],
    modules: [],
    components: []
  })
  const [showSOVSetupAddModal, setShowSOVSetupAddModal] = useState(false)
  const [editingSOVComponent, setEditingSOVComponent] = useState(null)
  const [sovSetupFormData, setSovSetupFormData] = useState({
    name: '',
    code: '',
    description: '',
    sortOrder: 0
  })
  
  // Column visibility preferences - default to all visible
  const [columnVisibility, setColumnVisibility] = useState({
    system: true,
    area: true,
    phase: true,
    module: true,
    component: true
  })
  const [formData, setFormData] = useState({
    lineNumber: '',
    description: '',
    systemId: '',
    areaId: '',
    phaseId: '',
    moduleId: '',
    componentId: '',
    unitCost: 0,
    totalCost: 0,
    quantity: 0,
    unit: 'EA',
    marginPercent: 0,
    totalValue: 0,
    glCategoryId: '',
    glAccountItemId: '',
    costCodeNumber: '',
    costCodeName: '',
    notes: ''
  })

  const units = [
    { value: 'LF', label: 'Linear Feet' },
    { value: 'SF', label: 'Square Feet' },
    { value: 'EA', label: 'Each' },
    { value: 'CY', label: 'Cubic Yards' },
    { value: 'TON', label: 'Tons' },
    { value: 'HR', label: 'Hours' },
    { value: 'LS', label: 'Lump Sum' },
    { value: 'LB', label: 'Pounds' },
    { value: 'GAL', label: 'Gallons' },
    { value: 'FT', label: 'Feet' },
    { value: 'YD', label: 'Yards' },
    { value: 'SQ', label: 'Square' }
  ]

  useEffect(() => {
    if (jobId) {
      fetchData()
      // Load column visibility preferences for this job
      const saved = localStorage.getItem(`sov-column-visibility-${jobId}`)
      if (saved) {
        try {
          setColumnVisibility(JSON.parse(saved))
        } catch (e) {
          // Use defaults if parse fails
        }
      }
    }
  }, [jobId])

  // Save column visibility preferences to localStorage
  useEffect(() => {
    if (jobId) {
      localStorage.setItem(`sov-column-visibility-${jobId}`, JSON.stringify(columnVisibility))
    }
  }, [columnVisibility, jobId])

  const toggleColumnVisibility = (column) => {
    setColumnVisibility(prev => ({
      ...prev,
      [column]: !prev[column]
    }))
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      
      const [jobResponse, structureResponse, itemsResponse] = await Promise.all([
        api.get(`/api/jobs/${jobId}`),
        api.get(`/api/sov/jobs/${jobId}/sov-structure`),
        api.get('/api/sov/line-items', { params: { jobId } })
      ])

      setJobData(jobResponse.data.data)
      setSovStructure(structureResponse.data.data)
      setSovItems(itemsResponse.data.data)
    } catch (error) {
      toast.error('Failed to load SOV data')
      console.error('Error fetching SOV data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch SOV Setup components
  const fetchSOVSetupComponents = async () => {
    try {
      const response = await api.get(`/api/jobs/${jobId}/sov-components`)
      setSovSetupComponents(response.data.data)
    } catch (error) {
      toast.error('Failed to load SOV components')
      console.error('Error fetching SOV components:', error)
    }
  }

  // Open SOV Setup modal
  const openSOVSetup = () => {
    setShowSOVSetup(true)
    fetchSOVSetupComponents()
  }

  // SOV Setup tabs
  const sovSetupTabs = [
    { id: 'systems', name: 'Systems', icon: BuildingOffice2Icon, color: 'blue' },
    { id: 'areas', name: 'Areas', icon: MapPinIcon, color: 'green' },
    { id: 'phases', name: 'Phases', icon: ClockIcon, color: 'purple' },
    { id: 'modules', name: 'Modules', icon: CubeIcon, color: 'orange' },
    { id: 'components', name: 'Components', icon: WrenchScrewdriverIcon, color: 'red' }
  ]

  // Handle SOV Setup form submit
  const handleSOVSetupSubmit = async (e) => {
    e.preventDefault()
    
    try {
      const payload = {
        ...sovSetupFormData,
        jobId,
        projectId: jobData?.projectId?._id || jobData?.projectId
      }

      if (editingSOVComponent) {
        await api.put(`/api/sov/${sovSetupActiveTab}/${editingSOVComponent._id}`, payload)
        toast.success(`${sovSetupActiveTab.slice(0, -1)} updated successfully`)
      } else {
        await api.post(`/api/sov/${sovSetupActiveTab}`, payload)
        toast.success(`${sovSetupActiveTab.slice(0, -1)} created successfully`)
      }

      setShowSOVSetupAddModal(false)
      setEditingSOVComponent(null)
      setSovSetupFormData({ name: '', code: '', description: '', sortOrder: 0 })
      await fetchSOVSetupComponents()
      // Refresh SOV structure and line items to reflect changes
      await fetchData()
    } catch (error) {
      toast.error(`Failed to ${editingSOVComponent ? 'update' : 'create'} ${sovSetupActiveTab.slice(0, -1)}`)
      console.error('Error saving component:', error)
    }
  }

  // Handle SOV Setup edit
  const handleSOVSetupEdit = (component) => {
    setEditingSOVComponent(component)
    setSovSetupFormData({
      name: component.name,
      code: component.code,
      description: component.description || '',
      sortOrder: component.sortOrder || 0
    })
    setShowSOVSetupAddModal(true)
  }

  // Handle SOV Setup delete
  const handleSOVSetupDelete = async (componentId) => {
    if (!confirm('Are you sure you want to delete this component?')) return

    try {
      await api.delete(`/api/sov/${sovSetupActiveTab}/${componentId}`)
      toast.success(`${sovSetupActiveTab.slice(0, -1)} deleted successfully`)
      await fetchSOVSetupComponents()
      // Refresh SOV structure and line items to reflect changes
      await fetchData()
    } catch (error) {
      toast.error(`Failed to delete ${sovSetupActiveTab.slice(0, -1)}`)
      console.error('Error deleting component:', error)
    }
  }

  // Open SOV Setup add modal
  const openSOVSetupAddModal = () => {
    setEditingSOVComponent(null)
    setSovSetupFormData({ name: '', code: '', description: '', sortOrder: 0 })
    setShowSOVSetupAddModal(true)
  }

  // Auto-generate next unique cost code number
  const getNextCostCodeNumber = (excludeId = null) => {
    // Get all existing cost code numbers (excluding current item if editing)
    const existingCodes = sovItems
      .filter(item => !excludeId || item._id !== excludeId)
      .map(item => item.costCodeNumber)
      .filter(code => code && code.trim() !== '')
    
    // Try numeric codes first (001, 002, etc.)
    const numericCodes = existingCodes
      .map(code => {
        // Extract numeric part (handle formats like "001", "VAV-001", etc.)
        const match = code.match(/(\d+)$/)
        return match ? parseInt(match[1]) : 0
      })
      .filter(n => n > 0)
    
    if (numericCodes.length > 0) {
      const max = Math.max(...numericCodes)
      const next = max + 1
      return String(next).padStart(3, '0')
    }
    
    // If no numeric codes exist, start at 001
    return '001'
  }

  // Check if cost code number is unique
  const isCostCodeNumberUnique = (codeNumber, excludeId = null) => {
    if (!codeNumber || codeNumber.trim() === '') return true
    const normalized = codeNumber.trim().toUpperCase()
    return !sovItems.some(item => 
      (item._id !== excludeId) && 
      item.costCodeNumber && 
      item.costCodeNumber.trim().toUpperCase() === normalized
    )
  }

  // Auto-generate cost code name from system and area (concatenated)
  const generateCostCodeName = (systemId, areaId) => {
    if (!systemId || !areaId) return ''
    const system = sovStructure?.systems?.find(s => s._id === systemId)
    const area = sovStructure?.areas?.find(a => a._id === areaId)
    if (system && area) {
      // Concatenate system code/name and area code/name
      const systemPart = system.code || system.name
      const areaPart = area.code || area.name
      return `${systemPart}${areaPart}`
    }
    return ''
  }

  const startEdit = (line) => {
    setEditingId(line._id)
    setDirtyRow({ ...line })
  }

  const startModalEdit = (line) => {
    setEditingItem(line)
    setFormData({
      lineNumber: line.lineNumber || '',
      description: line.description || '',
      systemId: line.systemId?._id || line.systemId || '',
      areaId: line.areaId?._id || line.areaId || '',
      phaseId: line.phaseId?._id || line.phaseId || '',
      moduleId: line.moduleId?._id || line.moduleId || '',
      componentId: line.componentId?._id || line.componentId || '',
      unitCost: line.unitCost || 0,
      totalCost: line.totalCost || 0,
      quantity: line.quantity || 0,
      unit: line.unit || 'EA',
      marginPercent: line.marginPercent || 0,
      totalValue: line.totalValue || 0,
      glCategoryId: line.glCategoryId?._id || line.glCategoryId || '',
      glAccountItemId: line.glAccountItemId?._id || line.glAccountItemId || '',
      costCodeNumber: line.costCodeNumber || '',
      costCodeName: line.costCodeName || '',
      notes: line.notes || ''
    })
    setShowModal(true)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setDirtyRow(null)
  }

  const updateField = (field, value) => {
    setDirtyRow((prev) => {
      const next = { ...prev, [field]: value }

      // Auto-generate cost code name when system/area changes
      if (field === 'systemId' || field === 'areaId') {
        const systemId = field === 'systemId' ? value : next.systemId
        const areaId = field === 'areaId' ? value : next.areaId
        if (systemId && areaId) {
          next.costCodeName = generateCostCodeName(systemId, areaId)
        }
      }

      // Validate cost code number uniqueness
      if (field === 'costCodeNumber' && value) {
        const normalized = value.trim().toUpperCase()
        if (!isCostCodeNumberUnique(normalized, prev._id)) {
          // Don't update if not unique - let user see the error
          return { ...prev, costCodeNumberError: 'Cost code number must be unique' }
        }
        // Clear error if unique
        delete next.costCodeNumberError
      }

      // Calculate totalCost from quantity * unitCost
      const qty = Number(next.quantity || 0)
      const unitCost = Number(next.unitCost || 0)
      next.totalCost = qty * unitCost

      // Calculate margin based on which field was changed
      const totalCost = next.totalCost || 0
      
      if (field === 'marginPercent') {
        // User typed margin %, calculate totalValue
        const marginPct = Number(value || 0)
        next.marginPercent = marginPct
        if (marginPct > 0 && totalCost > 0) {
          next.totalValue = totalCost / (1 - marginPct / 100)
          next.marginAmount = next.totalValue - totalCost
        } else {
          next.totalValue = totalCost
          next.marginAmount = 0
        }
      } else if (field === 'totalValue') {
        // User typed totalValue, calculate margin %
        const totalValue = Number(value || 0)
        next.totalValue = totalValue
        next.marginAmount = totalValue - totalCost
        next.marginPercent = totalValue > 0 ? (next.marginAmount / totalValue) * 100 : 0
      } else {
        // Recalculate from existing values
        if (next.totalValue && next.totalValue > 0) {
          next.marginAmount = next.totalValue - totalCost
          next.marginPercent = (next.marginAmount / next.totalValue) * 100
        } else if (next.marginPercent && next.marginPercent > 0 && totalCost > 0) {
          next.totalValue = totalCost / (1 - next.marginPercent / 100)
          next.marginAmount = next.totalValue - totalCost
        } else {
          next.marginAmount = 0
          next.marginPercent = 0
          next.totalValue = totalCost
        }
      }

      return next
    })
  }

  const saveRow = async () => {
    try {
      const payload = {
        ...dirtyRow,
        systemId: dirtyRow.systemId?._id || dirtyRow.systemId || null,
        areaId: dirtyRow.areaId?._id || dirtyRow.areaId || null,
        phaseId: dirtyRow.phaseId?._id || dirtyRow.phaseId || null,
        moduleId: dirtyRow.moduleId?._id || dirtyRow.moduleId || null,
        componentId: dirtyRow.componentId?._id || dirtyRow.componentId || null,
        glCategoryId: dirtyRow.glCategoryId?._id || dirtyRow.glCategoryId || null,
        glAccountItemId: dirtyRow.glAccountItemId?._id || dirtyRow.glAccountItemId || null,
        quantity: parseFloat(dirtyRow.quantity) || 0,
        unitCost: parseFloat(dirtyRow.unitCost) || 0,
        totalCost: parseFloat(dirtyRow.totalCost) || 0,
        totalValue: parseFloat(dirtyRow.totalValue) || 0,
        marginPercent: parseFloat(dirtyRow.marginPercent) || 0,
        marginAmount: parseFloat(dirtyRow.marginAmount) || 0
      }

      // Validate cost code number uniqueness before saving
      if (payload.costCodeNumber && !isCostCodeNumberUnique(payload.costCodeNumber, dirtyRow._id)) {
        toast.error('Cost code number must be unique')
        return
      }

      const saved = await api.patch(`/api/sov/line-items/${dirtyRow._id}`, payload)
      setSovItems((prev) => prev.map((l) => (l._id === saved.data.data._id ? saved.data.data : l)))
      setEditingId(null)
      setDirtyRow(null)
      toast.success('SOV line item updated successfully')
    } catch (error) {
      toast.error('Failed to update SOV line item')
      console.error('Error saving row:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    try {
      // Calculate final values
      const qty = parseFloat(formData.quantity) || 0
      const unitCost = parseFloat(formData.unitCost) || 0
      const totalCost = qty * unitCost
      let totalValue = parseFloat(formData.totalValue) || 0
      let marginPercent = parseFloat(formData.marginPercent) || 0
      let marginAmount = 0

      // Calculate based on which field was provided
      if (totalValue > 0 && totalCost > 0) {
        marginAmount = totalValue - totalCost
        marginPercent = totalValue > 0 ? (marginAmount / totalValue) * 100 : 0
      } else if (marginPercent > 0 && totalCost > 0) {
        totalValue = totalCost / (1 - marginPercent / 100)
        marginAmount = totalValue - totalCost
      } else {
        totalValue = totalCost
        marginAmount = 0
        marginPercent = 0
      }

      // Auto-generate cost code number if not provided
      let costCodeNumber = formData.costCodeNumber?.trim() || ''
      if (!costCodeNumber) {
        costCodeNumber = getNextCostCodeNumber(editingItem?._id)
      }

      // Auto-generate cost code name from system and area if not provided
      let costCodeName = formData.costCodeName?.trim() || ''
      if (!costCodeName && formData.systemId && formData.areaId) {
        costCodeName = generateCostCodeName(formData.systemId, formData.areaId)
      }

      // Validate cost code number uniqueness
      if (costCodeNumber && !isCostCodeNumberUnique(costCodeNumber, editingItem?._id)) {
        toast.error('Cost code number must be unique')
        return
      }

      const payload = {
        ...formData,
        jobId,
        projectId: jobData?.projectId?._id || jobData?.projectId || 'temp-project-id',
        quantity: qty,
        unitCost: unitCost,
        totalCost: totalCost,
        totalValue: totalValue,
        marginPercent: marginPercent,
        marginAmount: marginAmount,
        systemId: formData.systemId || null,
        areaId: formData.areaId || null,
        phaseId: formData.phaseId || null,
        moduleId: formData.moduleId || null,
        componentId: formData.componentId || null,
        glCategoryId: formData.glCategoryId || null,
        glAccountItemId: formData.glAccountItemId || null,
        costCodeNumber: costCodeNumber.toUpperCase(),
        costCodeName: costCodeName
      }

      if (editingItem) {
        await api.put(`/api/sov/line-items/${editingItem._id}`, payload)
        toast.success('SOV line item updated successfully')
      } else {
        await api.post('/api/sov/line-items', payload)
        toast.success('SOV line item created successfully')
      }

      setShowModal(false)
      setEditingItem(null)
      resetForm()
      fetchData()
    } catch (error) {
      toast.error(`Failed to ${editingItem ? 'update' : 'create'} SOV line item`)
      console.error('Error saving SOV item:', error)
    }
  }

  const handleDelete = async (itemId) => {
    if (!confirm('Are you sure you want to delete this SOV line item?')) return

    try {
      await api.delete(`/api/sov/line-items/${itemId}`)
      toast.success('SOV line item deleted successfully')
      fetchData()
    } catch (error) {
      toast.error('Failed to delete SOV line item')
      console.error('Error deleting SOV item:', error)
    }
  }

  const resetForm = () => {
    const nextCodeNumber = getNextCostCodeNumber()
    setFormData({
      lineNumber: '',
      description: '',
      systemId: '',
      areaId: '',
      phaseId: '',
      moduleId: '',
      componentId: '',
      unitCost: 0,
      totalCost: 0,
      quantity: 0,
      unit: 'EA',
      marginPercent: 0,
      totalValue: 0,
      glCategoryId: '',
      glAccountItemId: '',
      costCodeNumber: nextCodeNumber,
      costCodeName: '',
      notes: '',
      costCodeNumberError: null
    })
  }

  const openAddModal = () => {
    setEditingItem(null)
    resetForm()
    setShowModal(true)
  }

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '$0.00'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  const formatPercent = (value) => {
    if (!value && value !== 0) return '0.00'
    return `${Number(value).toFixed(2)}%`
  }

  const renderSelect = (options, value, onChange, placeholder = '–', className = '') => {
    const currentValue = value?._id || value || ''
    return (
      <select
        className={`border rounded px-2 py-1.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
        value={currentValue}
        onChange={(e) => onChange(e.target.value || null)}
      >
        <option value="">{placeholder}</option>
        {options?.map((opt) => (
          <option key={opt._id} value={opt._id}>
            {opt.code} - {opt.name}
          </option>
        ))}
      </select>
    )
  }

  const getLabel = (item, field) => {
    const ref = item[field]
    if (!ref) return '–'
    if (typeof ref === 'string') return ref
    return `${ref.code || ''} - ${ref.name || ''}`.trim() || '–'
  }

  // Get filtered GL accounts by category for inline editing
  const getFilteredGLAccountsForRow = (row) => {
    if (!sovStructure?.glAccounts) return []
    const categoryId = row?.glCategoryId?._id || row?.glCategoryId
    
    if (!categoryId) return []
    return sovStructure.glAccounts.filter(acct => {
      const acctCategoryId = acct.glCategoryId?._id || acct.glCategoryId
      return acctCategoryId === categoryId
    })
  }

  // Get filtered GL accounts for modal
  const getFilteredGLAccountsForModal = () => {
    if (!sovStructure?.glAccounts) return []
    if (!formData.glCategoryId) return []
    return sovStructure.glAccounts.filter(acct => {
      const acctCategoryId = acct.glCategoryId?._id || acct.glCategoryId
      return acctCategoryId === formData.glCategoryId
    })
  }

  const totalContractValue = sovItems.reduce((sum, item) => sum + (item.totalValue || 0), 0)
  const totalCost = sovItems.reduce((sum, item) => sum + (item.totalCost || 0), 0)
  const totalMargin = totalContractValue - totalCost

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Schedule of Values Management</h2>
            <p className="mt-1 text-sm text-gray-500">
              Manage line items with inline or modal editing
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowColumnSettings(!showColumnSettings)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 shadow-sm"
              title="Configure visible columns"
            >
              <FunnelIcon className="h-5 w-5 mr-2" />
              Columns
            </button>
            <button
              onClick={openSOVSetup}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 shadow-sm"
              title="SOV Setup - Configure systems, areas, phases, modules, and components"
            >
              <Cog6ToothIcon className="h-5 w-5 mr-2" />
              SOV Setup
            </button>
            <button
              onClick={openAddModal}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 shadow-sm"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Line Item
            </button>
          </div>
        </div>
      </div>

      {/* Column Visibility Settings Panel */}
      {showColumnSettings && (
        <div className="bg-white shadow rounded-lg p-6 border-2 border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Configure Visible Columns</h3>
            <button
              onClick={() => setShowColumnSettings(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Select which SOV Setup columns to display in the table:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { key: 'system', label: 'System' },
              { key: 'area', label: 'Area' },
              { key: 'phase', label: 'Phase' },
              { key: 'module', label: 'Module' },
              { key: 'component', label: 'Component' }
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={columnVisibility[key]}
                  onChange={() => toggleColumnVisibility(key)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm font-medium text-gray-700">{label}</span>
              </label>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={() => {
                setColumnVisibility({
                  system: true,
                  area: true,
                  phase: true,
                  module: true,
                  component: true
                })
              }}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Show All Columns
            </button>
            <span className="mx-2 text-gray-300">|</span>
            <button
              onClick={() => {
                setColumnVisibility({
                  system: false,
                  area: false,
                  phase: false,
                  module: false,
                  component: false
                })
              }}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Hide All Columns
            </button>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CurrencyDollarIcon className="h-10 w-10 text-green-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Total Contract Value</div>
              <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalContractValue)}</div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <DocumentTextIcon className="h-10 w-10 text-blue-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Total Cost</div>
              <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalCost)}</div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ChartBarIcon className="h-10 w-10 text-purple-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Total Margin</div>
              <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalMargin)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* SOV Line Items Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-medium text-gray-900">
            Line Items ({sovItems.length})
          </h3>
        </div>

        {sovItems.length === 0 ? (
          <div className="text-center py-12">
            <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No SOV line items yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating your first schedule of values line item.
            </p>
            <div className="mt-6">
              <button
                onClick={openAddModal}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Line Item
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {columnVisibility.system && (
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">System</th>
                  )}
                  {columnVisibility.area && (
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Area</th>
                  )}
                  {columnVisibility.phase && (
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Phase</th>
                  )}
                  {columnVisibility.module && (
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Module</th>
                  )}
                  {columnVisibility.component && (
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Component</th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider min-w-[200px]">Description</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Qty</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Unit</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Unit Cost</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Total Cost</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Margin ($)</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Margin (%)</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Total Value</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">GL Category</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">GL Account</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Cost Code #</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider min-w-[150px]">Code Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider min-w-[120px]">Notes</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sovItems.map((line) => {
                  const isEditing = line._id === editingId
                  const row = isEditing ? dirtyRow : line

                  return (
                    <tr
                      key={line._id}
                      className={isEditing ? "bg-blue-50 hover:bg-blue-100" : "hover:bg-gray-50 transition-colors"}
                    >
                      {/* System */}
                      {columnVisibility.system && (
                        <td className="px-4 py-3 whitespace-nowrap">
                          {isEditing
                            ? renderSelect(
                                sovStructure?.systems,
                                row.systemId,
                                (val) => updateField('systemId', val)
                              )
                            : <span className="text-sm text-gray-900">{getLabel(line, 'systemId')}</span>}
                        </td>
                      )}

                      {/* Area */}
                      {columnVisibility.area && (
                        <td className="px-4 py-3 whitespace-nowrap">
                          {isEditing
                            ? renderSelect(
                                sovStructure?.areas,
                                row.areaId,
                                (val) => updateField('areaId', val)
                              )
                            : <span className="text-sm text-gray-900">{getLabel(line, 'areaId')}</span>}
                        </td>
                      )}

                      {/* Phase */}
                      {columnVisibility.phase && (
                        <td className="px-4 py-3 whitespace-nowrap">
                          {isEditing
                            ? renderSelect(
                                sovStructure?.phases,
                                row.phaseId,
                                (val) => updateField('phaseId', val)
                              )
                            : <span className="text-sm text-gray-900">{getLabel(line, 'phaseId')}</span>}
                        </td>
                      )}

                      {/* Module */}
                      {columnVisibility.module && (
                        <td className="px-4 py-3 whitespace-nowrap">
                          {isEditing
                            ? renderSelect(
                                sovStructure?.modules,
                                row.moduleId,
                                (val) => updateField('moduleId', val)
                              )
                            : <span className="text-sm text-gray-900">{getLabel(line, 'moduleId')}</span>}
                        </td>
                      )}

                      {/* Component */}
                      {columnVisibility.component && (
                        <td className="px-4 py-3 whitespace-nowrap">
                          {isEditing
                            ? renderSelect(
                                sovStructure?.components,
                                row.componentId,
                                (val) => updateField('componentId', val)
                              )
                            : <span className="text-sm text-gray-900">{getLabel(line, 'componentId')}</span>}
                        </td>
                      )}

                      {/* Description */}
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input
                            className="border rounded px-2 py-1.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={row.description || ''}
                            onChange={(e) => updateField('description', e.target.value)}
                          />
                        ) : (
                          <span className="text-sm text-gray-900">{line.description}</span>
                        )}
                      </td>

                      {/* Quantity */}
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.01"
                            className="border rounded px-2 py-1.5 w-24 text-right text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={row.quantity ?? ''}
                            onChange={(e) => updateField('quantity', e.target.value)}
                          />
                        ) : (
                          <span className="text-sm text-gray-900">{line.quantity}</span>
                        )}
                      </td>

                      {/* Unit */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {isEditing ? (
                          <select
                            className="border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={row.unit || 'EA'}
                            onChange={(e) => updateField('unit', e.target.value)}
                          >
                            {units.map((unit) => (
                              <option key={unit.value} value={unit.value}>
                                {unit.value}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-sm text-gray-900">{line.unit}</span>
                        )}
                      </td>

                      {/* Unit Cost */}
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.01"
                            className="border rounded px-2 py-1.5 w-28 text-right text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={row.unitCost ?? ''}
                            onChange={(e) => updateField('unitCost', e.target.value)}
                          />
                        ) : (
                          <span className="text-sm text-gray-900">{formatCurrency(line.unitCost)}</span>
                        )}
                      </td>

                      {/* Total Cost (read-only) */}
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <span className="text-sm font-medium text-gray-900">{formatCurrency(row.totalCost || 0)}</span>
                      </td>

                      {/* Margin $ (read-only, calculated) */}
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <span className="text-sm font-medium text-gray-900">{formatCurrency(row.marginAmount || 0)}</span>
                      </td>

                      {/* Margin % */}
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.01"
                            className="border rounded px-2 py-1.5 w-24 text-right text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={row.marginPercent ?? ''}
                            onChange={(e) => updateField('marginPercent', e.target.value)}
                            placeholder="%"
                          />
                        ) : (
                          <span className="text-sm text-gray-900">{formatPercent(row.marginPercent || 0)}</span>
                        )}
                      </td>

                      {/* Total Value */}
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.01"
                            className="border rounded px-2 py-1.5 w-28 text-right text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={row.totalValue ?? ''}
                            onChange={(e) => updateField('totalValue', e.target.value)}
                          />
                        ) : (
                          <span className="text-sm font-medium text-gray-900">{formatCurrency(line.totalValue)}</span>
                        )}
                      </td>

                      {/* GL Category */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {isEditing
                          ? renderSelect(
                              sovStructure?.glCategories,
                              row.glCategoryId,
                              (val) => {
                                updateField('glCategoryId', val)
                                // Clear GL Account when category changes
                                updateField('glAccountItemId', null)
                              }
                            )
                          : <span className="text-sm text-gray-900">{getLabel(line, 'glCategoryId')}</span>}
                      </td>

                      {/* GL Account */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {isEditing
                          ? renderSelect(
                              getFilteredGLAccountsForRow(row),
                              row.glAccountItemId,
                              (val) => updateField('glAccountItemId', val),
                              row.glCategoryId ? 'Select GL Account' : 'Select GL Category first',
                              !row.glCategoryId ? 'bg-gray-100' : ''
                            )
                          : <span className="text-sm text-gray-900">{getLabel(line, 'glAccountItemId')}</span>}
                      </td>

                      {/* Cost Code # */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {isEditing ? (
                          <div>
                            <input
                              className={`border rounded px-2 py-1.5 w-full text-sm focus:outline-none focus:ring-2 ${
                                row.costCodeNumberError 
                                  ? 'border-red-500 focus:ring-red-500' 
                                  : 'focus:ring-blue-500'
                              }`}
                              value={row.costCodeNumber || ''}
                              onChange={(e) => {
                                const value = e.target.value.toUpperCase()
                                updateField('costCodeNumber', value)
                              }}
                              placeholder="Auto-generated"
                            />
                            {row.costCodeNumberError && (
                              <p className="text-xs text-red-600 mt-1">{row.costCodeNumberError}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-900">{line.costCodeNumber || '–'}</span>
                        )}
                      </td>

                      {/* Cost Code Name */}
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input
                            className="border rounded px-2 py-1.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={row.costCodeName || ''}
                            onChange={(e) => updateField('costCodeName', e.target.value)}
                          />
                        ) : (
                          <span className="text-sm text-gray-900">{line.costCodeName || '–'}</span>
                        )}
                      </td>

                      {/* Notes */}
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input
                            className="border rounded px-2 py-1.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={row.notes || ''}
                            onChange={(e) => updateField('notes', e.target.value)}
                          />
                        ) : (
                          <span className="text-sm text-gray-500 truncate block max-w-[120px]">{(line.notes || '').slice(0, 30)}</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        {isEditing ? (
                          <div className="flex gap-2 justify-center">
                            <button
                              className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-50 rounded"
                              onClick={saveRow}
                              title="Save"
                            >
                              <CheckIcon className="h-5 w-5" />
                            </button>
                            <button
                              className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                              onClick={cancelEdit}
                              title="Cancel"
                            >
                              <XMarkIcon className="h-5 w-5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2 justify-center">
                            <button
                              className="p-1.5 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded"
                              onClick={() => startEdit(line)}
                              title="Quick Edit (Inline)"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              className="p-1.5 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded"
                              onClick={() => startModalEdit(line)}
                              title="Full Edit (Modal)"
                            >
                              <ArrowPathIcon className="h-4 w-4" />
                            </button>
                            <button
                              className="p-1.5 text-red-600 hover:text-red-900 hover:bg-red-50 rounded"
                              onClick={() => handleDelete(line._id)}
                              title="Delete"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-6 border w-full max-w-5xl shadow-xl rounded-lg bg-white max-h-[90vh] overflow-y-auto">
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                {editingItem ? 'Edit' : 'Add'} SOV Line Item
              </h3>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Line Number *</label>
                  <input
                    type="text"
                    required
                    value={formData.lineNumber}
                    onChange={(e) => setFormData({ ...formData, lineNumber: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                  <input
                    type="text"
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* SOV Components */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">System</label>
                  <select
                    value={formData.systemId}
                    onChange={(e) => {
                    const systemId = e.target.value
                    const costCodeName = systemId && formData.areaId 
                      ? generateCostCodeName(systemId, formData.areaId)
                      : formData.costCodeName
                    // Auto-generate cost code number if not set
                    let costCodeNumber = formData.costCodeNumber
                    if (!costCodeNumber || costCodeNumber.trim() === '') {
                      costCodeNumber = getNextCostCodeNumber()
                    }
                    setFormData({ ...formData, systemId, costCodeName, costCodeNumber })
                    }}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select System</option>
                    {sovStructure?.systems?.map((system) => (
                      <option key={system._id} value={system._id}>
                        {system.code} - {system.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Area</label>
                  <select
                    value={formData.areaId}
                    onChange={(e) => {
                    const areaId = e.target.value
                    const costCodeName = formData.systemId && areaId
                      ? generateCostCodeName(formData.systemId, areaId)
                      : formData.costCodeName
                    // Auto-generate cost code number if not set
                    let costCodeNumber = formData.costCodeNumber
                    if (!costCodeNumber || costCodeNumber.trim() === '') {
                      costCodeNumber = getNextCostCodeNumber()
                    }
                    setFormData({ ...formData, areaId, costCodeName, costCodeNumber })
                    }}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Area</option>
                    {sovStructure?.areas?.map((area) => (
                      <option key={area._id} value={area._id}>
                        {area.code} - {area.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phase</label>
                  <select
                    value={formData.phaseId}
                    onChange={(e) => setFormData({ ...formData, phaseId: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Phase</option>
                    {sovStructure?.phases?.map((phase) => (
                      <option key={phase._id} value={phase._id}>
                        {phase.code} - {phase.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Module</label>
                  <select
                    value={formData.moduleId}
                    onChange={(e) => setFormData({ ...formData, moduleId: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Module</option>
                    {sovStructure?.modules?.map((module) => (
                      <option key={module._id} value={module._id}>
                        {module.code} - {module.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Component</label>
                  <select
                    value={formData.componentId}
                    onChange={(e) => setFormData({ ...formData, componentId: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Component</option>
                    {sovStructure?.components?.map((component) => (
                      <option key={component._id} value={component._id}>
                        {component.code} - {component.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Financial Information */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.quantity}
                    onChange={(e) => {
                      const qty = parseFloat(e.target.value) || 0
                      const unitCost = parseFloat(formData.unitCost) || 0
                      setFormData({ 
                        ...formData, 
                        quantity: e.target.value,
                        totalCost: qty * unitCost
                      })
                    }}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit *</label>
                  <select
                    required
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {units.map((unit) => (
                      <option key={unit.value} value={unit.value}>
                        {unit.label} ({unit.value})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit Cost *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.unitCost}
                    onChange={(e) => {
                      const unitCost = parseFloat(e.target.value) || 0
                      const qty = parseFloat(formData.quantity) || 0
                      setFormData({ 
                        ...formData, 
                        unitCost: e.target.value,
                        totalCost: qty * unitCost
                      })
                    }}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Cost</label>
                  <input
                    type="text"
                    value={formatCurrency(formData.totalCost)}
                    disabled
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-gray-50 text-gray-600"
                  />
                </div>
              </div>

              {/* Margin and Total Value */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Margin %</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.marginPercent}
                    onChange={(e) => {
                      const marginPct = parseFloat(e.target.value) || 0
                      const totalCost = parseFloat(formData.totalCost) || 0
                      let totalValue = totalCost
                      if (marginPct > 0 && totalCost > 0) {
                        totalValue = totalCost / (1 - marginPct / 100)
                      }
                      setFormData({ 
                        ...formData, 
                        marginPercent: e.target.value,
                        totalValue: totalValue
                      })
                    }}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter %"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Value</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.totalValue}
                    onChange={(e) => {
                      const totalValue = parseFloat(e.target.value) || 0
                      const totalCost = parseFloat(formData.totalCost) || 0
                      const marginAmount = totalValue - totalCost
                      const marginPercent = totalValue > 0 ? (marginAmount / totalValue) * 100 : 0
                      setFormData({ 
                        ...formData, 
                        totalValue: e.target.value,
                        marginPercent: marginPercent
                      })
                    }}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Margin Amount</label>
                  <input
                    type="text"
                    value={formatCurrency((formData.totalValue || 0) - (formData.totalCost || 0))}
                    disabled
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-gray-50 text-gray-600"
                  />
                </div>
              </div>

              {/* GL and Cost Code */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">GL Category</label>
                  <select
                    value={formData.glCategoryId}
                    onChange={(e) => setFormData({ ...formData, glCategoryId: e.target.value, glAccountItemId: '' })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select GL Category</option>
                    {sovStructure?.glCategories?.map((cat) => (
                      <option key={cat._id} value={cat._id}>
                        {cat.code} - {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">GL Account</label>
                  <select
                    value={formData.glAccountItemId}
                    onChange={(e) => setFormData({ ...formData, glAccountItemId: e.target.value })}
                    disabled={!formData.glCategoryId}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                  >
                    <option value="">{formData.glCategoryId ? 'Select GL Account' : 'Select GL Category first'}</option>
                    {getFilteredGLAccountsForModal().map((acct) => (
                      <option key={acct._id} value={acct._id}>
                        {acct.code} - {acct.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cost Code #</label>
                  <input
                    type="text"
                    value={formData.costCodeNumber}
                    onChange={(e) => {
                      const value = e.target.value.toUpperCase()
                      const isUnique = isCostCodeNumberUnique(value, editingItem?._id)
                      setFormData({ 
                        ...formData, 
                        costCodeNumber: value,
                        costCodeNumberError: !isUnique ? 'Cost code number must be unique' : null
                      })
                    }}
                    className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                      formData.costCodeNumberError 
                        ? 'border-red-500 focus:ring-red-500' 
                        : 'border-gray-300 focus:ring-blue-500'
                    }`}
                    placeholder="Auto-generated"
                  />
                  {formData.costCodeNumberError ? (
                    <p className="mt-1 text-xs text-red-600">{formData.costCodeNumberError}</p>
                  ) : (
                    <p className="mt-1 text-xs text-gray-500">Auto-generated: {getNextCostCodeNumber(editingItem?._id)}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cost Code Name</label>
                  <input
                    type="text"
                    value={formData.costCodeName}
                    onChange={(e) => setFormData({ ...formData, costCodeName: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Auto-generated from System + Area"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Additional notes or specifications"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setEditingItem(null)
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                >
                  {editingItem ? 'Update' : 'Create'} Line Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SOV Setup Modal */}
      {showSOVSetup && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-6 border w-full max-w-6xl shadow-xl rounded-lg bg-white max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">SOV Component Setup</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Configure systems, areas, phases, modules, and components
                </p>
              </div>
              <button
                onClick={() => {
                  setShowSOVSetup(false)
                  setShowSOVSetupAddModal(false)
                  setEditingSOVComponent(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 mb-6">
              <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                {sovSetupTabs.map((tab) => {
                  const Icon = tab.icon
                  const isActive = sovSetupActiveTab === tab.id
                  const count = sovSetupComponents[tab.id]?.length || 0
                  
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setSovSetupActiveTab(tab.id)
                        setShowSOVSetupAddModal(false)
                        setEditingSOVComponent(null)
                      }}
                      className={`${
                        isActive
                          ? tab.color === 'blue' ? 'border-blue-500 text-blue-600' :
                            tab.color === 'green' ? 'border-green-500 text-green-600' :
                            tab.color === 'purple' ? 'border-purple-500 text-purple-600' :
                            tab.color === 'orange' ? 'border-orange-500 text-orange-600' :
                            'border-red-500 text-red-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                    >
                      <Icon className="h-5 w-5 mr-2" />
                      {tab.name}
                      <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                        isActive 
                          ? tab.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                            tab.color === 'green' ? 'bg-green-100 text-green-600' :
                            tab.color === 'purple' ? 'bg-purple-100 text-purple-600' :
                            tab.color === 'orange' ? 'bg-orange-100 text-orange-600' :
                            'bg-red-100 text-red-600'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {count}
                      </span>
                    </button>
                  )
                })}
              </nav>
            </div>

            {/* Component List */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-medium text-gray-900">
                  {sovSetupTabs.find(t => t.id === sovSetupActiveTab)?.name}
                </h4>
                <button
                  onClick={openSOVSetupAddModal}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add {sovSetupTabs.find(t => t.id === sovSetupActiveTab)?.name.slice(0, -1)}
                </button>
              </div>

              {sovSetupComponents[sovSetupActiveTab]?.length === 0 ? (
                <div className="text-center py-12 border border-gray-200 rounded-lg">
                  <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No {sovSetupActiveTab} yet</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Get started by creating your first {sovSetupActiveTab.slice(0, -1)}.
                  </p>
                  <div className="mt-6">
                    <button
                      onClick={openSOVSetupAddModal}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Add {sovSetupTabs.find(t => t.id === sovSetupActiveTab)?.name.slice(0, -1)}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sovSetupComponents[sovSetupActiveTab].map((component) => (
                    <div
                      key={component._id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-sm font-medium text-gray-900">
                            {component.code} - {component.name}
                          </h3>
                          {component.description && (
                            <p className="mt-1 text-sm text-gray-500">{component.description}</p>
                          )}
                          <div className="mt-2 flex items-center text-xs text-gray-400">
                            <span>Sort: {component.sortOrder}</span>
                            {component.createdAt && (
                              <span className="ml-2">
                                Created: {new Date(component.createdAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <button
                            onClick={() => handleSOVSetupEdit(component)}
                            className="p-1 text-gray-400 hover:text-gray-600"
                            title="Edit"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleSOVSetupDelete(component._id)}
                            className="p-1 text-gray-400 hover:text-red-600"
                            title="Delete"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add/Edit Modal */}
            {showSOVSetupAddModal && (
              <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-[60]">
                <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900">
                        {editingSOVComponent ? 'Edit' : 'Add'} {sovSetupTabs.find(t => t.id === sovSetupActiveTab)?.name.slice(0, -1)}
                      </h3>
                      <button
                        onClick={() => {
                          setShowSOVSetupAddModal(false)
                          setEditingSOVComponent(null)
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </div>
                    <form onSubmit={handleSOVSetupSubmit} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Name</label>
                        <input
                          type="text"
                          required
                          value={sovSetupFormData.name}
                          onChange={(e) => setSovSetupFormData({ ...sovSetupFormData, name: e.target.value })}
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Code</label>
                        <input
                          type="text"
                          required
                          value={sovSetupFormData.code}
                          onChange={(e) => setSovSetupFormData({ ...sovSetupFormData, code: e.target.value.toUpperCase() })}
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter code"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Description</label>
                        <textarea
                          value={sovSetupFormData.description}
                          onChange={(e) => setSovSetupFormData({ ...sovSetupFormData, description: e.target.value })}
                          rows={3}
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter description (optional)"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Sort Order</label>
                        <input
                          type="number"
                          value={sovSetupFormData.sortOrder}
                          onChange={(e) => setSovSetupFormData({ ...sovSetupFormData, sortOrder: parseInt(e.target.value) || 0 })}
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="0"
                        />
                      </div>
                      <div className="flex justify-end space-x-3 pt-4">
                        <button
                          type="button"
                          onClick={() => {
                            setShowSOVSetupAddModal(false)
                            setEditingSOVComponent(null)
                          }}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                        >
                          {editingSOVComponent ? 'Update' : 'Create'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default SOVLineItems
