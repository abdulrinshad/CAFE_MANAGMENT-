"""
URL routing for the menu app.

All endpoints under /api/v1/:

  Categories:
    GET/POST       /categories/
    GET/PUT/PATCH/DELETE /categories/{id}/

  Products:
    GET/POST       /products/
    GET/PUT/PATCH/DELETE /products/{id}/
    PATCH          /products/{id}/set_availability/
    PATCH          /products/{id}/set_popular/

  Tables:
    GET/POST       /tables/
    GET/PUT/PATCH/DELETE /tables/{id}/
    PATCH          /tables/{id}/set_status/
    PATCH          /tables/{id}/set_active/

  QR Codes:
    GET/POST       /qrcodes/
    GET/PATCH/DELETE /qrcodes/{id}/
    PATCH          /qrcodes/{id}/set_status/
    POST           /qrcodes/{id}/regenerate/
    GET            /qrcodes/{id}/download/
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CategoryViewSet, ProductViewSet, TableViewSet, QRCodeViewSet, WaiterRequestViewSet

router = DefaultRouter()
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'products',   ProductViewSet,  basename='product')
router.register(r'tables',     TableViewSet,    basename='table')
router.register(r'qrcodes',    QRCodeViewSet,   basename='qrcode')
router.register(r'requests',   WaiterRequestViewSet, basename='waiterrequest')

urlpatterns = [
    path('', include(router.urls)),
]

