"""
Notification & Conversation models.

Stores system-generated alerts and Manager-Owner communications:
  - new_order        : a new order was placed
  - payment_completed: order payment completed
  - owner_message    : manager sent a message/alert to owner
  - owner_reply      : owner replied to manager message
  - status_changed   : order status updated
  - bill_requested   : table requested the bill
  - table_attention  : table needs staff attention
"""

from django.db import models
from django.conf import settings
from django.utils import timezone


class Notification(models.Model):
    TYPE_NEW_ORDER         = 'new_order'
    TYPE_STATUS_CHANGED    = 'status_changed'
    TYPE_PAYMENT_COMPLETED = 'payment_completed'
    TYPE_BILL_REQUESTED    = 'bill_requested'
    TYPE_TABLE_ATTENTION   = 'table_attention'
    TYPE_BILL_SHARE        = 'bill_share'
    TYPE_OWNER_MESSAGE     = 'owner_message'
    TYPE_OWNER_REPLY       = 'owner_reply'
    TYPE_SYSTEM_ALERT      = 'system_alert'

    TYPE_CHOICES = [
        (TYPE_NEW_ORDER,         'New Order'),
        (TYPE_STATUS_CHANGED,    'Order Status Changed'),
        (TYPE_PAYMENT_COMPLETED, 'Payment Completed'),
        (TYPE_BILL_REQUESTED,    'Bill Requested'),
        (TYPE_TABLE_ATTENTION,   'Table Needs Attention'),
        (TYPE_BILL_SHARE,        'Bill Share Request'),
        (TYPE_OWNER_MESSAGE,     'Owner Message / Alert'),
        (TYPE_OWNER_REPLY,       'Owner Reply'),
        (TYPE_SYSTEM_ALERT,      'System Alert'),
    ]

    type    = models.CharField(max_length=30, choices=TYPE_CHOICES, db_index=True)
    title   = models.CharField(max_length=200)
    message = models.TextField()

    # Optional foreign keys to triggering/associated objects
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
    branch = models.ForeignKey(
        'accounts.Branch',
        on_delete=models.CASCADE,
        null=True, blank=True,
        related_name='notifications',
    )
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='received_notifications',
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='sent_notifications',
    )
    conversation = models.ForeignKey(
        'notifications.Conversation',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='notifications',
    )

    TARGET_CASHIER_MANAGER = 'cashier_manager'
    TARGET_MANAGER         = 'manager'
    TARGET_ADMIN           = 'admin'
    TARGET_STAFF           = 'staff'
    TARGET_USER            = 'user'

    TARGET_ROLE_CHOICES = [
        (TARGET_CASHIER_MANAGER, 'Cashiers & Branch Manager'),
        (TARGET_MANAGER,         'Branch Manager Only'),
        (TARGET_ADMIN,           'Owner / Admin Only'),
        (TARGET_STAFF,           'Waiters / Staff Only'),
        (TARGET_USER,            'Specific Recipient User'),
    ]

    target_role = models.CharField(
        max_length=30,
        choices=TARGET_ROLE_CHOICES,
        default=TARGET_CASHIER_MANAGER,
        db_index=True
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


class Conversation(models.Model):
    """
    Threaded Manager <-> Owner Conversation.
    Associated with a specific Branch and Branch Manager.
    """
    PRIORITY_NORMAL    = 'normal'
    PRIORITY_IMPORTANT = 'important'
    PRIORITY_URGENT    = 'urgent'

    PRIORITY_CHOICES = [
        (PRIORITY_NORMAL,    'Normal'),
        (PRIORITY_IMPORTANT, 'Important'),
        (PRIORITY_URGENT,    'Urgent'),
    ]

    branch = models.ForeignKey(
        'accounts.Branch',
        on_delete=models.CASCADE,
        related_name='conversations',
    )
    manager = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='manager_conversations',
        null=True, blank=True,
    )
    manager_name = models.CharField(max_length=120, blank=True, default='')
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='owner_conversations',
    )
    subject = models.CharField(max_length=200)
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default=PRIORITY_NORMAL)

    is_seen_by_owner = models.BooleanField(default=False, db_index=True)
    is_seen_by_manager = models.BooleanField(default=True, db_index=True)

    last_message_at = models.DateTimeField(auto_now=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = 'Conversation'
        verbose_name_plural = 'Conversations'
        ordering = ['-last_message_at']

    def __str__(self):
        return f"[{self.get_priority_display()}] {self.subject} — {self.branch.name}"


class ConversationMessage(models.Model):
    """
    Individual message inside a Manager <-> Owner Conversation thread.
    """
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='messages',
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sent_conversation_messages',
    )
    sender_name = models.CharField(max_length=120, blank=True, default='')
    sender_role = models.CharField(max_length=50, blank=True, default='')

    message = models.TextField()
    is_seen = models.BooleanField(default=False, db_index=True)
    seen_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = 'Conversation Message'
        verbose_name_plural = 'Conversation Messages'
        ordering = ['created_at']

    def __str__(self):
        return f"{self.sender_name} ({self.sender_role}): {self.message[:30]}"
