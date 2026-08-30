import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from menu.models import Category, Product, Table, WaiterRequest
from orders.models import Order, OrderItem, Invoice, Payment, Expense
from accounts.models import UserProfile, Waiter, Cashier, KitchenStaff, POSTerminal

models = {
    'Category': Category,
    'Product': Product,
    'Table': Table,
    'WaiterRequest': WaiterRequest,
    'Order': Order,
    'Expense': Expense,
    'POSTerminal': POSTerminal,
    'Waiter': Waiter,
    'Cashier': Cashier,
    'KitchenStaff': KitchenStaff,
    'UserProfile': UserProfile
}

print("Orphan Records Count:")
for name, model in models.items():
    if hasattr(model, 'branch'):
        # For UserProfile, branch might be null for Admin. We shouldn't delete admin profiles.
        orphan_qs = model.objects.filter(branch__isnull=True)
        if name == 'UserProfile':
            orphan_qs = orphan_qs.exclude(role='ADMIN')
        count = orphan_qs.count()
        print(f"{name}: {count}")

# Check orders derived models
orphan_order_items = OrderItem.objects.filter(order__branch__isnull=True).count()
orphan_invoices = Invoice.objects.filter(order__branch__isnull=True).count()
orphan_payments = Payment.objects.filter(order__branch__isnull=True).count()
print(f"OrderItem (from orphan order): {orphan_order_items}")
print(f"Invoice (from orphan order): {orphan_invoices}")
print(f"Payment (from orphan order): {orphan_payments}")
