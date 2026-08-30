import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from rest_framework.test import APIClient
from accounts.models import UserProfile
client = APIClient()
user = UserProfile.objects.filter(role='ADMIN').first().user
client.force_authenticate(user=user)

res1 = client.get('/api/v1/branch-managers/')
print(f"Branch Managers all: {res1.json()}")
