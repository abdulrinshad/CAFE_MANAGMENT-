import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from orders.models import Order
from django.db.models import Sum
qs = Order.objects.filter(status=Order.STATUS_COMPLETED)
print(f'Total Completed: {qs.count()}')
s = qs.aggregate(s=Sum('total'))['s']
print(f'Total Amount: {s}')
