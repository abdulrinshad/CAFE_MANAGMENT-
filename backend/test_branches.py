import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from rest_framework.test import APIClient
from accounts.models import UserProfile
client = APIClient()
user = UserProfile.objects.filter(role='ADMIN').first().user
client.force_authenticate(user=user)

res1 = client.get('/api/v1/orders/?branch=1&page_size=500')
print(f"Branch 1: {res1.json()['count']} records")

res2 = client.get('/api/v1/orders/?branch=4&page_size=500')
print(f"Branch 4: {res2.json()['count']} records")

# Print first order ID for both
if res1.json()['count'] > 0:
    print("Branch 1 first order:", res1.json()['results'][0]['id'])
if res2.json()['count'] > 0:
    print("Branch 4 first order:", res2.json()['results'][0]['id'])

