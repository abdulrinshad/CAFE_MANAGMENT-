from rest_framework.permissions import BasePermission

class IsAdmin(BasePermission):
    """
    Allows access only to Admin users.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            hasattr(request.user, 'profile') and
            request.user.profile.role == 'ADMIN'
        )

class IsManager(BasePermission):
    """
    Allows access only to Manager users.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            hasattr(request.user, 'profile') and
            request.user.profile.role == 'MANAGER'
        )

class IsStaff(BasePermission):
    """
    Allows access only to Staff/Waiter users.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            hasattr(request.user, 'profile') and
            request.user.profile.role == 'STAFF'
        )

class IsAdminOrManager(BasePermission):
    """
    Allows access to Admin and Manager users.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
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
        if not hasattr(request.user, 'profile'):
            return False
        return request.user.profile.role in ['ADMIN', 'MANAGER', 'STAFF']
