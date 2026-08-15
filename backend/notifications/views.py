"""
Views for the notifications app.

GET    /api/v1/notifications/               list (most recent 50, unread first)
GET    /api/v1/notifications/unread_count/  { count: N }
POST   /api/v1/notifications/{id}/mark_read/
POST   /api/v1/notifications/mark_all_read/
"""

from rest_framework import viewsets, status, mixins
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Notification
from .serializers import NotificationSerializer


from accounts.permissions import IsAdminOrManagerOrStaff


class NotificationViewSet(mixins.UpdateModelMixin, viewsets.ReadOnlyModelViewSet):
    """
    Read-write (update/read) viewset for notifications.
    Supports status updates, mark_read and mark_all_read custom actions.
    """
    queryset         = Notification.objects.all().order_by('-created_at')
    serializer_class = NotificationSerializer
    permission_classes = [IsAdminOrManagerOrStaff]

    def get_queryset(self):
        qs = super().get_queryset()
        status_param = self.request.query_params.get('status')
        if status_param:
            # Filter by status if provided (e.g. status=new, status=in_progress, status=completed)
            qs = qs.filter(status=status_param.lower())
        else:
            unread_only = self.request.query_params.get('unread_only')
            if unread_only and unread_only.lower() in ('true', '1'):
                qs = qs.filter(is_read=False)
        
        if self.action == 'list':
            return qs[:50]  # Only limit to most recent 50 on list action
        return qs

    @action(detail=False, methods=['get'], url_path='unread_count')
    def unread_count(self, request):
        count = Notification.objects.filter(is_read=False).count()
        return Response({'count': count})

    @action(detail=True, methods=['post'], url_path='mark_read')
    def mark_read(self, request, pk=None):
        notif = self.get_object()
        notif.status = Notification.STATUS_DISMISSED
        notif.save()
        return Response(NotificationSerializer(notif).data)

    @action(detail=False, methods=['post'], url_path='mark_all_read')
    def mark_all_read(self, request):
        # Setting all unread notifications to dismissed
        unread = Notification.objects.filter(is_read=False)
        count = unread.count()
        for notif in unread:
            notif.status = Notification.STATUS_DISMISSED
            notif.save()
        return Response({'marked_read': count})
