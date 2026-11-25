import { NextResponse } from "next/server"
import { MASTER_MENU_CATALOG, MenuItem } from "@/lib/menu-catalog"
import { readStore, writeStore } from "@/lib/serverless-store"

export const dynamic = "force-dynamic"

function getInitialMenu(): MenuItem[] {
  return MASTER_MENU_CATALOG.map((item) => ({
    ...item,
    isAvailable: item.isAvailable !== undefined ? item.isAvailable : true,
    station: item.station || (item.category === "drinks" ? "bar" : "kitchen"),
  }))
}

function getMenuItems(): MenuItem[] {
  return readStore<MenuItem[]>("menu.json", getInitialMenu())
}

function saveMenuItems(items: MenuItem[]) {
  writeStore("menu.json", items)
}

function sortMenuItems(items: MenuItem[]): MenuItem[] {
  return [...items].sort((a, b) => {
    const aOut = a.isAvailable === false ? 1 : 0
    const bOut = b.isAvailable === false ? 1 : 0
    return aOut - bOut
  })
}

// GET: Return all menu items (in-stock items first, out-of-stock items at the end)
export async function GET() {
  const items = getMenuItems()
  return NextResponse.json({ success: true, items: sortMenuItems(items) })
}

// POST: Add a new item or replace items list
export async function POST(request: Request) {
  try {
    const body = await request.json()

    // If batch replace
    if (Array.isArray(body.items)) {
      const sorted = sortMenuItems(body.items)
      saveMenuItems(sorted)
      return NextResponse.json({ success: true, items: sorted })
    }

    // Add single item
    const items = getMenuItems()
    const itemData = body.item || body
    const newItem: MenuItem = {
      id: itemData.id || `m_${Date.now()}`,
      name: itemData.name || "New Dish",
      price: Number(itemData.price) || 0,
      category: itemData.category || "mains",
      icon: itemData.icon || "🍽️",
      tag: itemData.tag || undefined,
      description: itemData.description || "",
      isVeg: Boolean(itemData.isVeg),
      isAvailable: itemData.isAvailable !== undefined ? Boolean(itemData.isAvailable) : true,
      station: itemData.station || (itemData.category === "drinks" ? "bar" : "kitchen"),
    }

    const updated = sortMenuItems([newItem, ...items])
    saveMenuItems(updated)

    return NextResponse.json({ success: true, item: newItem, items: updated })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH: Update item status (e.g. toggle isAvailable) or update fields
export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { id, isAvailable, ...rest } = body

    if (!id) {
      return NextResponse.json({ error: "Item ID is required" }, { status: 400 })
    }

    const items = getMenuItems()
    let updatedItem: MenuItem | null = null

    const updated = items.map((item) => {
      if (item.id === id) {
        updatedItem = {
          ...item,
          ...rest,
          isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : item.isAvailable,
        }
        return updatedItem
      }
      return item
    })

    if (!updatedItem) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 })
    }

    const sorted = sortMenuItems(updated)
    saveMenuItems(sorted)
    return NextResponse.json({ success: true, item: updatedItem, items: sorted })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE: Remove item by id
export async function DELETE(request: Request) {
  try {
    let id: string | null = null

    const { searchParams } = new URL(request.url)
    id = searchParams.get("id")

    if (!id) {
      try {
        const body = await request.json()
        id = body.id
      } catch {}
    }

    if (!id) {
      return NextResponse.json({ error: "Item ID is required" }, { status: 400 })
    }

    const items = getMenuItems()
    const updated = sortMenuItems(items.filter((item) => item.id !== id))
    saveMenuItems(updated)

    return NextResponse.json({ success: true, deletedId: id, items: updated })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
