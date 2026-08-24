import { request } from '../api';

export const branchManagerService = {
  async getDashboardStats() {
    return request('GET', '/branch/dashboard/');
  },

  async getBranchInfo() {
    return request('GET', '/branch/settings/');
  },

  async updateBranchSettings(data) {
    return request('PATCH', '/branch/settings/', data);
  },

  // ── Staff Management ──
  async getStaff() {
    return request('GET', '/branch/staff/');
  },

  async addStaff(member) {
    return request('POST', '/branch/staff/', member);
  },

  async editStaff(id, data) {
    return request('PATCH', `/branch/staff/${id}/`, data);
  },

  async updateStaff(id, data) {
    if (Object.prototype.hasOwnProperty.call(data, 'status') || data.status) {
      return request('PATCH', `/branch/staff/${id}/status/`, data);
    }
    return request('PATCH', `/branch/staff/${id}/`, data);
  },

  async deleteStaff(id) {
    const roleType = id.split('_')[0];
    const rawId = id.split('_')[1];
    if (roleType === 'waiter') {
      return request('DELETE', `/waiters/${rawId}/`);
    } else if (roleType === 'cashier') {
      return request('DELETE', `/cashiers/${rawId}/`);
    } else {
      return request('DELETE', `/branch/staff/${id}/`);
    }
  },


  // ── Table Management ──
  async getTables() {
    return request('GET', '/branch/tables/');
  },

  async addTable(table) {
    return request('POST', '/branch/tables/', table);
  },

  async updateTable(id, data) {
    return request('PATCH', `/branch/tables/${id}/`, data);
  },

  async deleteTable(id) {
    return request('DELETE', `/branch/tables/${id}/`);
  },

  // ── Order Management ──
  async getOrders() {
    return request('GET', '/branch/orders/');
  },

  async getKitchenOrders() {
    return request('GET', '/branch/kitchen/orders/');
  },

  async updateOrderStatus(id, newStatus) {
    return request('PATCH', `/branch/orders/${id}/status/`, { status: newStatus });
  },

  // ── Menu Availability ──
  async getProducts() {
    return request('GET', '/branch/menu/');
  },

  async addProduct(product) {
    return request('POST', '/branch/menu/', product);
  },

  async toggleProductAvailability(id) {
    return request('PATCH', `/branch/menu/${id}/`);
  },

  // ── Inventory ──
  async getInventory() {
    return request('GET', '/branch/inventory/');
  },

  async addInventoryItem(item) {
    return request('POST', '/branch/inventory/', {
      name: item.name,
      currentStock: item.currentStock,
      minimumStock: item.minimumStock,
      unit: item.unit,
      cost: item.cost,
      category: item.category
    });
  },

  async adjustStock(id, type, qty, reason) {
    return request('PATCH', `/branch/inventory/${id}/`, { type, qty, reason });
  },

  // ── Expenses ──
  async getExpenses() {
    return request('GET', '/branch/expenses/');
  },

  async addExpense(expense) {
    return request('POST', '/branch/expenses/', expense);
  },

  // ── Customers ──
  async getCustomers() {
    return request('GET', '/branch/customers/');
  },

  // ── Reports ──
  async getReports(period) {
    return request('GET', `/branch/reports/?period=${period}`);
  },

  // ── Recent Activities ──
  async getActivities() {
    return [
      { id: '1', type: 'system', description: 'System online & connected to backend', time: 'Just now', icon: '⚡' }
    ];
  },

  addActivity(type, description, icon) {
    console.log(`Activity logged: ${type} - ${description}`);
  },

  // ── POS Terminals ──
  async getPOSTerminals() {
    return request('GET', '/branch/pos/');
  },
  async updatePOSTerminal(id, data) {
    return request('PATCH', `/branch/pos/${id}/`, data);
  },
  async updatePOSTerminalStatus(id, status) {
    return request('PATCH', `/branch/pos/${id}/status/`, { status });
  },
  async updatePOSTerminalCashier(id, cashierId) {
    return request('PATCH', `/branch/pos/${id}/cashier/`, { assignedCashierId: cashierId });
  }
};
