import os
import sys
import django

sys.path.insert(0, os.path.abspath('.'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()


from menu.models import Table, Product, WaiterRequest
from orders.models import Order, OrderItem
from notifications.models import Notification
from rest_framework.test import APIClient

def test_full_workflow():
    print("=== Testing Waiter POS Backend Workflow ===")
    client = APIClient()

    # 1. Check Product & Table
    prod = Product.objects.filter(available=True).first()
    assert prod is not None, "Product missing!"
    print(f"[OK] Product found: {prod.name} - Rs. {prod.price}")

    table = Table.objects.filter(status='available').first()
    if not table:
        table = Table.objects.create(name='T-01', seats=4, status='available')
    print(f"[OK] Table found: {table.name} (Status: {table.status})")

    # 2. Start Order (Table status -> occupied)
    table_status_res = client.patch(f'/api/v1/tables/{table.id}/set_status/', {'status': 'occupied'}, format='json')
    if table_status_res.status_code != 200:
        print("TABLE ERROR:", table_status_res.status_code, table_status_res.content.decode('utf-8', errors='ignore')[:300])
    assert table_status_res.status_code == 200
    table.refresh_from_db()
    assert table.status == 'occupied', f"Expected occupied, got {table.status}"
    print(f"[OK] Table {table.name} status updated to Occupied")

    # 3. Create Order via POS API
    order_payload = {
        'table': table.id,
        'waiter_name': 'Test Waiter',
        'notes': 'Extra hot espresso',
        'status': 'pending',
        'items': [
            {
                'product': prod.id,
                'quantity': 2,
                'unit_price': str(prod.price),
                'product_name': prod.name,
            }
        ]
    }
    order_res = client.post('/api/v1/orders/', order_payload, format='json')
    if order_res.status_code != 201:
        print("ORDER ERROR:", order_res.status_code, order_res.content.decode('utf-8', errors='ignore')[:300])
    assert order_res.status_code == 201

    order_data = order_res.json()
    order_id = order_data['id']
    print(f"[OK] Order created successfully: {order_data['order_number']}, Total: Rs.{order_data['total']}")

    # 4. Verify Admin Notification was created
    notif = Notification.objects.filter(order_id=order_id, type='new_order').first()
    assert notif is not None, "Notification not created!"
    print(f"[OK] Admin Notification created: {notif.title} - '{notif.message.replace('₹', 'Rs.')}' (Unread: {notif.is_read == False})")



    # 5. Create Waiter Request (Customer Call Waiter / Bill Request)
    req_res = client.post('/api/v1/requests/', {
        'table': table.id,
        'request_type': 'Call Waiter',
        'message': 'Customer needs assistance',
        'status': 'new'
    }, format='json')
    if req_res.status_code != 201:
        print("REQUEST CREATE ERROR:", req_res.status_code, req_res.content.decode('utf-8', errors='ignore')[:300])
    assert req_res.status_code == 201, f"Request creation failed: {req_res.status_code}"

    req_data = req_res.json()
    print(f"[OK] Waiter Request created: Table {req_data['table_name']} - {req_data['type']}")

    # 6. Verify Request Notification created
    req_notif = Notification.objects.filter(table_id=table.id, type=Notification.TYPE_TABLE_ATTENTION).first()
    assert req_notif is not None, "Request notification missing!"
    print(f"[OK] Request Notification created: {req_notif.title}")

    # 7. Check Dashboard Stats API
    stats_res = client.get('/api/v1/dashboard/stats/')
    assert stats_res.status_code == 200, f"Stats failed: {stats_res.content}"
    stats_data = stats_res.json()
    print(f"[OK] Dashboard Stats: Occupied Tables={stats_data['occupied_tables']}, Active Requests={stats_data['active_requests']}, Active Orders={stats_data['active_orders']}")

    # 8. Complete Order & Payment
    status_res = client.patch(f'/api/v1/orders/{order_id}/set_status/', {'status': 'completed'}, format='json')
    assert status_res.status_code == 200, f"Status update failed: {status_res.content}"
    table.refresh_from_db()
    assert table.status == 'available', f"Expected table available, got {table.status}"
    print(f"[OK] Order marked completed and Table {table.name} returned to Available")

    print("\nSUCCESS: All workflow steps verified against PostgreSQL database!")

if __name__ == '__main__':
    test_full_workflow()
