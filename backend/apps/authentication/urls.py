from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from apps.authentication.views import (
    RegisterView,
    CustomTokenObtainPairView,
    ForgotPasswordView,
    ResetPasswordView,
    UserProfileView,
    AddressViewSet
)
from apps.authentication.dashboard_views import (
    SellerDashboardView,
    AdminDashboardView
)

router = DefaultRouter()
router.register("addresses", AddressViewSet, basename="address")

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", CustomTokenObtainPairView.as_view(), name="login"),
    path("forgot-password/", ForgotPasswordView.as_view(), name="forgot-password"),
    path("reset-password/", ResetPasswordView.as_view(), name="reset-password"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("profile/", UserProfileView.as_view(), name="profile"),
    path("dashboard/seller/", SellerDashboardView.as_view(), name="seller-dashboard"),
    path("dashboard/admin/", AdminDashboardView.as_view(), name="admin-dashboard"),
    path("dashboard/admin/approve-seller/", AdminDashboardView.as_view(), name="admin-approve-seller"),
    path("dashboard/admin/manage-user/", AdminDashboardView.as_view(), name="admin-manage-user"),
    path("", include(router.urls)),
]
