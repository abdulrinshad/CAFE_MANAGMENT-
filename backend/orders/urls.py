"""
URL routing for the orders app.

All endpoints under /api/v1/:

Orders:
  GET/POST           /orders/
  GET/PATCH/DELETE   /orders/{id}/
  PATCH              /orders/{id}/set_status/
  POST               /orders/{id}/add_item/
  DELETE             /orders/{id}/remove_item/{item_id}/
  PATCH              /orders/{id}/update_item/{item_id}/
  POST               /orders/{id}/generate_bill/
  POST               /orders/{id}/complete_order/
  GET                /orders/{id}/invoice/

Dashboard:
  GET  /dashboard/stats/
  GET  /dashboard/recent-orders/
  GET  /dashboard/best-sellers/
  GET  /dashboard/sales-chart/

Reports:
  GET  /reports/summary/
  GET  /reports/revenue-chart/
  GET  /reports/top-categories/

Public:
  GET  /receipt/{token}/   (no auth)
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    OrderViewSet,
    DashboardStatsView,
    DashboardRecentOrdersView,
    DashboardBestSellersView,
    DashboardSalesChartView,
    ReportsSummaryView,
    ReportsRevenueChartView,
    ReportsTopCategoriesView,
    InvoiceByOrderView,
    PublicReceiptView,
)

router = DefaultRouter()
router.register(r'orders', OrderViewSet, basename='order')

urlpatterns = [
    # Orders CRUD + actions
    path('', include(router.urls)),

    # Invoice for a specific order
    path('orders/<int:order_id>/invoice/', InvoiceByOrderView.as_view(), name='order-invoice'),

    # Dashboard endpoints
    path('dashboard/stats/',         DashboardStatsView.as_view(),        name='dashboard-stats'),
    path('dashboard/recent-orders/', DashboardRecentOrdersView.as_view(), name='dashboard-recent-orders'),
    path('dashboard/best-sellers/',  DashboardBestSellersView.as_view(),  name='dashboard-best-sellers'),
    path('dashboard/sales-chart/',   DashboardSalesChartView.as_view(),   name='dashboard-sales-chart'),

    # Reports endpoints
    path('reports/summary/',         ReportsSummaryView.as_view(),        name='reports-summary'),
    path('reports/revenue-chart/',   ReportsRevenueChartView.as_view(),   name='reports-revenue-chart'),
    path('reports/top-categories/',  ReportsTopCategoriesView.as_view(),  name='reports-top-categories'),

    # Public receipt (no auth)
    path('receipt/<uuid:token>/',    PublicReceiptView.as_view(),         name='public-receipt'),
]
