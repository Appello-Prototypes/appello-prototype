import React, { useState, useEffect } from 'react'
import { useParams, useLocation, Link, Outlet } from 'react-router-dom'
import { 
  HomeIcon,
  CubeIcon,
  BuildingOfficeIcon,
  ArrowLeftIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon
} from '@heroicons/react/24/outline'
import { companyAPI } from '../services/api'
import toast from 'react-hot-toast'

const CompanyLayout = () => {
  const { id } = useParams()
  const location = useLocation()
  const [companyData, setCompanyData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [expandedCategories, setExpandedCategories] = useState({
    'overview': true
  })

  const menuCategories = [
    {
      id: 'overview',
      name: 'Overview',
      icon: HomeIcon,
      items: [
        {
          id: 'overview',
          name: 'Overview',
          icon: HomeIcon,
          path: `/companies/${id}`,
          description: 'Company details and summary'
        }
      ]
    },
    {
      id: 'products',
      name: 'Products',
      icon: CubeIcon,
      items: [
        {
          id: 'products',
          name: 'Products',
          icon: CubeIcon,
          path: `/companies/${id}/products`,
          description: 'View all products from this supplier'
        }
      ]
    },
    ...(companyData?.companyType === 'distributor' ? [{
      id: 'manufacturers',
      name: 'Manufacturers',
      icon: BuildingOfficeIcon,
      items: [
        {
          id: 'manufacturers',
          name: 'Manufacturers',
          icon: BuildingOfficeIcon,
          path: `/companies/${id}/manufacturers`,
          description: 'View all manufacturers this distributor carries'
        }
      ]
    }] : []),
    ...(companyData?.companyType === 'supplier' ? [{
      id: 'distributors',
      name: 'Distributors',
      icon: BuildingOfficeIcon,
      items: [
        {
          id: 'distributors',
          name: 'Distributors',
          icon: BuildingOfficeIcon,
          path: `/companies/${id}/distributors`,
          description: 'View all distributors who carry this manufacturer'
        },
        {
          id: 'price-comparison',
          name: 'Price Comparison',
          icon: BuildingOfficeIcon,
          path: `/companies/${id}/price-comparison`,
          description: 'Compare prices across distributors'
        }
      ]
    }] : [])
  ]

  // Flatten all tabs for active tab detection
  const companyTabs = menuCategories.flatMap(category => category.items)

  useEffect(() => {
    if (id) {
      fetchCompanyData()
    }
  }, [id])

  const fetchCompanyData = async () => {
    try {
      setLoading(true)
      const response = await companyAPI.getCompany(id)
      setCompanyData(response.data.data)
    } catch (error) {
      toast.error('Failed to load company data')
      console.error('Error fetching company data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getActiveTab = () => {
    const currentPath = location.pathname
    
    // Check for exact matches first
    for (const tab of companyTabs) {
      if (currentPath === tab.path) {
        return tab.id
      }
    }
    
    // Check for partial matches (for sub-routes)
    if (currentPath.includes('/products')) return 'products'
    
    // Default to overview for company root
    return 'overview'
  }

  const activeTab = getActiveTab()

  const toggleCategory = (categoryId) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }))
  }

  const getActiveCategory = () => {
    const currentPath = location.pathname
    for (const category of menuCategories) {
      for (const item of category.items) {
        if (currentPath === item.path || currentPath.includes(item.path.split('/').pop())) {
          return category.id
        }
      }
    }
    return 'overview'
  }

  const activeCategory = getActiveCategory()

  // Auto-expand category if it contains the active tab
  useEffect(() => {
    if (activeCategory && !expandedCategories[activeCategory]) {
      setExpandedCategories(prev => ({
        ...prev,
        [activeCategory]: true
      }))
    }
  }, [activeCategory])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!companyData) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Company not found</h3>
        <p className="text-gray-500">The company you're looking for doesn't exist.</p>
        <Link 
          to="/companies" 
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back to Companies
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Company Header - Always Visible */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-5">
          {/* Breadcrumb */}
          <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
            <Link to="/companies" className="hover:text-gray-700">Companies</Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">{companyData.name}</span>
          </nav>

          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <BuildingOfficeIcon className="h-8 w-8 text-blue-600" />
                <h1 className="text-3xl font-bold text-gray-900">{companyData.name}</h1>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  companyData.companyType === 'supplier' ? 'bg-blue-100 text-blue-800' :
                  companyData.companyType === 'customer' ? 'bg-green-100 text-green-800' :
                  companyData.companyType === 'distributor' ? 'bg-orange-100 text-orange-800' :
                  companyData.companyType === 'subcontractor' ? 'bg-purple-100 text-purple-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {companyData.companyType}
                </span>
                {!companyData.isActive && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    Inactive
                  </span>
                )}
              </div>

              {/* Key Details Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4 pb-4 border-b border-gray-200">
                {/* Contact Information */}
                {companyData.contact && (
                  <div className="space-y-2">
                    <dt className="text-xs font-medium text-gray-500">Contact</dt>
                    <dd className="space-y-1.5">
                      {companyData.contact.name && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-900 font-medium">{companyData.contact.name}</span>
                          {companyData.contact.title && (
                            <span className="text-gray-500">({companyData.contact.title})</span>
                          )}
                        </div>
                      )}
                      {companyData.contact.email && (
                        <div className="flex items-center gap-2 text-sm">
                          <EnvelopeIcon className="h-4 w-4 text-gray-400" />
                          <a 
                            href={`mailto:${companyData.contact.email}`}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            {companyData.contact.email}
                          </a>
                        </div>
                      )}
                      {companyData.contact.phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <PhoneIcon className="h-4 w-4 text-gray-400" />
                          <a 
                            href={`tel:${companyData.contact.phone}`}
                            className="text-gray-900"
                          >
                            {companyData.contact.phone}
                          </a>
                        </div>
                      )}
                    </dd>
                  </div>
                )}

                {/* Address */}
                {companyData.address && (
                  <div className="space-y-2">
                    <dt className="text-xs font-medium text-gray-500">Address</dt>
                    <dd className="flex items-start gap-2 text-sm text-gray-900">
                      <MapPinIcon className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        {companyData.address.street && <div>{companyData.address.street}</div>}
                        <div>
                          {[
                            companyData.address.city,
                            companyData.address.province,
                            companyData.address.postalCode
                          ].filter(Boolean).join(', ')}
                        </div>
                        {companyData.address.country && (
                          <div className="text-gray-500">{companyData.address.country}</div>
                        )}
                      </div>
                    </dd>
                  </div>
                )}

                {/* Payment Terms & Supplier Info */}
                <div className="space-y-2">
                  <dt className="text-xs font-medium text-gray-500">Details</dt>
                  <dd className="space-y-1.5 text-sm">
                    {companyData.paymentTerms && (
                      <div>
                        <span className="text-gray-500">Payment Terms: </span>
                        <span className="text-gray-900">{companyData.paymentTerms}</span>
                      </div>
                    )}
                    {companyData.supplierInfo && (
                      <>
                        {companyData.supplierInfo.leadTimeDays && (
                          <div>
                            <span className="text-gray-500">Lead Time: </span>
                            <span className="text-gray-900">{companyData.supplierInfo.leadTimeDays} days</span>
                          </div>
                        )}
                        {companyData.supplierInfo.minimumOrder && (
                          <div>
                            <span className="text-gray-500">Minimum Order: </span>
                            <span className="text-gray-900">${companyData.supplierInfo.minimumOrder.toFixed(2)}</span>
                          </div>
                        )}
                      </>
                    )}
                  </dd>
                </div>
              </div>

              {/* Notes */}
              {companyData.notes && (
                <div className="mb-4">
                  <dt className="text-xs font-medium text-gray-500 mb-1">Notes</dt>
                  <dd className="text-sm text-gray-900">{companyData.notes}</dd>
                </div>
              )}
            </div>

            <div className="ml-4">
              <Link
                to="/companies"
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Back to Companies
              </Link>
            </div>
          </div>
        </div>

        {/* Company Menu - Categorized Navigation */}
        <div className="border-t border-gray-200 bg-gray-50">
          <nav className="px-6" aria-label="Company sections">
            <div className="flex flex-wrap items-end gap-x-1">
              {menuCategories.map((category) => {
                const CategoryIcon = category.icon
                const isCategoryActive = activeCategory === category.id
                const showInline = category.items.length <= 2
                const isExpanded = expandedCategories[category.id] || showInline
                
                return (
                  <div key={category.id} className="relative">
                    {showInline ? (
                      // Inline display for categories with 2 or fewer items
                      <div className="flex items-center">
                        {category.items.map((item) => {
                          const ItemIcon = item.icon
                          const isItemActive = activeTab === item.id
                          
                          return (
                            <Link
                              key={item.id}
                              to={item.path}
                              className={`${
                                isItemActive
                                  ? 'border-blue-500 text-blue-600'
                                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                              } whitespace-nowrap py-4 px-3 border-b-2 font-medium text-sm flex items-center group transition-colors`}
                              title={item.description}
                            >
                              <ItemIcon className="h-5 w-5 mr-2" />
                              {item.name}
                            </Link>
                          )
                        })}
                      </div>
                    ) : (
                      // Dropdown display for categories with more items
                      <>
                        <button
                          onClick={() => toggleCategory(category.id)}
                          className={`${
                            isCategoryActive
                              ? 'text-blue-600 border-blue-500'
                              : 'text-gray-700 border-transparent hover:text-gray-900 hover:border-gray-300'
                          } whitespace-nowrap py-4 px-3 border-b-2 font-medium text-sm flex items-center group transition-colors`}
                        >
                          <CategoryIcon className="h-5 w-5 mr-2" />
                          <span>{category.name}</span>
                          {isExpanded ? (
                            <ChevronUpIcon className="h-4 w-4 ml-2" />
                          ) : (
                            <ChevronDownIcon className="h-4 w-4 ml-2" />
                          )}
                        </button>

                        {/* Category Dropdown Menu */}
                        {isExpanded && (
                          <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-md shadow-lg border border-gray-200 z-50 py-2">
                            {category.items.map((item) => {
                              const ItemIcon = item.icon
                              const isItemActive = activeTab === item.id
                              
                              return (
                                <Link
                                  key={item.id}
                                  to={item.path}
                                  className={`${
                                    isItemActive
                                      ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-500'
                                      : 'text-gray-700 hover:bg-gray-50'
                                  } flex items-center px-4 py-2 text-sm transition-colors`}
                                  title={item.description}
                                  onClick={() => {
                                    // Close dropdown after selection on mobile
                                    if (window.innerWidth < 768) {
                                      setExpandedCategories(prev => ({
                                        ...prev,
                                        [category.id]: false
                                      }))
                                    }
                                  }}
                                >
                                  <ItemIcon className="h-5 w-5 mr-3 flex-shrink-0" />
                                  <span className="flex-1">{item.name}</span>
                                </Link>
                              )
                            })}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-96">
        <Outlet />
      </div>
    </div>
  )
}

export default CompanyLayout

