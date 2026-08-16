import json
import logging
import hmac
import hashlib
from rest_framework import views, permissions, status
from rest_framework.response import Response
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.conf import settings
from apps.orders.models import Order
from apps.payments.models import Payment
from apps.payments.serializers import PaymentVerificationSerializer
from apps.payments.utils import mark_order_paid


logger = logging.getLogger(__name__)

class PaymentVerificationView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        serializer = PaymentVerificationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        order_id = serializer.validated_data["razorpay_order_id"]
        payment_id = serializer.validated_data["razorpay_payment_id"]
        signature = serializer.validated_data["razorpay_signature"]

        # Retrieve order
        order = get_object_or_404(Order.objects.select_for_update(), razorpay_order_id=order_id, user=request.user)

        # Signature verification check
        is_verified = False
        
        # If running with mock settings in debug mode, auto-approve mock checkouts
        if settings.DEBUG and (order_id.startswith("order_mock_") or payment_id.startswith("pay_mock_")):
            is_verified = True
        else:
            # Standard Razorpay HMAC verification
            # signature = HMAC-SHA256(order_id + "|" + payment_id, secret)
            msg = f"{order_id}|{payment_id}"
            secret = settings.RAZORPAY_KEY_SECRET or "mocksecretkey12345678"
            try:
                generated_signature = hmac.new(
                    key=secret.encode("utf-8"),
                    msg=msg.encode("utf-8"),
                    digestmod=hashlib.sha256
                ).hexdigest()
                is_verified = hmac.compare_digest(generated_signature, signature)
            except Exception:
                is_verified = False

        if not is_verified:
            Payment.objects.update_or_create(
                order=order,
                defaults={
                    "payment_method": "RAZORPAY",
                    "razorpay_payment_id": payment_id,
                    "razorpay_signature": signature,
                    "amount": order.total_amount,
                    "status": "FAILED",
                },
            )
            return Response({"error": "Payment verification failed."}, status=status.HTTP_400_BAD_REQUEST)

        processed = mark_order_paid(order, payment_id, signature, int(order.total_amount * 100))
        if not processed and order.status != "PROCESSING":
            return Response({"error": "Payment verification failed."}, status=status.HTTP_400_BAD_REQUEST)

        return Response({"message": "Payment verified successfully.", "status": "PROCESSING"}, status=status.HTTP_200_OK)

class RazorpayWebhookView(views.APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        webhook_secret = settings.RAZORPAY_WEBHOOK_SECRET
        if not webhook_secret:
            logger.warning("Razorpay webhook secret is not configured; skipping webhook processing.")
            return Response({"status": "received"}, status=status.HTTP_200_OK)

        signature = request.headers.get("X-Razorpay-Signature")
        expected_signature = hmac.new(
            webhook_secret.encode("utf-8"),
            request.body,
            hashlib.sha256,
        ).hexdigest()
        if not signature or not hmac.compare_digest(expected_signature, signature):
            return Response({"error": "Invalid webhook signature."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            payload = json.loads(request.body.decode("utf-8"))
            event = payload.get("event")

            if event == "payment.captured":
                payment_entity = payload["payload"]["payment"]["entity"]
                order_id = payment_entity["order_id"]
                payment_id = payment_entity["id"]
                amount = int(payment_entity["amount"])
                currency = payment_entity.get("currency")

                if currency and currency != "INR":
                    logger.error("Rejecting webhook for order %s due to unsupported currency %s", order_id, currency)
                    return Response({"status": "received"}, status=status.HTTP_200_OK)

                with transaction.atomic():
                    order = Order.objects.select_for_update().filter(razorpay_order_id=order_id).first()
                    if not order:
                        logger.info("Ignoring payment.captured webhook for unknown order %s", order_id)
                        return Response({"status": "received"}, status=status.HTTP_200_OK)
                    processed = mark_order_paid(order, payment_id, signature, amount)
                    if not processed:
                        logger.info("No-op payment.captured webhook for order %s", order_id)

                return Response({"status": "received"}, status=status.HTTP_200_OK)

            if event == "payment.failed":
                try:
                    payment_entity = payload["payload"]["payment"]["entity"]
                    order_id = payment_entity.get("order_id")
                    payment_id = payment_entity.get("id")
                    logger.warning("Razorpay payment failed for order %s payment %s", order_id, payment_id)
                    order = Order.objects.filter(razorpay_order_id=order_id).first()
                    if order and order.status == "PENDING":
                        logger.info("Leaving order %s pending after failed payment attempt", order.id)
                except Exception:
                    logger.exception("Failed to process payment.failed webhook payload")
                return Response({"status": "received"}, status=status.HTTP_200_OK)

            return Response({"status": "received"}, status=status.HTTP_200_OK)
        except Exception:
            logger.exception("Failed to process Razorpay webhook payload")
            return Response({"status": "received"}, status=status.HTTP_200_OK)
