import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SparklesIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { jobAPI, specificationAPI, productAPI } from '../services/api';
import ProductCard from './ProductCard';

export default function SpecificationQuickAdd({ 
  jobId, 
  supplierId, 
  onSelectProduct 
}) {
  const [context, setContext] = useState({
    systemId: '',
    areaId: '',
    pipeType: '',
    pipeDiameter: ''
  });

  // Fetch job details for systems/areas
  const { data: job } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => jobAPI.getJob(jobId).then(res => res.data.data),
    enabled: !!jobId
  });

  // Match specification based on context
  const { data: matchResult, isLoading: isLoadingMatch } = useQuery({
    queryKey: ['specification-match', jobId, context.systemId, context.areaId, context.pipeType, context.pipeDiameter],
    queryFn: () => specificationAPI.matchSpecifications({
      jobId,
      systemId: context.systemId || undefined,
      areaId: context.areaId || undefined,
      pipeType: context.pipeType || undefined,
      pipeDiameter: context.pipeDiameter || undefined
    }).then(res => res.data.data),
    enabled: !!jobId && (!!context.systemId || !!context.areaId || !!context.pipeType || !!context.pipeDiameter)
  });

  const systems = job?.systems || [];
  const areas = job?.areas || [];

  const handleContextChange = (field, value) => {
    setContext(prev => ({ ...prev, [field]: value }));
  };

  const recommendedProduct = matchResult?.recommendedProduct;
  const matchedSpec = matchResult?.specifications?.[0];

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center mb-3">
          <SparklesIcon className="h-5 w-5 text-blue-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Add from Specification</h3>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Select job context to find matching specifications and recommended products
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              System
            </label>
            <select
              value={context.systemId}
              onChange={(e) => handleContextChange('systemId', e.target.value)}
              className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Any System</option>
              {systems.map(system => (
                <option key={system._id || system.id} value={system._id || system.id}>
                  {system.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Area
            </label>
            <select
              value={context.areaId}
              onChange={(e) => handleContextChange('areaId', e.target.value)}
              className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Any Area</option>
              {areas.map(area => (
                <option key={area._id || area.id} value={area._id || area.id}>
                  {area.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pipe Type
            </label>
            <select
              value={context.pipeType}
              onChange={(e) => handleContextChange('pipeType', e.target.value)}
              className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Any Pipe Type</option>
              <option value="copper">Copper</option>
              <option value="iron">Iron</option>
              <option value="steel">Steel</option>
              <option value="pvc">PVC</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pipe Diameter
            </label>
            <input
              type="text"
              value={context.pipeDiameter}
              onChange={(e) => handleContextChange('pipeDiameter', e.target.value)}
              placeholder="e.g., 2&quot;"
              className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Match Results */}
      {isLoadingMatch && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">Finding matching specifications...</p>
        </div>
      )}

      {matchResult && matchedSpec && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="font-semibold text-gray-900">✓ Specification Match Found</h4>
              <p className="text-sm text-gray-600">{matchedSpec.name}</p>
            </div>
          </div>

          {recommendedProduct ? (
            <div className="mt-4">
              <h5 className="text-sm font-medium text-gray-700 mb-2">Recommended Product:</h5>
              <div className="bg-white rounded border border-green-200 p-3">
                <ProductCard
                  product={{
                    _id: recommendedProduct.productId,
                    productId: recommendedProduct.productId,
                    variantId: recommendedProduct.variantId,
                    name: recommendedProduct.productName,
                    variantName: recommendedProduct.variantName,
                    sku: recommendedProduct.sku,
                    description: recommendedProduct.productDescription,
                    unitOfMeasure: recommendedProduct.unitOfMeasure,
                    unitPrice: 0, // Will be calculated
                    variantProperties: recommendedProduct.configuredProperties || {}
                  }}
                  onSelect={onSelectProduct}
                  supplierId={supplierId}
                />
              </div>
            </div>
          ) : (
            <div className="mt-4 text-sm text-gray-600">
              <p>No matching products found for this specification.</p>
              <p className="mt-1">Try adjusting the context or search manually.</p>
            </div>
          )}
        </div>
      )}

      {matchResult && !matchedSpec && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-gray-700">
            No specifications match this context. Try adjusting your selections or search manually.
          </p>
        </div>
      )}
    </div>
  );
}

