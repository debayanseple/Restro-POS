import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

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

// In-memory runtime cache for orders so POS and KDS always work seamlessly
// even before remote database tables or migrations are applied
let cachedOrders: any[] = [
  {
    id: "ord_demo_1046",
    restaurant_id: "demo-restaurant-1",
    outlet_id: "outlet-1",
    user_id: "user-1",
    status: "OPEN",
    kds_stage: "new",
    kitchen_stage: "new",
    bar_stage: "new",
    order_type: "dine-in",
    table_id: "Table 04",
    total_amount: 41.00,
    tax_amount: 3.28,
    discount_amount: 0,
    payment_status: "UNPAID",
    payment_method: "MANUAL",
    source: "pos",
    order_number: "ORD-1046",
    notes: "Medium rare burgers",
    created_at: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
    order_items: [
      { id: "it-1", order_id: "ord_demo_1046", menu_item_id: "m1", quantity: 2, unit_price: 16.50, name: "Classic Wagyu Burger", station: "kitchen", status: "new", MenuItem: { name: "Classic Wagyu Burger" } },
      { id: "it-2", order_id: "ord_demo_1046", menu_item_id: "m4", quantity: 1, unit_price: 8.00, name: "Crispy Truffle Fries", station: "kitchen", status: "new", MenuItem: { name: "Crispy Truffle Fries" } },
    ],
    Payment: null,
  },
  {
    id: "ord_demo_1045",
    restaurant_id: "demo-restaurant-1",
    outlet_id: "outlet-1",
    user_id: "user-1",
    status: "PREPARING",
    kds_stage: "preparing",
    kitchen_stage: "preparing",
    bar_stage: "completed",
    order_type: "takeaway",
    table_id: "Counter",
    total_amount: 32.50,
    tax_amount: 2.60,
    discount_amount: 0,
    payment_status: "PAID",
    payment_method: "CARD",
    source: "pos",
    order_number: "ORD-1045",
    notes: null,
    created_at: new Date(Date.now() - 1000 * 60 * 11).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 11).toISOString(),
    order_items: [
      { id: "it-3", order_id: "ord_demo_1045", menu_item_id: "m2", quantity: 1, unit_price: 18.00, name: "Truffle Mushroom Pasta", station: "kitchen", status: "preparing", MenuItem: { name: "Truffle Mushroom Pasta" } },
      { id: "it-4", order_id: "ord_demo_1045", menu_item_id: "m3", quantity: 1, unit_price: 14.50, name: "Margherita Artisan Pizza", station: "kitchen", status: "preparing", MenuItem: { name: "Margherita Artisan Pizza" } },
    ],
    Payment: null,
  },
  {
    id: "ord_demo_1044",
    restaurant_id: "demo-restaurant-1",
    outlet_id: "outlet-1",
    user_id: "user-1",
    status: "READY",
    kds_stage: "ready",
    kitchen_stage: "preparing",
    bar_stage: "ready",
    order_type: "delivery",
    table_id: "Online",
    total_amount: 26.50,
    tax_amount: 2.12,
    discount_amount: 0,
    payment_status: "PAID",
    payment_method: "ONLINE",
    source: "pos",
    order_number: "ORD-1044",
    notes: null,
    created_at: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    order_items: [
      { id: "it-5", order_id: "ord_demo_1044", menu_item_id: "m6", quantity: 1, unit_price: 11.00, name: "Grilled Chicken Wings", station: "kitchen", status: "preparing", MenuItem: { name: "Grilled Chicken Wings" } },
      { id: "it-6", order_id: "ord_demo_1044", menu_item_id: "m7", quantity: 2, unit_price: 7.50, name: "Craft IPA Beer", station: "bar", status: "ready", MenuItem: { name: "Craft IPA Beer" } },
    ],
    Payment: null,
  },
]

export async function POST(request: Request) {
  try {
    const body = await request.json()

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
    const notes = body.notes || null

    // Validate that items exist
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Cart is empty. Please add items to place an order." },
        { status: 400 }
      )
    }

    // Fallback: calculate total if not provided
    if (total_amount <= 0) {
      total_amount = items.reduce((sum: number, it: any) => {
        const p = Number(it.unitPrice ?? it.price ?? 0)
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
      const unitPrice = Number(item.unitPrice ?? item.price ?? 0)
      const quantity = Number(item.quantity ?? 1)
      const station = isBarItem(itemName) ? "bar" : "kitchen"
      return {
        id: `it_${Date.now()}_${idx}`,
        order_id: orderId,
        menu_item_id: item.menuItemId || item.id || `m_${idx}`,
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

        const dbItems = items.map((item: any) => ({
          order_id: dbOrder.id,
          menu_item_id: item.menuItemId || item.id,
          quantity: item.quantity,
          unit_price: item.unitPrice || item.price,
          special_instructions: item.specialInstructions,
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

    // 3. Prepend to in-memory orders cache
    cachedOrders.unshift(newOrder)

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

    // 2. Return cached orders
    let result = [...cachedOrders]
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
    } = body
    const targetId = order_id || id
    const targetStage = kds_stage || stage

    if (!targetId) {
      return NextResponse.json({ error: "order_id is required" }, { status: 400 })
    }

    const order = cachedOrders.find((o) => o.id === targetId || o.order_number === targetId)
    if (order) {
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
    }

    // Update in Supabase if table exists
    try {
      const updateData: any = { updated_at: new Date().toISOString() }
      if (order?.status) updateData.status = order.status
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
