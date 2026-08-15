import os
import sys
import django

sys.path.insert(0, os.path.abspath('.'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from menu.models import Table, Product
from orders.models import Order, OrderItem, Invoice
from notifications.models import Notification
from rest_framework.test import APIClient

def test_waiter_billing_workflow():
    print("==================================================")
    print(" TESTING WAITER-SIDE BILLING & PAYMENT WORKFLOW   ")
    print("==================================================")
    client = APIClient()
    from django.contrib.auth.models import User
    admin_user = User.objects.get(username='admin')
    client.force_authenticate(user=admin_user)

    # STEP 1: Fetch/Create Table T-08
    table = Table.objects.filter(name='T-08').first()
    if not table:
        table = Table.objects.create(name='T-08', seats=4, status='available')
    else:
        table.status = 'available'
        table.current_order_ref = ''
        table.save()

    print(f"\n[STEP 1] Table {table.name} Status: {table.status}")

    # STEP 2: Pick Products
    product1 = Product.objects.filter(available=True).first()
    product2 = Product.objects.filter(available=True).last()
    assert product1 and product2, "Products missing in DB!"
    print(f"[STEP 2] Products: {product1.name} (Rs.{product1.price}), {product2.name} (Rs.{product2.price})")

    # STEP 3: Create Order
    create_payload = {
        'table': table.id,
        'waiter_name': 'Server Alex',
        'customer_name': 'Dine-in Customer',
        'notes': 'Warmed croissant',
        'items': [
            {'product': product1.id, 'quantity': 1},
            {'product': product2.id, 'quantity': 1},
        ]
    }
    res_create = client.post('/api/v1/orders/', create_payload, format='json')
    assert res_create.status_code == 201, f"Create order failed: {res_create.content}"
    order_data = res_create.json()
    order_id = order_data['id']
    print(f"[STEP 3] Created Order #{order_id} ({order_data['order_number']}) - Initial Total: Rs.{order_data['total']}")

    # STEP 4: Update Item Quantity (PATCH /api/v1/orders/<id>/update_item_qty/)
    item1 = order_data['items'][0]
    update_qty_res = client.patch(
        f'/api/v1/orders/{order_id}/update_item_qty/',
        {'item_id': item1['id'], 'delta': 1},
        format='json'
    )
    assert update_qty_res.status_code == 200, f"Update Qty failed: {update_qty_res.content}"
    updated_order = update_qty_res.json()
    print(f"[STEP 4] Updated Item Qty (+1) -> New Subtotal: Rs.{updated_order['subtotal']}, Tax: Rs.{updated_order['tax_amount']}, Total: Rs.{updated_order['total']}")


    # STEP 5: Generate Bill with WhatsApp Number (POST /api/v1/orders/<id>/generate_bill/)
    bill_res = client.post(
        f'/api/v1/orders/{order_id}/generate_bill/',
        {'whatsapp_number': '9876543210'},
        format='json'
    )
    assert bill_res.status_code in [200, 201], f"Generate bill failed: {bill_res.content}"
    bill_data = bill_res.json()
    invoice_no = bill_data['invoice_number']
    tx_ref = bill_data.get('transaction_ref', f'#AB-{order_id}')
    print(f"[STEP 5] Generated Invoice {invoice_no} ({tx_ref}) for WhatsApp +919876543210")


    # STEP 6: Check Invoice DB Record
    inv_obj = Invoice.objects.filter(order_id=order_id).first()
    assert inv_obj is not None, "Invoice record missing in PostgreSQL!"
    assert inv_obj.invoice_number == invoice_no
    assert inv_obj.whatsapp_number == '+919876543210'
    print(f"[STEP 6] PostgreSQL Invoice Record verified: {inv_obj}")

    # STEP 7: Table status is now bill_requested
    table.refresh_from_db()
    assert table.status == 'bill_requested'
    print(f"[STEP 7] Table {table.name} Status updated to: {table.status}")

    # STEP 8: Complete Payment (POST /api/v1/orders/<id>/complete_payment/)
    pay_res = client.post(
        f'/api/v1/orders/{order_id}/complete_payment/',
        {'payment_method': 'Cash', 'payment_status': 'Paid'},
        format='json'
    )
    assert pay_res.status_code == 200, f"Complete payment failed: {pay_res.content}"
    res_data = pay_res.json()
    paid_order = res_data.get('order', res_data)
    assert paid_order['status'].upper() == 'COMPLETED'
    assert paid_order.get('payment_status', 'paid') == 'paid'
    print(f"[STEP 8] Payment Completed via Cash. Status: {paid_order['status']}")


    # STEP 9: Table Status released to AVAILABLE
    table.refresh_from_db()
    assert table.status == 'available', f"Expected available table, got {table.status}"
    print(f"[STEP 9] Table {table.name} returned to: {table.status}")

    # STEP 10: Admin Notification
    notif = Notification.objects.filter(order_id=order_id, type='payment_completed').first()
    assert notif is not None, "Payment completed notification missing!"
    print(f"[STEP 10] Admin Notification: '{notif.title}' - '{notif.message.replace('₹', 'Rs.')}'")


    print("\n==================================================")
    print(" ALL 10 BILLING & PAYMENT STEPS SUCCESSFUL!       ")
    print("==================================================")

if __name__ == '__main__':
    test_waiter_billing_workflow()
