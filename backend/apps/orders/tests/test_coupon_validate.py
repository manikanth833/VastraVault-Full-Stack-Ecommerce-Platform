from datetime import timedelta
from decimal import Decimal
import unittest

from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from apps.orders.models import Coupon


class CouponValidateTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.client.raise_request_exception = False
        self.url = reverse("coupon-validate")

    def _post(self, code=None, amount=None):
        payload = {}
        if code is not None:
            payload["code"] = code
        if amount is not None:
            payload["amount"] = amount
        return self.client.post(self.url, payload, format="json")

    def test_valid_flat_coupon_returns_expected_discount(self):
        Coupon.objects.create(
            code="FLAT100",
            discount_type="FLAT",
            value=Decimal("100.00"),
            min_purchase=Decimal("500.00"),
            end_date=timezone.now() + timedelta(days=1),
        )

        response = self._post("FLAT100", Decimal("1000.00"))

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["valid"])
        self.assertEqual(Decimal(str(response.data["discount_amount"])), Decimal("100.00"))

    def test_valid_percentage_coupon_returns_expected_discount(self):
        Coupon.objects.create(
            code="PCT10",
            discount_type="PERCENTAGE",
            value=Decimal("10.00"),
            min_purchase=Decimal("500.00"),
            end_date=timezone.now() + timedelta(days=1),
        )

        response = self._post("PCT10", Decimal("1000.00"))

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["valid"])
        self.assertEqual(Decimal(str(response.data["discount_amount"])), Decimal("100.00"))

    def test_percentage_coupon_discount_is_clamped_to_max_discount(self):
        Coupon.objects.create(
            code="PCTCAP",
            discount_type="PERCENTAGE",
            value=Decimal("50.00"),
            min_purchase=Decimal("100.00"),
            max_discount=Decimal("120.00"),
            end_date=timezone.now() + timedelta(days=1),
        )

        response = self._post("PCTCAP", Decimal("500.00"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(Decimal(str(response.data["discount_amount"])), Decimal("120.00"))

    def test_coupon_below_min_purchase_is_rejected(self):
        Coupon.objects.create(
            code="MIN500",
            discount_type="FLAT",
            value=Decimal("100.00"),
            min_purchase=Decimal("500.00"),
            end_date=timezone.now() + timedelta(days=1),
        )

        response = self._post("MIN500", Decimal("499.00"))

        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.data["valid"])

    def test_expired_coupon_is_rejected(self):
        Coupon.objects.create(
            code="EXPIRED",
            discount_type="FLAT",
            value=Decimal("100.00"),
            min_purchase=Decimal("0.00"),
            end_date=timezone.now() - timedelta(days=1),
        )

        response = self._post("EXPIRED", Decimal("1000.00"))

        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.data["valid"])

    def test_future_coupon_is_rejected(self):
        Coupon.objects.create(
            code="FUTURE",
            discount_type="FLAT",
            value=Decimal("100.00"),
            min_purchase=Decimal("0.00"),
            start_date=timezone.now() + timedelta(days=1),
            end_date=timezone.now() + timedelta(days=2),
        )

        response = self._post("FUTURE", Decimal("1000.00"))

        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.data["valid"])

    def test_coupon_at_usage_limit_is_rejected(self):
        Coupon.objects.create(
            code="LIMITED",
            discount_type="FLAT",
            value=Decimal("100.00"),
            min_purchase=Decimal("0.00"),
            usage_limit=2,
            usage_count=2,
            end_date=timezone.now() + timedelta(days=1),
        )

        response = self._post("LIMITED", Decimal("1000.00"))

        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.data["valid"])

    def test_coupon_below_usage_limit_is_valid(self):
        Coupon.objects.create(
            code="LIMIT1",
            discount_type="FLAT",
            value=Decimal("100.00"),
            min_purchase=Decimal("0.00"),
            usage_limit=2,
            usage_count=1,
            end_date=timezone.now() + timedelta(days=1),
        )

        response = self._post("LIMIT1", Decimal("1000.00"))

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["valid"])

    def test_inactive_coupon_is_rejected(self):
        Coupon.objects.create(
            code="INACTIVE",
            discount_type="FLAT",
            value=Decimal("100.00"),
            min_purchase=Decimal("0.00"),
            active=False,
            end_date=timezone.now() + timedelta(days=1),
        )

        response = self._post("INACTIVE", Decimal("1000.00"))

        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.data["valid"])

    def test_nonexistent_coupon_is_rejected(self):
        response = self._post("MISSING", Decimal("1000.00"))

        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.data["valid"])

    def test_coupon_code_matching_is_case_insensitive(self):
        Coupon.objects.create(
            code="MIXEDCASE",
            discount_type="FLAT",
            value=Decimal("100.00"),
            min_purchase=Decimal("0.00"),
            end_date=timezone.now() + timedelta(days=1),
        )

        response = self._post("mIxEdCaSe", Decimal("1000.00"))

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["valid"])
        self.assertEqual(response.data["code"], "MIXEDCASE")

    def test_missing_amount_defaults_to_zero(self):
        Coupon.objects.create(
            code="FREE0",
            discount_type="FLAT",
            value=Decimal("0.00"),
            min_purchase=Decimal("0.00"),
            end_date=timezone.now() + timedelta(days=1),
        )

        response = self._post("FREE0")

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["valid"])
        self.assertEqual(Decimal(str(response.data["discount_amount"])), Decimal("0.00"))

    @unittest.expectedFailure
    def test_nonnumeric_amount_does_not_500(self):
        Coupon.objects.create(
            code="SAFE",
            discount_type="FLAT",
            value=Decimal("10.00"),
            min_purchase=Decimal("0.00"),
            end_date=timezone.now() + timedelta(days=1),
        )

        response = self._post("SAFE", "abc")

        self.assertNotEqual(response.status_code, 500)

