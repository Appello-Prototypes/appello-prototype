import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  MapPinIcon,
  BuildingOffice2Icon,
  MagnifyingGlassIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { locationAPI } from '../services/api'
import toast from 'react-hot-toast'
import { formatCurrency } from '../utils/currency'

const LOCATION_TYPE_COLORS = {
  warehouse: 'bg-blue-100 text-blue-800',
  job_site: 'bg-green-100 text-green-800',
  yard: 'bg-yellow-100 text-yellow-800',
  office: 'bg-purple-100 text-purple-800',
  vehicle: 'bg-orange-100 text-orange-800',
  other: 'bg-gray-100 text-gray-800',
}

export default function Locations() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [locationTypeFilter, setLocationTypeFilter] = useState('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingLocation, setEditingLocation] = useState(null)
  const [selectedLocation, setSelectedLocation] = useState(null)

  const { data: locations, isLoading } = useQuery({
    queryKey: ['locations', locationTypeFilter],
    queryFn: () => locationAPI.getLocations({
      isActive: true,
      locationType: locationTypeFilter !== 'all' ? locationTypeFilter : undefined
    }).then(res => res.data.data),
  })

  const { data: locationInventory } = useQuery({
    queryKey: ['location-inventory', selectedLocation],
    queryFn: () => locationAPI.getInventoryByLocation(selectedLocation).then(res => res.data.data),
    enabled: !!selectedLocation
  })

  const createMutation = useMutation({
    mutationFn: (data) => locationAPI.createLocation(data),
    onSuccess: () => {
      toast.success('Location created successfully')
      setShowCreateModal(false)
      queryClient.invalidateQueries(['locations'])
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create location')
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => locationAPI.updateLocation(id, data),
    onSuccess: () => {
      toast.success('Location updated successfully')
      setEditingLocation(null)
      queryClient.invalidateQueries(['locations'])
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update location')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => locationAPI.deleteLocation(id),
    onSuccess: () => {
      toast.success('Location deleted successfully')
      queryClient.invalidateQueries(['locations'])
      setSelectedLocation(null)
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete location')
    }
  })

  const filteredLocations = locations?.filter(loc => 
    !searchTerm || 
    loc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    loc.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    loc.description?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  const handleSubmit = (formData) => {
    if (editingLocation) {
      updateMutation.mutate({ id: editingLocation._id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Locations</h1>
          <p className="mt-1 text-sm text-gray-500">Manage physical locations for inventory storage</p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            New Location
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow mb-6 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search locations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <select
            value={locationTypeFilter}
            onChange={(e) => setLocationTypeFilter(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            <option value="warehouse">Warehouse</option>
            <option value="job_site">Job Site</option>
            <option value="yard">Yard</option>
            <option value="office">Office</option>
            <option value="vehicle">Vehicle</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      {/* Locations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full text-center py-12">
            <div className="text-sm text-gray-500">Loading locations...</div>
          </div>
        ) : filteredLocations.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <MapPinIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No locations found</p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="mt-2 text-sm text-blue-600 hover:text-blue-700"
              >
                Clear search
              </button>
            )}
            {!searchTerm && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 inline-flex items-center text-blue-600 hover:text-blue-700"
              >
                <PlusIcon className="h-5 w-5 mr-1" />
                Create your first location
              </button>
            )}
          </div>
        ) : (
          filteredLocations.map((location) => (
            <div
              key={location._id}
              className={`bg-white rounded-lg shadow border-2 cursor-pointer transition-all ${
                selectedLocation === location._id 
                  ? 'border-blue-500 ring-2 ring-blue-200' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedLocation(location._id === selectedLocation ? null : location._id)}
            >
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPinIcon className="h-5 w-5 text-gray-400" />
                      <h3 className="text-lg font-semibold text-gray-900">{location.name}</h3>
                    </div>
                    {location.code && (
                      <p className="text-xs text-gray-500 mb-2">Code: {location.code}</p>
                    )}
                    {location.description && (
                      <p className="text-sm text-gray-600 mb-2">{location.description}</p>
                    )}
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        LOCATION_TYPE_COLORS[location.locationType] || LOCATION_TYPE_COLORS.other
                      }`}>
                        {location.locationType?.replace('_', ' ')}
                      </span>
                    </div>
                    {location.address && (
                      <div className="text-xs text-gray-500 mt-2">
                        {location.address.street && <div>{location.address.street}</div>}
                        {(location.address.city || location.address.state) && (
                          <div>
                            {location.address.city}{location.address.city && location.address.state ? ', ' : ''}
                            {location.address.state} {location.address.zipCode}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingLocation(location)
                        setShowCreateModal(true)
                      }}
                      className="p-1 text-gray-400 hover:text-blue-600"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (window.confirm(`Delete location "${location.name}"?`)) {
                          deleteMutation.mutate(location._id)
                        }
                      }}
                      className="p-1 text-gray-400 hover:text-red-600"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Location Detail Panel */}
      {selectedLocation && locationInventory !== undefined && (
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Inventory at {locations?.find(l => l._id === selectedLocation)?.name}
            </h2>
            <button
              onClick={() => setSelectedLocation(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
          {locationInventory && locationInventory.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">On Hand</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Available</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Value</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {locationInventory.map((item) => {
                    const locationData = item.locations?.find(l => l.location === locations?.find(loc => loc._id === selectedLocation)?.name)
                    const quantity = locationData?.quantity || (item.primaryLocation === locations?.find(loc => loc._id === selectedLocation)?.name ? item.quantityOnHand : 0)
                    const value = quantity * (item.averageCost || 0)
                    return (
                      <tr key={item._id}>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {item.productId?.name || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {item.productId?.internalPartNumber || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            item.inventoryType === 'serialized' 
                              ? 'bg-purple-100 text-purple-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {item.inventoryType}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-900">
                          {quantity.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-600">
                          {item.quantityAvailable?.toLocaleString() || '0'}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                          {formatCurrency(value)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-sm text-gray-500">
              No inventory at this location
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <LocationModal
          location={editingLocation}
          onClose={() => {
            setShowCreateModal(false)
            setEditingLocation(null)
          }}
          onSubmit={handleSubmit}
          isLoading={createMutation.isLoading || updateMutation.isLoading}
        />
      )}
    </div>
  )
}

function LocationModal({ location, onClose, onSubmit, isLoading }) {
  const [formData, setFormData] = useState({
    name: location?.name || '',
    code: location?.code || '',
    description: location?.description || '',
    parentLocation: location?.parentLocation?._id || location?.parentLocation || '',
    locationType: location?.locationType || 'warehouse',
    address: {
      street: location?.address?.street || '',
      city: location?.address?.city || '',
      state: location?.address?.state || '',
      zipCode: location?.address?.zipCode || '',
      country: location?.address?.country || 'USA'
    },
    capacity: location?.capacity || '',
    notes: location?.notes || ''
  })

  const { data: parentLocations } = useQuery({
    queryKey: ['locations', 'all'],
    queryFn: () => locationAPI.getLocations({ isActive: true }).then(res => res.data.data),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    const submitData = {
      ...formData,
      parentLocation: formData.parentLocation || null,
      capacity: formData.capacity ? parseFloat(formData.capacity) : undefined
    }
    onSubmit(submitData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {location ? 'Edit Location' : 'New Location'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Code
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location Type
                </label>
                <select
                  value={formData.locationType}
                  onChange={(e) => setFormData({ ...formData, locationType: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="warehouse">Warehouse</option>
                  <option value="job_site">Job Site</option>
                  <option value="yard">Yard</option>
                  <option value="office">Office</option>
                  <option value="vehicle">Vehicle</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Parent Location
                </label>
                <select
                  value={formData.parentLocation}
                  onChange={(e) => setFormData({ ...formData, parentLocation: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">None</option>
                  {parentLocations?.filter(loc => !location || loc._id !== location._id).map(loc => (
                    <option key={loc._id} value={loc._id}>{loc.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Street"
                  value={formData.address.street}
                  onChange={(e) => setFormData({
                    ...formData,
                    address: { ...formData.address, street: e.target.value }
                  })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="City"
                    value={formData.address.city}
                    onChange={(e) => setFormData({
                      ...formData,
                      address: { ...formData.address, city: e.target.value }
                    })}
                    className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="State"
                    value={formData.address.state}
                    onChange={(e) => setFormData({
                      ...formData,
                      address: { ...formData.address, state: e.target.value }
                    })}
                    className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="ZIP"
                    value={formData.address.zipCode}
                    onChange={(e) => setFormData({
                      ...formData,
                      address: { ...formData.address, zipCode: e.target.value }
                    })}
                    className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Capacity
                </label>
                <input
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? 'Saving...' : location ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

