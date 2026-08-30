import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.apps import apps
from django.conf import settings

print("DATABASE CONFIG:", settings.DATABASES['default']['NAME'])
print("\nCUSTOMER MODELS:")

for model in apps.get_models():
    if 'customer' in model._meta.object_name.lower():
        print(f"{model._meta.object_name}: {model.objects.count()}")

