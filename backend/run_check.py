from menu.models import Category, Product, Table
from orders.models import Order, Expense, Payment
from accounts.models import Branch, Waiter, Cashier, Customer
from django.db.models import Count

print('--- Branches ---')
for b in Branch.objects.all():
    print(f'Branch {b.id}: {b.name}')

print('\n--- Orders Branch Count ---')
for b in Order.objects.values('branch_id').annotate(c=Count('id')):
    print(f'Branch {b["branch_id"]}: {b["c"]} orders')

print('\n--- Tables Branch Count ---')
for b in Table.objects.values('branch_id').annotate(c=Count('id')):
    print(f'Branch {b["branch_id"]}: {b["c"]} tables')

print('\n--- Expenses Branch Count ---')
for b in Expense.objects.values('branch_id').annotate(c=Count('id')):
    print(f'Branch {b["branch_id"]}: {b["c"]} expenses')

print('\n--- Products Branch Count ---')
for b in Product.objects.values('branch_id').annotate(c=Count('id')):
    print(f'Branch {b["branch_id"]}: {b["c"]} products')
