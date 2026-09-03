"""
URL configuration for Cafe Manager backend.

API routes:
  /admin/          → Django admin panel
  /api/v1/         → REST API (menu, orders, notifications apps)
  /media/<path>    → User-uploaded files (DEBUG only)
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from accounts.views import (
    BranchManagerLoginView,
    OwnerPOSTerminalViewSet,
    AdminSignupView,
    AdminVerifySignupOTPView,
    ResendSignupOTPView,
)
from accounts.branch_views import BranchPOSTerminalViewSet

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/accounts/branch-manager/login/', BranchManagerLoginView.as_view(), name='root_branch_manager_login'),
    path('api/v1/accounts/branch-manager/login/', BranchManagerLoginView.as_view(), name='root_branch_manager_login_v1'),
    path('api/accounts/admin-signup/', AdminSignupView.as_view(), name='root_admin_signup'),
    path('api/v1/accounts/admin-signup/', AdminSignupView.as_view(), name='root_admin_signup_v1'),
    path('api/accounts/admin-verify-signup-otp/', AdminVerifySignupOTPView.as_view(), name='root_admin_verify_signup_otp'),
    path('api/v1/accounts/admin-verify-signup-otp/', AdminVerifySignupOTPView.as_view(), name='root_admin_verify_signup_otp_v1'),
    path('api/accounts/resend-signup-otp/', ResendSignupOTPView.as_view(), name='root_resend_signup_otp'),
    path('api/v1/accounts/resend-signup-otp/', ResendSignupOTPView.as_view(), name='root_resend_signup_otp_v1'),

    
    # Exact non-v1 routing support for POS Terminals:
    path('api/owner/pos/', OwnerPOSTerminalViewSet.as_view({'get': 'list', 'post': 'create'}), name='owner_pos_root_fallback'),
    path('api/owner/pos/<int:pk>/', OwnerPOSTerminalViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='owner_pos_detail_fallback'),
    path('api/owner/pos/<int:pk>/status/', OwnerPOSTerminalViewSet.as_view({'patch': 'set_status'}), name='owner_pos_status_fallback'),
    
    path('api/branch/pos/', BranchPOSTerminalViewSet.as_view({'get': 'list', 'post': 'create'}), name='branch_pos_root_fallback'),
    path('api/branch/pos/<int:pk>/', BranchPOSTerminalViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='branch_pos_detail_fallback'),
    path('api/branch/pos/<int:pk>/status/', BranchPOSTerminalViewSet.as_view({'patch': 'set_status'}), name='branch_pos_status_fallback'),
    path('api/branch/pos/<int:pk>/cashier/', BranchPOSTerminalViewSet.as_view({'patch': 'set_cashier'}), name='branch_pos_cashier_fallback'),

    path('api/v1/', include('accounts.urls')),
    path('api/v1/', include('menu.urls')),
    path('api/v1/', include('orders.urls')),
    path('api/v1/', include('notifications.urls')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
