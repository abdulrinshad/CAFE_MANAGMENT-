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
from rest_framework.exceptions import PermissionDenied
from django.http import FileResponse

from accounts.utils import get_waiter_branch, BranchEnforceMixin
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


class CategoryViewSet(BranchEnforceMixin, viewsets.ModelViewSet):
    queryset         = Category.objects.all()
    serializer_class = CategorySerializer
    filterset_class  = CategoryFilter
    search_fields    = ['name']
    ordering_fields  = ['display_order', 'name', 'created_at']
    ordering         = ['display_order', 'name']

    def get_queryset(self):
        qs = super().get_queryset()
        waiter_branch = get_waiter_branch(self.request)
        if waiter_branch:
            qs = qs.filter(branch=waiter_branch)
        else:
            branch_id = self.request.query_params.get('branch')
            if branch_id and str(branch_id).lower() != 'all':
                if str(branch_id).isdigit():
                    qs = qs.filter(branch_id=branch_id)
        return qs

    # perform_create is handled by BranchEnforceMixin
class ProductViewSet(BranchEnforceMixin, viewsets.ModelViewSet):
    queryset        = Product.objects.select_related('category', 'branch').all()
    filterset_class = ProductFilter
    search_fields   = ['name', 'description']
    ordering_fields = ['display_order', 'price', 'name', 'created_at']
    ordering        = ['display_order', 'name']
    parser_classes  = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        from rest_framework.permissions import AllowAny, IsAuthenticated
        from accounts.permissions import IsManager, IsEmployeeOrAbove
        
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'set_availability', 'set_popular']:
            return [IsAuthenticated(), IsManager()]
        return [IsAuthenticated(), IsEmployeeOrAbove()]

    def get_queryset(self):
        qs = super().get_queryset()
        waiter_branch = get_waiter_branch(self.request)
        if waiter_branch:
            qs = qs.filter(branch=waiter_branch)
        else:
            branch_id = self.request.query_params.get('branch')
            if branch_id and str(branch_id).lower() != 'all':
                if str(branch_id).isdigit():
                    qs = qs.filter(branch_id=branch_id)
        return qs

    # perform_create is handled by BranchEnforceMixin

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

class TableViewSet(BranchEnforceMixin, viewsets.ModelViewSet):
    queryset         = Table.objects.prefetch_related('qr_code').all()
    serializer_class = TableSerializer
    ordering_fields  = ['name', 'seats', 'status', 'created_at']
    ordering         = ['name']

    def get_queryset(self):
        qs = super().get_queryset()
        waiter_branch = get_waiter_branch(self.request)
        if waiter_branch:
            qs = qs.filter(branch=waiter_branch)
        else:
            branch_id = self.request.query_params.get('branch')
            if branch_id and str(branch_id).lower() != 'all':
                if str(branch_id).isdigit():
                    qs = qs.filter(branch_id=branch_id)
        return qs

    def perform_create(self, serializer):
        waiter_branch = get_waiter_branch(self.request)
        if waiter_branch:
            serializer.save(branch=waiter_branch)
        else:
            branch_id = self.request.data.get('branch') or self.request.query_params.get('branch')
            if branch_id and str(branch_id).lower() != 'all':
                serializer.save(branch_id=branch_id)
            else:
                serializer.save()

    def check_table_branch(self, table):
        waiter_branch = get_waiter_branch(self.request)
        if waiter_branch and table.branch and table.branch != waiter_branch:
            raise PermissionDenied("You do not have permission to access tables from another branch.")

    @action(detail=True, methods=['patch'], url_path='set_status')
    def set_status(self, request, pk=None):
        table      = self.get_object()
        self.check_table_branch(table)
        serializer = TableStatusSerializer(table, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        table.refresh_from_db()
        return Response(TableSerializer(table, context={'request': request}).data)

    @action(detail=True, methods=['patch'], url_path='set_active')
    def set_active(self, request, pk=None):
        table      = self.get_object()
        self.check_table_branch(table)
        serializer = TableActiveSerializer(table, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

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
        self.check_table_branch(table)
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

    def get_queryset(self):
        qs = super().get_queryset()
        waiter_branch = get_waiter_branch(self.request)
        if waiter_branch:
            qs = qs.filter(table__branch=waiter_branch)
        else:
            branch_id = self.request.query_params.get('branch')
            if branch_id and str(branch_id).lower() != 'all':
                if str(branch_id).isdigit():
                    qs = qs.filter(table__branch_id=branch_id)
        return qs

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

    queryset         = WaiterRequest.objects.select_related('table', 'branch').all()
    serializer_class = WaiterRequestSerializer
    ordering_fields  = ['created_at', 'status']
    ordering         = ['-created_at']

    def get_queryset(self):
        qs = super().get_queryset()
        waiter_branch = get_waiter_branch(self.request)
        if waiter_branch:
            qs = qs.filter(branch=waiter_branch)
        else:
            branch_id = self.request.query_params.get('branch')
            if branch_id and str(branch_id).lower() != 'all':
                if str(branch_id).isdigit():
                    qs = qs.filter(branch_id=branch_id)
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

        # Resolve table and its branch
        target_table = Table.objects.filter(pk=table_id).first()
        if not target_table:
            # Try finding table by name/label
            target_table = Table.objects.filter(name=table_id).first()

        if not target_table:
            return Response({'detail': 'Specified table does not exist.'}, status=status.HTTP_404_NOT_FOUND)

        table_branch = target_table.branch or get_waiter_branch(request)

        with transaction.atomic():
            active_request = WaiterRequest.objects.select_for_update().filter(
                table=target_table,
                status__in=[WaiterRequest.STATUS_REQUESTED, WaiterRequest.STATUS_PROCESSING]
            ).first()

            if active_request:
                serializer = self.get_serializer(active_request)
                return Response(serializer.data, status=status.HTTP_200_OK)

            request_data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
            request_data['table'] = target_table.id
            serializer = self.get_serializer(data=request_data)
            serializer.is_valid(raise_exception=True)
            serializer.save(table=target_table, branch=table_branch)
            headers = self.get_success_headers(serializer.data)
            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=True, methods=['patch'], url_path='set_status')
    def set_status(self, request, pk=None):
        req_obj = self.get_object()
        new_status = request.data.get('status')

        # ── Permission guard ──────────────────────────────────────────────────
        # Waiters can only view bill requests. They cannot progress status.
        if req_obj.request_type == 'Bill Request':
            user = getattr(request, 'user', None)
            is_waiter = False
            if user and user.is_authenticated:
                if user.username and user.username.startswith('waiter_'):
                    is_waiter = True
                elif hasattr(user, 'profile') and user.profile.role == 'STAFF':
                    is_waiter = True
            if is_waiter:
                return Response(
                    {
                        'detail': (
                            'Waiter cannot update bill request status. '
                            'Only the Cashier can process or complete a bill request.'
                        )
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

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
            if req_obj.status in [WaiterRequest.STATUS_PROCESSING, WaiterRequest.STATUS_COMPLETED] or (req_obj.assigned_waiter and req_obj.assigned_waiter != waiter_name):
                assigned_by = req_obj.assigned_waiter or 'another waiter'
                return Response({
                    'detail': f'This request has already been attended by {assigned_by}.',
                    'already_attended': True,
                    'assigned_waiter': req_obj.assigned_waiter,
                    'status': req_obj.status,
                    'request': WaiterRequestSerializer(req_obj, context={'request': request}).data
                }, status=status.HTTP_400_BAD_REQUEST)

            req_obj.status = WaiterRequest.STATUS_PROCESSING
            req_obj.assigned_waiter = waiter_name
            req_obj.save()

        return Response(WaiterRequestSerializer(req_obj, context={'request': request}).data, status=status.HTTP_200_OK)


