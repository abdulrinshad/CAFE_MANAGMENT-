from rest_framework import status, viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from .utils import TenantEnforceMixin, BranchEnforceMixin
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.decorators import action
from django.contrib.auth.models import User
from django.contrib.auth.hashers import make_password, check_password
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
    AdminSignupSerializer,
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
            if user.check_password(serializer.validated_data['new_password']):
                return Response(
                    {"detail": "New PIN cannot be the same as your current PIN. Please choose a different PIN."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            return Response({"message": "Password updated successfully."}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


def get_authenticated_manager_email(request):
    """
    Retrieves the registered email address of the authenticated Branch Manager (or Admin/Owner).
    The email is resolved STRICTLY on the backend from database models.
    """
    user = request.user
    if not user or not user.is_authenticated:
        return None, None

    # Check if request.user is a shadow user for BranchManager (username format 'bm_<id>')
    if user.username and user.username.startswith('bm_'):
        try:
            bm_id = int(user.username.replace('bm_', ''))
            manager = BranchManager.objects.filter(pk=bm_id).first()
            if manager:
                if manager.email and str(manager.email).strip():
                    return manager, str(manager.email).strip().lower()
                return manager, None
        except (ValueError, TypeError):
            pass

    # Fallback: check profile.branch -> BranchManager assigned to that branch
    if hasattr(user, 'profile') and user.profile.branch:
        manager = BranchManager.objects.filter(branch=user.profile.branch).first()
        if manager:
            if manager.email and str(manager.email).strip():
                return manager, str(manager.email).strip().lower()
            return manager, None

    # Fallback for Admin/Owner users (not shadow users)
    if user.email and str(user.email).strip() and not '@artisanbrew.internal' in user.email:
        return None, str(user.email).strip().lower()

    return None, None


class WaiterViewSet(BranchEnforceMixin, viewsets.ModelViewSet):
    queryset = Waiter.objects.all()
    serializer_class = WaiterSerializer
    permission_classes = [IsAdminOrManager]
    pagination_class = None

    def get_queryset(self):
        queryset = super().get_queryset().order_by('-created_at')
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
        else:
            queryset = queryset.filter(branch__isnull=False)
        return queryset

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()

        from .branch_views import get_manager_branch
        from .utils import get_user_tenant
        tenant = get_user_tenant(request)
        if tenant and instance.tenant_id and instance.tenant_id != tenant.id:
            return Response({"detail": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)

        manager_branch = get_manager_branch(request)
        if manager_branch:
            if instance.branch_id and instance.branch_id != manager_branch.id:
                return Response({"detail": "Not authorized for staff in this branch."}, status=status.HTTP_403_FORBIDDEN)
            if manager_branch.tenant_id and instance.tenant_id and instance.tenant_id != manager_branch.tenant_id:
                return Response({"detail": "Not authorized for staff in this tenant."}, status=status.HTTP_403_FORBIDDEN)

        data = request.data.copy()
        raw_pin = data.pop('pin', None)

        serializer = self.get_serializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        if raw_pin is not None:
            if isinstance(raw_pin, (list, tuple)):
                raw_pin = raw_pin[0] if raw_pin else ''
            raw_pin = str(raw_pin).strip()
        else:
            raw_pin = ''

        if raw_pin:
            if instance.check_pin(raw_pin):
                return Response(
                    {"detail": "New PIN cannot be the same as your current PIN. Please choose a different PIN."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            mgr_obj, manager_email = get_authenticated_manager_email(request)
            if not manager_email:
                return Response(
                    {"detail": "Branch Manager email is not configured. Please add an email address before changing staff PINs."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            recent_otp = AdminOTP.objects.filter(
                user=request.user,
                waiter=instance,
                created_at__gte=timezone.now() - timedelta(minutes=1)
            ).first()
            if recent_otp:
                return Response(
                    {"detail": "Please wait a minute before requesting another PIN change verification code."},
                    status=status.HTTP_429_TOO_MANY_REQUESTS
                )

            AdminOTP.objects.filter(user=request.user, waiter=instance, is_used=False).update(is_used=True)

            raw_otp = ''.join(random.choices(string.digits, k=6))
            pending_hash = make_password(raw_pin)
            otp_record = AdminOTP(
                user=request.user,
                waiter=instance,
                pending_pin_hash=pending_hash,
                expires_at=timezone.now() + timedelta(minutes=5)
            )
            otp_record.set_otp(raw_otp)
            otp_record.save()

            try:
                email_body = (
                    f"Hello,\n\n"
                    f"A request was made to change the PIN for Waiter '{instance.name}' in your branch.\n\n"
                    f"Your verification code is:\n\n"
                    f"{raw_otp}\n\n"
                    f"This code will expire in 5 minutes.\n\n"
                    f"If you did not request this change, please secure your account immediately."
                )
                send_mail(
                    subject='Confirm Staff PIN Change',
                    message=email_body,
                    from_email=None,
                    recipient_list=[manager_email],
                    fail_silently=False,
                )
            except Exception as e:
                from django.conf import settings
                if settings.DEBUG:
                    print(f"[DEBUG ONLY] Email delivery error: {e}")
                return Response({"detail": "Unable to send verification email. Please try again."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            return Response({
                "requires_otp": True,
                "staff_id": instance.id,
                "email": manager_email,
                "message": "Verification code sent to your email."
            }, status=status.HTTP_200_OK)

        return Response({
            "requires_otp": False,
            "data": serializer.data
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='verify_pin_change')
    def verify_pin_change(self, request, pk=None):
        instance = self.get_object()
        from .utils import get_user_tenant
        tenant = get_user_tenant(request)
        if tenant and instance.tenant_id and instance.tenant_id != tenant.id:
            return Response({"detail": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)

        if hasattr(request.user, 'profile') and request.user.profile.branch_id:
            if instance.branch_id != request.user.profile.branch_id:
                return Response({"detail": "Not authorized for staff in this branch."}, status=status.HTTP_403_FORBIDDEN)

        otp = request.data.get('otp', '').strip()
        if not otp:
            return Response({"detail": "OTP is required."}, status=status.HTTP_400_BAD_REQUEST)

        otp_record = AdminOTP.objects.filter(
            user=request.user,
            waiter=instance,
            is_used=False,
            expires_at__gte=timezone.now(),
            attempt_count__lt=3
        ).order_by('-created_at').first()

        if not otp_record or not otp_record.check_otp(otp):
            if otp_record:
                otp_record.attempt_count += 1
                otp_record.save()
            return Response({"detail": "Invalid verification code."}, status=status.HTTP_400_BAD_REQUEST)

        instance.pin_hash = otp_record.pending_pin_hash
        instance.save(update_fields=['pin_hash', 'updated_at'])

        otp_record.is_used = True
        otp_record.save()
        AdminOTP.objects.filter(user=request.user, waiter=instance, is_used=False).update(is_used=True)

        return Response({"success": True, "message": "Waiter PIN has been updated successfully."})

    @action(detail=True, methods=['post'], url_path='resend_pin_change_otp')
    def resend_pin_change_otp(self, request, pk=None):
        instance = self.get_object()
        from .utils import get_user_tenant
        tenant = get_user_tenant(request)
        if tenant and instance.tenant_id and instance.tenant_id != tenant.id:
            return Response({"detail": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)

        if hasattr(request.user, 'profile') and request.user.profile.branch_id:
            if instance.branch_id != request.user.profile.branch_id:
                return Response({"detail": "Not authorized for staff in this branch."}, status=status.HTTP_403_FORBIDDEN)

        mgr_obj, manager_email = get_authenticated_manager_email(request)
        if not manager_email:
            return Response({"detail": "Branch Manager email address is missing."}, status=status.HTTP_400_BAD_REQUEST)

        recent_otp = AdminOTP.objects.filter(
            user=request.user,
            waiter=instance,
            created_at__gte=timezone.now() - timedelta(minutes=1)
        ).first()
        if recent_otp:
            return Response({"detail": "Please wait a minute before requesting another OTP."}, status=status.HTTP_429_TOO_MANY_REQUESTS)

        latest_otp = AdminOTP.objects.filter(user=request.user, waiter=instance).order_by('-created_at').first()
        if not latest_otp or not latest_otp.pending_pin_hash:
            return Response({"detail": "No active PIN change request found."}, status=status.HTTP_400_BAD_REQUEST)

        AdminOTP.objects.filter(user=request.user, waiter=instance, is_used=False).update(is_used=True)

        raw_otp = ''.join(random.choices(string.digits, k=6))
        new_otp_record = AdminOTP(
            user=request.user,
            waiter=instance,
            pending_pin_hash=latest_otp.pending_pin_hash,
            expires_at=timezone.now() + timedelta(minutes=5)
        )
        new_otp_record.set_otp(raw_otp)
        new_otp_record.save()

        try:
            email_body = (
                f"Hello,\n\n"
                f"Your new verification code for changing the PIN of Waiter '{instance.name}' is:\n\n"
                f"{raw_otp}\n\n"
                f"This code will expire in 5 minutes.\n\n"
                f"If you did not request this change, please secure your account immediately."
            )
            send_mail(
                subject='Confirm Staff PIN Change',
                message=email_body,
                from_email=None,
                recipient_list=[manager_email],
                fail_silently=False,
            )
        except Exception as e:
            from django.conf import settings
            if settings.DEBUG:
                print(f"[DEBUG ONLY] Email delivery error: {e}")
            return Response({"detail": "Unable to send verification email. Please try again."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({"success": True, "message": "New verification code sent to your email."})


class ActiveWaiterListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, *args, **kwargs):
        active_waiters = Waiter.objects.filter(is_active=True).order_by('name')
        serializer = WaiterSafeSerializer(active_waiters, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class WaiterLoginView(APIView):
    """
    POST /auth/waiter-login/
    Body: { business_code, branch_code, waiter_id, pin }

    Authenticates a Waiter using Business Code + Branch Code + Employee ID + 4-Digit PIN.
    Scoped by tenant + branch.
    """
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        business_code = str(request.data.get('business_code', '')).strip()
        branch_code = str(request.data.get('branch_code', '')).strip()
        waiter_id = str(request.data.get('waiter_id', '')).strip()
        pin = str(request.data.get('pin', '')).strip()

        if not business_code or not branch_code or not waiter_id or not pin:
            return Response(
                {"detail": "Business Code, Branch Code, waiter_id, and pin are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        from .models import Tenant, Branch
        tenant = Tenant.objects.filter(business_code__iexact=business_code).first()
        if not tenant:
            return Response(
                {"detail": "Employee not found in this business/branch."},
                status=status.HTTP_401_UNAUTHORIZED
            )

        branch = Branch.objects.filter(code__iexact=branch_code, tenant=tenant).first()
        if not branch:
            return Response(
                {"detail": "Employee not found in this business/branch."},
                status=status.HTTP_401_UNAUTHORIZED
            )

        waiter = Waiter.objects.select_related('branch', 'tenant').filter(employee_id__iexact=waiter_id, branch=branch).first()

        if waiter is None:
            if Cashier.objects.filter(employee_id__iexact=waiter_id, branch=branch).exists() or \
               KitchenStaff.objects.filter(employee_id__iexact=waiter_id, branch=branch).exists():
                return Response(
                    {"detail": "Employee is not registered for this role."},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            return Response(
                {"detail": "Employee not found in this business/branch."},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Self-heal legacy tenant assignment
        if waiter.tenant_id != tenant.id:
            waiter.tenant = tenant
            waiter.save(update_fields=['tenant'])

        if not waiter.is_active:
            return Response(
                {"detail": "This employee account is inactive."},
                status=status.HTTP_403_FORBIDDEN
            )

        if not waiter.check_pin(pin):
            if waiter.pin_hash == pin:
                waiter.set_pin(pin)
                waiter.save(update_fields=['pin_hash'])
            else:
                return Response(
                    {"detail": "Invalid PIN."},
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
        profile.tenant = waiter.tenant
        profile.save()

        refresh = RefreshToken.for_user(shadow_user)
        if waiter.tenant:
            refresh['tenant_id'] = waiter.tenant.id
            refresh['business_code'] = waiter.tenant.business_code

        return Response({
            "success": True,
            "role": "waiter",
            "waiter": {
                "id": waiter.id,
                "name": waiter.name,
                "employee_id": waiter.employee_id,
                "role": "waiter",
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


# ── Employee Login (unified Waiter + Cashier + Kitchen) ─────────────────────────

class EmployeeLoginView(APIView):
    """
    POST /auth/employee-login/
    Body: { business_code, branch_code, employee_id, pin, role (optional) }

    Authenticates an employee (Cashier / Waiter / Kitchen) using Employee ID + PIN.
    Scoped by tenant + branch.
    """
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        business_code = str(request.data.get('business_code', '')).strip()
        branch_code = str(request.data.get('branch_code', '')).strip()
        employee_id = str(request.data.get('employee_id', '')).strip()
        pin = str(request.data.get('pin', '')).strip()
        requested_role = request.data.get('role')
        if requested_role:
            requested_role = str(requested_role).lower().strip()

        if not business_code or not branch_code or not employee_id or not pin:
            return Response(
                {"detail": "Business Code, Branch Code, Employee ID, and PIN are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        from .models import Tenant, Branch
        tenant = Tenant.objects.filter(business_code__iexact=business_code).first()
        if not tenant:
            return Response(
                {"detail": "Employee not found in this business/branch."},
                status=status.HTTP_401_UNAUTHORIZED
            )

        branch = Branch.objects.filter(code__iexact=branch_code, tenant=tenant).first()
        if not branch:
            return Response(
                {"detail": "Employee not found in this business/branch."},
                status=status.HTTP_401_UNAUTHORIZED
            )

        waiter = None
        cashier = None
        kitchen = None

        if requested_role == 'cashier':
            cashier = Cashier.objects.select_related('branch').filter(employee_id__iexact=employee_id, branch=branch).first()
            if cashier is None:
                if Waiter.objects.filter(employee_id__iexact=employee_id, branch=branch).exists() or \
                   KitchenStaff.objects.filter(employee_id__iexact=employee_id, branch=branch).exists():
                    return Response(
                        {"detail": "Employee is not registered for this role."},
                        status=status.HTTP_401_UNAUTHORIZED
                    )
                return Response(
                    {"detail": "Employee not found in this business/branch."},
                    status=status.HTTP_401_UNAUTHORIZED
                )
        elif requested_role == 'waiter':
            waiter = Waiter.objects.select_related('branch').filter(employee_id__iexact=employee_id, branch=branch).first()
            if waiter is None:
                if Cashier.objects.filter(employee_id__iexact=employee_id, branch=branch).exists() or \
                   KitchenStaff.objects.filter(employee_id__iexact=employee_id, branch=branch).exists():
                    return Response(
                        {"detail": "Employee is not registered for this role."},
                        status=status.HTTP_401_UNAUTHORIZED
                    )
                return Response(
                    {"detail": "Employee not found in this business/branch."},
                    status=status.HTTP_401_UNAUTHORIZED
                )
        elif requested_role == 'kitchen':
            kitchen = KitchenStaff.objects.select_related('branch').filter(employee_id__iexact=employee_id, branch=branch).first()
            if kitchen is None:
                if Waiter.objects.filter(employee_id__iexact=employee_id, branch=branch).exists() or \
                   Cashier.objects.filter(employee_id__iexact=employee_id, branch=branch).exists():
                    return Response(
                        {"detail": "Employee is not registered for this role."},
                        status=status.HTTP_401_UNAUTHORIZED
                    )
                return Response(
                    {"detail": "Employee not found in this business/branch."},
                    status=status.HTTP_401_UNAUTHORIZED
                )
        else:
            cashier = Cashier.objects.select_related('branch').filter(employee_id__iexact=employee_id, branch=branch).first()
            if cashier is None:
                waiter = Waiter.objects.select_related('branch').filter(employee_id__iexact=employee_id, branch=branch).first()
            if cashier is None and waiter is None:
                kitchen = KitchenStaff.objects.select_related('branch').filter(employee_id__iexact=employee_id, branch=branch).first()

        if waiter is None and cashier is None and kitchen is None:
            return Response(
                {"detail": "Employee not found in this business/branch."},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if waiter is not None:
            if waiter.tenant_id != tenant.id:
                waiter.tenant = tenant
                waiter.save(update_fields=['tenant'])
            return self._login_waiter(request, waiter, pin)
        elif cashier is not None:
            if cashier.tenant_id != tenant.id:
                cashier.tenant = tenant
                cashier.save(update_fields=['tenant'])
            return self._login_cashier(request, cashier, pin)
        else:
            if kitchen.tenant_id != tenant.id:
                kitchen.tenant = tenant
                kitchen.save(update_fields=['tenant'])
            return self._login_kitchen(request, kitchen, pin)

    def _login_waiter(self, request, waiter, pin):
        if not waiter.is_active:
            return Response(
                {"detail": "This employee account is inactive."},
                status=status.HTTP_403_FORBIDDEN
            )
        if not waiter.check_pin(pin):
            if waiter.pin_hash == pin:
                waiter.set_pin(pin)
                waiter.save(update_fields=['pin_hash'])
            else:
                return Response(
                    {"detail": "Invalid PIN."},
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
        profile.tenant = waiter.tenant
        profile.save()

        refresh = RefreshToken.for_user(shadow_user)
        if waiter.tenant:
            refresh['tenant_id'] = waiter.tenant.id
            refresh['business_code'] = waiter.tenant.business_code
        return Response({
            "success": True,
            "role": "waiter",
            "employee": {
                "id": waiter.id,
                "name": waiter.name,
                "employee_id": waiter.employee_id,
                "role": "waiter",
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
                {"detail": "This employee account is inactive."},
                status=status.HTTP_403_FORBIDDEN
            )
        if not cashier.check_pin(pin):
            if cashier.pin_hash == pin:
                cashier.set_pin(pin)
                cashier.save(update_fields=['pin_hash'])
            else:
                return Response(
                    {"detail": "Invalid PIN."},
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
        profile.tenant = cashier.tenant
        profile.save()

        refresh = RefreshToken.for_user(shadow_user)
        if cashier.tenant:
            refresh['tenant_id'] = cashier.tenant.id
            refresh['business_code'] = cashier.tenant.business_code
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
                "role": "cashier",
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
                {"detail": "This employee account is inactive."},
                status=status.HTTP_403_FORBIDDEN
            )
        if not kitchen.check_pin(pin):
            if kitchen.pin_hash == pin:
                kitchen.set_pin(pin)
                kitchen.save(update_fields=['pin_hash'])
            else:
                return Response(
                    {"detail": "Invalid PIN."},
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
        profile.tenant = kitchen.tenant
        profile.save()

        refresh = RefreshToken.for_user(shadow_user)
        if kitchen.tenant:
            refresh['tenant_id'] = kitchen.tenant.id
            refresh['business_code'] = kitchen.tenant.business_code
        return Response({
            "success": True,
            "role": "kitchen",
            "employee": {
                "id": kitchen.id,
                "name": kitchen.name,
                "employee_id": kitchen.employee_id,
                "role": "kitchen",
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
        qs = super().get_queryset().select_related('branch').order_by('-created_at')
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
        else:
            qs = qs.filter(branch__isnull=False)
        return qs

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()

        from .branch_views import get_manager_branch
        from .utils import get_user_tenant
        tenant = get_user_tenant(request)
        if tenant and instance.tenant_id and instance.tenant_id != tenant.id:
            return Response({"detail": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)

        manager_branch = get_manager_branch(request)
        if manager_branch:
            if instance.branch_id and instance.branch_id != manager_branch.id:
                return Response({"detail": "Not authorized for staff in this branch."}, status=status.HTTP_403_FORBIDDEN)
            if manager_branch.tenant_id and instance.tenant_id and instance.tenant_id != manager_branch.tenant_id:
                return Response({"detail": "Not authorized for staff in this tenant."}, status=status.HTTP_403_FORBIDDEN)

        data = request.data.copy()
        raw_pin = data.pop('pin', None)

        serializer = self.get_serializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        if raw_pin is not None:
            if isinstance(raw_pin, (list, tuple)):
                raw_pin = raw_pin[0] if raw_pin else ''
            raw_pin = str(raw_pin).strip()
        else:
            raw_pin = ''

        if raw_pin:
            if instance.check_pin(raw_pin):
                return Response(
                    {"detail": "New PIN cannot be the same as your current PIN. Please choose a different PIN."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            mgr_obj, manager_email = get_authenticated_manager_email(request)
            if not manager_email:
                return Response(
                    {"detail": "Branch Manager email is not configured. Please add an email address before changing staff PINs."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            recent_otp = AdminOTP.objects.filter(
                user=request.user,
                cashier=instance,
                created_at__gte=timezone.now() - timedelta(minutes=1)
            ).first()
            if recent_otp:
                return Response(
                    {"detail": "Please wait a minute before requesting another PIN change verification code."},
                    status=status.HTTP_429_TOO_MANY_REQUESTS
                )

            AdminOTP.objects.filter(user=request.user, cashier=instance, is_used=False).update(is_used=True)

            raw_otp = ''.join(random.choices(string.digits, k=6))
            pending_hash = make_password(raw_pin)
            otp_record = AdminOTP(
                user=request.user,
                cashier=instance,
                pending_pin_hash=pending_hash,
                expires_at=timezone.now() + timedelta(minutes=5)
            )
            otp_record.set_otp(raw_otp)
            otp_record.save()

            try:
                email_body = (
                    f"Hello,\n\n"
                    f"A request was made to change the PIN for Cashier '{instance.name}' in your branch.\n\n"
                    f"Your verification code is:\n\n"
                    f"{raw_otp}\n\n"
                    f"This code will expire in 5 minutes.\n\n"
                    f"If you did not request this change, please secure your account immediately."
                )
                send_mail(
                    subject='Confirm Staff PIN Change',
                    message=email_body,
                    from_email=None,
                    recipient_list=[manager_email],
                    fail_silently=False,
                )
            except Exception as e:
                from django.conf import settings
                if settings.DEBUG:
                    print(f"[DEBUG ONLY] Email delivery error: {e}")
                return Response({"detail": "Unable to send verification email. Please try again."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            return Response({
                "requires_otp": True,
                "staff_id": instance.id,
                "email": manager_email,
                "message": "Verification code sent to your email."
            }, status=status.HTTP_200_OK)

        return Response({
            "requires_otp": False,
            "data": serializer.data
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='verify_pin_change')
    def verify_pin_change(self, request, pk=None):
        instance = self.get_object()
        from .utils import get_user_tenant
        tenant = get_user_tenant(request)
        if tenant and instance.tenant_id and instance.tenant_id != tenant.id:
            return Response({"detail": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)

        if hasattr(request.user, 'profile') and request.user.profile.branch_id:
            if instance.branch_id != request.user.profile.branch_id:
                return Response({"detail": "Not authorized for staff in this branch."}, status=status.HTTP_403_FORBIDDEN)

        otp = request.data.get('otp', '').strip()
        if not otp:
            return Response({"detail": "OTP is required."}, status=status.HTTP_400_BAD_REQUEST)

        otp_record = AdminOTP.objects.filter(
            user=request.user,
            cashier=instance,
            is_used=False,
            expires_at__gte=timezone.now(),
            attempt_count__lt=3
        ).order_by('-created_at').first()

        if not otp_record or not otp_record.check_otp(otp):
            if otp_record:
                otp_record.attempt_count += 1
                otp_record.save()
            return Response({"detail": "Invalid verification code."}, status=status.HTTP_400_BAD_REQUEST)

        instance.pin_hash = otp_record.pending_pin_hash
        instance.save(update_fields=['pin_hash', 'updated_at'])

        otp_record.is_used = True
        otp_record.save()
        AdminOTP.objects.filter(user=request.user, cashier=instance, is_used=False).update(is_used=True)

        return Response({"success": True, "message": "Cashier PIN has been updated successfully."})

    @action(detail=True, methods=['post'], url_path='resend_pin_change_otp')
    def resend_pin_change_otp(self, request, pk=None):
        instance = self.get_object()
        from .utils import get_user_tenant
        tenant = get_user_tenant(request)
        if tenant and instance.tenant_id and instance.tenant_id != tenant.id:
            return Response({"detail": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)

        if hasattr(request.user, 'profile') and request.user.profile.branch_id:
            if instance.branch_id != request.user.profile.branch_id:
                return Response({"detail": "Not authorized for staff in this branch."}, status=status.HTTP_403_FORBIDDEN)

        mgr_obj, manager_email = get_authenticated_manager_email(request)
        if not manager_email:
            return Response({"detail": "Branch Manager email address is missing."}, status=status.HTTP_400_BAD_REQUEST)

        recent_otp = AdminOTP.objects.filter(
            user=request.user,
            cashier=instance,
            created_at__gte=timezone.now() - timedelta(minutes=1)
        ).first()
        if recent_otp:
            return Response({"detail": "Please wait a minute before requesting another OTP."}, status=status.HTTP_429_TOO_MANY_REQUESTS)

        latest_otp = AdminOTP.objects.filter(user=request.user, cashier=instance).order_by('-created_at').first()
        if not latest_otp or not latest_otp.pending_pin_hash:
            return Response({"detail": "No active PIN change request found."}, status=status.HTTP_400_BAD_REQUEST)

        AdminOTP.objects.filter(user=request.user, cashier=instance, is_used=False).update(is_used=True)

        raw_otp = ''.join(random.choices(string.digits, k=6))
        new_otp_record = AdminOTP(
            user=request.user,
            cashier=instance,
            pending_pin_hash=latest_otp.pending_pin_hash,
            expires_at=timezone.now() + timedelta(minutes=5)
        )
        new_otp_record.set_otp(raw_otp)
        new_otp_record.save()

        try:
            email_body = (
                f"Hello,\n\n"
                f"Your new verification code for changing the PIN of Cashier '{instance.name}' is:\n\n"
                f"{raw_otp}\n\n"
                f"This code will expire in 5 minutes.\n\n"
                f"If you did not request this change, please secure your account immediately."
            )
            send_mail(
                subject='Confirm Staff PIN Change',
                message=email_body,
                from_email=None,
                recipient_list=[manager_email],
                fail_silently=False,
            )
        except Exception as e:
            from django.conf import settings
            if settings.DEBUG:
                print(f"[DEBUG ONLY] Email delivery error: {e}")
            return Response({"detail": "Unable to send verification email. Please try again."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({"success": True, "message": "New verification code sent to your email."})

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

class BranchViewSet(TenantEnforceMixin, viewsets.ModelViewSet):
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
        from .utils import get_user_tenant
        serializer = BranchWriteSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        tenant = get_user_tenant(request)
        branch = serializer.save(tenant=tenant)
        return Response(BranchSerializer(branch, context={'request': request}).data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = BranchWriteSerializer(instance, data=request.data, partial=partial, context={'request': request})
        serializer.is_valid(raise_exception=True)
        branch = serializer.save()
        return Response(BranchSerializer(branch, context={'request': request}).data)

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

class BranchManagerViewSet(TenantEnforceMixin, viewsets.ModelViewSet):
    """
    CRUD for Branch Managers. Only Admin can manage these.
    Each branch can have at most one manager (OneToOneField).
    """
    queryset = BranchManager.objects.select_related('branch').all()
    serializer_class = BranchManagerSerializer
    permission_classes = [IsAdmin]
    pagination_class = None

    def get_queryset(self):
        qs = super().get_queryset().select_related('branch')
        branch_id = self.request.query_params.get('branch')
        if branch_id and str(branch_id).lower() != 'all':
            if str(branch_id).isdigit():
                qs = qs.filter(branch_id=branch_id)
        else:
            qs = qs.filter(branch__isnull=False)
        return qs

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        from .utils import get_user_tenant
        tenant = get_user_tenant(request)
        if tenant and instance.tenant_id and instance.tenant_id != tenant.id:
            return Response({"detail": "Not authorized to update this manager."}, status=status.HTTP_403_FORBIDDEN)

        data = request.data.copy()
        raw_pin = data.pop('pin', None)

        serializer = self.get_serializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        if raw_pin is not None:
            if isinstance(raw_pin, (list, tuple)):
                raw_pin = raw_pin[0] if raw_pin else ''
            raw_pin = str(raw_pin).strip()
        else:
            raw_pin = ''

        if raw_pin:
            if instance.check_pin(raw_pin):
                return Response(
                    {"detail": "New PIN cannot be the same as your current PIN. Please choose a different PIN."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            recent_otp = AdminOTP.objects.filter(
                user=request.user,
                manager=instance,
                created_at__gte=timezone.now() - timedelta(minutes=1)
            ).first()
            if recent_otp:
                return Response(
                    {"detail": "Please wait a minute before requesting another PIN change verification code."},
                    status=status.HTTP_429_TOO_MANY_REQUESTS
                )

            AdminOTP.objects.filter(user=request.user, manager=instance, is_used=False).update(is_used=True)

            raw_otp = ''.join(random.choices(string.digits, k=6))
            pending_hash = make_password(raw_pin)
            otp_record = AdminOTP(
                user=request.user,
                manager=instance,
                pending_pin_hash=pending_hash,
                expires_at=timezone.now() + timedelta(minutes=5)
            )
            otp_record.set_otp(raw_otp)
            otp_record.save()

            owner_email = request.user.email
            if not owner_email:
                return Response({"detail": "Owner email address is missing on your account."}, status=status.HTTP_400_BAD_REQUEST)

            try:
                email_body = (
                    f"Hello,\n\n"
                    f"A request was made to change the PIN for Branch Manager '{instance.name}' ({instance.branch.name}).\n\n"
                    f"Your verification code is:\n\n"
                    f"{raw_otp}\n\n"
                    f"This code will expire in 5 minutes.\n\n"
                    f"If you did not request this change, please secure your account immediately."
                )
                send_mail(
                    subject='Confirm Branch Manager PIN Change',
                    message=email_body,
                    from_email=None,
                    recipient_list=[owner_email],
                    fail_silently=False,
                )
            except Exception as e:
                from django.conf import settings
                if settings.DEBUG:
                    print(f"[DEBUG ONLY] Email delivery error: {e}")
                return Response({"detail": "Unable to send verification email. Please try again."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            return Response({
                "requires_otp": True,
                "manager_id": instance.id,
                "message": "Verification code sent to your email."
            }, status=status.HTTP_200_OK)

        return Response({
            "requires_otp": False,
            "data": serializer.data
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='verify_pin_change')
    def verify_pin_change(self, request, pk=None):
        instance = self.get_object()
        from .utils import get_user_tenant
        tenant = get_user_tenant(request)
        if tenant and instance.tenant_id and instance.tenant_id != tenant.id:
            return Response({"detail": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)

        otp = request.data.get('otp', '').strip()
        if not otp:
            return Response({"detail": "OTP is required."}, status=status.HTTP_400_BAD_REQUEST)

        otp_record = AdminOTP.objects.filter(
            user=request.user,
            manager=instance,
            is_used=False,
            expires_at__gte=timezone.now(),
            attempt_count__lt=3
        ).order_by('-created_at').first()

        if not otp_record or not otp_record.check_otp(otp):
            if otp_record:
                otp_record.attempt_count += 1
                otp_record.save()
            return Response({"detail": "Invalid or expired verification code."}, status=status.HTTP_400_BAD_REQUEST)

        if not otp_record.pending_pin_hash:
            return Response({"detail": "No pending PIN change request found."}, status=status.HTTP_400_BAD_REQUEST)

        instance.pin_hash = otp_record.pending_pin_hash
        instance.save(update_fields=['pin_hash', 'updated_at'])

        otp_record.is_used = True
        otp_record.save()
        AdminOTP.objects.filter(user=request.user, manager=instance, is_used=False).update(is_used=True)

        return Response({
            "success": True,
            "message": "Branch Manager PIN updated successfully."
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='resend_pin_change_otp')
    def resend_pin_change_otp(self, request, pk=None):
        instance = self.get_object()
        from .utils import get_user_tenant
        tenant = get_user_tenant(request)
        if tenant and instance.tenant_id and instance.tenant_id != tenant.id:
            return Response({"detail": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)

        recent_otp = AdminOTP.objects.filter(
            user=request.user,
            manager=instance,
            created_at__gte=timezone.now() - timedelta(minutes=1)
        ).first()
        if recent_otp:
            return Response({"detail": "Please wait a minute before requesting another OTP."}, status=status.HTTP_429_TOO_MANY_REQUESTS)

        latest_otp = AdminOTP.objects.filter(user=request.user, manager=instance).order_by('-created_at').first()
        if not latest_otp or not latest_otp.pending_pin_hash:
            return Response({"detail": "No active PIN change request found."}, status=status.HTTP_400_BAD_REQUEST)

        AdminOTP.objects.filter(user=request.user, manager=instance, is_used=False).update(is_used=True)

        raw_otp = ''.join(random.choices(string.digits, k=6))
        new_otp_record = AdminOTP(
            user=request.user,
            manager=instance,
            pending_pin_hash=latest_otp.pending_pin_hash,
            expires_at=timezone.now() + timedelta(minutes=5)
        )
        new_otp_record.set_otp(raw_otp)
        new_otp_record.save()

        owner_email = request.user.email
        if not owner_email:
            return Response({"detail": "Owner email address is missing on your account."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            email_body = (
                f"Hello,\n\n"
                f"Your new verification code for changing the PIN of Branch Manager '{instance.name}' ({instance.branch.name}) is:\n\n"
                f"{raw_otp}\n\n"
                f"This code will expire in 5 minutes.\n\n"
                f"If you did not request this change, please secure your account immediately."
            )
            send_mail(
                subject='Confirm Branch Manager PIN Change',
                message=email_body,
                from_email=None,
                recipient_list=[owner_email],
                fail_silently=False,
            )
        except Exception as e:
            from django.conf import settings
            if settings.DEBUG:
                print(f"[DEBUG ONLY] Email delivery error: {e}")
            return Response({"detail": "Unable to send verification email. Please try again."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({"success": True, "message": "New verification code sent to your email."})


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
        business_code = request.data.get('business_code', '').strip()
        branch_code = request.data.get('branch_code', '').strip()
        manager_id = request.data.get('manager_id', '').strip()
        pin = request.data.get('pin', request.data.get('password', ''))

        if not business_code or not branch_code or not manager_id or not pin:
            return Response(
                {"detail": "Business Code, Branch Code, Manager ID, and PIN are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        from .models import Tenant, Branch
        try:
            tenant = Tenant.objects.get(business_code=business_code)
        except Tenant.DoesNotExist:
            return Response(
                {"detail": "Invalid Business Code."},
                status=status.HTTP_401_UNAUTHORIZED
            )
            
        try:
            branch = Branch.objects.get(code=branch_code, tenant=tenant)
        except Branch.DoesNotExist:
            return Response(
                {"detail": "Branch does not belong to this business or does not exist."},
                status=status.HTTP_401_UNAUTHORIZED
            )

        try:
            # We already know branch belongs to this tenant. Search by branch to handle legacy rows missing tenant_id.
            manager = BranchManager.objects.select_related('branch').get(manager_id=manager_id, branch=branch)
            # Self-heal legacy data
            if manager.tenant_id != tenant.id:
                manager.tenant = tenant
                manager.save(update_fields=['tenant'])
        except BranchManager.DoesNotExist:
            return Response(
                {"detail": "Manager not found in this business/branch."},
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
            # Fallback for old plaintext passwords
            if manager.pin_hash == pin:
                manager.set_pin(pin)
                manager.save(update_fields=['pin_hash'])
            else:
                return Response(
                    {"detail": "Invalid PIN."},
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
        profile.tenant = manager.tenant
        profile.save()

        refresh = RefreshToken.for_user(shadow_user)
        if manager.tenant:
            refresh['tenant_id'] = manager.tenant.id
            refresh['business_code'] = manager.tenant.business_code

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

    def get_queryset(self):
        qs = super().get_queryset()
        branch_id = self.request.query_params.get('branch')
        if branch_id and str(branch_id).lower() != 'all':
            if str(branch_id).isdigit():
                qs = qs.filter(branch_id=branch_id)
        else:
            qs = qs.filter(branch__isnull=False)
        return qs

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
        from .utils import get_user_tenant
        tenant = get_user_tenant(request)
        settings = OwnerSettings.load(tenant=tenant)
        serializer = OwnerSettingsSerializer(settings)
        return Response(serializer.data)

    def put(self, request):
        from .utils import get_user_tenant
        tenant = get_user_tenant(request)
        settings = OwnerSettings.load(tenant=tenant)
        serializer = OwnerSettingsSerializer(settings, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


import random
import string
from django.utils import timezone
from datetime import timedelta
from django.core.mail import send_mail
from django.db.models import Q
from .models import AdminOTP

class AdminForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        email = request.data.get('email', '').strip()
        if not email:
            return Response({"detail": "Email is required."}, status=status.HTTP_400_BAD_REQUEST)

        # Find user by email, ensure they are an admin
        users = User.objects.filter(Q(email__iexact=email) | Q(username__iexact=email))
        admin_user = None
        for u in users:
            if not u.is_active:
                continue
            if u.is_superuser:
                admin_user = u
                break
            if hasattr(u, 'profile') and u.profile.role in ['ADMIN', 'MANAGER']:
                admin_user = u
                break
        
        if not admin_user:
            return Response({"detail": "This email is not registered as an admin."}, status=status.HTTP_400_BAD_REQUEST)

        # Rate limiting: max 1 OTP per minute
        recent_otp = AdminOTP.objects.filter(
            user=admin_user, 
            created_at__gte=timezone.now() - timedelta(minutes=1)
        ).first()
        if recent_otp:
            return Response({"detail": "Please wait a minute before requesting another OTP."}, status=status.HTTP_429_TOO_MANY_REQUESTS)

        # Generate 6 digit OTP
        raw_otp = ''.join(random.choices(string.digits, k=6))
        
        # Save securely
        otp_record = AdminOTP(
            user=admin_user,
            expires_at=timezone.now() + timedelta(minutes=5)
        )
        otp_record.set_otp(raw_otp)
        otp_record.save()

        # Send Email
        try:
            email_body = (
                f"Hello,\n\n"
                f"Your password reset verification code for Artisan Brew is:\n\n"
                f"{raw_otp}\n\n"
                f"This code will expire in 5 minutes.\n\n"
                f"If you did not request a password reset, please ignore this email."
            )
            send_mail(
                subject='Your Admin Password Reset OTP',
                message=email_body,
                from_email=None,
                recipient_list=[admin_user.email],
                fail_silently=False,
            )
        except Exception as e:
            from django.conf import settings
            if settings.DEBUG:
                print(f"[DEBUG ONLY] Email delivery error: {e}")
            return Response({"detail": "Unable to send verification email. Please try again."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({"success": True, "message": "OTP sent to email."})

class AdminVerifyOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        email = request.data.get('email', '').strip()
        otp = request.data.get('otp', '').strip()

        if not email or not otp:
            return Response({"detail": "Email and OTP are required."}, status=status.HTTP_400_BAD_REQUEST)

        users = User.objects.filter(Q(email__iexact=email) | Q(username__iexact=email))
        if not users.exists():
            return Response({"detail": "Invalid email."}, status=status.HTTP_400_BAD_REQUEST)
        
        user = users.first()

        # Find latest active OTP
        otp_record = AdminOTP.objects.filter(
            user=user,
            is_used=False,
            expires_at__gte=timezone.now(),
            attempt_count__lt=3
        ).order_by('-created_at').first()

        if not otp_record:
            return Response({"detail": "No valid OTP found or OTP expired."}, status=status.HTTP_400_BAD_REQUEST)

        if not otp_record.check_otp(otp):
            otp_record.attempt_count += 1
            otp_record.save()
            return Response({"detail": "Invalid OTP."}, status=status.HTTP_400_BAD_REQUEST)

        return Response({"success": True, "message": "OTP verified successfully."})

class AdminResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        email = request.data.get('email', '').strip()
        otp = request.data.get('otp', '').strip()
        new_password = request.data.get('new_password', '')
        confirm_password = request.data.get('confirm_password', '')

        if not email or not otp or not new_password:
            return Response({"detail": "All fields are required."}, status=status.HTTP_400_BAD_REQUEST)

        if new_password != confirm_password:
            return Response({"detail": "Passwords do not match."}, status=status.HTTP_400_BAD_REQUEST)

        if len(new_password) < 8:
            return Response({"detail": "Password must be at least 8 characters long."}, status=status.HTTP_400_BAD_REQUEST)

        users = User.objects.filter(Q(email__iexact=email) | Q(username__iexact=email))
        if not users.exists():
            return Response({"detail": "Invalid email."}, status=status.HTTP_400_BAD_REQUEST)
        
        user = users.first()

        if user.check_password(new_password):
            return Response(
                {"detail": "New PIN cannot be the same as your current PIN. Please choose a different PIN."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Re-verify OTP
        otp_record = AdminOTP.objects.filter(
            user=user,
            is_used=False,
            expires_at__gte=timezone.now(),
            attempt_count__lt=3
        ).order_by('-created_at').first()

        if not otp_record or not otp_record.check_otp(otp):
            if otp_record:
                otp_record.attempt_count += 1
                otp_record.save()
            return Response({"detail": "Invalid or expired OTP."}, status=status.HTTP_400_BAD_REQUEST)

        # Reset Password
        user.set_password(new_password)
        user.save()

        # Mark OTP as used
        otp_record.is_used = True
        otp_record.save()

        # Invalidate all other active OTPs for this user just in case
        AdminOTP.objects.filter(user=user, is_used=False).update(is_used=True)

        return Response({"success": True, "message": "Password reset successfully."})

class AdminSignupView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = AdminSignupSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['email']
        password = serializer.validated_data['password']
        full_name = serializer.validated_data['full_name']

        from django.db import transaction
        from django.db.models import Q
        from django.conf import settings
        import logging
        logger = logging.getLogger(__name__)

        try:
            with transaction.atomic():
                user = User.objects.filter(Q(email__iexact=email) | Q(username__iexact=email)).first()
                
                if user:
                    if user.is_active:
                        return Response({"email": ["An account with this email already exists and is active."]}, status=status.HTTP_400_BAD_REQUEST)
                    
                    # Safe recovery of a pending/inactive user
                    user.set_password(password)
                    name_parts = full_name.split(' ', 1)
                    user.first_name = name_parts[0][:30]
                    if len(name_parts) > 1:
                        user.last_name = name_parts[1][:30]
                    user.save()
                else:
                    # Create an inactive user
                    user = User.objects.create_user(
                        username=email,
                        email=email,
                        password=password,
                        is_active=False
                    )
                    name_parts = full_name.split(' ', 1)
                    user.first_name = name_parts[0][:30]
                    if len(name_parts) > 1:
                        user.last_name = name_parts[1][:30]
                    user.save()

                # Safely handle the UserProfile
                from .models import UserProfile
                profile, created = UserProfile.objects.get_or_create(user=user)
                if profile.role != UserProfile.ADMIN:
                    profile.role = UserProfile.ADMIN
                    profile.save()

                # Generate OTP
                raw_otp = ''.join(random.choices(string.digits, k=6))
                otp_record = AdminOTP(
                    user=user,
                    expires_at=timezone.now() + timedelta(minutes=5)
                )
                otp_record.set_otp(raw_otp)
                otp_record.save()

                # Send Email within transaction scope
                email_body = (
                    f"Hello,\n\n"
                    f"Your verification code for Artisan Brew is:\n\n"
                    f"{raw_otp}\n\n"
                    f"This code will expire in 5 minutes.\n\n"
                    f"If you did not request this registration, please ignore this email."
                )
                try:
                    send_mail(
                        subject='Your Admin Registration OTP',
                        message=email_body,
                        from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', None),
                        recipient_list=[user.email],
                        fail_silently=False,
                    )
                except Exception as mail_err:
                    logger.error(f"Email delivery error during admin signup for {user.email}: {mail_err}")
                    raise RuntimeError(f"Unable to send verification email: {str(mail_err)}")

        except RuntimeError as rt_err:
            # Transaction rolled back cleanly
            return Response(
                {"detail": "Unable to send verification email. Please check server email setup or try again later."},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Admin signup exception: {e}")
            return Response(
                {"detail": f"Signup failed: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response({"success": True, "message": "Signup successful. OTP sent to email."})


class AdminVerifySignupOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        email = request.data.get('email', '').strip()
        otp = request.data.get('otp', '').strip()

        if not email or not otp:
            return Response({"detail": "Email and OTP are required."}, status=status.HTTP_400_BAD_REQUEST)

        users = User.objects.filter(Q(email__iexact=email) | Q(username__iexact=email))
        if not users.exists():
            return Response({"detail": "Invalid email."}, status=status.HTTP_400_BAD_REQUEST)
        
        user = users.first()

        # Check if already active
        if user.is_active:
            return Response({"detail": "User is already active. Please log in."}, status=status.HTTP_400_BAD_REQUEST)

        # Find latest active OTP
        otp_record = AdminOTP.objects.filter(
            user=user,
            is_used=False,
            expires_at__gte=timezone.now(),
            attempt_count__lt=3
        ).order_by('-created_at').first()

        if not otp_record or not otp_record.check_otp(otp):
            if otp_record:
                otp_record.attempt_count += 1
                otp_record.save()
            return Response({"detail": "Invalid or expired OTP."}, status=status.HTTP_400_BAD_REQUEST)

        # OTP is valid, activate user
        from django.db import transaction

        business_code = request.data.get('business_code', '').strip()
        from .models import Tenant
        if business_code:
            if Tenant.objects.filter(business_code__iexact=business_code).exists():
                return Response({"detail": "Business Code is already taken."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                user.is_active = True
                user.save()

                # Create Tenant
                from .models import OwnerSettings
                tenant_name = f"{user.first_name} {user.last_name}".strip() + "'s Business"
                if business_code:
                    tenant = Tenant.objects.create(admin_user=user, name=tenant_name, business_code=business_code)
                else:
                    tenant = Tenant.objects.create(admin_user=user, name=tenant_name)
                
                # Link UserProfile to Tenant
                user.profile.tenant = tenant
                user.profile.save()

                # Initialize OwnerSettings
                OwnerSettings.objects.create(
                    tenant=tenant,
                    owner_name=user.get_full_name(),
                    email=user.email,
                    business_name=tenant_name
                )

                # Mark OTP as used
                otp_record.is_used = True
                otp_record.save()
                AdminOTP.objects.filter(user=user, is_used=False).update(is_used=True)

            return Response({"success": True, "message": "Account verified and created successfully. Please log in."})
        except Exception as e:
            return Response({"detail": f"Database transaction failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ResendSignupOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        email = request.data.get('email', '').strip()
        if not email:
            return Response({"detail": "Email is required."}, status=status.HTTP_400_BAD_REQUEST)

        users = User.objects.filter(Q(email__iexact=email) | Q(username__iexact=email))
        if not users.exists():
            return Response({"detail": "Invalid email."}, status=status.HTTP_400_BAD_REQUEST)
        
        user = users.first()
        if user.is_active:
            return Response({"detail": "User is already active. Please log in."}, status=status.HTTP_400_BAD_REQUEST)

        recent_otp = AdminOTP.objects.filter(
            user=user, 
            created_at__gte=timezone.now() - timedelta(minutes=1)
        ).first()
        if recent_otp:
            return Response({"detail": "Please wait a minute before requesting another OTP."}, status=status.HTTP_429_TOO_MANY_REQUESTS)

        import logging
        from django.conf import settings
        from django.db import transaction
        logger = logging.getLogger(__name__)

        try:
            with transaction.atomic():
                raw_otp = ''.join(random.choices(string.digits, k=6))
                otp_record = AdminOTP(
                    user=user,
                    expires_at=timezone.now() + timedelta(minutes=5)
                )
                otp_record.set_otp(raw_otp)
                otp_record.save()

                email_body = (
                    f"Hello,\n\n"
                    f"Your verification code for Artisan Brew is:\n\n"
                    f"{raw_otp}\n\n"
                    f"This code will expire in 5 minutes.\n\n"
                    f"If you did not request this registration, please ignore this email."
                )
                try:
                    send_mail(
                        subject='Your Admin Registration OTP',
                        message=email_body,
                        from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', None),
                        recipient_list=[user.email],
                        fail_silently=False,
                    )
                except Exception as mail_err:
                    logger.error(f"Resend OTP email error for {user.email}: {mail_err}")
                    raise RuntimeError(f"Unable to send verification email: {str(mail_err)}")

        except RuntimeError as rt_err:
            return Response(
                {"detail": "Unable to send verification email. Please check server email setup or try again later."},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response({"detail": f"Failed to resend OTP: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

        return Response({"success": True, "message": "OTP sent to email."})



class ForgotBusinessCodeOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        email = request.data.get('email', '').strip()
        if not email:
            return Response({"detail": "Email is required."}, status=status.HTTP_400_BAD_REQUEST)

        users = User.objects.filter(Q(email__iexact=email) | Q(username__iexact=email))
        admin_user = None
        for u in users:
            if not u.is_active:
                continue
            if u.is_superuser:
                admin_user = u
                break
            if hasattr(u, 'profile') and u.profile.role in ['ADMIN', 'MANAGER']:
                admin_user = u
                break

        if not admin_user:
            return Response({"detail": "This email is not registered as an admin."}, status=status.HTTP_400_BAD_REQUEST)

        from .models import Tenant
        tenant = Tenant.objects.filter(admin_user=admin_user).first()
        if not tenant:
            return Response({"detail": "No business found for this account."}, status=status.HTTP_400_BAD_REQUEST)

        # Rate limiting: max 1 OTP per minute
        recent_otp = AdminOTP.objects.filter(
            user=admin_user,
            created_at__gte=timezone.now() - timedelta(minutes=1)
        ).first()
        if recent_otp:
            return Response({"detail": "Please wait a minute before requesting another OTP."}, status=status.HTTP_429_TOO_MANY_REQUESTS)

        # Generate OTP
        raw_otp = ''.join(random.choices(string.digits, k=6))
        otp_record = AdminOTP(
            user=admin_user,
            expires_at=timezone.now() + timedelta(minutes=5)
        )
        otp_record.set_otp(raw_otp)
        otp_record.save()
        
        try:
            email_body = (
                f"Hello,\n\n"
                f"Your verification code for Business Code recovery is:\n\n"
                f"{raw_otp}\n\n"
                f"This code will expire in 5 minutes.\n\n"
                f"If you did not request this, please ignore this email."
            )
            send_mail(
                subject='Your Business Code Recovery OTP',
                message=email_body,
                from_email=None,
                recipient_list=[admin_user.email],
                fail_silently=False,
            )
        except Exception as e:
            from django.conf import settings
            if settings.DEBUG:
                print(f"[DEBUG ONLY] Email delivery error: {e}")
            return Response({"detail": "Unable to send verification email. Please try again."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({"success": True, "message": "Verification code sent to your email."})


class VerifyBusinessCodeOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        email = request.data.get('email', '').strip()
        otp = request.data.get('otp', '').strip()

        if not email or not otp:
            return Response({"detail": "Email and OTP are required."}, status=status.HTTP_400_BAD_REQUEST)

        users = User.objects.filter(Q(email__iexact=email) | Q(username__iexact=email))
        admin_user = None
        for u in users:
            if not u.is_active:
                continue
            if u.is_superuser:
                admin_user = u
                break
            if hasattr(u, 'profile') and u.profile.role in ['ADMIN', 'MANAGER']:
                admin_user = u
                break

        if not admin_user:
            return Response({"detail": "This email is not registered as an admin."}, status=status.HTTP_400_BAD_REQUEST)

        otp_record = AdminOTP.objects.filter(
            user=admin_user,
            is_used=False,
            expires_at__gte=timezone.now(),
            attempt_count__lt=3
        ).order_by('-created_at').first()

        if not otp_record or not otp_record.check_otp(otp):
            if otp_record:
                otp_record.attempt_count += 1
                otp_record.save()
            return Response({"detail": "Invalid or expired OTP."}, status=status.HTTP_400_BAD_REQUEST)

        # Mark current OTP as used and invalidate all remaining active OTPs
        otp_record.is_used = True
        otp_record.save()
        AdminOTP.objects.filter(user=admin_user, is_used=False).update(is_used=True)

        from .models import Tenant
        tenant = Tenant.objects.filter(admin_user=admin_user).first()
        if not tenant:
            return Response({"detail": "No business found for this account."}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            "success": True,
            "message": "OTP verified successfully.",
            "business_code": tenant.business_code
        }, status=status.HTTP_200_OK)


class ResendBusinessCodeOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        email = request.data.get('email', '').strip()
        if not email:
            return Response({"detail": "Email is required."}, status=status.HTTP_400_BAD_REQUEST)

        users = User.objects.filter(Q(email__iexact=email) | Q(username__iexact=email))
        admin_user = None
        for u in users:
            if not u.is_active:
                continue
            if u.is_superuser:
                admin_user = u
                break
            if hasattr(u, 'profile') and u.profile.role in ['ADMIN', 'MANAGER']:
                admin_user = u
                break

        if not admin_user:
            return Response({"detail": "This email is not registered as an admin."}, status=status.HTTP_400_BAD_REQUEST)

        recent_otp = AdminOTP.objects.filter(
            user=admin_user,
            created_at__gte=timezone.now() - timedelta(minutes=1)
        ).first()
        if recent_otp:
            return Response({"detail": "Please wait a minute before requesting another OTP."}, status=status.HTTP_429_TOO_MANY_REQUESTS)

        # Invalidate any previous active OTPs so OLD OTP no longer works
        AdminOTP.objects.filter(user=admin_user, is_used=False).update(is_used=True)

        # Generate NEW OTP
        raw_otp = ''.join(random.choices(string.digits, k=6))
        otp_record = AdminOTP(
            user=admin_user,
            expires_at=timezone.now() + timedelta(minutes=5)
        )
        otp_record.set_otp(raw_otp)
        otp_record.save()

        try:
            email_body = (
                f"Hello,\n\n"
                f"Your new verification code for Business Code recovery is:\n\n"
                f"{raw_otp}\n\n"
                f"This code will expire in 5 minutes.\n\n"
                f"If you did not request this, please ignore this email."
            )
            send_mail(
                subject='Your Business Code Recovery OTP',
                message=email_body,
                from_email=None,
                recipient_list=[admin_user.email],
                fail_silently=False,
            )
        except Exception as e:
            from django.conf import settings
            if settings.DEBUG:
                print(f"[DEBUG ONLY] Email delivery error: {e}")
            return Response({"detail": "Unable to send verification email. Please try again."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({"success": True, "message": "New verification code sent to your email."})


class RegenerateBusinessCodeView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        email = request.data.get('email', '').strip()
        otp = request.data.get('otp', '').strip()

        if not email or not otp:
            return Response({"detail": "Email and OTP are required."}, status=status.HTTP_400_BAD_REQUEST)

        users = User.objects.filter(Q(email__iexact=email) | Q(username__iexact=email))
        if not users.exists():
            return Response({"detail": "Invalid email."}, status=status.HTTP_400_BAD_REQUEST)
        
        user = users.first()

        otp_record = AdminOTP.objects.filter(
            user=user,
            is_used=False,
            expires_at__gte=timezone.now(),
            attempt_count__lt=3
        ).order_by('-created_at').first()

        if not otp_record or not otp_record.check_otp(otp):
            if otp_record:
                otp_record.attempt_count += 1
                otp_record.save()
            return Response({"detail": "Invalid or expired OTP."}, status=status.HTTP_400_BAD_REQUEST)

        # OTP valid
        from .models import Tenant, generate_business_code
        tenant = Tenant.objects.filter(admin_user=user).first()
        if not tenant:
            return Response({"detail": "No business found for this account."}, status=status.HTTP_400_BAD_REQUEST)
        
        new_code = generate_business_code()
        tenant.business_code = new_code
        tenant.save()
        
        otp_record.is_used = True
        otp_record.save()

        return Response({
            "detail": "Business Code regenerated successfully.",
            "business_code": new_code
        }, status=status.HTTP_200_OK)
