"""
Django Admin for the Notifications app.
"""
from django.contrib import admin
from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display  = ['title', 'type', 'is_read', 'order', 'table', 'created_at']
    list_filter   = ['type', 'is_read', 'created_at']
    search_fields = ['title', 'message', 'order__order_number']
    list_editable = ['is_read']
    ordering      = ['-created_at']
    readonly_fields = ['created_at']

    actions = ['mark_as_read', 'mark_as_unread']

    def mark_as_read(self, request, queryset):
        queryset.update(is_read=True)
    mark_as_read.short_description = 'Mark selected as read'

    def mark_as_unread(self, request, queryset):
        queryset.update(is_read=False)
    mark_as_unread.short_description = 'Mark selected as unread'
