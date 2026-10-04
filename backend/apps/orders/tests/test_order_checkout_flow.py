import hmac
import hashlib
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework.test import APIClient

from apps.orders.models import Address, Cart, CartItem, Order, OrderItem
from apps.payments.models import Payment
from apps.products.models import Category, Inventory, Product, ProductVariant


User = get_user_model()


@override_settings(DEBUG=False, RAZORPAY_KEY_SECRET="test-secret")
class OrderCheckoutFlowTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(email="buyer@example.com", password="StrongPass123!")
        self.client.force_authenticate(user=self.user)
        self.order_url = reverse("order-list")
        self.verify_url = reverse("payment-verify")

        self.category = Category.objects.create(name="Silk", slug="silk")
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
        self.inventory = Inventory.objects.create(variant=self.variant, stock_qty=5, low_stock_threshold=1)
        self.cart = Cart.objects.create(user=self.user)
        self.address = Address.objects.create(
            user=self.user,
            name="Buyer",
            phone="9876543210",
            address_line_1="123 Main Street",
            city="Kolkata",
            state="West Bengal",
            pin_code="700001",
            address_type="HOME",
            is_default=True,
        )

    def _signature(self, order_id, payment_id):
        msg = f"{order_id}|{payment_id}".encode("utf-8")
        return hmac.new(b"test-secret", msg, hashlib.sha256).hexdigest()

    def _create_order(self, quantity=2):
        CartItem.objects.create(cart=self.cart, variant=self.variant, quantity=quantity)
        response = self.client.post(
            self.order_url,
            {"address_id": str(self.address.id)},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        return response.data

    def _verify_payment(self, order_data, payment_id, signature=None):
        return self.client.post(
            self.verify_url,
            {
                "razorpay_order_id": order_data["razorpay_order_id"],
                "razorpay_payment_id": payment_id,
                "razorpay_signature": signature or self._signature(order_data["razorpay_order_id"], payment_id),
            },
            format="json",
        )

    def test_order_creation_leaves_stock_and_cart_untouched(self):
        order_data = self._create_order()

        self.inventory.refresh_from_db()
        self.assertEqual(self.inventory.stock_qty, 5)
        self.assertEqual(self.cart.items.count(), 1)
        self.assertEqual(Order.objects.get(id=order_data["id"]).status, "PENDING")

    @override_settings(
        DEBUG=False,
        RAZORPAY_KEY_ID="rzp_test_valid",
        RAZORPAY_KEY_SECRET="test-secret",
    )
    def test_successful_razorpay_order_creation_uses_gateway_order_id(self):
        from unittest.mock import Mock, patch

        razorpay_client = Mock()
        razorpay_client.order.create.return_value = {"id": "order_live_123"}

        with patch("apps.orders.views.razorpay_client", razorpay_client):
            order_data = self._create_order()

        self.assertEqual(order_data["razorpay_order_id"], "order_live_123")
        razorpay_client.order.create.assert_called_once()

    @override_settings(
        DEBUG=False,
        RAZORPAY_KEY_ID="rzp_test_invalid",
        RAZORPAY_KEY_SECRET="invalid-secret",
    )
    def test_failed_razorpay_order_creation_does_not_create_mock_order(self):
        from unittest.mock import Mock, patch

        CartItem.objects.create(cart=self.cart, variant=self.variant, quantity=2)
        razorpay_client = Mock()
        razorpay_client.order.create.side_effect = RuntimeError("gateway unavailable")

        with patch("apps.orders.views.razorpay_client", razorpay_client):
            response = self.client.post(
                self.order_url,
                {"address_id": str(self.address.id)},
                format="json",
            )

        self.assertEqual(response.status_code, 502)
        self.assertIn("Unable to create a Razorpay order.", response.data["error"])
        self.assertEqual(Order.objects.count(), 0)
        self.assertTrue(self.cart.items.exists())

    @override_settings(DEBUG=True, RAZORPAY_KEY_ID="", RAZORPAY_KEY_SECRET="")
    def test_debug_without_credentials_uses_mock_order(self):
        from unittest.mock import patch

        with patch("apps.orders.views.razorpay_client", None):
            order_data = self._create_order()

        self.assertTrue(order_data["razorpay_order_id"].startswith("order_mock_"))

    @override_settings(DEBUG=False, RAZORPAY_KEY_ID="", RAZORPAY_KEY_SECRET="")
    def test_production_without_credentials_does_not_use_mock_order(self):
        CartItem.objects.create(cart=self.cart, variant=self.variant, quantity=2)
        response = self.client.post(
            self.order_url,
            {"address_id": str(self.address.id)},
            format="json",
        )

        self.assertEqual(response.status_code, 502)
        self.assertIn("Razorpay credentials are not configured.", response.data["error"])
        self.assertEqual(Order.objects.count(), 0)

    def test_failed_payment_then_retry_keeps_cart_until_success(self):
        order_data = self._create_order()

        failed = self._verify_payment(order_data, "pay_fail_1", signature="bad-signature")
        self.assertEqual(failed.status_code, 400)

        order = Order.objects.get(id=order_data["id"])
        order.refresh_from_db()
        self.inventory.refresh_from_db()
        self.assertEqual(order.status, "PENDING")
        self.assertEqual(self.cart.items.count(), 1)
        self.assertEqual(self.inventory.stock_qty, 5)
        self.assertEqual(Payment.objects.filter(order=order).count(), 1)
        self.assertEqual(Payment.objects.get(order=order).status, "FAILED")

        from unittest.mock import patch

        with patch("apps.orders.tasks.send_order_confirmation_email.delay"), patch("apps.orders.tasks.send_low_stock_alert_email.delay"):
            success = self._verify_payment(order_data, "pay_success_1")

        self.assertEqual(success.status_code, 200)

        order.refresh_from_db()
        self.inventory.refresh_from_db()
        self.assertEqual(order.status, "PROCESSING")
        self.assertEqual(self.cart.items.count(), 0)
        self.assertEqual(self.inventory.stock_qty, 3)
        self.assertFalse(order.requires_manual_review)

    def test_payment_success_decrements_stock_and_clears_cart(self):
        order_data = self._create_order()

        from unittest.mock import patch

        with patch("apps.orders.tasks.send_order_confirmation_email.delay"), patch("apps.orders.tasks.send_low_stock_alert_email.delay"):
            response = self._verify_payment(order_data, "pay_success_2")

        self.assertEqual(response.status_code, 200)
        order = Order.objects.get(id=order_data["id"])
        order.refresh_from_db()
        self.inventory.refresh_from_db()
        self.assertEqual(order.status, "PROCESSING")
        self.assertEqual(self.inventory.stock_qty, 3)
        self.assertEqual(self.cart.items.count(), 0)
        self.assertEqual(Payment.objects.filter(order=order, status="SUCCESS").count(), 1)

    def test_oversell_does_not_complete_order_or_consume_remaining_stock(self):
        order_data = self._create_order(quantity=3)
        self.inventory.stock_qty = 1
        self.inventory.save(update_fields=["stock_qty", "updated_at"])

        from unittest.mock import patch

        with patch("apps.orders.tasks.send_order_confirmation_email.delay"), patch("apps.orders.tasks.send_low_stock_alert_email.delay") as stock_alert_mock:
            response = self._verify_payment(order_data, "pay_oversell_1")

        self.assertEqual(response.status_code, 400)
        order = Order.objects.get(id=order_data["id"])
        order.refresh_from_db()
        self.inventory.refresh_from_db()
        self.assertEqual(order.status, "PENDING")
        self.assertTrue(order.requires_manual_review)
        self.assertEqual(self.inventory.stock_qty, 1)
        self.assertEqual(self.cart.items.count(), 1)
        stock_alert_mock.assert_not_called()

    def test_competing_paid_orders_cannot_consume_same_remaining_stock(self):
        first_order_data = self._create_order(quantity=1)
        first_order = Order.objects.get(id=first_order_data["id"])
        second_order = Order.objects.create(
            user=self.user,
            shipping_address=first_order.shipping_address,
            subtotal=first_order.subtotal,
            tax_amount=first_order.tax_amount,
            shipping_charge=first_order.shipping_charge,
            total_amount=first_order.total_amount,
            razorpay_order_id="order_competing_2",
            status="PENDING",
        )
        OrderItem.objects.create(
            order=second_order,
            variant=self.variant,
            quantity=1,
            price=self.variant.final_price,
        )
        self.inventory.stock_qty = 1
        self.inventory.save(update_fields=["stock_qty", "updated_at"])

        from unittest.mock import patch

        with patch("apps.orders.tasks.send_order_confirmation_email.delay"), patch("apps.orders.tasks.send_low_stock_alert_email.delay"):
            first_response = self._verify_payment(first_order_data, "pay_competing_1")
            second_response = self._verify_payment(
                {"razorpay_order_id": second_order.razorpay_order_id},
                "pay_competing_2",
            )

        self.assertEqual(first_response.status_code, 200)
        self.assertEqual(second_response.status_code, 400)
        self.inventory.refresh_from_db()
        second_order.refresh_from_db()
        self.assertEqual(self.inventory.stock_qty, 0)
        self.assertEqual(second_order.status, "PENDING")
        self.assertTrue(second_order.requires_manual_review)
