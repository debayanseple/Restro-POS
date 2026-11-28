"use client"

import React, { useState, useEffect, useMemo, useRef, Suspense } from "react"
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
  Clock,
  Flame,
  Download,
} from "lucide-react"
import { MASTER_MENU_CATALOG, MenuItem } from "@/lib/menu-catalog"
import { buildBillPdfBlob } from "@/lib/pdf-bill"
import { DEFAULT_RESTAURANT_SETTINGS, RestaurantSettings } from "@/lib/restaurant-settings"

interface CartItem extends MenuItem {
  quantity: number
  notes?: string
  baseItemId?: string
  portion?: "half" | "full"
}

function CustomerMenuContent() {
  const searchParams = useSearchParams()
  const rawTableParam = searchParams.get("table") || searchParams.get("table_id") || ""
  const isDemoUrl =
    searchParams.get("demo") === "true" ||
    searchParams.get("demo") === "1" ||
    searchParams.get("mode") === "demo" ||
    rawTableParam.toLowerCase().includes("demo") ||
    !rawTableParam

  // Fetch isAcceptingOrders & restaurant settings
  const [restaurantSettings, setRestaurantSettings] = useState<RestaurantSettings>(DEFAULT_RESTAURANT_SETTINGS)
  const [isAcceptingOrders, setIsAcceptingOrders] = useState<boolean | null>(null)
  const [orderPausedPopupShown, setOrderPausedPopupShown] = useState(false)
  const [showCustomAlert, setShowCustomAlert] = useState(false)
  const [customAlertMessage, setCustomAlertMessage] = useState<string>("")
  useEffect(() => {
    let active = true
    fetch("/api/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (active && d?.settings) {
          setRestaurantSettings(d.settings)
          setIsAcceptingOrders(d.settings.isAcceptingOrders ?? true)
          if (!orderPausedPopupShown && d.settings.isAcceptingOrders === false) {
            setOrderPausedPopupShown(true)
          }
        }
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [orderPausedPopupShown])

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

  const selectedTable = normalizedTable || (isDemoUrl ? "Demo Table 01" : "Table 01")
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
  const [contactValidationError, setContactValidationError] = useState<string | null>(null)
  const [orderNotes, setOrderNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeOrder, setActiveOrder] = useState<any | null>(null)
  const [receivedBill, setReceivedBill] = useState<any | null>(null)
  const [isBillModalOpen, setIsBillModalOpen] = useState(false)
  const lastSeenBillSentAtRef = useRef<string | null>(null)
  const [waiterCalled, setWaiterCalled] = useState(false)
  const [billRequested, setBillRequested] = useState(false)
  const [cleaningRequested, setCleaningRequested] = useState(false)
  const [isServiceBellOpen, setIsServiceBellOpen] = useState(false)
  const [serviceActionStatus, setServiceActionStatus] = useState<string | null>(null)
  const [selectedDetailItem, setSelectedDetailItem] = useState<MenuItem | null>(null)
  const [detailPortion, setDetailPortion] = useState<"half" | "full">("full")
  const [detailQty, setDetailQty] = useState(1)

  const openItemDetails = (item: MenuItem) => {
    setSelectedDetailItem(item)
    setDetailPortion("full")
    setDetailQty(1)
  }

  // Lock background page scroll (including iOS Safari & Android Chrome) while any modal/sheet is open
  const isAnyModalOpen = Boolean(
    selectedDetailItem || isCartOpen || isServiceBellOpen || isBillModalOpen
  )

  useEffect(() => {
    if (!isAnyModalOpen || typeof window === "undefined") return

    const html = document.documentElement
    const body = document.body
    const scrollY = window.scrollY

    const prevHtmlOverflow = html.style.overflow
    const prevHtmlOverscroll = html.style.overscrollBehavior
    const prevHtmlScrollBehavior = html.style.scrollBehavior
    const prevBodyOverflow = body.style.overflow
    const prevBodyPosition = body.style.position
    const prevBodyTop = body.style.top
    const prevBodyLeft = body.style.left
    const prevBodyRight = body.style.right
    const prevBodyWidth = body.style.width
    const prevBodyOverscroll = body.style.overscrollBehavior

    html.style.overflow = "hidden"
    html.style.overscrollBehavior = "none"
    body.style.overflow = "hidden"
    body.style.overscrollBehavior = "none"
    body.style.position = "fixed"
    body.style.top = `-${scrollY}px`
    body.style.left = "0"
    body.style.right = "0"
    body.style.width = "100%"

    return () => {
      html.style.overflow = prevHtmlOverflow
      html.style.overscrollBehavior = prevHtmlOverscroll
      html.style.scrollBehavior = "auto"
      body.style.overflow = prevBodyOverflow
      body.style.overscrollBehavior = prevBodyOverscroll
      body.style.position = prevBodyPosition
      body.style.top = prevBodyTop
      body.style.left = prevBodyLeft
      body.style.right = prevBodyRight
      body.style.width = prevBodyWidth
      window.scrollTo(0, scrollY)
      requestAnimationFrame(() => {
        html.style.scrollBehavior = prevHtmlScrollBehavior
      })
    }
  }, [isAnyModalOpen])

  const isBillPaid = Boolean(receivedBill && !receivedBill.hasUnpaid)

  const handleDownloadBill = () => {
    if (!receivedBill || typeof window === "undefined") return
    const blob = buildBillPdfBlob({
      tableName: receivedBill.tableName || selectedTable,
      sentAt: receivedBill.sentAt,
      hasUnpaid: receivedBill.hasUnpaid,
      subtotal: Number(receivedBill.subtotal || 0),
      tax: Number(receivedBill.tax || 0),
      discount: Number(receivedBill.discount || 0),
      grandTotal: Number(receivedBill.grandTotal || 0),
      settings: restaurantSettings,
      orders: receivedBill.orders || [],
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    const slug = String(receivedBill.tableName || selectedTable || "table")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
    a.href = url
    a.download = `${slug}-bill.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleServiceRequest = (type: "clean" | "waiter" | "bill") => {
    if (type === "bill" && isBillPaid) return
    let msg = ""
    if (type === "clean") {
      setCleaningRequested(true)
      msg = `Cleaning request sent for ${selectedTable}. A team member is on the way!`
      setTimeout(() => setCleaningRequested(false), 5000)
    } else if (type === "waiter") {
      setWaiterCalled(true)
      msg = `Waiter called for ${selectedTable}. Someone will be with you shortly!`
      setTimeout(() => setWaiterCalled(false), 5000)
    } else if (type === "bill") {
      setBillRequested(true)
      msg = `Bill requested for ${selectedTable}. Your invoice is being brought to your table!`
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

  const matchesTableIdentifier = (candidate?: string | null, tableLabel?: string) => {
    if (!candidate || !tableLabel) return false
    const a = String(candidate).toLowerCase().trim()
    const b = String(tableLabel).toLowerCase().trim()
    const numA = a.replace(/\D/g, "")
    const numB = b.replace(/\D/g, "")
    return a === b || (Boolean(numA) && Boolean(numB) && Number(numA) === Number(numB))
  }

  const clearTableSession = () => {
    setActiveOrder(null)
    setReceivedBill(null)
    setIsBillModalOpen(false)
    lastSeenBillSentAtRef.current = null
    setCart([])
    setCustomerName("")
    setCustomerPhone("")
    setOrderNotes("")
    setContactValidationError(null)
    if (typeof window !== "undefined" && selectedTable) {
      try {
        localStorage.removeItem(`restro_qr_order_${selectedTable}`)
      } catch {}
    }
  }

  // Load existing active order from localStorage on table change, discarding closed sessions
  useEffect(() => {
    if (typeof window !== "undefined" && selectedTable) {
      try {
        const saved = localStorage.getItem(`restro_qr_order_${selectedTable}`)
        if (saved) {
          const parsed = JSON.parse(saved)
          if (parsed && parsed.status !== "CLOSED" && parsed.status !== "CANCELLED") {
            setActiveOrder(parsed)
          } else {
            localStorage.removeItem(`restro_qr_order_${selectedTable}`)
            setActiveOrder(null)
          }
        }
      } catch {}
    }
  }, [selectedTable])

  // Sync active order & table clear events (skip demo sandbox)
  useEffect(() => {
    if (!selectedTable || isDemoMode) return

    const checkSessionSync = async () => {
      try {
        const [ordersRes, tablesRes] = await Promise.all([
          fetch("/api/orders"),
          fetch("/api/tables"),
        ])

        let tableCleared = false
        let matchedTable: any = null
        if (tablesRes.ok) {
          const tData = await tablesRes.json()
          if (Array.isArray(tData.tables)) {
            matchedTable = tData.tables.find((t: any) =>
              matchesTableIdentifier(t.name || `Table ${t.id}`, selectedTable)
            )
            if (matchedTable && matchedTable.status === "available") {
              tableCleared = true
            }
          }
        }

        if (tableCleared) {
          if (activeOrder && !activeOrder.isDemo) {
            clearTableSession()
          } else {
            setReceivedBill(null)
            setIsBillModalOpen(false)
            lastSeenBillSentAtRef.current = null
            if (typeof window !== "undefined") {
              localStorage.removeItem(`restro_qr_order_${selectedTable}`)
            }
          }
          return
        }

        if (matchedTable?.sentBill) {
          setReceivedBill(matchedTable.sentBill)
          if (
            matchedTable.sentBill.sentAt &&
            matchedTable.sentBill.sentAt !== lastSeenBillSentAtRef.current
          ) {
            lastSeenBillSentAtRef.current = matchedTable.sentBill.sentAt
            setIsBillModalOpen(true)
          }
        } else {
          setReceivedBill(null)
        }

        if (activeOrder?.id && ordersRes.ok) {
          const data = await ordersRes.json()
          if (Array.isArray(data.orders)) {
            const found = data.orders.find(
              (o: any) => o.id === activeOrder.id || o.order_number === activeOrder.order_number
            )
            if (found) {
              if (found.status === "CLOSED" || found.status === "CANCELLED") {
                clearTableSession()
              } else {
                setActiveOrder(found)
                localStorage.setItem(`restro_qr_order_${selectedTable}`, JSON.stringify(found))
              }
            }
          }
        }
      } catch {}
    }

    checkSessionSync()
    const pollInterval = setInterval(checkSessionSync, 3500)

    let bc: BroadcastChannel | null = null
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      bc = new BroadcastChannel("restro_sync_channel")
      bc.onmessage = (event) => {
        if (!event.data) return
        if (
          event.data.type === "bill_sent" &&
          event.data.sentBill &&
          matchesTableIdentifier(event.data.table_name || `Table ${event.data.table_id}`, selectedTable)
        ) {
          setReceivedBill(event.data.sentBill)
          if (event.data.sentBill.sentAt) {
            lastSeenBillSentAtRef.current = event.data.sentBill.sentAt
          }
          setIsBillModalOpen(true)
        } else if (
          event.data.type === "table_cleared" &&
          matchesTableIdentifier(event.data.table_name || `Table ${event.data.table_id}`, selectedTable)
        ) {
          clearTableSession()
        } else if (
          event.data.type === "table_updated" &&
          event.data.status === "available" &&
          matchesTableIdentifier(String(event.data.table_id), selectedTable)
        ) {
          clearTableSession()
        }
      }
    }

    return () => {
      clearInterval(pollInterval)
      if (bc) bc.close()
    }
  }, [activeOrder?.id, activeOrder?.order_number, selectedTable, isDemoMode])

  // Cart operations
  const addToCart = (item: MenuItem, portion?: "half" | "full", qty = 1) => {
    if (item.isAvailable === false) {
      setCustomAlertMessage(`Sorry, ${item.name} is currently Out of Stock and cannot be ordered.`)
      setShowCustomAlert(true)
      return
    }

    const hasHalfFull = Boolean(item.hasPortionOptions && item.halfPrice)
    const chosenPortion: "half" | "full" | undefined = hasHalfFull ? portion || "full" : undefined
    const effectivePrice =
      chosenPortion === "half" && item.halfPrice
        ? item.halfPrice
        : chosenPortion === "full" && item.fullPrice
        ? item.fullPrice
        : item.price
    const cartKey = chosenPortion ? `${item.id}__${chosenPortion}` : item.id
    const displayName = chosenPortion
      ? `${item.name} (${chosenPortion === "half" ? "Half" : "Full"})`
      : item.name

    setCart((prev) => {
      const exists = prev.find((i) => i.id === cartKey)
      if (exists) {
        return prev.map((i) =>
          i.id === cartKey ? { ...i, quantity: i.quantity + qty } : i
        )
      }
      return [
        ...prev,
        {
          ...item,
          id: cartKey,
          baseItemId: item.id,
          name: displayName,
          price: effectivePrice,
          portion: chosenPortion,
          quantity: qty,
        },
      ]
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
      const latest = menuItems.find((m) => m.id === (c.baseItemId || c.id))
      return latest && latest.isAvailable === false
    })
  }, [cart, menuItems])

  // Handle Order Placement
  const handlePlaceOrder = async () => {
    if (cart.length === 0 || !selectedTable || isSubmitting) return
    if (isAcceptingOrders === false && !isDemoMode) {
      setCustomAlertMessage("Live orders are currently paused. Please ask staff for assistance or try again later.")
      setShowCustomAlert(true)
      return
    }
    if (isAcceptingOrders === null) {
      // Still loading settings; proceed with demo flow for now
    }

    const trimmedName = customerName.trim()
    const trimmedPhone = customerPhone.trim()
    const phoneDigits = trimmedPhone.replace(/\D/g, "")

    if (!trimmedName) {
      setContactValidationError("Please enter your name before sending the order.")
      return
    }
    if (phoneDigits.length < 7) {
      setContactValidationError("Please enter a valid mobile number (at least 7 digits).")
      return
    }
    setContactValidationError(null)

    if (cartOutOfStockItems.length > 0) {
      setCustomAlertMessage(`The following item(s) are currently Out of Stock and cannot be ordered:\n${cartOutOfStockItems.map((i) => `• ${i.name}`).join("\n")}\n\nPlease remove them from your order to proceed.`)
      setShowCustomAlert(true)
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
        customer_name: trimmedName,
        customer_phone: trimmedPhone,
        notes: [
          orderNotes ? `Notes: ${orderNotes}` : "",
          `Guest: ${trimmedName}`,
          `Phone: ${trimmedPhone}`,
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
        const resJson = await res.json().catch(() => null)
        const orderData = resJson?.order || {
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
        setCustomAlertMessage("Failed to send order to the kitchen. Please ask staff for assistance.")
        setShowCustomAlert(true)
      }
    } catch (err) {
      console.error("Order submission error:", err)
      setCustomAlertMessage("Network error. Please try again or inform your waiter.")
      setShowCustomAlert(true)
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
                    Demo
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#64748B]">
                {isDemoMode ? "Interactive Customer Self-Ordering Showcase" : "Digital Menu & Table Ordering"}
              </p>
            </div>
          </div>

          {isDemoMode && isAcceptingOrders === false && (
            <span className="px-2 py-0.5 rounded-md text-xs font-medium text-rose-600 border border-rose-200 hover:bg-rose-50 transition">
              Paused
            </span>
          )}

          {/* Fixed Read-Only Table Badge (Locked to Scanned QR Table) */}
          <div
            aria-label={`Current table: ${selectedTable}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#E9E3D8] text-[#20252B] border border-[#E5E1D9] text-xs font-semibold select-none"
          >
            <span className={`w-2 h-2 rounded-full ${isDemoMode ? "bg-amber-500 animate-pulse" : "bg-blue-600"}`} />
            <span>{selectedTable}</span>
          </div>
        </div>
      </header>

      {orderPausedPopupShown && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-sm"
        >
          <div
            className="bg-white rounded-xl p-8 max-w-sm w-full border border-slate-200 shadow-2xl text-center"
          >
            <div className="text-rose-500 text-4xl mb-4">⚠</div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              We are sorry
            </h3>
            <p className="text-slate-600 text-sm mb-6">
              We are not accepting orders now. We will be back soon.
            </p>
            <button
              onClick={() => setOrderPausedPopupShown(false)}
              className="px-6 py-2 rounded-xl bg-[#C46B4E] text-white font-semibold text-sm transition hover:bg-[#B25C40]"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {showCustomAlert && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md"
        >
          <div
            className="bg-white rounded-xl p-8 max-w-sm w-full border border-slate-200 shadow-2xl text-center"
          >
            <div className="text-slate-500 text-4xl mb-4">ℹ</div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Information</h3>
            <p className="text-slate-600 text-sm mb-6">{customAlertMessage}</p>
            <button
              onClick={() => setShowCustomAlert(false)}
              className="px-6 py-2 rounded-xl bg-[#C46B4E] text-white font-semibold text-sm transition hover:bg-[#B25C40]"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="max-w-xl mx-auto px-4 pt-4 space-y-4">
        {/* Demo Menu Banner */}
        {isDemoMode && (
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
              <p className="text-[11px] font-medium leading-relaxed">
                This is a demo menu. Once you join us, you will be able to completely customise this.
              </p>
            </div>
            <span className="px-2 py-0.5 rounded-md bg-amber-200/80 text-amber-900 text-[10px] font-bold shrink-0">
              Demo
            </span>
          </div>
        )}
        {/* Bill Ready Banner (Sent by Restaurant) */}
        {receivedBill && (
          <div
            className={`p-4 rounded-xl border shadow-2xs flex items-center justify-between gap-3 ${
              isBillPaid
                ? "bg-emerald-50 border-emerald-200"
                : "bg-indigo-50 border-indigo-200"
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-9 h-9 rounded-xl text-white flex items-center justify-center shrink-0 ${
                  isBillPaid ? "bg-emerald-600" : "bg-indigo-600"
                }`}
              >
                {isBillPaid ? <CheckCircle2 className="w-4 h-4" /> : <Receipt className="w-4 h-4" />}
              </div>
              <div className="min-w-0">
                <div
                  className={`text-xs font-bold truncate ${
                    isBillPaid ? "text-emerald-950" : "text-indigo-950"
                  }`}
                >
                  {isBillPaid ? "Bill Paid — Thank You!" : "Your Table Bill is Ready"}
                </div>
                <div className={`text-[11px] ${isBillPaid ? "text-emerald-800" : "text-indigo-800"}`}>
                  Total: <span className="font-extrabold">₹{Number(receivedBill.grandTotal || 0).toFixed(2)}</span> ·{" "}
                  {isBillPaid ? "Paid" : "Payment Due"}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsBillModalOpen(true)}
              className={`px-3.5 py-2 rounded-xl text-white text-xs font-bold shrink-0 cursor-pointer transition ${
                isBillPaid ? "bg-emerald-600 hover:bg-emerald-700" : "bg-indigo-600 hover:bg-indigo-700"
              }`}
            >
              View Bill
            </button>
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
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 uppercase tracking-wider">
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
                <div className="h-1.5 rounded-full bg-blue-600" />
                <span className="text-blue-800 font-semibold">Received</span>
              </div>
              <div className="space-y-1">
                <div
                  className={`h-1.5 rounded-full ${
                    ["preparing", "ready", "completed"].includes(activeOrder.kitchen_stage)
                      ? "bg-blue-600"
                      : "bg-[#E5E1D9]"
                  }`}
                />
                <span className={["preparing", "ready", "completed"].includes(activeOrder.kitchen_stage) ? "text-blue-800 font-semibold" : "text-[#64748B]"}>
                  Cooking
                </span>
              </div>
              <div className="space-y-1">
                <div
                  className={`h-1.5 rounded-full ${
                    ["ready", "completed"].includes(activeOrder.kitchen_stage)
                      ? "bg-blue-600"
                      : "bg-[#E5E1D9]"
                  }`}
                />
                <span className={["ready", "completed"].includes(activeOrder.kitchen_stage) ? "text-blue-800 font-semibold" : "text-[#64748B]"}>
                  Ready
                </span>
              </div>
              <div className="space-y-1">
                <div
                  className={`h-1.5 rounded-full ${
                    activeOrder.kitchen_stage === "completed" ? "bg-blue-600" : "bg-[#E5E1D9]"
                  }`}
                />
                <span className={activeOrder.kitchen_stage === "completed" ? "text-blue-800 font-semibold" : "text-[#64748B]"}>
                  Served
                </span>
              </div>
            </div>

            {/* Waiter Assistance Buttons */}
            <div className="pt-2 border-t border-[#E5E1D9] flex items-center justify-between gap-2">
              <button
                onClick={() => handleServiceRequest("waiter")}
                disabled={waiterCalled}
                className="flex-1 py-1.5 rounded-lg bg-[#F7F5F0] hover:bg-[#E9E3D8] text-[#20252B] text-[11px] font-semibold border border-[#E5E1D9] transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <BellRing className="w-3.5 h-3.5 text-amber-700" />
                <span>{waiterCalled ? "Staff Notified!" : "Call Waiter"}</span>
              </button>
              <button
                onClick={() => handleServiceRequest("bill")}
                disabled={billRequested || isBillPaid}
                className="flex-1 py-1.5 rounded-lg bg-[#F7F5F0] hover:bg-[#E9E3D8] disabled:opacity-60 text-[#20252B] text-[11px] font-semibold border border-[#E5E1D9] transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Receipt className="w-3.5 h-3.5 text-indigo-700" />
                <span>{isBillPaid ? "Bill Paid" : billRequested ? "Bill Requested!" : "Request Bill"}</span>
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
                  ? "bg-[#20252B] text-white shadow-2xs"
                  : "bg-white text-[#20252B] hover:bg-[#F7F5F0] border border-[#E5E1D9]"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-blue-600" />
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
              const matchingCartItems = cart.filter((i) => (i.baseItemId || i.id) === item.id)
              const inCart = matchingCartItems[0]
              const totalItemCartQty = matchingCartItems.reduce((s, c) => s + c.quantity, 0)
              const hasHalfFull = Boolean(item.hasPortionOptions && item.halfPrice)
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
                    onClick={() => openItemDetails(item)}
                    className={`p-3.5 rounded-xl bg-white border border-[#E5E1D9] flex gap-3.5 transition shadow-2xs cursor-pointer ${
                      isOutOfStock ? "opacity-75 bg-[#FAF9F6]" : "hover:border-[#C46B4E] hover:shadow-sm"
                    }`}
                  >
                  {/* Real Food Photo / Fallback */}
                  <div className={`w-24 h-24 rounded-xl bg-[#F7F5F0] border border-[#E5E1D9] overflow-hidden flex items-center justify-center text-3xl shrink-0 relative ${isOutOfStock ? "grayscale-50" : ""}`}>
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <span>{item.icon}</span>
                    )}
                    {hasHalfFull && (
                      <span className="absolute bottom-1 inset-x-1 text-center py-0.5 rounded bg-black/70 text-white text-[9px] font-bold backdrop-blur-xs">
                        Half / Full
                      </span>
                    )}
                  </div>

                  {/* Dish Details */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Veg / Non-Veg Indicator */}
                        <span
                          className={`w-3.5 h-3.5 rounded-xs border flex items-center justify-center shrink-0 ${
                            item.isVeg
                              ? "border-sky-600 bg-sky-50"
                              : "border-amber-700 bg-amber-50"
                          }`}
                          title={item.isVeg ? "Vegetarian" : "Non-Vegetarian"}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              item.isVeg ? "bg-sky-600" : "bg-amber-700"
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
                      <span className="inline-block text-[10px] text-[#C46B4E] font-semibold mt-1">
                        Tap for dish details →
                      </span>
                    </div>

                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center justify-between pt-2 mt-1 border-t border-[#E5E1D9]"
                    >
                      <div>
                        {hasHalfFull ? (
                          <div className={`text-xs font-bold ${isOutOfStock ? "text-[#64748B]" : "text-[#C46B4E]"}`}>
                            Half ₹{item.halfPrice} <span className="text-[#64748B] font-normal">·</span> Full ₹{item.fullPrice || item.price}
                          </div>
                        ) : (
                          <span className={`font-bold text-sm ${isOutOfStock ? "text-[#64748B]" : "text-[#C46B4E]"}`}>
                            ₹{item.price.toFixed(2)}
                          </span>
                        )}
                      </div>

                      {/* Add Button or Out of Stock indicator */}
                      {isOutOfStock ? (
                        <div className="px-3 py-1.5 rounded-lg bg-[#E5E1D9] text-[#64748B] text-xs font-semibold select-none cursor-not-allowed">
                          Unavailable
                        </div>
                      ) : totalItemCartQty > 0 && !hasHalfFull && inCart ? (
                        <div className="flex items-center gap-2 bg-[#F7F5F0] border border-[#E5E1D9] rounded-lg px-1.5 py-1">
                          <button
                            onClick={() => updateQuantity(inCart.id, -1)}
                            className="w-5 h-5 rounded-md bg-white hover:bg-[#E9E3D8] text-[#20252B] border border-[#E5E1D9] flex items-center justify-center cursor-pointer transition"
                          >
                            <Minus className="w-2.5 h-2.5" />
                          </button>
                          <span className="text-xs font-bold text-[#20252B] w-4 text-center">
                            {inCart.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(inCart.id, 1)}
                            className="w-5 h-5 rounded-md bg-[#C46B4E] hover:bg-[#B25C40] text-white flex items-center justify-center cursor-pointer transition"
                          >
                            <Plus className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ) : hasHalfFull ? (
                        <button
                          onClick={() => openItemDetails(item)}
                          className="px-3 py-1.5 rounded-lg bg-[#C46B4E] hover:bg-[#B25C40] text-white text-xs font-semibold transition flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs"
                        >
                          <Plus className="w-3 h-3" />
                          <span>{totalItemCartQty > 0 ? `Added (${totalItemCartQty})` : "Select Size"}</span>
                        </button>
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
                disabled={billRequested || isBillPaid}
                className="w-full p-3.5 rounded-2xl bg-[#F7F5F0] hover:bg-[#E9E3D8] active:bg-[#E0D9CD] border border-[#E5E1D9] transition flex items-center gap-3.5 text-left group cursor-pointer disabled:opacity-60 active:scale-[0.98]"
              >
                <div className="w-11 h-11 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                  <Receipt className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-[#20252B] flex items-center justify-between">
                    <span>Ask for Bill</span>
                    {isBillPaid ? (
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Paid
                      </span>
                    ) : billRequested ? (
                      <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                        Requested
                      </span>
                    ) : null}
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
                  ? "This is a demo menu. Once you join us, you will be able to completely customise this."
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
        <div
          onClick={() => setIsCartOpen(false)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-center items-end sm:items-center overscroll-none"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl bg-white border border-[#E5E1D9] rounded-t-2xl sm:rounded-2xl max-h-[90dvh] flex flex-col overflow-hidden shadow-xl animate-in slide-in-from-bottom-5 text-[#20252B]"
          >
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
            <div className="p-4 overflow-y-auto overscroll-contain space-y-4 flex-1">
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

              {/* Mandatory Guest Contact Details */}
              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-[#20252B] block mb-1">
                      Guest Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => {
                        setCustomerName(e.target.value)
                        if (contactValidationError) setContactValidationError(null)
                      }}
                      placeholder="e.g. Rahul Sharma"
                      className={`w-full px-3 py-2 rounded-lg bg-white border text-xs text-[#20252B] placeholder-[#64748B] focus:outline-none focus:border-[#C46B4E] ${
                        contactValidationError && !customerName.trim()
                          ? "border-red-400 bg-red-50/40"
                          : "border-[#E5E1D9]"
                      }`}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[#20252B] block mb-1">
                      Mobile Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => {
                        setCustomerPhone(e.target.value)
                        if (contactValidationError) setContactValidationError(null)
                      }}
                      placeholder="+91 98765 43210"
                      className={`w-full px-3 py-2 rounded-lg bg-white border text-xs text-[#20252B] placeholder-[#64748B] focus:outline-none focus:border-[#C46B4E] ${
                        contactValidationError && customerPhone.replace(/\D/g, "").length < 7
                          ? "border-red-400 bg-red-50/40"
                          : "border-[#E5E1D9]"
                      }`}
                    />
                  </div>
                </div>
                {contactValidationError && (
                  <p className="text-[11px] font-semibold text-red-600 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{contactValidationError}</span>
                  </p>
                )}
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

      {/* Dish / Item Details Modal (Customer QR Menu) */}
      {selectedDetailItem && (
        <div
          onClick={() => setSelectedDetailItem(null)}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 cursor-pointer animate-in fade-in overscroll-none"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-white border border-[#E5E1D9] overflow-hidden shadow-2xl text-[#20252B] cursor-default max-h-[90dvh] flex flex-col overscroll-contain"
          >
            {/* Hero Food Image */}
            <div className="relative h-56 w-full bg-[#F7F5F0] shrink-0 overflow-hidden flex items-center justify-center">
              {selectedDetailItem.image ? (
                <img
                  src={selectedDetailItem.image}
                  alt={selectedDetailItem.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-7xl">{selectedDetailItem.icon}</span>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />
              <button
                type="button"
                onClick={() => setSelectedDetailItem(null)}
                className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition cursor-pointer"
                aria-label="Close item details"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      selectedDetailItem.isVeg
                        ? "bg-sky-50 text-sky-900 border-sky-200"
                        : "bg-amber-50 text-amber-800 border-amber-200"
                    }`}
                  >
                    {selectedDetailItem.isVeg ? "● Pure Veg" : "● Non-Veg"}
                  </span>
                  {selectedDetailItem.tag && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#C46B4E] text-white">
                      {selectedDetailItem.tag}
                    </span>
                  )}
                </div>
                {selectedDetailItem.isAvailable === false && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-600 text-white">
                    Out of Stock
                  </span>
                )}
              </div>
            </div>

            {/* Dish Info & Portion Selector */}
            <div className="p-5 space-y-4 overflow-y-auto overscroll-contain flex-1">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#C46B4E]">
                    {selectedDetailItem.category} · {selectedDetailItem.station === "bar" ? "Bar Station" : "Chef Kitchen"}
                  </span>
                  <div className="flex items-center gap-2 text-[11px] text-[#64748B]">
                    {selectedDetailItem.prepTime && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#C46B4E]" />
                        {selectedDetailItem.prepTime}
                      </span>
                    )}
                    {selectedDetailItem.calories && (
                      <span className="flex items-center gap-1">
                        <Flame className="w-3 h-3 text-amber-600" />
                        {selectedDetailItem.calories}
                      </span>
                    )}
                  </div>
                </div>
                <h2 className="text-xl font-bold text-[#20252B] mt-1">
                  {selectedDetailItem.name}
                </h2>
                <p className="text-xs text-[#64748B] leading-relaxed mt-1.5">
                  {selectedDetailItem.description || "Freshly prepared to order with curated kitchen ingredients."}
                </p>
              </div>

              {selectedDetailItem.ingredients && selectedDetailItem.ingredients.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                    Key Ingredients
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedDetailItem.ingredients.map((ing) => (
                      <span
                        key={ing}
                        className="px-2.5 py-1 rounded-lg bg-[#F7F5F0] border border-[#E5E1D9] text-[11px] font-medium text-[#20252B]"
                      >
                        {ing}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Optional Half / Full Portion Choice */}
              {selectedDetailItem.hasPortionOptions && selectedDetailItem.halfPrice ? (
                <div className="space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                    Choose Portion Size
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setDetailPortion("half")}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                        detailPortion === "half"
                          ? "bg-[#C46B4E]/10 border-[#C46B4E] ring-1 ring-[#C46B4E]"
                          : "bg-[#F7F5F0] border-[#E5E1D9] hover:border-[#C46B4E]/50"
                      }`}
                    >
                      <div className="text-xs font-bold text-[#20252B]">Half Portion</div>
                      <div className="text-sm font-extrabold text-[#C46B4E] mt-0.5">
                        ₹{selectedDetailItem.halfPrice.toFixed(2)}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDetailPortion("full")}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                        detailPortion === "full"
                          ? "bg-[#C46B4E]/10 border-[#C46B4E] ring-1 ring-[#C46B4E]"
                          : "bg-[#F7F5F0] border-[#E5E1D9] hover:border-[#C46B4E]/50"
                      }`}
                    >
                      <div className="text-xs font-bold text-[#20252B]">Full Portion</div>
                      <div className="text-sm font-extrabold text-[#C46B4E] mt-0.5">
                        ₹{(selectedDetailItem.fullPrice || selectedDetailItem.price).toFixed(2)}
                      </div>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-[#F7F5F0] border border-[#E5E1D9] flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#64748B]">Standard Serving Price</span>
                  <span className="text-base font-extrabold text-[#C46B4E]">
                    ₹{selectedDetailItem.price.toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            {/* Modal Footer: Quantity + Add to Order */}
            <div className="p-4 border-t border-[#E5E1D9] bg-[#FAF8F4] flex items-center gap-3">
              {selectedDetailItem.isAvailable === false ? (
                <button
                  type="button"
                  disabled
                  className="w-full py-3 rounded-xl bg-[#E5E1D9] text-[#64748B] text-xs font-bold cursor-not-allowed"
                >
                  Currently Out of Stock
                </button>
              ) : (
                <>
                  <div className="flex items-center gap-2 bg-white border border-[#E5E1D9] rounded-xl px-2.5 py-2">
                    <button
                      type="button"
                      onClick={() => setDetailQty((q) => Math.max(1, q - 1))}
                      className="w-6 h-6 rounded-lg bg-[#F7F5F0] hover:bg-[#E9E3D8] flex items-center justify-center cursor-pointer"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-xs font-bold w-5 text-center">{detailQty}</span>
                    <button
                      type="button"
                      onClick={() => setDetailQty((q) => q + 1)}
                      className="w-6 h-6 rounded-lg bg-[#C46B4E] text-white flex items-center justify-center cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const chosenPortion =
                        selectedDetailItem.hasPortionOptions && selectedDetailItem.halfPrice
                          ? detailPortion
                          : undefined
                      addToCart(selectedDetailItem, chosenPortion, detailQty)
                      setSelectedDetailItem(null)
                    }}
                    className="flex-1 py-3 px-4 rounded-xl bg-[#C46B4E] hover:bg-[#B25C40] text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>
                      Add to Order · ₹
                      {(
                        (selectedDetailItem.hasPortionOptions && selectedDetailItem.halfPrice
                          ? detailPortion === "half"
                            ? selectedDetailItem.halfPrice
                            : selectedDetailItem.fullPrice || selectedDetailItem.price
                          : selectedDetailItem.price) * detailQty
                      ).toFixed(2)}
                    </span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Customer Bill Modal (Sent from Restaurant Tables) */}
      {isBillModalOpen && receivedBill && (
        <div
          onClick={() => setIsBillModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-2xl border border-[#E5E1D9] shadow-2xl overflow-hidden flex flex-col max-h-[88dvh]"
          >
            <div className="px-5 py-4 border-b border-[#E5E1D9] bg-[#FAF8F4] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/15 text-indigo-700 flex items-center justify-center border border-indigo-500/25">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-[#20252B]">
                      {receivedBill.tableName || selectedTable} · Bill
                    </h3>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                        receivedBill.hasUnpaid
                          ? "bg-amber-500/15 text-amber-700 border-amber-500/30"
                          : "bg-blue-500/15 text-blue-700 border-blue-500/30"
                      }`}
                    >
                      {receivedBill.hasUnpaid ? "Payment Due" : "Paid"}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#64748B]">
                    Sent from front desk
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBillModalOpen(false)}
                className="w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center cursor-pointer transition"
                aria-label="Close bill"
              >
                <X className="w-4 h-4 text-[#20252B]" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto overscroll-contain flex-1">
              <div className="space-y-3">
                {(receivedBill.orders || []).map((ord: any) => (
                  <div
                    key={ord.id}
                    className="rounded-xl border border-[#E5E1D9] bg-[#FAF8F4] p-3.5 space-y-2"
                  >
                    <div className="flex items-center justify-between text-[11px] pb-1.5 border-b border-dashed border-[#E5E1D9]">
                      <span className="font-bold text-[#20252B]">{ord.order_number}</span>
                      <span
                        className={`px-2 py-0.5 rounded-md font-bold uppercase text-[10px] ${
                          ord.payment_status === "PAID"
                            ? "bg-blue-500/15 text-blue-700"
                            : "bg-amber-500/15 text-amber-700"
                        }`}
                      >
                        {ord.payment_status === "PAID" ? "Paid" : "Unpaid"}
                      </span>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      {(ord.items || []).map((it: any, idx: number) => {
                        const qty = Number(it.quantity) || 1
                        const rate = Number(it.unit_price) || 0
                        return (
                          <div key={`${ord.id}_${idx}`} className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-medium text-[#20252B] truncate">
                                <span className="font-bold text-[#C46B4E]">{qty}×</span> {it.name}
                              </div>
                              {it.special_instructions && (
                                <div className="text-[10px] text-[#64748B] italic">
                                  Note: {it.special_instructions}
                                </div>
                              )}
                            </div>
                            <span className="font-semibold text-[#20252B] shrink-0">
                              ₹{(rate * qty).toFixed(2)}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-[#E5E1D9] bg-[#FAF8F4] p-3.5 space-y-1.5 text-xs">
                <div className="flex justify-between text-[#64748B]">
                  <span>Subtotal</span>
                  <span>₹{Number(receivedBill.subtotal || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[#64748B]">
                  <span>GST / Taxes</span>
                  <span>₹{Number(receivedBill.tax || 0).toFixed(2)}</span>
                </div>
                {Number(receivedBill.discount || 0) > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Discount</span>
                    <span>-₹{Number(receivedBill.discount || 0).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-extrabold text-sm pt-2 border-t border-[#E5E1D9] text-[#20252B]">
                  <span>Total Amount</span>
                  <span className="text-[#C46B4E]">
                    ₹{Number(receivedBill.grandTotal || 0).toFixed(2)}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-center text-[#64748B]">
                Please pay at the counter or ask your waiter for UPI, Card, or Cash.
              </p>
            </div>

            <div className="p-4 border-t border-[#E5E1D9] bg-[#FAF8F4] flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleDownloadBill}
                className="px-4 py-3 rounded-xl border border-[#E5E1D9] bg-white hover:bg-[#F7F5F0] text-[#20252B] text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
              >
                <Download className="w-4 h-4 text-[#C46B4E]" />
                <span>Download Bill</span>
              </button>
              {isBillPaid ? (
                <button
                  type="button"
                  onClick={() => setIsBillModalOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer flex items-center justify-center gap-2 shadow-xs"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Bill Paid · Close</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleServiceRequest("waiter")}
                  disabled={waiterCalled}
                  className="flex-1 py-3 rounded-xl bg-[#C46B4E] hover:bg-[#B25C40] disabled:opacity-70 text-white text-xs font-bold transition cursor-pointer flex items-center justify-center gap-2 shadow-xs"
                >
                  <BellRing className="w-4 h-4" />
                  <span>{waiterCalled ? "Waiter Called!" : "Call Waiter to Pay"}</span>
                </button>
              )}
            </div>
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
