import React, { useState, useEffect } from 'react'
import { 
  CurrencyDollarIcon, 
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  FunnelIcon
} from '@heroicons/react/24/outline'
import { api } from '../services/api'
import toast from 'react-hot-toast'

const DiscountManagement = () => {
  const [discounts, setDiscounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editingDiscount, setEditingDiscount] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    discountType: 'category',
    category: '',
    categoryGroup: '',
    discountPercent: '',
    effectiveDate: '',
    expiresDate: '',
    isActive: true
  })

  useEffect(() => {
    fetchDiscounts()
  }, [])

  const fetchDiscounts = async () => {
    try {
      setLoading(true)
      const response = await api.get('/api/discounts')
      setDiscounts(response.data.data || [])
    } catch (error) {
      console.error('Error fetching discounts:', error)
      toast.error('Failed to load discounts')
    } finally {
      setLoading(false)
    }
  }

  const applyDiscount = async (discountId) => {
    try {
      setApplying(true)
      const response = await api.post(`/api/discounts/${discountId}/apply`)
      toast.success(`Discount applied! ${response.data.data?.variantsUpdated || 0} variants updated`)
      fetchDiscounts()
    } catch (error) {
      console.error('Error applying discount:', error)
      toast.error('Failed to apply discount')
    } finally {
      setApplying(false)
    }
  }

  const applyAllDiscounts = async () => {
    if (!confirm('Apply all active discounts to products? This will update pricing for all matching products.')) {
      return
    }

    try {
      setApplying(true)
      const response = await api.post('/api/discounts/apply-all')
      toast.success(`All discounts applied! ${response.data.data?.totalVariantsUpdated || 0} variants updated`)
      fetchDiscounts()
    } catch (error) {
      console.error('Error applying all discounts:', error)
      toast.error('Failed to apply all discounts')
    } finally {
      setApplying(false)
    }
  }

  const handleSave = async () => {
    try {
      if (editingDiscount) {
        await api.put(`/api/discounts/${editingDiscount._id}`, formData)
        toast.success('Discount updated')
      } else {
        await api.post('/api/discounts', formData)
        toast.success('Discount created')
      }
      setShowModal(false)
      setEditingDiscount(null)
      resetForm()
      fetchDiscounts()
    } catch (error) {
      console.error('Error saving discount:', error)
      toast.error('Failed to save discount')
    }
  }

  const handleEdit = (discount) => {
    setEditingDiscount(discount)
    setFormData({
      name: discount.name || '',
      discountType: discount.discountType || 'category',
      category: discount.category || '',
      categoryGroup: discount.categoryGroup || '',
      discountPercent: discount.discountPercent || '',
      effectiveDate: discount.effectiveDate ? new Date(discount.effectiveDate).toISOString().split('T')[0] : '',
      expiresDate: discount.expiresDate ? new Date(discount.expiresDate).toISOString().split('T')[0] : '',
      isActive: discount.isActive !== undefined ? discount.isActive : true
    })
    setShowModal(true)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      discountType: 'category',
      category: '',
      categoryGroup: '',
      discountPercent: '',
      effectiveDate: '',
      expiresDate: '',
      isActive: true
    })
    setEditingDiscount(null)
  }

  const filteredDiscounts = discounts.filter(discount => {
    const matchesSearch = !searchTerm || 
      discount.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      discount.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      discount.categoryGroup?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = filterType === 'all' || 
      (filterType === 'active' && discount.isActive) ||
      (filterType === 'inactive' && !discount.isActive)
    
    return matchesSearch && matchesFilter
  })

  const activeDiscounts = discounts.filter(d => d.isActive).length
  const totalVariantsAffected = discounts.reduce((sum, d) => sum + (d.productsAffected || 0), 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <CurrencyDollarIcon className="h-8 w-8 mr-3 text-blue-600" />
              Discount Management
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Manage master discount list and apply discounts to products in bulk
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                resetForm()
                setShowModal(true)
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Discount
            </button>
            <button
              onClick={applyAllDiscounts}
              disabled={applying || activeDiscounts === 0}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <ArrowPathIcon className={`h-5 w-5 mr-2 ${applying ? 'animate-spin' : ''}`} />
              Apply All Discounts
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-sm font-medium text-blue-600">Total Discounts</div>
            <div className="text-2xl font-bold text-blue-900">{discounts.length}</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-sm font-medium text-green-600">Active Discounts</div>
            <div className="text-2xl font-bold text-green-900">{activeDiscounts}</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="text-sm font-medium text-purple-600">Variants Affected</div>
            <div className="text-2xl font-bold text-purple-900">{totalVariantsAffected.toLocaleString()}</div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4">
            <div className="text-sm font-medium text-yellow-600">Avg Discount</div>
            <div className="text-2xl font-bold text-yellow-900">
              {discounts.length > 0 
                ? (discounts.reduce((sum, d) => sum + (d.discountPercent || 0), 0) / discounts.length).toFixed(1)
                : '0'
              }%
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search discounts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="all">All Discounts</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Discounts Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Discount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Group</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Discount %</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Effective</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Affected</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredDiscounts.map((discount) => (
              <tr key={discount._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{discount.name || 'Unnamed'}</div>
                  {discount.pricebookPage && (
                    <div className="text-xs text-gray-500">{discount.pricebookPage}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{discount.category || '-'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{discount.categoryGroup || '-'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-bold text-green-600">{discount.discountPercent?.toFixed(2)}%</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {discount.effectiveDate ? new Date(discount.effectiveDate).toLocaleDateString() : '-'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{discount.productsAffected || 0}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {discount.isActive ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <CheckCircleIcon className="h-4 w-4 mr-1" />
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      <XCircleIcon className="h-4 w-4 mr-1" />
                      Inactive
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => applyDiscount(discount._id)}
                      disabled={applying || !discount.isActive}
                      className="text-green-600 hover:text-green-900 disabled:text-gray-400 disabled:cursor-not-allowed"
                      title="Apply discount to products"
                    >
                      <ArrowPathIcon className={`h-5 w-5 ${applying ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                      onClick={() => handleEdit(discount)}
                      className="text-blue-600 hover:text-blue-900"
                      title="Edit discount"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredDiscounts.length === 0 && (
          <div className="text-center py-12">
            <CurrencyDollarIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No discounts found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || filterType !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'Get started by creating a new discount'
              }
            </p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingDiscount ? 'Edit Discount' : 'Create Discount'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Discount Type</label>
                  <select
                    value={formData.discountType}
                    onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="category">Category</option>
                    <option value="customer">Customer</option>
                    <option value="product">Product</option>
                    <option value="supplier">Supplier</option>
                    <option value="group">Group</option>
                    <option value="universal">Universal</option>
                  </select>
                </div>

                {formData.discountType === 'category' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Category</label>
                      <input
                        type="text"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        placeholder="e.g., FIBREGLASS"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Group Code</label>
                      <input
                        type="text"
                        value={formData.categoryGroup}
                        onChange={(e) => setFormData({ ...formData, categoryGroup: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        placeholder="e.g., CAEG171"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700">Discount %</label>
                  <input
                    type="number"
                    value={formData.discountPercent}
                    onChange={(e) => setFormData({ ...formData, discountPercent: e.target.value })}
                    min="0"
                    max="100"
                    step="0.01"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Effective Date</label>
                  <input
                    type="date"
                    value={formData.effectiveDate}
                    onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Expires Date (optional)</label>
                  <input
                    type="date"
                    value={formData.expiresDate}
                    onChange={(e) => setFormData({ ...formData, expiresDate: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-900">Active</label>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setShowModal(false)
                    resetForm()
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  {editingDiscount ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DiscountManagement

