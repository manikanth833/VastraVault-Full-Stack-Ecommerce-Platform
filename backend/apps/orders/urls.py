from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.orders.views import CartViewSet, WishlistViewSet, CouponViewSet, OrderViewSet

router = DefaultRouter()
router.register("cart", CartViewSet, basename="cart")
router.register("wishlist", WishlistViewSet, basename="wishlist")
router.register("coupons", CouponViewSet, basename="coupon")
router.register("orders", OrderViewSet, basename="order")

urlpatterns = [
    path("", include(router.urls)),
]
