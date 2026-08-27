from django.db import models
from django.contrib.auth.models import User
from django.contrib.auth.hashers import make_password, check_password


class Branch(models.Model):
    name = models.CharField(max_length=120)
    code = models.CharField(max_length=50, unique=True, default='BRANCH-001')
    address = models.TextField(blank=True, default='')
    phone = models.CharField(max_length=30, blank=True, default='')
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Branch'
        verbose_name_plural = 'Branches'
        ordering = ['name']

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
    manager_id = models.CharField(max_length=50, unique=True)
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
    branch = models.ForeignKey(
        Branch, on_delete=models.SET_NULL, null=True, blank=True, related_name='user_profiles'
    )

    def __str__(self):
        return f"{self.user.username} ({self.get_role_display()})"


class Waiter(models.Model):
    name = models.CharField(max_length=120)
    employee_id = models.CharField(max_length=50, unique=True, blank=True, null=True)
    branch = models.ForeignKey(
        Branch, on_delete=models.SET_NULL, null=True, blank=True, related_name='waiters'
    )
    photo = models.ImageField(upload_to='waiters/', blank=True, null=True)
    section = models.CharField(max_length=100, blank=True, default='')
    pin_hash = models.CharField(max_length=128)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

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
    employee_id = models.CharField(max_length=50, unique=True)
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
    employee_id = models.CharField(max_length=50, unique=True)
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

    def set_pin(self, raw_pin):
        self.pin_hash = make_password(raw_pin)

    def check_pin(self, raw_pin):
        return check_password(raw_pin, self.pin_hash)

    def __str__(self):
        return f"{self.name} — {self.branch.name}"


class POSTerminal(models.Model):
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

    def __str__(self):
        return f"{self.name} — {self.branch.name}"



class OwnerSettings(models.Model):
    business_name = models.CharField(max_length=255, default='Artisan Brew')
    owner_name = models.CharField(max_length=255, default='Dilfa')
    email = models.EmailField(default='dilfa@artisanbrew.com')
    phone = models.CharField(max_length=50, default='+91 98765 43200')
    gstin = models.CharField(max_length=100, default='29ARTBR1234F1Z9')
    address = models.TextField(default='Bengaluru, Karnataka')
    website = models.URLField(default='www.artisanbrew.com')
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

    def save(self, *args, **kwargs):
        self.pk = 1
        super(OwnerSettings, self).save(*args, **kwargs)

    @classmethod
    def load(cls):
        obj, created = cls.objects.get_or_create(pk=1)
        return obj

