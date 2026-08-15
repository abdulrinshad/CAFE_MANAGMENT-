from rest_framework import serializers
from django.contrib.auth.models import User
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from .models import Waiter

class UserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'role', 'is_staff', 'is_superuser')

    def get_role(self, obj):
        if hasattr(obj, 'profile'):
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
                if role.upper() in ['ADMIN', 'MANAGER']:
                    authenticated_user = auth_user
                    break
                else:
                    if authenticated_user is None:
                        authenticated_user = auth_user

        if authenticated_user is None:
            raise serializers.ValidationError("Invalid email or password.")

        role = authenticated_user.profile.role if hasattr(authenticated_user, 'profile') else 'STAFF'
        if role.upper() not in ['ADMIN', 'MANAGER']:
            raise serializers.ValidationError("You do not have permission to access the Admin Portal.")

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
    class Meta:
        model = Waiter
        fields = ('id', 'name', 'photo', 'section', 'is_active')

class WaiterSerializer(serializers.ModelSerializer):
    pin = serializers.CharField(write_only=True, required=False)
    confirm_pin = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = Waiter
        fields = ('id', 'name', 'photo', 'section', 'is_active', 'created_at', 'updated_at', 'pin', 'confirm_pin')

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

