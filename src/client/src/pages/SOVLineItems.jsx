import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { 
  PlusIcon, 
  TrashIcon, 
  PencilIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'
import { api } from '../services/api'
import toast from 'react-hot-toast'

const SOVLineItems = () => {
  const { jobId } = useParams()
  const [sovItems, setSovItems] = useState([])
  const [sovComponents, setSovComponents] = useState({})
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [formData, setFormData] = useState({
    lineNumber: '',
    costCode: '',
    description: '',
    systemId: '',
    areaId: '',
    phaseId: '',
    moduleId: '',
    componentId: '',
    totalCost: 0,
    margin: 0,
    quantity: 0,
    unit: 'LF',
    unitDescription: '',
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
    }
  }, [jobId])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch SOV components and line items
      const [componentsResponse, itemsResponse] = await Promise.all([
        api.get(`/api/jobs/${jobId}/sov-components`),
        api.get('/api/sov/line-items', { params: { jobId } })
      ])

      setSovComponents(componentsResponse.data.data)
      setSovItems(itemsResponse.data.data)
    } catch (error) {
      toast.error('Failed to load SOV data')
      console.error('Error fetching SOV data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    try {
      const payload = {
        ...formData,
        jobId,
        projectId: 'temp-project-id', // This should come from job data
        totalCost: parseFloat(formData.totalCost),
        margin: parseFloat(formData.margin),
        quantity: parseFloat(formData.quantity)
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

  const handleEdit = (item) => {
    setEditingItem(item)
    setFormData({
      lineNumber: item.lineNumber,
      costCode: item.costCode,
      description: item.description,
      systemId: item.systemId?._id || '',
      areaId: item.areaId?._id || '',
      phaseId: item.phaseId?._id || '',
      moduleId: item.moduleId?._id || '',
      componentId: item.componentId?._id || '',
      totalCost: item.totalCost,
      margin: item.margin,
      quantity: item.quantity,
      unit: item.unit,
      unitDescription: item.unitDescription || '',
      notes: item.notes || ''
    })
    setShowModal(true)
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
    setFormData({
      lineNumber: '',
      costCode: '',
      description: '',
      systemId: '',
      areaId: '',
      phaseId: '',
      moduleId: '',
      componentId: '',
      totalCost: 0,
      margin: 0,
      quantity: 0,
      unit: 'LF',
      unitDescription: '',
      notes: ''
    })
  }

  const openAddModal = () => {
    setEditingItem(null)
    resetForm()
    setShowModal(true)
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const calculateTotalValue = (cost, margin) => {
    return cost * (1 + margin / 100)
  }

  const totalContractValue = sovItems.reduce((sum, item) => sum + item.totalValue, 0)
  const totalCost = sovItems.reduce((sum, item) => sum + item.totalCost, 0)
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
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Schedule of Values Management</h2>
            <p className="mt-1 text-sm text-gray-500">
              Manage line items with cost codes and SOV components
            </p>
          </div>
          <button
            onClick={openAddModal}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Line Item
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
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
              <DocumentTextIcon className="h-8 w-8 text-blue-600" />
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
              <ChartBarIcon className="h-8 w-8 text-purple-600" />
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
        <div className="px-6 py-4 border-b border-gray-200">
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Line #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cost Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    System/Area
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cost
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Margin %
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Progress
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sovItems.map((item) => (
                  <tr key={item._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.lineNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.costCode}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                      {item.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>
                        {item.systemId && (
                          <div className="text-xs text-blue-600">
                            SYS: {item.systemId.code}
                          </div>
                        )}
                        {item.areaId && (
                          <div className="text-xs text-green-600">
                            AREA: {item.areaId.code}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(item.totalCost)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.margin}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(item.totalValue)}
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEdit(item)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item._id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-6">
                {editingItem ? 'Edit' : 'Add'} SOV Line Item
              </h3>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Basic Information */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Line Number *</label>
                    <input
                      type="text"
                      required
                      value={formData.lineNumber}
                      onChange={(e) => setFormData({ ...formData, lineNumber: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Cost Code *</label>
                    <input
                      type="text"
                      required
                      value={formData.costCode}
                      onChange={(e) => setFormData({ ...formData, costCode: e.target.value.toUpperCase() })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Description *</label>
                  <textarea
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* SOV Components */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">System</label>
                    <select
                      value={formData.systemId}
                      onChange={(e) => setFormData({ ...formData, systemId: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select System</option>
                      {sovComponents.systems?.map((system) => (
                        <option key={system._id} value={system._id}>
                          {system.code} - {system.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Area</label>
                    <select
                      value={formData.areaId}
                      onChange={(e) => setFormData({ ...formData, areaId: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Area</option>
                      {sovComponents.areas?.map((area) => (
                        <option key={area._id} value={area._id}>
                          {area.code} - {area.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phase</label>
                    <select
                      value={formData.phaseId}
                      onChange={(e) => setFormData({ ...formData, phaseId: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Phase</option>
                      {sovComponents.phases?.map((phase) => (
                        <option key={phase._id} value={phase._id}>
                          {phase.code} - {phase.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Financial Information */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Total Cost *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.totalCost}
                      onChange={(e) => setFormData({ ...formData, totalCost: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Margin % *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      required
                      value={formData.margin}
                      onChange={(e) => setFormData({ ...formData, margin: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Total Value</label>
                    <input
                      type="text"
                      value={formatCurrency(calculateTotalValue(parseFloat(formData.totalCost) || 0, parseFloat(formData.margin) || 0))}
                      disabled
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-gray-50 text-gray-500"
                    />
                  </div>
                </div>

                {/* Quantity Information */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Quantity *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Unit *</label>
                    <select
                      required
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {units.map((unit) => (
                        <option key={unit.value} value={unit.value}>
                          {unit.label} ({unit.value})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Unit Description</label>
                    <input
                      type="text"
                      value={formData.unitDescription}
                      onChange={(e) => setFormData({ ...formData, unitDescription: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., 12 inch pipe insulation"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Additional notes or specifications"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
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
        </div>
      )}
    </div>
  )
}

export default SOVLineItems
