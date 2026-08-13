"""
URL configuration for Cafe Manager backend.

API routes:
  /admin/          → Django admin panel
  /api/v1/         → REST API (menu, orders, notifications apps)
  /media/<path>    → User-uploaded files (DEBUG only)
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/', include('menu.urls')),
    path('api/v1/', include('orders.urls')),
    path('api/v1/', include('notifications.urls')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
