import uuid
from django.db import migrations, models


def gen_uuid(apps, schema_editor):
    Invoice = apps.get_model('orders', 'Invoice')
    for row in Invoice.objects.all():
        row.token = uuid.uuid4()
        row.save(update_fields=['token'])


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0002_order_whatsapp_number_invoice_payment'),
    ]

    operations = [
        # 1. Add token field without unique constraint first
        migrations.AddField(
            model_name='invoice',
            name='token',
            field=models.UUIDField(default=uuid.uuid4, null=True),
        ),
        # 2. Populate unique UUID for every existing row
        migrations.RunPython(gen_uuid, reverse_code=migrations.RunPython.noop),
        # 3. Apply unique constraint and non-nullable configuration
        migrations.AlterField(
            model_name='invoice',
            name='token',
            field=models.UUIDField(default=uuid.uuid4, editable=False, unique=True, help_text='Secure token for public receipt URL'),
        ),
        # 4. Add status field
        migrations.AddField(
            model_name='invoice',
            name='status',
            field=models.CharField(choices=[('unpaid', 'Unpaid'), ('paid', 'Paid'), ('cancelled', 'Cancelled')], default='unpaid', max_length=20),
        ),
        # 5. Add paid_at field
        migrations.AddField(
            model_name='invoice',
            name='paid_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]


