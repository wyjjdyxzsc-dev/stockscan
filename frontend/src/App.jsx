import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './components/Toast'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Inventory from './pages/Inventory'
import Scan from './pages/Scan'
import Sales from './pages/Sales'
import Admin from './pages/Admin'

function Guard({ children }) {
  const { employee, loading } = useAuth()
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>
  return employee ? children : <Navigate to="/login" replace />
}

function AdminGuard({ children }) {
  const { employee } = useAuth()
  return employee?.role === 'admin' ? children : <Navigate to="/" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Guard><Layout /></Guard>}>
              <Route index element={<Dashboard />} />
              <Route path="inventory" element={<Inventory />} />
              <Route path="scan" element={<Scan />} />
              <Route path="sales" element={<Sales />} />
              <Route path="admin" element={<AdminGuard><Admin /></AdminGuard>} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  )
}
