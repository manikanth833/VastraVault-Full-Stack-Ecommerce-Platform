import uuid
from decimal import Decimal
from django.shortcuts import get_object_or_404
from django.db import transaction
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from apps.orders.models import Cart, CartItem, Wishlist, Order, OrderItem, Coupon, Address
from apps.products.models import ProductVariant, Inventory
from apps.orders.serializers import (
    CartSerializer,
    WishlistSerializer,
    OrderSerializer,
    CouponSerializer
)
from apps.authentication.permissions import IsAdminUser, IsSellerUser
from django.conf import settings
from apps.orders.utils import calculate_pricing, CouponPricingError

# Safe Razorpay initialization with mock fallback for dev
try:
    import razorpay
    if settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET:
        razorpay_client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
    else:
        razorpay_client = None
except ImportError:
    razorpay_client = None

class CartViewSet(viewsets.ViewSet):
    permission_classes = [permissions.AllowAny]

    def _get_guest_cart_token(self, request):
        return request.headers.get("X-Guest-Cart-Token") or request.session.session_key

    def _parse_positive_quantity(self, raw_quantity):
        try:
            quantity = int(raw_quantity)
        except (TypeError, ValueError):
            return None, Response(
                {"error": "quantity must be a positive integer"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if quantity <= 0:
            return None, Response(
                {"error": "quantity must be a positive integer"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return quantity, None

    def _get_or_create_cart(self, request):
        if request.user.is_authenticated:
            cart, _ = Cart.objects.get_or_create(user=request.user)
            return cart
        else:
            session_key = self._get_guest_cart_token(request)
            if not session_key:
                # If session does not exist, create a unique token
                session_key = str(uuid.uuid4())
            cart, _ = Cart.objects.get_or_create(session_key=session_key)
            return cart

    @action(detail=False, methods=["GET"])
    def current(self, request):
        cart = self._get_or_create_cart(request)
        serializer = CartSerializer(cart)
        # Add guest cart token to response headers if guest
        response = Response(serializer.data)
        if not request.user.is_authenticated:
            response["X-Guest-Cart-Token"] = cart.session_key
        return response

    @action(detail=False, methods=["GET"])
    def preview(self, request):
        cart = self._get_or_create_cart(request)
        coupon_code = request.query_params.get("coupon_code", "")
        subtotal = sum((item.quantity * item.variant.final_price for item in cart.items.all()), Decimal("0.00"))

        try:
            pricing = calculate_pricing(subtotal, coupon_code, strict_coupon=True)
        except CouponPricingError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            {
                "subtotal": pricing["subtotal"],
                "tax": pricing["tax_amount"],
                "shipping": pricing["shipping_charge"],
                "discount_amount": pricing["discount_amount"],
                "total": pricing["total_amount"],
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["POST"])
    def add_item(self, request):
        cart = self._get_or_create_cart(request)
        variant_id = request.data.get("variant_id")
        quantity, error_response = self._parse_positive_quantity(request.data.get("quantity", 1))
        if error_response:
            return error_response

        variant = get_object_or_404(ProductVariant, id=variant_id)
        
        # Stock validation
        try:
            inventory = variant.inventory
            if inventory.stock_qty < quantity:
                return Response(
                    {"error": f"Only {inventory.stock_qty} items in stock."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except Inventory.DoesNotExist:
            return Response({"error": "Inventory record not found"}, status=status.HTTP_400_BAD_REQUEST)

        cart_item, created = CartItem.objects.get_or_create(cart=cart, variant=variant)
        if not created:
            new_qty = cart_item.quantity + quantity
            if inventory.stock_qty < new_qty:
                return Response(
                    {"error": f"Cannot add more items. Max available stock is {inventory.stock_qty}."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            cart_item.quantity = new_qty
        else:
            cart_item.quantity = quantity
        
        cart_item.save()
        return Response(CartSerializer(cart).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["POST"])
    def update_item(self, request):
        cart = self._get_or_create_cart(request)
        variant_id = request.data.get("variant_id")
        quantity, error_response = self._parse_positive_quantity(request.data.get("quantity"))
        if error_response:
            return error_response

        cart_item = get_object_or_404(CartItem, cart=cart, variant_id=variant_id)
        
        # Stock validation
        if quantity > cart_item.variant.inventory.stock_qty:
            return Response(
                {"error": f"Only {cart_item.variant.inventory.stock_qty} items in stock."},
                status=status.HTTP_400_BAD_REQUEST
            )

        cart_item.quantity = quantity
        cart_item.save()
        return Response(CartSerializer(cart).data)

    @action(detail=False, methods=["POST"])
    def remove_item(self, request):
        cart = self._get_or_create_cart(request)
        variant_id = request.data.get("variant_id")
        
        cart_item = get_object_or_404(CartItem, cart=cart, variant_id=variant_id)
        cart_item.delete()
        return Response(CartSerializer(cart).data)

    @action(detail=False, methods=["POST"])
    def merge(self, request):
        guest_token = request.data.get("guest_token")
        if not request.user.is_authenticated or not guest_token:
            return Response({"error": "Invalid action"}, status=status.HTTP_400_BAD_REQUEST)
        
        user_cart, _ = Cart.objects.get_or_create(user=request.user)
        try:
            guest_cart = Cart.objects.get(session_key=guest_token)
            for item in guest_cart.items.all():
                user_item, created = CartItem.objects.get_or_create(cart=user_cart, variant=item.variant)
                if created:
                    user_item.quantity = item.quantity
                else:
                    user_item.quantity = min(
                        user_item.quantity + item.quantity,
                        item.variant.inventory.stock_qty
                    )
                user_item.save()
            guest_cart.delete()
        except Cart.DoesNotExist:
            pass
            
        return Response(CartSerializer(user_cart).data)

class WishlistViewSet(viewsets.ModelViewSet):
    serializer_class = WishlistSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Wishlist.objects.filter(user=self.request.user)

    def create(self, request, *args, **kwargs):
        variant_id = request.data.get("variant_id")
        variant = get_object_or_404(ProductVariant, id=variant_id)
        
        wishlist_item, created = Wishlist.objects.get_or_create(user=request.user, variant=variant)
        if not created:
            return Response({"message": "Item already in wishlist"}, status=status.HTTP_200_OK)
            
        return Response(WishlistSerializer(wishlist_item).data, status=status.HTTP_201_CREATED)
        
    def destroy(self, request, pk=None):
        wishlist_item = get_object_or_404(Wishlist, user=request.user, id=pk)
        wishlist_item.delete()
        return Response({"message": "Removed from wishlist"}, status=status.HTTP_204_NO_CONTENT)

class CouponViewSet(viewsets.ViewSet):
    permission_classes = [permissions.AllowAny]

    @action(detail=False, methods=["POST"])
    def validate(self, request):
        code = request.data.get("code", "").upper()
        amount = float(request.data.get("amount", 0))

        try:
            pricing = calculate_pricing(amount, code, strict_coupon=True)
        except CouponPricingError as exc:
            return Response({"valid": False, "error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            "valid": True,
            "code": pricing["coupon"].code,
            "discount_amount": pricing["discount_amount"],
            "coupon_id": pricing["coupon"].id
        })

class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        role_name = user.role.name if user.role else "CUSTOMER"

        if role_name == "ADMIN":
            return Order.objects.all()
        elif role_name == "SELLER":
            # Return orders that contain products belonging to this seller
            return Order.objects.filter(items__variant__product__seller=user).distinct()
        else:
            # Customer
            return Order.objects.filter(user=user)

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        user = request.user
        cart = get_object_or_404(Cart, user=user)
        address_id = request.data.get("address_id")
        coupon_code = request.data.get("coupon_code")

        if not cart.items.exists():
            return Response({"error": "Cart is empty"}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Verify Stock
        for item in cart.items.all():
            if item.variant.inventory.stock_qty < item.quantity:
                return Response(
                    {"error": f"Insufficient stock for {item.variant.sku}. Only {item.variant.inventory.stock_qty} left."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # 2. Fetch shipping address details
        address = get_object_or_404(Address, id=address_id, user=user)
        address_snapshot = {
            "name": address.name,
            "phone": address.phone,
            "address_line_1": address.address_line_1,
            "address_line_2": address.address_line_2,
            "city": address.city,
            "state": address.state,
            "pin_code": address.pin_code,
            "landmark": address.landmark,
        }

        # 3. Calculate values
        subtotal = sum((item.quantity * item.variant.final_price for item in cart.items.all()), Decimal("0.00"))
        pricing = calculate_pricing(subtotal, coupon_code, strict_coupon=False)
        discount_amount = pricing["discount_amount"]
        tax_amount = pricing["tax_amount"]
        shipping_charge = pricing["shipping_charge"]
        total_amount = pricing["total_amount"]
        coupon_obj = pricing["coupon"]

        if coupon_obj:
            coupon_obj.usage_count += 1
            coupon_obj.save(update_fields=["usage_count"])

        # 4. Integrate Razorpay Order creation
        razorpay_order_id = f"order_mock_{uuid.uuid4().hex[:12]}"
        if razorpay_client:
            try:
                razorpay_order = razorpay_client.order.create({
                    "amount": int(total_amount * 100), # Amount in paise
                    "currency": "INR",
                    "receipt": f"receipt_order_{uuid.uuid4().hex[:6]}",
                })
                razorpay_order_id = razorpay_order["id"]
            except Exception as e:
                # Log error or fallback to mock order in staging
                pass

        # 5. Create Order
        order = Order.objects.create(
            user=user,
            shipping_address=address_snapshot,
            subtotal=subtotal,
            tax_amount=tax_amount,
            shipping_charge=shipping_charge,
            coupon=coupon_obj,
            discount_amount=discount_amount,
            total_amount=total_amount,
            razorpay_order_id=razorpay_order_id,
            status="PENDING"
        )

        # 6. Save Order items and decrement inventory stock
        for item in cart.items.all():
            OrderItem.objects.create(
                order=order,
                variant=item.variant,
                quantity=item.quantity,
                price=item.variant.final_price
            )
            # Decrement inventory stock
            inventory = item.variant.inventory
            inventory.stock_qty -= item.quantity
            inventory.save()

            # Trigger Celery background check if stock drops below threshold (simulated as task calls)
            if inventory.stock_qty <= inventory.low_stock_threshold:
                # We will import background task here
                from apps.orders.tasks import send_low_stock_alert_email
                send_low_stock_alert_email.delay(str(item.variant.id), inventory.stock_qty)

        # 7. Clear cart
        cart.items.all().delete()

        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["POST"], permission_classes=[permissions.IsAuthenticated])
    def update_status(self, request, pk=None):
        order = self.get_object()
        new_status = request.data.get("status")
        
        valid_statuses = [choice[0] for choice in Order.ORDER_STATUS]
        if new_status not in valid_statuses:
            return Response({"error": "Invalid status"}, status=status.HTTP_400_BAD_REQUEST)
        
        # RBAC Check: Seller can only change status to PROCESSING or SHIPPED, and only if they own items
        user = request.user
        role_name = user.role.name if user.role else "CUSTOMER"

        if role_name == "SELLER":
            if new_status not in ["PROCESSING", "SHIPPED"]:
                return Response({"error": "Sellers can only set status to PROCESSING or SHIPPED"}, status=status.HTTP_403_FORBIDDEN)
        
        order.status = new_status
        order.save()
        return Response(OrderSerializer(order).data)
