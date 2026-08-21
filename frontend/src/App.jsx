import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useApp } from './context/AppContext'
import LoginPage            from './pages/LoginPage'
import DashboardPage        from './pages/DashboardPage'
import MenuPage             from './pages/MenuPage'
import CategoriesPage       from './pages/CategoriesPage'
import AddProductPage       from './pages/AddProductPage'
import EditProductPage      from './pages/EditProductPage'
import OrdersPage           from './pages/OrdersPage'
import OrderDetailPage      from './pages/OrderDetailPage'
import TablesPage           from './pages/TablesPage'
import RequestsPage         from './pages/RequestsPage'
import BillRequestsPage     from './pages/BillRequestsPage'
import ActiveOrderPage      from './pages/ActiveOrderPage'
import NewOrderPOSPage      from './pages/NewOrderPOSPage'
import AddItemsPage         from './pages/AddItemsPage'
import InvoicePreviewPage   from './pages/InvoicePreviewPage'
import CheckoutPage         from './pages/CheckoutPage'
import SuccessPage          from './pages/SuccessPage'
import CustomerMenuPage     from './pages/CustomerMenuPage'
import QRCodesPage          from './pages/QRCodesPage'
import QRPreviewPage        from './pages/QRPreviewPage'
import ReportsPage          from './pages/ReportsPage'
import SettingsProfilePage  from './pages/SettingsProfilePage'
import SettingsBillingPage  from './pages/SettingsBillingPage'
import SettingsMenuPage     from './pages/SettingsMenuPage'
import WaitersPage          from './pages/WaitersPage'

// ── Owner Module ────────────────────────────────────────────────────
import OwnerDashboardPage    from './pages/owner/OwnerDashboardPage'
import OwnerBranchesPage     from './pages/owner/OwnerBranchesPage'
import OwnerBranchDetailPage from './pages/owner/OwnerBranchDetailPage'
import OwnerStaffPage        from './pages/owner/OwnerStaffPage'
import OwnerPOSPage          from './pages/owner/OwnerPOSPage'
import OwnerMenuPage         from './pages/owner/OwnerMenuPage'
import OwnerOrdersPage       from './pages/owner/OwnerOrdersPage'
import OwnerBillingPage      from './pages/owner/OwnerBillingPage'
import OwnerPaymentsPage     from './pages/owner/OwnerPaymentsPage'
import OwnerInventoryPage    from './pages/owner/OwnerInventoryPage'
import OwnerExpensesPage     from './pages/owner/OwnerExpensesPage'
import OwnerCustomersPage    from './pages/owner/OwnerCustomersPage'
import OwnerReportsPage      from './pages/owner/OwnerReportsPage'
import OwnerSettingsPage     from './pages/owner/OwnerSettingsPage'


function ProtectedRoute({ children, allowedRoles }) {
  const { currentUser, authLoading, currentRole } = useApp()

  if (authLoading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#111315',
        color: '#fff',
        fontFamily: 'sans-serif'
      }}>
        <div style={{
          border: '4px solid rgba(255,255,255,0.1)',
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          borderLeftColor: '#f3c623',
          animation: 'spin 1s linear infinite',
          marginBottom: '1rem'
        }}></div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        <span>Verifying session...</span>
      </div>
    )
  }

  const isUserAuthenticated = !!currentUser || currentRole === 'waiter'

  if (!isUserAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(currentRole)) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#111315',
        color: '#ff4d4d',
        fontFamily: 'sans-serif'
      }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>403 - Access Denied</h1>
        <p style={{ color: '#aaa', marginBottom: '2rem' }}>You do not have permission to access this page.</p>
        <button
          onClick={() => window.location.href = '/dashboard'}
          style={{
            padding: '0.75rem 1.5rem',
            background: '#f3c623',
            color: '#111315',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: '600'
          }}
        >
          Go to Dashboard
        </button>
      </div>
    )
  }

  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Default redirect */}
        <Route path="/"           element={<Navigate to="/login" replace />} />

        {/* Auth */}
        <Route path="/login"      element={<LoginPage />} />

        {/* Customer QR Digital Menu - Public */}
        <Route path="/customer/menu" element={<CustomerMenuPage />} />

        {/* Dashboard */}
        <Route path="/dashboard"  element={
          <ProtectedRoute allowedRoles={['admin', 'manager', 'waiter']}>
            <DashboardPage />
          </ProtectedRoute>
        } />

        {/* Menu */}
        <Route path="/menu"          element={
          <ProtectedRoute allowedRoles={['admin', 'manager']}>
            <MenuPage />
          </ProtectedRoute>
        } />
        <Route path="/menu/add"      element={
          <ProtectedRoute allowedRoles={['admin', 'manager']}>
            <AddProductPage />
          </ProtectedRoute>
        } />
        <Route path="/menu/edit/:id" element={
          <ProtectedRoute allowedRoles={['admin', 'manager']}>
            <EditProductPage />
          </ProtectedRoute>
        } />

        {/* Categories */}
        <Route path="/categories"    element={
          <ProtectedRoute allowedRoles={['admin', 'manager']}>
            <CategoriesPage />
          </ProtectedRoute>
        } />

        {/* Orders */}
        <Route path="/orders"        element={
          <ProtectedRoute allowedRoles={['admin', 'manager', 'waiter']}>
            <OrdersPage />
          </ProtectedRoute>
        } />
        <Route path="/orders/new"    element={
          <ProtectedRoute allowedRoles={['admin', 'manager', 'waiter']}>
            <NewOrderPOSPage />
          </ProtectedRoute>
        } />
        <Route path="/orders/:id"    element={
          <ProtectedRoute allowedRoles={['admin', 'manager', 'waiter']}>
            <OrderDetailPage />
          </ProtectedRoute>
        } />
        <Route path="/orders/:id/add-items"  element={
          <ProtectedRoute allowedRoles={['admin', 'manager', 'waiter']}>
            <AddItemsPage />
          </ProtectedRoute>
        } />
        <Route path="/orders/:id/active"   element={
          <ProtectedRoute allowedRoles={['admin', 'manager', 'waiter']}>
            <ActiveOrderPage />
          </ProtectedRoute>
        } />
        <Route path="/orders/:id/invoice"  element={
          <ProtectedRoute allowedRoles={['admin', 'manager', 'waiter']}>
            <InvoicePreviewPage />
          </ProtectedRoute>
        } />
        <Route path="/orders/:id/checkout" element={
          <ProtectedRoute allowedRoles={['admin', 'manager', 'waiter']}>
            <CheckoutPage />
          </ProtectedRoute>
        } />
        <Route path="/orders/:id/success"  element={
          <ProtectedRoute allowedRoles={['admin', 'manager', 'waiter']}>
            <SuccessPage />
          </ProtectedRoute>
        } />

        {/* Tables */}
        <Route path="/tables"        element={
          <ProtectedRoute allowedRoles={['admin', 'manager', 'waiter']}>
            <TablesPage />
          </ProtectedRoute>
        } />

        {/* Requests */}
        <Route path="/requests"      element={
          <ProtectedRoute allowedRoles={['admin', 'manager', 'waiter']}>
            <RequestsPage />
          </ProtectedRoute>
        } />
        <Route path="/bill-requests" element={
          <ProtectedRoute allowedRoles={['admin', 'manager', 'waiter']}>
            <BillRequestsPage />
          </ProtectedRoute>
        } />

        {/* QR Codes */}
        <Route path="/qr-codes"      element={
          <ProtectedRoute allowedRoles={['admin', 'manager', 'waiter']}>
            <QRCodesPage />
          </ProtectedRoute>
        } />
        <Route path="/qr-codes/:id"  element={
          <ProtectedRoute allowedRoles={['admin', 'manager', 'waiter']}>
            <QRPreviewPage />
          </ProtectedRoute>
        } />


        {/* Waiters */}
        <Route path="/waiters"       element={
          <ProtectedRoute allowedRoles={['admin']}>
            <WaitersPage />
          </ProtectedRoute>
        } />

        {/* Reports */}
        <Route path="/reports"       element={
          <ProtectedRoute allowedRoles={['admin', 'manager']}>
            <ReportsPage />
          </ProtectedRoute>
        } />

        {/* Settings */}
        <Route path="/settings"              element={<Navigate to="/settings/profile" replace />} />
        <Route path="/settings/profile"      element={
          <ProtectedRoute allowedRoles={['admin', 'manager', 'waiter']}>
            <SettingsProfilePage />
          </ProtectedRoute>
        } />
        <Route path="/settings/billing"      element={
          <ProtectedRoute allowedRoles={['admin', 'manager']}>
            <SettingsBillingPage />
          </ProtectedRoute>
        } />
        <Route path="/settings/menu"         element={
          <ProtectedRoute allowedRoles={['admin', 'manager']}>
            <SettingsMenuPage />
          </ProtectedRoute>
        } />

        {/* Fallback — admin goes to owner dashboard */}
        <Route path="*" element={<Navigate to="/owner/dashboard" replace />} />
        <Route path="/dashboard" element={<Navigate to="/owner/dashboard" replace />} />

        {/* ── Owner / Main Admin Routes ── */}
        <Route path="/owner" element={<Navigate to="/owner/dashboard" replace />} />
        <Route path="/owner/dashboard" element={
          <ProtectedRoute allowedRoles={['owner', 'admin']}>
            <OwnerDashboardPage />
          </ProtectedRoute>
        } />
        <Route path="/owner/branches" element={
          <ProtectedRoute allowedRoles={['owner', 'admin']}>
            <OwnerBranchesPage />
          </ProtectedRoute>
        } />
        <Route path="/owner/branches/:id" element={
          <ProtectedRoute allowedRoles={['owner', 'admin']}>
            <OwnerBranchDetailPage />
          </ProtectedRoute>
        } />
        <Route path="/owner/staff" element={
          <ProtectedRoute allowedRoles={['owner', 'admin']}>
            <OwnerStaffPage />
          </ProtectedRoute>
        } />
        <Route path="/owner/pos" element={
          <ProtectedRoute allowedRoles={['owner', 'admin']}>
            <OwnerPOSPage />
          </ProtectedRoute>
        } />
        <Route path="/owner/menu" element={
          <ProtectedRoute allowedRoles={['owner', 'admin']}>
            <OwnerMenuPage />
          </ProtectedRoute>
        } />
        <Route path="/owner/orders" element={
          <ProtectedRoute allowedRoles={['owner', 'admin']}>
            <OwnerOrdersPage />
          </ProtectedRoute>
        } />
        <Route path="/owner/billing" element={
          <ProtectedRoute allowedRoles={['owner', 'admin']}>
            <OwnerBillingPage />
          </ProtectedRoute>
        } />
        <Route path="/owner/payments" element={
          <ProtectedRoute allowedRoles={['owner', 'admin']}>
            <OwnerPaymentsPage />
          </ProtectedRoute>
        } />
        <Route path="/owner/inventory" element={
          <ProtectedRoute allowedRoles={['owner', 'admin']}>
            <OwnerInventoryPage />
          </ProtectedRoute>
        } />
        <Route path="/owner/expenses" element={
          <ProtectedRoute allowedRoles={['owner', 'admin']}>
            <OwnerExpensesPage />
          </ProtectedRoute>
        } />
        <Route path="/owner/customers" element={
          <ProtectedRoute allowedRoles={['owner', 'admin']}>
            <OwnerCustomersPage />
          </ProtectedRoute>
        } />
        <Route path="/owner/reports" element={
          <ProtectedRoute allowedRoles={['owner', 'admin']}>
            <OwnerReportsPage />
          </ProtectedRoute>
        } />
        <Route path="/owner/settings" element={
          <ProtectedRoute allowedRoles={['owner', 'admin']}>
            <OwnerSettingsPage />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  )
}

