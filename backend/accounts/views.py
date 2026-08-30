from rest_framework import status, viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.decorators import action
from django.contrib.auth.models import User
from rest_framework_simplejwt.tokens import RefreshToken
from .models import UserProfile, Waiter, Branch, BranchManager, Cashier, KitchenStaff, POSTerminal
from .serializers import (
    CustomTokenObtainPairSerializer,
    UserSerializer,
    ChangePasswordSerializer,
    WaiterSerializer,
    WaiterSafeSerializer,
    BranchSerializer,
    BranchWriteSerializer,
    BranchManagerSerializer,
    CashierSerializer,
    CashierSafeSerializer,
    KitchenStaffSerializer,
    KitchenStaffSafeSerializer,
    POSTerminalSerializer,
)
from .permissions import IsAdminOrManager, IsAdmin
from .utils import BranchEnforceMixin


# ── Auth Views ─────────────────────────────────────────────────────────────────

class CustomTokenObtainPairView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = CustomTokenObtainPairSerializer(data=request.data)
        if serializer.is_valid():
            return Response(serializer.validated_data, status=status.HTTP_200_OK)

        errors = serializer.errors
        non_field_errors = errors.get('non_field_errors', [])
        if any("permission" in str(err) for err in non_field_errors):
            return Response(errors, status=status.HTTP_403_FORBIDDEN)
        return Response(errors, status=status.HTTP_401_UNAUTHORIZED)


class LogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        return Response({"message": "Successfully logged out."}, status=status.HTTP_200_OK)


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        serializer = UserSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = ChangePasswordSerializer(data=request.data)
        if serializer.is_valid():
            user = request.user
            if not user.check_password(serializer.validated_data['old_password']):
                return Response({"old_password": ["Wrong password."]}, status=status.HTTP_400_BAD_REQUEST)
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            return Response({"message": "Password updated successfully."}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ── Waiter Views ───────────────────────────────────────────────────────────────

class WaiterViewSet(BranchEnforceMixin, viewsets.ModelViewSet):
    queryset = Waiter.objects.all()
    serializer_class = WaiterSerializer
    permission_classes = [IsAdminOrManager]
    pagination_class = None

    def get_queryset(self):
        queryset = Waiter.objects.all().order_by('-created_at')
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(name__icontains=search)
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            active_bool = is_active.lower() == 'true'
            queryset = queryset.filter(is_active=active_bool)
        branch_id = self.request.query_params.get('branch')
        if branch_id and str(branch_id).lower() != 'all':
            if str(branch_id).isdigit():
                queryset = queryset.filter(branch_id=branch_id)
        return queryset


class ActiveWaiterListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, *args, **kwargs):
        active_waiters = Waiter.objects.filter(is_active=True).order_by('name')
        serializer = WaiterSafeSerializer(active_waiters, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class WaiterLoginView(APIView):
    """
    POST /auth/waiter-login/
    Body: { waiter_id, pin }

    Legacy login for Waiters using their DB id (integer).
    Also supports employee_id string lookup for new-style logins.
    """
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        waiter_id = request.data.get('waiter_id')
        pin = request.data.get('pin')

        if not waiter_id or not pin:
            return Response({"detail": "waiter_id and pin are required."}, status=status.HTTP_400_BAD_REQUEST)

        # Support both integer PK and string employee_id
        waiter = None
        try:
            waiter_id_int = int(waiter_id)
            try:
                waiter = Waiter.objects.get(id=waiter_id_int)
            except Waiter.DoesNotExist:
                pass
        except (ValueError, TypeError):
            pass

        if waiter is None:
            try:
                waiter = Waiter.objects.get(employee_id=str(waiter_id))
            except Waiter.DoesNotExist:
                return Response({"detail": "Incorrect PIN. Please try again."}, status=status.HTTP_401_UNAUTHORIZED)

        if not waiter.is_active:
            return Response({"detail": "This waiter account is currently inactive."}, status=status.HTTP_403_FORBIDDEN)

        if not waiter.check_pin(pin):
            return Response({"detail": "Incorrect PIN. Please try again."}, status=status.HTTP_401_UNAUTHORIZED)

        shadow_username = f"waiter_{waiter.id}"
        shadow_user, created = User.objects.get_or_create(
            username=shadow_username,
            defaults={
                'email': f"waiter_{waiter.id}@artisanbrew.internal",
                'is_staff': False,
                'is_superuser': False,
                'is_active': True
            }
        )
        if created:
            shadow_user.set_unusable_password()
            shadow_user.save()

        profile, _ = UserProfile.objects.get_or_create(user=shadow_user)
        profile.role = UserProfile.STAFF
        profile.branch = waiter.branch
        profile.save()

        refresh = RefreshToken.for_user(shadow_user)

        return Response({
            "success": True,
            "role": "waiter",
            "waiter": {
                "id": waiter.id,
                "name": waiter.name,
                "employee_id": waiter.employee_id,
                "section": waiter.section,
                "branch_id": waiter.branch_id,
                "branch_name": waiter.branch.name if waiter.branch else None,
                "photo": request.build_absolute_uri(waiter.photo.url) if waiter.photo else None
            },
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": {
                "id": shadow_user.id,
                "username": shadow_user.username,
                "email": shadow_user.email,
                "role": "STAFF"
            }
        }, status=status.HTTP_200_OK)


# ── Employee Login (unified Waiter + Cashier) ──────────────────────────────────

class EmployeeLoginView(APIView):
    """
    POST /auth/employee-login/
    Body: { employee_id, pin }

    Authenticates either a Waiter or Cashier using their unique Employee ID + PIN.
    Returns role ('waiter' or 'cashier') so the frontend can route correctly.
    Inactive employees cannot log in.
    """
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        employee_id = request.data.get('employee_id', '').strip()
        pin = request.data.get('pin', '')

        if not employee_id or not pin:
            return Response(
                {"detail": "employee_id and pin are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Try Waiter first
        waiter = None
        cashier = None
        kitchen = None
        try:
            waiter = Waiter.objects.select_related('branch').get(employee_id=employee_id)
        except Waiter.DoesNotExist:
            pass

        if waiter is None:
            try:
                cashier = Cashier.objects.select_related('branch').get(employee_id=employee_id)
            except Cashier.DoesNotExist:
                pass

        if waiter is None and cashier is None:
            try:
                kitchen = KitchenStaff.objects.select_related('branch').get(employee_id=employee_id)
            except KitchenStaff.DoesNotExist:
                pass

        if waiter is None and cashier is None and kitchen is None:
            return Response(
                {"detail": "Invalid Employee ID or PIN."},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if waiter is not None:
            return self._login_waiter(request, waiter, pin)
        elif cashier is not None:
            return self._login_cashier(request, cashier, pin)
        else:
            return self._login_kitchen(request, kitchen, pin)

    def _login_waiter(self, request, waiter, pin):
        if not waiter.is_active:
            return Response(
                {"detail": "This employee account is currently inactive."},
                status=status.HTTP_403_FORBIDDEN
            )
        if not waiter.check_pin(pin):
            return Response(
                {"detail": "Invalid Employee ID or PIN."},
                status=status.HTTP_401_UNAUTHORIZED
            )

        shadow_username = f"waiter_{waiter.id}"
        shadow_user, created = User.objects.get_or_create(
            username=shadow_username,
            defaults={
                'email': f"waiter_{waiter.id}@artisanbrew.internal",
                'is_staff': False,
                'is_superuser': False,
                'is_active': True,
            }
        )
        if created:
            shadow_user.set_unusable_password()
            shadow_user.save()

        profile, _ = UserProfile.objects.get_or_create(user=shadow_user)
        profile.role = UserProfile.STAFF
        profile.branch = waiter.branch
        profile.save()

        refresh = RefreshToken.for_user(shadow_user)
        return Response({
            "success": True,
            "role": "waiter",
            "employee": {
                "id": waiter.id,
                "name": waiter.name,
                "employee_id": waiter.employee_id,
                "section": waiter.section,
                "branch_id": waiter.branch_id,
                "branch_name": waiter.branch.name if waiter.branch else None,
                "photo": request.build_absolute_uri(waiter.photo.url) if waiter.photo else None,
            },
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": {
                "id": shadow_user.id,
                "username": shadow_user.username,
                "email": shadow_user.email,
                "role": "STAFF",
            }
        }, status=status.HTTP_200_OK)

    def _login_cashier(self, request, cashier, pin):
        if not cashier.is_active:
            return Response(
                {"detail": "This employee account is currently inactive."},
                status=status.HTTP_403_FORBIDDEN
            )
        if not cashier.check_pin(pin):
            return Response(
                {"detail": "Invalid Employee ID or PIN."},
                status=status.HTTP_401_UNAUTHORIZED
            )

        shadow_username = f"cashier_{cashier.id}"
        shadow_user, created = User.objects.get_or_create(
            username=shadow_username,
            defaults={
                'email': f"cashier_{cashier.id}@artisanbrew.internal",
                'is_staff': False,
                'is_superuser': False,
                'is_active': True,
            }
        )
        if created:
            shadow_user.set_unusable_password()
            shadow_user.save()

        profile, _ = UserProfile.objects.get_or_create(user=shadow_user)
        profile.role = UserProfile.CASHIER
        profile.branch = cashier.branch
        profile.save()

        refresh = RefreshToken.for_user(shadow_user)
        from accounts.models import POSTerminal
        terminal = POSTerminal.objects.filter(assigned_cashier=cashier, status='active').first()
        terminal_info = None
        if terminal:
            terminal_info = {
                "id": terminal.id,
                "name": terminal.name,
                "status": terminal.status,
            }

        return Response({
            "success": True,
            "role": "cashier",
            "employee": {
                "id": cashier.id,
                "name": cashier.name,
                "employee_id": cashier.employee_id,
                "branch_id": cashier.branch_id,
                "branch_name": cashier.branch.name if cashier.branch else None,
                "terminal": terminal_info,
            },
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": {
                "id": shadow_user.id,
                "username": shadow_user.username,
                "email": shadow_user.email,
                "role": "CASHIER",
            }
        }, status=status.HTTP_200_OK)

    def _login_kitchen(self, request, kitchen, pin):
        if not kitchen.is_active:
            return Response(
                {"detail": "This employee account is currently inactive."},
                status=status.HTTP_403_FORBIDDEN
            )
        if not kitchen.check_pin(pin):
            return Response(
                {"detail": "Invalid Employee ID or PIN."},
                status=status.HTTP_401_UNAUTHORIZED
            )

        shadow_username = f"kitchen_{kitchen.id}"
        shadow_user, created = User.objects.get_or_create(
            username=shadow_username,
            defaults={
                'email': f"kitchen_{kitchen.id}@artisanbrew.internal",
                'is_staff': False,
                'is_superuser': False,
                'is_active': True,
            }
        )
        if created:
            shadow_user.set_unusable_password()
            shadow_user.save()

        profile, _ = UserProfile.objects.get_or_create(user=shadow_user)
        profile.role = UserProfile.KITCHEN
        profile.branch = kitchen.branch
        profile.save()

        refresh = RefreshToken.for_user(shadow_user)
        return Response({
            "success": True,
            "role": "kitchen",
            "employee": {
                "id": kitchen.id,
                "name": kitchen.name,
                "employee_id": kitchen.employee_id,
                "branch_id": kitchen.branch_id,
                "branch_name": kitchen.branch.name if kitchen.branch else None,
            },
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": {
                "id": shadow_user.id,
                "username": shadow_user.username,
                "email": shadow_user.email,
                "role": "KITCHEN",
            }
        }, status=status.HTTP_200_OK)



# ── Cashier Views ──────────────────────────────────────────────────────────────

class CashierViewSet(BranchEnforceMixin, viewsets.ModelViewSet):
    """
    CRUD for Cashiers. Only Admin/Manager can manage these.
    """
    queryset = Cashier.objects.select_related('branch').all()
    serializer_class = CashierSerializer
    permission_classes = [IsAdminOrManager]
    pagination_class = None

    def get_queryset(self):
        qs = Cashier.objects.select_related('branch').all().order_by('-created_at')
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(name__icontains=search)
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() == 'true')
        branch_id = self.request.query_params.get('branch')
        if branch_id and str(branch_id).lower() != 'all':
            if str(branch_id).isdigit():
                qs = qs.filter(branch_id=branch_id)
        return qs

    @action(detail=True, methods=['patch'], url_path='set_active')
    def set_active(self, request, pk=None):
        """PATCH /cashiers/{id}/set_active/  { is_active: true|false }"""
        cashier = self.get_object()
        is_active = request.data.get('is_active')
        if is_active is None:
            return Response({"detail": "'is_active' is required."}, status=status.HTTP_400_BAD_REQUEST)
        cashier.is_active = bool(is_active)
        cashier.save(update_fields=['is_active', 'updated_at'])
        return Response(CashierSerializer(cashier).data)


# ── Branch Views ───────────────────────────────────────────────────────────────

class BranchViewSet(viewsets.ModelViewSet):
    """
    CRUD for Branches.  Only Admin users can create / modify branches.
    List is also accessible to authenticated users (e.g. owner dashboard).
    """
    queryset = Branch.objects.all().order_by('name')
    permission_classes = [IsAdmin]
    pagination_class = None

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return BranchWriteSerializer
        return BranchSerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [IsAuthenticated()]
        return [IsAdmin()]

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = BranchSerializer(instance)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        serializer = BranchWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        branch = serializer.save()
        return Response(BranchSerializer(branch).data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = BranchWriteSerializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        branch = serializer.save()
        return Response(BranchSerializer(branch).data)

    @action(detail=True, methods=['patch'], url_path='set_active')
    def set_active(self, request, pk=None):
        """PATCH /branches/{id}/set_active/  { active: true|false }"""
        branch = self.get_object()
        active = request.data.get('active')
        if active is None:
            return Response({"detail": "'active' is required."}, status=status.HTTP_400_BAD_REQUEST)
        branch.active = bool(active)
        branch.save(update_fields=['active', 'updated_at'])
        return Response(BranchSerializer(branch).data)


# ── BranchManager Views ────────────────────────────────────────────────────────

class BranchManagerViewSet(viewsets.ModelViewSet):
    """
    CRUD for Branch Managers. Only Admin can manage these.
    Each branch can have at most one manager (OneToOneField).
    """
    queryset = BranchManager.objects.select_related('branch').all()
    serializer_class = BranchManagerSerializer
    permission_classes = [IsAdmin]
    pagination_class = None

    def get_queryset(self):
        qs = BranchManager.objects.select_related('branch').all()
        branch_id = self.request.query_params.get('branch')
        if branch_id and str(branch_id).lower() != 'all':
            if str(branch_id).isdigit():
                qs = qs.filter(branch_id=branch_id)
        return qs


class BranchManagerLoginView(APIView):
    """
    POST /auth/branch-manager-login/
    Body: { manager_id, pin }

    Authenticates a Branch Manager against their assigned branch only.
    Returns a JWT token with role=BRANCH_MANAGER so the frontend can
    route them to the Branch Manager dashboard.
    Branch managers cannot access any Admin/Owner functionality.
    """
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        manager_id = request.data.get('manager_id', '').strip()
        pin = request.data.get('pin', request.data.get('password', ''))

        if not manager_id or not pin:
            return Response(
                {"detail": "manager_id and pin/password are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            manager = BranchManager.objects.select_related('branch').get(manager_id=manager_id)
        except BranchManager.DoesNotExist:
            return Response(
                {"detail": "Invalid Manager ID or PIN."},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not manager.is_active:
            return Response(
                {"detail": "This manager account is currently inactive. Please contact the administrator."},
                status=status.HTTP_403_FORBIDDEN
            )

        if not manager.branch.active:
            return Response(
                {"detail": "The branch assigned to this manager is currently inactive."},
                status=status.HTTP_403_FORBIDDEN
            )

        if not manager.check_pin(pin):
            return Response(
                {"detail": "Invalid Manager ID or PIN."},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Create / reuse a shadow Django user for JWT issuance
        shadow_username = f"bm_{manager.id}"
        shadow_user, created = User.objects.get_or_create(
            username=shadow_username,
            defaults={
                'email': f"bm_{manager.id}@artisanbrew.internal",
                'is_staff': False,
                'is_superuser': False,
                'is_active': True,
            }
        )
        if created:
            shadow_user.set_unusable_password()
            shadow_user.save()

        # Ensure the profile exists and marks the role as MANAGER (branch-scoped)
        profile, _ = UserProfile.objects.get_or_create(user=shadow_user)
        profile.role = UserProfile.MANAGER
        profile.branch = manager.branch
        profile.save()

        refresh = RefreshToken.for_user(shadow_user)

        return Response({
            "success": True,
            "role": "BRANCH_MANAGER",
            "manager": {
                "id": manager.id,
                "name": manager.name,
                "manager_id": manager.manager_id,
            },
            "branch": {
                "id": manager.branch.id,
                "name": manager.branch.name,
                "code": manager.branch.code,
                "address": manager.branch.address,
            },
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": {
                "id": shadow_user.id,
                "username": shadow_user.username,
                "role": "BRANCH_MANAGER",
            }
        }, status=status.HTTP_200_OK)


class OwnerPOSTerminalViewSet(BranchEnforceMixin, viewsets.ModelViewSet):
    queryset = POSTerminal.objects.select_related('branch', 'assigned_cashier').all()
    serializer_class = POSTerminalSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    pagination_class = None

    @action(detail=True, methods=['patch'], url_path='status')
    def set_status(self, request, pk=None):
        terminal = self.get_object()
        status_val = request.data.get('status')
        if not status_val or status_val.lower() not in ['active', 'inactive', 'maintenance', 'offline']:
            return Response({"detail": "Invalid or missing status."}, status=status.HTTP_400_BAD_REQUEST)
        if status_val.lower() == 'offline':
            status_val = 'inactive'
        terminal.status = status_val.lower()
        terminal.save(update_fields=['status', 'updated_at'])
        return Response(POSTerminalSerializer(terminal).data)
from .models import OwnerSettings
from .serializers import OwnerSettingsSerializer

class OwnerSettingsView(APIView):
    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated()]
        return [IsAdmin()]

    def get(self, request):
        settings = OwnerSettings.load()
        serializer = OwnerSettingsSerializer(settings)
        return Response(serializer.data)

    def put(self, request):
        settings = OwnerSettings.load()
        serializer = OwnerSettingsSerializer(settings, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
