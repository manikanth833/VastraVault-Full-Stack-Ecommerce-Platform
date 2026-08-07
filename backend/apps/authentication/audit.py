import logging

from apps.authentication.models import AuditLog


logger = logging.getLogger(__name__)


def log_event(request, event_type, user=None, email="", **metadata):
    if user is not None and not email:
        email = getattr(user, "email", "") or ""

    meta = getattr(request, "META", {}) or {}
    forwarded_for = meta.get("HTTP_X_FORWARDED_FOR", "")
    if forwarded_for:
        ip_address = forwarded_for.split(",")[0].strip()
    else:
        ip_address = meta.get("REMOTE_ADDR") or ""

    user_agent = (meta.get("HTTP_USER_AGENT", "") or "")[:255]

    try:
        AuditLog.objects.create(
            event_type=event_type,
            user=user,
            email=email or "",
            ip_address=ip_address or None,
            user_agent=user_agent,
            metadata=metadata or {},
        )
    except Exception:
        logger.exception("Failed to write authentication audit log")
