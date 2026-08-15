import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connection

sql_commands = [
    "ALTER TABLE orders_invoice ADD COLUMN payment_method varchar(20) NOT NULL DEFAULT 'pending';",
    "ALTER TABLE orders_invoice ADD COLUMN payment_status varchar(20) NOT NULL DEFAULT 'unpaid';",
    "ALTER TABLE orders_invoice ADD COLUMN transaction_ref varchar(50) NOT NULL DEFAULT '';"
]

with connection.cursor() as cursor:
    for sql in sql_commands:
        try:
            cursor.execute(sql)
            print(f"Successfully executed: {sql}")
        except Exception as e:
            print(f"Error executing '{sql}': {e}")
            
connection.commit()
