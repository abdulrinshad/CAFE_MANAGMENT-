/**
 * api.js — Centralized API client for Cafe Manager.
 *
 * All requests go through the Vite proxy → Django backend at /api/v1/.
 * No base URL hardcoding needed; the proxy handles routing.
 */

const rawEnvUrl = import.meta.env.VITE_API_URL
function getApiBaseUrl() {
  if (!rawEnvUrl) return '/api/v1'
  const url = rawEnvUrl.trim().replace(/\/+$/, '')
  if (url.endsWith('/api/v1')) return url
  if (url.endsWith('/api')) return `${url}/v1`
  return `${url}/api/v1`
}
const BASE = getApiBaseUrl()

// ── Generic fetch helper ──────────────────────────────────────────────────────

export async function request(method, path, body = null, isFormData = false, isRetry = false) {
  const isForm = isFormData || (typeof FormData !== 'undefined' && body instanceof FormData)
  const headers = {}
  if (body && !isForm) {
    headers['Content-Type'] = 'application/json'
  }
  headers['Accept'] = 'application/json'

  const token = localStorage.getItem('artisan_access')
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const opts = {
    method,
    headers,
  }

  if (body) {
    opts.body = isForm ? body : JSON.stringify(body)
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
          throw new Error('Session expired')
        }
      } catch (e) {
        localStorage.removeItem('artisan_access')
        localStorage.removeItem('artisan_refresh')
        localStorage.removeItem('artisan_user')
        window.location.href = '/login'
        throw new Error('Session expired')
      }
    }
  }

  if (!res.ok) {
    let errorDetail = `HTTP ${res.status}`
    let data = null
    try {
      const text = await res.text()
      try {
        data = JSON.parse(text)
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
    const err = new Error(errorDetail)
    err.status = res.status
    err.data = data
    throw err
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
  employeeLogin: (data) => request('POST', '/auth/employee-login/', data),
  adminForgotPassword: (data) => request('POST', '/auth/admin-forgot-password/', data),
  adminVerifyOTP: (data) => request('POST', '/auth/admin-verify-otp/', data),
  adminResetPassword: (data) => request('POST', '/auth/admin-reset-password/', data),
  adminSignup: (data) => request('POST', '/auth/admin-signup/', data),
  adminVerifySignupOTP: (data) => request('POST', '/auth/admin-verify-signup-otp/', data),
  adminResendSignupOTP: (data) => request('POST', '/auth/resend-signup-otp/', data),
  forgotBusinessCode: (data) => request('POST', '/auth/forgot-business-code/', data),
  verifyBusinessCodeOTP: (data) => request('POST', '/auth/verify-business-code-otp/', data),
  resendBusinessCodeOTP: (data) => request('POST', '/auth/resend-business-code-otp/', data),
  regenerateBusinessCode: (data) => request('POST', '/auth/regenerate-business-code/', data),
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

  /** POST /orders/{orderId}/generate_bill/ */
  generateBill: (orderId, data) =>
    request('POST', `/orders/${orderId}/generate_bill/`, data),

  /** POST /orders/{orderId}/share_bill/ */
  shareBill: (orderId, data) =>
    request('POST', `/orders/${orderId}/share_bill/`, data),

  /** POST /orders/{orderId}/complete_order/ */
  completeOrder: (orderId, data) =>
    request('POST', `/orders/${orderId}/complete_order/`, data),

  /** POST /orders/{id}/receipt-sent/ */
  markReceiptSent: (orderId) =>
    request('POST', `/orders/${orderId}/receipt-sent/`),

  /** POST /orders/{orderId}/mark_receipt_shared/ */
  markReceiptShared: (orderId, data) =>
    request('POST', `/orders/${orderId}/mark_receipt_shared/`, data),

  /** POST /orders/{orderId}/mark_receipt_printed/ */
  markReceiptPrinted: (orderId) =>
    request('POST', `/orders/${orderId}/mark_receipt_printed/`),

  /** POST /orders/{orderId}/mark_receipt_not_shared/ */
  markReceiptNotShared: (orderId) =>
    request('POST', `/orders/${orderId}/mark_receipt_not_shared/`),

  /** GET /orders/{id}/invoice/ */
  getInvoice: (orderId) => request('GET', `/orders/${orderId}/invoice/`),

  /**
   * POST /orders/{id}/request_bill/
   * Waiter finalizes order: creates a Bill Request for Cashier + frees the table.
   * Does NOT generate an invoice — that is the cashier's job.
   */
  requestBill: (orderId) =>
    request('POST', `/orders/${orderId}/request_bill/`),
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
  stats: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request('GET', `/dashboard/stats/${qs ? `?${qs}` : ''}`)
  },

  /** GET /dashboard/recent-orders/?limit=8 */
  recentOrders: (params = {}) => {
    const qs = new URLSearchParams({ limit: 8, ...params }).toString()
    return request('GET', `/dashboard/recent-orders/?${qs}`)
  },

  /** GET /dashboard/best-sellers/?limit=5&period=daily */
  bestSellers: (params = {}) => {
    const qs = new URLSearchParams({ limit: 5, period: 'daily', ...params }).toString()
    return request('GET', `/dashboard/best-sellers/?${qs}`)
  },

  /** GET /dashboard/sales-chart/?period=weekly */
  salesChart: (params = {}) => {
    const qs = new URLSearchParams({ period: 'weekly', ...params }).toString()
    return request('GET', `/dashboard/sales-chart/?${qs}`)
  },
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

  /** PATCH /notifications/{id}/ */
  patch: (id, data) => request('PATCH', `/notifications/${id}/`, data),

  /** POST /notifications/{id}/mark_read/ */
  markRead: (id) => request('POST', `/notifications/${id}/mark_read/`),

  /** POST /notifications/mark_all_read/ */
  markAllRead: () => request('POST', '/notifications/mark_all_read/'),
}

// ── Conversation & Manager-Owner Messaging API ─────────────────────────────

export const conversationApi = {
  /** GET /conversations/ — list manager/owner conversations */
  list: () => request('GET', '/conversations/'),

  /** POST /conversations/ — create conversation / alert owner */
  create: (data) => request('POST', '/conversations/', data),

  /** GET /conversations/{id}/messages/ — get message thread & mark seen */
  getMessages: (id) => request('GET', `/conversations/${id}/messages/`),

  /** POST /conversations/{id}/messages/ — send reply to conversation */
  reply: (id, data) => request('POST', `/conversations/${id}/messages/`, data),

  /** POST /conversations/{id}/mark_seen/ — mark conversation seen */
  markSeen: (id) => request('POST', `/conversations/${id}/mark_seen/`),
}

// ── Waiter Request API ────────────────────────────────────────────────────────

export const waiterRequestApi = {
  /** GET /requests/ — list active table requests */
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request('GET', `/requests/${qs ? `?${qs}` : ''}`)
  },

  /** POST /requests/ — create new table request */
  create: (data) => request('POST', '/requests/', data),

  /** POST /requests/{id}/attend/ — claim / attend a request */
  attend: (id, data) => request('POST', `/requests/${id}/attend/`, data),

  /** PATCH /requests/{id}/set_status/ — update status */
  setStatus: (id, data) => request('PATCH', `/requests/${id}/set_status/`, data),
}

// ── Waiter API ────────────────────────────────────────────────────────────────

export const waiterApi = {
  /** GET /waiters/ — list waiters */
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request('GET', `/waiters/${qs ? `?${qs}` : ''}`)
  },

  /** POST /waiters/ — create new waiter */
  create: (data) => request('POST', '/waiters/', data, data instanceof FormData),

  /** PATCH /waiters/{id}/ — update existing waiter */
  update: (id, data) => request('PATCH', `/waiters/${id}/`, data, data instanceof FormData),

  /** POST /waiters/{id}/verify_pin_change/ — verify OTP to complete PIN change */
  verifyPinChangeOTP: (id, data) => request('POST', `/waiters/${id}/verify_pin_change/`, data),

  /** POST /waiters/{id}/resend_pin_change_otp/ — resend OTP for PIN change */
  resendPinChangeOTP: (id) => request('POST', `/waiters/${id}/resend_pin_change_otp/`),

  /** DELETE /waiters/{id}/ — delete waiter */
  delete: (id) => request('DELETE', `/waiters/${id}/`),
}

// ── Branch API ────────────────────────────────────────────────────────────────

export const branchApi = {
  /** GET /branches/ — list all branches */
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request('GET', `/branches/${qs ? `?${qs}` : ''}`)
  },

  /** GET /branches/{id}/ — get single branch */
  get: (id) => request('GET', `/branches/${id}/`),

  /** POST /branches/ — create a new branch */
  create: (data) => request('POST', '/branches/', data),

  /** PUT /branches/{id}/ — full update */
  update: (id, data) => request('PUT', `/branches/${id}/`, data),

  /** PATCH /branches/{id}/ — partial update */
  patch: (id, data) => request('PATCH', `/branches/${id}/`, data),

  /** DELETE /branches/{id}/ — delete a branch */
  delete: (id) => request('DELETE', `/branches/${id}/`),

  /** PATCH /branches/{id}/set_active/ — toggle active status */
  setActive: (id, active) => request('PATCH', `/branches/${id}/set_active/`, { active }),
}

// ── Branch Manager API ────────────────────────────────────────────────────────

export const branchManagerApi = {
  /** GET /branch-managers/ — list branch managers */
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request('GET', `/branch-managers/${qs ? `?${qs}` : ''}`)
  },

  /** GET /branch-managers/{id}/ */
  get: (id) => request('GET', `/branch-managers/${id}/`),

  /** POST /branch-managers/ — create a branch manager */
  create: (data) => request('POST', '/branch-managers/', data),

  /** PATCH /branch-managers/{id}/ — update branch manager */
  update: (id, data) => request('PATCH', `/branch-managers/${id}/`, data),

  /** POST /branch-managers/{id}/verify_pin_change/ — verify OTP to complete PIN change */
  verifyPinChangeOTP: (id, data) => request('POST', `/branch-managers/${id}/verify_pin_change/`, data),

  /** POST /branch-managers/{id}/resend_pin_change_otp/ — resend OTP for PIN change */
  resendPinChangeOTP: (id) => request('POST', `/branch-managers/${id}/resend_pin_change_otp/`),

  /** DELETE /branch-managers/{id}/ */
  delete: (id) => request('DELETE', `/branch-managers/${id}/`),

  /** POST /auth/branch-manager-login/ — authenticate a branch manager */
  login: (data) => request('POST', '/auth/branch-manager-login/', data),
}

// ── Expense API ───────────────────────────────────────────────────────────────

export const expenseApi = {
  /** GET /expenses/ — list expenses with optional filters */
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request('GET', `/expenses/${qs ? `?${qs}` : ''}`)
  },

  /** GET /expenses/{id}/ */
  get: (id) => request('GET', `/expenses/${id}/`),

  /** POST /expenses/ — create an expense */
  create: (data) => request('POST', '/expenses/', data),

  /** PATCH /expenses/{id}/ — partial update */
  update: (id, data) => request('PATCH', `/expenses/${id}/`, data),

  /** DELETE /expenses/{id}/ */
  delete: (id) => request('DELETE', `/expenses/${id}/`),
}

// ── Cashier API ───────────────────────────────────────────────────────────────

export const cashierApi = {
  /** GET /cashiers/ — list cashiers */
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request('GET', `/cashiers/${qs ? `?${qs}` : ''}`)
  },

  /** GET /cashiers/{id}/ */
  get: (id) => request('GET', `/cashiers/${id}/`),

  /** POST /cashiers/ — create new cashier */
  create: (data) => request('POST', '/cashiers/', data),

  /** PATCH /cashiers/{id}/ — update existing cashier */
  update: (id, data) => request('PATCH', `/cashiers/${id}/`, data),

  /** POST /cashiers/{id}/verify_pin_change/ — verify OTP to complete PIN change */
  verifyPinChangeOTP: (id, data) => request('POST', `/cashiers/${id}/verify_pin_change/`, data),

  /** POST /cashiers/{id}/resend_pin_change_otp/ — resend OTP for PIN change */
  resendPinChangeOTP: (id) => request('POST', `/cashiers/${id}/resend_pin_change_otp/`),

  /** DELETE /cashiers/{id}/ — delete cashier */
  delete: (id) => request('DELETE', `/cashiers/${id}/`),

  /** PATCH /cashiers/{id}/set_active/ — toggle active status */
  setActive: (id, is_active) => request('PATCH', `/cashiers/${id}/set_active/`, { is_active }),
}

// ── Settings API ──────────────────────────────────────────────────────────────

export const settingsApi = {
  get: () => request('GET', '/owner/settings/'),
  update: (data) => request('PUT', '/owner/settings/', data),
}


