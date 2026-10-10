import Link from "next/link"

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center bg-ink-950 px-4 text-center">
      <div className="w-full max-w-sm">
        <p className="text-6xl font-black text-gold-400">404</p>
        <h1 className="mt-4 text-xl font-black text-white">
          الصفحة غير موجودة
        </h1>
        <p className="mt-1 text-sm font-semibold text-white/50">
          Page not found
        </p>
        <Link
          href="/ar/admin"
          className="btn-gold mt-6 inline-flex rounded-full px-6 py-3 text-sm font-black text-ink-950"
        >
          لوحة التحكم
        </Link>
      </div>
    </div>
  )
}
