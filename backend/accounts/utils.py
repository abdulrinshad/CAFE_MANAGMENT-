from accounts.models import Branch, Waiter


def get_waiter_branch(request):
    """
    Resolves the assigned Branch for the currently authenticated waiter.

    Returns:
      - A Branch instance if the request comes from a waiter shadow user
        (username starts with 'waiter_').
      - None for Admin / Manager / Staff users — so no branch filter is applied
        and they see ALL tables and products across every branch.

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

    # For all other authenticated users (Admin, Manager, Staff without waiter
    # shadow username), return None — no branch filter will be applied.
    return None
