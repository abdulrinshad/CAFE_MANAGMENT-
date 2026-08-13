import os
import sys
import django

sys.path.insert(0, os.path.abspath('.'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from menu.models import Table, Product
from orders.models import Order
from notifications.models import Notification
from rest_framework.test import APIClient

def test_complete_waiter_order_flow():
    print("==================================================")
    print(" TESTING COMPLETE WAITER ORDER FLOW & BACKEND API ")
    print("==================================================")
    client = APIClient()

    # STEP 1: Find or Create Available Table T-06
    table = Table.objects.filter(name='T-06').first()
    if not table:
        table = Table.objects.create(name='T-06', seats=4, status='available')
    else:
        table.status = 'available'
        table.current_order_ref = ''
        table.save()

    print(f"\n[STEP 1] Table {table.name} Status: {table.status}")

    # STEP 2: Fetch Products from PostgreSQL
    product1 = Product.objects.filter(available=True).first()
    product2 = Product.objects.filter(available=True).last()
    assert product1 is not None, "Products missing in DB!"
    print(f"[STEP 2] Picked Products: {product1.name} (Rs.{product1.price}), {product2.name} (Rs.{product2.price})")

    # STEP 3: Create Order via POS API (POST /api/v1/orders/)
    order_payload = {
        'table': table.id,
        'waiter_name': 'Waitstaff Alpha',
        'customer_name': 'Dine-in Guest',
        'notes': 'Extra hot, no sugar',
        'status': 'pending',
        'items': [
            {
                'product': product1.id,
                'product_name': product1.name,
                'unit_price': str(product1.price),
                'quantity': 2
            },
            {
                'product': product2.id,
                'product_name': product2.name,
                'unit_price': str(product2.price),
                'quantity': 1
            }
        ]
    }
    create_res = client.post('/api/v1/orders/', order_payload, format='json')
    assert create_res.status_code == 201, f"POS order creation failed: {create_res.content}"
    order_data = create_res.json()
    order_id = order_data['id']
    order_number = order_data['order_number']
    print(f"[STEP 3] POS Created Order #{order_id} ({order_number}), Total: Rs.{order_data['total']}")

    # STEP 4: Verify Table status updated to OCCUPIED in PostgreSQL
    table.refresh_from_db()
    assert table.status == 'occupied', f"Expected table status occupied, got {table.status}"
    print(f"[STEP 4] PostgreSQL Table {table.name} Status is now: {table.status}")

    # STEP 5: Verify Table Serializer exposes current_order_id
    tables_res = client.get('/api/v1/tables/')
    assert tables_res.status_code == 200
    res_json = tables_res.json()
    tables_data = res_json.get('results', res_json) if isinstance(res_json, dict) else res_json
    t_obj = next((t for t in tables_data if t['id'] == table.id), None)

    assert t_obj is not None
    assert t_obj['current_order_id'] == order_id, f"Expected current_order_id={order_id}, got {t_obj['current_order_id']}"
    print(f"[STEP 5] Table Serializer returned current_order_id: {t_obj['current_order_id']}")

    # STEP 6: Verify Table Active Order Endpoint (GET /api/v1/tables/<id>/active_order/)
    active_ord_res = client.get(f'/api/v1/tables/{table.id}/active_order/')
    assert active_ord_res.status_code == 200, f"active_order endpoint failed: {active_ord_res.content}"
    active_data = active_ord_res.json()
    assert active_data['id'] == order_id
    print(f"[STEP 6] GET /api/v1/tables/{table.id}/active_order/ returned active Order #{active_data['id']}")

    # STEP 7: Verify GET /api/v1/orders/<id>/ returns full detail with items
    detail_res = client.get(f'/api/v1/orders/{order_id}/')
    assert detail_res.status_code == 200
    detail_data = detail_res.json()
    assert len(detail_data['items']) == 2
    print(f"[STEP 7] GET /api/v1/orders/{order_id}/ returned {len(detail_data['items'])} item(s)")

    # STEP 8: Verify Waiter Orders list (GET /api/v1/orders/) contains newly created order
    list_res = client.get('/api/v1/orders/')
    assert list_res.status_code == 200
    list_json = list_res.json()
    orders_list = list_json.get('results', list_json) if isinstance(list_json, dict) else list_json
    found_in_list = any(o['id'] == order_id for o in orders_list)

    assert found_in_list, f"Order #{order_id} missing from GET /api/v1/orders/"
    print(f"[STEP 8] GET /api/v1/orders/ contains newly created Order #{order_id}")

    # STEP 9: Verify Notification created in PostgreSQL
    notif = Notification.objects.filter(order_id=order_id).first()
    assert notif is not None, "Notification not created for order!"
    print(f"[STEP 9] PostgreSQL Admin Notification created: '{notif.title}' - '{notif.message.replace('₹', 'Rs.')}'")

    # STEP 10: Complete Payment & Verify Table returns to AVAILABLE
    pay_res = client.patch(f'/api/v1/orders/{order_id}/set_status/', {'status': 'completed'}, format='json')
    assert pay_res.status_code == 200
    table.refresh_from_db()
    assert table.status == 'available', f"Expected table available after payment, got {table.status}"
    print(f"[STEP 10] Payment Completed. Table {table.name} returned to: {table.status}")

    print("\n==================================================")
    print(" ALL 10 STEPS VERIFIED WITH REAL POSTGRESQL DATA  ")
    print("==================================================")

if __name__ == '__main__':
    test_complete_waiter_order_flow()
