from rest_framework.permissions import BasePermission

class IsAdmin(BasePermission):
    """
    Allows access to Admin users (including superusers).
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.is_superuser or request.user.is_staff:
            return True
        return hasattr(request.user, 'profile') and request.user.profile.role == 'ADMIN'

class IsManager(BasePermission):
    """
    Allows access to Manager users.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        return hasattr(request.user, 'profile') and request.user.profile.role == 'MANAGER'

class IsStaff(BasePermission):
    """
    Allows access to Staff/Waiter users.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        return hasattr(request.user, 'profile') and request.user.profile.role == 'STAFF'

class IsCashier(BasePermission):
    """
    Allows access to Cashier users only.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        return hasattr(request.user, 'profile') and request.user.profile.role == 'CASHIER'

class IsAdminOrManager(BasePermission):
    """
    Allows access to Admin and Manager users (including superusers and staff admins).
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.is_superuser or request.user.is_staff:
            return True
        if not hasattr(request.user, 'profile'):
            return False
        return request.user.profile.role in ['ADMIN', 'MANAGER']

class IsAdminOrManagerOrStaff(BasePermission):
    """
    Allows access to Admin, Manager, and Staff users.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.is_superuser or request.user.is_staff:
            return True
        if not hasattr(request.user, 'profile'):
            return False
        return request.user.profile.role in ['ADMIN', 'MANAGER', 'STAFF']

class IsAdminOrManagerOrCashier(BasePermission):
    """
    Allows access to Admin, Manager, and Cashier users.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.is_superuser or request.user.is_staff:
            return True
        if not hasattr(request.user, 'profile'):
            return False
        return request.user.profile.role in ['ADMIN', 'MANAGER', 'CASHIER']

class IsEmployeeOrAbove(BasePermission):
    """
    Allows access to Admin, Manager, Waiter (Staff), and Cashier users (including shadow accounts).
    """
    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if user.is_superuser or user.is_staff:
            return True
        if user.username and (user.username.startswith('waiter_') or user.username.startswith('cashier_')):
            return True
        if hasattr(user, 'profile') and user.profile.role in ['ADMIN', 'MANAGER', 'STAFF', 'CASHIER']:
            return True
        return False
