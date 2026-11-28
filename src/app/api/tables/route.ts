import { NextResponse } from "next/server"
import { readStore, writeStore } from "@/lib/serverless-store"
import {
  buildTablesFromFloors,
  DEFAULT_RESTAURANT_SETTINGS,
  normalizeFloors,
  RestaurantSettings,
} from "@/lib/restaurant-settings"

export const dynamic = "force-dynamic"

const DEFAULT_TABLES = buildTablesFromFloors(DEFAULT_RESTAURANT_SETTINGS.floors, [])

function getConfiguredFloors() {
  const settings = readStore<RestaurantSettings>("settings.json", DEFAULT_RESTAURANT_SETTINGS)
  return normalizeFloors(settings?.floors)
}

function getTables(): any[] {
  const floors = getConfiguredFloors()
  const expectedCount = floors.reduce((sum, f) => sum + f.tableCount, 0)
  const stored = readStore<any[]>("tables.json", DEFAULT_TABLES)
  const needsSync =
    !Array.isArray(stored) ||
    stored.length !== expectedCount ||
    stored.some((t) => !t?.floorName)

  if (needsSync) {
    const synced = buildTablesFromFloors(floors, Array.isArray(stored) ? stored : [])
    writeStore("tables.json", synced)
    return synced
  }
  return stored
}

function saveTables(tables: any[]) {
  writeStore("tables.json", tables)
}

export async function GET() {
  const floors = getConfiguredFloors()
  const tables = getTables()
  return NextResponse.json({ success: true, tables, floors })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { table_id, status, isOpen, action, sentBill } = body
    const nowIso = new Date().toISOString()

    let tables = getTables()

    if (action === "send_bill") {
      tables = tables.map((t) => {
        const matches =
          t.id === Number(table_id) ||
          t.name.toLowerCase() === String(table_id).toLowerCase() ||
          `table ${t.id}` === String(table_id).toLowerCase() ||
          `table 0${t.id}` === String(table_id).toLowerCase()

        if (matches) {
          return {
            ...t,
            sentBill: sentBill || null,
          }
        }
        return t
      })

      saveTables(tables)
      return NextResponse.json({ success: true, tables })
    }

    const clearedTargets: Array<{ id: number; name: string }> = []

    tables = tables.map((t) => {
      const matches =
        t.id === Number(table_id) ||
        t.name.toLowerCase() === String(table_id).toLowerCase() ||
        `table ${t.id}` === String(table_id).toLowerCase() ||
        `table 0${t.id}` === String(table_id).toLowerCase()

      if (matches) {
        const nextStatus = status || t.status
        if (nextStatus === "available") {
          clearedTargets.push({ id: t.id, name: t.name })
        }
        return {
          ...t,
          status: nextStatus,
          isOpen: nextStatus === "available" ? false : typeof isOpen === "boolean" ? isOpen : t.isOpen,
          ...(nextStatus === "available" ? { clearedAt: nowIso, sentBill: null } : {}),
        }
      }
      return t
    })

    saveTables(tables)

    // When a table is cleared (becomes available), close/settle its current active orders
    // so they remain in Order History while never appearing in future bills for this table.
    if (clearedTargets.length > 0) {
      try {
        const savedOrders = readStore<any[]>("orders.json", [])
        if (Array.isArray(savedOrders) && savedOrders.length > 0) {
          let ordersModified = false
          const updatedOrders = savedOrders.map((o) => {
            if (!o || o.status === "CANCELLED" || o.billed_closed_at || !o.table_id) {
              return o
            }
            if (o.status === "CLOSED" && o.payment_status === "PAID") {
              return o
            }
            const cleanOrderTable = String(o.table_id).toLowerCase().trim()
            const belongsToClearedTable = clearedTargets.some(
              (target) =>
                cleanOrderTable === target.name.toLowerCase().trim() ||
                cleanOrderTable === `table ${target.id}` ||
                cleanOrderTable === `table 0${target.id}` ||
                cleanOrderTable === String(target.id)
            )
            if (!belongsToClearedTable) return o

            ordersModified = true
            return {
              ...o,
              status: "CLOSED",
              payment_status: "PAID",
              kds_stage: "completed",
              kitchen_stage: "completed",
              bar_stage: "completed",
              updated_at: nowIso,
              billed_closed_at: nowIso,
              order_items: Array.isArray(o.order_items)
                ? o.order_items.map((it: any) => ({ ...it, status: "completed" }))
                : o.order_items,
              Payment: Array.isArray(o.Payment) && o.Payment.length > 0
                ? o.Payment.map((p: any) => ({ ...p, status: "PAID" }))
                : o.Payment,
            }
          })
          if (ordersModified) {
            writeStore("orders.json", updatedOrders)
          }
        }
      } catch (err) {
        console.warn("Could not close table orders on clear:", err)
      }

      // Also resolve pending table assistance calls for the cleared table
      try {
        const savedReqs = readStore<any[]>("service-requests.json", [])
        if (Array.isArray(savedReqs) && savedReqs.length > 0) {
          let reqsModified = false
          const clearedIds = new Set(clearedTargets.map((t) => t.id))
          const updatedReqs = savedReqs.map((req) => {
            if (req.status !== "resolved" && clearedIds.has(Number(req.tableNumber))) {
              reqsModified = true
              return { ...req, status: "resolved", clearedAt: nowIso, clearedBy: "Table Cleared" }
            }
            return req
          })
          if (reqsModified) {
            writeStore("service-requests.json", updatedReqs)
          }
        }
      } catch (err) {
        console.warn("Could not resolve service requests on table clear:", err)
      }
    }

    return NextResponse.json({ success: true, tables })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
