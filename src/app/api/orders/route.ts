import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { readStore, writeStore } from "@/lib/serverless-store"
import { MASTER_MENU_CATALOG } from "@/lib/menu-catalog"

export const dynamic = "force-dynamic"

function resolveCatalogItemPrice(
  item: any,
  catalog: any[]
): number {
  const rawPrice = Number(item?.unit_price ?? item?.unitPrice ?? item?.price ?? 0)
  if (rawPrice > 0) return rawPrice

  const rawName = String(item?.MenuItem?.name || item?.name || item?.title || "").trim()
  const isHalf = /\(half\)$/i.test(rawName)
  const isFull = /\(full\)$/i.test(rawName)
  const baseName = rawName.replace(/\s*\((half|full)\)$/i, "").toLowerCase().trim()
  const rawId = String(item?.menu_item_id || item?.menuItemId || item?.id || "").replace(/__(half|full)$/i, "")

  const found = catalog.find(
    (m: any) => (rawId && m.id === rawId) || (baseName && String(m.name || "").toLowerCase().trim() === baseName)
  )
  if (!found) return 0
  if (isHalf && found.halfPrice) return Number(found.halfPrice)
  if (isFull && found.fullPrice) return Number(found.fullPrice)
  return Number(found.price) || 0
}

function loadSavedOrders(): any[] {
  return readStore<any[]>("orders.json", [])
}

function saveOrdersToDisk(orders: any[]) {
  writeStore("orders.json", orders)
}

function isBarItem(name: string): boolean {
  const lower = (name || "").toLowerCase()
  return (
    lower.includes("beer") ||
    lower.includes("wine") ||
    lower.includes("fizz") ||
    lower.includes("cocktail") ||
    lower.includes("macchiato") ||
    lower.includes("coffee") ||
    lower.includes("drink") ||
    lower.includes("juice") ||
    lower.includes("beverage") ||
    lower.includes("tea") ||
    lower.includes("smoothie") ||
    lower.includes("soda") ||
    lower.includes("water") ||
    lower.includes("latte") ||
    lower.includes("espresso")
  )
}

function markTableOccupied(tableIdentifier: string | null) {
  if (!tableIdentifier) return
  try {
    let tables = readStore<any[]>("tables.json", [])
    if (Array.isArray(tables) && tables.length > 0) {
      const clean = String(tableIdentifier).toLowerCase().trim()
      tables = tables.map((t: any) => {
        const match1 = t.name && t.name.toLowerCase().trim() === clean
        const match2 = `table ${t.id}` === clean
        const match3 = `table 0${t.id}` === clean
        const match4 = String(t.id) === clean
        if (match1 || match2 || match3 || match4) {
          return { ...t, status: "occupied", isOpen: true }
        }
        return t
      })
      writeStore("tables.json", tables)
    }
  } catch (err) {
    console.warn("Could not mark table occupied:", err)
  }
}

// Persistent runtime cache for orders
let cachedOrders: any[] = loadSavedOrders()

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Defensive check: If this is an isolated demo order, simulate success without touching live database, orders.json, or occupying real tables
    const isDemoOrder =
      body.isDemo === true ||
      body.mode === "demo" ||
      body.source === "DEMO_QR" ||
      body.source === "DEMO_QR_MENU" ||
      String(body.table_id || "").toLowerCase().includes("demo") ||
      String(body.tableId || "").toLowerCase().includes("demo")

    if (isDemoOrder) {
      const generatedOrderNumber =
        body.order_number ||
        body.orderNumber ||
        `DEMO-${Math.floor(1000 + Math.random() * 9000)}`
      return NextResponse.json({
        id: `demo_${Date.now()}`,
        order_number: generatedOrderNumber,
        isDemo: true,
        message: "Demo order simulated in sandbox. Not dispatched to live kitchen.",
        status: "OPEN",
        kitchen_stage: "new",
        bar_stage: "new",
        total_amount: Number(body.total_amount ?? 0),
        table_id: body.table_id || "Demo Table 01",
        items: body.items || [],
      })
    }

    // Normalize parameter names across both camelCase and snake_case
    const restaurant_id = body.restaurant_id || body.restaurantId || "demo-restaurant-1"
    const outlet_id = body.outlet_id || body.outletId || null
    const user_id = body.user_id || body.userId || "user-default"
    const order_type = body.order_type || body.orderType || "dine-in"
    const table_id = body.table_id || body.tableId || null
    const items = body.items || []
    
    // Normalize numeric values
    let total_amount = Number(body.total_amount ?? body.totalAmount ?? 0)
    const tax_amount = Number(body.tax_amount ?? body.taxAmount ?? 0)
    const discount_amount = Number(body.discount_amount ?? body.discountAmount ?? 0)
    
    const payment_status = body.payment_status || body.paymentStatus || "UNPAID"
    const payment_method = body.payment_method || body.paymentMethod || "MANUAL"
    const source = body.source || "pos"
    const customer_name = (body.customer_name || body.customerName || "").trim() || null
    const customer_phone = (body.customer_phone || body.customerPhone || "").trim() || null
    const notes = body.notes || null

    // Validate that items exist
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Cart is empty. Please add items to place an order." },
        { status: 400 }
      )
    }

    // Resolve live catalog for authoritative item price fallback
    const liveCatalog = readStore<any[]>("menu.json", MASTER_MENU_CATALOG)

    // Fallback: calculate total if not provided
    if (total_amount <= 0) {
      total_amount = items.reduce((sum: number, it: any) => {
        const p = resolveCatalogItemPrice(it, liveCatalog)
        const q = Number(it.quantity ?? 1)
        return sum + p * q
      }, 0) + tax_amount
    }

    // Generate unique order number
    const generatedOrderNumber =
      body.order_number ||
      body.orderNumber ||
      `ORD-${Math.floor(1000 + Math.random() * 9000)}`

    const orderId = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`

    // Format order items with station categorization
    const formattedItems = items.map((item: any, idx: number) => {
      const itemName = item.name || item.title || "Menu Item"
      const unitPrice = resolveCatalogItemPrice(item, liveCatalog)
      const quantity = Number(item.quantity ?? 1)
      const station = isBarItem(itemName) ? "bar" : "kitchen"
      return {
        id: `it_${Date.now()}_${idx}`,
        order_id: orderId,
        menu_item_id: item.menu_item_id || item.menuItemId || item.id || `m_${idx}`,
        quantity,
        unit_price: unitPrice,
        special_instructions: item.specialInstructions || item.special_instructions || null,
        name: itemName,
        station,
        status: "new",
        MenuItem: {
          name: itemName,
        },
      }
    })

    // Construct the full order object with separate KDS stages for kitchen and bar
    const newOrder = {
      id: orderId,
      restaurant_id,
      outlet_id,
      user_id,
      status: "OPEN",
      kds_stage: "new",
      kitchen_stage: "new",
      bar_stage: "new",
      order_type,
      table_id: table_id
        ? String(table_id).startsWith("Table")
          ? String(table_id)
          : `Table ${table_id}`
        : order_type === "takeaway"
        ? "Takeaway"
        : order_type === "delivery"
        ? "Delivery"
        : "Counter",
      total_amount,
      tax_amount,
      discount_amount,
      payment_status,
      payment_method,
      source,
      order_number: generatedOrderNumber,
      customer_name,
      customer_phone,
      notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      order_items: formattedItems,
      Payment: [
        {
          id: `pay_${Date.now()}`,
          order_id: orderId,
          amount: total_amount,
          status: payment_status,
          payment_method,
          recorded_at: new Date().toISOString(),
        },
      ],
    }

    // 1. Try persisting to Supabase if tables exist
    try {
      const { data: dbOrder, error: orderError } = await supabase
        .from("Order")
        .insert({
          restaurant_id,
          outlet_id,
          user_id,
          status: "OPEN",
          order_type,
          table_id: newOrder.table_id,
          total_amount,
          tax_amount,
          discount_amount,
          payment_status,
          payment_method,
          source,
          order_number: generatedOrderNumber,
          notes,
        })
        .select()
        .single()

      if (!orderError && dbOrder) {
        newOrder.id = dbOrder.id

        const dbItems = formattedItems.map((item) => ({
          order_id: dbOrder.id,
          menu_item_id: item.menu_item_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          special_instructions: item.special_instructions,
        }))

        await supabase.from("OrderItem").insert(dbItems)
        await supabase.from("Payment").insert({
          order_id: dbOrder.id,
          restaurant_id,
          amount: total_amount,
          status: payment_status,
          payment_method,
        })
      }
    } catch (dbErr: any) {
      console.warn("Supabase database insert note (cache fallback active):", dbErr?.message || dbErr)
    }

    // 2. Broadcast on Supabase real-time
    try {
      await supabase.channel("orders_changes").send({
        type: "broadcast",
        event: "new_order",
        payload: { order: newOrder },
      })
    } catch {}

    // 3. Prepend to latest orders store & persist to disk
    cachedOrders = loadSavedOrders()
    cachedOrders.unshift(newOrder)
    saveOrdersToDisk(cachedOrders)
    if (newOrder.table_id) {
      markTableOccupied(newOrder.table_id)
    }

    return NextResponse.json({
      success: true,
      order: newOrder,
    })
  } catch (error: any) {
    console.error("Error creating order:", error?.message || error)
    return NextResponse.json(
      { error: "Failed to create order", details: error?.message },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const restaurant_id = searchParams.get("restaurant_id")
    const outlet_id = searchParams.get("outlet_id")
    const status = searchParams.get("status")

    // 1. Try fetching from Supabase
    try {
      let query = supabase
        .from("Order")
        .select(`
          *,
          OrderItem(*),
          Payment(*)
        `)
        .order("created_at", { ascending: false })

      if (restaurant_id) query = query.eq("restaurant_id", restaurant_id)
      if (outlet_id) query = query.eq("outlet_id", outlet_id)
      if (status) query = query.eq("status", status)

      const { data: dbOrders, error } = await query

      if (!error && dbOrders && dbOrders.length > 0) {
        return NextResponse.json({
          success: true,
          orders: dbOrders,
        })
      }
    } catch (dbErr) {
      console.warn("Supabase fetch fallback to cached orders:", dbErr)
    }

    // 2. Return latest orders from shared store (hydrating any legacy 0-priced item rates from catalog)
    const liveCatalog = readStore<any[]>("menu.json", MASTER_MENU_CATALOG)
    cachedOrders = loadSavedOrders()
    let result = cachedOrders.map((o) => {
      if (!Array.isArray(o?.order_items)) return o
      return {
        ...o,
        order_items: o.order_items.map((it: any) => ({
          ...it,
          unit_price: resolveCatalogItemPrice(it, liveCatalog),
        })),
      }
    })
    if (restaurant_id) result = result.filter((o) => o.restaurant_id === restaurant_id)
    if (outlet_id) result = result.filter((o) => o.outlet_id === outlet_id)
    if (status) result = result.filter((o) => o.status === status)

    return NextResponse.json({
      success: true,
      orders: result,
    })
  } catch (error: any) {
    console.error("Error fetching orders:", error?.message || error)
    return NextResponse.json({
      success: true,
      orders: cachedOrders,
    })
  }
}

// PATCH endpoint to advance KDS stage & order status independently for kitchen and bar
export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const {
      order_id,
      id,
      kds_stage,
      stage,
      status,
      station,
      kitchen_stage,
      bar_stage,
      item_id,
      item_status,
      payment_status,
      notes,
    } = body
    const targetId = order_id || id
    const targetStage = kds_stage || stage

    if (!targetId) {
      return NextResponse.json({ error: "order_id is required" }, { status: 400 })
    }

    cachedOrders = loadSavedOrders()
    const order = cachedOrders.find((o) => o.id === targetId || o.order_number === targetId)
    if (order) {
      if (payment_status) {
        order.payment_status = payment_status
      }
      if (notes !== undefined) {
        order.notes = notes
      }
      // 1. Station-specific stage updates (Kitchen vs Bar are completely separate)
      if (station === "kitchen") {
        order.kitchen_stage = targetStage || kitchen_stage
        if (order.order_items) {
          order.order_items.forEach((it: any) => {
            const isBar = isBarItem(it.MenuItem?.name || it.name || "")
            if (!isBar) {
              it.status = targetStage || kitchen_stage
            }
          })
        }
      } else if (station === "bar") {
        order.bar_stage = targetStage || bar_stage
        if (order.order_items) {
          order.order_items.forEach((it: any) => {
            const isBar = isBarItem(it.MenuItem?.name || it.name || "")
            if (isBar) {
              it.status = targetStage || bar_stage
            }
          })
        }
      } else {
        if (kitchen_stage) order.kitchen_stage = kitchen_stage
        if (bar_stage) order.bar_stage = bar_stage
        if (targetStage) {
          order.kds_stage = targetStage
          if (!order.kitchen_stage) order.kitchen_stage = targetStage
          if (!order.bar_stage) order.bar_stage = targetStage
        }
      }

      // 2. Individual item status update
      if (item_id && order.order_items) {
        const targetItem = order.order_items.find((it: any) => it.id === item_id)
        if (targetItem) {
          targetItem.status = item_status || targetStage || "ready"
        }
      }

      // 3. Compute overall order status based on stations
      const kStage = order.kitchen_stage || "new"
      const bStage = order.bar_stage || "new"
      const hasKitchen = order.order_items?.some((it: any) => !isBarItem(it.MenuItem?.name || it.name || ""))
      const hasBar = order.order_items?.some((it: any) => isBarItem(it.MenuItem?.name || it.name || ""))

      const kDone = !hasKitchen || kStage === "completed"
      const bDone = !hasBar || bStage === "completed"

      if (kDone && bDone) {
        order.status = "CLOSED"
      } else if ((hasKitchen && kStage === "ready") || (hasBar && bStage === "ready")) {
        order.status = "READY"
      } else if ((hasKitchen && kStage === "preparing") || (hasBar && bStage === "preparing")) {
        order.status = "PREPARING"
      } else if (status) {
        order.status = status
      }

      order.updated_at = new Date().toISOString()
      saveOrdersToDisk(cachedOrders)
    }

    // Update in Supabase if table exists
    try {
      const updateData: any = { updated_at: new Date().toISOString() }
      if (order?.status) updateData.status = order.status
      if (order?.payment_status) updateData.payment_status = order.payment_status
      await supabase.from("Order").update(updateData).eq("id", targetId)
    } catch {}

    // Broadcast update to all connected screens
    try {
      await supabase.channel("orders_changes").send({
        type: "broadcast",
        event: "order_updated",
        payload: {
          order_id: targetId,
          station,
          stage: targetStage,
          kitchen_stage: order?.kitchen_stage,
          bar_stage: order?.bar_stage,
          item_id,
          item_status,
          status: order?.status,
          payment_status: order?.payment_status,
        },
      })
    } catch {}

    return NextResponse.json({
      success: true,
      order,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to update order", details: err?.message },
      { status: 500 }
    )
  }
}
