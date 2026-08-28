import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { categoryApi, productApi, tableApi, qrCodeApi, orderApi, notificationApi, conversationApi, waiterRequestApi, authApi, branchManagerApi } from '../api'

const AppContext = createContext(null)

export const normalizeRole = (role) => {
  if (!role) return 'admin'
  const r = role.toLowerCase().trim()
  if (r === 'cashier' || r === 'pos' || r === 'cashier / pos' || r === 'cashier_pos') return 'cashier'
  if (r === 'branch_manager' || r === 'branch manager' || r === 'manager') return 'branch_manager'
  if (r === 'staff' || r === 'waiter') return 'waiter'
  if (r === 'owner' || r === 'admin') return 'admin'
  return r
}

export function AppProvider({ children }) {
  // ── API-backed state ─────────────────────────────────────────────────────
  const [products,       setProducts]      = useState([])
  const [categories,     setCategories]    = useState([])
  const [tables,         setTables]        = useState([])
  const [qrCodes,        setQRCodes]       = useState([])
  const [orders,         setOrders]        = useState([])
  const [notifications,  setNotifications] = useState([])
  const [conversations,  setConversations]  = useState([])
  const [unreadCount,    setUnreadCount]   = useState(0)
  const [waiterRequestsState, setWaiterRequests] = useState([])
  const [loading,        setLoading]       = useState({
    products: false, categories: false, tables: false, qrCodes: false, orders: false,
  })
  const [apiError, setApiError] = useState(null)
  const pollRef = useRef(null)

  // ── Auth Context State ──────────────────────────────────────────────────
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const u = localStorage.getItem('artisan_user')
      return u ? JSON.parse(u) : null
    } catch { return null }
  })
  const [authLoading, setAuthLoading] = useState(true)

  const [currentRole, setCurrentRoleRaw] = useState(() => {
    try { return normalizeRole(localStorage.getItem('artisan_role') || 'admin') } catch { return 'admin' }
  })
  const [currentWaiter, setCurrentWaiterRaw] = useState(() => {
    try {
      const s = localStorage.getItem('artisan_waiter')
      return s ? JSON.parse(s) : null
    } catch { return null }
  })

  // ── Branch Manager session state ────────────────────────────────────────
  const [currentBranchManager, setCurrentBranchManagerRaw] = useState(() => {
    try {
      const s = localStorage.getItem('artisan_bm')
      return s ? JSON.parse(s) : null
    } catch { return null }
  })
  const [currentBranch, setCurrentBranchRaw] = useState(() => {
    try {
      const s = localStorage.getItem('artisan_bm_branch')
      return s ? JSON.parse(s) : null
    } catch { return null }
  })

  // ── Cashier session state ────────────────────────────────────────────────
  const [currentCashier, setCurrentCashierRaw] = useState(() => {
    try {
      const s = localStorage.getItem('artisan_cashier')
      return s ? JSON.parse(s) : null
    } catch { return null }
  })

  // Derive waiterRequests from waiterRequestsState (actual backend WaiterRequests)
  const waiterRequests = useMemo(() => {
    return waiterRequestsState.map(wr => ({
      ...wr,
      id:             wr.id,
      type:           wr.request_type || 'Call Waiter',
      title:          `Table ${wr.table_name || wr.table_id || wr.table}`,
      message:        wr.message || `Customer requested assistance at table ${wr.table_name || wr.table_id || wr.table}`,
      tableId:        wr.table_name || (wr.table ? `T-${wr.table}` : '—'),
      tableFK:        wr.table,
      status:         wr.status || 'new',
      time:           wr.time || (wr.created_at ? new Date(wr.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''),
      assignedWaiter: wr.assigned_waiter || '',
      amount:         wr.amount,
      isWaiterRequest: true,
    }))
  }, [waiterRequestsState])


  const setCurrentRole = (role) => {
    const norm = normalizeRole(role)
    try { localStorage.setItem('artisan_role', norm) } catch {}
    setCurrentRoleRaw(norm)
  }
  const setCurrentWaiter = (waiter) => {
    try {
      if (waiter) localStorage.setItem('artisan_waiter', JSON.stringify(waiter))
      else localStorage.removeItem('artisan_waiter')
    } catch {}
    setCurrentWaiterRaw(waiter)
  }

  const setCurrentCashier = (cashier) => {
    try {
      if (cashier) localStorage.setItem('artisan_cashier', JSON.stringify(cashier))
      else localStorage.removeItem('artisan_cashier')
    } catch {}
    setCurrentCashierRaw(cashier)
  }

  const logout = useCallback(() => {
    localStorage.removeItem('artisan_access')
    localStorage.removeItem('artisan_refresh')
    localStorage.removeItem('artisan_user')
    localStorage.removeItem('artisan_role')
    localStorage.removeItem('artisan_waiter')
    localStorage.removeItem('artisan_bm')
    localStorage.removeItem('artisan_bm_branch')
    localStorage.removeItem('artisan_cashier')
    setCurrentUser(null)
    setCurrentRoleRaw('admin')
    setCurrentWaiterRaw(null)
    setCurrentBranchManagerRaw(null)
    setCurrentBranchRaw(null)
    setCurrentCashierRaw(null)
  }, [])

  const setCurrentBranchManager = (mgr) => {
    try {
      if (mgr) localStorage.setItem('artisan_bm', JSON.stringify(mgr))
      else localStorage.removeItem('artisan_bm')
    } catch {}
    setCurrentBranchManagerRaw(mgr)
  }

  const setCurrentBranch = (branch) => {
    try {
      if (branch) localStorage.setItem('artisan_bm_branch', JSON.stringify(branch))
      else localStorage.removeItem('artisan_bm_branch')
    } catch {}
    setCurrentBranchRaw(branch)
  }

  const loginBranchManager = async (managerId, pin) => {
    const res = await branchManagerApi.login({ manager_id: managerId, pin })
    localStorage.setItem('artisan_access', res.access)
    localStorage.setItem('artisan_refresh', res.refresh)
    localStorage.setItem('artisan_user', JSON.stringify(res.user))
    setCurrentUser(res.user)
    setCurrentRole('branch_manager')
    setCurrentBranchManager(res.manager)
    setCurrentBranch(res.branch)
    return res
  }

  const branchManagerLogout = useCallback(() => {
    localStorage.removeItem('artisan_access')
    localStorage.removeItem('artisan_refresh')
    localStorage.removeItem('artisan_user')
    localStorage.removeItem('artisan_role')
    localStorage.removeItem('artisan_bm')
    localStorage.removeItem('artisan_bm_branch')
    setCurrentUser(null)
    setCurrentRoleRaw('admin')
    setCurrentBranchManagerRaw(null)
    setCurrentBranchRaw(null)
  }, [])

  const refreshUser = useCallback(async () => {
    if (localStorage.getItem('artisan_access')) {
      try {
        const user = await authApi.me()
        setCurrentUser(user)
        setCurrentRole(user.role)
      } catch (err) {
        console.error("Failed to load user profile:", err)
        logout()
      }
    }
    setAuthLoading(false)
  }, [logout])

  useEffect(() => {
    refreshUser()
  }, [refreshUser])

  const login = async (email, password) => {
    const res = await authApi.login({ email, password })
    localStorage.setItem('artisan_access', res.access)
    localStorage.setItem('artisan_refresh', res.refresh)
    localStorage.setItem('artisan_user', JSON.stringify(res.user))
    setCurrentUser(res.user)
    setCurrentRole(res.user.role)
    return res.user
  }

  const loginWaiter = async (waiterId, pin) => {
    const res = await authApi.waiterLogin({ waiter_id: waiterId, pin })
    localStorage.setItem('artisan_access', res.access)
    localStorage.setItem('artisan_refresh', res.refresh)
    localStorage.setItem('artisan_user', JSON.stringify(res.user))
    setCurrentUser(res.user)
    setCurrentWaiter(res.waiter)
    setCurrentRole('waiter')
    return res.waiter
  }

  const loginEmployee = async (employeeId, pin) => {
    const res = await authApi.employeeLogin({ employee_id: employeeId, pin })
    localStorage.setItem('artisan_access', res.access)
    localStorage.setItem('artisan_refresh', res.refresh)
    localStorage.setItem('artisan_user', JSON.stringify(res.user))
    setCurrentUser(res.user)
    if (res.role === 'cashier') {
      setCurrentCashier(res.employee)
      setCurrentRole('cashier')
    } else {
      setCurrentWaiter(res.employee)
      setCurrentRole('waiter')
    }
    return res
  }

  const isAuthenticated = !!currentUser


  // ─────────────────────────────────────────────────────────────────────────
  // Fetch helpers
  // ─────────────────────────────────────────────────────────────────────────

  const fetchCategories = useCallback(async () => {
    setLoading((l) => ({ ...l, categories: true }))
    try {
      const data = await categoryApi.list({ ordering: 'display_order,name' })
      setCategories(Array.isArray(data) ? data : (data.results ?? []))
      setApiError(null)
    } catch (err) {
      console.error('fetchCategories error:', err)
      setApiError(err.message)
    } finally {
      setLoading((l) => ({ ...l, categories: false }))
    }
  }, [])

  const fetchProducts = useCallback(async () => {
    setLoading((l) => ({ ...l, products: true }))
    try {
      const data = await productApi.list({ ordering: 'display_order,name', page_size: 200 })
      const list = Array.isArray(data) ? data : (data.results ?? [])
      setProducts(list.map(normaliseProduct))
      setApiError(null)
    } catch (err) {
      console.error('fetchProducts error:', err)
      setApiError(err.message)
    } finally {
      setLoading((l) => ({ ...l, products: false }))
    }
  }, [])

  const fetchTables = useCallback(async () => {
    setLoading((l) => ({ ...l, tables: true }))
    try {
      const data = await tableApi.list({ ordering: 'name' })
      const list = Array.isArray(data) ? data : (data.results ?? [])
      setTables(list.map(normaliseTable))
      setApiError(null)
    } catch (err) {
      console.error('fetchTables error:', err)
      setApiError(err.message)
    } finally {
      setLoading((l) => ({ ...l, tables: false }))
    }
  }, [])

  const fetchQRCodes = useCallback(async () => {
    setLoading((l) => ({ ...l, qrCodes: true }))
    try {
      const data = await qrCodeApi.list({ ordering: 'table__name' })
      const list = Array.isArray(data) ? data : (data.results ?? [])
      setQRCodes(list.map(normaliseQR))
      setApiError(null)
    } catch (err) {
      console.error('fetchQRCodes error:', err)
      setApiError(err.message)
    } finally {
      setLoading((l) => ({ ...l, qrCodes: false }))
    }
  }, [])

  const fetchOrders = useCallback(async (params = {}) => {
    setLoading((l) => ({ ...l, orders: true }))
    try {
      const data = await orderApi.list({ ordering: '-created_at', page_size: 100, ...params })
      const list = Array.isArray(data) ? data : (data.results ?? [])
      setOrders(list.map(normaliseOrder))
      setApiError(null)
    } catch (err) {
      console.error('fetchOrders error:', err)
    } finally {
      setLoading((l) => ({ ...l, orders: false }))
    }
  }, [])

  const fetchNotifications = useCallback(async () => {
    try {
      const [list, countData] = await Promise.all([
        notificationApi.list(),
        notificationApi.unreadCount(),
      ])
      const items = Array.isArray(list) ? list : (list.results ?? [])
      setNotifications(items)
      setUnreadCount(countData.count ?? 0)
    } catch (err) {
      console.warn('fetchNotifications error:', err)
    }
  }, [])

  const fetchWaiterRequests = useCallback(async () => {
    try {
      const list = await waiterRequestApi.list()
      const items = Array.isArray(list) ? list : (list.results ?? [])
      setWaiterRequests(items.map(normaliseWaiterRequest))
    } catch (err) {
      console.warn('fetchWaiterRequests error:', err)
    }
  }, [])

  const fetchConversations = useCallback(async () => {
    try {
      const list = await conversationApi.list()
      const items = Array.isArray(list) ? list : (list.results ?? [])
      setConversations(items)
    } catch (err) {
      console.warn('fetchConversations error:', err)
    }
  }, [])

  const sendMessageToOwner = useCallback(async (data) => {
    const created = await conversationApi.create(data)
    await fetchConversations()
    await fetchNotifications()
    return created
  }, [fetchConversations, fetchNotifications])

  const replyToConversation = useCallback(async (id, messageText) => {
    const res = await conversationApi.reply(id, { message: messageText })
    await fetchConversations()
    await fetchNotifications()
    return res
  }, [fetchConversations, fetchNotifications])

  const markConversationSeen = useCallback(async (id) => {
    const res = await conversationApi.markSeen(id)
    await fetchConversations()
    return res
  }, [fetchConversations])

  // Load on mount + start notification, request, and conversation polling
  useEffect(() => {
    if (!isAuthenticated) {
      if (pollRef.current) clearInterval(pollRef.current)
      return
    }

    fetchCategories()
    fetchProducts()
    fetchTables()
    fetchQRCodes()
    fetchOrders()
    fetchNotifications()
    fetchWaiterRequests()
    fetchConversations()

    // Poll notifications, waiter requests, and conversations every 4 seconds
    pollRef.current = setInterval(() => {
      fetchNotifications()
      fetchWaiterRequests()
      fetchConversations()
    }, 4000)

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [isAuthenticated, fetchCategories, fetchProducts, fetchTables, fetchQRCodes, fetchOrders, fetchNotifications, fetchWaiterRequests, fetchConversations])


  // ─────────────────────────────────────────────────────────────────────────
  // Field normalisers (API → UI shape)
  // ─────────────────────────────────────────────────────────────────────────

  function normaliseProduct(p) {
    return {
      ...p,
      categoryLabel:  p.category_label  ?? (p.category_name ? p.category_name.toUpperCase() : ''),
      availableOnPOS: p.available_on_pos ?? true,
      availableOnQR:  p.available_on_qr  ?? true,
      dietaryTags:    p.dietary_tags     ?? [],
      displayOrder:   p.display_order    ?? 0,
      soldOut:        p.sold_out         ?? false,
      image:          p.image_url || p.image || null,
    }
  }

  function normaliseOrder(o) {
    return {
      ...o,
      // UI-expected field aliases
      orderId:      o.order_number,
      table:        o.table_label ?? '',
      waiter:       o.waiter_name ?? '',
      itemsSummary: o.items_summary ?? '',
      amount:       parseFloat(o.total ?? 0),
      time:         o.created_at ? new Date(o.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '',
      // Keep original status uppercase for status tab filtering
      status:       (o.status ?? 'pending').toUpperCase(),
    }
  }

  function normaliseTable(t) {
    return {
      ...t,
      // Keep both snake_case from API and camelCase aliases for UI compat
      label:          t.name,
      currentOrderId: t.current_order_ref || null,
      items:          [],          // order items aren't stored here yet
      seatedMinutes:  null,
      waitingMinutes: null,
      amount:         t.amount != null ? parseFloat(t.amount) : null,
      // QR link convenience fields
      qrCodeId:       t.qr_code_id   ?? null,
      qrImageUrl:     t.qr_image_url ?? null,
      qrStatus:       t.qr_status    ?? null,
    }
  }

  function normaliseQR(q) {
    return {
      ...q,
      // Map to UI field names used in QRCodesPage / QRPreviewPage
      name:          q.table_name  ?? '',
      qrId:          q.qr_id       ?? '',
      image:         q.image_url   ?? null,
      generatedDate: q.generated_at ? q.generated_at.split('T')[0] : '',
      scanCount:     q.scan_count  ?? 0,
      lastScanned:   q.last_scanned ?? null,
    }
  }

  function normaliseWaiterRequest(r) {
    return {
      ...r,
      orderId:     r.order_id ?? r.order ?? null,
      orderNumber: r.order_number ?? null,
      tableName:   r.table_name ?? null,
      tableId:     r.table_id ?? r.table ?? null,
      table:       r.table_name || r.table_id || (r.table ? `Table ${r.table}` : 'undefined'),
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Product CRUD
  // ─────────────────────────────────────────────────────────────────────────

  const addProduct = async (data) => {
    const payload  = buildProductPayload(data)
    const created  = await productApi.create(payload)
    const normalised = normaliseProduct(created)
    setProducts((prev) => [...prev, normalised])
    return normalised
  }

  const updateProduct = async (id, data) => {
    const payload  = buildProductPayload(data)
    const updated  = await productApi.patch(id, payload)
    const normalised = normaliseProduct(updated)
    setProducts((prev) => prev.map((p) => (p.id === id ? normalised : p)))
    return normalised
  }

  const deleteProduct = async (id) => {
    await productApi.delete(id)
    setProducts((prev) => prev.filter((p) => p.id !== id))
  }

  const deactivateProduct = async (id) => {
    const updated = await productApi.setAvailability(id, { available: false, sold_out: true })
    const normalised = normaliseProduct(updated)
    setProducts((prev) => prev.map((p) => (p.id === id ? normalised : p)))
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Category CRUD
  // ─────────────────────────────────────────────────────────────────────────

  const addCategory = async (data) => {
    const payload = {
      name:          data.name,
      icon:          data.icon || 'default',
      display_order: data.order ?? data.display_order ?? categories.length + 1,
      active:        data.active ?? true,
    }
    const created = await categoryApi.create(payload)
    setCategories((prev) => [...prev, normaliseCategory(created)])
    return created
  }

  const updateCategory = async (id, data) => {
    const existing = categories.find((c) => c.id === id)
    const payload  = {
      name:          data.name          ?? existing?.name,
      icon:          data.icon          ?? existing?.icon ?? 'default',
      display_order: data.display_order ?? existing?.display_order ?? 0,
      active:        data.active        ?? existing?.active ?? true,
    }
    const updated  = await categoryApi.patch(id, payload)
    const normalised = normaliseCategory(updated)
    setCategories((prev) => prev.map((c) => (c.id === id ? normalised : c)))
    return normalised
  }

  const toggleCategory = async (id) => {
    const cat = categories.find((c) => c.id === id)
    if (!cat) return
    const updated  = await categoryApi.patch(id, { active: !cat.active })
    const normalised = normaliseCategory(updated)
    setCategories((prev) => prev.map((c) => (c.id === id ? normalised : c)))
  }

  const reorderCategories = async (newList) => {
    const reordered = newList.map((c, i) => ({ ...c, order: i + 1, display_order: i + 1 }))
    setCategories(reordered) // optimistic
    await Promise.all(reordered.map((c) => categoryApi.patch(c.id, { display_order: c.display_order })))
  }

  function normaliseCategory(c) {
    return {
      ...c,
      order:     c.display_order ?? c.order ?? 0,
      itemCount: c.item_count    ?? 0,
    }
  }

  function buildProductPayload(data) {
    if (data instanceof FormData) return data
    const payload = {}
    if (data.name          !== undefined) payload.name              = data.name
    if (data.category      !== undefined) payload.category          = data.category
    if (data.categoryId    !== undefined) payload.category          = data.categoryId
    if (data.price         !== undefined) payload.price             = Number(data.price)
    if (data.tax           !== undefined) payload.tax               = Number(data.tax || 0)
    if (data.description   !== undefined) payload.description       = data.description
    if (data.available     !== undefined) payload.available         = data.available
    if (data.sold_out      !== undefined) payload.sold_out          = data.sold_out
    if (data.soldOut       !== undefined) payload.sold_out          = data.soldOut
    if (data.popular       !== undefined) payload.popular           = data.popular
    if (data.featured      !== undefined) payload.featured          = data.featured
    if (data.dietaryTags   !== undefined) payload.dietary_tags      = data.dietaryTags
    if (data.dietary_tags  !== undefined) payload.dietary_tags      = data.dietary_tags
    if (data.displayOrder  !== undefined) payload.display_order     = data.displayOrder
    if (data.display_order !== undefined) payload.display_order     = data.display_order
    if (data.availableOnPOS !== undefined) payload.available_on_pos = data.availableOnPOS
    if (data.availableOnQR  !== undefined) payload.available_on_qr  = data.availableOnQR
    return payload
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Table CRUD (API-backed)
  // ─────────────────────────────────────────────────────────────────────────

  const addTable = async (data) => {
    const payload = {
      name:   (data.id || data.name || '').trim(),
      seats:  Number(data.seats) || 4,
      status: 'available',
      active: true,
    }
    const created = await tableApi.create(payload)
    const normalised = normaliseTable(created)
    setTables((prev) => [...prev, normalised])
    // Refresh QR codes so the new one shows up
    await fetchQRCodes()
    return normalised
  }

  const updateTable = async (id, data) => {
    // Allow optimistic status changes without hitting API (for UI-only updates)
    if (data._localOnly) {
      setTables((prev) => prev.map((t) => (t.id === id ? { ...t, ...data } : t)))
      return
    }
    const payload = {}
    if (data.status !== undefined)            payload.status             = data.status
    if (data.active !== undefined)            payload.active             = data.active
    if (data.seats  !== undefined)            payload.seats              = Number(data.seats)
    if (data.name   !== undefined)            payload.name               = data.name
    if (data.current_order_ref !== undefined) payload.current_order_ref  = data.current_order_ref
    if (data.currentOrderId    !== undefined) payload.current_order_ref  = data.currentOrderId || ''
    if (data.amount !== undefined)            payload.amount             = data.amount

    const updated  = await tableApi.patch(id, payload)
    const normalised = normaliseTable(updated)
    setTables((prev) => prev.map((t) => (t.id === id ? normalised : t)))
    return normalised
  }

  const deleteTable = async (id) => {
    await tableApi.delete(id)
    setTables((prev) => prev.filter((t) => t.id !== id))
    // Refresh QR codes (its QR was cascade-deleted)
    await fetchQRCodes()
  }

  const setTableStatus = async (id, newStatus) => {
    const updated  = await tableApi.setStatus(id, { status: newStatus })
    const normalised = normaliseTable(updated)
    setTables((prev) => prev.map((t) => (t.id === id ? normalised : t)))
    return normalised
  }

  const setTableActive = async (id, active) => {
    const updated  = await tableApi.setActive(id, { active })
    const normalised = normaliseTable(updated)
    setTables((prev) => prev.map((t) => (t.id === id ? normalised : t)))
    // Refresh QR codes — their status mirrors the table active state
    await fetchQRCodes()
    return normalised
  }

  // ─────────────────────────────────────────────────────────────────────────
  // QR Code actions (API-backed)
  // ─────────────────────────────────────────────────────────────────────────

  const getQR = (id) => qrCodes.find((q) => q.id === id || String(q.id) === String(id))

  const regenerateQR = async (id) => {
    const updated  = await qrCodeApi.regenerate(id)
    const normalised = normaliseQR(updated)
    setQRCodes((prev) => prev.map((q) => (q.id === id ? normalised : q)))
    return normalised
  }

  const updateQRStatus = async (id, newStatus) => {
    const updated  = await qrCodeApi.setStatus(id, { status: newStatus })
    const normalised = normaliseQR(updated)
    setQRCodes((prev) => prev.map((q) => (q.id === id ? normalised : q)))
    return normalised
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Order CRUD (API-backed)
  // ─────────────────────────────────────────────────────────────────────────

  const createOrder = async (data) => {
    const created = await orderApi.create(data)
    const normalised = normaliseOrder(created)
    setOrders((prev) => [normalised, ...prev])
    // Refresh tables so the occupied status appears immediately in the floor plan
    await fetchTables()
    // Refresh notifications so new-order notification appears
    await fetchNotifications()
    return normalised
  }


  const updateOrderStatus = async (id, newStatus) => {
    try {
      const updated = await orderApi.setStatus(id, { status: newStatus.toLowerCase() })
      const normalised = normaliseOrder(updated)
      setOrders((prev) => prev.map((o) => (o.id === id ? normalised : o)))
      await fetchNotifications()
      return normalised
    } catch (err) {
      // Fallback: optimistic local update
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: newStatus } : o)))
    }
  }

  const getOrder = (id) => orders.find((o) => o.id === id || String(o.id) === String(id))

  /**
   * completeOrder — POST /orders/{id}/complete_order/
   * Atomically marks order completed, marks invoice paid, creates payment,
   * and releases the table (backend sets Table.status='available').
   * Then immediately re-fetches tables + orders + notifications so the
   * floor plan card updates without requiring a page refresh.
   */
  const completeOrder = async (orderId, data) => {
    const result = await orderApi.completeOrder(orderId, data)
    // Update order in local state immediately
    const normalisedOrder = normaliseOrder(result.order || {})
    if (normalisedOrder.id) {
      setOrders((prev) => prev.map((o) => (o.id === normalisedOrder.id ? normalisedOrder : o)))
    }
    // Re-fetch tables so occupied→available is reflected immediately on floor plan
    await fetchTables()
    // Re-fetch orders so list page reflects COMPLETED status
    await fetchOrders()
    // Re-fetch notifications
    await fetchNotifications()
    return result
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Notification actions
  // ─────────────────────────────────────────────────────────────────────────

  const markNotificationRead = async (id) => {
    try {
      const updated = await notificationApi.markRead(id)
      setNotifications((prev) => prev.map((n) => (n.id === id ? updated : n)))
      const countData = await notificationApi.unreadCount()
      setUnreadCount(countData.count ?? 0)
      return updated
    } catch (err) {
      console.error('markNotificationRead error:', err)
    }
  }

  const markAllNotificationsRead = async () => {
    try {
      await notificationApi.markAllRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, status: 'dismissed', is_read: true })))
      setUnreadCount(0)
    } catch (err) {
      console.error('markAllNotificationsRead error:', err)
    }
  }

  const updateNotificationStatus = async (id, status) => {
    const updated = await notificationApi.patch(id, { status })
    setNotifications((prev) => prev.map((n) => (n.id === id ? updated : n)))
    const countData = await notificationApi.unreadCount()
    setUnreadCount(countData.count ?? 0)
    return updated
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Waiter request helpers
  // ─────────────────────────────────────────────────────────────────────────
  const createWaiterRequest = async (data) => {
    const created = await waiterRequestApi.create(data)
    setWaiterRequests((prev) => [created, ...prev])
    await fetchNotifications()
    await fetchWaiterRequests()
    return created
  }

  const attendWaiterRequest = async (id, waiterName) => {
    const result = await waiterRequestApi.attend(id, { assigned_waiter: waiterName })
    await fetchNotifications()
    await fetchWaiterRequests()
    return result
  }

  const updateRequestStatus = async (id, status) => {
    try {
      if (status === 'in_progress') {
        const activeWaiterName = currentWaiter?.name || currentUser?.username || 'Staff'
        await waiterRequestApi.attend(id, { assigned_waiter: activeWaiterName })
      } else {
        await waiterRequestApi.setStatus(id, { status })
      }
      await fetchWaiterRequests()
      await fetchNotifications()
    } catch (err) {
      console.warn('updateRequestStatus error:', err)
    }
  }
  const dismissRequest = async (id) => {
    try {
      await waiterRequestApi.setStatus(id, { status: 'dismissed' })
      await fetchWaiterRequests()
      await fetchNotifications()
    } catch (err) {
      console.warn('dismissRequest error:', err)
    }
  }

  return (
    <AppContext.Provider
      value={{
        // data
        products,
        categories,
        tables,
        qrCodes,
        orders,
        notifications,
        unreadCount,
        loading,
        apiError,
        currentUser,
        isAuthenticated,
        authLoading,
        login,
        loginWaiter,
        loginEmployee,
        logout,
        refreshUser,
        currentRole,            setCurrentRole,
        currentWaiter,          setCurrentWaiter,
        // Cashier auth
        currentCashier,         setCurrentCashier,
        // Branch Manager auth
        currentBranchManager,   setCurrentBranchManager,
        currentBranch,          setCurrentBranch,
        loginBranchManager,
        branchManagerLogout,
        waiterRequests:    waiterRequests,    setWaiterRequests,
        fetchWaiterRequests,
        createWaiterRequest,
        attendWaiterRequest,

        updateRequestStatus,
        dismissRequest,
        updateNotificationStatus,
        // product actions
        addProduct,
        updateProduct,
        deleteProduct,
        deactivateProduct,
        fetchProducts,
        // category actions
        addCategory,
        updateCategory,
        toggleCategory,
        reorderCategories,
        fetchCategories,
        // table actions
        addTable,
        updateTable,
        deleteTable,
        setTableStatus,
        setTableActive,
        fetchTables,
        // qr actions
        getQR,
        regenerateQR,
        updateQRStatus,
        fetchQRCodes,
        // order actions
        createOrder,
        updateOrderStatus,
        completeOrder,
        getOrder,
        fetchOrders,
        // notification actions
        fetchNotifications,
        markNotificationRead,
        markAllNotificationsRead,
        // conversation & manager-owner messaging
        conversations,
        fetchConversations,
        sendMessageToOwner,
        replyToConversation,
        markConversationSeen,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
