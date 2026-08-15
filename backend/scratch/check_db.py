import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connection

cursor = connection.cursor()
cursor.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'orders_order';")
columns = [row[0] for row in cursor.fetchall()]
print('ORDER COLUMNS IN DB:', columns)
