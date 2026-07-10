from rest_framework.permissions import BasePermission
from apps.authentication.models import Role

class IsAdminUser(BasePermission):
    """
    Allows access only to Admin users.
    """
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and
            request.user.role and
            request.user.role.name == Role.ADMIN
        )

class IsSellerUser(BasePermission):
    """
    Allows access to Sellers (approved or unapproved).
    """
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and
            request.user.role and
            request.user.role.name == Role.SELLER
        )

class IsApprovedSellerUser(BasePermission):
    """
    Allows access only to Admin-approved Sellers.
    """
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and
            request.user.role and
            request.user.role.name == Role.SELLER and
            request.user.is_approved_seller
        )

class IsSellerOrAdminUser(BasePermission):
    """
    Allows access to approved sellers or admins.
    """
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and
            (
                (request.user.role and request.user.role.name == Role.ADMIN) or
                (request.user.role and request.user.role.name == Role.SELLER)
            )
        )

class IsApprovedSellerOrAdminUser(BasePermission):
    """
    Allows access to approved sellers or admins.
    """
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and
            (
                (request.user.role and request.user.role.name == Role.ADMIN) or
                (
                    request.user.role and
                    request.user.role.name == Role.SELLER and
                    request.user.is_approved_seller
                )
            )
        )

class IsCustomerUser(BasePermission):
    """
    Allows access only to Customers.
    """
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and
            request.user.role and
            request.user.role.name == Role.CUSTOMER
        )
