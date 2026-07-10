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
        order = get_object_or_404(Order, razorpay_order_id=order_id, user=request.user)

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
            # Record failed transaction log
            Payment.objects.create(
                order=order,
                payment_method="RAZORPAY",
                razorpay_payment_id=payment_id,
                razorpay_signature=signature,
                amount=order.total_amount,
                status="FAILED"
            )
            return Response({"error": "Payment verification failed."}, status=status.HTTP_400_BAD_REQUEST)

        # Record successful transaction log
        Payment.objects.get_or_create(
            order=order,
            defaults={
                "payment_method": "RAZORPAY",
                "razorpay_payment_id": payment_id,
                "razorpay_signature": signature,
                "amount": order.total_amount,
                "status": "SUCCESS"
            }
        )

        # Update order status to PROCESSING (paid and ready for shipment)
        order.status = "PROCESSING"
        order.save()

        # Send real-time notification to database
        from apps.orders.models import Notification
        Notification.objects.create(
            user=request.user,
            title="Payment Successful",
            message=f"Payment of INR {order.total_amount} was successfully verified. Your order #{order.razorpay_order_id} is now processing.",
            notification_type="ORDER"
        )

        return Response({"message": "Payment verified successfully.", "status": "PROCESSING"}, status=status.HTTP_200_OK)

class RazorpayWebhookView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        # Razorpay triggers webhooks for async payment confirmations.
        # We can extend this view to process payment.captured events.
        return Response({"status": "received"}, status=status.HTTP_200_OK)
