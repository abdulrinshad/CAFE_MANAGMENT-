from accounts.models import Branch, Waiter

def get_waiter_branch(request):
    """
    Resolves the assigned Branch for the currently authenticated waiter or user.
    Enforces backend branch isolation.
    """
    user = getattr(request, 'user', None)

    if user and user.is_authenticated:
        # Check if user is a shadow user created for waiter login (e.g. username="waiter_5")
        if user.username and user.username.startswith('waiter_'):
            try:
                waiter_id = int(user.username.split('_')[1])
                waiter = Waiter.objects.select_related('branch').filter(pk=waiter_id).first()
                if waiter and waiter.branch:
                    return waiter.branch
            except (IndexError, ValueError):
                pass

        # Check UserProfile branch if available
        profile = getattr(user, 'profile', None)
        if profile and profile.branch:
            return profile.branch

    # Return primary/default branch
    default_branch = Branch.objects.filter(active=True).first()
    if not default_branch:
        default_branch, _ = Branch.objects.get_or_create(code='MAIN', defaults={'name': 'Main Branch'})
    return default_branch
