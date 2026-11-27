import { NextResponse } from "next/server"
import { readStore, writeStore } from "@/lib/serverless-store"

export const dynamic = "force-dynamic"

export interface DemoBookingRequest {
  id: string
  name: string
  restaurantName: string
  phone: string
  email: string
  restaurantType: string
  preferredSlot: string
  notes?: string
  createdAt: string
  status: "new" | "contacted" | "scheduled" | "completed"
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, restaurantName, phone, email, restaurantType, preferredSlot, notes } = body

    if (!name || !phone) {
      return NextResponse.json(
        { error: "Name and contact phone are required" },
        { status: 400 }
      )
    }

    const newRequest: DemoBookingRequest = {
      id: `demo_req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: String(name).trim(),
      restaurantName: String(restaurantName || "My Restaurant").trim(),
      phone: String(phone).trim(),
      email: String(email || "").trim(),
      restaurantType: String(restaurantType || "Casual Dining").trim(),
      preferredSlot: String(preferredSlot || "Next Available").trim(),
      notes: notes ? String(notes).trim() : undefined,
      createdAt: new Date().toISOString(),
      status: "new",
    }

    const existing = readStore<DemoBookingRequest[]>("demo-requests.json", [])
    const updated = [newRequest, ...existing]
    writeStore("demo-requests.json", updated)

    return NextResponse.json({
      success: true,
      message: "Demo request received successfully. Our team will contact you shortly.",
      request: newRequest,
    })
  } catch (error: any) {
    console.error("Error saving demo request:", error)
    return NextResponse.json(
      { error: "Failed to submit demo request", details: error?.message },
      { status: 500 }
    )
  }
}

export async function GET() {
  const requests = readStore<DemoBookingRequest[]>("demo-requests.json", [])
  return NextResponse.json({ success: true, count: requests.length, requests })
}
