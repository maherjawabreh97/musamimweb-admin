# لوحة تحكم إسكان (Iskan Admin)

لوحة إدارة **مستقلة** لموقع إسكان العقاري (`iskan.musamimweb.com`).
مشروع منفصل ومنعزل عن موقع إسكان العام، لكنه يتصل بـ **نفس قاعدة بيانات
Supabase** الخاصة بإسكان، فيرى ويعدّل **نفس** العقارات والمستخدمين والصور.

- الموقع العام: `https://iskan.musamimweb.com`
- اللوحة (المقترح): `https://admin.iskan.musamimweb.com`

> لماذا مشروع منفصل؟ العزل يقلّل سطح الهجوم: الموقع العام لا يحتوي أي كود
> إدارة ولا يملك مفتاح `service_role`، بينما اللوحة تعمل على نطاق فرعي محمي.

## ما الذي تديره اللوحة

| القسم | الجدول في Supabase | الوصف |
| --- | --- | --- |
| العقارات | `properties` | إعلانات بيع/إيجار مع الصور والتفاصيل |
| المستخدمون | `users` | حسابات وأدوار (`admin` / `editor` / `viewer`) |
| الصور | bucket `property-images` | رفع صور العقارات |

الحقول النصية ثنائية اللغة (عربي / English)، واللوحة نفسها ثنائية اللغة أيضاً.

## مهم: نفس قاعدة البيانات — بدون مخطط جديد

اللوحة **لا تحتاج** إلى SQL جديد. هي تعمل على مخطط إسكان الموجود أصلاً:

```
properties (slug, data jsonb, purpose, featured, created_at, updated_at)
users      (id, username, name, role, password_hash, created_at)
bucket property-images
```

## التشغيل

### 1) أضف المفاتيح

انسخ `.env.example` إلى `.env` واملأ المفاتيح من **مشروع إسكان** في Supabase
(Settings → API):

```bash
ADMIN_USERNAME=admin
ADMIN_PASSWORD=غيّرها-قبل-أول-تشغيل
ADMIN_SECRET=سلسلة-عشوائية-طويلة
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxxx
SUPABASE_BUCKET=property-images
NEXT_PUBLIC_SITE_URL=https://iskan.musamimweb.com
ADMIN_ALLOWED_IPS=
```

> `SUPABASE_SERVICE_ROLE_KEY` سرّي للخادم فقط. لا تضف له بادئة `NEXT_PUBLIC_`.
> الموقع العام يجب أن يستخدم مفتاح قراءة فقط، وهذا المشروع وحده يحمل مفتاح الخدمة.

### 2) ثبّت وشغّل

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # للإنتاج
npm start
```

### 3) الدخول

- الرابط: `https://admin.iskan.musamimweb.com/` (يحوّلك تلقائياً إلى `/ar/admin`).
- عند أول تشغيل يُنشأ حساب مدير من `ADMIN_USERNAME` / `ADMIN_PASSWORD`.
- **غيّر كلمة السر فوراً** من صفحة المستخدمين.

## الأمان

طبقات الحماية في هذا المشروع:

1. **عزل المشروع**: اللوحة في تطبيق منفصل على نطاق فرعي، والموقع العام لا يحوي
   كود الإدارة ولا مفتاح الخدمة.
2. **قائمة IP مسموحة** (`ADMIN_ALLOWED_IPS`): إن ضُبطت، كل طلب من غير العناوين
   المذكورة يُرفض بـ 403 من `proxy.ts` (يدعم `IP` و`CIDR` مثل `198.51.100.0/24`).
3. **جلسات موقّعة** بـ HMAC داخل كوكي `httpOnly` + `SameSite=Lax` + `Secure` في
   الإنتاج (بدون أي سرّ افتراضي مكتوب في الكود).
4. **كلمات سر** مخزّنة بـ `scrypt` مع salt.
5. **تحديد معدّل محاولات الدخول** (rate limit) لكل IP ولكل اسم مستخدم.
6. **ترويسات أمان**: `X-Frame-Options: DENY`, `nosniff`, `no-referrer`,
   `X-Robots-Tag: noindex` و`HSTS` في الإنتاج.
7. **منع الفهرسة**: اللوحة `noindex, nofollow`.
8. **التحقق من الصور** عبر البايتات السحرية قبل الرفع + فحص الأصل (Origin).
9. **RLS** مفعّل على الجداول؛ لا وصول إلا بمفتاح الخدمة على الخادم.

### تحسين مُوصى به بشدة: Cloudflare Access

قائمة IP وحدها لا تكفي إن كان الخادم يمكن الوصول إليه مباشرة (يمكن تزوير ترويسة
`X-Forwarded-For`). الأفضل وضع **Cloudflare Access** (تسجيل دخول بالبريد/OTP)
أمام نطاق اللوحة، أو على الأقل حجب الوصول للخادم عبر Cloudflare/جدار ناري.
بعدها فعّل `ADMIN_ALLOWED_IPS` كطبقة ثانية.

## بنية المشروع

```
app/
  globals.css
  favicon.ico
  api/admin/upload/route.ts      # رفع صور العقارات
  [lang]/
    layout.tsx                   # التخطيط الجذر (RTL/LTR)
    not-found.tsx
    admin/
      layout.tsx
      actions.ts                 # الدخول + إدارة العقارات والمستخدمين
      login/page.tsx
      (dashboard)/
        layout.tsx               # يحمي كل الصفحات بجلسة
        page.tsx                 # نظرة عامة
        properties/…             # قائمة/إضافة/تعديل العقارات
        users/…                  # قائمة/إضافة/تعديل المستخدمين
components/
  admin/                         # shell, nav, property-form, user-form, …
  language-switcher.tsx
lib/
  supabase.ts  properties.ts  properties-store.ts
  users-store.ts  auth.ts  rate-limit.ts  uploads.ts
  i18n.ts  format.ts  dictionaries/…
proxy.ts                         # قائمة IP + توجيه اللغات (Next.js 16)
next.config.ts                   # ترويسات الأمان
```

## ملاحظات

- التخزين على Supabase (قاعدة البيانات + Storage). إذا لم تُضبط مفاتيح Supabase
  سيعمل وضع الملفات المحلي (`data/` + `public/uploads/`) — **لا تستخدمه في
  الإنتاج** لأنه عندها لن يرى بيانات إسكان الحقيقية.
- هذا المشروع لا يقرأ ولا يعدّل مجلد `website-main` إطلاقاً.
