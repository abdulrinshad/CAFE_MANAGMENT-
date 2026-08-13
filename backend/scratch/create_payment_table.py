import os
import sys
import django

sys.path.insert(0, os.path.abspath('.'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connection
from orders.models import Payment

with connection.schema_editor() as schema_editor:
    try:
        schema_editor.create_model(Payment)
        print("orders_payment table created successfully!")
    except Exception as e:
        print("Table creation result:", e)
