/* ============================================================
   ARTISAN BREW — Owner Mock Data
   Single source of truth for all owner module demo data.
   Replace with real API calls when backend is ready.
   ============================================================ */

// ── Branches ──────────────────────────────────────────────────────────────
export const OWNER_BRANCHES = [
  {
    id: 1,
    name: 'Artisan Brew — Koramangala',
    location: 'Koramangala, Bengaluru',
    phone: '+91 98765 43210',
    gst: '29ABCDE1234F1Z5',
    currency: 'INR',
    opening: '07:00',
    closing: '23:00',
    tables: 18,
    pos: 2,
    staff: 12,
    manager: 'Rahul Sharma',
    managerId: 1,
    todaySales: 24800,
    monthSales: 628000,
    orders: 84,
    pendingOrders: 6,
    status: 'active',
  },
  {
    id: 2,
    name: 'Artisan Brew — Indiranagar',
    location: 'Indiranagar, Bengaluru',
    phone: '+91 98765 43211',
    gst: '29ABCDE1234F2Z6',
    currency: 'INR',
    opening: '07:30',
    closing: '22:30',
    tables: 14,
    pos: 2,
    staff: 9,
    manager: 'Priya Nair',
    managerId: 2,
    todaySales: 18600,
    monthSales: 496000,
    orders: 61,
    pendingOrders: 4,
    status: 'active',
  },
  {
    id: 3,
    name: 'Artisan Brew — HSR Layout',
    location: 'HSR Layout, Bengaluru',
    phone: '+91 98765 43212',
    gst: '29ABCDE1234F3Z7',
    currency: 'INR',
    opening: '08:00',
    closing: '22:00',
    tables: 10,
    pos: 1,
    staff: 7,
    manager: 'Amit Patel',
    managerId: 3,
    todaySales: 11200,
    monthSales: 310000,
    orders: 43,
    pendingOrders: 2,
    status: 'active',
  },
  {
    id: 4,
    name: 'Artisan Brew — Whitefield',
    location: 'Whitefield, Bengaluru',
    phone: '+91 98765 43213',
    gst: '29ABCDE1234F4Z8',
    currency: 'INR',
    opening: '08:00',
    closing: '22:00',
    tables: 16,
    pos: 2,
    staff: 10,
    manager: 'Sneha Reddy',
    managerId: 4,
    todaySales: 0,
    monthSales: 0,
    orders: 0,
    pendingOrders: 0,
    status: 'inactive',
  },
]

// ── Staff ──────────────────────────────────────────────────────────────────
export const OWNER_STAFF = [
  { id: 1,  name: 'Rahul Sharma',  role: 'manager', branch: 'Koramangala',  branchId: 1, email: 'rahul@artisanbrew.com',  phone: '+91 98765 43210', status: 'active',   performance: 92, joined: '2024-03-15' },
  { id: 2,  name: 'Priya Nair',    role: 'manager', branch: 'Indiranagar',  branchId: 2, email: 'priya@artisanbrew.com',  phone: '+91 98765 43211', status: 'active',   performance: 88, joined: '2024-04-01' },
  { id: 3,  name: 'Amit Patel',    role: 'manager', branch: 'HSR Layout',   branchId: 3, email: 'amit@artisanbrew.com',   phone: '+91 98765 43212', status: 'active',   performance: 85, joined: '2024-06-10' },
  { id: 4,  name: 'Sneha Reddy',   role: 'manager', branch: 'Whitefield',   branchId: 4, email: 'sneha@artisanbrew.com',  phone: '+91 98765 43213', status: 'inactive', performance: 79, joined: '2024-07-20' },
  { id: 5,  name: 'Kiran Kumar',   role: 'pos',     branch: 'Koramangala',  branchId: 1, email: 'kiran@artisanbrew.com',  phone: '+91 99887 76655', status: 'active',   performance: 91, joined: '2024-05-01' },
  { id: 6,  name: 'Ananya Singh',  role: 'pos',     branch: 'Indiranagar',  branchId: 2, email: 'ananya@artisanbrew.com', phone: '+91 99887 76656', status: 'active',   performance: 87, joined: '2024-05-15' },
  { id: 7,  name: 'Deepak Raj',    role: 'waiter',  branch: 'Koramangala',  branchId: 1, email: 'deepak@artisanbrew.com', phone: '+91 99887 76657', status: 'active',   performance: 83, joined: '2024-08-01' },
  { id: 8,  name: 'Meera Das',     role: 'waiter',  branch: 'Koramangala',  branchId: 1, email: 'meera@artisanbrew.com',  phone: '+91 99887 76658', status: 'active',   performance: 80, joined: '2024-08-10' },
  { id: 9,  name: 'Suresh Bhat',   role: 'waiter',  branch: 'Indiranagar',  branchId: 2, email: 'suresh@artisanbrew.com', phone: '+91 99887 76659', status: 'active',   performance: 82, joined: '2024-09-01' },
  { id: 10, name: 'Lakshmi P',     role: 'kitchen', branch: 'Koramangala',  branchId: 1, email: 'lakshmi@artisanbrew.com',phone: '+91 99887 76660', status: 'active',   performance: 90, joined: '2024-04-15' },
  { id: 11, name: 'Ravi Shankar',  role: 'kitchen', branch: 'Indiranagar',  branchId: 2, email: 'ravi@artisanbrew.com',   phone: '+91 99887 76661', status: 'active',   performance: 86, joined: '2024-05-20' },
  { id: 12, name: 'Fatima Sheikh', role: 'other',   branch: 'Koramangala',  branchId: 1, email: 'fatima@artisanbrew.com', phone: '+91 99887 76662', status: 'active',   performance: 78, joined: '2024-10-01' },
]

// ── POS Terminals ─────────────────────────────────────────────────────────
export const OWNER_POS_TERMINALS = [
  { id: 1, terminal: 'POS-01', branch: 'Koramangala',  branchId: 1, assignedUser: 'Kiran Kumar',  userId: 5, status: 'active',   lastActive: '2 min ago',   todaySales: 14200 },
  { id: 2, terminal: 'POS-02', branch: 'Koramangala',  branchId: 1, assignedUser: 'Deepak Raj',   userId: 7, status: 'active',   lastActive: '5 min ago',   todaySales: 10600 },
  { id: 3, terminal: 'POS-03', branch: 'Indiranagar',  branchId: 2, assignedUser: 'Ananya Singh', userId: 6, status: 'active',   lastActive: '1 min ago',   todaySales: 10400 },
  { id: 4, terminal: 'POS-04', branch: 'Indiranagar',  branchId: 2, assignedUser: '—',            userId: null, status: 'idle', lastActive: '3 hrs ago',   todaySales: 8200  },
  { id: 5, terminal: 'POS-05', branch: 'HSR Layout',   branchId: 3, assignedUser: 'Suresh Bhat',  userId: 9, status: 'active',   lastActive: '8 min ago',   todaySales: 11200 },
  { id: 6, terminal: 'POS-06', branch: 'Whitefield',   branchId: 4, assignedUser: '—',            userId: null, status: 'offline', lastActive: '2 days ago', todaySales: 0    },
]

// ── Menu / Products ───────────────────────────────────────────────────────
export const OWNER_MENU_CATEGORIES = ['Hot Coffee', 'Cold Coffee', 'Tea', 'Smoothies', 'Snacks', 'Desserts', 'Meals']

export const OWNER_MENU_ITEMS = [
  { id: 1,  name: 'Espresso',          category: 'Hot Coffee',  price: 180, branches: [1,2,3,4], status: 'active' },
  { id: 2,  name: 'Cappuccino',        category: 'Hot Coffee',  price: 220, branches: [1,2,3,4], status: 'active' },
  { id: 3,  name: 'Flat White',        category: 'Hot Coffee',  price: 240, branches: [1,2,3],   status: 'active' },
  { id: 4,  name: 'Cold Brew',         category: 'Cold Coffee', price: 260, branches: [1,2,3,4], status: 'active' },
  { id: 5,  name: 'Iced Latte',        category: 'Cold Coffee', price: 280, branches: [1,2,3,4], status: 'active' },
  { id: 6,  name: 'Frappuccino',       category: 'Cold Coffee', price: 320, branches: [1,2],     status: 'active' },
  { id: 7,  name: 'Masala Chai',       category: 'Tea',         price: 120, branches: [1,2,3,4], status: 'active' },
  { id: 8,  name: 'Green Tea',         category: 'Tea',         price: 150, branches: [1,2,3,4], status: 'active' },
  { id: 9,  name: 'Mango Smoothie',    category: 'Smoothies',   price: 220, branches: [1,2,3],   status: 'active' },
  { id: 10, name: 'Berry Blast',       category: 'Smoothies',   price: 240, branches: [1,2],     status: 'inactive' },
  { id: 11, name: 'Croissant',         category: 'Snacks',      price: 180, branches: [1,2,3,4], status: 'active' },
  { id: 12, name: 'Avocado Toast',     category: 'Snacks',      price: 280, branches: [1,2],     status: 'active' },
  { id: 13, name: 'Chocolate Muffin',  category: 'Desserts',    price: 160, branches: [1,2,3,4], status: 'active' },
  { id: 14, name: 'Cheesecake Slice',  category: 'Desserts',    price: 220, branches: [1,2],     status: 'active' },
  { id: 15, name: 'All-Day Breakfast', category: 'Meals',       price: 380, branches: [1,2,3],   status: 'active' },
]

// ── Orders (cross-branch) ─────────────────────────────────────────────────
export const OWNER_ORDERS = [
  { id: 'ORD-1084', branch: 'Koramangala', branchId: 1, channel: 'DINE-IN',  table: 'T-05', waiter: 'Deepak Raj',  amount: 680,  payment: 'UPI',   payStatus: 'paid',    status: 'COMPLETED', time: '9:32 PM' },
  { id: 'ORD-1083', branch: 'Indiranagar', branchId: 2, channel: 'SWIGGY',   table: '—',    waiter: '—',            amount: 520,  payment: 'Online', payStatus: 'paid',   status: 'PREPARING', time: '9:28 PM' },
  { id: 'ORD-1082', branch: 'Koramangala', branchId: 1, channel: 'DINE-IN',  table: 'T-08', waiter: 'Meera Das',   amount: 1240, payment: 'Card',  payStatus: 'pending', status: 'SERVED',    time: '9:18 PM' },
  { id: 'ORD-1081', branch: 'HSR Layout',  branchId: 3, channel: 'TAKEAWAY', table: '—',    waiter: 'Suresh Bhat', amount: 340,  payment: 'Cash',  payStatus: 'paid',    status: 'COMPLETED', time: '9:10 PM' },
  { id: 'ORD-1080', branch: 'Indiranagar', branchId: 2, channel: 'ZOMATO',   table: '—',    waiter: '—',            amount: 860,  payment: 'Online', payStatus: 'paid',   status: 'COMPLETED', time: '9:02 PM' },
  { id: 'ORD-1079', branch: 'Koramangala', branchId: 1, channel: 'DINE-IN',  table: 'T-03', waiter: 'Deepak Raj',  amount: 1560, payment: 'UPI',   payStatus: 'paid',    status: 'COMPLETED', time: '8:55 PM' },
  { id: 'ORD-1078', branch: 'Koramangala', branchId: 1, channel: 'DINE-IN',  table: 'T-12', waiter: 'Meera Das',   amount: 920,  payment: '—',     payStatus: 'pending', status: 'PREPARING', time: '8:48 PM' },
  { id: 'ORD-1077', branch: 'HSR Layout',  branchId: 3, channel: 'DINE-IN',  table: 'T-04', waiter: 'Suresh Bhat', amount: 480,  payment: 'Cash',  payStatus: 'paid',    status: 'COMPLETED', time: '8:40 PM' },
  { id: 'ORD-1076', branch: 'Indiranagar', branchId: 2, channel: 'DINE-IN',  table: 'T-07', waiter: 'Ananya Singh',amount: 1120, payment: 'Card',  payStatus: 'paid',    status: 'COMPLETED', time: '8:30 PM' },
  { id: 'ORD-1075', branch: 'Koramangala', branchId: 1, channel: 'SWIGGY',   table: '—',    waiter: '—',            amount: 640,  payment: 'Online', payStatus: 'paid',   status: 'COMPLETED', time: '8:20 PM' },
]

// ── Billing ───────────────────────────────────────────────────────────────
export const OWNER_BILLS = [
  { id: 'INV-2084', branch: 'Koramangala', order: 'ORD-1084', amount: 680,  method: 'UPI',    status: 'paid',      date: '20 Aug 2026' },
  { id: 'INV-2083', branch: 'Indiranagar', order: 'ORD-1083', amount: 520,  method: 'Online', status: 'paid',      date: '20 Aug 2026' },
  { id: 'INV-2082', branch: 'Koramangala', order: 'ORD-1082', amount: 1240, method: 'Card',   status: 'pending',   date: '20 Aug 2026' },
  { id: 'INV-2081', branch: 'HSR Layout',  order: 'ORD-1081', amount: 340,  method: 'Cash',   status: 'paid',      date: '20 Aug 2026' },
  { id: 'INV-2080', branch: 'Indiranagar', order: 'ORD-1080', amount: 860,  method: 'Online', status: 'paid',      date: '20 Aug 2026' },
  { id: 'INV-2079', branch: 'Koramangala', order: 'ORD-1079', amount: 1560, method: 'UPI',    status: 'paid',      date: '20 Aug 2026' },
  { id: 'INV-2078', branch: 'Koramangala', order: 'ORD-1078', amount: 920,  method: '—',      status: 'pending',   date: '20 Aug 2026' },
  { id: 'INV-2077', branch: 'HSR Layout',  order: 'ORD-1077', amount: 480,  method: 'Cash',   status: 'paid',      date: '20 Aug 2026' },
  { id: 'INV-2076', branch: 'Indiranagar', order: 'ORD-1076', amount: 1120, method: 'Card',   status: 'paid',      date: '20 Aug 2026' },
  { id: 'INV-2075', branch: 'Koramangala', order: 'ORD-1075', amount: 640,  method: 'Online', status: 'paid',      date: '20 Aug 2026' },
  { id: 'INV-2060', branch: 'Koramangala', order: 'ORD-1060', amount: 380,  method: 'Cash',   status: 'cancelled', date: '19 Aug 2026' },
]

// ── Payments ──────────────────────────────────────────────────────────────
export const OWNER_PAYMENTS = [
  { id: 'PAY-5084', branch: 'Koramangala', invoice: 'INV-2084', amount: 680,  method: 'UPI',    pos: 'POS-01 / Kiran',  status: 'success', date: '20 Aug 2026' },
  { id: 'PAY-5083', branch: 'Indiranagar', invoice: 'INV-2083', amount: 520,  method: 'Online', pos: 'Swiggy Gateway',   status: 'success', date: '20 Aug 2026' },
  { id: 'PAY-5081', branch: 'HSR Layout',  invoice: 'INV-2081', amount: 340,  method: 'Cash',   pos: 'POS-05 / Suresh',  status: 'success', date: '20 Aug 2026' },
  { id: 'PAY-5080', branch: 'Indiranagar', invoice: 'INV-2080', amount: 860,  method: 'Online', pos: 'Zomato Gateway',   status: 'success', date: '20 Aug 2026' },
  { id: 'PAY-5079', branch: 'Koramangala', invoice: 'INV-2079', amount: 1560, method: 'UPI',    pos: 'POS-01 / Kiran',  status: 'success', date: '20 Aug 2026' },
  { id: 'PAY-5077', branch: 'HSR Layout',  invoice: 'INV-2077', amount: 480,  method: 'Cash',   pos: 'POS-05 / Suresh',  status: 'success', date: '20 Aug 2026' },
  { id: 'PAY-5076', branch: 'Indiranagar', invoice: 'INV-2076', amount: 1120, method: 'Card',   pos: 'POS-03 / Ananya',  status: 'success', date: '20 Aug 2026' },
  { id: 'PAY-5075', branch: 'Koramangala', invoice: 'INV-2075', amount: 640,  method: 'Online', pos: 'Swiggy Gateway',   status: 'success', date: '20 Aug 2026' },
]

// ── Inventory ─────────────────────────────────────────────────────────────
export const OWNER_INVENTORY = [
  { id: 1,  product: 'Coffee Beans (Arabica)',   branch: 'Koramangala', stock: 4.2,  unit: 'kg',  minStock: 2,   status: 'ok' },
  { id: 2,  product: 'Coffee Beans (Arabica)',   branch: 'Indiranagar', stock: 1.1,  unit: 'kg',  minStock: 2,   status: 'low' },
  { id: 3,  product: 'Coffee Beans (Arabica)',   branch: 'HSR Layout',  stock: 3.0,  unit: 'kg',  minStock: 1.5, status: 'ok' },
  { id: 4,  product: 'Whole Milk',              branch: 'Koramangala', stock: 18,   unit: 'L',   minStock: 10,  status: 'ok' },
  { id: 5,  product: 'Whole Milk',              branch: 'Indiranagar', stock: 6,    unit: 'L',   minStock: 8,   status: 'low' },
  { id: 6,  product: 'Oat Milk',               branch: 'Koramangala', stock: 0,    unit: 'L',   minStock: 4,   status: 'out' },
  { id: 7,  product: 'Sugar (Brown)',           branch: 'Koramangala', stock: 12,   unit: 'kg',  minStock: 5,   status: 'ok' },
  { id: 8,  product: 'Croissants',             branch: 'Koramangala', stock: 24,   unit: 'pcs', minStock: 10,  status: 'ok' },
  { id: 9,  product: 'Croissants',             branch: 'Indiranagar', stock: 8,    unit: 'pcs', minStock: 10,  status: 'low' },
  { id: 10, product: 'Chocolate Syrup',         branch: 'Koramangala', stock: 2.4,  unit: 'L',   minStock: 1,   status: 'ok' },
  { id: 11, product: 'Disposable Cups (12oz)',  branch: 'HSR Layout',  stock: 60,   unit: 'pcs', minStock: 50,  status: 'ok' },
  { id: 12, product: 'Napkins',                branch: 'Koramangala', stock: 200,  unit: 'pcs', minStock: 100, status: 'ok' },
]

// ── Expenses ──────────────────────────────────────────────────────────────
export const OWNER_EXPENSE_CATEGORIES = ['Utilities', 'Salary', 'Raw Materials', 'Marketing', 'Maintenance', 'Rent', 'Other']

export const OWNER_EXPENSES = [
  { id: 1,  name: 'Electricity Bill',      branch: 'Koramangala', category: 'Utilities',      amount: 8400,  addedBy: 'Rahul Sharma', date: '20 Aug 2026', status: 'approved' },
  { id: 2,  name: 'Raw Material Purchase', branch: 'Koramangala', category: 'Raw Materials',  amount: 12600, addedBy: 'Rahul Sharma', date: '20 Aug 2026', status: 'approved' },
  { id: 3,  name: 'Staff Salary — Aug',    branch: 'Indiranagar', category: 'Salary',         amount: 85000, addedBy: 'Priya Nair',   date: '20 Aug 2026', status: 'pending' },
  { id: 4,  name: 'Google Ads',            branch: 'Koramangala', category: 'Marketing',      amount: 5000,  addedBy: 'Rahul Sharma', date: '19 Aug 2026', status: 'approved' },
  { id: 5,  name: 'AC Servicing',          branch: 'HSR Layout',  category: 'Maintenance',    amount: 2800,  addedBy: 'Amit Patel',   date: '19 Aug 2026', status: 'approved' },
  { id: 6,  name: 'Monthly Rent',          branch: 'Indiranagar', category: 'Rent',           amount: 45000, addedBy: 'Priya Nair',   date: '18 Aug 2026', status: 'approved' },
  { id: 7,  name: 'Coffee Bean Restock',   branch: 'Indiranagar', category: 'Raw Materials',  amount: 9800,  addedBy: 'Priya Nair',   date: '18 Aug 2026', status: 'approved' },
  { id: 8,  name: 'Monthly Rent',          branch: 'Koramangala', category: 'Rent',           amount: 62000, addedBy: 'Rahul Sharma', date: '17 Aug 2026', status: 'approved' },
  { id: 9,  name: 'Equipment Repair',      branch: 'Koramangala', category: 'Maintenance',    amount: 1500,  addedBy: 'Rahul Sharma', date: '17 Aug 2026', status: 'approved' },
  { id: 10, name: 'Water Cans',            branch: 'HSR Layout',  category: 'Utilities',      amount: 400,   addedBy: 'Amit Patel',   date: '16 Aug 2026', status: 'approved' },
]

// ── Customers ─────────────────────────────────────────────────────────────
export const OWNER_CUSTOMERS = [
  { id: 1,  name: 'Aditya Kumar',    phone: '+91 98001 11001', whatsapp: true,  orders: 28, spending: 12400, lastVisit: '20 Aug 2026', branch: 'Koramangala', favourites: ['Cappuccino', 'Croissant'] },
  { id: 2,  name: 'Riya Mehta',      phone: '+91 98001 11002', whatsapp: true,  orders: 19, spending: 8600,  lastVisit: '19 Aug 2026', branch: 'Indiranagar', favourites: ['Iced Latte', 'Mango Smoothie'] },
  { id: 3,  name: 'Sohail Mirza',    phone: '+91 98001 11003', whatsapp: false, orders: 35, spending: 16200, lastVisit: '20 Aug 2026', branch: 'Koramangala', favourites: ['Cold Brew', 'All-Day Breakfast'] },
  { id: 4,  name: 'Pooja Iyer',      phone: '+91 98001 11004', whatsapp: true,  orders: 12, spending: 4800,  lastVisit: '18 Aug 2026', branch: 'HSR Layout',  favourites: ['Masala Chai', 'Chocolate Muffin'] },
  { id: 5,  name: 'Naveen Krishnan', phone: '+91 98001 11005', whatsapp: true,  orders: 44, spending: 21000, lastVisit: '20 Aug 2026', branch: 'Koramangala', favourites: ['Flat White', 'Avocado Toast'] },
  { id: 6,  name: 'Divya Nambiar',   phone: '+91 98001 11006', whatsapp: false, orders: 8,  spending: 2900,  lastVisit: '15 Aug 2026', branch: 'Indiranagar', favourites: ['Green Tea', 'Cheesecake Slice'] },
  { id: 7,  name: 'Rohit Verma',     phone: '+91 98001 11007', whatsapp: true,  orders: 22, spending: 9600,  lastVisit: '20 Aug 2026', branch: 'Koramangala', favourites: ['Espresso', 'Croissant'] },
  { id: 8,  name: 'Kavitha S',       phone: '+91 98001 11008', whatsapp: true,  orders: 16, spending: 7200,  lastVisit: '17 Aug 2026', branch: 'HSR Layout',  favourites: ['Cappuccino', 'Green Tea'] },
]

// ── Reports / Chart Data ──────────────────────────────────────────────────
export const OWNER_CHART_DATA = {
  today: [
    { label: '8am',  value: 1200 },
    { label: '9am',  value: 2800 },
    { label: '10am', value: 3400 },
    { label: '11am', value: 4100 },
    { label: '12pm', value: 6200 },
    { label: '1pm',  value: 7800 },
    { label: '2pm',  value: 5600 },
    { label: '3pm',  value: 4200 },
    { label: '4pm',  value: 5100 },
    { label: '5pm',  value: 6400 },
    { label: '6pm',  value: 7200 },
    { label: '7pm',  value: 8600 },
    { label: '8pm',  value: 7400 },
    { label: '9pm',  value: 4600 },
  ],
  yesterday: [
    { label: '8am',  value: 900  },
    { label: '9am',  value: 2400 },
    { label: '10am', value: 3100 },
    { label: '11am', value: 3800 },
    { label: '12pm', value: 5900 },
    { label: '1pm',  value: 7400 },
    { label: '2pm',  value: 5200 },
    { label: '3pm',  value: 3900 },
    { label: '4pm',  value: 4700 },
    { label: '5pm',  value: 5800 },
    { label: '6pm',  value: 6900 },
    { label: '7pm',  value: 8100 },
    { label: '8pm',  value: 6800 },
    { label: '9pm',  value: 4100 },
  ],
  week: [
    { label: 'Mon', value: 48000 },
    { label: 'Tue', value: 52000 },
    { label: 'Wed', value: 49000 },
    { label: 'Thu', value: 55000 },
    { label: 'Fri', value: 68000 },
    { label: 'Sat', value: 76000 },
    { label: 'Sun', value: 58000 },
  ],
  month: [
    { label: 'W1', value: 280000 },
    { label: 'W2', value: 310000 },
    { label: 'W3', value: 298000 },
    { label: 'W4', value: 346000 },
  ],
}

// ── Dashboard Summary ─────────────────────────────────────────────────────
export const OWNER_DASHBOARD_STATS = {
  todaySales:    54600,
  totalOrders:   188,
  paidBills:     174,
  pendingBills:  14,
  todayExpenses: 21000,
  netSales:      33600,
  activeBranches: 3,
  totalStaff:    38,
}

export const OWNER_RECENT_ACTIVITY = [
  { id: 1, icon: '🛎️', title: 'New order #ORD-1084 at Koramangala', time: '2 min ago' },
  { id: 2, icon: '✅', title: 'Bill INV-2083 paid — ₹520 via Swiggy', time: '4 min ago' },
  { id: 3, icon: '👤', title: 'Rahul Sharma added expense ₹12,600', time: '18 min ago' },
  { id: 4, icon: '📦', title: 'Low stock alert: Oat Milk at Koramangala', time: '42 min ago' },
  { id: 5, icon: '🏪', title: 'HSR Layout branch: 43 orders today', time: '1 hr ago' },
  { id: 6, icon: '💳', title: 'Payment PAY-5079 — ₹1,560 via UPI', time: '1.5 hr ago' },
]
