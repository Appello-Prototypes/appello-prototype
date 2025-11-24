import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import Widget from '../Widget'
import {
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CalendarIcon,
  FireIcon,
} from '@heroicons/react/24/outline'
import { taskAPI } from '../../../services/api'

const iconMap = {
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CalendarIcon,
  FireIcon,
}

export default function TaskStatsWidget({ id, config, isEditing, onEdit, onRemove }) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => taskAPI.getDashboardStats().then(res => res.data.data),
  })

  const statType = config.statType || 'totalTasks'
  const showLink = config.showLink !== false

  const statConfig = {
    totalTasks: {
      name: 'Total Tasks',
      icon: ClipboardDocumentListIcon,
      color: 'blue',
      href: '/tasks',
      value: stats?.totalTasks || 0,
    },
    completedTasks: {
      name: 'Completed',
      icon: CheckCircleIcon,
      color: 'green',
      href: '/tasks?status=completed',
      value: stats?.completedTasks || 0,
    },
    inProgressTasks: {
      name: 'In Progress',
      icon: ClockIcon,
      color: 'yellow',
      href: '/tasks?status=in_progress',
      value: stats?.inProgressTasks || 0,
    },
    overdueTasks: {
      name: 'Overdue',
      icon: ExclamationTriangleIcon,
      color: 'red',
      href: '/tasks/overdue',
      value: stats?.overdueTasks || 0,
    },
    todayTasks: {
      name: 'Due Today',
      icon: CalendarIcon,
      color: 'purple',
      href: '/tasks?due=today',
      value: stats?.todayTasks || 0,
    },
    highPriorityTasks: {
      name: 'High Priority',
      icon: FireIcon,
      color: 'orange',
      href: '/tasks?priority=high',
      value: stats?.highPriorityTasks || 0,
    },
  }

  const currentStat = statConfig[statType] || statConfig.totalTasks
  const Icon = currentStat.icon

  const getColorClasses = (color) => {
    const colors = {
      blue: 'bg-blue-50 text-blue-600',
      green: 'bg-green-50 text-green-600',
      yellow: 'bg-yellow-50 text-yellow-600',
      red: 'bg-red-50 text-red-600',
      purple: 'bg-purple-50 text-purple-600',
      orange: 'bg-orange-50 text-orange-600',
    }
    return colors[color] || colors.blue
  }

  const content = (
    <div className="flex items-center">
      <div className="flex-shrink-0">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getColorClasses(currentStat.color)}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      <div className="ml-4 flex-1">
        <div className="text-2xl font-bold text-gray-900">{currentStat.value}</div>
        <div className="text-sm font-medium text-gray-500">{currentStat.name}</div>
      </div>
    </div>
  )

  return (
    <Widget
      id={id}
      type="taskStats"
      title={currentStat.name}
      config={config}
      isLoading={isLoading}
      isEditing={isEditing}
      onEdit={onEdit}
      onRemove={onRemove}
    >
      {showLink && currentStat.href ? (
        <Link to={currentStat.href} className="block hover:opacity-80 transition-opacity">
          {content}
        </Link>
      ) : (
        content
      )}
    </Widget>
  )
}

