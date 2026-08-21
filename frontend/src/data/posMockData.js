// posMockData.js - Realistic POS mock data for Artisan Brew Kochi Branch POS-01

export const posConfig = {
  branch: "Kochi Branch",
  terminal: "POS-01",
  cashier: "Arun",
  currency: "₹"
};

export const posStats = {
  todaySales: 24850,
  salesTrend: "+12.5%", // Compared to yesterday
  todayOrders: 42,
  pendingPayments: 5,
  completedPayments: 37,
  activeTables: 8,
  totalTables: 15,
  cashCollection: 8500,
  upiCollection: 13250,
  cardCollection: 3100
};

export const salesTrends = {
  today: [
    { label: "08:00 AM", value: 1200 },
    { label: "10:00 AM", value: 3400 },
    { label: "12:00 PM", value: 6800 },
    { label: "02:00 PM", value: 5200 },
    { label: "04:00 PM", value: 4100 },
    { label: "06:00 PM", value: 4150 }
  ],
  weekly: [
    { label: "Mon", value: 18500 },
    { label: "Tue", value: 21000 },
    { label: "Wed", value: 19800 },
    { label: "Thu", value: 22400 },
    { label: "Fri", value: 26800 },
    { label: "Sat", value: 31000 },
    { label: "Sun", value: 24850 } // Today
  ],
  monthly: [
    { label: "Week 1", value: 145000 },
    { label: "Week 2", value: 168000 },
    { label: "Week 3", value: 152000 },
    { label: "Week 4", value: 182400 }
  ]
};

export const pendingBillRequests = [
  {
    id: "req-1",
    table: "T-05",
    orderId: "ORD-1052",
    waiter: "Rahul",
    amount: 640,
    requestedAt: "2 minutes ago",
    status: "PAYMENT PENDING",
    items: "2x Cappuccino, 1x Croissant, 1x Chocolate Cake"
  },
  {
    id: "req-2",
    table: "T-08",
    orderId: "ORD-1053",
    waiter: "Amal",
    amount: 1250,
    requestedAt: "5 minutes ago",
    status: "PAYMENT PENDING",
    items: "1x Americano, 2x Chicken Burger, 1x Club Sandwich"
  },
  {
    id: "req-3",
    table: "T-03",
    orderId: "ORD-1049",
    waiter: "Anjali",
    amount: 890,
    requestedAt: "10 minutes ago",
    status: "PAYMENT PENDING",
    items: "2x Cold Coffee, 1x Club Sandwich, 1x French Fries"
  }
];

export const tableStatusList = [
  { table: "T-01", status: "Available" },
  { table: "T-02", status: "Occupied", orderId: "ORD-1054", waiter: "Rahul" },
  { table: "T-03", status: "Payment Pending", orderId: "ORD-1049", waiter: "Anjali" },
  { table: "T-04", status: "Occupied", orderId: "ORD-1055", waiter: "Amal" },
  { table: "T-05", status: "Bill Requested", orderId: "ORD-1052", waiter: "Rahul" },
  { table: "T-06", status: "Available" },
  { table: "T-07", status: "Order in Progress", orderId: "ORD-1056", waiter: "Anjali" },
  { table: "T-08", status: "Bill Requested", orderId: "ORD-1053", waiter: "Amal" },
  { table: "T-09", status: "Available" },
  { table: "T-10", status: "Occupied", orderId: "ORD-1057", waiter: "Rahul" },
  { table: "T-11", status: "Available" },
  { table: "T-12", status: "Available" },
  { table: "T-13", status: "Order in Progress", orderId: "ORD-1058", waiter: "Anjali" },
  { table: "T-14", status: "Available" },
  { table: "T-15", status: "Available" }
];

export const recentTransactions = [
  {
    invoice: "INV-2026-001",
    target: "T-04",
    method: "UPI",
    amount: 850,
    status: "Paid",
    time: "2:35 PM"
  },
  {
    invoice: "INV-2026-002",
    target: "T-08",
    method: "Cash",
    amount: 1200,
    status: "Paid",
    time: "2:22 PM"
  },
  {
    invoice: "INV-2026-003",
    target: "Takeaway #TK-101",
    method: "Card",
    amount: 560,
    status: "Paid",
    time: "1:58 PM"
  },
  {
    invoice: "INV-2026-004",
    target: "T-11",
    method: "UPI",
    amount: 450,
    status: "Paid",
    time: "1:15 PM"
  },
  {
    invoice: "INV-2026-005",
    target: "Takeaway #TK-102",
    method: "Cash",
    amount: 320,
    status: "Paid",
    time: "12:45 PM"
  }
];

export const paymentBreakdownData = [
  { method: "CASH", amount: 8500, percentage: 34 },
  { method: "UPI", amount: 13250, percentage: 53 },
  { method: "CARD", amount: 3100, percentage: 13 }
];

export const recentActivities = [
  {
    id: "act-1",
    type: "payment",
    description: "Payment received for Table T-04",
    detail: "₹850 via UPI",
    time: "2 minutes ago"
  },
  {
    id: "act-2",
    type: "request",
    description: "Bill requested from Table T-08",
    detail: "Amount: ₹1,250",
    time: "5 minutes ago"
  },
  {
    id: "act-3",
    type: "order_complete",
    description: "Order #ORD-1048 completed",
    detail: "Processed by cashier Arun",
    time: "12 minutes ago"
  },
  {
    id: "act-4",
    type: "table_available",
    description: "Table T-03 marked available",
    detail: "Cleaned and ready for guests",
    time: "18 minutes ago"
  }
];
