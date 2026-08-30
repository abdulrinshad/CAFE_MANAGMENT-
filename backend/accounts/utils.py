from accounts.models import Branch, Waiter


def get_user_branch(request):
    """
    Resolves the assigned Branch for the currently authenticated waiter, cashier, or branch manager.

    Returns:
      - A Branch instance if the request comes from a waiter shadow user
        (username starts with 'waiter_'), cashier shadow user ('cashier_'),
        or a branch manager shadow user ('bm_').
      - None for Admin users — so no branch filter is applied.

    This intentionally does NOT fall back to a default branch for non-waiter
    users, because doing so would incorrectly exclude records that have
    branch=None (created before branch logic was introduced).
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

class BranchEnforceMixin:
    """
    Mixin to strictly require and enforce branch assignments on creation.
    - If the user is a manager/waiter/cashier, it forces their own branch.
    - If the user is an admin, it requires a valid branch in the request data/params.
    """
    def perform_create(self, serializer):
        assigned_branch = get_user_branch(self.request)
        if assigned_branch:
            serializer.save(branch=assigned_branch)
        else:
            branch_id = self.request.data.get('branch') or self.request.query_params.get('branch')
            if not branch_id or str(branch_id).lower() == 'all':
                raise ValidationError({"branch": "Branch assignment is required."})
            serializer.save(branch_id=branch_id)
