from rest_framework.throttling import SimpleRateThrottle


class LoginRateThrottle(SimpleRateThrottle):
    scope = "login"

    # SimpleRateThrottle is DRF's base class for custom throttle keys. DRF's
    # built-in AnonRateThrottle and UserRateThrottle key by IP or user, which
    # does not fit "block repeated attempts against one specific account
    # regardless of source IP", so this subclass overrides get_cache_key to
    # key on the submitted email instead.
    def get_cache_key(self, request, view):
        email = request.data.get("email", "").strip().lower()
        if not email:
            # No email in the request - fall back to throttling by IP so malformed
            # requests still count against something, rather than bypassing the
            # throttle entirely.
            return self.get_ident(request)

        return self.cache_format % {
            "scope": self.scope,
            "ident": email,
        }


class ForgotPasswordRateThrottle(SimpleRateThrottle):
    scope = "forgot_password"

    # Email-keying is used here for the same reason as login throttling: it
    # blocks an attacker from rotating IPs while still hammering one victim's
    # inbox with repeated reset requests.
    def get_cache_key(self, request, view):
        email = (request.data.get("email", "") or "").strip().lower()
        if not email:
            # No email in the request - fall back to throttling by IP so malformed
            # requests still count against something, rather than bypassing the
            # throttle entirely.
            return self.get_ident(request)

        return self.cache_format % {
            "scope": self.scope,
            "ident": email,
        }
