"use client"

import { useState, useEffect, useMemo, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import {
  Utensils,
  Search,
  ShoppingBag,
  Plus,
  Minus,
  Check,
  Clock,
  ChefHat,
  BellRing,
  Receipt,
  Sparkles,
  ArrowRight,
  X,
  Phone,
  User,
  AlertCircle,
  HelpCircle,
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

  // Format table identifier (e.g. "1" -> "Table 01", "Table 02" -> "Table 02")
  const normalizedTable = useMemo(() => {
    if (!rawTableParam) return ""
    const trimmed = rawTableParam.trim()
    if (/^\d+$/.test(trimmed)) {
      const num = parseInt(trimmed, 10)
      return `Table ${num < 10 ? "0" + num : num}`
    }
    return trimmed
  }, [rawTableParam])

  const [selectedTable, setSelectedTable] = useState<string>(normalizedTable || "Table 01")
  const [showTablePicker, setShowTablePicker] = useState<boolean>(!normalizedTable)
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

  // Sync active order with server polling every 4 seconds
  useEffect(() => {
    if (!activeOrder?.id) return

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

  // Filter menu catalog
  const filteredItems = useMemo(() => {
    return MASTER_MENU_CATALOG.filter((item) => {
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
  }, [selectedCategory, searchQuery, dietaryFilter])

  // Handle Order Placement
  const handlePlaceOrder = async () => {
    if (cart.length === 0 || !selectedTable || isSubmitting) return

    setIsSubmitting(true)
    try {
      const generatedOrderNum = `ORD-${Math.floor(1000 + Math.random() * 9000)}`
      const payload = {
        restaurant_id: "demo-restaurant-1",
        outlet_id: "demo-outlet-1",
        order_type: "dine-in",
        table_id: selectedTable,
        source: "qr_menu",
        order_number: generatedOrderNum,
        total_amount: grandTotal,
        tax_amount: gst,
        payment_status: "UNPAID",
        payment_method: "MANUAL",
        notes: orderNotes ? `[Guest: ${customerName || "Customer"} | Ph: ${customerPhone || "N/A"}] ${orderNotes}` : (customerName ? `Guest: ${customerName}` : null),
        items: cart.map((item) => ({
          menuItemId: item.id,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.price,
          price: item.price,
          specialInstructions: item.notes || "",
        })),
      }

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        const data = await res.json()
        const orderData = data.order || {
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
    <div className="min-h-screen bg-[#0e1017] text-slate-100 pb-28 font-sans selection:bg-purple-500/20 selection:text-purple-300">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 bg-[#12141e]/90 backdrop-blur-md border-b border-[#202433] px-4 py-3">
        <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-900/40 border border-purple-400/20">
              <Utensils className="w-4 h-4" />
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
                Downtown Main Outlet
              </h1>
              <p className="text-[11px] text-slate-400 flex items-center gap-1">
                <span>🍽️ Digital Menu & Table Ordering</span>
              </p>
            </div>
          </div>

          {/* Table Badge & Switcher */}
          <button
            onClick={() => setShowTablePicker(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/15 text-purple-300 border border-purple-500/30 text-xs font-bold hover:bg-purple-500/25 transition cursor-pointer"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{selectedTable || "Choose Table"}</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-xl mx-auto px-4 pt-4 space-y-4">
        {/* Active Order Banner (If customer has an ongoing order) */}
        {activeOrder && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/80 via-[#1a172e] to-indigo-950/80 border border-purple-500/40 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                <ChefHat className="w-4 h-4 text-purple-400" />
                Active Order {activeOrder.order_number}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
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
                <div className="h-1.5 rounded-full bg-emerald-500" />
                <span className="text-emerald-400 font-semibold">Received</span>
              </div>
              <div className="space-y-1">
                <div
                  className={`h-1.5 rounded-full ${
                    ["preparing", "ready", "completed"].includes(activeOrder.kitchen_stage)
                      ? "bg-emerald-500"
                      : "bg-[#272b3b]"
                  }`}
                />
                <span className={["preparing", "ready", "completed"].includes(activeOrder.kitchen_stage) ? "text-emerald-400 font-semibold" : "text-slate-500"}>
                  Cooking
                </span>
              </div>
              <div className="space-y-1">
                <div
                  className={`h-1.5 rounded-full ${
                    ["ready", "completed"].includes(activeOrder.kitchen_stage)
                      ? "bg-emerald-500"
                      : "bg-[#272b3b]"
                  }`}
                />
                <span className={["ready", "completed"].includes(activeOrder.kitchen_stage) ? "text-emerald-400 font-semibold" : "text-slate-500"}>
                  Ready
                </span>
              </div>
              <div className="space-y-1">
                <div
                  className={`h-1.5 rounded-full ${
                    activeOrder.kitchen_stage === "completed" ? "bg-emerald-500" : "bg-[#272b3b]"
                  }`}
                />
                <span className={activeOrder.kitchen_stage === "completed" ? "text-emerald-400 font-semibold" : "text-slate-500"}>
                  Served
                </span>
              </div>
            </div>

            {/* Waiter Assistance Buttons */}
            <div className="pt-2 border-t border-purple-500/20 flex items-center justify-between gap-2">
              <button
                onClick={() => {
                  setWaiterCalled(true)
                  setTimeout(() => setWaiterCalled(false), 4000)
                }}
                disabled={waiterCalled}
                className="flex-1 py-1.5 rounded-xl bg-[#202336] hover:bg-[#282c44] text-slate-300 text-[11px] font-semibold border border-[#303550] transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <BellRing className="w-3.5 h-3.5 text-amber-400" />
                <span>{waiterCalled ? "Staff Notified!" : "Call Waiter"}</span>
              </button>
              <button
                onClick={() => {
                  setBillRequested(true)
                  setTimeout(() => setBillRequested(false), 4000)
                }}
                disabled={billRequested}
                className="flex-1 py-1.5 rounded-xl bg-[#202336] hover:bg-[#282c44] text-slate-300 text-[11px] font-semibold border border-[#303550] transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Receipt className="w-3.5 h-3.5 text-emerald-400" />
                <span>{billRequested ? "Bill Requested!" : "Request Bill"}</span>
              </button>
            </div>
          </div>
        )}

        {/* Search & Dietary Filters */}
        <div className="space-y-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search food, drinks, desserts..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[#141620] border border-[#232738] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Dietary Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDietaryFilter("all")}
              className={`px-3 py-1 rounded-xl text-[11px] font-semibold transition cursor-pointer ${
                dietaryFilter === "all"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "bg-[#161822] text-slate-400 hover:text-white border border-[#232635]"
              }`}
            >
              All Items
            </button>
            <button
              onClick={() => setDietaryFilter("veg")}
              className={`px-3 py-1 rounded-xl text-[11px] font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                dietaryFilter === "veg"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-[#161822] text-emerald-400 hover:text-white border border-emerald-900/40"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Veg Only
            </button>
            <button
              onClick={() => setDietaryFilter("non-veg")}
              className={`px-3 py-1 rounded-xl text-[11px] font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                dietaryFilter === "non-veg"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-[#161822] text-amber-400 hover:text-white border border-amber-900/40"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400" />
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
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  selectedCategory === cat.id
                    ? "bg-[#8b5cf6] text-white shadow-md shadow-purple-900/30"
                    : "bg-[#141622] text-slate-400 hover:text-white border border-[#232638]"
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
            <div className="py-12 text-center text-slate-500 text-xs">
              No menu items match your search. Try adjusting filters.
            </div>
          ) : (
            filteredItems.map((item) => {
              const inCart = cart.find((i) => i.id === item.id)
              return (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl bg-[#141622] border border-[#232738] flex gap-3.5 transition hover:border-purple-500/40 shadow-sm"
                >
                  {/* Dish Icon / Visual */}
                  <div className="w-16 h-16 rounded-2xl bg-[#1b1e2c] border border-[#2b3044] flex items-center justify-center text-3xl shrink-0 shadow-inner">
                    {item.icon}
                  </div>

                  {/* Dish Details */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        {/* Veg / Non-Veg Indicator */}
                        <span
                          className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 ${
                            item.isVeg
                              ? "border-emerald-500 bg-emerald-950/40"
                              : "border-amber-600 bg-amber-950/40"
                          }`}
                          title={item.isVeg ? "Vegetarian" : "Non-Vegetarian"}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              item.isVeg ? "bg-emerald-400" : "bg-amber-500"
                            }`}
                          />
                        </span>

                        <h3 className="font-bold text-sm text-white truncate">
                          {item.name}
                        </h3>

                        {item.tag && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30 shrink-0">
                            {item.tag}
                          </span>
                        )}
                      </div>

                      {item.description && (
                        <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-snug">
                          {item.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 mt-1 border-t border-[#1f2231]">
                      <span className="font-extrabold text-sm text-purple-400">
                        ₹{item.price.toFixed(2)}
                      </span>

                      {/* Add Button or Quantity Stepper */}
                      {inCart ? (
                        <div className="flex items-center gap-2 bg-[#202334] border border-purple-500/40 rounded-xl px-1.5 py-1">
                          <button
                            onClick={() => updateQuantity(item.id, -1)}
                            className="w-5 h-5 rounded-md bg-[#2d3148] hover:bg-slate-700 text-white flex items-center justify-center cursor-pointer transition"
                          >
                            <Minus className="w-2.5 h-2.5" />
                          </button>
                          <span className="text-xs font-bold text-white w-4 text-center">
                            {inCart.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, 1)}
                            className="w-5 h-5 rounded-md bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center cursor-pointer transition"
                          >
                            <Plus className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(item)}
                          className="px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/40 text-xs font-bold transition flex items-center gap-1 cursor-pointer active:scale-95"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
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
            className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xl shadow-purple-950/60 border border-purple-400/30 flex items-center justify-between transition hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-black/25 flex items-center justify-center font-bold text-xs">
                {cartCount}
              </div>
              <div className="text-left">
                <div className="text-xs font-bold flex items-center gap-1.5">
                  <span>View Order ({selectedTable})</span>
                </div>
                <div className="text-[11px] text-purple-200 font-medium">
                  ₹{grandTotal.toFixed(2)} (incl. GST)
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-bold bg-white/20 px-3 py-1.5 rounded-xl">
              <span>Checkout</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </button>
        </div>
      )}

      {/* Cart & Checkout Slide-Over Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-center items-end sm:items-center">
          <div className="w-full max-w-xl bg-[#121420] border-t sm:border border-[#232738] rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom-5">
            {/* Drawer Header */}
            <div className="p-4 border-b border-[#212435] flex items-center justify-between">
              <div>
                <h2 className="font-bold text-base text-white flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-purple-400" />
                  Your Order for {selectedTable}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Orders will be sent directly to the kitchen display
                </p>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="w-8 h-8 rounded-full bg-[#1e2130] text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Body Items */}
            <div className="p-4 overflow-y-auto space-y-4 flex-1">
              <div className="space-y-2.5">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-[#171a29] border border-[#24283c] flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-white">{item.name}</div>
                      <div className="text-purple-400 font-semibold text-[11px]">
                        ₹{(item.price * item.quantity).toFixed(2)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 bg-[#202334] rounded-xl px-1.5 py-1">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="w-5 h-5 rounded-md bg-[#2d3148] text-white flex items-center justify-center cursor-pointer"
                      >
                        <Minus className="w-2.5 h-2.5" />
                      </button>
                      <span className="text-xs font-bold text-white w-4 text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="w-5 h-5 rounded-md bg-purple-600 text-white flex items-center justify-center cursor-pointer"
                      >
                        <Plus className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Special Instructions & Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  Kitchen Notes & Preferences (Optional):
                </label>
                <textarea
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="e.g. Extra spicy, no onions, drinks first..."
                  rows={2}
                  className="w-full p-2.5 rounded-xl bg-[#171a29] border border-[#24283c] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
                />
              </div>

              {/* Optional Guest Contact Details */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-medium text-slate-400 block mb-1">
                    Your Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Rahul"
                    className="w-full px-3 py-1.5 rounded-xl bg-[#171a29] border border-[#24283c] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-400 block mb-1">
                    Phone (For Bill Updates)
                  </label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="9876543210"
                    className="w-full px-3 py-1.5 rounded-xl bg-[#171a29] border border-[#24283c] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Bill Summary */}
              <div className="p-3.5 rounded-2xl bg-[#161928] border border-[#24283b] space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal</span>
                  <span className="text-white font-medium">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>GST (5%)</span>
                  <span className="text-white font-medium">₹{gst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-[#23273c]">
                  <span>Total Amount</span>
                  <span className="text-purple-400 font-extrabold">₹{grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-[#212435] bg-[#10121c]">
              <button
                onClick={handlePlaceOrder}
                disabled={isSubmitting || cart.length === 0}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-purple-950/60 border border-purple-400/30 transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <span>Sending Order to Kitchen...</span>
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

      {/* Table Picker Modal (Shown when scanning general QR or changing table) */}
      {showTablePicker && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-[#141624] border border-[#272b3e] p-5 space-y-4 shadow-2xl">
            <div className="text-center space-y-1">
              <h3 className="font-bold text-base text-white flex items-center justify-center gap-1.5">
                <Utensils className="w-4 h-4 text-purple-400" />
                Select Your Table
              </h3>
              <p className="text-xs text-slate-400">
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
                  className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer text-center border ${
                    selectedTable === tbl
                      ? "bg-purple-600 text-white border-purple-500 shadow-md"
                      : "bg-[#1b1e2e] text-slate-300 hover:text-white border-[#272b3e]"
                  }`}
                >
                  {tbl}
                </button>
              ))}
            </div>

            {selectedTable && (
              <button
                onClick={() => setShowTablePicker(false)}
                className="w-full py-2.5 rounded-xl bg-[#212538] hover:bg-[#2b3048] text-xs font-semibold text-white border border-[#2d324b] transition cursor-pointer"
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
    <Suspense fallback={<div className="min-h-screen bg-[#0e1017] flex items-center justify-center text-slate-400 text-xs">Loading Menu...</div>}>
      <CustomerMenuContent />
    </Suspense>
  )
}
