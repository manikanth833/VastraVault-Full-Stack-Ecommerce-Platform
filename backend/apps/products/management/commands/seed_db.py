import random
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import transaction
from apps.authentication.models import Role, Permission
from apps.products.models import Category, Product, ProductVariant, ProductImage, Inventory, Review
from apps.orders.models import Address, Coupon, Order, OrderItem
from apps.payments.models import Payment

User = get_user_model()

class Command(BaseCommand):
    help = "Seeds the database with premium saree brand mock data."

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write("Starting database seeding...")

        # 1. Clear existing data
        self.stdout.write("Clearing existing data...")
        Payment.objects.all().delete()
        OrderItem.objects.all().delete()
        Order.objects.all().delete()
        Address.objects.all().delete()
        Coupon.objects.all().delete()
        Review.objects.all().delete()
        Inventory.objects.all().delete()
        ProductImage.objects.all().delete()
        ProductVariant.objects.all().delete()
        Product.objects.all().delete()
        Category.objects.all().delete()
        User.objects.all().delete()
        Role.objects.all().delete()
        Permission.objects.all().delete()

        # 2. Seed Roles and Permissions
        self.stdout.write("Seeding Roles and Permissions...")
        p_manage_catalog, _ = Permission.objects.get_or_create(name="manage_catalog", description="Create and edit products")
        p_manage_orders, _ = Permission.objects.get_or_create(name="manage_orders", description="Fulfill orders")
        p_moderate_users, _ = Permission.objects.get_or_create(name="moderate_users", description="Approve sellers and edit users")

        role_admin, _ = Role.objects.get_or_create(name=Role.ADMIN, description="Administrator with full privileges")
        role_seller, _ = Role.objects.get_or_create(name=Role.SELLER, description="Seller with catalog and order capabilities")
        role_customer, _ = Role.objects.get_or_create(name=Role.CUSTOMER, description="Customer shopping account")

        role_admin.permissions.set([p_manage_catalog, p_manage_orders, p_moderate_users])
        role_seller.permissions.set([p_manage_catalog, p_manage_orders])

        # 3. Seed Users
        self.stdout.write("Seeding Users...")
        admin = User.objects.create_superuser(
            email="admin@ananya.com",
            password="adminpassword123",
            first_name="Ananya",
            last_name="Admin"
        )
        admin.role = role_admin
        admin.save()

        seller_approved = User.objects.create_user(
            email="varanasi_weaves@ananya.com",
            password="sellerpassword123",
            first_name="Rajesh",
            last_name="Kumar",
            role=role_seller,
            is_approved_seller=True,
            shop_name="Varanasi Royal Weaves",
            shop_description="Exquisite handwoven Banarasi sarees straight from the looms of Kashi."
        )

        seller_unapproved = User.objects.create_user(
            email="kanchi_silks@ananya.com",
            password="sellerpassword123",
            first_name="Srinivasan",
            last_name="Rao",
            role=role_seller,
            is_approved_seller=False,
            shop_name="Kanchipuram Heritage Silks",
            shop_description="Pure mulberry silk sarees with authentic zari boarders."
        )

        customer = User.objects.create_user(
            email="priya_sharma@gmail.com",
            password="customerpassword123",
            first_name="Priya",
            last_name="Sharma",
            role=role_customer
        )

        customer2 = User.objects.create_user(
            email="neha_patel@gmail.com",
            password="customerpassword123",
            first_name="Neha",
            last_name="Patel",
            role=role_customer
        )

        # 4. Seed Addresses
        self.stdout.write("Seeding Addresses...")
        addr1 = Address.objects.create(
            user=customer,
            name="Priya Sharma",
            phone="9876543210",
            address_line_1="Apt 405, Prestige Orchards",
            address_line_2="Koramangala 3rd Block",
            city="Bengaluru",
            state="Karnataka",
            pin_code="560034",
            landmark="Near Post Office",
            address_type="HOME",
            is_default=True
        )

        addr2 = Address.objects.create(
            user=customer,
            name="Priya Sharma Office",
            phone="9876543211",
            address_line_1="Level 5, Embassy TechVillage",
            address_line_2="Outer Ring Road",
            city="Bengaluru",
            state="Karnataka",
            pin_code="560103",
            landmark="Devarabeesanahalli",
            address_type="WORK",
            is_default=False
        )

        # 5. Seed Coupons
        self.stdout.write("Seeding Coupons...")
        Coupon.objects.create(
            code="WELCOME10",
            discount_type="PERCENTAGE",
            value=10.00,
            min_purchase=1000.00,
            max_discount=500.00,
            active=True,
            start_date=timezone.now(),
            end_date=timezone.now() + timezone.timedelta(days=365)
        )
        Coupon.objects.create(
            code="FESTIVE500",
            discount_type="FLAT",
            value=500.00,
            min_purchase=3000.00,
            active=True,
            start_date=timezone.now(),
            end_date=timezone.now() + timezone.timedelta(days=90)
        )

        # 6. Seed Categories
        self.stdout.write("Seeding Categories...")
        cat_silk = Category.objects.create(
            name="Silk Sarees",
            slug="silk-sarees",
            description="Pure luxury handloom silk sarees including Banarasi and Kanjeevarams.",
            image_url="https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=600&q=80"
        )
        cat_cotton = Category.objects.create(
            name="Cotton & Linen",
            slug="cotton-linen",
            description="Breathable light-weight sarees for premium daily wear and gatherings.",
            image_url="https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=600&q=80"
        )
        cat_organza = Category.objects.create(
            name="Organza & Georgette",
            slug="organza-georgette",
            description="Sheer elegance with delicate floral embroidery and gold borders.",
            image_url="https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=600&q=80"
        )

        # 7. Seed Products, Variants, Images & Inventory
        self.stdout.write("Seeding Products...")
        
        # Product 1: Banarasi Silk
        p1 = Product.objects.create(
            category=cat_silk,
            seller=seller_approved,
            name="Royal Crimson Banarasi Katan Silk Saree",
            slug="royal-crimson-banarasi-katan-silk-saree",
            description="Handwoven pure katan silk saree featuring intricate gold zari floral jal weave all over the body, matching border, and pallu. Includes custom silk unstitched blouse piece.",
            brand="Ananya Heritage",
            base_price=9500.00
        )
        
        v1_red = ProductVariant.objects.create(product=p1, sku="AN-BAN-RED-001", color="Crimson Red", size="Free Size")
        v1_gold = ProductVariant.objects.create(product=p1, sku="AN-BAN-GLD-002", color="Antique Gold", size="Free Size", additional_price=500.00)
        
        Inventory.objects.create(variant=v1_red, stock_qty=15, low_stock_threshold=3)
        Inventory.objects.create(variant=v1_gold, stock_qty=8, low_stock_threshold=3)

        ProductImage.objects.create(
            variant=v1_red,
            image_url="https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80",
            is_primary=True,
            sort_order=1
        )
        ProductImage.objects.create(
            variant=v1_gold,
            image_url="https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=800&q=80",
            is_primary=True,
            sort_order=1
        )

        # Product 2: Kanjeevaram Silk
        p2 = Product.objects.create(
            category=cat_silk,
            seller=seller_approved,
            name="Traditional Kanjeevaram Silk Saree",
            slug="traditional-kanjeevaram-silk-saree",
            description="Classic handloom Kanchipuram silk saree with contrast korvai borders containing heavy elephant and peacock motifs woven in pure gold thread.",
            brand="Ananya Heritage",
            base_price=12500.00
        )
        v2_blue = ProductVariant.objects.create(product=p2, sku="AN-KAN-BLU-001", color="Royal Blue", size="Free Size")
        v2_green = ProductVariant.objects.create(product=p2, sku="AN-KAN-GRN-002", color="Forest Green", size="Free Size")
        
        Inventory.objects.create(variant=v2_blue, stock_qty=5, low_stock_threshold=2)
        Inventory.objects.create(variant=v2_green, stock_qty=2, low_stock_threshold=2) # Low stock alert triggers early

        ProductImage.objects.create(
            variant=v2_blue,
            image_url="https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80",
            is_primary=True,
            sort_order=1
        )
        ProductImage.objects.create(
            variant=v2_green,
            image_url="https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80",
            is_primary=True,
            sort_order=1
        )

        # Product 3: Linen Zari
        p3 = Product.objects.create(
            category=cat_cotton,
            seller=seller_approved,
            name="Pastel Linen Zari Border Saree",
            slug="pastel-linen-zari-border-saree",
            description="Organic hand-spun 100 count linen saree with light silver zari border. Highly breathable, comfortable, and perfect for elegant office wear and summer events.",
            brand="Ananya Breeze",
            base_price=3500.00
        )
        v3_pink = ProductVariant.objects.create(product=p3, sku="AN-LIN-PNK-001", color="Blush Pink", size="Free Size")
        v3_yellow = ProductVariant.objects.create(product=p3, sku="AN-LIN-YEL-002", color="Primrose Yellow", size="Free Size")
        
        Inventory.objects.create(variant=v3_pink, stock_qty=22, low_stock_threshold=5)
        Inventory.objects.create(variant=v3_yellow, stock_qty=18, low_stock_threshold=5)

        ProductImage.objects.create(
            variant=v3_pink,
            image_url="https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80",
            is_primary=True,
            sort_order=1
        )
        ProductImage.objects.create(
            variant=v3_yellow,
            image_url="https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80",
            is_primary=True,
            sort_order=1
        )

        # Product 4: Floral Organza
        p4 = Product.objects.create(
            category=cat_organza,
            seller=seller_approved,
            name="Embroidered Floral Organza Saree",
            slug="embroidered-floral-organza-saree",
            description="Glass organza saree showcasing delicate pastel floral threadwork embroidery on a sheer transparent backdrop, finished with scalloped border detailing.",
            brand="Ananya Luxe",
            base_price=4200.00
        )
        v4_peach = ProductVariant.objects.create(product=p4, sku="AN-ORG-PCH-001", color="Peach Bloom", size="Free Size")
        
        Inventory.objects.create(variant=v4_peach, stock_qty=12, low_stock_threshold=4)
        
        ProductImage.objects.create(
            variant=v4_peach,
            image_url="https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=800&q=80",
            is_primary=True,
            sort_order=1
        )

        # 8. Seed Reviews
        self.stdout.write("Seeding Reviews...")
        Review.objects.create(
            product=p1,
            user=customer,
            rating=5,
            title="Absolutely stunning color!",
            comment="The katan silk is extremely rich in texture and the crimson red color is perfect for bridal wear. Worth every rupee!",
            verified_purchase=True
        )
        Review.objects.create(
            product=p1,
            user=customer2,
            rating=4,
            title="Premium Saree, elegant border",
            comment="Very beautiful craftsmanship. Deducted 1 star because delivery took 5 days, but the saree itself is flawless.",
            verified_purchase=True
        )
        Review.objects.create(
            product=p3,
            user=customer,
            rating=5,
            title="Comfortable linen",
            comment="Loved the blush pink linen saree. Light, beautiful drape, very elegant for corporate functions.",
            verified_purchase=True
        )

        # 9. Seed Orders, OrderItems and Payments (for Sales Dashboard metrics)
        self.stdout.write("Seeding past Order analytics...")
        
        # Order 1: Delivered
        order1 = Order.objects.create(
            user=customer,
            shipping_address={
                "name": "Priya Sharma",
                "phone": "9876543210",
                "address_line_1": "Apt 405, Prestige Orchards",
                "address_line_2": "Koramangala 3rd Block",
                "city": "Bengaluru",
                "state": "Karnataka",
                "pin_code": "560034",
                "landmark": "Near Post Office"
            },
            status="DELIVERED",
            subtotal=9500.00,
            tax_amount=1140.00,
            shipping_charge=0.00,
            discount_amount=0.00,
            total_amount=10640.00,
            razorpay_order_id="order_dbseed001"
        )
        OrderItem.objects.create(order=order1, variant=v1_red, quantity=1, price=9500.00)
        Payment.objects.create(
            order=order1,
            payment_method="RAZORPAY",
            razorpay_payment_id="pay_dbseed_payment001",
            amount=10640.00,
            status="SUCCESS"
        )
        
        # Order 2: Processing (recent sale)
        order2 = Order.objects.create(
            user=customer2,
            shipping_address={
                "name": "Neha Patel",
                "phone": "9998887776",
                "address_line_1": "12, Shanti Nagar",
                "address_line_2": "C.G. Road",
                "city": "Ahmedabad",
                "state": "Gujarat",
                "pin_code": "380009",
                "landmark": "Opposite Sports Club"
            },
            status="PROCESSING",
            subtotal=3500.00,
            tax_amount=420.00,
            shipping_charge=0.00,
            discount_amount=350.00, # applied WELCOME10 coupon
            total_amount=3570.00,
            razorpay_order_id="order_dbseed002"
        )
        OrderItem.objects.create(order=order2, variant=v3_pink, quantity=1, price=3500.00)
        Payment.objects.create(
            order=order2,
            payment_method="RAZORPAY",
            razorpay_payment_id="pay_dbseed_payment002",
            amount=3570.00,
            status="SUCCESS"
        )

        self.stdout.write(self.style.SUCCESS("Database seeded successfully with premium saree catalog data!"))
