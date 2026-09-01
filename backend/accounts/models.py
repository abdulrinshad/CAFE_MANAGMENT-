from django.db import models
from django.contrib.auth.models import User
from django.contrib.auth.hashers import make_password, check_password
import string
import random

def generate_business_code():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

class Tenant(models.Model):
    admin_user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='tenant')
    name = models.CharField(max_length=255)
    business_code = models.CharField(max_length=20, unique=True, default=generate_business_code)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.name} ({self.business_code})"

class OTPVerification(models.Model):
    email = models.EmailField()
    otp = models.CharField(max_length=6)
    purpose = models.CharField(max_length=20, choices=[('signup', 'Signup'), ('reset', 'Password Reset')])
    expires_at = models.DateTimeField()
    attempts = models.IntegerField(default=0)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.email} - {self.otp}"

class Branch(models.Model):
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='branches', null=True, blank=True)
    name = models.CharField(max_length=120)
    code = models.CharField(max_length=50, default='BRANCH-001')
    address = models.TextField(blank=True, default='')
    phone = models.CharField(max_length=30, blank=True, default='')
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Branch'
        verbose_name_plural = 'Branches'
        ordering = ['name']
        constraints = [
            models.UniqueConstraint(fields=['tenant', 'code'], name='unique_branch_code_per_tenant')
        ]

    def __str__(self):
        return f"{self.name} ({self.code})"


class BranchManager(models.Model):
    """
    Branch Manager account.
    Each manager is permanently linked to exactly one Branch via OneToOneField.
    Authentication uses a unique manager_id string + PIN (hashed), completely
    separate from the Admin / Waiter login flows.
    """
    name = models.CharField(max_length=120)
    email = models.EmailField(blank=True, null=True)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='managers', null=True, blank=True)
    manager_id = models.CharField(max_length=50)
    branch = models.OneToOneField(
        Branch,
        on_delete=models.CASCADE,
        related_name='manager',
    )
    pin_hash = models.CharField(max_length=128)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Branch Manager'
        verbose_name_plural = 'Branch Managers'
        ordering = ['name']
        unique_together = ('tenant', 'manager_id')

    def set_pin(self, raw_pin):
        self.pin_hash = make_password(raw_pin)

    def check_pin(self, raw_pin):
        return check_password(raw_pin, self.pin_hash)

    def __str__(self):
        return f"{self.name} — {self.branch.name}"


class UserProfile(models.Model):
    ADMIN = 'ADMIN'
    MANAGER = 'MANAGER'
    STAFF = 'STAFF'
    CASHIER = 'CASHIER'
    POS = 'POS'
    KITCHEN = 'KITCHEN'

    ROLE_CHOICES = [
        (ADMIN, 'Admin'),
        (MANAGER, 'Manager'),
        (STAFF, 'Staff'),
        (CASHIER, 'Cashier'),
        (POS, 'POS / Desk'),
        (KITCHEN, 'Kitchen Staff'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=STAFF)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='user_profiles', null=True, blank=True)
    branch = models.ForeignKey(
        Branch, on_delete=models.SET_NULL, null=True, blank=True, related_name='user_profiles'
    )

    def __str__(self):
        return f"{self.user.username} ({self.get_role_display()})"


class Waiter(models.Model):
    name = models.CharField(max_length=120)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='waiters', null=True, blank=True)
    employee_id = models.CharField(max_length=50, blank=True, null=True)
    branch = models.ForeignKey(
        Branch, on_delete=models.SET_NULL, null=True, blank=True, related_name='waiters'
    )
    photo = models.ImageField(upload_to='waiters/', blank=True, null=True)
    section = models.CharField(max_length=100, blank=True, default='')
    pin_hash = models.CharField(max_length=128)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('tenant', 'branch', 'employee_id')

    def set_pin(self, raw_pin):
        self.pin_hash = make_password(raw_pin)

    def check_pin(self, raw_pin):
        return check_password(raw_pin, self.pin_hash)

    def __str__(self):
        return f"{self.name} ({self.branch.name if self.branch else 'No Branch'})"


class Cashier(models.Model):
    """
    Cashier account.
    Authenticated using employee_id + PIN (hashed), following the same
    pattern as Waiter and BranchManager.
    """
    name = models.CharField(max_length=120)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='cashiers', null=True, blank=True)
    employee_id = models.CharField(max_length=50)
    branch = models.ForeignKey(
        Branch, on_delete=models.CASCADE, related_name='cashiers'
    )
    pin_hash = models.CharField(max_length=128)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Cashier'
        verbose_name_plural = 'Cashiers'
        ordering = ['name']
        unique_together = ('tenant', 'branch', 'employee_id')

    def set_pin(self, raw_pin):
        self.pin_hash = make_password(raw_pin)

    def check_pin(self, raw_pin):
        return check_password(raw_pin, self.pin_hash)

    def __str__(self):
        return f"{self.name} — {self.branch.name}"


class KitchenStaff(models.Model):
    """
    Kitchen Staff account.
    Authenticated using employee_id + PIN (hashed), following the same
    pattern as Waiter and Cashier.
    """
    name = models.CharField(max_length=120)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='kitchen_staff', null=True, blank=True)
    employee_id = models.CharField(max_length=50)
    branch = models.ForeignKey(
        Branch, on_delete=models.CASCADE, related_name='kitchen_staff'
    )
    pin_hash = models.CharField(max_length=128)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Kitchen Staff'
        verbose_name_plural = 'Kitchen Staff'
        ordering = ['name']
        unique_together = ('tenant', 'branch', 'employee_id')

    def set_pin(self, raw_pin):
        self.pin_hash = make_password(raw_pin)

    def check_pin(self, raw_pin):
        return check_password(raw_pin, self.pin_hash)

    def __str__(self):
        return f"{self.name} — {self.branch.name}"


class POSTerminal(models.Model):
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='pos_terminals', null=True, blank=True)
    name = models.CharField(max_length=120)
    branch = models.ForeignKey(
        Branch, on_delete=models.CASCADE, related_name='pos_terminals'
    )
    status = models.CharField(
        max_length=20,
        choices=[
            ('active', 'Active'),
            ('inactive', 'Inactive'),
            ('maintenance', 'Maintenance')
        ],
        default='active'
    )
    assigned_cashier = models.ForeignKey(
        Cashier, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_terminals'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'POS Terminal'
        verbose_name_plural = 'POS Terminals'
        ordering = ['name']
        unique_together = ('tenant', 'name')

    def __str__(self):
        return f"{self.name} — {self.branch.name}"

class OwnerSettings(models.Model):
    business_name = models.CharField(max_length=255, default='Artisan Brew')
    owner_name = models.CharField(max_length=255, default='Dilfa')
    email = models.EmailField(default='dilfa@artisanbrew.com')
    phone = models.CharField(max_length=50, default='+91 98765 43200')
    gstin = models.CharField(max_length=100, default='29ARTBR1234F1Z9')
    address = models.TextField(default='Bengaluru, Karnataka')
    website = models.URLField(default='https://www.artisanbrew.com', blank=True, null=True)
    currency = models.CharField(max_length=10, default='INR')
    
    # Branch settings
    auto_disable_inactive_branches = models.BooleanField(default=False)
    cross_branch_inventory_sharing = models.BooleanField(default=True)
    unified_menu_across_branches = models.BooleanField(default=False)
    
    # User settings
    require_email_verification = models.BooleanField(default=True)
    allow_managers_create_staff = models.BooleanField(default=True)
    allow_managers_view_reports = models.BooleanField(default=False)
    
    # Tax & Billing
    default_tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=5.0)
    service_charge = models.DecimalField(max_digits=5, decimal_places=2, default=0.0)
    invoice_footer_text = models.TextField(default='Thank you for visiting Artisan Brew!')
    
    # Payment Methods
    pm_cash = models.BooleanField(default=True)
    pm_upi = models.BooleanField(default=True)
    pm_card = models.BooleanField(default=True)
    pm_swiggy = models.BooleanField(default=True)
    pm_zomato = models.BooleanField(default=True)
    
    # Notifications
    notif_new_order = models.BooleanField(default=True)
    notif_payment_done = models.BooleanField(default=True)
    notif_low_stock = models.BooleanField(default=True)
    notif_expense_added = models.BooleanField(default=False)
    notif_branch_report = models.BooleanField(default=True)
    notif_email_digest = models.BooleanField(default=False)
    
    # Security
    sec_two_fa = models.BooleanField(default=False)
    sec_login_alerts = models.BooleanField(default=True)
    sec_session_timeout = models.CharField(max_length=50, default='60')

    tenant = models.OneToOneField('Tenant', on_delete=models.CASCADE, related_name='ownersettings', null=True, blank=True)

    def save(self, *args, **kwargs):
        # We no longer hardcode self.pk = 1 globally.
        # If tenant is set, it will be saved naturally.
        super(OwnerSettings, self).save(*args, **kwargs)

    @classmethod
    def load(cls, tenant=None):
        if tenant:
            obj, created = cls.objects.get_or_create(tenant=tenant)
            return obj
        # Fallback for old code that hasn't been updated (should not be reached ideally)
        obj, created = cls.objects.get_or_create(pk=1)
        return obj



class BranchSettings(models.Model):
    branch = models.OneToOneField(
        Branch,
        on_delete=models.CASCADE,
        related_name='branch_settings'
    )
    manager_email = models.EmailField(blank=True, default='')
    opening_time = models.CharField(max_length=20, default='09:00')
    closing_time = models.CharField(max_length=20, default='23:00')
    tax_gst = models.DecimalField(max_digits=5, decimal_places=2, default=18.0)
    service_charge = models.DecimalField(max_digits=5, decimal_places=2, default=5.0)
    
    alert_customer_assistance = models.BooleanField(default=True)
    alert_bill_requests = models.BooleanField(default=True)
    alert_low_stock = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Branch Settings'
        verbose_name_plural = 'Branch Settings'

    def __str__(self):
        return f"Settings for {self.branch.name}"

    @classmethod
    def load_for_branch(cls, branch):
        obj, created = cls.objects.get_or_create(branch=branch)
        return obj


class AdminOTP(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='otps')
    manager = models.ForeignKey('BranchManager', on_delete=models.CASCADE, null=True, blank=True, related_name='pin_change_otps')
    waiter = models.ForeignKey('Waiter', on_delete=models.CASCADE, null=True, blank=True, related_name='pin_change_otps')
    cashier = models.ForeignKey('Cashier', on_delete=models.CASCADE, null=True, blank=True, related_name='pin_change_otps')
    pending_pin_hash = models.CharField(max_length=128, blank=True, default='')
    otp_hash = models.CharField(max_length=128)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    attempt_count = models.IntegerField(default=0)

    class Meta:
        verbose_name = 'Admin OTP'
        verbose_name_plural = 'Admin OTPs'
        ordering = ['-created_at']

    def set_otp(self, raw_otp):
        self.otp_hash = make_password(raw_otp)

    def check_otp(self, raw_otp):
        return check_password(raw_otp, self.otp_hash)

    def __str__(self):
        return f"OTP for {self.user.email} (used: {self.is_used})"
