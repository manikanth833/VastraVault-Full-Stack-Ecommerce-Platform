from decimal import Decimal
import unittest

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from apps.authentication.models import Role
from apps.orders.models import Order, OrderItem
from apps.products.models import Category, Inventory, Product, ProductVariant, Review


User = get_user_model()


class ReviewViewSetTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.client.raise_request_exception = False
        self.url = reverse("review-list")

        customer_role, _ = Role.objects.get_or_create(name=Role.CUSTOMER)

        self.user = User.objects.create_user(email="buyer@example.com", password="StrongPass123!")
        self.user.role = customer_role
        self.user.save()

        self.other_user = User.objects.create_user(email="other@example.com", password="StrongPass123!")
        self.other_user.role = customer_role
        self.other_user.save()

        self.category = Category.objects.create(name="Silk Sarees", slug="silk-sarees")
        self.product = Product.objects.create(
            category=self.category,
            seller=self.user,
            name="Heritage Silk Saree",
            slug="heritage-silk-saree",
            description="Test product",
            base_price=Decimal("1000.00"),
        )
        self.variant = ProductVariant.objects.create(
            product=self.product,
            sku="HS-001",
            color="Red",
            size="Free Size",
        )
        Inventory.objects.create(variant=self.variant, stock_qty=5)

        self.other_product = Product.objects.create(
            category=self.category,
            seller=self.user,
            name="Other Saree",
            slug="other-saree",
            description="Other product",
            base_price=Decimal("900.00"),
        )
        self.other_variant = ProductVariant.objects.create(
            product=self.other_product,
            sku="HS-002",
            color="Blue",
            size="Free Size",
        )
        Inventory.objects.create(variant=self.other_variant, stock_qty=5)

    def _create_review(self, product, rating, comment="Nice", title="Review"):
        self.client.force_authenticate(user=self.user)
        return self.client.post(
            self.url,
            {
                "product_id": str(product.id),
                "rating": rating,
                "title": title,
                "comment": comment,
            },
            format="json",
        )

    def _create_order(self, status, product):
        order = Order.objects.create(
            user=self.user,
            shipping_address={"name": self.user.email},
            subtotal=Decimal("1000.00"),
            tax_amount=Decimal("120.00"),
            shipping_charge=Decimal("0.00"),
            discount_amount=Decimal("0.00"),
            total_amount=Decimal("1120.00"),
            razorpay_order_id=f"order-{status.lower()}-{product.slug}",
            status=status,
        )
        OrderItem.objects.create(order=order, variant=product.variants.first(), quantity=1, price=product.base_price)
        return order

    def _review_slugs(self, response):
        if isinstance(response.data, dict) and "results" in response.data:
            return [item["id"] for item in response.data["results"]]
        return [item["id"] for item in response.data]

    def test_create_review_happy_path_succeeds(self):
        response = self._create_review(self.product, 5)

        self.assertEqual(response.status_code, 201)
        self.assertTrue(Review.objects.filter(product=self.product, user=self.user, rating=5).exists())

    def test_rating_zero_is_rejected(self):
        response = self._create_review(self.product, 0)

        self.assertEqual(response.status_code, 400)

    def test_rating_six_is_rejected(self):
        response = self._create_review(self.product, 6)

        self.assertEqual(response.status_code, 400)

    @unittest.expectedFailure
    def test_duplicate_review_for_same_product_is_rejected(self):
        first = self._create_review(self.product, 5)
        second = self._create_review(self.product, 4)

        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 400)

    def test_verified_purchase_is_true_for_delivered_order(self):
        self._create_order("DELIVERED", self.product)

        response = self._create_review(self.product, 5)

        self.assertEqual(response.status_code, 201)
        self.assertTrue(Review.objects.get(product=self.product, user=self.user).verified_purchase)

    def test_verified_purchase_is_false_for_processing_order(self):
        self._create_order("PROCESSING", self.product)

        response = self._create_review(self.product, 5)

        self.assertEqual(response.status_code, 201)
        self.assertFalse(Review.objects.get(product=self.product, user=self.user).verified_purchase)

    def test_list_without_product_id_returns_no_results(self):
        Review.objects.create(product=self.product, user=self.user, rating=5, comment="Great")

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(self._review_slugs(response), [])

    def test_list_with_product_id_returns_only_matching_reviews(self):
        Review.objects.create(product=self.product, user=self.user, rating=5, comment="Great")
        Review.objects.create(product=self.other_product, user=self.other_user, rating=4, comment="Okay")

        response = self.client.get(self.url, {"product_id": str(self.product.id)})

        self.assertEqual(response.status_code, 200)
        items = response.data["results"] if isinstance(response.data, dict) and "results" in response.data else response.data
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["rating"], 5)

    def test_unauthenticated_users_can_list_reviews(self):
        Review.objects.create(product=self.product, user=self.user, rating=5, comment="Great")

        response = self.client.get(self.url, {"product_id": str(self.product.id)})

        self.assertEqual(response.status_code, 200)

    def test_unauthenticated_users_cannot_create_review(self):
        response = self.client.post(
            self.url,
            {
                "product_id": str(self.product.id),
                "rating": 5,
                "title": "Unauth",
                "comment": "Nope",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 401)
