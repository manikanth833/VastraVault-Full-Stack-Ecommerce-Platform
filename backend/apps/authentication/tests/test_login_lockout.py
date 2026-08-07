from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from apps.authentication.models import LOGIN_LOCKOUT_THRESHOLD


User = get_user_model()


@override_settings(
    CACHES={
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "login-lockout-tests",
        }
    }
)
class LoginLockoutTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.client.defaults["REMOTE_ADDR"] = "203.0.113.10"
        self.url = reverse("login")
        self.password = "StrongPass123!"
        self.user = User.objects.create_user(
            email="user@example.com",
            password=self.password,
        )
        self.other_user = User.objects.create_user(
            email="other@example.com",
            password=self.password,
        )

    def login(self, email, password):
        return self.client.post(self.url, {"email": email, "password": password}, format="json")

    def test_wrong_password_threshold_minus_one_still_allows_login_afterward(self):
        for _ in range(LOGIN_LOCKOUT_THRESHOLD - 1):
            response = self.login(self.user.email, "WrongPass123!")
            self.assertEqual(response.status_code, 400)

        response = self.login(self.user.email, self.password)

        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.failed_login_attempts, 0)
        self.assertIsNone(self.user.locked_until)

    def test_successful_login_resets_failed_login_attempts_below_threshold(self):
        for _ in range(2):
            response = self.login(self.user.email, "WrongPass123!")
            self.assertEqual(response.status_code, 400)

        response = self.login(self.user.email, self.password)

        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.failed_login_attempts, 0)
        self.assertIsNone(self.user.locked_until)

    def test_threshold_login_locks_account_and_correct_password_still_fails_while_locked(self):
        for _ in range(LOGIN_LOCKOUT_THRESHOLD):
            response = self.login(self.user.email, "WrongPass123!")
            self.assertEqual(response.status_code, 400)

        self.user.refresh_from_db()
        self.assertIsNotNone(self.user.locked_until)

        response = self.login(self.user.email, self.password)

        self.assertEqual(response.status_code, 400)
        self.assertIn("locked", str(response.data["detail"]).lower())

    def test_locked_login_does_not_increment_failed_attempts(self):
        for _ in range(LOGIN_LOCKOUT_THRESHOLD):
            self.login(self.user.email, "WrongPass123!")

        self.user.refresh_from_db()
        locked_attempts = self.user.failed_login_attempts

        response = self.login(self.user.email, self.password)

        self.assertEqual(response.status_code, 400)
        self.user.refresh_from_db()
        self.assertEqual(self.user.failed_login_attempts, locked_attempts)
        self.assertIsNotNone(self.user.locked_until)

    def test_login_succeeds_after_lockout_expires_and_clears_lock(self):
        self.user.failed_login_attempts = LOGIN_LOCKOUT_THRESHOLD
        self.user.locked_until = timezone.now() - timedelta(seconds=1)
        self.user.save(update_fields=["failed_login_attempts", "locked_until", "updated_at"])

        response = self.login(self.user.email, self.password)

        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.failed_login_attempts, 0)
        self.assertIsNone(self.user.locked_until)

    def test_nonexistent_email_returns_invalid_credentials_without_500(self):
        response = self.login("missing@example.com", self.password)

        self.assertEqual(response.status_code, 400)
        self.assertIn("Invalid email or password", str(response.data["detail"]))
        self.other_user.refresh_from_db()
        self.assertEqual(self.other_user.failed_login_attempts, 0)
        self.assertIsNone(self.other_user.locked_until)

    def test_failed_attempts_are_tracked_independently_per_email(self):
        response_1 = self.login(self.user.email, "WrongPass123!")
        response_2 = self.login(self.other_user.email, "WrongPass123!")

        self.assertEqual(response_1.status_code, 400)
        self.assertEqual(response_2.status_code, 400)

        self.user.refresh_from_db()
        self.other_user.refresh_from_db()
        self.assertEqual(self.user.failed_login_attempts, 1)
        self.assertEqual(self.other_user.failed_login_attempts, 1)

    def test_login_lockout_occurs_before_rate_throttle_at_current_thresholds(self):
        for _ in range(LOGIN_LOCKOUT_THRESHOLD):
            response = self.login(self.user.email, "WrongPass123!")
            self.assertEqual(response.status_code, 400)

        response = self.login(self.user.email, self.password)

        self.assertEqual(response.status_code, 400)
        self.assertIn("locked", str(response.data["detail"]).lower())
