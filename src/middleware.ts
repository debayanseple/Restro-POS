import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { updateSession } from "@/utils/supabase/middleware"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow static assets, images, API
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next()
  }

  // Refresh Supabase user session cookies
  let response = await updateSession(request)

  // Allow login pages, auth callbacks, customer QR menu, and landing page
  if (
    pathname.startsWith("/restaurant-admin/login") ||
    pathname.startsWith("/pos/login") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/menu") ||
    pathname === "/"
  ) {
    return response
  }

  const userRole = request.cookies.get("user_role")?.value
  const posRole = request.cookies.get("pos_role")?.value

  // Block unauthenticated access to any protected application route
  if (!userRole) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = pathname.startsWith("/pos") ? "/pos/login" : "/restaurant-admin/login"
    loginUrl.search = ""
    return NextResponse.redirect(loginUrl)
  }

  // Map individual module routes into unified portal tabs
  const moduleTabs = [
    "tables",
    "dashboard",
    "pos",
    "orders",
    "reservations",
    "kds",
    "customers",
    "inventory",
    "team",
    "accounting",
    "reports",
    "marketing",
    "operations",
    "attendance",
    "settings",
    "super-admin",
  ]
  const matchedTab = moduleTabs.find((tab) => pathname === `/${tab}`)
  if (matchedTab) {
    const url = request.nextUrl.clone()
    url.pathname = "/restaurant-admin"
    url.searchParams.set("tab", matchedTab)
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}
