"""
Admin configuration for the menu app.

Registers Category and Product with rich list displays, filters,
and search to make the Django admin panel fully operational.
"""

from django.contrib import admin
from django.utils.html import format_html
from .models import Category, Product, Table, QRCode


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display  = ('name', 'icon', 'display_order', 'active', 'item_count', 'updated_at')
    list_filter   = ('active', 'icon')
    search_fields = ('name',)
    ordering      = ('display_order', 'name')
    list_editable = ('display_order', 'active')

    readonly_fields = ('item_count', 'created_at', 'updated_at')

    fieldsets = (
        ('Basic Info', {
            'fields': ('name', 'icon', 'display_order', 'active'),
        }),
        ('Metadata', {
            'fields': ('item_count', 'created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    def item_count(self, obj):
        return obj.item_count
    item_count.short_description = 'Items'


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        'thumbnail',
        'name',
        'category',
        'price_display',
        'available',
        'sold_out',
        'popular',
        'featured',
        'display_order',
        'updated_at',
    )
    list_filter   = ('available', 'sold_out', 'popular', 'featured', 'category',
                     'available_on_pos', 'available_on_qr')
    search_fields = ('name', 'description')
    ordering      = ('display_order', 'name')
    list_editable = ('available', 'sold_out', 'popular', 'featured', 'display_order')
    list_per_page = 25

    readonly_fields = ('category_label', 'image_url', 'created_at', 'updated_at', 'thumbnail')

    fieldsets = (
        ('Basic Details', {
            'fields': ('name', 'category', 'description', 'display_order'),
        }),
        ('Pricing', {
            'fields': ('price', 'tax'),
        }),
        ('Media', {
            'fields': ('image', 'thumbnail', 'image_url'),
        }),
        ('Availability', {
            'fields': ('available', 'sold_out', 'available_on_pos', 'available_on_qr'),
        }),
        ('Feature Flags', {
            'fields': ('popular', 'featured'),
        }),
        ('Dietary Information', {
            'fields': ('dietary_tags',),
        }),
        ('Metadata', {
            'fields': ('category_label', 'created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    def thumbnail(self, obj):
        """Show a small product image in the admin list view."""
        if obj.image:
            return format_html(
                '<img src="{}" style="width:48px;height:48px;object-fit:cover;border-radius:6px;" />',
                obj.image.url
            )
        return '—'
    thumbnail.short_description = 'Image'

    def price_display(self, obj):
        return f'₹{obj.price}'
    price_display.short_description = 'Price'
    price_display.admin_order_field = 'price'

    def category_label(self, obj):
        return obj.category_label
    category_label.short_description = 'Category Label'


@admin.register(Table)
class TableAdmin(admin.ModelAdmin):
    list_display  = ['name', 'seats', 'status', 'active', 'current_order_ref', 'created_at']
    list_filter   = ['status', 'active']
    search_fields = ['name']
    list_editable = ['status', 'active']
    ordering      = ['name']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(QRCode)
class QRCodeAdmin(admin.ModelAdmin):
    list_display  = ['qr_id', 'table', 'status', 'scan_count', 'generated_at', 'qr_thumbnail']
    list_filter   = ['status']
    search_fields = ['qr_id', 'table__name']
    list_editable = ['status']
    ordering      = ['table__name']
    readonly_fields = ['qr_id', 'scan_count', 'generated_at', 'updated_at', 'qr_thumbnail']

    def qr_thumbnail(self, obj):
        if obj.image:
            return format_html('<img src="{}" width="60" height="60" style="border-radius:4px" />', obj.image.url)
        return '—'
    qr_thumbnail.short_description = 'QR Preview'
