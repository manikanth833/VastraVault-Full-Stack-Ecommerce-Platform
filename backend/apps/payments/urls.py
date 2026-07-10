from django.urls import path
from apps.payments.views import PaymentVerificationView, RazorpayWebhookView

urlpatterns = [
    path("verify/", PaymentVerificationView.as_view(), name="payment-verify"),
    path("webhook/", RazorpayWebhookView.as_view(), name="payment-webhook"),
]
