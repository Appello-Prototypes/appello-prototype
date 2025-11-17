import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import ProjectList from './pages/ProjectList'
import JobList from './pages/JobList'
import ProjectDashboard from './pages/ProjectDashboard'
import TaskList from './pages/TaskList'
import TaskDetail from './pages/TaskDetail'
import CreateTask from './pages/CreateTask'
import MyTasks from './pages/MyTasks'
import TimeEntry from './pages/TimeEntry'
import ProgressReport from './pages/ProgressReport'
import SOVSetup from './pages/SOVSetup'
import EnhancedTaskView from './pages/EnhancedTaskView'
import SOVLineItems from './pages/SOVLineItems'
import JobLayout from './components/JobLayout'
import JobTimeTracking from './pages/JobTimeTracking'
import JobWorkOrders from './pages/JobWorkOrders'
import JobOverview from './pages/JobOverview'
import EarnedVsBurned from './pages/EarnedVsBurned'
import APRegisterView from './pages/APRegisterView'
import TimelogRegisterView from './pages/TimelogRegisterView'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/projects" element={<ProjectList />} />
        <Route path="/projects/:projectId" element={<ProjectDashboard />} />
        <Route path="/jobs" element={<JobList />} />
        <Route path="/jobs/:jobId" element={<JobLayout />}>
          <Route index element={<JobOverview />} />
          <Route path="tasks-enhanced" element={<EnhancedTaskView />} />
          <Route path="sov-setup" element={<SOVSetup />} />
          <Route path="sov-line-items" element={<SOVLineItems />} />
          <Route path="progress-report" element={<ProgressReport />} />
          <Route path="earned-vs-burned" element={<EarnedVsBurned />} />
          <Route path="ap-register" element={<APRegisterView />} />
          <Route path="timelog-register" element={<TimelogRegisterView />} />
          <Route path="work-orders" element={<JobWorkOrders />} />
        </Route>
        <Route path="/tasks" element={<TaskList />} />
        <Route path="/tasks/create" element={<CreateTask />} />
        <Route path="/tasks/:id" element={<TaskDetail />} />
        <Route path="/my-tasks" element={<MyTasks />} />
        <Route path="/time-entry" element={<TimeEntry />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  )
}

export default App
