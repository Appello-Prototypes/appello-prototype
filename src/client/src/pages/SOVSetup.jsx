import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { 
  PlusIcon, 
  TrashIcon, 
  PencilIcon,
  BuildingOffice2Icon,
  MapPinIcon,
  ClockIcon,
  CubeIcon,
  WrenchScrewdriverIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'
import { api } from '../services/api'
import toast from 'react-hot-toast'

const SOVSetup = () => {
  const { jobId } = useParams()
  const [activeTab, setActiveTab] = useState('systems')
  const [components, setComponents] = useState({
    systems: [],
    areas: [],
    phases: [],
    modules: [],
    components: []
  })
  const [jobData, setJobData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingComponent, setEditingComponent] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    sortOrder: 0
  })

  const tabs = [
    { id: 'systems', name: 'Systems', icon: BuildingOffice2Icon, color: 'blue' },
    { id: 'areas', name: 'Areas', icon: MapPinIcon, color: 'green' },
    { id: 'phases', name: 'Phases', icon: ClockIcon, color: 'purple' },
    { id: 'modules', name: 'Modules', icon: CubeIcon, color: 'orange' },
    { id: 'components', name: 'Components', icon: WrenchScrewdriverIcon, color: 'red' }
  ]

  useEffect(() => {
    if (jobId) {
      fetchComponents()
    }
  }, [jobId])

  const fetchComponents = async () => {
    try {
      setLoading(true)
      
      // Fetch job data and SOV components
      const [jobResponse, componentsResponse] = await Promise.all([
        api.get(`/api/jobs/${jobId}`),
        api.get(`/api/jobs/${jobId}/sov-components`)
      ])
      
      setJobData(jobResponse.data.data)
      setComponents(componentsResponse.data.data)
    } catch (error) {
      toast.error('Failed to load SOV components')
      console.error('Error fetching SOV components:', error)
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
        projectId: jobData?.projectId?._id || jobData?.projectId
      }

      if (editingComponent) {
        await api.put(`/api/sov/${activeTab}/${editingComponent._id}`, payload)
        toast.success(`${activeTab.slice(0, -1)} updated successfully`)
      } else {
        await api.post(`/api/sov/${activeTab}`, payload)
        toast.success(`${activeTab.slice(0, -1)} created successfully`)
      }

      setShowAddModal(false)
      setEditingComponent(null)
      setFormData({ name: '', code: '', description: '', sortOrder: 0 })
      fetchComponents()
    } catch (error) {
      toast.error(`Failed to ${editingComponent ? 'update' : 'create'} ${activeTab.slice(0, -1)}`)
      console.error('Error saving component:', error)
    }
  }

  const handleEdit = (component) => {
    setEditingComponent(component)
    setFormData({
      name: component.name,
      code: component.code,
      description: component.description || '',
      sortOrder: component.sortOrder || 0
    })
    setShowAddModal(true)
  }

  const handleDelete = async (componentId) => {
    if (!confirm('Are you sure you want to delete this component?')) return

    try {
      await api.delete(`/api/sov/${activeTab}/${componentId}`)
      toast.success(`${activeTab.slice(0, -1)} deleted successfully`)
      fetchComponents()
    } catch (error) {
      toast.error(`Failed to delete ${activeTab.slice(0, -1)}`)
      console.error('Error deleting component:', error)
    }
  }

  const openAddModal = () => {
    setEditingComponent(null)
    setFormData({ name: '', code: '', description: '', sortOrder: 0 })
    setShowAddModal(true)
  }

  const currentComponents = components[activeTab] || []
  const currentTab = tabs.find(t => t.id === activeTab)

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
            <h2 className="text-lg font-medium text-gray-900">SOV Component Setup</h2>
            <p className="mt-1 text-sm text-gray-500">
              Configure systems, areas, phases, modules, and components
            </p>
          </div>
          <button
            onClick={openAddModal}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add {currentTab?.name.slice(0, -1)}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              const count = components[tab.id]?.length || 0
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`${
                    isActive
                      ? `border-${tab.color}-500 text-${tab.color}-600`
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                >
                  <Icon className="h-5 w-5 mr-2" />
                  {tab.name}
                  <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                    isActive ? `bg-${tab.color}-100 text-${tab.color}-600` : 'bg-gray-100 text-gray-600'
                  }`}>
                    {count}
                  </span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Component List */}
        <div className="p-6">
          {currentComponents.length === 0 ? (
            <div className="text-center py-12">
              <currentTab.icon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No {activeTab} yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating your first {activeTab.slice(0, -1)}.
              </p>
              <div className="mt-6">
                <button
                  onClick={openAddModal}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add {currentTab?.name.slice(0, -1)}
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentComponents.map((component) => (
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
                        onClick={() => handleEdit(component)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(component._id)}
                        className="p-1 text-gray-400 hover:text-red-600"
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
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingComponent ? 'Edit' : 'Add'} {currentTab?.name.slice(0, -1)}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Code</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter code"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter description (optional)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Sort Order</label>
                  <input
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0"
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                  >
                    {editingComponent ? 'Update' : 'Create'}
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

export default SOVSetup
