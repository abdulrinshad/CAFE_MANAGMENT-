import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth.models import User
from accounts.models import Tenant, Branch, BranchManager, Waiter, Cashier, KitchenStaff, POSTerminal, UserProfile
from menu.models import Category, Product, Table
from orders.models import Order, Expense
from notifications.models import Notification, Conversation

def run_migration():
    print("Starting tenant data migration...")
    
    # 1. Get or create default Tenant based on the first superuser or existing admin
    admin_user = User.objects.filter(is_superuser=True).first()
    if not admin_user:
        admin_user = User.objects.filter(profile__role='ADMIN').first()
        
    if not admin_user:
        print("No admin user found. Creating a default admin user.")
        admin_user = User.objects.create_superuser('default_admin', 'admin@example.com', 'adminpass')
        UserProfile.objects.create(user=admin_user, role='ADMIN')

    # Ensure Tenant exists
    tenant, created = Tenant.objects.get_or_create(
        admin_user=admin_user,
        defaults={'name': 'Default Artisan Brew', 'business_code': 'CAFE01'}
    )
    if created:
        print(f"Created default tenant: {tenant.name} (Code: {tenant.business_code})")
    else:
        print(f"Using existing tenant: {tenant.name}")

    # 2. Assign Tenant to all relevant models
    print(f"Assigning {Branch.objects.filter(tenant__isnull=True).count()} Branches...")
    Branch.objects.filter(tenant__isnull=True).update(tenant=tenant)
    
    print(f"Assigning {BranchManager.objects.filter(tenant__isnull=True).count()} Branch Managers...")
    BranchManager.objects.filter(tenant__isnull=True).update(tenant=tenant)

    print(f"Assigning {Waiter.objects.filter(tenant__isnull=True).count()} Waiters...")
    Waiter.objects.filter(tenant__isnull=True).update(tenant=tenant)
    
    print(f"Assigning {Cashier.objects.filter(tenant__isnull=True).count()} Cashiers...")
    Cashier.objects.filter(tenant__isnull=True).update(tenant=tenant)
    
    print(f"Assigning {KitchenStaff.objects.filter(tenant__isnull=True).count()} Kitchen Staff...")
    KitchenStaff.objects.filter(tenant__isnull=True).update(tenant=tenant)
    
    print(f"Assigning {POSTerminal.objects.filter(tenant__isnull=True).count()} POS Terminals...")
    POSTerminal.objects.filter(tenant__isnull=True).update(tenant=tenant)
    
    print(f"Assigning {UserProfile.objects.filter(tenant__isnull=True).count()} User Profiles...")
    UserProfile.objects.filter(tenant__isnull=True).update(tenant=tenant)

    # Menu
    print(f"Assigning {Category.objects.filter(tenant__isnull=True).count()} Categories...")
    Category.objects.filter(tenant__isnull=True).update(tenant=tenant)

    print(f"Assigning {Product.objects.filter(tenant__isnull=True).count()} Products...")
    Product.objects.filter(tenant__isnull=True).update(tenant=tenant)

    print(f"Assigning {Table.objects.filter(tenant__isnull=True).count()} Tables...")
    Table.objects.filter(tenant__isnull=True).update(tenant=tenant)

    # Orders
    print(f"Assigning {Order.objects.filter(tenant__isnull=True).count()} Orders...")
    Order.objects.filter(tenant__isnull=True).update(tenant=tenant)

    print(f"Assigning {Expense.objects.filter(tenant__isnull=True).count()} Expenses...")
    Expense.objects.filter(tenant__isnull=True).update(tenant=tenant)

    # Notifications
    print(f"Assigning {Notification.objects.filter(tenant__isnull=True).count()} Notifications...")
    Notification.objects.filter(tenant__isnull=True).update(tenant=tenant)

    print(f"Assigning {Conversation.objects.filter(tenant__isnull=True).count()} Conversations...")
    Conversation.objects.filter(tenant__isnull=True).update(tenant=tenant)

    print("Data migration completed successfully.")

if __name__ == '__main__':
    run_migration()
