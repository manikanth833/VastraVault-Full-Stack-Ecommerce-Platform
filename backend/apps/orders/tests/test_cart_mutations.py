from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from apps.authentication.models import Role
from apps.orders.models import Cart, CartItem
from apps.products.models import Category, Inventory, Product, ProductVariant


User = get_user_model()


class CartMutationTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        customer_role, _ = Role.objects.get_or_create(name=Role.CUSTOMER)
        seller_role, _ = Role.objects.get_or_create(name=Role.SELLER)

        self.customer = User.objects.create_user(email="buyer@example.com", password="StrongPass123!")
        self.customer.role = customer_role
        self.customer.save()

        self.other_customer = User.objects.create_user(email="other@example.com", password="StrongPass123!")
        self.other_customer.role = customer_role
        self.other_customer.save()

        self.seller = User.objects.create_user(email="seller@example.com", password="StrongPass123!")
        self.seller.role = seller_role
        self.seller.is_approved_seller = True
        self.seller.save()

        self.category = Category.objects.create(name="Silk Sarees", slug="silk-sarees")
        self.product = Product.objects.create(
            category=self.category,
            seller=self.seller,
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
        self.inventory = Inventory.objects.create(variant=self.variant, stock_qty=5, low_stock_threshold=1)

        self.empty_product = Product.objects.create(
            category=self.category,
            seller=self.seller,
            name="Unstocked Saree",
            slug="unstocked-saree",
            description="No inventory row",
            base_price=Decimal("1200.00"),
        )
        self.unstocked_variant = ProductVariant.objects.create(
            product=self.empty_product,
            sku="HS-002",
            color="Blue",
            size="Free Size",
        )

        self.cart_current_url = reverse("cart-current")
        self.add_url = reverse("cart-add-item")
        self.update_url = reverse("cart-update-item")
        self.remove_url = reverse("cart-remove-item")
        self.merge_url = reverse("cart-merge")

    def _guest_token(self):
        response = APIClient().get(self.cart_current_url)
        self.assertEqual(response.status_code, 200)
        self.assertIn("X-Guest-Cart-Token", response)
        return response["X-Guest-Cart-Token"]

    def _guest_client(self, token):
        client = APIClient()
        client.credentials(HTTP_X_GUEST_CART_TOKEN=token)
        return client

    def test_add_item_creates_cart_item_with_requested_quantity(self):
        self.client.force_authenticate(user=self.customer)

        response = self.client.post(self.add_url, {"variant_id": str(self.variant.id), "quantity": 2}, format="json")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(CartItem.objects.filter(cart__user=self.customer, variant=self.variant).count(), 1)
        self.assertEqual(CartItem.objects.get(cart__user=self.customer, variant=self.variant).quantity, 2)

    def test_add_item_accumulates_quantity_for_existing_variant(self):
        self.client.force_authenticate(user=self.customer)

        first = self.client.post(self.add_url, {"variant_id": str(self.variant.id), "quantity": 2}, format="json")
        second = self.client.post(self.add_url, {"variant_id": str(self.variant.id), "quantity": 3}, format="json")

        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 200)
        item = CartItem.objects.get(cart__user=self.customer, variant=self.variant)
        self.assertEqual(item.quantity, 5)
        self.assertEqual(CartItem.objects.filter(cart__user=self.customer, variant=self.variant).count(), 1)

    def test_add_item_rejects_zero_quantity(self):
        self.client.force_authenticate(user=self.customer)

        response = self.client.post(self.add_url, {"variant_id": str(self.variant.id), "quantity": 0}, format="json")

        self.assertEqual(response.status_code, 400)

    def test_add_item_rejects_negative_quantity(self):
        self.client.force_authenticate(user=self.customer)

        response = self.client.post(self.add_url, {"variant_id": str(self.variant.id), "quantity": -1}, format="json")

        self.assertEqual(response.status_code, 400)

    def test_add_item_rejects_non_integer_quantity(self):
        self.client.force_authenticate(user=self.customer)

        response = self.client.post(self.add_url, {"variant_id": str(self.variant.id), "quantity": "abc"}, format="json")

        self.assertEqual(response.status_code, 400)

    def test_add_item_rejects_missing_variant_id(self):
        self.client.force_authenticate(user=self.customer)

        response = self.client.post(self.add_url, {"quantity": 1}, format="json")

        self.assertEqual(response.status_code, 404)

    def test_add_item_rejects_nonexistent_variant_id(self):
        self.client.force_authenticate(user=self.customer)

        response = self.client.post(self.add_url, {"variant_id": "00000000-0000-0000-0000-000000000000", "quantity": 1}, format="json")

        self.assertEqual(response.status_code, 404)

    def test_add_item_rejects_quantity_above_stock(self):
        self.client.force_authenticate(user=self.customer)

        response = self.client.post(self.add_url, {"variant_id": str(self.variant.id), "quantity": 6}, format="json")

        self.assertEqual(response.status_code, 400)
        self.assertIn("5", response.data["error"])

    def test_add_item_allows_quantity_equal_to_available_stock(self):
        self.client.force_authenticate(user=self.customer)

        response = self.client.post(self.add_url, {"variant_id": str(self.variant.id), "quantity": 5}, format="json")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(CartItem.objects.get(cart__user=self.customer, variant=self.variant).quantity, 5)

    def test_add_item_rejects_missing_inventory_row(self):
        self.client.force_authenticate(user=self.customer)

        response = self.client.post(self.add_url, {"variant_id": str(self.unstocked_variant.id), "quantity": 1}, format="json")

        self.assertEqual(response.status_code, 400)

    def test_update_item_changes_quantity(self):
        self.client.force_authenticate(user=self.customer)
        CartItem.objects.create(cart=Cart.objects.create(user=self.customer), variant=self.variant, quantity=2)

        response = self.client.post(self.update_url, {"variant_id": str(self.variant.id), "quantity": 4}, format="json")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(CartItem.objects.get(cart__user=self.customer, variant=self.variant).quantity, 4)

    def test_update_item_rejects_quantity_above_stock(self):
        self.client.force_authenticate(user=self.customer)
        CartItem.objects.create(cart=Cart.objects.create(user=self.customer), variant=self.variant, quantity=2)

        response = self.client.post(self.update_url, {"variant_id": str(self.variant.id), "quantity": 6}, format="json")

        self.assertEqual(response.status_code, 400)
        self.assertIn("5", response.data["error"])

    def test_update_item_returns_404_for_variant_not_in_cart(self):
        self.client.force_authenticate(user=self.customer)

        response = self.client.post(self.update_url, {"variant_id": str(self.variant.id), "quantity": 1}, format="json")

        self.assertEqual(response.status_code, 404)

    def test_update_item_rejects_missing_quantity(self):
        self.client.force_authenticate(user=self.customer)
        CartItem.objects.create(cart=Cart.objects.create(user=self.customer), variant=self.variant, quantity=2)

        response = self.client.post(self.update_url, {"variant_id": str(self.variant.id)}, format="json")

        self.assertEqual(response.status_code, 400)

    def test_update_item_rejects_non_integer_quantity(self):
        self.client.force_authenticate(user=self.customer)
        CartItem.objects.create(cart=Cart.objects.create(user=self.customer), variant=self.variant, quantity=2)

        response = self.client.post(self.update_url, {"variant_id": str(self.variant.id), "quantity": "abc"}, format="json")

        self.assertEqual(response.status_code, 400)

    def test_remove_item_deletes_cart_item(self):
        self.client.force_authenticate(user=self.customer)
        CartItem.objects.create(cart=Cart.objects.create(user=self.customer), variant=self.variant, quantity=2)

        response = self.client.post(self.remove_url, {"variant_id": str(self.variant.id)}, format="json")

        self.assertEqual(response.status_code, 200)
        self.assertFalse(CartItem.objects.filter(cart__user=self.customer, variant=self.variant).exists())

    def test_remove_item_returns_404_for_variant_not_in_cart(self):
        self.client.force_authenticate(user=self.customer)

        response = self.client.post(self.remove_url, {"variant_id": str(self.variant.id)}, format="json")

        self.assertEqual(response.status_code, 404)

    def test_remove_item_twice_returns_404_on_second_call(self):
        self.client.force_authenticate(user=self.customer)
        CartItem.objects.create(cart=Cart.objects.create(user=self.customer), variant=self.variant, quantity=2)

        first = self.client.post(self.remove_url, {"variant_id": str(self.variant.id)}, format="json")
        second = self.client.post(self.remove_url, {"variant_id": str(self.variant.id)}, format="json")

        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 404)

    def test_guest_cart_token_persists_items_across_requests(self):
        token = self._guest_token()
        guest_client = self._guest_client(token)

        add = guest_client.post(self.add_url, {"variant_id": str(self.variant.id), "quantity": 2}, format="json")
        current = guest_client.get(self.cart_current_url)

        self.assertEqual(add.status_code, 200)
        self.assertEqual(current.status_code, 200)
        self.assertEqual(current["X-Guest-Cart-Token"], token)
        self.assertEqual(current.data["items"][0]["quantity"], 2)

    def test_guest_cart_token_survives_multiple_guest_requests(self):
        token = self._guest_token()
        guest_client = self._guest_client(token)

        first = guest_client.post(self.add_url, {"variant_id": str(self.variant.id), "quantity": 1}, format="json")
        second = guest_client.post(self.add_url, {"variant_id": str(self.variant.id), "quantity": 2}, format="json")
        current = guest_client.get(self.cart_current_url)

        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(current["X-Guest-Cart-Token"], token)
        self.assertEqual(current.data["items"][0]["quantity"], 3)

    def test_authenticated_user_cannot_see_or_mutate_another_users_cart(self):
        self.client.force_authenticate(user=self.customer)
        self.client.post(self.add_url, {"variant_id": str(self.variant.id), "quantity": 2}, format="json")

        self.client.force_authenticate(user=self.other_customer)
        current = self.client.get(self.cart_current_url)
        remove = self.client.post(self.remove_url, {"variant_id": str(self.variant.id)}, format="json")

        self.assertEqual(current.status_code, 200)
        self.assertEqual(current.data["items"], [])
        self.assertEqual(remove.status_code, 404)

        self.client.force_authenticate(user=self.customer)
        self.assertTrue(CartItem.objects.filter(cart__user=self.customer, variant=self.variant).exists())

    def test_merge_guest_cart_into_authenticated_cart_clamps_to_available_stock(self):
        token = self._guest_token()
        guest_client = self._guest_client(token)
        guest_client.post(self.add_url, {"variant_id": str(self.variant.id), "quantity": 4}, format="json")

        self.client.force_authenticate(user=self.customer)
        user_cart = Cart.objects.create(user=self.customer)
        CartItem.objects.create(cart=user_cart, variant=self.variant, quantity=4)

        response = self.client.post(self.merge_url, {"guest_token": token}, format="json")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(CartItem.objects.get(cart=user_cart, variant=self.variant).quantity, 5)
        self.assertFalse(Cart.objects.filter(session_key=token).exists())

    def test_merge_with_no_guest_token_returns_400(self):
        self.client.force_authenticate(user=self.customer)

        response = self.client.post(self.merge_url, {}, format="json")

        self.assertEqual(response.status_code, 400)

    def test_merge_by_unauthenticated_user_returns_400(self):
        token = self._guest_token()

        response = self.client.post(self.merge_url, {"guest_token": token}, format="json")

        self.assertEqual(response.status_code, 400)

    def test_merge_nonexistent_guest_token_is_noop(self):
        self.client.force_authenticate(user=self.customer)
        user_cart = Cart.objects.create(user=self.customer)
        CartItem.objects.create(cart=user_cart, variant=self.variant, quantity=2)

        response = self.client.post(self.merge_url, {"guest_token": "missing-token-123"}, format="json")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(CartItem.objects.get(cart=user_cart, variant=self.variant).quantity, 2)

