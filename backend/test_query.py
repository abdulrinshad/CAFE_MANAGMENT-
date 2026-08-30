import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from orders.models import Order
from accounts.models import Branch

print("Total orders:", Order.objects.count())
print("Orders with branch_id=4:", Order.objects.filter(branch_id=4).count())
for b in Branch.objects.all():
    print(b.name, Order.objects.filter(branch=b).count())
