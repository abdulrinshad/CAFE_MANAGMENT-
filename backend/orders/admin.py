"""
Django Admin for Orders app.
"""
from django.contrib import admin
from .models import Order, OrderItem


class OrderItemInline(admin.TabularInline):
    model           = OrderItem
    extra           = 0
    readonly_fields = ['subtotal']
    fields          = ['product', 'product_name', 'unit_price', 'quantity', 'subtotal']


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display    = ['order_number', 'table', 'status', 'total', 'created_at']
    list_filter     = ['status', 'created_at']
    search_fields   = ['order_number', 'customer_name', 'table__name']
    readonly_fields = ['order_number', 'subtotal', 'tax_amount', 'total',
                       'created_at', 'updated_at', 'completed_at']
    ordering        = ['-created_at']
    inlines         = [OrderItemInline]


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display  = ['order', 'product_name', 'quantity', 'unit_price', 'subtotal']
    list_filter   = ['order__status']
    search_fields = ['product_name', 'order__order_number']
    readonly_fields = ['subtotal']
