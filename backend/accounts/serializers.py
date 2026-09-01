from rest_framework import serializers
from django.contrib.auth.models import User
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from .models import Waiter, Branch, BranchManager, Cashier, KitchenStaff, POSTerminal


# ── Branch Serializers ─────────────────────────────────────────────────────────

class BranchManagerInlineSerializer(serializers.ModelSerializer):
    """Lightweight manager info embedded inside Branch responses."""
    class Meta:
        model = BranchManager
        fields = ('id', 'name', 'manager_id', 'email', 'is_active')


class BranchSerializer(serializers.ModelSerializer):
    """Full Branch serializer with nested manager info (read-only)."""
    manager = BranchManagerInlineSerializer(read_only=True)

    class Meta:
        model = Branch
        fields = ('id', 'name', 'code', 'address', 'phone', 'active', 'created_at', 'updated_at', 'manager')
        read_only_fields = ('id', 'created_at', 'updated_at')


class BranchWriteSerializer(serializers.ModelSerializer):
    """Serializer used only for create / update operations on Branch."""
    create_manager = serializers.BooleanField(write_only=True, default=False)
    manager_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    manager_id = serializers.CharField(write_only=True, required=False, allow_blank=True)
    manager_email = serializers.EmailField(write_only=True, required=False, allow_blank=True)
    manager_pin = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = Branch
        fields = ('name', 'code', 'address', 'phone', 'active', 'create_manager', 'manager_name', 'manager_id', 'manager_email', 'manager_pin')

    def validate_code(self, value):
        from .utils import get_user_tenant
        request = self.context.get('request')
        if not request:
            return value
        tenant = get_user_tenant(request)
        if not tenant:
            return value

        qs = Branch.objects.filter(code=value, tenant=tenant)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("A branch with this code already exists in your business.")
        return value

    def validate(self, attrs):
        create_manager = attrs.get('create_manager', False)
        if create_manager:
            manager_name = attrs.get('manager_name')
            manager_id = attrs.get('manager_id')
            manager_email = attrs.get('manager_email')
            manager_pin = attrs.get('manager_pin')

            if not manager_name:
                raise serializers.ValidationError({"manager_name": "Manager name is required when creating a manager."})
            if not manager_id:
                raise serializers.ValidationError({"manager_id": "Manager ID is required when creating a manager."})
            if not manager_email:
                raise serializers.ValidationError({"manager_email": "Manager Email is required when creating a manager."})
            else:
                import re
                email_str = str(manager_email).strip().lower()
                if not re.match(r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$', email_str):
                    raise serializers.ValidationError({"manager_email": "Enter a valid Manager Email address."})
                attrs['manager_email'] = email_str

            if not manager_pin:
                raise serializers.ValidationError({"manager_pin": "Manager PIN is required when creating a manager."})

            from .utils import get_user_tenant
            request = self.context.get('request')
            tenant = get_user_tenant(request) if request else None
            
            qs = BranchManager.objects.filter(manager_id=manager_id)
            if tenant:
                qs = qs.filter(tenant=tenant)
                
            if qs.exists():
                raise serializers.ValidationError({"manager_id": "This Manager ID is already in use in your business."})
        return attrs

    def create(self, validated_data):
        from django.db import transaction
        create_manager = validated_data.pop('create_manager', False)
        manager_name = validated_data.pop('manager_name', None)
        manager_id = validated_data.pop('manager_id', None)
        manager_email = validated_data.pop('manager_email', None)
        manager_pin = validated_data.pop('manager_pin', None)

        with transaction.atomic():
            branch = super().create(validated_data)
            if create_manager:
                manager = BranchManager(
                    name=manager_name,
                    manager_id=manager_id,
                    email=manager_email,
                    branch=branch,
                    tenant=branch.tenant
                )
                manager.set_pin(manager_pin)
                manager.save()
            return branch


# ── BranchManager Serializers ─────────────────────────────────────────────────

class BranchManagerSerializer(serializers.ModelSerializer):
    """Full BranchManager serializer for create / update."""
    pin = serializers.CharField(write_only=True, required=False)
    is_active = serializers.BooleanField(default=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True)

    class Meta:
        model = BranchManager
        fields = (
            'id', 'name', 'manager_id', 'email', 'branch', 'branch_name',
            'is_active', 'created_at', 'updated_at', 'pin',
        )
        read_only_fields = ('id', 'created_at', 'updated_at', 'branch_name')

    def validate_email(self, value):
        if not value or not str(value).strip():
            if not self.instance:
                raise serializers.ValidationError("Manager Email is required.")
            return value
        import re
        val = str(value).strip().lower()
        if not re.match(r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$', val):
            raise serializers.ValidationError("Enter a valid Email address.")
        return val

    def validate_manager_id(self, value):
        from .utils import get_user_tenant
        request = self.context.get('request')
        tenant = get_user_tenant(request) if request else None

        qs = BranchManager.objects.filter(manager_id=value)
        if tenant:
            qs = qs.filter(tenant=tenant)
            
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("This Manager ID is already in use in your business.")
        return value

    def validate(self, attrs):
        pin = attrs.get('pin')
        if pin and self.instance and self.instance.check_pin(pin):
            raise serializers.ValidationError({"detail": "New PIN cannot be the same as your current PIN. Please choose a different PIN."})
        return attrs

    def create(self, validated_data):
        pin = validated_data.pop('pin', None)
        manager = BranchManager(**validated_data)
        if pin:
            manager.set_pin(pin)
        manager.save()
        return manager

    def update(self, instance, validated_data):
        pin = validated_data.pop('pin', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if pin:
            instance.set_pin(pin)
        instance.save()
        return instance


# ── User / Auth Serializers ───────────────────────────────────────────────────

class BranchMinimalSerializer(serializers.ModelSerializer):
    """Compact branch info used inside user tokens."""
    class Meta:
        model = Branch
        fields = ('id', 'name', 'code', 'address', 'phone', 'active')


class UserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    branch = BranchMinimalSerializer(source='profile.branch', read_only=True)
    terminal_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'role', 'branch', 'is_staff', 'is_superuser', 'terminal_name')

    def get_terminal_name(self, obj):
        if obj.username.startswith('cashier_'):
            try:
                cashier_id = int(obj.username.split('_')[1])
                from accounts.models import Cashier, POSTerminal
                cashier = Cashier.objects.filter(id=cashier_id).first()
                if cashier:
                    terminal = POSTerminal.objects.filter(assigned_cashier=cashier).first()
                    if terminal:
                        return terminal.name
            except Exception:
                pass
        return None

    def get_role(self, obj):
        if obj.username.startswith('bm_'):
            return 'branch_manager'
        if obj.username.startswith('kitchen_'):
            return 'kitchen'
        if obj.username.startswith('cashier_'):
            return 'cashier'
        if hasattr(obj, 'profile'):
            if obj.profile.role == 'MANAGER':
                return 'branch_manager'
            if obj.profile.role == 'KITCHEN':
                return 'kitchen'
            if obj.profile.role == 'CASHIER':
                return 'cashier'
            return obj.profile.role
        return 'STAFF'


class CustomTokenObtainPairSerializer(serializers.Serializer):
    email = serializers.CharField(required=True)
    password = serializers.CharField(write_only=True, required=True)

    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')

        from django.db.models import Q
        users = User.objects.filter(Q(email__iexact=email) | Q(username__iexact=email))
        if not users.exists():
            raise serializers.ValidationError("Invalid email or password.")

        if all(not u.is_active for u in users):
            raise serializers.ValidationError("Your account is inactive. Please contact an administrator.")

        from django.contrib.auth import authenticate
        authenticated_user = None

        # Authenticate users matching the email.
        # Prioritize users with ADMIN or MANAGER privileges.
        for u in users:
            if not u.is_active:
                continue
            auth_user = authenticate(username=u.username, password=password)
            if auth_user:
                role = auth_user.profile.role if hasattr(auth_user, 'profile') else 'STAFF'
                if role.upper() in ['ADMIN', 'MANAGER', 'CASHIER', 'POS', 'STAFF']:
                    authenticated_user = auth_user
                    break
                else:
                    if authenticated_user is None:
                        authenticated_user = auth_user

        if authenticated_user is None:
            raise serializers.ValidationError("Invalid email or password.")

        role = authenticated_user.profile.role if hasattr(authenticated_user, 'profile') else 'STAFF'
        if role.upper() not in ['ADMIN', 'MANAGER', 'CASHIER', 'POS', 'STAFF']:
            raise serializers.ValidationError("You do not have permission to log in.")

        refresh = RefreshToken.for_user(authenticated_user)
        
        tenant = None
        if hasattr(authenticated_user, 'tenant'):
            tenant = authenticated_user.tenant
        elif hasattr(authenticated_user, 'profile') and authenticated_user.profile.tenant:
            tenant = authenticated_user.profile.tenant
            
        if tenant:
            refresh['tenant_id'] = tenant.id
            refresh['business_code'] = tenant.business_code

        return {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': {
                'id': authenticated_user.id,
                'username': authenticated_user.username,
                'email': authenticated_user.email,
                'role': role,
                'tenant_id': tenant.id if tenant else None,
                'business_code': tenant.business_code if tenant else None,
                'is_staff': authenticated_user.is_staff,
                'is_superuser': authenticated_user.is_superuser,
            }
        }


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True)


# ── Waiter Serializers ────────────────────────────────────────────────────────

def check_employee_id_uniqueness(employee_id, branch, tenant=None, exclude_instance=None):
    if not employee_id or not branch:
        return
    branch_id = branch.id if hasattr(branch, 'id') else branch

    waiter_qs = Waiter.objects.filter(employee_id=employee_id, branch_id=branch_id)
    cashier_qs = Cashier.objects.filter(employee_id=employee_id, branch_id=branch_id)
    kitchen_qs = KitchenStaff.objects.filter(employee_id=employee_id, branch_id=branch_id)

    if tenant:
        waiter_qs = waiter_qs.filter(tenant=tenant)
        cashier_qs = cashier_qs.filter(tenant=tenant)
        kitchen_qs = kitchen_qs.filter(tenant=tenant)

    if exclude_instance:
        if isinstance(exclude_instance, Waiter):
            waiter_qs = waiter_qs.exclude(pk=exclude_instance.pk)
        elif isinstance(exclude_instance, Cashier):
            cashier_qs = cashier_qs.exclude(pk=exclude_instance.pk)
        elif isinstance(exclude_instance, KitchenStaff):
            kitchen_qs = kitchen_qs.exclude(pk=exclude_instance.pk)

    if waiter_qs.exists() or cashier_qs.exists() or kitchen_qs.exists():
        raise serializers.ValidationError({"employee_id": "Employee ID already exists in this branch."})


class WaiterSafeSerializer(serializers.ModelSerializer):
    branch_name = serializers.CharField(source='branch.name', read_only=True)

    class Meta:
        model = Waiter
        fields = ('id', 'name', 'employee_id', 'photo', 'section', 'branch', 'branch_name', 'is_active')


class WaiterSerializer(serializers.ModelSerializer):
    pin = serializers.CharField(write_only=True, required=False)
    confirm_pin = serializers.CharField(write_only=True, required=False)
    branch_name = serializers.CharField(source='branch.name', read_only=True)

    class Meta:
        model = Waiter
        fields = ('id', 'name', 'employee_id', 'photo', 'section', 'branch', 'branch_name', 'is_active', 'created_at', 'updated_at', 'pin', 'confirm_pin')

    def validate(self, attrs):
        name = attrs.get('name')
        if name is not None:
            name_str = str(name).strip()
            if not name_str:
                raise serializers.ValidationError({"name": "Full Name is required."})
            attrs['name'] = name_str

        employee_id = attrs.get('employee_id')
        if employee_id is not None:
            emp_id_str = str(employee_id).strip()
            if not emp_id_str:
                raise serializers.ValidationError({"employee_id": "Employee ID is required."})
            attrs['employee_id'] = emp_id_str

        pin = attrs.get('pin')
        confirm_pin = attrs.get('confirm_pin')

        if pin:
            if not pin.isdigit() or len(pin) != 4:
                raise serializers.ValidationError({"pin": "PIN must be exactly 4 digits and numeric."})
            if pin != confirm_pin:
                raise serializers.ValidationError({"confirm_pin": "PINs do not match."})
            if self.instance and self.instance.check_pin(pin):
                raise serializers.ValidationError({"detail": "New PIN cannot be the same as your current PIN. Please choose a different PIN."})

        request = self.context.get('request')
        from .utils import get_user_tenant, get_user_branch
        tenant = get_user_tenant(request) if request else (self.instance.tenant if self.instance else None)
        branch = attrs.get('branch') or (self.instance.branch if self.instance else (get_user_branch(request) if request else None))
        emp_id = attrs.get('employee_id') or (self.instance.employee_id if self.instance else None)

        if branch and tenant and branch.tenant_id and tenant.id and branch.tenant_id != tenant.id:
            raise serializers.ValidationError({"branch": "Invalid branch for your business."})

        if emp_id and branch:
            check_employee_id_uniqueness(emp_id, branch, tenant=tenant, exclude_instance=self.instance)

        return attrs

    def create(self, validated_data):
        pin = validated_data.pop('pin', None)
        validated_data.pop('confirm_pin', None)
        waiter = Waiter.objects.create(**validated_data)
        if pin:
            waiter.set_pin(pin)
            waiter.save()
        return waiter

    def update(self, instance, validated_data):
        pin = validated_data.pop('pin', None)
        validated_data.pop('confirm_pin', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if pin:
            instance.set_pin(pin)
        instance.save()
        return instance


# ── Cashier Serializers ───────────────────────────────────────────────────────

class CashierSafeSerializer(serializers.ModelSerializer):
    """Public-safe cashier info (no PIN)."""
    branch_name = serializers.CharField(source='branch.name', read_only=True)

    class Meta:
        model = Cashier
        fields = ('id', 'name', 'employee_id', 'branch', 'branch_name', 'is_active')


class CashierSerializer(serializers.ModelSerializer):
    """Full Cashier serializer for create / update (Owner-facing)."""
    pin = serializers.CharField(write_only=True, required=False)
    confirm_pin = serializers.CharField(write_only=True, required=False)
    branch_name = serializers.CharField(source='branch.name', read_only=True)

    class Meta:
        model = Cashier
        fields = (
            'id', 'name', 'employee_id', 'branch', 'branch_name',
            'is_active', 'created_at', 'updated_at', 'pin', 'confirm_pin',
        )
        read_only_fields = ('id', 'created_at', 'updated_at', 'branch_name')

    def validate(self, attrs):
        name = attrs.get('name')
        if name is not None:
            name_str = str(name).strip()
            if not name_str:
                raise serializers.ValidationError({"name": "Full Name is required."})
            attrs['name'] = name_str

        employee_id = attrs.get('employee_id')
        if employee_id is not None:
            emp_id_str = str(employee_id).strip()
            if not emp_id_str:
                raise serializers.ValidationError({"employee_id": "Employee ID is required."})
            attrs['employee_id'] = emp_id_str

        pin = attrs.get('pin')
        confirm_pin = attrs.get('confirm_pin')

        if pin:
            if not pin.isdigit() or len(pin) != 4:
                raise serializers.ValidationError({"pin": "PIN must be exactly 4 digits and numeric."})
            if confirm_pin and pin != confirm_pin:
                raise serializers.ValidationError({"confirm_pin": "PINs do not match."})
            if self.instance and self.instance.check_pin(pin):
                raise serializers.ValidationError({"detail": "New PIN cannot be the same as your current PIN. Please choose a different PIN."})

        request = self.context.get('request')
        from .utils import get_user_tenant, get_user_branch
        tenant = get_user_tenant(request) if request else (self.instance.tenant if self.instance else None)
        branch = attrs.get('branch') or (self.instance.branch if self.instance else (get_user_branch(request) if request else None))
        emp_id = attrs.get('employee_id') or (self.instance.employee_id if self.instance else None)

        if branch and tenant and branch.tenant_id and tenant.id and branch.tenant_id != tenant.id:
            raise serializers.ValidationError({"branch": "Invalid branch for your business."})

        if emp_id and branch:
            check_employee_id_uniqueness(emp_id, branch, tenant=tenant, exclude_instance=self.instance)

        return attrs

    def create(self, validated_data):
        pin = validated_data.pop('pin', None)
        validated_data.pop('confirm_pin', None)
        cashier = Cashier(**validated_data)
        if pin:
            cashier.set_pin(pin)
        cashier.save()
        return cashier

    def update(self, instance, validated_data):
        pin = validated_data.pop('pin', None)
        validated_data.pop('confirm_pin', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if pin:
            instance.set_pin(pin)
        instance.save()
        return instance


# ── KitchenStaff Serializers ──────────────────────────────────────────────────

class KitchenStaffSafeSerializer(serializers.ModelSerializer):
    """Public-safe kitchen staff info (no PIN)."""
    branch_name = serializers.CharField(source='branch.name', read_only=True)

    class Meta:
        model = KitchenStaff
        fields = ('id', 'name', 'employee_id', 'branch', 'branch_name', 'is_active')


class KitchenStaffSerializer(serializers.ModelSerializer):
    """Full KitchenStaff serializer for create / update."""
    pin = serializers.CharField(write_only=True, required=False)
    confirm_pin = serializers.CharField(write_only=True, required=False)
    branch_name = serializers.CharField(source='branch.name', read_only=True)

    class Meta:
        model = KitchenStaff
        fields = (
            'id', 'name', 'employee_id', 'branch', 'branch_name',
            'is_active', 'created_at', 'updated_at', 'pin', 'confirm_pin',
        )
        read_only_fields = ('id', 'created_at', 'updated_at', 'branch_name')

    def validate(self, attrs):
        name = attrs.get('name')
        if name is not None:
            name_str = str(name).strip()
            if not name_str:
                raise serializers.ValidationError({"name": "Full Name is required."})
            attrs['name'] = name_str

        employee_id = attrs.get('employee_id')
        if employee_id is not None:
            emp_id_str = str(employee_id).strip()
            if not emp_id_str:
                raise serializers.ValidationError({"employee_id": "Employee ID is required."})
            attrs['employee_id'] = emp_id_str

        pin = attrs.get('pin')
        confirm_pin = attrs.get('confirm_pin')

        if pin:
            if not pin.isdigit() or len(pin) != 4:
                raise serializers.ValidationError({"pin": "PIN must be exactly 4 digits and numeric."})
            if pin != confirm_pin:
                raise serializers.ValidationError({"confirm_pin": "PINs do not match."})
            if self.instance and self.instance.check_pin(pin):
                raise serializers.ValidationError({"detail": "New PIN cannot be the same as your current PIN. Please choose a different PIN."})

        request = self.context.get('request')
        from .utils import get_user_tenant, get_user_branch
        tenant = get_user_tenant(request) if request else (self.instance.tenant if self.instance else None)
        branch = attrs.get('branch') or (self.instance.branch if self.instance else (get_user_branch(request) if request else None))
        emp_id = attrs.get('employee_id') or (self.instance.employee_id if self.instance else None)

        if branch and tenant and branch.tenant_id and tenant.id and branch.tenant_id != tenant.id:
            raise serializers.ValidationError({"branch": "Invalid branch for your business."})

        if emp_id and branch:
            check_employee_id_uniqueness(emp_id, branch, tenant=tenant, exclude_instance=self.instance)

        return attrs

    def create(self, validated_data):
        pin = validated_data.pop('pin', None)
        validated_data.pop('confirm_pin', None)
        kitchen_staff = KitchenStaff(**validated_data)
        if pin:
            kitchen_staff.set_pin(pin)
        kitchen_staff.save()
        return kitchen_staff

    def update(self, instance, validated_data):
        pin = validated_data.pop('pin', None)
        validated_data.pop('confirm_pin', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if pin:
            instance.set_pin(pin)
        instance.save()
        return instance


class POSTerminalSerializer(serializers.ModelSerializer):
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    assigned_cashier_name = serializers.CharField(source='assigned_cashier.name', read_only=True)
    terminal = serializers.CharField(source='name', read_only=True)
    terminalName = serializers.CharField(source='name', read_only=True)
    assignedUser = serializers.CharField(source='assigned_cashier.name', default='Not Assigned', read_only=True)

    class Meta:
        model = POSTerminal
        fields = (
            'id',
            'name',
            'terminal',
            'terminalName',
            'branch',
            'branch_name',
            'status',
            'assigned_cashier',
            'assigned_cashier_name',
            'assignedUser',
            'created_at',
            'updated_at'
        )
        read_only_fields = ('id', 'created_at', 'updated_at')

    def validate_name(self, value):
        from accounts.models import POSTerminal
        from accounts.utils import get_user_tenant
        val = str(value).strip()
        qs = POSTerminal.objects.filter(name__iexact=val)
        
        request = self.context.get('request')
        if request:
            tenant = get_user_tenant(request)
            if tenant:
                qs = qs.filter(tenant=tenant)
                
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(f"{val} already exists. Please use a different POS terminal ID.")
        return val

    def to_internal_value(self, data):
        data = data.copy()
        if 'terminal' in data:
            data['name'] = data.pop('terminal')
        if 'terminalName' in data:
            data['name'] = data.pop('terminalName')
        if 'branchId' in data:
            data['branch'] = data.pop('branchId')
        if 'assignedCashierId' in data:
            data['assigned_cashier'] = data.pop('assignedCashierId')
        return super().to_internal_value(data)

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        ret['terminal'] = instance.name
        ret['terminalName'] = instance.name
        ret['assignedUser'] = instance.assigned_cashier.name if instance.assigned_cashier else "Not Assigned"
        return ret

from .models import OwnerSettings

class OwnerSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = OwnerSettings
        fields = '__all__'

class AdminSignupSerializer(serializers.Serializer):
    full_name = serializers.CharField(required=True, max_length=150)
    email = serializers.EmailField(required=True)
    phone = serializers.CharField(required=True, max_length=15)
    password = serializers.CharField(write_only=True, required=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True, required=True)
    business_code = serializers.CharField(required=False, allow_blank=True, max_length=20)

    def validate_business_code(self, value):
        if value:
            from .models import Tenant
            if Tenant.objects.filter(business_code__iexact=value).exists():
                raise serializers.ValidationError("Business Code already taken. Please choose another or leave blank to auto-generate.")
        return value

    def validate_email(self, value):
        from django.contrib.auth.models import User
        user = User.objects.filter(email__iexact=value).first() or User.objects.filter(username__iexact=value).first()
        if user and user.is_active:
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def validate_phone(self, value):
        import re
        if not re.match(r'^\d{10}$', value):
            raise serializers.ValidationError("Phone number must contain exactly 10 digits.")
        return value

    def validate(self, attrs):
        if attrs.get('password') != attrs.get('confirm_password'):
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        return attrs
