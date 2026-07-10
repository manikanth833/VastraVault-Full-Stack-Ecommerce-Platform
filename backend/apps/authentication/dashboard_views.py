from rest_framework import views, permissions, status
from rest_framework.response import Response
from django.db.models import Sum, Count, Q
from django.db.models.functions import TruncMonth
from django.contrib.auth import get_user_model
from apps.orders.models import Order, OrderItem
from apps.products.models import Product, ProductVariant, Inventory
from apps.authentication.models import Role
from apps.authentication.permissions import IsAdminUser, IsSellerUser

User = get_user_model()

class SellerDashboardView(views.APIView):
    permission_classes = [IsSellerUser]

    def get(self, request):
        seller = request.user
        
        # 1. Total products and low stock alerts
        products = Product.objects.filter(seller=seller)
        total_products = products.count()
        
        low_stock_variants = ProductVariant.objects.filter(
            product__seller=seller,
            inventory__stock_qty__lte=models.F("inventory__low_stock_threshold")
        ).count() if hasattr(ProductVariant, "inventory") else 0
        
        # Safe fallback logic for query F-expressions
        low_stock_count = 0
        variants = ProductVariant.objects.filter(product__seller=seller)
        for var in variants:
            if hasattr(var, "inventory") and var.inventory.stock_qty <= var.inventory.low_stock_threshold:
                low_stock_count += 1

        # 2. Sales and Revenue stats
        order_items = OrderItem.objects.filter(variant__product__seller=seller, order__status__in=["PROCESSING", "SHIPPED", "DELIVERED"])
        total_sales_count = order_items.aggregate(Sum("quantity"))["quantity__sum"] or 0
        total_revenue = sum(item.quantity * item.price for item in order_items)

        # 3. Recent orders
        recent_items = order_items.order_by("-order__created_at")[:5]
        recent_orders = [
            {
                "order_id": item.order.id,
                "product_name": item.variant.product.name if item.variant else "Deleted",
                "sku": item.variant.sku if item.variant else "",
                "quantity": item.quantity,
                "price": str(item.price),
                "status": item.order.status,
                "date": item.order.created_at.strftime("%Y-%m-%d %H:%M"),
            }
            for item in recent_items
        ]

        # 4. Monthly revenue chart data
        monthly_sales = (
            order_items.annotate(month=TruncMonth("order__created_at"))
            .values("month")
            .annotate(revenue=Sum(models.F("quantity") * models.F("price")), count=Count("id"))
            .order_by("month")
        )
        
        # Calculate manually for absolute safety
        monthly_revenue_data = []
        for item in order_items:
            month_str = item.order.created_at.strftime("%b %Y")
            item_revenue = float(item.quantity * item.price)
            # group
            found = False
            for entry in monthly_revenue_data:
                if entry["name"] == month_str:
                    entry["revenue"] += item_revenue
                    entry["sales"] += item.quantity
                    found = True
                    break
            if not found:
                monthly_revenue_data.append({"name": month_str, "revenue": item_revenue, "sales": item.quantity})

        return Response({
            "total_products": total_products,
            "low_stock_count": low_stock_count,
            "total_sales_count": total_sales_count,
            "total_revenue": str(total_revenue),
            "recent_orders": recent_orders,
            "monthly_sales": monthly_revenue_data[:6],
        })

class AdminDashboardView(views.APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        def format_created_at(user):
            return user.created_at.strftime("%Y-%m-%d") if user.created_at else None

        # 1. Platform overview stats
        total_users = User.objects.count()
        total_customers = User.objects.filter(role__name=Role.CUSTOMER).count()
        total_sellers = User.objects.filter(role__name=Role.SELLER).count()

        customers = User.objects.filter(role__name=Role.CUSTOMER).order_by("-created_at")
        customers_list = [
            {
                "id": customer.id,
                "first_name": customer.first_name,
                "last_name": customer.last_name,
                "email": customer.email,
                "created_at": format_created_at(customer),
            }
            for customer in customers
        ]

        sellers = User.objects.filter(role__name=Role.SELLER).order_by("-created_at")
        sellers_list = [
            {
                "id": seller.id,
                "first_name": seller.first_name,
                "last_name": seller.last_name,
                "email": seller.email,
                "shop_name": seller.shop_name,
                "shop_description": seller.shop_description,
                "is_approved_seller": seller.is_approved_seller,
                "created_at": format_created_at(seller),
            }
            for seller in sellers
        ]
        
        orders = Order.objects.filter(status__in=["PROCESSING", "SHIPPED", "DELIVERED"])
        total_orders_count = orders.count()
        total_platform_revenue = orders.aggregate(Sum("total_amount"))["total_amount__sum"] or 0.00

        # 2. Seller approval queue
        pending_sellers = User.objects.filter(role__name=Role.SELLER, is_approved_seller=False)
        pending_sellers_list = [
            {
                "id": seller.id,
                "email": seller.email,
                "shop_name": seller.shop_name,
                "shop_description": seller.shop_description,
                "created_at": format_created_at(seller),
                "is_approved_seller": seller.is_approved_seller,
            }
            for seller in pending_sellers
        ]

        # 3. Coupon performance
        from apps.orders.models import Coupon
        coupons = Coupon.objects.all()
        coupons_list = [
            {
                "code": coupon.code,
                "type": coupon.discount_type,
                "value": str(coupon.value),
                "usages": coupon.usage_count,
                "limit": coupon.usage_limit,
                "active": coupon.active,
            }
            for coupon in coupons
        ]

        # 4. Platform Sales chart data
        sales_by_month = []
        for order in Order.objects.filter(status__in=["PROCESSING", "SHIPPED", "DELIVERED"]).order_by("created_at"):
            month_str = order.created_at.strftime("%b %Y")
            rev = float(order.total_amount)
            found = False
            for entry in sales_by_month:
                if entry["name"] == month_str:
                    entry["revenue"] += rev
                    entry["orders"] += 1
                    found = True
                    break
            if not found:
                sales_by_month.append({"name": month_str, "revenue": rev, "orders": 1})

        return Response({
            "total_users": total_users,
            "total_customers": total_customers,
            "total_sellers": total_sellers,
            "total_orders": total_orders_count,
            "total_revenue": str(total_platform_revenue),
            "customers": customers_list,
            "sellers": sellers_list,
            "pending_sellers": pending_sellers_list,
            "coupons": coupons_list,
            "monthly_sales": sales_by_month[:6],
        })

    def post(self, request):
        if request.path.rstrip("/").endswith("manage-user"):
            return self.manage_user(request)

        seller_id = request.data.get("seller_id")
        approve_raw = request.data.get("approve", True)

        if seller_id in [None, ""]:
            return Response(
                {"message": "seller_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        approve = approve_raw
        if isinstance(approve_raw, str):
            approve = approve_raw.strip().lower() in ("true", "1", "yes", "on")

        try:
            seller = User.objects.get(id=seller_id, role__name=Role.SELLER)
        except User.DoesNotExist:
            return Response(
                {"message": "Seller not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        seller_email = seller.email

        if approve:
            seller.is_approved_seller = True
            seller.save(update_fields=["is_approved_seller"])
            return Response({"message": f"Seller {seller_email} approved successfully."})

        seller.delete()
        return Response({"message": f"Seller {seller_email} rejected and account removed."})

    def manage_user(self, request):
        user_id = request.data.get("user_id")
        action = str(request.data.get("action", "")).strip().lower()

        if user_id in [None, ""]:
            return Response({"message": "user_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        if action not in ["delete"]:
            return Response({"message": "Invalid action."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            target_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"message": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        if not target_user.role:
            return Response({"message": "User role is required."}, status=status.HTTP_400_BAD_REQUEST)

        role_name = target_user.role.name
        if role_name not in [Role.CUSTOMER, Role.SELLER]:
            return Response({"message": "This user cannot be removed through admin management."}, status=status.HTTP_400_BAD_REQUEST)

        target_email = target_user.email
        target_user.delete()

        return Response({
            "message": f"{role_name.title()} {target_email} deleted successfully.",
            "deleted_id": user_id,
            "deleted_role": role_name,
        })
# Add import to resolve missing names
from django.db import models
