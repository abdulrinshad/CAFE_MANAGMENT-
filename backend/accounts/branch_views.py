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

import random
import string
from datetime import timedelta
from django.contrib.auth.hashers import make_password
from django.core.mail import send_mail

from accounts.models import (
    Branch, BranchManager, Waiter, Cashier, KitchenStaff, POSTerminal, BranchSettings, AdminOTP
)
from accounts.views import get_authenticated_manager_email
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
        terminal = None
        if role_name == "CASHIER":
            terminal = POSTerminal.objects.filter(assigned_cashier=member).first()
        return {
            "id":          f"{role_name.lower()}_{member.id}",
            "db_id":       member.id,
            "name":        member.name,
            "employee_id": member.employee_id or "",
            "email":       getattr(member, 'email', f"{member.employee_id.lower()}@artisanbrew.internal" if member.employee_id else ''),
            "phone":       getattr(member, 'phone', ''),
            "role":        "Waiter" if role_name == "WAITER" else ("Cashier" if role_name == "CASHIER" else "Kitchen Staff"),
            "role_key":    role_name.lower(),
            "branch":      member.branch_id,
            "branch_name": member.branch.name if member.branch else "",
            "section":     getattr(member, 'section', "") or "",
            "is_active":   member.is_active,
            "status":      "active" if member.is_active else "inactive",
            "joinedDate":  member.created_at.strftime("%Y-%m-%d") if hasattr(member, 'created_at') and member.created_at else "",
            "terminal_id": terminal.id if terminal else None,
            "terminal_name": terminal.name if terminal else "None",
        }
    def get(self, request, pk=None, *args, **kwargs):
        branch = get_manager_branch(request)
        if not branch:
            return Response({"detail": "Access Denied"}, status=status.HTTP_403_FORBIDDEN)

        if pk:
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
                return Response(self._serialize_member(member, "KITCHEN"))
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)

        # List all staff for this branch from real DB
        waiters  = Waiter.objects.select_related('branch').filter(branch=branch).order_by('-created_at')
        cashiers = Cashier.objects.select_related('branch').filter(branch=branch).order_by('-created_at')
        kitchen  = KitchenStaff.objects.select_related('branch').filter(branch=branch).order_by('-created_at')

        staff_list = (
            [self._serialize_member(w, "WAITER")  for w in waiters]  +
            [self._serialize_member(c, "CASHIER") for c in cashiers] +
            [self._serialize_member(k, "KITCHEN") for k in kitchen]
        )
        return Response(staff_list)

    def _validate_post(self, data, branch):
        errors = {}
        name = str(data.get('name') or '').strip()
        employee_id = str(data.get('employee_id') or '').strip()
        pin = str(data.get('pin') or '').strip()
        confirm_pin = str(data.get('confirm_pin') or '').strip()

        if not name:
            errors['name'] = "Full Name is required."
        elif len(name) > 120:
            errors['name'] = "Full Name is too long."

        if not employee_id:
            errors['employee_id'] = "Employee ID is required."
        else:
            w_exists = Waiter.objects.filter(employee_id=employee_id, branch=branch).exists()
            c_exists = Cashier.objects.filter(employee_id=employee_id, branch=branch).exists()
            k_exists = KitchenStaff.objects.filter(employee_id=employee_id, branch=branch).exists()
            if w_exists or c_exists or k_exists:
                errors['employee_id'] = "Employee ID already exists in this branch."

        if not pin:
            errors['pin'] = "4-Digit PIN is required for new employees."
        elif not pin.isdigit() or len(pin) != 4:
            errors['pin'] = "PIN must be exactly 4 digits and numeric."
        elif pin != confirm_pin:
            errors['confirm_pin'] = "PINs do not match."

        return errors, name, employee_id, pin

    def post(self, request, pk=None, *args, **kwargs):
        if pk:
            return self.patch(request, pk, *args, **kwargs)
        """
        Create a Waiter, Cashier, or Kitchen staff.
        Security: branch is ALWAYS forced from the manager's JWT.
        The client cannot choose another branch.
        """
        branch = get_manager_branch(request)
        if not branch:
            return Response({"detail": "Access Denied"}, status=status.HTTP_403_FORBIDDEN)

        role     = (request.data.get('role') or 'waiter').lower().strip()
        if role in ('pos', 'cashier'): role = 'cashier'
        elif role in ('kitchen staff', 'kitchen_staff', 'kitchen'): role = 'kitchen'

        section  = (request.data.get('section') or '').strip()
        is_active_raw = request.data.get('is_active', True)
        is_active = is_active_raw if isinstance(is_active_raw, bool) else str(is_active_raw).lower() not in ('false', '0', 'inactive')

        errors, name, employee_id, pin = self._validate_post(request.data, branch)

        if role not in ('waiter', 'cashier', 'kitchen'):
            errors['role'] = "Role must be 'waiter', 'cashier', or 'kitchen'."

        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)

        # Force branch — never trust client-supplied branch
        if role == 'waiter':
            data = {
                'name':        name,
                'employee_id': employee_id,
                'branch':      branch.id,
                'section':     section or 'Main Section',
                'is_active':   is_active,
                'pin':         pin,
                'confirm_pin': pin,
            }
            serializer = WaiterSerializer(data=data)
            serializer.is_valid(raise_exception=True)
            member = serializer.save(tenant=branch.tenant)
            return Response(self._serialize_member(member, "WAITER"), status=status.HTTP_201_CREATED)

        elif role == 'cashier':
            data = {
                'name':        name,
                'employee_id': employee_id,
                'branch':      branch.id,
                'is_active':   is_active,
                'pin':         pin,
                'confirm_pin': pin,
            }
            serializer = CashierSerializer(data=data)
            serializer.is_valid(raise_exception=True)
            member = serializer.save(tenant=branch.tenant)

            # POS Terminal Assignment validation and assignment
            terminal_id = request.data.get('terminal_id')
            if terminal_id:
                try:
                    terminal = POSTerminal.objects.get(pk=terminal_id, branch=branch)
                    if terminal.assigned_cashier and terminal.assigned_cashier.is_active:
                        return Response({"detail": f"Terminal '{terminal.name}' is already assigned to an active cashier."}, status=status.HTTP_400_BAD_REQUEST)
                    POSTerminal.objects.filter(assigned_cashier=member).update(assigned_cashier=None)
                    terminal.assigned_cashier = member
                    terminal.save(update_fields=['assigned_cashier'])
                except (POSTerminal.DoesNotExist, ValueError, TypeError):
                    return Response({"detail": "Invalid POS Terminal ID or terminal belongs to another branch."}, status=status.HTTP_400_BAD_REQUEST)

            return Response(self._serialize_member(member, "CASHIER"), status=status.HTTP_201_CREATED)

        elif role == 'kitchen':
            data = {
                'name':        name,
                'employee_id': employee_id,
                'branch':      branch.id,
                'is_active':   is_active,
                'pin':         pin,
                'confirm_pin': pin,
            }
            serializer = KitchenStaffSerializer(data=data)
            serializer.is_valid(raise_exception=True)
            member = serializer.save(tenant=branch.tenant)
            return Response(self._serialize_member(member, "KITCHEN"), status=status.HTTP_201_CREATED)

        return Response({"detail": f"Unsupported role: {role}"}, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, pk, *args, **kwargs):
        branch = get_manager_branch(request)
        if not branch:
            return Response({"detail": "Access Denied"}, status=status.HTTP_403_FORBIDDEN)

        role_type, obj_id_str = pk.split('_', 1)
        obj_id = int(obj_id_str)

        # Handle status toggle shortcut  /branch/staff/<pk>/status/
        if request.path.endswith('/status/'):
            status_val = request.data.get('status')
            is_active  = status_val in ('active', 'ACTIVE', True) if status_val is not None else True
            if isinstance(status_val, str):
                is_active = status_val.lower() in ('active',)
            if role_type == 'waiter':
                member = get_object_or_404(Waiter, pk=obj_id, branch=branch)
                member.is_active = is_active; member.save(update_fields=['is_active'])
                return Response(self._serialize_member(member, "WAITER"))
            elif role_type == 'cashier':
                member = get_object_or_404(Cashier, pk=obj_id, branch=branch)
                member.is_active = is_active; member.save(update_fields=['is_active'])
                if not is_active:
                    POSTerminal.objects.filter(assigned_cashier=member).update(assigned_cashier=None)
                return Response(self._serialize_member(member, "CASHIER"))
            elif role_type == 'kitchen':
                member = get_object_or_404(KitchenStaff, pk=obj_id, branch=branch)
                member.is_active = is_active; member.save(update_fields=['is_active'])
                return Response(self._serialize_member(member, "KITCHEN"))

        # Handle verify_pin_change shortcut  /branch/staff/<pk>/verify_pin_change/
        if request.path.endswith('/verify_pin_change/'):
            otp = request.data.get('otp', '').strip()
            if not otp:
                return Response({"detail": "OTP is required."}, status=status.HTTP_400_BAD_REQUEST)

            if role_type == 'waiter':
                member = get_object_or_404(Waiter, pk=obj_id, branch=branch)
                otp_kw = {'waiter': member}
                role_title = 'Waiter'
            elif role_type == 'cashier':
                member = get_object_or_404(Cashier, pk=obj_id, branch=branch)
                otp_kw = {'cashier': member}
                role_title = 'Cashier'
            else:
                return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)

            otp_record = AdminOTP.objects.filter(
                user=request.user,
                is_used=False,
                expires_at__gte=timezone.now(),
                attempt_count__lt=3,
                **otp_kw
            ).order_by('-created_at').first()

            if not otp_record or not otp_record.check_otp(otp):
                if otp_record:
                    otp_record.attempt_count += 1
                    otp_record.save()
                return Response({"detail": "Invalid verification code."}, status=status.HTTP_400_BAD_REQUEST)

            member.pin_hash = otp_record.pending_pin_hash
            member.save(update_fields=['pin_hash', 'updated_at'])

            otp_record.is_used = True
            otp_record.save()
            AdminOTP.objects.filter(user=request.user, is_used=False, **otp_kw).update(is_used=True)

            return Response({"success": True, "message": f"{role_title} PIN has been updated successfully."})

        # Handle resend_pin_change_otp shortcut  /branch/staff/<pk>/resend_pin_change_otp/
        if request.path.endswith('/resend_pin_change_otp/'):
            if role_type == 'waiter':
                member = get_object_or_404(Waiter, pk=obj_id, branch=branch)
                otp_kw = {'waiter': member}
                role_title = 'Waiter'
            elif role_type == 'cashier':
                member = get_object_or_404(Cashier, pk=obj_id, branch=branch)
                otp_kw = {'cashier': member}
                role_title = 'Cashier'
            else:
                return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)

            mgr_obj, manager_email = get_authenticated_manager_email(request)
            if not manager_email:
                return Response({"detail": "Branch Manager email address is missing."}, status=status.HTTP_400_BAD_REQUEST)

            recent_otp = AdminOTP.objects.filter(
                user=request.user,
                created_at__gte=timezone.now() - timedelta(minutes=1),
                **otp_kw
            ).first()
            if recent_otp:
                return Response({"detail": "Please wait a minute before requesting another OTP."}, status=status.HTTP_429_TOO_MANY_REQUESTS)

            latest_otp = AdminOTP.objects.filter(user=request.user, **otp_kw).order_by('-created_at').first()
            if not latest_otp or not latest_otp.pending_pin_hash:
                return Response({"detail": "No active PIN change request found."}, status=status.HTTP_400_BAD_REQUEST)

            AdminOTP.objects.filter(user=request.user, is_used=False, **otp_kw).update(is_used=True)

            raw_otp = ''.join(random.choices(string.digits, k=6))
            new_otp_record = AdminOTP(
                user=request.user,
                pending_pin_hash=latest_otp.pending_pin_hash,
                expires_at=timezone.now() + timedelta(minutes=5),
                **otp_kw
            )
            new_otp_record.set_otp(raw_otp)
            new_otp_record.save()

            try:
                email_body = (
                    f"Hello,\n\n"
                    f"Your new verification code for changing the PIN of {role_title} '{member.name}' is:\n\n"
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

        # Normal edit (name, employee_id, section, pin, is_active)
        pin         = (request.data.get('pin') or '').strip()
        confirm_pin = (request.data.get('confirm_pin') or '').strip()
        name        = (request.data.get('name') or '').strip()
        employee_id = (request.data.get('employee_id') or '').strip()
        section     = request.data.get('section')  # optional

        # Validate PIN if provided
        if pin:
            if not pin.isdigit() or len(pin) != 4:
                return Response({"pin": "PIN must be exactly 4 numeric digits."}, status=status.HTTP_400_BAD_REQUEST)
            if pin != confirm_pin:
                return Response({"confirm_pin": "PINs do not match."}, status=status.HTTP_400_BAD_REQUEST)

            # Check if new PIN is the same as existing PIN
            if role_type == 'waiter':
                existing_member = Waiter.objects.filter(pk=obj_id, branch=branch).first()
            elif role_type == 'cashier':
                existing_member = Cashier.objects.filter(pk=obj_id, branch=branch).first()
            elif role_type == 'kitchen':
                existing_member = KitchenStaff.objects.filter(pk=obj_id, branch=branch).first()
            else:
                existing_member = None

            if existing_member and existing_member.check_pin(pin):
                return Response(
                    {"detail": "New PIN cannot be the same as your current PIN. Please choose a different PIN."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Validate name if provided
        if name is not None and not name:
            return Response({"name": "Name cannot be empty."}, status=status.HTTP_400_BAD_REQUEST)

        is_active_raw = request.data.get('is_active')
        is_active = None
        if is_active_raw is not None:
            is_active = is_active_raw if isinstance(is_active_raw, bool) else str(is_active_raw).lower() not in ('false', '0', 'inactive')

        requires_otp = False
        if pin and role_type in ('waiter', 'cashier'):
            requires_otp = True

        def _apply_fields(member, role_key):
            update_fields = []
            if employee_id:
                other_w = Waiter.objects.filter(employee_id=employee_id, branch=branch).exclude(pk=obj_id if role_key=='waiter' else -1)
                other_c = Cashier.objects.filter(employee_id=employee_id, branch=branch).exclude(pk=obj_id if role_key=='cashier' else -1)
                other_k = KitchenStaff.objects.filter(employee_id=employee_id, branch=branch).exclude(pk=obj_id if role_key=='kitchen' else -1)
                if other_w.exists() or other_c.exists() or other_k.exists():
                    return None, "Employee ID already exists in this branch."
                member.employee_id = employee_id
                update_fields.append('employee_id')
            if name:
                member.name = name
                update_fields.append('name')
            if section is not None and hasattr(member, 'section'):
                member.section = section
                update_fields.append('section')
            if is_active is not None:
                member.is_active = is_active
                update_fields.append('is_active')
                if not is_active:
                    POSTerminal.objects.filter(assigned_cashier=member).update(assigned_cashier=None)
            if pin and not requires_otp:
                member.set_pin(pin)
                update_fields.append('pin_hash')
            if update_fields:
                member.save(update_fields=update_fields)
            return member, None

        if role_type == 'waiter':
            member = get_object_or_404(Waiter, pk=obj_id, branch=branch)
            member, err = _apply_fields(member, 'waiter')
            if err:
                return Response({"employee_id": err}, status=status.HTTP_400_BAD_REQUEST)

            if requires_otp:
                mgr_obj, manager_email = get_authenticated_manager_email(request)
                if not manager_email:
                    return Response(
                        {"detail": "Branch Manager email is not configured. Please add an email address before changing staff PINs."},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                recent_otp = AdminOTP.objects.filter(
                    user=request.user,
                    waiter=member,
                    created_at__gte=timezone.now() - timedelta(minutes=1)
                ).first()
                if recent_otp:
                    return Response(
                        {"detail": "Please wait a minute before requesting another PIN change verification code."},
                        status=status.HTTP_429_TOO_MANY_REQUESTS
                    )

                AdminOTP.objects.filter(user=request.user, waiter=member, is_used=False).update(is_used=True)

                raw_otp = ''.join(random.choices(string.digits, k=6))
                pending_hash = make_password(pin)
                otp_record = AdminOTP(
                    user=request.user,
                    waiter=member,
                    pending_pin_hash=pending_hash,
                    expires_at=timezone.now() + timedelta(minutes=5)
                )
                otp_record.set_otp(raw_otp)
                otp_record.save()

                try:
                    email_body = (
                        f"Hello,\n\n"
                        f"A request was made to change the PIN for Waiter '{member.name}' in your branch.\n\n"
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
                    "staff_id": pk,
                    "email": manager_email,
                    "message": "Verification code sent to your email."
                }, status=status.HTTP_200_OK)

            return Response(self._serialize_member(member, "WAITER"))

        elif role_type == 'cashier':
            member = get_object_or_404(Cashier, pk=obj_id, branch=branch)
            member, err = _apply_fields(member, 'cashier')
            if err:
                return Response({"employee_id": err}, status=status.HTTP_400_BAD_REQUEST)

            # Handle terminal_id update if passed in payload
            if 'terminal_id' in request.data:
                terminal_id = request.data.get('terminal_id')
                POSTerminal.objects.filter(assigned_cashier=member).update(assigned_cashier=None)
                if terminal_id not in [None, '', 'null', 'None']:
                    try:
                        terminal = POSTerminal.objects.get(pk=terminal_id, branch=branch)
                        if terminal.assigned_cashier and terminal.assigned_cashier != member and terminal.assigned_cashier.is_active:
                            return Response({"detail": f"Terminal '{terminal.name}' is already assigned to another active cashier."}, status=status.HTTP_400_BAD_REQUEST)
                        terminal.assigned_cashier = member
                        terminal.save(update_fields=['assigned_cashier'])
                    except (POSTerminal.DoesNotExist, ValueError, TypeError):
                        return Response({"detail": "Invalid POS Terminal ID or terminal belongs to another branch."}, status=status.HTTP_400_BAD_REQUEST)

            if requires_otp:
                mgr_obj, manager_email = get_authenticated_manager_email(request)
                if not manager_email:
                    return Response(
                        {"detail": "Branch Manager email is not configured. Please add an email address before changing staff PINs."},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                recent_otp = AdminOTP.objects.filter(
                    user=request.user,
                    cashier=member,
                    created_at__gte=timezone.now() - timedelta(minutes=1)
                ).first()
                if recent_otp:
                    return Response(
                        {"detail": "Please wait a minute before requesting another PIN change verification code."},
                        status=status.HTTP_429_TOO_MANY_REQUESTS
                    )

                AdminOTP.objects.filter(user=request.user, cashier=member, is_used=False).update(is_used=True)

                raw_otp = ''.join(random.choices(string.digits, k=6))
                pending_hash = make_password(pin)
                otp_record = AdminOTP(
                    user=request.user,
                    cashier=member,
                    pending_pin_hash=pending_hash,
                    expires_at=timezone.now() + timedelta(minutes=5)
                )
                otp_record.set_otp(raw_otp)
                otp_record.save()

                try:
                    email_body = (
                        f"Hello,\n\n"
                        f"A request was made to change the PIN for Cashier '{member.name}' in your branch.\n\n"
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
                    "staff_id": pk,
                    "email": manager_email,
                    "message": "Verification code sent to your email."
                }, status=status.HTTP_200_OK)

            return Response(self._serialize_member(member, "CASHIER"))

        elif role_type == 'kitchen':
            member = get_object_or_404(KitchenStaff, pk=obj_id, branch=branch)
            member, err = _apply_fields(member, 'kitchen')
            if err:
                return Response({"employee_id": err}, status=status.HTTP_400_BAD_REQUEST)
            return Response(self._serialize_member(member, "KITCHEN"))

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
        branch = get_manager_branch(request)
        if not branch:
            return Response({"detail": "Access Denied"}, status=status.HTTP_403_FORBIDDEN)
            
        products = Product.objects.filter(branch=branch, tenant=branch.tenant)
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
        branch = get_manager_branch(request)
        p = get_object_or_404(Product, pk=pk, branch=branch, tenant=branch.tenant)
        p.available = not p.available
        p.save()
        return Response({"id": p.id, "available": p.available, "branchStatus": p.available})

    def post(self, request, *args, **kwargs):
        branch = get_manager_branch(request)
        if not branch:
            return Response({"detail": "Access Denied"}, status=status.HTTP_403_FORBIDDEN)

        name = request.data.get('name')
        price = request.data.get('price')
        category_id = request.data.get('category')
        
        if not name or not price or not category_id:
            return Response({"detail": "Name, price, and category are required."}, status=status.HTTP_400_BAD_REQUEST)
            
        from menu.models import Category
        category = get_object_or_404(Category, pk=category_id, tenant=branch.tenant)
        
        image_path = None
        icon = category.icon.lower()
        if icon == 'coffee_tea' or 'coffee' in category.name.lower() or 'tea' in category.name.lower():
            image_path = 'products/coffee_placeholder.jpg'
        elif icon == 'pastries' or 'pastry' in category.name.lower():
            image_path = 'products/pastry_placeholder.jpg'
        elif icon == 'juice' or 'juice' in category.name.lower():
            image_path = 'products/juice_placeholder.jpg'
        elif icon in ['meals', 'dinner', 'breakfast'] or 'meal' in category.name.lower():
            image_path = 'products/meals_placeholder.jpg'
        elif icon == 'snacks' or 'snack' in category.name.lower():
            image_path = 'products/snacks_placeholder.jpg'
        elif icon == 'desserts' or 'dessert' in category.name.lower():
            image_path = 'products/dessert_placeholder.jpg'
        else:
            image_path = 'products/default_placeholder.jpg'
            
        product = Product.objects.create(
            name=name,
            price=price,
            category=category,
            branch=branch,
            tenant=branch.tenant,
            available=True,
            image=image_path
        )
        
        return Response({
            "id": product.id,
            "name": product.name,
            "category": product.category.name,
            "price": float(product.price),
            "basePrice": float(product.price),
            "available": product.available,
            "globalStatus": "Available",
            "branchStatus": product.available
        }, status=status.HTTP_201_CREATED)

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
        settings = BranchSettings.load_for_branch(branch)
        return Response({
            "id": branch.id,
            "name": branch.name,
            "code": branch.code,
            "address": branch.address,
            "phone": branch.phone,
            "active": branch.active,
            "email": settings.manager_email,
            "openingTime": settings.opening_time,
            "closingTime": settings.closing_time,
            "taxGST": float(settings.tax_gst),
            "serviceCharge": float(settings.service_charge),
            "alert_customer_assistance": settings.alert_customer_assistance,
            "alert_bill_requests": settings.alert_bill_requests,
            "alert_low_stock": settings.alert_low_stock,
            "currency": "INR"
        })

    def patch(self, request, *args, **kwargs):
        branch = get_manager_branch(request)
        if not branch:
            return Response({"detail": "Access Denied"}, status=status.HTTP_403_FORBIDDEN)

        settings = BranchSettings.load_for_branch(branch)

        address = request.data.get('address')
        phone = request.data.get('phone')
        email = request.data.get('email')
        opening_time = request.data.get('openingTime')
        closing_time = request.data.get('closingTime')
        tax_gst = request.data.get('taxGST')
        service_charge = request.data.get('serviceCharge')
        
        alert_customer_assistance = request.data.get('alert_customer_assistance')
        alert_bill_requests = request.data.get('alert_bill_requests')
        alert_low_stock = request.data.get('alert_low_stock')

        if address is not None:
            branch.address = address
        if phone is not None:
            branch.phone = phone
        branch.save()

        if email is not None:
            settings.manager_email = email
        if opening_time is not None:
            settings.opening_time = opening_time
        if closing_time is not None:
            settings.closing_time = closing_time
        if tax_gst is not None:
            settings.tax_gst = Decimal(str(tax_gst))
        if service_charge is not None:
            settings.service_charge = Decimal(str(service_charge))
        
        if alert_customer_assistance is not None:
            settings.alert_customer_assistance = bool(alert_customer_assistance)
        if alert_bill_requests is not None:
            settings.alert_bill_requests = bool(alert_bill_requests)
        if alert_low_stock is not None:
            settings.alert_low_stock = bool(alert_low_stock)
        
        settings.save()

        return Response({
            "id": branch.id,
            "name": branch.name,
            "code": branch.code,
            "address": branch.address,
            "phone": branch.phone,
            "active": branch.active,
            "email": settings.manager_email,
            "openingTime": settings.opening_time,
            "closingTime": settings.closing_time,
            "taxGST": float(settings.tax_gst),
            "serviceCharge": float(settings.service_charge),
            "alert_customer_assistance": settings.alert_customer_assistance,
            "alert_bill_requests": settings.alert_bill_requests,
            "alert_low_stock": settings.alert_low_stock,
            "currency": "INR"
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
