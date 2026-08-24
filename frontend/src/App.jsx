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
import POSDashboardPage     from './pages/POSDashboardPage'
import POSTransactionsPage  from './pages/POSTransactionsPage'
import TakeawayPage         from './pages/TakeawayPage'
import OnlineOrdersPage     from './pages/OnlineOrdersPage'
import UserSettingsPage     from './pages/UserSettingsPage'
import { getSettingsRoute } from './utils/routes'


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
import OwnerExpensesPage     from './pages/owner/OwnerExpensesPage'
import OwnerCustomersPage    from './pages/owner/OwnerCustomersPage'
import OwnerReportsPage      from './pages/owner/OwnerReportsPage'
import OwnerSettingsPage     from './pages/owner/OwnerSettingsPage'
import BranchManagerLoginPage     from './pages/BranchManagerLoginPage'
import BranchManagerDashboardPage from './pages/BranchManagerDashboardPage'

// ── Branch Manager Module ───────────────────────────────────────────
import BranchDashboard   from './pages/branch-manager/BranchDashboard'
import Staff             from './pages/branch-manager/Staff'
import BranchPOS         from './pages/branch-manager/BranchPOS'
import Tables            from './pages/branch-manager/Tables'
import Orders            from './pages/branch-manager/Orders'
import Kitchen           from './pages/branch-manager/Kitchen'
import BranchMenu        from './pages/branch-manager/BranchMenu'
import Inventory         from './pages/branch-manager/Inventory'
import Expenses          from './pages/branch-manager/Expenses'
import Customers         from './pages/branch-manager/Customers'
import Reports           from './pages/branch-manager/Reports'
import BranchSettings    from './pages/branch-manager/BranchSettings'


function ProtectedRoute({ children, allowedRoles }) {
  const { currentUser, authLoading, currentRole } = useApp()

  if (window.location.pathname.startsWith('/pos/dashboard')) {
    return children
  }

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

  const isUserAuthenticated = !!currentUser || currentRole === 'waiter' || currentRole === 'cashier'

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
          onClick={() => {
            if (currentRole === 'branch_manager') {
              window.location.href = '/branch/dashboard'
            } else if (currentRole === 'cashier') {
              window.location.href = '/cashier/dashboard'
            } else {
              window.location.href = '/dashboard'
            }
          }}
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

function DashboardRedirect() {
  const { currentRole } = useApp()
  const role = currentRole?.toLowerCase().trim()
  if (role === 'cashier' || role === 'pos') {
    return <Navigate to="/cashier/dashboard" replace />
  }
  if (role === 'branch_manager' || role === 'manager') {
    return <Navigate to="/branch/dashboard" replace />
  }
  if (role === 'owner' || role === 'admin') {
    return <Navigate to="/owner/dashboard" replace />
  }
  return <DashboardPage />
}

function SettingsRedirect() {
  const { currentRole } = useApp()
  const route = getSettingsRoute(currentRole)
  return <Navigate to={route} replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Default redirect */}
        <Route path="/"           element={<Navigate to="/login" replace />} />

        {/* Auth */}
        <Route path="/login"      element={<LoginPage />} />

        {/* ── Branch Manager Portal ── */}
        <Route path="/branch-manager/login"     element={<BranchManagerLoginPage />} />
        <Route path="/branch-manager/dashboard" element={<Navigate to="/branch/dashboard" replace />} />

        {/* Customer QR Digital Menu - Public */}
        <Route path="/customer/menu" element={<CustomerMenuPage />} />

        {/* Dashboard */}
        <Route path="/dashboard"  element={
          <ProtectedRoute allowedRoles={['admin', 'branch_manager', 'waiter', 'cashier']}>
            <DashboardRedirect />
          </ProtectedRoute>
        } />

        {/* POS & Cashier Module */}
        {/* POS & Cashier Module */}
        <Route path="/pos/dashboard"      element={<ProtectedRoute allowedRoles={['admin', 'manager', 'branch_manager', 'pos', 'cashier']}><POSDashboardPage /></ProtectedRoute>} />
        <Route path="/cashier/dashboard"  element={<ProtectedRoute allowedRoles={['admin', 'manager', 'branch_manager', 'pos', 'cashier']}><POSDashboardPage /></ProtectedRoute>} />
        <Route path="/cashier/orders"     element={<ProtectedRoute allowedRoles={['admin', 'manager', 'branch_manager', 'pos', 'cashier', 'waiter']}><OrdersPage /></ProtectedRoute>} />
        <Route path="/cashier/tables"     element={<ProtectedRoute allowedRoles={['admin', 'manager', 'branch_manager', 'pos', 'cashier', 'waiter']}><TablesPage /></ProtectedRoute>} />
        <Route path="/cashier/bill-requests" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'branch_manager', 'pos', 'cashier', 'waiter']}><BillRequestsPage /></ProtectedRoute>} />
        <Route path="/cashier/billing/:id" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'branch_manager', 'pos', 'cashier', 'waiter']}><InvoicePreviewPage /></ProtectedRoute>} />
        <Route path="/cashier/payment/:id" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'branch_manager', 'pos', 'cashier', 'waiter']}><CheckoutPage /></ProtectedRoute>} />
        <Route path="/cashier/success/:id" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'branch_manager', 'pos', 'cashier', 'waiter']}><SuccessPage /></ProtectedRoute>} />
        <Route path="/cashier/online-orders" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'branch_manager', 'pos', 'cashier']}><OnlineOrdersPage /></ProtectedRoute>} />
        <Route path="/cashier/transactions" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'branch_manager', 'pos', 'cashier', 'waiter']}><POSTransactionsPage /></ProtectedRoute>} />


        {/* Menu */}
        <Route path="/menu"          element={
          <ProtectedRoute allowedRoles={['admin', 'branch_manager', 'waiter', 'cashier']}>
            <MenuPage />
          </ProtectedRoute>
        } />
        <Route path="/menu/add"      element={
          <ProtectedRoute allowedRoles={['admin', 'branch_manager']}>
            <AddProductPage />
          </ProtectedRoute>
        } />
        <Route path="/menu/edit/:id" element={
          <ProtectedRoute allowedRoles={['admin', 'branch_manager']}>
            <EditProductPage />
          </ProtectedRoute>
        } />

        {/* Categories */}
        <Route path="/categories"    element={
          <ProtectedRoute allowedRoles={['admin', 'branch_manager']}>
            <CategoriesPage />
          </ProtectedRoute>
        } />

        {/* Orders */}
        <Route path="/orders"        element={
          <ProtectedRoute allowedRoles={['admin', 'branch_manager', 'waiter', 'cashier']}>
            <OrdersPage />
          </ProtectedRoute>
        } />
        <Route path="/orders/new"    element={
          <ProtectedRoute allowedRoles={['admin', 'branch_manager', 'waiter', 'cashier']}>
            <NewOrderPOSPage />
          </ProtectedRoute>
        } />
        <Route path="/orders/:id"    element={
          <ProtectedRoute allowedRoles={['admin', 'branch_manager', 'waiter', 'cashier']}>
            <OrderDetailPage />
          </ProtectedRoute>
        } />
        <Route path="/orders/:id/add-items"  element={
          <ProtectedRoute allowedRoles={['admin', 'branch_manager', 'waiter', 'cashier']}>
            <AddItemsPage />
          </ProtectedRoute>
        } />
        <Route path="/orders/:id/active"   element={
          <ProtectedRoute allowedRoles={['admin', 'branch_manager', 'waiter', 'cashier']}>
            <ActiveOrderPage />
          </ProtectedRoute>
        } />
        <Route path="/orders/:id/invoice"  element={
          <ProtectedRoute allowedRoles={['admin', 'branch_manager', 'cashier']}>
            <InvoicePreviewPage />
          </ProtectedRoute>
        } />
        <Route path="/orders/:orderId/checkout" element={
          <ProtectedRoute allowedRoles={['admin', 'manager', 'branch_manager', 'pos', 'cashier', 'waiter']}>
            <CheckoutPage />
          </ProtectedRoute>
        } />
        <Route path="/orders/:id/success"  element={
          <ProtectedRoute allowedRoles={['admin', 'branch_manager', 'cashier']}>
            <SuccessPage />
          </ProtectedRoute>
        } />

        {/* Tables */}
        <Route path="/tables"        element={
          <ProtectedRoute allowedRoles={['admin', 'branch_manager', 'waiter', 'cashier']}>
            <TablesPage />
          </ProtectedRoute>
        } />

        {/* Requests */}
        <Route path="/requests"      element={
          <ProtectedRoute allowedRoles={['admin', 'branch_manager', 'waiter', 'cashier']}>
            <RequestsPage />
          </ProtectedRoute>
        } />
        <Route path="/bill-requests" element={
          <ProtectedRoute allowedRoles={['admin', 'branch_manager', 'waiter', 'cashier']}>
            <BillRequestsPage />
          </ProtectedRoute>
        } />

        {/* QR Codes */}
        <Route path="/qr-codes"      element={
          <ProtectedRoute allowedRoles={['admin', 'branch_manager', 'waiter', 'cashier']}>
            <QRCodesPage />
          </ProtectedRoute>
        } />
        <Route path="/qr-codes/:id"  element={
          <ProtectedRoute allowedRoles={['admin', 'branch_manager', 'waiter', 'cashier']}>
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
          <ProtectedRoute allowedRoles={['admin', 'branch_manager']}>
            <ReportsPage />
          </ProtectedRoute>
        } />

        {/* Settings */}
        <Route path="/settings"              element={<SettingsRedirect />} />
        <Route path="/settings/profile"      element={<SettingsRedirect />} />
        <Route path="/cashier/settings/profile" element={
          <ProtectedRoute allowedRoles={['admin', 'branch_manager', 'cashier']}>
            <UserSettingsPage />
          </ProtectedRoute>
        } />
        <Route path="/waiter/settings/profile" element={
          <ProtectedRoute allowedRoles={['admin', 'branch_manager', 'waiter']}>
            <UserSettingsPage />
          </ProtectedRoute>
        } />
        <Route path="/settings/billing"      element={
          <ProtectedRoute allowedRoles={['admin', 'branch_manager']}>
            <SettingsBillingPage />
          </ProtectedRoute>
        } />
        <Route path="/settings/menu"         element={
          <ProtectedRoute allowedRoles={['admin', 'branch_manager']}>
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

        {/* ── Branch Manager Routes ── */}
        <Route path="/branch/dashboard" element={
          <ProtectedRoute allowedRoles={['branch_manager']}>
            <BranchDashboard />
          </ProtectedRoute>
        } />
        <Route path="/branch/staff" element={
          <ProtectedRoute allowedRoles={['branch_manager']}>
            <Staff />
          </ProtectedRoute>
        } />
        <Route path="/branch/pos" element={
          <ProtectedRoute allowedRoles={['branch_manager']}>
            <BranchPOS />
          </ProtectedRoute>
        } />
        <Route path="/branch/tables" element={
          <ProtectedRoute allowedRoles={['branch_manager']}>
            <Tables />
          </ProtectedRoute>
        } />
        <Route path="/branch/orders" element={
          <ProtectedRoute allowedRoles={['branch_manager']}>
            <Orders />
          </ProtectedRoute>
        } />
        <Route path="/branch/kitchen" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Kitchen />
          </ProtectedRoute>
        } />
        <Route path="/branch/menu" element={
          <ProtectedRoute allowedRoles={['branch_manager']}>
            <BranchMenu />
          </ProtectedRoute>
        } />
        <Route path="/branch/inventory" element={
          <ProtectedRoute allowedRoles={['branch_manager']}>
            <Inventory />
          </ProtectedRoute>
        } />
        <Route path="/branch/expenses" element={
          <ProtectedRoute allowedRoles={['branch_manager']}>
            <Expenses />
          </ProtectedRoute>
        } />
        <Route path="/branch/customers" element={
          <ProtectedRoute allowedRoles={['branch_manager']}>
            <Customers />
          </ProtectedRoute>
        } />
        <Route path="/branch/reports" element={
          <ProtectedRoute allowedRoles={['branch_manager']}>
            <Reports />
          </ProtectedRoute>
        } />
        <Route path="/branch/settings" element={
          <ProtectedRoute allowedRoles={['branch_manager']}>
            <BranchSettings />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  )
}

