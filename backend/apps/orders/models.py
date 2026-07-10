import uuid
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator
from django.utils import timezone
from apps.products.models import ProductVariant

class Address(models.Model):
    ADDRESS_TYPES = (
        ("HOME", "Home"),
        ("WORK", "Work"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="addresses")
    name = models.CharField(max_length=150)
    phone = models.CharField(max_length=15)
    address_line_1 = models.CharField(max_length=255)
    address_line_2 = models.CharField(max_length=255, blank=True, null=True)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    pin_code = models.CharField(max_length=10, db_index=True)
    landmark = models.CharField(max_length=150, blank=True, null=True)
    address_type = models.CharField(max_length=10, choices=ADDRESS_TYPES, default="HOME")
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-is_default", "-created_at"]

    def save(self, *args, **kwargs):
        if self.is_default:
            Address.objects.filter(user=self.user, is_default=True).update(is_default=False)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name}, {self.city} - {self.pin_code}"

class Coupon(models.Model):
    COUPON_TYPES = (
        ("FLAT", "Flat Discount"),
        ("PERCENTAGE", "Percentage Discount"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=50, unique=True, db_index=True)
    discount_type = models.CharField(max_length=20, choices=COUPON_TYPES, default="PERCENTAGE")
    value = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    min_purchase = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, validators=[MinValueValidator(0)])
    max_discount = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True, validators=[MinValueValidator(0)])
    active = models.BooleanField(default=True, db_index=True)
    start_date = models.DateTimeField(default=timezone.now)
    end_date = models.DateTimeField()
    usage_limit = models.PositiveIntegerField(default=100)
    usage_count = models.PositiveIntegerField(default=0)

    def is_valid(self, order_amount=0):
        now = timezone.now()
        if not self.active:
            return False
        if now < self.start_date or now > self.end_date:
            return False
        if self.usage_count >= self.usage_limit:
            return False
        if order_amount < self.min_purchase:
            return False
        return True

    def __str__(self):
        return f"{self.code} ({self.discount_type}: {self.value})"

class Cart(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True, related_name="cart")
    session_key = models.CharField(max_length=255, unique=True, null=True, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Cart {self.id} for {self.user or self.session_key}"

class CartItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name="items")
    variant = models.ForeignKey(ProductVariant, on_delete=models.CASCADE, related_name="cart_items")
    quantity = models.PositiveIntegerField(default=1, validators=[MinValueValidator(1)])

    class Meta:
        unique_together = ("cart", "variant")

    def __str__(self):
        return f"{self.quantity} x {self.variant.sku}"

class Wishlist(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="wishlist")
    variant = models.ForeignKey(ProductVariant, on_delete=models.CASCADE, related_name="wishlisted")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "variant")

    def __str__(self):
        return f"{self.user.email} saved {self.variant.sku}"

class Order(models.Model):
    ORDER_STATUS = (
        ("PENDING", "Pending"),
        ("PROCESSING", "Processing"),
        ("SHIPPED", "Shipped"),
        ("DELIVERED", "Delivered"),
        ("CANCELLED", "Cancelled"),
        ("REFUND_REQUESTED", "Refund Requested"),
        ("RETURNED", "Returned"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="orders")
    
    # Store dynamic snapshot of addresses to keep record intact even if address is modified later
    shipping_address = models.JSONField()
    billing_address = models.JSONField(blank=True, null=True)
    
    status = models.CharField(max_length=20, choices=ORDER_STATUS, default="PENDING", db_index=True)
    
    # Financial breakdown
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    shipping_charge = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    coupon = models.ForeignKey(Coupon, on_delete=models.SET_NULL, null=True, blank=True, related_name="orders")
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    
    # Razorpay integration
    razorpay_order_id = models.CharField(max_length=255, unique=True, db_index=True)
    
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Order {self.id} (Status: {self.status})"

class OrderItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    variant = models.ForeignKey(ProductVariant, on_delete=models.SET_NULL, null=True, related_name="order_items")
    quantity = models.PositiveIntegerField()
    price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)]) # Store item price at the moment of order

    def __str__(self):
        return f"{self.quantity} x {self.variant.sku if self.variant else 'Deleted Item'}"

class Notification(models.Model):
    NOTIFICATION_TYPES = (
        ("ORDER", "Order Update"),
        ("STOCK", "Low Stock Alert"),
        ("OFFER", "Promotion/Offer"),
        ("GENERAL", "General Notification"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications")
    title = models.CharField(max_length=255)
    message = models.TextField()
    is_read = models.BooleanField(default=False, db_index=True)
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES, default="GENERAL")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Notification for {self.user.email}: {self.title}"
