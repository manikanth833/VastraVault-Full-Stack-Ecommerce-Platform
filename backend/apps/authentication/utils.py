from django.conf import settings
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.core.mail import EmailMultiAlternatives
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode


reset_token_generator = PasswordResetTokenGenerator()


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
