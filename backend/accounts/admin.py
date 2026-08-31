from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User
from django.forms.models import BaseInlineFormSet
from .models import UserProfile, Waiter, Branch, BranchManager, Cashier, KitchenStaff, POSTerminal, Tenant
from django import forms
from django.core.exceptions import ValidationError

class UserProfileFormSet(BaseInlineFormSet):
    def save(self, commit=True):
        instances = super().save(commit=False)
        for instance in instances:
            if not instance.pk:
                existing = UserProfile.objects.filter(user=instance.user).first()
                if existing:
                    instance.pk = existing.pk
            if commit:
                instance.save()
        for obj in self.deleted_objects:
            obj.delete()
        return instances

class UserProfileInline(admin.StackedInline):
    model = UserProfile
    formset = UserProfileFormSet
    can_delete = False
    verbose_name_plural = 'Profile'

class UserAdmin(BaseUserAdmin):
    inlines = (UserProfileInline,)
    list_display = ('username', 'email', 'get_role', 'is_active', 'is_staff', 'date_joined', 'last_login')
    list_filter = ('profile__role', 'is_active', 'is_staff', 'is_superuser')
    search_fields = ('username', 'email')

    def get_role(self, obj):
        try:
            return obj.profile.role
        except UserProfile.DoesNotExist:
            return None
    get_role.short_description = 'Role'


class WaiterAdmin(admin.ModelAdmin):
    list_display = ('name', 'employee_id', 'tenant', 'branch', 'is_active', 'created_at')
    list_filter = ('is_active', 'tenant', 'branch')
    search_fields = ('name', 'employee_id', 'tenant__name', 'tenant__business_code')
    readonly_fields = ('created_at', 'updated_at', 'pin_display')
    fieldsets = (
        (None, {
            'fields': ('tenant', 'branch', 'name', 'employee_id', 'photo', 'is_active')
        }),
        ('PIN Details', {
            'fields': ('pin_display', 'new_pin'),
            'description': 'To set/reset the waiter PIN, enter a new 4-digit numeric PIN below.'
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at')
        })
    )

    def pin_display(self, obj):
        return '********' if (obj and obj.pin_hash) else '(No PIN set)'
    pin_display.short_description = 'PIN Status'

    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)
        form.base_fields['new_pin'] = forms.CharField(
            max_length=4,
            required=False,
            widget=forms.PasswordInput(render_value=False),
            label='New 4-digit PIN',
            help_text='Exactly 4 digits. Leave blank to keep existing PIN.'
        )
        return form

    def save_model(self, request, obj, form, change):
        new_pin = form.cleaned_data.get('new_pin')
        if new_pin:
            if not new_pin.isdigit() or len(new_pin) != 4:
                raise ValidationError('PIN must be exactly 4 numeric digits.')
            obj.set_pin(new_pin)
        elif not change and not new_pin:
            raise ValidationError('PIN is required for new waiters.')
        super().save_model(request, obj, form, change)


admin.site.unregister(User)
admin.site.register(User, UserAdmin)
admin.site.register(Waiter, WaiterAdmin)


@admin.register(Tenant)
class TenantAdmin(admin.ModelAdmin):
    list_display = ('name', 'business_code', 'admin_user', 'created_at')
    search_fields = ('name', 'business_code', 'admin_user__username', 'admin_user__email')
    readonly_fields = ('created_at',)


@admin.register(Branch)
class BranchAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'tenant', 'address', 'phone', 'active', 'created_at')
    list_filter = ('active', 'tenant')
    search_fields = ('name', 'code', 'tenant__name', 'tenant__business_code')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(BranchManager)
class BranchManagerAdmin(admin.ModelAdmin):
    list_display = ('name', 'manager_id', 'tenant', 'branch', 'is_active', 'created_at')
    list_filter = ('is_active', 'tenant', 'branch')
    search_fields = ('name', 'manager_id', 'tenant__name', 'tenant__business_code')
    readonly_fields = ('created_at', 'updated_at', 'pin_display')
    fieldsets = (
        (None, {
            'fields': ('tenant', 'branch', 'name', 'manager_id', 'is_active')
        }),
        ('PIN', {
            'fields': ('pin_display', 'new_pin'),
            'description': 'Enter a new PIN to set/reset the manager PIN.'
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at')
        }),
    )

    def pin_display(self, obj):
        return '********' if (obj and obj.pin_hash) else '(No PIN set)'
    pin_display.short_description = 'PIN Status'

    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)
        form.base_fields['new_pin'] = forms.CharField(
            max_length=128,
            required=False,
            widget=forms.PasswordInput(render_value=False),
            label='New PIN',
            help_text='Leave blank to keep existing PIN.'
        )
        return form

    def save_model(self, request, obj, form, change):
        new_pin = form.cleaned_data.get('new_pin')
        if new_pin:
            obj.set_pin(new_pin)
        elif not change and not new_pin:
            raise ValidationError('PIN is required for new branch managers.')
        super().save_model(request, obj, form, change)


@admin.register(Cashier)
class CashierAdmin(admin.ModelAdmin):
    list_display = ('name', 'employee_id', 'tenant', 'branch', 'is_active', 'created_at')
    list_filter = ('is_active', 'tenant', 'branch')
    search_fields = ('name', 'employee_id', 'tenant__name', 'tenant__business_code')
    readonly_fields = ('created_at', 'updated_at', 'pin_display')
    fieldsets = (
        (None, {
            'fields': ('tenant', 'branch', 'name', 'employee_id', 'is_active')
        }),
        ('PIN', {
            'fields': ('pin_display', 'new_pin'),
            'description': 'Enter a new PIN to set/reset the cashier PIN.'
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at')
        }),
    )

    def pin_display(self, obj):
        return '********' if (obj and obj.pin_hash) else '(No PIN set)'
    pin_display.short_description = 'PIN Status'

    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)
        form.base_fields['new_pin'] = forms.CharField(
            max_length=4,
            required=False,
            widget=forms.PasswordInput(render_value=False),
            label='New 4-Digit PIN',
            help_text='Exactly 4 digits. Leave blank to keep existing PIN.'
        )
        return form

    def save_model(self, request, obj, form, change):
        new_pin = form.cleaned_data.get('new_pin')
        if new_pin:
            if not new_pin.isdigit() or len(new_pin) != 4:
                raise ValidationError('PIN must be exactly 4 numeric digits.')
            obj.set_pin(new_pin)
        elif not change and not new_pin:
            raise ValidationError('PIN is required for new cashiers.')
        super().save_model(request, obj, form, change)


@admin.register(POSTerminal)
class POSTerminalAdmin(admin.ModelAdmin):
    list_display = ('name', 'tenant', 'branch', 'status', 'assigned_cashier', 'created_at')
    list_filter = ('status', 'tenant', 'branch')
    search_fields = ('name', 'tenant__name', 'tenant__business_code')
    readonly_fields = ('created_at', 'updated_at')
