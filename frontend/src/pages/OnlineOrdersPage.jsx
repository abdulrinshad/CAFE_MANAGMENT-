import { useState } from 'react'
import AdminLayout from '../layouts/AdminLayout'

const INITIAL_MOCK_ORDERS = [
  {
    id: 'SWG-1001',
    channel: 'SWIGGY',
    customer: 'Rahul',
    items: [
      { name: 'Chicken Burger', qty: 2, price: 180 },
      { name: 'French Fries', qty: 1, price: 90 }
    ],
    amount: 450,
    status: 'NEW',
    time: '2 mins ago'
  },
  {
    id: 'ZMT-2001',
    channel: 'ZOMATO',
    customer: 'Arjun',
    items: [
      { name: 'Latte', qty: 2, price: 160 },
      { name: 'Sandwich', qty: 1, price: 300 }
    ],
    amount: 620,
    status: 'NEW',
    time: '5 mins ago'
  },
  {
    id: 'SWG-1002',
    channel: 'SWIGGY',
    customer: 'Priya Patel',
    items: [
      { name: 'Cappuccino', qty: 1, price: 150 },
      { name: 'Chocolate Cake', qty: 1, price: 180 }
    ],
    amount: 330,
    status: 'ACCEPTED',
    time: '12 mins ago'
  },
  {
    id: 'ZMT-2002',
    channel: 'ZOMATO',
    customer: 'Sneha Rao',
    items: [
      { name: 'Espresso', qty: 2, price: 120 },
      { name: 'Croissant', qty: 2, price: 110 }
    ],
    amount: 460,
    status: 'PREPARING',
    time: '15 mins ago'
  },
  {
    id: 'SWG-1003',
    channel: 'SWIGGY',
    customer: 'Rohan Sharma',
    items: [
      { name: 'Cold Brew', qty: 3, price: 160 }
    ],
    amount: 480,
    status: 'READY',
    time: '18 mins ago'
  },
  {
    id: 'ZMT-2003',
    channel: 'ZOMATO',
    customer: 'Vikram',
    items: [
      { name: 'Club Sandwich', qty: 2, price: 220 }
    ],
    amount: 440,
    status: 'COMPLETED',
    time: '35 mins ago'
  }
]

export default function OnlineOrdersPage() {
  const [activeTab, setActiveTab] = useState('All')
  const [orders, setOrders] = useState(INITIAL_MOCK_ORDERS)

  const handleStatusChange = (orderId, nextStatus) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
    )
  }

  const filtered = orders.filter((o) => {
    if (activeTab === 'All') return true
    return o.channel === activeTab.toUpperCase()
  })

  const getStatusColor = (status) => {
    switch (status) {
      case 'NEW': return { bg: '#eef2ff', text: '#3730a3', border: '#c7d2fe' }
      case 'ACCEPTED': return { bg: '#fff7ed', text: '#9a3412', border: '#ffedd5' }
      case 'PREPARING': return { bg: '#fef3c7', text: '#92400e', border: '#fde68a' }
      case 'READY': return { bg: '#f0fdf4', text: '#166534', border: '#bbf7d0' }
      case 'COMPLETED': return { bg: '#f3f4f6', text: '#374151', border: '#e5e7eb' }
      case 'REJECTED': return { bg: '#fef2f2', text: '#991b1b', border: '#fecaca' }
      default: return { bg: '#ffffff', text: '#000000', border: '#cccccc' }
    }
  }

  return (
    <AdminLayout
      searchPlaceholder="Search online orders..."
      pageTitle="Online Orders"
      pageIcon={
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      }
    >
      <div style={{ padding: '0 10px' }}>
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid var(--color-border-light)', paddingBottom: '10px' }}>
          {['All', 'Swiggy', 'Zomato'].map((tab) => {
            const count = tab === 'All' ? orders.length : orders.filter(o => o.channel === tab.toUpperCase()).length
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '20px',
                  border: activeTab === tab ? '1px solid var(--color-peach-border)' : '1px solid var(--color-border)',
                  background: activeTab === tab ? 'var(--color-peach-active)' : 'var(--color-white)',
                  color: 'var(--color-espresso)',
                  fontWeight: activeTab === tab ? 600 : 500,
                  fontSize: '13px',
                  cursor: 'pointer',
                  outline: 'none',
                  transition: 'all 0.2s'
                }}
              >
                {tab} ({count})
              </button>
            )
          })}
        </div>

        {/* Incoming Orders Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {filtered.map((o) => {
            const colors = getStatusColor(o.status)
            return (
              <div
                key={o.id}
                style={{
                  background: 'var(--color-white)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '12px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  boxShadow: '0 2px 8px rgba(44, 24, 16, 0.02)'
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: o.channel === 'SWIGGY' ? '#e65300' : '#b81414', display: 'block' }}>
                      {o.channel}
                    </span>
                    <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-espresso)' }}>
                      {o.id}
                    </span>
                  </div>
                  <span
                    style={{
                      background: colors.bg,
                      color: colors.text,
                      border: `1px solid ${colors.border}`,
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: '12px'
                    }}
                  >
                    {o.status}
                  </span>
                </div>

                {/* Customer Details */}
                <div style={{ borderBottom: '1px dashed var(--color-border-light)', paddingBottom: '10px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>Customer: {o.customer}</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Received: {o.time}</div>
                </div>

                {/* Items */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexGrow: 1 }}>
                  {o.items.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span>{item.qty} × {item.name}</span>
                      <span style={{ color: 'var(--color-text-muted)' }}>₹{item.qty * item.price}</span>
                    </div>
                  ))}
                </div>

                {/* Amount Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--color-border-light)', fontWeight: 700 }}>
                  <span style={{ fontSize: '13px' }}>Total Amount</span>
                  <span style={{ fontSize: '16px', color: 'var(--color-espresso)' }}>₹{o.amount}</span>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  {o.status === 'NEW' && (
                    <>
                      <button
                        onClick={() => handleStatusChange(o.id, 'ACCEPTED')}
                        style={{
                          flexGrow: 1,
                          padding: '8px 12px',
                          background: 'var(--color-espresso)',
                          color: 'var(--color-white)',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Accept Order
                      </button>
                      <button
                        onClick={() => handleStatusChange(o.id, 'REJECTED')}
                        style={{
                          padding: '8px 12px',
                          background: 'transparent',
                          color: 'var(--color-red)',
                          border: '1px solid var(--color-red)',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {o.status === 'ACCEPTED' && (
                    <button
                      onClick={() => handleStatusChange(o.id, 'PREPARING')}
                      style={{
                        flexGrow: 1,
                        padding: '8px 12px',
                        background: '#9a3412',
                        color: 'var(--color-white)',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Start Preparing
                    </button>
                  )}
                  {o.status === 'PREPARING' && (
                    <button
                      onClick={() => handleStatusChange(o.id, 'READY')}
                      style={{
                        flexGrow: 1,
                        padding: '8px 12px',
                        background: '#166534',
                        color: 'var(--color-white)',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Mark Ready for Dispatch
                    </button>
                  )}
                  {o.status === 'READY' && (
                    <button
                      onClick={() => handleStatusChange(o.id, 'COMPLETED')}
                      style={{
                        flexGrow: 1,
                        padding: '8px 12px',
                        background: '#374151',
                        color: 'var(--color-white)',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Mark Picked Up / Completed
                    </button>
                  )}
                  {o.status === 'COMPLETED' && (
                    <div style={{ textAlign: 'center', width: '100%', fontSize: '12px', color: 'var(--color-green)', fontWeight: 600 }}>
                      ✓ Order Picked Up
                    </div>
                  )}
                  {o.status === 'REJECTED' && (
                    <div style={{ textAlign: 'center', width: '100%', fontSize: '12px', color: 'var(--color-red)', fontWeight: 600 }}>
                      ✕ Order Rejected
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </AdminLayout>
  )
}
