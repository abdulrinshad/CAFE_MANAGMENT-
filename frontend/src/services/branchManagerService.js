import {
  BRANCH_INFO,
  INITIAL_STAFF,
  INITIAL_TABLES,
  INITIAL_ORDERS,
  INITIAL_PRODUCTS,
  INITIAL_INVENTORY,
  INITIAL_EXPENSES,
  INITIAL_CUSTOMERS,
  RECENT_ACTIVITIES
} from '../data/branchMockData';

// Helper to initialize localStorage
const initStorage = (key, initialData) => {
  if (!localStorage.getItem(key)) {
    localStorage.setItem(key, JSON.stringify(initialData));
  }
  return JSON.parse(localStorage.getItem(key));
};

export const branchManagerService = {
  getBranchInfo() {
    return initStorage('kochi_branch_info', BRANCH_INFO);
  },

  updateBranchSettings(data) {
    const info = this.getBranchInfo();
    const updated = { ...info, ...data };
    localStorage.setItem('kochi_branch_info', JSON.stringify(updated));
    return updated;
  },

  // ── Staff Management ──
  getStaff() {
    return initStorage('kochi_staff', INITIAL_STAFF);
  },

  addStaff(member) {
    const staff = this.getStaff();
    const newMember = {
      id: `STF-${100 + staff.length + 1}`,
      joinedDate: new Date().toISOString().split('T')[0],
      status: 'active',
      ordersHandled: 0,
      tablesServed: 0,
      ...member
    };
    staff.push(newMember);
    localStorage.setItem('kochi_staff', JSON.stringify(staff));
    this.addActivity('staff', `Staff member ${newMember.name} added`, '👤');
    return newMember;
  },

  updateStaff(id, data) {
    let staff = this.getStaff();
    staff = staff.map(s => s.id === id ? { ...s, ...data } : s);
    localStorage.setItem('kochi_staff', JSON.stringify(staff));
    return staff.find(s => s.id === id);
  },

  deleteStaff(id) {
    let staff = this.getStaff();
    staff = staff.filter(s => s.id !== id);
    localStorage.setItem('kochi_staff', JSON.stringify(staff));
  },

  // ── Table Management ──
  getTables() {
    return initStorage('kochi_tables', INITIAL_TABLES);
  },

  addTable(table) {
    const tables = this.getTables();
    const newTable = {
      id: table.number || `T-${tables.length + 1}`,
      capacity: Number(table.capacity) || 4,
      status: 'available',
      qrStatus: 'active',
      assignedWaiter: 'Rahul K. S.',
      ...table
    };
    tables.push(newTable);
    localStorage.setItem('kochi_tables', JSON.stringify(tables));
    this.addActivity('table', `Table ${newTable.number} added`, '🪑');
    return newTable;
  },

  updateTable(id, data) {
    let tables = this.getTables();
    tables = tables.map(t => t.id === id ? { ...t, ...data } : t);
    localStorage.setItem('kochi_tables', JSON.stringify(tables));
    return tables.find(t => t.id === id);
  },

  deleteTable(id) {
    let tables = this.getTables();
    tables = tables.filter(t => t.id !== id);
    localStorage.setItem('kochi_tables', JSON.stringify(tables));
  },

  // ── Order Management ──
  getOrders() {
    return initStorage('kochi_orders', INITIAL_ORDERS);
  },

  updateOrderStatus(id, newStatus) {
    let orders = this.getOrders();
    orders = orders.map(o => o.id === id ? { ...o, status: newStatus } : o);
    localStorage.setItem('kochi_orders', JSON.stringify(orders));

    // Update table status if dine-in
    const order = orders.find(o => o.id === id);
    if (order && order.channel === 'Dine-In') {
      const tableId = order.table;
      let tStatus = 'available';
      if (newStatus === 'NEW') tStatus = 'occupied';
      else if (newStatus === 'PREPARING') tStatus = 'order_in_progress';
      else if (newStatus === 'READY') tStatus = 'bill_requested';
      else if (newStatus === 'COMPLETED') tStatus = 'available';
      this.updateTable(tableId, { status: tStatus });
    }

    this.addActivity('order', `Order #${id} status updated to ${newStatus}`, '🔄');
    return orders.find(o => o.id === id);
  },

  // ── Menu Availability ──
  getProducts() {
    return initStorage('kochi_products', INITIAL_PRODUCTS);
  },

  toggleProductAvailability(id) {
    let products = this.getProducts();
    products = products.map(p => p.id === id ? { ...p, branchStatus: !p.branchStatus } : p);
    localStorage.setItem('kochi_products', JSON.stringify(products));
    const p = products.find(prod => prod.id === id);
    this.addActivity('menu', `${p.name} is now ${p.branchStatus ? 'available' : 'unavailable'}`, '☕');
    return products;
  },

  // ── Inventory ──
  getInventory() {
    return initStorage('kochi_inventory', INITIAL_INVENTORY);
  },

  addInventoryItem(item) {
    const inv = this.getInventory();
    const newItem = {
      id: `INV-${10 + inv.length + 1}`,
      lastUpdated: 'Just now',
      currentStock: Number(item.currentStock) || 0,
      minimumStock: Number(item.minimumStock) || 0,
      cost: Number(item.cost) || 0,
      ...item
    };
    inv.push(newItem);
    localStorage.setItem('kochi_inventory', JSON.stringify(inv));
    this.addActivity('stock', `Inventory item ${newItem.name} added`, '📦');
    return newItem;
  },

  adjustStock(id, type, qty, reason) {
    let inv = this.getInventory();
    inv = inv.map(item => {
      if (item.id === id) {
        let newStock = item.currentStock;
        if (type === 'add') newStock += Number(qty);
        else if (type === 'remove') newStock = Math.max(0, newStock - Number(qty));
        else if (type === 'correction') newStock = Number(qty);
        return { ...item, currentStock: newStock, lastUpdated: 'Just now' };
      }
      return item;
    });
    localStorage.setItem('kochi_inventory', JSON.stringify(inv));
    const item = inv.find(i => i.id === id);
    this.addActivity('stock', `Adjusted stock for ${item.name} to ${item.currentStock} ${item.unit}`, '⚠️');
    return item;
  },

  // ── Expenses ──
  getExpenses() {
    return initStorage('kochi_expenses', INITIAL_EXPENSES);
  },

  addExpense(expense) {
    const expenses = this.getExpenses();
    const newExpense = {
      id: `EXP-${100 + expenses.length + 1}`,
      status: 'Pending',
      addedBy: 'Manager',
      date: new Date().toISOString().split('T')[0],
      reference: `REF-${Math.floor(100000 + Math.random() * 900000)}`,
      amount: Number(expense.amount) || 0,
      ...expense
    };
    expenses.push(newExpense);
    localStorage.setItem('kochi_expenses', JSON.stringify(expenses));
    this.addActivity('expense', `Expense added: ${newExpense.description} (₹${newExpense.amount})`, '💵');
    return newExpense;
  },

  // ── Customers ──
  getCustomers() {
    return initStorage('kochi_customers', INITIAL_CUSTOMERS);
  },

  // ── Recent Activities ──
  getActivities() {
    return initStorage('kochi_activities', RECENT_ACTIVITIES);
  },

  addActivity(type, description, icon) {
    const list = this.getActivities();
    list.unshift({
      id: `act-${Date.now()}`,
      type,
      description,
      time: 'Just now',
      icon
    });
    localStorage.setItem('kochi_activities', JSON.stringify(list.slice(0, 15)));
  }
};
