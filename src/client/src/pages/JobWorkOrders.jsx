import React from 'react'
import { useParams } from 'react-router-dom'
import { 
  DocumentTextIcon,
  PlusIcon,
  PrinterIcon,
  ShareIcon
} from '@heroicons/react/24/outline'

const JobWorkOrders = () => {
  const { jobId } = useParams()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Work Orders</h2>
            <p className="mt-1 text-sm text-gray-500">
              Manage work orders and field documentation for this job
            </p>
          </div>
          <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
            <PlusIcon className="h-4 w-4 mr-2" />
            Create Work Order
          </button>
        </div>
      </div>

      {/* Work Orders Content */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Active Work Orders</h3>
        </div>
        
        <div className="text-center py-12">
          <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Work Orders Coming Soon</h3>
          <p className="mt-1 text-sm text-gray-500">
            Work order management functionality will be implemented here.
          </p>
          <p className="mt-2 text-xs text-gray-400">
            Features will include: Foreman work orders, test package assignments, 
            isometric drawing integration, and field documentation.
          </p>
          
          <div className="mt-6 flex justify-center space-x-4">
            <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
              <PrinterIcon className="h-4 w-4 mr-2" />
              Print Work Orders
            </button>
            <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
              <ShareIcon className="h-4 w-4 mr-2" />
              Export to Field
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default JobWorkOrders
