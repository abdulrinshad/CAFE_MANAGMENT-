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
        order_branch = fresh.branch or (fresh.table.branch if fresh.table else None)

        if created:
            if not Notification.objects.filter(type='new_order', order=fresh).exists():
                waiter_info = f"Waiter {fresh.waiter_name}" if fresh.waiter_name else "Staff"
                Notification.objects.create(
                    type='new_order',
                    target_role='cashier_manager',
                    branch=order_branch,
                    title=f'New Order: {fresh.order_number}',
                    message=(
                        f'{waiter_info} placed a new order for {table_label}. '
                        f'Total: \u20b9{fresh.total}. '
                        f'{fresh.item_count} item(s).'
                    ),
                    order=fresh,
                    table=fresh.table,
                )
        else:
            # Status-change notifications
            if fresh.status == 'completed':
                if not Notification.objects.filter(type='payment_completed', order=fresh).exists():
                    cashier_info = f"Cashier {fresh.cashier_name}" if fresh.cashier_name else "Staff"
                    Notification.objects.create(
                        type='payment_completed',
                        target_role='manager',
                        branch=order_branch,
                        title=f'Payment Processed: {fresh.order_number}',
                        message=(
                            f'{cashier_info} processed payment for Order #{fresh.order_number}. '
                            f'Total: \u20b9{fresh.total}.'
                        ),
                        order=fresh,
                        table=fresh.table,
                    )
            elif fresh.status in ['preparing', 'ready', 'cancelled']:
                status_messages = {
                    'preparing': f'Order {fresh.order_number} is now being prepared.',
                    'ready':     f'Order {fresh.order_number} is ready for pickup/delivery.',
                    'cancelled': f'Order {fresh.order_number} has been cancelled.',
                }
                msg = status_messages[fresh.status]
                if not Notification.objects.filter(type='status_changed', order=fresh, message=msg).exists():
                    Notification.objects.create(
                        type='status_changed',
                        target_role='staff',
                        branch=order_branch,
                        title=f'Order {fresh.order_number}: {fresh.get_status_display()}',
                        message=msg,
                        order=fresh,
                        table=fresh.table,
                    )
    except Exception:
        pass  # Never let notification errors break order saves
