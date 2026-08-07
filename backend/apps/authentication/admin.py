from django.contrib import admin

from apps.authentication.models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("event_type", "email", "user", "ip_address", "created_at")
    list_filter = ("event_type", "created_at")
    search_fields = ("email",)
    readonly_fields = ("id", "event_type", "user", "email", "ip_address", "user_agent", "metadata", "created_at")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
