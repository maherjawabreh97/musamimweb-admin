import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { defaultLocale, locales } from "./lib/i18n"

/**
 * Standalone Iskan dashboard edge gate.
 *
 * Runs before every request (pages, server actions and API routes) and:
 *  1. optionally restricts access to an IP allowlist (`ADMIN_ALLOWED_IPS`);
 *  2. keeps every URL under a `/{locale}` prefix and sends the root to the
 *     dashboard.
 *
 * NOTE (Next.js 16): the file is named `proxy.ts` and exports `proxy`.
 */

// ---------------------------------------------------------------------------
// IP allowlist
// ---------------------------------------------------------------------------

/**
 * Best-effort client IP. Prefer headers that the hosting proxy/edge sets and
 * overwrites (`cf-connecting-ip`, `x-real-ip`) over a client-supplied
 * `x-forwarded-for`. Only enable the allowlist when the origin is not directly
 * reachable by the public, otherwise these headers can be spoofed.
 */
function clientIp(request: NextRequest): string {
  return (
    request.headers.get("cf-connecting-ip")?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    ""
  )
}

function ipv4ToInt(value: string): number | null {
  const parts = value.trim().split(".")
  if (parts.length !== 4) return null
  let result = 0
  for (const part of parts) {
    const octet = Number(part)
    if (!Number.isInteger(octet) || octet < 0 || octet > 255) return null
    result = result * 256 + octet
  }
  return result >>> 0
}

/** Match a single IP against an exact address or an IPv4 CIDR block. */
function matchesEntry(ip: string, entry: string): boolean {
  if (!entry.includes("/")) return ip === entry

  const [range, bitsRaw] = entry.split("/")
  const bits = Number(bitsRaw)
  if (!range || !Number.isInteger(bits) || bits < 0 || bits > 32) return false

  const ipInt = ipv4ToInt(ip)
  const rangeInt = ipv4ToInt(range)
  if (ipInt === null || rangeInt === null) return false

  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0
  return (ipInt & mask) === (rangeInt & mask)
}

function isAllowed(ip: string): boolean {
  const raw = process.env.ADMIN_ALLOWED_IPS?.trim()
  if (!raw) return true // allowlist disabled
  if (!ip) return false // allowlist on but we cannot identify the client
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .some((entry) => matchesEntry(ip, entry))
}

// ---------------------------------------------------------------------------
// Locale routing
// ---------------------------------------------------------------------------

function preferredLocale(request: NextRequest): string {
  const accept = request.headers.get("accept-language")?.toLowerCase() ?? ""
  if (accept.includes("ar")) return "ar"
  if (accept.includes("en")) return "en"
  return defaultLocale
}

function hasLocalePrefix(pathname: string): string | undefined {
  return locales.find(
    (locale) =>
      pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  )
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1) Access restriction — applies to pages, actions and API routes.
  if (!isAllowed(clientIp(request))) {
    return new NextResponse("Forbidden", {
      status: 403,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/plain; charset=utf-8",
      },
    })
  }

  // API routes are not localized.
  if (pathname.startsWith("/api/")) return NextResponse.next()

  // Framework internals (e.g. RSC data requests) must not be locale-prefixed.
  if (pathname.startsWith("/_next/")) return NextResponse.next()

  const url = request.nextUrl.clone()
  const existing = hasLocalePrefix(pathname)

  // 2) Normalize localized URLs.
  if (existing) {
    // `/{locale}` -> `/{locale}/admin`
    if (pathname === `/${existing}`) {
      url.pathname = `/${existing}/admin`
      return NextResponse.redirect(url)
    }
    return NextResponse.next()
  }

  // 3) Prefix anything else with a locale; bare root goes to the dashboard.
  const locale = preferredLocale(request)
  url.pathname = pathname === "/" ? `/${locale}/admin` : `/${locale}${pathname}`
  return NextResponse.redirect(url)
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico|txt|xml|webmanifest)$).*)",
  ],
}
