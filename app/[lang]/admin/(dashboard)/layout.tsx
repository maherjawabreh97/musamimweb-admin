import { notFound, redirect } from "next/navigation"
import { AdminShell } from "@/components/admin/admin-shell"
import { getCurrentUser } from "@/lib/auth"
import { getAdminDict } from "@/lib/dictionaries/admin"
import { hasLocale, type Locale } from "@/lib/i18n"
import { hasSupabase } from "@/lib/supabase"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Dashboard | Iskan",
  robots: { index: false, follow: false },
}

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  if (!hasLocale(lang)) notFound()
  const locale: Locale = lang

  const user = await getCurrentUser()
  if (!user) redirect(`/${locale}/admin/login`)

  const t = getAdminDict(locale)

  return (
    <>
      {!hasSupabase() && (
        <div className="bg-amber-500 px-4 py-2 text-center text-xs font-extrabold text-amber-950">
          ⚠ Supabase غير مُهيّأ — اللوحة تعمل حالياً ببيانات محلية منفصلة عن موقع
          إسكان. اضبط SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY لمشاركة نفس
          قاعدة البيانات.
        </div>
      )}
      <AdminShell
        locale={locale}
        t={t}
        user={{
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
        }}
      >
        {children}
      </AdminShell>
    </>
  )
}
