import { NextResponse } from "next/server"
import { readStore, writeStore } from "@/lib/serverless-store"
import {
  buildTablesFromFloors,
  DEFAULT_RESTAURANT_SETTINGS,
  normalizeFloors,
  RestaurantSettings,
} from "@/lib/restaurant-settings"

export const dynamic = "force-dynamic"

function getSettings(): RestaurantSettings {
  const raw = readStore<RestaurantSettings>("settings.json", DEFAULT_RESTAURANT_SETTINGS)
  const floors = normalizeFloors(raw.floors)
  return {
    ...DEFAULT_RESTAURANT_SETTINGS,
    ...raw,
    floors,
    totalFloors: floors.length,
    totalTables: floors.reduce((sum, f) => sum + f.tableCount, 0),
  }
}

function saveSettings(settings: RestaurantSettings) {
  writeStore("settings.json", settings)
}

export async function GET() {
  const settings = getSettings()
  return NextResponse.json({ success: true, settings })
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    if (body?.action === "reset") {
      const floors = normalizeFloors(DEFAULT_RESTAURANT_SETTINGS.floors)
      const resetValue: RestaurantSettings = {
        ...DEFAULT_RESTAURANT_SETTINGS,
        floors,
        totalFloors: floors.length,
        totalTables: floors.reduce((sum, f) => sum + f.tableCount, 0),
        updatedAt: new Date().toISOString(),
      }
      saveSettings(resetValue)
      const syncedTables = buildTablesFromFloors(floors, readStore<any[]>("tables.json", []))
      writeStore("tables.json", syncedTables)
      return NextResponse.json({ success: true, settings: resetValue, tables: syncedTables })
    }

    const current = getSettings()
    const incoming = body.settings || body
    const floors = normalizeFloors(incoming.floors ?? current.floors)
    const merged: RestaurantSettings = {
      ...current,
      ...incoming,
      floors,
      totalFloors: floors.length,
      totalTables: floors.reduce((sum, f) => sum + f.tableCount, 0),
      updatedAt: new Date().toISOString(),
    }
    saveSettings(merged)

    const existingTables = readStore<any[]>("tables.json", [])
    const syncedTables = buildTablesFromFloors(floors, existingTables)
    writeStore("tables.json", syncedTables)

    return NextResponse.json({ success: true, settings: merged, tables: syncedTables })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to save settings" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  return PUT(request)
}
