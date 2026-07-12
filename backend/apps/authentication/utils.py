from django.conf import settings
import random
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.contrib.auth.hashers import make_password
from django.core.mail import EmailMultiAlternatives
from django.db import transaction
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from django.utils import timezone
from datetime import timedelta


reset_token_generator = PasswordResetTokenGenerator()
OTP_LENGTH = 6
OTP_VALIDITY_MINUTES = 10
OTP_MAX_ATTEMPTS = 5
RESEND_COOLDOWN_SECONDS = 45


def _generate_otp_code():
    return "".join(random.choices("0123456789", k=OTP_LENGTH))


class EmailVerificationTokenGenerator(PasswordResetTokenGenerator):
    def _make_hash_value(self, user, timestamp):
        return f"{user.pk}{timestamp}{user.is_email_verified}{user.email_verification_generation}"


email_verification_token_generator = EmailVerificationTokenGenerator()


def build_password_reset_link(user):
    frontend_base = getattr(settings, "FRONTEND_URL", "http://localhost:5173").rstrip("/")
    uidb64 = urlsafe_base64_encode(force_bytes(user.pk))
    token = reset_token_generator.make_token(user)
    return f"{frontend_base}/reset-password/{uidb64}/{token}"


def send_password_reset_email(user):
    reset_link = build_password_reset_link(user)
    greeting_name = (user.first_name or "").strip() or "there"
    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", None)

    subject = "Reset your Ananya Heritage Sarees password"
    text_body = (
        f"Hello {greeting_name},\n\n"
        "We received a request to reset your Ananya Heritage Sarees password.\n"
        f"Reset your password here: {reset_link}\n\n"
        "For security, this link can only be used once and will expire automatically.\n"
        "If you did not request a password reset, you can safely ignore this email.\n"
    )

    html_body = f"""
    <div style="margin:0;background:#f8f7f3;padding:32px 0;font-family:Arial,sans-serif;color:#2b0f16;">
      <div style="max-width:620px;margin:0 auto;background:#fff;border:1px solid #eddccf;border-radius:24px;overflow:hidden;">
        <div style="padding:32px 36px;background:linear-gradient(135deg,#2b0f16 0%,#5f1d28 55%,#1f0a10 100%);color:#fff;">
          <p style="margin:0 0 12px;font-size:11px;letter-spacing:0.32em;text-transform:uppercase;color:#d4af37;font-weight:700;">Ananya Heritage Sarees</p>
          <h1 style="margin:0;font-size:28px;line-height:1.2;font-family:Georgia,serif;">Reset your password</h1>
        </div>
        <div style="padding:32px 36px;">
          <p style="margin:0 0 18px;font-size:16px;line-height:1.7;">Hello {greeting_name},</p>
          <p style="margin:0 0 18px;font-size:15px;line-height:1.7;color:#4b5563;">
            We received a request to reset the password for your Ananya Heritage Sarees account.
          </p>
          <div style="margin:28px 0;text-align:center;">
            <a href="{reset_link}" style="display:inline-block;padding:14px 24px;background:#7f1d1d;color:#fff;text-decoration:none;border-radius:999px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;font-size:12px;">
              Reset Password
            </a>
          </div>
          <p style="margin:0 0 16px;font-size:13px;line-height:1.7;color:#6b7280;">
            For security, this link can only be used once and will expire automatically.
          </p>
          <p style="margin:0;font-size:13px;line-height:1.7;color:#6b7280;">
            If you did not request this change, you can safely ignore this email.
          </p>
        </div>
      </div>
    </div>
    """

    email = EmailMultiAlternatives(subject, text_body, from_email, [user.email])
    email.attach_alternative(html_body, "text/html")
    email.send(fail_silently=False)


def build_email_verification_link(user):
    frontend_base = getattr(settings, "FRONTEND_URL", "http://localhost:5173").rstrip("/")
    uidb64 = urlsafe_base64_encode(force_bytes(user.pk))
    token = email_verification_token_generator.make_token(user)
    return f"{frontend_base}/verify-email/{uidb64}/{token}"


def send_verification_email(user):
    otp = _generate_otp_code()
    with transaction.atomic():
        user = user.__class__.objects.select_for_update().get(pk=user.pk)
        user.email_verification_generation = (user.email_verification_generation or 0) + 1
        user.email_otp_hash = make_password(otp)
        user.email_otp_expires_at = timezone.now() + timedelta(minutes=OTP_VALIDITY_MINUTES)
        user.email_otp_attempts = 0
        user.save(
            update_fields=[
                "email_verification_generation",
                "email_otp_hash",
                "email_otp_expires_at",
                "email_otp_attempts",
                "updated_at",
            ]
        )

    verification_link = build_email_verification_link(user)
    greeting_name = (user.first_name or "").strip() or "there"
    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", None)

    subject = "Verify your Ananya Heritage Sarees email address"
    text_body = (
        f"Hello {greeting_name},\n\n"
        "Please verify your email address for your Ananya Heritage Sarees account.\n"
        f"Verify your email here: {verification_link}\n\n"
        f"Or enter this code on the site: {otp}\n"
        f"This code expires in {OTP_VALIDITY_MINUTES} minutes.\n\n"
        "This confirms your email address and is required to access full account features.\n"
        "For security, this link can only be used once and will expire automatically.\n"
        "If you did not create this account, you can safely ignore this email.\n"
    )

    html_body = f"""
    <div style="margin:0;background:#f8f7f3;padding:32px 0;font-family:Arial,sans-serif;color:#2b0f16;">
      <div style="max-width:620px;margin:0 auto;background:#fff;border:1px solid #eddccf;border-radius:24px;overflow:hidden;">
        <div style="padding:32px 36px;background:linear-gradient(135deg,#2b0f16 0%,#5f1d28 55%,#1f0a10 100%);color:#fff;">
          <p style="margin:0 0 12px;font-size:11px;letter-spacing:0.32em;text-transform:uppercase;color:#d4af37;font-weight:700;">Ananya Heritage Sarees</p>
          <h1 style="margin:0;font-size:28px;line-height:1.2;font-family:Georgia,serif;">Verify your email</h1>
        </div>
        <div style="padding:32px 36px;">
          <p style="margin:0 0 18px;font-size:16px;line-height:1.7;">Hello {greeting_name},</p>
          <p style="margin:0 0 18px;font-size:15px;line-height:1.7;color:#4b5563;">
            Please verify your email address for your Ananya Heritage Sarees account.
          </p>
          <div style="margin:28px 0;text-align:center;">
            <a href="{verification_link}" style="display:inline-block;padding:14px 24px;background:#7f1d1d;color:#fff;text-decoration:none;border-radius:999px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;font-size:12px;">
              Verify Email
            </a>
          </div>
          <div style="margin:24px 0 20px;padding:20px 18px;border:1px solid #d4af37;border-radius:18px;background:#fff8e8;text-align:center;">
            <p style="margin:0 0 10px;font-size:13px;line-height:1.7;color:#7f1d1d;font-weight:700;">Or enter this code on the site:</p>
            <div style="margin:0;font-family:Consolas,Monaco,'Courier New',monospace;font-size:30px;line-height:1.2;letter-spacing:0.35em;color:#2b0f16;font-weight:700;">
              {otp}
            </div>
            <p style="margin:10px 0 0;font-size:12px;line-height:1.6;color:#6b7280;">Expires in {OTP_VALIDITY_MINUTES} minutes.</p>
          </div>
          <p style="margin:0 0 16px;font-size:13px;line-height:1.7;color:#6b7280;">
            This confirms your email address and is required to access full account features.
          </p>
          <p style="margin:0 0 16px;font-size:13px;line-height:1.7;color:#6b7280;">
            For security, this link can only be used once and will expire automatically.
          </p>
          <p style="margin:0;font-size:13px;line-height:1.7;color:#6b7280;">
            If you did not create this account, you can safely ignore this email.
          </p>
        </div>
      </div>
    </div>
    """

    email = EmailMultiAlternatives(subject, text_body, from_email, [user.email])
    email.attach_alternative(html_body, "text/html")
    email.send(fail_silently=False)
