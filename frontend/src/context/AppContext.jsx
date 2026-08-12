import { createContext, useContext, useState } from 'react'
import {
  menuItems   as initProducts,
  categories  as initCategories,
  orders      as initOrders,
  tables      as initTables,
  qrCodes     as initQR,
} from '../data/mockData'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [products,   setProducts]   = useState(initProducts)
  const [categories, setCategories] = useState(initCategories)
  const [orders,     setOrders]     = useState(initOrders)
  const [tables,     setTables]     = useState(initTables)
  const [qrCodes,    setQRCodes]    = useState(initQR)

  // ── Product CRUD ──────────────────────────────────────────────────
  const addProduct = (data) => {
    const newProduct = {
      ...data,
      id: Date.now(),
      categoryLabel: (data.category || '').toUpperCase(),
      soldOut: false,
      displayOrder: products.length + 1,
    }
    setProducts((prev) => [...prev, newProduct])
    return newProduct
  }

  const updateProduct = (id, data) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, ...data, categoryLabel: (data.category || p.category).toUpperCase() }
          : p
      )
    )
  }

  const deleteProduct = (id) => {
    setProducts((prev) => prev.filter((p) => p.id !== id))
  }

  const deactivateProduct = (id) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, available: false, soldOut: true } : p))
    )
  }

  // ── Category CRUD ─────────────────────────────────────────────────
  const addCategory = (data) => {
    const newCat = { ...data, id: Date.now(), itemCount: 0 }
    setCategories((prev) => [...prev, newCat])
    return newCat
  }

  const updateCategory = (id, data) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...data } : c))
    )
  }

  const toggleCategory = (id) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, active: !c.active } : c))
    )
  }

  const reorderCategories = (newList) => {
    setCategories(newList.map((c, i) => ({ ...c, order: i + 1 })))
  }

  // ── Order actions ─────────────────────────────────────────────────
  const updateOrderStatus = (id, status) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status } : o))
    )
  }

  const getOrder = (id) => orders.find((o) => o.id === id)

  // ── Table actions ──────────────────────────────────────────────────
  const addTable = (data) => {
    const newTable = {
      ...data,
      status: 'available',
      currentOrderId: null,
      amount: null,
      items: [],
      seatedMinutes: null,
      waitingMinutes: null,
      active: true,
    }
    setTables((prev) => [...prev, newTable])
    return newTable
  }

  const updateTable = (id, data) => {
    setTables((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...data } : t))
    )
  }

  // ── QR Code actions ────────────────────────────────────────────────
  const getQR = (id) => qrCodes.find((q) => q.id === id)

  const regenerateQR = (id) => {
    setQRCodes((prev) =>
      prev.map((q) =>
        q.id === id
          ? { ...q, generatedDate: new Date().toISOString().split('T')[0], scanCount: 0, lastScanned: 'Just now' }
          : q
      )
    )
  }

  const updateQRStatus = (id, status) => {
    setQRCodes((prev) =>
      prev.map((q) => (q.id === id ? { ...q, status } : q))
    )
  }

  return (
    <AppContext.Provider
      value={{
        // data
        products,
        categories,
        orders,
        tables,
        qrCodes,
        // product actions
        addProduct,
        updateProduct,
        deleteProduct,
        deactivateProduct,
        // category actions
        addCategory,
        updateCategory,
        toggleCategory,
        reorderCategories,
        // order actions
        updateOrderStatus,
        getOrder,
        // table actions
        addTable,
        updateTable,
        // qr actions
        getQR,
        regenerateQR,
        updateQRStatus,
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
