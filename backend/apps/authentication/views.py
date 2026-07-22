from rest_framework import generics, viewsets, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import check_password
from django.contrib.auth.password_validation import validate_password as django_validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from django.utils import timezone
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from apps.authentication.serializers import (
    RegisterSerializer,
    UserSerializer,
    CustomTokenObtainPairSerializer,
    LogoutSerializer,
    AddressSerializer,
    ForgotPasswordSerializer,
    ResetPasswordSerializer,
    ResendVerificationSerializer,
    VerifyEmailSerializer,
    VerifyEmailOtpSerializer,
)
from apps.authentication.utils import (
    reset_token_generator,
    send_password_reset_email,
    email_verification_token_generator,
    send_verification_email,
    OTP_MAX_ATTEMPTS,
)
from apps.authentication.throttling import ForgotPasswordRateThrottle, LoginRateThrottle
from apps.orders.models import Address

User = get_user_model()

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "register"

    def perform_create(self, serializer):
        user = serializer.save()
        send_verification_email(user)

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    throttle_classes = [LoginRateThrottle]


class LogoutView(generics.GenericAPIView):
    serializer_class = LogoutSerializer
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        refresh_token = serializer.validated_data["refresh"]
        try:
            RefreshToken(refresh_token).blacklist()
        except TokenError:
            pass

        return Response({"detail": "Logged out successfully."}, status=status.HTTP_200_OK)


class ForgotPasswordView(generics.GenericAPIView):
    serializer_class = ForgotPasswordSerializer
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ForgotPasswordRateThrottle]

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        user = User.objects.filter(email__iexact=email).first()
        if user:
            send_password_reset_email(user)

        return Response(
            {
                "detail": "If an account exists with this email, password reset instructions have been sent.",
            },
            status=status.HTTP_200_OK,
        )


class ResetPasswordView(generics.GenericAPIView):
    serializer_class = ResetPasswordSerializer
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        uid = serializer.validated_data["uid"]
        token = serializer.validated_data["token"]
        password = serializer.validated_data["password"]

        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_id)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist, UnicodeDecodeError):
            return Response(
                {"token": ["Invalid or expired reset token."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not reset_token_generator.check_token(user, token):
            return Response(
                {"token": ["Invalid or expired reset token."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            django_validate_password(password, user=user)
        except DjangoValidationError as exc:
            return Response({"password": exc.messages}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(password)
        user.save(update_fields=["password", "updated_at"])

        return Response(
            {"detail": "Password reset successfully. You can now sign in with your new password."},
            status=status.HTTP_200_OK,
        )


class ResendVerificationView(generics.GenericAPIView):
    serializer_class = ResendVerificationSerializer
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "email_otp_resend"

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        user = User.objects.filter(email__iexact=email).first()
        if user and not user.is_email_verified:
            send_verification_email(user)

        return Response(
            {
                "detail": "If an account exists with this email, verification instructions have been sent.",
            },
            status=status.HTTP_200_OK,
        )


class VerifyEmailOtpView(generics.GenericAPIView):
    serializer_class = VerifyEmailOtpSerializer
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "email_otp_verify"

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        otp = serializer.validated_data["otp"]

        generic_error = Response(
            {"otp": ["Invalid or expired verification code."]},
            status=status.HTTP_400_BAD_REQUEST,
        )

        user = User.objects.filter(email__iexact=email).first()

        if not user:
            return generic_error

        if user.is_email_verified:
            return Response({"detail": "Email already verified."}, status=status.HTTP_200_OK)

        if (
            not user.email_otp_hash
            or not user.email_otp_expires_at
            or timezone.now() > user.email_otp_expires_at
        ):
            return generic_error

        if user.email_otp_attempts >= OTP_MAX_ATTEMPTS:
            return Response(
                {"otp": ["Too many incorrect attempts. Please request a new code."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not check_password(otp, user.email_otp_hash):
            user.email_otp_attempts += 1
            user.save(update_fields=["email_otp_attempts", "updated_at"])
            return generic_error

        user.is_email_verified = True
        user.email_otp_hash = None
        user.email_otp_expires_at = None
        user.email_otp_attempts = 0
        user.save(
            update_fields=[
                "is_email_verified",
                "email_otp_hash",
                "email_otp_expires_at",
                "email_otp_attempts",
                "updated_at",
            ]
        )
        return Response({"detail": "Email verified successfully."}, status=status.HTTP_200_OK)


class VerifyEmailView(generics.GenericAPIView):
    serializer_class = VerifyEmailSerializer
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        uid = serializer.validated_data["uid"]
        token = serializer.validated_data["token"]

        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_id)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist, UnicodeDecodeError):
            return Response(
                {"token": ["Invalid or expired verification link."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not email_verification_token_generator.check_token(user, token):
            return Response(
                {"token": ["Invalid or expired verification link."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if user.is_email_verified:
            return Response(
                {"detail": "Email already verified."},
                status=status.HTTP_200_OK,
            )

        user.is_email_verified = True
        user.save(update_fields=["is_email_verified", "updated_at"])

        return Response(
            {"detail": "Email verified successfully."},
            status=status.HTTP_200_OK,
        )

class UserProfileView(generics.RetrieveUpdateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user

class AddressViewSet(viewsets.ModelViewSet):
    serializer_class = AddressSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Address.objects.filter(user=self.request.user)
