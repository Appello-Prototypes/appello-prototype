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
import SOVSetup from './pages/SOVSetup'
import EnhancedTaskView from './pages/EnhancedTaskView'
import SOVLineItems from './pages/SOVLineItems'
import JobLayout from './components/JobLayout'
import JobTimeTracking from './pages/JobTimeTracking'
import JobWorkOrders from './pages/JobWorkOrders'
import WorkOrderList from './pages/WorkOrderList'
import WorkOrderDetail from './pages/WorkOrderDetail'
import CreateWorkOrder from './pages/CreateWorkOrder'
import JobOverview from './pages/JobOverview'
import EarnedVsBurned from './pages/EarnedVsBurned'
import APRegisterView from './pages/APRegisterView'
import TimelogRegisterView from './pages/TimelogRegisterView'
import ProgressReports from './pages/ProgressReports'
import MonthlyCostReport from './pages/MonthlyCostReport'
import CostToComplete from './pages/CostToComplete'
import JobFinancialSummary from './pages/JobFinancialSummary'
import OperationsTasks from './pages/OperationsTasks'
import CompanyList from './pages/CompanyList'
import CompanyForm from './pages/CompanyForm'
import CompanyOverview from './pages/CompanyOverview'
import CompanyProducts from './pages/CompanyProducts'
import DistributorManufacturers from './pages/DistributorManufacturers'
import ManufacturerDistributors from './pages/ManufacturerDistributors'
import SupplierPriceComparison from './pages/SupplierPriceComparison'
import CompanyLayout from './components/CompanyLayout'
import ProductList from './pages/ProductList'
import ProductForm from './pages/ProductForm'
import ProductDetail from './pages/ProductDetail'
import DiscountWizard from './pages/DiscountWizard'
import ProductTypeList from './pages/ProductTypeList'
import ProductTypeForm from './pages/ProductTypeForm'
import MaterialRequestList from './pages/MaterialRequestList'
import MaterialRequestForm from './pages/MaterialRequestForm'
import MaterialRequestDetail from './pages/MaterialRequestDetail'
import PurchaseOrderList from './pages/PurchaseOrderList'
import PurchaseOrderForm from './pages/PurchaseOrderForm'
import PurchaseOrderDetail from './pages/PurchaseOrderDetail'
import Receiving from './pages/Receiving'
import DiscountManagement from './pages/DiscountManagement'
import PricebookView from './pages/PricebookView'
import SpecificationList from './pages/SpecificationList'
import SpecificationForm from './pages/SpecificationForm'
import PropertyDefinitionList from './pages/PropertyDefinitionList'
import PropertyDefinitionForm from './pages/PropertyDefinitionForm'
import Inventory from './pages/Inventory'
import Settings from './pages/Settings'
import Login from './pages/Login'
import AuthCallback from './pages/AuthCallback'
import AITestingDashboard from './pages/AITestingDashboard'
import AISettings from './pages/AISettings'

function App() {
  return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="*" element={
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
          <Route path="specifications" element={<SpecificationList />} />
          <Route path="specifications/create" element={<SpecificationForm />} />
          <Route path="specifications/:id/edit" element={<SpecificationForm />} />
          <Route path="job-financial-summary" element={<JobFinancialSummary />} />
          <Route path="progress-reports" element={<ProgressReports />} />
          <Route path="earned-vs-burned" element={<EarnedVsBurned />} />
          <Route path="cost-to-complete" element={<CostToComplete />} />
          <Route path="sov-line-items" element={<SOVLineItems />} />
          <Route path="monthly-cost-report" element={<MonthlyCostReport />} />
          <Route path="ap-register" element={<APRegisterView />} />
          <Route path="timelog-register" element={<TimelogRegisterView />} />
          <Route path="work-orders" element={<JobWorkOrders />} />
        </Route>
        <Route path="/tasks" element={<TaskList />} />
        <Route path="/tasks/create" element={<CreateTask />} />
        <Route path="/tasks/:id" element={<TaskDetail />} />
        <Route path="/my-tasks" element={<MyTasks />} />
        <Route path="/operations/tasks" element={<OperationsTasks />} />
        <Route path="/work-orders" element={<WorkOrderList />} />
        <Route path="/work-orders/create" element={<CreateWorkOrder />} />
        <Route path="/work-orders/:id" element={<WorkOrderDetail />} />
        <Route path="/time-entry" element={<TimeEntry />} />
        <Route path="/companies" element={<CompanyList />} />
        <Route path="/companies/create" element={<CompanyForm />} />
        <Route path="/companies/:id/edit" element={<CompanyForm />} />
        <Route path="/companies/:id" element={<CompanyLayout />}>
          <Route index element={<CompanyOverview />} />
          <Route path="products" element={<CompanyProducts />} />
          <Route path="manufacturers" element={<DistributorManufacturers />} />
          <Route path="distributors" element={<ManufacturerDistributors />} />
          <Route path="price-comparison" element={<SupplierPriceComparison />} />
        </Route>
        <Route path="/products" element={<ProductList />} />
        <Route path="/products/create" element={<ProductForm />} />
        <Route path="/products/:id/edit" element={<ProductForm />} />
        <Route path="/products/:id" element={<ProductDetail />} />
        <Route path="/products/:id/discount-wizard" element={<DiscountWizard />} />
        <Route path="/product-types" element={<ProductTypeList />} />
        <Route path="/product-types/create" element={<ProductTypeForm />} />
        <Route path="/product-types/:id/edit" element={<ProductTypeForm />} />
        <Route path="/property-definitions" element={<PropertyDefinitionList />} />
        <Route path="/property-definitions/create" element={<PropertyDefinitionForm />} />
        <Route path="/property-definitions/:id/edit" element={<PropertyDefinitionForm />} />
        <Route path="/material-requests" element={<MaterialRequestList />} />
        <Route path="/material-requests/create" element={<MaterialRequestForm />} />
        <Route path="/material-requests/:id" element={<MaterialRequestDetail />} />
        <Route path="/purchase-orders" element={<PurchaseOrderList />} />
        <Route path="/purchase-orders/create" element={<PurchaseOrderForm />} />
        <Route path="/purchase-orders/:id" element={<PurchaseOrderDetail />} />
        <Route path="/receiving" element={<Receiving />} />
        <Route path="/discounts" element={<DiscountManagement />} />
        <Route path="/pricebook" element={<PricebookView />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/ai-testing" element={<AITestingDashboard />} />
        <Route path="/ai-settings" element={<AISettings />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Layout>
      } />
    </Routes>
  )
}

export default App
