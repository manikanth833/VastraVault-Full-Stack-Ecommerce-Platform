from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework.test import APIClient

from apps.authentication.utils import (
    email_verification_token_generator,
    reset_token_generator,
    send_verification_email,
)


User = get_user_model()


class EmailVerificationEnforcementTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="unverified@example.com",
            password="StrongPass123!",
            is_email_verified=False,
        )
        self.login_url = reverse("login")
        self.refresh_url = reverse("token_refresh")
        self.profile_url = reverse("profile")
        self.otp_url = reverse("verify-email-otp")
        self.link_url = reverse("verify-email")
        self.resend_url = reverse("resend-verification")
        self.reset_url = reverse("reset-password")

    def test_unverified_user_cannot_login_or_receive_tokens(self):
        response = self.client.post(
            self.login_url,
            {"email": self.user.email, "password": "StrongPass123!"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("verify your email", str(response.data["detail"]).lower())
        self.assertNotIn("access", response.data)
        self.assertNotIn("refresh", response.data)

    def test_unverified_user_cannot_refresh_tokens(self):
        self.user.is_email_verified = True
        self.user.save(update_fields=["is_email_verified"])
        login = self.client.post(
            self.login_url,
            {"email": self.user.email, "password": "StrongPass123!"},
            format="json",
        )
        self.assertEqual(login.status_code, 200)

        self.user.is_email_verified = False
        self.user.save(update_fields=["is_email_verified"])

        response = self.client.post(
            self.refresh_url,
            {"refresh": login.data["refresh"]},
            format="json",
        )

        self.assertEqual(response.status_code, 403)
        self.assertIn("verify your email", str(response.data["detail"]).lower())

    def test_verified_user_can_login_and_access_protected_endpoint(self):
        self.user.is_email_verified = True
        self.user.save(update_fields=["is_email_verified"])

        login = self.client.post(
            self.login_url,
            {"email": self.user.email, "password": "StrongPass123!"},
            format="json",
        )
        self.assertEqual(login.status_code, 200)
        self.assertIn("access", login.data)
        self.assertIn("refresh", login.data)

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")
        response = self.client.get(self.profile_url)
        self.assertEqual(response.status_code, 200)

    @patch("apps.authentication.views.send_verification_email")
    def test_resend_verification_still_works(self, send_email):
        response = self.client.post(
            self.resend_url,
            {"email": self.user.email},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        send_email.assert_called_once_with(self.user)

    def test_valid_otp_verification_still_succeeds(self):
        with patch("apps.authentication.utils.random.choices", return_value=list("123456")), patch(
            "apps.authentication.utils.EmailMultiAlternatives.send"
        ):
            send_verification_email(self.user)

        response = self.client.post(
            self.otp_url,
            {"email": self.user.email, "otp": "123456"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_email_verified)

    def test_valid_email_verification_link_still_succeeds(self):
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        token = email_verification_token_generator.make_token(self.user)

        response = self.client.post(
            self.link_url,
            {"uid": uid, "token": token},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_email_verified)

    def test_invalid_email_verification_link_fails(self):
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))

        response = self.client.post(
            self.link_url,
            {"uid": uid, "token": "invalid-token"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(User.objects.get(pk=self.user.pk).is_email_verified)

    @override_settings(PASSWORD_RESET_TIMEOUT=-1)
    def test_expired_email_verification_link_fails(self):
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        token = email_verification_token_generator.make_token(self.user)

        response = self.client.post(
            self.link_url,
            {"uid": uid, "token": token},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(User.objects.get(pk=self.user.pk).is_email_verified)

    def test_expired_otp_still_fails(self):
        self.user.email_otp_expires_at = timezone.now() - timedelta(seconds=1)
        self.user.save(update_fields=["email_otp_expires_at"])

        response = self.client.post(
            self.otp_url,
            {"email": self.user.email, "otp": "123456"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("Invalid or expired", str(response.data["otp"]))

    def test_password_reset_still_works_for_unverified_user(self):
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        token = reset_token_generator.make_token(self.user)

        response = self.client.post(
            self.reset_url,
            {
                "uid": uid,
                "token": token,
                "password": "NewStrongPass123!",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("NewStrongPass123!"))
