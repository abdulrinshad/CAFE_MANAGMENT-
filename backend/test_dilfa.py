import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from rest_framework.test import APIClient
from django.contrib.auth.models import User
client = APIClient()
user = User.objects.get(username='dilfa')
client.force_authenticate(user=user)

res1 = client.get('/api/v1/branch-managers/')
print(f"Status: {res1.status_code}")
print(f"Branch Managers: {res1.json()}")
