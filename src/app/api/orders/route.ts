import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { 
      restaurant_id, 
      outlet_id, 
      user_id, 
      order_type, 
      table_id, 
      items, 
      total_amount, 
      tax_amount, 
      discount_amount, 
      payment_status = "UNPAID",
      payment_method = "MANUAL",
      source = "pos",
      order_number 
    } = body

    // Validate required fields
    if (!restaurant_id || !items || !total_amount) {
      return NextResponse.json(
        { error: "Missing required fields: restaurant_id, items, total_amount" },
        { status: 400 }
      )
    }

    // Generate order number if not provided
    const generatedOrderNumber = order_number || `ORD-${Date.now()}`;

    // Insert the order into the orders table
    const { data: order, error: orderError } = await supabase
      .from("Order")
      .insert({
        restaurant_id,
        outlet_id,
        user_id,
        status: "OPEN",
        order_type: order_type || "DINE_IN",
        table_id,
        total_amount,
        tax_amount: tax_amount || 0,
        discount_amount: discount_amount || 0,
        payment_status,
        payment_method,
        source,
        order_number: generatedOrderNumber,
        notes: body.notes,
      })
      .select()
      .single()

    if (orderError) {
      throw orderError
    }

    // Insert order items
    const orderItems = items.map((item: any) => ({
      order_id: order.id,
      menu_item_id: item.menuItemId,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      special_instructions: item.specialInstructions,
    }))

    const { error: itemsError } = await supabase
      .from("OrderItem")
      .insert(orderItems)

    if (itemsError) {
      throw itemsError
    }

    // Insert payment record
    const { error: paymentError } = await supabase
      .from("Payment")
      .insert({
        order_id: order.id,
        restaurant_id,
        amount: total_amount,
        status: payment_status,
        payment_method,
      })

    if (paymentError) {
      throw paymentError
    }

    // Trigger real-time notification for new order
    // This will push the new order to all connected clients via Supabase real-time
    await supabase.channel("orders_changes").send({
      type: "broadcast",
      event: "new_order",
      payload: { order },
    })

    return NextResponse.json({
      success: true,
      order,
    })
  } catch (error: any) {
    console.error("Error creating order:", error?.message || error)
    return NextResponse.json(
      { error: "Failed to create order" },
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

    let query = supabase
      .from("Order")
      .select(`
        *,
        OrderItem(*),
        Payment(*)
      `)
      .order("createdAt", { ascending: false })

    if (restaurant_id) {
      query = query.eq("restaurant_id", restaurant_id)
    }
    if (outlet_id) {
      query = query.eq("outlet_id", outlet_id)
    }
    if (status) {
      query = query.eq("status", status)
    }

    const { data: orders, error } = await query

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      orders,
    })
  } catch (error: any) {
    console.error("Error fetching orders:", error?.message || error)
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    )
  }
}