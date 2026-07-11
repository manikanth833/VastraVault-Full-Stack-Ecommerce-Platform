import re

from django.core.exceptions import ValidationError
from django.utils.translation import gettext as _


class PasswordComplexityValidator:
    def validate(self, password, user=None):
        errors = []

        if len(password) < 8:
            errors.append(_("Password must be at least 8 characters long."))
        if not re.search(r"[A-Z]", password):
            errors.append(_("Password must include at least one uppercase letter."))
        if not re.search(r"[a-z]", password):
            errors.append(_("Password must include at least one lowercase letter."))
        if not re.search(r"\d", password):
            errors.append(_("Password must include at least one number."))
        if not re.search(r"[^A-Za-z0-9]", password):
            errors.append(_("Password must include at least one special character."))

        if errors:
            raise ValidationError(errors)

    def get_help_text(self):
        return _(
            "Your password must be at least 8 characters long and include uppercase, lowercase, number, and special character."
        )
