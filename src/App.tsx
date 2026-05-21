import { Routes, Route } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { ProtectedRoute } from './components/auth/ProtectedRoute'

// Lazy load pages for code splitting
const IndexPage = lazy(() => import('./pages/index'))
const OrderPage = lazy(() => import('./pages/order/[orderNumber]'))
const DashboardPage = lazy(() => import('./pages/dashboard'))
const AdminPage = lazy(() => import('./pages/admin/index'))
const AdminCataloguesPage = lazy(() => import('./pages/admin/catalogues'))
const AdminProductsPage = lazy(() => import('./pages/admin/products'))
const LoginPage = lazy(() => import('./pages/login'))

// Loading component
const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center">
    <div className="h-12 w-12 animate-spin rounded-full border-4 border-rose-200 border-t-rose-600" />
  </div>
)

function App() {
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<IndexPage />} />
          <Route path="/new-order" element={<IndexPage />} />
          <Route path="/order/:orderNumber" element={<OrderPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
          <Route path="/admin/catalogues" element={<ProtectedRoute><AdminCataloguesPage /></ProtectedRoute>} />
          <Route path="/admin/products" element={<ProtectedRoute><AdminProductsPage /></ProtectedRoute>} />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </Suspense>
    </div>
  )
}

export default App
