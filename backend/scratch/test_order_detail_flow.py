import os
import sys
import django

sys.path.insert(0, os.path.abspath('.'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from menu.models import Table, Product
from orders.models import Order
from rest_framework.test import APIClient

def test_order_detail_flow():
    print("=== Testing Single Order Details End-to-End Flow ===")
    client = APIClient()

    # 1. Ensure Table and Product exist
    table = Table.objects.filter(status='available').first()
    if not table:
        table = Table.objects.create(name='T-05', seats=4, status='available')

    product = Product.objects.filter(available=True).first()
    assert product is not None, "Product missing!"

    # 2. Create real Order via POS API (POST /api/v1/orders/)
    payload = {
        'table': table.id,
        'waiter_name': 'Test Waiter POS',
        'notes': 'Iced Caramel Macchiato with extra shot',
        'status': 'pending',
        'items': [
            {
                'product': product.id,
                'quantity': 2,
                'unit_price': str(product.price),
                'product_name': product.name,
            }
        ]
    }
    create_res = client.post('/api/v1/orders/', payload, format='json')
    assert create_res.status_code == 201, f"Create order failed: {create_res.content}"
    order_data = create_res.json()
    order_id = order_data['id']
    order_number = order_data['order_number']
    print(f"[OK] Waiter POS Created Order: ID={order_id}, Number={order_number}, Total=Rs.{order_data['total']}")

    # 3. Test GET /api/v1/orders/<id>/ with numeric PK
    get_by_pk_res = client.get(f'/api/v1/orders/{order_id}/')
    assert get_by_pk_res.status_code == 200, f"GET /api/v1/orders/{order_id}/ failed: {get_by_pk_res.content}"
    detail_pk = get_by_pk_res.json()
    assert detail_pk['order_number'] == order_number
    assert len(detail_pk['items']) == 1
    assert detail_pk['items'][0]['product_name'] == product.name
    print(f"[OK] GET /api/v1/orders/{order_id}/ successfully retrieved order from PostgreSQL")

    # 4. Test GET /api/v1/orders/<order_number>/ with string number
    get_by_num_res = client.get(f'/api/v1/orders/{order_number}/')
    assert get_by_num_res.status_code == 200, f"GET /api/v1/orders/{order_number}/ failed: {get_by_num_res.content}"
    detail_num = get_by_num_res.json()
    assert detail_num['id'] == order_id
    print(f"[OK] GET /api/v1/orders/{order_number}/ successfully retrieved order from PostgreSQL")

    # 5. Test Item Actions: Add Item to Order (POST /api/v1/orders/<id>/add_item/)
    add_item_res = client.post(f'/api/v1/orders/{order_id}/add_item/', {
        'product': product.id,
        'product_name': product.name,
        'unit_price': str(product.price),
        'quantity': 1
    }, format='json')
    assert add_item_res.status_code in [200, 201], f"Add item failed: {add_item_res.content}"

    updated_order = add_item_res.json()
    total_qty = sum(item['quantity'] for item in updated_order['items'])
    assert total_qty == 3, f"Expected total quantity 3, got {total_qty}"
    print(f"[OK] Item added successfully. Total quantity: {total_qty}. New Total: Rs.{updated_order['total']}")


    # 6. Test Status Change (PATCH /api/v1/orders/<id>/set_status/)
    status_res = client.patch(f'/api/v1/orders/{order_id}/set_status/', {'status': 'preparing'}, format='json')
    assert status_res.status_code == 200
    print(f"[OK] Status updated to 'preparing' via API")

    print("\nSUCCESS: All Single Order Details API & PostgreSQL flows verified!")

if __name__ == '__main__':
    test_order_detail_flow()
