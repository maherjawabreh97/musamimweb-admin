import { Cairo } from "next/font/google"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import {
  directionOf,
  hasLocale,
  locales,
  type Locale,
} from "@/lib/i18n"
import "../globals.css"

export const metadata: Metadata = {
  title: {
    default: "Iskan · Admin",
    template: "%s | Iskan Admin",
  },
  description: "Private administration dashboard for Iskan real estate.",
  // This app is the dashboard only — never let it be indexed.
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
}

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
})

export async function generateStaticParams() {
  return locales.map((lang) => ({ lang }))
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  if (!hasLocale(lang)) notFound()
  const locale: Locale = lang

  return (
    <html lang={lang} dir={directionOf(locale)} className={cairo.variable}>
      <body className="flex min-h-dvh flex-col bg-sand-50 font-sans text-ink-900 antialiased">
        {children}
      </body>
    </html>
  )
}
