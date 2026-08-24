"""
Serializers for the menu app.

Serializer hierarchy:
  CategorySerializer              — full Category CRUD
  ProductSerializer               — full Product CRUD (with image upload)
  ProductAvailabilitySerializer   — PATCH: available / sold_out flags
  ProductPopularSerializer        — PATCH: popular / featured flags
  ProductListSerializer           — lightweight list representation
"""

from rest_framework import serializers
from .models import Category, Product, Table, QRCode, WaiterRequest


class CategorySerializer(serializers.ModelSerializer):
    """
    Full serializer for Category.

    `item_count` is a read-only computed field (count of related products).
    """

    item_count = serializers.IntegerField(read_only=True)

    class Meta:
        model  = Category
        fields = [
            'id',
            'name',
            'icon',
            'display_order',
            'active',
            'item_count',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'item_count', 'created_at', 'updated_at']


class ProductSerializer(serializers.ModelSerializer):
    """
    Full serializer for Product CRUD.

    Includes:
    - `category_name`  — read-only, the category's display name
    - `category_label` — read-only, uppercase label (matches frontend)
    - `image_url`      — read-only absolute URL for the image file
    - `image`          — write-only field for file upload
    """

    category_name  = serializers.CharField(source='category.name', read_only=True)
    category_label = serializers.CharField(read_only=True)
    image_url      = serializers.CharField(read_only=True, allow_null=True)

    class Meta:
        model  = Product
        fields = [
            'id',
            'name',
            'category',
            'category_name',
            'category_label',
            'price',
            'tax',
            'description',
            'image',
            'image_url',
            'display_order',
            'available',
            'sold_out',
            'available_on_pos',
            'available_on_qr',
            'popular',
            'featured',
            'dietary_tags',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'category_name',
            'category_label',
            'image_url',
            'created_at',
            'updated_at',
        ]
        extra_kwargs = {
            'image': {'write_only': False, 'required': False, 'allow_null': True},
        }

    def validate_dietary_tags(self, value):
        """
        dietary_tags can arrive as:
          - a Python list (JSON body)
          - a JSON-encoded string (FormData: '["Vegan"]')
        """
        import json
        if isinstance(value, str):
            try:
                value = json.loads(value)
            except (ValueError, TypeError):
                value = []
        if not isinstance(value, list):
            raise serializers.ValidationError('dietary_tags must be a list.')
        for tag in value:
            if not isinstance(tag, str):
                raise serializers.ValidationError('Each dietary tag must be a string.')
        return value

    def validate_price(self, value):
        if value < 0:
            raise serializers.ValidationError('Price cannot be negative.')
        return value

    def to_internal_value(self, data):
        """
        FormData sends everything as strings, including booleans.
        Coerce 'true'/'false' strings → Python booleans before validation.
        """
        bool_fields = [
            'available', 'sold_out', 'popular', 'featured',
            'available_on_pos', 'available_on_qr',
        ]
        # Make a mutable copy
        if hasattr(data, '_mutable'):
            data = data.copy()  # QueryDict
        else:
            data = dict(data)   # plain dict

        for field in bool_fields:
            if field in data:
                val = data[field]
                if isinstance(val, str):
                    data[field] = val.lower() in ('true', '1', 'yes')

        return super().to_internal_value(data)


class ProductListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for list views — omits heavy text fields.
    """

    category_name  = serializers.CharField(source='category.name', read_only=True)
    category_label = serializers.CharField(read_only=True)
    image_url      = serializers.CharField(read_only=True, allow_null=True)

    class Meta:
        model  = Product
        fields = [
            'id',
            'name',
            'category',
            'category_name',
            'category_label',
            'price',
            'image_url',
            'display_order',
            'available',
            'sold_out',
            'popular',
            'featured',
            'dietary_tags',
        ]
        read_only_fields = fields


class ProductAvailabilitySerializer(serializers.ModelSerializer):
    """
    Partial serializer for updating product availability.
    Used by the PATCH /products/{id}/set_availability/ action.
    """

    class Meta:
        model  = Product
        fields = ['id', 'available', 'sold_out', 'available_on_pos', 'available_on_qr']
        read_only_fields = ['id']


class ProductPopularSerializer(serializers.ModelSerializer):
    """
    Partial serializer for updating product popular/featured flags.
    Used by the PATCH /products/{id}/set_popular/ action.
    """

    class Meta:
        model  = Product
        fields = ['id', 'popular', 'featured']
        read_only_fields = ['id']


# ─────────────────────────────────────────────────────────────────────────────
# Table serializers
# ─────────────────────────────────────────────────────────────────────────────

class TableSerializer(serializers.ModelSerializer):
    """
    Full CRUD serializer for Table.
    Exposes the related QR code id and image_url as read-only convenience fields.
    """

    qr_code_id       = serializers.SerializerMethodField()
    qr_image_url      = serializers.SerializerMethodField()
    qr_status        = serializers.SerializerMethodField()
    current_order_id = serializers.SerializerMethodField()

    class Meta:
        model  = Table
        fields = [
            'id', 'name', 'seats', 'status', 'active',
            'current_order_ref', 'current_order_id', 'amount',
            'qr_code_id', 'qr_image_url', 'qr_status',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'qr_code_id', 'qr_image_url', 'qr_status', 'current_order_id', 'created_at', 'updated_at']

    def get_current_order_id(self, obj):
        order = obj.orders.exclude(status__in=['completed', 'cancelled']).order_by('-created_at').first()
        return order.id if order else None


    def get_qr_code_id(self, obj):
        try:
            return obj.qr_code.id
        except QRCode.DoesNotExist:
            return None

    def get_qr_image_url(self, obj):
        try:
            return obj.qr_code.image_url
        except QRCode.DoesNotExist:
            return None

    def get_qr_status(self, obj):
        try:
            return obj.qr_code.status
        except QRCode.DoesNotExist:
            return None


class TableStatusSerializer(serializers.ModelSerializer):
    """PATCH /tables/{id}/set_status/ — only update the status field."""

    class Meta:
        model  = Table
        fields = ['id', 'status']
        read_only_fields = ['id']


class TableActiveSerializer(serializers.ModelSerializer):
    """PATCH /tables/{id}/set_active/ — activate or deactivate a table."""

    class Meta:
        model  = Table
        fields = ['id', 'active']
        read_only_fields = ['id']


# ─────────────────────────────────────────────────────────────────────────────
# QRCode serializers
# ─────────────────────────────────────────────────────────────────────────────

class QRCodeSerializer(serializers.ModelSerializer):
    """
    Full serializer for QRCode.
    """

    table_name  = serializers.CharField(source='table.name', read_only=True)
    image_url   = serializers.CharField(read_only=True, allow_null=True)
    scan_count  = serializers.IntegerField(read_only=True)

    class Meta:
        model  = QRCode
        fields = [
            'id', 'qr_id', 'table', 'table_name',
            'menu_url', 'image', 'image_url',
            'status', 'scan_count', 'last_scanned',
            'generated_at', 'updated_at',
        ]
        read_only_fields = ['id', 'qr_id', 'table_name', 'image_url', 'scan_count', 'generated_at', 'updated_at']
        extra_kwargs = {
            'image': {'write_only': False, 'required': False, 'allow_null': True},
        }


class QRCodeStatusSerializer(serializers.ModelSerializer):
    """PATCH /qrcodes/{id}/set_status/ — toggle active/inactive."""

    class Meta:
        model  = QRCode
        fields = ['id', 'status']
        read_only_fields = ['id']


# ─────────────────────────────────────────────────────────────────────────────
# WaiterRequest serializer
# ─────────────────────────────────────────────────────────────────────────────

class WaiterRequestSerializer(serializers.ModelSerializer):
    table_name  = serializers.CharField(source='table.name', read_only=True)
    table_id    = serializers.SerializerMethodField()
    branch_id   = serializers.IntegerField(source='branch.id', read_only=True, allow_null=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True, allow_null=True)
    type        = serializers.CharField(source='request_type', required=False, allow_blank=True)
    time        = serializers.SerializerMethodField()
    # Resolved live from the active order on this table (used by BillRequestsPage)
    order_id      = serializers.SerializerMethodField()
    order_number  = serializers.SerializerMethodField()
    customer_name = serializers.SerializerMethodField()
    items_summary = serializers.SerializerMethodField()

    class Meta:
        model  = WaiterRequest
        fields = [
            'id', 'table', 'table_id', 'table_name', 'type', 'request_type',
            'message', 'status', 'assigned_waiter', 'amount',
            'branch_id', 'branch_name',
            'order_id', 'order_number', 'customer_name', 'items_summary',
            'time', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'table_name', 'table_id', 'time', 'created_at', 'updated_at',
            'branch_id', 'branch_name', 'order_id', 'order_number', 'customer_name', 'items_summary',
        ]

    def get_table_id(self, obj):
        if not obj.table:
            return ''
        name = obj.table.name
        return name if name.startswith('T-') else f'T-{name}'

    def get_time(self, obj):
        if not obj.created_at:
            return ''
        return obj.created_at.strftime('%I:%M %p').lstrip('0')

    def get_order_obj(self, obj):
        if obj.order:
            return obj.order
        if not obj.table:
            return None
        from orders.models import Order
        order = Order.objects.filter(
            table=obj.table,
        ).exclude(status__in=['completed', 'cancelled']).order_by('-created_at').first()
        if order is None:
            order = Order.objects.filter(table=obj.table).order_by('-created_at').first()
        return order

    def get_order_id(self, obj):
        order = self.get_order_obj(obj)
        return order.id if order else None

    def get_order_number(self, obj):
        order = self.get_order_obj(obj)
        return order.order_number if order else None

    def get_customer_name(self, obj):
        order = self.get_order_obj(obj)
        return order.customer_name if (order and order.customer_name) else ''

    def get_items_summary(self, obj):
        order = self.get_order_obj(obj)
        return order.items_summary if order else ''


