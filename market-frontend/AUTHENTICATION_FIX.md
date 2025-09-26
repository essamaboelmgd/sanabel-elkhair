# حل مشكلة المصادقة في صفحات الفواتير والزبائن والمنتجات

## المشكلة
كانت هناك مشكلة في نظام المصادقة حيث أن المستخدم يتم إعادة توجيهه لصفحة تسجيل الدخول في كل مرة يدخل فيها صفحات الفواتير والزبائن والمنتجات.

## أسباب المشكلة
1. **عدم حفظ بيانات الجلسة**: كان التوكن وبيانات المستخدم تُحفظ في الذاكرة فقط وليس في `localStorage`
2. **مشكلة SSR**: كان هناك خطأ في استخدام `localStorage` في Server-Side Rendering
3. **عدم التحقق من حالة المصادقة**: الصفحات لم تتحقق من حالة المصادقة قبل تحميل البيانات

## الحلول المطبقة

### 1. إصلاح حفظ بيانات الجلسة
- تم تعديل `AuthContext` لحفظ التوكن وبيانات المستخدم في `localStorage`
- تم إضافة فحص للجلسة المحفوظة عند تحميل التطبيق
- تم إضافة التحقق من صحة التوكن

### 2. إصلاح مشكلة SSR
- تم إضافة helper functions للتعامل مع `localStorage` بشكل آمن
- تم فحص `typeof window !== 'undefined'` قبل استخدام `localStorage`

### 3. تحسين معالجة المصادقة في الصفحات
- تم إضافة `useAuth` hook في جميع الصفحات
- تم إضافة فحص حالة المصادقة قبل تحميل البيانات
- تم تحسين معالجة أخطاء المصادقة

## الملفات المعدلة

### 1. `contexts/auth-context.tsx`
```typescript
// إضافة helper functions للتعامل مع localStorage
const getLocalStorage = (key: string): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(key)
  }
  return null
}

// حفظ التوكن وبيانات المستخدم
setLocalStorage('auth_token', response.access_token)
setLocalStorage('auth_user', JSON.stringify(response.user))
```

### 2. `lib/api.ts`
```typescript
// إضافة helper functions للتعامل مع localStorage
const getLocalStorage = (key: string): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(key)
  }
  return null
}

// تهيئة التوكن من localStorage
this.token = getLocalStorage('auth_token')
```

### 3. صفحات الفواتير والزبائن والمنتجات
```typescript
// إضافة useAuth hook
const { user, loading } = useAuth()

// فحص حالة المصادقة قبل تحميل البيانات
useEffect(() => {
  if (loading || !user) {
    return
  }
  // تحميل البيانات
}, [user, loading, router, toast])
```

### 4. `app/admin/layout.tsx`
```typescript
// تحسين معالجة حالة التحميل
if (loading) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-gray-600">جاري التحقق من المصادقة...</p>
      </div>
    </div>
  )
}
```

## كيفية الاختبار

1. **تسجيل الدخول**: سجل دخولك كمدير
2. **التنقل بين الصفحات**: انتقل بين صفحات الفواتير والزبائن والمنتجات
3. **تحديث الصفحة**: اضغط F5 أو refresh الصفحة
4. **إعادة فتح المتصفح**: أغلق المتصفح وأعد فتحه

يجب أن تبقى مسجل الدخول في جميع الحالات.

## ملاحظات مهمة

- تأكد من أن الـ backend يعمل على `http://localhost:8000`
- تأكد من أن متغير البيئة `NEXT_PUBLIC_API_URL` مضبوط بشكل صحيح
- في حالة حدوث خطأ في المصادقة، سيتم توجيهك تلقائياً لصفحة تسجيل الدخول

## استكشاف الأخطاء

إذا استمرت المشكلة:

1. **افتح Developer Tools** (F12)
2. **اذهب لـ Application tab**
3. **تحقق من Local Storage** للتأكد من وجود `auth_token` و `auth_user`
4. **تحقق من Console** لرؤية أي أخطاء
5. **تحقق من Network tab** لرؤية طلبات API

