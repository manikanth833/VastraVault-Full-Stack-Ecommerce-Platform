from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from apps.authentication.models import Role
from apps.products.models import Category, Inventory, Product, ProductImage, ProductVariant, Review


User = get_user_model()


class ProductViewSetTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        customer_role, _ = Role.objects.get_or_create(name=Role.CUSTOMER)
        seller_role, _ = Role.objects.get_or_create(name=Role.SELLER)
        admin_role, _ = Role.objects.get_or_create(name=Role.ADMIN)

        self.customer = User.objects.create_user(email="buyer@example.com", password="StrongPass123!")
        self.customer.role = customer_role
        self.customer.save()

        self.approved_seller = User.objects.create_user(email="seller@example.com", password="StrongPass123!")
        self.approved_seller.role = seller_role
        self.approved_seller.is_approved_seller = True
        self.approved_seller.save()

        self.unapproved_seller = User.objects.create_user(email="new-seller@example.com", password="StrongPass123!")
        self.unapproved_seller.role = seller_role
        self.unapproved_seller.save()

        self.other_seller = User.objects.create_user(email="other-seller@example.com", password="StrongPass123!")
        self.other_seller.role = seller_role
        self.other_seller.is_approved_seller = True
        self.other_seller.save()

        self.admin = User.objects.create_user(email="admin@example.com", password="StrongPass123!")
        self.admin.role = admin_role
        self.admin.is_superuser = True
        self.admin.is_staff = True
        self.admin.save()

        self.root_category = Category.objects.create(name="Handloom", slug="handloom")
        self.silk_category = Category.objects.create(name="Silk Sarees", slug="silk-sarees", parent=self.root_category)
        self.banarasi_category = Category.objects.create(name="Banarasi", slug="banarasi", parent=self.silk_category)

        self.active_low = self._create_product(
            seller=self.approved_seller,
            category=self.silk_category,
            name="Heritage Loom",
            slug="heritage-loom",
            brand="Heritage Loom",
            price=Decimal("100.00"),
            stock=5,
            active=True,
        )
        self.active_mid = self._create_product(
            seller=self.approved_seller,
            category=self.silk_category,
            name="Kanchipuram House",
            slug="kanchipuram-house",
            brand="Kanchipuram House",
            price=Decimal("200.00"),
            stock=5,
            active=True,
        )
        self.active_high = self._create_product(
            seller=self.approved_seller,
            category=self.banarasi_category,
            name="Weave & Co",
            slug="weave-and-co",
            brand="Weave & Co",
            price=Decimal("300.00"),
            stock=5,
            active=True,
        )
        self.no_review_product = self._create_product(
            seller=self.approved_seller,
            category=self.silk_category,
            name="Quiet Loom",
            slug="quiet-loom",
            brand="Quiet Loom",
            price=Decimal("250.00"),
            stock=5,
            active=True,
        )
        self.inactive_product = self._create_product(
            seller=self.approved_seller,
            category=self.silk_category,
            name="Dormant Saree",
            slug="dormant-saree",
            brand="Dormant Saree",
            price=Decimal("400.00"),
            stock=5,
            active=False,
        )
        self.approved_owned_inactive = self._create_product(
            seller=self.approved_seller,
            category=self.silk_category,
            name="Approved Seller Hidden",
            slug="approved-seller-hidden",
            brand="Approved Seller Hidden",
            price=Decimal("450.00"),
            stock=5,
            active=False,
        )
        self.unapproved_owned_product = self._create_product(
            seller=self.unapproved_seller,
            category=self.silk_category,
            name="Pending Seller Product",
            slug="pending-seller-product",
            brand="Pending Seller Product",
            price=Decimal("60.00"),
            stock=5,
            active=True,
        )
        self.other_seller_product = self._create_product(
            seller=self.other_seller,
            category=self.silk_category,
            name="Other Seller Product",
            slug="other-seller-product",
            brand="Other Seller Product",
            price=Decimal("50.00"),
            stock=5,
            active=True,
        )

        self.list_url = reverse("product-list")

        Review.objects.create(product=self.active_low, user=self.customer, rating=5, title="A", comment="Great")
        Review.objects.create(product=self.active_mid, user=self.customer, rating=4, title="B", comment="Good")
        Review.objects.create(product=self.active_high, user=self.customer, rating=3, title="C", comment="Okay")

    def _create_product(self, seller, category, name, slug, brand, price, stock, active=True):
        product = Product.objects.create(
            category=category,
            seller=seller,
            name=name,
            slug=slug,
            brand=brand,
            description=f"{name} description",
            base_price=price,
            is_active=active,
        )
        variant = ProductVariant.objects.create(
            product=product,
            sku=f"{slug[:8].upper()}-SKU",
            color="Red",
            size="Free Size",
        )
        Inventory.objects.create(variant=variant, stock_qty=stock)
        return product

    def _result_items(self, response):
        if isinstance(response.data, dict) and "results" in response.data:
            return response.data["results"]
        return response.data

    def _slugs(self, response):
        return [item["slug"] for item in self._result_items(response)]

    def _product_detail_url(self, product):
        return reverse("product-detail", kwargs={"slug": product.slug})

    def _product_add_image_url(self, product):
        return reverse("product-add-image", kwargs={"slug": product.slug})

    def test_list_returns_only_active_products_by_default(self):
        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, 200)
        slugs = self._slugs(response)
        self.assertIn(self.active_low.slug, slugs)
        self.assertIn(self.active_mid.slug, slugs)
        self.assertIn(self.active_high.slug, slugs)
        self.assertNotIn(self.inactive_product.slug, slugs)

    def test_category_filter_includes_descendant_categories(self):
        response = self.client.get(self.list_url, {"category": "handloom"})

        self.assertEqual(response.status_code, 200)
        slugs = self._slugs(response)
        self.assertIn(self.active_low.slug, slugs)
        self.assertIn(self.active_high.slug, slugs)

    def test_category_aliases_resolve_to_same_category(self):
        silk = self.client.get(self.list_url, {"category": "silk"})
        pure_silk = self.client.get(self.list_url, {"category": "pure-silk"})

        self.assertEqual(silk.status_code, 200)
        self.assertEqual(pure_silk.status_code, 200)
        self.assertEqual(set(self._slugs(silk)), set(self._slugs(pure_silk)))

    def test_min_price_filter_includes_exact_boundary(self):
        response = self.client.get(self.list_url, {"min_price": "200"})

        self.assertEqual(response.status_code, 200)
        slugs = self._slugs(response)
        self.assertNotIn(self.active_low.slug, slugs)
        self.assertIn(self.active_mid.slug, slugs)
        self.assertIn(self.active_high.slug, slugs)

    def test_max_price_filter_includes_exact_boundary(self):
        response = self.client.get(self.list_url, {"max_price": "200"})

        self.assertEqual(response.status_code, 200)
        slugs = self._slugs(response)
        self.assertIn(self.active_low.slug, slugs)
        self.assertIn(self.active_mid.slug, slugs)
        self.assertNotIn(self.active_high.slug, slugs)

    def test_combined_price_filters_include_only_in_range_products(self):
        response = self.client.get(self.list_url, {"min_price": "100", "max_price": "200"})

        self.assertEqual(response.status_code, 200)
        slugs = self._slugs(response)
        self.assertIn(self.active_low.slug, slugs)
        self.assertIn(self.active_mid.slug, slugs)
        self.assertNotIn(self.active_high.slug, slugs)

    def test_min_rating_filter_excludes_products_with_no_reviews(self):
        response = self.client.get(self.list_url, {"min_rating": "4"})

        self.assertEqual(response.status_code, 200)
        slugs = self._slugs(response)
        self.assertIn(self.active_low.slug, slugs)
        self.assertIn(self.active_mid.slug, slugs)
        self.assertNotIn(self.active_high.slug, slugs)
        self.assertNotIn(self.no_review_product.slug, slugs)

    def test_sort_price_asc_orders_low_to_high(self):
        response = self.client.get(self.list_url, {"sort": "price_asc"})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            self._slugs(response),
            [
                self.other_seller_product.slug,
                self.unapproved_owned_product.slug,
                self.active_low.slug,
                self.active_mid.slug,
                self.no_review_product.slug,
                self.active_high.slug,
            ],
        )

    def test_sort_price_desc_orders_high_to_low(self):
        response = self.client.get(self.list_url, {"sort": "price_desc"})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            self._slugs(response),
            [
                self.active_high.slug,
                self.no_review_product.slug,
                self.active_mid.slug,
                self.active_low.slug,
                self.unapproved_owned_product.slug,
                self.other_seller_product.slug,
            ],
        )

    def test_sort_newest_orders_by_created_at_desc(self):
        response = self.client.get(self.list_url, {"sort": "newest"})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(self._slugs(response)[0], self.other_seller_product.slug)

    def test_sort_rating_orders_by_average_rating_desc(self):
        response = self.client.get(self.list_url, {"sort": "rating"})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(self._slugs(response)[:3], [self.active_low.slug, self.active_mid.slug, self.active_high.slug])

    def test_search_matches_product_name(self):
        response = self.client.get(self.list_url, {"search": "Heritage"})

        self.assertEqual(response.status_code, 200)
        self.assertIn(self.active_low.slug, self._slugs(response))

    def test_search_matches_brand(self):
        response = self.client.get(self.list_url, {"search": "Kanchipuram"})

        self.assertEqual(response.status_code, 200)
        self.assertIn(self.active_mid.slug, self._slugs(response))

    def test_my_products_returns_only_approved_sellers_own_products_and_inactive_ones(self):
        self.client.force_authenticate(user=self.approved_seller)
        response = self.client.get(self.list_url, {"my_products": "true"})

        self.assertEqual(response.status_code, 200)
        slugs = self._slugs(response)
        self.assertIn(self.active_low.slug, slugs)
        self.assertIn(self.approved_owned_inactive.slug, slugs)
        self.assertNotIn(self.other_seller_product.slug, slugs)

    def test_my_products_rejects_customer(self):
        self.client.force_authenticate(user=self.customer)
        response = self.client.get(self.list_url, {"my_products": "true"})

        self.assertEqual(response.status_code, 403)

    def test_my_products_rejects_unapproved_seller(self):
        self.client.force_authenticate(user=self.unapproved_seller)
        response = self.client.get(self.list_url, {"my_products": "true"})

        self.assertEqual(response.status_code, 403)

    def test_my_products_rejects_unauthenticated_request(self):
        response = self.client.get(self.list_url, {"my_products": "true"})

        self.assertEqual(response.status_code, 403)

    def test_unauthenticated_user_can_list_and_retrieve_active_products(self):
        list_response = self.client.get(self.list_url)
        detail_response = self.client.get(self._product_detail_url(self.active_low))

        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(detail_response.status_code, 200)

    def test_unauthenticated_user_cannot_create_update_or_destroy_products(self):
        create_response = self.client.post(
            self.list_url,
            {
                "name": "Unauth Product",
                "description": "Nope",
                "category": str(self.silk_category.id),
                "base_price": "100.00",
            },
            format="json",
        )
        update_response = self.client.patch(
            self._product_detail_url(self.active_low),
            {"name": "Unauth Update"},
            format="json",
        )
        delete_response = self.client.delete(self._product_detail_url(self.active_low))

        self.assertIn(create_response.status_code, (401, 403))
        self.assertIn(update_response.status_code, (401, 403))
        self.assertIn(delete_response.status_code, (401, 403))

    def test_customer_cannot_create_update_or_destroy_products(self):
        self.client.force_authenticate(user=self.customer)
        create_response = self.client.post(
            self.list_url,
            {
                "name": "Customer Product",
                "description": "Nope",
                "category": str(self.silk_category.id),
                "base_price": "100.00",
            },
            format="json",
        )
        update_response = self.client.patch(
            self._product_detail_url(self.active_low),
            {"name": "Customer Update"},
            format="json",
        )
        delete_response = self.client.delete(self._product_detail_url(self.active_low))

        self.assertEqual(create_response.status_code, 403)
        self.assertEqual(update_response.status_code, 403)
        self.assertEqual(delete_response.status_code, 403)

    def test_unapproved_seller_create_rejected_with_approval_message(self):
        self.client.force_authenticate(user=self.unapproved_seller)
        response = self.client.post(
            self.list_url,
            {
                "name": "Pending Seller Product 2",
                "description": "Nope",
                "category": str(self.silk_category.id),
                "base_price": "100.00",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 403)
        self.assertIn("must be approved", str(response.data).lower())

    def test_unapproved_seller_update_rejected_with_approval_message(self):
        self.client.force_authenticate(user=self.unapproved_seller)
        response = self.client.patch(
            self._product_detail_url(self.unapproved_owned_product),
            {"name": "Pending Seller Update"},
            format="json",
        )

        self.assertEqual(response.status_code, 403)
        self.assertIn("must be approved", str(response.data).lower())

    def test_unapproved_seller_destroy_rejected_with_approval_message(self):
        self.client.force_authenticate(user=self.unapproved_seller)
        response = self.client.delete(self._product_detail_url(self.unapproved_owned_product))

        self.assertEqual(response.status_code, 403)
        self.assertIn("must be approved", str(response.data).lower())

    def test_approved_seller_can_create_product(self):
        self.client.force_authenticate(user=self.approved_seller)
        response = self.client.post(
            self.list_url,
            {
                "name": "New Seller Product",
                "description": "Allowed",
                "category": str(self.silk_category.id),
                "base_price": "1200.00",
                "initial_stock": 2,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertTrue(Product.objects.filter(name="New Seller Product", seller=self.approved_seller).exists())

    def test_approved_seller_cannot_update_product_they_do_not_own(self):
        self.client.force_authenticate(user=self.approved_seller)
        response = self.client.patch(
            self._product_detail_url(self.other_seller_product),
            {"name": "Not Mine"},
            format="json",
        )

        self.assertEqual(response.status_code, 404)

    def test_approved_seller_cannot_destroy_product_they_do_not_own(self):
        self.client.force_authenticate(user=self.approved_seller)
        response = self.client.delete(self._product_detail_url(self.other_seller_product))

        self.assertEqual(response.status_code, 404)

    def test_add_image_allows_approved_seller_to_add_image_to_own_variant(self):
        self.client.force_authenticate(user=self.approved_seller)
        variant = self.active_low.variants.first()

        response = self.client.post(
            self._product_add_image_url(self.active_low),
            {
                "variant_id": str(variant.id),
                "image_url": "https://example.com/one.jpg",
                "cloudinary_public_id": "one",
                "is_primary": "true",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertTrue(ProductImage.objects.filter(variant=variant, image_url="https://example.com/one.jpg").exists())

    def test_add_image_returns_404_for_nonexistent_variant(self):
        self.client.force_authenticate(user=self.approved_seller)

        response = self.client.post(
            self._product_add_image_url(self.active_low),
            {
                "variant_id": "00000000-0000-0000-0000-000000000000",
                "image_url": "https://example.com/missing.jpg",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 404)

    def test_add_image_is_primary_unsets_previous_primary_image(self):
        self.client.force_authenticate(user=self.approved_seller)
        variant = self.active_low.variants.first()

        first = self.client.post(
            self._product_add_image_url(self.active_low),
            {
                "variant_id": str(variant.id),
                "image_url": "https://example.com/primary-one.jpg",
                "cloudinary_public_id": "primary-one",
                "is_primary": "true",
            },
            format="json",
        )
        second = self.client.post(
            self._product_add_image_url(self.active_low),
            {
                "variant_id": str(variant.id),
                "image_url": "https://example.com/primary-two.jpg",
                "cloudinary_public_id": "primary-two",
                "is_primary": "true",
            },
            format="json",
        )

        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 201)
        self.assertEqual(ProductImage.objects.filter(variant=variant, is_primary=True).count(), 1)
        self.assertTrue(ProductImage.objects.filter(variant=variant, image_url="https://example.com/primary-two.jpg", is_primary=True).exists())
        self.assertFalse(ProductImage.objects.filter(variant=variant, image_url="https://example.com/primary-one.jpg", is_primary=True).exists())
