import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from accounts.models import Waiter, Cashier, KitchenStaff
from menu.models import Product, Category, Table
from orders.models import Order, Expense

print("=== Unassigned Records Analysis ===")
print(f"Waiters: {Waiter.objects.filter(branch__isnull=True).count()}")
print(f"Cashiers: {Cashier.objects.filter(branch__isnull=True).count()}")
print(f"Kitchen Staff: {KitchenStaff.objects.filter(branch__isnull=True).count()}")
print(f"Products: {Product.objects.filter(branch__isnull=True).count()}")
print(f"Categories: {Category.objects.filter(branch__isnull=True).count()}")
print(f"Tables: {Table.objects.filter(branch__isnull=True).count()}")
print(f"Orders: {Order.objects.filter(branch__isnull=True).count()}")
print(f"Expenses: {Expense.objects.filter(branch__isnull=True).count()}")

print("\n=== Assigned Records (Safe) ===")
print(f"Waiters: {Waiter.objects.filter(branch__isnull=False).count()}")
print(f"Orders: {Order.objects.filter(branch__isnull=False).count()}")
