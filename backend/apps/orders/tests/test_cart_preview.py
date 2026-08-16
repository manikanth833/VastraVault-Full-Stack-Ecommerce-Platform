from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from apps.orders.models import Cart, CartItem, Coupon
from apps.products.models import Category, Inventory, Product, ProductVariant


User = get_user_model()


class CartPreviewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(email="buyer@example.com", password="StrongPass123!")
        self.client.force_authenticate(user=self.user)

        category = Category.objects.create(name="Silk", slug="silk")
        product = Product.objects.create(
            category=category,
            seller=self.user,
            name="Heritage Silk Saree",
            slug="heritage-silk-saree",
            description="Test product",
            base_price=Decimal("1000.00"),
        )
        self.variant = ProductVariant.objects.create(
            product=product,
            sku="HS-001",
            color="Red",
            size="Free Size",
        )
        Inventory.objects.create(variant=self.variant, stock_qty=10)
        self.cart = Cart.objects.create(user=self.user)
        CartItem.objects.create(cart=self.cart, variant=self.variant, quantity=1)
        self.url = reverse("cart-preview")

    def test_preview_with_valid_coupon_returns_real_totals(self):
        Coupon.objects.create(
            code="WELCOME10",
            discount_type="PERCENTAGE",
            value=Decimal("10.00"),
            min_purchase=Decimal("0.00"),
            end_date=timezone.now() + timedelta(days=1),
        )

        response = self.client.get(self.url, {"coupon_code": "WELCOME10"})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(float(response.data["subtotal"]), 1000.0)
        self.assertEqual(float(response.data["discount_amount"]), 100.0)
        self.assertEqual(float(response.data["tax"]), 108.0)
        self.assertEqual(float(response.data["shipping"]), 150.0)
        self.assertEqual(float(response.data["total"]), 1158.0)

    def test_preview_rejects_expired_coupon(self):
        Coupon.objects.create(
            code="OLD10",
            discount_type="PERCENTAGE",
            value=Decimal("10.00"),
            min_purchase=Decimal("0.00"),
            end_date=timezone.now() - timedelta(days=1),
        )

        response = self.client.get(self.url, {"coupon_code": "OLD10"})

        self.assertEqual(response.status_code, 400)
        self.assertIn("Invalid or expired", response.data["error"])

    def test_preview_rejects_coupon_below_min_purchase(self):
        Coupon.objects.create(
            code="BIGBUY",
            discount_type="FLAT",
            value=Decimal("500.00"),
            min_purchase=Decimal("2000.00"),
            end_date=timezone.now() + timedelta(days=1),
        )

        response = self.client.get(self.url, {"coupon_code": "BIGBUY"})

        self.assertEqual(response.status_code, 400)
        self.assertIn("minimum purchase", response.data["error"].lower())

    def test_preview_without_coupon_returns_zero_discount(self):
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(float(response.data["discount_amount"]), 0.0)
        self.assertEqual(float(response.data["total"]), 1270.0)
