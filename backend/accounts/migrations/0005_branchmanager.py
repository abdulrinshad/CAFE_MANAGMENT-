import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0004_branch_userprofile_branch_waiter_branch'),
    ]

    operations = [
        migrations.CreateModel(
            name='BranchManager',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=120)),
                ('manager_id', models.CharField(max_length=50, unique=True)),
                ('pin_hash', models.CharField(max_length=128)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('branch', models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='manager',
                    to='accounts.branch',
                )),
            ],
            options={
                'verbose_name': 'Branch Manager',
                'verbose_name_plural': 'Branch Managers',
                'ordering': ['name'],
            },
        ),
    ]
