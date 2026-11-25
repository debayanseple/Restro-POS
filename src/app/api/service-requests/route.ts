import { NextResponse } from "next/server"
import { readStore, writeStore } from "@/lib/serverless-store"

export const dynamic = "force-dynamic"

export type ServiceRequestType = "clean" | "waiter" | "bill"

export interface ServiceRequest {
  id: string
  table: string
  tableNumber: number
  type: ServiceRequestType
  title: string
  status: "pending" | "in-progress" | "resolved"
  createdAt: string
  clearedAt?: string
  clearedBy?: string
  message?: string
  notes?: string
}

const DEFAULT_SERVICE_REQUESTS: ServiceRequest[] = [
  {
    id: "req_demo_1",
    table: "Table 03",
    tableNumber: 3,
    type: "waiter",
    title: "Call Waiter",
    status: "pending",
    createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
  },
  {
    id: "req_demo_2",
    table: "Table 07",
    tableNumber: 7,
    type: "clean",
    title: "Clean Table",
    status: "pending",
    createdAt: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
  },
]

function getServiceRequests(): ServiceRequest[] {
  return readStore<ServiceRequest[]>("service-requests.json", DEFAULT_SERVICE_REQUESTS)
}

function saveServiceRequests(requests: ServiceRequest[]) {
  writeStore("service-requests.json", requests)
}

function parseTableNumber(tableStr: string): number {
  const match = tableStr.match(/\d+/)
  return match ? parseInt(match[0], 10) : 1
}

// GET: Return all service requests
export async function GET() {
  const requests = getServiceRequests()
  return NextResponse.json({ success: true, requests })
}

// POST: Add a new service request from customer QR menu
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { table, type } = body

    if (!table) {
      return NextResponse.json({ error: "Table identifier is required" }, { status: 400 })
    }

    const validTypes: ServiceRequestType[] = ["clean", "waiter", "bill"]
    const reqType: ServiceRequestType = validTypes.includes(type) ? type : "waiter"

    const titleMap: Record<ServiceRequestType, string> = {
      clean: "Clean Table",
      waiter: "Call Waiter",
      bill: "Ask for Bill",
    }

    const requests = getServiceRequests()
    const tableNumber = parseTableNumber(table)
    const formattedTable = tableNumber < 10 ? `Table 0${tableNumber}` : `Table ${tableNumber}`

    // Check if an identical request is already pending for this table
    const existingIndex = requests.findIndex(
      (r) => r.tableNumber === tableNumber && r.type === reqType && r.status === "pending"
    )

    if (existingIndex !== -1) {
      // Refresh the timestamp and message
      requests[existingIndex].createdAt = new Date().toISOString()
      if (body.message) requests[existingIndex].message = body.message
      saveServiceRequests(requests)
      return NextResponse.json({ success: true, request: requests[existingIndex], requests })
    }

    const newRequest: ServiceRequest = {
      id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      table: formattedTable,
      tableNumber,
      type: reqType,
      title: titleMap[reqType],
      status: "pending",
      createdAt: new Date().toISOString(),
      message: body.message || undefined,
    }

    requests.unshift(newRequest)
    saveServiceRequests(requests)

    return NextResponse.json({ success: true, request: newRequest, requests })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create service request" }, { status: 500 })
  }
}

// PATCH: Clear / Resolve a service request
export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { id, status, clearedBy, clearAllTable } = body

    let requests = getServiceRequests()

    // If clearing all requests for a specific table
    if (clearAllTable) {
      const tblNum = parseTableNumber(clearAllTable)
      requests = requests.map((r) => {
        if (r.tableNumber === tblNum && r.status === "pending") {
          return {
            ...r,
            status: "resolved",
            clearedAt: new Date().toISOString(),
            clearedBy: clearedBy || "Front Desk",
          }
        }
        return r
      })
      saveServiceRequests(requests)
      return NextResponse.json({ success: true, requests })
    }

    if (!id) {
      return NextResponse.json({ error: "Request ID is required" }, { status: 400 })
    }

    const index = requests.findIndex((r) => r.id === id)
    if (index === -1) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 })
    }

    requests[index] = {
      ...requests[index],
      status: status || "resolved",
      clearedAt: new Date().toISOString(),
      clearedBy: clearedBy || "Front Desk",
    }

    saveServiceRequests(requests)
    return NextResponse.json({ success: true, request: requests[index], requests })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update service request" }, { status: 500 })
  }
}

// DELETE: Delete a request or clear all resolved
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    const clearResolved = searchParams.get("clearResolved") === "true"

    let requests = getServiceRequests()

    if (clearResolved) {
      requests = requests.filter((r) => r.status === "pending")
      saveServiceRequests(requests)
      return NextResponse.json({ success: true, requests })
    }

    if (!id) {
      return NextResponse.json({ error: "Request ID is required" }, { status: 400 })
    }

    requests = requests.filter((r) => r.id !== id)
    saveServiceRequests(requests)

    return NextResponse.json({ success: true, requests })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to delete service request" }, { status: 500 })
  }
}
