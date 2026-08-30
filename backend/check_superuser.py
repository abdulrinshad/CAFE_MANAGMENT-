import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth.models import User
from accounts.models import UserProfile

for u in User.objects.all():
    profile = UserProfile.objects.filter(user=u).first()
    print(u.username, u.is_superuser, u.is_staff, profile.role if profile else 'No profile')
