"""
One-time setup script: create initial category and product seed data
matching the mockData.js entries so the admin panel isn't empty.

Run after migrate:
    python seed_data.py
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from menu.models import Category, Product  # noqa: E402 — must come after django.setup()

# ── Categories ────────────────────────────────────────────────────────────────
CATEGORIES = [
    {'name': 'Coffee',         'icon': 'coffee',  'display_order': 1, 'active': True},
    {'name': 'Tea',            'icon': 'tea',     'display_order': 2, 'active': True},
    {'name': 'Pastries',       'icon': 'pastry',  'display_order': 3, 'active': True},
    {'name': 'Desserts',       'icon': 'dessert', 'display_order': 4, 'active': False},
    {'name': 'Cold Beverages', 'icon': 'cold',    'display_order': 5, 'active': True},
]

# ── Products ──────────────────────────────────────────────────────────────────
PRODUCTS = [
    {
        'name':            'Signature Espresso',
        'category_name':   'Coffee',
        'price':           250,
        'tax':             0,
        'description':     'A bold, rich espresso made from single-origin Ethiopian beans with a smooth, velvety crema.',
        'available':       True,
        'popular':         True,
        'sold_out':        False,
        'available_on_pos': True,
        'available_on_qr': True,
        'display_order':   1,
        'dietary_tags':    ['Vegan', 'Gluten-Free'],
    },
    {
        'name':            'Almond Croissant',
        'category_name':   'Pastries',
        'price':           320,
        'tax':             5,
        'description':     'Golden flaky croissant filled with almond cream and topped with toasted almond flakes.',
        'available':       True,
        'popular':         False,
        'sold_out':        False,
        'available_on_pos': True,
        'available_on_qr': True,
        'display_order':   2,
        'dietary_tags':    ['Contains Nuts'],
    },
    {
        'name':            'Iced Matcha Latte',
        'category_name':   'Cold Beverages',
        'price':           400,
        'tax':             0,
        'description':     'Premium ceremonial grade matcha blended with oat milk over ice. Earthy, creamy, refreshing.',
        'available':       False,
        'popular':         False,
        'sold_out':        True,
        'available_on_pos': False,
        'available_on_qr': False,
        'display_order':   3,
        'dietary_tags':    ['Vegan', 'Gluten-Free'],
    },
    {
        'name':            'Espresso Macchiato',
        'category_name':   'Coffee',
        'price':           210,
        'tax':             0,
        'description':     'A traditional double shot of espresso marked with a small amount of steamed milk and light foam.',
        'available':       True,
        'popular':         True,
        'sold_out':        False,
        'available_on_pos': True,
        'available_on_qr': True,
        'display_order':   4,
        'dietary_tags':    [],
    },
    {
        'name':            'Cold Brew',
        'category_name':   'Cold Beverages',
        'price':           280,
        'tax':             0,
        'description':     'Slow-steeped for 18 hours, our cold brew delivers a smooth, bold flavour with natural sweetness.',
        'available':       True,
        'popular':         False,
        'sold_out':        False,
        'available_on_pos': True,
        'available_on_qr': True,
        'display_order':   5,
        'dietary_tags':    ['Vegan', 'Gluten-Free'],
    },
]


def run():
    print('=== Cafe Manager — Seed Data ===\n')

    # Categories
    print('Creating categories...')
    cat_map = {}
    for data in CATEGORIES:
        cat, created = Category.objects.get_or_create(
            name=data['name'],
            defaults={
                'icon':          data['icon'],
                'display_order': data['display_order'],
                'active':        data['active'],
            }
        )
        cat_map[data['name']] = cat
        status = 'CREATED' if created else 'EXISTS'
        print(f'  [{status}] {cat.name}')

    # Products
    print('\nCreating products...')
    for data in PRODUCTS:
        category = cat_map.get(data['category_name'])
        product, created = Product.objects.get_or_create(
            name=data['name'],
            defaults={
                'category':        category,
                'price':           data['price'],
                'tax':             data['tax'],
                'description':     data['description'],
                'available':       data['available'],
                'popular':         data['popular'],
                'sold_out':        data['sold_out'],
                'available_on_pos': data['available_on_pos'],
                'available_on_qr': data['available_on_qr'],
                'display_order':   data['display_order'],
                'dietary_tags':    data['dietary_tags'],
            }
        )
        status = 'CREATED' if created else 'EXISTS'
        print(f'  [{status}] {product.name} - Rs. {product.price}')

    print(f'\n✅ Done! {Category.objects.count()} categories, {Product.objects.count()} products in database.')


if __name__ == '__main__':
    run()
