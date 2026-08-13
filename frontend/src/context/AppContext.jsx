import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { categoryApi, productApi, tableApi, qrCodeApi, orderApi, notificationApi, requestApi } from '../api'


const AppContext = createContext(null)

export function AppProvider({ children }) {
  // ── API-backed state ─────────────────────────────────────────────────────
  const [products,       setProducts]      = useState([])
  const [categories,     setCategories]    = useState([])
  const [tables,         setTables]        = useState([])
  const [qrCodes,        setQRCodes]       = useState([])
  const [orders,         setOrders]        = useState([])
  const [notifications,  setNotifications] = useState([])
  const [unreadCount,    setUnreadCount]   = useState(0)
  const [loading,        setLoading]       = useState({
    products: false, categories: false, tables: false, qrCodes: false, orders: false,
  })
  const [apiError, setApiError] = useState(null)
  const pollRef = useRef(null)

  // ── Waiter / Role Context State ──────────────────────────────────────────
  const [currentRole,    setCurrentRole]    = useState('admin')
  const [currentWaiter,  setCurrentWaiter]  = useState(null)
  const [waiterRequests, setWaiterRequests] = useState([])

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
      // Silent — don't show error banner for notification polling failures
      console.warn('fetchNotifications error:', err)
    }
  }, [])

  const fetchWaiterRequests = useCallback(async () => {
    try {
      const data = await requestApi.list()
      const list = Array.isArray(data) ? data : (data.results ?? [])
      setWaiterRequests(list.map(normaliseRequest))
    } catch (err) {
      console.warn('fetchWaiterRequests error:', err)
    }
  }, [])

  // Load on mount + start notification and requests polling
  useEffect(() => {
    fetchCategories()
    fetchProducts()
    fetchTables()
    fetchQRCodes()
    fetchOrders()
    fetchNotifications()
    fetchWaiterRequests()

    // Poll unread notifications and waiter requests every 10 seconds for real-time responsiveness
    pollRef.current = setInterval(() => {
      fetchNotifications()
      fetchWaiterRequests()
      fetchTables()
      fetchOrders()
    }, 10000)

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [fetchCategories, fetchProducts, fetchTables, fetchQRCodes, fetchOrders, fetchNotifications, fetchWaiterRequests])

  function normaliseRequest(r) {
    return {
      ...r,
      tableId: r.table_id || (r.table_name ? (r.table_name.startsWith('T-') ? r.table_name : `T-${r.table_name}`) : ''),
      type: r.request_type || r.type || 'Call Waiter',
      time: r.time || (r.created_at ? new Date(r.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''),
      status: r.status || 'new',
    }
  }


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
    await fetchTables()
    await fetchNotifications()
    return normalised
  }

  const updateOrderStatus = async (id, newStatus) => {
    try {
      const updated = await orderApi.setStatus(id, { status: newStatus.toLowerCase() })
      const normalised = normaliseOrder(updated)
      setOrders((prev) => prev.map((o) => (o.id === id ? normalised : o)))
      await fetchTables()
      await fetchNotifications()
      return normalised
    } catch (err) {
      // Fallback: optimistic local update
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: newStatus } : o)))
    }
  }

  const getOrder = (id) => orders.find((o) => o.id === id || String(o.id) === String(id))

  // ─────────────────────────────────────────────────────────────────────────
  // Notification actions
  // ─────────────────────────────────────────────────────────────────────────

  const markNotificationRead = async (id) => {
    try {
      const updated = await notificationApi.markRead(id)
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
      setUnreadCount((c) => Math.max(0, c - 1))
      return updated
    } catch (err) {
      console.error('markNotificationRead error:', err)
    }
  }

  const markAllNotificationsRead = async () => {
    try {
      await notificationApi.markAllRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch (err) {
      console.error('markAllNotificationsRead error:', err)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Waiter request helpers (API-backed)
  // ─────────────────────────────────────────────────────────────────────────

  const createWaiterRequest = async (data) => {
    const created = await requestApi.create(data)
    await fetchWaiterRequests()
    await fetchNotifications()
    return created
  }

  const updateRequestStatus = async (id, status) => {
    try {
      const updated = await requestApi.setStatus(id, { status })
      setWaiterRequests((prev) => prev.map((r) => (r.id === id ? normaliseRequest(updated) : r)))
      await fetchNotifications()
    } catch (err) {
      console.error('updateRequestStatus error:', err)
    }
  }

  const dismissRequest = async (id) => {
    try {
      await requestApi.patch(id, { status: 'dismissed' })
      setWaiterRequests((prev) => prev.filter((r) => r.id !== id))
      await fetchNotifications()
    } catch (err) {
      console.error('dismissRequest error:', err)
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
        currentRole,       setCurrentRole,
        currentWaiter,     setCurrentWaiter,
        waiterRequests,    setWaiterRequests,
        createWaiterRequest,
        updateRequestStatus,
        dismissRequest,
        fetchWaiterRequests,

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
        getOrder,
        fetchOrders,
        // notification actions
        fetchNotifications,
        markNotificationRead,
        markAllNotificationsRead,
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

// ─────────────────────────────────────────────────────────────────────────────
// Normalisation helpers
// ─────────────────────────────────────────────────────────────────────────────

function normaliseProduct(p) {
  if (!p) return null
  return {
    ...p,
    id: p.id,
    name: p.name || '',
    price: Number(p.price || 0),
    tax: Number(p.tax || 0),
    category: p.category || null,
    categoryName: p.category_name || '',
    categoryLabel: p.category_label || p.category_name || '',
    image: p.image || p.image_url || null,
    available: p.available ?? true,
    soldOut: p.sold_out ?? false,
    availableOnPOS: p.available_on_pos ?? true,
    availableOnQR: p.available_on_qr ?? true,
    popular: p.popular ?? false,
    featured: p.featured ?? false,
    dietaryTags: p.dietary_tags || [],
  }
}

function normaliseTable(t) {
  if (!t) return null
  return {
    ...t,
    id: t.id,
    name: t.name || `T-${t.id}`,
    label: t.name || `Table ${t.id}`,
    seats: t.seats || 4,
    status: t.status || 'available',
    active: t.active ?? true,
    currentOrderId: t.current_order_id || null,
    currentOrderRef: t.current_order_ref || '',
    amount: t.amount ? Number(t.amount) : null,
  }
}

function normaliseOrder(o) {
  if (!o) return null
  return {
    ...o,
    id: o.id,
    orderId: o.order_number || `ORD-${o.id}`,
    orderNumber: o.order_number || `ORD-${o.id}`,
    table: o.table_label || (o.table ? `Table ${o.table}` : 'Takeaway'),
    tableId: o.table,
    tableLabel: o.table_label || (o.table ? `Table ${o.table}` : 'Takeaway'),
    waiter: o.waiter_name || 'Staff',
    waiterName: o.waiter_name || 'Staff',
    customer: o.customer_name || 'Dine-in Guest',
    customerName: o.customer_name || 'Dine-in Guest',
    itemsSummary: o.items_summary || '',
    notes: o.notes || '',
    amount: Number(o.total || 0),
    subtotal: Number(o.subtotal || 0),
    tax: Number(o.tax_amount || 0),
    total: Number(o.total || 0),
    status: (o.status || 'pending').toUpperCase(),
    time: o.created_at
      ? new Date(o.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
      : '',
    items: (o.items || []).map((item) => ({
      id: item.id,
      productId: item.product,
      name: item.product_name || 'Item',
      unitPrice: Number(item.unit_price || 0),
      qty: item.quantity,
      total: Number(item.subtotal || 0),
      image: item.product_image || null,
    })),
  }
}

function normaliseQR(q) {
  if (!q) return null
  return {
    ...q,
    id: q.id,
    qrId: q.qr_id || '',
    menuUrl: q.menu_url || '',
    imageUrl: q.image_url || q.image || null,
    status: q.status || 'active',
  }
}

function normaliseRequest(r) {
  if (!r) return null
  return {
    ...r,
    id: r.id,
    tableId: r.table ? `T-${r.table}` : 'T-1',
    table_name: r.table_name || (r.table ? `Table ${r.table}` : ''),
    type: r.request_type || 'Call Waiter',
    message: r.message || '',
    status: r.status || 'new',
    assignedWaiter: r.assigned_waiter || '',
    amount: r.amount ? Number(r.amount) : null,
    time: r.created_at
      ? new Date(r.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
      : 'Just now',
  }
}

