from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.products.models import Category, Inventory, Product, ProductVariant
from apps.products.serializers import ProductVariantSerializer


User = get_user_model()


class ProductVariantSerializerTests(TestCase):
    def test_variant_serializer_exposes_product_name_and_slug(self):
        seller = User.objects.create_user(email="seller@example.com", password="StrongPass123!")
        category = Category.objects.create(name="Silk", slug="silk")
        product = Product.objects.create(
            category=category,
            seller=seller,
            name="Banarasi Weave",
            slug="banarasi-weave",
            description="Test product",
            base_price=Decimal("2500.00"),
        )
        variant = ProductVariant.objects.create(
            product=product,
            sku="BAN-001",
            color="Crimson",
            size="Free Size",
        )
        Inventory.objects.create(variant=variant, stock_qty=8)

        data = ProductVariantSerializer(variant).data

        self.assertEqual(data["product_name"], "Banarasi Weave")
        self.assertEqual(data["product_slug"], "banarasi-weave")
