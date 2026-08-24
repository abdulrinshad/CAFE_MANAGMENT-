"""
Orders models: Order, OrderItem, Invoice, Payment.

Order → OrderItem → Product → Category → Table
Order → Invoice → Payment

Revenue is calculated only from COMPLETED orders.
CANCELLED orders are excluded from all financial calculations.
"""

import uuid
from decimal import Decimal

from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator


class Order(models.Model):
    STATUS_PENDING        = 'pending'
    STATUS_PREPARING      = 'preparing'
    STATUS_READY          = 'ready'
    STATUS_COMPLETED      = 'completed'
    STATUS_CANCELLED      = 'cancelled'
    STATUS_BILL_REQUESTED = 'bill_requested'

    STATUS_CHOICES = [
        (STATUS_PENDING,        'Pending'),
        (STATUS_PREPARING,      'Preparing'),
        (STATUS_READY,          'Ready'),
        (STATUS_COMPLETED,      'Completed'),
        (STATUS_CANCELLED,      'Cancelled'),
        (STATUS_BILL_REQUESTED, 'Bill Requested'),
    ]

    # Human-readable unique order number, e.g. ORD-0001
    order_number  = models.CharField(max_length=20, unique=True, blank=True)

    # Links
    branch = models.ForeignKey(
        'accounts.Branch',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='orders',
    )
    table = models.ForeignKey(
        'menu.Table',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='orders',
    )

    # Identifiers
    customer_name    = models.CharField(max_length=120, blank=True, default='')
    waiter_name      = models.CharField(max_length=120, blank=True, default='')
    cashier_name     = models.CharField(max_length=120, blank=True, default='')
    pos_terminal     = models.ForeignKey(
        'accounts.POSTerminal',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='orders',
    )
    notes            = models.TextField(blank=True, default='')
    whatsapp_number  = models.CharField(max_length=20, blank=True, default='',
                                        help_text='Customer WhatsApp number (10 digits)')
    invoice_number   = models.CharField(max_length=30, blank=True, default='')
    payment_method   = models.CharField(max_length=20, blank=True, default='pending')
    payment_status   = models.CharField(max_length=20, blank=True, default='unpaid')
    transaction_ref  = models.CharField(max_length=50, blank=True, default='')


    # Status
    status        = models.CharField(
        max_length=20, choices=STATUS_CHOICES,
        default=STATUS_PENDING, db_index=True,
    )

    # Financials (stored as snapshots; computed from items on save)
    subtotal   = models.DecimalField(max_digits=12, decimal_places=2, default=0,
                                     validators=[MinValueValidator(0)])
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0,
                                     validators=[MinValueValidator(0)])
    total      = models.DecimalField(max_digits=12, decimal_places=2, default=0,
                                     validators=[MinValueValidator(0)])

    # Timestamps
    created_at    = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at    = models.DateTimeField(auto_now=True)
    completed_at  = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name        = 'Order'
        verbose_name_plural = 'Orders'
        ordering            = ['-created_at']

    def __str__(self):
        return f'{self.order_number} ({self.get_status_display()})'

    def save(self, *args, **kwargs):
        # Auto-generate order number on first save
        if not self.order_number:
            last = Order.objects.order_by('-id').first()
            next_id = (last.id + 1) if last and last.id else 1
            self.order_number = f'ORD-{next_id:04d}'

        # Set completed_at when status transitions to completed
        if self.status == self.STATUS_COMPLETED and not self.completed_at:
            self.completed_at = timezone.now()

        super().save(*args, **kwargs)

    def recalculate_totals(self):
        """Recompute subtotal, tax, total from order items and save."""
        subtotal = sum(item.subtotal for item in self.items.all())
        tax      = subtotal * Decimal('0.05')  # 5% GST
        self.subtotal   = subtotal
        self.tax_amount = tax.quantize(Decimal('0.01'))
        self.total      = (subtotal + tax).quantize(Decimal('0.01'))
        Order.objects.filter(pk=self.pk).update(
            subtotal=self.subtotal,
            tax_amount=self.tax_amount,
            total=self.total,
        )

    @property
    def item_count(self):
        return self.items.aggregate(n=models.Sum('quantity'))['n'] or 0

    @property
    def items_summary(self):
        parts = [f'{item.quantity}× {item.product_name}' for item in self.items.all()[:3]]
        rest  = self.items.count() - 3
        if rest > 0:
            parts.append(f'+{rest} more')
        return ', '.join(parts)

    @property
    def table_label(self):
        return self.table.name if self.table else (self.customer_name or 'Takeaway')


class OrderItem(models.Model):
    order   = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(
        'menu.Product',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='order_items',
    )
    # Snapshots — preserved even if product is later edited/deleted
    product_name = models.CharField(max_length=200)
    unit_price   = models.DecimalField(max_digits=10, decimal_places=2)
    quantity     = models.PositiveIntegerField(default=1, validators=[MinValueValidator(1)])
    subtotal     = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        verbose_name        = 'Order Item'
        verbose_name_plural = 'Order Items'

    def __str__(self):
        return f'{self.quantity}× {self.product_name} @ ₹{self.unit_price}'

    def save(self, *args, **kwargs):
        # Snapshot product name + price from the product FK if not set
        if self.product and not self.product_name:
            self.product_name = self.product.name
        if self.product and not self.unit_price:
            self.unit_price = self.product.price
        self.subtotal = self.unit_price * self.quantity
        super().save(*args, **kwargs)
        # Keep order totals in sync
        self.order.recalculate_totals()


class Invoice(models.Model):
    """One invoice per order, generated when waiter clicks 'Generate Bill'."""

    STATUS_UNPAID    = 'unpaid'
    STATUS_PAID      = 'paid'
    STATUS_CANCELLED = 'cancelled'

    STATUS_CHOICES = [
        (STATUS_UNPAID,    'Unpaid'),
        (STATUS_PAID,      'Paid'),
        (STATUS_CANCELLED, 'Cancelled'),
    ]

    order          = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='invoice')
    invoice_number = models.CharField(max_length=30, unique=True, blank=True,
                                      help_text='e.g. INV-10452')
    token          = models.UUIDField(default=uuid.uuid4, unique=True, editable=False,
                                      help_text='Secure token for public receipt URL')

    # Customer contact (copied from order at bill generation time)
    whatsapp_number = models.CharField(max_length=20, blank=True, default='')

    # Delivery method
    DELIVERY_WHATSAPP = 'whatsapp'
    DELIVERY_PRINT    = 'print'
    DELIVERY_NONE     = 'none'

    DELIVERY_CHOICES = [
        (DELIVERY_WHATSAPP, 'WhatsApp'),
        (DELIVERY_PRINT, 'Print'),
        (DELIVERY_NONE, 'None'),
    ]

    delivery_method = models.CharField(max_length=20, choices=DELIVERY_CHOICES, default=DELIVERY_NONE)

    DELIVERY_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('shared', 'Shared'),
        ('printed', 'Printed'),
        ('not_shared', 'Not Shared'),
    ]
    delivery_status = models.CharField(max_length=20, choices=DELIVERY_STATUS_CHOICES, default='pending')

    RECEIPT_STATUS_CHOICES = [
        ('NOT_SHARED', 'Not Shared'),
        ('SHARED', 'Shared'),
        ('PRINTED', 'Printed'),
    ]

    RECEIPT_METHOD_CHOICES = [
        ('NONE', 'None'),
        ('WHATSAPP', 'WhatsApp'),
        ('PRINT', 'Print'),
    ]

    receipt_status     = models.CharField(max_length=20, choices=RECEIPT_STATUS_CHOICES, default='NOT_SHARED')
    receipt_method     = models.CharField(max_length=20, choices=RECEIPT_METHOD_CHOICES, default='NONE')
    customer_whatsapp  = models.CharField(max_length=20, blank=True, null=True)
    receipt_shared_at  = models.DateTimeField(null=True, blank=True)
    receipt_printed_at = models.DateTimeField(null=True, blank=True)

    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_UNPAID)

    # Financial snapshot (from order at time of invoice creation)
    subtotal   = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total      = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    # Payment details
    payment_method  = models.CharField(max_length=20, default='pending')
    payment_status  = models.CharField(max_length=20, default='unpaid')
    transaction_ref = models.CharField(max_length=50, blank=True, default='')

    # Timestamps

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    paid_at    = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name        = 'Invoice'
        verbose_name_plural = 'Invoices'
        ordering            = ['-created_at']


    def __str__(self):
        return f'{self.invoice_number} — {self.get_status_display()}'

    def save(self, *args, **kwargs):
        if not self.invoice_number:
            last = Invoice.objects.order_by('-id').first()
            next_id = (last.id + 1) if last and last.id else 10001
            self.invoice_number = f'INV-{next_id}'
        super().save(*args, **kwargs)

    @property
    def receipt_url_path(self):
        """Public path for the digital receipt (no auth required)."""
        return f'/receipt/{self.token}'


class Payment(models.Model):
    """Payment record linked to an Order and Invoice."""

    METHOD_CASH  = 'cash'
    METHOD_CARD  = 'card'
    METHOD_UPI   = 'upi'
    METHOD_OTHER = 'other'

    METHOD_CHOICES = [
        (METHOD_CASH,  'Cash'),
        (METHOD_CARD,  'Card'),
        (METHOD_UPI,   'UPI'),
        (METHOD_OTHER, 'Other'),
    ]

    STATUS_PENDING = 'pending'
    STATUS_PAID    = 'paid'
    STATUS_FAILED  = 'failed'
    STATUS_REFUNDED = 'refunded'

    STATUS_CHOICES = [
        (STATUS_PENDING,  'Pending'),
        (STATUS_PAID,     'Paid'),
        (STATUS_FAILED,   'Failed'),
        (STATUS_REFUNDED, 'Refunded'),
    ]

    order   = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='payment')
    invoice = models.OneToOneField(Invoice, on_delete=models.SET_NULL, null=True, blank=True,
                                   related_name='payment')

    method = models.CharField(max_length=20, choices=METHOD_CHOICES, default=METHOD_CASH)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    # Reference (set on completion)
    transaction_ref = models.CharField(max_length=40, blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)
    paid_at    = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name        = 'Payment'
        verbose_name_plural = 'Payments'
        ordering            = ['-created_at']

    def __str__(self):
        return f'Payment for {self.order.order_number} — {self.get_status_display()}'

    def save(self, *args, **kwargs):
        if not self.transaction_ref:
            import random, string
            self.transaction_ref = 'AB-' + ''.join(
                random.choices(string.digits, k=5)
            )
        super().save(*args, **kwargs)


class Expense(models.Model):
    """Operational expense logged by the owner/admin for a branch."""

    CATEGORY_CHOICES = [
        ('rent',         'Rent'),
        ('utilities',    'Utilities'),
        ('salaries',     'Salaries'),
        ('supplies',     'Supplies'),
        ('maintenance',  'Maintenance'),
        ('marketing',    'Marketing'),
        ('equipment',    'Equipment'),
        ('food_cost',    'Food Cost'),
        ('other',        'Other'),
    ]

    STATUS_CHOICES = [
        ('approved', 'Approved'),
        ('pending',  'Pending'),
        ('rejected', 'Rejected'),
    ]

    branch = models.ForeignKey(
        'accounts.Branch',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='expenses',
    )

    title       = models.CharField(max_length=200)
    category    = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='other')
    amount      = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])
    date        = models.DateField()
    description = models.TextField(blank=True, default='')
    status      = models.CharField(max_length=20, choices=STATUS_CHOICES, default='approved')

    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name        = 'Expense'
        verbose_name_plural = 'Expenses'
        ordering            = ['-date', '-created_at']

    def __str__(self):
        branch_name = self.branch.name if self.branch else 'No Branch'
        return f'{self.title} — ₹{self.amount} ({branch_name})'

