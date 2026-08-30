import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from rest_framework.test import APIClient
from accounts.models import UserProfile
client = APIClient()
user = UserProfile.objects.filter(role='ADMIN').first().user
client.force_authenticate(user=user)

# Test 1: All branches
res = client.get('/api/v1/orders/?page_size=500')
print(f"All branches: {res.json()['count']} records")

# Test 2: Specific branch (e.g., 4)
res2 = client.get('/api/v1/orders/?branch=4&page_size=500')
print(f"Branch 4: {res2.json()['count']} records")

