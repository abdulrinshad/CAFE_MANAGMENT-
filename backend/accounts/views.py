from rest_framework import status, viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth.models import User
from rest_framework_simplejwt.tokens import RefreshToken
from .models import UserProfile, Waiter
from .serializers import CustomTokenObtainPairSerializer, UserSerializer, ChangePasswordSerializer, WaiterSerializer, WaiterSafeSerializer
from .permissions import IsAdminOrManager

class CustomTokenObtainPairView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = CustomTokenObtainPairSerializer(data=request.data)
        if serializer.is_valid():
            return Response(serializer.validated_data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_401_UNAUTHORIZED)

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

