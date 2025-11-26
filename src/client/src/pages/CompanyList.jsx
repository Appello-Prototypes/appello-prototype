import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { PlusIcon, MagnifyingGlassIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import { companyAPI } from '../services/api'
import toast from 'react-hot-toast'

export default function CompanyList() {
  const [searchTerm, setSearchTerm] = useState('')
  const [companyTypeFilter, setCompanyTypeFilter] = useState('all')
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['companies', companyTypeFilter, searchTerm],
    queryFn: () => companyAPI.getCompanies({
      companyType: companyTypeFilter !== 'all' ? companyTypeFilter : undefined,
      search: searchTerm || undefined
    }).then(res => res.data.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => companyAPI.deleteCompany(id),
    onSuccess: () => {
      toast.success('Company deleted successfully')
      queryClient.invalidateQueries(['companies'])
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete company')
    },
  })

  const handleDelete = (id, name) => {
    if (window.confirm(`Are you sure you want to delete ${name}?`)) {
      deleteMutation.mutate(id)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-800">Error loading companies: {error.message}</p>
      </div>
    )
  }

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Suppliers & Companies</h1>
          <p className="mt-1 text-sm text-gray-500">Manage your suppliers and company contacts</p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Link
            to="/companies/create"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Company
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow mb-6 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search companies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <select
            value={companyTypeFilter}
            onChange={(e) => setCompanyTypeFilter(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            <option value="customer">Customers</option>
            <option value="supplier">Suppliers</option>
            <option value="distributor">Distributors</option>
            <option value="subcontractor">Subcontractors</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      {/* Companies List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {data && data.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {data.map((company) => (
              <li key={company._id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <Link
                        to={`/companies/${company._id}`}
                        className="text-lg font-medium text-blue-600 hover:text-blue-800"
                      >
                        {company.name}
                      </Link>
                      <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {company.companyType}
                      </span>
                      {!company.isActive && (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Inactive
                        </span>
                      )}
                    </div>
                    <div className="mt-2 text-sm text-gray-500">
                      {company.contactPerson && (
                        <p>Contact: {company.contactPerson}</p>
                      )}
                      {company.email && (
                        <p>Email: {company.email}</p>
                      )}
                      {company.phone && (
                        <p>Phone: {company.phone}</p>
                      )}
                      {company.paymentTerms && (
                        <p>Payment Terms: {company.paymentTerms}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Link
                      to={`/companies/${company._id}/edit`}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </Link>
                    <button
                      onClick={() => handleDelete(company._id, company.name)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">No companies found</p>
            <Link
              to="/companies/create"
              className="mt-4 inline-flex items-center text-blue-600 hover:text-blue-700"
            >
              <PlusIcon className="h-5 w-5 mr-1" />
              Add your first company
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

