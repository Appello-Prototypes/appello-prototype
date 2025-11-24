import React from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'
import { specificationAPI } from '../services/api'
import toast from 'react-hot-toast'

export default function SpecificationList() {
  const { jobId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: specifications, isLoading } = useQuery({
    queryKey: ['specifications', jobId],
    queryFn: () => specificationAPI.getSpecifications(jobId).then(res => res.data.data),
    enabled: !!jobId
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => specificationAPI.deleteSpecification(id),
    onSuccess: () => {
      toast.success('Specification deleted successfully')
      queryClient.invalidateQueries(['specifications', jobId])
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete specification')
    }
  })

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this specification?')) {
      deleteMutation.mutate(id)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Specifications</h2>
            <p className="mt-1 text-sm text-gray-500">
              Define product selection rules for systems and areas
            </p>
          </div>
          <Link
            to={`/jobs/${jobId}/specifications/create`}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Create Specification
          </Link>
        </div>
      </div>

      {/* Specifications List */}
      {specifications && specifications.length > 0 ? (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  System / Area
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Conditions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {specifications.map((spec) => (
                <tr key={spec._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{spec.name}</div>
                    {spec.description && (
                      <div className="text-sm text-gray-500">{spec.description}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {spec.systemName || spec.systemId?.name || 'Any System'}
                    </div>
                    {spec.areaName || spec.areaId?.name ? (
                      <div className="text-sm text-gray-500">
                        {spec.areaName || spec.areaId?.name}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {spec.conditions?.pipeTypes?.length > 0 && (
                        <div>Pipe Types: {spec.conditions.pipeTypes.join(', ')}</div>
                      )}
                      {spec.conditions?.minDiameter && (
                        <div>Min Diameter: {spec.conditions.minDiameter}</div>
                      )}
                      {spec.conditions?.maxDiameter && (
                        <div>Max Diameter: {spec.conditions.maxDiameter}</div>
                      )}
                      {!spec.conditions?.pipeTypes?.length && 
                       !spec.conditions?.minDiameter && 
                       !spec.conditions?.maxDiameter && (
                        <span className="text-gray-400">Any</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {spec.productTypeId?.name || 'Any'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {spec.isActive ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircleIcon className="h-3 w-3 mr-1" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        <XCircleIcon className="h-3 w-3 mr-1" />
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {spec.priority || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <Link
                        to={`/jobs/${jobId}/specifications/${spec._id}/edit`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </Link>
                      <button
                        onClick={() => handleDelete(spec._id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg p-12 text-center">
          <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No specifications</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating a new specification.
          </p>
          <div className="mt-6">
            <Link
              to={`/jobs/${jobId}/specifications/create`}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Create Specification
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

