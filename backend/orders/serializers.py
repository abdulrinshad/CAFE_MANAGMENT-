"""
Serializers for the orders app.
"""
from rest_framework import serializers
from .models import Order, OrderItem


class OrderItemSerializer(serializers.ModelSerializer):
    # Both fields are auto-filled from the Product FK if not explicitly provided
    product_name = serializers.CharField(required=False, allow_blank=True, default='')
    unit_price   = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, allow_null=True, default=None
    )

    class Meta:
        model  = OrderItem
        fields = ['id', 'product', 'product_name', 'unit_price', 'quantity', 'subtotal']
        read_only_fields = ['id', 'subtotal']

    def create(self, validated_data):
        # Snapshot product name + price from product FK if not provided
        product = validated_data.get('product')
        if product:
            if not validated_data.get('product_name'):
                validated_data['product_name'] = product.name
            if not validated_data.get('unit_price'):
                validated_data['unit_price'] = product.price
        validated_data['subtotal'] = (
            validated_data['unit_price'] * validated_data.get('quantity', 1)
        )
        return super().create(validated_data)


class OrderSerializer(serializers.ModelSerializer):
    items       = OrderItemSerializer(many=True, required=False)
    table_label = serializers.CharField(read_only=True)
    item_count  = serializers.IntegerField(read_only=True)
    items_summary = serializers.CharField(read_only=True)

    class Meta:
        model  = Order
        fields = [
            'id', 'order_number', 'table', 'table_label',
            'customer_name', 'waiter_name', 'notes',
            'status', 'subtotal', 'tax_amount', 'total',
            'item_count', 'items_summary',
            'items', 'created_at', 'updated_at', 'completed_at',
        ]
        read_only_fields = [
            'id', 'order_number', 'table_label', 'item_count', 'items_summary',
            'subtotal', 'tax_amount', 'total',
            'created_at', 'updated_at', 'completed_at',
        ]

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        order = Order.objects.create(**validated_data)
        for item_data in items_data:
            product = item_data.get('product')
            if product and not item_data.get('product_name'):
                item_data['product_name'] = product.name
            if product and not item_data.get('unit_price'):
                item_data['unit_price'] = product.price
            item_data['subtotal'] = item_data['unit_price'] * item_data.get('quantity', 1)
            OrderItem.objects.create(order=order, **item_data)
        order.recalculate_totals()
        order.refresh_from_db()

        # Update the notification created by the signal with accurate totals
        # (The signal fires before items exist, so we patch it here)
        try:
            from notifications.models import Notification
            notif = Notification.objects.filter(
                order=order, type='new_order'
            ).first()
            if notif:
                notif.message = (
                    f'New order received for {order.table_label}. '
                    f'Total: \u20b9{order.total}. '
                    f'{order.item_count} item(s).'
                )
                notif.save(update_fields=['message'])
        except Exception:
            pass

        return order

    def update(self, instance, validated_data):
        validated_data.pop('items', None)  # items updated separately via add_item endpoint
        return super().update(instance, validated_data)


class OrderListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views."""
    table_label   = serializers.CharField(read_only=True)
    items_summary = serializers.CharField(read_only=True)
    item_count    = serializers.IntegerField(read_only=True)

    class Meta:
        model  = Order
        fields = [
            'id', 'order_number', 'table', 'table_label',
            'customer_name', 'waiter_name',
            'status', 'total', 'item_count', 'items_summary',
            'created_at', 'completed_at',
        ]
        read_only_fields = fields


class OrderStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Order
        fields = ['id', 'status']
        read_only_fields = ['id']
