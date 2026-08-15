"""
Serializer for the Notification model.
"""
from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    order_number = serializers.SerializerMethodField()
    table_name   = serializers.SerializerMethodField()
    whatsapp_number = serializers.SerializerMethodField()
    invoice_number = serializers.SerializerMethodField()
    total_amount = serializers.SerializerMethodField()

    class Meta:
        model  = Notification
        fields = [
            'id', 'type', 'type_display', 'title', 'message',
            'order', 'order_number', 'table', 'table_name',
            'is_read', 'created_at',
            'status', 'accepted_at', 'completed_at', 'dismissed_at',
            'whatsapp_number', 'invoice_number', 'total_amount',
        ]
        read_only_fields = ['id', 'type', 'title', 'message', 'order',
                            'table', 'created_at', 'type_display',
                            'order_number', 'table_name',
                            'accepted_at', 'completed_at', 'dismissed_at',
                            'whatsapp_number', 'invoice_number', 'total_amount']

    def get_order_number(self, obj):
        return obj.order.order_number if obj.order else None

    def get_table_name(self, obj):
        return obj.table.name if obj.table else None

    def get_whatsapp_number(self, obj):
        return obj.order.whatsapp_number if obj.order else None

    def get_invoice_number(self, obj):
        if obj.order and hasattr(obj.order, 'invoice'):
            return obj.order.invoice.invoice_number
        return None

    def get_total_amount(self, obj):
        return obj.order.total if obj.order else None
