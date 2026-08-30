import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from django.test import RequestFactory
from accounts.models import UserProfile
from orders.views import OrderViewSet
factory = RequestFactory()
request = factory.get('/api/v1/orders/?branch=4')
request.user = UserProfile.objects.filter(role='ADMIN').first()
view = OrderViewSet.as_view({'get': 'list'})
response = view(request)
data = response.data.get("results", response.data) if hasattr(response.data, "get") else response.data
print(f'Branch 4 count: {len(data)}')
print(f'Branch 4 items: {[d["id"] for d in data]}')

request3 = factory.get('/api/v1/orders/')
request3.user = UserProfile.objects.filter(role='ADMIN').first()
response3 = view(request3)
data3 = response3.data.get("results", response3.data) if hasattr(response3.data, "get") else response3.data
print(f'All count: {len(data3)}')
print(f'All items: {[d["id"] for d in data3]}')
