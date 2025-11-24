import React, { useState } from 'react'
import DashboardManager from '../components/dashboard/DashboardManager'
import LegacyDashboard from './LegacyDashboard'

export default function Dashboard() {
  const [useLegacy, setUseLegacy] = useState(false)

  // Check if user wants to use legacy dashboard
  if (useLegacy) {
    return (
      <div>
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => setUseLegacy(false)}
            className="text-sm text-blue-600 hover:text-blue-500"
          >
            Use Configurable Dashboard →
          </button>
        </div>
        <LegacyDashboard />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setUseLegacy(true)}
          className="text-sm text-gray-600 hover:text-gray-500"
        >
          Use Legacy Dashboard →
        </button>
      </div>
      <DashboardManager />
    </div>
  )
}
