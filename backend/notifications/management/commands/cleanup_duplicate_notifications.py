import argparse
from django.core.management.base import BaseCommand
from django.db import transaction
from notifications.models import Notification

class Command(BaseCommand):
    help = 'Identifies and optionally cleans up duplicate notification/request records.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--commit',
            action='store_true',
            help='Actually delete/dismiss duplicate records from the database.',
        )

    def handle(self, *args, **options):
        commit = options['commit']
        self.stdout.write(self.style.WARNING(f"Dry-run mode: {'OFF' if commit else 'ON'}"))

        # Find duplicate notifications for orders (same order + type)
        # Keep the earliest notification and mark others as duplicates
        duplicates_to_remove = []
        
        # We look at all active notifications
        active_notifs = Notification.objects.exclude(status__in=['completed', 'dismissed']).order_by('created_at')
        
        seen_order_types = set()  # (order_id, type)
        seen_table_types = set()  # (table_id, type, title)

        for notif in active_notifs:
            if notif.order_id:
                key = (notif.order_id, notif.type)
                if key in seen_order_types:
                    duplicates_to_remove.append(notif)
                else:
                    seen_order_types.add(key)
            elif notif.table_id:
                key = (notif.table_id, notif.type, notif.title)
                if key in seen_table_types:
                    duplicates_to_remove.append(notif)
                else:
                    seen_table_types.add(key)

        if not duplicates_to_remove:
            self.stdout.write(self.style.SUCCESS("No duplicate active notifications found."))
            return

        self.stdout.write(self.style.WARNING(f"Found {len(duplicates_to_remove)} duplicate active notification(s):"))
        for d in duplicates_to_remove:
            self.stdout.write(
                f"- ID {d.id} | Type: {d.type} | Order: {d.order.order_number if d.order else 'N/A'} | Table: {d.table.name if d.table else 'N/A'} | Created: {d.created_at}"
            )

        if commit:
            with transaction.atomic():
                ids = [d.id for d in duplicates_to_remove]
                Notification.objects.filter(id__in=ids).delete()
            self.stdout.write(self.style.SUCCESS(f"Successfully deleted {len(duplicates_to_remove)} duplicate records."))
        else:
            self.stdout.write(self.style.NOTICE("Run with --commit to actually remove them."))
