from celery import shared_task
from django.core.mail import send_mail
from apps.orders.models import Order
from apps.products.models import ProductVariant
from django.conf import settings

@shared_task
def send_order_confirmation_email(order_id):
    try:
        order = Order.objects.get(id=order_id)
        subject = f"Order Confirmed! - Ananya Sarees #{order.razorpay_order_id}"
        message = f"Hello {order.user.first_name or 'Valued Customer'},\n\n" \
                  f"Thank you for shopping with Ananya Sarees. We have received your order!\n\n" \
                  f"Order Details:\n" \
                  f"Order ID: {order.id}\n" \
                  f"Razorpay Order ID: {order.razorpay_order_id}\n" \
                  f"Total Amount: INR {order.total_amount}\n\n" \
                  f"We are processing your items. You will receive an update as soon as the package ships.\n\n" \
                  f"Best regards,\nAnanya Sarees Support Team"
        
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [order.user.email],
            fail_silently=False,
        )
        return f"Confirmation email sent for Order {order_id}"
    except Order.DoesNotExist:
        return f"Order {order_id} not found."

@shared_task
def send_low_stock_alert_email(variant_id, stock_qty):
    try:
        variant = ProductVariant.objects.get(id=variant_id)
        seller_email = variant.product.seller.email
        subject = f"Low Stock Warning: SKU {variant.sku}"
        message = f"Dear Seller,\n\n" \
                  f"This is an automated notification that the stock level for your product variant:\n" \
                  f"Product: {variant.product.name}\n" \
                  f"SKU: {variant.sku}\n" \
                  f"Color: {variant.color}\n" \
                  f"Size: {variant.size}\n\n" \
                  f"has dropped to {stock_qty}, which is below the defined threshold.\n\n" \
                  f"Please replenish the inventory to avoid missing out on customer purchases.\n\n" \
                  f"Best regards,\nAnanya Sarees Inventory System"
        
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [seller_email],
            fail_silently=False,
        )
        return f"Low stock email sent to {seller_email} for SKU {variant.sku}"
    except ProductVariant.DoesNotExist:
        return f"ProductVariant {variant_id} not found."
