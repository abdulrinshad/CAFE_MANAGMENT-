from rest_framework import status, viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.decorators import action
from django.contrib.auth.models import User
from rest_framework_simplejwt.tokens import RefreshToken
from .models import UserProfile, Waiter, Branch, BranchManager
from .serializers import (
    CustomTokenObtainPairSerializer,
    UserSerializer,
    ChangePasswordSerializer,
    WaiterSerializer,
    WaiterSafeSerializer,
    BranchSerializer,
    BranchWriteSerializer,
    BranchManagerSerializer,
)
from .permissions import IsAdminOrManager, IsAdmin


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

class WaiterViewSet(viewsets.ModelViewSet):
    queryset = Waiter.objects.all()
    serializer_class = WaiterSerializer
    permission_classes = [IsAdminOrManager]

    def get_queryset(self):
        queryset = Waiter.objects.all().order_by('-created_at')
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(name__icontains=search)
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            active_bool = is_active.lower() == 'true'
            queryset = queryset.filter(is_active=active_bool)
        return queryset


class ActiveWaiterListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, *args, **kwargs):
        active_waiters = Waiter.objects.filter(is_active=True).order_by('name')
        serializer = WaiterSafeSerializer(active_waiters, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class WaiterLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        waiter_id = request.data.get('waiter_id')
        pin = request.data.get('pin')

        if not waiter_id or not pin:
            return Response({"detail": "waiter_id and pin are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            waiter = Waiter.objects.get(id=waiter_id)
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
        profile.save()

        refresh = RefreshToken.for_user(shadow_user)

        return Response({
            "success": True,
            "waiter": {
                "id": waiter.id,
                "name": waiter.name,
                "section": waiter.section,
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


# ── Branch Views ───────────────────────────────────────────────────────────────

class BranchViewSet(viewsets.ModelViewSet):
    """
    CRUD for Branches.  Only Admin users can create / modify branches.
    List is also accessible to authenticated users (e.g. owner dashboard).
    """
    queryset = Branch.objects.all().order_by('name')
    permission_classes = [IsAdmin]

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

    def get_queryset(self):
        qs = BranchManager.objects.select_related('branch').all()
        branch_id = self.request.query_params.get('branch')
        if branch_id:
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
        pin = request.data.get('pin', '')

        if not manager_id or not pin:
            return Response(
                {"detail": "manager_id and pin are required."},
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
