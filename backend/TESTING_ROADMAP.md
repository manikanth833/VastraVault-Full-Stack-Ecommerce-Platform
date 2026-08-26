# Testing Roadmap

## Authentication
- `apps/authentication/tests/test_login_lockout.py` - login failure counters, lockout timing, and lockout recovery.
- `apps/authentication/tests/test_jwt_blacklist.py` - refresh/logout token revocation and blacklist edge cases.
- `apps/authentication/tests/test_forgot_password_throttle.py` - forgot-password rate limiting by email and IP.
- `apps/authentication/tests/test_email_otp_bruteforce.py` - OTP retry limits, expiry, resend invalidation, and verification flow.
- `apps/authentication/tests/test_audit_logging.py` - audit log creation and resilience during auth flows.

## Orders
- `apps/orders/tests/test_cart_preview.py` - cart preview totals and coupon pricing validation.
- `apps/orders/tests/test_cart_mutations.py` - cart add/update/remove/merge flows, guest cart tokens, and isolation.
- `apps/orders/tests/test_coupon_validate.py` - coupon validation endpoint behavior and discount calculations.
- `apps/orders/tests/test_wishlist.py` - wishlist create/list/delete permissions and duplicate handling.
- `apps/orders/tests/test_order_checkout_flow.py` - checkout, payment success/failure, stock updates, and email task dispatch.
- `apps/orders/tests/test_order_management.py` - order queryset scoping, checkout validation, and status transitions.

## Payments
- `apps/payments/tests/test_payment_verification.py` - Razorpay payment verification, retries, and cart/stock effects.
- `apps/payments/tests/test_webhook.py` - Razorpay webhook signature handling, duplicate events, and order finalization.

## Products
- `apps/products/tests/test_serializers.py` - product variant serializer shape.
- `apps/products/tests/test_products.py` - product listing, filtering, searching, sorting, permissions, and image uploads.
- `apps/products/tests/test_reviews.py` - review creation, rating validation, verified purchases, and listing filters.

## Known Gaps / Not Yet Covered
- Frontend and browser-level integration tests are not covered here.
- Concurrency and race-condition behavior beyond Django `TestCase` transactions is not fully exercised.
- PostgreSQL-specific locking behavior is not proven by the SQLite-backed test runs used locally.
- CI/CD pipeline wiring, deployment smoke tests, and observability checks are not covered.
- Live third-party gateway interactions are not covered beyond mocked Razorpay request paths.

## How To Run
- Full backend suite: `python manage.py test apps.authentication apps.orders apps.payments apps.products`
- Single app: `python manage.py test apps.orders`
- Single test module: `python manage.py test apps.orders.tests.test_cart_mutations`
