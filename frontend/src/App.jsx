import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import useAuthStore from './store/authStore'
import { CurrencyProvider } from './context/CurrencyContext'
import { RefreshProvider } from './context/RefreshContext'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Onboarding from './pages/Onboarding'
import Pricing from './pages/Pricing'
import AcceptInvite from './pages/AcceptInvite'
import Dashboard from './pages/Dashboard'
import NewAssessment from './pages/NewAssessment'
import AssessmentDetail from './pages/AssessmentDetail'
import RiskRegister from './pages/RiskRegister'
import RiskDetail from './pages/RiskDetail'
import Heatmap from './pages/Heatmap'
import FinancialTools from './pages/FinancialTools'
import Reports from './pages/Reports'
import Templates from './pages/Templates'
import Settings from './pages/Settings'
import Team from './pages/Team'
import AuditLog from './pages/AuditLog'
import Webhooks from './pages/Webhooks'
import CompanyDashboard from './pages/CompanyDashboard'
import ExpertsPanel from './pages/ExpertsPanel'
import News from './pages/News'
import IndianMarket from './pages/IndianMarket'
import AdminPanel from './pages/AdminPanel'

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuthStore()
  return isAuthenticated() ? children : <Navigate to="/login" replace />
}

export default function App() {
  useEffect(() => {
    const theme = localStorage.getItem('theme')
    if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark')
    }
  }, [])

  return (
    <CurrencyProvider>
      <RefreshProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/accept-invite" element={<AcceptInvite />} />

          {/* Protected app shell */}
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="dashboard"           element={<Dashboard />} />
            <Route path="assessments/new"     element={<NewAssessment />} />
            <Route path="assessments/:id"     element={<AssessmentDetail />} />
            <Route path="risks"               element={<RiskRegister />} />
            <Route path="risks/:id"           element={<RiskDetail />} />
            <Route path="heatmap"             element={<Heatmap />} />
            <Route path="financial"           element={<FinancialTools />} />
            <Route path="reports"             element={<Reports />} />
            <Route path="templates"           element={<Templates />} />
            <Route path="settings"            element={<Settings />} />
            <Route path="team"                element={<Team />} />
            <Route path="audit"               element={<AuditLog />} />
            <Route path="webhooks"            element={<Webhooks />} />
            <Route path="companies"           element={<CompanyDashboard />} />
            <Route path="experts"             element={<ExpertsPanel />} />
            <Route path="news"                element={<News />} />
            <Route path="indian-market"       element={<IndianMarket />} />
          </Route>

          {/* Admin — standalone, no app shell */}
          <Route path="/admin" element={<AdminPanel />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      </RefreshProvider>
    </CurrencyProvider>
  )
}
