import os
import sys
import django
import traceback

sys.path.insert(0, os.path.abspath('.'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import transaction
from orders.models import Order, Invoice

try:
    order = Order.objects.get(id=4)
    whatsapp = "+91 7558997502"
    
    with transaction.atomic():
        order.recalculate_totals()
        order.refresh_from_db()
        
        # Store WhatsApp number on order
        Order.objects.filter(pk=order.pk).update(whatsapp_number=whatsapp)
        order.whatsapp_number = whatsapp
        
        # Create or update invoice
        invoice, created = Invoice.objects.get_or_create(
            order=order,
            defaults={
                'whatsapp_number': whatsapp,
                'subtotal':   order.subtotal,
                'tax_amount': order.tax_amount,
                'total':      order.total,
            }
        )
        invoice.whatsapp_number = whatsapp
        invoice.subtotal   = order.subtotal
        invoice.tax_amount = order.tax_amount
        invoice.total      = order.total
        invoice.save()
        print("Success! Invoice number:", invoice.invoice_number)
except Exception as e:
    print("Error encountered:")
    traceback.print_exc()
