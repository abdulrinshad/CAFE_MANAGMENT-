"""
django-filter FilterSets for the menu app.
"""

import django_filters
from .models import Category, Product


class CategoryFilter(django_filters.FilterSet):
    """Filter categories by active status."""

    active = django_filters.BooleanFilter(field_name='active')
    name   = django_filters.CharFilter(field_name='name', lookup_expr='icontains')

    class Meta:
        model  = Category
        fields = ['active', 'name']


class ProductFilter(django_filters.FilterSet):
    """
    Rich filter set for products — supports filtering by category,
    availability, and feature flags. All filters used by the React
    frontend's filter dropdowns.
    """

    category        = django_filters.NumberFilter(field_name='category__id')
    category_name   = django_filters.CharFilter(field_name='category__name', lookup_expr='iexact')
    available       = django_filters.BooleanFilter(field_name='available')
    sold_out        = django_filters.BooleanFilter(field_name='sold_out')
    popular         = django_filters.BooleanFilter(field_name='popular')
    featured        = django_filters.BooleanFilter(field_name='featured')
    available_on_pos = django_filters.BooleanFilter(field_name='available_on_pos')
    available_on_qr  = django_filters.BooleanFilter(field_name='available_on_qr')

    # Price range filters
    min_price = django_filters.NumberFilter(field_name='price', lookup_expr='gte')
    max_price = django_filters.NumberFilter(field_name='price', lookup_expr='lte')

    class Meta:
        model  = Product
        fields = [
            'category',
            'category_name',
            'available',
            'sold_out',
            'popular',
            'featured',
            'available_on_pos',
            'available_on_qr',
            'min_price',
            'max_price',
        ]
