from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework.routers import DefaultRouter
from .views import (
    OwnerSettingsView,
    CustomTokenObtainPairView,
    LogoutView,
    CurrentUserView,
    ChangePasswordView,
    WaiterViewSet,
    ActiveWaiterListView,
    WaiterLoginView,
    EmployeeLoginView,
    CashierViewSet,
    BranchViewSet,
    BranchManagerViewSet,
    BranchManagerLoginView,
    OwnerPOSTerminalViewSet,
    AdminForgotPasswordView,
    AdminVerifyOTPView,
    AdminResetPasswordView,
    AdminSignupView,
    AdminVerifySignupOTPView,
    ResendSignupOTPView,
    ForgotBusinessCodeOTPView,
    VerifyBusinessCodeOTPView,
    ResendBusinessCodeOTPView,
    RegenerateBusinessCodeView,
)
from .branch_views import (
    BranchDashboardView,
    BranchStaffView,
    BranchTableViewSet,
    BranchOrderViewSet,
    BranchKitchenOrdersView,
    BranchMenuView,
    BranchInventoryViewSet,
    BranchExpenseViewSet,
    BranchCustomersView,
    BranchReportsView,
    BranchSettingsView,
    BranchPOSTerminalViewSet,
)

router = DefaultRouter()
router.register(r'waiters', WaiterViewSet, basename='waiters')
router.register(r'cashiers', CashierViewSet, basename='cashiers')
router.register(r'branches', BranchViewSet, basename='branches')
router.register(r'branch-managers', BranchManagerViewSet, basename='branch-managers')
router.register(r'branch/tables', BranchTableViewSet, basename='branch-tables')
router.register(r'branch/orders', BranchOrderViewSet, basename='branch-orders')
router.register(r'branch/inventory', BranchInventoryViewSet, basename='branch-inventory')
router.register(r'branch/expenses', BranchExpenseViewSet, basename='branch-expenses')
router.register(r'owner/pos', OwnerPOSTerminalViewSet, basename='owner-pos')
router.register(r'branch/pos', BranchPOSTerminalViewSet, basename='branch-pos')

urlpatterns = [
    path('auth/login/', CustomTokenObtainPairView.as_view(), name='auth_login'),
    path('auth/logout/', LogoutView.as_view(), name='auth_logout'),
    path('auth/admin-forgot-password/', AdminForgotPasswordView.as_view(), name='auth_admin_forgot_password'),
    path('auth/admin-verify-otp/', AdminVerifyOTPView.as_view(), name='auth_admin_verify_otp'),
    path('auth/admin-reset-password/', AdminResetPasswordView.as_view(), name='auth_admin_reset_password'),
    path('auth/admin-signup/', AdminSignupView.as_view(), name='auth_admin_signup'),
    path('auth/admin-verify-signup-otp/', AdminVerifySignupOTPView.as_view(), name='auth_admin_verify_signup_otp'),
    path('auth/resend-signup-otp/', ResendSignupOTPView.as_view(), name='auth_resend_signup_otp'),
    path('auth/forgot-business-code/', ForgotBusinessCodeOTPView.as_view(), name='auth_forgot_business_code'),
    path('auth/verify-business-code-otp/', VerifyBusinessCodeOTPView.as_view(), name='auth_verify_business_code_otp'),
    path('auth/resend-business-code-otp/', ResendBusinessCodeOTPView.as_view(), name='auth_resend_business_code_otp'),
    path('auth/regenerate-business-code/', RegenerateBusinessCodeView.as_view(), name='auth_regenerate_business_code'),
    path('auth/me/', CurrentUserView.as_view(), name='auth_me'),
    path('auth/change-password/', ChangePasswordView.as_view(), name='auth_change_password'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='auth_token_refresh'),
    path('auth/waiters/', ActiveWaiterListView.as_view(), name='auth_waiters'),
    path('auth/waiter-login/', WaiterLoginView.as_view(), name='auth_waiter_login'),
    path('auth/employee-login/', EmployeeLoginView.as_view(), name='auth_employee_login'),
    path('auth/branch-manager-login/', BranchManagerLoginView.as_view(), name='auth_branch_manager_login'),
    path('owner/settings/', OwnerSettingsView.as_view(), name='owner_settings'),

    # Branch Manager URLs
    path('branch/dashboard/', BranchDashboardView.as_view(), name='branch_dashboard'),
    path('branch/staff/', BranchStaffView.as_view(), name='branch_staff_list_create'),
    path('branch/staff/<str:pk>/', BranchStaffView.as_view(), name='branch_staff_detail_update'),
    path('branch/staff/<str:pk>/status/', BranchStaffView.as_view(), name='branch_staff_status'),
    path('branch/staff/<str:pk>/verify_pin_change/', BranchStaffView.as_view(), name='branch_staff_verify_pin'),
    path('branch/staff/<str:pk>/resend_pin_change_otp/', BranchStaffView.as_view(), name='branch_staff_resend_pin_otp'),
    path('branch/kitchen/orders/', BranchKitchenOrdersView.as_view(), name='branch_kitchen_orders'),
    path('branch/kitchen/orders/<int:pk>/status/', BranchOrderViewSet.as_view({'patch': 'partial_update'}), name='branch_kitchen_order_status'),
    path('branch/menu/', BranchMenuView.as_view(), name='branch_menu'),
    path('branch/menu/<int:pk>/', BranchMenuView.as_view(), name='branch_menu_toggle'),
    path('branch/customers/', BranchCustomersView.as_view(), name='branch_customers'),
    path('branch/reports/', BranchReportsView.as_view(), name='branch_reports'),
    path('branch/settings/', BranchSettingsView.as_view(), name='branch_settings'),

    path('', include(router.urls)),
]
