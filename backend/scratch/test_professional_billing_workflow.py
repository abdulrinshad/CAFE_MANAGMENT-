import os
import sys
import django

sys.path.insert(0, os.path.abspath('.'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from menu.models import Table, Product
from orders.models import Order, Invoice
from notifications.models import Notification
from rest_framework.test import APIClient
from django.contrib.auth.models import User

def test_workflow():
    print("==================================================")
    print(" TESTING END-TO-END RECEIPT STATUS WORKFLOW       ")
    print("==================================================")
    client = APIClient()
    admin_user = User.objects.get(username='admin')
    client.force_authenticate(user=admin_user)

    product = Product.objects.filter(available=True).first()

    # Create base order for testing
    table, _ = Table.objects.get_or_create(
        name='T-91',
        defaults={'seats': 2, 'status': 'occupied'}
    )
    table.status = 'occupied'
    table.save()

    res_order = client.post('/api/v1/orders/', {
        'table': table.id,
        'waiter_name': 'Server Test',
        'customer_name': 'Dine-in Customer',
        'items': [{'product': product.id, 'quantity': 1}]
    }, format='json')
    order_id = res_order.json()['id']

    # 1. Generate Bill initially with delivery_method = none
    res_bill = client.post(f'/api/v1/orders/{order_id}/generate_bill/', {'delivery_method': 'none'}, format='json')
    assert res_bill.status_code == 201
    inv = res_bill.json()
    assert inv['receipt_status'] == 'NOT_SHARED'
    assert inv['receipt_method'] == 'NONE'
    print("[OK] Initial bill generated as NOT_SHARED.")

    # 2. Mark receipt shared
    res_share = client.post(f'/api/v1/orders/{order_id}/mark_receipt_shared/', {
        'method': 'WHATSAPP',
        'customer_whatsapp': '9876543210'
    }, format='json')
    assert res_share.status_code == 200
    inv = res_share.json()
    print("DEBUG res_share json:", inv)
    assert inv['receipt_status'] == 'SHARED'
    assert inv['receipt_method'] == 'WHATSAPP'
    assert inv['customer_whatsapp'] == '+919876543210'
    assert inv['receipt_shared_at'] is not None
    print("[OK] mark_receipt_shared succeeded.")

    # 3. Mark receipt printed
    res_print = client.post(f'/api/v1/orders/{order_id}/mark_receipt_printed/', {}, format='json')
    assert res_print.status_code == 200
    inv = res_print.json()
    assert inv['receipt_status'] == 'PRINTED'
    assert inv['receipt_method'] == 'PRINT'
    assert inv['receipt_printed_at'] is not None
    print("[OK] mark_receipt_printed succeeded.")

    # 4. Mark receipt not shared
    res_skip = client.post(f'/api/v1/orders/{order_id}/mark_receipt_not_shared/', {}, format='json')
    assert res_skip.status_code == 200
    inv = res_skip.json()
    assert inv['receipt_status'] == 'NOT_SHARED'
    assert inv['receipt_method'] == 'NONE'
    print("[OK] mark_receipt_not_shared succeeded.")

    # Clean up test table
    table.delete()

    print("\n==================================================")
    print(" ALL SCENARIOS VERIFIED SUCCESSFULLY!             ")
    print("==================================================")

if __name__ == '__main__':
    test_workflow()
