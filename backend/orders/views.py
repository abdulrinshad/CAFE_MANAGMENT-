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

from .models import Order, OrderItem, Invoice, Payment
from .serializers import (
    OrderSerializer, OrderListSerializer,
    OrderStatusSerializer, OrderItemSerializer,
    InvoiceSerializer, PaymentSerializer,
)


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



# ─────────────────────────────────────────────────────────────────────────────
# Orders ViewSet
# ─────────────────────────────────────────────────────────────────────────────

class OrderViewSet(viewsets.ModelViewSet):
    """
    Full CRUD for Orders.
    GET    /api/v1/orders/             list (with ?status= ?search= filters)
    POST   /api/v1/orders/             create
    GET    /api/v1/orders/{id}/        retrieve
    PATCH  /api/v1/orders/{id}/        partial update
    DELETE /api/v1/orders/{id}/        cancel (soft)
    PATCH  /api/v1/orders/{id}/set_status/   change status
    POST   /api/v1/orders/{id}/add_item/     add an item to the order
    DELETE /api/v1/orders/{id}/remove_item/{item_id}/  remove item
    """
    queryset = Order.objects.select_related('table').prefetch_related('items__product').all()
    ordering_fields  = ['created_at', 'status', 'total']
    ordering         = ['-created_at']

    def get_serializer_class(self):
        if self.action == 'list':
            return OrderListSerializer
        return OrderSerializer

    def get_queryset(self):
        qs = super().get_queryset()
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

    @action(detail=True, methods=['patch'], url_path='set_status')
    def set_status(self, request, pk=None):
        """
        Advance order status one step at a time:
          pending → preparing → ready → completed

        Table.status stays OCCUPIED for all active states.
        Table becomes AVAILABLE only after complete_order (bill paid).
        Cancellation returns table to AVAILABLE immediately.
        """
        order    = self.get_object()
        new_stat = (request.data.get('status') or '').lower().strip()

        # Allowed step-by-step transitions
        TRANSITIONS = {
            Order.STATUS_PENDING:   Order.STATUS_PREPARING,
            Order.STATUS_PREPARING: Order.STATUS_READY,
            Order.STATUS_READY:     Order.STATUS_COMPLETED,
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
        try:
            item = order.items.get(pk=item_id)
            item.delete()
            order.recalculate_totals()
            order.refresh_from_db()
            return Response(OrderSerializer(order, context={'request': request}).data)
        except OrderItem.DoesNotExist:
            return Response({'detail': 'Item not found.'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['patch'], url_path=r'update_item/(?P<item_id>\d+)')
    def update_item(self, request, pk=None, item_id=None):
        """PATCH /orders/{id}/update_item/{item_id}/  { quantity: N }"""
        order = self.get_object()
        try:
            item = order.items.get(pk=item_id)
        except OrderItem.DoesNotExist:
            return Response({'detail': 'Item not found.'}, status=status.HTTP_404_NOT_FOUND)

        qty = request.data.get('quantity')
        try:
            qty = int(qty)
            if qty < 1:
                raise ValueError
        except (TypeError, ValueError):
            return Response({'detail': 'quantity must be a positive integer.'},
                            status=status.HTTP_400_BAD_REQUEST)

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
        """
        from django.db import transaction

        order = self.get_object()
        if order.status == Order.STATUS_CANCELLED:
            return Response({'detail': 'Cannot generate bill for a cancelled order.'},
                            status=status.HTTP_400_BAD_REQUEST)

        whatsapp = request.data.get('whatsapp_number', '').replace(' ', '')

        # Validate 10-digit Indian number
        if whatsapp and (not whatsapp.isdigit() or len(whatsapp) != 10):
            return Response({'detail': 'Please enter a valid 10-digit WhatsApp number.'},
                            status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            # Refresh totals before snapshotting
            order.recalculate_totals()
            order.refresh_from_db()

            # Store WhatsApp number on order
            if whatsapp:
                Order.objects.filter(pk=order.pk).update(whatsapp_number=whatsapp)
                order.whatsapp_number = whatsapp

            # Create or update invoice
            invoice, _ = Invoice.objects.get_or_create(
                order=order,
                defaults={
                    'whatsapp_number': whatsapp,
                    'subtotal':   order.subtotal,
                    'tax_amount': order.tax_amount,
                    'total':      order.total,
                }
            )
            # Update financials + whatsapp on existing invoice
            invoice.whatsapp_number = whatsapp
            invoice.subtotal   = order.subtotal
            invoice.tax_amount = order.tax_amount
            invoice.total      = order.total
            invoice.save(update_fields=['whatsapp_number', 'subtotal', 'tax_amount', 'total', 'updated_at'])

            # Mark table as bill_requested
            if order.table:
                try:
                    from menu.models import Table
                    Table.objects.filter(pk=order.table_id).update(status='bill_requested')
                except Exception:
                    pass

            # Notification
            try:
                from notifications.models import Notification
                Notification.objects.create(
                    type='bill_requested',
                    title=f'Bill Requested: {order.order_number}',
                    message=(
                        f'Bill generated for {order.table_label}. '
                        f'Invoice {invoice.invoice_number}. '
                        f'Total: \u20b9{invoice.total}.'
                    ),
                    order=order,
                    table=order.table,
                )
            except Exception:
                pass

        return Response(
            InvoiceSerializer(invoice, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )

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
        """
        from django.db import transaction

        order = self.get_object()
        method = request.data.get('method', 'cash').lower()
        pay_status = request.data.get('status', 'paid').lower()

        if method not in [Payment.METHOD_CASH, Payment.METHOD_CARD,
                          Payment.METHOD_UPI, Payment.METHOD_OTHER]:
            method = Payment.METHOD_CASH
        if pay_status not in [Payment.STATUS_PAID, Payment.STATUS_PENDING]:
            pay_status = Payment.STATUS_PAID

        with transaction.atomic():
            # Complete the order
            order.status = Order.STATUS_COMPLETED
            order.completed_at = timezone.now()
            order.save(update_fields=['status', 'completed_at', 'updated_at'])

            # Mark invoice paid
            invoice = None
            try:
                invoice = order.invoice
                invoice.status  = Invoice.STATUS_PAID
                invoice.paid_at = timezone.now()
                invoice.save(update_fields=['status', 'paid_at', 'updated_at'])
            except Invoice.DoesNotExist:
                pass

            # Create or update payment
            payment, _ = Payment.objects.get_or_create(
                order=order,
                defaults={
                    'invoice': invoice,
                    'method':  method,
                    'status':  pay_status,
                    'amount':  order.total,
                }
            )
            if pay_status == Payment.STATUS_PAID and payment.status != Payment.STATUS_PAID:
                payment.method  = method
                payment.status  = pay_status
                payment.paid_at = timezone.now()
                payment.save(update_fields=['method', 'status', 'paid_at'])

            # Release table
            if order.table:
                try:
                    from menu.models import Table
                    Table.objects.filter(pk=order.table_id).update(
                        status='available',
                        current_order_ref='',
                    )
                except Exception:
                    pass

            # Notification
            try:
                from notifications.models import Notification
                Notification.objects.create(
                    type='payment_completed',
                    title=f'Payment Complete: {order.order_number}',
                    message=(
                        f'Order {order.order_number} paid via {method.title()}. '
                        f'Total: \u20b9{order.total}. '
                        f'Table {order.table_label} is now available.'
                    ),
                    order=order,
                    table=order.table,
                )
            except Exception:
                pass

        order.refresh_from_db()
        return Response({
            'order':   OrderSerializer(order, context={'request': request}).data,
            'payment': PaymentSerializer(payment).data,
        })


# ─────────────────────────────────────────────────────────────────────────────
# Dashboard APIs
# ─────────────────────────────────────────────────────────────────────────────

class DashboardStatsView(APIView):
    """GET /api/v1/dashboard/stats/ — today's KPIs."""

    def get(self, request):
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

        # Active tables (occupied or bill_requested)
        try:
            from menu.models import Table
            active_tables = Table.objects.filter(
                status__in=['occupied', 'bill_requested']
            ).count()
            total_tables = Table.objects.filter(active=True).count()
        except Exception:
            active_tables = 0
            total_tables  = 0

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
            'total_tables':      total_tables,
        })


class DashboardRecentOrdersView(APIView):
    """GET /api/v1/dashboard/recent-orders/?limit=8 — most recent orders."""

    def get(self, request):
        limit  = int(request.query_params.get('limit', 8))
        orders = Order.objects.select_related('table').prefetch_related('items').order_by('-created_at')[:limit]
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
        tz     = timezone.get_current_timezone()
        today  = timezone.now().date()

        if period == 'daily':
            # Hourly buckets for today
            start, end = _get_period_range('daily')
            rows = (
                Order.objects
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
                Order.objects
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
        start, end = _get_period_range(period, date_from, date_to)

        qs = Order.objects.filter(created_at__range=(start, end))

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
    """GET /api/v1/reports/revenue-chart/?period=daily|weekly|monthly"""

    def get(self, request):
        # Reuse dashboard chart logic
        view = DashboardSalesChartView()
        view.request = request
        return view.get(request)


class ReportsTopCategoriesView(APIView):
    """GET /api/v1/reports/top-categories/?period=weekly"""

    def get(self, request):
        period    = request.query_params.get('period', 'weekly')
        date_from = request.query_params.get('date_from')
        date_to   = request.query_params.get('date_to')
        start, end = _get_period_range(period, date_from, date_to)

        # Sum revenue by product category from completed orders
        rows = (
            OrderItem.objects
            .filter(
                order__status=Order.STATUS_COMPLETED,
                order__created_at__range=(start, end),
                product__category__isnull=False,
            )
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

