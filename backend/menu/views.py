"""
ViewSets for the menu app.

CategoryViewSet  — full CRUD for categories
ProductViewSet   — full CRUD for products + custom actions
TableViewSet     — full CRUD for tables + custom actions
QRCodeViewSet    — full CRUD for QR codes + custom actions
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.http import FileResponse

from .models import Category, Product, Table, QRCode, WaiterRequest
from .serializers import (
    CategorySerializer,
    ProductSerializer,
    ProductListSerializer,
    ProductAvailabilitySerializer,
    ProductPopularSerializer,
    TableSerializer,
    TableStatusSerializer,
    TableActiveSerializer,
    QRCodeSerializer,
    QRCodeStatusSerializer,
    WaiterRequestSerializer,
)

from .filters import CategoryFilter, ProductFilter


class CategoryViewSet(viewsets.ModelViewSet):
    queryset         = Category.objects.all()
    serializer_class = CategorySerializer
    filterset_class  = CategoryFilter
    search_fields    = ['name']
    ordering_fields  = ['display_order', 'name', 'created_at']
    ordering         = ['display_order', 'name']


class ProductViewSet(viewsets.ModelViewSet):
    queryset        = Product.objects.select_related('category').all()
    filterset_class = ProductFilter
    search_fields   = ['name', 'description']
    ordering_fields = ['display_order', 'price', 'name', 'created_at']
    ordering        = ['display_order', 'name']
    parser_classes  = [MultiPartParser, FormParser, JSONParser]

    def get_serializer_class(self):
        if self.action == 'list':
            return ProductListSerializer
        return ProductSerializer

    @action(detail=True, methods=['patch'], url_path='set_availability')
    def set_availability(self, request, pk=None):
        product    = self.get_object()
        serializer = ProductAvailabilitySerializer(product, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['patch'], url_path='set_popular')
    def set_popular(self, request, pk=None):
        product    = self.get_object()
        serializer = ProductPopularSerializer(product, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)


# ─────────────────────────────────────────────────────────────────────────────
# Table ViewSet
# ─────────────────────────────────────────────────────────────────────────────

class TableViewSet(viewsets.ModelViewSet):
    """
    Full CRUD for Tables.
    Creating a table auto-generates a QR code via Django signal.

    GET    /api/v1/tables/                   list
    POST   /api/v1/tables/                   create
    GET    /api/v1/tables/{id}/              retrieve
    PUT    /api/v1/tables/{id}/              full update
    PATCH  /api/v1/tables/{id}/              partial update
    DELETE /api/v1/tables/{id}/              delete (cascades QR)
    PATCH  /api/v1/tables/{id}/set_status/   change status
    PATCH  /api/v1/tables/{id}/set_active/   activate/deactivate
    """

    queryset         = Table.objects.prefetch_related('qr_code').all()
    serializer_class = TableSerializer
    ordering_fields  = ['name', 'seats', 'status', 'created_at']
    ordering         = ['name']

    @action(detail=True, methods=['patch'], url_path='set_status')
    def set_status(self, request, pk=None):
        table      = self.get_object()
        serializer = TableStatusSerializer(table, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        # Refresh from DB to get related qr_code
        table.refresh_from_db()
        return Response(TableSerializer(table, context={'request': request}).data)

    @action(detail=True, methods=['patch'], url_path='set_active')
    def set_active(self, request, pk=None):
        table      = self.get_object()
        serializer = TableActiveSerializer(table, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        # Sync QR code status with table active state
        try:
            qr = table.qr_code
            qr.status = QRCode.STATUS_ACTIVE if table.active else QRCode.STATUS_INACTIVE
            qr.save(update_fields=['status'])
        except QRCode.DoesNotExist:
            pass

        table.refresh_from_db()
        return Response(TableSerializer(table, context={'request': request}).data)

    @action(detail=True, methods=['get'], url_path='active_order')
    def active_order(self, request, pk=None):
        table = self.get_object()
        order = table.orders.exclude(status__in=['completed', 'cancelled']).order_by('-created_at').first()
        if order:
            from orders.serializers import OrderSerializer
            return Response(OrderSerializer(order, context={'request': request}).data)
        return Response({'detail': 'No active order for this table.'}, status=status.HTTP_404_NOT_FOUND)



# ─────────────────────────────────────────────────────────────────────────────
# QRCode ViewSet
# ─────────────────────────────────────────────────────────────────────────────

class QRCodeViewSet(viewsets.ModelViewSet):
    """
    Full CRUD for QR Codes.

    GET    /api/v1/qrcodes/                  list all
    GET    /api/v1/qrcodes/{id}/             retrieve
    PATCH  /api/v1/qrcodes/{id}/set_status/  toggle active/inactive
    POST   /api/v1/qrcodes/{id}/regenerate/  re-generate QR PNG
    GET    /api/v1/qrcodes/{id}/download/    download PNG file
    """

    queryset         = QRCode.objects.select_related('table').all()
    serializer_class = QRCodeSerializer
    ordering_fields  = ['qr_id', 'status', 'generated_at']
    ordering         = ['table__name']

    @action(detail=True, methods=['patch'], url_path='set_status')
    def set_status(self, request, pk=None):
        qr_obj     = self.get_object()
        serializer = QRCodeStatusSerializer(qr_obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        qr_obj.refresh_from_db()
        return Response(QRCodeSerializer(qr_obj, context={'request': request}).data)

    @action(detail=True, methods=['post'], url_path='regenerate')
    def regenerate(self, request, pk=None):
        """Re-generate the QR PNG image. QR ID stays the same."""
        qr_obj = self.get_object()

        # Remove old image file
        if qr_obj.image:
            try:
                qr_obj.image.delete(save=False)
            except Exception:
                pass
            qr_obj.image = None

        # Regenerate
        qr_obj.generate_qr_image()
        qr_obj.save()

        return Response(QRCodeSerializer(qr_obj, context={'request': request}).data)

    @action(detail=True, methods=['get'], url_path='download')
    def download(self, request, pk=None):
        """Return QR PNG as a file download attachment."""
        qr_obj = self.get_object()
        if not qr_obj.image:
            return Response(
                {'detail': 'QR image not yet generated.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        try:
            file_handle = qr_obj.image.open('rb')
            resp = FileResponse(file_handle, content_type='image/png')
            resp['Content-Disposition'] = f'attachment; filename="{qr_obj.qr_id}.png"'
            return resp
        except Exception as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─────────────────────────────────────────────────────────────────────────────
# WaiterRequest ViewSet
# ─────────────────────────────────────────────────────────────────────────────

class WaiterRequestViewSet(viewsets.ModelViewSet):
    """
    CRUD for table requests (Call Waiter, Bill Request, etc.)
    GET    /api/v1/requests/                   list (optional ?status=)
    POST   /api/v1/requests/                   create
    GET    /api/v1/requests/{id}/              retrieve
    PATCH  /api/v1/requests/{id}/              partial update
    DELETE /api/v1/requests/{id}/              delete / dismiss
    PATCH  /api/v1/requests/{id}/set_status/   change status
    """

    queryset         = WaiterRequest.objects.select_related('table').all()
    serializer_class = WaiterRequestSerializer
    ordering_fields  = ['created_at', 'status']
    ordering         = ['-created_at']

    def get_queryset(self):
        qs = super().get_queryset()
        status_param = self.request.query_params.get('status')
        if status_param and status_param.lower() != 'all':
            qs = qs.filter(status=status_param.lower())
        table_param = self.request.query_params.get('table')
        if table_param:
            qs = qs.filter(table_id=table_param)
        return qs

    def create(self, request, *args, **kwargs):
        from django.db import transaction
        table_id = request.data.get('table')
        if not table_id:
            return Response({'detail': 'Table is required.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            active_request = WaiterRequest.objects.select_for_update().filter(
                table_id=table_id,
                status__in=[WaiterRequest.STATUS_NEW, WaiterRequest.STATUS_IN_PROGRESS]
            ).first()

            if active_request:
                serializer = self.get_serializer(active_request)
                return Response(serializer.data, status=status.HTTP_200_OK)

            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)
            headers = self.get_success_headers(serializer.data)
            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=True, methods=['patch'], url_path='set_status')
    def set_status(self, request, pk=None):
        req_obj = self.get_object()
        new_status = request.data.get('status')
        if new_status:
            req_obj.status = new_status.lower()
        if 'assigned_waiter' in request.data:
            req_obj.assigned_waiter = request.data['assigned_waiter']
        req_obj.save()
        return Response(WaiterRequestSerializer(req_obj, context={'request': request}).data)

    @action(detail=True, methods=['post', 'patch'], url_path='attend')
    def attend(self, request, pk=None):
        """
        Atomically claim/attend a waiter request.
        Prevents double-attendance using database row-level locking (select_for_update).
        """
        from django.db import transaction
        waiter_name = request.data.get('assigned_waiter') or request.data.get('waiter_name') or 'Staff'

        with transaction.atomic():
            req_obj = WaiterRequest.objects.select_for_update().filter(pk=pk).first()
            if not req_obj:
                return Response({'detail': 'Request not found.'}, status=status.HTTP_404_NOT_FOUND)

            # Check if already attended by someone else
            if req_obj.status in [WaiterRequest.STATUS_IN_PROGRESS, WaiterRequest.STATUS_COMPLETED] or (req_obj.assigned_waiter and req_obj.assigned_waiter != waiter_name):
                assigned_by = req_obj.assigned_waiter or 'another waiter'
                return Response({
                    'detail': f'This request has already been attended by {assigned_by}.',
                    'already_attended': True,
                    'assigned_waiter': req_obj.assigned_waiter,
                    'status': req_obj.status,
                    'request': WaiterRequestSerializer(req_obj, context={'request': request}).data
                }, status=status.HTTP_400_BAD_REQUEST)

            req_obj.status = WaiterRequest.STATUS_IN_PROGRESS
            req_obj.assigned_waiter = waiter_name
            req_obj.save()

        return Response(WaiterRequestSerializer(req_obj, context={'request': request}).data, status=status.HTTP_200_OK)


