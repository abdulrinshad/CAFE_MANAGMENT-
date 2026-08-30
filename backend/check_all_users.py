import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth.models import User
from accounts.models import UserProfile

print("Users and Profiles:")
for u in User.objects.all():
    p = UserProfile.objects.filter(user=u).first()
    print(f"User: {u.username}, superuser: {u.is_superuser}, staff: {u.is_staff}, profile.role: {p.role if p else 'None'}")
