from django.db import migrations

def cleanup_demo_data(apps, schema_editor):
    Product = apps.get_model('menu', 'Product')
    Category = apps.get_model('menu', 'Category')

    # Unwanted product names (normalized case-insensitive/whitespace matches)
    unwanted_products = [
        'expresso latte',
        'espresso latte',
        'falooda',
        'vanilla icecream',
        'vanila icecream',
        'vanilla ice cream'
    ]

    for name in unwanted_products:
        # Delete matching products
        Product.objects.filter(name__iexact=name).delete()
        # Also clean up minor variations
        Product.objects.filter(name__icontains=name.strip()).delete()

    # Unwanted category names
    unwanted_categories = [
        'bevarages'
    ]

    for name in unwanted_categories:
        Category.objects.filter(name__iexact=name).delete()
        Category.objects.filter(name__icontains=name.strip()).delete()

def reverse_cleanup(apps, schema_editor):
    pass

class Migration(migrations.Migration):

    dependencies = [
        ('menu', '0008_category_branch'),
    ]

    operations = [
        migrations.RunPython(cleanup_demo_data, reverse_cleanup),
    ]
