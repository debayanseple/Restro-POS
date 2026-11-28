"use client"

import React, { useState, useEffect, useMemo, useRef, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { TableQrModal, AllTablesQrModal } from "@/components/TableQrModal"
import { AdminDashboard } from "@/components/AdminDashboard"
import { AccountingModule } from "@/components/AccountingModule"
import { ReportsModule } from "@/components/ReportsModule"
import { MyDeliveriesModule } from "@/components/MyDeliveriesModule"
import { SettingsModule, SettingsSection } from "@/components/SettingsModule"
import { WaiterAlertOverlay } from "@/components/WaiterAlertOverlay"
import { BillReceiptModal, BillReceiptOrder, BillReceiptOrderItem } from "@/components/BillReceiptModal"
import { SuperAdminPortal } from "@/components/SuperAdminPortal"
import {
  buildTablesFromFloors,
  DEFAULT_RESTAURANT_SETTINGS,
  FloorConfig,
} from "@/lib/restaurant-settings"
import { PortalShellSkeleton, SectionContentSkeleton } from "@/components/ui/skeleton"
import {
  playBellAndSpeak,
  playKitchenChimeAndSpeak,
  playServiceBellRing,
  stopKitchenVoice,
  stopServiceVoice,
  unlockBellAudio,
} from "@/lib/bell-sound"
import { MASTER_MENU_CATALOG, MenuItem } from "@/lib/menu-catalog"
import {
  MASTER_INVENTORY_CATALOG,
  MASTER_STOCK_MOVEMENTS,
  InventoryItem,
  StockMovement,
  isItemExpired,
  isItemOutOfStock,
} from "@/lib/inventory-catalog"
import { TeamMember, StaffRole, MASTER_TEAM_MEMBERS } from "@/lib/team-catalog"
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
  BellRing,
  Moon,
  Sun,
  ChevronDown,
  ChevronsLeft,
  PanelLeftClose,
  PanelLeftOpen,
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
  TrendingDown,
  Building2,
  ShieldCheck,
  CreditCard,
  Activity,
  CheckCircle2,
  Truck,
  Megaphone,
  Sliders,
  SlidersHorizontal,
  Clock,
  LogOut,
  MoreVertical,
  Trash2,
  Eye,
  EyeOff,
  AlertTriangle,
  AlertOctagon,
  Sparkles,
  Filter,
  Package,
  History,
  ArrowDownRight,
  ArrowUpRight,
  Edit3,
  Layers,
  Scale,
  Warehouse,
  Mail,
  Phone,
  Key,
  ExternalLink,
  UserPlus,
  Power,
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
  customer_name?: string | null
  customer_phone?: string | null
  billed_closed_at?: string | null
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

interface ServiceRequestItem {
  id: string
  table: string
  tableNumber: number
  type: "clean" | "waiter" | "bill"
  title: string
  status: "pending" | "in-progress" | "resolved"
  createdAt: string
  clearedAt?: string
  clearedBy?: string
  message?: string
  notes?: string
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

interface SentTableBill {
  sentAt: string
  tableName: string
  orders: Array<{
    id: string
    order_number: string
    created_at: string
    payment_status: string
    items: Array<{
      name: string
      quantity: number
      unit_price: number
      special_instructions?: string | null
    }>
  }>
  subtotal: number
  tax: number
  discount: number
  grandTotal: number
  hasUnpaid: boolean
}

interface TableItem {
  id: number
  name: string
  seats: number
  status: "available" | "occupied" | "reserved" | "cleaning" | "out_of_service"
  orderCode?: string
  isOpen: boolean
  clearedAt?: string
  sentBill?: SentTableBill | null
  floorNumber?: number
  floorName?: string
}

interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
}

interface ReservationItem {
  id: string
  guestName: string
  phone: string
  guests: number
  time: string
  table: string
  status: string
  notes?: string
}

const DEFAULT_TABLES_LIST: TableItem[] = buildTablesFromFloors(
  DEFAULT_RESTAURANT_SETTINGS.floors,
  []
)

function RestaurantAdminContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Hydration safety flag & initial skeleton state
  const [isMounted, setIsMounted] = useState(false)
  const [isBootstrapping, setIsBootstrapping] = useState(true)
  const [isTabLoading, setIsTabLoading] = useState(false)
  const tabSwitchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleSelectTab = (nextTab: string) => {
    if (nextTab === activeTab) return
    setActiveTab(nextTab)
    // On small screens the menu is an overlay: dismiss it after choosing a page
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setSidebarOpen(false)
    }
    setIsTabLoading(true)
    if (tabSwitchTimerRef.current) clearTimeout(tabSwitchTimerRef.current)
    tabSwitchTimerRef.current = setTimeout(() => {
      setIsTabLoading(false)
    }, 180)
  }

  // 1. Current Active User Type & POS Sub-role
  const [userType, setUserType] = useState<UserType>("restaurant-admin")
  const [posRole, setPosRole] = useState<PosRole>("orders")
  const [activeTab, setActiveTab] = useState("dashboard")
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showProfileMenu, setShowProfileMenu] = useState(false)

  // Restaurant Settings (for dynamic brand name)
  const [restaurantSettings, setRestaurantSettings] = useState<{
    restaurantName: string
    outletName: string
  }>({ restaurantName: "Nodedr Bistro", outletName: "Main Branch" })

  // Live orders acceptance setting
  const [isAcceptingOrders, setIsAcceptingOrders] = useState<boolean | null>(null)

  // Custom alert modal state (replaces native JS alert)
  const [showCustomAlert, setShowCustomAlert] = useState(false)
  const [customAlertMessage, setCustomAlertMessage] = useState<string>("")
  const showAlert = (msg: string) => {
    setCustomAlertMessage(msg)
    setShowCustomAlert(true)
  }

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

    // Restore the user's sidebar preference (menu visible/hidden)
    try {
      const savedSidebar = localStorage.getItem("restro_sidebar_open")
      if (savedSidebar === "false") setSidebarOpen(false)
    } catch {}

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
        setActiveTab("dashboard")
      }
    }
  }, [searchParams])

  // Fetch restaurant settings for dynamic brand name
  useEffect(() => {
    let active = true
    fetch("/api/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (active && d?.settings) {
          setRestaurantSettings({
            restaurantName: d.settings.restaurantName || "Nodedr Bistro",
            outletName: d.settings.outletName || "Main Branch",
          })
        }
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  // Fetch isAcceptingOrders from settings
  useEffect(() => {
    let active = true
    fetch("/api/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (active && d?.settings) {
          setIsAcceptingOrders(d.settings.isAcceptingOrders ?? true)
        }
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

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

  // Persist sidebar visibility so it stays the way the user left it
  useEffect(() => {
    if (!isMounted) return
    try {
      localStorage.setItem("restro_sidebar_open", String(sidebarOpen))
    } catch {}
  }, [sidebarOpen, isMounted])

  // Ctrl/Cmd + B toggles the navigation sidebar, Esc closes it on small screens
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "b") {
        event.preventDefault()
        setSidebarOpen((prev) => !prev)
      } else if (event.key === "Escape" && window.innerWidth < 768) {
        setSidebarOpen(false)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

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
      setActiveTab("dashboard")
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
  const [floors, setFloors] = useState<FloorConfig[]>(DEFAULT_RESTAURANT_SETTINGS.floors)
  const [selectedFloorFilter, setSelectedFloorFilter] = useState<number | "all">("all")
  const [settingsInitialSection, setSettingsInitialSection] = useState<SettingsSection>("outlet")
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null)
  const [tableValidationError, setTableValidationError] = useState(false)
  const [showQrModal, setShowQrModal] = useState<TableItem | null>(null)
  const [viewBillTable, setViewBillTable] = useState<TableItem | null>(null)
  const [sendingBillTableId, setSendingBillTableId] = useState<number | null>(null)
  const [billSentSuccessTableId, setBillSentSuccessTableId] = useState<number | null>(null)
  const [receiptPreview, setReceiptPreview] = useState<{ title: string; orders: BillReceiptOrder[] } | null>(null)
  const [showAllQrModal, setShowAllQrModal] = useState(false)
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

  const matchesTableOrder = (table: TableItem, orderTableId?: string | null) => {
    if (!orderTableId) return false
    const normalized = String(orderTableId).toLowerCase().trim()
    return (
      normalized === table.name.toLowerCase().trim() ||
      normalized === `table ${table.id}` ||
      normalized === `table 0${table.id}` ||
      normalized === String(table.id)
    )
  }

  const resolveBillItemRate = (it: BillReceiptOrderItem): number => {
    const explicit = Number(it.unit_price)
    if (explicit > 0) return explicit
    const rawName = String(it.MenuItem?.name || it.name || "").trim()
    const isHalf = /\(half\)$/i.test(rawName)
    const isFull = /\(full\)$/i.test(rawName)
    const baseName = rawName.replace(/\s*\((half|full)\)$/i, "").toLowerCase().trim()
    const baseMenuId = String(it.menu_item_id || "").replace(/__(half|full)$/i, "")
    const match = menuCatalog.find(
      (m) =>
        (baseMenuId && m.id === baseMenuId) ||
        (baseName && m.name.toLowerCase().trim() === baseName)
    )
    if (!match) return 0
    if (isHalf && match.halfPrice) return Number(match.halfPrice)
    if (isFull && match.fullPrice) return Number(match.fullPrice)
    return Number(match.price) || 0
  }

  const closeTableOrdersLocally = (targetId: number, tableList?: TableItem[]) => {
    const sourceTables = tableList || tables
    const targetTable = sourceTables.find((t) => t.id === targetId)
    const nowIso = new Date().toISOString()

    setOrders((prev) => {
      let modified = false
      const updated = prev.map((o) => {
        if (o.status === "CANCELLED" || o.billed_closed_at || !o.table_id) return o
        if (o.status === "CLOSED" && o.payment_status === "PAID") return o
        const matches = targetTable
          ? matchesTableOrder(targetTable, o.table_id)
          : (() => {
              const norm = String(o.table_id).toLowerCase().trim()
              return norm === `table ${targetId}` || norm === `table 0${targetId}` || norm === String(targetId)
            })()
        if (!matches) return o

        modified = true
        return {
          ...o,
          status: "CLOSED",
          payment_status: "PAID",
          kds_stage: "completed" as const,
          kitchen_stage: "completed" as const,
          bar_stage: "completed" as const,
          updated_at: nowIso,
          billed_closed_at: nowIso,
          order_items: (o.order_items || []).map((it) => ({ ...it, status: "completed" })),
          Payment:
            Array.isArray(o.Payment) && o.Payment.length > 0
              ? o.Payment.map((p) => ({ ...p, status: "PAID" }))
              : [
                  {
                    id: `pay_${Date.now()}`,
                    order_id: o.id,
                    amount: o.total_amount,
                    status: "PAID",
                    payment_method: o.payment_method || "MANUAL",
                    recorded_at: nowIso,
                  },
                ],
        }
      })
      if (modified && typeof window !== "undefined") {
        try {
          localStorage.setItem("restro_pos_orders", JSON.stringify(updated))
        } catch {}
      }
      return modified ? updated : prev
    })
  }

  const sendBillToCustomerQr = async (
    table: TableItem,
    billOrders: SupabaseOrder[],
    totals: {
      subtotal: number
      totalTax: number
      totalDiscount: number
      grandTotal: number
      hasUnpaid: boolean
    }
  ) => {
    if (billOrders.length === 0) return
    setSendingBillTableId(table.id)
    const sentAt = new Date().toISOString()
    const sentBill: SentTableBill = {
      sentAt,
      tableName: table.name,
      orders: billOrders.map((ord) => ({
        id: ord.id,
        order_number: ord.order_number || `#${ord.id.slice(-4)}`,
        order_type: ord.order_type || "dine-in",
        customer_name: ord.customer_name || null,
        customer_phone: ord.customer_phone || null,
        created_at: ord.created_at,
        payment_status: ord.payment_status,
        payment_method: ord.payment_method || "CASH",
        items: (ord.order_items || []).map((it) => ({
          name: it.MenuItem?.name || it.name || "Menu Item",
          quantity: Number(it.quantity) || 1,
          unit_price: resolveBillItemRate(it),
          special_instructions: it.special_instructions || null,
        })),
      })),
      subtotal: totals.subtotal,
      tax: totals.totalTax,
      discount: totals.totalDiscount,
      grandTotal: totals.grandTotal,
      hasUnpaid: totals.hasUnpaid,
    }

    setTables((prev) =>
      prev.map((t) => (t.id === table.id ? { ...t, sentBill } : t))
    )
    setViewBillTable((prev) => (prev && prev.id === table.id ? { ...prev, sentBill } : prev))

    // Resolve any pending bill service requests for this table
    const pendingBillReqs = (tableRequestsMap[table.id] || []).filter((r) => r.type === "bill")
    if (pendingBillReqs.length > 0) {
      setServiceRequests((prev) =>
        prev.map((r) =>
          pendingBillReqs.some((pr) => pr.id === r.id)
            ? { ...r, status: "resolved", clearedAt: sentAt }
            : r
        )
      )
      Promise.all(
        pendingBillReqs.map((r) =>
          fetch("/api/service-requests", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: r.id, status: "resolved", clearedBy: "Bill Sent" }),
          })
        )
      ).catch(() => {})
    }

    try {
      await fetch("/api/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table_id: table.id,
          action: "send_bill",
          sentBill,
        }),
      })
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        const bc = new BroadcastChannel("restro_sync_channel")
        bc.postMessage({
          type: "bill_sent",
          table_id: table.id,
          table_name: table.name,
          sentBill,
        })
        bc.close()
      }
      setBillSentSuccessTableId(table.id)
      setTimeout(() => {
        setBillSentSuccessTableId((prev) => (prev === table.id ? null : prev))
      }, 3000)
    } catch (err) {
      console.error("Failed to send bill to QR menu:", err)
    } finally {
      setSendingBillTableId(null)
    }
  }

  const updateSpecificTableStatus = async (targetId: number, status: TableItem["status"]) => {
    const nextIsOpen = status === "occupied"
    const targetTable = tables.find((t) => t.id === targetId)
    const nowIso = status === "available" ? new Date().toISOString() : undefined
    setTables((prev) =>
      prev.map((t) =>
        t.id === targetId
          ? {
              ...t,
              status,
              isOpen: nextIsOpen,
              ...(nowIso ? { clearedAt: nowIso, sentBill: null } : {}),
            }
          : t
      )
    )
    setSelectedTableId(null)

    if (status === "available") {
      closeTableOrdersLocally(targetId)
      if (targetTable) {
        handleClearAllTableRequests(targetTable.name).catch(() => {})
      }
    }

    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        const bc = new BroadcastChannel("restro_sync_channel")
        bc.postMessage({ type: "table_updated", table_id: targetId, status, isOpen: nextIsOpen })
        if (status === "available") {
          bc.postMessage({
            type: "table_cleared",
            table_id: targetId,
            table_name: targetTable?.name || `Table ${targetId}`,
          })
        }
        bc.close()
      }
      await fetch("/api/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table_id: targetId, status, isOpen: nextIsOpen }),
      })
    } catch {}
  }

  const setTableStatus = async (status: TableItem["status"]) => {
    if (selectedTableId === null) return
    await updateSpecificTableStatus(selectedTableId, status)
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
  const [posCustomerName, setPosCustomerName] = useState("")
  const [posCustomerPhone, setPosCustomerPhone] = useState("")
  const [posGuestValidationError, setPosGuestValidationError] = useState<string | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [orderSentToast, setOrderSentToast] = useState(false)

  // --- DYNAMIC MENU CATALOG & AVAILABILITY STATE ---
  const [menuCatalog, setMenuCatalog] = useState<MenuItem[]>(MASTER_MENU_CATALOG)
  const [menuSearch, setMenuSearch] = useState("")
  const [menuCategoryFilter, setMenuCategoryFilter] = useState("all")
  const [menuStockFilter, setMenuStockFilter] = useState<"all" | "in-stock" | "out-of-stock">("all")
  const [showAddItemModal, setShowAddItemModal] = useState(false)
  const [menuToast, setMenuToast] = useState<string | null>(null)

  // Add Item Form State
  const [newItemName, setNewItemName] = useState("")
  const [newItemPrice, setNewItemPrice] = useState("")
  const [newItemHasPortions, setNewItemHasPortions] = useState(false)
  const [newItemHalfPrice, setNewItemHalfPrice] = useState("")
  const [newItemFullPrice, setNewItemFullPrice] = useState("")
  const [newItemImage, setNewItemImage] = useState("")
  const [newItemPrepTime, setNewItemPrepTime] = useState("")
  const [newItemCategory, setNewItemCategory] = useState<"mains" | "sides" | "drinks" | "desserts">("mains")
  const [newItemStation, setNewItemStation] = useState<"kitchen" | "bar">("kitchen")
  const [newItemIsVeg, setNewItemIsVeg] = useState(true)
  const [newItemIcon, setNewItemIcon] = useState("🍲")
  const [newItemTag, setNewItemTag] = useState("")
  const [newItemDescription, setNewItemDescription] = useState("")
  const [newItemIsAvailable, setNewItemIsAvailable] = useState(true)
  const [isSavingMenuItem, setIsSavingMenuItem] = useState(false)
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | null>(null)
  const [selectedAdminMenuItem, setSelectedAdminMenuItem] = useState<MenuItem | null>(null)
  const [posPortionItem, setPosPortionItem] = useState<MenuItem | null>(null)

  const handleOpenAddMenuItem = () => {
    setEditingMenuItem(null)
    setNewItemName("")
    setNewItemPrice("")
    setNewItemHasPortions(false)
    setNewItemHalfPrice("")
    setNewItemFullPrice("")
    setNewItemImage("")
    setNewItemPrepTime("")
    setNewItemCategory("mains")
    setNewItemStation("kitchen")
    setNewItemIsVeg(true)
    setNewItemIcon("🍲")
    setNewItemTag("")
    setNewItemDescription("")
    setNewItemIsAvailable(true)
    setShowAddItemModal(true)
  }

  const handleOpenEditMenuItem = (item: MenuItem) => {
    setEditingMenuItem(item)
    setNewItemName(item.name || "")
    setNewItemPrice(String(item.price ?? ""))
    const hasPortions = Boolean(item.hasPortionOptions && item.halfPrice)
    setNewItemHasPortions(hasPortions)
    setNewItemHalfPrice(item.halfPrice ? String(item.halfPrice) : "")
    setNewItemFullPrice(item.fullPrice ? String(item.fullPrice) : String(item.price ?? ""))
    setNewItemImage(item.image || "")
    setNewItemPrepTime(item.prepTime || "")
    setNewItemCategory(item.category || "mains")
    setNewItemStation(item.station || (item.category === "drinks" ? "bar" : "kitchen"))
    setNewItemIsVeg(item.isVeg !== false)
    setNewItemIcon(item.icon || "🍲")
    setNewItemTag(item.tag || "")
    setNewItemDescription(item.description || "")
    setNewItemIsAvailable(item.isAvailable !== false)
    setShowAddItemModal(true)
  }

  // Load menu from /api/menu and listen for cross-tab sync
  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const res = await fetch("/api/menu")
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data.items)) {
            setMenuCatalog(data.items)
          }
        }
      } catch {}
    }

    fetchMenu()

    let bc: BroadcastChannel | null = null
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      bc = new BroadcastChannel("restro_sync_channel")
      bc.onmessage = (event) => {
        if (event.data?.type === "menu_updated" && Array.isArray(event.data.items)) {
          setMenuCatalog(event.data.items)
        }
      }
    }

    return () => {
      if (bc) bc.close()
    }
  }, [])

  // Toggle Item Availability Status (Available vs Out of Stock)
  const handleToggleItemAvailability = async (item: MenuItem) => {
    const nextAvailable = item.isAvailable === false ? true : false
    const updatedCatalog = menuCatalog.map((m) =>
      m.id === item.id ? { ...m, isAvailable: nextAvailable } : m
    )
    setMenuCatalog(updatedCatalog)

    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      const bc = new BroadcastChannel("restro_sync_channel")
      bc.postMessage({ type: "menu_updated", items: updatedCatalog })
      bc.close()
    }

    setMenuToast(`${item.name} is now ${nextAvailable ? "In Stock (Available)" : "Out of Stock"}`)
    setTimeout(() => setMenuToast(null), 3500)

    try {
      await fetch("/api/menu", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, isAvailable: nextAvailable }),
      })
    } catch (err) {
      console.error("Failed to update menu item status:", err)
    }
  }

  // Remove Item from Menu
  const handleRemoveMenuItem = async (item: MenuItem) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to remove "${item.name}" from the menu? It will be removed from all POS screens and Customer QR menus.`
    )
    if (!confirmDelete) return

    const updatedCatalog = menuCatalog.filter((m) => m.id !== item.id)
    setMenuCatalog(updatedCatalog)

    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      const bc = new BroadcastChannel("restro_sync_channel")
      bc.postMessage({ type: "menu_updated", items: updatedCatalog })
      bc.close()
    }

    setMenuToast(`Removed "${item.name}" from menu`)
    setTimeout(() => setMenuToast(null), 3500)

    try {
      await fetch(`/api/menu?id=${item.id}`, {
        method: "DELETE",
      })
    } catch (err) {
      console.error("Failed to delete menu item:", err)
    }
  }

  // Add or Edit Menu Item
  const handleAddMenuItem = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const baseFullPrice = newItemHasPortions
      ? parseFloat(newItemFullPrice || newItemPrice) || 0
      : parseFloat(newItemPrice) || 0
    const parsedHalfPrice = newItemHasPortions ? parseFloat(newItemHalfPrice) || 0 : 0

    if (!newItemName.trim() || baseFullPrice <= 0) {
      showAlert("Please enter a dish name and valid price.")
      return
    }
    if (newItemHasPortions && parsedHalfPrice <= 0) {
      showAlert("Please enter a valid Half portion price or uncheck Half & Full options.")
      return
    }

    setIsSavingMenuItem(true)
    try {
      const targetId = editingMenuItem ? editingMenuItem.id : `m_${Date.now()}`
      const itemPayload: MenuItem = {
        ...(editingMenuItem || {}),
        id: targetId,
        name: newItemName.trim(),
        price: baseFullPrice,
        hasPortionOptions: newItemHasPortions,
        halfPrice: newItemHasPortions ? parsedHalfPrice : undefined,
        fullPrice: newItemHasPortions ? baseFullPrice : undefined,
        image: newItemImage.trim() || undefined,
        prepTime: newItemPrepTime.trim() || undefined,
        category: newItemCategory,
        station: newItemCategory === "drinks" ? "bar" : newItemStation,
        isVeg: newItemIsVeg,
        icon: newItemIcon || "🍽️",
        tag: newItemTag.trim() || undefined,
        description: newItemDescription.trim() || undefined,
        isAvailable: newItemIsAvailable,
      }

      const updatedCatalog = editingMenuItem
        ? menuCatalog.map((m) => (m.id === editingMenuItem.id ? itemPayload : m))
        : [itemPayload, ...menuCatalog]
      setMenuCatalog(updatedCatalog)

      if (selectedAdminMenuItem && selectedAdminMenuItem.id === targetId) {
        setSelectedAdminMenuItem(itemPayload)
      }

      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        const bc = new BroadcastChannel("restro_sync_channel")
        bc.postMessage({ type: "menu_updated", items: updatedCatalog })
        bc.close()
      }

      if (editingMenuItem) {
        await fetch("/api/menu", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingMenuItem.id,
            name: itemPayload.name,
            price: itemPayload.price,
            hasPortionOptions: itemPayload.hasPortionOptions,
            halfPrice: itemPayload.halfPrice ?? null,
            fullPrice: itemPayload.fullPrice ?? null,
            image: itemPayload.image ?? "",
            prepTime: itemPayload.prepTime ?? "",
            category: itemPayload.category,
            station: itemPayload.station,
            isVeg: itemPayload.isVeg,
            icon: itemPayload.icon,
            tag: itemPayload.tag ?? "",
            description: itemPayload.description ?? "",
            isAvailable: itemPayload.isAvailable,
          }),
        })
      } else {
        await fetch("/api/menu", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(itemPayload),
        })
      }

      const actionWord = editingMenuItem ? "Updated" : "Added"

      // Reset form
      setEditingMenuItem(null)
      setNewItemName("")
      setNewItemPrice("")
      setNewItemHasPortions(false)
      setNewItemHalfPrice("")
      setNewItemFullPrice("")
      setNewItemImage("")
      setNewItemPrepTime("")
      setNewItemTag("")
      setNewItemDescription("")
      setNewItemIcon("🍲")
      setNewItemIsAvailable(true)
      setShowAddItemModal(false)

      setMenuToast(`${actionWord} "${itemPayload.name}" in menu!`)
      setTimeout(() => setMenuToast(null), 3500)
    } catch (err) {
      console.error("Failed to save menu item:", err)
      showAlert("Could not save menu item. Please try again.")
    } finally {
      setIsSavingMenuItem(false)
    }
  }

  // --- INVENTORY / RAW MATERIALS STATE ---
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>(MASTER_INVENTORY_CATALOG)
  const [stockMovements, setStockMovements] = useState<StockMovement[]>(MASTER_STOCK_MOVEMENTS)
  const [inventoryLoading, setInventoryLoading] = useState(false)
  const [inventorySearch, setInventorySearch] = useState("")
  const [inventoryCategoryFilter, setInventoryCategoryFilter] = useState("all")
  const [inventoryStockFilter, setInventoryStockFilter] = useState<"all" | "low" | "out" | "healthy">("all")
  const [inventoryViewMode, setInventoryViewMode] = useState<"table" | "card">("table")
  const [inventoryToast, setInventoryToast] = useState<string | null>(null)

  // Modals state
  const [showAddMaterialModal, setShowAddMaterialModal] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState<InventoryItem | null>(null)
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false)
  const [adjustmentTargetItem, setAdjustmentTargetItem] = useState<InventoryItem | null>(null)
  const [showMovementsLogModal, setShowMovementsLogModal] = useState(false)
  const [isSavingInventory, setIsSavingInventory] = useState(false)

  // Add / Edit Material Form
  const [matName, setMatName] = useState("")
  const [matCategory, setMatCategory] = useState("Produce")
  const [matStock, setMatStock] = useState("10")
  const [matUnit, setMatUnit] = useState("kg")
  const [matMinStock, setMatMinStock] = useState("5")
  const [matOptimalStock, setMatOptimalStock] = useState("20")
  const [matCost, setMatCost] = useState("120")
  const [matSupplier, setMatSupplier] = useState("")
  const [matLocation, setMatLocation] = useState("Walk-in Chiller")
  const [matExpiryDate, setMatExpiryDate] = useState("")
  const [matNotes, setMatNotes] = useState("")

  // Adjustment Modal Form
  const [adjItemId, setAdjItemId] = useState("")
  const [adjType, setAdjType] = useState<"RESTOCK" | "USAGE" | "WASTE" | "AUDIT">("RESTOCK")
  const [adjQty, setAdjQty] = useState("5")
  const [adjReason, setAdjReason] = useState("")
  const [adjStaff, setAdjStaff] = useState("Manager Vikram")

  // --- FRONT DESK & LIVE TABLE SERVICE REQUESTS QUEUE ---
  const [serviceRequests, setServiceRequests] = useState<ServiceRequestItem[]>([])
  const [showServiceDropdown, setShowServiceDropdown] = useState(false)
  const [serviceQueueFilter, setServiceQueueFilter] = useState<"all" | "waiter" | "clean" | "bill">("all")
  const [serviceToast, setServiceToast] = useState<string | null>(null)
  const [showWaiterOverlay, setShowWaiterOverlay] = useState(false)
  const [isBellMuted, setIsBellMuted] = useState(false)
  const knownWaiterKeysRef = useRef<Set<string>>(new Set())

  const isHostOrFrontDesk =
    userType === "restaurant-admin" ||
    (userType === "pos-staff" && posRole === "reception")

  const isHostRef = useRef(isHostOrFrontDesk)
  const isBellMutedRef = useRef(isBellMuted)
  isHostRef.current = isHostOrFrontDesk
  isBellMutedRef.current = isBellMuted

  // Unlock Web Audio context on first interaction so bell chimes play reliably
  useEffect(() => {
    const handleUnlock = () => unlockBellAudio()
    window.addEventListener("pointerdown", handleUnlock, { passive: true })
    window.addEventListener("keydown", handleUnlock, { passive: true })
    return () => {
      window.removeEventListener("pointerdown", handleUnlock)
      window.removeEventListener("keydown", handleUnlock)
    }
  }, [])

  // Refs for closing popups/dropdowns when clicked outside on free space
  const profileMenuRef = useRef<HTMLDivElement>(null)
  const serviceDropdownRef = useRef<HTMLDivElement>(null)
  const selectedTableRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node

      if (showProfileMenu && profileMenuRef.current && !profileMenuRef.current.contains(target)) {
        setShowProfileMenu(false)
      }

      if (showServiceDropdown && serviceDropdownRef.current && !serviceDropdownRef.current.contains(target)) {
        setShowServiceDropdown(false)
      }

      if (selectedTableId !== null && selectedTableRef.current && !selectedTableRef.current.contains(target)) {
        setSelectedTableId(null)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showProfileMenu, showServiceDropdown, selectedTableId])

  // Fetch Service Requests from /api/service-requests
  useEffect(() => {
    let isMounted = true

    const fetchServiceRequests = async () => {
      try {
        const res = await fetch("/api/service-requests")
        if (res.ok) {
          const data = await res.json()
          if (isMounted && Array.isArray(data.requests)) {
            setServiceRequests(data.requests)
          }
        }
      } catch (err) {
        console.warn("Failed to fetch service requests:", err)
      }
    }

    fetchServiceRequests()
    const interval = setInterval(fetchServiceRequests, 3500)

    let bc: BroadcastChannel | null = null
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      bc = new BroadcastChannel("restro_sync_channel")
      bc.onmessage = (event) => {
        if (event.data?.type === "table_service_request") {
          fetchServiceRequests()
          const actionLabel =
            event.data.serviceType === "clean"
              ? "Clean Table"
              : event.data.serviceType === "bill"
              ? "Bill Requested"
              : "Call Waiter"
          setServiceToast(`🔔 ${event.data.table}: ${actionLabel}`)
          setTimeout(() => setServiceToast(null), 5000)

          if (isHostRef.current) {
            setShowWaiterOverlay(true)
            if (!isBellMutedRef.current) {
              const sType: "waiter" | "clean" | "bill" =
                event.data.serviceType === "clean" || event.data.serviceType === "bill"
                  ? event.data.serviceType
                  : "waiter"
              playBellAndSpeak(event.data.table || "Table", sType, 3)
            }
          }
        }
      }
    }

    return () => {
      isMounted = false
      clearInterval(interval)
      if (bc) bc.close()
    }
  }, [])

  // Clear single request
  const handleClearServiceRequest = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    // Optimistic update
    setServiceRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "resolved" } : r))
    )

    try {
      const res = await fetch("/api/service-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "resolved", clearedBy: "Front Desk" }),
      })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data.requests)) {
          setServiceRequests(data.requests)
        }
      }
    } catch (err) {
      console.error("Failed to clear service request:", err)
    }
  }

  // Clear all requests for a table
  const handleClearAllTableRequests = async (tableStr: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setServiceRequests((prev) =>
      prev.map((r) =>
        r.table.toLowerCase() === tableStr.toLowerCase()
          ? { ...r, status: "resolved" }
          : r
      )
    )

    try {
      const res = await fetch("/api/service-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clearAllTable: tableStr, clearedBy: "Front Desk" }),
      })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data.requests)) {
          setServiceRequests(data.requests)
        }
      }
    } catch (err) {
      console.error("Failed to clear table requests:", err)
    }
  }

  // Pending requests list (all 3 types: Call Waiter, Clean Table, Request Bill)
  const pendingServiceRequests = useMemo(() => {
    return serviceRequests.filter((r) => r.status === "pending")
  }, [serviceRequests])

  // Trigger full-screen Host / Front Desk alert + ring bell when any new Waiter, Clean Table, or Bill request arrives
  useEffect(() => {
    if (!isHostOrFrontDesk) return
    if (pendingServiceRequests.length === 0) {
      setShowWaiterOverlay(false)
      stopServiceVoice()
      return
    }

    let newestReq: ServiceRequestItem | null = null
    for (const req of pendingServiceRequests) {
      const key = `${req.id}:${req.createdAt}`
      if (!knownWaiterKeysRef.current.has(key)) {
        knownWaiterKeysRef.current.add(key)
        if (!newestReq) newestReq = req
      }
    }

    if (newestReq) {
      setShowWaiterOverlay(true)
      if (!isBellMuted) {
        playBellAndSpeak(newestReq.table, newestReq.type, 3)
      }
    }
  }, [pendingServiceRequests, isHostOrFrontDesk, isBellMuted])

  // Repeat bell chime + voice announcement every 6s while Host Service Alert is open and unmuted
  useEffect(() => {
    if (!showWaiterOverlay || pendingServiceRequests.length === 0 || isBellMuted || !isHostOrFrontDesk) {
      return
    }
    const primary = pendingServiceRequests[0]
    const ringTimer = setInterval(() => {
      playBellAndSpeak(primary.table, primary.type, 2)
    }, 6000)
    return () => clearInterval(ringTimer)
  }, [showWaiterOverlay, pendingServiceRequests, isBellMuted, isHostOrFrontDesk])

  // Map of tableNumber -> pending requests
  const tableRequestsMap = useMemo(() => {
    const map: Record<number, ServiceRequestItem[]> = {}
    for (const req of pendingServiceRequests) {
      if (!map[req.tableNumber]) {
        map[req.tableNumber] = []
      }
      map[req.tableNumber].push(req)
    }
    return map
  }, [pendingServiceRequests])

  // Filtered queue items
  const filteredQueueRequests = useMemo(() => {
    return pendingServiceRequests.filter((r) => {
      if (serviceQueueFilter === "all") return true
      return r.type === serviceQueueFilter
    })
  }, [pendingServiceRequests, serviceQueueFilter])

  // Load Inventory from API & Subscribe to broadcast
  useEffect(() => {
    let isMounted = true
    const fetchInventory = async () => {
      try {
        const res = await fetch("/api/inventory")
        if (res.ok) {
          const data = await res.json()
          if (isMounted) {
            if (Array.isArray(data.items)) setInventoryItems(data.items)
            if (Array.isArray(data.movements)) setStockMovements(data.movements)
          }
        }
      } catch (err) {
        console.warn("Failed to fetch inventory:", err)
      }
    }

    fetchInventory()
    const interval = setInterval(fetchInventory, 5000)

    let bc: BroadcastChannel | null = null
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      bc = new BroadcastChannel("restro_sync_channel")
      bc.onmessage = (event) => {
        if (event.data?.type === "inventory_updated") {
          if (Array.isArray(event.data.items)) setInventoryItems(event.data.items)
          if (Array.isArray(event.data.movements)) setStockMovements(event.data.movements)
        }
      }
    }

    return () => {
      isMounted = false
      clearInterval(interval)
      if (bc) bc.close()
    }
  }, [])

  // Open Add Material Modal
  const handleOpenAddMaterial = () => {
    setEditingMaterial(null)
    setMatName("")
    setMatCategory("Produce")
    setMatStock("10")
    setMatUnit("kg")
    setMatMinStock("5")
    setMatOptimalStock("20")
    setMatCost("120")
    setMatSupplier("")
    setMatLocation("Walk-in Chiller")
    setMatExpiryDate("")
    setMatNotes("")
    setShowAddMaterialModal(true)
  }

  // Open Edit Material Modal
  const handleOpenEditMaterial = (item: InventoryItem) => {
    setEditingMaterial(item)
    setMatName(item.name)
    setMatCategory(item.category)
    setMatStock(String(item.currentStock))
    setMatUnit(item.unit)
    setMatMinStock(String(item.minimumStock))
    setMatOptimalStock(String(item.optimalStock))
    setMatCost(String(item.costPerUnit))
    setMatSupplier(item.supplier)
    setMatLocation(item.storageLocation)
    setMatExpiryDate(item.expiryDate || "")
    setMatNotes(item.notes || "")
    setShowAddMaterialModal(true)
  }

  // Save Material (Create or Update)
  const handleSaveMaterial = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!matName.trim()) {
      showAlert("Please enter a raw material name.")
      return
    }

    setIsSavingInventory(true)
    try {
      const payload = {
        name: matName.trim(),
        category: matCategory,
        currentStock: Number(matStock) || 0,
        unit: matUnit,
        minimumStock: Number(matMinStock) || 0,
        optimalStock: Number(matOptimalStock) || 0,
        costPerUnit: Number(matCost) || 0,
        supplier: matSupplier.trim() || "General Supplier",
        storageLocation: matLocation.trim() || "Main Storage",
        expiryDate: matExpiryDate ? matExpiryDate.trim() : undefined,
        notes: matNotes.trim() || undefined,
      }

      if (editingMaterial) {
        // PATCH
        const res = await fetch("/api/inventory", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingMaterial.id, ...payload }),
        })
        if (res.ok) {
          const data = await res.json()
          setInventoryItems(data.items)
          if (data.movements) setStockMovements(data.movements)
          if (typeof window !== "undefined" && "BroadcastChannel" in window) {
            const bc = new BroadcastChannel("restro_sync_channel")
            bc.postMessage({ type: "inventory_updated", items: data.items, movements: data.movements })
            bc.close()
          }
          setInventoryToast(`Updated material "${matName}"`)
        }
      } else {
        // POST
        const res = await fetch("/api/inventory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (res.ok) {
          const data = await res.json()
          setInventoryItems(data.items)
          if (data.movements) setStockMovements(data.movements)
          if (typeof window !== "undefined" && "BroadcastChannel" in window) {
            const bc = new BroadcastChannel("restro_sync_channel")
            bc.postMessage({ type: "inventory_updated", items: data.items, movements: data.movements })
            bc.close()
          }
          setInventoryToast(`Added new raw material "${matName}"`)
        }
      }

      setShowAddMaterialModal(false)
      setTimeout(() => setInventoryToast(null), 3500)
    } catch (err) {
      console.error("Error saving material:", err)
      showAlert("Failed to save raw material. Please try again.")
    } finally {
      setIsSavingInventory(false)
    }
  }

  // Open Quick Adjustment Modal
  const handleOpenAdjustment = (item?: InventoryItem) => {
    const target = item || inventoryItems[0]
    setAdjustmentTargetItem(target || null)
    setAdjItemId(target ? target.id : "")
    setAdjType("RESTOCK")
    setAdjQty("5")
    setAdjReason("")
    setShowAdjustmentModal(true)
  }

  // Execute Stock Adjustment (Restock, Kitchen Usage, Spoilage/Waste, Audit)
  const handleExecuteAdjustment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!adjItemId) {
      showAlert("Please select an item to adjust.")
      return
    }
    const target = inventoryItems.find((i) => i.id === adjItemId)
    if (!target) return

    if (adjType === "USAGE" && isItemExpired(target.expiryDate)) {
      showAlert(`Cannot log kitchen usage for expired stock! "${target.name}" expired on ${target.expiryDate} and is marked as Out of Stock / Unusable. Please record as Spoilage / Waste instead.`)
      return
    }

    const qty = Number(adjQty)
    if (isNaN(qty) || qty <= 0) {
      showAlert("Please enter a valid positive quantity.")
      return
    }

    setIsSavingInventory(true)
    try {
      const res = await fetch("/api/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: adjItemId,
          adjustmentQty: qty,
          type: adjType,
          reason: adjReason.trim() || undefined,
          performedBy: adjStaff.trim() || "Staff",
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setInventoryItems(data.items)
        if (data.movements) setStockMovements(data.movements)
        if (typeof window !== "undefined" && "BroadcastChannel" in window) {
          const bc = new BroadcastChannel("restro_sync_channel")
          bc.postMessage({ type: "inventory_updated", items: data.items, movements: data.movements })
          bc.close()
        }
        const actionLabel =
          adjType === "RESTOCK"
            ? "Restocked"
            : adjType === "USAGE"
            ? "Logged usage for"
            : adjType === "WASTE"
            ? "Deducted waste for"
            : "Reconciled audit for"
        setInventoryToast(`${actionLabel} ${target.name} (${qty} ${target.unit})`)
        setShowAdjustmentModal(false)
        setTimeout(() => setInventoryToast(null), 3500)
      }
    } catch (err) {
      console.error("Error adjusting stock:", err)
      showAlert("Failed to adjust stock. Please try again.")
    } finally {
      setIsSavingInventory(false)
    }
  }

  // Delete Raw Material
  const handleDeleteMaterial = async (item: InventoryItem) => {
    if (!confirm(`Are you sure you want to remove "${item.name}" from inventory records?`)) return
    try {
      const res = await fetch(`/api/inventory?id=${item.id}`, { method: "DELETE" })
      if (res.ok) {
        const updated = inventoryItems.filter((i) => i.id !== item.id)
        setInventoryItems(updated)
        if (typeof window !== "undefined" && "BroadcastChannel" in window) {
          const bc = new BroadcastChannel("restro_sync_channel")
          bc.postMessage({ type: "inventory_updated", items: updated })
          bc.close()
        }
        setInventoryToast(`Removed "${item.name}" from inventory records.`)
        setTimeout(() => setInventoryToast(null), 3500)
      }
    } catch (err) {
      console.error("Error deleting material:", err)
      showAlert("Could not remove material.")
    }
  }

  // Filtered Inventory items
  const filteredInventoryItems = useMemo(() => {
    return inventoryItems.filter((item) => {
      const matchesCategory =
        inventoryCategoryFilter === "all" || item.category === inventoryCategoryFilter
      const matchesSearch =
        inventorySearch.trim() === "" ||
        item.name.toLowerCase().includes(inventorySearch.toLowerCase()) ||
        item.supplier.toLowerCase().includes(inventorySearch.toLowerCase()) ||
        item.storageLocation.toLowerCase().includes(inventorySearch.toLowerCase()) ||
        (item.notes && item.notes.toLowerCase().includes(inventorySearch.toLowerCase()))

      const isOut = isItemOutOfStock(item)
      const isLow = !isOut && item.currentStock <= item.minimumStock

      const matchesStock =
        inventoryStockFilter === "all" ||
        (inventoryStockFilter === "low" && isLow) ||
        (inventoryStockFilter === "out" && isOut) ||
        (inventoryStockFilter === "healthy" && !isOut && !isLow)

      return matchesCategory && matchesSearch && matchesStock
    })
  }, [inventoryItems, inventoryCategoryFilter, inventorySearch, inventoryStockFilter])

  // --- TEAM & STAFF DIRECTORY STATE ---
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(MASTER_TEAM_MEMBERS)
  const [teamSearch, setTeamSearch] = useState("")
  const [teamRoleFilter, setTeamRoleFilter] = useState("all")
  const [teamStatusFilter, setTeamStatusFilter] = useState<"all" | "active" | "off-duty">("all")
  const [teamViewMode, setTeamViewMode] = useState<"table" | "card">("table")
  const [teamToast, setTeamToast] = useState<string | null>(null)

  // Add / Edit Staff Modal state
  const [showAddStaffModal, setShowAddStaffModal] = useState(false)
  const [editingStaff, setEditingStaff] = useState<TeamMember | null>(null)
  const [isSavingStaff, setIsSavingStaff] = useState(false)

  // Staff Form fields
  const [staffName, setStaffName] = useState("")
  const [staffEmail, setStaffEmail] = useState("")
  const [staffPhone, setStaffPhone] = useState("")
  const [staffRole, setStaffRole] = useState<StaffRole>("pos-orders")
  const [staffDepartment, setStaffDepartment] = useState<TeamMember["department"]>("Front of House")
  const [staffStation, setStaffStation] = useState("Counter POS Terminal 01")
  const [staffShift, setStaffShift] = useState<"Morning (7 AM - 3 PM)" | "Evening (3 PM - 11 PM)" | "Full Day">("Morning (7 AM - 3 PM)")
  const [staffPin, setStaffPin] = useState("3001")
  const [staffStatus, setStaffStatus] = useState<"active" | "off-duty">("active")

  // Load Team from API
  useEffect(() => {
    let isMounted = true
    const fetchTeam = async () => {
      try {
        const res = await fetch("/api/team")
        if (res.ok) {
          const data = await res.json()
          if (isMounted && Array.isArray(data.members)) {
            setTeamMembers(data.members)
          }
        }
      } catch (err) {
        console.warn("Failed to fetch team members:", err)
      }
    }

    fetchTeam()
    const interval = setInterval(fetchTeam, 6000)

    let bc: BroadcastChannel | null = null
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      bc = new BroadcastChannel("restro_team_channel")
      bc.onmessage = (event) => {
        if (event.data?.type === "team_updated" && Array.isArray(event.data.members)) {
          setTeamMembers(event.data.members)
        }
      }
    }

    return () => {
      isMounted = false
      clearInterval(interval)
      if (bc) bc.close()
    }
  }, [])

  // Auto-fill station & department when role changes in modal
  const handleRoleChange = (selectedRole: StaffRole) => {
    setStaffRole(selectedRole)
    const defaults: Record<StaffRole, { department: TeamMember["department"]; station: string }> = {
      admin: { department: "Management", station: "Executive Office & Control Suite" },
      manager: { department: "Management", station: "Floor Operations & Staff Roster" },
      "pos-kitchen": { department: "Kitchen & Bar", station: "Kitchen Display Queue (KDS Rail)" },
      "pos-orders": { department: "Front of House", station: "Counter POS Terminal 01" },
      "pos-reception": { department: "Front of House", station: "Reception Desk & Table Waitlist" },
      bartender: { department: "Kitchen & Bar", station: "Bar Service & Draught Taps KDS" },
      inventory: { department: "Operations", station: "Raw Material Storage & Dry Room" },
    }
    const def = defaults[selectedRole]
    if (def) {
      setStaffDepartment(def.department)
      setStaffStation(def.station)
    }
  }

  // Open Add Staff Modal
  const handleOpenAddStaff = () => {
    setEditingStaff(null)
    setStaffName("")
    setStaffEmail("")
    setStaffPhone("+91 98200 11223")
    setStaffRole("pos-orders")
    setStaffDepartment("Front of House")
    setStaffStation("Counter POS Terminal 01")
    setStaffShift("Morning (7 AM - 3 PM)")
    setStaffPin(String(Math.floor(1000 + Math.random() * 9000)))
    setStaffStatus("active")
    setShowAddStaffModal(true)
  }

  // Open Edit Staff Modal
  const handleOpenEditStaff = (member: TeamMember) => {
    setEditingStaff(member)
    setStaffName(member.name)
    setStaffEmail(member.email)
    setStaffPhone(member.phone)
    setStaffRole(member.role)
    setStaffDepartment(member.department)
    setStaffStation(member.station)
    setStaffShift(member.shift)
    setStaffPin(member.pin)
    setStaffStatus(member.status)
    setShowAddStaffModal(true)
  }

  // Save Staff (Add or Edit)
  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!staffName.trim()) {
      showAlert("Staff member name is required.")
      return
    }

    setIsSavingStaff(true)
    try {
      const roleLabels: Record<StaffRole, string> = {
        admin: "Restaurant Admin & Owner",
        manager: "Restaurant Operations Manager",
        "pos-orders": "POS Cashier / Order Taker",
        "pos-kitchen": "Chef / Kitchen Cook",
        "pos-reception": "Front Desk & Hostess",
        bartender: "Mixologist & Bartender",
        inventory: "Inventory & Store Keeper",
      }

      const roleColors: Record<StaffRole, string> = {
        admin: "bg-[#C46B4E]",
        manager: "bg-slate-700",
        "pos-orders": "bg-blue-600",
        "pos-kitchen": "bg-amber-600",
        "pos-reception": "bg-blue-600",
        bartender: "bg-purple-600",
        inventory: "bg-indigo-600",
      }

      if (editingStaff) {
        // PATCH existing
        const updates = {
          name: staffName.trim(),
          email: staffEmail.trim() || `${staffName.toLowerCase().replace(/\s+/g, ".")}@nodedrbistro.com`,
          phone: staffPhone.trim(),
          role: staffRole,
          roleLabel: roleLabels[staffRole] || "Staff Member",
          department: staffDepartment,
          station: staffStation.trim(),
          shift: staffShift,
          pin: staffPin.trim(),
          status: staffStatus,
        }

        const res = await fetch("/api/team", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingStaff.id, updates }),
        })

        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data.members)) {
            setTeamMembers(data.members)
            if (typeof window !== "undefined" && "BroadcastChannel" in window) {
              const bc = new BroadcastChannel("restro_team_channel")
              bc.postMessage({ type: "team_updated", members: data.members })
              bc.close()
            }
          }
          setTeamToast(`Updated staff record for ${staffName.trim()}.`)
          setShowAddStaffModal(false)
          setTimeout(() => setTeamToast(null), 3500)
        }
      } else {
        // POST new
        const newMemberPayload = {
          name: staffName.trim(),
          email: staffEmail.trim() || `${staffName.toLowerCase().replace(/\s+/g, ".")}@nodedrbistro.com`,
          phone: staffPhone.trim(),
          role: staffRole,
          roleLabel: roleLabels[staffRole] || "Staff Member",
          department: staffDepartment,
          station: staffStation.trim(),
          shift: staffShift,
          pin: staffPin.trim(),
          status: staffStatus,
          avatarColor: roleColors[staffRole] || "bg-[#C46B4E]",
        }

        const res = await fetch("/api/team", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ member: newMemberPayload }),
        })

        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data.members)) {
            setTeamMembers(data.members)
            if (typeof window !== "undefined" && "BroadcastChannel" in window) {
              const bc = new BroadcastChannel("restro_team_channel")
              bc.postMessage({ type: "team_updated", members: data.members })
              bc.close()
            }
          }
          setTeamToast(`Added new staff member: ${staffName.trim()}.`)
          setShowAddStaffModal(false)
          setTimeout(() => setTeamToast(null), 3500)
        }
      }
    } catch (err) {
      console.error("Error saving staff member:", err)
      showAlert("Failed to save team member details.")
    } finally {
      setIsSavingStaff(false)
    }
  }

  // Toggle Staff Shift Status (Active vs Off-Duty)
  const handleToggleStaffStatus = async (member: TeamMember) => {
    try {
      const res = await fetch("/api/team", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: member.id, toggleStatus: true }),
      })

      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data.members)) {
          setTeamMembers(data.members)
          if (typeof window !== "undefined" && "BroadcastChannel" in window) {
            const bc = new BroadcastChannel("restro_team_channel")
            bc.postMessage({ type: "team_updated", members: data.members })
            bc.close()
          }
        }
        const updatedStatus = member.status === "active" ? "Off Duty" : "On Shift"
        setTeamToast(`${member.name} is now ${updatedStatus}.`)
        setTimeout(() => setTeamToast(null), 3500)
      }
    } catch (err) {
      console.error("Error toggling staff status:", err)
    }
  }

  // Delete Staff Member
  const handleDeleteStaff = async (member: TeamMember) => {
    if (member.role === "admin") {
      showAlert("The primary restaurant administrator cannot be removed.")
      return
    }
    if (!confirm(`Are you sure you want to remove "${member.name}" from the restaurant roster?`)) return

    try {
      const res = await fetch(`/api/team?id=${member.id}`, { method: "DELETE" })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data.members)) {
          setTeamMembers(data.members)
          if (typeof window !== "undefined" && "BroadcastChannel" in window) {
            const bc = new BroadcastChannel("restro_team_channel")
            bc.postMessage({ type: "team_updated", members: data.members })
            bc.close()
          }
        }
        setTeamToast(`Removed ${member.name} from restaurant staff roster.`)
        setTimeout(() => setTeamToast(null), 3500)
      } else {
        const errData = await res.json()
        showAlert(errData.error || "Could not delete staff member.")
      }
    } catch (err) {
      console.error("Error deleting staff member:", err)
      showAlert("Failed to delete staff member.")
    }
  }

  // Quick Launch Station
  const handleLaunchStation = (member: TeamMember) => {
    switch (member.role) {
      case "pos-orders":
        setActiveTab("pos")
        break
      case "pos-kitchen":
      case "bartender":
        setActiveTab("kds")
        break
      case "pos-reception":
        setActiveTab("tables")
        break
      case "inventory":
        setActiveTab("inventory")
        break
      case "admin":
      case "manager":
      default:
        setActiveTab("dashboard")
        break
    }
  }

  // Filtered Team Members
  const filteredTeamMembers = useMemo(() => {
    return teamMembers.filter((member) => {
      // Role filter
      let matchesRole = true
      if (teamRoleFilter === "admin") {
        matchesRole = member.role === "admin" || member.role === "manager"
      } else if (teamRoleFilter === "kitchen") {
        matchesRole = member.role === "pos-kitchen"
      } else if (teamRoleFilter === "pos") {
        matchesRole = member.role === "pos-orders"
      } else if (teamRoleFilter === "reception") {
        matchesRole = member.role === "pos-reception"
      } else if (teamRoleFilter === "bar") {
        matchesRole = member.role === "bartender"
      } else if (teamRoleFilter === "inventory") {
        matchesRole = member.role === "inventory"
      }

      // Status filter
      const matchesStatus =
        teamStatusFilter === "all" || member.status === teamStatusFilter

      // Search
      const q = teamSearch.trim().toLowerCase()
      const matchesSearch =
        q === "" ||
        member.name.toLowerCase().includes(q) ||
        member.email.toLowerCase().includes(q) ||
        member.phone.toLowerCase().includes(q) ||
        member.roleLabel.toLowerCase().includes(q) ||
        member.station.toLowerCase().includes(q) ||
        member.department.toLowerCase().includes(q) ||
        member.pin.includes(q)

      return matchesRole && matchesStatus && matchesSearch
    })
  }, [teamMembers, teamRoleFilter, teamStatusFilter, teamSearch])

  const addToCart = (item: MenuItem, portion?: "half" | "full") => {
    if (item.isAvailable === false) {
      showAlert(`${item.name} is currently Out of Stock and cannot be added.`)
      return
    }

    if (!portion && item.hasPortionOptions && item.halfPrice) {
      setPosPortionItem(item)
      return
    }

    const effectivePrice =
      portion === "half" && item.halfPrice
        ? item.halfPrice
        : portion === "full" && item.fullPrice
        ? item.fullPrice
        : item.price
    const cartKey = portion ? `${item.id}__${portion}` : item.id
    const displayName = portion
      ? `${item.name} (${portion === "half" ? "Half" : "Full"})`
      : item.name

    setCart((prev) => {
      const exists = prev.find((i) => i.id === cartKey)
      if (exists) {
        return prev.map((i) =>
          i.id === cartKey ? { ...i, quantity: i.quantity + 1 } : i
        )
      }
      return [...prev, { id: cartKey, name: displayName, price: effectivePrice, quantity: 1 }]
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
  const tax = subtotal * 0.05
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
        if (data.floors && Array.isArray(data.floors) && data.floors.length > 0) {
          setFloors(data.floors)
        }
      }
    } catch {}
  }

  const fetchReservations = async () => {
    try {
      const res = await fetch("/api/reservations")
      if (res.ok) {
        const data = await res.json()
        if (data.reservations && Array.isArray(data.reservations)) {
          setReservations(data.reservations)
        }
      }
    } catch {}
  }

  // Fetch orders, tables, and reservations with 3s background polling
  useEffect(() => {
    let active = true
    Promise.all([fetchOrders(), fetchTables(), fetchReservations()]).finally(() => {
      if (active) setIsBootstrapping(false)
    })
    const interval = setInterval(() => {
      fetchOrders()
      fetchTables()
      fetchReservations()
    }, 3000)
    return () => {
      active = false
      clearInterval(interval)
    }
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
      } else if (event.data.type === "table_updated" || event.data.type === "table_cleared") {
        const { table_id, status } = event.data
        const effectiveStatus = event.data.type === "table_cleared" ? "available" : status
        setTables((prev) =>
          prev.map((t) => {
            if (t.id === Number(table_id) || t.name.toLowerCase() === String(table_id).toLowerCase()) {
              return { ...t, status: effectiveStatus, isOpen: effectiveStatus === "occupied" }
            }
            return t
          })
        )
        if (effectiveStatus === "available" && table_id) {
          closeTableOrdersLocally(Number(table_id))
        }
      } else if (event.data.type === "tables_synced") {
        if (Array.isArray(event.data.tables)) {
          setTables(event.data.tables)
        } else {
          fetchTables()
        }
        if (Array.isArray(event.data.floors) && event.data.floors.length > 0) {
          setFloors(event.data.floors)
        }
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
      } else if (event.data.type === "reservation_updated") {
        fetchReservations()
        fetchTables()
      } else if (event.data.type === "refresh_orders") {
        fetchOrders()
        fetchTables()
        fetchReservations()
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
  const [kdsStationFilter, setKdsStationFilter] = useState<"all" | "kitchen" | "bar">("all")
  const [isKdsSoundMuted, setIsKdsSoundMuted] = useState(false)
  const [kdsNewOrderBanner, setKdsNewOrderBanner] = useState<string | null>(null)
  const knownKdsTicketIdsRef = useRef<Set<string>>(new Set())
  const kdsInitializedRef = useRef(false)

  // Keep KDS tickets synchronized with orders list
  useEffect(() => {
    setKdsTickets(buildKdsTicketsFromOrders(orders))
  }, [orders])

  // Play KDS chime whenever a brand-new order ticket enters the Kitchen/Bar queue
  useEffect(() => {
    if (isBootstrapping) return

    if (!kdsInitializedRef.current) {
      for (const t of kdsTickets) {
        knownKdsTicketIdsRef.current.add(t.id)
      }
      kdsInitializedRef.current = true
      return
    }

    const newlyAdded: KdsTicket[] = []
    for (const t of kdsTickets) {
      if (!knownKdsTicketIdsRef.current.has(t.id)) {
        knownKdsTicketIdsRef.current.add(t.id)
        const stationMatches = kdsStationFilter === "all" || t.station === kdsStationFilter
        if (t.stage === "new" && stationMatches) {
          newlyAdded.push(t)
        }
      }
    }

    const isKdsScreen =
      activeTab === "kds" || (userType === "pos-staff" && posRole === "kitchen")

    if (newlyAdded.length > 0 && isKdsScreen) {
      if (!isKdsSoundMuted) {
        unlockBellAudio()
        playKitchenChimeAndSpeak(
          newlyAdded.map((t) => ({
            table: t.table,
            station: t.station,
            items: t.items.map((it) => ({
              name: it.name,
              quantity: it.quantity,
              instructions: it.instructions,
            })),
          }))
        )
      }
      const first = newlyAdded[0]
      const itemsPreview = first.items
        .slice(0, 3)
        .map((it) => `${it.quantity}x ${it.name}`)
        .join(", ")
      setKdsNewOrderBanner(
        newlyAdded.length === 1
          ? `New ${first.station.toUpperCase()} Order (${first.id}) · ${first.table}${itemsPreview ? ` · ${itemsPreview}` : ""}`
          : `${newlyAdded.length} New Orders Added to Kitchen Display`
      )
      setTimeout(() => setKdsNewOrderBanner(null), 5500)
    }
  }, [kdsTickets, isBootstrapping, kdsStationFilter, activeTab, userType, posRole, isKdsSoundMuted])

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
  const [reservations, setReservations] = useState<ReservationItem[]>([
    {
      id: "RES-101",
      guestName: "Aarav Mehta",
      phone: "+91 98201 23456",
      guests: 4,
      time: "19:00 Today",
      table: "Table 3",
      status: "Confirmed",
      notes: "Window booth preferred, celebrating anniversary",
    },
    {
      id: "RES-102",
      guestName: "Priya Sharma",
      phone: "+91 98302 34567",
      guests: 2,
      time: "19:30 Today",
      table: "Table 1",
      status: "Confirmed",
      notes: "First time dining, VIP guest",
    },
    {
      id: "RES-103",
      guestName: "Rohan Malhotra",
      phone: "+91 98403 45678",
      guests: 6,
      time: "20:15 Today",
      table: "Table 6",
      status: "Confirmed",
      notes: "Corporate dinner, pre-ordered mocktails",
    },
    {
      id: "RES-104",
      guestName: "Ananya Iyer",
      phone: "+91 98104 56789",
      guests: 2,
      time: "21:00 Today",
      table: "Table 2",
      status: "Confirmed",
      notes: "Requested quiet corner",
    },
  ])
  const [showAddResModal, setShowAddResModal] = useState(false)
  const [editingReservation, setEditingReservation] = useState<ReservationItem | null>(null)
  const [reservationWarningToast, setReservationWarningToast] = useState<string | null>(null)
  const [newResGuest, setNewResGuest] = useState("")
  const [newResPhone, setNewResPhone] = useState("")
  const [newResSeats, setNewResSeats] = useState(2)
  const [newResTime, setNewResTime] = useState("19:30")
  const [newResTable, setNewResTable] = useState("Table 1")

  // Helper to find table by name or ID
  const getTableForReservation = (tableStr: string) => {
    const clean = tableStr.trim().toLowerCase()
    const num = parseInt(clean.replace(/\D/g, ""), 10)
    return tables.find((t) => t.name.toLowerCase() === clean || t.id === num)
  }

  // Change reservation status with backend synchronization & auto table occupancy
  const handleReservationStatusChange = async (resId: string, targetStatus: string) => {
    const resItem = reservations.find((r) => r.id === resId)
    if (!resItem) return false

    const currentStatus = resItem.status

    // Quick client-side check if table is available
    if (targetStatus === "Arrived" || targetStatus === "Seated") {
      const targetTable = getTableForReservation(resItem.table)
      if (
        targetTable &&
        targetTable.status !== "available" &&
        currentStatus !== "Arrived" &&
        currentStatus !== "Seated"
      ) {
        setReservationWarningToast(
          `⚠️ ${resItem.table} is currently ${targetTable.status.toUpperCase()}! You cannot mark this reservation as ${targetStatus}. Please wait until the table becomes available, or edit the reservation to choose an open table.`
        )
        setTimeout(() => setReservationWarningToast(null), 6000)
        return false
      }
    }

    try {
      const res = await fetch("/api/reservations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: resId, status: targetStatus }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        setReservationWarningToast(
          data.error || `⚠️ Could not update reservation status. Table may be occupied.`
        )
        setTimeout(() => setReservationWarningToast(null), 6000)
        return false
      }

      // Update reservations state from server
      if (data.reservations && Array.isArray(data.reservations)) {
        setReservations(data.reservations)
      } else {
        setReservations((prev) =>
          prev.map((item) => (item.id === resId ? { ...item, status: targetStatus } : item))
        )
      }

      // Update tables state from server
      if (data.tables && Array.isArray(data.tables)) {
        setTables(data.tables)
      }

      // Broadcast changes to all tabs and windows
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        const bc = new BroadcastChannel("restro_sync_channel")
        bc.postMessage({ type: "reservation_updated", resId, status: targetStatus })
        bc.postMessage({ type: "table_updated" })
        bc.close()
      }

      if (targetStatus === "Arrived") {
        setReservationWarningToast(
          `✅ ${resItem.guestName} marked as Arrived! ${resItem.table} is now Occupied on the floor plan.`
        )
        setTimeout(() => setReservationWarningToast(null), 4500)
      } else if (targetStatus === "Seated") {
        setReservationWarningToast(
          `✅ ${resItem.guestName} seated at ${resItem.table}! Floor map updated.`
        )
        setTimeout(() => setReservationWarningToast(null), 4500)
        setActiveTab("tables")
      } else if (targetStatus === "Completed" || targetStatus === "Cancelled") {
        setReservationWarningToast(
          `✅ Reservation for ${resItem.guestName} marked as ${targetStatus}. ${resItem.table} is now Available.`
        )
        setTimeout(() => setReservationWarningToast(null), 4500)
      }

      return true
    } catch {
      setReservationWarningToast("⚠️ Network error while updating reservation.")
      setTimeout(() => setReservationWarningToast(null), 5000)
      return false
    }
  }

  // Handle saving an edited reservation
  const handleSaveEditedReservation = async (updated: ReservationItem) => {
    try {
      const res = await fetch("/api/reservations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        setReservationWarningToast(
          data.error || "⚠️ Could not save edited reservation. Please verify table availability."
        )
        setTimeout(() => setReservationWarningToast(null), 6000)
        return
      }

      if (data.reservations && Array.isArray(data.reservations)) {
        setReservations(data.reservations)
      } else {
        setReservations((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
      }

      if (data.tables && Array.isArray(data.tables)) {
        setTables(data.tables)
      }

      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        const bc = new BroadcastChannel("restro_sync_channel")
        bc.postMessage({ type: "reservation_updated", resId: updated.id })
        bc.postMessage({ type: "table_updated" })
        bc.close()
      }

      setReservationWarningToast(`✅ Reservation ${updated.id} for ${updated.guestName} updated successfully!`)
      setTimeout(() => setReservationWarningToast(null), 4500)
      setEditingReservation(null)
    } catch {
      setReservationWarningToast("⚠️ Network error while saving reservation.")
      setTimeout(() => setReservationWarningToast(null), 5000)
    }
  }

  // Handle saving a brand new reservation
  const handleSaveNewReservation = async () => {
    if (!newResGuest.trim()) return

    const newResPayload = {
      id: `RES-${Math.floor(100 + Math.random() * 900)}`,
      guestName: newResGuest.trim(),
      phone: newResPhone.trim() || "+91 98765 43210",
      guests: newResSeats,
      time: `${newResTime} Today`,
      table: newResTable,
      status: "Confirmed",
      notes: "Booked via Front Desk",
    }

    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newResPayload),
      })

      const data = await res.json()

      if (data.reservations && Array.isArray(data.reservations)) {
        setReservations(data.reservations)
      } else {
        setReservations((prev) => [newResPayload, ...prev])
      }

      if (data.tables && Array.isArray(data.tables)) {
        setTables(data.tables)
      }

      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        const bc = new BroadcastChannel("restro_sync_channel")
        bc.postMessage({ type: "reservation_updated" })
        bc.close()
      }

      setReservationWarningToast(`✅ New reservation for ${newResPayload.guestName} confirmed!`)
      setTimeout(() => setReservationWarningToast(null), 4000)
    } catch {
      setReservations((prev) => [newResPayload, ...prev])
    }

    setNewResGuest("")
    setShowAddResModal(false)
  }

  // --- CUSTOMER DIRECTORY STATE (For Reception & Admin) ---
  const [customersSearch, setCustomersSearch] = useState("")
  const [customersList] = useState([
    {
      id: "CUST-01",
      name: "Aarav Mehta",
      phone: "+91 98201 23456",
      email: "aarav.mehta@corp.in",
      visits: 14,
      totalSpend: "₹14,250.00",
      loyalty: "VIP Platinum",
      lastVisit: "Yesterday",
      prefTable: "Table 3 (Booth)",
      allergies: "None"
    },
    {
      id: "CUST-02",
      name: "Priya Sharma",
      phone: "+91 98302 34567",
      email: "priya.sharma@design.org",
      visits: 4,
      totalSpend: "₹3,980.00",
      loyalty: "Silver",
      lastVisit: "3 days ago",
      prefTable: "Table 1",
      allergies: "Gluten Sensitive"
    },
    {
      id: "CUST-03",
      name: "Rohan Malhotra",
      phone: "+91 98403 45678",
      email: "rohan.m@capital.in",
      visits: 22,
      totalSpend: "₹31,800.00",
      loyalty: "VIP Gold",
      lastVisit: "Oct 28",
      prefTable: "Table 6 (Executive)",
      allergies: "Shellfish Allergy"
    },
    {
      id: "CUST-04",
      name: "Rajesh Verma",
      phone: "+91 98105 67890",
      email: "rajesh.v@tech.in",
      visits: 8,
      totalSpend: "₹7,600.00",
      loyalty: "Gold",
      lastVisit: "Nov 02",
      prefTable: "Table 4",
      allergies: "None"
    },
    {
      id: "CUST-05",
      name: "Sunita Rao",
      phone: "+91 98706 78901",
      email: "sunita.r@studio.net",
      visits: 5,
      totalSpend: "₹3,900.00",
      loyalty: "Silver",
      lastVisit: "Last week",
      prefTable: "Table 7",
      allergies: "Nut Allergy"
    }
  ])

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
    { id: "my-deliveries", label: "My Deliveries", icon: Truck },
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
    return <PortalShellSkeleton variant={activeTab} isDarkMode={isDarkMode} />
  }

  return (
    <div
      className={`h-screen overflow-hidden flex flex-col font-sans select-none antialiased transition-colors duration-200 ${
        isDarkMode ? "bg-[#20252B] text-[#F7F5F0]" : "bg-[#F7F5F0] text-[#20252B]"
      }`}
    >
      {/* Custom Alert Modal (replaces native JS alert) */}
      {showCustomAlert && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-sm">
          <div className="bg-white rounded-xl p-8 max-w-sm w-full border border-slate-200 shadow-2xl text-center">
            <div className="text-slate-500 text-4xl mb-4">ℹ</div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Information</h3>
            <p className="text-slate-600 text-sm mb-6 whitespace-pre-line">{customAlertMessage}</p>
            <button
              onClick={() => setShowCustomAlert(false)}
              className="px-6 py-2 rounded-xl bg-[#C46B4E] text-white font-semibold text-sm transition hover:bg-[#B25C40]"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Top Production Status Bar */}
      <div
        className={`sticky top-0 z-40 px-4 py-1.5 text-xs font-medium flex items-center justify-between border-b shrink-0 ${
          isDarkMode
            ? "bg-[#141620] border-[#202330] text-slate-300"
            : "bg-slate-100 border-slate-200 text-slate-700"
        }`}
      >
        <div className="flex items-center gap-2.5">
          <span
            className={`w-2 h-2 rounded-full animate-pulse ${
              isDarkMode ? "bg-blue-400" : "bg-[#C46B4E]"
            }`}
          />
          <span className={`font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
            Nodedr Bistro
          </span>
          <span className={isDarkMode ? "text-slate-500" : "text-slate-400"}>•</span>
          <span className={isDarkMode ? "text-slate-400" : "text-slate-600"}>
            Downtown Main Outlet
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span
            className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${
              userType === "super-admin"
                ? isDarkMode
                  ? "bg-red-500/20 text-red-300 border-red-500/30"
                  : "bg-red-100 text-red-800 border-red-200"
                : userType === "restaurant-admin"
                ? isDarkMode
                  ? "bg-[#C46B4E]/15 text-[#E8C2B5] border-[#C46B4E]/30"
                  : "bg-[#E9E3D8] text-[#20252B] border-[#D8CFC0]"
                : isDarkMode
                ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                : "bg-[#20252B] text-white border-[#20252B]"
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

      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile drawer backdrop */}
        {sidebarOpen && (
          <div
            className="md:hidden fixed inset-0 bg-black/40 backdrop-blur-[1px] z-20"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* 2. Left Sidebar Navigation */}
        <aside
          id="main-navigation"
          aria-label="Main navigation"
          className={`${
            sidebarOpen ? "w-[240px] border-r" : "w-0"
          } max-md:absolute max-md:inset-y-0 max-md:left-0 max-md:z-40 ${
            isDarkMode
              ? "bg-[#111217] border-[#1e2029]"
              : "bg-white border-slate-200 shadow-xs"
          } flex flex-col shrink-0 transition-all duration-200 overflow-hidden z-30`}
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
                  ? "bg-[#2B323B] border-[#353D47]"
                  : "bg-[#E9E3D8] border-[#E5E1D9]"
              }`}
            >
              {userType === "super-admin" ? (
                <ShieldCheck className="w-4 h-4 text-red-400" />
              ) : (
                <Utensils className="w-4 h-4 text-[#C46B4E]" />
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
                  : restaurantSettings.restaurantName}
              </span>
            )}
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              title="Hide menu (Ctrl+B)"
              aria-label="Hide menu"
              className={`ml-auto shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition cursor-pointer ${
                isDarkMode
                  ? "text-slate-400 hover:text-white hover:bg-[#1d202b]"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
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
                    {userType === "super-admin" ? "All Tenants (Global)" : restaurantSettings.outletName}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>

              {userType === "pos-staff" && (
                <div
                  className={`mt-1.5 flex items-center justify-between px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold ${
                    isDarkMode
                      ? "bg-[#1a1d28] border-[#2b3042] text-slate-200"
                      : "bg-[#F7F5F0] border-[#E5E1D9] text-[#20252B]"
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C46B4E] animate-pulse shrink-0" />
                    <span className="truncate">
                      {posRole === "orders"
                        ? "Orders Station"
                        : posRole === "reception"
                        ? "Reception & Floor"
                        : "Kitchen/Bar Queue"}
                    </span>
                  </div>
                  <span
                    className={`text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded shrink-0 ${
                      isDarkMode
                        ? "bg-[#C46B4E]/25 text-[#F2B5A2]"
                        : "bg-[#20252B] text-white"
                    }`}
                  >
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
                  onClick={() => handleSelectTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? "bg-[#C46B4E] text-white font-semibold shadow-xs"
                      : isDarkMode
                      ? "text-slate-400 hover:text-slate-200 hover:bg-[#181a22]"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive
                          ? "text-white"
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
                onClick={() => showAlert("Enterprise Support: support@restropos.com")}
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
            isDarkMode ? "bg-[#20252B]" : "bg-[#F7F5F0]"
          }`}
        >
          {/* Top Bar */}
          <header
            className={`sticky top-0 h-14 border-b px-6 flex items-center justify-between shrink-0 gap-4 z-30 transition-all duration-200 ${
              isDarkMode
                ? "bg-[#20252B]/95 backdrop-blur-md border-[#1c1e27] shadow-sm"
                : "bg-white/95 backdrop-blur-md border-slate-200 shadow-xs"
            }`}
          >
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                title={sidebarOpen ? "Hide menu (Ctrl+B)" : "Show menu (Ctrl+B)"}
                aria-label={sidebarOpen ? "Hide menu" : "Show menu"}
                aria-expanded={sidebarOpen}
                aria-controls="main-navigation"
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition cursor-pointer ${
                  isDarkMode
                    ? "text-slate-400 hover:text-white hover:bg-[#1a1c24]"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                {sidebarOpen ? (
                  <PanelLeftClose className="w-4 h-4" />
                ) : (
                  <PanelLeftOpen className="w-4 h-4" />
                )}
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
                    ? `${restaurantSettings.restaurantName} · Orders Station`
                    : posRole === "reception"
                    ? `${restaurantSettings.restaurantName} · Reception & Floor`
                    : `${restaurantSettings.restaurantName} · Kitchen/Bar Queue`
                  : restaurantSettings.restaurantName}
              </h2>
            </div>

            {/* Authenticated Role & Station Badge */}
            <div className="flex items-center gap-2">
              {userType === "restaurant-admin" && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#E9E3D8] border border-[#E5E1D9] text-[#20252B] text-xs font-semibold">
                  <Utensils className="w-3.5 h-3.5 text-[#C46B4E]" />
                  <span>Restaurant Admin</span>
                  <span className="text-[10px] text-[#64748B] font-normal hidden sm:inline">• Full Management</span>
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
                      ? isDarkMode
                        ? "bg-blue-950/40 border-blue-800/40 text-blue-300"
                        : "bg-blue-50 border-blue-200 text-blue-900"
                      : posRole === "reception"
                      ? isDarkMode
                        ? "bg-slate-800 border-slate-700 text-slate-200"
                        : "bg-[#E9E3D8] border-[#E5E1D9] text-[#20252B]"
                      : isDarkMode
                      ? "bg-amber-950/40 border-amber-800/40 text-amber-300"
                      : "bg-[#E9E3D8] border-[#E5E1D9] text-[#20252B]"
                  }`}
                >
                  {posRole === "orders" ? (
                    <>
                      <ShoppingCart className={`w-3.5 h-3.5 ${isDarkMode ? "text-blue-400" : "text-blue-700"}`} />
                      <span>Orders Station</span>
                      <span className="text-[10px] opacity-75 font-normal hidden sm:inline">• Counter POS</span>
                    </>
                  ) : posRole === "reception" ? (
                    <>
                      <CalendarCheck className={`w-3.5 h-3.5 ${isDarkMode ? "text-amber-400" : "text-[#C46B4E]"}`} />
                      <span>Reception Desk</span>
                      <span className="text-[10px] opacity-75 font-normal hidden sm:inline">• Floor & Waitlist</span>
                    </>
                  ) : (
                    <>
                      <ChefHat className={`w-3.5 h-3.5 ${isDarkMode ? "text-amber-400" : "text-[#C46B4E]"}`} />
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

              <div className="relative" ref={serviceDropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowServiceDropdown((prev) => !prev)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition cursor-pointer ${
                    isDarkMode
                      ? "text-slate-300 hover:text-white hover:bg-[#1a1c24]"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                  title="Table Service Queue"
                >
                  <Bell className="w-4 h-4" />
                </button>
                {pendingServiceRequests.length > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-[#C46B4E] text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                    {pendingServiceRequests.length}
                  </span>
                )}

                {/* Dropdown Menu for Service Requests */}
                {showServiceDropdown && (
                  <>
                    {/* Free space click-outside backdrop */}
                    <div
                      className="fixed inset-0 z-40 bg-transparent cursor-default"
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowServiceDropdown(false)
                      }}
                    />
                    <div
                      className={`absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl shadow-2xl border p-4 space-y-3 z-50 animate-in fade-in zoom-in-95 ${
                      isDarkMode
                        ? "bg-[#161822] border-[#292c3c] text-white"
                        : "bg-white border-[#E5E1D9] text-[#20252B]"
                    }`}
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-[#E5E1D9] dark:border-[#272b3b]">
                      <div className="flex items-center gap-2">
                        <BellRing className="w-4 h-4 text-[#C46B4E]" />
                        <h4 className="text-xs font-bold">Table Service Queue</h4>
                        {pendingServiceRequests.length > 0 && (
                          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#C46B4E] text-white">
                            {pendingServiceRequests.length}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowServiceDropdown(false)}
                        className="p-1 text-[#64748B] hover:text-[#20252B] dark:hover:text-white cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {pendingServiceRequests.length === 0 ? (
                      <div className="p-4 text-center text-xs text-[#64748B]">
                        All tables clear • No pending assistance calls
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto pr-0.5">
                        {pendingServiceRequests.map((req) => (
                          <div
                            key={req.id}
                            className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                              isDarkMode
                                ? "bg-[#12141c] border-[#2b2f3e]"
                                : "bg-[#F7F5F0] border-[#E5E1D9]"
                            }`}
                          >
                            <div>
                              <div className="font-bold flex items-center gap-1.5">
                                <span className="text-[#C46B4E] font-bold">{req.table}</span>
                                <span>•</span>
                                <span>{req.title}</span>
                              </div>
                              <div className="text-[10px] text-[#64748B] flex items-center gap-1 mt-0.5">
                                <Clock className="w-3 h-3" />
                                <span>{formatTimeAgo(req.createdAt)}</span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => handleClearServiceRequest(req.id, e)}
                              className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[11px] transition flex items-center gap-1 cursor-pointer"
                            >
                              <Check className="w-3 h-3" />
                              <span>Clear</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
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
              <div className="relative" ref={profileMenuRef}>
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
                          ? "bg-blue-600"
                          : "bg-amber-600"
                        : "bg-[#C46B4E]"
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
                  <>
                    {/* Free space click-outside backdrop */}
                    <div
                      className="fixed inset-0 z-40 bg-transparent cursor-default"
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowProfileMenu(false)
                      }}
                    />
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
                  </>
                )}
              </div>
            </div>
          </header>

          {/* Main Module Content */}
          <main className="flex-1 overflow-y-auto p-6 lg:p-8 relative">
            {/* Live Service Request Toast Alert */}
            {serviceToast && (
              <div className="fixed top-20 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl bg-orange-600 text-white shadow-2xl shadow-orange-600/40 border border-orange-400 animate-bounce">
                <BellRing className="w-5 h-5 animate-pulse text-white shrink-0" />
                <span className="font-bold text-sm tracking-wide">{serviceToast}</span>
                <button
                  type="button"
                  onClick={() => setServiceToast(null)}
                  className="ml-2 hover:bg-orange-700 p-1 rounded-md text-xs text-orange-200 hover:text-white transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            {isBootstrapping || isTabLoading ? (
              <SectionContentSkeleton tab={activeTab} isDarkMode={isDarkMode} />
            ) : activeTab === "tables" ? (
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
                      {floors.length} Floor{floors.length > 1 ? "s" : ""} · {tables.length} Tables — tap a table to update status or view bill
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setShowAllQrModal(true)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#C46B4E] hover:bg-[#B25C40] text-white text-xs font-bold shadow-md shadow-2xs transition cursor-pointer"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Print Table QR Stands</span>
                    </button>
                    <a
                      href="/menu?demo=true&table=Demo%20Table%2001"
                      target="_blank"
                      rel="noreferrer"
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-medium transition cursor-pointer ${
                        isDarkMode
                          ? "border-[#272a38] bg-[#161822] hover:bg-[#1d202c] text-[#E8C2B5]"
                          : "border-slate-200 bg-white hover:bg-slate-50 text-[#C46B4E] shadow-xs"
                      }`}
                    >
                      <Utensils className="w-3.5 h-3.5 text-[#C46B4E]" />
                      <span>Preview QR Menu</span>
                    </a>
                    {userType === "restaurant-admin" && (
                      <button
                        onClick={() => {
                          setSettingsInitialSection("qr")
                          handleSelectTab("settings")
                        }}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-medium transition cursor-pointer ${
                          isDarkMode
                            ? "border-[#272a38] bg-[#161822] hover:bg-[#1d202c] text-slate-300"
                            : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-xs"
                        }`}
                      >
                        <LayoutGrid className="w-3.5 h-3.5 text-[#C46B4E]" />
                        Configure Floors &amp; Tables
                      </button>
                    )}
                  </div>
                </div>

                {/* Floor Selector Bar */}
                {floors.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedFloorFilter("all")}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                        selectedFloorFilter === "all"
                          ? "bg-[#C46B4E] border-[#C46B4E] text-white shadow-2xs"
                          : isDarkMode
                          ? "bg-[#14161f] border-[#252838] text-slate-300 hover:bg-[#1c1f2b]"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      All Floors ({tables.length})
                    </button>
                    {floors.map((fl, fIdx) => {
                      const floorNum = fIdx + 1
                      const count = tables.filter((t) => (t.floorNumber || 1) === floorNum).length
                      const active = selectedFloorFilter === floorNum
                      return (
                        <button
                          key={fl.id || floorNum}
                          type="button"
                          onClick={() => setSelectedFloorFilter(floorNum)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                            active
                              ? "bg-[#20252B] border-[#20252B] text-white shadow-2xs"
                              : isDarkMode
                              ? "bg-[#14161f] border-[#252838] text-slate-300 hover:bg-[#1c1f2b]"
                              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          {fl.name} ({count})
                        </button>
                      )
                    })}
                  </div>
                )}

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
                        {tables
                          .filter(
                            (t) =>
                              selectedFloorFilter === "all" ||
                              (t.floorNumber || 1) === selectedFloorFilter
                          )
                          .map((table) => {
                          const isAvailable = table.status === "available"
                          const isOccupied = table.status === "occupied"
                          const isReserved = table.status === "reserved"
                          const isSelected = selectedTableId === table.id
                          const activeTableRequests = tableRequestsMap[table.id] || []
                          const hasActiveRequest = activeTableRequests.length > 0

                          return (
                            <div
                              key={table.id}
                              ref={isSelected ? selectedTableRef : undefined}
                              className="relative group"
                            >
                              {/* Active Service Call Badge */}
                              {hasActiveRequest && (
                                <div className="absolute -top-2.5 -left-2 z-20 flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#C46B4E] text-white text-[9px] font-bold shadow-md animate-bounce border-2 border-white dark:border-[#14161f]">
                                  {activeTableRequests[0].type === "clean" ? (
                                    <>
                                      <Sparkles className="w-2.5 h-2.5" />
                                      <span>Clean</span>
                                    </>
                                  ) : activeTableRequests[0].type === "bill" ? (
                                    <>
                                      <Receipt className="w-2.5 h-2.5" />
                                      <span>Bill</span>
                                    </>
                                  ) : (
                                    <>
                                      <BellRing className="w-2.5 h-2.5" />
                                      <span>Call</span>
                                    </>
                                  )}
                                </div>
                              )}

                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setShowQrModal(table)
                                  setSelectedTableId(null)
                                }}
                                className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/20 hover:bg-[#C46B4E] text-white/70 hover:text-white transition cursor-pointer z-10"
                                title={`View ${table.name} QR Code`}
                              >
                                <QrCode className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() =>
                                  setSelectedTableId(isSelected ? null : table.id)
                                }
                                className={`w-full h-24 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all relative border ${
                                  hasActiveRequest
                                    ? "ring-2 ring-[#C46B4E] shadow-md shadow-[#C46B4E]/20"
                                    : ""
                                } ${
                                  isAvailable
                                    ? isDarkMode
                                      ? "bg-[#181b24] border-[#2c3142] text-slate-200 hover:border-slate-500 shadow-lg shadow-black/20"
                                      : "bg-[#FAF8F4] border-[#D8CFC0] text-[#20252B] hover:border-[#C46B4E]/60 shadow-xs"
                                    : isOccupied
                                    ? isDarkMode
                                      ? "bg-[#142340] border-[#3b82f6]/60 text-blue-300 hover:border-blue-400 shadow-lg shadow-blue-950/20"
                                      : "bg-blue-50 border-blue-400 text-blue-900 hover:border-blue-500 shadow-xs"
                                    : isReserved
                                    ? isDarkMode
                                      ? "bg-[#332014] border-[#f59e0b]/50 text-amber-300 hover:border-amber-400 shadow-lg shadow-amber-950/20"
                                      : "bg-amber-50 border-amber-300 text-amber-800 hover:border-amber-400 shadow-xs"
                                    : isDarkMode
                                    ? "bg-[#20222b] border-[#4b5563]/50 text-slate-400"
                                    : "bg-slate-100 border-slate-300 text-slate-600"
                                } ${isSelected ? "ring-2 ring-[#C46B4E] scale-102" : ""}`}
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
                                  {floors.length > 1 && table.floorName && (
                                    <span className="ml-1 px-1.5 py-0.2 rounded bg-black/5 dark:bg-white/10 text-[9px] font-semibold">
                                      {table.floorName}
                                    </span>
                                  )}
                                </div>
                              </button>

                              {/* Dropdown Menu when Table 1 / Selected Table is tapped */}
                              {isSelected && (
                                <>
                                  {/* Free space click-outside backdrop */}
                                  <div
                                    className="fixed inset-0 z-30 bg-transparent cursor-default"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setSelectedTableId(null)
                                    }}
                                  />
                                  <div
                                    className={`absolute top-full left-0 mt-2 w-48 rounded-xl shadow-2xl py-1.5 z-40 text-xs border ${
                                      isDarkMode
                                        ? "bg-[#181a24] border-[#2b2f40]"
                                        : "bg-white border-slate-200 text-slate-800 shadow-lg"
                                    }`}
                                  >
                                  {/* Table active requests banner inside dropdown */}
                                  {hasActiveRequest && (
                                    <div className="p-1 border-b border-[#E5E1D9] bg-amber-50/90 dark:bg-amber-950/40">
                                      <button
                                        onClick={() => handleClearAllTableRequests(table.name)}
                                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40 flex items-center justify-between transition cursor-pointer"
                                      >
                                        <span>Clear Assistance ({activeTableRequests.length})</span>
                                        <Check className="w-3.5 h-3.5 text-blue-600" />
                                      </button>
                                    </div>
                                  )}

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
                                        <Check className="w-3.5 h-3.5 text-blue-500" />
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
                                    {(isOccupied || activeTableRequests.some((r) => r.type === "bill")) && (() => {
                                      const hasBillReq = activeTableRequests.some((r) => r.type === "bill")
                                      return (
                                        <button
                                          onClick={() => {
                                            setViewBillTable(table)
                                            setSelectedTableId(null)
                                          }}
                                          className={`w-full text-left px-3 py-1.5 flex items-center justify-between gap-2 font-semibold transition cursor-pointer ${
                                            hasBillReq
                                              ? isDarkMode
                                                ? "bg-[#C46B4E]/15 text-[#E88A6B] hover:bg-[#C46B4E]/25"
                                                : "bg-amber-50 text-[#C46B4E] hover:bg-amber-100/80"
                                              : isDarkMode
                                              ? "text-indigo-300 hover:bg-[#222533]"
                                              : "text-indigo-700 hover:bg-indigo-50"
                                          }`}
                                        >
                                          <span className="flex items-center gap-2">
                                            <Receipt className={`w-3.5 h-3.5 ${hasBillReq ? "text-[#C46B4E]" : "text-indigo-600 dark:text-indigo-400"}`} />
                                            <span>{hasBillReq ? "View & Send Bill" : "View bill"}</span>
                                          </span>
                                          {hasBillReq && (
                                            <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-[#C46B4E] text-white">
                                              Req
                                            </span>
                                          )}
                                        </button>
                                      )
                                    })()}
                                    <button
                                      onClick={() => {
                                        setShowQrModal(table)
                                        setSelectedTableId(null)
                                      }}
                                      className={`w-full text-left px-3 py-1.5 flex items-center gap-2 cursor-pointer ${
                                        isDarkMode
                                          ? "text-slate-300 hover:bg-[#222533]"
                                          : "text-slate-700 hover:bg-slate-50"
                                      }`}
                                    >
                                      <QrCode className="w-3.5 h-3.5 text-[#C46B4E]" />
                                      <span>View QR code</span>
                                    </button>
                                    <button
                                      onClick={() => setActiveTab("pos")}
                                      className={`w-full text-left px-3 py-1.5 flex items-center gap-2 cursor-pointer ${
                                        isDarkMode
                                          ? "text-slate-300 hover:bg-[#222533]"
                                          : "text-slate-700 hover:bg-slate-50"
                                      }`}
                                    >
                                      <Plus className="w-3.5 h-3.5 text-blue-500" />
                                      <span>+ New order</span>
                                    </button>
                                  </div>
                                </div>
                              </>
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
                        <span className="w-2.5 h-2.5 rounded-full bg-[#FAF8F4] border-2 border-[#C46B4E]" />
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

                  {/* Right Column: Service Queue & Waitlist */}
                  <div className="space-y-6">
                    {/* Front Desk Live Service Queue Card */}
                    <div
                      className={`rounded-2xl p-5 space-y-4 border ${
                        isDarkMode
                          ? "bg-[#14161f] border-[#202330]"
                          : "bg-white border-slate-200 shadow-xs"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center">
                            <BellRing className={`w-4 h-4 ${pendingServiceRequests.length > 0 ? "animate-bounce" : ""}`} />
                          </div>
                          <div>
                            <h3
                              className={`font-bold text-sm flex items-center gap-2 ${
                                isDarkMode ? "text-white" : "text-slate-900"
                              }`}
                            >
                              Front Desk Service Queue
                              {pendingServiceRequests.length > 0 && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-orange-500 text-white animate-pulse">
                                  {pendingServiceRequests.length}
                                </span>
                              )}
                            </h3>
                            <p
                              className={`text-[11px] ${
                                isDarkMode ? "text-slate-400" : "text-slate-500"
                              }`}
                            >
                              Live table assistance calls & cleaning requests
                            </p>
                          </div>
                        </div>

                        {pendingServiceRequests.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              pendingServiceRequests.forEach((req) => handleClearServiceRequest(req.id))
                            }}
                            className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition cursor-pointer ${
                              isDarkMode
                                ? "border-[#292c3a] bg-[#1a1c26] hover:bg-[#222534] text-slate-300"
                                : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700"
                            }`}
                          >
                            Clear All
                          </button>
                        )}
                      </div>

                      {/* Filter Pills */}
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                        {(
                          [
                            { id: "all", label: `All (${pendingServiceRequests.length})` },
                            {
                              id: "waiter",
                              label: `🔔 Waiter (${
                                pendingServiceRequests.filter((r) => r.type === "waiter").length
                              })`,
                            },
                            {
                              id: "clean",
                              label: `✨ Clean (${
                                pendingServiceRequests.filter((r) => r.type === "clean").length
                              })`,
                            },
                            {
                              id: "bill",
                              label: `🧾 Bill (${
                                pendingServiceRequests.filter((r) => r.type === "bill").length
                              })`,
                            },
                          ] as const
                        ).map((tab) => {
                          const active = serviceQueueFilter === tab.id
                          return (
                            <button
                              key={tab.id}
                              type="button"
                              onClick={() => setServiceQueueFilter(tab.id)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                                active
                                  ? "bg-[#C46B4E] text-white shadow-xs"
                                  : isDarkMode
                                  ? "bg-[#1a1c26] text-slate-300 hover:bg-[#222534]"
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              }`}
                            >
                              {tab.label}
                            </button>
                          )
                        })}
                      </div>

                      {/* Requests List */}
                      {filteredQueueRequests.length === 0 ? (
                        <div
                          className={`p-8 min-h-[220px] rounded-xl border border-dashed text-center flex flex-col items-center justify-center gap-2 ${
                            isDarkMode
                              ? "border-[#262938] bg-[#1a1c26]/50 text-slate-400"
                              : "border-slate-200 bg-slate-50/50 text-slate-500"
                          }`}
                        >
                          <CheckCircle2 className="w-6 h-6 text-blue-500" />
                          <p className="text-xs font-medium">All Tables Serviced</p>
                          <p className="text-[11px] opacity-70">
                            No pending requests in this filter. Calls from the QR menu appear here instantly.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2.5 max-h-[560px] overflow-y-auto pr-1">
                          {filteredQueueRequests.map((req) => {
                            const isWaiter = req.type === "waiter"
                            const isClean = req.type === "clean"
                            const isBill = req.type === "bill"

                            return (
                              <div
                                key={req.id}
                                className={`p-3 rounded-xl border transition flex items-center justify-between gap-3 ${
                                  isDarkMode
                                    ? "bg-[#1b1d28] border-[#292c3a] hover:border-orange-500/40"
                                    : "bg-slate-50 border-slate-200 hover:border-orange-300"
                                }`}
                              >
                                <div className="flex items-start gap-3 min-w-0">
                                  <div
                                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                                      isWaiter
                                        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                        : isClean
                                        ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                                        : "bg-purple-500/15 text-purple-600 dark:text-purple-400"
                                    }`}
                                  >
                                    {isWaiter ? (
                                      <BellRing className="w-4 h-4" />
                                    ) : isClean ? (
                                      <Sparkles className="w-4 h-4" />
                                    ) : (
                                      <Receipt className="w-4 h-4" />
                                    )}
                                  </div>

                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span
                                        className={`font-bold text-xs px-2 py-0.5 rounded-md ${
                                          isDarkMode
                                            ? "bg-[#252837] text-white"
                                            : "bg-white text-slate-800 shadow-xs border border-slate-200"
                                        }`}
                                      >
                                        {req.table}
                                      </span>
                                      <span
                                        className={`text-xs font-semibold ${
                                          isDarkMode ? "text-slate-200" : "text-slate-800"
                                        }`}
                                      >
                                        {req.title}
                                      </span>
                                    </div>
                                    <div
                                      className={`text-[11px] flex items-center gap-1.5 mt-1 ${
                                        isDarkMode ? "text-slate-400" : "text-slate-500"
                                      }`}
                                    >
                                      <Clock className="w-3 h-3 shrink-0" />
                                      <span>{formatTimeAgo(req.createdAt)}</span>
                                      {req.message && (
                                        <>
                                          <span>•</span>
                                          <span className="truncate max-w-[130px] italic">"{req.message}"</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  {isBill && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const matched =
                                          tables.find(
                                            (t) =>
                                              t.id === req.tableNumber ||
                                              t.name.toLowerCase().trim() === req.table.toLowerCase().trim()
                                          ) || null
                                        if (matched) {
                                          setViewBillTable(matched)
                                        }
                                      }}
                                      title="View and send bill to customer QR menu"
                                      className="px-2.5 py-1.5 rounded-lg bg-[#C46B4E] hover:bg-[#B25C40] text-white font-semibold text-xs transition flex items-center gap-1 cursor-pointer shadow-xs active:scale-95"
                                    >
                                      <Receipt className="w-3.5 h-3.5" />
                                      <span>View & Send</span>
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={(e) => handleClearServiceRequest(req.id, e)}
                                    title="Mark as resolved / cleared"
                                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition flex items-center gap-1 cursor-pointer shadow-xs active:scale-95"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Clear</span>
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>

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
                        ? "text-blue-400 bg-blue-950/60 border-blue-800"
                        : "text-blue-700 bg-blue-50 border-blue-200"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" /> Register Active
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
                          className={`w-full rounded-xl pl-10 pr-4 py-2 text-xs focus:outline-none focus:border-[#C46B4E] border ${
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
                                ? "bg-[#C46B4E] text-white"
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
                        .sort((a, b) => {
                          const aOut = a.isAvailable === false ? 1 : 0
                          const bOut = b.isAvailable === false ? 1 : 0
                          return aOut - bOut
                        })
                        .map((item) => {
                          const isOutOfStock = item.isAvailable === false
                          const hasHalfFull = Boolean(item.hasPortionOptions && item.halfPrice)
                          return (
                            <button
                              key={item.id}
                              onClick={() => addToCart(item)}
                              className={`p-3 rounded-xl transition-all text-left flex flex-col justify-between group border relative overflow-hidden ${
                                isOutOfStock
                                  ? isDarkMode
                                    ? "bg-[#181a24]/60 border-red-900/40 opacity-70"
                                    : "bg-red-50/50 border-red-200 opacity-80"
                                  : isDarkMode
                                  ? "bg-[#1a1c26] border-[#262938] hover:border-[#C46B4E] hover:shadow-lg"
                                  : "bg-white border-[#E5E1D9] hover:border-[#C46B4E] hover:shadow-md"
                              }`}
                            >
                              <div className="w-full">
                                <div className="flex justify-between items-start gap-2">
                                  {item.image ? (
                                    <img
                                      src={item.image}
                                      alt={item.name}
                                      className="w-12 h-12 rounded-lg object-cover border border-black/10 shrink-0"
                                    />
                                  ) : (
                                    <span className="text-2xl">{item.icon}</span>
                                  )}
                                  <div className="flex flex-col items-end gap-1">
                                    {isOutOfStock ? (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400 font-bold border border-red-200 dark:border-red-800">
                                        Out of Stock
                                      </span>
                                    ) : item.tag ? (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#E9E3D8] text-[#20252B] font-semibold border border-[#E5E1D9]">
                                        {item.tag}
                                      </span>
                                    ) : null}
                                    {hasHalfFull && (
                                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 font-bold">
                                        Half / Full
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <h4
                                  className={`font-semibold text-xs mt-2 truncate ${
                                    isOutOfStock
                                      ? "text-slate-400 line-through"
                                      : isDarkMode
                                      ? "text-white"
                                      : "text-[#20252B]"
                                  }`}
                                >
                                  {item.name}
                                </h4>
                              </div>
                              <div
                                className={`flex justify-between items-center pt-2 mt-2 w-full border-t ${
                                  isDarkMode ? "border-[#232635]" : "border-[#E5E1D9]"
                                }`}
                              >
                                <span className={`text-xs font-bold ${isOutOfStock ? "text-[#64748B]" : "text-[#C46B4E]"}`}>
                                  {hasHalfFull
                                    ? `₹${item.halfPrice} / ₹${item.fullPrice || item.price}`
                                    : `₹${item.price.toFixed(2)}`}
                                </span>
                                {isOutOfStock ? (
                                  <span className="text-[10px] text-red-500 font-bold uppercase">Out</span>
                                ) : (
                                  <span className="w-5 h-5 rounded-md bg-[#C46B4E] text-white flex items-center justify-center text-xs">
                                    +
                                  </span>
                                )}
                              </div>
                            </button>
                          )
                        })}
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
                        <Receipt className="w-4 h-4 text-[#C46B4E]" />
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
                              ? "bg-[#C46B4E] text-white"
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
                            <LayoutGrid className="w-3.5 h-3.5 text-[#C46B4E]" />
                            <span>Table Number</span>
                            <span className="text-red-400">*</span>
                          </label>
                          {selectedTableId ? (
                            <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">
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
                                ? "bg-[#14161f] border-[#292c3c] text-white hover:border-[#C46B4E]/50"
                                : "bg-white border-slate-300 text-slate-900 hover:border-[#C46B4E]/50"
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

                    {/* Mandatory Customer Details */}
                    <div
                      className={`p-2.5 rounded-xl border text-xs space-y-2 transition ${
                        posGuestValidationError
                          ? "border-red-500/80 bg-red-500/10"
                          : isDarkMode
                          ? "bg-[#181a24] border-[#252837]"
                          : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`font-semibold text-[11px] flex items-center gap-1 ${
                            isDarkMode ? "text-slate-200" : "text-slate-700"
                          }`}
                        >
                          <Users className="w-3.5 h-3.5 text-[#C46B4E]" />
                          <span>Guest Name &amp; Mobile</span>
                          <span className="text-red-400">*</span>
                        </span>
                        <span className="text-[10px] font-semibold text-[#C46B4E]">Required</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        <input
                          type="text"
                          required
                          value={posCustomerName}
                          onChange={(e) => {
                            setPosCustomerName(e.target.value)
                            if (posGuestValidationError) setPosGuestValidationError(null)
                          }}
                          placeholder="Guest Name *"
                          className={`w-full text-xs rounded-lg px-2.5 py-1.5 border outline-hidden transition ${
                            isDarkMode
                              ? "bg-[#14161f] border-[#292c3c] text-white placeholder-slate-500 focus:border-[#C46B4E]"
                              : "bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-[#C46B4E]"
                          }`}
                        />
                        <input
                          type="tel"
                          required
                          value={posCustomerPhone}
                          onChange={(e) => {
                            setPosCustomerPhone(e.target.value)
                            if (posGuestValidationError) setPosGuestValidationError(null)
                          }}
                          placeholder="Mobile Number *"
                          className={`w-full text-xs rounded-lg px-2.5 py-1.5 border outline-hidden transition ${
                            isDarkMode
                              ? "bg-[#14161f] border-[#292c3c] text-white placeholder-slate-500 focus:border-[#C46B4E]"
                              : "bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-[#C46B4E]"
                          }`}
                        />
                      </div>
                      {posGuestValidationError && (
                        <p className="text-[10px] font-semibold text-red-400">
                          ⚠️ {posGuestValidationError}
                        </p>
                      )}
                    </div>

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
                              <span className="text-[#C46B4E] font-bold">
                                ₹{(i.price * i.quantity).toFixed(2)}
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
                          ₹{subtotal.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>GST (5%)</span>
                        <span
                          className={`font-medium ${
                            isDarkMode ? "text-white" : "text-slate-900"
                          }`}
                        >
                          ₹{tax.toFixed(2)}
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
                        <span className="text-[#C46B4E]">
                          ₹{total.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {orderSentToast && (
                      <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-300 text-blue-800 dark:bg-blue-950/80 dark:border-blue-500/40 dark:text-blue-300 text-xs flex items-center gap-2">
                        <Check className="w-4 h-4 text-blue-500" />
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
                          const trimmedGuestName = posCustomerName.trim()
                          const trimmedGuestPhone = posCustomerPhone.trim()
                          if (!trimmedGuestName) {
                            setPosGuestValidationError("Customer name is mandatory before placing an order.")
                            return
                          }
                          if (trimmedGuestPhone.replace(/\D/g, "").length < 7) {
                            setPosGuestValidationError("Valid mobile number (at least 7 digits) is mandatory.")
                            return
                          }
                          setPosGuestValidationError(null)

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
                          const guestNotes = `Guest: ${trimmedGuestName} | Phone: ${trimmedGuestPhone}`
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
                            customer_name: trimmedGuestName,
                            customer_phone: trimmedGuestPhone,
                            notes: guestNotes,
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
                          setPosCustomerName("")
                          setPosCustomerPhone("")
                          setPosGuestValidationError(null)

                          // Check if live orders are accepting
                          if (isAcceptingOrders === false) {
                            showAlert("Live orders are currently paused. Please ask staff for assistance or try again later.")
                            setCart([])
                            setActiveTab("orders")
                            return
                          }
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
                                customer_name: trimmedGuestName,
                                customer_phone: trimmedGuestPhone,
                                notes: guestNotes,
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
                          const trimmedGuestName = posCustomerName.trim()
                          const trimmedGuestPhone = posCustomerPhone.trim()
                          if (!trimmedGuestName) {
                            setPosGuestValidationError("Customer name is mandatory before placing an order.")
                            return
                          }
                          if (trimmedGuestPhone.replace(/\D/g, "").length < 7) {
                            setPosGuestValidationError("Valid mobile number (at least 7 digits) is mandatory.")
                            return
                          }
                          setPosGuestValidationError(null)

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
                          const guestNotes = `Guest: ${trimmedGuestName} | Phone: ${trimmedGuestPhone}`
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
                            customer_name: trimmedGuestName,
                            customer_phone: trimmedGuestPhone,
                            notes: guestNotes,
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
                          setPosCustomerName("")
                          setPosCustomerPhone("")
                          setPosGuestValidationError(null)

                          // Check if live orders are accepting
                          if (isAcceptingOrders === false) {
                            showAlert("Live orders are currently paused. Please ask staff for assistance or try again later.")
                            setCart([])
                            setActiveTab("orders")
                            return
                          }
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
                                customer_name: trimmedGuestName,
                                customer_phone: trimmedGuestPhone,
                                notes: guestNotes,
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
                        className="py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition disabled:opacity-50 shadow-xs"
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
                          ? "bg-[#C46B4E] text-white"
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
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[10px] text-[#C46B4E] font-bold">
                                    {o.table_id || "Counter"}
                                  </span>
                                  {o.source === "qr_menu" && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-[#C46B4E]/15 text-[#E8C2B5] border border-[#C46B4E]/30 flex items-center gap-1">
                                      <QrCode className="w-2.5 h-2.5 text-[#C46B4E]" />
                                      <span>QR Mobile</span>
                                    </span>
                                  )}
                                </div>
                                {(o.customer_name || o.customer_phone) && (
                                  <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                                    {[o.customer_name, o.customer_phone].filter(Boolean).join(" · ")}
                                  </div>
                                )}
                              </td>
                              <td
                                className={`py-3.5 px-4 max-w-xs ${
                                  isDarkMode ? "text-slate-300" : "text-slate-700"
                                }`}
                              >
                                {((o.order_items || []).map((item: any) => `${item.quantity}x ${item.MenuItem?.name || item.name || "Item"}`).join(", ") || "No items")}
                              </td>
                              <td className="py-3.5 px-4 text-right font-extrabold text-[#C46B4E]">
                                ₹{(typeof o.total_amount === "number" ? o.total_amount : Number(o.total_amount || 0)).toFixed(2)}
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
                                            ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
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
                                            ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                            : bStage === "preparing"
                                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                            : bStage === "completed"
                                            ? "bg-slate-500/20 text-slate-400 border border-slate-500/30"
                                            : "bg-[#E9E3D8] text-[#20252B] border border-[#C46B4E]/30"
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
                                          ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
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
                                      ? "bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30"
                                      : "bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30"
                                  }`}
                                  title={`Click to mark as ${o.payment_status === "PAID" ? "Unpaid" : "Paid"}`}
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${
                                      o.payment_status === "PAID" ? "bg-blue-400" : "bg-amber-400"
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
                                        ? "bg-[#C46B4E] text-white border-[#C46B4E]"
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
                                          className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-blue-400 hover:bg-blue-500/10 flex items-center gap-2 transition cursor-pointer"
                                        >
                                          <CheckCircle2 className="w-4 h-4 text-blue-400" />
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
                                          setReceiptPreview({
                                            title: o.table_id || o.order_number || "Order Receipt",
                                            orders: [o],
                                          })
                                        }}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition cursor-pointer ${
                                          isDarkMode ? "hover:bg-slate-800 text-slate-300" : "hover:bg-slate-100 text-slate-700"
                                        }`}
                                      >
                                        <Receipt className="w-4 h-4 text-[#C46B4E]" />
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
            ) : activeTab === "menu" ? (
              /* --- MENU CATALOG & LIVE AVAILABILITY MANAGEMENT --- */
              <div className="space-y-6 max-w-[1440px] mx-auto">
                {/* Toast Notification Banner */}
                {menuToast && (
                  <div className="p-3.5 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-800 dark:text-blue-300 text-xs font-semibold flex items-center justify-between shadow-2xs animate-in fade-in">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>{menuToast}</span>
                    </div>
                    <button
                      onClick={() => setMenuToast(null)}
                      className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Top Action Bar */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h1
                      className={`text-2xl sm:text-3xl font-bold tracking-tight ${
                        isDarkMode ? "text-white" : "text-[#20252B]"
                      }`}
                    >
                      Menu & Catalog Management
                    </h1>
                    <p
                      className={`text-xs sm:text-sm mt-1 ${
                        isDarkMode ? "text-slate-400" : "text-[#64748B]"
                      }`}
                    >
                      Add or remove items, manage categories, and toggle live availability (in stock / out of stock) synced with customer QR menus.
                    </p>
                  </div>

                  <button
                    onClick={handleOpenAddMenuItem}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#C46B4E] hover:bg-[#B25C40] text-white text-xs font-bold shadow-md transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add New Menu Item</span>
                  </button>
                </div>

                {/* Metrics Summary Strip */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div
                    className={`p-4 rounded-2xl border ${
                      isDarkMode
                        ? "bg-[#181a24] border-[#262938]"
                        : "bg-white border-[#E5E1D9] shadow-2xs"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">
                        Total Catalog Items
                      </span>
                      <Utensils className="w-4 h-4 text-[#C46B4E]" />
                    </div>
                    <div className="text-2xl font-bold mt-2 text-[#20252B] dark:text-white">
                      {menuCatalog.length}
                    </div>
                    <p className="text-[11px] text-[#64748B] mt-0.5">Dishes across all categories</p>
                  </div>

                  <div
                    className={`p-4 rounded-2xl border ${
                      isDarkMode
                        ? "bg-[#181a24] border-[#262938]"
                        : "bg-white border-[#E5E1D9] shadow-2xs"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">
                        Available (In Stock)
                      </span>
                      <CheckCircle2 className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className="text-2xl font-bold mt-2 text-blue-600 dark:text-blue-400">
                      {menuCatalog.filter((i) => i.isAvailable !== false).length}
                    </div>
                    <p className="text-[11px] text-[#64748B] mt-0.5">Orderable by customers & staff</p>
                  </div>

                  <div
                    className={`p-4 rounded-2xl border ${
                      isDarkMode
                        ? "bg-[#181a24] border-[#262938]"
                        : "bg-white border-[#E5E1D9] shadow-2xs"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">
                        Out of Stock
                      </span>
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                    </div>
                    <div className="text-2xl font-bold mt-2 text-red-600 dark:text-red-400">
                      {menuCatalog.filter((i) => i.isAvailable === false).length}
                    </div>
                    <p className="text-[11px] text-[#64748B] mt-0.5">Blocked on customer QR menu</p>
                  </div>
                </div>

                {/* Filters Strip */}
                <div
                  className={`p-4 rounded-2xl border space-y-3 ${
                    isDarkMode
                      ? "bg-[#161822] border-[#242738]"
                      : "bg-white border-[#E5E1D9] shadow-2xs"
                  }`}
                >
                  <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                    {/* Search Input */}
                    <div className="relative flex-1 max-w-md">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={menuSearch}
                        onChange={(e) => setMenuSearch(e.target.value)}
                        placeholder="Search items by name or description..."
                        className={`w-full pl-10 pr-4 py-2 rounded-xl text-xs border focus:outline-none focus:border-[#C46B4E] transition ${
                          isDarkMode
                            ? "bg-[#12141c] border-[#272b3b] text-white placeholder-slate-500"
                            : "bg-[#F7F5F0] border-[#E5E1D9] text-[#20252B] placeholder-[#64748B]"
                        }`}
                      />
                      {menuSearch && (
                        <button
                          onClick={() => setMenuSearch("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Stock Status Filter Buttons */}
                    <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#F7F5F0] dark:bg-[#12141c] border border-[#E5E1D9] dark:border-[#272b3b]">
                      <button
                        onClick={() => setMenuStockFilter("all")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                          menuStockFilter === "all"
                            ? "bg-[#C46B4E] text-white shadow-2xs"
                            : "text-[#64748B] hover:text-[#20252B] dark:hover:text-white"
                        }`}
                      >
                        All Status ({menuCatalog.length})
                      </button>
                      <button
                        onClick={() => setMenuStockFilter("in-stock")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                          menuStockFilter === "in-stock"
                            ? "bg-blue-600 text-white shadow-2xs"
                            : "text-blue-700 dark:text-blue-400 hover:text-blue-900"
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        In Stock ({menuCatalog.filter((i) => i.isAvailable !== false).length})
                      </button>
                      <button
                        onClick={() => setMenuStockFilter("out-of-stock")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                          menuStockFilter === "out-of-stock"
                            ? "bg-red-600 text-white shadow-2xs"
                            : "text-red-700 dark:text-red-400 hover:text-red-900"
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                        Out of Stock ({menuCatalog.filter((i) => i.isAvailable === false).length})
                      </button>
                    </div>
                  </div>

                  {/* Category Filter Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1">
                    {[
                      { id: "all", label: "All Categories", count: menuCatalog.length },
                      { id: "mains", label: "Mains & Pizza", count: menuCatalog.filter((i) => i.category === "mains").length },
                      { id: "sides", label: "Sides & Fries", count: menuCatalog.filter((i) => i.category === "sides").length },
                      { id: "drinks", label: "Drinks & Bar", count: menuCatalog.filter((i) => i.category === "drinks").length },
                      { id: "desserts", label: "Desserts", count: menuCatalog.filter((i) => i.category === "desserts").length },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setMenuCategoryFilter(cat.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                          menuCategoryFilter === cat.id
                            ? "bg-[#C46B4E] text-white shadow-2xs"
                            : isDarkMode
                            ? "bg-[#12141c] text-slate-400 hover:text-white border border-[#272b3b]"
                            : "bg-[#F7F5F0] text-[#64748B] hover:text-[#20252B] border border-[#E5E1D9]"
                        }`}
                      >
                        {cat.label} ({cat.count})
                      </button>
                    ))}
                  </div>
                </div>

                {/* Items Grid & Management Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {menuCatalog
                    .filter((item) => {
                      const matchesCategory = menuCategoryFilter === "all" || item.category === menuCategoryFilter
                      const matchesSearch =
                        item.name.toLowerCase().includes(menuSearch.toLowerCase()) ||
                        (item.description && item.description.toLowerCase().includes(menuSearch.toLowerCase()))
                      const matchesStock =
                        menuStockFilter === "all" ||
                        (menuStockFilter === "in-stock" && item.isAvailable !== false) ||
                        (menuStockFilter === "out-of-stock" && item.isAvailable === false)
                      return matchesCategory && matchesSearch && matchesStock
                    })
                    .sort((a, b) => {
                      const aOut = a.isAvailable === false ? 1 : 0
                      const bOut = b.isAvailable === false ? 1 : 0
                      return aOut - bOut
                    })
                    .map((item) => {
                      const isOutOfStock = item.isAvailable === false
                      const hasHalfFull = Boolean(item.hasPortionOptions && item.halfPrice)
                      return (
                        <div
                          key={item.id}
                          onClick={() => setSelectedAdminMenuItem(item)}
                          className={`rounded-2xl border transition-all flex flex-col justify-between overflow-hidden cursor-pointer ${
                            isOutOfStock
                              ? isDarkMode
                                ? "bg-[#181a24]/60 border-red-900/30 opacity-80"
                                : "bg-red-50/40 border-red-200"
                              : isDarkMode
                              ? "bg-[#161822] border-[#262a3b] hover:border-[#C46B4E]"
                              : "bg-white border-[#E5E1D9] hover:border-[#C46B4E] shadow-2xs"
                          }`}
                        >
                          {/* Food Photo Header */}
                          <div className="relative h-40 w-full bg-[#F7F5F0] dark:bg-[#1f2231] overflow-hidden flex items-center justify-center">
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={item.name}
                                className={`w-full h-full object-cover transition-transform duration-300 hover:scale-105 ${isOutOfStock ? "grayscale" : ""}`}
                                loading="lazy"
                              />
                            ) : (
                              <span className="text-5xl">{item.icon}</span>
                            )}
                            <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                              {hasHalfFull && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/75 text-white backdrop-blur-xs">
                                  Half / Full
                                </span>
                              )}
                            </div>
                            <div className="absolute top-2.5 right-2.5">
                              {isOutOfStock ? (
                                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-600/95 text-white flex items-center gap-1 shadow-xs">
                                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                  Out of Stock
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-600/95 text-white flex items-center gap-1 shadow-xs">
                                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                                  In Stock
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="p-4 flex-1 flex flex-col justify-between">
                            <div className="space-y-3">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span
                                      className={`w-3 h-3 rounded-xs border flex items-center justify-center shrink-0 ${
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
                                    <h3
                                      className={`font-bold text-sm leading-tight ${
                                        isOutOfStock
                                          ? "line-through text-slate-400"
                                          : isDarkMode
                                          ? "text-white"
                                          : "text-[#20252B]"
                                      }`}
                                    >
                                      {item.name}
                                    </h3>
                                  </div>
                                  <div className="text-sm font-extrabold text-[#C46B4E] mt-1">
                                    {hasHalfFull
                                      ? `Half ₹${item.halfPrice} · Full ₹${item.fullPrice || item.price}`
                                      : `₹${item.price.toFixed(2)}`}
                                  </div>
                                </div>
                              </div>

                              {/* Tags & Routing Station */}
                              <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                                <span className="px-2 py-0.5 rounded-md bg-[#E9E3D8] text-[#20252B] font-medium border border-[#E5E1D9] capitalize">
                                  {item.category}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-md font-medium border ${
                                    item.station === "bar" || item.category === "drinks"
                                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                      : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                                  }`}
                                >
                                  {item.station === "bar" || item.category === "drinks" ? "Bar Station" : "Kitchen Station"}
                                </span>
                                {item.tag && (
                                  <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-medium">
                                    {item.tag}
                                  </span>
                                )}
                              </div>

                              {item.description && (
                                <p className="text-xs text-[#64748B] line-clamp-2 leading-relaxed">
                                  {item.description}
                                </p>
                              )}
                            </div>

                            {/* Action Buttons: Toggle Stock & Delete */}
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="pt-3 mt-3 border-t border-[#E5E1D9] dark:border-[#272b3b] flex items-center justify-between gap-2"
                            >
                              {/* Toggle Availability Button */}
                              <button
                                onClick={() => handleToggleItemAvailability(item)}
                                className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 border ${
                                  isOutOfStock
                                    ? "bg-blue-600 hover:bg-blue-500 text-white border-blue-500 shadow-2xs"
                                    : "bg-white dark:bg-[#12141c] hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/40"
                                }`}
                              >
                                {isOutOfStock ? (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Mark In Stock</span>
                                  </>
                                ) : (
                                  <>
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    <span>Mark Out of Stock</span>
                                  </>
                                )}
                              </button>

                              {/* Edit Item Button */}
                              <button
                                type="button"
                                onClick={() => handleOpenEditMenuItem(item)}
                                title="Edit Item"
                                className="p-1.5 rounded-xl border border-[#E5E1D9] dark:border-[#2c3144] bg-white dark:bg-[#12141c] text-[#20252B] dark:text-slate-200 hover:border-[#C46B4E] hover:text-[#C46B4E] transition cursor-pointer"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>

                              {/* Remove Item Button */}
                              <button
                                onClick={() => handleRemoveMenuItem(item)}
                                title="Delete Item"
                                className="p-1.5 rounded-xl border border-red-200 dark:border-red-900/40 bg-white dark:bg-[#12141c] text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>
            ) : activeTab === "inventory" ? (
              /* --- INVENTORY & RAW MATERIALS MANAGEMENT --- */
              <div className="space-y-6 max-w-[1440px] mx-auto">
                {/* Toast Notification Banner */}
                {inventoryToast && (
                  <div className="p-3.5 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-800 dark:text-blue-300 text-xs font-semibold flex items-center justify-between shadow-2xs animate-in fade-in">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>{inventoryToast}</span>
                    </div>
                    <button
                      onClick={() => setInventoryToast(null)}
                      className="text-xs hover:opacity-70 transition cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                {/* Header Strip & Action Buttons */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-[#C46B4E]/15 border border-[#C46B4E]/30 flex items-center justify-center text-[#C46B4E]">
                        <Boxes className="w-5 h-5" />
                      </div>
                      <div>
                        <h1
                          className={`text-2xl font-bold tracking-tight ${
                            isDarkMode ? "text-white" : "text-[#20252B]"
                          }`}
                        >
                          Raw Materials & Inventory
                        </h1>
                        <p className="text-xs text-[#64748B] mt-0.5">
                          Track raw ingredients, stock levels, unit costs, supplier sources, and log consumption/restock movements.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 flex-wrap">
                    <button
                      onClick={() => setShowMovementsLogModal(true)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 cursor-pointer ${
                        isDarkMode
                          ? "bg-[#161822] border-[#262a3b] text-slate-300 hover:bg-[#1f2230]"
                          : "bg-white border-[#E5E1D9] text-[#20252B] hover:bg-[#F7F5F0]"
                      }`}
                    >
                      <History className="w-4 h-4 text-[#64748B]" />
                      <span>Stock Movement Log</span>
                      {stockMovements.length > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#E9E3D8] text-[#20252B] font-bold">
                          {stockMovements.length}
                        </span>
                      )}
                    </button>

                    <button
                      onClick={() => handleOpenAdjustment()}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 cursor-pointer ${
                        isDarkMode
                          ? "bg-[#161822] border-[#262a3b] text-slate-300 hover:bg-[#1f2230]"
                          : "bg-white border-[#E5E1D9] text-[#20252B] hover:bg-[#F7F5F0]"
                      }`}
                    >
                      <SlidersHorizontal className="w-4 h-4 text-[#C46B4E]" />
                      <span>Quick Adjust / Restock</span>
                    </button>

                    <button
                      onClick={handleOpenAddMaterial}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#C46B4E] hover:bg-[#B25C40] text-white transition flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Raw Material</span>
                    </button>
                  </div>
                </div>

                {/* Metrics Summary Strip */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                  {/* Valuation */}
                  <div
                    className={`p-4 rounded-2xl border ${
                      isDarkMode ? "bg-[#161822] border-[#262a3b]" : "bg-white border-[#E5E1D9] shadow-2xs"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs text-[#64748B] mb-1">
                      <span>Total Holding Value</span>
                      <DollarSign className="w-4 h-4 text-[#C46B4E]" />
                    </div>
                    <div
                      className={`text-xl font-bold ${
                        isDarkMode ? "text-white" : "text-[#20252B]"
                      }`}
                    >
                      ₹
                      {inventoryItems
                        .reduce((sum, item) => sum + item.currentStock * item.costPerUnit, 0)
                        .toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </div>
                    <p className="text-[11px] text-[#64748B] mt-1">Calculated across all stored batches</p>
                  </div>

                  {/* Tracked Materials */}
                  <div
                    className={`p-4 rounded-2xl border ${
                      isDarkMode ? "bg-[#161822] border-[#262a3b]" : "bg-white border-[#E5E1D9] shadow-2xs"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs text-[#64748B] mb-1">
                      <span>Tracked Ingredients</span>
                      <Package className="w-4 h-4 text-blue-500" />
                    </div>
                    <div
                      className={`text-xl font-bold ${
                        isDarkMode ? "text-white" : "text-[#20252B]"
                      }`}
                    >
                      {inventoryItems.length} items
                    </div>
                    <p className="text-[11px] text-[#64748B] mt-1">In {new Set(inventoryItems.map((i) => i.category)).size} unique categories</p>
                  </div>

                  {/* Low Stock Alerts */}
                  <div
                    className={`p-4 rounded-2xl border ${
                      isDarkMode
                        ? "bg-[#1e1c18] border-amber-500/30 text-amber-300"
                        : "bg-amber-50/60 border-amber-200 text-amber-900 shadow-2xs"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-semibold mb-1">
                      <span className="flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        Low Stock Alerts
                      </span>
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500/20 font-bold">
                        Reorder Needed
                      </span>
                    </div>
                    <div className="text-xl font-bold">
                      {inventoryItems.filter((i) => !isItemOutOfStock(i) && i.currentStock <= i.minimumStock && i.currentStock > 0).length} materials
                    </div>
                    <p className="text-[11px] opacity-80 mt-1">Below minimum threshold safety levels</p>
                  </div>

                  {/* Out of Stock */}
                  <div
                    className={`p-4 rounded-2xl border ${
                      isDarkMode
                        ? "bg-[#1f1618] border-red-500/30 text-red-300"
                        : "bg-red-50/60 border-red-200 text-red-900 shadow-2xs"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-semibold mb-1">
                      <span className="flex items-center gap-1.5">
                        <AlertOctagon className="w-3.5 h-3.5 text-red-600" />
                        Out of Stock
                      </span>
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-red-500/20 font-bold">
                        Critical
                      </span>
                    </div>
                    <div className="text-xl font-bold">
                      {inventoryItems.filter((i) => isItemOutOfStock(i)).length} materials
                    </div>
                    <p className="text-[11px] opacity-80 mt-1">Zero stock balance or expired/unusable</p>
                  </div>
                </div>

                {/* Filter & Search Bar */}
                <div
                  className={`p-4 rounded-2xl border space-y-3 ${
                    isDarkMode ? "bg-[#161822] border-[#262a3b]" : "bg-white border-[#E5E1D9] shadow-2xs"
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    {/* Search Input */}
                    <div className="relative flex-1 max-w-md">
                      <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B]" />
                      <input
                        type="text"
                        value={inventorySearch}
                        onChange={(e) => setInventorySearch(e.target.value)}
                        placeholder="Search by ingredient, supplier, storage location..."
                        className={`w-full pl-9.5 pr-4 py-2 rounded-xl text-xs border focus:outline-hidden focus:ring-1 focus:ring-[#C46B4E] transition ${
                          isDarkMode
                            ? "bg-[#12141c] border-[#262a3b] text-white placeholder-slate-500"
                            : "bg-[#F7F5F0] border-[#E5E1D9] text-[#20252B] placeholder-[#64748B]"
                        }`}
                      />
                    </div>

                    {/* Stock Status Filter Pills */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        onClick={() => setInventoryStockFilter("all")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                          inventoryStockFilter === "all"
                            ? "bg-[#C46B4E] text-white"
                            : isDarkMode
                            ? "bg-[#12141c] text-slate-300 hover:bg-[#1a1d29]"
                            : "bg-[#F7F5F0] text-[#20252B] hover:bg-[#E9E3D8]"
                        }`}
                      >
                        All Stock ({inventoryItems.length})
                      </button>
                      <button
                        onClick={() => setInventoryStockFilter("low")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1 ${
                          inventoryStockFilter === "low"
                            ? "bg-amber-600 text-white"
                            : isDarkMode
                            ? "bg-[#12141c] text-amber-400 hover:bg-[#1a1d29]"
                            : "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100/60"
                        }`}
                      >
                        <AlertTriangle className="w-3 h-3" />
                        <span>Low Stock ({inventoryItems.filter((i) => !isItemOutOfStock(i) && i.currentStock <= i.minimumStock && i.currentStock > 0).length})</span>
                      </button>
                      <button
                        onClick={() => setInventoryStockFilter("out")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1 ${
                          inventoryStockFilter === "out"
                            ? "bg-red-600 text-white"
                            : isDarkMode
                            ? "bg-[#12141c] text-red-400 hover:bg-[#1a1d29]"
                            : "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100/60"
                        }`}
                      >
                        <AlertOctagon className="w-3 h-3" />
                        <span>Out of Stock ({inventoryItems.filter((i) => isItemOutOfStock(i)).length})</span>
                      </button>
                      <button
                        onClick={() => setInventoryStockFilter("healthy")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1 ${
                          inventoryStockFilter === "healthy"
                            ? "bg-blue-600 text-white"
                            : isDarkMode
                            ? "bg-[#12141c] text-blue-400 hover:bg-[#1a1d29]"
                            : "bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100/60"
                        }`}
                      >
                        <Check className="w-3 h-3" />
                        <span>Adequate ({inventoryItems.filter((i) => !isItemOutOfStock(i) && i.currentStock > i.minimumStock).length})</span>
                      </button>
                    </div>

                    {/* View Switcher: Table vs Card */}
                    <div className={`flex items-center p-0.5 rounded-xl border ${isDarkMode ? "bg-[#12141c] border-[#262a3b]" : "bg-[#F7F5F0] border-[#E5E1D9]"}`}>
                      <button
                        onClick={() => setInventoryViewMode("table")}
                        title="Table View"
                        className={`p-1.5 rounded-lg transition cursor-pointer ${
                          inventoryViewMode === "table"
                            ? isDarkMode ? "bg-[#262a3b] text-white" : "bg-white text-[#20252B] shadow-2xs"
                            : "text-[#64748B] hover:text-[#20252B]"
                        }`}
                      >
                        <LayoutGrid className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setInventoryViewMode("card")}
                        title="Card Grid View"
                        className={`p-1.5 rounded-lg transition cursor-pointer ${
                          inventoryViewMode === "card"
                            ? isDarkMode ? "bg-[#262a3b] text-white" : "bg-white text-[#20252B] shadow-2xs"
                            : "text-[#64748B] hover:text-[#20252B]"
                        }`}
                      >
                        <Layers className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Category Pills Strip */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none pt-1">
                    {[
                      { id: "all", label: "All Categories", count: inventoryItems.length },
                      { id: "Dairy", label: "Dairy", count: inventoryItems.filter((i) => i.category === "Dairy").length },
                      { id: "Meat & Poultry", label: "Meat & Poultry", count: inventoryItems.filter((i) => i.category === "Meat & Poultry").length },
                      { id: "Produce", label: "Produce", count: inventoryItems.filter((i) => i.category === "Produce").length },
                      { id: "Grains & Bakery", label: "Grains & Bakery", count: inventoryItems.filter((i) => i.category === "Grains & Bakery").length },
                      { id: "Oils & Condiments", label: "Oils & Condiments", count: inventoryItems.filter((i) => i.category === "Oils & Condiments").length },
                      { id: "Beverages & Bar", label: "Beverages & Bar", count: inventoryItems.filter((i) => i.category === "Beverages & Bar").length },
                      { id: "Bakery & Sweets", label: "Bakery & Sweets", count: inventoryItems.filter((i) => i.category === "Bakery & Sweets").length },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setInventoryCategoryFilter(cat.id)}
                        className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                          inventoryCategoryFilter === cat.id
                            ? "bg-[#C46B4E] text-white"
                            : isDarkMode
                            ? "bg-[#12141c] text-slate-400 hover:text-white"
                            : "bg-[#F7F5F0] text-[#64748B] hover:text-[#20252B]"
                        }`}
                      >
                        {cat.label} ({cat.count})
                      </button>
                    ))}
                  </div>
                </div>

                {/* Items List (Table or Card) */}
                {filteredInventoryItems.length === 0 ? (
                  <div
                    className={`p-12 text-center rounded-2xl border ${
                      isDarkMode ? "bg-[#161822] border-[#262a3b]" : "bg-white border-[#E5E1D9]"
                    }`}
                  >
                    <Boxes className="w-10 h-10 mx-auto text-[#64748B] mb-2 opacity-50" />
                    <h3 className="font-semibold text-sm">No raw materials found</h3>
                    <p className="text-xs text-[#64748B] mt-1">Try adjusting your search query or filters.</p>
                  </div>
                ) : inventoryViewMode === "table" ? (
                  /* --- TABLE VIEW --- */
                  <div
                    className={`rounded-2xl border overflow-hidden ${
                      isDarkMode ? "bg-[#161822] border-[#262a3b]" : "bg-white border-[#E5E1D9] shadow-2xs"
                    }`}
                  >
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead
                          className={`border-b text-[11px] font-semibold uppercase tracking-wider ${
                            isDarkMode
                              ? "bg-[#12141c] border-[#262a3b] text-slate-400"
                              : "bg-[#F7F5F0] border-[#E5E1D9] text-[#64748B]"
                          }`}
                        >
                          <tr>
                            <th className="py-3.5 px-4 font-semibold">Raw Material</th>
                            <th className="py-3.5 px-4 font-semibold">Category</th>
                            <th className="py-3.5 px-4 font-semibold">Stock Level & Gauge</th>
                            <th className="py-3.5 px-4 font-semibold">Thresholds</th>
                            <th className="py-3.5 px-4 font-semibold">Unit Cost</th>
                            <th className="py-3.5 px-4 font-semibold">Holding Value</th>
                            <th className="py-3.5 px-4 font-semibold">Supplier & Source</th>
                            <th className="py-3.5 px-4 font-semibold">Expiry Date</th>
                            <th className="py-3.5 px-4 font-semibold">Status</th>
                            <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                          {filteredInventoryItems.map((item) => {
                            const isExpired = isItemExpired(item.expiryDate)
                            const isOut = item.currentStock === 0 || isExpired
                            const isLow = !isOut && item.currentStock <= item.minimumStock
                            const pct = Math.min(
                              100,
                              Math.round((item.currentStock / Math.max(1, item.optimalStock)) * 100)
                            )

                            return (
                              <tr
                                key={item.id}
                                className={`transition-colors ${
                                  isOut
                                    ? isDarkMode
                                      ? "bg-red-950/15 hover:bg-red-950/25"
                                      : "bg-red-50/30 hover:bg-red-50/60"
                                    : isLow
                                    ? isDarkMode
                                      ? "bg-amber-950/15 hover:bg-amber-950/25"
                                      : "bg-amber-50/30 hover:bg-amber-50/60"
                                    : isDarkMode
                                    ? "hover:bg-[#1f2230]/50"
                                    : "hover:bg-[#F7F5F0]/60"
                                }`}
                              >
                                {/* Name & Location */}
                                <td className="py-3.5 px-4 font-medium">
                                  <div className="font-bold text-[#20252B] dark:text-white flex items-center gap-1.5">
                                    <span>{item.name}</span>
                                  </div>
                                  <div className="text-[11px] text-[#64748B] flex items-center gap-1 mt-0.5">
                                    <Warehouse className="w-3 h-3 shrink-0" />
                                    <span>{item.storageLocation}</span>
                                    {item.notes && (
                                      <span className="truncate max-w-[140px] text-[10px] text-slate-400">
                                        • {item.notes}
                                      </span>
                                    )}
                                  </div>
                                </td>

                                {/* Category */}
                                <td className="py-3.5 px-4">
                                  <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#E9E3D8] dark:bg-[#262a3b] text-[#20252B] dark:text-slate-300 border border-[#E5E1D9] dark:border-transparent">
                                    {item.category}
                                  </span>
                                </td>

                                {/* Current Stock with Progress Gauge */}
                                <td className="py-3.5 px-4 min-w-[140px]">
                                  <div className="flex items-center justify-between mb-1">
                                    <span
                                      className={`font-bold text-sm ${
                                        isOut
                                          ? "text-red-600 dark:text-red-400"
                                          : isLow
                                          ? "text-amber-600 dark:text-amber-400"
                                          : "text-[#20252B] dark:text-white"
                                      }`}
                                    >
                                      {isExpired ? (
                                        <span>
                                          0 <span className="text-[10px] font-normal text-slate-500">usable ({item.currentStock} {item.unit} expired)</span>
                                        </span>
                                      ) : (
                                        <>{item.currentStock} {item.unit}</>
                                      )}
                                    </span>
                                    <span className="text-[10px] text-[#64748B]">
                                      {isExpired ? (
                                        <span className="text-red-500 font-bold uppercase tracking-wider text-[9px]">Unusable</span>
                                      ) : (
                                        <>{pct}% of {item.optimalStock}</>
                                      )}
                                    </span>
                                  </div>
                                  <div className="w-full bg-[#E5E1D9] dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all duration-300 ${
                                        isOut
                                          ? "bg-red-500"
                                          : isLow
                                          ? "bg-amber-500"
                                          : "bg-blue-500"
                                      }`}
                                      style={{ width: `${isExpired ? 100 : Math.max(5, pct)}%` }}
                                    />
                                  </div>
                                </td>

                                {/* Thresholds */}
                                <td className="py-3.5 px-4 text-[11px] text-[#64748B]">
                                  <div>
                                    Min: <span className="font-semibold text-[#20252B] dark:text-slate-200">{item.minimumStock} {item.unit}</span>
                                  </div>
                                  <div>
                                    Optimal: <span>{item.optimalStock} {item.unit}</span>
                                  </div>
                                </td>

                                {/* Unit Cost */}
                                <td className="py-3.5 px-4 font-semibold text-[#20252B] dark:text-slate-200">
                                  ₹{item.costPerUnit} <span className="text-[10px] text-[#64748B] font-normal">/{item.unit}</span>
                                </td>

                                {/* Total Value */}
                                <td className="py-3.5 px-4 font-bold text-[#20252B] dark:text-white">
                                  ₹{(item.currentStock * item.costPerUnit).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                                </td>

                                {/* Supplier & Last Restocked */}
                                <td className="py-3.5 px-4 text-[11px]">
                                  <div className="font-medium text-[#20252B] dark:text-slate-200 truncate max-w-[130px]" title={item.supplier}>
                                    {item.supplier}
                                  </div>
                                  <div className="text-[10px] text-[#64748B] flex items-center gap-1">
                                    <Clock className="w-2.5 h-2.5" />
                                    <span>{item.lastRestocked}</span>
                                  </div>
                                </td>

                                {/* Expiry Date (if not applicable then NA) */}
                                <td className="py-3.5 px-4 text-[11px]">
                                  {item.expiryDate && item.expiryDate.trim() ? (
                                    (() => {
                                      const exp = new Date(item.expiryDate)
                                      const today = new Date()
                                      const diffTime = exp.getTime() - today.getTime()
                                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                                      const isExpired = isItemExpired(item.expiryDate)
                                      const isSoon = !isExpired && diffDays <= 5

                                      return (
                                        <div>
                                          <span
                                            className={`font-semibold ${
                                              isExpired
                                                ? "text-red-600 dark:text-red-400"
                                                : isSoon
                                                ? "text-amber-600 dark:text-amber-400"
                                                : "text-[#20252B] dark:text-slate-200"
                                            }`}
                                          >
                                            {item.expiryDate}
                                          </span>
                                          {isExpired ? (
                                            <div className="text-[10px] text-red-500 font-bold">Expired</div>
                                          ) : isSoon ? (
                                            <div className="text-[10px] text-amber-500 font-medium">In {diffDays} {diffDays === 1 ? "day" : "days"}</div>
                                          ) : null}
                                        </div>
                                      )
                                    })()
                                  ) : (
                                    <span className="text-[#64748B] font-semibold px-2 py-0.5 rounded-md bg-[#F7F5F0] dark:bg-[#12141c] border border-[#E5E1D9] dark:border-[#262a3b] text-[10px]">
                                      NA
                                    </span>
                                  )}
                                </td>

                                {/* Status Badge */}
                                <td className="py-3.5 px-4">
                                  {isExpired ? (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/40 inline-flex items-center gap-1">
                                      <AlertOctagon className="w-2.5 h-2.5" />
                                      Out of Stock (Expired)
                                    </span>
                                  ) : isOut ? (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/40 inline-flex items-center gap-1">
                                      <AlertOctagon className="w-2.5 h-2.5" />
                                      Out of Stock
                                    </span>
                                  ) : isLow ? (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40 inline-flex items-center gap-1">
                                      <AlertTriangle className="w-2.5 h-2.5" />
                                      Low Stock
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-400 border border-blue-200 dark:border-blue-900/40 inline-flex items-center gap-1">
                                      <Check className="w-2.5 h-2.5" />
                                      Adequate
                                    </span>
                                  )}
                                </td>

                                {/* Actions */}
                                <td className="py-3.5 px-4 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      onClick={() => handleOpenAdjustment(item)}
                                      title="Stock Adjustment / Restock"
                                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#C46B4E]/10 hover:bg-[#C46B4E] text-[#C46B4E] hover:text-white transition cursor-pointer border border-[#C46B4E]/30"
                                    >
                                      + Restock
                                    </button>
                                    <button
                                      onClick={() => handleOpenEditMaterial(item)}
                                      title="Edit details"
                                      className="p-1.5 rounded-lg border border-[#E5E1D9] dark:border-[#262a3b] text-[#64748B] hover:text-[#20252B] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteMaterial(item)}
                                      title="Delete Raw Material"
                                      className="p-1.5 rounded-lg border border-red-200 dark:border-red-900/40 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  /* --- CARD GRID VIEW --- */
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredInventoryItems.map((item) => {
                      const isExpired = isItemExpired(item.expiryDate)
                      const isOut = item.currentStock === 0 || isExpired
                      const isLow = !isOut && item.currentStock <= item.minimumStock
                      const pct = Math.min(
                        100,
                        Math.round((item.currentStock / Math.max(1, item.optimalStock)) * 100)
                      )

                      return (
                        <div
                          key={item.id}
                          className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                            isOut
                              ? isDarkMode
                                ? "bg-red-950/15 border-red-900/40"
                                : "bg-red-50/40 border-red-200"
                              : isLow
                              ? isDarkMode
                                ? "bg-amber-950/15 border-amber-900/40"
                                : "bg-amber-50/40 border-amber-200"
                              : isDarkMode
                              ? "bg-[#161822] border-[#262a3b] hover:border-[#C46B4E]"
                              : "bg-white border-[#E5E1D9] hover:border-[#C46B4E] shadow-2xs"
                          }`}
                        >
                          <div>
                            {/* Card Header: Category & Status */}
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#E9E3D8] dark:bg-[#262a3b] text-[#20252B] dark:text-slate-300">
                                {item.category}
                              </span>

                              {isExpired ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/40 flex items-center gap-1">
                                  <AlertOctagon className="w-2.5 h-2.5" />
                                  Out of Stock (Expired)
                                </span>
                              ) : isOut ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/40 flex items-center gap-1">
                                  <AlertOctagon className="w-2.5 h-2.5" />
                                  Out of Stock
                                </span>
                              ) : isLow ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40 flex items-center gap-1">
                                  <AlertTriangle className="w-2.5 h-2.5" />
                                  Low Stock
                                </span>
                              ) : (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-400 border border-blue-200 dark:border-blue-900/40 flex items-center gap-1">
                                  <Check className="w-2.5 h-2.5" />
                                  Adequate
                                </span>
                              )}
                            </div>

                            {/* Name & Location */}
                            <h3 className="font-bold text-sm text-[#20252B] dark:text-white">
                              {item.name}
                            </h3>
                            <div className="text-[11px] text-[#64748B] flex items-center gap-1 mt-0.5">
                              <Warehouse className="w-3 h-3 shrink-0" />
                              <span>{item.storageLocation}</span>
                            </div>

                            {/* Stock Level & Visual Gauge */}
                            <div className="mt-3 p-3 rounded-xl bg-[#F7F5F0] dark:bg-[#12141c] border border-[#E5E1D9] dark:border-[#262a3b]">
                              <div className="flex items-center justify-between text-xs mb-1.5">
                                <span className="text-[#64748B]">Current Stock:</span>
                                <span className="font-bold text-sm text-[#20252B] dark:text-white">
                                  {isExpired ? (
                                    <span className="text-red-600 dark:text-red-400">
                                      0 usable <span className="text-[10px] text-slate-500 font-normal">({item.currentStock} {item.unit} expired)</span>
                                    </span>
                                  ) : (
                                    <>{item.currentStock} {item.unit}</>
                                  )}
                                </span>
                              </div>
                              <div className="w-full bg-[#E5E1D9] dark:bg-slate-800 rounded-full h-2 overflow-hidden mb-1">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    isOut
                                      ? "bg-red-500"
                                      : isLow
                                      ? "bg-amber-500"
                                      : "bg-blue-500"
                                  }`}
                                  style={{ width: `${isExpired ? 100 : Math.max(5, pct)}%` }}
                                />
                              </div>
                              <div className="flex items-center justify-between text-[10px] text-[#64748B]">
                                <span>Min: {item.minimumStock} {item.unit}</span>
                                <span>Target: {item.optimalStock} {item.unit}</span>
                              </div>
                            </div>

                            {/* Financials & Supplier */}
                            <div className="grid grid-cols-2 gap-2 mt-3 text-[11px]">
                              <div className="p-2 rounded-lg bg-[#FAF9F6] dark:bg-[#161822] border border-[#E5E1D9] dark:border-[#262a3b]">
                                <span className="text-[#64748B] block text-[10px]">Cost / Unit</span>
                                <span className="font-semibold text-[#20252B] dark:text-white">₹{item.costPerUnit}</span>
                              </div>
                              <div className="p-2 rounded-lg bg-[#FAF9F6] dark:bg-[#161822] border border-[#E5E1D9] dark:border-[#262a3b]">
                                <span className="text-[#64748B] block text-[10px]">Holding Value</span>
                                <span className="font-bold text-[#20252B] dark:text-white">₹{(item.currentStock * item.costPerUnit).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
                              </div>
                            </div>

                            <div className="text-[10px] text-[#64748B] mt-2 flex items-center justify-between">
                              <span className="truncate max-w-[140px]">Supplier: {item.supplier}</span>
                              <span>
                                Expiry:{" "}
                                <strong
                                  className={`font-semibold ${
                                    isExpired
                                      ? "text-red-600 dark:text-red-400"
                                      : "text-[#20252B] dark:text-slate-200"
                                  }`}
                                >
                                  {item.expiryDate || "NA"} {isExpired && "• Unusable"}
                                </strong>
                              </span>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="pt-4 border-t border-[#E5E1D9] dark:border-[#262a3b] mt-3 flex items-center justify-between gap-2">
                            <button
                              onClick={() => handleOpenAdjustment(item)}
                              className="flex-1 py-1.5 rounded-xl text-xs font-semibold bg-[#C46B4E] hover:bg-[#B25C40] text-white transition cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Restock</span>
                            </button>
                            <button
                              onClick={() => handleOpenEditMaterial(item)}
                              className="p-1.5 rounded-xl border border-[#E5E1D9] dark:border-[#262a3b] text-[#64748B] hover:text-[#20252B] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                              title="Edit Item"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteMaterial(item)}
                              className="p-1.5 rounded-xl border border-red-200 dark:border-red-900/40 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer"
                              title="Delete Item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ) : userType === "super-admin" && ["tenants", "subscriptions", "analytics", "audit", "platform-settings"].includes(activeTab) ? (
              <SuperAdminPortal
                activeTab={activeTab}
                isDarkMode={isDarkMode}
                onTabChange={setActiveTab}
              />
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
                      className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition flex items-center gap-1.5 shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" /> New Reservation
                    </button>
                  </div>
                </div>

                {/* Key Front Desk Metrics */}
                {reservationWarningToast && (
                  <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 flex items-center justify-between gap-3 text-xs font-semibold animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>{reservationWarningToast}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReservationWarningToast(null)}
                      className="p-1 rounded-md hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
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
                      {reservations.reduce((sum, r) => sum + (r.guests || 2), 0)} Guests
                    </div>
                    <span className="text-xs text-blue-500 mt-0.5 block">
                      {reservations.filter((r) => r.status !== "Cancelled").length} Parties Scheduled
                    </span>
                  </div>
                  <div
                    className={`p-4 rounded-2xl border ${
                      isDarkMode
                        ? "bg-[#14161f] border-[#202330]"
                        : "bg-white border-slate-200 shadow-xs"
                    }`}
                  >
                    <span className="text-[11px] font-semibold uppercase text-slate-400">Arrived / In Lobby</span>
                    <div className="text-2xl font-bold text-amber-500 mt-1">
                      {reservations.filter((r) => r.status === "Arrived").length}{" "}
                      {reservations.filter((r) => r.status === "Arrived").length === 1 ? "Party" : "Parties"}
                    </div>
                    <span className="text-xs text-amber-400 mt-0.5 block truncate">
                      {reservations.find((r) => r.status === "Arrived")
                        ? `${reservations.find((r) => r.status === "Arrived")?.guestName} (${reservations.find((r) => r.status === "Arrived")?.table})`
                        : "No guests waiting in lobby"}
                    </span>
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
                    <span className="text-[11px] font-semibold uppercase text-slate-400">Seated & Dining</span>
                    <div className="text-2xl font-bold text-blue-500 mt-1">
                      {reservations.filter((r) => r.status === "Seated").length} Parties
                    </div>
                    <span className="text-xs text-blue-400 mt-0.5 block">
                      {tables.filter((t) => t.status === "occupied").length} Tables Occupied
                    </span>
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
                              <td className="py-3.5 px-4 font-bold text-blue-500">{r.time}</td>
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
                                  <span className="text-[10px] text-[#C46B4E] block italic">
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
                                {(() => {
                                  const targetTable = getTableForReservation(r.table)
                                  const isBusy =
                                    targetTable &&
                                    targetTable.status !== "available" &&
                                    r.status !== "Arrived" &&
                                    r.status !== "Seated"

                                  return (
                                    <div>
                                      <span className="px-2 py-1 rounded-lg bg-[#E9E3D8] text-[#20252B] border border-[#E5E1D9] font-bold">
                                        {r.table}
                                      </span>
                                      {isBusy && (
                                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-0.5 mt-1">
                                          <AlertTriangle className="w-3 h-3 shrink-0" />
                                          <span>Occupied</span>
                                        </span>
                                      )}
                                    </div>
                                  )
                                })()}
                              </td>
                              <td className="py-3.5 px-4">
                                <select
                                  value={r.status}
                                  onChange={(e) => handleReservationStatusChange(r.id, e.target.value)}
                                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition cursor-pointer appearance-none ${
                                    r.status === "Arrived"
                                      ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-800"
                                      : r.status === "Confirmed"
                                      ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300 dark:border-blue-800"
                                      : r.status === "Seated"
                                      ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300 dark:border-blue-800"
                                      : r.status === "Completed"
                                      ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-300 dark:border-purple-800"
                                      : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700"
                                  }`}
                                >
                                  <option value="Confirmed">Confirmed</option>
                                  <option value="Arrived">Arrived</option>
                                  <option value="Seated">Seated</option>
                                  <option value="Completed">Completed</option>
                                  <option value="Cancelled">Cancelled</option>
                                </select>
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                  {/* Dynamic Status Action Button */}
                                  {r.status === "Confirmed" ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => handleReservationStatusChange(r.id, "Arrived")}
                                        className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium text-[11px] transition shadow-xs cursor-pointer active:scale-95"
                                        title="Mark guest as arrived at reception (occupies table)"
                                      >
                                        Mark Arrived
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleReservationStatusChange(r.id, "Seated")}
                                        className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-[11px] transition shadow-xs cursor-pointer active:scale-95"
                                        title="Directly seat guest"
                                      >
                                        Seat Now
                                      </button>
                                    </>
                                  ) : r.status === "Arrived" ? (
                                    <button
                                      type="button"
                                      onClick={() => handleReservationStatusChange(r.id, "Seated")}
                                      className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-[11px] transition shadow-xs flex items-center gap-1 cursor-pointer active:scale-95"
                                      title="Seat party at assigned table"
                                    >
                                      <Utensils className="w-3 h-3" />
                                      <span>Seat Now</span>
                                    </button>
                                  ) : r.status === "Seated" ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => setActiveTab("tables")}
                                        className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-[11px] transition shadow-xs flex items-center gap-1 cursor-pointer"
                                        title="View table on floor map"
                                      >
                                        <Eye className="w-3 h-3" />
                                        <span>View Table</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleReservationStatusChange(r.id, "Completed")}
                                        className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-[11px] transition cursor-pointer"
                                        title="Mark reservation as completed"
                                      >
                                        <span>Complete</span>
                                      </button>
                                    </>
                                  ) : r.status === "Completed" ? (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 py-1 px-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
                                      <Check className="w-3 h-3" />
                                      <span>Completed</span>
                                    </span>
                                  ) : r.status === "Cancelled" ? (
                                    <button
                                      type="button"
                                      onClick={() => handleReservationStatusChange(r.id, "Confirmed")}
                                      className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 text-[11px] font-medium transition cursor-pointer"
                                      title="Reactivate reservation"
                                    >
                                      <span>Reopen</span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleReservationStatusChange(r.id, "Seated")}
                                      className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-[11px] transition shadow-xs cursor-pointer"
                                    >
                                      <span>Seat Now</span>
                                    </button>
                                  )}

                                  {/* Edit Reservation Button */}
                                  <button
                                    type="button"
                                    onClick={() => setEditingReservation(r)}
                                    className={`p-1.5 rounded-lg border transition cursor-pointer ${
                                      isDarkMode
                                        ? "border-[#2b2f40] hover:bg-[#202330] text-slate-300 hover:text-white"
                                        : "border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900"
                                    }`}
                                    title="Edit reservation details or change table"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
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
                        className="text-blue-500 hover:underline text-xs font-semibold"
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
                              className="px-2.5 py-1 rounded-lg bg-[#C46B4E] hover:bg-[#B25C40] text-white text-[11px] font-semibold"
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
                  <div
                    onClick={() => setShowAddResModal(false)}
                    className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 cursor-pointer"
                  >
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className={`max-w-md w-full rounded-2xl p-6 border shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 cursor-default ${
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
                            placeholder="e.g. Rahul Sharma"
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
                              placeholder="+91 98765 43210"
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
                          onClick={handleSaveNewReservation}
                          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs"
                        >
                          Confirm Reservation
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Edit Reservation Modal */}
                {editingReservation && (
                  <div
                    onClick={() => setEditingReservation(null)}
                    className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 cursor-pointer"
                  >
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className={`max-w-md w-full rounded-2xl p-6 border shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 cursor-default ${
                        isDarkMode
                          ? "bg-[#181a24] border-[#2c3042] text-white"
                          : "bg-white border-slate-200 text-slate-900"
                      }`}
                    >
                      <div className="flex items-center justify-between border-b pb-3 border-inherit">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-[#C46B4E]/10 text-[#C46B4E] flex items-center justify-center font-bold">
                            <Edit3 className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="font-bold text-base">Edit Reservation</h3>
                            <p className="text-[11px] text-slate-400 font-mono">{editingReservation.id}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditingReservation(null)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700/50 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-3 text-xs">
                        <div>
                          <label className="font-semibold block mb-1">Guest Full Name</label>
                          <input
                            type="text"
                            value={editingReservation.guestName}
                            onChange={(e) =>
                              setEditingReservation({ ...editingReservation, guestName: e.target.value })
                            }
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
                              placeholder="+91 98765 43210"
                              value={editingReservation.phone}
                              onChange={(e) =>
                                setEditingReservation({ ...editingReservation, phone: e.target.value })
                              }
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
                              max={30}
                              value={editingReservation.guests}
                              onChange={(e) =>
                                setEditingReservation({
                                  ...editingReservation,
                                  guests: Math.max(1, Number(e.target.value)),
                                })
                              }
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
                              type="text"
                              value={editingReservation.time}
                              onChange={(e) =>
                                setEditingReservation({ ...editingReservation, time: e.target.value })
                              }
                              placeholder="e.g. 19:30 Today"
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
                              value={editingReservation.table}
                              onChange={(e) =>
                                setEditingReservation({ ...editingReservation, table: e.target.value })
                              }
                              className={`w-full p-2.5 rounded-xl border text-xs ${
                                isDarkMode
                                  ? "bg-[#111217] border-[#2b2f40] text-white"
                                  : "bg-slate-50 border-slate-200 text-slate-900"
                              }`}
                            >
                              {tables.map((t) => {
                                const isCurrent = t.name.toLowerCase() === editingReservation.table.toLowerCase()
                                return (
                                  <option key={t.id} value={t.name}>
                                    {t.name} ({t.seats} seats • {isCurrent ? "Current" : t.status})
                                  </option>
                                )
                              })}
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="font-semibold block mb-1">Status</label>
                          <select
                            value={editingReservation.status}
                            onChange={(e) =>
                              setEditingReservation({ ...editingReservation, status: e.target.value })
                            }
                            className={`w-full p-2.5 rounded-xl border text-xs ${
                              isDarkMode
                                ? "bg-[#111217] border-[#2b2f40] text-white"
                                : "bg-slate-50 border-slate-200 text-slate-900"
                            }`}
                          >
                            <option value="Confirmed">Confirmed</option>
                            <option value="Arrived">Arrived (Guest in lobby - occupies table)</option>
                            <option value="Seated">Seated (Dining at table)</option>
                            <option value="Completed">Completed</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        </div>

                        <div>
                          <label className="font-semibold block mb-1">Special Notes</label>
                          <textarea
                            rows={2}
                            value={editingReservation.notes || ""}
                            onChange={(e) =>
                              setEditingReservation({ ...editingReservation, notes: e.target.value })
                            }
                            placeholder="Allergies, high chair, window seating, etc."
                            className={`w-full p-2.5 rounded-xl border text-xs ${
                              isDarkMode
                                ? "bg-[#111217] border-[#2b2f40] text-white"
                                : "bg-slate-50 border-slate-200 text-slate-900"
                            }`}
                          />
                        </div>
                      </div>

                      <div className="flex gap-2 justify-end pt-3 border-t border-inherit">
                        <button
                          type="button"
                          onClick={() => setEditingReservation(null)}
                          className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEditedReservation(editingReservation)}
                          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition cursor-pointer shadow-xs active:scale-95"
                        >
                          Save Changes
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
                        ? "bg-[#14161f] border-[#252838] text-white placeholder-slate-500 focus:border-[#C46B4E]"
                        : "bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-[#C46B4E] shadow-xs"
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
                                      ? "bg-[#E9E3D8] text-[#20252B] border border-[#E5E1D9]"
                                      : c.loyalty.includes("Gold")
                                      ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400 border border-amber-300 dark:border-amber-800"
                                      : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400 border border-blue-300 dark:border-blue-800"
                                  }`}
                                >
                                  {c.loyalty}
                                </span>
                              </td>
                              <td className="py-3.5 px-4">
                                <span className="font-bold text-[#C46B4E]">
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
                                  className="px-2.5 py-1 rounded-lg bg-[#C46B4E] hover:bg-[#B25C40] text-white font-medium text-[11px] transition shadow-xs"
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

                  {/* Station Filters & KDS Sound Controls */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    <div
                      className={`flex items-center p-1 rounded-xl border ${
                        isDarkMode
                          ? "bg-[#161821] border-[#252838]"
                          : "bg-slate-100 border-slate-200"
                      }`}
                    >
                      <button
                        onClick={() => setKdsStationFilter("all")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                          kdsStationFilter === "all"
                            ? "bg-amber-600 text-white shadow-xs"
                            : isDarkMode
                              ? "text-slate-400 hover:text-white"
                              : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        All Stations ({kdsTickets.length})
                      </button>
                      <button
                        onClick={() => setKdsStationFilter("kitchen")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                          kdsStationFilter === "kitchen"
                            ? "bg-amber-600 text-white shadow-xs"
                            : isDarkMode
                              ? "text-slate-400 hover:text-white"
                              : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        🍳 Kitchen Cook
                      </button>
                      <button
                        onClick={() => setKdsStationFilter("bar")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                          kdsStationFilter === "bar"
                            ? "bg-amber-600 text-white shadow-xs"
                            : isDarkMode
                              ? "text-slate-400 hover:text-white"
                              : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        🍸 Bar Station
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsKdsSoundMuted((prev) => {
                          const next = !prev
                          if (next) {
                            stopKitchenVoice()
                          } else {
                            unlockBellAudio()
                          }
                          return next
                        })
                      }}
                      className={`px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs ${
                        isKdsSoundMuted
                          ? isDarkMode
                            ? "bg-red-500/20 border-red-500/40 text-red-300 hover:bg-red-500/30"
                            : "bg-red-600 border-red-600 text-white hover:bg-red-700"
                          : isDarkMode
                            ? "bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
                            : "bg-[#20252B] border-[#20252B] text-white hover:bg-[#2f363f]"
                      }`}
                    >
                      <span>{isKdsSoundMuted ? "🔇 Muted" : "🔊 Voice & Sound On"}</span>
                    </button>
                  </div>
                </div>

                {kdsNewOrderBanner && (
                  <div
                    className={`p-3.5 rounded-xl border text-xs font-bold flex items-center justify-between animate-in fade-in ${
                      isDarkMode
                        ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                        : "bg-amber-50 border-amber-300 text-amber-900"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <BellRing className="w-4 h-4 animate-bounce shrink-0" />
                      <span>{kdsNewOrderBanner}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setKdsNewOrderBanner(null)}
                      className={isDarkMode ? "text-amber-300 hover:text-white cursor-pointer" : "text-amber-800 hover:text-slate-900 cursor-pointer"}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Stage 1: New Queue */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${isDarkMode ? "text-blue-400" : "text-blue-700"}`}>
                        <span className={`w-2 h-2 rounded-full ${isDarkMode ? "bg-blue-500" : "bg-blue-600"}`} />
                        <span>New Queue</span>
                      </div>
                      <span className={`text-xs font-semibold ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
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
                                      ? "bg-[#E9E3D8] text-[#20252B]"
                                      : isDarkMode
                                        ? "bg-amber-500/20 text-amber-400"
                                        : "bg-amber-100 text-amber-800 border border-amber-200"
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
                                        ? "bg-indigo-950/40 border-indigo-500/30 text-indigo-300 line-through opacity-80"
                                        : "bg-indigo-50 border-indigo-200 text-indigo-900 line-through"
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
                                          ? isDarkMode
                                            ? "bg-indigo-500 border-indigo-500 text-white"
                                            : "bg-indigo-700 border-indigo-700 text-white"
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
                                        ? isDarkMode
                                          ? "bg-indigo-500/20 text-indigo-300"
                                          : "bg-indigo-100 text-indigo-900 border border-indigo-300"
                                        : isDarkMode
                                          ? "bg-slate-500/20 text-slate-400"
                                          : "bg-slate-200 text-slate-700"
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
                                  ? "bg-[#C46B4E] hover:bg-[#B25C40]"
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
                      <div className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${isDarkMode ? "text-amber-400" : "text-amber-800"}`}>
                        <span className={`w-2 h-2 rounded-full animate-pulse ${isDarkMode ? "bg-amber-500" : "bg-amber-600"}`} />
                        <span>In Cook Station</span>
                      </div>
                      <span className={`text-xs font-semibold ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
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
                                      ? "bg-[#E9E3D8] text-[#20252B]"
                                      : isDarkMode
                                        ? "bg-amber-500/20 text-amber-400"
                                        : "bg-amber-100 text-amber-800 border border-amber-200"
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
                                        ? "bg-indigo-950/40 border-indigo-500/30 text-indigo-300 line-through opacity-80"
                                        : "bg-indigo-50 border-indigo-200 text-indigo-900 line-through"
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
                                          ? isDarkMode
                                            ? "bg-indigo-500 border-indigo-500 text-white"
                                            : "bg-indigo-700 border-indigo-700 text-white"
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
                                        ? isDarkMode
                                          ? "bg-indigo-500/20 text-indigo-300"
                                          : "bg-indigo-100 text-indigo-900 border border-indigo-300"
                                        : isDarkMode
                                          ? "bg-slate-500/20 text-slate-400"
                                          : "bg-slate-200 text-slate-700"
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
                      <div className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${isDarkMode ? "text-indigo-300" : "text-indigo-900"}`}>
                        <span className={`w-2 h-2 rounded-full ${isDarkMode ? "bg-indigo-400" : "bg-indigo-700"}`} />
                        <span>Ready for Table</span>
                      </div>
                      <span className={`text-xs font-semibold ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                        {kdsTickets.filter((t) => (kdsStationFilter === "all" || t.station === kdsStationFilter) && t.stage === "ready").length}
                      </span>
                    </div>

                    {kdsTickets.filter((t) => (kdsStationFilter === "all" || t.station === kdsStationFilter) && t.stage === "ready").length === 0 ? (
                      <div className={`p-8 rounded-2xl border border-dashed text-center ${
                        isDarkMode ? "border-slate-800 text-slate-500" : "border-slate-300 text-slate-500"
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
                                ? "bg-[#14161f] border-indigo-500/40"
                                : "bg-white border-indigo-200 shadow-xs"
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
                                      ? "bg-[#E9E3D8] text-[#20252B]"
                                      : isDarkMode
                                        ? "bg-amber-500/20 text-amber-400"
                                        : "bg-amber-100 text-amber-800 border border-amber-200"
                                  }`}
                                >
                                  {t.station}
                                </span>
                              </div>
                              <span className={`font-bold ${isDarkMode ? "text-indigo-300" : "text-indigo-900"}`}>Ready!</span>
                            </div>
                            <div className="space-y-1.5">
                              {t.items.map((it) => (
                                <div
                                  key={it.id}
                                  onClick={() => toggleItemStatus(t.orderId, it.id)}
                                  className={`flex items-center justify-between text-xs px-2.5 py-1.5 rounded-xl border cursor-pointer select-none transition ${
                                    it.status === "ready" || it.status === "completed"
                                      ? isDarkMode
                                        ? "bg-indigo-950/40 border-indigo-500/30 text-indigo-300 line-through opacity-80"
                                        : "bg-indigo-50 border-indigo-200 text-indigo-900 line-through"
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
                                          ? isDarkMode
                                            ? "bg-indigo-500 border-indigo-500 text-white"
                                            : "bg-indigo-700 border-indigo-700 text-white"
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
                                        ? isDarkMode
                                          ? "bg-indigo-500/20 text-indigo-300"
                                          : "bg-indigo-100 text-indigo-900 border border-indigo-300"
                                        : isDarkMode
                                          ? "bg-slate-500/20 text-slate-400"
                                          : "bg-slate-200 text-slate-700"
                                    }`}
                                  >
                                    {it.status === "ready" || it.status === "completed" ? "Done" : "Pending"}
                                  </span>
                                </div>
                              ))}
                            </div>
                            <button
                              onClick={() => advanceKdsTicket(t.id)}
                              className="w-full py-1.5 rounded-xl bg-[#20252B] hover:bg-[#2F363F] text-white text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5"
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
              /* --- LIVE ADMIN DASHBOARD --- */
              <AdminDashboard
                isDarkMode={isDarkMode}
                orders={orders}
                tables={tables}
                reservations={reservations}
                waitlist={waitlist}
                customersList={customersList}
                inventoryItems={inventoryItems}
                stockMovements={stockMovements}
                menuCatalog={menuCatalog}
                teamMembers={teamMembers}
                serviceRequests={serviceRequests}
                kdsTickets={kdsTickets}
                onNavigateTab={(tab) => setActiveTab(tab)}
                onRestockItem={(item) => handleOpenAdjustment(item)}
                onBookCustomerTable={(c) => {
                  setNewResGuest(c.name)
                  setNewResPhone(c.phone)
                  setShowAddResModal(true)
                }}
                onRefreshAll={async () => {
                  await Promise.all([
                    fetchOrders(),
                    fetchTables(),
                    fetchReservations(),
                    fetch("/api/inventory")
                      .then((r) => (r.ok ? r.json() : null))
                      .then((d) => {
                        if (d?.items) setInventoryItems(d.items)
                        if (d?.movements) setStockMovements(d.movements)
                      })
                      .catch(() => {}),
                    fetch("/api/service-requests")
                      .then((r) => (r.ok ? r.json() : null))
                      .then((d) => {
                        if (d?.requests) setServiceRequests(d.requests)
                      })
                      .catch(() => {}),
                    fetch("/api/team")
                      .then((r) => (r.ok ? r.json() : null))
                      .then((d) => {
                        if (d?.members) setTeamMembers(d.members)
                      })
                      .catch(() => {}),
                  ])
                }}
              />
            ) : activeTab === "team" ? (
              /* --- RESTAURANT TEAM & STAFF DIRECTORY --- */
              <div className="space-y-6 max-w-[1440px] mx-auto">
                {/* Toast Notification Banner */}
                {teamToast && (
                  <div className="p-3.5 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-800 dark:text-blue-300 text-xs font-semibold flex items-center justify-between shadow-2xs animate-in fade-in">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>{teamToast}</span>
                    </div>
                    <button
                      onClick={() => setTeamToast(null)}
                      className="text-blue-700 dark:text-blue-300 hover:opacity-75 p-0.5 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Header Strip */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h1
                        className={`text-2xl lg:text-3xl font-bold tracking-tight ${
                          isDarkMode ? "text-white" : "text-[#20252B]"
                        }`}
                      >
                        Team & Staff Directory
                      </h1>
                      <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-[#E9E3D8] text-[#C46B4E] border border-[#E5E1D9] dark:bg-[#20252B] dark:border-[#2b2f3e]">
                        {teamMembers.length} Staff Members
                      </span>
                    </div>
                    <p
                      className={`text-xs sm:text-sm mt-1 ${
                        isDarkMode ? "text-slate-400" : "text-[#64748B]"
                      }`}
                    >
                      Operational roster across Kitchen (KDS), POS Cashiers, Administration, Reception Hostess, Bar Mixology, and Storage.
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={handleOpenAddStaff}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#C46B4E] hover:bg-[#B25C40] text-white text-xs font-semibold shadow-xs transition cursor-pointer"
                    >
                      <UserPlus className="w-4 h-4" />
                      Add Team Member
                    </button>
                  </div>
                </div>

                {/* KPI Metrics Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                  {/* Total Staff */}
                  <div
                    className={`p-4 rounded-2xl border transition ${
                      isDarkMode
                        ? "bg-[#161822] border-[#272b3b]"
                        : "bg-white border-[#E5E1D9] shadow-2xs"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                        Total Staff
                      </span>
                      <Users className="w-4 h-4 text-[#C46B4E]" />
                    </div>
                    <div className="text-2xl font-bold mt-2 text-[#20252B] dark:text-white">
                      {teamMembers.length}
                    </div>
                    <span className="text-[11px] text-[#64748B] mt-0.5 block">
                      Under Nodedr Bistro
                    </span>
                  </div>

                  {/* On Shift Now */}
                  <div
                    className={`p-4 rounded-2xl border transition ${
                      isDarkMode
                        ? "bg-[#161822] border-[#272b3b]"
                        : "bg-white border-[#E5E1D9] shadow-2xs"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                        On Shift Now
                      </span>
                      <UserCheck className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className="text-2xl font-bold mt-2 text-blue-600 dark:text-blue-400">
                      {teamMembers.filter((m) => m.status === "active").length}
                    </div>
                    <span className="text-[11px] text-blue-600/80 dark:text-blue-400/80 mt-0.5 block font-medium">
                      Active duty stations
                    </span>
                  </div>

                  {/* Kitchen & Bar */}
                  <div
                    className={`p-4 rounded-2xl border transition ${
                      isDarkMode
                        ? "bg-[#161822] border-[#272b3b]"
                        : "bg-white border-[#E5E1D9] shadow-2xs"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                        Kitchen & Bar
                      </span>
                      <ChefHat className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="text-2xl font-bold mt-2 text-amber-600 dark:text-amber-400">
                      {
                        teamMembers.filter(
                          (m) => m.role === "pos-kitchen" || m.role === "bartender"
                        ).length
                      }
                    </div>
                    <span className="text-[11px] text-[#64748B] mt-0.5 block">
                      Chefs, Cooks & Mixologist
                    </span>
                  </div>

                  {/* Front of House / POS */}
                  <div
                    className={`p-4 rounded-2xl border transition ${
                      isDarkMode
                        ? "bg-[#161822] border-[#272b3b]"
                        : "bg-white border-[#E5E1D9] shadow-2xs"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                        Front of House
                      </span>
                      <ShoppingCart className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className="text-2xl font-bold mt-2 text-blue-600 dark:text-blue-400">
                      {
                        teamMembers.filter(
                          (m) => m.role === "pos-orders" || m.role === "pos-reception"
                        ).length
                      }
                    </div>
                    <span className="text-[11px] text-[#64748B] mt-0.5 block">
                      POS Cashiers & Hostess
                    </span>
                  </div>

                  {/* Admin & Operations */}
                  <div
                    className={`p-4 rounded-2xl border transition ${
                      isDarkMode
                        ? "bg-[#161822] border-[#272b3b]"
                        : "bg-white border-[#E5E1D9] shadow-2xs"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                        Admin & Ops
                      </span>
                      <ShieldCheck className="w-4 h-4 text-purple-500" />
                    </div>
                    <div className="text-2xl font-bold mt-2 text-purple-600 dark:text-purple-400">
                      {
                        teamMembers.filter(
                          (m) =>
                            m.role === "admin" ||
                            m.role === "manager" ||
                            m.role === "inventory"
                        ).length
                      }
                    </div>
                    <span className="text-[11px] text-[#64748B] mt-0.5 block">
                      Managers & Inventory
                    </span>
                  </div>
                </div>

                {/* Filter Tabs & Search Controls */}
                <div
                  className={`p-4 rounded-2xl border space-y-3.5 ${
                    isDarkMode
                      ? "bg-[#161822] border-[#272b3b]"
                      : "bg-white border-[#E5E1D9] shadow-2xs"
                  }`}
                >
                  {/* Role Category Pills */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {[
                      { id: "all", label: "All Staff", count: teamMembers.length },
                      {
                        id: "kitchen",
                        label: "🍳 Kitchen (KDS)",
                        count: teamMembers.filter((m) => m.role === "pos-kitchen").length,
                      },
                      {
                        id: "pos",
                        label: "💳 POS & Cashier",
                        count: teamMembers.filter((m) => m.role === "pos-orders").length,
                      },
                      {
                        id: "admin",
                        label: "🛡️ Admin & Mgmt",
                        count: teamMembers.filter(
                          (m) => m.role === "admin" || m.role === "manager"
                        ).length,
                      },
                      {
                        id: "reception",
                        label: "🛎️ Reception",
                        count: teamMembers.filter((m) => m.role === "pos-reception").length,
                      },
                      {
                        id: "bar",
                        label: "🍸 Bar",
                        count: teamMembers.filter((m) => m.role === "bartender").length,
                      },
                      {
                        id: "inventory",
                        label: "📦 Inventory",
                        count: teamMembers.filter((m) => m.role === "inventory").length,
                      },
                    ].map((tab) => {
                      const isSelected = teamRoleFilter === tab.id
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setTeamRoleFilter(tab.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer ${
                            isSelected
                              ? "bg-[#C46B4E] text-white shadow-xs"
                              : "bg-[#F7F5F0] hover:bg-[#E9E3D8] text-[#20252B] dark:bg-[#1f2330] dark:hover:bg-[#282d3e] dark:text-slate-200"
                          }`}
                        >
                          <span>{tab.label}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                              isSelected
                                ? "bg-white/20 text-white"
                                : "bg-black/5 dark:bg-white/10 text-[#64748B] dark:text-slate-400"
                            }`}
                          >
                            {tab.count}
                          </span>
                        </button>
                      )
                    })}
                  </div>

                  {/* Search and Secondary Filters */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-[#E5E1D9] dark:border-[#272b3b]">
                    {/* Search Bar */}
                    <div className="relative flex-1 max-w-md">
                      <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search by staff name, role, station, email, phone, or PIN..."
                        value={teamSearch}
                        onChange={(e) => setTeamSearch(e.target.value)}
                        className={`w-full rounded-xl pl-9 pr-8 py-2 text-xs focus:outline-none focus:border-[#C46B4E] border ${
                          isDarkMode
                            ? "bg-[#12141c] border-[#2b2f3e] text-white placeholder-slate-500"
                            : "bg-[#F7F5F0] border-[#E5E1D9] text-[#20252B] placeholder-[#64748B]"
                        }`}
                      />
                      {teamSearch && (
                        <button
                          type="button"
                          onClick={() => setTeamSearch("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#20252B] dark:hover:text-white"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Status & View Mode */}
                    <div className="flex items-center gap-2.5 flex-wrap">
                      {/* Status Filter */}
                      <div className="flex items-center gap-1 bg-[#F7F5F0] dark:bg-[#12141c] p-1 rounded-xl border border-[#E5E1D9] dark:border-[#2b2f3e]">
                        <button
                          type="button"
                          onClick={() => setTeamStatusFilter("all")}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                            teamStatusFilter === "all"
                              ? "bg-white text-[#20252B] shadow-2xs dark:bg-[#20252B] dark:text-white"
                              : "text-[#64748B] hover:text-[#20252B]"
                          }`}
                        >
                          All ({teamMembers.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setTeamStatusFilter("active")}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer ${
                            teamStatusFilter === "active"
                              ? "bg-white text-blue-700 shadow-2xs dark:bg-[#20252B] dark:text-blue-400"
                              : "text-[#64748B] hover:text-blue-700"
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          On Shift ({teamMembers.filter((m) => m.status === "active").length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setTeamStatusFilter("off-duty")}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer ${
                            teamStatusFilter === "off-duty"
                              ? "bg-white text-slate-700 shadow-2xs dark:bg-[#20252B] dark:text-slate-300"
                              : "text-[#64748B] hover:text-slate-800"
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          Off Duty ({teamMembers.filter((m) => m.status === "off-duty").length})
                        </button>
                      </div>

                      {/* View Switch */}
                      <div className="flex items-center bg-[#F7F5F0] dark:bg-[#12141c] p-1 rounded-xl border border-[#E5E1D9] dark:border-[#2b2f3e]">
                        <button
                          type="button"
                          onClick={() => setTeamViewMode("table")}
                          title="Table View"
                          className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
                            teamViewMode === "table"
                              ? "bg-white text-[#20252B] shadow-2xs dark:bg-[#20252B] dark:text-white"
                              : "text-[#64748B]"
                          }`}
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setTeamViewMode("card")}
                          title="Card Grid View"
                          className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
                            teamViewMode === "card"
                              ? "bg-white text-[#20252B] shadow-2xs dark:bg-[#20252B] dark:text-white"
                              : "text-[#64748B]"
                          }`}
                        >
                          <LayoutGrid className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Team Members List / Table */}
                {filteredTeamMembers.length === 0 ? (
                  <div
                    className={`p-12 text-center rounded-2xl border space-y-3 ${
                      isDarkMode
                        ? "bg-[#161822] border-[#272b3b]"
                        : "bg-white border-[#E5E1D9] shadow-2xs"
                    }`}
                  >
                    <Users className="w-10 h-10 text-[#64748B] mx-auto opacity-50" />
                    <h3 className="text-base font-bold text-[#20252B] dark:text-white">
                      No team members found
                    </h3>
                    <p className="text-xs text-[#64748B] max-w-sm mx-auto">
                      No staff members match the current filter or search criteria.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setTeamSearch("")
                        setTeamRoleFilter("all")
                        setTeamStatusFilter("all")
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-[#C46B4E] text-white text-xs font-semibold hover:bg-[#B25C40] transition cursor-pointer"
                    >
                      Reset All Filters
                    </button>
                  </div>
                ) : teamViewMode === "table" ? (
                  /* TABLE VIEW */
                  <div
                    className={`rounded-2xl border overflow-hidden shadow-2xs ${
                      isDarkMode
                        ? "bg-[#161822] border-[#272b3b]"
                        : "bg-white border-[#E5E1D9]"
                    }`}
                  >
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr
                            className={`border-b text-[11px] font-bold uppercase tracking-wider ${
                              isDarkMode
                                ? "bg-[#12141c] text-slate-400 border-[#272b3b]"
                                : "bg-[#F7F5F0] text-[#64748B] border-[#E5E1D9]"
                            }`}
                          >
                            <th className="py-3.5 px-4 font-semibold">Staff Member</th>
                            <th className="py-3.5 px-4 font-semibold">Role & Dept</th>
                            <th className="py-3.5 px-4 font-semibold">Assigned Station / Workstation</th>
                            <th className="py-3.5 px-4 font-semibold">Shift & Contact</th>
                            <th className="py-3.5 px-4 font-semibold text-center">Status</th>
                            <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E5E1D9] dark:divide-[#272b3b]">
                          {filteredTeamMembers.map((member) => {
                            const isOnShift = member.status === "active"

                            // Badge styling
                            let roleBadgeClass =
                              "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-200"
                            let roleIcon = <ShieldCheck className="w-3.5 h-3.5" />

                            if (member.role === "admin") {
                              roleBadgeClass =
                                "bg-[#E9E3D8] text-[#C46B4E] border-[#E5E1D9] dark:bg-[#20252B] dark:border-[#2b2f3e]"
                              roleIcon = <ShieldCheck className="w-3.5 h-3.5 text-[#C46B4E]" />
                            } else if (member.role === "pos-kitchen") {
                              roleBadgeClass =
                                "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40"
                              roleIcon = <ChefHat className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                            } else if (member.role === "pos-orders") {
                              roleBadgeClass =
                                "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40"
                              roleIcon = <ShoppingCart className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                            } else if (member.role === "pos-reception") {
                              roleBadgeClass =
                                "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40"
                              roleIcon = <Users className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                            } else if (member.role === "bartender") {
                              roleBadgeClass =
                                "bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/40"
                              roleIcon = <Utensils className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                            } else if (member.role === "inventory") {
                              roleBadgeClass =
                                "bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/40"
                              roleIcon = <Boxes className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                            }

                            // Quick station launch label
                            let stationActionLabel = "Launch Station"
                            if (member.role === "pos-kitchen") stationActionLabel = "Open KDS Rail"
                            else if (member.role === "pos-orders") stationActionLabel = "Open POS"
                            else if (member.role === "pos-reception") stationActionLabel = "Floor Tables"
                            else if (member.role === "bartender") stationActionLabel = "Bar KDS"
                            else if (member.role === "inventory") stationActionLabel = "Inventory"
                            else if (member.role === "admin") stationActionLabel = "Dashboard"

                            return (
                              <tr
                                key={member.id}
                                className={`transition ${
                                  isDarkMode
                                    ? "hover:bg-[#1f2230]/70"
                                    : "hover:bg-[#F7F5F0]/60"
                                }`}
                              >
                                {/* Staff Member */}
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-3">
                                    <div
                                      className={`w-9 h-9 rounded-full ${member.avatarColor} text-white flex items-center justify-center font-bold text-xs uppercase shadow-2xs relative`}
                                    >
                                      {member.name
                                        .split(" ")
                                        .map((n) => n[0])
                                        .slice(0, 2)
                                        .join("")}
                                      {isOnShift && (
                                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-white dark:border-[#161822]" />
                                      )}
                                    </div>
                                    <div>
                                      <div className="font-bold text-sm text-[#20252B] dark:text-white flex items-center gap-1.5">
                                        <span>{member.name}</span>
                                        <span className="px-1.5 py-0.2 rounded-md bg-[#F7F5F0] dark:bg-[#1f2330] border border-[#E5E1D9] dark:border-[#272b3b] text-[10px] font-mono text-[#64748B]">
                                          PIN: {member.pin}
                                        </span>
                                      </div>
                                      <div className="text-[11px] text-[#64748B] flex items-center gap-1.5 mt-0.5">
                                        <Mail className="w-3 h-3 text-[#64748B]" />
                                        <span>{member.email}</span>
                                      </div>
                                    </div>
                                  </div>
                                </td>

                                {/* Role & Dept */}
                                <td className="py-3 px-4">
                                  <div className="space-y-1">
                                    <span
                                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-semibold border ${roleBadgeClass}`}
                                    >
                                      {roleIcon}
                                      {member.roleLabel}
                                    </span>
                                    <div className="text-[11px] text-[#64748B]">
                                      {member.department}
                                    </div>
                                  </div>
                                </td>

                                {/* Station / Workstation Assignment */}
                                <td className="py-3 px-4">
                                  <div className="space-y-0.5">
                                    <span className="font-semibold text-xs text-[#20252B] dark:text-slate-200">
                                      {member.station}
                                    </span>
                                    <div className="text-[11px] text-[#64748B]">
                                      Last active: {member.lastActive}
                                    </div>
                                  </div>
                                </td>

                                {/* Shift & Contact */}
                                <td className="py-3 px-4">
                                  <div className="space-y-0.5">
                                    <div className="font-medium text-xs text-[#20252B] dark:text-slate-200">
                                      {member.shift}
                                    </div>
                                    <div className="text-[11px] text-[#64748B] flex items-center gap-1">
                                      <Phone className="w-3 h-3" />
                                      <span>{member.phone}</span>
                                    </div>
                                  </div>
                                </td>

                                {/* Status Toggle */}
                                <td className="py-3 px-4 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleStaffStatus(member)}
                                    title="Click to toggle Shift Status"
                                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition cursor-pointer ${
                                      isOnShift
                                        ? "bg-blue-500/15 border-blue-500/30 text-blue-700 dark:text-blue-400 hover:bg-blue-500/25"
                                        : "bg-slate-100 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 hover:bg-slate-200"
                                    }`}
                                  >
                                    <span
                                      className={`w-1.5 h-1.5 rounded-full ${
                                        isOnShift ? "bg-blue-500 animate-pulse" : "bg-slate-400"
                                      }`}
                                    />
                                    {isOnShift ? "On Shift" : "Off Duty"}
                                  </button>
                                </td>

                                {/* Actions */}
                                <td className="py-3 px-4 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    {/* Quick launch to Station */}
                                    <button
                                      type="button"
                                      onClick={() => handleLaunchStation(member)}
                                      className="px-2.5 py-1 rounded-lg bg-[#E9E3D8] hover:bg-[#dfd7c9] text-[#20252B] dark:bg-[#1f2330] dark:hover:bg-[#282d3e] dark:text-white font-semibold text-[11px] transition flex items-center gap-1 border border-[#E5E1D9] dark:border-[#272b3b] cursor-pointer"
                                      title={`Switch to ${stationActionLabel}`}
                                    >
                                      <span>{stationActionLabel}</span>
                                      <ExternalLink className="w-3 h-3 text-[#C46B4E]" />
                                    </button>

                                    {/* Edit Button */}
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditStaff(member)}
                                      className="p-1.5 rounded-lg text-[#64748B] hover:text-[#20252B] hover:bg-[#F7F5F0] dark:hover:bg-[#1f2330] dark:hover:text-white transition cursor-pointer"
                                      title="Edit Staff Member"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>

                                    {/* Delete Button */}
                                    {member.role !== "admin" && (
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteStaff(member)}
                                        className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 transition cursor-pointer"
                                        title="Remove Staff Member"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
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
                ) : (
                  /* CARD GRID VIEW */
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredTeamMembers.map((member) => {
                      const isOnShift = member.status === "active"

                      let roleBadgeClass =
                        "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-200"
                      let roleIcon = <ShieldCheck className="w-3.5 h-3.5" />

                      if (member.role === "admin") {
                        roleBadgeClass =
                          "bg-[#E9E3D8] text-[#C46B4E] border-[#E5E1D9] dark:bg-[#20252B] dark:border-[#2b2f3e]"
                        roleIcon = <ShieldCheck className="w-3.5 h-3.5 text-[#C46B4E]" />
                      } else if (member.role === "pos-kitchen") {
                        roleBadgeClass =
                          "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40"
                        roleIcon = <ChefHat className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      } else if (member.role === "pos-orders") {
                        roleBadgeClass =
                          "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40"
                        roleIcon = <ShoppingCart className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      } else if (member.role === "pos-reception") {
                        roleBadgeClass =
                          "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40"
                        roleIcon = <Users className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      } else if (member.role === "bartender") {
                        roleBadgeClass =
                          "bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/40"
                        roleIcon = <Utensils className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                      } else if (member.role === "inventory") {
                        roleBadgeClass =
                          "bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/40"
                        roleIcon = <Boxes className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      }

                      let stationActionLabel = "Open Station"
                      if (member.role === "pos-kitchen") stationActionLabel = "Kitchen KDS"
                      else if (member.role === "pos-orders") stationActionLabel = "POS Cashier"
                      else if (member.role === "pos-reception") stationActionLabel = "Table Plan"
                      else if (member.role === "bartender") stationActionLabel = "Bar KDS"
                      else if (member.role === "inventory") stationActionLabel = "Inventory"
                      else if (member.role === "admin") stationActionLabel = "Dashboard"

                      return (
                        <div
                          key={member.id}
                          className={`p-5 rounded-2xl border transition shadow-2xs space-y-4 ${
                            isDarkMode
                              ? "bg-[#161822] border-[#272b3b]"
                              : "bg-white border-[#E5E1D9]"
                          }`}
                        >
                          {/* Top Row: Avatar & Details */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-11 h-11 rounded-2xl ${member.avatarColor} text-white flex items-center justify-center font-bold text-sm uppercase shadow-xs relative`}
                              >
                                {member.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .slice(0, 2)
                                  .join("")}
                                {isOnShift && (
                                  <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-blue-500 border-2 border-white dark:border-[#161822]" />
                                )}
                              </div>
                              <div>
                                <h3 className="font-bold text-sm text-[#20252B] dark:text-white">
                                  {member.name}
                                </h3>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="px-1.5 py-0.2 rounded-md bg-[#F7F5F0] dark:bg-[#1f2330] border border-[#E5E1D9] dark:border-[#272b3b] text-[10px] font-mono text-[#64748B]">
                                    PIN: {member.pin}
                                  </span>
                                  <span className="text-[10px] text-[#64748B]">
                                    {member.department}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Status badge */}
                            <button
                              type="button"
                              onClick={() => handleToggleStaffStatus(member)}
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border transition cursor-pointer flex items-center gap-1 ${
                                isOnShift
                                  ? "bg-blue-500/15 border-blue-500/30 text-blue-700 dark:text-blue-400"
                                  : "bg-slate-100 border-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isOnShift ? "bg-blue-500 animate-pulse" : "bg-slate-400"
                                }`}
                              />
                              {isOnShift ? "On Shift" : "Off Duty"}
                            </button>
                          </div>

                          {/* Role Badge */}
                          <div>
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border ${roleBadgeClass}`}
                            >
                              {roleIcon}
                              {member.roleLabel}
                            </span>
                          </div>

                          {/* Station Location Box */}
                          <div
                            className={`p-2.5 rounded-xl text-xs space-y-1 ${
                              isDarkMode ? "bg-[#12141c]" : "bg-[#F7F5F0]"
                            }`}
                          >
                            <div className="text-[10px] uppercase font-bold text-[#64748B] tracking-wider">
                              Assigned Station
                            </div>
                            <div className="font-semibold text-xs text-[#20252B] dark:text-white truncate">
                              {member.station}
                            </div>
                          </div>

                          {/* Shift & Contact Info */}
                          <div className="text-xs space-y-1.5 text-[#64748B] pt-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px]">Shift Hours:</span>
                              <span className="font-medium text-[#20252B] dark:text-slate-200 text-[11px]">
                                {member.shift}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[11px]">Email:</span>
                              <span className="font-mono text-[11px] text-[#20252B] dark:text-slate-300 truncate max-w-[170px]">
                                {member.email}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[11px]">Phone:</span>
                              <span className="text-[11px] text-[#20252B] dark:text-slate-300">
                                {member.phone}
                              </span>
                            </div>
                          </div>

                          {/* Action Footer */}
                          <div className="pt-3 border-t border-[#E5E1D9] dark:border-[#272b3b] flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => handleLaunchStation(member)}
                              className="flex-1 py-1.5 px-2.5 rounded-xl bg-[#E9E3D8] hover:bg-[#dfd7c9] text-[#20252B] dark:bg-[#1f2330] dark:hover:bg-[#282d3e] dark:text-white font-semibold text-xs transition flex items-center justify-center gap-1.5 border border-[#E5E1D9] dark:border-[#272b3b] cursor-pointer"
                            >
                              <span>{stationActionLabel}</span>
                              <ExternalLink className="w-3.5 h-3.5 text-[#C46B4E]" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenEditStaff(member)}
                              className="p-2 rounded-xl text-[#64748B] hover:text-[#20252B] hover:bg-[#F7F5F0] dark:hover:bg-[#1f2330] dark:hover:text-white transition cursor-pointer border border-[#E5E1D9] dark:border-[#272b3b]"
                              title="Edit Staff Member"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {member.role !== "admin" && (
                              <button
                                type="button"
                                onClick={() => handleDeleteStaff(member)}
                                className="p-2 rounded-xl text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 transition cursor-pointer border border-red-200 dark:border-red-900/40"
                                title="Remove Staff Member"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ) : activeTab === "accounting" ? (
              /* --- ACCOUNTING & FINANCIAL LEDGER --- */
              <AccountingModule
                isDarkMode={isDarkMode}
                orders={orders}
                inventoryItems={inventoryItems}
                stockMovements={stockMovements}
                teamMembers={teamMembers}
                onUpdateOrderPaymentStatus={(orderId, status) => updatePaymentStatus(orderId, status)}
                onNavigateTab={(tab) => setActiveTab(tab)}
              />
            ) : activeTab === "reports" ? (
              /* --- RESTAURANT REPORTS & EXCEL EXPORT --- */
              <ReportsModule
                isDarkMode={isDarkMode}
                orders={orders}
                menuCatalog={menuCatalog}
                serviceRequests={serviceRequests}
                tables={tables}
                reservations={reservations}
                customersList={customersList}
                inventoryItems={inventoryItems}
                teamMembers={teamMembers}
              />
            ) : activeTab === "my-deliveries" || activeTab === "delivery" ? (
              /* --- MY DELIVERIES & TAKEAWAY DISPATCH --- */
              <MyDeliveriesModule
                isDarkMode={isDarkMode}
                orders={orders}
                onUpdatePaymentStatus={(orderId, status) => updatePaymentStatus(orderId, status)}
                onAdvanceKdsTicket={(ticketId) => advanceKdsTicket(ticketId)}
                onCompleteDispatchOrder={async (orderId) => {
                  setOrders((prev) =>
                    prev.map((o) =>
                      o.id === orderId || o.order_number === orderId
                        ? {
                            ...o,
                            status: "CLOSED",
                            kitchen_stage: "completed",
                            bar_stage: "completed",
                            updated_at: new Date().toISOString(),
                          }
                        : o
                    )
                  )
                  try {
                    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
                      const bc = new BroadcastChannel("restro_sync_channel")
                      bc.postMessage({
                        type: "order_updated",
                        order_id: orderId,
                        kitchen_stage: "completed",
                        bar_stage: "completed",
                        status: "CLOSED",
                      })
                      bc.close()
                    }
                    await fetch("/api/orders", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        order_id: orderId,
                        kitchen_stage: "completed",
                        bar_stage: "completed",
                        status: "CLOSED",
                      }),
                    })
                  } catch {}
                }}
                onUpdateOrderNotes={async (orderId, notes) => {
                  setOrders((prev) =>
                    prev.map((o) =>
                      o.id === orderId || o.order_number === orderId ? { ...o, notes } : o
                    )
                  )
                  try {
                    await fetch("/api/orders", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ order_id: orderId, notes }),
                    })
                  } catch {}
                }}
                onStartNewOrder={(type) => {
                  setPosOrderType(type)
                  setActiveTab("pos")
                }}
              />
            ) : activeTab === "settings" ? (
              /* --- RESTAURANT SETTINGS --- */
              <SettingsModule
                isDarkMode={isDarkMode}
                onToggleTheme={toggleTheme}
                initialSection={settingsInitialSection}
                onTablesSynced={(syncedTables, syncedFloors) => {
                  setTables(syncedTables)
                  setFloors(syncedFloors)
                }}
              />
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
                    className="px-3.5 py-2 rounded-xl bg-[#C46B4E] text-white font-medium text-xs hover:bg-[#B25C40] transition"
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

      {/* Table QR Code Modal */}
      {showQrModal && (
        <TableQrModal table={showQrModal} onClose={() => setShowQrModal(null)} />
      )}

      {/* All Tables QR Tent Cards Modal */}
      {showAllQrModal && (
        <AllTablesQrModal tables={tables} onClose={() => setShowAllQrModal(false)} />
      )}

      {/* Waitlist Modal */}
      {showWaitlistModal && (
        <div
          onClick={() => setShowWaitlistModal(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
        >
          <form
            onClick={(e) => e.stopPropagation()}
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
            className={`rounded-2xl p-6 max-w-sm w-full space-y-4 border cursor-default ${
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
                className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#C46B4E] border ${
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
              className="w-full py-2.5 rounded-xl bg-[#C46B4E] hover:bg-[#B25C40] text-white text-xs font-semibold transition shadow-xs"
            >
              Add Guest
            </button>
          </form>
        </div>
      )}

      {/* ADD MENU ITEM MODAL */}
      {showAddItemModal && (
        <div
          onClick={() => setShowAddItemModal(false)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-lg rounded-2xl border p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto cursor-default ${
              isDarkMode ? "bg-[#161822] border-[#292c3c] text-white" : "bg-white border-[#E5E1D9] text-[#20252B]"
            }`}
          >
            <div className="flex items-center justify-between border-b pb-3 border-[#E5E1D9] dark:border-[#272b3b]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#E9E3D8] text-[#C46B4E] flex items-center justify-center font-bold">
                  <Utensils className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base">
                    {editingMenuItem ? "Edit Menu Item" : "Add New Menu Item"}
                  </h3>
                  <p className="text-xs text-[#64748B]">
                    {editingMenuItem
                      ? `Editing "${editingMenuItem.name}" — updates sync immediately to POS & QR menus`
                      : "Item will immediately appear in POS and Customer QR Menus"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddItemModal(false)}
                className="w-8 h-8 rounded-full bg-[#F7F5F0] dark:bg-[#1f2231] text-[#64748B] hover:text-[#20252B] flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddMenuItem} className="space-y-4">
              {/* Item Name */}
              <div className="space-y-1">
                <label className="text-xs font-semibold">Dish / Item Name *</label>
                <input
                  type="text"
                  required
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="e.g. Paneer Butter Masala"
                  className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none focus:border-[#C46B4E] ${
                    isDarkMode ? "bg-[#12141c] border-[#272b3b] text-white" : "bg-white border-[#E5E1D9] text-[#20252B]"
                  }`}
                />
              </div>

              {/* Optional Half & Full Pricing Toggle */}
              <div className="p-3 rounded-xl bg-[#F7F5F0] dark:bg-[#12141c] border border-[#E5E1D9] dark:border-[#272b3b] flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold">Half &amp; Full Portion Pricing (Optional)</div>
                  <div className="text-[11px] text-[#64748B]">Enable if customers can choose Half or Full plates</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !newItemHasPortions
                    setNewItemHasPortions(next)
                    if (next && !newItemFullPrice && newItemPrice) {
                      setNewItemFullPrice(newItemPrice)
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                    newItemHasPortions
                      ? "bg-[#C46B4E] text-white"
                      : "bg-white dark:bg-[#1a1d28] text-[#64748B] border border-[#E5E1D9] dark:border-[#2c3144]"
                  }`}
                >
                  {newItemHasPortions ? "Enabled" : "Single Price"}
                </button>
              </div>

              {newItemHasPortions ? (
                <div className="grid grid-cols-3 gap-3">
                  {/* Half Price */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">Half Price (₹) *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="0.01"
                      value={newItemHalfPrice}
                      onChange={(e) => setNewItemHalfPrice(e.target.value)}
                      placeholder="e.g. 179"
                      className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none focus:border-[#C46B4E] ${
                        isDarkMode ? "bg-[#12141c] border-[#272b3b] text-white" : "bg-white border-[#E5E1D9] text-[#20252B]"
                      }`}
                    />
                  </div>

                  {/* Full Price */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">Full Price (₹) *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="0.01"
                      value={newItemFullPrice}
                      onChange={(e) => {
                        setNewItemFullPrice(e.target.value)
                        setNewItemPrice(e.target.value)
                      }}
                      placeholder="e.g. 299"
                      className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none focus:border-[#C46B4E] ${
                        isDarkMode ? "bg-[#12141c] border-[#272b3b] text-white" : "bg-white border-[#E5E1D9] text-[#20252B]"
                      }`}
                    />
                  </div>

                  {/* Category */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">Category</label>
                    <select
                      value={newItemCategory}
                      onChange={(e: any) => setNewItemCategory(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none focus:border-[#C46B4E] ${
                        isDarkMode ? "bg-[#12141c] border-[#272b3b] text-white" : "bg-white border-[#E5E1D9] text-[#20252B]"
                      }`}
                    >
                      <option value="mains">Mains &amp; Pizza</option>
                      <option value="sides">Sides &amp; Fries</option>
                      <option value="drinks">Drinks &amp; Bar</option>
                      <option value="desserts">Desserts</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {/* Single Price */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">Price in ₹ (INR) *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={newItemPrice}
                      onChange={(e) => setNewItemPrice(e.target.value)}
                      placeholder="e.g. 299"
                      className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none focus:border-[#C46B4E] ${
                        isDarkMode ? "bg-[#12141c] border-[#272b3b] text-white" : "bg-white border-[#E5E1D9] text-[#20252B]"
                      }`}
                    />
                  </div>

                  {/* Category */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">Category</label>
                    <select
                      value={newItemCategory}
                      onChange={(e: any) => setNewItemCategory(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none focus:border-[#C46B4E] ${
                        isDarkMode ? "bg-[#12141c] border-[#272b3b] text-white" : "bg-white border-[#E5E1D9] text-[#20252B]"
                      }`}
                    >
                      <option value="mains">Mains &amp; Pizza</option>
                      <option value="sides">Sides &amp; Fries</option>
                      <option value="drinks">Drinks &amp; Bar</option>
                      <option value="desserts">Desserts</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Dish Image URL or Local Upload + Quick Gallery */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold">Real Food Photo (Optional URL or Upload)</label>
                  <label className="text-[11px] font-semibold text-[#C46B4E] hover:underline cursor-pointer">
                    <span>Upload Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        const reader = new FileReader()
                        reader.onload = () => {
                          if (typeof reader.result === "string") {
                            setNewItemImage(reader.result)
                          }
                        }
                        reader.readAsDataURL(file)
                      }}
                    />
                  </label>
                </div>
                <div className="flex items-center gap-2.5">
                  {newItemImage && (
                    <img
                      src={newItemImage}
                      alt="Preview"
                      className="w-10 h-10 rounded-xl object-cover border border-[#E5E1D9] dark:border-[#272b3b] shrink-0"
                    />
                  )}
                  <input
                    type="text"
                    value={newItemImage}
                    onChange={(e) => setNewItemImage(e.target.value)}
                    placeholder="Paste image URL or select preset below..."
                    className={`flex-1 px-3 py-2 rounded-xl text-xs border focus:outline-none focus:border-[#C46B4E] ${
                      isDarkMode ? "bg-[#12141c] border-[#272b3b] text-white" : "bg-white border-[#E5E1D9] text-[#20252B]"
                    }`}
                  />
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                  {[
                    "/images/menu/wagyu-burger.jpg",
                    "/images/menu/truffle-pasta.jpg",
                    "/images/menu/margherita-pizza.jpg",
                    "/images/menu/truffle-fries.jpg",
                    "/images/menu/caesar-salad.jpg",
                    "/images/menu/chicken-wings.jpg",
                    "/images/menu/caramel-macchiato.jpg",
                    "/images/menu/lava-cake.jpg",
                  ].map((imgPath) => (
                    <button
                      key={imgPath}
                      type="button"
                      onClick={() => setNewItemImage(imgPath)}
                      className={`w-10 h-10 rounded-lg overflow-hidden border shrink-0 cursor-pointer transition ${
                        newItemImage === imgPath ? "ring-2 ring-[#C46B4E] border-[#C46B4E]" : "border-[#E5E1D9] dark:border-[#272b3b] opacity-80 hover:opacity-100"
                      }`}
                    >
                      <img src={imgPath} alt="Preset dish" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Station */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Preparation Station</label>
                  <select
                    value={newItemCategory === "drinks" ? "bar" : newItemStation}
                    disabled={newItemCategory === "drinks"}
                    onChange={(e: any) => setNewItemStation(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none focus:border-[#C46B4E] disabled:opacity-60 ${
                      isDarkMode ? "bg-[#12141c] border-[#272b3b] text-white" : "bg-white border-[#E5E1D9] text-[#20252B]"
                    }`}
                  >
                    <option value="kitchen">Kitchen KDS Rail</option>
                    <option value="bar">Bar Dispense Rail</option>
                  </select>
                </div>

                {/* Dietary: Veg vs Non-Veg */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Food Type</label>
                  <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                    <button
                      type="button"
                      onClick={() => setNewItemIsVeg(true)}
                      className={`py-1.5 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 border cursor-pointer ${
                        newItemIsVeg
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-[#F7F5F0] dark:bg-[#12141c] text-[#64748B] border-[#E5E1D9] dark:border-[#272b3b]"
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                      Veg
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewItemIsVeg(false)}
                      className={`py-1.5 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 border cursor-pointer ${
                        !newItemIsVeg
                          ? "bg-amber-600 text-white border-amber-600"
                          : "bg-[#F7F5F0] dark:bg-[#12141c] text-[#64748B] border-[#E5E1D9] dark:border-[#272b3b]"
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      Non-Veg
                    </button>
                  </div>
                </div>
              </div>

              {/* Emoji / Icon Selector */}
              <div className="space-y-1">
                <label className="text-xs font-semibold">Dish Icon (Select or type emoji)</label>
                <div className="flex items-center gap-2">
                  <div className="text-2xl w-10 h-10 rounded-xl bg-[#F7F5F0] dark:bg-[#12141c] border border-[#E5E1D9] dark:border-[#272b3b] flex items-center justify-center shrink-0">
                    {newItemIcon}
                  </div>
                  <div className="flex items-center gap-1 overflow-x-auto py-1">
                    {["🍔", "🍕", "🍝", "🍟", "🥗", "🍗", "🍲", "🍛", "🥘", "🍺", "🍹", "☕", "🍰", "🧁", "🍨"].map(
                      (emo) => (
                        <button
                          key={emo}
                          type="button"
                          onClick={() => setNewItemIcon(emo)}
                          className={`w-8 h-8 rounded-lg text-lg flex items-center justify-center cursor-pointer transition border ${
                            newItemIcon === emo
                              ? "bg-[#C46B4E] text-white border-[#C46B4E]"
                              : "bg-[#F7F5F0] dark:bg-[#12141c] border-[#E5E1D9] dark:border-[#272b3b] hover:scale-110"
                          }`}
                        >
                          {emo}
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>

              {/* Badge Tag & Prep Time */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Special Tag (Optional)</label>
                  <input
                    type="text"
                    value={newItemTag}
                    onChange={(e) => setNewItemTag(e.target.value)}
                    placeholder="e.g. Chef Special, Popular..."
                    className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none focus:border-[#C46B4E] ${
                      isDarkMode ? "bg-[#12141c] border-[#272b3b] text-white" : "bg-white border-[#E5E1D9] text-[#20252B]"
                    }`}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Prep Time (Optional)</label>
                  <input
                    type="text"
                    value={newItemPrepTime}
                    onChange={(e) => setNewItemPrepTime(e.target.value)}
                    placeholder="e.g. 12–15 mins"
                    className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none focus:border-[#C46B4E] ${
                      isDarkMode ? "bg-[#12141c] border-[#272b3b] text-white" : "bg-white border-[#E5E1D9] text-[#20252B]"
                    }`}
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs font-semibold">Description</label>
                <textarea
                  rows={2}
                  value={newItemDescription}
                  onChange={(e) => setNewItemDescription(e.target.value)}
                  placeholder="Ingredients, preparation style or flavor notes..."
                  className={`w-full p-2.5 rounded-xl text-xs border focus:outline-none focus:border-[#C46B4E] ${
                    isDarkMode ? "bg-[#12141c] border-[#272b3b] text-white" : "bg-white border-[#E5E1D9] text-[#20252B]"
                  }`}
                />
              </div>

              {/* Stock Status Switch */}
              <div className="p-3 rounded-xl bg-[#F7F5F0] dark:bg-[#12141c] border border-[#E5E1D9] dark:border-[#272b3b] flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold">Initial Availability Status</div>
                  <div className="text-[11px] text-[#64748B]">Can customers order this immediately?</div>
                </div>
                <button
                  type="button"
                  onClick={() => setNewItemIsAvailable(!newItemIsAvailable)}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                    newItemIsAvailable
                      ? "bg-blue-600 text-white"
                      : "bg-red-600 text-white"
                  }`}
                >
                  {newItemIsAvailable ? "In Stock" : "Out of Stock"}
                </button>
              </div>

              {/* Submit Actions */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddItemModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-[#E5E1D9] text-[#64748B] hover:text-[#20252B] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingMenuItem}
                  className="px-5 py-2 rounded-xl bg-[#C46B4E] hover:bg-[#B25C40] text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSavingMenuItem
                    ? "Saving Item..."
                    : editingMenuItem
                    ? "Save Changes"
                    : "Add Item to Menu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD / EDIT RAW MATERIAL MODAL */}
      {showAddMaterialModal && (
        <div
          onClick={() => setShowAddMaterialModal(false)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-lg rounded-2xl border p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto cursor-default ${
              isDarkMode ? "bg-[#161822] border-[#292c3c] text-white" : "bg-white border-[#E5E1D9] text-[#20252B]"
            }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#E5E1D9] dark:border-[#272b3b]">
              <div className="flex items-center gap-2">
                <Boxes className="w-5 h-5 text-[#C46B4E]" />
                <h3 className="font-bold text-base">
                  {editingMaterial ? "Edit Raw Material" : "Add New Raw Material"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddMaterialModal(false)}
                className="text-[#64748B] hover:text-[#20252B] dark:hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMaterial} className="space-y-4">
              {/* Material Name */}
              <div className="space-y-1">
                <label className="text-xs font-semibold">Material / Ingredient Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fresh Mozzarella Bocconcini"
                  value={matName}
                  onChange={(e) => setMatName(e.target.value)}
                  className={`w-full px-3.5 py-2 rounded-xl text-xs border focus:outline-hidden focus:ring-1 focus:ring-[#C46B4E] ${
                    isDarkMode ? "bg-[#12141c] border-[#272b3b] text-white" : "bg-white border-[#E5E1D9] text-[#20252B]"
                  }`}
                />
              </div>

              {/* Category & Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Category</label>
                  <select
                    value={matCategory}
                    onChange={(e) => setMatCategory(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-hidden focus:ring-1 focus:ring-[#C46B4E] ${
                      isDarkMode ? "bg-[#12141c] border-[#272b3b] text-white" : "bg-white border-[#E5E1D9] text-[#20252B]"
                    }`}
                  >
                    <option value="Produce">Produce</option>
                    <option value="Dairy">Dairy</option>
                    <option value="Meat & Poultry">Meat & Poultry</option>
                    <option value="Grains & Bakery">Grains & Bakery</option>
                    <option value="Oils & Condiments">Oils & Condiments</option>
                    <option value="Beverages & Bar">Beverages & Bar</option>
                    <option value="Bakery & Sweets">Bakery & Sweets</option>
                    <option value="Packaging">Packaging</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold">Unit of Measure</label>
                  <select
                    value={matUnit}
                    onChange={(e) => setMatUnit(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-hidden focus:ring-1 focus:ring-[#C46B4E] ${
                      isDarkMode ? "bg-[#12141c] border-[#272b3b] text-white" : "bg-white border-[#E5E1D9] text-[#20252B]"
                    }`}
                  >
                    <option value="kg">kg (Kilograms)</option>
                    <option value="g">g (Grams)</option>
                    <option value="L">L (Liters)</option>
                    <option value="pcs">pcs (Pieces / Count)</option>
                    <option value="packs">packs</option>
                    <option value="cans">cans</option>
                    <option value="bottles">bottles</option>
                    <option value="kegs">kegs</option>
                  </select>
                </div>
              </div>

              {/* Stock Levels: Current, Minimum (Reorder), Optimal */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Current Stock</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={matStock}
                    onChange={(e) => setMatStock(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-hidden focus:ring-1 focus:ring-[#C46B4E] ${
                      isDarkMode ? "bg-[#12141c] border-[#272b3b] text-white" : "bg-white border-[#E5E1D9] text-[#20252B]"
                    }`}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold">Reorder Threshold</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={matMinStock}
                    onChange={(e) => setMatMinStock(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-hidden focus:ring-1 focus:ring-[#C46B4E] ${
                      isDarkMode ? "bg-[#12141c] border-[#272b3b] text-white" : "bg-white border-[#E5E1D9] text-[#20252B]"
                    }`}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold">Optimal Target</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={matOptimalStock}
                    onChange={(e) => setMatOptimalStock(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-hidden focus:ring-1 focus:ring-[#C46B4E] ${
                      isDarkMode ? "bg-[#12141c] border-[#272b3b] text-white" : "bg-white border-[#E5E1D9] text-[#20252B]"
                    }`}
                  />
                </div>
              </div>

              {/* Cost & Supplier */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Unit Cost (₹)</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="e.g. 240"
                    value={matCost}
                    onChange={(e) => setMatCost(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-hidden focus:ring-1 focus:ring-[#C46B4E] ${
                      isDarkMode ? "bg-[#12141c] border-[#272b3b] text-white" : "bg-white border-[#E5E1D9] text-[#20252B]"
                    }`}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold">Supplier / Vendor</label>
                  <input
                    type="text"
                    placeholder="e.g. Valley Dairy Farms"
                    value={matSupplier}
                    onChange={(e) => setMatSupplier(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-hidden focus:ring-1 focus:ring-[#C46B4E] ${
                      isDarkMode ? "bg-[#12141c] border-[#272b3b] text-white" : "bg-white border-[#E5E1D9] text-[#20252B]"
                    }`}
                  />
                </div>
              </div>

              {/* Storage Location & Expiry Date */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Storage Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Walk-in Chiller / Rack B"
                    value={matLocation}
                    onChange={(e) => setMatLocation(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-hidden focus:ring-1 focus:ring-[#C46B4E] ${
                      isDarkMode ? "bg-[#12141c] border-[#272b3b] text-white" : "bg-white border-[#E5E1D9] text-[#20252B]"
                    }`}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold">Expiry Date (Optional)</label>
                  <input
                    type="date"
                    value={matExpiryDate}
                    onChange={(e) => setMatExpiryDate(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-hidden focus:ring-1 focus:ring-[#C46B4E] ${
                      isDarkMode ? "bg-[#12141c] border-[#272b3b] text-white" : "bg-white border-[#E5E1D9] text-[#20252B]"
                    }`}
                  />
                  <div className="text-[10px] text-[#64748B]">Leave empty if not applicable (NA)</div>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="text-xs font-semibold">Notes / Batch Spec</label>
                <input
                  type="text"
                  placeholder="e.g. Grade A antibiotic-free"
                  value={matNotes}
                  onChange={(e) => setMatNotes(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-hidden focus:ring-1 focus:ring-[#C46B4E] ${
                    isDarkMode ? "bg-[#12141c] border-[#272b3b] text-white" : "bg-white border-[#E5E1D9] text-[#20252B]"
                  }`}
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#E5E1D9] dark:border-[#272b3b]">
                <button
                  type="button"
                  onClick={() => setShowAddMaterialModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-[#E5E1D9] text-[#64748B] hover:text-[#20252B] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingInventory}
                  className="px-5 py-2 rounded-xl bg-[#C46B4E] hover:bg-[#B25C40] text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSavingInventory ? "Saving..." : editingMaterial ? "Update Material" : "Save Raw Material"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK STOCK ADJUSTMENT / RESTOCK MODAL */}
      {showAdjustmentModal && (
        <div
          onClick={() => setShowAdjustmentModal(false)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-md rounded-2xl border p-6 space-y-4 shadow-2xl cursor-default ${
              isDarkMode ? "bg-[#161822] border-[#292c3c] text-white" : "bg-white border-[#E5E1D9] text-[#20252B]"
            }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#E5E1D9] dark:border-[#272b3b]">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-[#C46B4E]" />
                <h3 className="font-bold text-base">Quick Stock Adjustment</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAdjustmentModal(false)}
                className="text-[#64748B] hover:text-[#20252B] dark:hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteAdjustment} className="space-y-4">
              {/* Select Raw Material */}
              <div className="space-y-1">
                <label className="text-xs font-semibold">Select Raw Material</label>
                <select
                  value={adjItemId}
                  onChange={(e) => {
                    setAdjItemId(e.target.value)
                    const found = inventoryItems.find((i) => i.id === e.target.value)
                    setAdjustmentTargetItem(found || null)
                  }}
                  className={`w-full px-3.5 py-2 rounded-xl text-xs border focus:outline-hidden focus:ring-1 focus:ring-[#C46B4E] ${
                    isDarkMode ? "bg-[#12141c] border-[#272b3b] text-white" : "bg-white border-[#E5E1D9] text-[#20252B]"
                  }`}
                >
                  {inventoryItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} (Current: {item.currentStock} {item.unit})
                    </option>
                  ))}
                </select>
              </div>

              {/* Expired Warning Alert */}
              {adjustmentTargetItem && isItemExpired(adjustmentTargetItem.expiryDate) && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 text-red-800 dark:text-red-300 text-xs flex items-start gap-2">
                  <AlertOctagon className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">This Raw Material is Expired ({adjustmentTargetItem.expiryDate})</div>
                    <div className="text-[11px] mt-0.5 opacity-90">
                      Marked as <strong>Out of Stock</strong> and unusable for food prep. Please log as <strong>Spoilage / Waste (-)</strong> or restock fresh inventory.
                    </div>
                  </div>
                </div>
              )}

              {/* Adjustment Type Tabs */}
              <div className="space-y-1">
                <label className="text-xs font-semibold">Adjustment Action Type</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setAdjType("RESTOCK")}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 border ${
                      adjType === "RESTOCK"
                        ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                        : isDarkMode
                        ? "bg-[#12141c] border-[#272b3b] text-slate-300"
                        : "bg-[#F7F5F0] border-[#E5E1D9] text-[#20252B]"
                    }`}
                  >
                    <ArrowDownRight className="w-3.5 h-3.5" />
                    <span>Restock / Intake (+)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdjType("USAGE")}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 border ${
                      adjType === "USAGE"
                        ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                        : isDarkMode
                        ? "bg-[#12141c] border-[#272b3b] text-slate-300"
                        : "bg-[#F7F5F0] border-[#E5E1D9] text-[#20252B]"
                    }`}
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>Kitchen Usage (-)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdjType("WASTE")}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 border ${
                      adjType === "WASTE"
                        ? "bg-red-600 text-white border-red-600 shadow-2xs"
                        : isDarkMode
                        ? "bg-[#12141c] border-[#272b3b] text-slate-300"
                        : "bg-[#F7F5F0] border-[#E5E1D9] text-[#20252B]"
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Spoilage / Waste (-)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdjType("AUDIT")}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 border ${
                      adjType === "AUDIT"
                        ? "bg-purple-600 text-white border-purple-600 shadow-2xs"
                        : isDarkMode
                        ? "bg-[#12141c] border-[#272b3b] text-slate-300"
                        : "bg-[#F7F5F0] border-[#E5E1D9] text-[#20252B]"
                    }`}
                  >
                    <Scale className="w-3.5 h-3.5" />
                    <span>Audit Count (=)</span>
                  </button>
                </div>
              </div>

              {/* Quantity */}
              <div className="space-y-1">
                <label className="text-xs font-semibold">
                  {adjType === "AUDIT" ? "New Verified Physical Stock" : "Quantity to Adjust"} (
                  {adjustmentTargetItem ? adjustmentTargetItem.unit : "units"})
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  min="0.01"
                  value={adjQty}
                  onChange={(e) => setAdjQty(e.target.value)}
                  className={`w-full px-3.5 py-2 rounded-xl text-xs border focus:outline-hidden focus:ring-1 focus:ring-[#C46B4E] ${
                    isDarkMode ? "bg-[#12141c] border-[#272b3b] text-white" : "bg-white border-[#E5E1D9] text-[#20252B]"
                  }`}
                />
              </div>

              {/* Live Preview Box */}
              {adjustmentTargetItem && (
                <div className="p-3 rounded-xl bg-[#F7F5F0] dark:bg-[#12141c] border border-[#E5E1D9] dark:border-[#272b3b] text-xs">
                  <div className="text-[11px] text-[#64748B] mb-1">Stock Preview Calculation:</div>
                  <div className="flex items-center justify-between font-bold">
                    <span>Current: {adjustmentTargetItem.currentStock} {adjustmentTargetItem.unit}</span>
                    <span className="text-[#64748B]">→</span>
                    <span className="text-[#C46B4E]">
                      After:{" "}
                      {adjType === "RESTOCK"
                        ? Number((adjustmentTargetItem.currentStock + Number(adjQty || 0)).toFixed(2))
                        : adjType === "USAGE" || adjType === "WASTE"
                        ? Number(Math.max(0, adjustmentTargetItem.currentStock - Number(adjQty || 0)).toFixed(2))
                        : Number(Number(adjQty || 0).toFixed(2))}{" "}
                      {adjustmentTargetItem.unit}
                    </span>
                  </div>
                </div>
              )}

              {/* Staff & Reason */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Logged By Staff</label>
                  <input
                    type="text"
                    value={adjStaff}
                    onChange={(e) => setAdjStaff(e.target.value)}
                    placeholder="e.g. Manager Vikram"
                    className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-hidden focus:ring-1 focus:ring-[#C46B4E] ${
                      isDarkMode ? "bg-[#12141c] border-[#272b3b] text-white" : "bg-white border-[#E5E1D9] text-[#20252B]"
                    }`}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold">Reason / Reference</label>
                  <input
                    type="text"
                    value={adjReason}
                    onChange={(e) => setAdjReason(e.target.value)}
                    placeholder="e.g. PO delivery #109 or daily prep"
                    className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-hidden focus:ring-1 focus:ring-[#C46B4E] ${
                      isDarkMode ? "bg-[#12141c] border-[#272b3b] text-white" : "bg-white border-[#E5E1D9] text-[#20252B]"
                    }`}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#E5E1D9] dark:border-[#272b3b]">
                <button
                  type="button"
                  onClick={() => setShowAdjustmentModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-[#E5E1D9] text-[#64748B] hover:text-[#20252B] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingInventory}
                  className="px-5 py-2 rounded-xl bg-[#C46B4E] hover:bg-[#B25C40] text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSavingInventory ? "Recording..." : "Apply Adjustment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STOCK MOVEMENT AUDIT LOG MODAL */}
      {showMovementsLogModal && (
        <div
          onClick={() => setShowMovementsLogModal(false)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-2xl rounded-2xl border p-6 space-y-4 shadow-2xl max-h-[85vh] flex flex-col cursor-default ${
              isDarkMode ? "bg-[#161822] border-[#292c3c] text-white" : "bg-white border-[#E5E1D9] text-[#20252B]"
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E1D9] dark:border-[#272b3b]">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-[#C46B4E]" />
                <div>
                  <h3 className="font-bold text-base">Stock Movement Audit Log</h3>
                  <p className="text-[11px] text-[#64748B]">Complete history of all restocks, usages, wastage, and physical inventory audits</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMovementsLogModal(false)}
                className="text-[#64748B] hover:text-[#20252B] dark:hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {stockMovements.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#64748B]">
                  No stock movements recorded yet.
                </div>
              ) : (
                stockMovements.map((mov) => {
                  const isRestock = mov.type === "RESTOCK"
                  const isUsage = mov.type === "USAGE"
                  const isWaste = mov.type === "WASTE"

                  return (
                    <div
                      key={mov.id}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                        isDarkMode ? "bg-[#12141c] border-[#262a3b]" : "bg-[#F7F5F0] border-[#E5E1D9]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isRestock
                              ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                              : isUsage
                              ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                              : isWaste
                              ? "bg-red-500/15 text-red-600 dark:text-red-400"
                              : "bg-purple-500/15 text-purple-600 dark:text-purple-400"
                          }`}
                        >
                          {isRestock ? (
                            <ArrowDownRight className="w-4 h-4" />
                          ) : isUsage ? (
                            <ArrowUpRight className="w-4 h-4" />
                          ) : isWaste ? (
                            <Trash2 className="w-4 h-4" />
                          ) : (
                            <Scale className="w-4 h-4" />
                          )}
                        </div>

                        <div>
                          <div className="font-bold text-[#20252B] dark:text-white flex items-center gap-1.5">
                            <span>{mov.itemName}</span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md ${
                                isRestock
                                  ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                                  : isUsage
                                  ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                                  : isWaste
                                  ? "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300"
                                  : "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300"
                              }`}
                            >
                              {mov.type}
                            </span>
                          </div>
                          <div className="text-[11px] text-[#64748B] mt-0.5">
                            {mov.reason || "Standard stock adjustment"}
                            {mov.performedBy && <span className="opacity-80"> • by {mov.performedBy}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div
                          className={`font-bold ${
                            isRestock
                              ? "text-blue-600 dark:text-blue-400"
                              : isUsage || isWaste
                              ? "text-red-600 dark:text-red-400"
                              : "text-purple-600 dark:text-purple-400"
                          }`}
                        >
                          {isRestock ? "+" : isUsage || isWaste ? "-" : ""}
                          {mov.quantity} {mov.unit}
                        </div>
                        <div className="text-[10px] text-[#64748B]">
                          {mov.previousStock} → {mov.newStock} {mov.unit}
                        </div>
                        <div className="text-[9px] text-[#64748B] mt-0.5">
                          {new Date(mov.date).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            <div className="pt-2 flex justify-end border-t border-[#E5E1D9] dark:border-[#272b3b]">
              <button
                type="button"
                onClick={() => setShowMovementsLogModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#20252B] hover:bg-black text-white dark:bg-white dark:text-[#20252B] transition cursor-pointer"
              >
                Close Audit Log
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT TEAM MEMBER MODAL */}
      {showAddStaffModal && (
        <div
          onClick={() => setShowAddStaffModal(false)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-lg rounded-2xl border p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto cursor-default ${
              isDarkMode
                ? "bg-[#161822] border-[#292c3c] text-white"
                : "bg-white border-[#E5E1D9] text-[#20252B]"
            }`}
          >
            <div className="flex items-center justify-between border-b pb-3 border-[#E5E1D9] dark:border-[#272b3b]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#E9E3D8] text-[#C46B4E] flex items-center justify-center font-bold">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base">
                    {editingStaff ? "Edit Staff Member" : "Add New Team Member"}
                  </h3>
                  <p className="text-xs text-[#64748B]">
                    {editingStaff
                      ? `Update role, station, and access for ${editingStaff.name}`
                      : "Create user credentials and station assignment for Nodedr Bistro"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddStaffModal(false)}
                className="p-1 rounded-lg text-[#64748B] hover:text-[#20252B] dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStaff} className="space-y-4">
              {/* Full Name */}
              <div className="space-y-1">
                <label className="text-xs font-semibold">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vikram Sen"
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#C46B4E] border ${
                    isDarkMode
                      ? "bg-[#12141c] border-[#2b2f3e] text-white"
                      : "bg-[#F7F5F0] border-[#E5E1D9] text-[#20252B]"
                  }`}
                />
              </div>

              {/* Role & Department */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Staff Role *</label>
                  <select
                    value={staffRole}
                    onChange={(e) => handleRoleChange(e.target.value as StaffRole)}
                    className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#C46B4E] border ${
                      isDarkMode
                        ? "bg-[#12141c] border-[#2b2f3e] text-white"
                        : "bg-[#F7F5F0] border-[#E5E1D9] text-[#20252B]"
                    }`}
                  >
                    <option value="pos-kitchen">Kitchen - Head Chef / Cook (KDS)</option>
                    <option value="pos-orders">POS - Cashier / Order Taker</option>
                    <option value="pos-reception">Reception - Front Desk & Hostess</option>
                    <option value="admin">Admin - Restaurant Owner & Admin</option>
                    <option value="manager">Management - Operations Manager</option>
                    <option value="bartender">Bar - Mixologist / Bartender</option>
                    <option value="inventory">Store - Inventory & Raw Materials</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold">Department</label>
                  <select
                    value={staffDepartment}
                    onChange={(e) =>
                      setStaffDepartment(e.target.value as TeamMember["department"])
                    }
                    className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#C46B4E] border ${
                      isDarkMode
                        ? "bg-[#12141c] border-[#2b2f3e] text-white"
                        : "bg-[#F7F5F0] border-[#E5E1D9] text-[#20252B]"
                    }`}
                  >
                    <option value="Kitchen & Bar">Kitchen & Bar</option>
                    <option value="Front of House">Front of House</option>
                    <option value="Management">Management</option>
                    <option value="Operations">Operations</option>
                  </select>
                </div>
              </div>

              {/* Station Assignment */}
              <div className="space-y-1">
                <label className="text-xs font-semibold">Assigned Station / Location *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kitchen Display Queue (KDS Rail 1)"
                  value={staffStation}
                  onChange={(e) => setStaffStation(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#C46B4E] border ${
                    isDarkMode
                      ? "bg-[#12141c] border-[#2b2f3e] text-white"
                      : "bg-[#F7F5F0] border-[#E5E1D9] text-[#20252B]"
                  }`}
                />
              </div>

              {/* Shift Schedule & 4-Digit PIN */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Shift Schedule</label>
                  <select
                    value={staffShift}
                    onChange={(e) =>
                      setStaffShift(
                        e.target.value as "Morning (7 AM - 3 PM)" | "Evening (3 PM - 11 PM)" | "Full Day"
                      )
                    }
                    className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#C46B4E] border ${
                      isDarkMode
                        ? "bg-[#12141c] border-[#2b2f3e] text-white"
                        : "bg-[#F7F5F0] border-[#E5E1D9] text-[#20252B]"
                    }`}
                  >
                    <option value="Morning (7 AM - 3 PM)">Morning (7 AM - 3 PM)</option>
                    <option value="Evening (3 PM - 11 PM)">Evening (3 PM - 11 PM)</option>
                    <option value="Full Day">Full Day (10 AM - 11 PM)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold">4-Digit Terminal PIN</label>
                  <input
                    type="text"
                    maxLength={4}
                    placeholder="e.g. 2001"
                    value={staffPin}
                    onChange={(e) => setStaffPin(e.target.value.replace(/\D/g, ""))}
                    className={`w-full rounded-xl px-3 py-2 text-xs font-mono tracking-widest focus:outline-none focus:border-[#C46B4E] border ${
                      isDarkMode
                        ? "bg-[#12141c] border-[#2b2f3e] text-white"
                        : "bg-[#F7F5F0] border-[#E5E1D9] text-[#20252B]"
                    }`}
                  />
                </div>
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Work Email</label>
                  <input
                    type="email"
                    placeholder="e.g. chef@nodedrbistro.com"
                    value={staffEmail}
                    onChange={(e) => setStaffEmail(e.target.value)}
                    className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#C46B4E] border ${
                      isDarkMode
                        ? "bg-[#12141c] border-[#2b2f3e] text-white"
                        : "bg-[#F7F5F0] border-[#E5E1D9] text-[#20252B]"
                    }`}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold">Contact Phone</label>
                  <input
                    type="tel"
                    placeholder="+91 98200 11223"
                    value={staffPhone}
                    onChange={(e) => setStaffPhone(e.target.value)}
                    className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#C46B4E] border ${
                      isDarkMode
                        ? "bg-[#12141c] border-[#2b2f3e] text-white"
                        : "bg-[#F7F5F0] border-[#E5E1D9] text-[#20252B]"
                    }`}
                  />
                </div>
              </div>

              {/* Initial Shift Status */}
              <div className="space-y-1">
                <label className="text-xs font-semibold">Initial Shift Status</label>
                <div className="grid grid-cols-2 gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => setStaffStatus("active")}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border cursor-pointer ${
                      staffStatus === "active"
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-[#F7F5F0] dark:bg-[#12141c] text-[#64748B] border-[#E5E1D9] dark:border-[#272b3b]"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-blue-400" />
                    On Shift (Active)
                  </button>
                  <button
                    type="button"
                    onClick={() => setStaffStatus("off-duty")}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border cursor-pointer ${
                      staffStatus === "off-duty"
                        ? "bg-slate-700 text-white border-slate-700"
                        : "bg-[#F7F5F0] dark:bg-[#12141c] text-[#64748B] border-[#E5E1D9] dark:border-[#272b3b]"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    Off Duty
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-[#E5E1D9] dark:border-[#272b3b] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddStaffModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-[#E5E1D9] dark:border-[#272b3b] text-[#64748B] hover:text-[#20252B] dark:hover:text-white transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingStaff}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#C46B4E] hover:bg-[#B25C40] text-white transition shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSavingStaff
                    ? "Saving..."
                    : editingStaff
                    ? "Update Staff Member"
                    : "Add Staff Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADMIN MENU ITEM DETAILS MODAL */}
      {selectedAdminMenuItem && (
        <div
          onClick={() => setSelectedAdminMenuItem(null)}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-md rounded-3xl border overflow-hidden shadow-2xl cursor-default ${
              isDarkMode ? "bg-[#161822] border-[#292c3c] text-white" : "bg-white border-[#E5E1D9] text-[#20252B]"
            }`}
          >
            <div className="relative h-56 w-full bg-[#F7F5F0] dark:bg-[#1f2231] flex items-center justify-center overflow-hidden">
              {selectedAdminMenuItem.image ? (
                <img
                  src={selectedAdminMenuItem.image}
                  alt={selectedAdminMenuItem.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-7xl">{selectedAdminMenuItem.icon}</span>
              )}
              <button
                type="button"
                onClick={() => setSelectedAdminMenuItem(null)}
                className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="absolute bottom-3 left-4 flex items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    selectedAdminMenuItem.isVeg ? "bg-sky-600 text-white" : "bg-amber-600 text-white"
                  }`}
                >
                  {selectedAdminMenuItem.isVeg ? "Pure Veg" : "Non-Veg"}
                </span>
                {selectedAdminMenuItem.tag && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#C46B4E] text-white">
                    {selectedAdminMenuItem.tag}
                  </span>
                )}
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <div className="flex items-center justify-between text-[11px] font-semibold text-[#C46B4E] uppercase tracking-wider">
                  <span>
                    {selectedAdminMenuItem.category} · {selectedAdminMenuItem.station === "bar" ? "Bar Station" : "Kitchen Station"}
                  </span>
                  {selectedAdminMenuItem.prepTime && (
                    <span className="text-[#64748B] flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {selectedAdminMenuItem.prepTime}
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-bold mt-1">{selectedAdminMenuItem.name}</h3>
                <p className="text-xs text-[#64748B] leading-relaxed mt-1.5">
                  {selectedAdminMenuItem.description || "No detailed description recorded."}
                </p>
              </div>

              {selectedAdminMenuItem.ingredients && selectedAdminMenuItem.ingredients.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedAdminMenuItem.ingredients.map((ing) => (
                    <span
                      key={ing}
                      className={`px-2 py-1 rounded-lg text-[11px] font-medium border ${
                        isDarkMode ? "bg-[#1e2230] border-[#2c3144] text-slate-300" : "bg-[#F7F5F0] border-[#E5E1D9] text-[#20252B]"
                      }`}
                    >
                      {ing}
                    </span>
                  ))}
                </div>
              )}

              {selectedAdminMenuItem.hasPortionOptions && selectedAdminMenuItem.halfPrice ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className={`p-3 rounded-xl border ${isDarkMode ? "bg-[#12141c] border-[#272b3b]" : "bg-[#F7F5F0] border-[#E5E1D9]"}`}>
                    <div className="text-[11px] text-[#64748B] font-semibold">Half Portion</div>
                    <div className="text-base font-extrabold text-[#C46B4E]">₹{selectedAdminMenuItem.halfPrice.toFixed(2)}</div>
                  </div>
                  <div className={`p-3 rounded-xl border ${isDarkMode ? "bg-[#12141c] border-[#272b3b]" : "bg-[#F7F5F0] border-[#E5E1D9]"}`}>
                    <div className="text-[11px] text-[#64748B] font-semibold">Full Portion</div>
                    <div className="text-base font-extrabold text-[#C46B4E]">₹{(selectedAdminMenuItem.fullPrice || selectedAdminMenuItem.price).toFixed(2)}</div>
                  </div>
                </div>
              ) : (
                <div className={`p-3 rounded-xl border flex items-center justify-between ${isDarkMode ? "bg-[#12141c] border-[#272b3b]" : "bg-[#F7F5F0] border-[#E5E1D9]"}`}>
                  <span className="text-xs text-[#64748B] font-semibold">Standard Menu Price</span>
                  <span className="text-base font-extrabold text-[#C46B4E]">₹{selectedAdminMenuItem.price.toFixed(2)}</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    handleToggleItemAvailability(selectedAdminMenuItem)
                    setSelectedAdminMenuItem((prev) =>
                      prev ? { ...prev, isAvailable: prev.isAvailable === false ? true : false } : null
                    )
                  }}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold cursor-pointer ${
                    selectedAdminMenuItem.isAvailable === false
                      ? "bg-blue-600 text-white"
                      : "bg-[#C46B4E] text-white"
                  }`}
                >
                  {selectedAdminMenuItem.isAvailable === false ? "Mark In Stock" : "Mark Out of Stock"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const target = selectedAdminMenuItem
                    setSelectedAdminMenuItem(null)
                    handleOpenEditMenuItem(target)
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold border border-[#C46B4E]/40 text-[#C46B4E] hover:bg-[#C46B4E]/10 flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedAdminMenuItem(null)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-semibold border cursor-pointer ${
                    isDarkMode ? "border-[#2b2f3e] text-slate-300" : "border-[#E5E1D9] text-[#64748B]"
                  }`}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* POS HALF / FULL PORTION PICKER MODAL */}
      {posPortionItem && (
        <div
          onClick={() => setPosPortionItem(null)}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-sm rounded-2xl border p-5 space-y-4 shadow-2xl cursor-default ${
              isDarkMode ? "bg-[#161822] border-[#292c3c] text-white" : "bg-white border-[#E5E1D9] text-[#20252B]"
            }`}
          >
            <div className="flex items-center gap-3">
              {posPortionItem.image ? (
                <img src={posPortionItem.image} alt={posPortionItem.name} className="w-12 h-12 rounded-xl object-cover shrink-0" />
              ) : (
                <span className="text-3xl">{posPortionItem.icon}</span>
              )}
              <div>
                <h4 className="font-bold text-sm">{posPortionItem.name}</h4>
                <p className="text-xs text-[#64748B]">Select portion size for POS ticket</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  addToCart(posPortionItem, "half")
                  setPosPortionItem(null)
                }}
                className="p-3.5 rounded-xl border border-[#C46B4E]/40 bg-[#C46B4E]/10 hover:bg-[#C46B4E] hover:text-white transition text-left cursor-pointer group"
              >
                <div className="text-xs font-bold">Half Portion</div>
                <div className="text-base font-extrabold text-[#C46B4E] group-hover:text-white mt-0.5">
                  ₹{posPortionItem.halfPrice?.toFixed(2)}
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  addToCart(posPortionItem, "full")
                  setPosPortionItem(null)
                }}
                className="p-3.5 rounded-xl border border-[#C46B4E]/40 bg-[#C46B4E]/10 hover:bg-[#C46B4E] hover:text-white transition text-left cursor-pointer group"
              >
                <div className="text-xs font-bold">Full Portion</div>
                <div className="text-base font-extrabold text-[#C46B4E] group-hover:text-white mt-0.5">
                  ₹{(posPortionItem.fullPrice || posPortionItem.price).toFixed(2)}
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Occupied Table Bill Modal */}
      {viewBillTable && (() => {
        const clearedAtMs = viewBillTable.clearedAt ? new Date(viewBillTable.clearedAt).getTime() : 0
        const billOrders = orders.filter((o) => {
          if (o.status === "CANCELLED" || o.billed_closed_at) return false
          if (!matchesTableOrder(viewBillTable, o.table_id)) return false
          if (clearedAtMs > 0) {
            const createdMs = new Date(o.created_at).getTime()
            if (!Number.isNaN(createdMs) && createdMs <= clearedAtMs) return false
          } else if (o.status === "CLOSED" && o.payment_status === "PAID") {
            return false
          }
          return true
        })

        const subtotal = billOrders.reduce((acc, ord) => {
          const itemsSum = (ord.order_items || []).reduce(
            (s, it) => s + resolveBillItemRate(it) * (Number(it.quantity) || 1),
            0
          )
          if (itemsSum > 0) return acc + itemsSum
          const computed = (Number(ord.total_amount) || 0) - (Number(ord.tax_amount) || 0) + (Number(ord.discount_amount) || 0)
          return acc + Math.max(0, computed)
        }, 0)
        const totalTax = billOrders.reduce((acc, ord) => acc + (Number(ord.tax_amount) || 0), 0)
        const totalDiscount = billOrders.reduce((acc, ord) => acc + (Number(ord.discount_amount) || 0), 0)
        const grandTotal = billOrders.reduce((acc, ord) => acc + (Number(ord.total_amount) || 0), 0)
        const hasUnpaid = billOrders.some((o) => o.payment_status !== "PAID")
        const allItemsServed =
          billOrders.length > 0 &&
          billOrders.every((ord) => {
            const items = ord.order_items || []
            if (items.length > 0) {
              return items.every((it) => String(it.status || "").toLowerCase() === "completed")
            }
            return ord.status === "CLOSED"
          })

        return (
          <div
            onClick={() => setViewBillTable(null)}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer animate-in fade-in"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden cursor-default flex flex-col max-h-[90dvh] ${
                isDarkMode
                  ? "bg-[#161822] border-[#262a3a] text-white"
                  : "bg-white border-[#E5E1D9] text-[#20252B]"
              }`}
            >
              {/* Header */}
              <div
                className={`px-5 py-4 border-b flex items-center justify-between ${
                  isDarkMode ? "border-[#252938] bg-[#1a1d28]" : "border-[#E5E1D9] bg-[#FAF8F4]"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/25">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm">{viewBillTable.name} · Current Bill</h3>
                      {billOrders.length > 0 && (
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                            hasUnpaid
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30"
                              : "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30"
                          }`}
                        >
                          {hasUnpaid ? "Payment Due" : "Paid"}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#64748B]">
                      {billOrders.length > 0
                        ? `${billOrders.length} active order${billOrders.length > 1 ? "s" : ""} · ${viewBillTable.seats} seats`
                        : `Occupied table · ${viewBillTable.seats} seats`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setViewBillTable(null)}
                  className="w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15 flex items-center justify-center cursor-pointer transition"
                  aria-label="Close table bill"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4 overflow-y-auto overscroll-contain flex-1">
                {billOrders.length === 0 ? (
                  <div
                    className={`p-6 rounded-xl border border-dashed text-center space-y-2 ${
                      isDarkMode ? "border-[#2a2e3f] text-slate-400" : "border-[#E5E1D9] text-[#64748B]"
                    }`}
                  >
                    <Receipt className="w-7 h-7 mx-auto opacity-50" />
                    <div className="text-xs font-semibold">No active orders found for {viewBillTable.name}</div>
                    <p className="text-[11px]">
                      Create an order in Point of Sale or wait for a QR order from guests at this table.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      {billOrders.map((ord) => (
                        <div
                          key={ord.id}
                          className={`rounded-xl border p-3.5 space-y-2.5 ${
                            isDarkMode ? "bg-[#12141c] border-[#242838]" : "bg-[#FAF8F4] border-[#E5E1D9]"
                          }`}
                        >
                          <div className="flex items-center justify-between text-[11px] pb-2 border-b border-dashed border-[#E5E1D9] dark:border-[#262a3a]">
                            <div className="flex flex-wrap items-center gap-2 font-bold">
                              <span>{ord.order_number || `#${ord.id.slice(-4)}`}</span>
                              <span className="font-normal text-[#64748B]">• {formatTimeAgo(ord.created_at)}</span>
                              {(ord.customer_name || ord.customer_phone) && (
                                <span className="font-medium text-[#64748B]">
                                  · {[ord.customer_name, ord.customer_phone].filter(Boolean).join(" (")}
                                  {ord.customer_name && ord.customer_phone ? ")" : ""}
                                </span>
                              )}
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded-md font-bold uppercase text-[10px] ${
                                ord.payment_status === "PAID"
                                  ? "bg-blue-500/15 text-blue-700 dark:text-blue-300"
                                  : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                              }`}
                            >
                              {ord.payment_status === "PAID" ? "Paid" : "Unpaid"}
                            </span>
                          </div>

                          <div className="space-y-1.5 text-xs">
                            {(ord.order_items || []).map((it) => {
                              const itemName = it.MenuItem?.name || it.name || "Menu Item"
                              const qty = Number(it.quantity) || 1
                              const unitPrice = resolveBillItemRate(it)
                              const lineTotal = unitPrice * qty
                              return (
                                <div key={it.id} className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="font-medium truncate">
                                      <span className="font-bold text-[#C46B4E]">{qty}×</span> {itemName}
                                      {qty > 1 && unitPrice > 0 && (
                                        <span className="text-[10px] text-[#64748B] font-normal ml-1.5">
                                          (@ ₹{unitPrice.toFixed(2)})
                                        </span>
                                      )}
                                    </div>
                                    {it.special_instructions && (
                                      <div className="text-[10px] text-[#64748B] italic">
                                        Note: {it.special_instructions}
                                      </div>
                                    )}
                                  </div>
                                  <span className="font-semibold shrink-0">
                                    ₹{lineTotal.toFixed(2)}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Totals Summary */}
                    <div
                      className={`rounded-xl border p-3.5 space-y-1.5 text-xs ${
                        isDarkMode ? "bg-[#12141c] border-[#252938]" : "bg-white border-[#E5E1D9]"
                      }`}
                    >
                      <div className="flex items-center justify-between text-[#64748B]">
                        <span>Subtotal</span>
                        <span>₹{subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between text-[#64748B]">
                        <span>Taxes &amp; GST</span>
                        <span>₹{totalTax.toFixed(2)}</span>
                      </div>
                      {totalDiscount > 0 && (
                        <div className="flex items-center justify-between text-blue-600 dark:text-blue-400">
                          <span>Discount</span>
                          <span>-₹{totalDiscount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="pt-2 mt-1 border-t border-[#E5E1D9] dark:border-[#252938] flex items-center justify-between text-sm font-extrabold">
                        <span>Total Bill</span>
                        <span className="text-[#C46B4E]">₹{grandTotal.toFixed(2)}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Footer Actions */}
              <div
                className={`px-5 py-3.5 border-t flex flex-wrap items-center justify-between gap-2 ${
                  isDarkMode ? "border-[#252938] bg-[#1a1d28]" : "border-[#E5E1D9] bg-[#FAF8F4]"
                }`}
              >
                {billOrders.length === 0 ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        updateSpecificTableStatus(viewBillTable.id, "available")
                        setViewBillTable(null)
                      }}
                      className={`px-3.5 py-2 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                        isDarkMode
                          ? "border-[#2e3244] text-slate-300 hover:bg-[#222636]"
                          : "border-[#E5E1D9] bg-white text-[#20252B] hover:bg-slate-50"
                      }`}
                    >
                      Mark Available
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTableId(viewBillTable.id)
                        setViewBillTable(null)
                        setActiveTab("pos")
                      }}
                      className="px-4 py-2 rounded-xl bg-[#C46B4E] hover:bg-[#B25C40] text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Order</span>
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setReceiptPreview({
                            title: viewBillTable.name,
                            orders: billOrders,
                          })
                        }
                        className={`px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                          isDarkMode
                            ? "border-[#2e3244] bg-[#14161f] text-slate-200 hover:bg-[#222636]"
                            : "border-[#E5E1D9] bg-white text-[#20252B] hover:bg-slate-50"
                        }`}
                      >
                        <Receipt className="w-3.5 h-3.5 text-[#C46B4E]" />
                        <span>Print Bill</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          sendBillToCustomerQr(viewBillTable, billOrders, {
                            subtotal,
                            totalTax,
                            totalDiscount,
                            grandTotal,
                            hasUnpaid,
                          })
                        }
                        disabled={sendingBillTableId === viewBillTable.id}
                        className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                          billSentSuccessTableId === viewBillTable.id
                            ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                            : "border-indigo-500/35 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/20"
                        }`}
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>
                          {sendingBillTableId === viewBillTable.id
                            ? "Sending..."
                            : billSentSuccessTableId === viewBillTable.id
                            ? "Sent to QR ✓"
                            : viewBillTable.sentBill
                            ? "Resend to QR"
                            : "Send Bill to QR"}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          updateSpecificTableStatus(viewBillTable.id, "available")
                          setViewBillTable(null)
                        }}
                        className={`px-3.5 py-2 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                          isDarkMode
                            ? "border-[#2e3244] text-slate-300 hover:bg-[#222636]"
                            : "border-[#E5E1D9] bg-white text-[#20252B] hover:bg-slate-50"
                        }`}
                      >
                        Clear Table
                      </button>
                    </div>
                    {hasUnpaid ? (
                      <button
                        type="button"
                        disabled={!allItemsServed}
                        title={
                          allItemsServed
                            ? "Mark all orders on this table as paid"
                            : "All items must be served before marking paid"
                        }
                        onClick={async () => {
                          if (!allItemsServed) return
                          await Promise.all(
                            billOrders
                              .filter((o) => o.payment_status !== "PAID")
                              .map((o) => updatePaymentStatus(o.id, "PAID"))
                          )
                          const paidOrders = billOrders.map((o) => ({ ...o, payment_status: "PAID" }))
                          await sendBillToCustomerQr(viewBillTable, paidOrders, {
                            subtotal,
                            totalTax,
                            totalDiscount,
                            grandTotal,
                            hasUnpaid: false,
                          })
                        }}
                        className="px-4 py-2 rounded-xl bg-[#C46B4E] hover:bg-[#B25C40] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#C46B4E] text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{allItemsServed ? "Mark Paid" : "Serve All Items First"}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setViewBillTable(null)}
                        className="px-4 py-2 rounded-xl bg-[#20252B] hover:bg-[#2F363F] text-white text-xs font-bold transition cursor-pointer"
                      >
                        Done
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* Formatted Restaurant Bill / Thermal Receipt Print Preview */}
      {receiptPreview && (
        <BillReceiptModal
          title={receiptPreview.title}
          orders={receiptPreview.orders}
          resolveItemRate={resolveBillItemRate}
          onClose={() => setReceiptPreview(null)}
          isDarkMode={isDarkMode}
        />
      )}

      {/* Full-Screen Host / Front Desk Service Call Alert (Waiter, Clean Table, Bill) + Bell Ring + Voice */}
      {isHostOrFrontDesk && showWaiterOverlay && pendingServiceRequests.length > 0 && (
        <WaiterAlertOverlay
          requests={pendingServiceRequests}
          isMuted={isBellMuted}
          onToggleMute={() => {
            setIsBellMuted((prev) => {
              const next = !prev
              if (next) stopServiceVoice()
              return next
            })
          }}
          onRingAgain={() => {
            unlockBellAudio()
            const primary = pendingServiceRequests[0]
            if (primary) {
              playBellAndSpeak(primary.table, primary.type, 3)
            } else {
              playServiceBellRing(3)
            }
          }}
          onAcknowledgeRequest={async (id) => {
            stopServiceVoice()
            await handleClearServiceRequest(id)
          }}
          onAcknowledgeAll={async () => {
            stopServiceVoice()
            await Promise.all(
              pendingServiceRequests.map((req) => handleClearServiceRequest(req.id))
            )
            setShowWaiterOverlay(false)
          }}
          onDismissOverlay={() => {
            stopServiceVoice()
            setShowWaiterOverlay(false)
          }}
        />
      )}
    </div>
  )
}

export default function RestaurantAdminHome() {
  return (
    <Suspense fallback={<PortalShellSkeleton variant="dashboard" isDarkMode={true} />}>
      <RestaurantAdminContent />
    </Suspense>
  )
}
