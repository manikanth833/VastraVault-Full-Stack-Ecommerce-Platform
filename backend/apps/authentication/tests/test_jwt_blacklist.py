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
            "LOCATION": "jwt-blacklist-tests",
        }
    }
)
class JwtBlacklistTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.client.defaults["REMOTE_ADDR"] = "203.0.113.30"
        self.login_url = reverse("login")
        self.logout_url = reverse("logout")
        self.refresh_url = reverse("token_refresh")
        self.user = User.objects.create_user(
            email="user@example.com",
            password="StrongPass123!",
        )

    def login(self):
        response = self.client.post(
            self.login_url,
            {"email": self.user.email, "password": "StrongPass123!"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        return response.data

    def test_refresh_token_is_blacklisted_on_logout_and_cannot_be_reused(self):
        tokens = self.login()

        response = self.client.post(self.logout_url, {"refresh": tokens["refresh"]}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["detail"], "Logged out successfully.")

        response = self.client.post(self.refresh_url, {"refresh": tokens["refresh"]}, format="json")
        self.assertEqual(response.status_code, 401)

    def test_logout_handles_already_blacklisted_and_malformed_refresh_tokens(self):
        tokens = self.login()

        response = self.client.post(self.logout_url, {"refresh": tokens["refresh"]}, format="json")
        self.assertEqual(response.status_code, 200)

        response = self.client.post(self.logout_url, {"refresh": tokens["refresh"]}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["detail"], "Logged out successfully.")

        response = self.client.post(self.logout_url, {"refresh": "not-a-token"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["detail"], "Logged out successfully.")

    def test_refresh_rotation_blacklists_old_refresh_token(self):
        tokens = self.login()

        response = self.client.post(self.refresh_url, {"refresh": tokens["refresh"]}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertIn("refresh", response.data)

        response = self.client.post(self.refresh_url, {"refresh": tokens["refresh"]}, format="json")
        self.assertEqual(response.status_code, 401)

    def test_logout_missing_refresh_field_returns_400(self):
        response = self.client.post(self.logout_url, {}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_access_token_is_rejected_gracefully_by_logout(self):
        tokens = self.login()

        response = self.client.post(self.logout_url, {"refresh": tokens["access"]}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["detail"], "Logged out successfully.")
