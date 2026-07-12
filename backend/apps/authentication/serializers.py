from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password as django_validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from apps.authentication.models import Role, Permission
from apps.orders.models import Address

User = get_user_model()

class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = ["id", "name", "description"]

class RoleSerializer(serializers.ModelSerializer):
    permissions = PermissionSerializer(many=True, read_only=True)

    class Meta:
        model = Role
        fields = ["id", "name", "description", "permissions"]

class UserSerializer(serializers.ModelSerializer):
    role_name = serializers.CharField(source="role.name", read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "role_name",
            "is_approved_seller",
            "is_email_verified",
            "shop_name",
            "shop_description",
            "created_at"
        ]
        read_only_fields = ["id", "is_approved_seller", "is_email_verified", "created_at"]

class RegisterSerializer(serializers.ModelSerializer):
    role_name = serializers.ChoiceField(choices=[Role.CUSTOMER, Role.SELLER], default=Role.CUSTOMER)
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = [
            "email",
            "password",
            "first_name",
            "last_name",
            "role_name",
            "shop_name",
            "shop_description"
        ]

    def validate_password(self, value):
        try:
            django_validate_password(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.messages)
        return value

    def create(self, validated_data):
        role_name = validated_data.pop("role_name", Role.CUSTOMER)
        password = validated_data.pop("password")
        
        # Get or create Role
        role_obj, _ = Role.objects.get_or_create(
            name=role_name,
            defaults={"description": f"Standard {role_name.lower()} account"}
        )

        user = User.objects.create_user(
            email=validated_data["email"],
            password=password,
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
            role=role_obj,
            is_approved_seller=(role_name != Role.SELLER), # Sellers must be approved by admin
            shop_name=validated_data.get("shop_name", "") if role_name == Role.SELLER else None,
            shop_description=validated_data.get("shop_description", "") if role_name == Role.SELLER else None
        )
        return user

class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()


class ResetPasswordSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate_password(self, value):
        try:
            django_validate_password(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.messages)
        return value


class ResendVerificationSerializer(serializers.Serializer):
    email = serializers.EmailField()


class VerifyEmailSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()


class VerifyEmailOtpSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.RegexField(
        regex=r"^\d{6}$",
        error_messages={
            "invalid": "Enter the 6-digit code exactly as received.",
        },
    )

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Add custom claims
        token["email"] = user.email
        token["role"] = user.role.name if user.role else None
        token["is_approved_seller"] = user.is_approved_seller
        token["is_email_verified"] = user.is_email_verified
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        # Add extra response fields
        data["user"] = UserSerializer(self.user).data
        return data

class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = [
            "id",
            "name",
            "phone",
            "address_line_1",
            "address_line_2",
            "city",
            "state",
            "pin_code",
            "landmark",
            "address_type",
            "is_default",
            "created_at"
        ]
        read_only_fields = ["id", "created_at"]

    def create(self, validated_data):
        user = self.context["request"].user
        return Address.objects.create(user=user, **validated_data)
