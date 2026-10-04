from decimal import Decimal
import unittest

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from apps.authentication.models import Role
from apps.orders.models import Address, Cart, CartItem, Order, OrderItem
from apps.products.models import Category, Inventory, Product, ProductVariant


User = get_user_model()


class OrderManagementTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        customer_role, _ = Role.objects.get_or_create(name=Role.CUSTOMER)
        seller_role, _ = Role.objects.get_or_create(name=Role.SELLER)
        admin_role, _ = Role.objects.get_or_create(name=Role.ADMIN)

        self.customer = User.objects.create_user(email="buyer@example.com", password="StrongPass123!")
        self.customer.role = customer_role
        self.customer.save()

        self.other_customer = User.objects.create_user(email="other@example.com", password="StrongPass123!")
        self.other_customer.role = customer_role
        self.other_customer.save()

        self.seller_one = User.objects.create_user(email="seller1@example.com", password="StrongPass123!")
        self.seller_one.role = seller_role
        self.seller_one.is_approved_seller = True
        self.seller_one.save()

        self.seller_two = User.objects.create_user(email="seller2@example.com", password="StrongPass123!")
        self.seller_two.role = seller_role
        self.seller_two.is_approved_seller = True
        self.seller_two.save()

        self.admin = User.objects.create_user(email="admin@example.com", password="StrongPass123!")
        self.admin.role = admin_role
        self.admin.is_superuser = True
        self.admin.is_staff = True
        self.admin.save()

        self.category = Category.objects.create(name="Silk Sarees", slug="silk-sarees")

        self.product_one = Product.objects.create(
            category=self.category,
            seller=self.seller_one,
            name="Seller One Saree",
            slug="seller-one-saree",
            description="First seller",
            base_price=Decimal("1000.00"),
        )
        self.variant_one = ProductVariant.objects.create(
            product=self.product_one,
            sku="S1-001",
            color="Red",
            size="Free Size",
        )
        self.inventory_one = Inventory.objects.create(variant=self.variant_one, stock_qty=10)

        self.product_two = Product.objects.create(
            category=self.category,
            seller=self.seller_two,
            name="Seller Two Saree",
            slug="seller-two-saree",
            description="Second seller",
            base_price=Decimal("1500.00"),
        )
        self.variant_two = ProductVariant.objects.create(
            product=self.product_two,
            sku="S2-001",
            color="Blue",
            size="Free Size",
        )
        self.inventory_two = Inventory.objects.create(variant=self.variant_two, stock_qty=10)

        self.customer_cart = Cart.objects.create(user=self.customer)
        self.other_customer_cart = Cart.objects.create(user=self.other_customer)
        self.customer_address = Address.objects.create(
            user=self.customer,
            name="Buyer",
            phone="9876543210",
            address_line_1="123 Main Street",
            city="Kolkata",
            state="West Bengal",
            pin_code="700001",
            address_type="HOME",
            is_default=True,
        )
        self.other_address = Address.objects.create(
            user=self.other_customer,
            name="Other",
            phone="9876543210",
            address_line_1="456 Other Street",
            city="Delhi",
            state="Delhi",
            pin_code="110001",
            address_type="HOME",
            is_default=True,
        )

        self.order_list_url = reverse("order-list")

    def _create_order(self, user, variant_quantities, razorpay_order_id):
        subtotal = Decimal("0.00")
        order = Order.objects.create(
            user=user,
            shipping_address={"name": user.email},
            subtotal=Decimal("0.00"),
            tax_amount=Decimal("0.00"),
            shipping_charge=Decimal("0.00"),
            discount_amount=Decimal("0.00"),
            total_amount=Decimal("0.00"),
            razorpay_order_id=razorpay_order_id,
            status="PENDING",
        )

        for variant, quantity in variant_quantities:
            price = variant.final_price
            subtotal += price * quantity
            OrderItem.objects.create(order=order, variant=variant, quantity=quantity, price=price)

        tax_amount = subtotal * Decimal("0.12")
        total_amount = subtotal + tax_amount
        order.subtotal = subtotal
        order.tax_amount = tax_amount
        order.total_amount = total_amount
        order.save(update_fields=["subtotal", "tax_amount", "total_amount"])
        return order

    def _post_order(self, address_id, coupon_code=None):
        payload = {"address_id": str(address_id)}
        if coupon_code is not None:
            payload["coupon_code"] = coupon_code
        return self.client.post(self.order_list_url, payload, format="json")

    def _result_items(self, response):
        if isinstance(response.data, dict) and "results" in response.data:
            return response.data["results"]
        return response.data

    def test_customer_queryset_only_returns_own_orders(self):
        self._create_order(self.customer, [(self.variant_one, 1)], "order-customer-1")
        self._create_order(self.other_customer, [(self.variant_two, 1)], "order-customer-2")

        self.client.force_authenticate(user=self.customer)
        response = self.client.get(self.order_list_url)

        self.assertEqual(response.status_code, 200)
        items = self._result_items(response)
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["user_email"], self.customer.email)

    def test_seller_queryset_only_returns_orders_containing_their_products(self):
        self._create_order(self.customer, [(self.variant_one, 1)], "order-seller-1")
        self._create_order(self.other_customer, [(self.variant_two, 1)], "order-seller-2")
        self._create_order(self.customer, [(self.variant_one, 1), (self.variant_two, 1)], "order-seller-mixed")

        self.client.force_authenticate(user=self.seller_one)
        response = self.client.get(self.order_list_url)

        self.assertEqual(response.status_code, 200)
        returned_ids = {item["razorpay_order_id"] for item in self._result_items(response)}
        self.assertIn("order-seller-1", returned_ids)
        self.assertIn("order-seller-mixed", returned_ids)
        self.assertNotIn("order-seller-2", returned_ids)

    def test_admin_queryset_returns_all_orders(self):
        self._create_order(self.customer, [(self.variant_one, 1)], "order-admin-1")
        self._create_order(self.other_customer, [(self.variant_two, 1)], "order-admin-2")

        self.client.force_authenticate(user=self.admin)
        response = self.client.get(self.order_list_url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(self._result_items(response)), 2)

    def test_creating_order_with_empty_cart_returns_400(self):
        self.client.force_authenticate(user=self.customer)

        response = self._post_order(self.customer_address.id)

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"], "Cart is empty")

    def test_creating_order_with_other_users_address_returns_404(self):
        CartItem.objects.create(cart=self.customer_cart, variant=self.variant_one, quantity=1)
        self.client.force_authenticate(user=self.customer)

        response = self._post_order(self.other_address.id)

        self.assertEqual(response.status_code, 404)

    def test_creating_order_with_insufficient_stock_rejects_entire_cart(self):
        CartItem.objects.create(cart=self.customer_cart, variant=self.variant_one, quantity=1)
        CartItem.objects.create(cart=self.customer_cart, variant=self.variant_two, quantity=11)
        self.client.force_authenticate(user=self.customer)

        response = self._post_order(self.customer_address.id)

        self.assertEqual(response.status_code, 400)
        self.assertIn(self.variant_two.sku, response.data["error"])
        self.assertEqual(Order.objects.count(), 0)

    def test_customer_update_status_is_rejected(self):
        order = self._create_order(self.customer, [(self.variant_one, 1)], "order-customer-status")
        self.client.force_authenticate(user=self.customer)

        response = self.client.post(
            reverse("order-update-status", kwargs={"pk": str(order.id)}),
            {"status": "PROCESSING"},
            format="json",
        )

        self.assertEqual(response.status_code, 403)

    def test_seller_update_status_rejects_statuses_outside_processing_or_shipped(self):
        order = self._create_order(self.customer, [(self.variant_one, 1)], "order-seller-invalid")
        self.client.force_authenticate(user=self.seller_one)

        response = self.client.post(
            reverse("order-update-status", kwargs={"pk": str(order.id)}),
            {"status": "DELIVERED"},
            format="json",
        )

        self.assertEqual(response.status_code, 403)

    def test_seller_can_update_own_order_to_processing(self):
        order = self._create_order(self.customer, [(self.variant_one, 1)], "order-seller-processing")
        self.client.force_authenticate(user=self.seller_one)

        response = self.client.post(
            reverse("order-update-status", kwargs={"pk": str(order.id)}),
            {"status": "PROCESSING"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        order.refresh_from_db()
        self.assertEqual(order.status, "PROCESSING")

    def test_seller_can_update_own_order_to_shipped(self):
        order = self._create_order(self.customer, [(self.variant_one, 1)], "order-seller-shipped")
        self.client.force_authenticate(user=self.seller_one)

        response = self.client.post(
            reverse("order-update-status", kwargs={"pk": str(order.id)}),
            {"status": "SHIPPED"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        order.refresh_from_db()
        self.assertEqual(order.status, "SHIPPED")

    def test_admin_can_set_any_valid_status(self):
        order = self._create_order(self.customer, [(self.variant_one, 1)], "order-admin-status")
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(
            reverse("order-update-status", kwargs={"pk": str(order.id)}),
            {"status": "CANCELLED"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        order.refresh_from_db()
        self.assertEqual(order.status, "CANCELLED")

    def test_update_status_rejects_invalid_status_string(self):
        order = self._create_order(self.customer, [(self.variant_one, 1)], "order-invalid-status")
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(
            reverse("order-update-status", kwargs={"pk": str(order.id)}),
            {"status": "NOT_A_STATUS"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)

    def test_customer_can_cancel_owned_pending_order(self):
        order = self._create_order(self.customer, [(self.variant_one, 1)], "order-customer-cancel")
        self.client.force_authenticate(user=self.customer)

        response = self.client.post(
            reverse("order-cancel", kwargs={"pk": str(order.id)}),
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        order.refresh_from_db()
        self.assertEqual(order.status, "CANCELLED")

    def test_customer_cannot_cancel_non_pending_order(self):
        order = self._create_order(self.customer, [(self.variant_one, 1)], "order-customer-cancel-status")
        order.status = "PROCESSING"
        order.save(update_fields=["status"])
        self.client.force_authenticate(user=self.customer)

        response = self.client.post(
            reverse("order-cancel", kwargs={"pk": str(order.id)}),
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        order.refresh_from_db()
        self.assertEqual(order.status, "PROCESSING")

    def test_customer_cannot_cancel_another_customers_order(self):
        order = self._create_order(self.customer, [(self.variant_one, 1)], "order-other-customer-cancel")
        self.client.force_authenticate(user=self.other_customer)

        response = self.client.post(
            reverse("order-cancel", kwargs={"pk": str(order.id)}),
            format="json",
        )

        self.assertEqual(response.status_code, 404)

    def test_seller_cannot_update_status_on_order_without_their_products(self):
        order = self._create_order(self.customer, [(self.variant_two, 1)], "order-other-seller")
        self.client.force_authenticate(user=self.seller_one)

        response = self.client.post(
            reverse("order-update-status", kwargs={"pk": str(order.id)}),
            {"status": "PROCESSING"},
            format="json",
        )

        self.assertEqual(response.status_code, 404)
