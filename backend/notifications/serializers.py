"""
Serializers for Notification, Conversation, and ConversationMessage models.
"""
from rest_framework import serializers
from .models import Notification, Conversation, ConversationMessage


class NotificationSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    order_number = serializers.SerializerMethodField()
    table_name   = serializers.SerializerMethodField()
    branch_name  = serializers.SerializerMethodField()
    whatsapp_number = serializers.SerializerMethodField()
    invoice_number = serializers.SerializerMethodField()
    total_amount = serializers.SerializerMethodField()

    class Meta:
        model  = Notification
        fields = [
            'id', 'type', 'type_display', 'title', 'message',
            'order', 'order_number', 'table', 'table_name', 'branch', 'branch_name',
            'is_read', 'created_at',
            'status', 'accepted_at', 'completed_at', 'dismissed_at',
            'whatsapp_number', 'invoice_number', 'total_amount', 'conversation',
        ]
        read_only_fields = ['id', 'type', 'title', 'message', 'order',
                            'table', 'branch', 'created_at', 'type_display',
                            'order_number', 'table_name', 'branch_name',
                            'accepted_at', 'completed_at', 'dismissed_at',
                            'whatsapp_number', 'invoice_number', 'total_amount', 'conversation']

    def get_order_number(self, obj):
        return obj.order.order_number if obj.order else None

    def get_table_name(self, obj):
        return obj.table.name if obj.table else None

    def get_branch_name(self, obj):
        if obj.branch:
            return obj.branch.name
        if obj.order and obj.order.branch:
            return obj.order.branch.name
        return None

    def get_whatsapp_number(self, obj):
        return obj.order.whatsapp_number if obj.order else None

    def get_invoice_number(self, obj):
        if obj.order and hasattr(obj.order, 'invoice'):
            return obj.order.invoice.invoice_number
        return None

    def get_total_amount(self, obj):
        return obj.order.total if obj.order else None


class ConversationMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(read_only=True)
    sender_role = serializers.CharField(read_only=True)

    class Meta:
        model = ConversationMessage
        fields = ['id', 'conversation', 'sender', 'sender_name', 'sender_role', 'message', 'is_seen', 'seen_at', 'created_at']
        read_only_fields = ['id', 'conversation', 'sender', 'sender_name', 'sender_role', 'is_seen', 'seen_at', 'created_at']


class ConversationSerializer(serializers.ModelSerializer):
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    branch_code = serializers.CharField(source='branch.code', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    messages = ConversationMessageSerializer(many=True, read_only=True)
    latest_message = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            'id', 'branch', 'branch_name', 'branch_code',
            'manager', 'manager_name', 'owner',
            'subject', 'priority', 'priority_display',
            'is_seen_by_owner', 'is_seen_by_manager',
            'created_at', 'last_message_at',
            'messages', 'latest_message'
        ]
        read_only_fields = ['id', 'manager_name', 'is_seen_by_owner', 'is_seen_by_manager', 'created_at', 'last_message_at', 'messages', 'latest_message']

    def get_latest_message(self, obj):
        last_msg = obj.messages.order_by('-created_at').first()
        if last_msg:
            return ConversationMessageSerializer(last_msg).data
        return None
