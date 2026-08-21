import os
import sys
import django

sys.path.insert(0, os.path.abspath('.'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()


from django.db import connection

from menu.models import Category, Product, Table, QRCode, WaiterRequest
from orders.models import Order, OrderItem, Invoice, Payment
from notifications.models import Notification
from accounts.models import UserProfile, Waiter

print("Category count:", Category.objects.count())
print("Product count:", Product.objects.count())
print("Table count:", Table.objects.count())
print("Order count:", Order.objects.count())
print("OrderItem count:", OrderItem.objects.count())
print("Invoice count:", Invoice.objects.count())
print("Payment count:", Payment.objects.count())
print("Notification count:", Notification.objects.count())
print("UserProfile count:", UserProfile.objects.count())
print("Waiter count:", Waiter.objects.count())







