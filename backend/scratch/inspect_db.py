import os
import sys
import django

sys.path.insert(0, os.path.abspath('.'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()


from django.db import connection

with connection.cursor() as cursor:
    cursor.execute("SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name='orders_order'")
    cols = cursor.fetchall()
    print("orders_order columns in PostgreSQL:", cols)

    cursor.execute("SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name='orders_payment'")
    cols_pay = cursor.fetchall()
    print("orders_payment columns in PostgreSQL:", cols_pay)


