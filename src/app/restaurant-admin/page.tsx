"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import {
  LayoutDashboard,
  ShoppingCart,
  FileText,
  LayoutGrid,
  CalendarCheck,
  Utensils,
  ChefHat,
  Users,
  Boxes,
  UserCheck,
  Landmark,
  BarChart3,
  Settings,
  Headphones,
  Bell,
  Moon,
  Sun,
  ChevronDown,
  PanelLeft,
  QrCode,
  Plus,
  X,
  Store,
  Check,
  Search,
  Minus,
  Receipt,
  DollarSign,
  TrendingUp,
  Building2,
  ShieldCheck,
  CreditCard,
  Activity,
  CheckCircle2,
  Bike,
  Truck,
  Megaphone,
  Sliders,
  Clock,
  LogOut,
  MoreVertical,
} from "lucide-react"

// Types for Order data from Supabase
interface SupabaseOrder {
  id: string
  restaurant_id: string
  outlet_id: string | null
  user_id: string
  status: string
  kds_stage?: "new" | "preparing" | "ready" | "completed"
  kitchen_stage?: "new" | "preparing" | "ready" | "completed"
  bar_stage?: "new" | "preparing" | "ready" | "completed"
  order_type: string
  table_id: string | null
  total_amount: number
  tax_amount: number
  discount_amount: number
  payment_status: string
  payment_method: string
  source: string
  order_number: string
  notes: string | null
  created_at: string
  updated_at: string
  order_items: Array<{
    id: string
    order_id: string
    menu_item_id: string
    quantity: number
    unit_price: number
    special_instructions: string | null
    name?: string
    station?: "kitchen" | "bar"
    status?: string
    MenuItem: {
      name: string
    } | null
  }>
  Payment: Array<{
    id: string
    order_id: string
    amount: number
    status: string
    payment_method: string
    recorded_at: string
  }> | null
}

interface KdsTicketItem {
  id: string
  name: string
  quantity: number
  status: "new" | "preparing" | "ready" | "completed"
  instructions?: string | null
}

interface KdsTicket {
  id: string
  orderId: string
  table: string
  time: string
  station: "kitchen" | "bar"
  items: KdsTicketItem[]
  stage: "new" | "preparing" | "ready"
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

function formatTimeAgo(isoString?: string): string {
  if (!isoString) return "Just now"
  const diffMs = Date.now() - new Date(isoString).getTime()
  if (isNaN(diffMs) || diffMs < 0) return "Just now"
  const diffMins = Math.floor(diffMs / (1000 * 60))
  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m`
  const diffHours = Math.floor(diffMins / 60)
  return `${diffHours}h`
}

function buildKdsTicketsFromOrders(ordersList: SupabaseOrder[]): KdsTicket[] {
  const tickets: KdsTicket[] = []

  for (const order of ordersList) {
    const orderNum = order.order_number?.replace(/\D/g, "") || order.id.slice(-4)
    const tableName = order.table_id || (order.order_type === "takeaway" ? "Takeaway" : order.order_type === "delivery" ? "Delivery" : "Counter")
    const timeAgo = formatTimeAgo(order.created_at)

    const kitchenItems: KdsTicketItem[] = []
    const barItems: KdsTicketItem[] = []

    if (order.order_items && Array.isArray(order.order_items)) {
      for (const it of order.order_items) {
        const name = it.MenuItem?.name || it.name || "Item"
        const qty = it.quantity || 1
        const itemStatus: "new" | "preparing" | "ready" | "completed" =
          it.status === "ready" ? "ready" :
          it.status === "preparing" ? "preparing" :
          it.status === "completed" ? "completed" : "new"

        const itemObj: KdsTicketItem = {
          id: it.id,
          name,
          quantity: qty,
          status: itemStatus,
          instructions: it.special_instructions,
        }

        if (isBarItem(name)) {
          barItems.push(itemObj)
        } else {
          kitchenItems.push(itemObj)
        }
      }
    }

    // --- KITCHEN TICKET (Independent station stage) ---
    const rawKitchenStage = order.kitchen_stage || order.kds_stage || (
      order.status === "CLOSED" ? "completed" :
      order.status === "READY" ? "ready" :
      order.status === "PREPARING" ? "preparing" : "new"
    )

    if (kitchenItems.length > 0 && rawKitchenStage !== "completed") {
      const validKitchenStage: "new" | "preparing" | "ready" =
        rawKitchenStage === "preparing" || rawKitchenStage === "ready" ? rawKitchenStage : "new"

      tickets.push({
        id: `T-${orderNum}-K`,
        orderId: order.id,
        table: tableName,
        time: timeAgo,
        station: "kitchen",
        items: kitchenItems,
        stage: validKitchenStage,
      })
    }

    // --- BAR TICKET (Independent station stage) ---
    const rawBarStage = order.bar_stage || order.kds_stage || (
      order.status === "CLOSED" ? "completed" :
      order.status === "READY" ? "ready" :
      order.status === "PREPARING" ? "preparing" : "new"
    )

    if (barItems.length > 0 && rawBarStage !== "completed") {
      const validBarStage: "new" | "preparing" | "ready" =
        rawBarStage === "preparing" || rawBarStage === "ready" ? rawBarStage : "new"

      tickets.push({
        id: `T-${orderNum}-B`,
        orderId: order.id,
        table: tableName,
        time: timeAgo,
        station: "bar",
        items: barItems,
        stage: validBarStage,
      })
    }

    // Fallback if order has 0 categorized items but is active
    if (kitchenItems.length === 0 && barItems.length === 0 && rawKitchenStage !== "completed") {
      const validStage: "new" | "preparing" | "ready" =
        rawKitchenStage === "preparing" || rawKitchenStage === "ready" ? rawKitchenStage : "new"

      tickets.push({
        id: `T-${orderNum}`,
        orderId: order.id,
        table: tableName,
        time: timeAgo,
        station: "kitchen",
        items: [{
          id: `it_${order.id}_fb`,
          name: "Kitchen Order",
          quantity: 1,
          status: validStage,
        }],
        stage: validStage,
      })
    }
  }

  return tickets
}

// 3 Distinct User Types & 3 POS Staff Roles
type UserType = "restaurant-admin" | "pos-staff" | "super-admin"
type PosRole = "orders" | "reception" | "kitchen"

interface TableItem {
  id: number
  name: string
  seats: number
  status: "available" | "occupied" | "reserved" | "cleaning" | "out_of_service"
  orderCode?: string
  isOpen: boolean
}

interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
}

const DEFAULT_TABLES_LIST: TableItem[] = [
  { id: 1, name: "Table 1", seats: 4, status: "available", isOpen: false },
  { id: 2, name: "Table 2", seats: 4, status: "available", isOpen: false },
  { id: 3, name: "Table 3", seats: 6, status: "available", isOpen: false },
  { id: 4, name: "Table 4", seats: 4, status: "available", isOpen: false },
  { id: 6, name: "Table 6", seats: 6, status: "available", isOpen: false },
  { id: 7, name: "Table 7", seats: 4, status: "available", isOpen: false },
  { id: 8, name: "Table 8", seats: 4, status: "available", isOpen: false },
]

function RestaurantAdminContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Hydration safety flag
  const [isMounted, setIsMounted] = useState(false)

  // 1. Current Active User Type & POS Sub-role
  const [userType, setUserType] = useState<UserType>("restaurant-admin")
  const [posRole, setPosRole] = useState<PosRole>("orders")
  const [activeTab, setActiveTab] = useState("tables")
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showProfileMenu, setShowProfileMenu] = useState(false)

  // 2. Dark / Night Mode State
  const [isDarkMode, setIsDarkMode] = useState(true)

  // 3. User Sign Out Handler
  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
    } catch {}
    document.cookie = "restaurant_id=; path=/; max-age=0"
    document.cookie = "outlet_id=; path=/; max-age=0"
    document.cookie = "user_role=; path=/; max-age=0"
    document.cookie = "pos_role=; path=/; max-age=0"
    window.location.href = "/restaurant-admin/login"
  }

  useEffect(() => {
    setIsMounted(true)

    // Check saved theme or system preference
    const savedTheme = localStorage.getItem("orderrestro_theme")
    if (savedTheme === "light") {
      setIsDarkMode(false)
      document.documentElement.classList.remove("dark")
    } else {
      setIsDarkMode(true)
      document.documentElement.classList.add("dark")
    }

    // Load saved tables from localStorage if available
    try {
      const savedTables = localStorage.getItem("restro_pos_tables")
      if (savedTables) {
        const parsed = JSON.parse(savedTables)
        if (Array.isArray(parsed) && parsed.length > 0) setTables(parsed)
      }
    } catch {}

    // Load saved orders from localStorage if available
    try {
      const savedOrders = localStorage.getItem("restro_pos_orders")
      if (savedOrders) {
        const parsed = JSON.parse(savedOrders)
        if (Array.isArray(parsed) && parsed.length > 0) setOrders(parsed)
      }
    } catch {}

    // Parse session authentication cookies
    const roleCookie = document.cookie.replace(
      /(?:(?:^|.*)\s*user_role\s*=\s*([^;]*).*$)|^.*$/,
      "$1"
    )
    const posCookie = document.cookie.replace(
      /(?:(?:^|.*)\s*pos_role\s*=\s*([^;]*).*$)|^.*$/,
      "$1"
    )

    // Unauthenticated access guard: redirect to login if no active session
    if (!roleCookie) {
      window.location.href = "/restaurant-admin/login"
      return
    }

    const roleParam = searchParams.get("role")
    const posRoleParam = searchParams.get("posRole")
    const tabParam = searchParams.get("tab")

    let determinedRole: UserType = "restaurant-admin"
    let determinedPosRole: PosRole = "orders"

    // Role resolution strictly anchored to verified session cookie
    if (roleCookie === "super-admin") {
      if (roleParam === "restaurant-admin") {
        determinedRole = "restaurant-admin"
      } else if (roleParam === "pos-kitchen" || (roleParam === "pos-staff" && posRoleParam === "kitchen")) {
        determinedRole = "pos-staff"
        determinedPosRole = "kitchen"
      } else if (roleParam === "pos-reception" || (roleParam === "pos-staff" && posRoleParam === "reception")) {
        determinedRole = "pos-staff"
        determinedPosRole = "reception"
      } else if (roleParam === "pos-orders" || (roleParam === "pos-staff" && posRoleParam === "orders")) {
        determinedRole = "pos-staff"
        determinedPosRole = "orders"
      } else {
        determinedRole = "super-admin"
      }
    } else if (roleCookie === "restaurant-admin") {
      if (roleParam === "pos-kitchen" || (roleParam === "pos-staff" && posRoleParam === "kitchen")) {
        determinedRole = "pos-staff"
        determinedPosRole = "kitchen"
      } else if (roleParam === "pos-reception" || (roleParam === "pos-staff" && posRoleParam === "reception")) {
        determinedRole = "pos-staff"
        determinedPosRole = "reception"
      } else if (roleParam === "pos-orders" || (roleParam === "pos-staff" && posRoleParam === "orders")) {
        determinedRole = "pos-staff"
        determinedPosRole = "orders"
      } else {
        determinedRole = "restaurant-admin"
      }
    } else if (roleCookie === "pos-kitchen" || (roleCookie === "pos-staff" && posCookie === "kitchen")) {
      determinedRole = "pos-staff"
      determinedPosRole = "kitchen"
    } else if (roleCookie === "pos-reception" || (roleCookie === "pos-staff" && posCookie === "reception")) {
      determinedRole = "pos-staff"
      determinedPosRole = "reception"
    } else if (roleCookie === "pos-orders" || (roleCookie === "pos-staff" && posCookie === "orders")) {
      determinedRole = "pos-staff"
      determinedPosRole = "orders"
    } else {
      determinedRole = "pos-staff"
      determinedPosRole = "orders"
    }

    setUserType(determinedRole)
    setPosRole(determinedPosRole)
    if (determinedPosRole === "kitchen") {
      setKdsStationFilter("kitchen")
    } else if (roleParam === "pos-bar" || roleParam === "bar") {
      setKdsStationFilter("bar")
    }

    if (tabParam) {
      setActiveTab(tabParam)
    } else {
      // Default tab based on role
      if (determinedRole === "super-admin") {
        setActiveTab("tenants")
      } else if (determinedRole === "pos-staff") {
        if (determinedPosRole === "kitchen") setActiveTab("kds")
        else if (determinedPosRole === "reception") setActiveTab("tables")
        else setActiveTab("pos")
      } else {
        setActiveTab("tables")
      }
    }
  }, [searchParams])

  // Safety guard: ensure active tab matches allowed menus for the current role
  useEffect(() => {
    if (userType === "pos-staff") {
      if (posRole === "orders" && !["pos", "orders"].includes(activeTab)) {
        setActiveTab("pos")
      } else if (posRole === "reception" && !["tables", "reservations", "customers"].includes(activeTab)) {
        setActiveTab("tables")
      } else if (posRole === "kitchen" && !["kds"].includes(activeTab)) {
        setActiveTab("kds")
      }
    } else if (userType === "super-admin" && !["tenants", "subscriptions", "analytics", "audit", "platform-settings"].includes(activeTab)) {
      setActiveTab("tenants")
    }
  }, [userType, posRole])

  // Toggle Night Mode function
  const toggleTheme = () => {
    setIsDarkMode((prev) => {
      const nextMode = !prev
      if (nextMode) {
        document.documentElement.classList.add("dark")
        localStorage.setItem("orderrestro_theme", "dark")
      } else {
        document.documentElement.classList.remove("dark")
        localStorage.setItem("orderrestro_theme", "light")
      }
      return nextMode
    })
  }

  // Switch User Type Handler
  const handleUserTypeChange = (newType: UserType) => {
    setUserType(newType)
    if (newType === "restaurant-admin") {
      document.cookie = `user_role=restaurant-admin; path=/; max-age=86400`
      setActiveTab("tables")
    } else if (newType === "pos-staff") {
      document.cookie = `user_role=pos-${posRole}; path=/; max-age=86400`
      document.cookie = `pos_role=${posRole}; path=/; max-age=86400`
      if (posRole === "orders") setActiveTab("pos")
      else if (posRole === "reception") setActiveTab("tables")
      else if (posRole === "kitchen") setActiveTab("kds")
    } else if (newType === "super-admin") {
      document.cookie = `user_role=super-admin; path=/; max-age=86400`
      setActiveTab("tenants")
    }
  }

  // Switch POS Staff Sub-role Handler (Orders, Reception, Kitchen)
  const handlePosRoleChange = (newPosRole: PosRole) => {
    setPosRole(newPosRole)
    document.cookie = `user_role=pos-${newPosRole}; path=/; max-age=86400`
    document.cookie = `pos_role=${newPosRole}; path=/; max-age=86400`
    if (newPosRole === "orders") {
      setActiveTab("pos")
    } else if (newPosRole === "reception") {
      setActiveTab("tables")
    } else if (newPosRole === "kitchen") {
      setActiveTab("kds")
    }
  }

  // --- TABLES STATE ---
  const [tables, setTables] = useState<TableItem[]>(DEFAULT_TABLES_LIST)
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null)
  const [tableValidationError, setTableValidationError] = useState(false)
  const [showQrModal, setShowQrModal] = useState<TableItem | null>(null)
  const [showWaitlistModal, setShowWaitlistModal] = useState(false)
  const [waitlist, setWaitlist] = useState<Array<{ name: string; guests: number; time: string }>>([])
  const [waitlistName, setWaitlistName] = useState("")
  const [waitlistGuests, setWaitlistGuests] = useState(2)

  // Persist tables to localStorage
  useEffect(() => {
    if (typeof window !== "undefined" && tables.length > 0) {
      try {
        localStorage.setItem("restro_pos_tables", JSON.stringify(tables))
      } catch {}
    }
  }, [tables])

  const setTableStatus = async (status: TableItem["status"]) => {
    if (selectedTableId === null) return
    const targetId = selectedTableId
    const nextIsOpen = status === "occupied"
    setTables((prev) =>
      prev.map((t) => (t.id === targetId ? { ...t, status, isOpen: nextIsOpen } : t))
    )
    setSelectedTableId(null)

    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        const bc = new BroadcastChannel("restro_sync_channel")
        bc.postMessage({ type: "table_updated", table_id: targetId, status, isOpen: nextIsOpen })
        bc.close()
      }
      await fetch("/api/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table_id: targetId, status, isOpen: nextIsOpen }),
      })
    } catch {}
  }

  const toggleTableCode = async (tableId: number) => {
    let nextState = false
    let nextStatus: TableItem["status"] = "available"
    setTables((prev) =>
      prev.map((t) => {
        if (t.id === tableId) {
          nextState = !t.isOpen
          nextStatus = nextState ? "occupied" : "available"
          return {
            ...t,
            isOpen: nextState,
            orderCode: nextState ? `ORD-${Math.floor(100 + Math.random() * 900)}` : undefined,
            status: nextStatus,
          }
        }
        return t
      })
    )

    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        const bc = new BroadcastChannel("restro_sync_channel")
        bc.postMessage({
          type: "table_updated",
          table_id: tableId,
          status: nextStatus,
          isOpen: nextState,
        })
        bc.close()
      }
      await fetch("/api/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table_id: tableId,
          status: nextStatus,
          isOpen: nextState,
        }),
      })
    } catch {}
  }

  // --- POS STATE ---
  const [posCategory, setPosCategory] = useState("all")
  const [posSearch, setPosSearch] = useState("")
  const [posOrderType, setPosOrderType] = useState<"dine-in" | "takeaway" | "delivery">("dine-in")
  const [cart, setCart] = useState<CartItem[]>([])
  const [orderSentToast, setOrderSentToast] = useState(false)

  const menuCatalog = [
    { id: "m1", name: "Classic Wagyu Burger", price: 16.50, category: "mains", icon: "🍔", tag: "Popular" },
    { id: "m2", name: "Truffle Mushroom Pasta", price: 18.00, category: "mains", icon: "🍝", tag: "Chef Special" },
    { id: "m3", name: "Margherita Artisan Pizza", price: 14.50, category: "mains", icon: "🍕", tag: "" },
    { id: "m4", name: "Crispy Truffle Fries", price: 8.00, category: "sides", icon: "🍟", tag: "Crispy" },
    { id: "m5", name: "Caesar Salad Bowl", price: 9.50, category: "sides", icon: "🥗", tag: "Fresh" },
    { id: "m6", name: "Grilled Chicken Wings", price: 11.00, category: "sides", icon: "🍗", tag: "Spicy" },
    { id: "m7", name: "Craft IPA Beer", price: 7.50, category: "drinks", icon: "🍺", tag: "Cold" },
    { id: "m8", name: "Iced Caramel Macchiato", price: 5.50, category: "drinks", icon: "☕", tag: "" },
    { id: "m9", name: "Sparkling Berry Fizz", price: 4.50, category: "drinks", icon: "🍹", tag: "" },
    { id: "m10", name: "Molten Lava Cake", price: 8.50, category: "desserts", icon: "🍰", tag: "Warm" },
    { id: "m11", name: "Artisan Tiramisu", price: 7.50, category: "desserts", icon: "🧁", tag: "" },
    { id: "m12", name: "Gelato Trio", price: 6.00, category: "desserts", icon: "🍨", tag: "" },
  ]

  const addToCart = (item: typeof menuCatalog[0]) => {
    setCart((prev) => {
      const exists = prev.find((i) => i.id === item.id)
      if (exists) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      }
      return [...prev, { id: item.id, name: item.name, price: item.price, quantity: 1 }]
    })
  }

  const updateCartQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => (i.id === id ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0)
    )
  }

  const subtotal = cart.reduce((acc, i) => acc + i.price * i.quantity, 0)
  const tax = subtotal * 0.08
  const total = subtotal + tax

  // --- ORDERS STATE ---
  const [ordersFilter, setOrdersFilter] = useState("all")
  const [orders, setOrders] = useState<SupabaseOrder[]>([])
  const [activeOrderMenuId, setActiveOrderMenuId] = useState<string | null>(null)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [restaurantId, setRestaurantId] = useState("")
  const [outletId, setOutletId] = useState<string | null>(null)
  const [userId, setUserId] = useState("")

  // Save orders to localStorage whenever updated
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("restro_pos_orders", JSON.stringify(orders))
      } catch {}
    }
  }, [orders])

  // Close order actions menu when clicking outside
  useEffect(() => {
    const handleDocClick = () => setActiveOrderMenuId(null)
    if (activeOrderMenuId) {
      document.addEventListener("click", handleDocClick)
      return () => document.removeEventListener("click", handleDocClick)
    }
  }, [activeOrderMenuId])

  // Extract tenant context from cookies on mount
  useEffect(() => {
    // Parse restaurant_id from session cookie
    const restaurantCookie = document.cookie.match(
      /(?:(?:^|.)*restaurant_id=([^;])*)/
    )?.[1]
    
    // Parse outlet_id from session cookie
    const outletCookie = document.cookie.match(
      /(?:(?:^|.)*outlet_id=([^;])*)/
    )?.[1]
    
    setRestaurantId(restaurantCookie || "")
    setOutletId(outletCookie ? outletCookie : null)
    
    // Get user ID from Supabase auth
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id)
      }
    })
  }, [])

  const fetchTables = async () => {
    try {
      const res = await fetch("/api/tables")
      if (res.ok) {
        const data = await res.json()
        if (data.tables && Array.isArray(data.tables)) {
          setTables(data.tables)
        }
      }
    } catch {}
  }

  // Fetch orders and tables with 3s background polling
  useEffect(() => {
    fetchOrders()
    fetchTables()
    const interval = setInterval(() => {
      fetchOrders()
      fetchTables()
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  // Cross-tab synchronization via BroadcastChannel
  useEffect(() => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window)) return

    const channel = new BroadcastChannel("restro_sync_channel")
    channel.onmessage = (event) => {
      if (!event.data) return
      if (event.data.type === "new_order" && event.data.order) {
        const newOrd = event.data.order as SupabaseOrder
        setOrders((prev) => {
          const updated = [newOrd, ...prev.filter((o) => o.id !== newOrd.id)]
          try {
            localStorage.setItem("restro_pos_orders", JSON.stringify(updated))
          } catch {}
          return updated
        })
        if (newOrd.table_id) {
          setTables((prev) =>
            prev.map((t) => {
              const m1 = t.name.toLowerCase().trim() === String(newOrd.table_id).toLowerCase().trim()
              const m2 = `table ${t.id}` === String(newOrd.table_id).toLowerCase().trim()
              const m3 = `table 0${t.id}` === String(newOrd.table_id).toLowerCase().trim()
              if (m1 || m2 || m3) {
                return { ...t, status: "occupied", isOpen: true }
              }
              return t
            })
          )
        }
      } else if (event.data.type === "table_updated") {
        const { table_id, status } = event.data
        setTables((prev) =>
          prev.map((t) => {
            if (t.id === Number(table_id) || t.name.toLowerCase() === String(table_id).toLowerCase()) {
              return { ...t, status }
            }
            return t
          })
        )
      } else if (event.data.type === "order_updated") {
        const { order_id, station, stage, kitchen_stage, bar_stage, status, payment_status } = event.data
        setOrders((prev) => {
          const updated = prev.map((o) => {
            if (o.id === order_id || o.order_number === order_id) {
              const up = { ...o }
              if (station === "kitchen" || kitchen_stage) {
                up.kitchen_stage = stage || kitchen_stage
              }
              if (station === "bar" || bar_stage) {
                up.bar_stage = stage || bar_stage
              }
              if (status) up.status = status
              if (payment_status) up.payment_status = payment_status
              return up
            }
            return o
          })
          try {
            localStorage.setItem("restro_pos_orders", JSON.stringify(updated))
          } catch {}
          return updated
        })
      } else if (event.data.type === "item_updated") {
        const { order_id, item_id, item_status } = event.data
        setOrders((prev) => {
          const updated = prev.map((o) => {
            if (o.id === order_id || o.order_number === order_id) {
              return {
                ...o,
                order_items: o.order_items?.map((it: any) =>
                  it.id === item_id ? { ...it, status: item_status } : it
                ),
              }
            }
            return o
          })
          try {
            localStorage.setItem("restro_pos_orders", JSON.stringify(updated))
          } catch {}
          return updated
        })
      } else if (event.data.type === "refresh_orders") {
        fetchOrders()
        fetchTables()
      }
    }

    return () => {
      channel.close()
    }
  }, [])

  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/orders")
      if (res.ok) {
        const data = await res.json()
        if (data.orders && Array.isArray(data.orders)) {
          if (data.orders.length > 0) {
            setOrders(data.orders as SupabaseOrder[])
            try {
              localStorage.setItem("restro_pos_orders", JSON.stringify(data.orders))
            } catch {}
          } else {
            // Check localStorage
            try {
              const saved = localStorage.getItem("restro_pos_orders")
              if (saved) {
                const localOrders = JSON.parse(saved)
                if (Array.isArray(localOrders) && localOrders.length > 0) {
                  setOrders(localOrders)
                }
              }
            } catch {}
          }
          return
        }
      }
    } catch (err) {
      console.warn("Could not fetch orders from API:", err)
    }

    try {
      const { data, error } = await supabase
        .from("Order")
        .select(`
          *,
          OrderItem(*),
          Payment(*)
        `)
        .order("created_at", { ascending: false })

      if (!error && data && data.length > 0) {
        setOrders(data as SupabaseOrder[])
        try {
          localStorage.setItem("restro_pos_orders", JSON.stringify(data))
        } catch {}
      }
    } catch (error: any) {
      console.warn("Direct Supabase fetch note:", error.message)
    }
  }

  // Set up real-time subscription for new and updated orders
  useEffect(() => {
    if (!isSubscribed) {
      const channel = supabase
        .channel("orders_changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "Order" },
          (payload) => {
            if (payload.eventType === "INSERT") {
              setOrders((prev) => [payload.new as SupabaseOrder, ...prev.filter((o) => o.id !== (payload.new as any).id)])
            } else if (payload.eventType === "UPDATE") {
              setOrders((prev) =>
                prev.map((o) => (o.id === (payload.new as any).id ? { ...o, ...(payload.new as any) } : o))
              )
            }
          }
        )
        .on("broadcast", { event: "new_order" }, ({ payload }) => {
          if (payload && payload.order) {
            setOrders((prev) => [payload.order as SupabaseOrder, ...prev.filter((o) => o.id !== payload.order.id)])
          }
        })
        .on("broadcast", { event: "order_updated" }, ({ payload }) => {
          if (payload) {
            setOrders((prev) =>
              prev.map((o) => {
                if (o.id === payload.order_id || o.order_number === payload.order_id) {
                  const updated = { ...o }
                  if (payload.station === "kitchen" || payload.kitchen_stage) {
                    updated.kitchen_stage = payload.stage || payload.kitchen_stage
                  }
                  if (payload.station === "bar" || payload.bar_stage) {
                    updated.bar_stage = payload.stage || payload.bar_stage
                  }
                  if (payload.status) updated.status = payload.status
                  if (payload.payment_status) updated.payment_status = payload.payment_status
                  return updated
                }
                return o
              })
            )
          }
        })
        .on("broadcast", { event: "item_updated" }, ({ payload }) => {
          if (payload) {
            setOrders((prev) =>
              prev.map((o) => {
                if (o.id === payload.order_id || o.order_number === payload.order_id) {
                  return {
                    ...o,
                    order_items: o.order_items?.map((it: any) =>
                      it.id === payload.item_id ? { ...it, status: payload.item_status } : it
                    ),
                  }
                }
                return o
              })
            )
          }
        })
        .subscribe()

      setIsSubscribed(true)

      // Cleanup on unmount
      return () => {
        supabase.removeChannel(channel)
        setIsSubscribed(false)
      }
    }
  }, [isSubscribed])

  // --- KDS TICKETS STATE (Kitchen/Bar Queue) ---
  const [kdsTickets, setKdsTickets] = useState<KdsTicket[]>([])

  // Keep KDS tickets synchronized with orders list
  useEffect(() => {
    setKdsTickets(buildKdsTicketsFromOrders(orders))
  }, [orders])

  const advanceKdsTicket = async (ticketId: string) => {
    const ticket = kdsTickets.find((t) => t.id === ticketId)
    if (!ticket) return

    let nextStage: "new" | "preparing" | "ready" | "completed" = "new"

    if (ticket.stage === "new") {
      nextStage = "preparing"
    } else if (ticket.stage === "preparing") {
      nextStage = "ready"
    } else if (ticket.stage === "ready") {
      nextStage = "completed"
    }

    const station = ticket.station // "kitchen" | "bar"

    // 1. Optimistically update local orders state ONLY for that station
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === ticket.orderId || o.order_number === ticket.orderId) {
          const updatedOrder = { ...o }
          if (station === "kitchen") {
            updatedOrder.kitchen_stage = nextStage
          } else if (station === "bar") {
            updatedOrder.bar_stage = nextStage
          }

          // Also update items belonging to this station
          if (updatedOrder.order_items) {
            updatedOrder.order_items = updatedOrder.order_items.map((it: any) => {
              const itemIsBar = isBarItem(it.MenuItem?.name || it.name || "")
              if ((station === "bar" && itemIsBar) || (station === "kitchen" && !itemIsBar)) {
                return {
                  ...it,
                  status: nextStage,
                }
              }
              return it
            })
          }

          // Calculate overall order status
          const kStage = updatedOrder.kitchen_stage || "new"
          const bStage = updatedOrder.bar_stage || "new"
          const hasKitchenItems = updatedOrder.order_items?.some((it: any) => !isBarItem(it.MenuItem?.name || it.name || ""))
          const hasBarItems = updatedOrder.order_items?.some((it: any) => isBarItem(it.MenuItem?.name || it.name || ""))

          const kitchenDone = !hasKitchenItems || kStage === "completed"
          const barDone = !hasBarItems || bStage === "completed"

          if (kitchenDone && barDone) {
            updatedOrder.status = "CLOSED"
          } else if (
            (hasKitchenItems && kStage === "ready") ||
            (hasBarItems && bStage === "ready")
          ) {
            updatedOrder.status = "READY"
          } else if (
            (hasKitchenItems && kStage === "preparing") ||
            (hasBarItems && bStage === "preparing")
          ) {
            updatedOrder.status = "PREPARING"
          } else {
            updatedOrder.status = "OPEN"
          }

          return updatedOrder
        }
        return o
      })
    )

    // 2. Broadcast across tabs immediately
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        const bc = new BroadcastChannel("restro_sync_channel")
        bc.postMessage({
          type: "order_updated",
          order_id: ticket.orderId,
          station: station,
          stage: nextStage,
        })
        bc.close()
      }
    } catch {}

    // 3. Persist update to /api/orders
    try {
      await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: ticket.orderId,
          station: station,
          stage: nextStage,
        }),
      })
    } catch (err) {
      console.warn("Could not patch order KDS stage:", err)
    }
  }

  const toggleItemStatus = async (orderId: string, itemId: string) => {
    let targetNewStatus = "ready"
    let targetStation: "kitchen" | "bar" = "kitchen"

    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId || o.order_number === orderId) {
          const updatedItems = o.order_items?.map((it: any) => {
            if (it.id === itemId) {
              const currentStatus = it.status || "new"
              targetNewStatus = currentStatus === "ready" ? "new" : "ready"
              const itemIsBar = isBarItem(it.MenuItem?.name || it.name || "")
              targetStation = itemIsBar ? "bar" : "kitchen"
              return { ...it, status: targetNewStatus }
            }
            return it
          })
          return { ...o, order_items: updatedItems }
        }
        return o
      })
    )

    // Broadcast item update
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        const bc = new BroadcastChannel("restro_sync_channel")
        bc.postMessage({
          type: "item_updated",
          order_id: orderId,
          item_id: itemId,
          item_status: targetNewStatus,
          station: targetStation,
        })
        bc.close()
      }
    } catch {}

    // Persist to API
    try {
      await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: orderId,
          item_id: itemId,
          item_status: targetNewStatus,
        }),
      })
    } catch (err) {
      console.warn("Could not patch item status:", err)
    }
  }

  const updatePaymentStatus = async (orderId: string, newPaymentStatus: "PAID" | "UNPAID") => {
    setActiveOrderMenuId(null)

    // 1. Optimistically update local orders
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId || o.order_number === orderId) {
          return {
            ...o,
            payment_status: newPaymentStatus,
            Payment: newPaymentStatus === "PAID" ? [
              {
                id: `pay_${Date.now()}`,
                order_id: o.id,
                amount: o.total_amount,
                status: "PAID",
                payment_method: "MANUAL",
                recorded_at: new Date().toISOString(),
              }
            ] : null,
          }
        }
        return o
      })
    )

    // 2. Broadcast across tabs immediately
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        const bc = new BroadcastChannel("restro_sync_channel")
        bc.postMessage({
          type: "order_updated",
          order_id: orderId,
          payment_status: newPaymentStatus,
        })
        bc.close()
      }
    } catch {}

    // 3. Persist update to /api/orders
    try {
      await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: orderId,
          payment_status: newPaymentStatus,
        }),
      })
    } catch (err) {
      console.warn("Could not patch payment status:", err)
    }
  }

  // --- RESERVATIONS STATE (For Reception & Admin) ---
  const [reservations, setReservations] = useState([
    {
      id: "RES-101",
      guestName: "Alexander Wright",
      phone: "+1 (555) 234-8891",
      guests: 4,
      time: "19:00 Today",
      table: "Table 3",
      status: "Confirmed",
      notes: "Window booth preferred, celebrating anniversary"
    },
    {
      id: "RES-102",
      guestName: "Sophia Martinez",
      phone: "+1 (555) 412-9903",
      guests: 2,
      time: "19:30 Today",
      table: "Table 1",
      status: "Arrived",
      notes: "First time dining, VIP guest"
    },
    {
      id: "RES-103",
      guestName: "Marcus Sterling",
      phone: "+1 (555) 872-3310",
      guests: 6,
      time: "20:15 Today",
      table: "Table 6",
      status: "Confirmed",
      notes: "Corporate dinner, pre-ordered wine"
    },
    {
      id: "RES-104",
      guestName: "Emma Watson",
      phone: "+1 (555) 601-7744",
      guests: 2,
      time: "21:00 Today",
      table: "Table 2",
      status: "Waitlist",
      notes: "Requested quiet corner"
    }
  ])
  const [showAddResModal, setShowAddResModal] = useState(false)
  const [newResGuest, setNewResGuest] = useState("")
  const [newResPhone, setNewResPhone] = useState("")
  const [newResSeats, setNewResSeats] = useState(2)
  const [newResTime, setNewResTime] = useState("19:30")
  const [newResTable, setNewResTable] = useState("Table 1")

  // --- CUSTOMER DIRECTORY STATE (For Reception & Admin) ---
  const [customersSearch, setCustomersSearch] = useState("")
  const [customersList] = useState([
    {
      id: "CUST-01",
      name: "Alexander Wright",
      phone: "+1 (555) 234-8891",
      email: "a.wright@corp.com",
      visits: 14,
      totalSpend: "$1,420.50",
      loyalty: "VIP Platinum",
      lastVisit: "Yesterday",
      prefTable: "Table 3 (Booth)",
      allergies: "None"
    },
    {
      id: "CUST-02",
      name: "Sophia Martinez",
      phone: "+1 (555) 412-9903",
      email: "sophia.m@design.org",
      visits: 4,
      totalSpend: "$298.00",
      loyalty: "Silver",
      lastVisit: "3 days ago",
      prefTable: "Table 1",
      allergies: "Gluten Sensitive"
    },
    {
      id: "CUST-03",
      name: "Marcus Sterling",
      phone: "+1 (555) 872-3310",
      email: "m.sterling@capital.com",
      visits: 22,
      totalSpend: "$3,180.00",
      loyalty: "VIP Gold",
      lastVisit: "Oct 28",
      prefTable: "Table 6 (Executive)",
      allergies: "Shellfish Allergy"
    },
    {
      id: "CUST-04",
      name: "David Chen",
      phone: "+1 (555) 901-2244",
      email: "dchen@tech.io",
      visits: 8,
      totalSpend: "$760.00",
      loyalty: "Gold",
      lastVisit: "Nov 02",
      prefTable: "Table 4",
      allergies: "None"
    },
    {
      id: "CUST-05",
      name: "Olivia Brown",
      phone: "+1 (555) 345-6671",
      email: "olivia.b@studio.net",
      visits: 5,
      totalSpend: "$390.00",
      loyalty: "Silver",
      lastVisit: "Last week",
      prefTable: "Table 7",
      allergies: "Nut Allergy"
    }
  ])

  // --- KDS STATIONS FILTER ---
  const [kdsStationFilter, setKdsStationFilter] = useState<"all" | "kitchen" | "bar">("all")

  // --- MENUS PER USER TYPE & POS SUB-ROLES ---
  const adminMenuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "pos", label: "Point of Sale", icon: ShoppingCart },
    { id: "orders", label: "Orders", icon: FileText, badge: true },
    { id: "tables", label: "Tables", icon: LayoutGrid },
    { id: "reservations", label: "Reservations", icon: CalendarCheck },
    { id: "menu", label: "Menu", icon: Utensils },
    { id: "kds", label: "Kitchen Display", icon: ChefHat },
    { id: "customers", label: "Customers", icon: Users },
    { id: "inventory", label: "Inventory", icon: Boxes, badge: true },
    { id: "my-deliveries", label: "My deliveries", icon: Bike },
    { id: "delivery", label: "Delivery", icon: Truck },
    { id: "team", label: "Team", icon: UserCheck },
    { id: "accounting", label: "Accounting", icon: Landmark },
    { id: "reports", label: "Reports", icon: BarChart3 },
    { id: "marketing", label: "Marketing", icon: Megaphone },
    { id: "operations", label: "Operations", icon: Sliders },
    { id: "attendance", label: "Attendance", icon: Clock },
    { id: "settings", label: "Settings", icon: Settings },
  ]

  // POS Staff 3 Role-Based Menus (Orders, Reception, Kitchen)
  const posOrdersMenuItems = [
    { id: "pos", label: "Point Of Sale", icon: ShoppingCart },
    { id: "orders", label: "Orders Feed", icon: FileText, badge: true },
  ]

  const posReceptionMenuItems = [
    { id: "tables", label: "Table & Floor", icon: LayoutGrid },
    { id: "reservations", label: "Reservation & Waitlist", icon: CalendarCheck },
    { id: "customers", label: "Customer Lookup", icon: Users },
  ]

  const posKitchenMenuItems = [
    { id: "kds", label: "Kitchen/Bar Queue", icon: ChefHat, badge: true },
  ]

  const superAdminMenuItems = [
    { id: "tenants", label: "Tenant Restaurants", icon: Building2 },
    { id: "subscriptions", label: "Subscription Plans", icon: CreditCard },
    { id: "analytics", label: "Platform Analytics", icon: BarChart3 },
    { id: "audit", label: "Security & Logs", icon: ShieldCheck },
    { id: "platform-settings", label: "Platform Settings", icon: Settings },
  ]

  const activeNavigationItems =
    userType === "super-admin"
      ? superAdminMenuItems
      : userType === "pos-staff"
      ? posRole === "orders"
        ? posOrdersMenuItems
        : posRole === "reception"
        ? posReceptionMenuItems
        : posKitchenMenuItems
      : adminMenuItems

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-[#0e0f12] flex items-center justify-center text-slate-400">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-[#8b5cf6] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">Loading POS...</span>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`min-h-screen flex flex-col font-sans select-none antialiased transition-colors duration-200 ${
        isDarkMode ? "bg-[#0e0f12] text-slate-100" : "bg-slate-100 text-slate-900"
      }`}
    >
      {/* Top Production Status Bar */}
      <div
        className={`px-4 py-1.5 text-xs font-medium flex items-center justify-between border-b shrink-0 ${
          isDarkMode
            ? "bg-[#141620] border-[#202330] text-slate-300"
            : "bg-slate-100 border-slate-200 text-slate-700"
        }`}
      >
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold text-white">Nodedr Bistro</span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-400">Downtown Main Outlet</span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span
            className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
              userType === "super-admin"
                ? "bg-red-500/20 text-red-300 border border-red-500/30"
                : userType === "restaurant-admin"
                ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
            }`}
          >
            {userType === "super-admin"
              ? "Super Admin Mode"
              : userType === "restaurant-admin"
              ? "Restaurant Management Mode"
              : `POS Station: ${posRole.toUpperCase()}`}
          </span>
          <button
            onClick={handleSignOut}
            className="text-slate-400 hover:text-red-400 flex items-center gap-1 transition text-xs cursor-pointer ml-1"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* 2. Left Sidebar Navigation */}
        <aside
          className={`${
            sidebarOpen ? "w-[240px]" : "w-0 -translate-x-full md:w-[68px] md:translate-x-0"
          } ${
            isDarkMode
              ? "bg-[#111217] border-[#1e2029]"
              : "bg-white border-slate-200 shadow-xs"
          } border-r flex flex-col shrink-0 transition-all duration-200 overflow-hidden z-30`}
        >
          {/* Logo & Brand Header */}
          <div
            className={`p-4 flex items-center gap-3 border-b ${
              isDarkMode ? "border-[#1e2029]/60" : "border-slate-100"
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
                isDarkMode
                  ? "bg-[#1e202b] border-[#2e3240]"
                  : "bg-purple-50 border-purple-200"
              }`}
            >
              {userType === "super-admin" ? (
                <ShieldCheck className="w-4 h-4 text-red-400" />
              ) : (
                <Utensils className="w-4 h-4 text-purple-600" />
              )}
            </div>
            {sidebarOpen && (
              <span
                className={`font-bold text-sm tracking-tight truncate ${
                  isDarkMode ? "text-white" : "text-slate-900"
                }`}
              >
                {userType === "super-admin"
                  ? "Restro Platform"
                  : "Nodedr Bistro"}
              </span>
            )}
          </div>

          {/* Branch / Workspace selector */}
          {sidebarOpen && (
            <div className="px-3 pt-3 pb-1">
              <button
                className={`w-full flex items-center justify-between text-xs font-medium px-3 py-2 rounded-xl transition border ${
                  isDarkMode
                    ? "bg-[#171922] hover:bg-[#1d202b] border-[#232634] text-slate-200"
                    : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Store className="w-3.5 h-3.5 text-slate-400" />
                  <span className="truncate">
                    {userType === "super-admin" ? "All Tenants (Global)" : "Main Branch"}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>

              {userType === "pos-staff" && (
                <div className="mt-1.5 flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-semibold">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                    <span className="truncate">
                      {posRole === "orders"
                        ? "Orders Station"
                        : posRole === "reception"
                        ? "Reception & Floor"
                        : "Kitchen/Bar Queue"}
                    </span>
                  </div>
                  <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 shrink-0">
                    {posRole}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Navigation Links (Filtered strictly by User Type & POS Sub-role) */}
          <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5 scrollbar-thin scrollbar-thumb-slate-800">
            {activeNavigationItems.map((item) => {
              const Icon = item.icon
              const isActive = activeTab === item.id

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? isDarkMode
                        ? "bg-[#2d224d] text-[#c4b5fd] font-semibold shadow-xs"
                        : "bg-purple-100 text-purple-900 font-semibold shadow-xs border border-purple-200"
                      : isDarkMode
                      ? "text-slate-400 hover:text-slate-200 hover:bg-[#181a22]"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive
                          ? isDarkMode
                            ? "text-[#a78bfa]"
                            : "text-purple-700"
                          : "text-slate-400"
                      }`}
                    />
                    {sidebarOpen && <span className="truncate">{item.label}</span>}
                  </div>
                  {sidebarOpen && "badge" in item && item.badge && (
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 shadow-xs shadow-amber-500/50" />
                  )}
                </button>
              )
            })}
          </nav>

          {/* Support & Sign Out Footer */}
          {sidebarOpen && (
            <div
              className={`p-3 border-t space-y-1.5 ${
                isDarkMode ? "border-[#1e2029]" : "border-slate-100"
              }`}
            >
              <button
                onClick={() => alert("Enterprise Support: support@restropos.com")}
                className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-medium transition ${
                  isDarkMode
                    ? "border-[#222533] text-slate-400 hover:text-white hover:bg-[#191b24]"
                    : "border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <Headphones className="w-3.5 h-3.5" />
                <span>Contact support</span>
              </button>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </aside>

        {/* Main Content Workspace */}
        <div
          className={`flex-1 flex flex-col overflow-hidden transition-colors duration-200 ${
            isDarkMode ? "bg-[#0e0f12]" : "bg-slate-50"
          }`}
        >
          {/* Top Bar */}
          <header
            className={`h-14 border-b px-6 flex items-center justify-between shrink-0 gap-4 z-20 ${
              isDarkMode
                ? "bg-[#0e0f12] border-[#1c1e27]"
                : "bg-white border-slate-200 shadow-xs"
            }`}
          >
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition ${
                  isDarkMode
                    ? "text-slate-400 hover:text-white hover:bg-[#1a1c24]"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <PanelLeft className="w-4 h-4" />
              </button>
              <h2
                className={`font-semibold text-sm hidden md:block ${
                  isDarkMode ? "text-slate-200" : "text-slate-800"
                }`}
              >
                {userType === "super-admin"
                  ? "Platform Administration"
                  : userType === "pos-staff"
                  ? posRole === "orders"
                    ? "Nodedr Bistro · Orders Station"
                    : posRole === "reception"
                    ? "Nodedr Bistro · Reception & Floor"
                    : "Nodedr Bistro · Kitchen/Bar Queue"
                  : "Nodedr Bistro"}
              </h2>
            </div>

            {/* Authenticated Role & Station Badge */}
            <div className="flex items-center gap-2">
              {userType === "restaurant-admin" && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-950/40 border border-purple-800/40 text-purple-300 text-xs font-semibold">
                  <Utensils className="w-3.5 h-3.5 text-purple-400" />
                  <span>Restaurant Admin</span>
                  <span className="text-[10px] text-purple-400/80 font-normal hidden sm:inline">• Full Management</span>
                </div>
              )}
              {userType === "super-admin" && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-950/40 border border-red-800/40 text-red-300 text-xs font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-red-400" />
                  <span>Super Admin Platform</span>
                  <span className="text-[10px] text-red-400/80 font-normal hidden sm:inline">• Multi-Tenant</span>
                </div>
              )}
              {userType === "pos-staff" && (
                <div
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                    posRole === "orders"
                      ? "bg-blue-950/40 border-blue-800/40 text-blue-300"
                      : posRole === "reception"
                      ? "bg-emerald-950/40 border-emerald-800/40 text-emerald-300"
                      : "bg-amber-950/40 border-amber-800/40 text-amber-300"
                  }`}
                >
                  {posRole === "orders" ? (
                    <>
                      <ShoppingCart className="w-3.5 h-3.5 text-blue-400" />
                      <span>Orders Station</span>
                      <span className="text-[10px] opacity-75 font-normal hidden sm:inline">• Counter POS</span>
                    </>
                  ) : posRole === "reception" ? (
                    <>
                      <CalendarCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Reception Desk</span>
                      <span className="text-[10px] opacity-75 font-normal hidden sm:inline">• Floor & Waitlist</span>
                    </>
                  ) : (
                    <>
                      <ChefHat className="w-3.5 h-3.5 text-amber-400" />
                      <span>Kitchen Display Queue</span>
                      <span className="text-[10px] opacity-75 font-normal hidden sm:inline">• Bar & Cooking</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-3">
              <button
                className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium ${
                  isDarkMode
                    ? "border-[#252836] bg-[#161821] text-slate-300"
                    : "border-slate-200 bg-slate-50 text-slate-700"
                }`}
              >
                <span className="text-slate-400">文A</span>
                <span>EN</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              <div className="relative">
                <button
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition ${
                    isDarkMode
                      ? "text-slate-300 hover:text-white hover:bg-[#1a1c24]"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <Bell className="w-4 h-4" />
                </button>
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#8b5cf6] text-white text-[10px] font-bold flex items-center justify-center">
                  4
                </span>
              </div>

              {/* Night Mode Toggle Button (Interactive Moon / Sun) */}
              <button
                onClick={toggleTheme}
                aria-label={isDarkMode ? "Switch to Day Mode" : "Switch to Night Mode"}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition cursor-pointer border ${
                  isDarkMode
                    ? "text-amber-400 hover:text-amber-300 hover:bg-[#1a1c24] border-[#252836] bg-[#161821]"
                    : "text-slate-700 hover:text-slate-900 hover:bg-slate-200 border-slate-200 bg-white"
                }`}
                title={isDarkMode ? "Switch to Day/Light Mode" : "Switch to Night/Dark Mode"}
              >
                {isDarkMode ? (
                  <Sun className="w-4 h-4 text-amber-400 animate-in fade-in zoom-in-75 duration-200" />
                ) : (
                  <Moon className="w-4 h-4 text-slate-700 animate-in fade-in zoom-in-75 duration-200" />
                )}
              </button>

              {/* Profile Avatar & Interactive Sign Out Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className={`flex items-center gap-2 pl-2 border-l cursor-pointer transition ${
                    isDarkMode ? "border-[#20232e]" : "border-slate-200"
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-full text-white font-bold text-xs flex items-center justify-center shadow-xs ${
                      userType === "super-admin"
                        ? "bg-red-600"
                        : userType === "pos-staff"
                        ? posRole === "orders"
                          ? "bg-blue-600"
                          : posRole === "reception"
                          ? "bg-emerald-600"
                          : "bg-amber-600"
                        : "bg-[#8b5cf6]"
                    }`}
                  >
                    {userType === "super-admin"
                      ? "SA"
                      : userType === "pos-staff"
                      ? posRole === "orders"
                        ? "ORD"
                        : posRole === "reception"
                        ? "REC"
                        : "KIT"
                      : "RA"}
                  </div>
                  <div className="text-left hidden lg:block">
                    <div
                      className={`text-xs font-semibold leading-none ${
                        isDarkMode ? "text-slate-200" : "text-slate-800"
                      }`}
                    >
                      {userType === "super-admin"
                        ? "Super Admin"
                        : userType === "pos-staff"
                        ? posRole === "orders"
                          ? "Orders Cashier"
                          : posRole === "reception"
                          ? "Reception Host"
                          : "Kitchen Chef"
                        : "Restaurant Admin"}
                    </div>
                    <div className="text-[10px] text-slate-400 capitalize">
                      {userType === "super-admin"
                        ? "Platform Owner"
                        : userType === "pos-staff"
                        ? `${posRole} Station`
                        : "Downtown Outlet"}
                    </div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden lg:block" />
                </button>

                {/* Profile Popup Menu */}
                {showProfileMenu && (
                  <div
                    className={`absolute right-0 mt-2 w-56 rounded-2xl shadow-2xl p-2 z-50 border text-xs animate-in fade-in zoom-in-95 duration-150 ${
                      isDarkMode
                        ? "bg-[#181a26] border-[#2b2e40] text-slate-200"
                        : "bg-white border-slate-200 text-slate-800 shadow-xl"
                    }`}
                  >
                    <div className="p-2 border-b border-inherit space-y-0.5">
                      <p className="font-bold text-xs text-white">
                        {userType === "super-admin"
                          ? "Super Admin Account"
                          : userType === "pos-staff"
                          ? `POS ${posRole.toUpperCase()} Terminal`
                          : "Restaurant Manager"}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">Nodedr Bistro • Main Outlet</p>
                    </div>
                    <div className="py-1">
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-red-400 hover:bg-red-500/10 font-semibold transition text-left cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out of Session</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Main Module Content */}
          <main className="flex-1 overflow-y-auto p-6 lg:p-8">
            {activeTab === "tables" ? (
              /* --- TABLES VIEW --- */
              <div className="space-y-6 max-w-[1440px] mx-auto">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h1
                      className={`text-3xl font-bold tracking-tight ${
                        isDarkMode ? "text-white" : "text-slate-900"
                      }`}
                    >
                      Tables
                    </h1>
                    <p
                      className={`text-sm mt-1 ${
                        isDarkMode ? "text-slate-400" : "text-slate-500"
                      }`}
                    >
                      Live floor status — tap a table to update it
                    </p>
                  </div>
                  <button
                    onClick={() => alert("Edit Floor Plan")}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-medium transition ${
                      isDarkMode
                        ? "border-[#272a38] bg-[#161822] hover:bg-[#1d202c] text-slate-300"
                        : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-xs"
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    Edit floor plan
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                  {/* Left: Floor Map Container */}
                  <div className="lg:col-span-2 space-y-4">
                    <div
                      className={`rounded-2xl p-6 sm:p-8 min-h-[420px] relative border ${
                        isDarkMode
                          ? "bg-[#14161f] border-[#202330]"
                          : "bg-white border-slate-200 shadow-xs"
                      }`}
                    >
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
                        {tables.map((table) => {
                          const isAvailable = table.status === "available"
                          const isOccupied = table.status === "occupied"
                          const isReserved = table.status === "reserved"
                          const isSelected = selectedTableId === table.id

                          return (
                            <div key={table.id} className="relative">
                              <button
                                onClick={() =>
                                  setSelectedTableId(isSelected ? null : table.id)
                                }
                                className={`w-full h-24 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all relative border ${
                                  isAvailable
                                    ? isDarkMode
                                      ? "bg-[#0b2920] border-[#10b981]/50 text-emerald-300 hover:border-emerald-400 shadow-lg shadow-emerald-950/20"
                                      : "bg-emerald-50 border-emerald-300 text-emerald-800 hover:border-emerald-400 shadow-xs"
                                    : isOccupied
                                    ? isDarkMode
                                      ? "bg-[#142340] border-[#3b82f6]/50 text-blue-300 hover:border-blue-400 shadow-lg shadow-blue-950/20"
                                      : "bg-blue-50 border-blue-300 text-blue-800 hover:border-blue-400 shadow-xs"
                                    : isReserved
                                    ? isDarkMode
                                      ? "bg-[#332014] border-[#f59e0b]/50 text-amber-300 hover:border-amber-400 shadow-lg shadow-amber-950/20"
                                      : "bg-amber-50 border-amber-300 text-amber-800 hover:border-amber-400 shadow-xs"
                                    : isDarkMode
                                    ? "bg-[#20222b] border-[#4b5563]/50 text-slate-400"
                                    : "bg-slate-100 border-slate-300 text-slate-600"
                                } ${isSelected ? "ring-2 ring-purple-500 scale-102" : ""}`}
                              >
                                <div className="w-6 h-6 flex items-center justify-center relative">
                                  <div className="absolute -top-0.5 w-2 h-0.5 bg-current rounded-xs opacity-70" />
                                  <div className="absolute -bottom-0.5 w-2 h-0.5 bg-current rounded-xs opacity-70" />
                                  <div className="absolute -left-0.5 h-2 w-0.5 bg-current rounded-xs opacity-70" />
                                  <div className="absolute -right-0.5 h-2 w-0.5 bg-current rounded-xs opacity-70" />
                                  <div className="w-3.5 h-3.5 border-1.5 border-current rounded-xs bg-current/15 flex items-center justify-center">
                                    <div className="w-1 h-1 bg-current rounded-full" />
                                  </div>
                                </div>
                                <span
                                  className={`font-semibold text-xs ${
                                    isDarkMode ? "text-white" : "text-slate-900"
                                  }`}
                                >
                                  {table.name}
                                </span>
                                <div className="flex items-center gap-1 text-[11px] opacity-80">
                                  <Users className="w-3 h-3" />
                                  <span>{table.seats}</span>
                                </div>
                              </button>

                              {/* Dropdown Menu when Table 1 / Selected Table is tapped */}
                              {isSelected && (
                                <div
                                  className={`absolute top-full left-0 mt-2 w-48 rounded-xl shadow-2xl py-1.5 z-40 text-xs border ${
                                    isDarkMode
                                      ? "bg-[#181a24] border-[#2b2f40]"
                                      : "bg-white border-slate-200 text-slate-800 shadow-lg"
                                  }`}
                                >
                                  <div
                                    className={`px-3 py-1.5 font-medium border-b text-[11px] ${
                                      isDarkMode
                                        ? "text-slate-400 border-[#242735]"
                                        : "text-slate-500 border-slate-100"
                                    }`}
                                  >
                                    {table.status.replace("_", " ")} · {table.seats} guests
                                  </div>

                                  <div className="py-1">
                                    <button
                                      onClick={() => setTableStatus("available")}
                                      className={`w-full text-left px-3 py-1.5 flex items-center justify-between transition ${
                                        isDarkMode
                                          ? "text-slate-200 hover:bg-[#222533]"
                                          : "text-slate-700 hover:bg-slate-50"
                                      }`}
                                    >
                                      <span>Available</span>
                                      {table.status === "available" && (
                                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                                      )}
                                    </button>
                                    <button
                                      onClick={() => setTableStatus("occupied")}
                                      className={`w-full text-left px-3 py-1.5 flex items-center justify-between transition ${
                                        isDarkMode
                                          ? "text-slate-200 hover:bg-[#222533]"
                                          : "text-slate-700 hover:bg-slate-50"
                                      }`}
                                    >
                                      <span>Occupied</span>
                                      {table.status === "occupied" && (
                                        <Check className="w-3.5 h-3.5 text-blue-500" />
                                      )}
                                    </button>
                                    <button
                                      onClick={() => setTableStatus("reserved")}
                                      className={`w-full text-left px-3 py-1.5 flex items-center justify-between transition ${
                                        isDarkMode
                                          ? "text-slate-200 hover:bg-[#222533]"
                                          : "text-slate-700 hover:bg-slate-50"
                                      }`}
                                    >
                                      <span>Reserved</span>
                                      {table.status === "reserved" && (
                                        <Check className="w-3.5 h-3.5 text-amber-500" />
                                      )}
                                    </button>
                                    <button
                                      onClick={() => setTableStatus("cleaning")}
                                      className={`w-full text-left px-3 py-1.5 flex items-center justify-between transition ${
                                        isDarkMode
                                          ? "text-slate-200 hover:bg-[#222533]"
                                          : "text-slate-700 hover:bg-slate-50"
                                      }`}
                                    >
                                      <span>Cleaning</span>
                                      {table.status === "cleaning" && (
                                        <Check className="w-3.5 h-3.5 text-slate-500" />
                                      )}
                                    </button>
                                    <button
                                      onClick={() => setTableStatus("out_of_service")}
                                      className={`w-full text-left px-3 py-1.5 flex items-center justify-between transition ${
                                        isDarkMode
                                          ? "text-slate-200 hover:bg-[#222533]"
                                          : "text-slate-700 hover:bg-slate-50"
                                      }`}
                                    >
                                      <span>Out of service</span>
                                      {table.status === "out_of_service" && (
                                        <Check className="w-3.5 h-3.5 text-slate-500" />
                                      )}
                                    </button>
                                  </div>

                                  <div
                                    className={`border-t pt-1 ${
                                      isDarkMode ? "border-[#242735]" : "border-slate-100"
                                    }`}
                                  >
                                    <button
                                      onClick={() => {
                                        setShowQrModal(table)
                                        setSelectedTableId(null)
                                      }}
                                      className={`w-full text-left px-3 py-1.5 flex items-center gap-2 ${
                                        isDarkMode
                                          ? "text-slate-300 hover:bg-[#222533]"
                                          : "text-slate-700 hover:bg-slate-50"
                                      }`}
                                    >
                                      <QrCode className="w-3.5 h-3.5 text-purple-600" />
                                      <span>View QR code</span>
                                    </button>
                                    <button
                                      onClick={() => setActiveTab("pos")}
                                      className={`w-full text-left px-3 py-1.5 flex items-center gap-2 ${
                                        isDarkMode
                                          ? "text-slate-300 hover:bg-[#222533]"
                                          : "text-slate-700 hover:bg-slate-50"
                                      }`}
                                    >
                                      <Plus className="w-3.5 h-3.5 text-emerald-500" />
                                      <span>+ New order</span>
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Table Legend */}
                    <div
                      className={`flex flex-wrap items-center gap-6 text-xs px-2 ${
                        isDarkMode ? "text-slate-400" : "text-slate-600"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
                        <span>Available</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#3b82f6]" />
                        <span>Occupied</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
                        <span>Reserved</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#6b7280]" />
                        <span>Cleaning / out of service</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Waitlist & Guest ordering codes */}
                  <div className="space-y-6">
                    {/* Waitlist Card */}
                    <div
                      className={`rounded-2xl p-5 space-y-3 border ${
                        isDarkMode
                          ? "bg-[#14161f] border-[#202330]"
                          : "bg-white border-slate-200 shadow-xs"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <h3
                          className={`font-bold text-sm ${
                            isDarkMode ? "text-white" : "text-slate-900"
                          }`}
                        >
                          Waitlist
                        </h3>
                        <button
                          onClick={() => setShowWaitlistModal(true)}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition ${
                            isDarkMode
                              ? "border-[#292c3a] bg-[#1a1c26] hover:bg-[#222534] text-slate-200"
                              : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700"
                          }`}
                        >
                          Add to waitlist
                        </button>
                      </div>

                      {waitlist.length === 0 ? (
                        <p
                          className={`text-xs py-3 ${
                            isDarkMode ? "text-slate-500" : "text-slate-400"
                          }`}
                        >
                          No one waiting.
                        </p>
                      ) : (
                        <div className="space-y-2 pt-1">
                          {waitlist.map((w, idx) => (
                            <div
                              key={idx}
                              className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                                isDarkMode
                                  ? "bg-[#1b1d28] border-[#262938]"
                                  : "bg-slate-50 border-slate-200"
                              }`}
                            >
                              <div>
                                <span
                                  className={`font-semibold ${
                                    isDarkMode ? "text-white" : "text-slate-900"
                                  }`}
                                >
                                  {w.name}
                                </span>
                                <div
                                  className={`text-[11px] ${
                                    isDarkMode ? "text-slate-400" : "text-slate-500"
                                  }`}
                                >
                                  {w.guests} guests • {w.time}
                                </div>
                              </div>
                              <button
                                onClick={() =>
                                  setWaitlist((prev) => prev.filter((_, i) => i !== idx))
                                }
                                className="text-slate-400 hover:text-red-500 text-xs p-1"
                              >
                                Seat
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Guest Ordering Codes Card */}
                    <div
                      className={`rounded-2xl p-5 space-y-4 border ${
                        isDarkMode
                          ? "bg-[#14161f] border-[#202330]"
                          : "bg-white border-slate-200 shadow-xs"
                      }`}
                    >
                      <h3
                        className={`font-bold text-sm ${
                          isDarkMode ? "text-white" : "text-slate-900"
                        }`}
                      >
                        Guest ordering codes
                      </h3>
                      <p
                        className={`text-xs leading-relaxed ${
                          isDarkMode ? "text-slate-400" : "text-slate-600"
                        }`}
                      >
                        Guests can look at the menu from the table QR or NFC card, but they can only order after you open the table and give them its code. Paying the bill closes it.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                        {[
                          { id: 4, name: "Table 4" },
                          { id: 5, name: "Table 5" },
                          { id: 6, name: "Table 6" },
                          { id: 7, name: "Table 7" },
                          { id: 8, name: "Table 8" },
                          { id: 1, name: "Table 1" },
                          { id: 2, name: "Table 2" },
                          { id: 3, name: "Table 3" },
                        ].map((t) => {
                          const tableObj = tables.find((item) => item.id === t.id)
                          const isOpen = tableObj?.isOpen || false
                          const code = tableObj?.orderCode

                          return (
                            <div
                              key={t.id}
                              className={`rounded-xl p-2.5 flex items-center justify-between gap-1.5 border ${
                                isDarkMode
                                  ? "bg-[#181a26] border-[#242738]"
                                  : "bg-slate-50 border-slate-200"
                              }`}
                            >
                              <div className="min-w-0">
                                <div
                                  className={`font-semibold text-xs truncate ${
                                    isDarkMode ? "text-white" : "text-slate-900"
                                  }`}
                                >
                                  {t.name}
                                </div>
                                <span
                                  className={`text-[10px] ${
                                    isDarkMode ? "text-slate-500" : "text-slate-400"
                                  }`}
                                >
                                  {isOpen ? code : "Closed"}
                                </span>
                              </div>

                              <button
                                onClick={() => toggleTableCode(t.id)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${
                                  isOpen
                                    ? isDarkMode
                                      ? "bg-slate-700 text-slate-300 hover:bg-slate-600"
                                      : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                                    : "bg-[#9333ea] hover:bg-[#8b5cf6] text-white shadow-xs"
                                }`}
                              >
                                {isOpen ? "Close" : "Open"}
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : activeTab === "pos" ? (
              /* --- POINT OF SALE TERMINAL --- */
              <div className="space-y-4 max-w-[1440px] mx-auto">
                <div className="flex items-center justify-between">
                  <div>
                    <h1
                      className={`text-3xl font-bold tracking-tight ${
                        isDarkMode ? "text-white" : "text-slate-900"
                      }`}
                    >
                      Point of Sale
                    </h1>
                    <p
                      className={`text-sm mt-0.5 ${
                        isDarkMode ? "text-slate-400" : "text-slate-500"
                      }`}
                    >
                      Counter Terminal #01 — Downtown Main Outlet
                    </p>
                  </div>
                  <span
                    className={`text-xs flex items-center gap-1.5 font-medium px-3 py-1.5 rounded-xl border ${
                      isDarkMode
                        ? "text-emerald-400 bg-emerald-950/60 border-emerald-800"
                        : "text-emerald-700 bg-emerald-50 border-emerald-200"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Register Active
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                  {/* Menu Catalog */}
                  <div
                    className={`lg:col-span-2 space-y-4 rounded-2xl p-5 border ${
                      isDarkMode
                        ? "bg-[#14161f] border-[#202330]"
                        : "bg-white border-slate-200 shadow-xs"
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          placeholder="Search items, beverages..."
                          value={posSearch}
                          onChange={(e) => setPosSearch(e.target.value)}
                          className={`w-full rounded-xl pl-10 pr-4 py-2 text-xs focus:outline-none focus:border-purple-500 border ${
                            isDarkMode
                              ? "bg-[#1b1d28] border-[#262938] text-white"
                              : "bg-slate-50 border-slate-200 text-slate-900"
                          }`}
                        />
                      </div>

                      <div className="flex items-center gap-2 overflow-x-auto pb-1">
                        {[
                          { id: "all", label: "All Items" },
                          { id: "mains", label: "Mains & Pizza" },
                          { id: "sides", label: "Sides" },
                          { id: "drinks", label: "Drinks" },
                          { id: "desserts", label: "Desserts" },
                        ].map((cat) => (
                          <button
                            key={cat.id}
                            onClick={() => setPosCategory(cat.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition ${
                              posCategory === cat.id
                                ? "bg-[#8b5cf6] text-white"
                                : isDarkMode
                                ? "bg-[#1b1d28] text-slate-400 hover:text-white"
                                : "bg-slate-100 text-slate-600 hover:text-slate-900"
                            }`}
                          >
                            {cat.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 pt-2">
                      {menuCatalog
                        .filter(
                          (item) =>
                            (posCategory === "all" || item.category === posCategory) &&
                            item.name.toLowerCase().includes(posSearch.toLowerCase())
                        )
                        .map((item) => (
                          <button
                            key={item.id}
                            onClick={() => addToCart(item)}
                            className={`p-3.5 rounded-xl transition-all text-left flex flex-col justify-between group h-32 border ${
                              isDarkMode
                                ? "bg-[#1a1c26] border-[#262938] hover:border-purple-500 hover:shadow-lg"
                                : "bg-slate-50 border-slate-200 hover:border-purple-500 hover:shadow-md"
                            }`}
                          >
                            <div>
                              <div className="flex justify-between items-start">
                                <span className="text-2xl">{item.icon}</span>
                                {item.tag && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300 font-bold border border-purple-300 dark:border-purple-800">
                                    {item.tag}
                                  </span>
                                )}
                              </div>
                              <h4
                                className={`font-semibold text-xs mt-2 truncate ${
                                  isDarkMode ? "text-white" : "text-slate-900"
                                }`}
                              >
                                {item.name}
                              </h4>
                            </div>
                            <div
                              className={`flex justify-between items-center pt-2 border-t ${
                                isDarkMode ? "border-[#232635]" : "border-slate-200"
                              }`}
                            >
                              <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                                ${item.price.toFixed(2)}
                              </span>
                              <span className="w-5 h-5 rounded-md bg-purple-600 text-white flex items-center justify-center text-xs">
                                +
                              </span>
                            </div>
                          </button>
                        ))}
                    </div>
                  </div>

                  {/* Right: Live Cart Bill */}
                  <div
                    className={`rounded-2xl p-5 space-y-4 border ${
                      isDarkMode
                        ? "bg-[#14161f] border-[#202330]"
                        : "bg-white border-slate-200 shadow-xs"
                    }`}
                  >
                    <div
                      className={`flex items-center justify-between pb-2 border-b ${
                        isDarkMode ? "border-[#212432]" : "border-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-purple-600" />
                        <h3
                          className={`font-bold text-sm ${
                            isDarkMode ? "text-white" : "text-slate-900"
                          }`}
                        >
                          Live Ticket #1047
                        </h3>
                      </div>
                      <button
                        onClick={() => setCart([])}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Clear
                      </button>
                    </div>

                    <div
                      className={`grid grid-cols-3 gap-1 p-1 rounded-xl text-xs font-semibold ${
                        isDarkMode ? "bg-[#1b1d28]" : "bg-slate-100"
                      }`}
                    >
                      {(["dine-in", "takeaway", "delivery"] as const).map((type) => (
                        <button
                          key={type}
                          onClick={() => {
                            setPosOrderType(type)
                            setTableValidationError(false)
                            if (type !== "dine-in") setSelectedTableId(null)
                          }}
                          className={`py-1 rounded-lg capitalize transition ${
                            posOrderType === type
                              ? "bg-[#8b5cf6] text-white"
                              : "text-slate-500 hover:text-slate-900"
                          }`}
                        >
                          {type.replace("-", " ")}
                        </button>
                      ))}
                    </div>

                    {posOrderType === "dine-in" && (
                      <div
                        className={`p-2.5 rounded-xl border text-xs space-y-1.5 transition ${
                          tableValidationError && !selectedTableId
                            ? "border-red-500/80 bg-red-500/10"
                            : isDarkMode
                            ? "bg-[#181a24] border-[#252837]"
                            : "bg-slate-50 border-slate-200"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <label
                            htmlFor="pos-table-select"
                            className={`font-semibold text-[11px] flex items-center gap-1.5 ${
                              tableValidationError && !selectedTableId
                                ? "text-red-400 font-bold"
                                : isDarkMode
                                ? "text-slate-300"
                                : "text-slate-700"
                            }`}
                          >
                            <LayoutGrid className="w-3.5 h-3.5 text-purple-400" />
                            <span>Table Number</span>
                            <span className="text-red-400">*</span>
                          </label>
                          {selectedTableId ? (
                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                              Table {selectedTableId} Selected
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 animate-pulse">
                              Mandatory
                            </span>
                          )}
                        </div>

                        <div className="relative">
                          <select
                            id="pos-table-select"
                            value={selectedTableId ?? ""}
                            onChange={(e) => {
                              const val = e.target.value
                              setSelectedTableId(val ? Number(val) : null)
                              setTableValidationError(false)
                            }}
                            className={`w-full text-xs font-medium rounded-lg px-2.5 py-1.5 pr-8 border transition cursor-pointer appearance-none outline-hidden ${
                              tableValidationError && !selectedTableId
                                ? "border-red-500 bg-red-500/10 text-red-300 focus:ring-1 focus:ring-red-500"
                                : isDarkMode
                                ? "bg-[#14161f] border-[#292c3c] text-white hover:border-purple-500/50"
                                : "bg-white border-slate-300 text-slate-900 hover:border-purple-500/50"
                            }`}
                          >
                            <option value="" disabled className="text-slate-400">
                              -- Choose a Table (Required) --
                            </option>
                            {tables.map((t) => (
                              <option
                                key={t.id}
                                value={t.id}
                                className={isDarkMode ? "bg-[#14161f] text-slate-200" : "bg-white text-slate-800"}
                              >
                                {t.name} ({t.seats} Seats) — {t.status === "available" ? "Available" : t.status.toUpperCase()}
                              </option>
                            ))}
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
                            <ChevronDown className="w-3.5 h-3.5" />
                          </div>
                        </div>

                        {tableValidationError && !selectedTableId && (
                          <p className="text-[10px] font-semibold text-red-400 flex items-center gap-1">
                            <span>⚠️</span> Table number is mandatory to place a Dine In order.
                          </p>
                        )}
                      </div>
                    )}

                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {cart.length === 0 ? (
                        <p
                          className={`text-xs text-center py-6 ${
                            isDarkMode ? "text-slate-500" : "text-slate-400"
                          }`}
                        >
                          Ticket is empty.
                        </p>
                      ) : (
                        cart.map((i) => (
                          <div
                            key={i.id}
                            className={`p-2 rounded-xl flex items-center justify-between text-xs border ${
                              isDarkMode
                                ? "bg-[#1a1c26] border-[#242735]"
                                : "bg-slate-50 border-slate-200"
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div
                                className={`font-semibold truncate ${
                                  isDarkMode ? "text-white" : "text-slate-900"
                                }`}
                              >
                                {i.name}
                              </div>
                              <span className="text-purple-600 dark:text-purple-400 font-bold">
                                ${(i.price * i.quantity).toFixed(2)}
                              </span>
                            </div>

                            <div
                              className={`flex items-center gap-1.5 p-1 rounded-lg shrink-0 ${
                                isDarkMode ? "bg-[#222533]" : "bg-white border border-slate-200"
                              }`}
                            >
                              <button
                                onClick={() => updateCartQty(i.id, -1)}
                                className={`w-5 h-5 rounded flex items-center justify-center ${
                                  isDarkMode
                                    ? "bg-[#181a24] text-white hover:bg-slate-700"
                                    : "bg-slate-100 text-slate-800 hover:bg-slate-200"
                                }`}
                              >
                                -
                              </button>
                              <span
                                className={`w-5 text-center font-bold text-xs ${
                                  isDarkMode ? "text-white" : "text-slate-900"
                                }`}
                              >
                                {i.quantity}
                              </span>
                              <button
                                onClick={() => updateCartQty(i.id, 1)}
                                className={`w-5 h-5 rounded flex items-center justify-center ${
                                  isDarkMode
                                    ? "bg-[#181a24] text-white hover:bg-slate-700"
                                    : "bg-slate-100 text-slate-800 hover:bg-slate-200"
                                }`}
                              >
                                +
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div
                      className={`pt-3 border-t space-y-1.5 text-xs ${
                        isDarkMode
                          ? "border-[#212432] text-slate-400"
                          : "border-slate-200 text-slate-600"
                      }`}
                    >
                      <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span
                          className={`font-medium ${
                            isDarkMode ? "text-white" : "text-slate-900"
                          }`}
                        >
                          ${subtotal.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tax (8%)</span>
                        <span
                          className={`font-medium ${
                            isDarkMode ? "text-white" : "text-slate-900"
                          }`}
                        >
                          ${tax.toFixed(2)}
                        </span>
                      </div>
                      <div
                        className={`flex justify-between text-base font-extrabold pt-2 border-t ${
                          isDarkMode
                            ? "border-[#212432] text-white"
                            : "border-slate-200 text-slate-900"
                        }`}
                      >
                        <span>Total Due</span>
                        <span className="text-purple-600 dark:text-[#a78bfa]">
                          ${total.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {orderSentToast && (
                      <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 dark:bg-emerald-950/80 dark:border-emerald-500/40 dark:text-emerald-300 text-xs flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-500" />
                        Ticket dispatched to Kitchen Display!
                      </div>
                    )}

                    {posOrderType === "dine-in" && !selectedTableId && cart.length > 0 && (
                      <p className="text-[11px] font-semibold text-amber-400 text-center py-1 bg-amber-500/10 rounded-lg border border-amber-500/20">
                        Please choose a table number above to proceed
                      </p>
                    )}

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={async () => {
                          if (cart.length === 0) return
                          if (posOrderType === "dine-in" && !selectedTableId) {
                            setTableValidationError(true)
                            return
                          }
                          
                          // Get current table selection
                          const chosenTable = tables.find((t) => t.id === selectedTableId)
                          const tableId = posOrderType === "dine-in"
                            ? (chosenTable?.name || `Table ${selectedTableId}`)
                            : posOrderType === "takeaway"
                            ? "Takeaway"
                            : "Delivery"
                          
                          const orderItems = cart.map((item: any) => ({
                            menuItemId: item.id,
                            name: item.name,
                            quantity: item.quantity,
                            unitPrice: item.price,
                            price: item.price,
                            specialInstructions: item.specialInstructions || "",
                          }))

                          const generatedOrderNum = `ORD-${Math.floor(1000 + Math.random() * 9000)}`
                          const optimisticOrder: SupabaseOrder = {
                            id: `ord_${Date.now()}`,
                            restaurant_id: restaurantId || "demo-restaurant-1",
                            outlet_id: outletId,
                            user_id: userId || "user-default",
                            status: "OPEN",
                            kds_stage: "new",
                            kitchen_stage: "new",
                            bar_stage: "new",
                            order_type: posOrderType,
                            table_id: tableId || (posOrderType === "takeaway" ? "Takeaway" : posOrderType === "delivery" ? "Delivery" : "Counter"),
                            total_amount: total,
                            tax_amount: tax,
                            discount_amount: 0,
                            payment_status: "UNPAID",
                            payment_method: "MANUAL",
                            source: "pos",
                            order_number: generatedOrderNum,
                            notes: null,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                            order_items: orderItems.map((it, idx) => ({
                              id: `item_${Date.now()}_${idx}`,
                              order_id: `ord_${Date.now()}`,
                              menu_item_id: it.menuItemId,
                              quantity: it.quantity,
                              unit_price: it.unitPrice,
                              special_instructions: null,
                              name: it.name,
                              station: isBarItem(it.name) ? "bar" : "kitchen",
                              status: "new",
                              MenuItem: { name: it.name },
                            })),
                            Payment: null,
                          }

                          // Update state immediately
                          setOrders((prev) => [optimisticOrder, ...prev.filter((o) => o.id !== optimisticOrder.id)])

                          // Broadcast to kitchen and other tabs immediately
                          try {
                            if (typeof window !== "undefined" && "BroadcastChannel" in window) {
                              const bc = new BroadcastChannel("restro_sync_channel")
                              bc.postMessage({ type: "new_order", order: optimisticOrder })
                              bc.close()
                            }
                          } catch {}

                          setOrderSentToast(true)
                          setTimeout(() => setOrderSentToast(false), 2500)
                          if (selectedTableId) {
                            const tId = selectedTableId
                            setTables((prev) =>
                              prev.map((t) => (t.id === tId ? { ...t, status: "occupied", isOpen: true } : t))
                            )
                            try {
                              if (typeof window !== "undefined" && "BroadcastChannel" in window) {
                                const bc = new BroadcastChannel("restro_sync_channel")
                                bc.postMessage({ type: "table_updated", table_id: tId, status: "occupied", isOpen: true })
                                bc.close()
                              }
                              fetch("/api/tables", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ table_id: tId, status: "occupied", isOpen: true }),
                              }).catch(() => {})
                            } catch {}
                          }
                          setSelectedTableId(null)
                          setTableValidationError(false)
                          setCart([])
                          setActiveTab("orders")

                          try {
                            const res = await fetch("/api/orders", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                restaurant_id: restaurantId || "restaurant-default",
                                restaurantId: restaurantId || "restaurant-default",
                                outlet_id: outletId,
                                outletId: outletId,
                                user_id: userId || "user-default",
                                userId: userId || "user-default",
                                order_type: posOrderType,
                                orderType: posOrderType,
                                table_id: tableId,
                                tableId: tableId,
                                items: orderItems,
                                total_amount: total,
                                totalAmount: total,
                                tax_amount: tax,
                                taxAmount: tax,
                                discount_amount: 0,
                                discountAmount: 0,
                                payment_status: "UNPAID",
                                paymentStatus: "UNPAID",
                                payment_method: "MANUAL",
                                paymentMethod: "MANUAL",
                                source: "pos",
                                order_number: generatedOrderNum,
                              }),
                            })
                            const data = await res.json()
                            if (data.success && data.order) {
                              setOrders((prev) => [
                                data.order,
                                ...prev.filter((o) => o.id !== optimisticOrder.id && o.id !== data.order.id),
                              ])
                              try {
                                if (typeof window !== "undefined" && "BroadcastChannel" in window) {
                                  const bc = new BroadcastChannel("restro_sync_channel")
                                  bc.postMessage({ type: "new_order", order: data.order })
                                  bc.close()
                                }
                              } catch {}
                            }
                          } catch (err) {
                            console.error("Order creation API error:", err)
                          }
                        }}
                        disabled={cart.length === 0}
                        className={`py-2.5 rounded-xl text-xs font-semibold border transition disabled:opacity-50 ${
                          isDarkMode
                            ? "bg-[#202330] hover:bg-[#282c3c] text-slate-300 border-[#2d3142]"
                            : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                        }`}
                      >
                        Send to Kitchen
                      </button>
                      <button
                        onClick={async () => {
                          if (cart.length === 0) return
                          if (posOrderType === "dine-in" && !selectedTableId) {
                            setTableValidationError(true)
                            return
                          }
                          
                          // Get current table selection
                          const chosenTable = tables.find((t) => t.id === selectedTableId)
                          const tableId = posOrderType === "dine-in"
                            ? (chosenTable?.name || `Table ${selectedTableId}`)
                            : posOrderType === "takeaway"
                            ? "Takeaway"
                            : "Delivery"
                          
                          const orderItems = cart.map((item: any) => ({
                            menuItemId: item.id,
                            name: item.name,
                            quantity: item.quantity,
                            unitPrice: item.price,
                            price: item.price,
                            specialInstructions: item.specialInstructions || "",
                          }))

                          const generatedOrderNum = `ORD-${Math.floor(1000 + Math.random() * 9000)}`
                          const optimisticOrder: SupabaseOrder = {
                            id: `ord_${Date.now()}`,
                            restaurant_id: restaurantId || "demo-restaurant-1",
                            outlet_id: outletId,
                            user_id: userId || "user-default",
                            status: "OPEN",
                            kds_stage: "new",
                            kitchen_stage: "new",
                            bar_stage: "new",
                            order_type: posOrderType,
                            table_id: tableId || (posOrderType === "takeaway" ? "Takeaway" : posOrderType === "delivery" ? "Delivery" : "Counter"),
                            total_amount: total,
                            tax_amount: tax,
                            discount_amount: 0,
                            payment_status: "PAID",
                            payment_method: "MANUAL",
                            source: "pos",
                            order_number: generatedOrderNum,
                            notes: null,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                            order_items: orderItems.map((it, idx) => ({
                              id: `item_${Date.now()}_${idx}`,
                              order_id: `ord_${Date.now()}`,
                              menu_item_id: it.menuItemId,
                              quantity: it.quantity,
                              unit_price: it.unitPrice,
                              special_instructions: null,
                              name: it.name,
                              station: isBarItem(it.name) ? "bar" : "kitchen",
                              status: "new",
                              MenuItem: { name: it.name },
                            })),
                            Payment: [
                              {
                                id: `pay_${Date.now()}`,
                                order_id: `ord_${Date.now()}`,
                                amount: total,
                                status: "PAID",
                                payment_method: "MANUAL",
                                recorded_at: new Date().toISOString(),
                              },
                            ],
                          }

                          // Update state immediately
                          setOrders((prev) => [optimisticOrder, ...prev.filter((o) => o.id !== optimisticOrder.id)])

                          // Broadcast to kitchen and other tabs immediately
                          try {
                            if (typeof window !== "undefined" && "BroadcastChannel" in window) {
                              const bc = new BroadcastChannel("restro_sync_channel")
                              bc.postMessage({ type: "new_order", order: optimisticOrder })
                              bc.close()
                            }
                          } catch {}

                          setOrderSentToast(true)
                          setTimeout(() => setOrderSentToast(false), 2500)
                          if (selectedTableId) {
                            const tId = selectedTableId
                            setTables((prev) =>
                              prev.map((t) => (t.id === tId ? { ...t, status: "occupied", isOpen: true } : t))
                            )
                            try {
                              if (typeof window !== "undefined" && "BroadcastChannel" in window) {
                                const bc = new BroadcastChannel("restro_sync_channel")
                                bc.postMessage({ type: "table_updated", table_id: tId, status: "occupied", isOpen: true })
                                bc.close()
                              }
                              fetch("/api/tables", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ table_id: tId, status: "occupied", isOpen: true }),
                              }).catch(() => {})
                            } catch {}
                          }
                          setSelectedTableId(null)
                          setTableValidationError(false)
                          setCart([])
                          setActiveTab("orders")

                          try {
                            const res = await fetch("/api/orders", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                restaurant_id: restaurantId || "restaurant-default",
                                restaurantId: restaurantId || "restaurant-default",
                                outlet_id: outletId,
                                outletId: outletId,
                                user_id: userId || "user-default",
                                userId: userId || "user-default",
                                order_type: posOrderType,
                                orderType: posOrderType,
                                table_id: tableId,
                                tableId: tableId,
                                items: orderItems,
                                total_amount: total,
                                totalAmount: total,
                                tax_amount: tax,
                                taxAmount: tax,
                                discount_amount: 0,
                                discountAmount: 0,
                                payment_status: "PAID",
                                paymentStatus: "PAID",
                                payment_method: "MANUAL",
                                paymentMethod: "MANUAL",
                                source: "pos",
                                order_number: generatedOrderNum,
                              }),
                            })
                            const data = await res.json()
                            if (data.success && data.order) {
                              setOrders((prev) => [
                                data.order,
                                ...prev.filter((o) => o.id !== optimisticOrder.id && o.id !== data.order.id),
                              ])
                              try {
                                if (typeof window !== "undefined" && "BroadcastChannel" in window) {
                                  const bc = new BroadcastChannel("restro_sync_channel")
                                  bc.postMessage({ type: "new_order", order: data.order })
                                  bc.close()
                                }
                              } catch {}
                            }
                          } catch (err) {
                            console.error("Order creation API error:", err)
                          }
                        }}
                        disabled={cart.length === 0}
                        className="py-2.5 rounded-xl bg-[#10b981] hover:bg-[#059669] text-white text-xs font-bold transition disabled:opacity-50 shadow-xs"
                      >
                        Checkout
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : activeTab === "orders" ? (
              /* --- ORDERS VIEW --- */
              <div className="space-y-6 max-w-[1440px] mx-auto">
                <div className="flex items-center justify-between">
                  <div>
                    <h1
                      className={`text-3xl font-bold tracking-tight ${
                        isDarkMode ? "text-white" : "text-slate-900"
                      }`}
                    >
                      Orders Feed
                    </h1>
                    <p
                      className={`text-sm mt-1 ${
                        isDarkMode ? "text-slate-400" : "text-slate-500"
                      }`}
                    >
                      Live order progression across counter and tables
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  {["all", "dine-in", "takeaway", "delivery"].map((f) => (
                    <button
                      key={f}
                      onClick={() => setOrdersFilter(f)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize transition ${
                        ordersFilter === f
                          ? "bg-[#8b5cf6] text-white"
                          : isDarkMode
                          ? "bg-[#161822] text-slate-400 hover:text-white border border-[#232635]"
                          : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200"
                      }`}
                    >
                      {f.replace("-", " ")}
                    </button>
                  ))}
                </div>

                <div
                  className={`rounded-2xl border min-h-[320px] ${
                    isDarkMode
                      ? "bg-[#14161f] border-[#202330]"
                      : "bg-white border-slate-200 shadow-xs"
                  }`}
                >
                  <table className="w-full text-left text-xs">
                    <thead
                      className={`border-b uppercase font-semibold text-[11px] ${
                        isDarkMode
                          ? "bg-[#181a24] border-[#222533] text-slate-400"
                          : "bg-slate-50 border-slate-200 text-slate-500"
                      }`}
                    >
                      <tr>
                        <th className="py-3 px-4 rounded-tl-2xl">Order #</th>
                        <th className="py-3 px-4">Channel & Table</th>
                        <th className="py-3 px-4">Order Items</th>
                        <th className="py-3 px-4 text-right">Total</th>
                        <th className="py-3 px-4">Prep Stage</th>
                        <th className="py-3 px-4 text-center">Payment</th>
                        <th className="py-3 px-4 text-right rounded-tr-2xl">Actions</th>
                      </tr>
                    </thead>
                    <tbody
                      className={`divide-y ${
                        isDarkMode ? "divide-[#202330]" : "divide-slate-100"
                      }`}
                    >
                      {orders
                        .filter((o) => {
                          if (ordersFilter === "all") return true
                          const normType = (o.order_type || "").toLowerCase().replace(/[-_ ]/g, "")
                          const normFilter = ordersFilter.toLowerCase().replace(/[-_ ]/g, "")
                          return normType === normFilter
                        })
                        .map((o, idx, filteredArr) => {
                          const isNearBottom = idx >= filteredArr.length - 2 || filteredArr.length <= 3
                          const hasKitchen = (o.order_items || []).some((it: any) => !isBarItem(it.MenuItem?.name || it.name || ""))
                          const hasBar = (o.order_items || []).some((it: any) => isBarItem(it.MenuItem?.name || it.name || ""))

                          const kStage = o.kitchen_stage || o.kds_stage || (
                            o.status === "CLOSED" ? "completed" :
                            o.status === "READY" ? "ready" :
                            o.status === "PREPARING" ? "preparing" : "new"
                          )
                          const bStage = o.bar_stage || o.kds_stage || (
                            o.status === "CLOSED" ? "completed" :
                            o.status === "READY" ? "ready" :
                            o.status === "PREPARING" ? "preparing" : "new"
                          )

                          return (
                            <tr
                              key={o.id}
                              className={`transition ${
                                isDarkMode ? "hover:bg-[#1a1c26]" : "hover:bg-slate-50"
                              }`}
                            >
                              <td className="py-3.5 px-4 font-bold">
                                <span className={isDarkMode ? "text-white" : "text-slate-900"}>
                                  {o.order_number}
                                </span>
                                <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                                  {formatTimeAgo(o.created_at)}
                                </div>
                              </td>
                              <td className="py-3.5 px-4">
                                <span
                                  className={`font-semibold capitalize ${
                                    isDarkMode ? "text-slate-300" : "text-slate-700"
                                  }`}
                                >
                                  {o.order_type?.replace(/[-_]/g, " ")}
                                </span>
                                <div className="text-[10px] text-purple-400 font-semibold mt-0.5">
                                  {o.table_id || "Counter"}
                                </div>
                              </td>
                              <td
                                className={`py-3.5 px-4 max-w-xs ${
                                  isDarkMode ? "text-slate-300" : "text-slate-700"
                                }`}
                              >
                                {((o.order_items || []).map((item: any) => `${item.quantity}x ${item.MenuItem?.name || item.name || "Item"}`).join(", ") || "No items")}
                              </td>
                              <td className="py-3.5 px-4 text-right font-extrabold text-purple-600 dark:text-purple-400">
                                ${(typeof o.total_amount === "number" ? o.total_amount : Number(o.total_amount || 0)).toFixed(2)}
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="flex flex-col gap-1.5 items-start">
                                  {hasKitchen && (
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                                        <span>🍳</span> Kitchen:
                                      </span>
                                      <span
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                          kStage === "ready"
                                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                            : kStage === "preparing"
                                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                            : kStage === "completed"
                                            ? "bg-slate-500/20 text-slate-400 border border-slate-500/30"
                                            : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                        }`}
                                      >
                                        {kStage === "new" ? "New Queue" : kStage === "preparing" ? "Cooking" : kStage === "ready" ? "Food Ready" : "Served"}
                                      </span>
                                    </div>
                                  )}
                                  {hasBar && (
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                                        <span>🍸</span> Bar:
                                      </span>
                                      <span
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                          bStage === "ready"
                                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                            : bStage === "preparing"
                                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                            : bStage === "completed"
                                            ? "bg-slate-500/20 text-slate-400 border border-slate-500/30"
                                            : "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                                        }`}
                                      >
                                        {bStage === "new" ? "Bar Queue" : bStage === "preparing" ? "Mixing" : bStage === "ready" ? "Drinks Ready" : "Served"}
                                      </span>
                                    </div>
                                  )}
                                  {!hasKitchen && !hasBar && (
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                        o.status === "CLOSED"
                                          ? "bg-slate-500/20 text-slate-400 border border-slate-500/30"
                                          : o.status === "READY"
                                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                          : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                      }`}
                                    >
                                      {o.status}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <button
                                  onClick={() => updatePaymentStatus(o.id, o.payment_status === "PAID" ? "UNPAID" : "PAID")}
                                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1.5 transition hover:scale-105 active:scale-95 cursor-pointer ${
                                    o.payment_status === "PAID"
                                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30"
                                      : "bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30"
                                  }`}
                                  title={`Click to mark as ${o.payment_status === "PAID" ? "Unpaid" : "Paid"}`}
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${
                                      o.payment_status === "PAID" ? "bg-emerald-400" : "bg-amber-400"
                                    }`}
                                  />
                                  {o.payment_status === "PAID" ? "Paid" : "Unpaid"}
                                </button>
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <div className="relative inline-block text-left">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setActiveOrderMenuId(activeOrderMenuId === o.id ? null : o.id)
                                    }}
                                    className={`p-1.5 rounded-lg border transition cursor-pointer ${
                                      activeOrderMenuId === o.id
                                        ? "bg-purple-600 text-white border-purple-500"
                                        : isDarkMode
                                        ? "bg-[#1e212d] text-slate-300 border-[#2b2f42] hover:bg-slate-700 hover:text-white"
                                        : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200 hover:text-slate-900"
                                    }`}
                                    title="Actions"
                                  >
                                    <MoreVertical className="w-4 h-4" />
                                  </button>

                                  {activeOrderMenuId === o.id && (
                                    <div
                                      onClick={(e) => e.stopPropagation()}
                                      className={`absolute right-0 ${
                                        isNearBottom ? "bottom-full mb-1.5" : "top-full mt-1.5"
                                      } z-50 w-48 rounded-xl border p-1.5 shadow-2xl text-left ${
                                        isDarkMode
                                          ? "bg-[#191b26] border-[#2d3144] text-slate-200 shadow-black/80"
                                          : "bg-white border-slate-200 text-slate-800 shadow-slate-300/60"
                                      }`}
                                    >
                                      {o.payment_status !== "PAID" ? (
                                        <button
                                          onClick={() => updatePaymentStatus(o.id, "PAID")}
                                          className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-2 transition cursor-pointer"
                                        >
                                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                          <span>Mark as Paid</span>
                                        </button>
                                      ) : (
                                        <button
                                          onClick={() => updatePaymentStatus(o.id, "UNPAID")}
                                          className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-amber-400 hover:bg-amber-500/10 flex items-center gap-2 transition cursor-pointer"
                                        >
                                          <X className="w-4 h-4 text-amber-400" />
                                          <span>Mark as Unpaid</span>
                                        </button>
                                      )}

                                      <button
                                        onClick={() => {
                                          setActiveOrderMenuId(null)
                                          window.print()
                                        }}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition cursor-pointer ${
                                          isDarkMode ? "hover:bg-slate-800 text-slate-300" : "hover:bg-slate-100 text-slate-700"
                                        }`}
                                      >
                                        <Receipt className="w-4 h-4 text-purple-400" />
                                        <span>Print Receipt</span>
                                      </button>

                                      {hasKitchen && kStage !== "completed" && (
                                        <button
                                          onClick={() => {
                                            advanceKdsTicket(`T-${o.order_number?.replace(/\D/g, "") || o.id.slice(-4)}-K`)
                                            setActiveOrderMenuId(null)
                                          }}
                                          className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition cursor-pointer ${
                                            isDarkMode ? "hover:bg-slate-800 text-slate-300" : "hover:bg-slate-100 text-slate-700"
                                          }`}
                                        >
                                          <ChefHat className="w-4 h-4 text-blue-400" />
                                          <span>Advance Kitchen</span>
                                        </button>
                                      )}

                                      {hasBar && bStage !== "completed" && (
                                        <button
                                          onClick={() => {
                                            advanceKdsTicket(`T-${o.order_number?.replace(/\D/g, "") || o.id.slice(-4)}-B`)
                                            setActiveOrderMenuId(null)
                                          }}
                                          className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition cursor-pointer ${
                                            isDarkMode ? "hover:bg-slate-800 text-slate-300" : "hover:bg-slate-100 text-slate-700"
                                          }`}
                                        >
                                          <Utensils className="w-4 h-4 text-amber-400" />
                                          <span>Advance Bar</span>
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : activeTab === "tenants" ? (
              /* --- SUPER ADMIN: TENANT RESTAURANTS --- */
              <div className="space-y-6 max-w-[1440px] mx-auto">
                <div className="flex items-center justify-between">
                  <div>
                    <h1
                      className={`text-3xl font-bold tracking-tight ${
                        isDarkMode ? "text-white" : "text-slate-900"
                      }`}
                    >
                      Tenant Restaurants
                    </h1>
                    <p
                      className={`text-sm mt-1 ${
                        isDarkMode ? "text-slate-400" : "text-slate-500"
                      }`}
                    >
                      Multi-tenant accounts, subscription statuses, and branch limits
                    </p>
                  </div>
                  <button className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs transition flex items-center gap-1.5 shadow-xs">
                    <Plus className="w-3.5 h-3.5" /> Provision Tenant
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div
                    className={`p-5 rounded-2xl border ${
                      isDarkMode
                        ? "bg-[#14161f] border-[#202330]"
                        : "bg-white border-slate-200 shadow-xs"
                    }`}
                  >
                    <span className="text-xs font-semibold uppercase text-slate-400">Total Restaurants</span>
                    <div
                      className={`text-3xl font-bold mt-2 ${
                        isDarkMode ? "text-white" : "text-slate-900"
                      }`}
                    >
                      14
                    </div>
                    <span className="text-xs text-emerald-500 mt-1 block">12 Active, 2 Trial</span>
                  </div>
                  <div
                    className={`p-5 rounded-2xl border ${
                      isDarkMode
                        ? "bg-[#14161f] border-[#202330]"
                        : "bg-white border-slate-200 shadow-xs"
                    }`}
                  >
                    <span className="text-xs font-semibold uppercase text-slate-400">Connected Outlets</span>
                    <div
                      className={`text-3xl font-bold mt-2 ${
                        isDarkMode ? "text-white" : "text-slate-900"
                      }`}
                    >
                      29
                    </div>
                    <span className="text-xs text-slate-400 mt-1 block">Across 8 regions</span>
                  </div>
                  <div
                    className={`p-5 rounded-2xl border ${
                      isDarkMode
                        ? "bg-[#14161f] border-[#202330]"
                        : "bg-white border-slate-200 shadow-xs"
                    }`}
                  >
                    <span className="text-xs font-semibold uppercase text-slate-400">Platform MRR</span>
                    <div className="text-3xl font-bold text-emerald-500 mt-2">$4,850</div>
                    <span className="text-xs text-emerald-500 mt-1 block">+18.4% MoM</span>
                  </div>
                  <div
                    className={`p-5 rounded-2xl border ${
                      isDarkMode
                        ? "bg-[#14161f] border-[#202330]"
                        : "bg-white border-slate-200 shadow-xs"
                    }`}
                  >
                    <span className="text-xs font-semibold uppercase text-slate-400">System Health</span>
                    <div className="text-3xl font-bold text-emerald-500 mt-2">99.98%</div>
                    <span className="text-xs text-emerald-500 mt-1 block">Operational</span>
                  </div>
                </div>

                <div
                  className={`rounded-2xl p-5 space-y-3 border ${
                    isDarkMode
                      ? "bg-[#14161f] border-[#202330]"
                      : "bg-white border-slate-200 shadow-xs"
                  }`}
                >
                  <h3
                    className={`font-bold text-sm ${
                      isDarkMode ? "text-white" : "text-slate-900"
                    }`}
                  >
                    Active Tenants Directory
                  </h3>
                  <div className="space-y-2">
                    {[
                      { name: "Nodedr Bistro", outlets: 1, plan: "Enterprise ($199/mo)", status: "Active" },
                      { name: "Bella Italia Trattoria", outlets: 3, plan: "Pro ($99/mo)", status: "Active" },
                      { name: "Tokyo Ramen Bar", outlets: 2, plan: "Enterprise ($199/mo)", status: "Active" },
                      { name: "Downtown Smokehouse", outlets: 1, plan: "Starter ($49/mo)", status: "Active" },
                      { name: "Green Leaf Organics", outlets: 1, plan: "Starter ($49/mo)", status: "Trial" },
                    ].map((r, i) => (
                      <div
                        key={i}
                        className={`p-3.5 rounded-xl border flex items-center justify-between text-xs ${
                          isDarkMode
                            ? "bg-[#1a1c26] border-[#262938]"
                            : "bg-slate-50 border-slate-200"
                        }`}
                      >
                        <div>
                          <span
                            className={`font-semibold block ${
                              isDarkMode ? "text-white" : "text-slate-900"
                            }`}
                          >
                            {r.name}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {r.outlets} Outlets Connected
                          </span>
                        </div>
                        <span className="text-purple-600 dark:text-purple-400 font-semibold">
                          {r.plan}
                        </span>
                        <span className="text-emerald-700 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-800 font-bold">
                          {r.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : activeTab === "reservations" ? (
              /* --- RESERVATION & WAITLIST (Reception Role & Admin) --- */
              <div className="space-y-6 max-w-[1440px] mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h1
                      className={`text-2xl lg:text-3xl font-bold tracking-tight ${
                        isDarkMode ? "text-white" : "text-slate-900"
                      }`}
                    >
                      Reservation & Waitlist
                    </h1>
                    <p
                      className={`text-xs sm:text-sm mt-1 ${
                        isDarkMode ? "text-slate-400" : "text-slate-500"
                      }`}
                    >
                      Guest reservations, walk-in queue, and front desk seating allocations
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowWaitlistModal(true)}
                      className={`px-3 py-2 rounded-xl border text-xs font-semibold transition ${
                        isDarkMode
                          ? "border-[#252836] bg-[#161821] text-slate-200 hover:bg-[#202330]"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      + Add Waitlist
                    </button>
                    <button
                      onClick={() => setShowAddResModal(true)}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition flex items-center gap-1.5 shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" /> New Reservation
                    </button>
                  </div>
                </div>

                {/* Key Front Desk Metrics */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div
                    className={`p-4 rounded-2xl border ${
                      isDarkMode
                        ? "bg-[#14161f] border-[#202330]"
                        : "bg-white border-slate-200 shadow-xs"
                    }`}
                  >
                    <span className="text-[11px] font-semibold uppercase text-slate-400">Today's Bookings</span>
                    <div
                      className={`text-2xl font-bold mt-1 ${
                        isDarkMode ? "text-white" : "text-slate-900"
                      }`}
                    >
                      18 Guests
                    </div>
                    <span className="text-xs text-emerald-500 mt-0.5 block">4 Parties Scheduled</span>
                  </div>
                  <div
                    className={`p-4 rounded-2xl border ${
                      isDarkMode
                        ? "bg-[#14161f] border-[#202330]"
                        : "bg-white border-slate-200 shadow-xs"
                    }`}
                  >
                    <span className="text-[11px] font-semibold uppercase text-slate-400">Arrived / In Lobby</span>
                    <div className="text-2xl font-bold text-amber-500 mt-1">1 Party</div>
                    <span className="text-xs text-amber-400 mt-0.5 block">Sophia Martinez (Table 1)</span>
                  </div>
                  <div
                    className={`p-4 rounded-2xl border ${
                      isDarkMode
                        ? "bg-[#14161f] border-[#202330]"
                        : "bg-white border-slate-200 shadow-xs"
                    }`}
                  >
                    <span className="text-[11px] font-semibold uppercase text-slate-400">Active Waitlist</span>
                    <div
                      className={`text-2xl font-bold mt-1 ${
                        isDarkMode ? "text-white" : "text-slate-900"
                      }`}
                    >
                      {waitlist.length} Parties
                    </div>
                    <span className="text-xs text-slate-400 mt-0.5 block">Est. wait ~15 min</span>
                  </div>
                  <div
                    className={`p-4 rounded-2xl border ${
                      isDarkMode
                        ? "bg-[#14161f] border-[#202330]"
                        : "bg-white border-slate-200 shadow-xs"
                    }`}
                  >
                    <span className="text-[11px] font-semibold uppercase text-slate-400">Available Tables</span>
                    <div className="text-2xl font-bold text-emerald-500 mt-1">6 / 12</div>
                    <span className="text-xs text-emerald-400 mt-0.5 block">50% Occupancy</span>
                  </div>
                </div>

                {/* Two Column Layout: Reservations List & Waitlist Sidebar */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column: Scheduled Reservations */}
                  <div
                    className={`lg:col-span-2 rounded-2xl border overflow-hidden ${
                      isDarkMode
                        ? "bg-[#14161f] border-[#202330]"
                        : "bg-white border-slate-200 shadow-xs"
                    }`}
                  >
                    <div className="p-4 border-b border-inherit flex items-center justify-between">
                      <h3
                        className={`font-bold text-sm ${
                          isDarkMode ? "text-white" : "text-slate-900"
                        }`}
                      >
                        Scheduled Reservations
                      </h3>
                      <span className="text-xs text-slate-400">{reservations.length} Active</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr
                            className={`border-b ${
                              isDarkMode
                                ? "bg-[#1a1c26] border-[#262938] text-slate-400"
                                : "bg-slate-50 border-slate-200 text-slate-600"
                            }`}
                          >
                            <th className="py-3 px-4 font-semibold">Time</th>
                            <th className="py-3 px-4 font-semibold">Guest</th>
                            <th className="py-3 px-4 font-semibold">Party</th>
                            <th className="py-3 px-4 font-semibold">Table</th>
                            <th className="py-3 px-4 font-semibold">Status</th>
                            <th className="py-3 px-4 font-semibold text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-inherit">
                          {reservations.map((r) => (
                            <tr
                              key={r.id}
                              className={`transition ${
                                isDarkMode ? "hover:bg-[#1a1c26]" : "hover:bg-slate-50"
                              }`}
                            >
                              <td className="py-3.5 px-4 font-bold text-emerald-500">{r.time}</td>
                              <td className="py-3.5 px-4">
                                <span
                                  className={`font-semibold block ${
                                    isDarkMode ? "text-white" : "text-slate-900"
                                  }`}
                                >
                                  {r.guestName}
                                </span>
                                <span className="text-[11px] text-slate-400">{r.phone}</span>
                                {r.notes && (
                                  <span className="text-[10px] text-purple-400 block italic">
                                    "{r.notes}"
                                  </span>
                                )}
                              </td>
                              <td
                                className={`py-3.5 px-4 font-medium ${
                                  isDarkMode ? "text-slate-300" : "text-slate-700"
                                }`}
                              >
                                {r.guests} guests
                              </td>
                              <td className="py-3.5 px-4">
                                <span className="px-2 py-1 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 font-bold">
                                  {r.table}
                                </span>
                              </td>
                              <td className="py-3.5 px-4">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    r.status === "Arrived"
                                      ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400 border border-amber-300 dark:border-amber-800"
                                      : r.status === "Confirmed"
                                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800"
                                      : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700"
                                  }`}
                                >
                                  {r.status}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <button
                                  onClick={() => {
                                    setReservations((prev) =>
                                      prev.map((item) =>
                                        item.id === r.id ? { ...item, status: "Arrived" } : item
                                      )
                                    )
                                    setActiveTab("tables")
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-[11px] transition shadow-xs"
                                >
                                  Seat Now
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Right Column: Walk-in Waitlist Queue */}
                  <div
                    className={`rounded-2xl border p-4 space-y-4 ${
                      isDarkMode
                        ? "bg-[#14161f] border-[#202330]"
                        : "bg-white border-slate-200 shadow-xs"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h3
                        className={`font-bold text-sm ${
                          isDarkMode ? "text-white" : "text-slate-900"
                        }`}
                      >
                        Walk-in Waitlist
                      </h3>
                      <button
                        onClick={() => setShowWaitlistModal(true)}
                        className="text-emerald-500 hover:underline text-xs font-semibold"
                      >
                        + Add Guest
                      </button>
                    </div>

                    {waitlist.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-400">
                        No walk-in parties currently waiting.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {waitlist.map((w, idx) => (
                          <div
                            key={idx}
                            className={`p-3 rounded-xl border flex items-center justify-between ${
                              isDarkMode
                                ? "bg-[#1a1c26] border-[#262938]"
                                : "bg-slate-50 border-slate-200"
                            }`}
                          >
                            <div>
                              <div
                                className={`font-semibold text-xs ${
                                  isDarkMode ? "text-white" : "text-slate-900"
                                }`}
                              >
                                {w.name}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {w.guests} guests · {w.time} ago
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                setWaitlist((prev) => prev.filter((_, i) => i !== idx))
                                setActiveTab("tables")
                              }}
                              className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-semibold"
                            >
                              Assign Table
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Add Reservation Modal */}
                {showAddResModal && (
                  <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                    <div
                      className={`max-w-md w-full rounded-2xl p-6 border shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 ${
                        isDarkMode
                          ? "bg-[#181a24] border-[#2c3042] text-white"
                          : "bg-white border-slate-200 text-slate-900"
                      }`}
                    >
                      <div className="flex items-center justify-between border-b pb-3 border-inherit">
                        <h3 className="font-bold text-base">New Table Reservation</h3>
                        <button
                          onClick={() => setShowAddResModal(false)}
                          className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700/50"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-3 text-xs">
                        <div>
                          <label className="font-semibold block mb-1">Guest Full Name</label>
                          <input
                            type="text"
                            placeholder="e.g. John Doe"
                            value={newResGuest}
                            onChange={(e) => setNewResGuest(e.target.value)}
                            className={`w-full p-2.5 rounded-xl border text-xs ${
                              isDarkMode
                                ? "bg-[#111217] border-[#2b2f40] text-white"
                                : "bg-slate-50 border-slate-200 text-slate-900"
                            }`}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="font-semibold block mb-1">Contact Phone</label>
                            <input
                              type="tel"
                              placeholder="+1 (555) 000-0000"
                              value={newResPhone}
                              onChange={(e) => setNewResPhone(e.target.value)}
                              className={`w-full p-2.5 rounded-xl border text-xs ${
                                isDarkMode
                                  ? "bg-[#111217] border-[#2b2f40] text-white"
                                  : "bg-slate-50 border-slate-200 text-slate-900"
                              }`}
                            />
                          </div>
                          <div>
                            <label className="font-semibold block mb-1">Party Size</label>
                            <input
                              type="number"
                              min={1}
                              max={20}
                              value={newResSeats}
                              onChange={(e) => setNewResSeats(Number(e.target.value))}
                              className={`w-full p-2.5 rounded-xl border text-xs ${
                                isDarkMode
                                  ? "bg-[#111217] border-[#2b2f40] text-white"
                                  : "bg-slate-50 border-slate-200 text-slate-900"
                              }`}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="font-semibold block mb-1">Reservation Time</label>
                            <input
                              type="time"
                              value={newResTime}
                              onChange={(e) => setNewResTime(e.target.value)}
                              className={`w-full p-2.5 rounded-xl border text-xs ${
                                isDarkMode
                                  ? "bg-[#111217] border-[#2b2f40] text-white"
                                  : "bg-slate-50 border-slate-200 text-slate-900"
                              }`}
                            />
                          </div>
                          <div>
                            <label className="font-semibold block mb-1">Assigned Table</label>
                            <select
                              value={newResTable}
                              onChange={(e) => setNewResTable(e.target.value)}
                              className={`w-full p-2.5 rounded-xl border text-xs ${
                                isDarkMode
                                  ? "bg-[#111217] border-[#2b2f40] text-white"
                                  : "bg-slate-50 border-slate-200 text-slate-900"
                              }`}
                            >
                              <option value="Table 1">Table 1 (4 seats)</option>
                              <option value="Table 2">Table 2 (4 seats)</option>
                              <option value="Table 3">Table 3 (6 seats)</option>
                              <option value="Table 4">Table 4 (4 seats)</option>
                              <option value="Table 6">Table 6 (6 seats)</option>
                              <option value="Table 7">Table 7 (4 seats)</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 justify-end pt-3 border-t border-inherit">
                        <button
                          onClick={() => setShowAddResModal(false)}
                          className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            if (!newResGuest) return
                            setReservations((prev) => [
                              ...prev,
                              {
                                id: `RES-${Math.floor(100 + Math.random() * 900)}`,
                                guestName: newResGuest,
                                phone: newResPhone || "+1 (555) 987-6543",
                                guests: newResSeats,
                                time: `${newResTime} Today`,
                                table: newResTable,
                                status: "Confirmed",
                                notes: "Booked via Reception"
                              }
                            ])
                            setNewResGuest("")
                            setShowAddResModal(false)
                          }}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs"
                        >
                          Confirm Reservation
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : activeTab === "customers" ? (
              /* --- CUSTOMER LOOKUP (Reception Role & Admin) --- */
              <div className="space-y-6 max-w-[1440px] mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h1
                      className={`text-2xl lg:text-3xl font-bold tracking-tight ${
                        isDarkMode ? "text-white" : "text-slate-900"
                      }`}
                    >
                      Customer Lookup
                    </h1>
                    <p
                      className={`text-xs sm:text-sm mt-1 ${
                        isDarkMode ? "text-slate-400" : "text-slate-500"
                      }`}
                    >
                      Search guest directory, dining history, VIP tiers, and seating preferences
                    </p>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="relative max-w-lg">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by customer name, phone number, or email..."
                    value={customersSearch}
                    onChange={(e) => setCustomersSearch(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs border outline-hidden transition ${
                      isDarkMode
                        ? "bg-[#14161f] border-[#252838] text-white placeholder-slate-500 focus:border-purple-500"
                        : "bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-purple-500 shadow-xs"
                    }`}
                  />
                </div>

                {/* Directory Cards Table */}
                <div
                  className={`rounded-2xl border overflow-hidden ${
                    isDarkMode
                      ? "bg-[#14161f] border-[#202330]"
                      : "bg-white border-slate-200 shadow-xs"
                  }`}
                >
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr
                          className={`border-b ${
                            isDarkMode
                              ? "bg-[#1a1c26] border-[#262938] text-slate-400"
                              : "bg-slate-50 border-slate-200 text-slate-600"
                          }`}
                        >
                          <th className="py-3 px-4 font-semibold">Customer</th>
                          <th className="py-3 px-4 font-semibold">Contact Info</th>
                          <th className="py-3 px-4 font-semibold">Tier</th>
                          <th className="py-3 px-4 font-semibold">Visits & Spend</th>
                          <th className="py-3 px-4 font-semibold">Preference & Notes</th>
                          <th className="py-3 px-4 font-semibold text-right">Quick Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-inherit">
                        {customersList
                          .filter(
                            (c) =>
                              c.name.toLowerCase().includes(customersSearch.toLowerCase()) ||
                              c.phone.includes(customersSearch) ||
                              c.email.toLowerCase().includes(customersSearch.toLowerCase())
                          )
                          .map((c) => (
                            <tr
                              key={c.id}
                              className={`transition ${
                                isDarkMode ? "hover:bg-[#1a1c26]" : "hover:bg-slate-50"
                              }`}
                            >
                              <td className="py-3.5 px-4">
                                <span
                                  className={`font-bold block ${
                                    isDarkMode ? "text-white" : "text-slate-900"
                                  }`}
                                >
                                  {c.name}
                                </span>
                                <span className="text-[10px] text-slate-400">ID: {c.id}</span>
                              </td>
                              <td className="py-3.5 px-4">
                                <div
                                  className={`font-medium ${
                                    isDarkMode ? "text-slate-300" : "text-slate-700"
                                  }`}
                                >
                                  {c.phone}
                                </div>
                                <div className="text-[11px] text-slate-400">{c.email}</div>
                              </td>
                              <td className="py-3.5 px-4">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    c.loyalty.includes("Platinum")
                                      ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-300 dark:border-purple-800"
                                      : c.loyalty.includes("Gold")
                                      ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400 border border-amber-300 dark:border-amber-800"
                                      : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400 border border-blue-300 dark:border-blue-800"
                                  }`}
                                >
                                  {c.loyalty}
                                </span>
                              </td>
                              <td className="py-3.5 px-4">
                                <span className="font-bold text-purple-600 dark:text-purple-400">
                                  {c.totalSpend}
                                </span>
                                <div className="text-[10px] text-slate-400">
                                  {c.visits} visits · Last: {c.lastVisit}
                                </div>
                              </td>
                              <td className="py-3.5 px-4">
                                <div
                                  className={`font-semibold ${
                                    isDarkMode ? "text-slate-300" : "text-slate-700"
                                  }`}
                                >
                                  {c.prefTable}
                                </div>
                                <div className="text-[10px] text-red-400">{c.allergies}</div>
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <button
                                  onClick={() => {
                                    setNewResGuest(c.name)
                                    setNewResPhone(c.phone)
                                    setShowAddResModal(true)
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium text-[11px] transition shadow-xs"
                                >
                                  Book Table
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : activeTab === "kds" ? (
              /* --- KITCHEN/BAR QUEUE (Kitchen Role & Admin) --- */
              <div className="space-y-6 max-w-[1440px] mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h1
                      className={`text-2xl lg:text-3xl font-bold tracking-tight ${
                        isDarkMode ? "text-white" : "text-slate-900"
                      }`}
                    >
                      Kitchen/Bar Queue
                    </h1>
                    <p
                      className={`text-xs sm:text-sm mt-1 ${
                        isDarkMode ? "text-slate-400" : "text-slate-500"
                      }`}
                    >
                      Live prep tickets for kitchen cook stations and bar orders
                    </p>
                  </div>

                  {/* Station Filters: All / Kitchen / Bar */}
                  <div
                    className={`flex items-center p-1 rounded-xl border ${
                      isDarkMode
                        ? "bg-[#161821] border-[#252838]"
                        : "bg-slate-100 border-slate-200"
                    }`}
                  >
                    <button
                      onClick={() => setKdsStationFilter("all")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                        kdsStationFilter === "all"
                          ? "bg-amber-600 text-white shadow-xs"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      All Stations ({kdsTickets.length})
                    </button>
                    <button
                      onClick={() => setKdsStationFilter("kitchen")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                        kdsStationFilter === "kitchen"
                          ? "bg-amber-600 text-white shadow-xs"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      🍳 Kitchen Cook
                    </button>
                    <button
                      onClick={() => setKdsStationFilter("bar")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                        kdsStationFilter === "bar"
                          ? "bg-amber-600 text-white shadow-xs"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      🍸 Bar Station
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Stage 1: New Queue */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        <span>New Queue</span>
                      </div>
                      <span className="text-xs text-slate-400">
                        {kdsTickets.filter((t) => (kdsStationFilter === "all" || t.station === kdsStationFilter) && t.stage === "new").length}
                      </span>
                    </div>

                    {kdsTickets.filter((t) => (kdsStationFilter === "all" || t.station === kdsStationFilter) && t.stage === "new").length === 0 ? (
                      <div className={`p-8 rounded-2xl border border-dashed text-center ${
                        isDarkMode ? "border-slate-800 text-slate-500" : "border-slate-200 text-slate-400"
                      }`}>
                        <span className="text-2xl block mb-1">✓</span>
                        <p className="text-xs font-medium">New queue is clear</p>
                      </div>
                    ) : (
                      kdsTickets
                        .filter((t) => (kdsStationFilter === "all" || t.station === kdsStationFilter) && t.stage === "new")
                        .map((t) => (
                          <div
                            key={t.id}
                            className={`p-4 rounded-2xl border space-y-3 ${
                              isDarkMode
                                ? "bg-[#14161f] border-blue-500/40"
                                : "bg-white border-blue-200 shadow-xs"
                            }`}
                          >
                            <div className="flex justify-between items-center text-xs">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`font-bold ${
                                    isDarkMode ? "text-white" : "text-slate-900"
                                  }`}
                                >
                                  {t.table}
                                </span>
                                <span
                                  className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                    t.station === "bar"
                                      ? "bg-purple-500/20 text-purple-400"
                                      : "bg-amber-500/20 text-amber-400"
                                  }`}
                                >
                                  {t.station}
                                </span>
                              </div>
                              <span className="text-blue-500 font-semibold">{t.time === "Just now" ? t.time : `${t.time} ago`}</span>
                            </div>
                            <div className="space-y-1.5">
                              {t.items.map((it) => (
                                <div
                                  key={it.id}
                                  onClick={() => toggleItemStatus(t.orderId, it.id)}
                                  className={`flex items-center justify-between text-xs px-2.5 py-1.5 rounded-xl border cursor-pointer select-none transition ${
                                    it.status === "ready" || it.status === "completed"
                                      ? isDarkMode
                                        ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-300 line-through opacity-80"
                                        : "bg-emerald-50 border-emerald-200 text-emerald-800 line-through opacity-80"
                                      : isDarkMode
                                        ? "bg-[#181a24] border-[#252838] text-slate-200 hover:border-slate-600"
                                        : "bg-slate-50 border-slate-200 text-slate-800 hover:border-slate-300"
                                  }`}
                                  title="Click to toggle item preparation status"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span
                                      className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold border shrink-0 transition ${
                                        it.status === "ready" || it.status === "completed"
                                          ? "bg-emerald-500 border-emerald-500 text-white"
                                          : isDarkMode
                                            ? "border-slate-600 text-transparent"
                                            : "border-slate-400 text-transparent"
                                      }`}
                                    >
                                      ✓
                                    </span>
                                    <span className="font-semibold truncate">{it.quantity}x {it.name}</span>
                                  </div>
                                  <span
                                    className={`text-[10px] font-bold uppercase tracking-wider shrink-0 ml-2 px-1.5 py-0.5 rounded ${
                                      it.status === "ready" || it.status === "completed"
                                        ? "bg-emerald-500/20 text-emerald-400"
                                        : "bg-slate-500/20 text-slate-400"
                                    }`}
                                  >
                                    {it.status === "ready" || it.status === "completed" ? "Done" : "Pending"}
                                  </span>
                                </div>
                              ))}
                            </div>
                            <button
                              onClick={() => advanceKdsTicket(t.id)}
                              className={`w-full py-1.5 rounded-xl text-white text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5 ${
                                t.station === "bar"
                                  ? "bg-purple-600 hover:bg-purple-500"
                                  : "bg-blue-600 hover:bg-blue-500"
                              }`}
                            >
                              <span>Start Preparing</span>
                              <span className="text-[10px] opacity-80 uppercase">({t.station})</span>
                            </button>
                          </div>
                        ))
                    )}
                  </div>

                  {/* Stage 2: In Cook Station */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        <span>In Cook Station</span>
                      </div>
                      <span className="text-xs text-slate-400">
                        {kdsTickets.filter((t) => (kdsStationFilter === "all" || t.station === kdsStationFilter) && t.stage === "preparing").length}
                      </span>
                    </div>

                    {kdsTickets.filter((t) => (kdsStationFilter === "all" || t.station === kdsStationFilter) && t.stage === "preparing").length === 0 ? (
                      <div className={`p-8 rounded-2xl border border-dashed text-center ${
                        isDarkMode ? "border-slate-800 text-slate-500" : "border-slate-200 text-slate-400"
                      }`}>
                        <span className="text-2xl block mb-1">✓</span>
                        <p className="text-xs font-medium">No items cooking</p>
                      </div>
                    ) : (
                      kdsTickets
                        .filter((t) => (kdsStationFilter === "all" || t.station === kdsStationFilter) && t.stage === "preparing")
                        .map((t) => (
                          <div
                            key={t.id}
                            className={`p-4 rounded-2xl border space-y-3 ${
                              isDarkMode
                                ? "bg-[#14161f] border-amber-500/40"
                                : "bg-white border-amber-200 shadow-xs"
                            }`}
                          >
                            <div className="flex justify-between items-center text-xs">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`font-bold ${
                                    isDarkMode ? "text-white" : "text-slate-900"
                                  }`}
                                >
                                  {t.table}
                                </span>
                                <span
                                  className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                    t.station === "bar"
                                      ? "bg-purple-500/20 text-purple-400"
                                      : "bg-amber-500/20 text-amber-400"
                                  }`}
                                >
                                  {t.station}
                                </span>
                              </div>
                              <span className="text-amber-500 font-semibold">{t.time === "Just now" ? t.time : `${t.time} ago`}</span>
                            </div>
                            <div className="space-y-1.5">
                              {t.items.map((it) => (
                                <div
                                  key={it.id}
                                  onClick={() => toggleItemStatus(t.orderId, it.id)}
                                  className={`flex items-center justify-between text-xs px-2.5 py-1.5 rounded-xl border cursor-pointer select-none transition ${
                                    it.status === "ready" || it.status === "completed"
                                      ? isDarkMode
                                        ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-300 line-through opacity-80"
                                        : "bg-emerald-50 border-emerald-200 text-emerald-800 line-through opacity-80"
                                      : isDarkMode
                                        ? "bg-[#181a24] border-[#252838] text-slate-200 hover:border-slate-600"
                                        : "bg-slate-50 border-slate-200 text-slate-800 hover:border-slate-300"
                                  }`}
                                  title="Click to toggle item preparation status"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span
                                      className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold border shrink-0 transition ${
                                        it.status === "ready" || it.status === "completed"
                                          ? "bg-emerald-500 border-emerald-500 text-white"
                                          : isDarkMode
                                            ? "border-slate-600 text-transparent"
                                            : "border-slate-400 text-transparent"
                                      }`}
                                    >
                                      ✓
                                    </span>
                                    <span className="font-semibold truncate">{it.quantity}x {it.name}</span>
                                  </div>
                                  <span
                                    className={`text-[10px] font-bold uppercase tracking-wider shrink-0 ml-2 px-1.5 py-0.5 rounded ${
                                      it.status === "ready" || it.status === "completed"
                                        ? "bg-emerald-500/20 text-emerald-400"
                                        : "bg-slate-500/20 text-slate-400"
                                    }`}
                                  >
                                    {it.status === "ready" || it.status === "completed" ? "Done" : "Pending"}
                                  </span>
                                </div>
                              ))}
                            </div>
                            <button
                              onClick={() => advanceKdsTicket(t.id)}
                              className="w-full py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5"
                            >
                              <span>Mark Ready</span>
                              <span className="text-[10px] opacity-80 uppercase">({t.station})</span>
                            </button>
                          </div>
                        ))
                    )}
                  </div>

                  {/* Stage 3: Ready for Table */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>Ready for Table</span>
                      </div>
                      <span className="text-xs text-slate-400">
                        {kdsTickets.filter((t) => (kdsStationFilter === "all" || t.station === kdsStationFilter) && t.stage === "ready").length}
                      </span>
                    </div>

                    {kdsTickets.filter((t) => (kdsStationFilter === "all" || t.station === kdsStationFilter) && t.stage === "ready").length === 0 ? (
                      <div className={`p-8 rounded-2xl border border-dashed text-center ${
                        isDarkMode ? "border-slate-800 text-slate-500" : "border-slate-200 text-slate-400"
                      }`}>
                        <span className="text-2xl block mb-1">✓</span>
                        <p className="text-xs font-medium">All orders served</p>
                      </div>
                    ) : (
                      kdsTickets
                        .filter((t) => (kdsStationFilter === "all" || t.station === kdsStationFilter) && t.stage === "ready")
                        .map((t) => (
                          <div
                            key={t.id}
                            className={`p-4 rounded-2xl border space-y-3 ${
                              isDarkMode
                                ? "bg-[#14161f] border-emerald-500/40"
                                : "bg-white border-emerald-200 shadow-xs"
                            }`}
                          >
                            <div className="flex justify-between items-center text-xs">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`font-bold ${
                                    isDarkMode ? "text-white" : "text-slate-900"
                                  }`}
                                >
                                  {t.table}
                                </span>
                                <span
                                  className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                    t.station === "bar"
                                      ? "bg-purple-500/20 text-purple-400"
                                      : "bg-amber-500/20 text-amber-400"
                                  }`}
                                >
                                  {t.station}
                                </span>
                              </div>
                              <span className="text-emerald-500 font-semibold">Ready!</span>
                            </div>
                            <div className="space-y-1.5">
                              {t.items.map((it) => (
                                <div
                                  key={it.id}
                                  onClick={() => toggleItemStatus(t.orderId, it.id)}
                                  className={`flex items-center justify-between text-xs px-2.5 py-1.5 rounded-xl border cursor-pointer select-none transition ${
                                    it.status === "ready" || it.status === "completed"
                                      ? isDarkMode
                                        ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-300 line-through opacity-80"
                                        : "bg-emerald-50 border-emerald-200 text-emerald-800 line-through opacity-80"
                                      : isDarkMode
                                        ? "bg-[#181a24] border-[#252838] text-slate-200 hover:border-slate-600"
                                        : "bg-slate-50 border-slate-200 text-slate-800 hover:border-slate-300"
                                  }`}
                                  title="Click to toggle item preparation status"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span
                                      className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold border shrink-0 transition ${
                                        it.status === "ready" || it.status === "completed"
                                          ? "bg-emerald-500 border-emerald-500 text-white"
                                          : isDarkMode
                                            ? "border-slate-600 text-transparent"
                                            : "border-slate-400 text-transparent"
                                      }`}
                                    >
                                      ✓
                                    </span>
                                    <span className="font-semibold truncate">{it.quantity}x {it.name}</span>
                                  </div>
                                  <span
                                    className={`text-[10px] font-bold uppercase tracking-wider shrink-0 ml-2 px-1.5 py-0.5 rounded ${
                                      it.status === "ready" || it.status === "completed"
                                        ? "bg-emerald-500/20 text-emerald-400"
                                        : "bg-slate-500/20 text-slate-400"
                                    }`}
                                  >
                                    {it.status === "ready" || it.status === "completed" ? "Done" : "Pending"}
                                  </span>
                                </div>
                              ))}
                            </div>
                            <button
                              onClick={() => advanceKdsTicket(t.id)}
                              className="w-full py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5"
                            >
                              <span>Served / Clear</span>
                              <span className="text-[10px] opacity-80 uppercase">({t.station})</span>
                            </button>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </div>
            ) : activeTab === "dashboard" ? (
              /* --- DASHBOARD VIEW --- */
              <div className="space-y-6 max-w-[1440px] mx-auto">
                <div>
                  <h1
                    className={`text-3xl font-bold tracking-tight ${
                      isDarkMode ? "text-white" : "text-slate-900"
                    }`}
                  >
                    Dashboard Overview
                  </h1>
                  <p
                    className={`text-sm mt-1 ${
                      isDarkMode ? "text-slate-400" : "text-slate-500"
                    }`}
                  >
                    Real-time revenue, orders & table metrics
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div
                    className={`p-5 rounded-2xl border ${
                      isDarkMode
                        ? "bg-[#14161f] border-[#202330]"
                        : "bg-white border-slate-200 shadow-xs"
                    }`}
                  >
                    <span className="text-xs font-semibold uppercase text-slate-400">Today's Revenue</span>
                    <div
                      className={`text-3xl font-bold mt-2 ${
                        isDarkMode ? "text-white" : "text-slate-900"
                      }`}
                    >
                      $1,245.80
                    </div>
                    <span className="text-xs text-emerald-500 mt-1 block">+12% vs yesterday</span>
                  </div>
                  <div
                    className={`p-5 rounded-2xl border ${
                      isDarkMode
                        ? "bg-[#14161f] border-[#202330]"
                        : "bg-white border-slate-200 shadow-xs"
                    }`}
                  >
                    <span className="text-xs font-semibold uppercase text-slate-400">Total Orders</span>
                    <div
                      className={`text-3xl font-bold mt-2 ${
                        isDarkMode ? "text-white" : "text-slate-900"
                      }`}
                    >
                      48
                    </div>
                    <span
                      className={`text-xs mt-1 block ${
                        isDarkMode ? "text-slate-400" : "text-slate-500"
                      }`}
                    >
                      32 Dine-in, 16 Takeaway
                    </span>
                  </div>
                  <div
                    className={`p-5 rounded-2xl border ${
                      isDarkMode
                        ? "bg-[#14161f] border-[#202330]"
                        : "bg-white border-slate-200 shadow-xs"
                    }`}
                  >
                    <span className="text-xs font-semibold uppercase text-slate-400">Active Tables</span>
                    <div
                      className={`text-3xl font-bold mt-2 ${
                        isDarkMode ? "text-white" : "text-slate-900"
                      }`}
                    >
                      6 / 12
                    </div>
                    <span className="text-xs text-purple-500 mt-1 block">50% Occupancy</span>
                  </div>
                  <div
                    className={`p-5 rounded-2xl border ${
                      isDarkMode
                        ? "bg-[#14161f] border-[#202330]"
                        : "bg-white border-slate-200 shadow-xs"
                    }`}
                  >
                    <span className="text-xs font-semibold uppercase text-slate-400">Connected Outlets</span>
                    <div className="text-3xl font-bold text-emerald-500 mt-2">1 Active</div>
                    <span
                      className={`text-xs mt-1 block ${
                        isDarkMode ? "text-slate-400" : "text-slate-500"
                      }`}
                    >
                      Main Downtown Outlet
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* --- GENERIC RELEVANT MODULE --- */
              <div className="space-y-6 max-w-[1440px] mx-auto">
                <div className="flex items-center justify-between">
                  <div>
                    <h1
                      className={`text-3xl font-bold tracking-tight capitalize ${
                        isDarkMode ? "text-white" : "text-slate-900"
                      }`}
                    >
                      {activeTab.replace("-", " ")}
                    </h1>
                    <p
                      className={`text-sm mt-1 ${
                        isDarkMode ? "text-slate-400" : "text-slate-500"
                      }`}
                    >
                      Module active for {userType === "super-admin" ? "Super Admin" : "Nodedr Bistro"}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setActiveTab(userType === "pos-staff" ? "pos" : userType === "super-admin" ? "tenants" : "tables")
                    }
                    className="px-3.5 py-2 rounded-xl bg-[#8b5cf6] text-white font-medium text-xs hover:bg-[#7c3aed] transition"
                  >
                    Return to Home
                  </button>
                </div>

                <div
                  className={`rounded-2xl p-8 text-center space-y-3 border ${
                    isDarkMode
                      ? "bg-[#14161f] border-[#202330] text-slate-400"
                      : "bg-white border-slate-200 text-slate-600 shadow-xs"
                  }`}
                >
                  <p className="text-sm">
                    Viewing{" "}
                    <span
                      className={`font-bold capitalize ${
                        isDarkMode ? "text-white" : "text-slate-900"
                      }`}
                    >
                      {activeTab.replace("-", " ")}
                    </span>{" "}
                    module.
                  </p>
                  <p className="text-xs text-slate-400">
                    Accessible for {userType.replace("-", " ")} role.
                  </p>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* QR Code Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className={`rounded-2xl p-6 max-w-sm w-full space-y-4 text-center border ${
              isDarkMode
                ? "bg-[#161822] border-[#272b3a]"
                : "bg-white border-slate-200 shadow-2xl"
            }`}
          >
            <div className="flex items-center justify-between">
              <h3
                className={`font-bold text-base ${
                  isDarkMode ? "text-white" : "text-slate-900"
                }`}
              >
                {showQrModal.name} QR Ordering Code
              </h3>
              <button
                onClick={() => setShowQrModal(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-white p-6 rounded-2xl inline-block shadow-md">
              <svg
                className="w-44 h-44 text-slate-900 mx-auto"
                viewBox="0 0 100 100"
                fill="currentColor"
              >
                <rect x="0" y="0" width="30" height="30" />
                <rect x="5" y="5" width="20" height="20" fill="white" />
                <rect x="10" y="10" width="10" height="10" />
                <rect x="70" y="0" width="30" height="30" />
                <rect x="75" y="5" width="20" height="20" fill="white" />
                <rect x="80" y="10" width="10" height="10" />
                <rect x="0" y="70" width="30" height="30" />
                <rect x="5" y="75" width="20" height="20" fill="white" />
                <rect x="10" y="80" width="10" height="10" />
                <rect x="40" y="10" width="10" height="20" />
                <rect x="40" y="40" width="20" height="20" />
                <rect x="70" y="40" width="15" height="10" />
                <rect x="70" y="70" width="10" height="20" />
                <rect x="40" y="70" width="15" height="10" />
              </svg>
            </div>

            <p
              className={`text-xs ${
                isDarkMode ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Scan with phone camera to view menu & place digital order for {showQrModal.name}.
            </p>

            <button
              onClick={() => setShowQrModal(null)}
              className="w-full py-2.5 rounded-xl bg-[#8b5cf6] hover:bg-[#7c3aed] text-white text-xs font-semibold transition"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Waitlist Modal */}
      {showWaitlistModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!waitlistName.trim()) return
              setWaitlist((prev) => [
                ...prev,
                { name: waitlistName, guests: waitlistGuests, time: "Just now" },
              ])
              setWaitlistName("")
              setShowWaitlistModal(false)
            }}
            className={`rounded-2xl p-6 max-w-sm w-full space-y-4 border ${
              isDarkMode
                ? "bg-[#161822] border-[#272b3a]"
                : "bg-white border-slate-200 shadow-2xl"
            }`}
          >
            <div className="flex items-center justify-between">
              <h3
                className={`font-bold text-base ${
                  isDarkMode ? "text-white" : "text-slate-900"
                }`}
              >
                Add to Waitlist
              </h3>
              <button
                type="button"
                onClick={() => setShowWaitlistModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label
                className={`text-xs font-medium ${
                  isDarkMode ? "text-slate-300" : "text-slate-700"
                }`}
              >
                Guest Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. John Doe"
                value={waitlistName}
                onChange={(e) => setWaitlistName(e.target.value)}
                className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-purple-500 border ${
                  isDarkMode
                    ? "bg-[#1e202c] border-[#2b2f3e] text-white"
                    : "bg-slate-50 border-slate-200 text-slate-900"
                }`}
              />
            </div>

            <div className="space-y-1.5">
              <label
                className={`text-xs font-medium ${
                  isDarkMode ? "text-slate-300" : "text-slate-700"
                }`}
              >
                Party Size (Guests)
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setWaitlistGuests(Math.max(1, waitlistGuests - 1))}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                    isDarkMode ? "bg-[#222533] text-white" : "bg-slate-100 text-slate-800"
                  }`}
                >
                  -
                </button>
                <span
                  className={`text-sm font-bold w-8 text-center ${
                    isDarkMode ? "text-white" : "text-slate-900"
                  }`}
                >
                  {waitlistGuests}
                </span>
                <button
                  type="button"
                  onClick={() => setWaitlistGuests(waitlistGuests + 1)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                    isDarkMode ? "bg-[#222533] text-white" : "bg-slate-100 text-slate-800"
                  }`}
                >
                  +
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-[#8b5cf6] hover:bg-[#7c3aed] text-white text-xs font-semibold transition shadow-xs"
            >
              Add Guest
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

export default function RestaurantAdminHome() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0e0f12]" />}>
      <RestaurantAdminContent />
    </Suspense>
  )
}
