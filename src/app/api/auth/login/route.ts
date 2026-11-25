import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, role } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      )
    }

    const lowerEmail = email.toLowerCase()
    let assignedRole = role || "restaurant-admin"
    let posRole: string | null = null

    if (
      lowerEmail.includes("superadmin") ||
      lowerEmail.includes("super-admin") ||
      role === "super-admin"
    ) {
      assignedRole = "super-admin"
      posRole = null
    } else if (
      lowerEmail.includes("kitchen") ||
      lowerEmail.includes("chef") ||
      lowerEmail.includes("cook") ||
      role === "pos-kitchen" ||
      role === "kitchen"
    ) {
      assignedRole = "pos-kitchen"
      posRole = "kitchen"
    } else if (
      lowerEmail.includes("reception") ||
      lowerEmail.includes("frontdesk") ||
      lowerEmail.includes("host") ||
      role === "pos-reception" ||
      role === "reception"
    ) {
      assignedRole = "pos-reception"
      posRole = "reception"
    } else if (
      lowerEmail.includes("orders") ||
      lowerEmail.includes("cashier") ||
      lowerEmail.includes("waiter") ||
      role === "pos-orders" ||
      role === "orders"
    ) {
      assignedRole = "pos-orders"
      posRole = "orders"
    } else if (
      lowerEmail.includes("admin") ||
      lowerEmail.includes("owner") ||
      role === "restaurant-admin"
    ) {
      assignedRole = "restaurant-admin"
      posRole = null
    } else {
      assignedRole = role || "restaurant-admin"
      posRole = assignedRole.startsWith("pos-")
        ? assignedRole.replace("pos-", "")
        : null
    }

    const restaurantId = "demo-restaurant-1"
    const outletId = "demo-outlet-1"

    const response = NextResponse.json({
      success: true,
      restaurantId,
      outletId,
      role: assignedRole,
      posRole,
      user: {
        id: "user-1",
        email,
        name: email.split("@")[0],
        role: assignedRole,
        posRole,
      },
    })

    // Set standard session cookies
    response.cookies.set("restaurant_id", restaurantId, {
      path: "/",
      maxAge: 86400,
    })
    response.cookies.set("outlet_id", outletId, {
      path: "/",
      maxAge: 86400,
    })
    response.cookies.set("user_role", assignedRole, {
      path: "/",
      maxAge: 86400,
    })

    if (posRole) {
      response.cookies.set("pos_role", posRole, {
        path: "/",
        maxAge: 86400,
      })
    } else {
      // Clear pos_role cookie when logging in as admin or super-admin
      response.cookies.set("pos_role", "", {
        path: "/",
        maxAge: 0,
      })
    }

    return response
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    )
  }
}
