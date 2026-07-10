# Ananya Heritage Sarees - Premium E-Commerce Platform

A production-grade, full-stack e-commerce platform built for a luxury saree and ethnic fashion brand. This project implements a React 19 frontend and a Django REST Framework backend, orchestrated with Docker, Redis caching, Celery background tasks, and Razorpay secured checkouts.

## System Architecture

```
                                  +-------------------+
                                  |  React Frontend   |
                                  |    (Vite, Port    |
                                  |       5173)       |
                                  +---------+---------+
                                            |
                                       HTTP | REST APIs
                                            v
                                  +---------+---------+
                                  |  Django Backend   |
                                  |   (Port 8000)     |
                                  +----+----+----+----+
                                       |    |    |
                 +---------------------+    |    +---------------------+
                 |                          |                          |
                 v                          v                          v
      +----------+----------+    +----------+----------+    +----------+----------+
      |      PostgreSQL     |    |        Redis        |    |    Celery Worker    |
      |   (Database Storage |    |   (Caching & Celery |    | (Background Emails  |
      |      Port 5432)     |    |  Broker, Port 6379) |    |  & Stock Alerts)    |
      +---------------------+    +---------------------+    +---------------------+
```

## Technologies & Features

- **Frontend**: React 19, Redux Toolkit (State management), Tailwind CSS (Elegant luxury styling: Crimson, Gold, Cream), Framer Motion (Page and zoom animations), Lucide (Icons), Recharts (Sales graphs).
- **Backend**: Django 5.0, Django REST Framework, Custom RBAC, SimpleJWT Authentication, Django-Redis caching.
- **Database**: PostgreSQL (Normalized with proper foreign keys, constraints, indexes, and database transactions).
- **Integrations**: Razorpay payment verification (with developer sandbox mock emulator), Cloudinary (Image uploads), SMTP Console Emails.
- **Background Engine**: Celery + Redis (Order confirmations, low stock alerts).

---

## Setup & Run Instructions (Docker Compose)

Ensure you have **Docker Desktop** installed on your system.

### 1. Build and Launch Containers
At the root directory (`ananya-sarees/`), run:
```bash
docker-compose up --build
```
This command compiles the React assets, downloads Django requirements, and starts Postgres, Redis, the backend web server, the Celery worker, and the frontend dev server.

### 2. Run Database Migrations
Open a new terminal and run migrations inside the backend web container:
```bash
docker-compose exec web python manage.py migrate
```

### 3. Seed Mock Data
Populate the database with custom luxury saree categories, initial inventory stock, mock customers, sellers, ratings, coupons, and historical orders (to populate the charts):
```bash
docker-compose exec web python manage.py seed_db
```

### 4. Access the Applications
- **Frontend App**: [http://localhost:5173](http://localhost:5173)
- **Backend API Root**: [http://localhost:8000/api/](http://localhost:8000/api/)
- **Django Admin Panel**: [http://localhost:8000/admin/](http://localhost:8000/admin/)

---

## Testing & Demo Accounts (Seeded Credentials)

Use the following credentials to log in and test different RBAC user flows:

### 1. Administrator Account
- **Email**: `admin@ananya.com`
- **Password**: `adminpassword123`
- **Actions**: Approve/reject pending sellers, review global Platform metrics and revenue charts, view active coupons.

### 2. Seller / Loom Partner Account
- **Email**: `varanasi_weaves@ananya.com`
- **Password**: `sellerpassword123`
- **Actions**: View seller dashboard, track monthly sales revenue charts, see recent order items containing their products, mark orders as "Shipped".

### 3. Customer Account
- **Email**: `priya_sharma@gmail.com`
- **Password**: `customerpassword123`
- **Actions**: Browse catalog, select variant colors/sizes, add items to bag, apply coupons, select address, trigger checkout.

---

## E-Commerce Checkout Walkthrough & Sandbox Emulation
1. Sign in as Customer (`priya_sharma@gmail.com`).
2. Go to collections, click on **Royal Crimson Banarasi Katan Silk Saree**.
3. Choose variant color **Antique Gold** (updates price dynamically, verifies inventory stock).
4. Select quantity and click **Add to Bag**.
5. Navigate to Cart, apply coupon `WELCOME10` or `FESTIVE500` (calculates 12% GST, shipping, and discounts).
6. Click **Proceed to Checkout**, select default address.
7. Click **Pay & Place Order**.
8. Because local development uses dummy credentials, a **Razorpay Sandbox Emulator modal** will open. Click **Simulate Success** to test the SHA256 HMAC payment signature verification flow.
9. Upon success, you are redirected to the order confirmation page.
