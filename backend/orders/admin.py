"""
Admin registration for the orders app.
"""
from django.contrib import admin
from .models import Order, OrderItem, Invoice, Payment


class OrderItemInline(admin.TabularInline):
    model   = OrderItem
    extra   = 0
    readonly_fields = ['product_name', 'unit_price', 'subtotal']
    fields  = ['product', 'product_name', 'unit_price', 'quantity', 'subtotal']


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display  = ['order_number', 'table', 'status', 'total', 'waiter_name',
                     'whatsapp_number', 'created_at', 'completed_at']
    list_filter   = ['status', 'created_at']
    search_fields = ['order_number', 'customer_name', 'waiter_name', 'table__name']
    readonly_fields = ['order_number', 'subtotal', 'tax_amount', 'total',
                       'created_at', 'updated_at', 'completed_at']
    inlines = [OrderItemInline]
    ordering = ['-created_at']


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display  = ['order', 'product_name', 'unit_price', 'quantity', 'subtotal']
    search_fields = ['order__order_number', 'product_name']
    readonly_fields = ['subtotal']


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display  = ['invoice_number', 'order', 'status', 'receipt_status', 'customer_whatsapp',
                     'subtotal', 'tax_amount', 'total', 'created_at', 'paid_at']
    list_filter   = ['status', 'receipt_status', 'created_at']
    search_fields = ['invoice_number', 'order__order_number', 'customer_whatsapp']
    readonly_fields = ['invoice_number', 'token', 'subtotal', 'tax_amount', 'total',
                       'created_at', 'updated_at', 'paid_at', 'receipt_shared_at', 'receipt_printed_at']
    ordering = ['-created_at']


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display  = ['order', 'method', 'status', 'amount', 'transaction_ref',
                     'created_at', 'paid_at']
    list_filter   = ['method', 'status', 'created_at']
    search_fields = ['order__order_number', 'transaction_ref']
    readonly_fields = ['transaction_ref', 'created_at', 'paid_at']
    ordering = ['-created_at']
