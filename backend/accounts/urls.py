from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework.routers import DefaultRouter
from .views import (
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
)

router = DefaultRouter()
router.register(r'waiters', WaiterViewSet, basename='waiters')
router.register(r'cashiers', CashierViewSet, basename='cashiers')
router.register(r'branches', BranchViewSet, basename='branches')
router.register(r'branch-managers', BranchManagerViewSet, basename='branch-managers')

urlpatterns = [
    path('auth/login/', CustomTokenObtainPairView.as_view(), name='auth_login'),
    path('auth/logout/', LogoutView.as_view(), name='auth_logout'),
    path('auth/me/', CurrentUserView.as_view(), name='auth_me'),
    path('auth/change-password/', ChangePasswordView.as_view(), name='auth_change_password'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='auth_token_refresh'),
    path('auth/waiters/', ActiveWaiterListView.as_view(), name='auth_waiters'),
    path('auth/waiter-login/', WaiterLoginView.as_view(), name='auth_waiter_login'),
    path('auth/employee-login/', EmployeeLoginView.as_view(), name='auth_employee_login'),
    path('auth/branch-manager-login/', BranchManagerLoginView.as_view(), name='auth_branch_manager_login'),
    path('', include(router.urls)),
]
