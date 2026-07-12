import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager

class Permission(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True, db_index=True)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name

class Role(models.Model):
    CUSTOMER = "CUSTOMER"
    SELLER = "SELLER"
    ADMIN = "ADMIN"
    
    ROLE_CHOICES = (
        (CUSTOMER, "Customer"),
        (SELLER, "Seller"),
        (ADMIN, "Admin"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=50, choices=ROLE_CHOICES, unique=True, db_index=True)
    description = models.TextField(blank=True, null=True)
    permissions = models.ManyToManyField(Permission, related_name="roles", blank=True)

    def __str__(self):
        return self.name

class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("The Email field must be set")
        email = self.normalize_email(email)
        extra_fields.setdefault("username", email)
        user = self.model(email=email, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        
        # Ensure ADMIN role exists or create it
        role_obj, _ = Role.objects.get_or_create(
            name=Role.ADMIN,
            defaults={"description": "Super administrator with all permissions"}
        )
        extra_fields.setdefault("role", role_obj)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self.create_user(email, password, **extra_fields)

class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True, db_index=True)
    role = models.ForeignKey(Role, on_delete=models.SET_NULL, null=True, blank=True, related_name="users")
    
    # Seller fields
    is_approved_seller = models.BooleanField(default=False)
    is_email_verified = models.BooleanField(default=False)
    # Store a salted hash of the OTP; never persist the plaintext code.
    email_otp_hash = models.CharField(max_length=128, null=True, blank=True)
    # 10-minute verification window for the current OTP.
    email_otp_expires_at = models.DateTimeField(null=True, blank=True)
    # Brute-force lockout counter for 6-digit OTP attempts.
    email_otp_attempts = models.PositiveSmallIntegerField(default=0)
    # Increments on every new verification email so old links and OTPs become invalid.
    email_verification_generation = models.PositiveIntegerField(default=0)
    shop_name = models.CharField(max_length=255, blank=True, null=True)
    shop_description = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    def __str__(self):
        return f"{self.email} ({self.role.name if self.role else 'No Role'})"

    def has_privilege(self, permission_name):
        """
        Check if user's role contains a specific custom permission
        """
        if self.is_superuser or (self.role and self.role.name == Role.ADMIN):
            return True
        if not self.role:
            return False
        return self.role.permissions.filter(name=permission_name).exists()
