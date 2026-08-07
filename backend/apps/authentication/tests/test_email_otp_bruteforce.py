from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import check_password
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from apps.authentication.utils import OTP_MAX_ATTEMPTS, send_verification_email


User = get_user_model()


@override_settings(
    CACHES={
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "email-otp-tests",
        }
    }
)
class EmailOtpBruteforceTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.client.defaults["REMOTE_ADDR"] = "203.0.113.20"
        self.url = reverse("verify-email-otp")
        self.resend_url = reverse("resend-verification")
        self.user = User.objects.create_user(
            email="user@example.com",
            password="StrongPass123!",
            is_email_verified=False,
        )

    def seed_otp(self, code):
        with patch("apps.authentication.utils.random.choices", return_value=list(code)), patch(
            "apps.authentication.utils.EmailMultiAlternatives.send"
        ):
            send_verification_email(self.user)
        self.user.refresh_from_db()

    def post_otp(self, otp):
        return self.client.post(self.url, {"email": self.user.email, "otp": otp}, format="json")

    def test_wrong_otp_increments_attempts_with_generic_error(self):
        self.seed_otp("123456")

        response = self.post_otp("111111")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["otp"][0], "Invalid or expired verification code.")
        self.user.refresh_from_db()
        self.assertEqual(self.user.email_otp_attempts, 1)

    def test_exhausting_attempts_locks_out_correct_otp_too(self):
        self.seed_otp("123456")

        for _ in range(OTP_MAX_ATTEMPTS):
            response = self.post_otp("111111")
            self.assertEqual(response.status_code, 400)
            self.assertEqual(response.data["otp"][0], "Invalid or expired verification code.")

        self.user.refresh_from_db()
        self.assertEqual(self.user.email_otp_attempts, OTP_MAX_ATTEMPTS)

        response = self.post_otp("123456")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["otp"][0], "Too many incorrect attempts. Please request a new code.")

    def test_expired_otp_short_circuits_before_attempt_counting(self):
        self.seed_otp("123456")
        self.user.email_otp_expires_at = timezone.now() - timedelta(seconds=1)
        self.user.email_otp_attempts = 2
        self.user.save(update_fields=["email_otp_expires_at", "email_otp_attempts", "updated_at"])

        # Current implementation treats expiry as an early return, so attempts stay unchanged.
        response = self.post_otp("123456")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["otp"][0], "Invalid or expired verification code.")
        self.user.refresh_from_db()
        self.assertEqual(self.user.email_otp_attempts, 2)

    def test_already_verified_user_short_circuits(self):
        self.seed_otp("123456")
        self.user.is_email_verified = True
        self.user.save(update_fields=["is_email_verified", "updated_at"])

        response = self.post_otp("999999")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["detail"], "Email already verified.")

    def test_otp_is_hashed_not_stored_in_plaintext(self):
        self.seed_otp("123456")

        self.assertNotEqual(self.user.email_otp_hash, "123456")
        self.assertTrue(check_password("123456", self.user.email_otp_hash))

    def test_resend_invalidates_old_otp(self):
        first_otp = "111111"
        second_otp = "222222"

        with patch("apps.authentication.utils.random.choices", side_effect=[list(first_otp), list(second_otp)]), patch(
            "apps.authentication.utils.EmailMultiAlternatives.send"
        ), patch(
            "apps.authentication.views.send_verification_email",
            side_effect=send_verification_email,
        ):
            send_verification_email(self.user)
            self.user.refresh_from_db()
            response = self.client.post(self.resend_url, {"email": self.user.email}, format="json")

        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()

        response = self.post_otp(first_otp)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["otp"][0], "Invalid or expired verification code.")

        response = self.post_otp(second_otp)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["detail"], "Email verified successfully.")
