import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from menu.models import Category, Product, Table, QRCode, WaiterRequest
from orders.models import Order, Expense, Payment, Invoice
from accounts.models import Branch, Waiter, Cashier
from django.db import transaction

@transaction.atomic
def fix_branches():
    # 1. Tables
    # Try to determine from current_order_ref or something?
    # If not, let's leave them if we can't find out.
    tables_fixed = 0
    for t in Table.objects.filter(branch__isnull=True):
        # We don't have much to go on. Maybe it has an order with a branch?
        # A table without a branch is probably global.
        pass
    
    # Waiter to branch mapping
    waiter_branches = {w.name: w.branch_id for w in Waiter.objects.all() if w.branch_id}
    cashier_branches = {c.name: c.branch_id for c in Cashier.objects.all() if c.branch_id}

    # 2. Orders
    orders_fixed = 0
    for o in Order.objects.filter(branch__isnull=True):
        branch_id = None
        
        # Priority 1: From table
        if o.table and o.table.branch_id:
            branch_id = o.table.branch_id
        # Priority 2: From waiter
        elif o.waiter_name and o.waiter_name in waiter_branches:
            branch_id = waiter_branches[o.waiter_name]
        # Priority 3: From cashier
        elif o.cashier_name and o.cashier_name in cashier_branches:
            branch_id = cashier_branches[o.cashier_name]
            
        if branch_id:
            o.branch_id = branch_id
            o.save(update_fields=['branch'])
            orders_fixed += 1

    print(f"Fixed {orders_fixed} Orders")

    # 3. WaiterRequests (they have table)
    reqs_fixed = 0
    for wr in WaiterRequest.objects.filter(branch__isnull=True):
        if wr.table and wr.table.branch_id:
            wr.branch_id = wr.table.branch_id
            wr.save(update_fields=['branch'])
            reqs_fixed += 1
    print(f"Fixed {reqs_fixed} WaiterRequests")

if __name__ == '__main__':
    fix_branches()
