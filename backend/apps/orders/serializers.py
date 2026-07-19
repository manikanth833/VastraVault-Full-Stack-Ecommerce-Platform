from rest_framework import serializers
from apps.orders.models import Cart, CartItem, Wishlist, Order, OrderItem, Coupon
from apps.products.serializers import ProductVariantSerializer
from decimal import Decimal
class CartItemSerializer(serializers.ModelSerializer):
    variant_details = ProductVariantSerializer(source="variant", read_only=True)
    item_total = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = ["id", "variant", "variant_details", "quantity", "item_total"]

    def get_item_total(self, obj):
        return obj.quantity * obj.variant.final_price

class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    subtotal = serializers.SerializerMethodField()
    tax = serializers.SerializerMethodField()
    shipping = serializers.SerializerMethodField()
    total = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ["id", "items", "subtotal", "tax", "shipping", "total"]

    def get_subtotal(self, obj):
        return sum(item.quantity * item.variant.final_price for item in obj.items.all())

    def get_tax(self, obj):
        # 12% GST standard on sarees / apparel
        return self.get_subtotal(obj) * Decimal("0.12")

    def get_shipping(self, obj):
        # Free shipping above 2000 INR, else 150 INR
        subtotal = self.get_subtotal(obj)
        if subtotal == 0 or subtotal > 2000:
            return Decimal("0.00")
        return Decimal("150.00")

    def get_total(self, obj):
        return self.get_subtotal(obj) + self.get_tax(obj) + self.get_shipping(obj)

class WishlistSerializer(serializers.ModelSerializer):
    variant_details = ProductVariantSerializer(source="variant", read_only=True)

    class Meta:
        model = Wishlist
        fields = ["id", "variant", "variant_details", "created_at"]

class CouponSerializer(serializers.ModelSerializer):
    class Meta:
        model = Coupon
        fields = ["id", "code", "discount_type", "value", "min_purchase", "max_discount"]

class OrderItemSerializer(serializers.ModelSerializer):
    variant_details = ProductVariantSerializer(source="variant", read_only=True)

    class Meta:
        model = OrderItem
        fields = ["id", "variant", "variant_details", "quantity", "price"]

class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    user_email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "user_email",
            "shipping_address",
            "billing_address",
            "status",
            "subtotal",
            "tax_amount",
            "shipping_charge",
            "coupon",
            "discount_amount",
            "total_amount",
            "razorpay_order_id",
            "created_at",
            "updated_at",
            "items"
        ]
        read_only_fields = [
            "id",
            "status",
            "subtotal",
            "tax_amount",
            "shipping_charge",
            "discount_amount",
            "total_amount",
            "razorpay_order_id",
            "created_at"
        ]
