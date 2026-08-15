import os
import sys
import django

sys.path.insert(0, os.path.abspath('.'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connection

queries = [
    # 1. Add missing status and paid_at columns to orders_invoice
    "ALTER TABLE orders_invoice ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'unpaid';",
    "ALTER TABLE orders_invoice ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ NULL;",
    
    # 2. Add token column to orders_invoice
    "ALTER TABLE orders_invoice ADD COLUMN IF NOT EXISTS token UUID DEFAULT gen_random_uuid();",
    
    # 3. Create orders_payment table if not exists
    """
    CREATE TABLE IF NOT EXISTS orders_payment (
        id BIGSERIAL PRIMARY KEY,
        method VARCHAR(20) DEFAULT 'cash',
        status VARCHAR(20) DEFAULT 'pending',
        amount NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
        transaction_ref VARCHAR(40) DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL,
        paid_at TIMESTAMPTZ NULL,
        invoice_id BIGINT NULL UNIQUE,
        order_id BIGINT NOT NULL UNIQUE,
        CONSTRAINT fk_payment_invoice FOREIGN KEY (invoice_id) REFERENCES orders_invoice(id) ON DELETE SET NULL,
        CONSTRAINT fk_payment_order FOREIGN KEY (order_id) REFERENCES orders_order(id) ON DELETE CASCADE
    );
    """
]

with connection.cursor() as cursor:
    for q in queries:
        try:
            cursor.execute(q)
            print("Executed query successfully.")
        except Exception as e:
            print("Failed query:", q, "Error:", e)

print("Schema sync complete.")
