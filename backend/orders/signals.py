"""
Signals for the orders app.

post_save on Order → create a Notification for new orders and status changes.

NOTE: For new orders, we defer notification creation slightly by refreshing
from DB after items have been saved, so totals are accurate.
"""
from django.db.models.signals import post_save
from django.dispatch import receiver


@receiver(post_save, sender='orders.Order')
def order_notification(sender, instance, created, **kwargs):
    """
    Fire notifications when:
      - A new order is created
      - An existing order's status changes
    """
    try:
        from notifications.models import Notification
        from orders.models import Order

        # Refresh from DB to get accurate totals (items may have been saved after order)
        try:
            fresh = Order.objects.get(pk=instance.pk)
        except Order.DoesNotExist:
            return

        table_label = fresh.table_label

        if created:
            Notification.objects.create(
                type='new_order',
                title=f'New Order: {fresh.order_number}',
                message=(
                    f'New order received for {table_label}. '
                    f'Total: \u20b9{fresh.total}. '
                    f'{fresh.item_count} item(s).'
                ),
                order=fresh,
                table=fresh.table,
            )
        else:
            # Status-change notifications
            status_messages = {
                'preparing': (
                    'status_changed',
                    f'Order {fresh.order_number} is now being prepared.',
                ),
                'ready': (
                    'status_changed',
                    f'Order {fresh.order_number} is ready for pickup/delivery.',
                ),
                'completed': (
                    'payment_completed',
                    f'Payment completed for {fresh.order_number}. '
                    f'Total: \u20b9{fresh.total}.',
                ),
                'cancelled': (
                    'status_changed',
                    f'Order {fresh.order_number} has been cancelled.',
                ),
            }
            if fresh.status in status_messages:
                ntype, msg = status_messages[fresh.status]
                Notification.objects.create(
                    type=ntype,
                    title=f'Order {fresh.order_number}: {fresh.get_status_display()}',
                    message=msg,
                    order=fresh,
                    table=fresh.table,
                )
    except Exception:
        pass  # Never let notification errors break order saves
