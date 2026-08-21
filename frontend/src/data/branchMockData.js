export const BRANCH_INFO = {
  id: 'kochi',
  name: 'Artisan Brew — Kochi Branch',
  city: 'Kochi',
  status: 'active',
  address: '32/492 B, MG Road, Ernakulam, Kochi, Kerala 682016',
  phone: '+91 98765 43210',
  email: 'kochi@artisanbrew.com',
  openingTime: '08:00 AM',
  closingTime: '11:00 PM',
  taxGST: 18, // 18% standard GST
  currency: 'INR',
  serviceCharge: 5, // 5% optional
};

export const INITIAL_STAFF = [
  { id: 'STF-101', name: 'Rahul K. S.', role: 'Waiter', email: 'rahul@artisanbrew.com', phone: '+91 99887 76655', status: 'active', joinedDate: '2025-01-10', password: 'password123', ordersHandled: 420, tablesServed: 180 },
  { id: 'STF-102', name: 'Amal Raj', role: 'Waiter', email: 'amal@artisanbrew.com', phone: '+91 98765 12345', status: 'active', joinedDate: '2025-02-15', password: 'password123', ordersHandled: 350, tablesServed: 140 },
  { id: 'STF-103', name: 'Arun Dev', role: 'POS', email: 'arun@artisanbrew.com', phone: '+91 97456 78901', status: 'active', joinedDate: '2024-11-01', password: 'password123', billsProcessed: 980, transactionsTotal: 480000 },
  { id: 'STF-104', name: 'Anjali Sharma', role: 'Kitchen Staff', email: 'anjali@artisanbrew.com', phone: '+91 96321 45678', status: 'active', joinedDate: '2025-03-01', password: 'password123' },
  { id: 'STF-105', name: 'Sandra Paul', role: 'Waiter', email: 'sandra@artisanbrew.com', phone: '+91 95432 10987', status: 'inactive', joinedDate: '2025-04-10', password: 'password123', ordersHandled: 54, tablesServed: 24 }
];

export const INITIAL_TABLES = [
  { id: 'T-01', number: 'T-01', capacity: 2, section: 'Main Hall', status: 'available', assignedWaiter: 'Rahul K. S.', qrStatus: 'active' },
  { id: 'T-02', number: 'T-02', capacity: 4, section: 'Main Hall', status: 'occupied', currentOrderId: 'ORD-1024', assignedWaiter: 'Amal Raj', qrStatus: 'active' },
  { id: 'T-03', number: 'T-03', capacity: 4, section: 'Balcony', status: 'bill_requested', currentOrderId: 'ORD-1025', assignedWaiter: 'Rahul K. S.', qrStatus: 'active' },
  { id: 'T-04', number: 'T-04', capacity: 6, section: 'Balcony', status: 'order_in_progress', currentOrderId: 'ORD-1026', assignedWaiter: 'Amal Raj', qrStatus: 'active' },
  { id: 'T-05', number: 'T-05', capacity: 8, section: 'Private Room', status: 'available', assignedWaiter: 'Sandra Paul', qrStatus: 'inactive' }
];

export const INITIAL_ORDERS = [
  {
    id: 'ORD-1024',
    orderId: 'ORD-1024',
    channel: 'Dine-In',
    table: 'T-02',
    waiter: 'Amal Raj',
    amount: 720,
    paymentStatus: 'pending',
    status: 'PREPARING',
    createdTime: '15:10',
    time: '15:10',
    items: [
      { product: 'Cappuccino', quantity: 2, price: 180, total: 360 },
      { product: 'Chicken Burger', quantity: 1, price: 240, total: 240 },
      { product: 'Chocolate Cake', quantity: 1, price: 120, total: 120 }
    ],
    financials: { subtotal: 610, tax: 70, discount: 0, finalAmount: 720 }
  },
  {
    id: 'ORD-1025',
    orderId: 'ORD-1025',
    channel: 'Dine-In',
    table: 'T-03',
    waiter: 'Rahul K. S.',
    amount: 490,
    paymentStatus: 'pending',
    status: 'READY',
    createdTime: '14:45',
    time: '14:45',
    items: [
      { product: 'Americano', quantity: 1, price: 150, total: 150 },
      { product: 'Club Sandwich', quantity: 1, price: 220, total: 220 },
      { product: 'Chocolate Coffee', quantity: 1, price: 120, total: 120 }
    ],
    financials: { subtotal: 415, tax: 75, discount: 0, finalAmount: 490 }
  },
  {
    id: 'ORD-1026',
    orderId: 'ORD-1026',
    channel: 'Dine-In',
    table: 'T-04',
    waiter: 'Amal Raj',
    amount: 1100,
    paymentStatus: 'pending',
    status: 'NEW',
    createdTime: '15:15',
    time: '15:15',
    items: [
      { product: 'Chocolate Coffee', quantity: 3, price: 120, total: 360 },
      { product: 'Club Sandwich', quantity: 2, price: 220, total: 440 },
      { product: 'Chicken Burger', quantity: 1, price: 240, total: 240 }
    ],
    financials: { subtotal: 932, tax: 168, discount: 0, finalAmount: 1100 }
  },
  {
    id: 'ORD-1023',
    orderId: 'ORD-1023',
    channel: 'Swiggy',
    table: 'Online Order',
    waiter: '—',
    amount: 380,
    paymentStatus: 'paid',
    status: 'SERVED',
    createdTime: '14:10',
    time: '14:10',
    items: [
      { product: 'Chicken Burger', quantity: 1, price: 240, total: 240 },
      { product: 'Chocolate Coffee', quantity: 1, price: 120, total: 120 }
    ],
    financials: { subtotal: 320, tax: 60, discount: 0, finalAmount: 380 }
  },
  {
    id: 'ORD-1022',
    orderId: 'ORD-1022',
    channel: 'Zomato',
    table: 'Online Order',
    waiter: '—',
    amount: 540,
    paymentStatus: 'paid',
    status: 'COMPLETED',
    createdTime: '13:30',
    time: '13:30',
    items: [
      { product: 'Cappuccino', quantity: 1, price: 180, total: 180 },
      { product: 'Club Sandwich', quantity: 1, price: 220, total: 220 },
      { product: 'Chocolate Cake', quantity: 1, price: 120, total: 120 }
    ],
    financials: { subtotal: 460, tax: 80, discount: 0, finalAmount: 540 }
  }
];

export const INITIAL_PRODUCTS = [
  { id: 'P-01', name: 'Cappuccino', category: 'Hot Coffee', basePrice: 180, image: '', globalStatus: 'Available', branchStatus: true },
  { id: 'P-02', name: 'Americano', category: 'Hot Coffee', basePrice: 150, image: '', globalStatus: 'Available', branchStatus: true },
  { id: 'P-03', name: 'Chocolate Coffee', category: 'Cold Beverages', basePrice: 120, image: '', globalStatus: 'Available', branchStatus: true },
  { id: 'P-04', name: 'Chicken Burger', category: 'Snacks & Food', basePrice: 240, image: '', globalStatus: 'Available', branchStatus: true },
  { id: 'P-05', name: 'Club Sandwich', category: 'Snacks & Food', basePrice: 220, image: '', globalStatus: 'Available', branchStatus: true },
  { id: 'P-06', name: 'Chocolate Cake', category: 'Desserts', basePrice: 120, image: '', globalStatus: 'Available', branchStatus: false }, // Temp Unavailable
];

export const INITIAL_INVENTORY = [
  { id: 'INV-01', name: 'Chicken breast', category: 'Perishables', currentStock: 18, unit: 'KG', minimumStock: 10, cost: 280, supplier: 'Metro Wholesale', lastUpdated: 'Today' },
  { id: 'INV-02', name: 'Basmati Rice', category: 'Dry Goods', currentStock: 42, unit: 'KG', minimumStock: 20, cost: 95, supplier: 'Kochi Rice Traders', lastUpdated: 'Yesterday' },
  { id: 'INV-03', name: 'Cooking Oil', category: 'Pantry Supplies', currentStock: 3, unit: 'L', minimumStock: 10, cost: 160, supplier: 'Metro Wholesale', lastUpdated: 'Today' },
  { id: 'INV-04', name: 'Milk Carton', category: 'Dairy', currentStock: 8, unit: 'L', minimumStock: 12, cost: 65, supplier: 'Milma Kochi', lastUpdated: 'Today' },
  { id: 'INV-05', name: 'Coffee Beans', category: 'Coffee Supplies', currentStock: 24, unit: 'KG', minimumStock: 15, cost: 850, supplier: 'Western Ghats Estates', lastUpdated: '2 days ago' }
];

export const INITIAL_EXPENSES = [
  { id: 'EXP-101', category: 'Supplies', description: 'Fresh vegetables and poultry from Metro', amount: 4800, date: '2026-08-20', addedBy: 'Arun Dev', status: 'Approved', reference: 'REF-849312' },
  { id: 'EXP-102', category: 'Utilities', description: 'KSEB Electricity Bill Kochi Branch', amount: 12400, date: '2026-08-15', addedBy: 'Arun Dev', status: 'Approved', reference: 'REF-348201' },
  { id: 'EXP-103', category: 'Maintenance', description: 'Espresso machine water filter repair', amount: 3500, date: '2026-08-10', addedBy: 'Rahul K. S.', status: 'Approved', reference: 'REF-112048' },
  { id: 'EXP-104', category: 'Staff', description: 'Temporary staff daily allowance', amount: 2000, date: '2026-08-21', addedBy: 'Arun Dev', status: 'Pending', reference: 'REF-940301' }
];

export const INITIAL_CUSTOMERS = [
  { id: 'C-201', name: 'Roshan Mathew', phone: '+91 98450 11223', totalOrders: 42, totalSpending: 12450, lastVisit: '2026-08-20', favouriteItems: ['Cappuccino', 'Chicken Burger'], whatsapp: '+91 98450 11223' },
  { id: 'C-202', name: 'Meera Jasmine', phone: '+91 94470 55667', totalOrders: 28, totalSpending: 8600, lastVisit: '2026-08-18', favouriteItems: ['Americano', 'Club Sandwich'], whatsapp: '+91 94470 55667' },
  { id: 'C-203', name: 'Rinu R.', phone: '+91 81290 88990', totalOrders: 15, totalSpending: 3200, lastVisit: '2026-08-21', favouriteItems: ['Chocolate Coffee'], whatsapp: '+91 81290 88990' },
  { id: 'C-204', name: 'Zacharia V.', phone: '+91 70120 33445', totalOrders: 60, totalSpending: 21800, lastVisit: '2026-08-21', favouriteItems: ['Cappuccino', 'Chocolate Cake'], whatsapp: '+91 70120 33445' }
];

export const RECENT_ACTIVITIES = [
  { id: 'act-01', type: 'order', description: 'Order #ORD-1026 created', time: '5 mins ago', icon: '🛒' },
  { id: 'act-02', type: 'table', description: 'Table T-02 status updated to Occupied', time: '10 mins ago', icon: '🪑' },
  { id: 'act-03', type: 'order', description: 'Order #ORD-1024 moved to Preparing', time: '12 mins ago', icon: '🔄' },
  { id: 'act-04', type: 'payment', description: 'Order #ORD-1023 payment completed', time: '35 mins ago', icon: '✅' },
  { id: 'act-05', type: 'stock', description: 'Low stock alert generated: Cooking Oil', time: '1 hour ago', icon: '⚠️' },
  { id: 'act-06', type: 'expense', description: 'New expense recorded by Arun Dev (₹2,000)', time: '2 hours ago', icon: '💵' }
];
