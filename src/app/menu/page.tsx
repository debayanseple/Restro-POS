"use client"

import React, { useState, useEffect, useMemo, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import {
  Utensils,
  Search,
  ShoppingBag,
  Plus,
  Minus,
  ChefHat,
  BellRing,
  Receipt,
  ArrowRight,
  X,
  AlertCircle,
  Bell,
  Sparkles,
  CheckCircle2,
} from "lucide-react"
import { MASTER_MENU_CATALOG, MenuItem } from "@/lib/menu-catalog"

interface CartItem extends MenuItem {
  quantity: number
  notes?: string
}

function CustomerMenuContent() {
  const searchParams = useSearchParams()
  const rawTableParam = searchParams.get("table") || searchParams.get("table_id") || ""
  const isDemoUrl =
    searchParams.get("demo") === "true" ||
    searchParams.get("demo") === "1" ||
    searchParams.get("mode") === "demo" ||
    rawTableParam.toLowerCase().includes("demo")

  // Format table identifier (e.g. "1" -> "Table 01", "Table 02" -> "Table 02")
  const normalizedTable = useMemo(() => {
    if (!rawTableParam) return isDemoUrl ? "Demo Table 01" : ""
    const trimmed = rawTableParam.trim()
    if (/^\d+$/.test(trimmed)) {
      const num = parseInt(trimmed, 10)
      return `Table ${num < 10 ? "0" + num : num}`
    }
    return trimmed
  }, [rawTableParam, isDemoUrl])

  const [selectedTable, setSelectedTable] = useState<string>(
    normalizedTable || (isDemoUrl ? "Demo Table 01" : "Table 01")
  )
  const [showTablePicker, setShowTablePicker] = useState<boolean>(!normalizedTable && !isDemoUrl)
  const isDemoMode = useMemo(() => {
    return isDemoUrl || selectedTable.toLowerCase().includes("demo")
  }, [isDemoUrl, selectedTable])
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [dietaryFilter, setDietaryFilter] = useState<"all" | "veg" | "non-veg">("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [cart, setCart] = useState<CartItem[]>([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [orderNotes, setOrderNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeOrder, setActiveOrder] = useState<any | null>(null)
  const [waiterCalled, setWaiterCalled] = useState(false)
  const [billRequested, setBillRequested] = useState(false)
  const [cleaningRequested, setCleaningRequested] = useState(false)
  const [isServiceBellOpen, setIsServiceBellOpen] = useState(false)
  const [serviceActionStatus, setServiceActionStatus] = useState<string | null>(null)

  const handleServiceRequest = (type: "clean" | "waiter" | "bill") => {
    let msg = ""
    if (type === "clean") {
      setCleaningRequested(true)
      msg = isDemoMode
        ? `[Demo Sandbox] Cleaning requested for ${selectedTable}. (Simulated)`
        : `Cleaning request sent for ${selectedTable}. A team member is on the way!`
      setTimeout(() => setCleaningRequested(false), 5000)
    } else if (type === "waiter") {
      setWaiterCalled(true)
      msg = isDemoMode
        ? `[Demo Sandbox] Waiter called for ${selectedTable}. (Simulated)`
        : `Waiter called for ${selectedTable}. Someone will be with you shortly!`
      setTimeout(() => setWaiterCalled(false), 5000)
    } else if (type === "bill") {
      setBillRequested(true)
      msg = isDemoMode
        ? `[Demo Sandbox] Bill requested for ${selectedTable}. (Simulated)`
        : `Bill requested for ${selectedTable}. Your invoice is being brought to your table!`
      setTimeout(() => setBillRequested(false), 5000)
    }

    setServiceActionStatus(msg)
    setIsServiceBellOpen(false)

    // In isolated demo mode, do not spam live kitchen or front desk
    if (isDemoMode) {
      setTimeout(() => {
        setServiceActionStatus(null)
      }, 4500)
      return
    }

    // 1. Send to backend service-requests API so Front Desk & Admin receive it in queue
    fetch("/api/service-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        table: selectedTable,
        type: type,
      }),
    }).catch((err) => console.warn("Failed to log service request:", err))

    // 2. Broadcast to POS & Staff terminals if supported
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        const bc = new BroadcastChannel("restro_sync_channel")
        bc.postMessage({
          type: "table_service_request",
          table: selectedTable,
          serviceType: type,
          timestamp: new Date().toISOString(),
        })
        bc.close()
      } catch {}
    }

    // Auto-clear notification toast after 4.5 seconds
    setTimeout(() => {
      setServiceActionStatus(null)
    }, 4500)
  }

  // Live dynamic menu items loaded from /api/menu and synchronized in realtime
  const [menuItems, setMenuItems] = useState<MenuItem[]>(MASTER_MENU_CATALOG)

  useEffect(() => {
    let isMounted = true

    const fetchMenu = async () => {
      try {
        const res = await fetch("/api/menu")
        if (res.ok) {
          const data = await res.json()
          if (isMounted && Array.isArray(data.items)) {
            setMenuItems(data.items)
          }
        }
      } catch {}
    }

    fetchMenu()
    const pollInterval = setInterval(fetchMenu, 4000)

    let bc: BroadcastChannel | null = null
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      bc = new BroadcastChannel("restro_sync_channel")
      bc.onmessage = (event) => {
        if (event.data?.type === "menu_updated" && Array.isArray(event.data.items)) {
          setMenuItems(event.data.items)
        }
      }
    }

    return () => {
      isMounted = false
      clearInterval(pollInterval)
      if (bc) bc.close()
    }
  }, [])

  // Load existing active order from localStorage on table change
  useEffect(() => {
    if (typeof window !== "undefined" && selectedTable) {
      try {
        const saved = localStorage.getItem(`restro_qr_order_${selectedTable}`)
        if (saved) {
          const parsed = JSON.parse(saved)
          if (parsed && parsed.status !== "CLOSED") {
            setActiveOrder(parsed)
          }
        }
      } catch {}
    }
  }, [selectedTable])

  // Sync active order with server polling every 4 seconds (skip for demo sandbox orders)
  useEffect(() => {
    if (!activeOrder?.id || activeOrder?.isDemo) return

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch("/api/orders")
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data.orders)) {
            const found = data.orders.find((o: any) => o.id === activeOrder.id || o.order_number === activeOrder.order_number)
            if (found) {
              setActiveOrder(found)
              localStorage.setItem(`restro_qr_order_${selectedTable}`, JSON.stringify(found))
            }
          }
        }
      } catch {}
    }, 4000)

    return () => clearInterval(pollInterval)
  }, [activeOrder?.id, activeOrder?.order_number, selectedTable])

  // Cart operations
  const addToCart = (item: MenuItem) => {
    if (item.isAvailable === false) {
      alert(`Sorry, ${item.name} is currently Out of Stock and cannot be ordered.`)
      return
    }

    setCart((prev) => {
      const exists = prev.find((i) => i.id === item.id)
      if (exists) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      }
      return [...prev, { ...item, quantity: 1 }]
    })
  }

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => (i.id === id ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0)
    )
  }

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const gst = subtotal * 0.05
  const grandTotal = subtotal + gst

  // Filter and sort menu catalog: In-stock items first, Out-of-stock items at the end
  const filteredItems = useMemo(() => {
    const list = menuItems.filter((item) => {
      const matchesCategory = selectedCategory === "all" || item.category === selectedCategory
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
      const matchesDiet =
        dietaryFilter === "all" ||
        (dietaryFilter === "veg" && item.isVeg) ||
        (dietaryFilter === "non-veg" && !item.isVeg)

      return matchesCategory && matchesSearch && matchesDiet
    })

    return [...list].sort((a, b) => {
      const aOut = a.isAvailable === false ? 1 : 0
      const bOut = b.isAvailable === false ? 1 : 0
      return aOut - bOut
    })
  }, [menuItems, selectedCategory, searchQuery, dietaryFilter])

  // Check if any cart item is currently out of stock
  const cartOutOfStockItems = useMemo(() => {
    return cart.filter((c) => {
      const latest = menuItems.find((m) => m.id === c.id)
      return latest && latest.isAvailable === false
    })
  }, [cart, menuItems])

  // Handle Order Placement
  const handlePlaceOrder = async () => {
    if (cart.length === 0 || !selectedTable || isSubmitting) return

    if (cartOutOfStockItems.length > 0) {
      alert(`The following item(s) are currently Out of Stock and cannot be ordered:\n${cartOutOfStockItems.map((i) => `• ${i.name}`).join("\n")}\n\nPlease remove them from your order to proceed.`)
      return
    }

    // In isolated demo mode, simulate the order purely in local sandbox state
    if (isDemoMode) {
      setIsSubmitting(true)
      setTimeout(() => {
        const demoOrderNum = `DEMO-${Math.floor(1000 + Math.random() * 9000)}`
        const demoOrderData = {
          id: `demo_${Date.now()}`,
          order_number: demoOrderNum,
          restaurant_id: "demo-sandbox",
          outlet_id: "demo-sandbox-outlet",
          user_id: "demo_guest",
          order_type: "dine-in",
          table_id: selectedTable || "Demo Table 01",
          source: "DEMO_QR_MENU",
          total_amount: grandTotal,
          tax_amount: gst,
          discount_amount: 0,
          payment_status: "PENDING",
          payment_method: "CASH",
          kds_stage: "new",
          kitchen_stage: "new",
          bar_stage: "new",
          status: "OPEN",
          isDemo: true,
          created_at: new Date().toISOString(),
          items: cart.map((item) => ({
            menu_item_id: item.id,
            name: item.name,
            quantity: item.quantity,
            unit_price: item.price,
            station: item.category === "drinks" ? "bar" : "kitchen",
            status: "new",
          })),
        }

        setActiveOrder(demoOrderData)
        localStorage.setItem(`restro_qr_order_${selectedTable}`, JSON.stringify(demoOrderData))
        setCart([])
        setIsCartOpen(false)
        setOrderNotes("")
        setIsSubmitting(false)

        // Simulate realistic kitchen progression in demo mode for interactive preview
        setTimeout(() => {
          setActiveOrder((prev: any) =>
            prev && prev.isDemo ? { ...prev, kitchen_stage: "preparing" } : prev
          )
        }, 8000)
        setTimeout(() => {
          setActiveOrder((prev: any) =>
            prev && prev.isDemo ? { ...prev, kitchen_stage: "ready" } : prev
          )
        }, 22000)
      }, 500)
      return
    }

    setIsSubmitting(true)
    try {
      const generatedOrderNum = `ORD-${Math.floor(1000 + Math.random() * 9000)}`
      const payload = {
        restaurant_id: "demo-restaurant-1",
        outlet_id: "demo-outlet-1",
        user_id: "customer_qr",
        order_number: generatedOrderNum,
        order_type: "dine-in",
        table_id: selectedTable,
        source: "QR_MENU",
        total_amount: grandTotal,
        tax_amount: gst,
        discount_amount: 0,
        payment_status: "PENDING",
        payment_method: "CASH",
        notes: [
          orderNotes ? `Notes: ${orderNotes}` : "",
          customerName ? `Guest: ${customerName}` : "",
          customerPhone ? `Phone: ${customerPhone}` : "",
        ]
          .filter(Boolean)
          .join(" | ") || null,
        items: cart.map((item) => ({
          menu_item_id: item.id,
          name: item.name,
          quantity: item.quantity,
          unit_price: item.price,
          station: item.category === "drinks" ? "bar" : "kitchen",
          status: "new",
        })),
      }

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        const orderData = {
          ...payload,
          id: `ord_${Date.now()}`,
          kds_stage: "new",
          kitchen_stage: "new",
          bar_stage: "new",
          status: "OPEN",
          created_at: new Date().toISOString(),
        }

        setActiveOrder(orderData)
        localStorage.setItem(`restro_qr_order_${selectedTable}`, JSON.stringify(orderData))
        setCart([])
        setIsCartOpen(false)
        setOrderNotes("")
      } else {
        alert("Failed to send order to the kitchen. Please ask staff for assistance.")
      }
    } catch (err) {
      console.error("Order submission error:", err)
      alert("Network error. Please try again or inform your waiter.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F7F5F0] text-[#20252B] pb-28 font-sans selection:bg-[#C46B4E]/20 selection:text-[#C46B4E]">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E5E1D9] px-4 py-3 shadow-xs transition-shadow duration-200">
        <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#E9E3D8] text-[#C46B4E] flex items-center justify-center border border-[#E5E1D9]">
              <Utensils className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-bold text-sm tracking-tight text-[#20252B]">
                  {isDemoMode ? "Demo Restaurant" : "Downtown Main Outlet"}
                </h1>
                {isDemoMode && (
                  <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-200">
                    Demo Sandbox
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#64748B]">
                {isDemoMode ? "Interactive Customer Self-Ordering Showcase" : "Digital Menu & Table Ordering"}
              </p>
            </div>
          </div>

          {/* Table Badge & Switcher */}
          <button
            onClick={() => setShowTablePicker(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#E9E3D8] text-[#20252B] border border-[#E5E1D9] text-xs font-semibold hover:bg-[#DDD5C7] transition cursor-pointer"
          >
            <span className={`w-2 h-2 rounded-full ${isDemoMode ? "bg-amber-500 animate-pulse" : "bg-emerald-600"}`} />
            <span>{selectedTable || "Choose Table"}</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-xl mx-auto px-4 pt-4 space-y-4">
        {/* Isolated Demo Sandbox Banner */}
        {isDemoMode && (
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
              <p className="text-[11px] font-medium leading-relaxed">
                <strong>Interactive Demo Sandbox:</strong> Orders & assistance requests are simulated for evaluation. They will <strong>NOT</strong> dispatch to Nodedr Bistro or any live kitchen.
              </p>
            </div>
            <span className="px-2 py-0.5 rounded-md bg-amber-200/80 text-amber-900 text-[10px] font-bold shrink-0">
              Safe to Test
            </span>
          </div>
        )}
        {/* Active Order Banner (If customer has an ongoing order) */}
        {activeOrder && (
          <div className="p-4 rounded-xl bg-white border border-[#E5E1D9] shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#20252B] flex items-center gap-1.5">
                <ChefHat className="w-4 h-4 text-[#C46B4E]" />
                Active Order {activeOrder.order_number}
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase tracking-wider">
                {activeOrder.kitchen_stage === "ready"
                  ? "Food Ready"
                  : activeOrder.kitchen_stage === "preparing"
                  ? "Cooking in Kitchen"
                  : activeOrder.kitchen_stage === "completed"
                  ? "Served at Table"
                  : "Order Sent to Kitchen"}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="grid grid-cols-4 gap-1.5 text-center text-[10px] pt-1">
              <div className="space-y-1">
                <div className="h-1.5 rounded-full bg-emerald-600" />
                <span className="text-emerald-800 font-semibold">Received</span>
              </div>
              <div className="space-y-1">
                <div
                  className={`h-1.5 rounded-full ${
                    ["preparing", "ready", "completed"].includes(activeOrder.kitchen_stage)
                      ? "bg-emerald-600"
                      : "bg-[#E5E1D9]"
                  }`}
                />
                <span className={["preparing", "ready", "completed"].includes(activeOrder.kitchen_stage) ? "text-emerald-800 font-semibold" : "text-[#64748B]"}>
                  Cooking
                </span>
              </div>
              <div className="space-y-1">
                <div
                  className={`h-1.5 rounded-full ${
                    ["ready", "completed"].includes(activeOrder.kitchen_stage)
                      ? "bg-emerald-600"
                      : "bg-[#E5E1D9]"
                  }`}
                />
                <span className={["ready", "completed"].includes(activeOrder.kitchen_stage) ? "text-emerald-800 font-semibold" : "text-[#64748B]"}>
                  Ready
                </span>
              </div>
              <div className="space-y-1">
                <div
                  className={`h-1.5 rounded-full ${
                    activeOrder.kitchen_stage === "completed" ? "bg-emerald-600" : "bg-[#E5E1D9]"
                  }`}
                />
                <span className={activeOrder.kitchen_stage === "completed" ? "text-emerald-800 font-semibold" : "text-[#64748B]"}>
                  Served
                </span>
              </div>
            </div>

            {/* Waiter Assistance Buttons */}
            <div className="pt-2 border-t border-[#E5E1D9] flex items-center justify-between gap-2">
              <button
                onClick={() => {
                  setWaiterCalled(true)
                  setTimeout(() => setWaiterCalled(false), 4000)
                }}
                disabled={waiterCalled}
                className="flex-1 py-1.5 rounded-lg bg-[#F7F5F0] hover:bg-[#E9E3D8] text-[#20252B] text-[11px] font-semibold border border-[#E5E1D9] transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <BellRing className="w-3.5 h-3.5 text-amber-700" />
                <span>{waiterCalled ? "Staff Notified!" : "Call Waiter"}</span>
              </button>
              <button
                onClick={() => {
                  setBillRequested(true)
                  setTimeout(() => setBillRequested(false), 4000)
                }}
                disabled={billRequested}
                className="flex-1 py-1.5 rounded-lg bg-[#F7F5F0] hover:bg-[#E9E3D8] text-[#20252B] text-[11px] font-semibold border border-[#E5E1D9] transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Receipt className="w-3.5 h-3.5 text-emerald-700" />
                <span>{billRequested ? "Bill Requested!" : "Request Bill"}</span>
              </button>
            </div>
          </div>
        )}

        {/* Search & Dietary Filters */}
        <div className="space-y-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search food, drinks, desserts..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-[#E5E1D9] text-xs text-[#20252B] placeholder-[#64748B] focus:outline-none focus:border-[#C46B4E] transition shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#20252B]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Dietary Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDietaryFilter("all")}
              className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                dietaryFilter === "all"
                  ? "bg-[#C46B4E] text-white shadow-2xs"
                  : "bg-white text-[#64748B] hover:text-[#20252B] border border-[#E5E1D9]"
              }`}
            >
              All Items
            </button>
            <button
              onClick={() => setDietaryFilter("veg")}
              className={`px-3 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                dietaryFilter === "veg"
                  ? "bg-emerald-700 text-white shadow-2xs"
                  : "bg-white text-emerald-800 hover:text-emerald-950 border border-emerald-200"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              Veg Only
            </button>
            <button
              onClick={() => setDietaryFilter("non-veg")}
              className={`px-3 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                dietaryFilter === "non-veg"
                  ? "bg-amber-700 text-white shadow-2xs"
                  : "bg-white text-amber-800 hover:text-amber-950 border border-amber-200"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-600" />
              Non-Veg
            </button>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: "all", label: "All Menu" },
              { id: "mains", label: "Mains & Pizza" },
              { id: "sides", label: "Sides & Fries" },
              { id: "drinks", label: "Drinks & Bar" },
              { id: "desserts", label: "Desserts" },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  selectedCategory === cat.id
                    ? "bg-[#C46B4E] text-white shadow-2xs"
                    : "bg-white text-[#64748B] hover:text-[#20252B] border border-[#E5E1D9]"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Menu Items List */}
        <div className="space-y-3 pt-1">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-[#64748B] text-xs">
              No menu items match your search. Try adjusting filters.
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const inCart = cart.find((i) => i.id === item.id)
              const isOutOfStock = item.isAvailable === false
              const isFirstOutOfStock =
                isOutOfStock && (index === 0 || filteredItems[index - 1]?.isAvailable !== false)

              return (
                <React.Fragment key={item.id}>
                  {isFirstOutOfStock && index > 0 && (
                    <div className="pt-4 pb-1.5 flex items-center gap-3">
                      <div className="h-px bg-[#E5E1D9] flex-1" />
                      <span className="text-[11px] font-semibold tracking-wider text-[#64748B] uppercase flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        Out of Stock ({filteredItems.filter((i) => i.isAvailable === false).length})
                      </span>
                      <div className="h-px bg-[#E5E1D9] flex-1" />
                    </div>
                  )}
                  <div
                    className={`p-3.5 rounded-xl bg-white border border-[#E5E1D9] flex gap-3.5 transition shadow-2xs ${
                      isOutOfStock ? "opacity-75 bg-[#FAF9F6]" : "hover:border-[#C46B4E]"
                    }`}
                  >
                  {/* Dish Icon / Visual */}
                  <div className={`w-16 h-16 rounded-xl bg-[#F7F5F0] border border-[#E5E1D9] flex items-center justify-center text-3xl shrink-0 ${isOutOfStock ? "grayscale-50" : ""}`}>
                    {item.icon}
                  </div>

                  {/* Dish Details */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Veg / Non-Veg Indicator */}
                        <span
                          className={`w-3.5 h-3.5 rounded-xs border flex items-center justify-center shrink-0 ${
                            item.isVeg
                              ? "border-emerald-600 bg-emerald-50"
                              : "border-amber-700 bg-amber-50"
                          }`}
                          title={item.isVeg ? "Vegetarian" : "Non-Vegetarian"}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              item.isVeg ? "bg-emerald-600" : "bg-amber-700"
                            }`}
                          />
                        </span>

                        <h3 className={`font-bold text-sm truncate ${isOutOfStock ? "text-[#64748B] line-through decoration-[#64748B]/50" : "text-[#20252B]"}`}>
                          {item.name}
                        </h3>

                        {/* Out of Stock vs Custom Tag Badge */}
                        {isOutOfStock ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-red-100 text-red-700 border border-red-200 shrink-0">
                            Out of Stock
                          </span>
                        ) : item.tag ? (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-[#E9E3D8] text-[#20252B] border border-[#E5E1D9] shrink-0">
                            {item.tag}
                          </span>
                        ) : null}
                      </div>

                      {item.description && (
                        <p className="text-[11px] text-[#64748B] line-clamp-2 mt-1 leading-snug">
                          {item.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 mt-1 border-t border-[#E5E1D9]">
                      <span className={`font-bold text-sm ${isOutOfStock ? "text-[#64748B]" : "text-[#C46B4E]"}`}>
                        ₹{item.price.toFixed(2)}
                      </span>

                      {/* Add Button or Out of Stock indicator */}
                      {isOutOfStock ? (
                        <div className="px-3 py-1.5 rounded-lg bg-[#E5E1D9] text-[#64748B] text-xs font-semibold select-none cursor-not-allowed">
                          Unavailable
                        </div>
                      ) : inCart ? (
                        <div className="flex items-center gap-2 bg-[#F7F5F0] border border-[#E5E1D9] rounded-lg px-1.5 py-1">
                          <button
                            onClick={() => updateQuantity(item.id, -1)}
                            className="w-5 h-5 rounded-md bg-white hover:bg-[#E9E3D8] text-[#20252B] border border-[#E5E1D9] flex items-center justify-center cursor-pointer transition"
                          >
                            <Minus className="w-2.5 h-2.5" />
                          </button>
                          <span className="text-xs font-bold text-[#20252B] w-4 text-center">
                            {inCart.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, 1)}
                            className="w-5 h-5 rounded-md bg-[#C46B4E] hover:bg-[#B25C40] text-white flex items-center justify-center cursor-pointer transition"
                          >
                            <Plus className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(item)}
                          className="px-3 py-1.5 rounded-lg bg-[#C46B4E] hover:bg-[#B25C40] text-white text-xs font-semibold transition flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </React.Fragment>
            )
          })
          )}
        </div>
      </main>

      {/* Floating Bottom Bar (Visible when cart has items) */}
      {cartCount > 0 && (
        <div className="fixed bottom-4 inset-x-4 max-w-xl mx-auto z-40">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full p-3.5 rounded-xl bg-[#C46B4E] hover:bg-[#B25C40] text-white shadow-lg flex items-center justify-between transition cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-black/20 flex items-center justify-center font-bold text-xs">
                {cartCount}
              </div>
              <div className="text-left">
                <div className="text-xs font-bold flex items-center gap-1.5">
                  <span>View Order ({selectedTable})</span>
                </div>
                <div className="text-[11px] text-white/90 font-medium">
                  ₹{grandTotal.toFixed(2)} (incl. GST)
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-bold bg-white/20 px-3 py-1.5 rounded-lg">
              <span>Checkout</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </button>
        </div>
      )}

      {/* Toast Banner for Service Request Feedback */}
      {serviceActionStatus && (
        <div className="fixed top-4 inset-x-4 max-w-md mx-auto z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="p-3.5 rounded-2xl bg-[#20252B] text-white shadow-2xl border border-[#E5E1D9]/20 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#C46B4E] flex items-center justify-center shrink-0 shadow-xs">
                <BellRing className="w-4 h-4 text-white animate-bounce" />
              </div>
              <p className="text-xs font-medium leading-snug text-[#F7F5F0]">
                {serviceActionStatus}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setServiceActionStatus(null)}
              className="text-[#E9E3D8] hover:text-white p-1 rounded-lg transition cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* TABLE ASSISTANCE POPUP / BOTTOM SHEET MODAL */}
      {isServiceBellOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-200"
            onClick={() => setIsServiceBellOpen(false)}
          />

          {/* Action Sheet Card: Bottom Sheet on Mobile, Centered Modal on Tablet/Desktop */}
          <div
            className="relative z-10 w-full sm:max-w-md bg-white rounded-t-[28px] sm:rounded-2xl border-t sm:border border-[#E5E1D9] shadow-2xl p-5 pb-8 sm:p-6 space-y-4 max-h-[88vh] flex flex-col overflow-hidden"
            style={{
              paddingBottom: "max(2rem, env(safe-area-inset-bottom, 24px))",
              filter: "drop-shadow(0 20px 35px rgba(32, 37, 43, 0.25))",
            }}
          >
            {/* Mobile Drag Indicator Handle */}
            <div className="w-12 h-1.5 rounded-full bg-[#E5E1D9] mx-auto -mt-1 mb-1 sm:hidden shrink-0" />

            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E1D9] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#E9E3D8] text-[#C46B4E] flex items-center justify-center font-bold shadow-xs">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-[#20252B]">Table Assistance</h4>
                  <p className="text-xs text-[#64748B] font-medium">{selectedTable}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsServiceBellOpen(false)}
                className="w-9 h-9 rounded-full bg-[#F7F5F0] hover:bg-[#E9E3D8] text-[#64748B] hover:text-[#20252B] flex items-center justify-center transition cursor-pointer active:scale-95"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Options List (Scrollable if height is constrained) */}
            <div className="space-y-2.5 overflow-y-auto max-h-[55vh] pr-0.5 overscroll-contain">
              {/* Option 1: Clean Table */}
              <button
                type="button"
                onClick={() => handleServiceRequest("clean")}
                disabled={cleaningRequested}
                className="w-full p-3.5 rounded-2xl bg-[#F7F5F0] hover:bg-[#E9E3D8] active:bg-[#E0D9CD] border border-[#E5E1D9] transition flex items-center gap-3.5 text-left group cursor-pointer disabled:opacity-60 active:scale-[0.98]"
              >
                <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-[#20252B] flex items-center justify-between">
                    <span>Clean Table</span>
                    {cleaningRequested && (
                      <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        Requested
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#64748B] truncate mt-0.5">
                    Wipe surface & clear empty plates
                  </p>
                </div>
              </button>

              {/* Option 2: Call Waiter */}
              <button
                type="button"
                onClick={() => handleServiceRequest("waiter")}
                disabled={waiterCalled}
                className="w-full p-3.5 rounded-2xl bg-[#F7F5F0] hover:bg-[#E9E3D8] active:bg-[#E0D9CD] border border-[#E5E1D9] transition flex items-center gap-3.5 text-left group cursor-pointer disabled:opacity-60 active:scale-[0.98]"
              >
                <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                  <BellRing className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-[#20252B] flex items-center justify-between">
                    <span>Call Waiter</span>
                    {waiterCalled && (
                      <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                        Notified
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#64748B] truncate mt-0.5">
                    Need water, cutlery, or ordering help
                  </p>
                </div>
              </button>

              {/* Option 3: Ask for Bill */}
              <button
                type="button"
                onClick={() => handleServiceRequest("bill")}
                disabled={billRequested}
                className="w-full p-3.5 rounded-2xl bg-[#F7F5F0] hover:bg-[#E9E3D8] active:bg-[#E0D9CD] border border-[#E5E1D9] transition flex items-center gap-3.5 text-left group cursor-pointer disabled:opacity-60 active:scale-[0.98]"
              >
                <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                  <Receipt className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-[#20252B] flex items-center justify-between">
                    <span>Ask for Bill</span>
                    {billRequested && (
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Requested
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#64748B] truncate mt-0.5">
                    Ready to pay via UPI, Card, or Cash
                  </p>
                </div>
              </button>
            </div>

            {/* Bottom Actions & Dismiss */}
            <div className="pt-1 shrink-0 space-y-2">
              <button
                type="button"
                onClick={() => setIsServiceBellOpen(false)}
                className="w-full py-2.5 rounded-xl bg-[#F7F5F0] hover:bg-[#E9E3D8] text-xs font-semibold text-[#64748B] hover:text-[#20252B] border border-[#E5E1D9] transition cursor-pointer text-center active:scale-[0.99]"
              >
                Close Menu
              </button>
              <p className="text-[11px] text-[#64748B] text-center font-medium">
                {isDemoMode
                  ? "⚡ Sandbox Demo Mode: Staff alerts are simulated."
                  : "Staff will be notified at the service station queue"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING SERVICE BELL BUTTON */}
      <div
        className={`fixed z-40 transition-all duration-300 ${
          cartCount > 0 ? "bottom-24 right-4 sm:right-6" : "bottom-6 right-4 sm:right-6"
        }`}
      >
        <button
          type="button"
          onClick={() => setIsServiceBellOpen((prev) => !prev)}
          title="Table Service & Assistance"
          aria-label="Table Service Bell"
          className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl cursor-pointer ${
            isServiceBellOpen
              ? "bg-[#C46B4E] text-white rotate-12 scale-105 shadow-[#C46B4E]/40"
              : "bg-[#20252B] hover:bg-[#2e353e] text-white shadow-black/30 hover:scale-105 active:scale-95"
          } border-[3px] border-white`}
        >
          {isServiceBellOpen ? (
            <X className="w-7 h-7 sm:w-8 sm:h-8" />
          ) : (
            <>
              <Bell className="w-7 h-7 sm:w-8 sm:h-8 animate-pulse" />
              {/* Pulsing indicator dot */}
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C46B4E] opacity-75" />
                <span className="relative inline-flex rounded-full h-4 w-4 bg-[#C46B4E] border-2 border-white" />
              </span>
            </>
          )}
        </button>
      </div>

      {/* Cart & Checkout Slide-Over Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-center items-end sm:items-center">
          <div className="w-full max-w-xl bg-white border border-[#E5E1D9] rounded-t-2xl sm:rounded-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-xl animate-in slide-in-from-bottom-5 text-[#20252B]">
            {/* Drawer Header */}
            <div className="p-4 border-b border-[#E5E1D9] flex items-center justify-between">
              <div>
                <h2 className="font-bold text-base text-[#20252B] flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-[#C46B4E]" />
                  Your Order for {selectedTable}
                </h2>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Orders will be sent directly to the kitchen display
                </p>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="w-8 h-8 rounded-full bg-[#F7F5F0] text-[#64748B] hover:text-[#20252B] border border-[#E5E1D9] flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Warning if any item in cart is out of stock */}
            {cartOutOfStockItems.length > 0 && (
              <div className="mx-4 mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                <div>
                  <strong className="font-semibold">Some items are now Out of Stock:</strong>
                  <ul className="list-disc list-inside mt-0.5 space-y-0.5">
                    {cartOutOfStockItems.map((item) => (
                      <li key={item.id}>{item.name} is no longer available</li>
                    ))}
                  </ul>
                  <p className="text-[11px] mt-1 text-red-700">Please remove them from your order to proceed.</p>
                </div>
              </div>
            )}

            {/* Drawer Body Items */}
            <div className="p-4 overflow-y-auto space-y-4 flex-1">
              <div className="space-y-2.5">
                {cart.map((item) => {
                  const isItemOutOfStock = menuItems.find((m) => m.id === item.id)?.isAvailable === false
                  return (
                    <div
                      key={item.id}
                      className={`p-3 rounded-lg border flex items-center justify-between text-xs ${
                        isItemOutOfStock
                          ? "bg-red-50/70 border-red-200"
                          : "bg-[#F7F5F0] border-[#E5E1D9]"
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[#20252B]">{item.name}</span>
                          {isItemOutOfStock && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-red-100 text-red-700">
                              Out of Stock
                            </span>
                          )}
                        </div>
                        <div className="text-[#C46B4E] font-semibold text-[11px]">
                          ₹{(item.price * item.quantity).toFixed(2)}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 bg-white border border-[#E5E1D9] rounded-lg px-1.5 py-1">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="w-5 h-5 rounded-md bg-[#F7F5F0] hover:bg-[#E9E3D8] text-[#20252B] flex items-center justify-center cursor-pointer"
                        >
                          <Minus className="w-2.5 h-2.5" />
                        </button>
                        <span className="text-xs font-bold text-[#20252B] w-4 text-center">
                          {item.quantity}
                        </span>
                        <button
                          disabled={isItemOutOfStock}
                          onClick={() => updateQuantity(item.id, 1)}
                          className="w-5 h-5 rounded-md bg-[#C46B4E] hover:bg-[#B25C40] disabled:opacity-40 text-white flex items-center justify-center cursor-pointer"
                        >
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Special Instructions & Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#20252B] block">
                  Kitchen Notes & Preferences (Optional):
                </label>
                <textarea
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="e.g. Extra spicy, no onions, drinks first..."
                  rows={2}
                  className="w-full p-2.5 rounded-lg bg-white border border-[#E5E1D9] text-xs text-[#20252B] placeholder-[#64748B] focus:outline-none focus:border-[#C46B4E] transition"
                />
              </div>

              {/* Optional Guest Contact Details */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-medium text-[#64748B] block mb-1">
                    Your Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Rahul"
                    className="w-full px-3 py-1.5 rounded-lg bg-white border border-[#E5E1D9] text-xs text-[#20252B] placeholder-[#64748B] focus:outline-none focus:border-[#C46B4E]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-[#64748B] block mb-1">
                    Phone (For WhatsApp / SMS Bill)
                  </label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-1.5 rounded-lg bg-white border border-[#E5E1D9] text-xs text-[#20252B] placeholder-[#64748B] focus:outline-none focus:border-[#C46B4E]"
                  />
                </div>
              </div>

              {/* Bill Summary */}
              <div className="p-3.5 rounded-xl bg-[#F7F5F0] border border-[#E5E1D9] space-y-1.5 text-xs">
                <div className="flex justify-between text-[#64748B]">
                  <span>Subtotal</span>
                  <span className="text-[#20252B] font-medium">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[#64748B]">
                  <span>GST (5%)</span>
                  <span className="text-[#20252B] font-medium">₹{gst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-[#20252B] pt-2 border-t border-[#E5E1D9]">
                  <span>Total Amount</span>
                  <span className="text-[#C46B4E] font-bold">₹{grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-[#E5E1D9] bg-white">
              <button
                onClick={handlePlaceOrder}
                disabled={isSubmitting || cart.length === 0 || cartOutOfStockItems.length > 0}
                className="w-full py-3 rounded-xl bg-[#C46B4E] hover:bg-[#B25C40] text-white font-bold text-sm transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 shadow-2xs"
              >
                {isSubmitting ? (
                  <span>Sending Order to Kitchen...</span>
                ) : cartOutOfStockItems.length > 0 ? (
                  <span>Remove Out-of-Stock Items to Order</span>
                ) : (
                  <>
                    <ChefHat className="w-4 h-4" />
                    <span>Send Order to Kitchen • ₹{grandTotal.toFixed(2)}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table Picker Modal */}
      {showTablePicker && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white border border-[#E5E1D9] p-5 space-y-4 shadow-lg text-[#20252B]">
            <div className="text-center space-y-1">
              <h3 className="font-bold text-base text-[#20252B] flex items-center justify-center gap-1.5">
                <Utensils className="w-4 h-4 text-[#C46B4E]" />
                Select Your Table
              </h3>
              <p className="text-xs text-[#64748B]">
                Please confirm the table number where you are seated
              </p>
            </div>

            <div className="grid grid-cols-4 gap-2 pt-1">
              {["Table 01", "Table 02", "Table 03", "Table 04", "Table 05", "Table 06", "Table 07", "Table 08"].map((tbl) => (
                <button
                  key={tbl}
                  onClick={() => {
                    setSelectedTable(tbl)
                    setShowTablePicker(false)
                  }}
                  className={`py-2 rounded-lg text-xs font-semibold transition cursor-pointer text-center border ${
                    selectedTable === tbl
                      ? "bg-[#C46B4E] text-white border-[#C46B4E] shadow-2xs"
                      : "bg-white text-[#20252B] hover:bg-[#F7F5F0] border-[#E5E1D9]"
                  }`}
                >
                  {tbl}
                </button>
              ))}
            </div>

            {selectedTable && (
              <button
                onClick={() => setShowTablePicker(false)}
                className="w-full py-2.5 rounded-lg bg-[#E9E3D8] hover:bg-[#DDD5C7] text-xs font-semibold text-[#20252B] border border-[#E5E1D9] transition cursor-pointer"
              >
                Continue with {selectedTable}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function CustomerMenuPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F7F5F0] flex items-center justify-center text-[#64748B] text-xs">Loading Menu...</div>}>
      <CustomerMenuContent />
    </Suspense>
  )
}
