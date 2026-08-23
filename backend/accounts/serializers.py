from rest_framework import serializers
from django.contrib.auth.models import User
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from .models import Waiter, Branch, BranchManager


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

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'role', 'branch', 'is_staff', 'is_superuser')

    def get_role(self, obj):
        if obj.username.startswith('bm_'):
            return 'branch_manager'
        if hasattr(obj, 'profile'):
            if obj.profile.role == 'MANAGER':
                return 'branch_manager'
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


class WaiterSafeSerializer(serializers.ModelSerializer):
    branch_name = serializers.CharField(source='branch.name', read_only=True)

    class Meta:
        model = Waiter
        fields = ('id', 'name', 'photo', 'section', 'branch', 'branch_name', 'is_active')


class WaiterSerializer(serializers.ModelSerializer):
    pin = serializers.CharField(write_only=True, required=False)
    confirm_pin = serializers.CharField(write_only=True, required=False)
    branch_name = serializers.CharField(source='branch.name', read_only=True)

    class Meta:
        model = Waiter
        fields = ('id', 'name', 'photo', 'section', 'branch', 'branch_name', 'is_active', 'created_at', 'updated_at', 'pin', 'confirm_pin')

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
