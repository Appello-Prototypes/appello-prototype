import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  DocumentTextIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CubeIcon,
  MagnifyingGlassIcon,
  BuildingOfficeIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline'
import { api, companyAPI } from '../services/api'
import toast from 'react-hot-toast'

const PricebookView = () => {
  const [pricebookData, setPricebookData] = useState([])
  const [distributors, setDistributors] = useState([])
  const [selectedDistributorId, setSelectedDistributorId] = useState('')
  const [selectedDistributor, setSelectedDistributor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [expandedSections, setExpandedSections] = useState({})
  const [expandedPages, setExpandedPages] = useState({})
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchDistributors()
  }, [])

  useEffect(() => {
    fetchPricebookData()
  }, [selectedDistributorId])

  const fetchDistributors = async () => {
    try {
      const response = await companyAPI.getDistributors()
      setDistributors(response.data.data || [])
    } catch (error) {
      console.error('Error fetching distributors:', error)
    }
  }

  const fetchPricebookData = async () => {
    try {
      setLoading(true)
      const params = selectedDistributorId ? { distributorId: selectedDistributorId } : {}
      const response = await api.get('/api/products/by-pricebook', { params })
      setPricebookData(response.data.data || [])
      
      // Set selected distributor info
      if (selectedDistributorId) {
        const dist = distributors.find(d => d._id === selectedDistributorId)
        setSelectedDistributor(dist || null)
      } else {
        setSelectedDistributor(null)
      }
      
      // Auto-expand first section
      if (response.data.data && response.data.data.length > 0) {
        setExpandedSections({ [response.data.data[0].section]: true })
      }
    } catch (error) {
      console.error('Error fetching pricebook data:', error)
      toast.error('Failed to load pricebook')
    } finally {
      setLoading(false)
    }
  }

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const togglePage = (pageKey) => {
    setExpandedPages(prev => ({
      ...prev,
      [pageKey]: !prev[pageKey]
    }))
  }

  const filteredData = pricebookData.map(section => ({
    ...section,
    pages: section.pages.filter(page => {
      const matchesSearch = !searchTerm || 
        page.pageName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        page.groupCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        page.products.some(p => 
          p.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      return matchesSearch
    })
  })).filter(section => section.pages.length > 0)

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
              <DocumentTextIcon className="h-8 w-8 mr-3 text-blue-600" />
              Pricebook View
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              {selectedDistributor 
                ? `Viewing ${selectedDistributor.name}'s price sheet - products organized by pricebook sections and pages`
                : 'Browse products organized by pricebook sections and pages - select a distributor to view their price sheet'
              }
            </p>
          </div>
        </div>

        {/* Distributor Selector */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <BuildingOfficeIcon className="h-4 w-4 inline mr-1" />
            View Price Sheet For:
          </label>
          <select
            value={selectedDistributorId}
            onChange={(e) => {
              setSelectedDistributorId(e.target.value)
              setExpandedSections({})
              setExpandedPages({})
            }}
            className="w-full md:w-80 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
          >
            <option value="">All Distributors (Show All Products)</option>
            {distributors.map(dist => (
              <option key={dist._id} value={dist._id}>
                {dist.name}
              </option>
            ))}
          </select>
        </div>

        {/* Selected Distributor Info */}
        {selectedDistributor && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center">
              <BuildingOfficeIcon className="h-5 w-5 text-blue-600 mr-2" />
              <div>
                <span className="text-sm font-medium text-blue-900">
                  Viewing price sheet for: {selectedDistributor.name}
                </span>
                <p className="text-xs text-blue-700 mt-1">
                  Prices shown are specific to this distributor
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="mt-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by page name, group code, or product name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Pricebook Structure */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {filteredData.length === 0 ? (
          <div className="text-center py-12">
            <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No products found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm 
                ? 'Try adjusting your search'
                : 'No products with pricebook metadata found'
              }
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredData.map((section) => (
              <div key={section.section} className="bg-white">
                {/* Section Header */}
                <button
                  onClick={() => toggleSection(section.section)}
                  className="w-full px-6 py-4 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50 flex items-center justify-between"
                >
                  <div className="flex items-center">
                    {expandedSections[section.section] ? (
                      <ChevronDownIcon className="h-5 w-5 text-gray-400 mr-2" />
                    ) : (
                      <ChevronRightIcon className="h-5 w-5 text-gray-400 mr-2" />
                    )}
                    <h2 className="text-lg font-semibold text-gray-900">
                      {section.section}
                    </h2>
                    <span className="ml-3 text-sm text-gray-500">
                      ({section.pages.length} {section.pages.length === 1 ? 'page' : 'pages'})
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    {section.pages.reduce((sum, p) => sum + p.productCount, 0)} products
                  </div>
                </button>

                {/* Pages */}
                {expandedSections[section.section] && (
                  <div className="bg-gray-50">
                    {section.pages.map((page) => {
                      const pageKey = `${section.section}|${page.pageNumber}|${page.pageName}`
                      return (
                        <div key={pageKey} className="border-t border-gray-200">
                          {/* Page Header */}
                          <button
                            onClick={() => togglePage(pageKey)}
                            className="w-full px-8 py-3 text-left hover:bg-gray-100 focus:outline-none focus:bg-gray-100 flex items-center justify-between"
                          >
                            <div className="flex items-center">
                              {expandedPages[pageKey] ? (
                                <ChevronDownIcon className="h-5 w-5 text-gray-400 mr-2" />
                              ) : (
                                <ChevronRightIcon className="h-5 w-5 text-gray-400 mr-2" />
                              )}
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-gray-700">
                                    Page {page.pageNumber}
                                  </span>
                                  {page.groupCode && (
                                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                                      {page.groupCode}
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-gray-600 mt-1">
                                  {page.pageName}
                                </div>
                              </div>
                            </div>
                            <div className="text-sm text-gray-500">
                              {page.productCount} {page.productCount === 1 ? 'product' : 'products'}
                            </div>
                          </button>

                          {/* Products */}
                          {expandedPages[pageKey] && (
                            <div className="bg-white px-12 py-4">
                              <div className="space-y-2">
                                {page.products.map((product) => (
                                  <Link
                                    key={product._id}
                                    to={`/products/${product._id}`}
                                    className="block p-3 rounded-lg hover:bg-gray-50 border border-gray-200 hover:border-blue-300 transition-colors"
                                  >
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                          <CubeIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                          <span className="font-medium text-gray-900">
                                            {product.name}
                                          </span>
                                          {product.hasMultipleDistributors && !selectedDistributorId && (
                                            <span className="text-xs px-2 py-0.5 bg-green-100 text-green-800 rounded">
                                              Multiple Distributors
                                            </span>
                                          )}
                                        </div>
                                        {product.description && (
                                          <p className="text-sm text-gray-500 mt-1">
                                            {product.description}
                                          </p>
                                        )}
                                        <div className="flex items-center gap-4 mt-2 flex-wrap">
                                          <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <span>{product.variantCount} variants</span>
                                            {product.manufacturerName && (
                                              <>
                                                <span className="text-gray-300">•</span>
                                                <span className="flex items-center gap-1">
                                                  <BuildingOfficeIcon className="h-3 w-3" />
                                                  {product.manufacturerName}
                                                </span>
                                              </>
                                            )}
                                          </div>
                                          {product.category && (
                                            <span className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">
                                              {product.category}
                                            </span>
                                          )}
                                        </div>
                                        
                                        {/* Show available distributors if no distributor selected */}
                                        {!selectedDistributorId && product.availableFromDistributors && product.availableFromDistributors.length > 0 && (
                                          <div className="mt-2 pt-2 border-t border-gray-200">
                                            <div className="text-xs text-gray-600 font-medium mb-1">Available from:</div>
                                            <div className="flex flex-wrap gap-2">
                                              {product.availableFromDistributors.map((dist, idx) => (
                                                <span key={idx} className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded">
                                                  {dist.distributorName}
                                                  {dist.netPrice && (
                                                    <span className="ml-1 font-semibold">
                                                      ${dist.netPrice.toFixed(2)}
                                                    </span>
                                                  )}
                                                </span>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                      
                                      {/* Distributor-specific pricing */}
                                      {selectedDistributorId && product.distributorPricing && (
                                        <div className="ml-4 flex-shrink-0 text-right">
                                          <div className="flex items-center gap-1 text-gray-600">
                                            <CurrencyDollarIcon className="h-4 w-4" />
                                            <div>
                                              {product.distributorPricing.netPrice ? (
                                                <>
                                                  <div className="text-lg font-semibold text-gray-900">
                                                    ${product.distributorPricing.netPrice.toFixed(2)}
                                                  </div>
                                                  {product.distributorPricing.listPrice && 
                                                   product.distributorPricing.listPrice > product.distributorPricing.netPrice && (
                                                    <div className="text-xs text-gray-400 line-through">
                                                      ${product.distributorPricing.listPrice.toFixed(2)}
                                                    </div>
                                                  )}
                                                  {product.distributorPricing.discountPercent > 0 && (
                                                    <div className="text-xs text-green-600 font-medium">
                                                      {product.distributorPricing.discountPercent.toFixed(0)}% off
                                                    </div>
                                                  )}
                                                  {product.distributorPricing.isPreferred && (
                                                    <div className="text-xs text-blue-600 font-medium mt-1">
                                                      Preferred
                                                    </div>
                                                  )}
                                                </>
                                              ) : (
                                                <div className="text-sm text-gray-400">No pricing</div>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </Link>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default PricebookView

