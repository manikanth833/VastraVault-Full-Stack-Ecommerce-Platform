import time
import hmac
import hashlib
from decimal import Decimal

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from rest_framework.test import APIClient

from apps.orders.models import Cart, CartItem, Order, OrderItem
from apps.products.models import ProductVariant, Inventory
from apps.payments.models import Payment

User = get_user_model()


class Command(BaseCommand):
    help = "End-to-end test of the payment verification flow, without touching Razorpay's UI."

    def handle(self, *args, **options):
        self.stdout.write("STEP 1: Finding or creating a test user")
        user, _ = User.objects.get_or_create(
            email="paymenttest@example.com",
            defaults={"first_name": "Test", "last_name": "User"},
        )

        self.stdout.write("STEP 2: Finding a product variant with stock")
        variant = (
            ProductVariant.objects.filter(inventory__stock_qty__gt=0)
            .select_related("inventory")
            .first()
        )
        if not variant:
            self.stderr.write(
                "No ProductVariant with stock found. Add a product with inventory in the admin first, then re-run this command."
            )
            return
        inventory = variant.inventory
        starting_stock = inventory.stock_qty
        self.stdout.write(f"   Using variant: {variant.sku} (current stock: {starting_stock})")

        self.stdout.write("STEP 3: Building a cart for the test user")
        cart, _ = Cart.objects.get_or_create(user=user)
        cart.items.all().delete()  # clean slate
        CartItem.objects.create(cart=cart, variant=variant, quantity=1)

        self.stdout.write("STEP 4: Creating a fake but realistic Order (mimicking what your order-creation endpoint does)")
        subtotal = variant.final_price
        tax = subtotal * Decimal("0.12")
        shipping = Decimal("0.00") if subtotal > 2000 else Decimal("150.00")
        total = subtotal + tax + shipping

        run_id = str(int(time.time()))
        razorpay_order_id = f"order_test_{run_id}"
        razorpay_payment_id = f"pay_test_{run_id}"

        order = Order.objects.create(
            user=user,
            shipping_address={
                "name": "Test User",
                "phone": "9999999999",
                "address_line_1": "123 Test Street",
                "city": "Hyderabad",
                "state": "Telangana",
                "pin_code": "500001",
            },
            subtotal=subtotal,
            tax_amount=tax,
            shipping_charge=shipping,
            total_amount=total,
            razorpay_order_id=razorpay_order_id,
        )
        OrderItem.objects.create(order=order, variant=variant, quantity=1, price=subtotal)
        self.stdout.write(f"   Created Order {order.id} with total ₹{total}, status={order.status}")

        self.stdout.write("STEP 5: Computing the HMAC signature exactly the way Razorpay/your view does")
        secret = settings.RAZORPAY_KEY_SECRET or "mocksecretkey12345678"
        msg = f"{razorpay_order_id}|{razorpay_payment_id}"
        signature = hmac.new(secret.encode("utf-8"), msg.encode("utf-8"), hashlib.sha256).hexdigest()
        self.stdout.write(f"   order_id={razorpay_order_id}")
        self.stdout.write(f"   payment_id={razorpay_payment_id}")
        self.stdout.write(f"   signature={signature[:16]}... (truncated)")

        self.stdout.write("STEP 6: Calling /api/payments/verify/ as this user (first attempt)")
        client = APIClient()
        client.force_authenticate(user=user)
        payload = {
            "razorpay_order_id": razorpay_order_id,
            "razorpay_payment_id": razorpay_payment_id,
            "razorpay_signature": signature,
        }
        response = client.post("/api/payments/verify/",payload,format="json",HTTP_HOST="localhost",)
        self.stdout.write(f"   Response status: {response.status_code}")
        body = getattr(response, "content", b"").decode("utf-8", errors="replace")
        self.stdout.write(f"   Response body: {body}")

        self.stdout.write("STEP 7: Checking what actually happened in the database")
        order.refresh_from_db()
        inventory.refresh_from_db()
        cart.refresh_from_db()
        payment = Payment.objects.filter(order=order).first()

        checks = {
            "Order status is PROCESSING": order.status == "PROCESSING",
            "Payment row exists with status SUCCESS": payment is not None and payment.status == "SUCCESS",
            "Stock decremented by 1": inventory.stock_qty == starting_stock - 1,
            "Cart is now empty": cart.items.count() == 0,
        }
        for label, passed in checks.items():
            mark = "PASS" if passed else "FAIL"
            self.stdout.write(f"   [{mark}] {label}")

        self.stdout.write("STEP 8: Calling /api/payments/verify/ AGAIN with the same payment (testing idempotency / double-submit protection)")
        response2 = client.post("/api/payments/verify/", payload, format="json",HTTP_HOST="localhost", ) 
        self.stdout.write(f"   Response status: {response2.status_code}")
        body2 = getattr(response2, "content", b"").decode("utf-8", errors="replace")
        self.stdout.write(f"   Response body: {body2}")

        inventory.refresh_from_db()
        no_double_decrement = inventory.stock_qty == starting_stock - 1
        mark = "PASS" if no_double_decrement else "FAIL"
        self.stdout.write(f"   [{mark}] Stock was NOT decremented a second time (still {inventory.stock_qty})")

        self.stdout.write(self.style.SUCCESS("Done. Review the PASS/FAIL lines above."))