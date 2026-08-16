import hmac
import hashlib

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework.test import APIClient

from apps.orders.models import Order
from apps.payments.models import Payment


User = get_user_model()


@override_settings(RAZORPAY_KEY_SECRET="test-secret")
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
