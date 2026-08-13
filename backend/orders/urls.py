"""
URL routing for the orders app.

All endpoints under /api/v1/:

Orders:
  GET/POST        /orders/
  GET/PATCH/DELETE /orders/{id}/
  PATCH            /orders/{id}/set_status/
  POST             /orders/{id}/add_item/
  DELETE           /orders/{id}/remove_item/{item_id}/

Dashboard:
  GET  /dashboard/stats/
  GET  /dashboard/recent-orders/
  GET  /dashboard/best-sellers/
  GET  /dashboard/sales-chart/

Reports:
  GET  /reports/summary/
  GET  /reports/revenue-chart/
  GET  /reports/top-categories/
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
)

router = DefaultRouter()
router.register(r'orders', OrderViewSet, basename='order')

urlpatterns = [
    # Orders CRUD
    path('', include(router.urls)),

    # Dashboard endpoints
    path('dashboard/stats/',         DashboardStatsView.as_view(),        name='dashboard-stats'),
    path('dashboard/recent-orders/', DashboardRecentOrdersView.as_view(), name='dashboard-recent-orders'),
    path('dashboard/best-sellers/',  DashboardBestSellersView.as_view(),  name='dashboard-best-sellers'),
    path('dashboard/sales-chart/',   DashboardSalesChartView.as_view(),   name='dashboard-sales-chart'),

    # Reports endpoints
    path('reports/summary/',         ReportsSummaryView.as_view(),        name='reports-summary'),
    path('reports/revenue-chart/',   ReportsRevenueChartView.as_view(),   name='reports-revenue-chart'),
    path('reports/top-categories/',  ReportsTopCategoriesView.as_view(),  name='reports-top-categories'),
]
