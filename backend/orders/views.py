"""
Views for the orders app.

OrderViewSet      — CRUD for orders + set_status + add_item actions
DashboardStatsView   — GET /api/v1/dashboard/stats/
DashboardRecentOrders — GET /api/v1/dashboard/recent-orders/
DashboardBestSellers  — GET /api/v1/dashboard/best-sellers/
DashboardSalesChart   — GET /api/v1/dashboard/sales-chart/
ReportsSummaryView    — GET /api/v1/reports/summary/?period=daily|weekly|monthly
ReportsRevenueChart   — GET /api/v1/reports/revenue-chart/?period=...
ReportsTopCategories  — GET /api/v1/reports/top-categories/?period=...
"""

from datetime import date, timedelta, datetime
from decimal import Decimal

from django.db.models import (
    Sum, Count, Avg, Q, F,
    ExpressionWrapper, DecimalField
)
from django.db.models.functions import TruncDate, TruncHour, TruncWeek
from django.utils import timezone

from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Order, OrderItem, Invoice, Payment, Expense
from .serializers import (
    OrderSerializer, OrderListSerializer,
    OrderStatusSerializer, OrderItemSerializer,
    InvoiceSerializer, PaymentSerializer,
    ExpenseSerializer,
)
from accounts.permissions import IsAdminOrManager


def _get_period_range(period, date_from=None, date_to=None):
    """Return (start_dt, end_dt) for the given period string in local timezone."""
    tz    = timezone.get_current_timezone()
    now   = timezone.now()
    today = now.astimezone(tz).date()

    def _aware(dt):
        """Make a naive datetime timezone-aware, or return as-is if already aware."""
        if timezone.is_naive(dt):
            return timezone.make_aware(dt, tz)
        return dt

    if period == 'daily':
        start = _aware(datetime.combine(today, datetime.min.time()))
        end   = _aware(datetime.combine(today, datetime.max.time()))
    elif period == 'weekly':
        start = _aware(datetime.combine(today - timedelta(days=today.weekday()), datetime.min.time()))
        end   = now
    elif period == 'monthly':
        start = _aware(datetime.combine(today.replace(day=1), datetime.min.time()))
        end   = now
    elif period == 'custom' and date_from and date_to:
        try:
            start = _aware(datetime.combine(date.fromisoformat(date_from), datetime.min.time()))
            end   = _aware(datetime.combine(date.fromisoformat(date_to),   datetime.max.time()))
        except ValueError:
            start = _aware(datetime.combine(today - timedelta(days=7), datetime.min.time()))
            end   = now
    else:
        # default: last 7 days
        start = _aware(datetime.combine(today - timedelta(days=6), datetime.min.time()))
        end   = now

    return start, end



from accounts.permissions import IsEmployeeOrAbove

# ─────────────────────────────────────────────────────────────────────────────
# Orders ViewSet
# ─────────────────────────────────────────────────────────────────────────────

from accounts.utils import get_waiter_branch
from rest_framework.exceptions import PermissionDenied


def _is_waiter_user(request):
    """Return True if the authenticated user is a waiter shadow account (STAFF role)."""
    user = getattr(request, 'user', None)
    if not user or not user.is_authenticated:
        return False
    # Shadow waiter accounts use username='waiter_{id}'
    if user.username and user.username.startswith('waiter_'):
        return True
    # Also check profile role
    if hasattr(user, 'profile') and user.profile.role == 'STAFF':
        return True
    return False


def _is_cashier_or_above(request):
    """Return True if the authenticated user is a cashier, manager, or admin."""
    user = getattr(request, 'user', None)
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser or user.is_staff:
        return True
    if hasattr(user, 'profile'):
        return user.profile.role in ['ADMIN', 'MANAGER', 'CASHIER']
    # Cashier shadow accounts
    if user.username and user.username.startswith('cashier_'):
        return True
    return False


class OrderViewSet(viewsets.ModelViewSet):
    permission_classes = [IsEmployeeOrAbove]
    queryset = Order.objects.select_related('table', 'branch').prefetch_related('items__product').all()
    ordering_fields  = ['created_at', 'status', 'total']
    ordering         = ['-created_at']

    def get_serializer_class(self):
        if self.action == 'list':
            return OrderListSerializer
        return OrderSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        waiter_branch = get_waiter_branch(self.request)
        if waiter_branch:
            qs = qs.filter(branch=waiter_branch)
        status_filter = self.request.query_params.get('status')
        search        = self.request.query_params.get('search')
        if status_filter:
            qs = qs.filter(status=status_filter.lower())
        if search:
            qs = qs.filter(
                Q(order_number__icontains=search) |
                Q(customer_name__icontains=search) |
                Q(table__name__icontains=search)
            )
        return qs

    def perform_create(self, serializer):
        waiter_branch = get_waiter_branch(self.request)
        table = serializer.validated_data.get('table')
        if table:
            if table.branch and waiter_branch and table.branch != waiter_branch:
                raise PermissionDenied("Table belongs to another branch.")

        items_data = self.request.data.get('items', [])
        from menu.models import Product
        for item in items_data:
            prod_id = item.get('product')
            if prod_id:
                prod = Product.objects.filter(pk=prod_id).first()
                if prod and prod.branch and waiter_branch and prod.branch != waiter_branch:
                    raise PermissionDenied(f"Product '{prod.name}' belongs to another branch.")

        extra_fields = {}
        user = self.request.user
        if user and user.is_authenticated:
            if user.username.startswith('cashier_'):
                try:
                    from accounts.models import Cashier
                    cashier_id = int(user.username.split('_')[1])
                    cashier = Cashier.objects.filter(pk=cashier_id).first()
                    if cashier:
                        extra_fields['cashier_name'] = cashier.name
                        from accounts.models import POSTerminal
                        term = POSTerminal.objects.filter(assigned_cashier=cashier).first()
                        if term:
                            extra_fields['pos_terminal'] = term
                except Exception:
                    pass

        serializer.save(branch=waiter_branch, **extra_fields)

    @action(detail=True, methods=['patch'], url_path='set_status')
    def set_status(self, request, pk=None):
        """
        Advance order status one step at a time:
          pending → preparing → ready → completed
          bill_requested → completed  (cashier confirms payment received)

        Table.status stays OCCUPIED for all active states.
        Table becomes AVAILABLE only after complete_order (bill paid).
        Cancellation returns table to AVAILABLE immediately.
        """
        order    = self.get_object()
        new_stat = (request.data.get('status') or '').lower().strip()

        # Allowed step-by-step transitions
        TRANSITIONS = {
            Order.STATUS_PENDING:        Order.STATUS_PREPARING,
            Order.STATUS_PREPARING:      Order.STATUS_READY,
            Order.STATUS_READY:          Order.STATUS_COMPLETED,   # waiter: Mark Served
            Order.STATUS_BILL_REQUESTED: Order.STATUS_COMPLETED,   # cashier: confirm payment
        }
        CANCELLED = Order.STATUS_CANCELLED

        if new_stat == CANCELLED:
            if order.status == Order.STATUS_COMPLETED:
                return Response(
                    {'detail': 'Cannot cancel a completed order.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            expected_next = TRANSITIONS.get(order.status)
            if new_stat != expected_next:
                if expected_next:
                    return Response(
                        {'detail': (
                            f'Cannot go from "{order.status}" to "{new_stat}". '
                            f'The only allowed next step is "{expected_next}".')
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                else:
                    return Response(
                        {'detail': f'Order is already "{order.status}". No further status changes allowed.'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

        serializer = OrderStatusSerializer(order, data={'status': new_stat}, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        order.refresh_from_db()

        # Keep table.status in sync
        if order.table_id:
            try:
                from menu.models import Table
                if new_stat == CANCELLED:
                    Table.objects.filter(pk=order.table_id).update(
                        status=Table.STATUS_AVAILABLE,
                        current_order_ref='',
                    )
                else:
                    # All active statuses → table stays occupied
                    Table.objects.filter(pk=order.table_id).update(
                        status=Table.STATUS_OCCUPIED,
                        current_order_ref=order.order_number,
                    )
            except Exception:
                pass

        return Response(OrderSerializer(order, context={'request': request}).data)


    @action(detail=True, methods=['post'], url_path='add_item')
    def add_item(self, request, pk=None):
        order = self.get_object()
        # Waiters can add extra items to any active order including COMPLETED (served).
        # Only block adding to BILL_REQUESTED (already sent to cashier) or CANCELLED orders.
        blocked_statuses = [
            Order.STATUS_BILL_REQUESTED,
            Order.STATUS_CANCELLED,
        ]
        if _is_waiter_user(request) and order.status in blocked_statuses:
            return Response(
                {'detail': f'Cannot add items to a "{order.status}" order.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = OrderItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item = serializer.save(order=order)
        order.recalculate_totals()
        order.refresh_from_db()
        return Response(OrderSerializer(order, context={'request': request}).data,
                        status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['delete'], url_path=r'remove_item/(?P<item_id>\d+)')
    def remove_item(self, request, pk=None, item_id=None):
        order = self.get_object()

        # Verify waiter's assigned branch
        waiter_branch = get_waiter_branch(request)
        if waiter_branch and order.branch and order.branch != waiter_branch:
            raise PermissionDenied("Order belongs to another branch.")

        # Allow deletion only before "Finalize / Request Bill"
        blocked_statuses = [
            Order.STATUS_BILL_REQUESTED,
            Order.STATUS_CANCELLED,
        ]
        if order.status in blocked_statuses or hasattr(order, 'invoice'):
            return Response(
                {'detail': f'Cannot remove item from order in "{order.status}" status or after bill generation.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            item = order.items.get(pk=item_id)
            item.delete()
            order.recalculate_totals()
            order.refresh_from_db()
            return Response(OrderSerializer(order, context={'request': request}).data)
        except OrderItem.DoesNotExist:
            return Response({'detail': 'Item not found.'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['patch', 'post'], url_path='update_item_qty')
    def update_item_qty(self, request, pk=None):
        """PATCH /orders/{id}/update_item_qty/  { item_id: N, delta: 1, quantity: N }"""
        order = self.get_object()

        # Verify waiter's assigned branch
        waiter_branch = get_waiter_branch(request)
        if waiter_branch and order.branch and order.branch != waiter_branch:
            raise PermissionDenied("Order belongs to another branch.")

        # Allow editing only before "Finalize / Request Bill"
        blocked_statuses = [
            Order.STATUS_BILL_REQUESTED,
            Order.STATUS_CANCELLED,
        ]
        if order.status in blocked_statuses or hasattr(order, 'invoice'):
            return Response(
                {'detail': f'Cannot edit items for order in "{order.status}" status or after bill generation.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        item_id = request.data.get('item_id')
        try:
            item = order.items.get(pk=item_id)
        except OrderItem.DoesNotExist:
            return Response({'detail': 'Item not found.'}, status=status.HTTP_404_NOT_FOUND)

        qty = request.data.get('quantity')
        delta = request.data.get('delta')
        if qty is not None:
            new_qty = int(qty)
        elif delta is not None:
            new_qty = item.quantity + int(delta)
        else:
            new_qty = item.quantity

        if new_qty <= 0:
            item.delete()
        else:
            item.quantity = new_qty
            item.subtotal = item.unit_price * new_qty
            item.save(update_fields=['quantity', 'subtotal'])

        order.recalculate_totals()
        order.refresh_from_db()
        return Response(OrderSerializer(order, context={'request': request}).data)

    @action(detail=True, methods=['patch', 'put'], url_path=r'update_item/(?P<item_id>\d+)')
    def update_item(self, request, pk=None, item_id=None):
        """PATCH /orders/{id}/update_item/{item_id}/  { quantity: N }"""
        order = self.get_object()

        # Verify waiter's assigned branch
        waiter_branch = get_waiter_branch(request)
        if waiter_branch and order.branch and order.branch != waiter_branch:
            raise PermissionDenied("Order belongs to another branch.")

        # Allow editing only before "Finalize / Request Bill"
        blocked_statuses = [
            Order.STATUS_BILL_REQUESTED,
            Order.STATUS_CANCELLED,
        ]
        if order.status in blocked_statuses or hasattr(order, 'invoice'):
            return Response(
                {'detail': f'Cannot edit items for order in "{order.status}" status or after bill generation.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            item = order.items.get(pk=item_id)
        except OrderItem.DoesNotExist:
            return Response({'detail': 'Item not found.'}, status=status.HTTP_404_NOT_FOUND)

        qty = request.data.get('quantity')
        try:
            qty = int(qty)
        except (TypeError, ValueError):
            return Response({'detail': 'quantity must be an integer.'},
                            status=status.HTTP_400_BAD_REQUEST)

        if qty <= 0:
            item.delete()
        else:
            item.quantity = qty
            item.subtotal = item.unit_price * qty
            item.save(update_fields=['quantity', 'subtotal'])

        order.recalculate_totals()
        order.refresh_from_db()
        return Response(OrderSerializer(order, context={'request': request}).data)

    @action(detail=True, methods=['post'], url_path='generate_bill')
    def generate_bill(self, request, pk=None):
        """
        POST /orders/{id}/generate_bill/
        Payload: { whatsapp_number: '9876543210' }

        Creates or updates an Invoice for this order.
        Returns the Invoice data including invoice_number and receipt_url.
        CASHIER / MANAGER / ADMIN only — waiters are not permitted.
        """
        # ── Permission guard: waiter cannot generate bills ─────────────────────
        if _is_waiter_user(request):
            return Response(
                {'detail': 'Only a Cashier can generate the bill. Please submit a Bill Request instead.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        from django.db import transaction

        order = self.get_object()
        if order.status == Order.STATUS_CANCELLED:
            return Response({'detail': 'Cannot generate bill for a cancelled order.'},
                            status=status.HTTP_400_BAD_REQUEST)

        delivery_method = str(request.data.get('delivery_method') or 'none').lower()
        if delivery_method not in ['whatsapp', 'print', 'none']:
            return Response({'detail': 'Invalid delivery method.'}, status=status.HTTP_400_BAD_REQUEST)

        whatsapp_raw = request.data.get('whatsapp_number', '')
        whatsapp = ''.join(c for c in whatsapp_raw if c.isdigit() or c == '+') if whatsapp_raw else ''
        if delivery_method == 'whatsapp':
            if not whatsapp:
                return Response({'detail': 'WhatsApp number is required.'}, status=status.HTTP_400_BAD_REQUEST)
            digits = ''.join(c for c in whatsapp if c.isdigit())
            if not (len(digits) == 10 or (len(digits) == 12 and digits.startswith('91'))):
                return Response({'detail': 'Please enter a valid WhatsApp number.'}, status=status.HTTP_400_BAD_REQUEST)
            if len(digits) == 10:
                whatsapp = f"+91{digits}"
            elif len(digits) == 12 and digits.startswith('91'):
                whatsapp = f"+{digits}"
        else:
            whatsapp = ''

        delivery_status = 'pending'
        receipt_status = 'NOT_SHARED'
        receipt_method = 'NONE'
        receipt_shared_at = None
        receipt_printed_at = None

        if delivery_method == 'whatsapp':
            delivery_status = 'shared'
            receipt_status = 'SHARED'
            receipt_method = 'WHATSAPP'
            from django.utils import timezone
            receipt_shared_at = timezone.now()
        elif delivery_method == 'print':
            delivery_status = 'printed'
            receipt_status = 'PRINTED'
            receipt_method = 'PRINT'
            from django.utils import timezone
            receipt_printed_at = timezone.now()
        elif delivery_method == 'none':
            delivery_status = 'not_shared'
            receipt_status = 'NOT_SHARED'
            receipt_method = 'NONE'

        with transaction.atomic():
            # Refresh totals before snapshotting
            order.recalculate_totals()
            order.refresh_from_db()

            # Store WhatsApp number and customer name on order
            update_fields_order = {}
            if whatsapp:
                update_fields_order['whatsapp_number'] = whatsapp
                order.whatsapp_number = whatsapp
            customer_name_val = str(request.data.get('customer_name', '') or '').strip()
            if customer_name_val:
                update_fields_order['customer_name'] = customer_name_val
                order.customer_name = customer_name_val
            if update_fields_order:
                Order.objects.filter(pk=order.pk).update(**update_fields_order)

            # Create or update invoice
            invoice, _ = Invoice.objects.get_or_create(
                order=order,
                defaults={
                    'whatsapp_number': whatsapp,
                    'customer_whatsapp': whatsapp,
                    'subtotal':   order.subtotal,
                    'tax_amount': order.tax_amount,
                    'total':      order.total,
                    'delivery_method': delivery_method,
                    'delivery_status': delivery_status,
                    'receipt_status': receipt_status,
                    'receipt_method': receipt_method,
                    'receipt_shared_at': receipt_shared_at,
                    'receipt_printed_at': receipt_printed_at,
                }
            )
            # Update financials + whatsapp + delivery_method + delivery_status on existing invoice
            invoice.whatsapp_number = whatsapp
            invoice.customer_whatsapp = whatsapp
            invoice.subtotal   = order.subtotal
            invoice.tax_amount = order.tax_amount
            invoice.total      = order.total
            invoice.delivery_method = delivery_method
            invoice.delivery_status = delivery_status
            invoice.receipt_status = receipt_status
            invoice.receipt_method = receipt_method
            invoice.receipt_shared_at = receipt_shared_at
            invoice.receipt_printed_at = receipt_printed_at
            invoice.save(update_fields=[
                'whatsapp_number', 'customer_whatsapp', 'subtotal', 'tax_amount', 'total',
                'delivery_method', 'delivery_status', 'receipt_status', 'receipt_method',
                'receipt_shared_at', 'receipt_printed_at', 'updated_at'
            ])

            # Mark table as bill_requested
            if order.table:
                try:
                    from menu.models import Table
                    Table.objects.filter(pk=order.table_id).update(status='bill_requested')
                except Exception:
                    pass

        return Response(
            InvoiceSerializer(invoice, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['post'], url_path='request_bill')
    def request_bill(self, request, pk=None):
        """
        POST /orders/{id}/request_bill/

        Waiter finalizes order and sends a Bill Request to the Cashier for their branch.

        Flow:
          1. Guard: order must not already be bill_requested, completed, or cancelled.
          2. Guard against duplicate bill requests (idempotent within the same order).
          3. Refresh & snapshot the current order totals.
          4. Create a WaiterRequest of type 'Bill Request' on the table (for the Cashier).
          5. Set order status → bill_requested.
          6. Set table status → available (frees it for the next customer).

        The Cashier sees this request on their Bill Requests page and handles
        invoice/payment generation separately (not done here).
        """
        from django.db import transaction

        order = self.get_object()

        if order.status == Order.STATUS_CANCELLED:
            return Response(
                {'detail': 'Cannot request bill for a cancelled order.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if order.status == Order.STATUS_BILL_REQUESTED:
            # Idempotent: already submitted; return the existing open request
            from menu.models import WaiterRequest
            existing = WaiterRequest.objects.filter(
                table_id=order.table_id,
                request_type='Bill Request',
                status__in=[WaiterRequest.STATUS_REQUESTED, WaiterRequest.STATUS_PROCESSING],
            ).first()
            from menu.serializers import WaiterRequestSerializer
            return Response(
                {
                    'detail': 'Bill request already submitted.',
                    'request': WaiterRequestSerializer(existing, context={'request': request}).data if existing else None,
                    'order_total': str(order.total),
                },
                status=status.HTTP_200_OK
            )

        if not order.table_id:
            return Response(
                {'detail': 'This order is not linked to a table.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Enforce the required flow: order must be COMPLETED (Served) before bill can be requested.
        # Waiters must mark the order as Served first, then Finalize / Request Bill.
        if order.status != Order.STATUS_COMPLETED:
            return Response(
                {
                    'detail': (
                        f'Cannot request bill — order is "{order.status}". '
                        'Please mark the order as Served first.'
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            order.recalculate_totals()
            order.refresh_from_db()

            from menu.models import Table, WaiterRequest

            # Idempotency: check for an existing open Bill Request for this order's table
            existing = WaiterRequest.objects.filter(
                table_id=order.table_id,
                request_type='Bill Request',
                status__in=[WaiterRequest.STATUS_REQUESTED, WaiterRequest.STATUS_PROCESSING],
            ).first()

            if existing:
                # Mark order as bill_requested without creating a new request
                if order.status != Order.STATUS_BILL_REQUESTED:
                    Order.objects.filter(pk=order.pk).update(status=Order.STATUS_BILL_REQUESTED)
                from menu.serializers import WaiterRequestSerializer
                return Response(
                    {
                        'detail': 'Bill request already submitted.',
                        'request': WaiterRequestSerializer(existing, context={'request': request}).data,
                        'order_total': str(order.total),
                    },
                    status=status.HTTP_200_OK
                )

            # Resolve the branch for this table
            table = Table.objects.select_related('branch').get(pk=order.table_id)
            branch = table.branch or order.branch

            # Build a summary message with all order items for the cashier
            items_text = '; '.join(
                f'{item.quantity}× {item.product_name} (₹{item.unit_price})'
                for item in order.items.all()
            )
            message = (
                f'Order {order.order_number} | '
                f'Customer: {order.customer_name or "Guest"} | '
                f'Items: {items_text} | '
                f'Subtotal: ₹{order.subtotal} | '
                f'Tax (5%%): ₹{order.tax_amount} | '
                f'Total: ₹{order.total}'
            )

            bill_request = WaiterRequest.objects.create(
                table=table,
                branch=branch,
                order=order,
                request_type='Bill Request',
                message=message,
                status=WaiterRequest.STATUS_REQUESTED,
                amount=order.total,
            )

            # Mark order as bill_requested
            Order.objects.filter(pk=order.pk).update(status=Order.STATUS_BILL_REQUESTED)
            order.status = Order.STATUS_BILL_REQUESTED

            # Free the table — the waiter is done, cashier takes over
            Table.objects.filter(pk=order.table_id).update(
                status=Table.STATUS_AVAILABLE,
                current_order_ref='',
            )

            # Optionally create a notification for admin/cashier visibility
            try:
                from notifications.models import Notification
                Notification.objects.create(
                    type=Notification.TYPE_BILL_REQUESTED,
                    title=f'Bill Request — {table.name}',
                    message=f'Waiter requested bill for Order {order.order_number}. Total: ₹{order.total}.',
                    order=order,
                    table=table,
                    status=Notification.STATUS_NEW,
                )
            except Exception:
                pass

        from menu.serializers import WaiterRequestSerializer
        return Response(
            {
                'detail': 'Bill request submitted. Table is now available.',
                'request': WaiterRequestSerializer(bill_request, context={'request': request}).data,
                'order_total': str(order.total),
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['post'], url_path='share_bill')
    def share_bill(self, request, pk=None):
        from django.db import transaction
        order = self.get_object()
        whatsapp = str(request.data.get('whatsapp_number') or '').strip()

        if whatsapp:
            digits = ''.join(c for c in whatsapp if c.isdigit())
            if len(digits) == 10:
                whatsapp = '+91' + digits
            elif len(digits) == 12 and digits.startswith('91'):
                whatsapp = '+' + digits
            elif not whatsapp.startswith('+'):
                whatsapp = '+' + whatsapp

        with transaction.atomic():
            if whatsapp:
                Order.objects.filter(pk=order.pk).update(whatsapp_number=whatsapp)
                order.whatsapp_number = whatsapp
                try:
                    from django.utils import timezone
                    invoice = order.invoice
                    invoice.whatsapp_number = whatsapp
                    invoice.customer_whatsapp = whatsapp
                    invoice.delivery_method = 'whatsapp'
                    invoice.delivery_status = 'shared'
                    invoice.receipt_status = 'SHARED'
                    invoice.receipt_method = 'WHATSAPP'
                    invoice.receipt_shared_at = timezone.now()
                    invoice.save(update_fields=[
                        'whatsapp_number', 'customer_whatsapp', 'delivery_method',
                        'delivery_status', 'receipt_status', 'receipt_method', 'receipt_shared_at', 'updated_at'
                    ])
                except Exception:
                    pass

            invoice = getattr(order, 'invoice', None)
            if not invoice:
                return Response({'error': 'Invoice not found. Generate bill first.'}, status=status.HTTP_400_BAD_REQUEST)

        return Response(InvoiceSerializer(invoice, context={'request': request}).data)

    @action(detail=True, methods=['post'], url_path='mark_receipt_shared')
    def mark_receipt_shared(self, request, pk=None):
        from django.db import transaction
        from django.utils import timezone
        order = self.get_object()
        method = str(request.data.get('method') or 'WHATSAPP').upper()
        customer_whatsapp = str(request.data.get('customer_whatsapp') or '').strip()

        if customer_whatsapp:
            digits = ''.join(c for c in customer_whatsapp if c.isdigit())
            if len(digits) == 10:
                customer_whatsapp = '+91' + digits
            elif len(digits) == 12 and digits.startswith('91'):
                customer_whatsapp = '+' + digits
            elif not customer_whatsapp.startswith('+'):
                customer_whatsapp = '+' + customer_whatsapp

        with transaction.atomic():
            invoice = getattr(order, 'invoice', None)
            if not invoice:
                return Response({'error': 'Invoice not found. Generate bill first.'}, status=status.HTTP_400_BAD_REQUEST)

            invoice.receipt_status = 'SHARED'
            invoice.receipt_method = method
            invoice.customer_whatsapp = customer_whatsapp
            invoice.receipt_shared_at = timezone.now()
            invoice.whatsapp_number = customer_whatsapp
            invoice.delivery_method = 'whatsapp'
            invoice.delivery_status = 'shared'
            invoice.save(update_fields=[
                'receipt_status', 'receipt_method', 'customer_whatsapp', 'receipt_shared_at',
                'whatsapp_number', 'delivery_method', 'delivery_status', 'updated_at'
            ])

            if customer_whatsapp:
                Order.objects.filter(pk=order.pk).update(whatsapp_number=customer_whatsapp)
                order.whatsapp_number = customer_whatsapp

        return Response(InvoiceSerializer(invoice, context={'request': request}).data)

    @action(detail=True, methods=['post'], url_path='mark_receipt_printed')
    def mark_receipt_printed(self, request, pk=None):
        from django.db import transaction
        from django.utils import timezone
        order = self.get_object()

        with transaction.atomic():
            invoice = getattr(order, 'invoice', None)
            if not invoice:
                return Response({'error': 'Invoice not found. Generate bill first.'}, status=status.HTTP_400_BAD_REQUEST)

            invoice.receipt_status = 'PRINTED'
            invoice.receipt_method = 'PRINT'
            invoice.receipt_printed_at = timezone.now()
            invoice.delivery_method = 'print'
            invoice.delivery_status = 'printed'
            invoice.save(update_fields=['receipt_status', 'receipt_method', 'receipt_printed_at', 'delivery_method', 'delivery_status', 'updated_at'])

        return Response(InvoiceSerializer(invoice, context={'request': request}).data)

    @action(detail=True, methods=['post'], url_path='mark_receipt_not_shared')
    def mark_receipt_not_shared(self, request, pk=None):
        from django.db import transaction
        order = self.get_object()

        with transaction.atomic():
            invoice = getattr(order, 'invoice', None)
            if not invoice:
                return Response({'error': 'Invoice not found. Generate bill first.'}, status=status.HTTP_400_BAD_REQUEST)

            invoice.receipt_status = 'NOT_SHARED'
            invoice.receipt_method = 'NONE'
            invoice.delivery_method = 'none'
            invoice.delivery_status = 'not_shared'
            invoice.save(update_fields=['receipt_status', 'receipt_method', 'delivery_method', 'delivery_status', 'updated_at'])

        return Response(InvoiceSerializer(invoice, context={'request': request}).data)

    @action(detail=True, methods=['post'], url_path='request_payment')
    def request_payment(self, request, pk=None):
        """
        POST /orders/{id}/request_payment/
        Status progression: BILL GENERATED -> PAYMENT REQUESTED
        Sends payment request to Cashier dashboard. Waiter does NOT process payment.
        """
        from django.db import transaction
        order = self.get_object()

        with transaction.atomic():
            invoice = getattr(order, 'invoice', None)
            if not invoice:
                return Response({'detail': 'Invoice not found. Please generate bill first.'}, status=status.HTTP_400_BAD_REQUEST)

            order.payment_status = 'payment_requested'
            order.save(update_fields=['payment_status', 'updated_at'])

            invoice.payment_status = 'payment_requested'
            invoice.save(update_fields=['payment_status', 'updated_at'])

            if order.table:
                from menu.models import Table
                Table.objects.filter(pk=order.table_id).update(status=Table.STATUS_BILL_REQUESTED)

            # Create notification for cashier
            try:
                from notifications.models import Notification
                Notification.objects.create(
                    type='payment_requested',
                    title=f'Payment Requested - Table {order.table_label}',
                    message=f'Waiter requested cashier payment for Order {order.order_number} (Amount: ₹{order.total}).',
                    table=order.table,
                    order=order,
                    total_amount=order.total,
                    status='new'
                )
            except Exception:
                pass

        return Response(InvoiceSerializer(invoice, context={'request': request}).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post', 'patch'], url_path='complete_payment')
    def complete_payment(self, request, pk=None):
        # Waiter cannot complete payment — cashier only
        if _is_waiter_user(request):
            return Response(
                {'detail': 'Only a Cashier can process payment.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        return self.complete_order(request, pk=pk)

    @action(detail=True, methods=['post'], url_path='complete_order')
    def complete_order(self, request, pk=None):
        """
        POST /orders/{id}/complete_order/
        Payload: { method: 'cash'|'card'|'upi'|'other', status: 'paid'|'pending' }

        Atomically:
        1. Mark order completed
        2. Mark invoice paid
        3. Create/update payment record
        4. Release table
        CASHIER / MANAGER / ADMIN only.
        """
        # Waiter cannot complete the order — cashier only
        if _is_waiter_user(request):
            return Response(
                {'detail': 'Only a Cashier can complete an order and process payment.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        from django.db import transaction

        order = self.get_object()
        method = str(request.data.get('method') or request.data.get('payment_method') or 'cash').lower()
        pay_status = str(request.data.get('status') or request.data.get('payment_status') or 'paid').lower()

        if method not in [Payment.METHOD_CASH, Payment.METHOD_CARD,
                          Payment.METHOD_UPI, Payment.METHOD_OTHER]:
            method = Payment.METHOD_CASH
        if pay_status not in [Payment.STATUS_PAID, Payment.STATUS_PENDING]:
            pay_status = Payment.STATUS_PAID

        # Resolve cashier name and terminal
        cashier_name = ''
        pos_terminal_obj = None
        user = getattr(request, 'user', None)
        if user and user.is_authenticated:
            if user.username and user.username.startswith('cashier_'):
                try:
                    cashier_id = int(user.username.split('_')[1])
                    from accounts.models import Cashier, POSTerminal
                    cashier = Cashier.objects.filter(pk=cashier_id).first()
                    if cashier:
                        cashier_name = cashier.name
                        terminal = POSTerminal.objects.filter(assigned_cashier=cashier).first()
                        if terminal:
                            pos_terminal_obj = terminal
                except Exception:
                    pass
            if not cashier_name:
                cashier_name = user.get_full_name() or user.username

        amount_received = Decimal(str(request.data.get('amount_received') or 0))
        change_returned = Decimal(str(request.data.get('change_returned') or 0))
        transaction_ref = str(request.data.get('transaction_ref') or request.data.get('transactionReference') or '').strip()

        try:
            with transaction.atomic():
                # Complete the order
                order.status = Order.STATUS_COMPLETED
                order.completed_at = timezone.now()
                order.payment_method = method
                order.payment_status = pay_status
                order.amount_received = amount_received
                order.change_returned = change_returned
                if transaction_ref:
                    order.transaction_ref = transaction_ref
                if cashier_name:
                    order.cashier_name = cashier_name
                if pos_terminal_obj:
                    order.pos_terminal = pos_terminal_obj
                if not order.branch and pos_terminal_obj and pos_terminal_obj.branch:
                    order.branch = pos_terminal_obj.branch

                order.save(update_fields=[
                    'status', 'completed_at', 'payment_method', 'payment_status',
                    'cashier_name', 'pos_terminal', 'branch', 'amount_received',
                    'change_returned', 'transaction_ref', 'updated_at'
                ])
                try:
                    invoice = Invoice.objects.get(order=order)
                    invoice.status  = Invoice.STATUS_PAID
                    invoice.paid_at = timezone.now()
                    invoice.save(update_fields=['status', 'paid_at', 'updated_at'])
                    transaction.savepoint_commit(_inv_sp)
                except Invoice.DoesNotExist:
                    transaction.savepoint_rollback(_inv_sp)
                    _inv_create_sp = transaction.savepoint()
                    try:
                        invoice = Invoice.objects.create(
                            order=order,
                            subtotal=order.subtotal,
                            tax_amount=order.tax_amount,
                            total=order.total,
                            status=Invoice.STATUS_PAID,
                            paid_at=timezone.now(),
                        )
                        transaction.savepoint_commit(_inv_create_sp)
                    except Exception:
                        transaction.savepoint_rollback(_inv_create_sp)
                        try:
                            invoice = Invoice.objects.get(order=order)
                            invoice.status  = Invoice.STATUS_PAID
                            invoice.paid_at = timezone.now()
                            invoice.save(update_fields=['status', 'paid_at', 'updated_at'])
                        except Exception:
                            pass
                except Exception:
                    transaction.savepoint_rollback(_inv_sp)

                # ── Create or update payment record ──────────────────────────
                payment = None
                _pay_sp = transaction.savepoint()
                try:
                    payment, created = Payment.objects.get_or_create(
                        order=order,
                        defaults={
                            'invoice': invoice,
                            'method':  method,
                            'status':  pay_status,
                            'amount':  order.total,
                        }
                    )
                    pay_update_fields = ['method', 'status']
                    payment.method = method
                    payment.status = pay_status
                    if pay_status == Payment.STATUS_PAID:
                        payment.paid_at = timezone.now()
                        pay_update_fields.append('paid_at')
                    payment.save(update_fields=pay_update_fields)
                    transaction.savepoint_commit(_pay_sp)
                except Exception as pay_exc:
                    transaction.savepoint_rollback(_pay_sp)
                    try:
                        payment = Payment.objects.get(order=order)
                        payment.method = method
                        payment.status = pay_status
                        pay_update_fields = ['method', 'status']
                        if pay_status == Payment.STATUS_PAID:
                            payment.paid_at = timezone.now()
                            pay_update_fields.append('paid_at')
                        payment.save(update_fields=pay_update_fields)
                    except Exception:
                        raise pay_exc

                # ── Release table ────────────────────────────────────────────
                if order.table_id:
                    try:
                        from menu.models import Table
                        Table.objects.filter(pk=order.table_id).update(
                            status=Table.STATUS_AVAILABLE,
                            current_order_ref='',
                        )
                    except Exception:
                        pass

                # ── Mark associated waiter bill requests completed ────────────
                if order.table_id:
                    try:
                        from menu.models import WaiterRequest
                        WaiterRequest.objects.filter(
                            table_id=order.table_id,
                            request_type='Bill Request',
                            status__in=['requested', 'processing', 'ready', 'new', 'in_progress']
                        ).update(status='completed')
                    except Exception:
                        pass

                # ── Mark associated bill_share requests completed ─────────────
                try:
                    from notifications.models import Notification
                    active_shares = Notification.objects.filter(
                        order=order,
                        type='bill_share'
                    ).exclude(status__in=['completed', 'dismissed'])
                    for share in active_shares:
                        share.status = 'completed'
                        share.save()
                except Exception:
                    pass

                # ── Notification ──────────────────────────────────────────────
                try:
                    from notifications.models import Notification
                    if not Notification.objects.filter(type='payment_completed', order=order).exists():
                        cashier_info = f"Cashier {cashier_name}" if cashier_name else "Staff"
                        Notification.objects.create(
                            type='payment_completed',
                            target_role='manager',
                            branch=order.branch,
                            title=f'Payment Processed: {order.order_number}',
                            message=(
                                f'{cashier_info} processed payment for Order #{order.order_number} via {method.upper()}. '
                                f'Total: ₹{order.total}.'
                            ),
                            order=order,
                            table=order.table,
                        )
                except Exception:
                    pass

        except Exception as exc:
            import logging
            logger = logging.getLogger(__name__)
            logger.exception('complete_order failed for order %s', pk)
            return Response(
                {'detail': str(exc) or 'Order completion failed. Please try again.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        order.refresh_from_db()
        return Response({
            'order':   OrderSerializer(order, context={'request': request}).data,
            'payment': PaymentSerializer(payment).data,
        })

    @action(detail=True, methods=['post'], url_path='receipt-sent')
    def receipt_sent(self, request, pk=None):
        """
        POST /orders/{id}/receipt-sent/
        Marks the receipt as sent and stores the sent timestamp.
        """
        order = self.get_object()
        
        # Check if invoice exists
        if not hasattr(order, 'invoice'):
            return Response({'detail': 'Invoice not generated for this order yet.'},
                            status=status.HTTP_400_BAD_REQUEST)
        
        invoice = order.invoice
        if not invoice.whatsapp_number:
            return Response({'detail': 'Customer WhatsApp number is not available.'},
                            status=status.HTTP_400_BAD_REQUEST)
        
        from django.utils import timezone
        invoice.receipt_status = 'sent'
        invoice.receipt_sent_at = timezone.now()
        invoice.save(update_fields=['receipt_status', 'receipt_sent_at', 'updated_at'])
        
        return Response(InvoiceSerializer(invoice, context={'request': request}).data,
                        status=status.HTTP_200_OK)



# ─────────────────────────────────────────────────────────────────────────────
# Dashboard APIs
# ─────────────────────────────────────────────────────────────────────────────

class DashboardStatsView(APIView):
    """GET /api/v1/dashboard/stats/ — today's KPIs."""

    def get(self, request):
        waiter_branch = get_waiter_branch(request)

        tz    = timezone.get_current_timezone()
        now   = timezone.now()
        today = now.date()

        # Today's window
        today_start = timezone.make_aware(datetime.combine(today, datetime.min.time()), tz)
        today_end   = timezone.make_aware(datetime.combine(today, datetime.max.time()), tz)

        # Yesterday
        yesterday       = today - timedelta(days=1)
        yesterday_start = timezone.make_aware(datetime.combine(yesterday, datetime.min.time()), tz)
        yesterday_end   = timezone.make_aware(datetime.combine(yesterday, datetime.max.time()), tz)

        today_qs     = Order.objects.filter(created_at__range=(today_start, today_end))
        yesterday_qs = Order.objects.filter(created_at__range=(yesterday_start, yesterday_end))

        if waiter_branch:
            today_qs     = today_qs.filter(branch=waiter_branch)
            yesterday_qs = yesterday_qs.filter(branch=waiter_branch)

        # Sales = sum of completed order totals
        today_sales     = today_qs.filter(status=Order.STATUS_COMPLETED).aggregate(
            s=Sum('total'))['s'] or Decimal('0')
        yesterday_sales = yesterday_qs.filter(status=Order.STATUS_COMPLETED).aggregate(
            s=Sum('total'))['s'] or Decimal('0')

        # Percentage change
        if yesterday_sales > 0:
            sales_change_pct = round(
                float((today_sales - yesterday_sales) / yesterday_sales * 100), 1
            )
        else:
            sales_change_pct = None  # no baseline

        # Order counts
        today_total     = today_qs.count()
        today_pending   = today_qs.filter(status=Order.STATUS_PENDING).count()
        today_preparing = today_qs.filter(status=Order.STATUS_PREPARING).count()
        today_completed = today_qs.filter(status=Order.STATUS_COMPLETED).count()
        today_ready     = today_qs.filter(status=Order.STATUS_READY).count()
        today_cancelled = today_qs.filter(status=Order.STATUS_CANCELLED).count()

        # Active tables (active floor tables in database)
        try:
            from menu.models import Table
            tables_qs = Table.objects.filter(active=True)
            if waiter_branch:
                tables_qs = tables_qs.filter(Q(branch=waiter_branch) | Q(branch__isnull=True))
            active_tables    = tables_qs.filter(active=True).count()
            occupied_tables  = tables_qs.filter(status='occupied').count()
            available_tables = tables_qs.filter(status='available').count()
            pending_bills    = tables_qs.filter(status__in=['bill_requested', 'needs_attention']).count()
            total_tables     = tables_qs.count()
        except Exception:
            active_tables    = 0
            occupied_tables  = 0
            available_tables = 0
            pending_bills    = 0
            total_tables     = 0

        # Active requests (table assistance requests excluding bill requests)
        try:
            from menu.models import WaiterRequest
            from menu.serializers import WaiterRequestSerializer
            reqs_qs = WaiterRequest.objects.all()
            if waiter_branch:
                reqs_qs = reqs_qs.filter(Q(branch=waiter_branch) | Q(branch__isnull=True) | Q(table__branch=waiter_branch))

            # Exclude bill requests (which are handled on /bill-requests under pending bills)
            table_reqs = reqs_qs.exclude(
                Q(request_type__icontains='bill') | Q(message__icontains='bill')
            )

            active_requests = table_reqs.filter(
                status__in=[WaiterRequest.STATUS_REQUESTED, WaiterRequest.STATUS_PROCESSING, 'new', 'in_progress']
            ).count()

            recent_requests = WaiterRequestSerializer(
                table_reqs.exclude(status__in=[WaiterRequest.STATUS_COMPLETED, WaiterRequest.STATUS_DISMISSED]).order_by('-created_at')[:5],
                many=True,
                context={'request': request}
            ).data
        except Exception:
            active_requests = 0
            recent_requests = []

        # Active orders (pending, preparing, or ready status Orders across all time)
        all_orders_qs = Order.objects.all()
        if waiter_branch:
            all_orders_qs = all_orders_qs.filter(branch=waiter_branch)
        active_orders = all_orders_qs.filter(
            status__in=[Order.STATUS_PENDING, Order.STATUS_PREPARING, Order.STATUS_READY, Order.STATUS_BILL_REQUESTED]
        ).count()

        return Response({
            'today_sales':       float(today_sales),
            'yesterday_sales':   float(yesterday_sales),
            'sales_change_pct':  sales_change_pct,
            'today_orders':      today_total,
            'pending':           today_pending,
            'preparing':         today_preparing,
            'ready':             today_ready,
            'completed':         today_completed,
            'cancelled':         today_cancelled,
            'active_tables':     active_tables,
            'occupied_tables':   occupied_tables,
            'available_tables':  available_tables,
            'total_tables':      total_tables,
            'active_requests':   active_requests,
            'pending_requests':  active_requests,
            'active_orders':     active_orders,
            'pending_bills':     pending_bills,
            'recent_requests':   recent_requests,
            'branch':            waiter_branch.name if waiter_branch else 'Main Branch',
        })


class DashboardRecentOrdersView(APIView):
    """GET /api/v1/dashboard/recent-orders/?limit=8 — most recent orders."""

    def get(self, request):
        limit  = int(request.query_params.get('limit', 8))
        qs     = Order.objects.select_related('table', 'branch').prefetch_related('items')
        waiter_branch = get_waiter_branch(request)
        if waiter_branch:
            qs = qs.filter(branch=waiter_branch)
        orders = qs.order_by('-created_at')[:limit]
        data   = []
        for o in orders:
            data.append({
                'id':           o.id,
                'order_number': o.order_number,
                'table':        o.table_label,
                'customer':     o.customer_name or o.table_label,
                'waiter':       o.waiter_name,
                'items':        o.item_count,
                'items_summary': o.items_summary,
                'total':        float(o.total),
                'status':       o.status.upper(),
                'created_at':   o.created_at.isoformat(),
            })
        return Response(data)


class DashboardBestSellersView(APIView):
    """GET /api/v1/dashboard/best-sellers/?limit=5&period=daily — top products by quantity sold."""

    def get(self, request):
        limit  = int(request.query_params.get('limit', 5))
        period = request.query_params.get('period', 'daily')
        start, end = _get_period_range(period)

        # Aggregate order items from completed orders only
        items = (
            OrderItem.objects
            .filter(
                order__status=Order.STATUS_COMPLETED,
                order__created_at__range=(start, end),
            )
            .values('product', 'product_name')
            .annotate(
                qty_sold   = Sum('quantity'),
                revenue    = Sum('subtotal'),
            )
            .order_by('-qty_sold')[:limit]
        )

        data = []
        for item in items:
            product_data = {
                'product_id':   item['product'],
                'name':         item['product_name'],
                'qty_sold':     item['qty_sold'],
                'revenue':      float(item['revenue']),
                'price':        None,
                'image_url':    None,
            }
            # Enrich with current product data if still exists
            if item['product']:
                try:
                    from menu.models import Product
                    p = Product.objects.get(pk=item['product'])
                    product_data['price']     = float(p.price)
                    product_data['image_url'] = p.image_url
                except Exception:
                    pass
            data.append(product_data)

        return Response(data)


class DashboardSalesChartView(APIView):
    """GET /api/v1/dashboard/sales-chart/?period=weekly — daily revenue points for the chart."""

    def get(self, request):
        period = request.query_params.get('period', 'weekly')
        branch = request.query_params.get('branch')
        tz     = timezone.get_current_timezone()
        today  = timezone.now().date()

        def _apply_branch(qs):
            if branch:
                try:
                    return qs.filter(branch_id=int(branch))
                except (ValueError, TypeError):
                    pass
            return qs

        if period in ('daily', 'custom'):
            # For custom range, use _get_period_range; for daily use today
            date_from = request.query_params.get('date_from')
            date_to   = request.query_params.get('date_to')
            if period == 'custom' and date_from and date_to:
                start, end = _get_period_range('custom', date_from, date_to)
                # Day-by-day buckets for custom range
                rows = (
                    _apply_branch(Order.objects)
                    .filter(
                        created_at__range=(start, end),
                        status=Order.STATUS_COMPLETED,
                    )
                    .annotate(bucket=TruncDate('created_at', tzinfo=tz))
                    .values('bucket')
                    .annotate(value=Sum('total'))
                    .order_by('bucket')
                )
                from datetime import date as date_cls
                start_date = date_cls.fromisoformat(date_from)
                end_date   = date_cls.fromisoformat(date_to)
                days = (end_date - start_date).days + 1
                row_map = {row['bucket']: float(row['value']) for row in rows}
                data = []
                for i in range(days):
                    d     = start_date + timedelta(days=i)
                    label = d.strftime('%d %b')
                    data.append({'label': label, 'value': row_map.get(d, 0)})
            else:
                # Hourly buckets for today
                start, end = _get_period_range('daily')
                rows = (
                    _apply_branch(Order.objects)
                    .filter(
                        created_at__range=(start, end),
                        status=Order.STATUS_COMPLETED,
                    )
                    .annotate(bucket=TruncHour('created_at', tzinfo=tz))
                    .values('bucket')
                    .annotate(value=Sum('total'))
                    .order_by('bucket')
                )
                data = [
                    {
                        'label': row['bucket'].astimezone(tz).strftime('%I%p').lstrip('0'),
                        'value': float(row['value']),
                    }
                    for row in rows
                ]
        else:
            # Daily buckets for the week/month
            if period == 'monthly':
                days = 30
            else:
                days = 7

            start_date = today - timedelta(days=days - 1)
            start = timezone.make_aware(
                datetime.combine(start_date, datetime.min.time()), tz
            )
            end = timezone.make_aware(
                datetime.combine(today, datetime.max.time()), tz
            )

            rows = (
                _apply_branch(Order.objects)
                .filter(
                    created_at__range=(start, end),
                    status=Order.STATUS_COMPLETED,
                )
                .annotate(bucket=TruncDate('created_at', tzinfo=tz))
                .values('bucket')
                .annotate(value=Sum('total'))
                .order_by('bucket')
            )

            # Fill in zero days
            row_map = {row['bucket']: float(row['value']) for row in rows}
            data = []
            for i in range(days):
                d     = start_date + timedelta(days=i)
                label = d.strftime('%a') if days <= 7 else f"{d.day} {d.strftime('%b')}"
                data.append({'label': label, 'value': row_map.get(d, 0)})

        return Response({'period': period, 'data': data})


# ─────────────────────────────────────────────────────────────────────────────
# Reports APIs
# ─────────────────────────────────────────────────────────────────────────────

class ReportsSummaryView(APIView):
    """GET /api/v1/reports/summary/?period=daily|weekly|monthly&date_from=&date_to="""

    def get(self, request):
        period    = request.query_params.get('period', 'weekly')
        date_from = request.query_params.get('date_from')
        date_to   = request.query_params.get('date_to')
        branch    = request.query_params.get('branch')
        start, end = _get_period_range(period, date_from, date_to)

        qs = Order.objects.filter(created_at__range=(start, end))
        if branch:
            try:
                qs = qs.filter(branch_id=int(branch))
            except (ValueError, TypeError):
                pass

        total     = qs.count()
        completed = qs.filter(status=Order.STATUS_COMPLETED).count()
        pending   = qs.filter(status__in=[Order.STATUS_PENDING, Order.STATUS_PREPARING, Order.STATUS_READY]).count()
        cancelled = qs.filter(status=Order.STATUS_CANCELLED).count()

        completed_qs = qs.filter(status=Order.STATUS_COMPLETED)
        revenue      = completed_qs.aggregate(r=Sum('total'))['r'] or Decimal('0')
        avg_value    = completed_qs.aggregate(a=Avg('total'))['a'] or Decimal('0')

        # Previous period for comparison
        period_len = (end - start)
        prev_start = start - period_len
        prev_end   = start
        prev_qs    = Order.objects.filter(created_at__range=(prev_start, prev_end))
        if branch:
            try:
                prev_qs = prev_qs.filter(branch_id=int(branch))
            except (ValueError, TypeError):
                pass
        prev_revenue = prev_qs.filter(status=Order.STATUS_COMPLETED).aggregate(
            r=Sum('total'))['r'] or Decimal('0')

        if prev_revenue > 0:
            revenue_change_pct = round(
                float((revenue - prev_revenue) / prev_revenue * 100), 1
            )
        else:
            revenue_change_pct = None

        return Response({
            'period':              period,
            'date_from':           start.isoformat(),
            'date_to':             end.isoformat(),
            'total_orders':        total,
            'completed':           completed,
            'pending':             pending,
            'cancelled':           cancelled,
            'revenue':             float(revenue),
            'avg_order_value':     float(avg_value),
            'revenue_change_pct':  revenue_change_pct,
            'prev_revenue':        float(prev_revenue),
        })


class ReportsRevenueChartView(APIView):
    """GET /api/v1/reports/revenue-chart/?period=daily|weekly|monthly&branch=<id>"""

    def get(self, request):
        # Reuse dashboard chart logic (branch param passed through request.query_params)
        view = DashboardSalesChartView()
        view.request = request
        return view.get(request)


class ReportsTopCategoriesView(APIView):
    """GET /api/v1/reports/top-categories/?period=weekly"""

    def get(self, request):
        period    = request.query_params.get('period', 'weekly')
        date_from = request.query_params.get('date_from')
        date_to   = request.query_params.get('date_to')
        branch    = request.query_params.get('branch')
        start, end = _get_period_range(period, date_from, date_to)

        # Sum revenue by product category from completed orders
        qs = OrderItem.objects.filter(
            order__status=Order.STATUS_COMPLETED,
            order__created_at__range=(start, end),
            product__category__isnull=False,
        )
        if branch:
            try:
                qs = qs.filter(order__branch_id=int(branch))
            except (ValueError, TypeError):
                pass

        rows = (
            qs
            .values('product__category__name')
            .annotate(revenue=Sum('subtotal'), qty=Sum('quantity'))
            .order_by('-revenue')
        )

        total_revenue = sum(float(r['revenue']) for r in rows) or 1
        data = [
            {
                'name':    row['product__category__name'],
                'revenue': float(row['revenue']),
                'qty':     row['qty'],
                'pct':     round(float(row['revenue']) / total_revenue * 100, 1),
            }
            for row in rows
        ]
        return Response(data)


# ─────────────────────────────────────────────────────────────────────────────
# Invoice Views
# ─────────────────────────────────────────────────────────────────────────────

class InvoiceByOrderView(APIView):
    """
    GET /api/v1/orders/{order_id}/invoice/
    Returns the invoice for the given order (if it exists).
    """
    def get(self, request, order_id):
        try:
            order   = Order.objects.get(pk=order_id)
            invoice = order.invoice
        except Order.DoesNotExist:
            return Response({'detail': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)
        except Invoice.DoesNotExist:
            return Response({'detail': 'No invoice yet. Please generate a bill first.'},
                            status=status.HTTP_404_NOT_FOUND)
        return Response(InvoiceSerializer(invoice, context={'request': request}).data)


class PublicReceiptView(APIView):
    """
    GET /receipt/{token}/
    Public page — no auth required.
    Returns invoice data for the customer-facing digital receipt.
    """
    permission_classes = []  # public

    def get(self, request, token):
        try:
            invoice = Invoice.objects.select_related('order__table').get(token=token)
        except (Invoice.DoesNotExist, ValueError):
            return Response({'detail': 'Receipt not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(InvoiceSerializer(invoice, context={'request': request}).data)


# ── Expense ViewSet ────────────────────────────────────────────────────────────

class ExpenseViewSet(viewsets.ModelViewSet):
    """
    CRUD for Expenses. Requires Admin or Manager.

    Query params:
      branch      — filter by branch id
      category    — filter by category slug
      status      — filter by status
      search      — partial match on title or description
      date_from   — ISO date YYYY-MM-DD (inclusive)
      date_to     — ISO date YYYY-MM-DD (inclusive)
    """
    serializer_class   = ExpenseSerializer
    permission_classes = [IsAdminOrManager]

    def get_queryset(self):
        qs = Expense.objects.select_related('branch').order_by('-date', '-created_at')

        from accounts.utils import get_waiter_branch
        waiter_branch = get_waiter_branch(self.request)
        
        # If user is a branch manager (waiter_branch is not None), force filter
        if waiter_branch:
            qs = qs.filter(branch=waiter_branch)
        else:
            # For owner, optionally filter by query param
            branch = self.request.query_params.get('branch')
            if branch:
                qs = qs.filter(branch_id=branch)

        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category=category)

        exp_status = self.request.query_params.get('status')
        if exp_status:
            qs = qs.filter(status=exp_status)

        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(title__icontains=search) | Q(description__icontains=search)
            )

        date_from = self.request.query_params.get('date_from')
        if date_from:
            try:
                qs = qs.filter(date__gte=date.fromisoformat(date_from))
            except ValueError:
                pass

        date_to = self.request.query_params.get('date_to')
        if date_to:
            try:
                qs = qs.filter(date__lte=date.fromisoformat(date_to))
            except ValueError:
                pass

        return qs

    def perform_create(self, serializer):
        from accounts.utils import get_waiter_branch
        waiter_branch = get_waiter_branch(self.request)
        if waiter_branch:
            serializer.save(branch=waiter_branch)
        else:
            serializer.save()
