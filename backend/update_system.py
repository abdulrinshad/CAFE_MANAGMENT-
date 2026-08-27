import os

accounts_models = """
class OwnerSettings(models.Model):
    business_name = models.CharField(max_length=255, default='Artisan Brew')
    owner_name = models.CharField(max_length=255, default='Dilfa')
    email = models.EmailField(default='dilfa@artisanbrew.com')
    phone = models.CharField(max_length=50, default='+91 98765 43200')
    gstin = models.CharField(max_length=100, default='29ARTBR1234F1Z9')
    address = models.TextField(default='Bengaluru, Karnataka')
    website = models.URLField(default='www.artisanbrew.com')
    currency = models.CharField(max_length=10, default='INR')
    
    # Branch settings
    auto_disable_inactive_branches = models.BooleanField(default=False)
    cross_branch_inventory_sharing = models.BooleanField(default=True)
    unified_menu_across_branches = models.BooleanField(default=False)
    
    # User settings
    require_email_verification = models.BooleanField(default=True)
    allow_managers_create_staff = models.BooleanField(default=True)
    allow_managers_view_reports = models.BooleanField(default=False)
    
    # Tax & Billing
    default_tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=5.0)
    service_charge = models.DecimalField(max_digits=5, decimal_places=2, default=0.0)
    invoice_footer_text = models.TextField(default='Thank you for visiting Artisan Brew!')
    
    # Payment Methods
    pm_cash = models.BooleanField(default=True)
    pm_upi = models.BooleanField(default=True)
    pm_card = models.BooleanField(default=True)
    pm_swiggy = models.BooleanField(default=True)
    pm_zomato = models.BooleanField(default=True)
    
    # Notifications
    notif_new_order = models.BooleanField(default=True)
    notif_payment_done = models.BooleanField(default=True)
    notif_low_stock = models.BooleanField(default=True)
    notif_expense_added = models.BooleanField(default=False)
    notif_branch_report = models.BooleanField(default=True)
    notif_email_digest = models.BooleanField(default=False)
    
    # Security
    sec_two_fa = models.BooleanField(default=False)
    sec_login_alerts = models.BooleanField(default=True)
    sec_session_timeout = models.CharField(max_length=50, default='60')

    def save(self, *args, **kwargs):
        self.pk = 1
        super(OwnerSettings, self).save(*args, **kwargs)

    @classmethod
    def load(cls):
        obj, created = cls.objects.get_or_create(pk=1)
        return obj
"""

def append_to_file(filepath, content):
    with open(filepath, 'a') as f:
        f.write('\n' + content + '\n')

append_to_file(r'c:\Projects\Cafe_manager\backend\accounts\models.py', accounts_models)

print("Added OwnerSettings to models.py")
