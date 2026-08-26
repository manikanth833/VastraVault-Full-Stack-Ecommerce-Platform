import logging
from decimal import Decimal

from apps.orders.models import Cart, Notification, Order
from apps.orders.tasks import send_low_stock_alert_email, send_order_confirmation_email
from apps.products.models import Inventory
from apps.payments.models import Payment


logger = logging.getLogger(__name__)


def _apply_post_payment_side_effects(order):
    requires_manual_review = False

    cart = Cart.objects.select_for_update().filter(user=order.user).first()

    for item in order.items.select_related("variant").all():
        inventory = Inventory.objects.select_for_update().filter(variant=item.variant).first()
        if not inventory:
            logger.error("Missing inventory for order %s item %s", order.id, item.id)
            requires_manual_review = True
            continue

        if inventory.stock_qty < item.quantity:
            logger.warning(
                "Oversell clamp for order %s variant %s: stock %s, requested %s",
                order.id,
                item.variant_id,
                inventory.stock_qty,
                item.quantity,
            )
            inventory.stock_qty = 0
            requires_manual_review = True
        else:
            inventory.stock_qty -= item.quantity

        inventory.save(update_fields=["stock_qty"])

        if inventory.stock_qty <= inventory.low_stock_threshold:
            send_low_stock_alert_email.delay(str(item.variant.id), inventory.stock_qty)

    if cart:
        cart.items.all().delete()

    if requires_manual_review and not order.requires_manual_review:
        order.requires_manual_review = True
        order.save(update_fields=["requires_manual_review"])
    return requires_manual_review


def mark_order_paid(order, payment_id, signature, amount):
    expected_amount = int(Decimal(order.total_amount) * 100)
    if expected_amount <= 0:
        logger.error(
            "Refusing to mark order %s paid because total_amount is invalid: %s",
            order.id,
            order.total_amount,
        )
        return False

    if amount != expected_amount:
        logger.error(
            "Payment amount mismatch for order %s: expected %s paise, got %s paise",
            order.id,
            expected_amount,
            amount,
        )
        return False

    existing_payment = Payment.objects.filter(razorpay_payment_id=payment_id, status="SUCCESS").first()
    if existing_payment and existing_payment.order_id == order.id:
        logger.info("Duplicate successful payment delivery for order %s and payment %s", order.id, payment_id)
        return False

    if order.status != "PENDING":
        logger.info("Skipping paid transition for order %s in status %s", order.id, order.status)
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

    _apply_post_payment_side_effects(order)

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
