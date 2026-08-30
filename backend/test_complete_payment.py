import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from rest_framework.test import APIClient
from accounts.models import UserProfile
from orders.models import Order
client = APIClient()
user = UserProfile.objects.filter(role='ADMIN').first().user
client.force_authenticate(user=user)

order = Order.objects.filter(status='ready').first()
if order:
    res = client.post(f'/api/v1/orders/{order.id}/complete_payment/', {
        'method': 'cash',
        'status': 'paid'
    }, format='json')
    print(res.status_code)
    print(res.json())
else:
    print("No ready orders found")
