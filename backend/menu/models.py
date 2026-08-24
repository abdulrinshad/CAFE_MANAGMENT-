"""
Menu models: Category, Product, Table, QRCode.
"""

import os
import io
import uuid
from django.db import models
from django.core.validators import MinValueValidator
from django.core.files.base import ContentFile


class Category(models.Model):
    """
    A menu category (e.g. Coffee, Tea, Pastries).

    `icon` stores a short slug (coffee | tea | pastry | dessert | cold)
    that the React frontend maps to SVG icons client-side.
    """

    ICON_CHOICES = [
        ('coffee',  'Coffee'),
        ('tea',     'Tea'),
        ('pastry',  'Pastry'),
        ('dessert', 'Dessert'),
        ('cold',    'Cold Beverage'),
        ('default', 'Default'),
    ]

    name          = models.CharField(max_length=120, unique=True)
    icon          = models.CharField(max_length=30, choices=ICON_CHOICES, default='default')
    display_order = models.PositiveSmallIntegerField(default=0, db_index=True)
    active        = models.BooleanField(default=True)
    created_at    = models.DateTimeField(auto_now_add=True)
    updated_at    = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name        = 'Category'
        verbose_name_plural = 'Categories'
        ordering            = ['display_order', 'name']

    def __str__(self):
        return self.name

    @property
    def item_count(self):
        """Number of products linked to this category."""
        return self.products.count()


class Product(models.Model):
    """
    A menu product / item.

    `dietary_tags` is stored as a JSON array (e.g. ["Vegan", "Gluten-Free"])
    matching the React frontend's dietaryTags array format.
    """

    DIETARY_CHOICES = [
        'Vegan',
        'Gluten-Free',
        'Contains Nuts',
        'Dairy-Free',
        'Spicy',
        'Halal',
    ]

    # ── Core fields ──────────────────────────────────────────────────────────
    name         = models.CharField(max_length=200)
    branch       = models.ForeignKey('accounts.Branch', on_delete=models.SET_NULL, null=True, blank=True, related_name='products')
    category     = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='products',
    )
    price        = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
    )
    tax          = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
        help_text='Tax / GST percentage',
    )
    description  = models.TextField(blank=True, default='')
    image        = models.ImageField(
        upload_to='products/',
        null=True,
        blank=True,
        help_text='Product photo (stored under MEDIA_ROOT/products/)',
    )

    # ── Display & ordering ───────────────────────────────────────────────────
    display_order = models.PositiveSmallIntegerField(default=0, db_index=True)

    # ── Availability flags ───────────────────────────────────────────────────
    available        = models.BooleanField(default=True)
    sold_out         = models.BooleanField(default=False)
    available_on_pos = models.BooleanField(default=True, help_text='Visible on POS terminal')
    available_on_qr  = models.BooleanField(default=True, help_text='Visible on QR digital menu')

    # ── Feature flags ────────────────────────────────────────────────────────
    popular  = models.BooleanField(default=False, help_text='Show "Popular" badge')
    featured = models.BooleanField(default=False, help_text='Featured / highlighted item')

    # ── Dietary information ──────────────────────────────────────────────────
    dietary_tags = models.JSONField(
        default=list,
        blank=True,
        help_text='List of dietary tags, e.g. ["Vegan", "Gluten-Free"]',
    )

    # ── Timestamps ───────────────────────────────────────────────────────────
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name        = 'Product'
        verbose_name_plural = 'Products'
        ordering            = ['display_order', 'name']

    def __str__(self):
        return f'{self.name} (₹{self.price})'

    @property
    def category_label(self):
        """Uppercase category name as used by the React frontend."""
        return self.category.name.upper() if self.category else ''

    @property
    def image_url(self):
        """Returns the full URL of the product image, or None."""
        if self.image:
            return self.image.url
        return None


class Table(models.Model):
    """
    A physical dining table in the cafe.
    """

    STATUS_AVAILABLE       = 'available'
    STATUS_OCCUPIED        = 'occupied'
    STATUS_BILL_REQUESTED  = 'bill_requested'
    STATUS_NEEDS_ATTENTION = 'needs_attention'

    STATUS_CHOICES = [
        (STATUS_AVAILABLE,       'Available'),
        (STATUS_OCCUPIED,        'Occupied'),
        (STATUS_BILL_REQUESTED,  'Bill Requested'),
        (STATUS_NEEDS_ATTENTION, 'Needs Attention'),
    ]

    # Table label shown in the UI, e.g. "T-01", "Bar-1"
    name              = models.CharField(max_length=50, unique=True, help_text='Table label, e.g. T-01')
    branch            = models.ForeignKey('accounts.Branch', on_delete=models.SET_NULL, null=True, blank=True, related_name='tables')
    seats             = models.PositiveSmallIntegerField(default=4, validators=[MinValueValidator(1)])
    status            = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_AVAILABLE, db_index=True)
    active            = models.BooleanField(default=True)
    current_order_ref = models.CharField(max_length=50, blank=True, default='', help_text='External order reference string')
    amount            = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    created_at        = models.DateTimeField(auto_now_add=True)
    updated_at        = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name        = 'Table'
        verbose_name_plural = 'Tables'
        ordering            = ['name']

    def __str__(self):
        return f'{self.name} ({self.get_status_display()})'


class QRCode(models.Model):
    """
    One QR code per table.
    Auto-generated when a table is created via the signal in apps.py.
    """

    STATUS_ACTIVE   = 'active'
    STATUS_INACTIVE = 'inactive'

    STATUS_CHOICES = [
        (STATUS_ACTIVE,   'Active'),
        (STATUS_INACTIVE, 'Inactive'),
    ]

    table         = models.OneToOneField(Table, on_delete=models.CASCADE, related_name='qr_code')
    # Human-readable QR ID e.g. "QR-001"
    qr_id         = models.CharField(max_length=20, unique=True, blank=True)
    # The URL the QR code encodes (table's digital menu URL)
    menu_url      = models.URLField(max_length=500, blank=True)
    # Actual PNG image of the QR code stored in media/qr_codes/
    image         = models.ImageField(upload_to='qr_codes/', null=True, blank=True)
    status        = models.CharField(max_length=10, choices=STATUS_CHOICES, default=STATUS_ACTIVE, db_index=True)
    scan_count    = models.PositiveIntegerField(default=0)
    last_scanned  = models.DateTimeField(null=True, blank=True)
    generated_at  = models.DateTimeField(auto_now_add=True)
    updated_at    = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name        = 'QR Code'
        verbose_name_plural = 'QR Codes'
        ordering            = ['table__name']

    def __str__(self):
        return f'{self.qr_id} → {self.table.name}'

    @property
    def image_url(self):
        if self.image:
            return self.image.url
        return None

    def generate_qr_image(self, base_url='http://localhost:5173'):
        """
        Generate the actual QR code PNG using the `qrcode` library.
        The encoded URL points to the customer digital menu for this table.
        Saves the image file into MEDIA_ROOT/qr_codes/.
        """
        try:
            import qrcode as qrlib
            from qrcode.image.pure import PyPNGImage
        except ImportError:
            return  # qrcode library not installed — skip silently

        if not self.menu_url or 'table=' not in self.menu_url:
            self.menu_url = f'{base_url}/customer/menu?table={self.table.name}'



        qr = qrlib.QRCode(
            version=1,
            error_correction=qrlib.constants.ERROR_CORRECT_H,
            box_size=10,
            border=4,
        )
        qr.add_data(self.menu_url)
        qr.make(fit=True)

        img = qr.make_image(fill_color='black', back_color='white')
        buf = io.BytesIO()
        img.save(buf, format='PNG')
        buf.seek(0)

        filename = f'{self.qr_id}.png'
        self.image.save(filename, ContentFile(buf.read()), save=False)


class WaiterRequest(models.Model):
    """
    A customer or system request assigned to waiters (e.g. Call Waiter, Refill, Bill Request).
    """

    STATUS_NEW         = 'new'
    STATUS_IN_PROGRESS = 'in_progress'
    STATUS_COMPLETED   = 'completed'
    STATUS_DISMISSED   = 'dismissed'

    STATUS_CHOICES = [
        (STATUS_NEW,         'New'),
        (STATUS_IN_PROGRESS, 'In Progress'),
        (STATUS_COMPLETED,   'Completed'),
        (STATUS_DISMISSED,   'Dismissed'),
    ]

    table           = models.ForeignKey(Table, on_delete=models.CASCADE, related_name='requests')
    branch          = models.ForeignKey('accounts.Branch', on_delete=models.SET_NULL, null=True, blank=True, related_name='waiter_requests')
    order           = models.ForeignKey('orders.Order', on_delete=models.SET_NULL, null=True, blank=True, related_name='waiter_requests')
    request_type    = models.CharField(max_length=50, default='Call Waiter')
    message         = models.TextField(blank=True, default='')
    status          = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_NEW, db_index=True)
    assigned_waiter = models.CharField(max_length=120, blank=True, default='')
    amount          = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    created_at      = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at      = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name        = 'Waiter Request'
        verbose_name_plural = 'Waiter Requests'
        ordering            = ['-created_at']

    def __str__(self):
        return f'[{self.get_status_display()}] Table {self.table.name} - {self.request_type}'


class InventoryItem(models.Model):
    branch = models.ForeignKey('accounts.Branch', on_delete=models.CASCADE, related_name='inventory_items')
    name = models.CharField(max_length=120)
    current_stock = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    minimum_stock = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    unit = models.CharField(max_length=30, default='kg')
    cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    category = models.CharField(max_length=100, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Inventory Item'
        verbose_name_plural = 'Inventory Items'
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.branch.name})"


