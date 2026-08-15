"""
Notification model.

Stores system-generated alerts for admin/staff:
  - new_order        : a new order was placed
  - status_changed   : order status updated
  - payment_completed: order fully paid/completed
  - bill_requested   : table requested the bill
  - table_attention  : table needs staff attention
"""

from django.db import models


class Notification(models.Model):
    TYPE_NEW_ORDER         = 'new_order'
    TYPE_STATUS_CHANGED    = 'status_changed'
    TYPE_PAYMENT_COMPLETED = 'payment_completed'
    TYPE_BILL_REQUESTED    = 'bill_requested'
    TYPE_TABLE_ATTENTION   = 'table_attention'
    TYPE_BILL_SHARE        = 'bill_share'

    TYPE_CHOICES = [
        (TYPE_NEW_ORDER,         'New Order'),
        (TYPE_STATUS_CHANGED,    'Order Status Changed'),
        (TYPE_PAYMENT_COMPLETED, 'Payment Completed'),
        (TYPE_BILL_REQUESTED,    'Bill Requested'),
        (TYPE_TABLE_ATTENTION,   'Table Needs Attention'),
        (TYPE_BILL_SHARE,        'Bill Share Request'),
    ]

    type    = models.CharField(max_length=30, choices=TYPE_CHOICES, db_index=True)
    title   = models.CharField(max_length=200)
    message = models.TextField()

    # Optional foreign keys to the triggering objects
    order = models.ForeignKey(
        'orders.Order',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='notifications',
    )
    table = models.ForeignKey(
        'menu.Table',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='notifications',
    )

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

    status       = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_NEW, db_index=True)
    is_read      = models.BooleanField(default=False, db_index=True)
    created_at   = models.DateTimeField(auto_now_add=True, db_index=True)
    accepted_at  = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    dismissed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name        = 'Notification'
        verbose_name_plural = 'Notifications'
        ordering            = ['-created_at']

    def save(self, *args, **kwargs):
        if self.pk:
            try:
                old = Notification.objects.get(pk=self.pk)
                if self.status != old.status:
                    from django.utils import timezone
                    if self.status == self.STATUS_IN_PROGRESS:
                        self.accepted_at = timezone.now()
                    elif self.status == self.STATUS_COMPLETED:
                        self.completed_at = timezone.now()
                        self.is_read = True
                    elif self.status == self.STATUS_DISMISSED:
                        self.dismissed_at = timezone.now()
                        self.is_read = True
            except Notification.DoesNotExist:
                pass
        else:
            if self.status in [self.STATUS_COMPLETED, self.STATUS_DISMISSED]:
                self.is_read = True

        super().save(*args, **kwargs)

    def __str__(self):
        return f'[{self.get_type_display()}] {self.title} ({"read" if self.is_read else "unread"})'
