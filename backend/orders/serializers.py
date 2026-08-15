"""
Serializers for the orders app.

OrderItemSerializer       — nested items in OrderSerializer
OrderSerializer           — full Order CRUD
OrderListSerializer       — lightweight list representation
OrderStatusSerializer     — PATCH status only
InvoiceSerializer         — full Invoice (returned after generate_bill)
PaymentSerializer         — full Payment (returned after complete_order)
"""
from rest_framework import serializers
from .models import Order, OrderItem, Invoice, Payment


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
    receipt_method = serializers.SerializerMethodField()
    receipt_status = serializers.SerializerMethodField()

    class Meta:
        model  = Order
        fields = [
            'id', 'order_number', 'table', 'table_label',
            'customer_name', 'waiter_name', 'notes', 'whatsapp_number',
            'status', 'subtotal', 'tax_amount', 'total',
            'item_count', 'items_summary',
            'items', 'created_at', 'updated_at', 'completed_at',
            'receipt_method', 'receipt_status',
        ]
        read_only_fields = [
            'id', 'order_number', 'table_label', 'item_count', 'items_summary',
            'subtotal', 'tax_amount', 'total',
            'created_at', 'updated_at', 'completed_at',
            'receipt_method', 'receipt_status',
        ]

    def get_receipt_method(self, obj):
        invoice = getattr(obj, 'invoice', None)
        return invoice.receipt_method if invoice else None

    def get_receipt_status(self, obj):
        invoice = getattr(obj, 'invoice', None)
        return invoice.receipt_status if invoice else None

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
        
        # Mark table as occupied
        if order.table:
            from menu.models import Table
            Table.objects.filter(pk=order.table_id).update(
                status=Table.STATUS_OCCUPIED,
                current_order_ref=order.order_number
            )
        
        order.recalculate_totals()
        order.refresh_from_db()

        # Update the notification created by the signal with accurate totals
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
    receipt_method = serializers.SerializerMethodField()
    receipt_status = serializers.SerializerMethodField()

    class Meta:
        model  = Order
        fields = [
            'id', 'order_number', 'table', 'table_label',
            'customer_name', 'waiter_name',
            'status', 'total', 'item_count', 'items_summary',
            'created_at', 'completed_at',
            'receipt_method', 'receipt_status',
        ]
        read_only_fields = fields

    def get_receipt_method(self, obj):
        invoice = getattr(obj, 'invoice', None)
        return invoice.receipt_method if invoice else None

    def get_receipt_status(self, obj):
        invoice = getattr(obj, 'invoice', None)
        return invoice.receipt_status if invoice else None


class OrderStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Order
        fields = ['id', 'status']
        read_only_fields = ['id']


# ─────────────────────────────────────────────────────────────────────────────
# Invoice + Payment serializers
# ─────────────────────────────────────────────────────────────────────────────

class InvoiceSerializer(serializers.ModelSerializer):
    order_number = serializers.CharField(source='order.order_number', read_only=True)
    table_label  = serializers.CharField(source='order.table_label', read_only=True)
    table_id     = serializers.IntegerField(source='order.table_id', read_only=True, allow_null=True)
    receipt_url  = serializers.SerializerMethodField()
    items        = serializers.SerializerMethodField()
    order_status = serializers.CharField(source='order.status', read_only=True)
    created_at_str = serializers.SerializerMethodField()
    bill_share_status = serializers.SerializerMethodField()

    class Meta:
        model  = Invoice
        fields = [
            'id', 'invoice_number', 'token',
            'order', 'order_number', 'table_label', 'table_id', 'order_status',
            'whatsapp_number', 'status',
            'receipt_status',
            'subtotal', 'tax_amount', 'total',
            'receipt_url', 'items',
            'created_at', 'created_at_str', 'updated_at', 'paid_at',
            'bill_share_status', 'delivery_method', 'delivery_status',
            'receipt_method', 'customer_whatsapp', 'receipt_shared_at', 'receipt_printed_at',
        ]
        read_only_fields = [
            'id', 'invoice_number', 'token',
            'order_number', 'table_label', 'table_id', 'order_status',
            'receipt_status',
            'subtotal', 'tax_amount', 'total',
            'receipt_url', 'items',
            'created_at', 'created_at_str', 'updated_at',
            'bill_share_status', 'delivery_method', 'delivery_status',
            'receipt_method', 'customer_whatsapp', 'receipt_shared_at', 'receipt_printed_at',
        ]

    def get_bill_share_status(self, obj):
        from notifications.models import Notification
        notif = Notification.objects.filter(
            order=obj.order,
            type='bill_share'
        ).exclude(status__in=['completed', 'dismissed']).first()
        return notif.status if notif else None

    def get_receipt_url(self, obj):
        request = self.context.get('request')
        path = obj.receipt_url_path
        if request:
            return request.build_absolute_uri(path)
        return path

    def get_items(self, obj):
        return [
            {
                'id':           item.id,
                'product_name': item.product_name,
                'unit_price':   str(item.unit_price),
                'quantity':     item.quantity,
                'subtotal':     str(item.subtotal),
            }
            for item in obj.order.items.all()
        ]

    def get_created_at_str(self, obj):
        from django.utils import timezone as tz
        local = obj.created_at.astimezone(tz.get_current_timezone())
        return {
            'date': local.strftime('%d %b %Y'),
            'time': local.strftime('%I:%M %p'),
        }


class PaymentSerializer(serializers.ModelSerializer):
    order_number   = serializers.CharField(source='order.order_number', read_only=True)
    invoice_number = serializers.CharField(source='invoice.invoice_number', read_only=True,
                                           allow_null=True)

    class Meta:
        model  = Payment
        fields = [
            'id', 'order', 'order_number',
            'invoice', 'invoice_number',
            'method', 'status', 'amount',
            'transaction_ref',
            'created_at', 'paid_at',
        ]
        read_only_fields = [
            'id', 'order_number', 'invoice_number',
            'transaction_ref', 'created_at',
        ]
