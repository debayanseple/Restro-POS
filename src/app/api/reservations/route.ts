import { NextResponse } from "next/server"
import { readStore, writeStore } from "@/lib/serverless-store"

export const dynamic = "force-dynamic"

export interface ReservationItem {
  id: string
  guestName: string
  phone: string
  guests: number
  time: string
  table: string
  status: "Confirmed" | "Arrived" | "Seated" | "Completed" | "Cancelled" | string
  notes?: string
}

const DEFAULT_RESERVATIONS: ReservationItem[] = [
  {
    id: "RES-101",
    guestName: "Alexander Wright",
    phone: "+1 (555) 234-8891",
    guests: 4,
    time: "19:00 Today",
    table: "Table 3",
    status: "Confirmed",
    notes: "Window booth preferred, celebrating anniversary",
  },
  {
    id: "RES-102",
    guestName: "Sophia Martinez",
    phone: "+1 (555) 412-9903",
    guests: 2,
    time: "19:30 Today",
    table: "Table 1",
    status: "Confirmed",
    notes: "First time dining, VIP guest",
  },
  {
    id: "RES-103",
    guestName: "Marcus Sterling",
    phone: "+1 (555) 872-3310",
    guests: 6,
    time: "20:15 Today",
    table: "Table 6",
    status: "Confirmed",
    notes: "Corporate dinner, pre-ordered wine",
  },
  {
    id: "RES-104",
    guestName: "Emma Watson",
    phone: "+1 (555) 601-7744",
    guests: 2,
    time: "21:00 Today",
    table: "Table 2",
    status: "Confirmed",
    notes: "Requested quiet corner",
  },
]

const DEFAULT_TABLES = [
  { id: 1, name: "Table 1", seats: 4, status: "available", isOpen: false },
  { id: 2, name: "Table 2", seats: 4, status: "available", isOpen: false },
  { id: 3, name: "Table 3", seats: 6, status: "available", isOpen: false },
  { id: 4, name: "Table 4", seats: 4, status: "available", isOpen: false },
  { id: 6, name: "Table 6", seats: 6, status: "available", isOpen: false },
  { id: 7, name: "Table 7", seats: 4, status: "available", isOpen: false },
  { id: 8, name: "Table 8", seats: 4, status: "available", isOpen: false },
]

function getReservations(): ReservationItem[] {
  return readStore<ReservationItem[]>("reservations.json", DEFAULT_RESERVATIONS)
}

function saveReservations(items: ReservationItem[]) {
  writeStore("reservations.json", items)
}

function getTables(): any[] {
  return readStore<any[]>("tables.json", DEFAULT_TABLES)
}

function saveTables(tables: any[]) {
  writeStore("tables.json", tables)
}

function findTableInList(tableStr: string, tables: any[]) {
  if (!tableStr) return null
  const clean = tableStr.trim().toLowerCase()
  const num = parseInt(clean.replace(/\D/g, ""), 10)
  return tables.find((t) => t.name.toLowerCase() === clean || t.id === num) || null
}

export async function GET() {
  const reservations = getReservations()
  return NextResponse.json({ success: true, reservations })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const reservations = getReservations()

    const newRes: ReservationItem = {
      id: body.id || `RES-${Math.floor(100 + Math.random() * 900)}`,
      guestName: body.guestName || "Walk-in Guest",
      phone: body.phone || "",
      guests: Number(body.guests) || 2,
      time: body.time || "19:00 Today",
      table: body.table || "Table 1",
      status: body.status || "Confirmed",
      notes: body.notes || "",
    }

    const updated = [newRes, ...reservations]
    saveReservations(updated)

    // If marked Arrived or Seated on creation, occupy the table
    if (newRes.status === "Arrived" || newRes.status === "Seated") {
      let tables = getTables()
      const targetTable = findTableInList(newRes.table, tables)
      if (targetTable) {
        tables = tables.map((t) =>
          t.id === targetTable.id ? { ...t, status: "occupied", isOpen: true } : t
        )
        saveTables(tables)
      }
    }

    return NextResponse.json({ success: true, reservation: newRes, reservations: updated })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { id, status, guestName, phone, guests, time, table, notes } = body

    if (!id) {
      return NextResponse.json({ error: "Reservation ID is required" }, { status: 400 })
    }

    let reservations = getReservations()
    const original = reservations.find((r) => r.id === id)

    if (!original) {
      return NextResponse.json({ error: "Reservation not found" }, { status: 404 })
    }

    const newStatus = status || original.status
    const newTableStr = table || original.table
    let tables = getTables()

    // Conflict Check: If transitioning to "Arrived" or "Seated"
    if (newStatus === "Arrived" || newStatus === "Seated") {
      const targetTable = findTableInList(newTableStr, tables)
      const wasAlreadyOccupying =
        original.status === "Arrived" || original.status === "Seated"
      const tableChanged = original.table !== newTableStr

      // If table is busy and not already occupied by this party:
      if (targetTable && targetTable.status !== "available" && (!wasAlreadyOccupying || tableChanged)) {
        return NextResponse.json(
          {
            success: false,
            conflict: true,
            error: `Table ${targetTable.name} is currently ${targetTable.status.toUpperCase()}! You cannot seat or mark this reservation as ${newStatus}. Please wait until the table becomes available or edit the reservation to choose an open table.`,
          },
          { status: 409 }
        )
      }

      // If party changed tables while occupied, free old table
      if (wasAlreadyOccupying && tableChanged) {
        const oldTable = findTableInList(original.table, tables)
        if (oldTable) {
          tables = tables.map((t) =>
            t.id === oldTable.id ? { ...t, status: "available", isOpen: false } : t
          )
        }
      }

      // Occupy target table
      if (targetTable) {
        tables = tables.map((t) =>
          t.id === targetTable.id ? { ...t, status: "occupied", isOpen: true } : t
        )
        saveTables(tables)
      }
    } else if (newStatus === "Completed" || newStatus === "Cancelled") {
      // Free table if it was previously occupied
      if (original.status === "Arrived" || original.status === "Seated") {
        const targetTable = findTableInList(original.table, tables)
        if (targetTable) {
          tables = tables.map((t) =>
            t.id === targetTable.id ? { ...t, status: "available", isOpen: false } : t
          )
          saveTables(tables)
        }
      }
    } else if (original.table !== newTableStr && (original.status === "Arrived" || original.status === "Seated")) {
      // Table changed while occupied without status change
      const oldTable = findTableInList(original.table, tables)
      const newTable = findTableInList(newTableStr, tables)
      if (newTable && newTable.status !== "available") {
        return NextResponse.json(
          {
            success: false,
            conflict: true,
            error: `Table ${newTable.name} is currently ${newTable.status.toUpperCase()}! Please choose an open table.`,
          },
          { status: 409 }
        )
      }
      if (oldTable) {
        tables = tables.map((t) =>
          t.id === oldTable.id ? { ...t, status: "available", isOpen: false } : t
        )
      }
      if (newTable) {
        tables = tables.map((t) =>
          t.id === newTable.id ? { ...t, status: "occupied", isOpen: true } : t
        )
      }
      saveTables(tables)
    }

    const updatedItem: ReservationItem = {
      ...original,
      guestName: guestName !== undefined ? guestName : original.guestName,
      phone: phone !== undefined ? phone : original.phone,
      guests: guests !== undefined ? Number(guests) : original.guests,
      time: time !== undefined ? time : original.time,
      table: newTableStr,
      status: newStatus,
      notes: notes !== undefined ? notes : original.notes,
    }

    reservations = reservations.map((r) => (r.id === id ? updatedItem : r))
    saveReservations(reservations)

    return NextResponse.json({
      success: true,
      reservation: updatedItem,
      reservations,
      tables: getTables(),
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Reservation ID is required" }, { status: 400 })
    }

    let reservations = getReservations()
    const target = reservations.find((r) => r.id === id)

    if (target && (target.status === "Arrived" || target.status === "Seated")) {
      let tables = getTables()
      const targetTable = findTableInList(target.table, tables)
      if (targetTable) {
        tables = tables.map((t) =>
          t.id === targetTable.id ? { ...t, status: "available", isOpen: false } : t
        )
        saveTables(tables)
      }
    }

    reservations = reservations.filter((r) => r.id !== id)
    saveReservations(reservations)

    return NextResponse.json({ success: true, reservations, tables: getTables() })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
