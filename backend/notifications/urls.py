"""
URL routing for the notifications app.

GET    /api/v1/notifications/
GET    /api/v1/notifications/unread_count/
POST   /api/v1/notifications/{id}/mark_read/
POST   /api/v1/notifications/mark_all_read/
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import NotificationViewSet

router = DefaultRouter()
router.register(r'notifications', NotificationViewSet, basename='notification')

urlpatterns = [
    path('', include(router.urls)),
]
