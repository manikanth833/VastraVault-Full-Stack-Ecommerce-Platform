from rest_framework import viewsets, permissions, status, filters
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Avg, Q
from django.utils.text import slugify
from django_filters.rest_framework import DjangoFilterBackend
from apps.products.models import Category, Product, ProductVariant, ProductImage, Inventory, Review
from apps.orders.models import Order
from apps.authentication.models import Role
from apps.products.serializers import (
    CategorySerializer,
    ProductListSerializer,
    ProductManageSerializer,
    ProductDetailSerializer,
    ReviewSerializer
)
from apps.authentication.permissions import IsAdminUser, IsSellerOrAdminUser

DEFAULT_CATEGORIES = [
    {
        "name": "Silk Sarees",
        "slug": "silk-sarees",
        "description": "Pure luxury handloom silk sarees including Banarasi and Kanjeevarams.",
        "image_url": "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=600&q=80",
    },
    {
        "name": "Cotton & Linen",
        "slug": "cotton-linen",
        "description": "Breathable light-weight sarees for premium daily wear and gatherings.",
        "image_url": "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=600&q=80",
    },
    {
        "name": "Organza & Georgette",
        "slug": "organza-georgette",
        "description": "Sheer elegance with delicate floral embroidery and gold borders.",
        "image_url": "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=600&q=80",
    },
]


def ensure_default_categories():
    if Category.objects.exists():
        return

    for category_data in DEFAULT_CATEGORIES:
        Category.objects.get_or_create(
            slug=category_data["slug"],
            defaults=category_data,
        )

class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.filter(parent=None).prefetch_related("subcategories")
    serializer_class = CategorySerializer
    lookup_field = "slug"

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsAdminUser()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        ensure_default_categories()
        return super().get_queryset()

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.filter(is_active=True).prefetch_related("variants__images", "variants__inventory", "reviews")
    lookup_field = "slug"
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "description", "brand", "category__name"]
    category_aliases = {
        "all": None,
        "catalog": None,
        "collections": None,
        "pure-silk": "silk-sarees",
        "silk": "silk-sarees",
        "silk-sarees": "silk-sarees",
        "linen": "cotton-linen",
        "cotton": "cotton-linen",
        "linen-cotton": "cotton-linen",
        "cotton-linen": "cotton-linen",
    }

    def get_serializer_class(self):
        if self.action in ["retrieve"]:
            return ProductDetailSerializer
        if self.action in ["create", "update", "partial_update"]:
            return ProductManageSerializer
        return ProductListSerializer

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy", "add_image"]:
            return [IsSellerOrAdminUser()]
        return [permissions.AllowAny()]

    def _can_manage_products(self):
        user = self.request.user
        return (
            user.is_authenticated and
            (
                user.is_superuser or
                (user.role and user.role.name == Role.ADMIN) or
                (
                    user.role and
                    user.role.name == Role.SELLER and
                    user.is_approved_seller
                )
            )
        )

    def _ensure_seller_approved(self):
        user = self.request.user
        if user.is_authenticated and user.role and user.role.name == Role.SELLER and not user.is_approved_seller:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Your seller account must be approved before you can manage products.")

    def _resolve_category(self, raw_category):
        """
        Normalize storefront category inputs so route labels can map to the
        actual category records stored in the database.
        """
        if not raw_category:
            return None

        normalized = slugify(raw_category)
        if normalized in {"", "all", "catalog", "collections"}:
            return None

        resolved_slug = self.category_aliases.get(normalized, normalized)
        if resolved_slug is None:
            return None

        category = Category.objects.filter(slug=resolved_slug).first()
        if category:
            return category

        # Fall back to matching on a human-readable name if a slug alias was
        # provided or the data was created with a different naming pattern.
        return Category.objects.filter(
            Q(slug=normalized) |
            Q(name__iexact=raw_category.strip()) |
            Q(name__iexact=normalized.replace("-", " "))
        ).first()

    def _get_descendant_category_ids(self, category):
        category_ids = {category.id}
        frontier = [category.id]

        while frontier:
            child_ids = list(
                Category.objects.filter(parent_id__in=frontier).values_list("id", flat=True)
            )
            next_frontier = [child_id for child_id in child_ids if child_id not in category_ids]
            if not next_frontier:
                break

            category_ids.update(next_frontier)
            frontier = next_frontier

        return category_ids

    def get_queryset(self):
        ensure_default_categories()
        queryset = super().get_queryset()

        if (
            self.action in ["update", "partial_update", "destroy", "add_image"]
            and self.request.user.is_authenticated
            and getattr(self.request.user, "role", None)
            and self.request.user.role.name == "SELLER"
        ):
            queryset = Product.objects.filter(seller=self.request.user).prefetch_related(
                "variants__images", "variants__inventory", "reviews"
            )
        
        # If the user is an authenticated seller requesting their own products
        if self.request.query_params.get("my_products") == "true":
            if self.request.user.is_authenticated and self.request.user.role.name == "SELLER":
                return Product.objects.filter(seller=self.request.user).prefetch_related(
                    "variants__images", "variants__inventory", "reviews"
                )
        
        # Faceted Filtering
        category = self._resolve_category(self.request.query_params.get("category"))
        if category:
            category_ids = self._get_descendant_category_ids(category)
            queryset = queryset.filter(category_id__in=category_ids)

        min_price = self.request.query_params.get("min_price")
        max_price = self.request.query_params.get("max_price")
        if min_price:
            queryset = queryset.filter(base_price__gte=min_price)
        if max_price:
            queryset = queryset.filter(base_price__lte=max_price)

        min_rating = self.request.query_params.get("min_rating")
        if min_rating:
            queryset = queryset.annotate(avg_rating=Avg("reviews__rating")).filter(avg_rating__gte=min_rating)

        # Sorting
        sort_by = self.request.query_params.get("sort")
        if sort_by == "price_asc":
            queryset = queryset.order_by("base_price")
        elif sort_by == "price_desc":
            queryset = queryset.order_by("-base_price")
        elif sort_by == "newest":
            queryset = queryset.order_by("-created_at")
        elif sort_by == "rating":
            queryset = queryset.annotate(avg_rating=Avg("reviews__rating")).order_by("-avg_rating")
        elif sort_by == "best_selling":
            # For this simple model, order by review count or ID
            queryset = queryset.order_by("-id")

        return queryset

    def list(self, request, *args, **kwargs):
        if request.query_params.get("my_products") == "true":
            if not self._can_manage_products():
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("Your seller account must be approved before you can manage products.")
        return super().list(request, *args, **kwargs)

    def perform_create(self, serializer):
        self._ensure_seller_approved()
        serializer.save()

    def perform_update(self, serializer):
        self._ensure_seller_approved()
        serializer.save()

    def perform_destroy(self, instance):
        self._ensure_seller_approved()
        instance.delete()

    @action(detail=True, methods=["POST"], permission_classes=[IsSellerOrAdminUser])
    def add_image(self, request, slug=None):
        product = self.get_object()
        variant_id = request.data.get("variant_id")
        image_url = request.data.get("image_url")
        cloudinary_public_id = request.data.get("cloudinary_public_id")
        is_primary = request.data.get("is_primary", "false") == "true"
        
        try:
            variant = product.variants.get(id=variant_id)
            if is_primary:
                ProductImage.objects.filter(variant=variant, is_primary=True).update(is_primary=False)
            
            image = ProductImage.objects.create(
                variant=variant,
                image_url=image_url,
                cloudinary_public_id=cloudinary_public_id,
                is_primary=is_primary
            )
            return Response({"message": "Image added successfully", "image_id": image.id}, status=status.HTTP_201_CREATED)
        except ProductVariant.DoesNotExist:
            return Response({"error": "Variant not found"}, status=status.HTTP_404_NOT_FOUND)

class ReviewViewSet(viewsets.ModelViewSet):
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        return Review.objects.filter(product_id=self.request.query_params.get("product_id"))

    def perform_create(self, serializer):
        product_id = self.request.data.get("product_id")
        product = Product.objects.get(id=product_id)
        
        # Check if the user has a verified purchase of any variant of this product
        verified = Order.objects.filter(
            user=self.request.user,
            status="DELIVERED",
            items__variant__product=product
        ).exists()
        
        serializer.save(
            product=product,
            verified_purchase=verified
        )
