import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.apps import apps
from django.conf import settings

print("DATABASE CONFIG:", settings.DATABASES['default']['NAME'])
print("\nROW COUNTS:")

for model in apps.get_models():
    if model._meta.app_label in ['accounts', 'orders', 'menu', 'expenses']:
        print(f"{model._meta.object_name}: {model.objects.count()}")

