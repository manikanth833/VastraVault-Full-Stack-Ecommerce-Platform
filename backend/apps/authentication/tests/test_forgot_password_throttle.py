from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework.test import APIClient


User = get_user_model()


@override_settings(
    CACHES={
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "forgot-password-throttle-tests",
        }
    }
)
class ForgotPasswordThrottleTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.client.defaults["REMOTE_ADDR"] = "203.0.113.10"
        self.url = reverse("forgot-password")
        self.user = User.objects.create_user(
            email="user@example.com",
            password="StrongPass123!",
        )

    def post_forgot_password(self, email):
        return self.client.post(self.url, {"email": email}, format="json")

    @patch("apps.authentication.views.send_password_reset_email")
    def test_same_email_is_throttled_on_sixth_request(self, mock_send_email):
        for _ in range(5):
            response = self.post_forgot_password("user@example.com")
            self.assertEqual(response.status_code, 200)

        response = self.post_forgot_password("user@example.com")

        self.assertEqual(response.status_code, 429)
        self.assertEqual(mock_send_email.call_count, 5)

    @patch("apps.authentication.views.send_password_reset_email")
    def test_same_ip_different_emails_are_not_blocked_by_email_throttle(self, mock_send_email):
        User.objects.create_user(email="first@example.com", password="StrongPass123!")
        User.objects.create_user(email="second@example.com", password="StrongPass123!")

        response_1 = self.post_forgot_password("first@example.com")
        response_2 = self.post_forgot_password("second@example.com")

        self.assertEqual(response_1.status_code, 200)
        self.assertEqual(response_2.status_code, 200)
        self.assertEqual(mock_send_email.call_count, 2)

    def test_missing_email_is_fallback_throttled_by_ip_without_exception(self):
        for _ in range(5):
            response = self.client.post(self.url, {}, format="json")
            self.assertEqual(response.status_code, 400)

        response = self.client.post(self.url, {}, format="json")

        self.assertEqual(response.status_code, 429)

    @patch("apps.authentication.views.send_password_reset_email")
    def test_normalized_email_variants_share_the_same_throttle_key(self, mock_send_email):
        for _ in range(4):
            response = self.post_forgot_password(" User@Example.com ")
            self.assertEqual(response.status_code, 200)

        response = self.post_forgot_password("user@example.com")

        self.assertEqual(response.status_code, 200)
        response = self.post_forgot_password("USER@example.com")
        self.assertEqual(response.status_code, 429)
        self.assertEqual(mock_send_email.call_count, 5)
