import hmac
import hashlib
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework.test import APIClient

from apps.orders.models import Address, Cart, CartItem, Order
from apps.payments.models import Payment
from apps.products.models import Category, Inventory, Product, ProductVariant


User = get_user_model()


@override_settings(DEBUG=False, RAZORPAY_KEY_SECRET="test-secret")
class PaymentVerificationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(email="buyer@example.com", password="StrongPass123!")
        self.other_user = User.objects.create_user(email="other@example.com", password="StrongPass123!")
        self.order = Order.objects.create(
            user=self.user,
            shipping_address={"name": "Buyer"},
            subtotal=1000,
            tax_amount=120,
            shipping_charge=0,
            discount_amount=0,
            total_amount=1120,
            razorpay_order_id="order_test_123",
        )
        self.other_order = Order.objects.create(
            user=self.other_user,
            shipping_address={"name": "Other"},
            subtotal=1000,
            tax_amount=120,
            shipping_charge=0,
            discount_amount=0,
            total_amount=1120,
            razorpay_order_id="order_other_123",
        )
        self.url = reverse("payment-verify")

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
            sku="HS-VER-001",
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

    def _post(self, order_id, payment_id, signature):
        self.client.force_authenticate(user=self.user)
        return self.client.post(
            self.url,
            {
                "razorpay_order_id": order_id,
                "razorpay_payment_id": payment_id,
                "razorpay_signature": signature,
            },
            format="json",
        )

    def _create_order_with_cart(self, quantity=2):
        self.client.force_authenticate(user=self.user)
        CartItem.objects.create(cart=self.cart, variant=self.variant, quantity=quantity)
        response = self.client.post(
            reverse("order-list"),
            {"address_id": str(self.address.id)},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        return response.data

    def test_correct_signature_marks_order_processing_and_dispatches_email(self):
        from unittest.mock import patch

        with patch("apps.orders.tasks.send_order_confirmation_email.delay") as delay_mock:
            response = self._post(
                self.order.razorpay_order_id,
                "pay_test_123",
                self._signature(self.order.razorpay_order_id, "pay_test_123"),
            )

        self.assertEqual(response.status_code, 200)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, "PROCESSING")
        self.assertEqual(Payment.objects.filter(order=self.order).count(), 1)
        payment = Payment.objects.get(order=self.order)
        self.assertEqual(payment.status, "SUCCESS")
        self.assertEqual(payment.razorpay_payment_id, "pay_test_123")
        delay_mock.assert_called_once_with(str(self.order.id))

    def test_wrong_signature_creates_failed_payment_and_keeps_order_pending(self):
        response = self._post(self.order.razorpay_order_id, "pay_bad_1", "bad-signature")

        self.assertEqual(response.status_code, 400)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, "PENDING")
        payment = Payment.objects.get(order=self.order)
        self.assertEqual(payment.status, "FAILED")

    def test_double_submit_does_not_crash_or_duplicate_payment(self):
        from unittest.mock import patch

        payload_signature = self._signature(self.order.razorpay_order_id, "pay_double_1")
        with patch("apps.orders.tasks.send_order_confirmation_email.delay") as delay_mock:
            response_1 = self._post(self.order.razorpay_order_id, "pay_double_1", payload_signature)
            response_2 = self._post(self.order.razorpay_order_id, "pay_double_1", payload_signature)

        self.assertEqual(response_1.status_code, 200)
        self.assertEqual(response_2.status_code, 200)
        self.assertEqual(Payment.objects.filter(order=self.order).count(), 1)
        delay_mock.assert_called_once()

    def test_other_users_order_returns_404(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            self.url,
            {
                "razorpay_order_id": self.other_order.razorpay_order_id,
                "razorpay_payment_id": "pay_other_1",
                "razorpay_signature": self._signature(self.other_order.razorpay_order_id, "pay_other_1"),
            },
            format="json",
        )

        self.assertEqual(response.status_code, 404)
        self.assertEqual(Payment.objects.count(), 0)

    def test_retry_after_failed_verification_updates_same_payment_row(self):
        wrong = self._post(self.order.razorpay_order_id, "pay_retry_1", "bad-signature")
        self.assertEqual(wrong.status_code, 400)

        second = self._post(
            self.order.razorpay_order_id,
            "pay_retry_2",
            self._signature(self.order.razorpay_order_id, "pay_retry_2"),
        )

        self.assertEqual(second.status_code, 200)
        self.assertEqual(Payment.objects.filter(order=self.order).count(), 1)
        payment = Payment.objects.get(order=self.order)
        self.assertEqual(payment.status, "SUCCESS")
        self.assertEqual(payment.razorpay_payment_id, "pay_retry_2")

    def test_failed_verification_keeps_cart_until_retry(self):
        from unittest.mock import patch

        order_data = self._create_order_with_cart()

        failed = self._post(order_data["razorpay_order_id"], "pay_retry_flow_1", "bad-signature")
        self.assertEqual(failed.status_code, 400)

        order = Order.objects.get(id=order_data["id"])
        self.inventory.refresh_from_db()
        self.assertEqual(order.status, "PENDING")
        self.assertEqual(self.inventory.stock_qty, 5)
        self.assertEqual(self.cart.items.count(), 1)

        with patch("apps.orders.tasks.send_order_confirmation_email.delay"), patch("apps.orders.tasks.send_low_stock_alert_email.delay"):
            success = self._post(
                order_data["razorpay_order_id"],
                "pay_retry_flow_2",
                self._signature(order_data["razorpay_order_id"], "pay_retry_flow_2"),
            )

        self.assertEqual(success.status_code, 200)
        order.refresh_from_db()
        self.inventory.refresh_from_db()
        self.assertEqual(order.status, "PROCESSING")
        self.assertEqual(self.inventory.stock_qty, 3)
        self.assertEqual(self.cart.items.count(), 0)
        self.assertEqual(Payment.objects.filter(order=order).count(), 1)
