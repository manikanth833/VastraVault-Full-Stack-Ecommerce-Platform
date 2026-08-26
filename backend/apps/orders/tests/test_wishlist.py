from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from apps.authentication.models import Role
from apps.orders.models import Wishlist
from apps.products.models import Category, Inventory, Product, ProductVariant


User = get_user_model()


class WishlistViewSetTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = reverse("wishlist-list")

        customer_role, _ = Role.objects.get_or_create(name=Role.CUSTOMER)

        self.user = User.objects.create_user(email="buyer@example.com", password="StrongPass123!")
        self.user.role = customer_role
        self.user.save()

        self.other_user = User.objects.create_user(email="other@example.com", password="StrongPass123!")
        self.other_user.role = customer_role
        self.other_user.save()

        category = Category.objects.create(name="Silk Sarees", slug="silk-sarees")
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
        Inventory.objects.create(variant=self.variant, stock_qty=5)

    def test_add_variant_to_wishlist_returns_201(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.post(self.url, {"variant_id": str(self.variant.id)}, format="json")

        self.assertEqual(response.status_code, 201)
        self.assertEqual(Wishlist.objects.filter(user=self.user, variant=self.variant).count(), 1)

    def test_adding_same_variant_twice_returns_200_without_duplicate_row(self):
        self.client.force_authenticate(user=self.user)

        first = self.client.post(self.url, {"variant_id": str(self.variant.id)}, format="json")
        second = self.client.post(self.url, {"variant_id": str(self.variant.id)}, format="json")

        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(second.data["message"], "Item already in wishlist")
        self.assertEqual(Wishlist.objects.filter(user=self.user, variant=self.variant).count(), 1)

    def test_adding_nonexistent_variant_returns_404(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.post(self.url, {"variant_id": "00000000-0000-0000-0000-000000000000"}, format="json")

        self.assertEqual(response.status_code, 404)

    def test_list_returns_only_authenticated_users_items(self):
        self.client.force_authenticate(user=self.user)
        other_variant = ProductVariant.objects.create(
            product=self.variant.product,
            sku="HS-002",
            color="Blue",
            size="Free Size",
        )
        Inventory.objects.create(variant=other_variant, stock_qty=3)
        Wishlist.objects.create(user=self.user, variant=self.variant)
        Wishlist.objects.create(user=self.other_user, variant=other_variant)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 200)
        items = response.data["results"] if isinstance(response.data, dict) and "results" in response.data else response.data
        self.assertEqual(len(items), 1)
        self.assertEqual(str(items[0]["variant"]), str(self.variant.id))

    def test_remove_item_deletes_row(self):
        self.client.force_authenticate(user=self.user)
        item = Wishlist.objects.create(user=self.user, variant=self.variant)

        response = self.client.delete(reverse("wishlist-detail", kwargs={"pk": str(item.id)}))

        self.assertEqual(response.status_code, 204)
        self.assertFalse(Wishlist.objects.filter(id=item.id).exists())

    def test_removing_another_users_item_returns_404(self):
        self.client.force_authenticate(user=self.user)
        item = Wishlist.objects.create(user=self.other_user, variant=self.variant)

        response = self.client.delete(reverse("wishlist-detail", kwargs={"pk": str(item.id)}))

        self.assertEqual(response.status_code, 404)

    def test_unauthenticated_access_to_wishlist_returns_401(self):
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 401)
