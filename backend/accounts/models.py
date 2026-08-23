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

    ROLE_CHOICES = [
        (ADMIN, 'Admin'),
        (MANAGER, 'Manager'),
        (STAFF, 'Staff'),
        (CASHIER, 'Cashier'),
        (POS, 'POS / Desk'),
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
    branch = models.ForeignKey(
        Branch, on_delete=models.SET_NULL, null=True, blank=True, related_name='waiters'
    )
    photo = models.ImageField(upload_to='waiters/', blank=True, null=True)
    section = models.CharField(max_length=100)
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
