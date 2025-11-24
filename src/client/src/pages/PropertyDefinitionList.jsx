import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { propertyDefinitionAPI } from '../services/api';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

export default function PropertyDefinitionList() {
  const { data: propertyDefinitions, isLoading, isError, error } = useQuery({
    queryKey: ['property-definitions'],
    queryFn: () => propertyDefinitionAPI.getPropertyDefinitions({ isActive: true }).then(res => res.data.data),
  });

  if (isLoading) return <div className="text-center py-4">Loading property definitions...</div>;
  if (isError) return <div className="text-center py-4 text-red-600">Error: {error.message}</div>;

  // Group by category
  const grouped = propertyDefinitions?.reduce((acc, prop) => {
    const category = prop.category || 'other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(prop);
    return acc;
  }, {});

  const categoryLabels = {
    dimension: 'Dimensions',
    material: 'Materials',
    specification: 'Specifications',
    performance: 'Performance',
    other: 'Other'
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Property Definitions</h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage global property definitions used across product types and specifications
          </p>
        </div>
        <Link
          to="/property-definitions/create"
          className="btn-primary"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Create Property Definition
        </Link>
      </div>

      {propertyDefinitions?.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-6 text-center">
          <p className="text-gray-600">No property definitions found.</p>
          <p className="mt-2 text-sm text-gray-500">Create property definitions to ensure consistent property keys across the application.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped || {}).map(([category, props]) => (
            <div key={category} className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  {categoryLabels[category] || category}
                </h3>
              </div>
              <div className="divide-y divide-gray-200">
                {props.map((prop) => (
                  <div key={prop._id} className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h4 className="text-sm font-medium text-gray-900">
                            {prop.label}
                          </h4>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                            {prop.key}
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            {prop.dataType}
                          </span>
                          {prop.unit && (
                            <span className="text-xs text-gray-500">
                              ({prop.unit})
                            </span>
                          )}
                        </div>
                        {prop.description && (
                          <p className="mt-1 text-sm text-gray-500">{prop.description}</p>
                        )}
                        {prop.enumOptions && prop.enumOptions.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs text-gray-500">Options:</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {prop.enumOptions.map((opt, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800"
                                >
                                  {opt.label}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {prop.aliases && prop.aliases.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs text-gray-500">Aliases: {prop.aliases.join(', ')}</p>
                          </div>
                        )}
                      </div>
                      <div className="ml-4 flex items-center gap-2">
                        <Link
                          to={`/property-definitions/${prop._id}/edit`}
                          className="text-blue-600 hover:text-blue-900"
                          title="Edit"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

