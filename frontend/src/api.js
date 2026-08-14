/**
 * api.js — Centralized API client for Cafe Manager.
 *
 * All requests go through the Vite proxy → Django backend at /api/v1/.
 * No base URL hardcoding needed; the proxy handles routing.
 */

const BASE = '/api/v1'

// ── Generic fetch helper ──────────────────────────────────────────────────────

async function request(method, path, body = null, isFormData = false, isRetry = false) {
  const headers = {}
  if (body && !isFormData) {
    headers['Content-Type'] = 'application/json'
  }

  const token = localStorage.getItem('artisan_access')
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const opts = {
    method,
    headers,
  }

  if (body) {
    opts.body = isFormData ? body : JSON.stringify(body)
  }

  const res = await fetch(`${BASE}${path}`, opts)

  if (res.status === 401 && !isRetry && !path.includes('/auth/login/')) {
    const refresh = localStorage.getItem('artisan_refresh')
    if (refresh) {
      try {
        const refreshRes = await fetch(`${BASE}/auth/token/refresh/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ refresh })
        })
        if (refreshRes.ok) {
          const refreshData = await refreshRes.json()
          localStorage.setItem('artisan_access', refreshData.access)
          if (refreshData.refresh) {
            localStorage.setItem('artisan_refresh', refreshData.refresh)
          }
          return request(method, path, body, isFormData, true)
        } else {
          localStorage.removeItem('artisan_access')
          localStorage.removeItem('artisan_refresh')
          localStorage.removeItem('artisan_user')
          window.location.href = '/login'
        }
      } catch (e) {
        localStorage.removeItem('artisan_access')
        localStorage.removeItem('artisan_refresh')
        localStorage.removeItem('artisan_user')
        window.location.href = '/login'
      }
    }
  }

  if (!res.ok) {
    let errorDetail = `HTTP ${res.status}`
    try {
      const text = await res.text()
      try {
        const data = JSON.parse(text)
        errorDetail = data.detail ||
                      (data.non_field_errors && data.non_field_errors[0]) ||
                      (Array.isArray(data) ? data[0] : null) ||
                      (data && typeof data === 'object' ? Object.values(data)[0] : null) ||
                      data.message ||
                      text
        if (Array.isArray(errorDetail)) {
          errorDetail = errorDetail[0]
        }
      } catch (_) {
        errorDetail = text || `HTTP ${res.status}`
      }
    } catch (e) {
      errorDetail = `HTTP ${res.status}`
    }
    throw new Error(errorDetail)
  }

  if (res.status === 204) return null
  return res.json()
}

export const authApi = {
  login: (data) => request('POST', '/auth/login/', data),
  logout: () => request('POST', '/auth/logout/'),
  me: () => request('GET', '/auth/me/'),
  changePassword: (data) => request('POST', '/auth/change-password/', data),
  getWaiters: () => request('GET', '/auth/waiters/'),
  waiterLogin: (data) => request('POST', '/auth/waiter-login/', data),
}


// ── Category API ──────────────────────────────────────────────────────────────

export const categoryApi = {
  /** GET /categories/ — list all categories */
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request('GET', `/categories/${qs ? `?${qs}` : ''}`)
  },

  /** GET /categories/{id}/ — get single category */
  get: (id) => request('GET', `/categories/${id}/`),

  /** POST /categories/ — create a new category */
  create: (data) => request('POST', '/categories/', data),

  /** PUT /categories/{id}/ — full update */
  update: (id, data) => request('PUT', `/categories/${id}/`, data),

  /** PATCH /categories/{id}/ — partial update */
  patch: (id, data) => request('PATCH', `/categories/${id}/`, data),

  /** DELETE /categories/{id}/ — delete a category */
  delete: (id) => request('DELETE', `/categories/${id}/`),
}

// ── Product API ───────────────────────────────────────────────────────────────

export const productApi = {
  /** GET /products/ — list all products with optional filters */
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request('GET', `/products/${qs ? `?${qs}` : ''}`)
  },

  /** GET /products/{id}/ — get single product */
  get: (id) => request('GET', `/products/${id}/`),

  /**
   * POST /products/ — create a new product.
   * Accepts either a plain object (JSON) or FormData (for image uploads).
   */
  create: (data) => {
    if (data instanceof FormData) {
      return request('POST', '/products/', data, true)
    }
    return request('POST', '/products/', data)
  },

  /**
   * PATCH /products/{id}/ — partial update (used for edits).
   * Accepts either a plain object or FormData.
   */
  patch: (id, data) => {
    if (data instanceof FormData) {
      return request('PATCH', `/products/${id}/`, data, true)
    }
    return request('PATCH', `/products/${id}/`, data)
  },

  /**
   * PUT /products/{id}/ — full update.
   */
  update: (id, data) => {
    if (data instanceof FormData) {
      return request('PUT', `/products/${id}/`, data, true)
    }
    return request('PUT', `/products/${id}/`, data)
  },

  /** DELETE /products/{id}/ */
  delete: (id) => request('DELETE', `/products/${id}/`),

  /**
   * PATCH /products/{id}/set_availability/
   * Body: { available, sold_out, available_on_pos, available_on_qr }
   */
  setAvailability: (id, data) =>
    request('PATCH', `/products/${id}/set_availability/`, data),

  /**
   * PATCH /products/{id}/set_popular/
   * Body: { popular, featured }
   */
  setPopular: (id, data) =>
    request('PATCH', `/products/${id}/set_popular/`, data),
}

// ── Table API ─────────────────────────────────────────────────────────────────

export const tableApi = {
  /** GET /tables/ */
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request('GET', `/tables/${qs ? `?${qs}` : ''}`)
  },

  /** GET /tables/{id}/ */
  get: (id) => request('GET', `/tables/${id}/`),

  /** POST /tables/ — creates table and auto-generates QR code */
  create: (data) => request('POST', '/tables/', data),

  /** PUT /tables/{id}/ */
  update: (id, data) => request('PUT', `/tables/${id}/`, data),

  /** PATCH /tables/{id}/ */
  patch: (id, data) => request('PATCH', `/tables/${id}/`, data),

  /** DELETE /tables/{id}/ */
  delete: (id) => request('DELETE', `/tables/${id}/`),

  /** PATCH /tables/{id}/set_status/   { status: 'occupied' } */
  setStatus: (id, data) => request('PATCH', `/tables/${id}/set_status/`, data),

  /** PATCH /tables/{id}/set_active/   { active: false } */
  setActive: (id, data) => request('PATCH', `/tables/${id}/set_active/`, data),
}

// ── QR Code API ───────────────────────────────────────────────────────────────

export const qrCodeApi = {
  /** GET /qrcodes/ */
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request('GET', `/qrcodes/${qs ? `?${qs}` : ''}`)
  },

  /** GET /qrcodes/{id}/ */
  get: (id) => request('GET', `/qrcodes/${id}/`),

  /** PATCH /qrcodes/{id}/set_status/   { status: 'active' | 'inactive' } */
  setStatus: (id, data) => request('PATCH', `/qrcodes/${id}/set_status/`, data),

  /** POST /qrcodes/{id}/regenerate/ — re-generates the QR PNG image */
  regenerate: (id) => request('POST', `/qrcodes/${id}/regenerate/`),

  /** Download URL (used as an <a href> not a fetch call) */
  downloadUrl: (id) => `/api/v1/qrcodes/${id}/download/`,
}

// ── Order API ─────────────────────────────────────────────────────────────────

export const orderApi = {
  /** GET /orders/?status=...&search=... */
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request('GET', `/orders/${qs ? `?${qs}` : ''}`)
  },

  /** GET /orders/{id}/ */
  get: (id) => request('GET', `/orders/${id}/`),

  /** POST /orders/ — create new order with optional nested items */
  create: (data) => request('POST', '/orders/', data),

  /** PATCH /orders/{id}/ */
  patch: (id, data) => request('PATCH', `/orders/${id}/`, data),

  /** DELETE /orders/{id}/ */
  delete: (id) => request('DELETE', `/orders/${id}/`),

  /** PATCH /orders/{id}/set_status/  { status: 'preparing' } */
  setStatus: (id, data) => request('PATCH', `/orders/${id}/set_status/`, data),

  /** POST /orders/{id}/add_item/  { product, product_name, unit_price, quantity } */
  addItem: (id, data) => request('POST', `/orders/${id}/add_item/`, data),

  /** DELETE /orders/{id}/remove_item/{itemId}/ */
  removeItem: (orderId, itemId) => request('DELETE', `/orders/${orderId}/remove_item/${itemId}/`),

  /** PATCH /orders/{id}/update_item/{itemId}/  { quantity: N } */
  updateItem: (orderId, itemId, data) =>
    request('PATCH', `/orders/${orderId}/update_item/${itemId}/`, data),

  /** POST /orders/{id}/generate_bill/  { whatsapp_number: '...' } */
  generateBill: (orderId, data) =>
    request('POST', `/orders/${orderId}/generate_bill/`, data),

  /** POST /orders/{id}/complete_order/  { method: 'cash', status: 'paid' } */
  completeOrder: (orderId, data) =>
    request('POST', `/orders/${orderId}/complete_order/`, data),

  /** GET /orders/{id}/invoice/ */
  getInvoice: (orderId) => request('GET', `/orders/${orderId}/invoice/`),
}

// ── Invoice API ───────────────────────────────────────────────────────────────

export const invoiceApi = {
  /** GET /orders/{orderId}/invoice/ — get invoice by order */
  getByOrder: (orderId) => request('GET', `/orders/${orderId}/invoice/`),

  /** GET /receipt/{token}/ — public receipt by UUID token */
  getByToken: (token) => request('GET', `/receipt/${token}/`),
}


// ── Dashboard API ─────────────────────────────────────────────────────────────

export const dashboardApi = {
  /** GET /dashboard/stats/ — today's KPIs */
  stats: () => request('GET', '/dashboard/stats/'),

  /** GET /dashboard/recent-orders/?limit=8 */
  recentOrders: (limit = 8) => request('GET', `/dashboard/recent-orders/?limit=${limit}`),

  /** GET /dashboard/best-sellers/?limit=5&period=daily */
  bestSellers: (limit = 5, period = 'daily') =>
    request('GET', `/dashboard/best-sellers/?limit=${limit}&period=${period}`),

  /** GET /dashboard/sales-chart/?period=weekly */
  salesChart: (period = 'weekly') =>
    request('GET', `/dashboard/sales-chart/?period=${period}`),
}

// ── Reports API ───────────────────────────────────────────────────────────────

export const reportsApi = {
  /**
   * GET /reports/summary/?period=daily|weekly|monthly
   * Optional: &date_from=YYYY-MM-DD&date_to=YYYY-MM-DD for custom range
   */
  summary: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request('GET', `/reports/summary/?${qs}`)
  },

  /** GET /reports/revenue-chart/?period=... */
  revenueChart: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request('GET', `/reports/revenue-chart/?${qs}`)
  },

  /** GET /reports/top-categories/?period=... */
  topCategories: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request('GET', `/reports/top-categories/?${qs}`)
  },
}

// ── Notification API ──────────────────────────────────────────────────────────

export const notificationApi = {
  /** GET /notifications/ — most recent 50 notifications */
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request('GET', `/notifications/${qs ? `?${qs}` : ''}`)
  },

  /** GET /notifications/unread_count/ → { count: N } */
  unreadCount: () => request('GET', '/notifications/unread_count/'),

  /** POST /notifications/{id}/mark_read/ */
  markRead: (id) => request('POST', `/notifications/${id}/mark_read/`),

  /** POST /notifications/mark_all_read/ */
  markAllRead: () => request('POST', '/notifications/mark_all_read/'),
}
