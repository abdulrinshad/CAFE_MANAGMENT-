import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from menu.models import Category, Product, Table, QRCode, WaiterRequest
from orders.models import Order, OrderItem, Invoice, Payment, Expense
from accounts.models import Waiter, Cashier, BranchManager, POSTerminal, OwnerSettings
from notifications.models import Notification, Conversation, ConversationMessage

def clean_orphans():
    print("Starting orphan cleanup...")

    # 1. Orders without a branch
    orphaned_orders = Order.objects.filter(branch__isnull=True)
    count_o = 0
    for order in orphaned_orders:
        branch_to_assign = None
        if order.table and order.table.branch:
            branch_to_assign = order.table.branch
        if branch_to_assign:
            order.branch = branch_to_assign
            order.save(update_fields=['branch'])
            count_o += 1
        else:
            print(f"Deleting unresolvable orphaned order {order.id}")
            order.delete()
    print(f"Resolved {count_o} orphaned orders.")

    # 2. Expenses without a branch
    orphaned_expenses = Expense.objects.filter(branch__isnull=True)
    count_e = orphaned_expenses.count()
    if count_e > 0:
        print(f"Deleting {count_e} orphaned expenses...")
        orphaned_expenses.delete()

    # 3. Tables without a branch
    orphaned_tables = Table.objects.filter(branch__isnull=True)
    count_t = orphaned_tables.count()
    if count_t > 0:
        print(f"Deleting {count_t} orphaned tables...")
        orphaned_tables.delete()

    # 4. Categories without a branch
    orphaned_cats = Category.objects.filter(branch__isnull=True)
    count_c = orphaned_cats.count()
    if count_c > 0:
        print(f"Deleting {count_c} orphaned categories...")
        orphaned_cats.delete()

    # 5. Products without a branch
    orphaned_prods = Product.objects.filter(branch__isnull=True)
    count_p = orphaned_prods.count()
    if count_p > 0:
        print(f"Deleting {count_p} orphaned products...")
        orphaned_prods.delete()
        
    # 6. Notifications without a branch
    orphaned_notifs = Notification.objects.filter(branch__isnull=True)
    count_n = 0
    for n in orphaned_notifs:
        if n.target_role == 'admin' or n.type in ['owner_message', 'system_alert']:
            continue # These can be global
        b = None
        if n.table and n.table.branch: b = n.table.branch
        elif n.order and n.order.branch: b = n.order.branch
        
        if b:
            n.branch = b
            n.save(update_fields=['branch'])
            count_n += 1
        else:
            if not getattr(n, 'recipient', None):
                n.delete()
    print(f"Resolved {count_n} orphaned notifications.")

    # 7. Waiter requests
    orphaned_reqs = WaiterRequest.objects.filter(branch__isnull=True)
    count_r = 0
    for r in orphaned_reqs:
        if r.table and r.table.branch:
            r.branch = r.table.branch
            r.save(update_fields=['branch'])
            count_r += 1
        else:
            r.delete()
    print(f"Resolved {count_r} orphaned waiter requests.")

    print("Orphan cleanup completed.")

if __name__ == '__main__':
    clean_orphans()
