import { NextResponse } from "next/server"
import {
  MASTER_INVENTORY_CATALOG,
  MASTER_STOCK_MOVEMENTS,
  InventoryItem,
  StockMovement,
} from "@/lib/inventory-catalog"
import { readStore, writeStore } from "@/lib/serverless-store"

export const dynamic = "force-dynamic"

function getInventoryItems(): InventoryItem[] {
  return readStore<InventoryItem[]>("inventory.json", MASTER_INVENTORY_CATALOG)
}

function saveInventoryItems(items: InventoryItem[]) {
  writeStore("inventory.json", items)
}

function getStockMovements(): StockMovement[] {
  return readStore<StockMovement[]>("inventory-movements.json", MASTER_STOCK_MOVEMENTS)
}

function saveStockMovements(movements: StockMovement[]) {
  writeStore("inventory-movements.json", movements)
}

// GET: Return all raw materials and stock movement history
export async function GET() {
  const items = getInventoryItems()
  const movements = getStockMovements()
  return NextResponse.json({ success: true, items, movements })
}

// POST: Add a new raw material or batch save
export async function POST(request: Request) {
  try {
    const body = await request.json()

    // If batch replace
    if (Array.isArray(body.items)) {
      saveInventoryItems(body.items)
      return NextResponse.json({ success: true, items: body.items })
    }

    const items = getInventoryItems()
    const itemData = body.item || body

    if (!itemData.name || !itemData.name.trim()) {
      return NextResponse.json({ error: "Material name is required" }, { status: 400 })
    }

    const todayStr = new Date().toISOString().split("T")[0]
    const newItem: InventoryItem = {
      id: itemData.id || `inv_${Date.now()}`,
      name: itemData.name.trim(),
      category: itemData.category || "Produce",
      currentStock: Number(itemData.currentStock) || 0,
      unit: itemData.unit || "kg",
      minimumStock: Number(itemData.minimumStock) || 5,
      optimalStock: Number(itemData.optimalStock) || 20,
      costPerUnit: Number(itemData.costPerUnit) || 0,
      supplier: itemData.supplier ? itemData.supplier.trim() : "Local Supplier",
      storageLocation: itemData.storageLocation ? itemData.storageLocation.trim() : "Main Store",
      lastRestocked: itemData.lastRestocked || todayStr,
      expiryDate: itemData.expiryDate ? itemData.expiryDate.trim() : undefined,
      notes: itemData.notes || undefined,
    }

    const updated = [newItem, ...items]
    saveInventoryItems(updated)

    // Log initial creation stock movement if stock > 0
    let movements = getStockMovements()
    if (newItem.currentStock > 0) {
      const initialMovement: StockMovement = {
        id: `mov_${Date.now()}`,
        itemId: newItem.id,
        itemName: newItem.name,
        type: "RESTOCK",
        quantity: newItem.currentStock,
        previousStock: 0,
        newStock: newItem.currentStock,
        unit: newItem.unit,
        reason: "Initial raw material intake / stock opening balance",
        performedBy: body.performedBy || "Admin",
        date: new Date().toISOString(),
      }
      movements = [initialMovement, ...movements]
      saveStockMovements(movements)
    }

    return NextResponse.json({ success: true, item: newItem, items: updated, movements })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH: Adjust stock or update material details
export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { id, adjustmentQty, type, reason, performedBy, ...details } = body

    if (!id) {
      return NextResponse.json({ error: "Material ID is required" }, { status: 400 })
    }

    const items = getInventoryItems()
    let movements = getStockMovements()
    let updatedItem: InventoryItem | null = null

    const todayStr = new Date().toISOString().split("T")[0]

    const updatedItems = items.map((item) => {
      if (item.id === id) {
        // Stock adjustment flow
        if (adjustmentQty !== undefined && type) {
          const qty = Number(adjustmentQty)
          const prevStock = item.currentStock
          let newStock = prevStock

          if (type === "RESTOCK") {
            newStock = Number((prevStock + Math.abs(qty)).toFixed(2))
          } else if (type === "USAGE" || type === "WASTE") {
            newStock = Number(Math.max(0, prevStock - Math.abs(qty)).toFixed(2))
          } else if (type === "AUDIT") {
            newStock = Number(Math.max(0, qty).toFixed(2))
          }

          const diff = Number((newStock - prevStock).toFixed(2))

          updatedItem = {
            ...item,
            ...details,
            currentStock: newStock,
            lastRestocked: type === "RESTOCK" ? todayStr : item.lastRestocked,
          }

          // Create stock movement record
          const movement: StockMovement = {
            id: `mov_${Date.now()}`,
            itemId: item.id,
            itemName: item.name,
            type: type,
            quantity: Math.abs(diff),
            previousStock: prevStock,
            newStock: newStock,
            unit: item.unit,
            reason: reason || (type === "RESTOCK" ? "Stock intake / replenishment" : "Kitchen consumption"),
            performedBy: performedBy || "Manager Admin",
            date: new Date().toISOString(),
          }

          movements = [movement, ...movements]
          saveStockMovements(movements)

          return updatedItem
        }

        // Field update flow
        updatedItem = {
          ...item,
          ...details,
          name: details.name !== undefined ? details.name.trim() : item.name,
          category: details.category !== undefined ? details.category : item.category,
          unit: details.unit !== undefined ? details.unit : item.unit,
          currentStock: details.currentStock !== undefined ? Number(details.currentStock) : item.currentStock,
          minimumStock: details.minimumStock !== undefined ? Number(details.minimumStock) : item.minimumStock,
          optimalStock: details.optimalStock !== undefined ? Number(details.optimalStock) : item.optimalStock,
          costPerUnit: details.costPerUnit !== undefined ? Number(details.costPerUnit) : item.costPerUnit,
          supplier: details.supplier !== undefined ? details.supplier.trim() : item.supplier,
          storageLocation: details.storageLocation !== undefined ? details.storageLocation.trim() : item.storageLocation,
          lastRestocked: details.lastRestocked !== undefined ? details.lastRestocked : item.lastRestocked,
          expiryDate: details.expiryDate !== undefined ? (details.expiryDate ? details.expiryDate.trim() : undefined) : item.expiryDate,
          notes: details.notes !== undefined ? details.notes : item.notes,
        }
        return updatedItem
      }
      return item
    })

    if (!updatedItem) {
      return NextResponse.json({ error: "Material not found" }, { status: 404 })
    }

    saveInventoryItems(updatedItems)
    return NextResponse.json({ success: true, item: updatedItem, items: updatedItems, movements })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE: Remove raw material by id
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
      return NextResponse.json({ error: "Material ID is required" }, { status: 400 })
    }

    const items = getInventoryItems()
    const updated = items.filter((item) => item.id !== id)
    saveInventoryItems(updated)

    return NextResponse.json({ success: true, deletedId: id, items: updated })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
