export function getDashboardRoute(role) {
  if (!role) return '/dashboard'
  const r = role.toLowerCase().trim()
  if (r === 'cashier' || r === 'pos') {
    return '/cashier/dashboard'
  }
  if (r === 'branch_manager' || r === 'branch manager' || r === 'manager') {
    return '/branch/dashboard'
  }
  if (r === 'owner' || r === 'admin') {
    return '/owner/dashboard'
  }
  // Waiter or anyone else goes to the generic /dashboard
  return '/dashboard'
}

export function getSettingsRoute(role) {
  if (!role) return '/settings/profile'
  const r = role.toLowerCase().trim()
  if (r === 'cashier' || r === 'pos') {
    return '/cashier/settings/profile'
  }
  if (r === 'branch_manager' || r === 'branch manager' || r === 'manager') {
    return '/branch/settings'
  }
  if (r === 'owner' || r === 'admin') {
    return '/owner/settings'
  }
  if (r === 'waiter' || r === 'staff') {
    return '/waiter/settings/profile'
  }
  return '/settings/profile'
}
