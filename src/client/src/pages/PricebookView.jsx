import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  DocumentTextIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CubeIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline'
import { api } from '../services/api'
import toast from 'react-hot-toast'

const PricebookView = () => {
  const [pricebookData, setPricebookData] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedSections, setExpandedSections] = useState({})
  const [expandedPages, setExpandedPages] = useState({})
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchPricebookData()
  }, [])

  const fetchPricebookData = async () => {
    try {
      setLoading(true)
      const response = await api.get('/api/products/by-pricebook')
      setPricebookData(response.data.data || [])
      
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
              Browse products organized by pricebook sections and pages
            </p>
          </div>
        </div>

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
                                    <div className="flex items-center justify-between">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                          <CubeIcon className="h-4 w-4 text-gray-400" />
                                          <span className="font-medium text-gray-900">
                                            {product.name}
                                          </span>
                                        </div>
                                        {product.description && (
                                          <p className="text-sm text-gray-500 mt-1">
                                            {product.description}
                                          </p>
                                        )}
                                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                          <span>{product.variantCount} variants</span>
                                          {product.category && (
                                            <span className="px-2 py-0.5 bg-gray-100 rounded">
                                              {product.category}
                                            </span>
                                          )}
                                        </div>
                                      </div>
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

