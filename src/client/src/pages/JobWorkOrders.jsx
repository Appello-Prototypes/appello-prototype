import React from 'react'
import WorkOrderList from './WorkOrderList'

// Re-export WorkOrderList for the job-specific route
const JobWorkOrders = () => {
  return <WorkOrderList />
}

export default JobWorkOrders
