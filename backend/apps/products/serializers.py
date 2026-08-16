from rest_framework import serializers
from apps.products.models import Category, Product, ProductVariant, ProductImage, Inventory, Review
from django.db.models import Avg

class CategorySerializer(serializers.ModelSerializer):
    subcategories = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ["id", "name", "slug", "description", "image_url", "parent", "subcategories"]

    def get_subcategories(self, obj):
        # Prevent deep recursion, just show child details without further nesting
        children = obj.subcategories.all()
        return [
            {
                "id": child.id,
                "name": child.name,
                "slug": child.slug,
                "description": child.description,
                "image_url": child.image_url,
            }
            for child in children
        ]

class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ["id", "image_url", "cloudinary_public_id", "is_primary", "sort_order"]

class ProductVariantSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_slug = serializers.CharField(source="product.slug", read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)
    stock_qty = serializers.IntegerField(source="inventory.stock_qty", read_only=True)
    final_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = ProductVariant
        fields = [
            "id",
            "product_name",
            "product_slug",
            "sku",
            "color",
            "size",
            "additional_price",
            "final_price",
            "stock_qty",
            "images",
        ]

class ReviewSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = Review
        fields = ["id", "rating", "title", "comment", "verified_purchase", "user_email", "created_at"]
        read_only_fields = ["id", "verified_purchase", "created_at"]

    def create(self, validated_data):
        user = self.context["request"].user
        return Review.objects.create(user=user, **validated_data)

class ProductListSerializer(serializers.ModelSerializer):
    category_id = serializers.CharField(source="category.id", read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)
    category_slug = serializers.CharField(source="category.slug", read_only=True)
    primary_image = serializers.SerializerMethodField()
    avg_rating = serializers.SerializerMethodField()
    in_stock = serializers.SerializerMethodField()
    stock_qty = serializers.SerializerMethodField()
    is_active = serializers.BooleanField(read_only=True)

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "slug",
            "brand",
            "base_price",
            "category_id",
            "category_name",
            "category_slug",
            "primary_image",
            "avg_rating",
            "in_stock",
            "stock_qty",
            "is_active",
            "created_at"
        ]

    def get_primary_image(self, obj):
        # Get primary image from the first variant that has images
        first_variant = obj.variants.first()
        if first_variant:
            primary_img = first_variant.images.filter(is_primary=True).first() or first_variant.images.first()
            if primary_img:
                return primary_img.image_url
        return None

    def get_avg_rating(self, obj):
        return obj.reviews.aggregate(Avg("rating"))["rating__avg"] or 0.0

    def get_in_stock(self, obj):
        # Check if any variant has stock > 0
        return any(v.inventory.stock_qty > 0 for v in obj.variants.all() if hasattr(v, "inventory"))

    def get_stock_qty(self, obj):
        return sum(v.inventory.stock_qty for v in obj.variants.all() if hasattr(v, "inventory"))


class ProductManageSerializer(serializers.ModelSerializer):
    category_id = serializers.CharField(source="category.id", read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)
    category_slug = serializers.CharField(source="category.slug", read_only=True)
    primary_image = serializers.SerializerMethodField(read_only=True)
    stock_qty = serializers.SerializerMethodField(read_only=True)
    image_url = serializers.CharField(write_only=True, required=False, allow_blank=True, allow_null=True)
    initial_stock = serializers.IntegerField(write_only=True, required=False, min_value=0)
    colors = serializers.ListField(
        child=serializers.CharField(),
        write_only=True,
        required=False,
        allow_empty=True
    )
    sizes = serializers.ListField(
        child=serializers.CharField(),
        write_only=True,
        required=False,
        allow_empty=True
    )

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "brand",
            "base_price",
            "category",
            "category_id",
            "category_name",
            "category_slug",
            "is_active",
            "primary_image",
            "stock_qty",
            "image_url",
            "initial_stock",
            "colors",
            "sizes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "slug", "category_name", "category_slug", "primary_image", "stock_qty", "created_at", "updated_at"]

    def get_primary_image(self, obj):
        first_variant = obj.variants.first()
        if first_variant:
            primary_img = first_variant.images.filter(is_primary=True).first() or first_variant.images.first()
            if primary_img:
                return primary_img.image_url
        return None

    def get_stock_qty(self, obj):
        return sum(v.inventory.stock_qty for v in obj.variants.all() if hasattr(v, "inventory"))

    def create(self, validated_data):
        request = self.context["request"]
        image_url = validated_data.pop("image_url", None)
        initial_stock = validated_data.pop("initial_stock", 10)
        colors = validated_data.pop("colors", None) or ["Standard"]
        sizes = validated_data.pop("sizes", None) or ["Free Size"]

        if not validated_data.get("brand"):
            validated_data["brand"] = getattr(request.user, "shop_name", "") or "Ananya"

        product = Product.objects.create(seller=request.user, **validated_data)

        variants = []
        for color in colors:
            for size in sizes:
                variant = ProductVariant.objects.create(
                    product=product,
                    sku=f"{product.brand[:3].upper()}-{product.name[:3].upper()}-{color[:3].upper()}-{size[:2].upper()}-{product.id.hex[:4].upper()}",
                    color=color,
                    size=size,
                )
                Inventory.objects.create(variant=variant, stock_qty=initial_stock)
                variants.append(variant)

        if image_url and variants:
            ProductImage.objects.create(
                variant=variants[0],
                image_url=image_url,
                is_primary=True,
                sort_order=1,
            )

        return product

    def update(self, instance, validated_data):
        image_url = validated_data.pop("image_url", None)
        stock_qty = validated_data.pop("initial_stock", None)
        colors = validated_data.pop("colors", None)
        sizes = validated_data.pop("sizes", None)

        instance = super().update(instance, validated_data)

        variants = list(instance.variants.all())
        if stock_qty is not None:
            for variant in variants:
                if hasattr(variant, "inventory"):
                    variant.inventory.stock_qty = stock_qty
                    variant.inventory.save(update_fields=["stock_qty", "updated_at"])

        if image_url:
            target_variant = variants[0] if variants else None
            if target_variant:
                ProductImage.objects.filter(variant=target_variant, is_primary=True).update(is_primary=False)
                existing_image = target_variant.images.order_by("sort_order", "created_at" if hasattr(ProductImage, "created_at") else "id").first()
                if existing_image:
                    existing_image.image_url = image_url
                    existing_image.is_primary = True
                    existing_image.sort_order = 1
                    existing_image.save(update_fields=["image_url", "is_primary", "sort_order"])
                else:
                    ProductImage.objects.create(
                        variant=target_variant,
                        image_url=image_url,
                        is_primary=True,
                        sort_order=1,
                    )

        return instance

class ProductDetailSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)
    reviews = ReviewSerializer(many=True, read_only=True)
    avg_rating = serializers.SerializerMethodField()
    related_products = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "brand",
            "base_price",
            "category",
            "category_name",
            "is_active",
            "variants",
            "reviews",
            "avg_rating",
            "related_products",
            "created_at",
            "updated_at"
        ]

    def get_avg_rating(self, obj):
        return obj.reviews.aggregate(Avg("rating"))["rating__avg"] or 0.0

    def get_related_products(self, obj):
        # Fetch up to 4 other active products in the same category
        related = Product.objects.filter(
            category=obj.category,
            is_active=True
        ).exclude(id=obj.id)[:4]
        return ProductListSerializer(related, many=True).data
