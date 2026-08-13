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

from django.db import transaction
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

from .models import Order, OrderItem
from .serializers import (
    OrderSerializer, OrderListSerializer,
    OrderStatusSerializer, OrderItemSerializer,
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

    def get_object(self):
        queryset = self.filter_queryset(self.get_queryset())
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        pk = self.kwargs.get(lookup_url_kwarg)
        if pk:
            # Check numeric ID first
            if str(pk).isdigit():
                obj = queryset.filter(pk=int(pk)).first()
                if obj:
                    self.check_object_permissions(self.request, obj)
                    return obj
            # Check order_number (e.g. ORD-0001 or ORD-1)
            obj = queryset.filter(
                Q(order_number__iexact=str(pk)) | Q(order_number__iexact=f'ORD-{str(pk).zfill(4)}')
            ).first()
            if obj:
                self.check_object_permissions(self.request, obj)
                return obj
        return super().get_object()

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

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = serializer.save()

        # Automatically update table status to occupied if table attached
        if order.table:
            order.table.status = 'occupied'
            order.table.current_order_ref = order.order_number
            order.table.save(update_fields=['status', 'current_order_ref'])

        headers = self.get_success_headers(serializer.data)
        return Response(
            OrderSerializer(order, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
            headers=headers,
        )

    @action(detail=True, methods=['patch'], url_path='set_status')
    @transaction.atomic
    def set_status(self, request, pk=None):

        order      = self.get_object()
        serializer = OrderStatusSerializer(order, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        order.refresh_from_db()

        # Table workflow: when order is completed or cancelled, make table available
        if order.table and order.status in [Order.STATUS_COMPLETED, Order.STATUS_CANCELLED]:
            order.table.status = 'available'
            order.table.current_order_ref = ''
            order.table.save(update_fields=['status', 'current_order_ref'])

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

    @action(detail=True, methods=['patch', 'post'], url_path='update_item_qty')
    @transaction.atomic
    def update_item_qty(self, request, pk=None):
        order = self.get_object()
        item_id = request.data.get('item_id')
        qty = request.data.get('quantity')
        delta = request.data.get('delta')

        try:
            item = order.items.get(pk=item_id)
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
                item.save()

            order.recalculate_totals()
            order.refresh_from_db()
            return Response(OrderSerializer(order, context={'request': request}).data)
        except OrderItem.DoesNotExist:
            return Response({'detail': 'Item not found.'}, status=status.HTTP_404_NOT_FOUND)

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

    @action(detail=True, methods=['post'], url_path='generate_bill')
    @transaction.atomic
    def generate_bill(self, request, pk=None):
        order = self.get_object()
        raw_phone = str(request.data.get('whatsapp_number', '')).strip().replace(' ', '').replace('-', '').replace('+91', '')
        
        # Validate 10-digit Indian phone number
        if not raw_phone.isdigit() or len(raw_phone) != 10:
            return Response(
                {'detail': 'Please enter a valid 10-digit WhatsApp number.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        order.whatsapp_number = raw_phone

        # Ensure totals are recalculated from database items using Decimal
        order.recalculate_totals()

        # Generate invoice number if not already present
        if not order.invoice_number:
            from .models import Invoice
            last_inv = Invoice.objects.order_by('-id').first()
            next_num = (last_inv.id + 10450) if last_inv and last_inv.id else 10450
            order.invoice_number = f'INV-{next_num}'

        if not order.transaction_ref:
            import random
            rand_ref = random.randint(10000, 99999)
            order.transaction_ref = f'#AB-{rand_ref}'

        order.save()

        # Create or update Invoice record in PostgreSQL
        from .models import Invoice
        inv, _ = Invoice.objects.update_or_create(
            order=order,
            defaults={
                'invoice_number': order.invoice_number,
                'whatsapp_number': order.whatsapp_number,
                'subtotal': order.subtotal,
                'tax_amount': order.tax_amount,
                'total': order.total,
                'payment_method': order.payment_method,
                'payment_status': order.payment_status,
                'transaction_ref': order.transaction_ref,
            }
        )

        # Update table status if attached
        if order.table:
            order.table.status = 'bill_requested'
            order.table.save(update_fields=['status'])

        # Notification for Admin
        try:
            from notifications.models import Notification
            Notification.objects.create(
                order=order,
                type='bill_requested',
                title=f'Bill Generated: {order.invoice_number}',
                message=f'Bill generated for {order.table_label}. Total: ₹{order.total}.'
            )
        except Exception:
            pass

        order_data = OrderSerializer(order, context={'request': request}).data
        order_data['whatsapp_formatted'] = f'+91{raw_phone}'
        order_data['receipt_url'] = f'/invoice/{order.invoice_number}'
        return Response(order_data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post', 'patch'], url_path='complete_payment')
    @transaction.atomic
    def complete_payment(self, request, pk=None):
        order = self.get_object()
        pay_method = request.data.get('payment_method', 'Cash')
        pay_status = request.data.get('payment_status', 'Paid')

        order.payment_method = pay_method
        order.payment_status = 'paid' if pay_status.lower() == 'paid' else 'unpaid'
        order.status = Order.STATUS_COMPLETED
        order.completed_at = timezone.now()
        order.save()

        # Update Invoice record
        from .models import Invoice
        try:
            inv = order.invoice
            inv.payment_method = order.payment_method
            inv.payment_status = order.payment_status
            inv.save()
        except Exception:
            pass

        # Release table to available
        if order.table:
            order.table.status = 'available'
            order.table.current_order_ref = ''
            order.table.save(update_fields=['status', 'current_order_ref'])

        # Create Admin notification
        try:
            from notifications.models import Notification
            Notification.objects.create(
                order=order,
                type='payment_completed',
                title=f'Payment Completed: {order.order_number}',
                message=f'Payment of ₹{order.total} completed ({pay_method}) for {order.table_label}.'
            )
        except Exception:
            pass

        return Response(OrderSerializer(order, context={'request': request}).data)

    @action(detail=True, methods=['get'], url_path='receipt')
    def receipt(self, request, pk=None):
        order = self.get_object()
        return Response(OrderSerializer(order, context={'request': request}).data)



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

        # Table & Waiter request counts directly from PostgreSQL
        try:
            from menu.models import Table, WaiterRequest
            occupied_tables_count = Table.objects.filter(status='occupied').count()
            active_tables_count   = Table.objects.filter(status__in=['occupied', 'bill_requested']).count()
            total_tables          = Table.objects.filter(active=True).count()
            active_requests_count = WaiterRequest.objects.filter(status__in=['new', 'in_progress']).count()
            active_orders_count   = Order.objects.filter(status__in=[Order.STATUS_PENDING, Order.STATUS_PREPARING]).count()
            pending_bills_count   = Table.objects.filter(status__in=['bill_requested', 'needs_attention']).count()
        except Exception:
            occupied_tables_count = 0
            active_tables_count   = 0
            total_tables          = 0
            active_requests_count = 0
            active_orders_count   = 0
            pending_bills_count   = 0

        return Response({
            'today_sales':           float(today_sales),
            'yesterday_sales':       float(yesterday_sales),
            'sales_change_pct':      sales_change_pct,
            'today_orders':          today_total,
            'pending':               today_pending,
            'preparing':             today_preparing,
            'ready':                 today_ready,
            'completed':             today_completed,
            'cancelled':             today_cancelled,
            'active_tables':         active_tables_count,
            'occupied_tables':       occupied_tables_count,
            'total_tables':          total_tables,
            'active_requests':       active_requests_count,
            'active_orders':         active_orders_count,
            'pending_bills':         pending_bills_count,
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
