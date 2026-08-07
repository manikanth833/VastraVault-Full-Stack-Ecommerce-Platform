import json
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework.test import APIClient

from apps.authentication.models import AuditLog, LOGIN_LOCKOUT_THRESHOLD


User = get_user_model()


@override_settings(
    CACHES={
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "audit-logging-tests",
        }
    }
)
class AuditLoggingTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.client.defaults["REMOTE_ADDR"] = "198.51.100.77"
        self.login_url = reverse("login")
        self.logout_url = reverse("logout")
        self.refresh_url = reverse("token_refresh")
        self.user = User.objects.create_user(
            email="user@example.com",
            password="StrongPass123!",
        )

    def login(self, email, password):
        return self.client.post(self.login_url, {"email": email, "password": password}, format="json")

    def test_login_success_and_failure_create_expected_audit_rows(self):
        failure = self.login(self.user.email, "WrongPass123!")
        success = self.login(self.user.email, "StrongPass123!")

        self.assertEqual(failure.status_code, 400)
        self.assertEqual(success.status_code, 200)

        logs = list(AuditLog.objects.filter(email=self.user.email).order_by("created_at"))
        self.assertEqual([log.event_type for log in logs], ["LOGIN_FAILURE", "LOGIN_SUCCESS"])
        self.assertEqual(logs[0].user, self.user)
        self.assertEqual(logs[1].user, self.user)

    def test_login_lockout_logs_each_locked_request(self):
        for _ in range(LOGIN_LOCKOUT_THRESHOLD):
            response = self.login(self.user.email, "WrongPass123!")
            self.assertEqual(response.status_code, 400)

        response = self.login(self.user.email, "StrongPass123!")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(AuditLog.objects.filter(event_type="LOGIN_LOCKOUT").count(), 1)

        response = self.login(self.user.email, "StrongPass123!")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(AuditLog.objects.filter(event_type="LOGIN_LOCKOUT").count(), 2)

    def test_audit_logging_failure_does_not_break_auth_flow(self):
        with patch("apps.authentication.audit.AuditLog.objects.create", side_effect=Exception("boom")), patch(
            "apps.authentication.audit.logger.exception"
        ):
            response = self.login(self.user.email, "StrongPass123!")

        self.assertEqual(response.status_code, 200)

    def test_audit_metadata_does_not_capture_plaintext_secrets(self):
        failure = self.login(self.user.email, "WrongPass123!")
        self.assertEqual(failure.status_code, 400)
        success = self.login(self.user.email, "StrongPass123!")
        self.assertEqual(success.status_code, 200)

        tokens = success.data
        logout = self.client.post(self.logout_url, {"refresh": tokens["refresh"]}, format="json")
        self.assertEqual(logout.status_code, 200)
        refresh = self.client.post(self.refresh_url, {"refresh": tokens["refresh"]}, format="json")
        self.assertEqual(refresh.status_code, 401)

        secrets = {
            "WrongPass123!",
            "StrongPass123!",
            tokens["refresh"],
            tokens["access"],
        }
        for log in AuditLog.objects.all():
            payload = json.dumps(log.metadata, sort_keys=True)
            for secret in secrets:
                self.assertNotIn(secret, payload)

    def test_ip_address_falls_back_to_remote_addr(self):
        response = self.login(self.user.email, "StrongPass123!")

        self.assertEqual(response.status_code, 200)
        log = AuditLog.objects.latest("created_at")
        self.assertEqual(log.ip_address, "198.51.100.77")
