import os
import sys
import django

# Add the parent directory of scratch to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.test import RequestFactory
from accounts.models import UserProfile
from orders.views import OrderViewSet
from rest_framework.test import force_authenticate

factory = RequestFactory()
admin_profile = UserProfile.objects.filter(role='ADMIN').first()
admin_user = admin_profile.user

view = OrderViewSet.as_view({'get': 'list'})

for branch_val in ['1', '2', '3', 'all', None]:
    if branch_val:
        request = factory.get(f'/api/v1/orders/?branch={branch_val}')
    else:
        request = factory.get('/api/v1/orders/')
    
    force_authenticate(request, user=admin_user)
    response = view(request)
    print(f"Query branch={branch_val} -> status: {response.status_code}")
    if response.status_code == 200:
        # Resolve page/list depending on format
        data = response.data
        if isinstance(data, dict) and 'results' in data:
            results = data['results']
        else:
            results = data
        print(f"Returned: {len(results)} orders")
        if results and isinstance(results, list):
            # Print the fields of the first order to see if branch is serialized
            if branch_val == '2':
                print("First order keys:", results[0].keys())
                # Is there a branch field in the serialized order data?
                # Let's print: 'branch', 'branch_id', 'branch_name', etc.
                print("First order details:", {k: results[0].get(k) for k in ['id', 'order_number', 'branch', 'branch_id'] if k in results[0]})
    else:
        print("response.data:", response.data)
