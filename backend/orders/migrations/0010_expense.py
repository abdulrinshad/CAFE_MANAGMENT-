import django.core.validators
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0005_branchmanager'),
        ('orders', '0009_order_branch'),
    ]

    operations = [
        migrations.CreateModel(
            name='Expense',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=200)),
                ('category', models.CharField(
                    choices=[
                        ('rent', 'Rent'),
                        ('utilities', 'Utilities'),
                        ('salaries', 'Salaries'),
                        ('supplies', 'Supplies'),
                        ('maintenance', 'Maintenance'),
                        ('marketing', 'Marketing'),
                        ('equipment', 'Equipment'),
                        ('food_cost', 'Food Cost'),
                        ('other', 'Other'),
                    ],
                    default='other',
                    max_length=50,
                )),
                ('amount', models.DecimalField(
                    decimal_places=2,
                    max_digits=12,
                    validators=[django.core.validators.MinValueValidator(0)],
                )),
                ('date', models.DateField()),
                ('description', models.TextField(blank=True, default='')),
                ('status', models.CharField(
                    choices=[
                        ('approved', 'Approved'),
                        ('pending', 'Pending'),
                        ('rejected', 'Rejected'),
                    ],
                    default='approved',
                    max_length=20,
                )),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('branch', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='expenses',
                    to='accounts.branch',
                )),
            ],
            options={
                'verbose_name': 'Expense',
                'verbose_name_plural': 'Expenses',
                'ordering': ['-date', '-created_at'],
            },
        ),
    ]
