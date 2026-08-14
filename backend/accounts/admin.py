from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User
from django.forms.models import BaseInlineFormSet
from .models import UserProfile, Waiter
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
    list_display = ('name', 'section', 'is_active', 'created_at', 'updated_at')
    list_filter = ('is_active', 'section')
    search_fields = ('name', 'section')
    readonly_fields = ('created_at', 'updated_at', 'pin_display')
    fieldsets = (
        (None, {
            'fields': ('name', 'photo', 'section', 'is_active')
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
