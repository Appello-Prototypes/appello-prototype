import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  HomeIcon,
  ClipboardDocumentListIcon,
  PlusCircleIcon,
  UserIcon,
  ClockIcon,
  BuildingOffice2Icon,
  Bars3Icon,
  XMarkIcon,
  BellIcon,
  Cog6ToothIcon,
  ShoppingCartIcon,
  DocumentTextIcon,
  TruckIcon,
  CubeIcon,
  BuildingStorefrontIcon,
  ClipboardDocumentCheckIcon,
  Squares2X2Icon,
  ChevronDownIcon,
  ChevronRightIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline'
import { versionAPI } from '../services/api'

// Navigation structure with sub-menus
const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  {
    name: 'Projects & Jobs',
    icon: BuildingOffice2Icon,
    items: [
      { name: 'Projects', href: '/projects', icon: BuildingOffice2Icon },
      { name: 'Jobs', href: '/jobs', icon: ClipboardDocumentListIcon },
    ]
  },
  {
    name: 'Tasks',
    icon: ClipboardDocumentListIcon,
    items: [
      { name: 'All Tasks', href: '/tasks', icon: ClipboardDocumentListIcon },
      { name: 'My Tasks', href: '/my-tasks', icon: UserIcon },
      { name: 'Create Task', href: '/tasks/create', icon: PlusCircleIcon },
      { name: 'Operations', href: '/operations/tasks', icon: ClipboardDocumentCheckIcon },
    ]
  },
  {
    name: 'Time & Labor',
    icon: ClockIcon,
    items: [
      { name: 'Log Time', href: '/time-entry', icon: ClockIcon },
    ]
  },
  {
    name: 'Materials & Inventory',
    icon: CubeIcon,
    items: [
      { name: 'Material Requests', href: '/material-requests', icon: ClipboardDocumentCheckIcon },
      { name: 'Purchase Orders', href: '/purchase-orders', icon: DocumentTextIcon },
      { name: 'Receiving', href: '/receiving', icon: TruckIcon },
      { name: 'Products', href: '/products', icon: CubeIcon },
      { name: 'Product Types', href: '/product-types', icon: Squares2X2Icon },
      { name: 'Property Definitions', href: '/property-definitions', icon: Cog6ToothIcon },
      { name: 'Pricebook View', href: '/pricebook', icon: DocumentTextIcon },
      { name: 'Discount Management', href: '/discounts', icon: CurrencyDollarIcon },
    ]
  },
  {
    name: 'Suppliers',
    icon: BuildingStorefrontIcon,
    items: [
      { name: 'All Suppliers', href: '/companies', icon: BuildingStorefrontIcon },
    ]
  },
]

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [expandedMenus, setExpandedMenus] = useState({})
  const [versionInfo, setVersionInfo] = useState({
    version: '1.1.0',
    environment: typeof window !== 'undefined' && window.location.hostname !== 'localhost' ? 'production' : 'development'
  })
  const location = useLocation()
  
  // Mock user for demo purposes
  const user = { name: 'Demo User', role: 'admin' }

  // Auto-expand menu if current path matches any item in that menu
  useEffect(() => {
    const newExpandedMenus = {}
    navigation.forEach((item, index) => {
      if (item.items) {
        const hasActiveItem = item.items.some(subItem => location.pathname === subItem.href || location.pathname.startsWith(subItem.href + '/'))
        if (hasActiveItem) {
          newExpandedMenus[index] = true
        }
      }
    })
    setExpandedMenus(newExpandedMenus)
  }, [location.pathname])

  const toggleMenu = (index) => {
    setExpandedMenus(prev => ({
      ...prev,
      [index]: !prev[index]
    }))
  }

  // Fetch version information from API (with fallback)
  useEffect(() => {
    versionAPI.getVersion()
      .then(response => {
        if (response.data && response.data.success) {
          setVersionInfo(response.data)
        }
      })
      .catch(error => {
        console.error('Failed to fetch version from API, using fallback:', error)
        // Keep the fallback version already set in useState
      })
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-40 lg:hidden ${sidebarOpen ? '' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white">
          <div className="flex h-16 items-center justify-between px-4">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <div className="ml-2">
                <span className="text-lg font-semibold text-gray-900">Appello Lab</span>
                {versionInfo && (
                  <div className="text-xs text-gray-500 mt-0.5">
                    v{versionInfo.version} ({versionInfo.environment})
                  </div>
                )}
              </div>
            </div>
            <button
              type="button"
              className="text-gray-400 hover:text-gray-600"
              onClick={() => setSidebarOpen(false)}
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4 overflow-y-auto">
            {navigation.map((item, index) => {
              if (item.items) {
                // Menu with sub-items
                const isExpanded = expandedMenus[index]
                const hasActiveItem = item.items.some(subItem => location.pathname === subItem.href || location.pathname.startsWith(subItem.href + '/'))
                
                return (
                  <div key={item.name}>
                    <button
                      onClick={() => toggleMenu(index)}
                      className={`${
                        hasActiveItem
                          ? 'bg-blue-50 border-blue-500 text-blue-700'
                          : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      } group w-full flex items-center justify-between px-2 py-2 text-sm font-medium border-l-4 rounded-r-md transition-colors`}
                    >
                      <div className="flex items-center">
                        <item.icon
                          className={`${
                            hasActiveItem ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                          } mr-3 h-6 w-6 flex-shrink-0`}
                        />
                        {item.name}
                      </div>
                      {isExpanded ? (
                        <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                    {isExpanded && (
                      <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-200 pl-2">
                        {item.items.map((subItem) => {
                          const isSubActive = location.pathname === subItem.href || location.pathname.startsWith(subItem.href + '/')
                          return (
                            <Link
                              key={subItem.name}
                              to={subItem.href}
                              onClick={() => setSidebarOpen(false)}
                              className={`${
                                isSubActive
                                  ? 'bg-blue-50 text-blue-700 font-medium'
                                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                              } flex items-center px-2 py-2 text-sm rounded-md transition-colors`}
                            >
                              <subItem.icon
                                className={`${
                                  isSubActive ? 'text-blue-500' : 'text-gray-400'
                                } mr-3 h-5 w-5 flex-shrink-0`}
                              />
                              {subItem.name}
                            </Link>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              } else {
                // Single menu item
                const isActive = location.pathname === item.href
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`${
                      isActive
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    } group flex items-center px-2 py-2 text-sm font-medium border-l-4 rounded-r-md transition-colors`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <item.icon
                      className={`${
                        isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                      } mr-3 h-6 w-6 flex-shrink-0`}
                    />
                    {item.name}
                  </Link>
                )
              }
            })}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex min-h-0 flex-1 flex-col bg-white border-r border-gray-200">
          <div className="flex h-16 items-center px-4 border-b border-gray-200">
            <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <div className="ml-2 flex-1">
              <span className="text-lg font-semibold text-gray-900">Appello Lab</span>
              {versionInfo && (
                <div className="text-xs text-gray-500 mt-0.5">
                  v{versionInfo.version} ({versionInfo.environment})
                </div>
              )}
            </div>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4 overflow-y-auto">
            {navigation.map((item, index) => {
              if (item.items) {
                // Menu with sub-items
                const isExpanded = expandedMenus[index]
                const hasActiveItem = item.items.some(subItem => location.pathname === subItem.href || location.pathname.startsWith(subItem.href + '/'))
                
                return (
                  <div key={item.name}>
                    <button
                      onClick={() => toggleMenu(index)}
                      className={`${
                        hasActiveItem
                          ? 'bg-blue-50 border-blue-500 text-blue-700'
                          : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      } group w-full flex items-center justify-between px-2 py-2 text-sm font-medium border-l-4 rounded-r-md transition-colors`}
                    >
                      <div className="flex items-center">
                        <item.icon
                          className={`${
                            hasActiveItem ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                          } mr-3 h-6 w-6 flex-shrink-0`}
                        />
                        {item.name}
                      </div>
                      {isExpanded ? (
                        <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                    {isExpanded && (
                      <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-200 pl-2">
                        {item.items.map((subItem) => {
                          const isSubActive = location.pathname === subItem.href || location.pathname.startsWith(subItem.href + '/')
                          return (
                            <Link
                              key={subItem.name}
                              to={subItem.href}
                              className={`${
                                isSubActive
                                  ? 'bg-blue-50 text-blue-700 font-medium'
                                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                              } flex items-center px-2 py-2 text-sm rounded-md transition-colors`}
                            >
                              <subItem.icon
                                className={`${
                                  isSubActive ? 'text-blue-500' : 'text-gray-400'
                                } mr-3 h-5 w-5 flex-shrink-0`}
                              />
                              {subItem.name}
                            </Link>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              } else {
                // Single menu item
                const isActive = location.pathname === item.href
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`${
                      isActive
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    } group flex items-center px-2 py-2 text-sm font-medium border-l-4 rounded-r-md transition-colors`}
                  >
                    <item.icon
                      className={`${
                        isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                      } mr-3 h-6 w-6 flex-shrink-0`}
                    />
                    {item.name}
                  </Link>
                )
              }
            })}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Header */}
        <div className="sticky top-0 z-30 bg-white border-b border-gray-200">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              className="text-gray-500 hover:text-gray-600 lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
            
            <div className="flex items-center space-x-4">
              {versionInfo && (
                <div className="hidden sm:flex items-center text-xs text-gray-500">
                  <span className="px-2 py-1 bg-gray-100 rounded">
                    v{versionInfo.version} ({versionInfo.environment})
                  </span>
                </div>
              )}
              <button
                type="button"
                className="text-gray-400 hover:text-gray-500 relative"
              >
                <BellIcon className="h-6 w-6" />
                <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full"></span>
              </button>
              
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-700">
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="hidden sm:block">
                  <div className="text-sm font-medium text-gray-900">{user?.name}</div>
                  <div className="text-xs text-gray-500 capitalize">{user?.role?.replace('_', ' ')}</div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      localStorage.removeItem('authToken');
                      window.location.href = '/login';
                    }}
                    className="text-gray-400 hover:text-gray-500 text-sm"
                    title="Logout"
                  >
                    Logout
                  </button>
                  <button
                    onClick={() => window.location.href = '/settings'}
                    className="text-gray-400 hover:text-gray-500"
                    title="Settings"
                  >
                    <Cog6ToothIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1">
          <div className="py-6">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
