import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import Widget from '../Widget'
import { BuildingOffice2Icon } from '@heroicons/react/24/outline'
import { api } from '../../../services/api'

export default function ProjectsWidget({ id, config, isEditing, onEdit, onRemove }) {
  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects-dashboard'],
    queryFn: () => api.get('/api/projects').then(res => res.data.data),
    staleTime: 60 * 1000,
  })

  const maxItems = config.maxItems || 3
  const showProgress = config.showProgress !== false

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value || 0)
  }

  return (
    <Widget
      id={id}
      type="projects"
      title="Active Projects"
      config={config}
      isLoading={isLoading}
      isEditing={isEditing}
      onEdit={onEdit}
      onRemove={onRemove}
    >
      {projects && projects.length > 0 ? (
        <div className="space-y-3">
          {projects.slice(0, maxItems).map((project) => (
            <Link
              key={project._id}
              to={`/projects/${project._id}`}
              className="block p-3 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900 truncate text-sm">{project.name}</h4>
                {showProgress && (
                  <span className="text-lg font-bold text-purple-600 ml-2">{project.overallProgress}%</span>
                )}
              </div>
              <p className="text-xs text-gray-500 mb-2">
                {project.projectNumber} • {project.client?.name}
              </p>
              {showProgress && (
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full"
                    style={{ width: `${project.overallProgress}%` }}
                  ></div>
                </div>
              )}
              <div className="text-xs text-gray-500">
                Value: {formatCurrency(project.totalContractValue)}
              </div>
            </Link>
          ))}
          {projects.length > maxItems && (
            <Link
              to="/projects"
              className="block text-center text-sm text-blue-600 hover:text-blue-500 pt-2"
            >
              View all {projects.length} projects →
            </Link>
          )}
        </div>
      ) : (
        <div className="text-sm text-gray-500 flex items-center justify-center h-20">
          <div className="text-center">
            <BuildingOffice2Icon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p>No projects found</p>
          </div>
        </div>
      )}
    </Widget>
  )
}

