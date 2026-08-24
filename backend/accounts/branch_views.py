from django.utils import timezone
from django.db.models import Sum, Count, Q, F
from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from decimal import Decimal
import datetime

from accounts.models import (
    Branch, BranchManager, Waiter, Cashier, KitchenStaff, POSTerminal
)
from accounts.serializers import (
    WaiterSerializer, WaiterSafeSerializer,
    CashierSerializer, CashierSafeSerializer,
    KitchenStaffSerializer, KitchenStaffSafeSerializer,
    BranchSerializer, POSTerminalSerializer
)
from menu.models import Table, Product, Category
from orders.models import Order, Expense
from menu.models import InventoryItem
from rest_framework.permissions import BasePermission

class IsBranchManager(BasePermission):
    """
    Ensures that the user is authenticated as a Branch Manager.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.username.startswith('bm_'):
            return True
        if hasattr(request.user, 'profile') and request.user.profile.role == 'MANAGER':
            return True
        return False


def get_manager_branch(request):
    user = getattr(request, 'user', None)
    if user and user.is_authenticated:
        if user.username and user.username.startswith('bm_'):
            try:
                manager_id = int(user.username.split('_')[1])
                manager = BranchManager.objects.select_related('branch').filter(pk=manager_id).first()
                if manager and manager.branch:
                    return manager.branch
            except (IndexError, ValueError):
                pass
        if hasattr(user, 'profile') and user.profile.role == 'MANAGER' and user.profile.branch:
            return user.profile.branch
    return None


# ── Dashboard API ──────────────────────────────────────────────────────────────

class BranchDashboardView(APIView):
    permission_classes = [IsAuthenticated, IsBranchManager]

    def get(self, request, *args, **kwargs):
        branch = get_manager_branch(request)
        if not branch:
            return Response({"detail": "No assigned branch found."}, status=status.HTTP_403_FORBIDDEN)

        today = timezone.localtime(timezone.now()).date()

        # Sales calculations
        today_sales = Order.objects.filter(
            branch=branch,
            status='completed',
            created_at__date=today
        ).aggregate(total_sales=Sum('total'))['total_sales'] or Decimal('0.00')

        # Active tables
        total_tables = Table.objects.filter(branch=branch, active=True).count()
        occupied_tables = Table.objects.filter(branch=branch, active=True, status='occupied').count()

        # Order counts
        today_orders = Order.objects.filter(
            branch=branch,
            created_at__date=today
        ).exclude(status='cancelled').count()

        pending_orders = Order.objects.filter(branch=branch, status='pending').count()
        preparing_orders = Order.objects.filter(branch=branch, status='preparing').count()
        pending_bills = Order.objects.filter(branch=branch, status='bill_requested').count()

        # Low stock items
        low_stock_items = InventoryItem.objects.filter(
            branch=branch,
            current_stock__lte=F('minimum_stock')
        ).count()

        # Sales overview (last 7 days)
        sales_overview = []
        for i in range(6, -1, -1):
            d = today - datetime.timedelta(days=i)
            day_sales = Order.objects.filter(
                branch=branch,
                status='completed',
                created_at__date=d
            ).aggregate(total=Sum('total'))['total'] or Decimal('0.00')
            sales_overview.append({
                "date": d.strftime("%Y-%m-%d"),
                "day": d.strftime("%a"),
                "sales": float(day_sales)
            })

        # Completed, Cancelled, and Pending payments
        completed_orders = Order.objects.filter(
            branch=branch,
            status='completed',
            created_at__date=today
        ).count()

        cancelled_orders = Order.objects.filter(
            branch=branch,
            status='cancelled',
            created_at__date=today
        ).count()

        pending_payments = Order.objects.filter(
            branch=branch,
            payment_status='unpaid',
            created_at__date=today
        ).aggregate(total_pending=Sum('total'))['total_pending'] or Decimal('0.00')

        avg_order_value = float(today_sales / completed_orders) if completed_orders > 0 else 0.0

        return Response({
            "branch": {
                "id": branch.id,
                "name": branch.name,
                "status": "ACTIVE" if branch.active else "INACTIVE"
            },
            "today_sales": float(today_sales),
            "active_tables": {
                "occupied": occupied_tables,
                "total": total_tables
            },
            "today_orders": today_orders,
            "pending_orders": pending_orders,
            "preparing_orders": preparing_orders,
            "pending_bills": pending_bills,
            "low_stock_items": low_stock_items,
            "sales_overview": sales_overview,
            "completed_orders": completed_orders,
            "cancelled_orders": cancelled_orders,
            "pending_payments": float(pending_payments),
            "avg_order_value": avg_order_value,
        })


# ── Staff Management API ────────────────────────────────────────────────────────

class BranchStaffView(APIView):
    permission_classes = [IsAuthenticated, IsBranchManager]

    def _serialize_member(self, member, role_name):
        return {
            "id": f"{role_name.lower()}_{member.id}",
            "name": member.name,
            "employee_id": member.employee_id,
            "email": getattr(member, 'email', f"{member.employee_id.lower()}@artisanbrew.internal" if member.employee_id else ''),
            "phone": getattr(member, 'phone', ''),
            "role": "Waiter" if role_name == "WAITER" else ("POS" if role_name == "CASHIER" else "Kitchen Staff"),
            "status": "active" if member.is_active else "inactive",
            "joinedDate": member.created_at.strftime("%Y-%m-%d") if hasattr(member, 'created_at') and member.created_at else timezone.now().strftime("%Y-%m-%d")
        }

    def get(self, request, pk=None, *args, **kwargs):
        branch = get_manager_branch(request)
        if not branch:
            return Response({"detail": "Access Denied"}, status=status.HTTP_403_FORBIDDEN)

        if pk:
            # Get specific staff
            role_type, obj_id = pk.split('_', 1)
            obj_id = int(obj_id)
            if role_type == 'waiter':
                member = get_object_or_404(Waiter, pk=obj_id, branch=branch)
                return Response(self._serialize_member(member, "WAITER"))
            elif role_type == 'cashier':
                member = get_object_or_404(Cashier, pk=obj_id, branch=branch)
                return Response(self._serialize_member(member, "CASHIER"))
            elif role_type == 'kitchen':
                member = get_object_or_404(KitchenStaff, pk=obj_id, branch=branch)
                return Response(self._serialize_member(member, "KITCHEN_STAFF"))
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)

        # List all staff
        waiters = Waiter.objects.filter(branch=branch)
        cashiers = Cashier.objects.filter(branch=branch)
        kitchen = KitchenStaff.objects.filter(branch=branch)

        staff_list = []
        for w in waiters:
            staff_list.append(self._serialize_member(w, "WAITER"))
        for c in cashiers:
            staff_list.append(self._serialize_member(c, "CASHIER"))
        for k in kitchen:
            staff_list.append(self._serialize_member(k, "KITCHEN_STAFF"))

        return Response(staff_list)

    def post(self, request, *args, **kwargs):
        branch = get_manager_branch(request)
        if not branch:
            return Response({"detail": "Access Denied"}, status=status.HTTP_403_FORBIDDEN)

        role = request.data.get('role', 'Waiter')
        name = request.data.get('name', request.data.get('full_name', ''))
        email = request.data.get('email', '')
        phone = request.data.get('phone', '')
        password = request.data.get('password', request.data.get('pin', ''))
        status_val = request.data.get('status', 'active')

        # Auto-generate employee id if missing
        employee_id = request.data.get('employee_id', '')
        if not employee_id:
            import random
            employee_id = f"EMP-{random.randint(1000, 9999)}"

        is_active = status_val == 'active' or status_val == 'ACTIVE'

        if role == 'Waiter' or role == 'WAITER':
            data = {'name': name, 'employee_id': employee_id, 'branch': branch.id, 'is_active': is_active, 'pin': password, 'confirm_pin': password}
            serializer = WaiterSerializer(data=data)
            serializer.is_valid(raise_exception=True)
            member = serializer.save()
            return Response(self._serialize_member(member, "WAITER"), status=status.HTTP_201_CREATED)

        elif role == 'POS' or role == 'CASHIER':
            data = {'name': name, 'employee_id': employee_id, 'branch': branch.id, 'is_active': is_active, 'pin': password, 'confirm_pin': password}
            serializer = CashierSerializer(data=data)
            serializer.is_valid(raise_exception=True)
            member = serializer.save()
            return Response(self._serialize_member(member, "CASHIER"), status=status.HTTP_201_CREATED)

        elif role == 'Kitchen Staff' or role == 'KITCHEN_STAFF':
            data = {'name': name, 'employee_id': employee_id, 'branch': branch.id, 'is_active': is_active, 'pin': password, 'confirm_pin': password}
            serializer = KitchenStaffSerializer(data=data)
            serializer.is_valid(raise_exception=True)
            member = serializer.save()
            return Response(self._serialize_member(member, "KITCHEN_STAFF"), status=status.HTTP_201_CREATED)

        return Response({"detail": f"Unsupported role: {role}"}, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, pk, *args, **kwargs):
        branch = get_manager_branch(request)
        if not branch:
            return Response({"detail": "Access Denied"}, status=status.HTTP_403_FORBIDDEN)

        role_type, obj_id = pk.split('_', 1)
        obj_id = int(obj_id)

        # Handle status toggle shortcut
        if request.path.endswith('/status/'):
            status_val = request.data.get('status')
            is_active = status_val == 'active' or status_val == 'ACTIVE'
            if role_type == 'waiter':
                member = get_object_or_404(Waiter, pk=obj_id, branch=branch)
                member.is_active = is_active
                member.save()
                return Response(self._serialize_member(member, "WAITER"))
            elif role_type == 'cashier':
                member = get_object_or_404(Cashier, pk=obj_id, branch=branch)
                member.is_active = is_active
                member.save()
                return Response(self._serialize_member(member, "CASHIER"))
            elif role_type == 'kitchen':
                member = get_object_or_404(KitchenStaff, pk=obj_id, branch=branch)
                member.is_active = is_active
                member.save()
                return Response(self._serialize_member(member, "KITCHEN_STAFF"))

        # Normal edit
        name = request.data.get('name')
        password = request.data.get('password')
        status_val = request.data.get('status')

        if role_type == 'waiter':
            member = get_object_or_404(Waiter, pk=obj_id, branch=branch)
            if name: member.name = name
            if status_val: member.is_active = (status_val == 'active')
            if password: member.set_pin(password)
            member.save()
            return Response(self._serialize_member(member, "WAITER"))

        elif role_type == 'cashier':
            member = get_object_or_404(Cashier, pk=obj_id, branch=branch)
            if name: member.name = name
            if status_val: member.is_active = (status_val == 'active')
            if password: member.set_pin(password)
            member.save()
            return Response(self._serialize_member(member, "CASHIER"))

        elif role_type == 'kitchen':
            member = get_object_or_404(KitchenStaff, pk=obj_id, branch=branch)
            if name: member.name = name
            if status_val: member.is_active = (status_val == 'active')
            if password: member.set_pin(password)
            member.save()
            return Response(self._serialize_member(member, "KITCHEN_STAFF"))

        return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)

    def put(self, request, pk, *args, **kwargs):
        return self.patch(request, pk, *args, **kwargs)


# ── Table Management API ────────────────────────────────────────────────────────

class BranchTableViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsBranchManager]
    serializer_class = BranchSerializer

    def get_queryset(self):
        branch = get_manager_branch(self.request)
        if not branch:
            return Table.objects.none()
        return Table.objects.filter(branch=branch).order_by('name')

    def list(self, request, *args, **kwargs):
        tables = self.get_queryset()
        data = [{
            "id": t.id,
            "number": t.name,
            "capacity": t.seats,
            "status": t.status.upper(),
            "active": t.active,
            "qrStatus": "active" if t.active else "inactive"
        } for t in tables]
        return Response(data)

    def create(self, request, *args, **kwargs):
        branch = get_manager_branch(request)
        if not branch:
            return Response({"detail": "Access Denied"}, status=status.HTTP_403_FORBIDDEN)

        number = request.data.get('number', request.data.get('name', ''))
        capacity = request.data.get('capacity', 4)

        table = Table.objects.create(
            branch=branch,
            name=number,
            seats=int(capacity),
            status=Table.STATUS_AVAILABLE,
            active=True
        )
        return Response({
            "id": table.id,
            "number": table.name,
            "capacity": table.seats,
            "status": table.status.upper(),
            "active": table.active,
            "qrStatus": "active"
        }, status=status.HTTP_201_CREATED)

    def partial_update(self, request, pk=None, *args, **kwargs):
        branch = get_manager_branch(request)
        table = get_object_or_404(Table, pk=pk, branch=branch)

        status_val = request.data.get('status')
        capacity = request.data.get('capacity')
        active = request.data.get('active')

        if status_val:
            table.status = status_val.lower()
        if capacity:
            table.seats = int(capacity)
        if active is not None:
            table.active = bool(active)

        table.save()
        return Response({
            "id": table.id,
            "number": table.name,
            "capacity": table.seats,
            "status": table.status.upper(),
            "active": table.active,
            "qrStatus": "active" if table.active else "inactive"
        })

    @action(detail=True, methods=['patch'], url_path='status')
    def set_status(self, request, pk=None):
        return self.partial_update(request, pk)


# ── Order Management API ────────────────────────────────────────────────────────

class BranchOrderViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsBranchManager]

    def get_queryset(self):
        branch = get_manager_branch(self.request)
        if not branch:
            return Order.objects.none()
        return Order.objects.filter(branch=branch).order_by('-created_at')

    def list(self, request, *args, **kwargs):
        orders = self.get_queryset()
        data = [{
            "id": str(o.id),
            "order_number": o.order_number,
            "table": o.table.name if o.table else (o.customer_name or 'Takeaway'),
            "channel": "Dine-In" if o.table else "Takeaway",
            "waiter": o.waiter_name or 'System',
            "amount": float(o.total),
            "paymentStatus": o.payment_status or 'unpaid',
            "status": o.status.upper(),
            "createdTime": o.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            "items": [{
                "product": item.product_name,
                "quantity": item.quantity,
                "total": float(item.subtotal)
            } for item in o.items.all()]
        } for o in orders]
        return Response(data)

    def retrieve(self, request, pk=None, *args, **kwargs):
        branch = get_manager_branch(request)
        o = get_object_or_404(Order, pk=pk, branch=branch)
        data = {
            "id": str(o.id),
            "order_number": o.order_number,
            "table": o.table.name if o.table else (o.customer_name or 'Takeaway'),
            "channel": "Dine-In" if o.table else "Takeaway",
            "waiter": o.waiter_name or 'System',
            "amount": float(o.total),
            "paymentStatus": o.payment_status or 'unpaid',
            "status": o.status.upper(),
            "createdTime": o.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            "items": [{
                "product": item.product_name,
                "quantity": item.quantity,
                "total": float(item.subtotal)
            } for item in o.items.all()]
        }
        return Response(data)

    @action(detail=True, methods=['patch'], url_path='status')
    def set_status(self, request, pk=None):
        branch = get_manager_branch(request)
        o = get_object_or_404(Order, pk=pk, branch=branch)
        status_val = request.data.get('status')
        if status_val:
            o.status = status_val.lower()
            o.save()
        return Response({"id": o.id, "status": o.status.upper()})


# ── Kitchen Management API ───────────────────────────────────────────────────────

class BranchKitchenOrdersView(APIView):
    permission_classes = [IsAuthenticated, IsBranchManager]

    def get(self, request, *args, **kwargs):
        branch = get_manager_branch(request)
        if not branch:
            return Response({"detail": "Access Denied"}, status=status.HTTP_403_FORBIDDEN)

        orders = Order.objects.filter(
            branch=branch,
            status__in=['pending', 'preparing', 'ready']
        ).order_by('created_at')

        data = [{
            "id": o.id,
            "order_number": o.order_number,
            "table": o.table.name if o.table else (o.customer_name or 'Takeaway'),
            "channel": "Dine-In" if o.table else "Takeaway",
            "items": [{
                "name": item.product_name,
                "quantity": item.quantity
            } for item in o.items.all()],
            "status": o.status.upper(),
            "time": o.created_at.strftime("%H:%M")
        } for o in orders]
        return Response(data)


# ── Menu Management API ──────────────────────────────────────────────────────────

class BranchMenuView(APIView):
    permission_classes = [IsAuthenticated, IsBranchManager]

    def get(self, request, *args, **kwargs):
        products = Product.objects.all()
        data = [{
            "id": p.id,
            "name": p.name,
            "category": p.category.name if p.category else '',
            "price": float(p.price),
            "basePrice": float(p.price),
            "available": p.available,
            "globalStatus": "Available" if p.available else "Unavailable",
            "branchStatus": p.available
        } for p in products]
        return Response(data)

    def patch(self, request, pk=None, *args, **kwargs):
        p = get_object_or_404(Product, pk=pk)
        p.available = not p.available
        p.save()
        return Response({"id": p.id, "available": p.available, "branchStatus": p.available})


# ── Inventory API ────────────────────────────────────────────────────────────────

class BranchInventoryViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsBranchManager]

    def get_queryset(self):
        branch = get_manager_branch(self.request)
        if not branch:
            return InventoryItem.objects.none()
        return InventoryItem.objects.filter(branch=branch).order_by('name')

    def list(self, request, *args, **kwargs):
        items = self.get_queryset()
        data = [{
            "id": item.id,
            "name": item.name,
            "currentStock": float(item.current_stock),
            "minimumStock": float(item.minimum_stock),
            "unit": item.unit,
            "cost": float(item.cost),
            "category": item.category,
            "lastUpdated": item.updated_at.strftime("%Y-%m-%d")
        } for item in items]
        return Response(data)

    def create(self, request, *args, **kwargs):
        branch = get_manager_branch(request)
        if not branch:
            return Response({"detail": "Access Denied"}, status=status.HTTP_403_FORBIDDEN)

        item = InventoryItem.objects.create(
            branch=branch,
            name=request.data.get('name'),
            current_stock=Decimal(str(request.data.get('currentStock', 0))),
            minimum_stock=Decimal(str(request.data.get('minimumStock', 0))),
            unit=request.data.get('unit', 'kg'),
            cost=Decimal(str(request.data.get('cost', 0))),
            category=request.data.get('category', 'Default')
        )
        return Response({
            "id": item.id,
            "name": item.name,
            "currentStock": float(item.current_stock),
            "minimumStock": float(item.minimum_stock),
            "unit": item.unit,
            "cost": float(item.cost),
            "category": item.category,
            "lastUpdated": item.updated_at.strftime("%Y-%m-%d")
        }, status=status.HTTP_201_CREATED)

    def partial_update(self, request, pk=None, *args, **kwargs):
        branch = get_manager_branch(request)
        item = get_object_or_404(InventoryItem, pk=pk, branch=branch)

        qty = request.data.get('qty')
        adjust_type = request.data.get('type')

        if adjust_type and qty is not None:
            val = Decimal(str(qty))
            if adjust_type == 'add':
                item.current_stock += val
            elif adjust_type == 'remove':
                item.current_stock = max(Decimal('0.00'), item.current_stock - val)
            elif adjust_type == 'correction':
                item.current_stock = val
        else:
            if 'currentStock' in request.data:
                item.current_stock = Decimal(str(request.data.get('currentStock')))
            if 'minimumStock' in request.data:
                item.minimum_stock = Decimal(str(request.data.get('minimumStock')))
            if 'cost' in request.data:
                item.cost = Decimal(str(request.data.get('cost')))

        item.save()
        return Response({
            "id": item.id,
            "name": item.name,
            "currentStock": float(item.current_stock),
            "minimumStock": float(item.minimum_stock),
            "unit": item.unit,
            "cost": float(item.cost),
            "category": item.category,
            "lastUpdated": item.updated_at.strftime("%Y-%m-%d")
        })


# ── Expenses API ─────────────────────────────────────────────────────────────────

class BranchExpenseViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsBranchManager]

    def get_queryset(self):
        branch = get_manager_branch(self.request)
        if not branch:
            return Expense.objects.none()
        return Expense.objects.filter(branch=branch).order_by('-date')

    def list(self, request, *args, **kwargs):
        expenses = self.get_queryset()
        data = [{
            "id": e.id,
            "title": e.title,
            "category": e.category.capitalize(),
            "amount": float(e.amount),
            "date": e.date.strftime("%Y-%m-%d"),
            "status": e.status,
            "description": e.description
        } for e in expenses]
        return Response(data)

    def create(self, request, *args, **kwargs):
        branch = get_manager_branch(request)
        if not branch:
            return Response({"detail": "Access Denied"}, status=status.HTTP_403_FORBIDDEN)

        expense = Expense.objects.create(
            branch=branch,
            title=request.data.get('title'),
            category=request.data.get('category', 'other').lower(),
            amount=Decimal(str(request.data.get('amount', 0))),
            date=request.data.get('date', timezone.now().date()),
            description=request.data.get('description', ''),
            status='approved'
        )
        return Response({
            "id": expense.id,
            "title": expense.title,
            "category": expense.category.capitalize(),
            "amount": float(expense.amount),
            "date": expense.date.strftime("%Y-%m-%d"),
            "status": expense.status,
            "description": expense.description
        }, status=status.HTTP_201_CREATED)

    def partial_update(self, request, pk=None, *args, **kwargs):
        branch = get_manager_branch(request)
        expense = get_object_or_404(Expense, pk=pk, branch=branch)

        title = request.data.get('title')
        category = request.data.get('category')
        amount = request.data.get('amount')
        description = request.data.get('description')

        if title: expense.title = title
        if category: expense.category = category.lower()
        if amount: expense.amount = Decimal(str(amount))
        if description: expense.description = description

        expense.save()
        return Response({
            "id": expense.id,
            "title": expense.title,
            "category": expense.category.capitalize(),
            "amount": float(expense.amount),
            "date": expense.date.strftime("%Y-%m-%d"),
            "status": expense.status,
            "description": expense.description
        })


# ── Customers API ────────────────────────────────────────────────────────────────

class BranchCustomersView(APIView):
    permission_classes = [IsAuthenticated, IsBranchManager]

    def get(self, request, *args, **kwargs):
        branch = get_manager_branch(request)
        if not branch:
            return Response({"detail": "Access Denied"}, status=status.HTTP_403_FORBIDDEN)

        orders = Order.objects.filter(branch=branch).exclude(customer_name='').values('customer_name', 'whatsapp_number').annotate(
            total_visits=Count('id'),
            total_spent=Sum('total')
        )

        data = [{
            "id": idx + 1,
            "name": o['customer_name'] or "Walk-in Customer",
            "phone": o['whatsapp_number'] or "N/A",
            "whatsapp": o['whatsapp_number'] or "",
            "visits": o['total_visits'],
            "totalOrders": o['total_visits'],
            "spent": float(o['total_spent'] or 0),
            "totalSpending": float(o['total_spent'] or 0),
            "lastVisit": "Recent",
            "favouriteItems": []
        } for idx, o in enumerate(orders)]
        return Response(data)


# ── Reports API ──────────────────────────────────────────────────────────────────

class BranchReportsView(APIView):
    permission_classes = [IsAuthenticated, IsBranchManager]

    def get(self, request, *args, **kwargs):
        branch = get_manager_branch(request)
        if not branch:
            return Response({"detail": "Access Denied"}, status=status.HTTP_403_FORBIDDEN)

        period = request.query_params.get('period', 'month').lower()
        today = timezone.localtime(timezone.now()).date()

        if period == 'today':
            start_date = today
            end_date = today
        elif period == 'yesterday':
            start_date = today - datetime.timedelta(days=1)
            end_date = today - datetime.timedelta(days=1)
        elif period == 'week':
            start_date = today - datetime.timedelta(days=6)
            end_date = today
        else: # month
            start_date = today - datetime.timedelta(days=29)
            end_date = today

        # Gross Sales & Orders
        orders = Order.objects.filter(
            branch=branch,
            status='completed',
            created_at__date__range=[start_date, end_date]
        )
        total_sales = orders.aggregate(total=Sum('total'))['total'] or Decimal('0.00')
        order_count = orders.count()

        # Expenses
        expenses_qs = Expense.objects.filter(
            branch=branch,
            date__range=[start_date, end_date],
            status='approved'
        )
        total_expenses = expenses_qs.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

        # Net Revenue & AOV
        net_revenue = total_sales - total_expenses
        avg_order_value = total_sales / order_count if order_count > 0 else Decimal('0.00')

        # Sales Trend Data
        sales_data = []
        if period in ['today', 'yesterday']:
            # Hourly grouping (00:00 to 23:00)
            target_date = start_date
            for h in range(24):
                hour_sales = Order.objects.filter(
                    branch=branch,
                    status='completed',
                    created_at__date=target_date,
                    created_at__hour=h
                ).aggregate(total=Sum('total'))['total'] or Decimal('0.00')
                sales_data.append({
                    "label": f"{h:02d}:00",
                    "value": float(hour_sales)
                })
        elif period == 'week':
            # Daily grouping (last 7 days)
            for i in range(6, -1, -1):
                d = today - datetime.timedelta(days=i)
                day_sales = Order.objects.filter(
                    branch=branch,
                    status='completed',
                    created_at__date=d
                ).aggregate(total=Sum('total'))['total'] or Decimal('0.00')
                sales_data.append({
                    "label": d.strftime("%a"),
                    "value": float(day_sales)
                })
        else: # month
            # Weekly grouping (last 30 days split into 4 weeks)
            for w in range(4):
                w_start = today - datetime.timedelta(days=29 - w * 7)
                w_end = today - datetime.timedelta(days=29 - (w + 1) * 7 + 1) if w < 3 else today
                week_sales = Order.objects.filter(
                    branch=branch,
                    status='completed',
                    created_at__date__range=[w_start, w_end]
                ).aggregate(total=Sum('total'))['total'] or Decimal('0.00')
                sales_data.append({
                    "label": f"Week {w+1}",
                    "value": float(week_sales)
                })

        # Payment Method Breakdown
        payment_summary = []
        payment_methods = [
            ('upi', 'UPI / QR Scan'),
            ('card', 'Credit/Debit Card'),
            ('cash', 'Cash drawer')
        ]
        for db_method, ui_name in payment_methods:
            pm_orders = orders.filter(payment_method__iexact=db_method)
            pm_count = pm_orders.count()
            pm_val = pm_orders.aggregate(total=Sum('total'))['total'] or Decimal('0.00')
            payment_summary.append({
                "name": ui_name,
                "count": pm_count,
                "value": float(pm_val)
            })

        # Top Selling Products
        from orders.models import OrderItem
        top_products = OrderItem.objects.filter(
            order__in=orders
        ).values('product__name', 'product_name').annotate(
            total_qty=Sum('quantity'),
            total_rev=Sum('subtotal')
        ).order_by('-total_qty')[:5]

        top_selling_products = []
        for tp in top_products:
            name = tp['product_name'] or tp['product__name'] or 'Unknown Product'
            top_selling_products.append({
                "name": name,
                "qty": tp['total_qty'],
                "revenue": float(tp['total_rev'] or 0)
            })

        # Order Channels
        dine_in_orders = orders.exclude(table__isnull=True)
        takeaway_orders = orders.filter(table__isnull=True).exclude(customer_name__icontains='swiggy').exclude(customer_name__icontains='zomato')
        swiggy_orders = orders.filter(customer_name__icontains='swiggy')
        zomato_orders = orders.filter(customer_name__icontains='zomato')

        channel_breakdown = [
            {
                "name": "Dine-In",
                "orders": dine_in_orders.count(),
                "value": float(dine_in_orders.aggregate(total=Sum('total'))['total'] or 0),
                "color": "var(--color-espresso)"
            },
            {
                "name": "Takeaway",
                "orders": takeaway_orders.count(),
                "value": float(takeaway_orders.aggregate(total=Sum('total'))['total'] or 0),
                "color": "var(--color-tan-dark)"
            },
            {
                "name": "Swiggy",
                "orders": swiggy_orders.count(),
                "value": float(swiggy_orders.aggregate(total=Sum('total'))['total'] or 0),
                "color": "#e65300"
            },
            {
                "name": "Zomato",
                "orders": zomato_orders.count(),
                "value": float(zomato_orders.aggregate(total=Sum('total'))['total'] or 0),
                "color": "#b81414"
            }
        ]

        # Waiter performance (group completed orders by waiter_name)
        waiter_stats = orders.exclude(waiter_name='').values('waiter_name').annotate(
            orders_served=Count('id')
        ).order_by('-orders_served')[:5]

        staff_performance = []
        for ws in waiter_stats:
            staff_performance.append({
                "name": ws['waiter_name'],
                "role": "Waiter",
                "orders": ws['orders_served'],
                "rating": "4.8★"
            })

        return Response({
            "period": period,
            "metrics": {
                "totalSales": float(total_sales),
                "expenses": float(total_expenses),
                "netSales": float(net_revenue),
                "avgOrder": float(avg_order_value),
                "totalOrders": order_count,
            },
            "sales_data": sales_data,
            "payment_breakdown": payment_summary,
            "top_selling_products": top_selling_products,
            "channel_breakdown": channel_breakdown,
            "staff_performance": staff_performance
        })


# ── Settings API ─────────────────────────────────────────────────────────────────

class BranchSettingsView(APIView):
    permission_classes = [IsAuthenticated, IsBranchManager]

    def get(self, request, *args, **kwargs):
        branch = get_manager_branch(request)
        if not branch:
            return Response({"detail": "Access Denied"}, status=status.HTTP_403_FORBIDDEN)
        return Response({
            "id": branch.id,
            "name": branch.name,
            "code": branch.code,
            "address": branch.address,
            "phone": branch.phone,
            "active": branch.active
        })

    def patch(self, request, *args, **kwargs):
        branch = get_manager_branch(request)
        if not branch:
            return Response({"detail": "Access Denied"}, status=status.HTTP_403_FORBIDDEN)

        name = request.data.get('name')
        address = request.data.get('address')
        phone = request.data.get('phone')

        if name: branch.name = name
        if address is not None: branch.address = address
        if phone is not None: branch.phone = phone

        branch.save()
        return Response({
            "id": branch.id,
            "name": branch.name,
            "code": branch.code,
            "address": branch.address,
            "phone": branch.phone,
            "active": branch.active
        })

    def put(self, request, *args, **kwargs):
        return self.patch(request, *args, **kwargs)


class BranchPOSTerminalViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsBranchManager]
    serializer_class = POSTerminalSerializer
    pagination_class = None

    def get_queryset(self):
        branch = get_manager_branch(self.request)
        if not branch:
            return POSTerminal.objects.none()
        return POSTerminal.objects.filter(branch=branch).select_related('branch', 'assigned_cashier').order_by('name')

    def partial_update(self, request, pk=None, *args, **kwargs):
        branch = get_manager_branch(request)
        if not branch:
            return Response({"detail": "Access Denied"}, status=status.HTTP_403_FORBIDDEN)
        
        terminal = get_object_or_404(POSTerminal, pk=pk, branch=branch)
        
        # Extract fields
        status_val = request.data.get('status')
        name_val = request.data.get('name') or request.data.get('terminal')
        cashier_id = request.data.get('assigned_cashier')
        if 'assignedCashierId' in request.data:
            cashier_id = request.data.get('assignedCashierId')

        # Validate cashier if provided
        if cashier_id is not None:
            if cashier_id in ['', 'null', 'None', None]:
                terminal.assigned_cashier = None
            else:
                try:
                    cashier = Cashier.objects.get(pk=cashier_id)
                except (Cashier.DoesNotExist, ValueError, TypeError):
                    return Response({"detail": "Invalid Cashier ID or Cashier does not exist."}, status=status.HTTP_400_BAD_REQUEST)
                
                if cashier.branch != branch:
                    return Response({"detail": "Cannot assign a cashier from another branch."}, status=status.HTTP_400_BAD_REQUEST)
                if not cashier.is_active:
                    return Response({"detail": "Cannot assign an inactive cashier."}, status=status.HTTP_400_BAD_REQUEST)
                
                terminal.assigned_cashier = cashier

        if status_val:
            if status_val.lower() not in ['active', 'inactive', 'maintenance', 'offline']:
                return Response({"detail": "Invalid status."}, status=status.HTTP_400_BAD_REQUEST)
            if status_val.lower() == 'offline':
                status_val = 'inactive'
            terminal.status = status_val.lower()

        if name_val:
            terminal.name = name_val

        terminal.save()
        return Response(POSTerminalSerializer(terminal).data)

    def update(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)

    @action(detail=True, methods=['patch'], url_path='status')
    def set_status(self, request, pk=None):
        return self.partial_update(request, pk)

    @action(detail=True, methods=['patch'], url_path='cashier')
    def set_cashier(self, request, pk=None):
        return self.partial_update(request, pk)
