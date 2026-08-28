"""
Views for the notifications & conversations app.

GET    /api/v1/notifications/               list (branch-scoped)
GET    /api/v1/notifications/unread_count/  { count: N }
POST   /api/v1/notifications/{id}/mark_read/
POST   /api/v1/notifications/mark_all_read/

GET    /api/v1/conversations/               list conversations
POST   /api/v1/conversations/               create conversation / send alert to owner
GET    /api/v1/conversations/{id}/messages/ list messages (auto-mark seen)
POST   /api/v1/conversations/{id}/messages/ reply to conversation thread
POST   /api/v1/conversations/{id}/mark_seen/ mark conversation seen
"""

from rest_framework import viewsets, status, mixins
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.db import models
from django.utils import timezone

from .models import Notification, Conversation, ConversationMessage
from .serializers import NotificationSerializer, ConversationSerializer, ConversationMessageSerializer

from accounts.permissions import IsEmployeeOrAbove, IsAdminOrManager
from accounts.branch_views import get_manager_branch
from accounts.utils import get_waiter_branch


class NotificationViewSet(mixins.UpdateModelMixin, viewsets.ReadOnlyModelViewSet):
    """
    Read-write (update/read) viewset for notifications.
    Enforces strict branch-level security: Cashiers and Branch Managers only see
    notifications belonging to their assigned branch.
    """
    queryset         = Notification.objects.all().order_by('-created_at')
    serializer_class = NotificationSerializer
    permission_classes = [IsEmployeeOrAbove]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user

        if not (user and user.is_authenticated):
            return Notification.objects.none()

        is_owner_or_admin = (
            user.is_superuser or
            (hasattr(user, 'profile') and user.profile.role == 'ADMIN')
        )

        manager_branch = get_manager_branch(self.request)
        emp_branch = get_waiter_branch(self.request)
        profile_branch = getattr(getattr(user, 'profile', None), 'branch', None)
        user_branch = manager_branch or emp_branch or profile_branch

        user_role = None
        if hasattr(user, 'profile'):
            user_role = user.profile.role

        if user.username.startswith('bm_'):
            user_role = 'MANAGER'
        elif user.username.startswith('cashier_'):
            user_role = 'CASHIER'
        elif user.username.startswith('waiter_'):
            user_role = 'STAFF'

        if is_owner_or_admin:
            # Owner MUST ONLY see notifications intended for Admin/Owner OR direct messages to user
            # (Owner DOES NOT see operational branch notifications like new_order or payment_completed)
            qs = qs.filter(
                models.Q(recipient=user) |
                models.Q(target_role='admin') |
                models.Q(type__in=['owner_message', 'system_alert'])
            )
        else:
            if not user_branch:
                # Non-owner user without an assigned branch sees only direct notifications
                qs = qs.filter(recipient=user)
            else:
                branch_q = (
                    models.Q(branch=user_branch) |
                    models.Q(order__branch=user_branch) |
                    models.Q(table__branch=user_branch)
                )

                if user_role == 'MANAGER':
                    # Branch Manager sees:
                    # 1) Direct notifications to them (recipient=user)
                    # 2) Branch notifications targeted to manager ('manager' or 'cashier_manager')
                    role_q = models.Q(recipient=user) | (
                        branch_q & models.Q(target_role__in=['manager', 'cashier_manager'])
                    )
                elif user_role in ['CASHIER', 'POS']:
                    # Cashier sees:
                    # 1) Direct notifications to them (recipient=user)
                    # 2) Branch notifications targeted to cashier ('cashier_manager') for new_order
                    # (Cashier NEVER sees payment_completed which is target_role='manager'!)
                    role_q = models.Q(recipient=user) | (
                        branch_q & models.Q(target_role='cashier_manager') & models.Q(type='new_order')
                    )
                elif user_role == 'STAFF':
                    # Waiter / Staff sees:
                    # 1) Direct notifications to them (recipient=user)
                    # 2) Table attention or status updates targeted to staff
                    role_q = models.Q(recipient=user) | (
                        branch_q & models.Q(target_role='staff')
                    )
                else:
                    role_q = models.Q(recipient=user)

                qs = qs.filter(role_q)

        status_param = self.request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param.lower())
        else:
            unread_only = self.request.query_params.get('unread_only')
            if unread_only and unread_only.lower() in ('true', '1'):
                qs = qs.filter(is_read=False)

        if self.action == 'list':
            return qs[:50]
        return qs

    @action(detail=False, methods=['get'], url_path='unread_count')
    def unread_count(self, request):
        qs = self.get_queryset()
        count = qs.filter(is_read=False).count()
        return Response({'count': count})

    @action(detail=True, methods=['post'], url_path='mark_read')
    def mark_read(self, request, pk=None):
        notif = self.get_object()
        notif.status = Notification.STATUS_DISMISSED
        notif.is_read = True
        notif.save()
        return Response(NotificationSerializer(notif).data)

    @action(detail=False, methods=['post'], url_path='mark_all_read')
    def mark_all_read(self, request):
        unread = self.get_queryset().filter(is_read=False)
        count = unread.count()
        for notif in unread:
            notif.status = Notification.STATUS_DISMISSED
            notif.is_read = True
            notif.save()
        return Response({'marked_read': count})


class ConversationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Manager <-> Owner conversations and alerts.
    Cashiers & Waiters are restricted from accessing this endpoint (HTTP 403).
    """
    queryset = Conversation.objects.prefetch_related('messages').select_related('branch', 'manager', 'owner').all()
    serializer_class = ConversationSerializer
    permission_classes = [IsAuthenticated, IsAdminOrManager]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user

        if user and user.is_authenticated:
            manager_branch = get_manager_branch(self.request)
            profile_branch = getattr(getattr(user, 'profile', None), 'branch', None)
            assigned_branch = manager_branch or profile_branch

            is_owner_or_admin = (
                user.is_superuser or
                (hasattr(user, 'profile') and user.profile.role == 'ADMIN')
            )

            if not is_owner_or_admin and assigned_branch:
                # Branch Manager sees conversations for their branch
                qs = qs.filter(branch=assigned_branch)

        return qs

    def create(self, request, *args, **kwargs):
        """
        POST /api/v1/conversations/
        Payload: { subject, message, priority, branch_id (optional) }
        """
        user = request.user
        subject = str(request.data.get('subject') or 'Alert to Owner').strip()
        message_text = str(request.data.get('message') or '').strip()
        priority = str(request.data.get('priority') or 'normal').lower()

        if priority not in [Conversation.PRIORITY_NORMAL, Conversation.PRIORITY_IMPORTANT, Conversation.PRIORITY_URGENT]:
            priority = Conversation.PRIORITY_NORMAL

        if not message_text:
            return Response({'detail': 'Message content is required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Resolve branch
        branch = get_manager_branch(request)
        if not branch and request.data.get('branch'):
            from accounts.models import Branch
            try:
                branch = Branch.objects.get(pk=request.data.get('branch'))
            except Branch.DoesNotExist:
                pass
        if not branch and hasattr(user, 'profile') and user.profile.branch:
            branch = user.profile.branch
        if not branch:
            from accounts.models import Branch
            branch = Branch.objects.first()

        # Manager name
        manager_name = user.get_full_name() or user.username
        if user.username.startswith('bm_'):
            try:
                bm_id = int(user.username.split('_')[1])
                from accounts.models import BranchManager
                bm = BranchManager.objects.filter(pk=bm_id).first()
                if bm:
                    manager_name = bm.name
            except Exception:
                pass

        conversation = Conversation.objects.create(
            branch=branch,
            manager=user,
            manager_name=manager_name,
            subject=subject,
            priority=priority,
            is_seen_by_owner=False,
            is_seen_by_manager=True,
        )

        sender_role = 'Branch Manager' if hasattr(user, 'profile') and user.profile.role == 'MANAGER' or user.username.startswith('bm_') else 'Owner'

        ConversationMessage.objects.create(
            conversation=conversation,
            sender=user,
            sender_name=manager_name,
            sender_role=sender_role,
            message=message_text,
            is_seen=True,
            seen_at=timezone.now(),
        )

        # Notify Owner
        try:
            p_label = priority.upper()
            Notification.objects.create(
                type=Notification.TYPE_OWNER_MESSAGE,
                target_role=Notification.TARGET_ADMIN,
                branch=branch,
                sender=user,
                conversation=conversation,
                title=f'[{p_label}] {subject}',
                message=f'Message from {manager_name} ({branch.name}): {message_text}',
            )
        except Exception as e:
            print("Failed to create owner notification:", e)

        serializer = self.get_serializer(conversation)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get', 'post'], url_path='messages')
    def messages(self, request, pk=None):
        conversation = self.get_object()
        user = request.user

        if request.method == 'GET':
            # Auto-mark messages as seen by recipient
            if user and user.is_authenticated:
                is_owner = user.is_superuser or (hasattr(user, 'profile') and user.profile.role == 'ADMIN')
                if is_owner:
                    conversation.is_seen_by_owner = True
                    conversation.save(update_fields=['is_seen_by_owner'])
                    conversation.messages.filter(is_seen=False).update(is_seen=True, seen_at=timezone.now())
                else:
                    conversation.is_seen_by_manager = True
                    conversation.save(update_fields=['is_seen_by_manager'])
                    conversation.messages.filter(is_seen=False).exclude(sender=user).update(is_seen=True, seen_at=timezone.now())

            messages_qs = conversation.messages.all().order_by('created_at')
            return Response(ConversationMessageSerializer(messages_qs, many=True).data)

        elif request.method == 'POST':
            # Reply to thread
            message_text = str(request.data.get('message') or '').strip()
            if not message_text:
                return Response({'detail': 'Message content is required.'}, status=status.HTTP_400_BAD_REQUEST)

            is_owner = user.is_superuser or (hasattr(user, 'profile') and user.profile.role == 'ADMIN')
            sender_role = 'Owner' if is_owner else 'Branch Manager'
            sender_name = user.get_full_name() or user.username
            if not is_owner and user.username.startswith('bm_'):
                try:
                    bm_id = int(user.username.split('_')[1])
                    from accounts.models import BranchManager
                    bm = BranchManager.objects.filter(pk=bm_id).first()
                    if bm:
                        sender_name = bm.name
                except Exception:
                    pass

            msg = ConversationMessage.objects.create(
                conversation=conversation,
                sender=user,
                sender_name=sender_name,
                sender_role=sender_role,
                message=message_text,
                is_seen=False,
            )

            # Update conversation timestamps & unread states
            conversation.last_message_at = timezone.now()
            if is_owner:
                conversation.is_seen_by_manager = False
                conversation.is_seen_by_owner = True
            else:
                conversation.is_seen_by_owner = False
                conversation.is_seen_by_manager = True
            conversation.save()

            # Create notification for reply
            try:
                if is_owner:
                    # Notify ONLY the specific original Branch Manager
                    Notification.objects.create(
                        type=Notification.TYPE_OWNER_REPLY,
                        target_role=Notification.TARGET_USER,
                        recipient=conversation.manager,
                        branch=conversation.branch,
                        sender=user,
                        conversation=conversation,
                        title=f'Owner Reply: {conversation.subject}',
                        message=f'Owner replied: {message_text}',
                    )
                else:
                    # Notify Owner
                    Notification.objects.create(
                        type=Notification.TYPE_OWNER_MESSAGE,
                        target_role=Notification.TARGET_ADMIN,
                        branch=conversation.branch,
                        sender=user,
                        conversation=conversation,
                        title=f'Manager Reply: {conversation.subject}',
                        message=f'{sender_name} ({conversation.branch.name}) replied: {message_text}',
                    )
            except Exception:
                pass

            return Response(ConversationMessageSerializer(msg).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='mark_seen')
    def mark_seen(self, request, pk=None):
        conversation = self.get_object()
        user = request.user
        is_owner = user.is_superuser or (hasattr(user, 'profile') and user.profile.role == 'ADMIN')

        if is_owner:
            conversation.is_seen_by_owner = True
            conversation.save(update_fields=['is_seen_by_owner'])
            conversation.messages.filter(is_seen=False).update(is_seen=True, seen_at=timezone.now())
        else:
            conversation.is_seen_by_manager = True
            conversation.save(update_fields=['is_seen_by_manager'])
            conversation.messages.filter(is_seen=False).exclude(sender=user).update(is_seen=True, seen_at=timezone.now())

        return Response({'status': 'seen', 'conversation_id': conversation.id})
