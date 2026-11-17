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

  // Allow login pages and auth callbacks
  if (
    pathname.startsWith("/restaurant-admin/login") ||
    pathname.startsWith("/pos/login") ||
    pathname.startsWith("/auth")
  ) {
    return response
  }

  const userRole = request.cookies.get("user_role")?.value
  const posRole = request.cookies.get("pos_role")?.value

  // Root / redirect based on authentication
  if (pathname === "/") {
    const url = request.nextUrl.clone()
    if (!userRole) {
      url.pathname = "/restaurant-admin/login"
      return NextResponse.redirect(url)
    }

    url.pathname = "/restaurant-admin"
    if (userRole === "super-admin") {
      url.searchParams.set("role", "super-admin")
      url.searchParams.set("tab", "tenants")
    } else if (userRole === "restaurant-admin") {
      url.searchParams.set("role", "restaurant-admin")
      url.searchParams.set("tab", "tables")
    } else if (userRole === "pos-kitchen" || posRole === "kitchen") {
      url.searchParams.set("role", "pos-kitchen")
      url.searchParams.set("tab", "kds")
    } else if (userRole === "pos-reception" || posRole === "reception") {
      url.searchParams.set("role", "pos-reception")
      url.searchParams.set("tab", "tables")
    } else {
      url.searchParams.set("role", "pos-orders")
      url.searchParams.set("tab", "pos")
    }
    return NextResponse.redirect(url)
  }

  // Map individual module routes into unified portal tabs
  const moduleTabs = [
    "tables",
    "dashboard",
    "pos",
    "orders",
    "menu",
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
