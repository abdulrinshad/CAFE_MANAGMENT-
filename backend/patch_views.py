import re

with open('c:/Projects/Cafe_manager/backend/accounts/views.py', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Imports
content = content.replace(
    'from .models import UserProfile, Waiter, Branch, BranchManager, Cashier, KitchenStaff, POSTerminal',
    'from .models import UserProfile, Waiter, Branch, BranchManager, Cashier, KitchenStaff, POSTerminal, Tenant, OTPVerification'
)

# 2. Add OTP and Admin Signup views
otp_views = """
import random
from django.utils import timezone
from datetime import timedelta
from django.core.mail import send_mail
from django.conf import settings

def generate_otp():
    return str(random.randint(100000, 999999))

class AdminSignupView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        password = request.data.get('password', '')
        name = request.data.get('name', '')
        
        if not email or not password or not name:
            return Response({'detail': 'All fields are required.'}, status=status.HTTP_400_BAD_REQUEST)
            
        if User.objects.filter(email=email).exists():
            return Response({'detail': 'Email already registered.'}, status=status.HTTP_400_BAD_REQUEST)
            
        # Create inactive user
        user = User.objects.create_user(username=email, email=email, password=password, first_name=name, is_active=False)
        UserProfile.objects.create(user=user, role='ADMIN')
        
        # Send OTP
        otp = generate_otp()
        expires = timezone.now() + timedelta(minutes=5)
        OTPVerification.objects.update_or_create(
            email=email, purpose='signup',
            defaults={'otp': otp, 'expires_at': expires, 'attempts': 0, 'is_verified': False}
        )
        print(f"OTP for {email}: {otp}")
        return Response({'success': True, 'detail': 'OTP sent to email.'})

class VerifyOTPView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        otp = request.data.get('otp', '').strip()
        purpose = request.data.get('purpose', 'signup')
        
        try:
            verification = OTPVerification.objects.get(email=email, purpose=purpose, is_verified=False)
        except OTPVerification.DoesNotExist:
            return Response({'detail': 'Invalid request or OTP expired.'}, status=status.HTTP_400_BAD_REQUEST)
            
        if timezone.now() > verification.expires_at:
            return Response({'detail': 'OTP has expired.'}, status=status.HTTP_400_BAD_REQUEST)
            
        if verification.attempts >= 3:
            return Response({'detail': 'Too many failed attempts.'}, status=status.HTTP_400_BAD_REQUEST)
            
        if verification.otp != otp:
            verification.attempts += 1
            verification.save()
            return Response({'detail': 'Invalid OTP.'}, status=status.HTTP_400_BAD_REQUEST)
            
        verification.is_verified = True
        verification.save()
        
        if purpose == 'signup':
            user = User.objects.get(email=email)
            user.is_active = True
            user.save()
            Tenant.objects.create(admin_user=user, name=user.first_name + " Business")
            return Response({'success': True, 'detail': 'Signup successful. You can now login.'})
            
        return Response({'success': True, 'detail': 'OTP verified.'})

class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        
        if not User.objects.filter(email=email, is_active=True).exists():
            return Response({'detail': 'Email not found.'}, status=status.HTTP_400_BAD_REQUEST)
            
        otp = generate_otp()
        expires = timezone.now() + timedelta(minutes=5)
        OTPVerification.objects.update_or_create(
            email=email, purpose='reset',
            defaults={'otp': otp, 'expires_at': expires, 'attempts': 0, 'is_verified': False}
        )
        print(f"OTP for {email}: {otp}")
        return Response({'success': True, 'detail': 'OTP sent to email.'})

class ResetPasswordView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        new_password = request.data.get('new_password')
        
        try:
            verification = OTPVerification.objects.get(email=email, purpose='reset', is_verified=True)
        except OTPVerification.DoesNotExist:
            return Response({'detail': 'OTP not verified.'}, status=status.HTTP_400_BAD_REQUEST)
            
        user = User.objects.get(email=email)
        user.set_password(new_password)
        user.save()
        verification.delete()
        return Response({'success': True, 'detail': 'Password reset successful.'})

class LogoutView(APIView):
"""

content = content.replace('class LogoutView(APIView):', otp_views)

# 3. Update EmployeeLoginView
employee_login_old = '''        employee_id = request.data.get('employee_id', '').strip()
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
                pass'''

employee_login_new = '''        employee_id = request.data.get('employee_id', '').strip()
        pin = request.data.get('pin', '')
        business_code = request.data.get('business_code', '').strip()

        if not employee_id or not pin or not business_code:
            return Response(
                {"detail": "business_code, employee_id and pin are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            tenant = Tenant.objects.get(business_code=business_code)
        except Tenant.DoesNotExist:
            return Response({"detail": "Invalid Business Code."}, status=status.HTTP_401_UNAUTHORIZED)

        # Try Waiter first
        waiter = None
        cashier = None
        kitchen = None
        try:
            waiter = Waiter.objects.select_related('branch').get(tenant=tenant, employee_id=employee_id)
        except Waiter.DoesNotExist:
            pass

        if waiter is None:
            try:
                cashier = Cashier.objects.select_related('branch').get(tenant=tenant, employee_id=employee_id)
            except Cashier.DoesNotExist:
                pass

        if waiter is None and cashier is None:
            try:
                kitchen = KitchenStaff.objects.select_related('branch').get(tenant=tenant, employee_id=employee_id)
            except KitchenStaff.DoesNotExist:
                pass'''

content = content.replace(employee_login_old, employee_login_new)

# 4. Update BranchManagerLoginView
bm_login_old = '''        manager_id = request.data.get('manager_id', '').strip()
        pin = request.data.get('pin', request.data.get('password', ''))

        if not manager_id or not pin:
            return Response(
                {"detail": "manager_id and pin/password are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            manager = BranchManager.objects.select_related('branch').get(manager_id=manager_id)
        except BranchManager.DoesNotExist:'''

bm_login_new = '''        manager_id = request.data.get('manager_id', '').strip()
        pin = request.data.get('pin', request.data.get('password', ''))
        business_code = request.data.get('business_code', '').strip()

        if not manager_id or not pin or not business_code:
            return Response(
                {"detail": "business_code, manager_id and pin/password are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            tenant = Tenant.objects.get(business_code=business_code)
        except Tenant.DoesNotExist:
            return Response({"detail": "Invalid Business Code."}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            manager = BranchManager.objects.select_related('branch').get(tenant=tenant, manager_id=manager_id)
        except BranchManager.DoesNotExist:'''

content = content.replace(bm_login_old, bm_login_new)

with open('c:/Projects/Cafe_manager/backend/accounts/views.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("Patch applied to accounts/views.py")
