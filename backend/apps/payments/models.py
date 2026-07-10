import uuid
from django.db import models
from django.core.validators import MinValueValidator
from apps.orders.models import Order

class Payment(models.Model):
    PAYMENT_STATUS = (
        ("SUCCESS", "Success"),
        ("FAILED", "Failed"),
        ("REFUNDED", "Refunded"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name="payment")
    payment_method = models.CharField(max_length=50, default="RAZORPAY")
    
    # Razorpay Transaction IDs
    razorpay_payment_id = models.CharField(max_length=255, unique=True, db_index=True)
    razorpay_signature = models.CharField(max_length=255, blank=True, null=True)
    
    amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    status = models.CharField(max_length=20, choices=PAYMENT_STATUS, default="SUCCESS")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Payment {self.razorpay_payment_id} for Order {self.order.id} (Status: {self.status})"
