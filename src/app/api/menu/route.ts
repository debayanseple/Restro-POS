import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { MASTER_MENU_CATALOG, MenuItem } from "@/lib/menu-catalog"

const DATA_DIR = path.join(process.cwd(), "data")
const MENU_FILE = path.join(DATA_DIR, "menu.json")

function getMenuItems(): MenuItem[] {
  try {
    if (fs.existsSync(MENU_FILE)) {
      const content = fs.readFileSync(MENU_FILE, "utf-8")
      const parsed = JSON.parse(content)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    }
  } catch (err) {
    console.warn("Failed to load menu.json:", err)
  }

  // Fallback to initial master catalog
  const initial = MASTER_MENU_CATALOG.map((item) => ({
    ...item,
    isAvailable: item.isAvailable !== undefined ? item.isAvailable : true,
    station: item.station || (item.category === "drinks" ? "bar" : "kitchen"),
  }))
  saveMenuItems(initial)
  return initial
}

function saveMenuItems(items: MenuItem[]) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
    fs.writeFileSync(MENU_FILE, JSON.stringify(items, null, 2), "utf-8")
  } catch (err) {
    console.warn("Failed to save menu.json:", err)
  }
}

// GET: Return all menu items
export async function GET() {
  const items = getMenuItems()
  return NextResponse.json({ success: true, items })
}

// POST: Add a new item or replace items list
export async function POST(request: Request) {
  try {
    const body = await request.json()

    // If batch replace
    if (Array.isArray(body.items)) {
      saveMenuItems(body.items)
      return NextResponse.json({ success: true, items: body.items })
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

    const updated = [newItem, ...items]
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

    saveMenuItems(updated)
    return NextResponse.json({ success: true, item: updatedItem, items: updated })
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
    const updated = items.filter((item) => item.id !== id)
    saveMenuItems(updated)

    return NextResponse.json({ success: true, deletedId: id, items: updated })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
