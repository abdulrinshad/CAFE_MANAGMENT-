"""
URL routing for the notifications app.

GET/POST  /api/v1/notifications/
GET       /api/v1/notifications/unread_count/
POST      /api/v1/notifications/{id}/mark_read/
POST      /api/v1/notifications/mark_all_read/

GET/POST  /api/v1/conversations/
GET/POST  /api/v1/conversations/{id}/messages/
POST      /api/v1/conversations/{id}/mark_seen/
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import NotificationViewSet, ConversationViewSet

router = DefaultRouter()
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'conversations', ConversationViewSet, basename='conversation')

urlpatterns = [
    path('owner/messages/', ConversationViewSet.as_view({'get': 'list'}), name='owner-messages-list'),
    path('manager/messages/', ConversationViewSet.as_view({'get': 'list', 'post': 'create'}), name='manager-messages-create'),
    path('', include(router.urls)),
]
