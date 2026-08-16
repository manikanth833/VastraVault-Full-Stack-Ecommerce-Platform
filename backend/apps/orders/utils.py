from decimal import Decimal, ROUND_HALF_UP

from django.utils import timezone

from apps.orders.models import Coupon


MONEY_QUANTIZE = Decimal("0.01")


class CouponPricingError(ValueError):
    pass


def _as_money(value):
    return Decimal(str(value)).quantize(MONEY_QUANTIZE, rounding=ROUND_HALF_UP)


def calculate_pricing(subtotal, coupon_code="", strict_coupon=False):
    subtotal = _as_money(subtotal)
    discount_amount = Decimal("0.00")
    coupon = None

    code = (coupon_code or "").strip().upper()
    if code:
        coupon = Coupon.objects.filter(code=code).first()
        error = None
        now = timezone.now()

        if not coupon or not coupon.active or now < coupon.start_date or now > coupon.end_date or coupon.usage_count >= coupon.usage_limit:
            error = "Invalid or expired coupon code."
        elif subtotal < coupon.min_purchase:
            error = f"Coupon requires a minimum purchase of INR {coupon.min_purchase}."

        if error:
            if strict_coupon:
                raise CouponPricingError(error)
            coupon = None
        else:
            if coupon.discount_type == "PERCENTAGE":
                discount_amount = subtotal * (_as_money(coupon.value) / Decimal("100"))
                if coupon.max_discount is not None:
                    discount_amount = min(discount_amount, _as_money(coupon.max_discount))
            else:
                discount_amount = _as_money(coupon.value)
            discount_amount = min(discount_amount, subtotal)

    taxable_amount = subtotal - discount_amount
    tax_amount = _as_money(taxable_amount * Decimal("0.12"))
    shipping_charge = Decimal("0.00") if taxable_amount > Decimal("2000") else Decimal("150.00")
    total_amount = _as_money(subtotal - discount_amount + tax_amount + shipping_charge)

    return {
        "subtotal": subtotal,
        "discount_amount": _as_money(discount_amount),
        "tax_amount": tax_amount,
        "shipping_charge": shipping_charge,
        "total_amount": total_amount,
        "coupon": coupon,
    }
