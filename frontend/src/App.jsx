import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
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
import ActiveOrderPage      from './pages/ActiveOrderPage'
import NewOrderPOSPage      from './pages/NewOrderPOSPage'
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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Default redirect */}
        <Route path="/"           element={<Navigate to="/login" replace />} />

        {/* Auth */}
        <Route path="/login"      element={<LoginPage />} />

        {/* Dashboard */}
        <Route path="/dashboard"  element={<DashboardPage />} />

        {/* Menu */}
        <Route path="/menu"          element={<MenuPage />} />
        <Route path="/menu/add"      element={<AddProductPage />} />
        <Route path="/menu/edit/:id" element={<EditProductPage />} />

        {/* Categories */}
        <Route path="/categories"    element={<CategoriesPage />} />

        {/* Orders */}
        <Route path="/orders"        element={<OrdersPage />} />
        <Route path="/orders/new"    element={<NewOrderPOSPage />} />
        <Route path="/orders/:id"    element={<OrderDetailPage />} />
        <Route path="/orders/:id/active"   element={<ActiveOrderPage />} />
        <Route path="/orders/:id/invoice"  element={<InvoicePreviewPage />} />
        <Route path="/orders/:id/checkout" element={<CheckoutPage />} />
        <Route path="/orders/:id/success"  element={<SuccessPage />} />

        {/* Customer QR Digital Menu */}
        <Route path="/customer/menu" element={<CustomerMenuPage />} />

        {/* Tables */}
        <Route path="/tables"        element={<TablesPage />} />

        {/* Requests */}
        <Route path="/requests"      element={<RequestsPage />} />

        {/* QR Codes */}
        <Route path="/qr-codes"      element={<QRCodesPage />} />
        <Route path="/qr-codes/:id"  element={<QRPreviewPage />} />

        {/* Reports */}
        <Route path="/reports"       element={<ReportsPage />} />

        {/* Settings */}
        <Route path="/settings"              element={<Navigate to="/settings/profile" replace />} />
        <Route path="/settings/profile"      element={<SettingsProfilePage />} />
        <Route path="/settings/billing"      element={<SettingsBillingPage />} />
        <Route path="/settings/menu"         element={<SettingsMenuPage />} />

        {/* Fallback */}
        <Route path="*"           element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
