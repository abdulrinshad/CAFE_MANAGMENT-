import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from accounts.models import UserProfile
for p in UserProfile.objects.all():
    print(p.user.username, p.role)
