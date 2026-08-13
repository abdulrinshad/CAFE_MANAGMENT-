"""
Views for the notifications app.

GET    /api/v1/notifications/               list (most recent 50, unread first)
GET    /api/v1/notifications/unread_count/  { count: N }
POST   /api/v1/notifications/{id}/mark_read/
POST   /api/v1/notifications/mark_all_read/
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Notification
from .serializers import NotificationSerializer


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only viewset for notifications.
    Supports mark_read and mark_all_read custom actions.
    """
    queryset         = Notification.objects.all().order_by('-created_at')
    serializer_class = NotificationSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        unread_only = self.request.query_params.get('unread_only')
        if unread_only and unread_only.lower() in ('true', '1'):
            qs = qs.filter(is_read=False)
        return qs[:50]  # Always limit to most recent 50

    @action(detail=False, methods=['get'], url_path='unread_count')
    def unread_count(self, request):
        count = Notification.objects.filter(is_read=False).count()
        return Response({'count': count})

    @action(detail=True, methods=['post'], url_path='mark_read')
    def mark_read(self, request, pk=None):
        notif = self.get_object()
        notif.is_read = True
        notif.save(update_fields=['is_read'])
        return Response(NotificationSerializer(notif).data)

    @action(detail=False, methods=['post'], url_path='mark_all_read')
    def mark_all_read(self, request):
        updated = Notification.objects.filter(is_read=False).update(is_read=True)
        return Response({'marked_read': updated})
