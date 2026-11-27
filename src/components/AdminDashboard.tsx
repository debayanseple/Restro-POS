"use client"

import React, { useMemo, useState, useEffect } from "react"
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  BellRing,
  Boxes,
  CalendarCheck,
  CheckCircle2,
  ChefHat,
  Clock,
  CreditCard,
  DollarSign,
  Eye,
  Flame,
  LayoutGrid,
  Package,
  RefreshCw,
  ShoppingCart,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
  Utensils,
  Wallet,
} from "lucide-react"
import { InventoryItem, StockMovement, isItemExpired, isItemOutOfStock } from "@/lib/inventory-catalog"
import { MenuItem } from "@/lib/menu-catalog"
import { TeamMember } from "@/lib/team-catalog"

export interface DashboardOrder {
  id: string
  status: string
  kds_stage?: string
  kitchen_stage?: string
  bar_stage?: string
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
    quantity: number
    unit_price: number
    special_instructions?: string | null
    name?: string
    station?: string
    status?: string
    MenuItem?: { name: string } | null
  }>
}

export interface DashboardTable {
  id: number
  name: string
  seats: number
  status: "available" | "occupied" | "reserved" | "cleaning" | "out_of_service" | string
  isOpen: boolean
}

export interface DashboardReservation {
  id: string
  guestName: string
  phone: string
  guests: number
  time: string
  table: string
  status: string
  notes?: string
}

export interface DashboardCustomer {
  id: string
  name: string
  phone: string
  email: string
  visits: number
  totalSpend: string
  loyalty: string
  lastVisit: string
  prefTable: string
  allergies: string
}

export interface DashboardServiceRequest {
  id: string
  table: string
  tableNumber: number
  type: "clean" | "waiter" | "bill"
  title: string
  status: "pending" | "in-progress" | "resolved"
  createdAt: string
}

export interface DashboardKdsTicket {
  id: string
  orderId: string
  table: string
  time: string
  station: "kitchen" | "bar"
  items: Array<{ id: string; name: string; quantity: number; status: string }>
  stage: "new" | "preparing" | "ready"
}

interface AdminDashboardProps {
  isDarkMode: boolean
  orders: DashboardOrder[]
  tables: DashboardTable[]
  reservations: DashboardReservation[]
  waitlist: Array<{ name: string; guests: number; time: string }>
  customersList: DashboardCustomer[]
  inventoryItems: InventoryItem[]
  stockMovements: StockMovement[]
  menuCatalog: MenuItem[]
  teamMembers: TeamMember[]
  serviceRequests: DashboardServiceRequest[]
  kdsTickets: DashboardKdsTicket[]
  onNavigateTab: (tab: string) => void
  onRestockItem: (item: InventoryItem) => void
  onBookCustomerTable: (customer: { name: string; phone: string }) => void
  onRefreshAll: () => Promise<void> | void
}

interface DonutSlice {
  label: string
  value: number
  color: string
  subLabel?: string
}

function parseINR(val: string | number): number {
  if (typeof val === "number") return isNaN(val) ? 0 : val
  const num = parseFloat(String(val).replace(/[^0-9.]/g, ""))
  return isNaN(num) ? 0 : num
}

function formatINR(val: number, decimals = 0): string {
  return `₹${val.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`
}

function timeAgoShort(iso?: string): string {
  if (!iso) return "Just now"
  const diffMs = Date.now() - new Date(iso).getTime()
  if (isNaN(diffMs) || diffMs < 0) return "Just now"
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

// Reusable Interactive SVG Donut Chart
function InteractiveDonutChart({
  slices,
  centerValue,
  centerLabel,
  isDarkMode,
  size = 156,
  strokeWidth = 20,
}: {
  slices: DonutSlice[]
  centerValue: string
  centerLabel: string
  isDarkMode: boolean
  size?: number
  strokeWidth?: number
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const total = slices.reduce((sum, s) => sum + s.value, 0)
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const center = size / 2

  let cumulative = 0

  return (
    <div className="flex flex-col sm:flex-row items-center gap-5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          {/* Base Ring */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke={isDarkMode ? "#1e2230" : "#EFECE6"}
            strokeWidth={strokeWidth}
          />
          {total > 0 &&
            slices.map((slice, idx) => {
              if (slice.value <= 0) return null
              const fraction = slice.value / total
              const dashLength = fraction * circumference
              const dashOffset = -cumulative * circumference
              cumulative += fraction
              const isHovered = hoveredIdx === idx

              return (
                <circle
                  key={slice.label}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="transparent"
                  stroke={slice.color}
                  strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                  strokeDasharray={`${Math.max(dashLength - 2, 1)} ${circumference}`}
                  strokeDashoffset={dashOffset}
                  strokeLinecap="butt"
                  className="transition-all duration-300 cursor-pointer"
                  style={{
                    opacity: hoveredIdx !== null && !isHovered ? 0.4 : 1,
                  }}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                />
              )
            })}
        </svg>

        {/* Center Readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-2">
          <span className={`text-xl font-bold leading-tight ${isDarkMode ? "text-white" : "text-[#20252B]"}`}>
            {hoveredIdx !== null && slices[hoveredIdx] ? slices[hoveredIdx].value : centerValue}
          </span>
          <span className="text-[10px] font-medium text-[#64748B] leading-tight mt-0.5 truncate max-w-[92px]">
            {hoveredIdx !== null && slices[hoveredIdx] ? slices[hoveredIdx].label : centerLabel}
          </span>
        </div>
      </div>

      {/* Interactive Legend */}
      <div className="flex-1 w-full space-y-2">
        {slices.map((slice, idx) => {
          const pct = total > 0 ? Math.round((slice.value / total) * 100) : 0
          const isHovered = hoveredIdx === idx
          return (
            <div
              key={slice.label}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className={`flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                isHovered
                  ? isDarkMode
                    ? "bg-[#1e2230]"
                    : "bg-[#F7F5F0]"
                  : ""
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: slice.color }}
                />
                <span className={`truncate font-medium ${isDarkMode ? "text-slate-200" : "text-[#20252B]"}`}>
                  {slice.label}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                {slice.subLabel && <span className="text-[10px] text-[#64748B]">{slice.subLabel}</span>}
                <span className={`font-bold ${isDarkMode ? "text-white" : "text-[#20252B]"}`}>{slice.value}</span>
                <span className="text-[10px] text-[#64748B] w-8 text-right">{pct}%</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function AdminDashboard({
  isDarkMode,
  orders,
  tables,
  reservations,
  waitlist,
  customersList,
  inventoryItems,
  stockMovements,
  menuCatalog,
  teamMembers,
  serviceRequests,
  kdsTickets,
  onNavigateTab,
  onRestockItem,
  onBookCustomerTable,
  onRefreshAll,
}: AdminDashboardProps) {
  const [focusView, setFocusView] = useState<"all" | "sales" | "inventory" | "customers">("all")
  const [timeRange, setTimeRange] = useState<"today" | "7d" | "all">("all")
  const [mixMode, setMixMode] = useState<"source" | "payment">("source")
  const [hoveredTrendIdx, setHoveredTrendIdx] = useState<number | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastSyncedAt, setLastSyncedAt] = useState<string>("")

  useEffect(() => {
    setLastSyncedAt(
      new Date().toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    )
  }, [orders, inventoryItems, tables, reservations, serviceRequests])

  const handleManualSync = async () => {
    setIsRefreshing(true)
    try {
      await onRefreshAll()
    } finally {
      setTimeout(() => setIsRefreshing(false), 450)
    }
  }

  // --- 1. LIVE ORDERS & REVENUE COMPUTATION ---
  const filteredOrders = useMemo(() => {
    if (timeRange === "all") return orders
    const now = Date.now()
    const todayStr = new Date().toISOString().slice(0, 10)
    return orders.filter((o) => {
      if (!o.created_at) return false
      if (timeRange === "today") {
        return o.created_at.slice(0, 10) === todayStr
      }
      const ageMs = now - new Date(o.created_at).getTime()
      return ageMs <= 7 * 24 * 60 * 60 * 1000
    })
  }, [orders, timeRange])

  const orderStats = useMemo(() => {
    const totalRevenue = filteredOrders.reduce((s, o) => s + Number(o.total_amount || 0), 0)
    const paidRevenue = filteredOrders
      .filter((o) => String(o.payment_status || "").toUpperCase() === "PAID")
      .reduce((s, o) => s + Number(o.total_amount || 0), 0)
    const pendingRevenue = Math.max(0, totalRevenue - paidRevenue)
    const orderCount = filteredOrders.length
    const avgTicket = orderCount > 0 ? totalRevenue / orderCount : 0
    const activeOrders = orders.filter((o) => String(o.status || "").toUpperCase() !== "CLOSED").length
    const totalItemsSold = filteredOrders.reduce(
      (s, o) => s + (o.order_items?.reduce((acc, it) => acc + Number(it.quantity || 1), 0) || 0),
      0
    )

    // Channel breakdown
    let qrCount = 0
    let posCount = 0
    let deliveryCount = 0
    let paidCount = 0
    let pendingCount = 0
    let unpaidCount = 0

    for (const o of filteredOrders) {
      const src = String(o.source || "").toUpperCase()
      const typ = String(o.order_type || "").toLowerCase()
      if (typ === "delivery") deliveryCount++
      else if (src.includes("QR")) qrCount++
      else posCount++

      const ps = String(o.payment_status || "").toUpperCase()
      if (ps === "PAID") paidCount++
      else if (ps === "PENDING") pendingCount++
      else unpaidCount++
    }

    return {
      totalRevenue,
      paidRevenue,
      pendingRevenue,
      orderCount,
      avgTicket,
      activeOrders,
      totalItemsSold,
      qrCount,
      posCount,
      deliveryCount,
      paidCount,
      pendingCount,
      unpaidCount,
    }
  }, [filteredOrders, orders])

  // Trend series for Interactive SVG Area + Bar Chart
  const trendSeries = useMemo(() => {
    if (timeRange === "today") {
      // Group by 3-hour blocks across the day (09:00 .. 24:00)
      const buckets = [
        { label: "09–12h", start: 9, end: 12 },
        { label: "12–15h", start: 12, end: 15 },
        { label: "15–18h", start: 15, end: 18 },
        { label: "18–21h", start: 18, end: 21 },
        { label: "21–24h", start: 21, end: 24 },
      ].map((b) => ({ ...b, revenue: 0, count: 0, paid: 0 }))

      for (const o of filteredOrders) {
        const dt = new Date(o.created_at)
        const hr = isNaN(dt.getTime()) ? 12 : dt.getHours()
        const bucket = buckets.find((b) => hr >= b.start && hr < b.end) || buckets[0]
        bucket.revenue += Number(o.total_amount || 0)
        bucket.count += 1
        if (String(o.payment_status || "").toUpperCase() === "PAID") {
          bucket.paid += Number(o.total_amount || 0)
        }
      }
      return buckets
    }

    // Group by calendar date chronologically
    const map = new Map<string, { key: string; label: string; revenue: number; count: number; paid: number }>()
    for (const o of filteredOrders) {
      const dateStr = (o.created_at || "").slice(0, 10)
      if (!dateStr) continue
      const dObj = new Date(dateStr + "T00:00:00")
      const niceLabel = isNaN(dObj.getTime())
        ? dateStr
        : dObj.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })

      const prev = map.get(dateStr) || { key: dateStr, label: niceLabel, revenue: 0, count: 0, paid: 0 }
      prev.revenue += Number(o.total_amount || 0)
      prev.count += 1
      if (String(o.payment_status || "").toUpperCase() === "PAID") {
        prev.paid += Number(o.total_amount || 0)
      }
      map.set(dateStr, prev)
    }

    const sorted = Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key))
    if (sorted.length === 0) {
      return [{ label: "Today", revenue: 0, count: 0, paid: 0 }]
    }
    return sorted
  }, [filteredOrders, timeRange])

  // Top Selling Dishes computed from live orders
  const topDishes = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; revenue: number; station: string }>()
    for (const o of filteredOrders) {
      for (const it of o.order_items || []) {
        const name = it.MenuItem?.name || it.name || "Menu Item"
        const qty = Number(it.quantity || 1)
        const menuMatch = menuCatalog.find((m) => m.name.toLowerCase() === name.toLowerCase())
        const unitPrice = Number(it.unit_price || 0) > 0 ? Number(it.unit_price) : menuMatch?.price || 0
        const prev = map.get(name) || {
          name,
          qty: 0,
          revenue: 0,
          station: it.station || menuMatch?.station || "kitchen",
        }
        prev.qty += qty
        prev.revenue += qty * unitPrice
        map.set(name, prev)
      }
    }
    return Array.from(map.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 6)
  }, [filteredOrders, menuCatalog])

  // --- 2. LIVE INVENTORY ANALYTICS ---
  const inventoryStats = useMemo(() => {
    let totalValue = 0
    let healthyCount = 0
    let lowCount = 0
    let outCount = 0
    let expiredCount = 0

    const catMap = new Map<
      string,
      { category: string; value: number; count: number; alerts: number; fillPctSum: number }
    >()

    const alertItems: Array<InventoryItem & { alertType: "EXPIRED" | "OUT" | "LOW" }> = []

    for (const item of inventoryItems) {
      const val = item.currentStock * item.costPerUnit
      totalValue += val

      const expired = isItemExpired(item.expiryDate)
      const out = item.currentStock <= 0
      const low = !expired && !out && item.currentStock <= item.minimumStock

      if (expired) {
        expiredCount++
        alertItems.push({ ...item, alertType: "EXPIRED" })
      } else if (out) {
        outCount++
        alertItems.push({ ...item, alertType: "OUT" })
      } else if (low) {
        lowCount++
        alertItems.push({ ...item, alertType: "LOW" })
      } else {
        healthyCount++
      }

      const ratio = item.optimalStock > 0 ? Math.min(100, (item.currentStock / item.optimalStock) * 100) : 100
      const cEntry = catMap.get(item.category) || {
        category: item.category,
        value: 0,
        count: 0,
        alerts: 0,
        fillPctSum: 0,
      }
      cEntry.value += val
      cEntry.count += 1
      cEntry.fillPctSum += ratio
      if (expired || out || low) cEntry.alerts += 1
      catMap.set(item.category, cEntry)
    }

    const categories = Array.from(catMap.values())
      .map((c) => ({
        ...c,
        avgFillPct: c.count > 0 ? Math.round(c.fillPctSum / c.count) : 0,
      }))
      .sort((a, b) => b.value - a.value)

    const healthPct =
      inventoryItems.length > 0 ? Math.round((healthyCount / inventoryItems.length) * 100) : 100

    // Stock movement counts
    const movBreakdown = {
      RESTOCK: stockMovements.filter((m) => m.type === "RESTOCK").length,
      USAGE: stockMovements.filter((m) => m.type === "USAGE").length,
      WASTE: stockMovements.filter((m) => m.type === "WASTE").length,
      AUDIT: stockMovements.filter((m) => m.type === "AUDIT").length,
    }

    // Sort alert items by severity: EXPIRED -> OUT -> LOW
    const rank = { EXPIRED: 0, OUT: 1, LOW: 2 }
    alertItems.sort((a, b) => rank[a.alertType] - rank[b.alertType])

    return {
      totalValue,
      healthyCount,
      lowCount,
      outCount,
      expiredCount,
      totalAlerts: lowCount + outCount + expiredCount,
      healthPct,
      categories,
      alertItems,
      movBreakdown,
    }
  }, [inventoryItems, stockMovements])

  // --- 3. LIVE CUSTOMERS, GUESTS & RESERVATIONS ---
  const customerStats = useMemo(() => {
    // Combine CRM directory + live guests found from active orders/reservations
    const parsedCustomers = customersList.map((c) => ({
      ...c,
      spendNum: parseINR(c.totalSpend),
    }))

    // Extract QR / Walk-in guest names from order notes if any ("Guest: Rahul")
    const liveOrderGuests: Array<{ name: string; table: string; amount: number; status: string; time: string }> = []
    for (const o of orders.slice(0, 20)) {
      const match = o.notes?.match(/Guest:\s*([^|\n]+)/i)
      if (match || o.table_id) {
        liveOrderGuests.push({
          name: match ? match[1].trim() : `Diner (${o.table_id || o.order_type})`,
          table: o.table_id || o.order_type,
          amount: Number(o.total_amount || 0),
          status: o.status,
          time: o.created_at,
        })
      }
    }

    const tierMap = {
      "VIP Platinum": { count: 0, spend: 0, color: "#C46B4E" },
      "VIP Gold": { count: 0, spend: 0, color: "#F59E0B" },
      Gold: { count: 0, spend: 0, color: "#8B5CF6" },
      Silver: { count: 0, spend: 0, color: "#3B82F6" },
    }

    let totalSpend = 0
    let totalVisits = 0
    for (const c of parsedCustomers) {
      totalSpend += c.spendNum
      totalVisits += c.visits
      if (c.loyalty.includes("Platinum")) {
        tierMap["VIP Platinum"].count++
        tierMap["VIP Platinum"].spend += c.spendNum
      } else if (c.loyalty.includes("VIP Gold")) {
        tierMap["VIP Gold"].count++
        tierMap["VIP Gold"].spend += c.spendNum
      } else if (c.loyalty.includes("Gold")) {
        tierMap.Gold.count++
        tierMap.Gold.spend += c.spendNum
      } else {
        tierMap.Silver.count++
        tierMap.Silver.spend += c.spendNum
      }
    }

    const topSpenders = [...parsedCustomers].sort((a, b) => b.spendNum - a.spendNum)

    // Reservations breakdown
    const resCounts = {
      Confirmed: reservations.filter((r) => r.status === "Confirmed").length,
      Arrived: reservations.filter((r) => r.status === "Arrived").length,
      Seated: reservations.filter((r) => r.status === "Seated").length,
      Completed: reservations.filter((r) => r.status === "Completed").length,
      Cancelled: reservations.filter((r) => r.status === "Cancelled").length,
    }
    const activeCovers = reservations
      .filter((r) => ["Confirmed", "Arrived", "Seated"].includes(r.status))
      .reduce((s, r) => s + Number(r.guests || 0), 0)
    const waitlistCovers = waitlist.reduce((s, w) => s + Number(w.guests || 0), 0)

    return {
      totalCustomers: parsedCustomers.length,
      totalSpend,
      totalVisits,
      avgSpendPerCustomer: parsedCustomers.length > 0 ? totalSpend / parsedCustomers.length : 0,
      tierSlices: Object.entries(tierMap).map(([label, d]) => ({
        label,
        value: d.count,
        color: d.color,
        subLabel: formatINR(d.spend),
      })),
      topSpenders,
      resCounts,
      activeCovers,
      waitlistCovers,
      liveOrderGuests,
    }
  }, [customersList, orders, reservations, waitlist])

  // --- 4. LIVE TABLES, KDS, MENU & TEAM ---
  const opsStats = useMemo(() => {
    const totalTables = tables.length
    const occupiedTables = tables.filter((t) => t.status === "occupied").length
    const reservedTables = tables.filter((t) => t.status === "reserved").length
    const cleaningTables = tables.filter((t) => t.status === "cleaning").length
    const availableTables = tables.filter((t) => t.status === "available").length
    const totalSeats = tables.reduce((s, t) => s + Number(t.seats || 0), 0)
    const occupiedSeats = tables
      .filter((t) => t.status === "occupied" || t.status === "reserved")
      .reduce((s, t) => s + Number(t.seats || 0), 0)
    const occupancyPct = totalTables > 0 ? Math.round(((occupiedTables + reservedTables) / totalTables) * 100) : 0

    const pendingServiceCalls = serviceRequests.filter((r) => r.status === "pending")
    const kitchenTickets = kdsTickets.filter((t) => t.station === "kitchen")
    const barTickets = kdsTickets.filter((t) => t.station === "bar")

    const activeStaff = teamMembers.filter((m) => m.status === "active").length
    const inStockMenu = menuCatalog.filter((m) => m.isAvailable !== false).length

    return {
      totalTables,
      occupiedTables,
      reservedTables,
      cleaningTables,
      availableTables,
      totalSeats,
      occupiedSeats,
      occupancyPct,
      pendingServiceCalls,
      kitchenTickets,
      barTickets,
      activeStaff,
      inStockMenu,
    }
  }, [tables, serviceRequests, kdsTickets, teamMembers, menuCatalog])

  // --- 5. UNIFIED LIVE TELEMETRY FEED ---
  const liveFeed = useMemo(() => {
    const events: Array<{
      id: string
      kind: "order" | "inventory" | "service" | "reservation"
      title: string
      detail: string
      timeLabel: string
      sortMs: number
      badge: string
      badgeClass: string
    }> = []

    for (const o of orders.slice(0, 6)) {
      events.push({
        id: `ev_ord_${o.id}`,
        kind: "order",
        title: `${o.order_number} · ${o.table_id || o.order_type}`,
        detail: `${o.order_items?.length || 0} item(s) · ${formatINR(Number(o.total_amount || 0), 0)}`,
        timeLabel: timeAgoShort(o.created_at),
        sortMs: new Date(o.created_at || 0).getTime() || 0,
        badge: o.source?.toUpperCase().includes("QR") ? "QR Order" : "POS Order",
        badgeClass: "bg-[#C46B4E]/15 text-[#C46B4E] border-[#C46B4E]/30",
      })
    }

    for (const m of stockMovements.slice(0, 6)) {
      events.push({
        id: `ev_mov_${m.id}`,
        kind: "inventory",
        title: `${m.type}: ${m.itemName}`,
        detail: `${m.type === "RESTOCK" ? "+" : m.type === "AUDIT" ? "=" : "-"}${m.quantity} ${m.unit} → ${m.newStock} ${m.unit}`,
        timeLabel: timeAgoShort(m.date),
        sortMs: new Date(m.date || 0).getTime() || 0,
        badge: m.type,
        badgeClass:
          m.type === "RESTOCK"
            ? "bg-blue-500/15 text-blue-500 border-blue-500/30"
            : m.type === "WASTE"
            ? "bg-red-500/15 text-red-500 border-red-500/30"
            : "bg-amber-500/15 text-amber-500 border-amber-500/30",
      })
    }

    for (const sr of serviceRequests.filter((s) => s.status === "pending").slice(0, 4)) {
      events.push({
        id: `ev_srv_${sr.id}`,
        kind: "service",
        title: `${sr.table}: ${sr.title}`,
        detail: "Pending floor service response",
        timeLabel: timeAgoShort(sr.createdAt),
        sortMs: new Date(sr.createdAt || 0).getTime() || Date.now(),
        badge: "Alert",
        badgeClass: "bg-rose-500/15 text-rose-500 border-rose-500/30",
      })
    }

    return events.sort((a, b) => b.sortMs - a.sortMs).slice(0, 10)
  }, [orders, stockMovements, serviceRequests])

  // --- SVG REVENUE + ORDER BAR CHART GEOMETRY ---
  const chartGeom = useMemo(() => {
    const W = 640
    const H = 200
    const padL = 46
    const padR = 16
    const padT = 18
    const padB = 28
    const plotW = W - padL - padR
    const plotH = H - padT - padB

    const maxRev = Math.max(500, ...trendSeries.map((d) => d.revenue)) * 1.15
    const maxCnt = Math.max(1, ...trendSeries.map((d) => d.count))

    const n = trendSeries.length
    const points = trendSeries.map((d, i) => {
      const x = n === 1 ? padL + plotW / 2 : padL + (i / (n - 1)) * plotW
      const y = padT + plotH - (d.revenue / maxRev) * plotH
      const barH = (d.count / maxCnt) * (plotH * 0.45)
      return {
        ...d,
        x,
        y,
        barH,
        barY: padT + plotH - barH,
      }
    })

    // Smooth SVG path
    let linePath = ""
    let areaPath = ""
    if (points.length === 1) {
      linePath = `M ${padL} ${points[0].y} L ${padL + plotW} ${points[0].y}`
      areaPath = `${linePath} L ${padL + plotW} ${padT + plotH} L ${padL} ${padT + plotH} Z`
    } else if (points.length > 1) {
      linePath = points
        .map((p, idx) => {
          if (idx === 0) return `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}`
          const prev = points[idx - 1]
          const cx = ((prev.x + p.x) / 2).toFixed(1)
          return `C ${cx} ${prev.y.toFixed(1)}, ${cx} ${p.y.toFixed(1)}, ${p.x.toFixed(1)} ${p.y.toFixed(1)}`
        })
        .join(" ")
      const first = points[0]
      const last = points[points.length - 1]
      areaPath = `${linePath} L ${last.x.toFixed(1)} ${(padT + plotH).toFixed(1)} L ${first.x.toFixed(1)} ${(padT + plotH).toFixed(1)} Z`
    }

    const yTicks = [0, 0.25, 0.5, 0.75, 1].map((frac) => ({
      y: padT + plotH - frac * plotH,
      label: formatINR(Math.round(frac * maxRev)),
    }))

    return { W, H, padL, padR, padT, padB, plotW, plotH, points, linePath, areaPath, yTicks }
  }, [trendSeries])

  const cardSurface = isDarkMode
    ? "bg-[#14161f] border-[#202330]"
    : "bg-white border-[#E5E1D9] shadow-2xs"
  const subSurface = isDarkMode ? "bg-[#191c27] border-[#252938]" : "bg-[#F7F5F0] border-[#E5E1D9]"
  const headingText = isDarkMode ? "text-white" : "text-[#20252B]"
  const mutedText = isDarkMode ? "text-slate-400" : "text-[#64748B]"

  const showSales = focusView === "all" || focusView === "sales"
  const showInventory = focusView === "all" || focusView === "inventory"
  const showCustomers = focusView === "all" || focusView === "customers"

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto pb-8">
      {/* Header & Live Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className={`text-2xl lg:text-3xl font-bold tracking-tight ${headingText}`}>
              Live Operations Dashboard
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-500/15 text-blue-500 border border-blue-500/30">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              LIVE SYNC
            </span>
            {lastSyncedAt && (
              <span className={`text-[11px] font-medium ${mutedText}`}>
                Updated {lastSyncedAt}
              </span>
            )}
          </div>
          <p className={`text-xs sm:text-sm mt-1 ${mutedText}`}>
            Real-time analytics across revenue, raw material inventory, live customer activity, floor tables & kitchen stations.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Focus View Switcher */}
          <div
            className={`inline-flex p-1 rounded-xl border ${
              isDarkMode ? "bg-[#14161f] border-[#242838]" : "bg-white border-[#E5E1D9]"
            }`}
          >
            {(
              [
                { id: "all", label: "All Live" },
                { id: "sales", label: "Sales & KDS" },
                { id: "inventory", label: "Inventory" },
                { id: "customers", label: "Customers & Floor" },
              ] as const
            ).map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setFocusView(v.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  focusView === v.id
                    ? "bg-[#C46B4E] text-white shadow-2xs"
                    : isDarkMode
                    ? "text-slate-400 hover:text-white"
                    : "text-[#64748B] hover:text-[#20252B]"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          {/* Time Range Selector */}
          <div
            className={`inline-flex p-1 rounded-xl border ${
              isDarkMode ? "bg-[#14161f] border-[#242838]" : "bg-white border-[#E5E1D9]"
            }`}
          >
            {(
              [
                { id: "today", label: "Today" },
                { id: "7d", label: "7 Days" },
                { id: "all", label: "All Time" },
              ] as const
            ).map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setTimeRange(r.id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  timeRange === r.id
                    ? isDarkMode
                      ? "bg-[#252938] text-white"
                      : "bg-[#E9E3D8] text-[#20252B]"
                    : isDarkMode
                    ? "text-slate-400 hover:text-white"
                    : "text-[#64748B] hover:text-[#20252B]"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Manual Refresh Button */}
          <button
            type="button"
            onClick={handleManualSync}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
              isDarkMode
                ? "bg-[#14161f] border-[#242838] text-slate-200 hover:bg-[#1e2230]"
                : "bg-white border-[#E5E1D9] text-[#20252B] hover:bg-[#F7F5F0]"
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#C46B4E] ${isRefreshing ? "animate-spin" : ""}`} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* TOP KPI STRIP (6 Live Cards) */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {/* KPI 1: Revenue */}
        <button
          type="button"
          onClick={() => onNavigateTab("orders")}
          className={`text-left p-4 rounded-2xl border transition hover:border-[#C46B4E]/50 cursor-pointer ${cardSurface}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">Revenue</span>
            <div className="w-7 h-7 rounded-lg bg-[#C46B4E]/15 text-[#C46B4E] flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-xl font-bold mt-2 ${headingText}`}>
            {formatINR(orderStats.totalRevenue)}
          </div>
          <div className="text-[11px] text-blue-500 font-medium mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>Avg {formatINR(orderStats.avgTicket)} / order</span>
          </div>
        </button>

        {/* KPI 2: Orders & Active KDS */}
        <button
          type="button"
          onClick={() => onNavigateTab("kds")}
          className={`text-left p-4 rounded-2xl border transition hover:border-[#C46B4E]/50 cursor-pointer ${cardSurface}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">Live Orders</span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/15 text-blue-500 flex items-center justify-center">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-xl font-bold mt-2 ${headingText}`}>
            {orderStats.orderCount}
            <span className="text-xs font-medium text-[#64748B] ml-1.5">orders</span>
          </div>
          <div className="text-[11px] text-blue-400 font-medium mt-1">
            {kdsTickets.length} KDS active · {orderStats.totalItemsSold} dishes
          </div>
        </button>

        {/* KPI 3: Inventory Holding & Alerts */}
        <button
          type="button"
          onClick={() => onNavigateTab("inventory")}
          className={`text-left p-4 rounded-2xl border transition hover:border-[#C46B4E]/50 cursor-pointer ${cardSurface}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">Inventory</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-xl font-bold mt-2 ${headingText}`}>
            {formatINR(inventoryStats.totalValue)}
          </div>
          <div
            className={`text-[11px] font-medium mt-1 ${
              inventoryStats.totalAlerts > 0 ? "text-amber-500" : "text-blue-500"
            }`}
          >
            {inventoryStats.totalAlerts > 0
              ? `${inventoryStats.totalAlerts} stock alert(s) · ${inventoryItems.length} SKUs`
              : `100% healthy (${inventoryItems.length} SKUs)`}
          </div>
        </button>

        {/* KPI 4: Customers & Active Covers */}
        <button
          type="button"
          onClick={() => onNavigateTab("customers")}
          className={`text-left p-4 rounded-2xl border transition hover:border-[#C46B4E]/50 cursor-pointer ${cardSurface}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">Customers</span>
            <div className="w-7 h-7 rounded-lg bg-purple-500/15 text-purple-500 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-xl font-bold mt-2 ${headingText}`}>
            {customerStats.totalCustomers}
            <span className="text-xs font-medium text-blue-500 ml-1.5">
              +{customerStats.activeCovers} covers
            </span>
          </div>
          <div className="text-[11px] text-purple-400 font-medium mt-1">
            LTV {formatINR(customerStats.totalSpend)} · {waitlist.length} waitlist
          </div>
        </button>

        {/* KPI 5: Floor Occupancy */}
        <button
          type="button"
          onClick={() => onNavigateTab("tables")}
          className={`text-left p-4 rounded-2xl border transition hover:border-[#C46B4E]/50 cursor-pointer ${cardSurface}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">Floor Tables</span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/15 text-blue-500 flex items-center justify-center">
              <LayoutGrid className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-xl font-bold mt-2 ${headingText}`}>
            {opsStats.occupiedTables + opsStats.reservedTables} / {opsStats.totalTables}
          </div>
          <div className="text-[11px] text-[#C46B4E] font-medium mt-1">
            {opsStats.occupancyPct}% occupied · {opsStats.pendingServiceCalls.length} bells
          </div>
        </button>

        {/* KPI 6: Staff & Menu Readiness */}
        <button
          type="button"
          onClick={() => onNavigateTab("team")}
          className={`text-left p-4 rounded-2xl border transition hover:border-[#C46B4E]/50 cursor-pointer ${cardSurface}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">Staff & Menu</span>
            <div className="w-7 h-7 rounded-lg bg-cyan-500/15 text-cyan-500 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-xl font-bold mt-2 ${headingText}`}>
            {opsStats.activeStaff} / {teamMembers.length}
            <span className="text-xs font-medium text-[#64748B] ml-1">on shift</span>
          </div>
          <div className="text-[11px] text-cyan-500 font-medium mt-1">
            {opsStats.inStockMenu}/{menuCatalog.length} dishes available
          </div>
        </button>
      </div>

      {/* SECTION 1: REVENUE & ORDER CHANNEL GRAPHS */}
      {showSales && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Revenue & Order Volume Interactive Area + Bar Chart */}
          <div className={`lg:col-span-8 p-5 rounded-2xl border ${cardSurface}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h2 className={`text-sm font-bold flex items-center gap-2 ${headingText}`}>
                  <BarChart3 className="w-4 h-4 text-[#C46B4E]" />
                  <span>Revenue & Order Volume Trend</span>
                </h2>
                <p className={`text-xs mt-0.5 ${mutedText}`}>
                  Hover any point to inspect revenue (`₹`), order count, and paid collections
                </p>
              </div>
              <div className="flex items-center gap-4 text-[11px]">
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#C46B4E]" />
                  <span className={mutedText}>Revenue (₹)</span>
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="w-2.5 h-2.5 rounded-xs bg-blue-500/40 border border-blue-500/60" />
                  <span className={mutedText}>Order Count</span>
                </span>
              </div>
            </div>

            <div className="relative">
              <svg
                viewBox={`0 0 ${chartGeom.W} ${chartGeom.H}`}
                className="w-full h-auto overflow-visible select-none"
              >
                <defs>
                  <linearGradient id="revAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#C46B4E" stopOpacity="0.38" />
                    <stop offset="100%" stopColor="#C46B4E" stopOpacity="0.02" />
                  </linearGradient>
                </defs>

                {/* Horizontal Gridlines & Y Labels */}
                {chartGeom.yTicks.map((tick, idx) => (
                  <g key={idx}>
                    <line
                      x1={chartGeom.padL}
                      y1={tick.y}
                      x2={chartGeom.W - chartGeom.padR}
                      y2={tick.y}
                      stroke={isDarkMode ? "#232736" : "#EFECE6"}
                      strokeDasharray={idx === 0 ? undefined : "3 3"}
                      strokeWidth="1"
                    />
                    <text
                      x={chartGeom.padL - 8}
                      y={tick.y + 3}
                      textAnchor="end"
                      fill={isDarkMode ? "#64748B" : "#94A3B8"}
                      fontSize="9"
                      fontWeight="500"
                    >
                      {tick.label}
                    </text>
                  </g>
                ))}

                {/* Background Order Volume Bars */}
                {chartGeom.points.map((pt, idx) => (
                  <rect
                    key={`bar_${idx}`}
                    x={pt.x - 10}
                    y={pt.barY}
                    width={20}
                    height={Math.max(2, pt.barH)}
                    rx={4}
                    fill={hoveredTrendIdx === idx ? "rgba(59,130,246,0.55)" : "rgba(59,130,246,0.22)"}
                    className="transition-all duration-200"
                  />
                ))}

                {/* Revenue Area & Line */}
                {chartGeom.areaPath && <path d={chartGeom.areaPath} fill="url(#revAreaGrad)" />}
                {chartGeom.linePath && (
                  <path
                    d={chartGeom.linePath}
                    fill="none"
                    stroke="#C46B4E"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                )}

                {/* Vertical Hover Guide Line */}
                {hoveredTrendIdx !== null && chartGeom.points[hoveredTrendIdx] && (
                  <line
                    x1={chartGeom.points[hoveredTrendIdx].x}
                    y1={chartGeom.padT}
                    x2={chartGeom.points[hoveredTrendIdx].x}
                    y2={chartGeom.padT + chartGeom.plotH}
                    stroke="#C46B4E"
                    strokeDasharray="3 3"
                    strokeOpacity="0.6"
                  />
                )}

                {/* Data Nodes & X-axis Labels */}
                {chartGeom.points.map((pt, idx) => {
                  const isActive = hoveredTrendIdx === idx
                  return (
                    <g key={`pt_${idx}`}>
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isActive ? 5.5 : 3.5}
                        fill={isActive ? "#FFFFFF" : "#C46B4E"}
                        stroke="#C46B4E"
                        strokeWidth={isActive ? 2.5 : 1.5}
                        className="transition-all duration-150"
                      />
                      <text
                        x={pt.x}
                        y={chartGeom.H - 6}
                        textAnchor="middle"
                        fill={isActive ? "#C46B4E" : isDarkMode ? "#94A3B8" : "#64748B"}
                        fontSize="9.5"
                        fontWeight={isActive ? "700" : "500"}
                      >
                        {pt.label}
                      </text>
                      {/* Invisible wide hover target */}
                      <rect
                        x={pt.x - Math.max(18, chartGeom.plotW / Math.max(1, chartGeom.points.length * 2))}
                        y={chartGeom.padT}
                        width={Math.max(36, chartGeom.plotW / Math.max(1, chartGeom.points.length))}
                        height={chartGeom.plotH + 20}
                        fill="transparent"
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredTrendIdx(idx)}
                        onMouseLeave={() => setHoveredTrendIdx(null)}
                      />
                    </g>
                  )
                })}
              </svg>

              {/* Floating Interactive Tooltip */}
              {hoveredTrendIdx !== null && chartGeom.points[hoveredTrendIdx] && (
                <div
                  className={`mt-2 p-3 rounded-xl border flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in ${subSurface}`}
                >
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-[#C46B4E]" />
                    <span className={`font-bold ${headingText}`}>
                      {chartGeom.points[hoveredTrendIdx].label}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span>
                      Revenue:{" "}
                      <strong className="text-[#C46B4E]">
                        {formatINR(chartGeom.points[hoveredTrendIdx].revenue, 2)}
                      </strong>
                    </span>
                    <span>
                      Orders:{" "}
                      <strong className="text-blue-500">
                        {chartGeom.points[hoveredTrendIdx].count}
                      </strong>
                    </span>
                    <span>
                      Paid:{" "}
                      <strong className="text-blue-500">
                        {formatINR(chartGeom.points[hoveredTrendIdx].paid)}
                      </strong>
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Order Source & Payment Mix Donut Card */}
          <div className={`lg:col-span-4 p-5 rounded-2xl border flex flex-col justify-between ${cardSurface}`}>
            <div>
              <div className="flex items-center justify-between gap-2 mb-4">
                <h2 className={`text-sm font-bold flex items-center gap-2 ${headingText}`}>
                  <CreditCard className="w-4 h-4 text-[#C46B4E]" />
                  <span>Channel & Payment Mix</span>
                </h2>
                <div
                  className={`inline-flex p-0.5 rounded-lg border text-[10px] font-semibold ${
                    isDarkMode ? "bg-[#191c27] border-[#252938]" : "bg-[#F7F5F0] border-[#E5E1D9]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setMixMode("source")}
                    className={`px-2 py-1 rounded-md cursor-pointer transition ${
                      mixMode === "source" ? "bg-[#C46B4E] text-white" : mutedText
                    }`}
                  >
                    Source
                  </button>
                  <button
                    type="button"
                    onClick={() => setMixMode("payment")}
                    className={`px-2 py-1 rounded-md cursor-pointer transition ${
                      mixMode === "payment" ? "bg-[#C46B4E] text-white" : mutedText
                    }`}
                  >
                    Payments
                  </button>
                </div>
              </div>

              <InteractiveDonutChart
                isDarkMode={isDarkMode}
                centerValue={String(orderStats.orderCount)}
                centerLabel={mixMode === "source" ? "Total Orders" : "Bills Tracked"}
                slices={
                  mixMode === "source"
                    ? [
                        { label: "QR Self-Order", value: orderStats.qrCount, color: "#C46B4E" },
                        { label: "POS Counter", value: orderStats.posCount, color: "#3B82F6" },
                        { label: "Delivery", value: orderStats.deliveryCount, color: "#6366F1" },
                      ]
                    : [
                        {
                          label: "Paid",
                          value: orderStats.paidCount,
                          color: "#2563EB",
                          subLabel: formatINR(orderStats.paidRevenue),
                        },
                        {
                          label: "Pending",
                          value: orderStats.pendingCount,
                          color: "#F59E0B",
                        },
                        {
                          label: "Unpaid",
                          value: orderStats.unpaidCount,
                          color: "#EF4444",
                        },
                      ]
                }
              />
            </div>

            <div className={`mt-4 pt-3 border-t flex items-center justify-between text-xs ${isDarkMode ? "border-[#222636]" : "border-[#E5E1D9]"}`}>
              <span className={mutedText}>
                Collected: <strong className="text-blue-500">{formatINR(orderStats.paidRevenue)}</strong>
              </span>
              <span className={mutedText}>
                Pending: <strong className="text-amber-500">{formatINR(orderStats.pendingRevenue)}</strong>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: LIVE INVENTORY TRACKING & STOCK ANALYTICS */}
      {showInventory && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center">
                <Boxes className="w-4 h-4" />
              </div>
              <h2 className={`text-base font-bold ${headingText}`}>
                Live Inventory & Raw Material Tracking
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab("inventory")}
              className="text-xs font-semibold text-[#C46B4E] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Manage Full Inventory</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Inventory Stock Health Donut */}
            <div className={`lg:col-span-4 p-5 rounded-2xl border ${cardSurface}`}>
              <h3 className={`text-sm font-bold mb-1 ${headingText}`}>Stock Health Distribution</h3>
              <p className={`text-xs mb-4 ${mutedText}`}>
                Real-time safety thresholds across {inventoryItems.length} raw materials
              </p>

              <InteractiveDonutChart
                isDarkMode={isDarkMode}
                centerValue={`${inventoryStats.healthPct}%`}
                centerLabel="Healthy Stock"
                slices={[
                  { label: "Healthy", value: inventoryStats.healthyCount, color: "#2563EB" },
                  { label: "Low Stock", value: inventoryStats.lowCount, color: "#F59E0B" },
                  { label: "Out of Stock", value: inventoryStats.outCount, color: "#EF4444" },
                  { label: "Expired", value: inventoryStats.expiredCount, color: "#F43F5E" },
                ]}
              />

              {/* Movement Summary Mini Bar */}
              <div className={`mt-4 p-3 rounded-xl border ${subSurface}`}>
                <div className="flex items-center justify-between text-[11px] font-semibold mb-2">
                  <span className={mutedText}>Stock Movement Log ({stockMovements.length})</span>
                  <span className="text-blue-500">Live Synced</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5 text-center">
                  <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <div className="text-xs font-bold text-blue-500">{inventoryStats.movBreakdown.RESTOCK}</div>
                    <div className="text-[9px] text-[#64748B]">Restock</div>
                  </div>
                  <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <div className="text-xs font-bold text-blue-500">{inventoryStats.movBreakdown.USAGE}</div>
                    <div className="text-[9px] text-[#64748B]">Usage</div>
                  </div>
                  <div className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
                    <div className="text-xs font-bold text-red-500">{inventoryStats.movBreakdown.WASTE}</div>
                    <div className="text-[9px] text-[#64748B]">Waste</div>
                  </div>
                  <div className="p-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20">
                    <div className="text-xs font-bold text-purple-500">{inventoryStats.movBreakdown.AUDIT}</div>
                    <div className="text-[9px] text-[#64748B]">Audit</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Category Valuation & Fill Horizontal Bar Chart */}
            <div className={`lg:col-span-5 p-5 rounded-2xl border ${cardSurface}`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className={`text-sm font-bold ${headingText}`}>Category Valuation & Capacity Fill</h3>
                  <p className={`text-xs mt-0.5 ${mutedText}`}>
                    Total Value: <strong className="text-[#C46B4E]">{formatINR(inventoryStats.totalValue)}</strong>
                  </p>
                </div>
                <Package className="w-4 h-4 text-[#C46B4E]" />
              </div>

              <div className="space-y-3">
                {inventoryStats.categories.map((cat) => {
                  const maxVal = inventoryStats.categories[0]?.value || 1
                  const valPct = Math.max(6, Math.round((cat.value / maxVal) * 100))
                  return (
                    <div key={cat.category} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`font-semibold truncate ${headingText}`}>{cat.category}</span>
                          <span className="text-[10px] text-[#64748B]">({cat.count} SKUs)</span>
                          {cat.alerts > 0 && (
                            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30">
                              {cat.alerts} alert
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`font-bold ${headingText}`}>{formatINR(cat.value)}</span>
                          <span className="text-[10px] text-[#64748B] w-9 text-right">{cat.avgFillPct}% fill</span>
                        </div>
                      </div>
                      <div
                        className={`h-2.5 rounded-full overflow-hidden flex ${
                          isDarkMode ? "bg-[#1e2230]" : "bg-[#EFECE6]"
                        }`}
                      >
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#C46B4E] to-amber-500 transition-all duration-500"
                          style={{ width: `${valPct}%` }}
                          title={`${cat.category}: ${formatINR(cat.value)} (${cat.avgFillPct}% optimal fill)`}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Live Reorder & Expiry Alerts Queue */}
            <div className={`lg:col-span-3 p-5 rounded-2xl border flex flex-col ${cardSurface}`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className={`text-sm font-bold flex items-center gap-1.5 ${headingText}`}>
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span>Action Needed</span>
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/15 text-red-500">
                  {inventoryStats.alertItems.length}
                </span>
              </div>

              <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[300px] pr-1">
                {inventoryStats.alertItems.length === 0 ? (
                  <div className={`p-4 rounded-xl border text-center text-xs ${subSurface}`}>
                    <CheckCircle2 className="w-6 h-6 text-blue-500 mx-auto mb-1.5" />
                    All inventory batches are stocked above minimum thresholds.
                  </div>
                ) : (
                  inventoryStats.alertItems.map((item) => (
                    <div
                      key={item.id}
                      className={`p-3 rounded-xl border space-y-2 ${subSurface}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className={`text-xs font-bold truncate ${headingText}`}>{item.name}</div>
                          <div className="text-[10px] text-[#64748B]">
                            {item.currentStock} {item.unit} left · Min {item.minimumStock} {item.unit}
                          </div>
                        </div>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 ${
                            item.alertType === "EXPIRED"
                              ? "bg-rose-500/20 text-rose-400"
                              : item.alertType === "OUT"
                              ? "bg-red-500/20 text-red-400"
                              : "bg-amber-500/20 text-amber-400"
                          }`}
                        >
                          {item.alertType}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRestockItem(item)}
                        className="w-full py-1.5 rounded-lg bg-[#C46B4E]/15 hover:bg-[#C46B4E] text-[#C46B4E] hover:text-white text-[11px] font-semibold transition cursor-pointer"
                      >
                        Quick Restock / Adjust
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: LIVE CUSTOMERS, GUESTS & RESERVATIONS TRACKING */}
      {showCustomers && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-purple-500/15 text-purple-500 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <h2 className={`text-base font-bold ${headingText}`}>
                Live Customer Insights, Loyalty & Dining Pipeline
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab("customers")}
              className="text-xs font-semibold text-[#C46B4E] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Open Customer Directory</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Customer Loyalty Tiers Donut Chart */}
            <div className={`lg:col-span-4 p-5 rounded-2xl border ${cardSurface}`}>
              <h3 className={`text-sm font-bold mb-1 ${headingText}`}>Loyalty Tier Breakdown</h3>
              <p className={`text-xs mb-4 ${mutedText}`}>
                {customerStats.totalVisits} lifetime visits · Avg LTV{" "}
                <strong className="text-[#C46B4E]">{formatINR(customerStats.avgSpendPerCustomer)}</strong>
              </p>

              <InteractiveDonutChart
                isDarkMode={isDarkMode}
                centerValue={formatINR(customerStats.totalSpend)}
                centerLabel="Total CRM LTV"
                slices={customerStats.tierSlices}
              />

              <div className={`mt-4 pt-3 border-t flex items-center justify-between text-xs ${isDarkMode ? "border-[#222636]" : "border-[#E5E1D9]"}`}>
                <span className={mutedText}>Waitlist Queue</span>
                <span className="font-bold text-amber-500">
                  {waitlist.length} parties ({customerStats.waitlistCovers} guests)
                </span>
              </div>
            </div>

            {/* Top Customers Spend vs Visits Bar Chart */}
            <div className={`lg:col-span-4 p-5 rounded-2xl border ${cardSurface}`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className={`text-sm font-bold ${headingText}`}>Top Guests by Spend & Visits</h3>
                  <p className={`text-xs mt-0.5 ${mutedText}`}>High-value regulars & VIP seating preferences</p>
                </div>
                <Sparkles className="w-4 h-4 text-amber-500" />
              </div>

              <div className="space-y-3">
                {customerStats.topSpenders.map((c) => {
                  const maxSpend = customerStats.topSpenders[0]?.spendNum || 1
                  const pct = Math.max(10, Math.round((c.spendNum / maxSpend) * 100))
                  return (
                    <div key={c.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`font-bold truncate ${headingText}`}>{c.name}</span>
                          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-semibold bg-[#C46B4E]/15 text-[#C46B4E]">
                            {c.loyalty}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] text-[#64748B]">{c.visits} visits</span>
                          <span className={`font-bold ${headingText}`}>{formatINR(c.spendNum)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className={`flex-1 h-2 rounded-full overflow-hidden ${
                            isDarkMode ? "bg-[#1e2230]" : "bg-[#EFECE6]"
                          }`}
                        >
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-purple-500 to-[#C46B4E] transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => onBookCustomerTable({ name: c.name, phone: c.phone })}
                          className="text-[10px] font-semibold text-[#C46B4E] hover:underline shrink-0 cursor-pointer"
                        >
                          Book
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Live Reservations & Active Diners Tracker */}
            <div className={`lg:col-span-4 p-5 rounded-2xl border flex flex-col justify-between ${cardSurface}`}>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className={`text-sm font-bold flex items-center gap-1.5 ${headingText}`}>
                      <CalendarCheck className="w-4 h-4 text-blue-500" />
                      <span>Live Guest & Booking Flow</span>
                    </h3>
                    <p className={`text-xs mt-0.5 ${mutedText}`}>
                      {reservations.length} bookings · {customerStats.activeCovers} expected/seated covers
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigateTab("reservations")}
                    className="text-[11px] font-semibold text-[#C46B4E] hover:underline cursor-pointer"
                  >
                    Floor Book
                  </button>
                </div>

                {/* Reservation Stage Funnel Bars */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {(
                    [
                      { label: "Confirmed", count: customerStats.resCounts.Confirmed, cls: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
                      { label: "Arrived", count: customerStats.resCounts.Arrived, cls: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
                      { label: "Seated", count: customerStats.resCounts.Seated, cls: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
                      { label: "Done", count: customerStats.resCounts.Completed, cls: "text-slate-400 bg-slate-500/10 border-slate-500/20" },
                    ] as const
                  ).map((st) => (
                    <div key={st.label} className={`p-2 rounded-xl border text-center ${st.cls}`}>
                      <div className="text-base font-bold">{st.count}</div>
                      <div className="text-[10px] font-medium">{st.label}</div>
                    </div>
                  ))}
                </div>

                {/* Live Guest List */}
                <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                  {reservations.slice(0, 5).map((r) => (
                    <div
                      key={r.id}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs ${subSurface}`}
                    >
                      <div className="min-w-0">
                        <div className={`font-bold truncate ${headingText}`}>
                          {r.guestName} <span className="text-[10px] font-normal text-[#64748B]">({r.guests}p)</span>
                        </div>
                        <div className="text-[10px] text-[#64748B] truncate">
                          {r.table} · {r.time}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                          r.status === "Seated"
                            ? "bg-blue-500/15 text-blue-500"
                            : r.status === "Arrived"
                            ? "bg-amber-500/15 text-amber-500"
                            : "bg-blue-500/15 text-blue-400"
                        }`}
                      >
                        {r.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: TOP DISHES, LIVE FLOOR/KDS PIPELINE & TELEMETRY STREAM */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Top Selling Dishes Chart */}
        <div className={`lg:col-span-4 p-5 rounded-2xl border ${cardSurface}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className={`text-sm font-bold flex items-center gap-2 ${headingText}`}>
                <Flame className="w-4 h-4 text-[#C46B4E]" />
                <span>Top Selling Menu Items</span>
              </h3>
              <p className={`text-xs mt-0.5 ${mutedText}`}>Ranked by units ordered across all channels</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab("menu")}
              className="text-[11px] font-semibold text-[#C46B4E] hover:underline cursor-pointer"
            >
              Menu
            </button>
          </div>

          <div className="space-y-3">
            {topDishes.length === 0 ? (
              <p className={`text-xs ${mutedText}`}>No order item data yet.</p>
            ) : (
              topDishes.map((dish, idx) => {
                const maxQty = topDishes[0]?.qty || 1
                const pct = Math.max(10, Math.round((dish.qty / maxQty) * 100))
                return (
                  <div key={dish.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[10px] font-bold text-[#64748B] w-4">#{idx + 1}</span>
                        <span className={`font-semibold truncate ${headingText}`}>{dish.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`font-bold ${headingText}`}>{dish.qty}x</span>
                        {dish.revenue > 0 && (
                          <span className="text-[10px] text-[#64748B]">{formatINR(dish.revenue)}</span>
                        )}
                      </div>
                    </div>
                    <div className={`h-2 rounded-full overflow-hidden ${isDarkMode ? "bg-[#1e2230]" : "bg-[#EFECE6]"}`}>
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          dish.station === "bar" ? "bg-cyan-500" : "bg-[#C46B4E]"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Live Floor Status & KDS Pipeline */}
        <div className={`lg:col-span-4 p-5 rounded-2xl border space-y-4 ${cardSurface}`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className={`text-sm font-bold flex items-center gap-2 ${headingText}`}>
                <ChefHat className="w-4 h-4 text-amber-500" />
                <span>Floor & Kitchen Live Status</span>
              </h3>
              <p className={`text-xs mt-0.5 ${mutedText}`}>
                {opsStats.occupiedSeats}/{opsStats.totalSeats} seats in use · {opsStats.pendingServiceCalls.length} service bells
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab("tables")}
              className="text-[11px] font-semibold text-[#C46B4E] hover:underline cursor-pointer"
            >
              Floor Map
            </button>
          </div>

          {/* Mini Live Table Grid */}
          <div className="grid grid-cols-4 gap-2">
            {tables.map((t) => {
              const hasBell = opsStats.pendingServiceCalls.some((s) => s.tableNumber === t.id)
              const statusColor =
                t.status === "occupied"
                  ? "bg-[#C46B4E]/20 border-[#C46B4E]/50 text-[#C46B4E]"
                  : t.status === "reserved"
                  ? "bg-amber-500/15 border-amber-500/40 text-amber-400"
                  : t.status === "cleaning"
                  ? "bg-blue-500/15 border-blue-500/40 text-blue-400"
                  : t.status === "out_of_service"
                  ? "bg-red-500/15 border-red-500/40 text-red-400"
                  : isDarkMode
                  ? "bg-[#191c27] border-[#262a3b] text-blue-400"
                  : "bg-blue-50 border-blue-200 text-blue-700"

              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onNavigateTab("tables")}
                  className={`relative p-2 rounded-xl border text-center transition hover:scale-[1.02] cursor-pointer ${statusColor}`}
                >
                  {hasBell && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                  )}
                  <div className="text-[11px] font-bold">{t.name}</div>
                  <div className="text-[9px] capitalize opacity-85">{t.status}</div>
                </button>
              )
            })}
          </div>

          {/* KDS Stations Stage Bar */}
          <div className={`p-3 rounded-xl border space-y-2 ${subSurface}`}>
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className={headingText}>Kitchen & Bar Queue</span>
              <button
                type="button"
                onClick={() => onNavigateTab("kds")}
                className="text-[11px] text-[#C46B4E] hover:underline cursor-pointer"
              >
                Open KDS ({kdsTickets.length})
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                <span className="font-medium text-amber-500">Kitchen</span>
                <span className={`font-bold ${headingText}`}>{opsStats.kitchenTickets.length} active</span>
              </div>
              <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-between">
                <span className="font-medium text-cyan-500">Bar</span>
                <span className={`font-bold ${headingText}`}>{opsStats.barTickets.length} active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Telemetry Activity Stream */}
        <div className={`lg:col-span-4 p-5 rounded-2xl border flex flex-col ${cardSurface}`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className={`text-sm font-bold flex items-center gap-2 ${headingText}`}>
              <Activity className="w-4 h-4 text-blue-500" />
              <span>Real-Time Activity Feed</span>
            </h3>
            <span className="text-[10px] font-semibold text-blue-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              Streaming
            </span>
          </div>

          <div className="space-y-2 overflow-y-auto max-h-[290px] pr-1">
            {liveFeed.length === 0 ? (
              <p className={`text-xs ${mutedText}`}>Waiting for live events...</p>
            ) : (
              liveFeed.map((ev) => (
                <div
                  key={ev.id}
                  className={`p-2.5 rounded-xl border flex items-start justify-between gap-2 text-xs ${subSurface}`}
                >
                  <div className="min-w-0">
                    <div className={`font-semibold truncate ${headingText}`}>{ev.title}</div>
                    <div className="text-[11px] text-[#64748B] truncate mt-0.5">{ev.detail}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${ev.badgeClass}`}>
                      {ev.badge}
                    </span>
                    <span className="text-[10px] text-[#64748B]">{ev.timeLabel}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
