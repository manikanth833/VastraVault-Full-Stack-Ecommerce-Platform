import hashlib
import hmac
import json
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework.test import APIClient

from apps.orders.models import Address, Cart, CartItem, Order
from apps.payments.models import Payment
from apps.products.models import Category, Inventory, Product, ProductVariant


User = get_user_model()


@override_settings(RAZORPAY_WEBHOOK_SECRET="webhook-secret")
class RazorpayWebhookTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(email="buyer@example.com", password="StrongPass123!")
        self.order = Order.objects.create(
            user=self.user,
            shipping_address={"name": "Buyer"},
            subtotal=1000,
            tax_amount=120,
            shipping_charge=0,
            discount_amount=0,
            total_amount=1120,
            razorpay_order_id="order_webhook_123",
        )
        self.terminal_order = Order.objects.create(
            user=self.user,
            shipping_address={"name": "Buyer"},
            subtotal=1000,
            tax_amount=120,
            shipping_charge=0,
            discount_amount=0,
            total_amount=1120,
            razorpay_order_id="order_terminal_123",
            status="DELIVERED",
        )
        self.url = reverse("payment-webhook")

        self.category = Category.objects.create(name="Silk", slug="silk")
        self.product = Product.objects.create(
            category=self.category,
            seller=self.user,
            name="Webhook Silk Saree",
            slug="webhook-silk-saree",
            description="Test product",
            base_price=Decimal("1000.00"),
        )
        self.variant = ProductVariant.objects.create(
            product=self.product,
            sku="HS-WEB-001",
            color="Blue",
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

    def _post(self, payload, secret="webhook-secret", raw_override=None):
        raw = raw_override if raw_override is not None else json.dumps(payload).encode("utf-8")
        signature = hmac.new(secret.encode("utf-8"), raw, hashlib.sha256).hexdigest()
        return self.client.generic(
            "POST",
            self.url,
            data=raw,
            content_type="application/json",
            HTTP_X_RAZORPAY_SIGNATURE=signature,
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

    def test_valid_payment_captured_marks_order_and_sends_email(self):
        from unittest.mock import patch

        payload = {
            "event": "payment.captured",
            "payload": {
                "payment": {
                    "entity": {
                        "order_id": self.order.razorpay_order_id,
                        "id": "pay_webhook_1",
                        "amount": 112000,
                        "currency": "INR",
                    }
                }
            },
        }

        with patch("apps.orders.tasks.send_order_confirmation_email.delay") as delay_mock:
            response = self._post(payload)

        self.assertEqual(response.status_code, 200)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, "PROCESSING")
        self.assertEqual(Payment.objects.filter(order=self.order).count(), 1)
        delay_mock.assert_called_once_with(str(self.order.id))

    def test_payment_captured_clears_cart_and_decrements_stock(self):
        from unittest.mock import patch

        order_data = self._create_order_with_cart()
        payload = {
            "event": "payment.captured",
            "payload": {
                "payment": {
                    "entity": {
                        "order_id": order_data["razorpay_order_id"],
                        "id": "pay_webhook_cart_1",
                        "amount": int(Decimal(str(order_data["total_amount"])) * 100),
                        "currency": "INR",
                    }
                }
            },
        }

        with patch("apps.orders.tasks.send_order_confirmation_email.delay"), patch("apps.orders.tasks.send_low_stock_alert_email.delay"):
            response = self._post(payload)

        self.assertEqual(response.status_code, 200)
        order = Order.objects.get(id=order_data["id"])
        order.refresh_from_db()
        self.inventory.refresh_from_db()
        self.assertEqual(order.status, "PROCESSING")
        self.assertEqual(self.inventory.stock_qty, 3)
        self.assertEqual(self.cart.items.count(), 0)

    def test_invalid_signature_returns_400_without_changes(self):
        payload = {
            "event": "payment.captured",
            "payload": {
                "payment": {
                    "entity": {
                        "order_id": self.order.razorpay_order_id,
                        "id": "pay_webhook_bad",
                        "amount": 112000,
                        "currency": "INR",
                    }
                }
            },
        }

        response = self.client.generic(
            "POST",
            self.url,
            data=json.dumps(payload).encode("utf-8"),
            content_type="application/json",
            HTTP_X_RAZORPAY_SIGNATURE="bad-signature",
        )

        self.assertEqual(response.status_code, 400)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, "PENDING")
        self.assertEqual(Payment.objects.count(), 0)

    def test_already_processed_order_is_noop(self):
        from unittest.mock import patch

        payload = {
            "event": "payment.captured",
            "payload": {
                "payment": {
                    "entity": {
                        "order_id": self.order.razorpay_order_id,
                        "id": "pay_webhook_dup",
                        "amount": 112000,
                        "currency": "INR",
                    }
                }
            },
        }

        with patch("apps.orders.tasks.send_order_confirmation_email.delay") as delay_mock:
            first = self._post(payload)
            second = self._post(payload)

        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(Payment.objects.filter(order=self.order).count(), 1)
        delay_mock.assert_called_once_with(str(self.order.id))

    def test_payment_failed_event_leaves_order_pending(self):
        payload = {
            "event": "payment.failed",
            "payload": {
                "payment": {
                    "entity": {
                        "order_id": self.order.razorpay_order_id,
                        "id": "pay_failed_1",
                    }
                }
            },
        }

        response = self._post(payload)

        self.assertEqual(response.status_code, 200)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, "PENDING")
        self.assertEqual(Payment.objects.count(), 0)

    def test_malformed_json_with_valid_signature_returns_200(self):
        raw = b"{not-json"
        with self.assertLogs("apps.payments.views", level="ERROR"):
            response = self._post({}, raw_override=raw)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(Payment.objects.count(), 0)

    def test_missing_webhook_secret_returns_200(self):
        with override_settings(RAZORPAY_WEBHOOK_SECRET=""):
            payload = {
                "event": "payment.captured",
                "payload": {
                    "payment": {
                        "entity": {
                            "order_id": self.order.razorpay_order_id,
                            "id": "pay_no_secret",
                            "amount": 112000,
                            "currency": "INR",
                        }
                    }
                },
            }

            response = self._post(payload, secret="webhook-secret")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(Payment.objects.count(), 0)

    def test_amount_mismatch_does_not_mark_order_paid(self):
        payload = {
            "event": "payment.captured",
            "payload": {
                "payment": {
                    "entity": {
                        "order_id": self.order.razorpay_order_id,
                        "id": "pay_bad_amount",
                        "amount": 99000,
                        "currency": "INR",
                    }
                }
            },
        }

        response = self._post(payload)

        self.assertEqual(response.status_code, 200)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, "PENDING")
        self.assertEqual(Payment.objects.count(), 0)

    def test_duplicate_successful_payment_id_is_noop(self):
        from unittest.mock import patch

        payload = {
            "event": "payment.captured",
            "payload": {
                "payment": {
                    "entity": {
                        "order_id": self.order.razorpay_order_id,
                        "id": "pay_duplicate_success",
                        "amount": 112000,
                        "currency": "INR",
                    }
                }
            },
        }

        with patch("apps.orders.tasks.send_order_confirmation_email.delay") as delay_mock:
            first = self._post(payload)
            second = self._post(payload)

        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(Payment.objects.filter(order=self.order).count(), 1)
        delay_mock.assert_called_once_with(str(self.order.id))

    def test_webhook_for_missing_order_returns_200(self):
        payload = {
            "event": "payment.captured",
            "payload": {
                "payment": {
                    "entity": {
                        "order_id": "order_missing_123",
                        "id": "pay_missing_order",
                        "amount": 112000,
                        "currency": "INR",
                    }
                }
            },
        }

        response = self._post(payload)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(Payment.objects.count(), 0)

    def test_terminal_order_is_not_downgraded(self):
        payload = {
            "event": "payment.captured",
            "payload": {
                "payment": {
                    "entity": {
                        "order_id": self.terminal_order.razorpay_order_id,
                        "id": "pay_terminal_1",
                        "amount": 112000,
                        "currency": "INR",
                    }
                }
            },
        }

        response = self._post(payload)

        self.assertEqual(response.status_code, 200)
        self.terminal_order.refresh_from_db()
        self.assertEqual(self.terminal_order.status, "DELIVERED")
        self.assertEqual(Payment.objects.count(), 0)
