import logging
from decimal import Decimal
from django.db import transaction

from apps.orders.models import Cart, Coupon, Notification, Order
from apps.orders.tasks import send_low_stock_alert_email, send_order_confirmation_email
from apps.products.models import ProductVariant
from apps.payments.models import Payment


logger = logging.getLogger(__name__)


def _apply_post_payment_side_effects(order):
    requires_manual_review = False

    cart = Cart.objects.select_for_update().filter(user=order.user).first()
    locked_items = []

    for item in order.items.select_related("variant").order_by("variant_id"):
        variant = ProductVariant.objects.select_for_update().select_related("inventory").filter(pk=item.variant_id).first()
        if not variant or not hasattr(variant, "inventory"):
            logger.error("Missing inventory for order %s item %s", order.id, item.id)
            requires_manual_review = True
            continue

        inventory = variant.inventory
        if inventory.stock_qty < item.quantity:
            logger.warning(
                "Insufficient inventory for order %s variant %s: stock %s, requested %s",
                order.id,
                variant.id,
                inventory.stock_qty,
                item.quantity,
            )
            return True

        locked_items.append((item, variant, inventory))

    if requires_manual_review:
        return True

    for item, variant, inventory in locked_items:
        inventory.stock_qty -= item.quantity

        inventory.save(update_fields=["stock_qty"])

        if inventory.stock_qty <= inventory.low_stock_threshold:
            send_low_stock_alert_email.delay(str(item.variant.id), inventory.stock_qty)

    if cart:
        cart.items.all().delete()

    return requires_manual_review


@transaction.atomic
def mark_order_paid(order, payment_id, signature, amount):
    order = Order.objects.select_for_update().get(pk=order.pk)
    expected_amount = int(Decimal(str(order.total_amount)) * 100)
    if expected_amount <= 0:
        logger.error(
            "Refusing to mark order %s paid because total_amount is invalid: %s",
            order.id,
            order.total_amount,
        )
        return False

    if amount != expected_amount:
        logger.warning("Payment amount mismatch for order %s: expected %s paise, got %s paise", order.id, expected_amount, amount)
        Order.objects.filter(id=order.id).update(requires_manual_review=True)
        return False

    existing_payment = Payment.objects.filter(razorpay_payment_id=payment_id, status="SUCCESS").first()
    if existing_payment and existing_payment.order_id != order.id:
        logger.warning(
            "Payment %s was already recorded for another order %s",
            payment_id,
            existing_payment.order_id,
        )
        return False
    if existing_payment and existing_payment.order_id == order.id:
        logger.info("Duplicate successful payment delivery for order %s and payment %s", order.id, payment_id)
        return False

    if order.status != "PENDING":
        logger.info("Skipping paid transition for order %s in status %s", order.id, order.status)
        return False

    coupon = None
    if order.coupon_id:
        coupon = Coupon.objects.select_for_update().get(pk=order.coupon_id)
        if not coupon.is_valid(order.subtotal):
            logger.warning("Coupon %s is no longer valid for order %s", coupon.code, order.id)
            order.requires_manual_review = True
            order.save(update_fields=["requires_manual_review"])
            return False

    payment, _ = Payment.objects.get_or_create(
        order=order,
        defaults={
            "payment_method": "RAZORPAY",
            "razorpay_payment_id": payment_id,
            "razorpay_signature": signature,
            "amount": order.total_amount,
            "status": "SUCCESS",
        },
    )

    payment.payment_method = "RAZORPAY"
    payment.razorpay_payment_id = payment_id
    payment.razorpay_signature = signature
    payment.amount = order.total_amount
    payment.status = "SUCCESS"
    payment.save()

    requires_manual_review = _apply_post_payment_side_effects(order)
    if requires_manual_review:
        order.requires_manual_review = True
        order.save(update_fields=["requires_manual_review"])
        return False

    if coupon:
        coupon.usage_count += 1
        coupon.save(update_fields=["usage_count"])

    order.status = "PROCESSING"
    order.save(update_fields=["status"])

    Notification.objects.create(
        user=order.user,
        title="Payment Successful",
        message=(
            f"Payment of INR {order.total_amount} was successfully verified. "
            f"Your order #{order.razorpay_order_id} is now processing."
        ),
        notification_type="ORDER",
    )

    send_order_confirmation_email.delay(str(order.id))
    return True
