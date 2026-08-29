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
        fields = ('id', 'name', 'manager_id', 'is_active')


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
    manager_pin = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = Branch
        fields = ('name', 'code', 'address', 'phone', 'active', 'create_manager', 'manager_name', 'manager_id', 'manager_pin')

    def validate_code(self, value):
        qs = Branch.objects.filter(code=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("A branch with this code already exists.")
        return value

    def validate(self, attrs):
        create_manager = attrs.get('create_manager', False)
        if create_manager:
            manager_name = attrs.get('manager_name')
            manager_id = attrs.get('manager_id')
            manager_pin = attrs.get('manager_pin')

            if not manager_name:
                raise serializers.ValidationError({"manager_name": "Manager name is required when creating a manager."})
            if not manager_id:
                raise serializers.ValidationError({"manager_id": "Manager ID is required when creating a manager."})
            if not manager_pin:
                raise serializers.ValidationError({"manager_pin": "Manager PIN is required when creating a manager."})

            if BranchManager.objects.filter(manager_id=manager_id).exists():
                raise serializers.ValidationError({"manager_id": "This Manager ID is already in use."})
        return attrs

    def create(self, validated_data):
        from django.db import transaction
        create_manager = validated_data.pop('create_manager', False)
        manager_name = validated_data.pop('manager_name', None)
        manager_id = validated_data.pop('manager_id', None)
        manager_pin = validated_data.pop('manager_pin', None)

        with transaction.atomic():
            branch = super().create(validated_data)
            if create_manager:
                manager = BranchManager(
                    name=manager_name,
                    manager_id=manager_id,
                    branch=branch
                )
                manager.set_pin(manager_pin)
                manager.save()
            return branch


# ── BranchManager Serializers ─────────────────────────────────────────────────

class BranchManagerSerializer(serializers.ModelSerializer):
    """Full BranchManager serializer for create / update."""
    pin = serializers.CharField(write_only=True, required=False)
    branch_name = serializers.CharField(source='branch.name', read_only=True)

    class Meta:
        model = BranchManager
        fields = (
            'id', 'name', 'manager_id', 'branch', 'branch_name',
            'is_active', 'created_at', 'updated_at', 'pin',
        )
        read_only_fields = ('id', 'created_at', 'updated_at', 'branch_name')

    def validate_manager_id(self, value):
        qs = BranchManager.objects.filter(manager_id=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("This Manager ID is already in use.")
        return value

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

        return {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': {
                'id': authenticated_user.id,
                'username': authenticated_user.username,
                'email': authenticated_user.email,
                'role': role,
                'is_staff': authenticated_user.is_staff,
                'is_superuser': authenticated_user.is_superuser,
            }
        }


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True)


# ── Waiter Serializers ────────────────────────────────────────────────────────

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

    def validate_employee_id(self, value):
        if not value:
            return value
        qs = Waiter.objects.filter(employee_id=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("This Employee ID is already in use.")
        # Also check Cashier namespace to guarantee uniqueness across employees
        if Cashier.objects.filter(employee_id=value).exists():
            raise serializers.ValidationError("This Employee ID is already in use by a Cashier.")
        return value

    def validate(self, attrs):
        pin = attrs.get('pin')
        confirm_pin = attrs.get('confirm_pin')

        if pin:
            if not pin.isdigit() or len(pin) != 4:
                raise serializers.ValidationError({"pin": "PIN must be exactly 4 digits and numeric."})
            if pin != confirm_pin:
                raise serializers.ValidationError({"confirm_pin": "PINs do not match."})

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

    def validate_employee_id(self, value):
        qs = Cashier.objects.filter(employee_id=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("This Employee ID is already in use.")
        # Cross-check Waiter namespace
        if Waiter.objects.filter(employee_id=value).exists():
            raise serializers.ValidationError("This Employee ID is already in use by a Waiter.")
        return value

    def validate(self, attrs):
        pin = attrs.get('pin')
        confirm_pin = attrs.get('confirm_pin')

        if pin:
            if not pin.isdigit() or len(pin) != 4:
                raise serializers.ValidationError({"pin": "PIN must be exactly 4 digits and numeric."})
            if confirm_pin and pin != confirm_pin:
                raise serializers.ValidationError({"confirm_pin": "PINs do not match."})

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

    def validate_employee_id(self, value):
        qs = KitchenStaff.objects.filter(employee_id=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("This Employee ID is already in use.")
        # Cross-check Waiter and Cashier namespaces
        if Waiter.objects.filter(employee_id=value).exists():
            raise serializers.ValidationError("This Employee ID is already in use by a Waiter.")
        if Cashier.objects.filter(employee_id=value).exists():
            raise serializers.ValidationError("This Employee ID is already in use by a Cashier.")
        return value

    def validate(self, attrs):
        pin = attrs.get('pin')
        confirm_pin = attrs.get('confirm_pin')

        if pin:
            if not pin.isdigit() or len(pin) != 4:
                raise serializers.ValidationError({"pin": "PIN must be exactly 4 digits and numeric."})
            if confirm_pin and pin != confirm_pin:
                raise serializers.ValidationError({"confirm_pin": "PINs do not match."})

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
