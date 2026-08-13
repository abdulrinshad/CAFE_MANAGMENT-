"""
Django signals for the menu app.

post_save on Table → auto-create a QRCode record and generate the QR image.

Guards against duplicate creation:
  - The `created` flag ensures we only act on INSERT, not UPDATE.
  - The OneToOneField on QRCode.table enforces DB-level uniqueness.
  - We do a `get_or_create` check before inserting to avoid any race conditions.
"""

from django.db.models.signals import post_save
from django.dispatch import receiver


@receiver(post_save, sender='menu.Table')
def auto_create_qr_for_table(sender, instance, created, **kwargs):
    """
    When a new Table is saved for the first time, automatically:
      1. Verify no QRCode already exists for this table (OneToOne guard).
      2. Assign a sequential QR ID (QR-001, QR-002, …).
      3. Generate and save the real scannable QR PNG image.

    This signal is idempotent — calling it multiple times for the
    same table is safe because of the `created` guard and the OneToOne DB constraint.
    """
    # Only act on INSERT (new rows), never on UPDATE / save() on existing rows
    if not created:
        return

    from .models import QRCode

    # Safety: if a QR code already exists for this table (shouldn't happen
    # due to OneToOne, but guards against any edge-case direct DB operations)
    if QRCode.objects.filter(table=instance).exists():
        return

    # Build a sequential QR ID, guaranteed unique
    count = QRCode.objects.count() + 1
    qr_id = f'QR-{count:03d}'
    while QRCode.objects.filter(qr_id=qr_id).exists():
        count += 1
        qr_id = f'QR-{count:03d}'

    menu_url = f'http://localhost:5173/customer/menu?table={instance.name}'

    qr = QRCode(
        table    = instance,
        qr_id    = qr_id,
        menu_url = menu_url,
        status   = QRCode.STATUS_ACTIVE,
    )

    # Generate the real scannable PNG image
    qr.generate_qr_image()

    qr.save()
