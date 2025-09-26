# Market Backend API Documentation

## نظام إدارة الهايبر ماركت - دليل الـ APIs

### المعلومات العامة
- **قاعدة البيانات**: MongoDB
- **Framework**: FastAPI
- **Authentication**: JWT Token
- **Base URL**: `http://localhost:8000`
- **Documentation**: `http://localhost:8000/docs`

---

## 🔐 Authentication APIs

### أدوار المستخدمين
- **Admin**: مدير النظام - يمكنه الوصول لجميع APIs
- **Customer**: عميل - وصول محدود

### Endpoints

#### 1. تسجيل مستخدم جديد
```http
POST /api/auth/register
```
**Body:**
```json
{
  "name": "اسم المستخدم",
  "phone": "01234567890",
  "password": "password123",
  "role": "customer" // أو "admin"
}
```

#### 2. تسجيل الدخول
```http
POST /api/auth/login
```
**Body:**
```json
{
  "phone": "01234567890",
  "password": "password123",
  "role": "admin" // أو "customer"
}
```
**Response:**
```json
{
  "access_token": "jwt_token_here",
  "token_type": "bearer",
  "user": {
    "id": "user_id",
    "name": "اسم المستخدم",
    "phone": "01234567890",
    "role": "admin",
    "is_active": true,
    "created_at": "2024-01-01T00:00:00"
  }
}
```

#### 3. معلومات المستخدم الحالي
```http
GET /api/auth/me
```
**Headers:** `Authorization: Bearer {token}`

#### 4. تغيير كلمة المرور
```http
POST /api/auth/change-password
```
**Body:**
```json
{
  "phone": "01234567890",
  "new_password": "new_password123"
}
```

#### 5. إنشاء مدير افتراضي
```http
POST /api/auth/create-admin
```
ينشئ مدير بالبيانات التالية:
- الهاتف: `1234567890`
- كلمة المرور: `admin123`

---

## 📦 Products APIs

### إدارة الفئات (Categories)

#### 1. إنشاء فئة جديدة
```http
POST /api/products/categories
```
**Headers:** `Authorization: Bearer {admin_token}`
**Body:**
```json
{
  "name": "إلكترونيات",
  "description": "الأجهزة الإلكترونية والإكسسوارات"
}
```

#### 2. جلب جميع الفئات
```http
GET /api/products/categories?skip=0&limit=100
```
**Headers:** `Authorization: Bearer {token}`

#### 3. جلب فئة محددة
```http
GET /api/products/categories/{category_id}
```

#### 4. تعديل فئة
```http
PUT /api/products/categories/{category_id}
```
**Headers:** `Authorization: Bearer {admin_token}`

#### 5. حذف فئة
```http
DELETE /api/products/categories/{category_id}
```

#### 6. إنشاء فئات افتراضية
```http
POST /api/products/categories/initialize
```
ينشئ فئات: إلكترونيات، بقالة، ملابس، منزل وحديقة

### إدارة المنتجات

#### 1. إنشاء منتج جديد
```http
POST /api/products/
```
**Headers:** `Authorization: Bearer {admin_token}`
**Body:**
```json
{
  "name": "هاتف ذكي",
  "product_id": "PHONE001",
  "description": "هاتف ذكي متطور",
  "price": 500.0,
  "quantity": 10,
  "category_id": "category_object_id",
  "discount": 5.0,
  "sku": "PHN001"
}
```

#### 2. جلب جميع المنتجات مع فلترة
```http
GET /api/products/?page=1&page_size=20&category_id=&search=&min_price=&max_price=&in_stock_only=&low_stock_only=
```

**Query Parameters:**
- `page`: رقم الصفحة (افتراضي: 1)
- `page_size`: عدد المنتجات في الصفحة (افتراضي: 20)
- `category_id`: ID الفئة
- `search`: البحث في الاسم أو الوصف
- `min_price`: السعر الأدنى
- `max_price`: السعر الأعلى
- `in_stock_only`: المنتجات المتوفرة فقط
- `low_stock_only`: المنتجات قليلة المخزن فقط

#### 3. جلب منتج بـ Product ID
```http
GET /api/products/by-product-id/{product_id}
```

#### 4. جلب منتج بـ Database ID
```http
GET /api/products/{product_id}
```

#### 5. تعديل منتج
```http
PUT /api/products/{product_id}
```
**Headers:** `Authorization: Bearer {admin_token}`

#### 6. حذف منتج
```http
DELETE /api/products/{product_id}
```

#### 7. تحديث المخزون
```http
PATCH /api/products/{product_id}/stock
```
**Body:**
```json
{
  "quantity": 25
}
```

#### 8. جلب المنتجات قليلة المخزن
```http
GET /api/products/stock/low
```

---

## 👥 Customers APIs

#### 1. إنشاء عميل جديد
```http
POST /api/customers/
```
**Headers:** `Authorization: Bearer {admin_token}`
**Body:**
```json
{
  "name": "أحمد محمد",
  "phone": "01234567890",
  "wallet_balance": 0.0,
  "notes": "عميل جديد"
}
```

#### 2. جلب جميع العملاء مع فلترة
```http
GET /api/customers/?page=1&page_size=20&search=&has_balance=&status=&min_balance=&max_balance=
```

**Query Parameters:**
- `search`: البحث في الاسم أو الهاتف
- `has_balance`: `true` للعملاء الذين لديهم رصيد
- `status`: `active`, `inactive`, `first_login`
- `min_balance`: الرصيد الأدنى
- `max_balance`: الرصيد الأعلى

#### 3. إحصائيات العملاء
```http
GET /api/customers/stats
```
**Response:**
```json
{
  "total_customers": 100,
  "active_customers": 80,
  "inactive_customers": 10,
  "first_login_customers": 10,
  "customers_with_balance": 30,
  "total_wallet_balance": 5000.0,
  "average_wallet_balance": 50.0
}
```

#### 4. جلب عميل محدد
```http
GET /api/customers/{customer_id}
```

#### 5. تعديل عميل
```http
PUT /api/customers/{customer_id}
```

#### 6. حذف عميل
```http
DELETE /api/customers/{customer_id}
```

#### 7. إدارة محفظة العميل
```http
PATCH /api/customers/{customer_id}/wallet
```
**Body:**
```json
{
  "amount": 100.0,
  "transaction_type": "add", // أو "deduct"
  "description": "إيداع نقدي"
}
```

---

## 🧾 Invoices APIs

#### 1. إنشاء فاتورة جديدة
```http
POST /api/invoices/
```
**Headers:** `Authorization: Bearer {admin_token}`
**Body:**
```json
{
  "customer_id": "customer_object_id",
  "status": "Pending",
  "notes": "فاتورة جديدة",
  "invoice_items": [
    {
      "product_id": "product_object_id",
      "quantity": 2,
      "price": 50.0
    }
  ]
}
```

#### 2. جلب جميع الفواتير مع فلترة
```http
GET /api/invoices/?page=1&page_size=20&customer_id=&status=&min_total=&max_total=&min_date=&max_date=
```

**Query Parameters:**
- `customer_id`: ID العميل
- `status`: `Paid`, `Pending`, `Partial`
- `min_date`, `max_date`: التواريخ بصيغة ISO (2024-01-01T00:00:00)

#### 3. جلب فاتورة محددة
```http
GET /api/invoices/{invoice_id}
```

#### 4. تعديل فاتورة
```http
PUT /api/invoices/{invoice_id}
```

#### 5. تحديث حالة الدفع
```http
PATCH /api/invoices/{invoice_id}/status?status=Paid
```

#### 6. حذف فاتورة
```http
DELETE /api/invoices/{invoice_id}
```

#### 7. إحصائيات الفواتير
```http
GET /api/invoices/stats
```
**Response:**
```json
{
  "total_invoices": 150,
  "paid_invoices": 120,
  "pending_invoices": 25,
  "partial_invoices": 5,
  "total_revenue": 15000.0,
  "average_invoice_value": 125.0,
  "today_invoices": 5,
  "today_revenue": 500.0
}
```

#### 8. فواتير عميل محدد
```http
GET /api/invoices/customer/{customer_id}
```

---

## 📊 Dashboard APIs

#### 1. إحصائيات شاملة
```http
GET /api/dashboard/stats
```
**Headers:** `Authorization: Bearer {admin_token}`
**Response:**
```json
{
  "products": {
    "total": 500,
    "low_stock": 25
  },
  "customers": {
    "total_customers": 200,
    "active_customers": 180
  },
  "invoices": {
    "total_invoices": 150,
    "total_revenue": 25000.0
  },
  "sales": {
    "today": 1500.0,
    "week": 10000.0,
    "month": 40000.0,
    "total": 250000.0
  }
}
```

#### 2. اتجاه المبيعات
```http
GET /api/dashboard/sales-trend?days=7
```
**Response:**
```json
{
  "period": "Last 7 days",
  "data": [
    {
      "date": "2024-01-01",
      "sales": 1500.0
    }
  ]
}
```

#### 3. توزيع المنتجات حسب الفئات
```http
GET /api/dashboard/category-distribution
```

#### 4. النشاطات الحديثة
```http
GET /api/dashboard/recent-activities?limit=10
```

---

## 🚀 تشغيل النظام

### متطلبات النظام
```bash
pip install -r requirements.txt
```

### متغيرات البيئة (.env)
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=sanabel-elkhier
JWT_SECRET=your-secret-key-here
```

### تشغيل الخادم
```bash
uvicorn app.main:app --reload --port 8000
```

### MongoDB Collections
النظام يستخدم المجموعات التالية:
- `users` - المستخدمين
- `categories` - فئات المنتجات  
- `products` - المنتجات
- `customers` - العملاء
- `invoices` - الفواتير
- `invoice_items` - عناصر الفواتير

---

## 🔒 الأمان

### Headers مطلوبة
جميع APIs تتطلب:
```
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

### أدوار الوصول
- **Admin APIs**: تتطلب admin token
- **User APIs**: تقبل admin أو customer token

---

## 📝 ملاحظات مهمة

1. جميع الـ IDs في النظام هي MongoDB ObjectIDs
2. التواريخ بصيغة ISO 8601
3. الأسعار بالجنيه المصري
4. أرقام الهواتف يجب أن تكون 10 أرقام على الأقل
5. المنتجات قليلة المخزون: الكمية أقل من 10
6. الحذف في النظام هو "soft delete" - تعديل حالة is_active إلى false

---

## 🐛 معالجة الأخطاء

النظام يعيد رموز HTTP standard:
- `200`: نجح الطلب
- `201`: تم الإنشاء بنجاح
- `400`: خطأ في البيانات المرسلة
- `401`: مطلوب تسجيل دخول
- `403`: غير مسموح بالوصول
- `404`: العنصر غير موجود
- `500`: خطأ في الخادم

مثال على رسالة خطأ:
```json
{
  "detail": "وصف الخطأ"
}
```
