from accounts.models import Branch, Waiter, Tenant

def get_user_tenant(request):
    """
    Resolves the assigned Tenant for the currently authenticated user.
    """
    user = getattr(request, 'user', None)

    if user and user.is_authenticated:
        # Admin User directly linked to a Tenant
        if hasattr(user, 'tenant'):
            return user.tenant
            
        # Admin User via UserProfile
        if hasattr(user, 'profile') and user.profile.tenant:
            return user.profile.tenant

        # Shadow users
        if user.username and user.username.startswith('waiter_'):
            try:
                waiter_id = int(user.username.split('_')[1])
                waiter = Waiter.objects.select_related('tenant').filter(pk=waiter_id).first()
                if waiter and waiter.tenant:
                    return waiter.tenant
            except (IndexError, ValueError):
                pass

        if user.username and user.username.startswith('cashier_'):
            try:
                from accounts.models import Cashier
                cashier_id = int(user.username.split('_')[1])
                cashier = Cashier.objects.select_related('tenant').filter(pk=cashier_id).first()
                if cashier and cashier.tenant:
                    return cashier.tenant
            except (IndexError, ValueError):
                pass

        if user.username and user.username.startswith('bm_'):
            try:
                from accounts.models import BranchManager
                bm_id = int(user.username.split('_')[1])
                bm = BranchManager.objects.select_related('tenant').filter(pk=bm_id).first()
                if bm and bm.tenant:
                    return bm.tenant
            except (IndexError, ValueError):
                pass

    return None

def get_user_branch(request):
    """
    Resolves the assigned Branch for the currently authenticated waiter, cashier, or branch manager.
    """
    user = getattr(request, 'user', None)

    if user and user.is_authenticated:
        # Waiter shadow users have username="waiter_{id}"
        if user.username and user.username.startswith('waiter_'):
            try:
                waiter_id = int(user.username.split('_')[1])
                waiter = Waiter.objects.select_related('branch').filter(pk=waiter_id).first()
                if waiter and waiter.branch:
                    return waiter.branch
            except (IndexError, ValueError):
                pass

        # Cashier shadow users have username="cashier_{id}"
        if user.username and user.username.startswith('cashier_'):
            try:
                from accounts.models import Cashier
                cashier_id = int(user.username.split('_')[1])
                cashier = Cashier.objects.select_related('branch').filter(pk=cashier_id).first()
                if cashier and cashier.branch:
                    return cashier.branch
            except (IndexError, ValueError):
                pass

        # Branch Manager shadow users have username="bm_{id}"
        if user.username and user.username.startswith('bm_'):
            try:
                from accounts.models import BranchManager
                bm_id = int(user.username.split('_')[1])
                bm = BranchManager.objects.select_related('branch').filter(pk=bm_id).first()
                if bm and bm.branch:
                    return bm.branch
            except (IndexError, ValueError):
                pass

    # For all other authenticated users (Admin), return None
    return None

# Alias used by cashier-specific views
get_employee_branch = get_user_branch
get_waiter_branch = get_user_branch

from rest_framework.exceptions import ValidationError

class TenantEnforceMixin:
    """
    Mixin to strictly require and enforce tenant isolation.
    """
    def get_queryset(self):
        qs = super().get_queryset()
        tenant = get_user_tenant(self.request)
        if tenant:
            qs = qs.filter(tenant=tenant)
        return qs
        
    def perform_create(self, serializer):
        tenant = get_user_tenant(self.request)
        if tenant:
            serializer.save(tenant=tenant)
        else:
            raise ValidationError({"tenant": "Valid tenant assignment is required."})

class BranchEnforceMixin(TenantEnforceMixin):
    """
    Mixin to strictly require and enforce branch assignments on creation.
    Inherits TenantEnforceMixin to also enforce tenant isolation on queries and creation.
    """
    def perform_create(self, serializer):
        tenant = get_user_tenant(self.request)
        if not tenant:
            raise ValidationError({"tenant": "Valid tenant assignment is required."})

        assigned_branch = get_user_branch(self.request)
        if assigned_branch:
            serializer.save(branch=assigned_branch, tenant=tenant)
        else:
            branch_id = self.request.data.get('branch') or self.request.data.get('branchId') or self.request.query_params.get('branch')
            if not branch_id or str(branch_id).lower() == 'all':
                raise ValidationError({"branch": "Branch assignment is required."})
            
            # Additional validation: the assigned branch MUST belong to the user's tenant
            from accounts.models import Branch
            try:
                branch = Branch.objects.get(pk=branch_id, tenant=tenant)
                serializer.save(branch=branch, tenant=tenant)
            except Branch.DoesNotExist:
                raise ValidationError({"branch": "Invalid branch for your business."})
