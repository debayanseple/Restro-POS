"use client"

import React, { useMemo, useState } from "react"
import * as XLSX from "xlsx"
import {
  Award,
  BarChart3,
  BellRing,
  Boxes,
  CheckCircle2,
  ChefHat,
  Clock,
  Crown,
  FileSpreadsheet,
  Flame,
  PackageCheck,
  Search,
  ShoppingBag,
  Sparkles,
  Timer,
  TrendingUp,
  Truck,
  Users,
  Utensils,
  X,
} from "lucide-react"
import { MenuItem } from "@/lib/menu-catalog"
import { InventoryItem } from "@/lib/inventory-catalog"
import { TeamMember } from "@/lib/team-catalog"
import {
  DashboardCustomer,
  DashboardOrder,
  DashboardReservation,
  DashboardServiceRequest,
  DashboardTable,
} from "@/components/AdminDashboard"

interface ReportsModuleProps {
  isDarkMode: boolean
  orders: DashboardOrder[]
  menuCatalog: MenuItem[]
  serviceRequests: DashboardServiceRequest[]
  tables: DashboardTable[]
  reservations: DashboardReservation[]
  customersList: DashboardCustomer[]
  inventoryItems: InventoryItem[]
  teamMembers: TeamMember[]
}

function formatINR(val: number, decimals = 2): string {
  const safe = isNaN(val) ? 0 : val
  return `₹${safe.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`
}

function formatDurationSeconds(totalSeconds: number): string {
  if (!isFinite(totalSeconds) || totalSeconds <= 0) return "—"
  const rounded = Math.round(totalSeconds)
  if (rounded < 60) return `${rounded}s`
  const mins = Math.floor(rounded / 60)
  const secs = rounded % 60
  if (mins < 60) return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
  const hrs = Math.floor(mins / 60)
  const remMins = mins % 60
  return `${hrs}h ${remMins}m`
}

interface ExtendedServiceRequest extends DashboardServiceRequest {
  clearedAt?: string
  clearedBy?: string
}

export function ReportsModule({
  isDarkMode,
  orders,
  menuCatalog,
  serviceRequests,
  tables,
  reservations,
  customersList,
  inventoryItems,
  teamMembers,
}: ReportsModuleProps) {
  const [reportTab, setReportTab] = useState<"overview" | "items" | "channels" | "sla">("overview")
  const [period, setPeriod] = useState<"today" | "7d" | "month" | "all">("all")
  const [itemSearch, setItemSearch] = useState("")
  const [itemCategory, setItemCategory] = useState("all")
  const [itemSortBy, setItemSortBy] = useState<"qty" | "revenue" | "dineIn" | "takeaway" | "delivery">("qty")
  const [includeUnsold, setIncludeUnsold] = useState(false)
  const [exportToast, setExportToast] = useState<string | null>(null)

  const matchesPeriod = (iso?: string) => {
    if (period === "all" || !iso) return true
    const datePart = iso.slice(0, 10)
    const todayStr = new Date().toISOString().slice(0, 10)
    if (period === "today") return datePart === todayStr
    if (period === "month") return datePart.slice(0, 7) === todayStr.slice(0, 7)
    const diff = Date.now() - new Date(iso).getTime()
    return !isNaN(diff) && diff <= 7 * 24 * 60 * 60 * 1000
  }

  const scopedOrders = useMemo(
    () => orders.filter((o) => matchesPeriod(o.created_at)),
    [orders, period]
  )

  const scopedServiceRequests = useMemo(
    () => (serviceRequests as ExtendedServiceRequest[]).filter((s) => matchesPeriod(s.createdAt)),
    [serviceRequests, period]
  )

  // --- 1. ORDER TYPE / CHANNEL BREAKDOWN (DINE-IN vs TAKEAWAY vs DELIVERY) ---
  const channelReport = useMemo(() => {
    const channels = {
      "dine-in": { key: "dine-in", label: "Dine-In", orders: 0, items: 0, revenue: 0, paid: 0, qr: 0, pos: 0 },
      takeaway: { key: "takeaway", label: "Takeaway", orders: 0, items: 0, revenue: 0, paid: 0, qr: 0, pos: 0 },
      delivery: { key: "delivery", label: "Delivery", orders: 0, items: 0, revenue: 0, paid: 0, qr: 0, pos: 0 },
    }

    let qrTotalOrders = 0
    let qrTotalRev = 0
    let posTotalOrders = 0
    let posTotalRev = 0

    for (const o of scopedOrders) {
      const rawType = String(o.order_type || "dine-in").toLowerCase().trim()
      const bucketKey: "dine-in" | "takeaway" | "delivery" =
        rawType === "takeaway" || rawType === "pickup"
          ? "takeaway"
          : rawType === "delivery"
          ? "delivery"
          : "dine-in"

      const amt = Number(o.total_amount || 0)
      const itemQty = o.order_items?.reduce((s, it) => s + Number(it.quantity || 1), 0) || 0
      const isQr = String(o.source || "").toUpperCase().includes("QR")

      channels[bucketKey].orders += 1
      channels[bucketKey].items += itemQty
      channels[bucketKey].revenue += amt
      if (String(o.payment_status || "").toUpperCase() === "PAID") {
        channels[bucketKey].paid += amt
      }
      if (isQr) {
        channels[bucketKey].qr += 1
        qrTotalOrders += 1
        qrTotalRev += amt
      } else {
        channels[bucketKey].pos += 1
        posTotalOrders += 1
        posTotalRev += amt
      }
    }

    const totalOrders = scopedOrders.length
    const totalRevenue = Object.values(channels).reduce((s, c) => s + c.revenue, 0)

    const list = Object.values(channels).map((c) => ({
      ...c,
      orderSharePct: totalOrders > 0 ? (c.orders / totalOrders) * 100 : 0,
      revenueSharePct: totalRevenue > 0 ? (c.revenue / totalRevenue) * 100 : 0,
      avgOrderValue: c.orders > 0 ? c.revenue / c.orders : 0,
    }))

    return {
      list,
      dineIn: list[0],
      takeaway: list[1],
      delivery: list[2],
      totalOrders,
      totalRevenue,
      qrTotalOrders,
      qrTotalRev,
      posTotalOrders,
      posTotalRev,
    }
  }, [scopedOrders])

  // --- 2. ITEM-WISE PERFORMANCE REPORT ---
  const itemWiseReport = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string
        category: string
        station: string
        isVeg: boolean
        totalQty: number
        dineInQty: number
        takeawayQty: number
        deliveryQty: number
        qrQty: number
        posQty: number
        revenue: number
        unitPrice: number
        ordersAppeared: number
      }
    >()

    // Seed with menu catalog if includeUnsold or for metadata enrichment
    const catalogLookup = new Map<string, MenuItem>()
    for (const m of menuCatalog) {
      catalogLookup.set(m.name.toLowerCase(), m)
      if (includeUnsold) {
        map.set(m.name.toLowerCase(), {
          name: m.name,
          category: m.category,
          station: m.station,
          isVeg: m.isVeg,
          totalQty: 0,
          dineInQty: 0,
          takeawayQty: 0,
          deliveryQty: 0,
          qrQty: 0,
          posQty: 0,
          revenue: 0,
          unitPrice: m.price,
          ordersAppeared: 0,
        })
      }
    }

    for (const o of scopedOrders) {
      const rawType = String(o.order_type || "dine-in").toLowerCase().trim()
      const isTakeaway = rawType === "takeaway" || rawType === "pickup"
      const isDelivery = rawType === "delivery"
      const isQr = String(o.source || "").toUpperCase().includes("QR")
      const seenInOrder = new Set<string>()

      for (const it of o.order_items || []) {
        const name = (it.MenuItem?.name || it.name || "Menu Item").trim()
        const key = name.toLowerCase()
        const meta = catalogLookup.get(key)
        const qty = Number(it.quantity || 1)
        const unitPrice = Number(it.unit_price || 0) > 0 ? Number(it.unit_price) : meta?.price || 0

        const entry = map.get(key) || {
          name: meta?.name || name,
          category: meta?.category || (it.station === "bar" ? "drinks" : "mains"),
          station: it.station || meta?.station || "kitchen",
          isVeg: meta?.isVeg ?? true,
          totalQty: 0,
          dineInQty: 0,
          takeawayQty: 0,
          deliveryQty: 0,
          qrQty: 0,
          posQty: 0,
          revenue: 0,
          unitPrice,
          ordersAppeared: 0,
        }

        entry.totalQty += qty
        if (isTakeaway) entry.takeawayQty += qty
        else if (isDelivery) entry.deliveryQty += qty
        else entry.dineInQty += qty

        if (isQr) entry.qrQty += qty
        else entry.posQty += qty

        entry.revenue += qty * unitPrice
        if (unitPrice > 0 && entry.unitPrice === 0) entry.unitPrice = unitPrice
        if (!seenInOrder.has(key)) {
          entry.ordersAppeared += 1
          seenInOrder.add(key)
        }
        map.set(key, entry)
      }
    }

    const allRows = Array.from(map.values())
    const totalUnitsSold = allRows.reduce((s, r) => s + r.totalQty, 0)
    const totalItemRevenue = allRows.reduce((s, r) => s + r.revenue, 0)

    const enriched = allRows.map((r) => ({
      ...r,
      qtySharePct: totalUnitsSold > 0 ? (r.totalQty / totalUnitsSold) * 100 : 0,
      revSharePct: totalItemRevenue > 0 ? (r.revenue / totalItemRevenue) * 100 : 0,
    }))

    const sortedByQty = [...enriched].sort((a, b) => b.totalQty - a.totalQty || b.revenue - a.revenue)
    const sortedByRev = [...enriched].sort((a, b) => b.revenue - a.revenue || b.totalQty - a.totalQty)

    return {
      rows: enriched,
      topByQty: sortedByQty[0] || null,
      topByRevenue: sortedByRev[0] || null,
      totalUnitsSold,
      totalItemRevenue,
      uniqueSoldCount: enriched.filter((r) => r.totalQty > 0).length,
    }
  }, [scopedOrders, menuCatalog, includeUnsold])

  const filteredItemRows = useMemo(() => {
    const q = itemSearch.trim().toLowerCase()
    const rows = itemWiseReport.rows.filter((r) => {
      const catOk = itemCategory === "all" || r.category === itemCategory
      const searchOk = !q || r.name.toLowerCase().includes(q) || r.category.toLowerCase().includes(q)
      return catOk && searchOk
    })
    rows.sort((a, b) => {
      if (itemSortBy === "revenue") return b.revenue - a.revenue
      if (itemSortBy === "dineIn") return b.dineInQty - a.dineInQty
      if (itemSortBy === "takeaway") return b.takeawayQty - a.takeawayQty
      if (itemSortBy === "delivery") return b.deliveryQty - a.deliveryQty
      return b.totalQty - a.totalQty || b.revenue - a.revenue
    })
    return rows
  }, [itemWiseReport.rows, itemSearch, itemCategory, itemSortBy])

  // --- 3. SERVICE TIME & SLA METRICS ---
  const serviceTimeReport = useMemo(() => {
    // A. Order-to-Delivery / Order Completion Turnaround (created_at -> updated_at)
    const orderLogs: Array<{
      orderNumber: string
      orderType: string
      table: string
      source: string
      status: string
      createdAt: string
      completedAt: string
      durationSeconds: number
      totalAmount: number
    }> = []

    const byTypeSec: Record<string, number[]> = {
      "dine-in": [],
      takeaway: [],
      delivery: [],
    }

    const buckets = {
      under5: 0,
      from5to15: 0,
      from15to30: 0,
      over30: 0,
    }

    for (const o of scopedOrders) {
      if (!o.created_at || !o.updated_at) continue
      const diffSec = (new Date(o.updated_at).getTime() - new Date(o.created_at).getTime()) / 1000
      // Valid turnaround (positive & <= 4 hours)
      if (isNaN(diffSec) || diffSec <= 1 || diffSec > 4 * 3600) continue

      const rawType = String(o.order_type || "dine-in").toLowerCase()
      const tKey = rawType === "takeaway" ? "takeaway" : rawType === "delivery" ? "delivery" : "dine-in"
      byTypeSec[tKey].push(diffSec)

      const mins = diffSec / 60
      if (mins < 5) buckets.under5++
      else if (mins < 15) buckets.from5to15++
      else if (mins < 30) buckets.from15to30++
      else buckets.over30++

      orderLogs.push({
        orderNumber: o.order_number,
        orderType: tKey,
        table: o.table_id || o.order_type,
        source: o.source,
        status: o.status,
        createdAt: o.created_at,
        completedAt: o.updated_at,
        durationSeconds: diffSec,
        totalAmount: Number(o.total_amount || 0),
      })
    }

    const allOrderSecs = orderLogs.map((l) => l.durationSeconds)
    const avgOrderSec = allOrderSecs.length > 0 ? allOrderSecs.reduce((s, v) => s + v, 0) / allOrderSecs.length : 0
    const minOrderSec = allOrderSecs.length > 0 ? Math.min(...allOrderSecs) : 0
    const maxOrderSec = allOrderSecs.length > 0 ? Math.max(...allOrderSecs) : 0

    const avgByChannel = {
      dineIn: byTypeSec["dine-in"].length
        ? byTypeSec["dine-in"].reduce((s, v) => s + v, 0) / byTypeSec["dine-in"].length
        : 0,
      takeaway: byTypeSec.takeaway.length
        ? byTypeSec.takeaway.reduce((s, v) => s + v, 0) / byTypeSec.takeaway.length
        : 0,
      delivery: byTypeSec.delivery.length
        ? byTypeSec.delivery.reduce((s, v) => s + v, 0) / byTypeSec.delivery.length
        : 0,
    }

    // B. Table Service Call Response Times (Waiter Call, Clean Table, Bill Request)
    const serviceLogs: Array<{
      id: string
      table: string
      type: "waiter" | "clean" | "bill"
      title: string
      status: string
      createdAt: string
      clearedAt?: string
      clearedBy?: string
      responseSeconds: number
    }> = []

    const byReqType: Record<"waiter" | "clean" | "bill", number[]> = {
      waiter: [],
      clean: [],
      bill: [],
    }
    let pendingRequestsCount = 0

    for (const sr of scopedServiceRequests) {
      if (sr.status === "pending") {
        pendingRequestsCount++
        continue
      }
      if (!sr.createdAt || !sr.clearedAt) continue
      const respSec = (new Date(sr.clearedAt).getTime() - new Date(sr.createdAt).getTime()) / 1000
      if (isNaN(respSec) || respSec < 0 || respSec > 4 * 3600) continue

      byReqType[sr.type]?.push(respSec)
      serviceLogs.push({
        id: sr.id,
        table: sr.table,
        type: sr.type,
        title: sr.title,
        status: sr.status,
        createdAt: sr.createdAt,
        clearedAt: sr.clearedAt,
        clearedBy: sr.clearedBy || "Front Desk",
        responseSeconds: respSec,
      })
    }

    const avgWaiterSec = byReqType.waiter.length
      ? byReqType.waiter.reduce((s, v) => s + v, 0) / byReqType.waiter.length
      : 0
    const avgCleanSec = byReqType.clean.length
      ? byReqType.clean.reduce((s, v) => s + v, 0) / byReqType.clean.length
      : 0
    const avgBillSec = byReqType.bill.length
      ? byReqType.bill.reduce((s, v) => s + v, 0) / byReqType.bill.length
      : 0

    const allServiceSecs = [...byReqType.waiter, ...byReqType.clean, ...byReqType.bill]
    const avgOverallServiceSec = allServiceSecs.length
      ? allServiceSecs.reduce((s, v) => s + v, 0) / allServiceSecs.length
      : 0

    return {
      orderLogs: orderLogs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
      avgOrderSec,
      minOrderSec,
      maxOrderSec,
      avgByChannel,
      buckets,
      serviceLogs: serviceLogs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
      avgWaiterSec,
      waiterCount: byReqType.waiter.length,
      avgCleanSec,
      cleanCount: byReqType.clean.length,
      avgBillSec,
      billCount: byReqType.bill.length,
      avgOverallServiceSec,
      resolvedServiceCount: allServiceSecs.length,
      pendingRequestsCount,
    }
  }, [scopedOrders, scopedServiceRequests])

  // --- 4. WHOLE RESTAURANT SUMMARY EXPORT TO EXCEL (.XLSX) ---
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new()

    // Sheet 1: Executive Summary
    const summaryData = [
      { Metric: "Restaurant Name", Value: "Nodedr Bistro (Downtown Main Outlet)" },
      { Metric: "Report Period", Value: period.toUpperCase() },
      { Metric: "Generated At", Value: new Date().toLocaleString("en-IN") },
      { Metric: "Total Orders", Value: channelReport.totalOrders },
      { Metric: "Total Gross Revenue (INR)", Value: Number(channelReport.totalRevenue.toFixed(2)) },
      { Metric: "Total Menu Units Sold", Value: itemWiseReport.totalUnitsSold },
      {
        Metric: "Highest Selling Item (By Qty)",
        Value: itemWiseReport.topByQty
          ? `${itemWiseReport.topByQty.name} (${itemWiseReport.topByQty.totalQty} units)`
          : "N/A",
      },
      {
        Metric: "Highest Revenue Item",
        Value: itemWiseReport.topByRevenue
          ? `${itemWiseReport.topByRevenue.name} (${formatINR(itemWiseReport.topByRevenue.revenue)})`
          : "N/A",
      },
      { Metric: "Dine-In Orders", Value: channelReport.dineIn.orders },
      { Metric: "Takeaway Orders", Value: channelReport.takeaway.orders },
      { Metric: "Delivery Orders", Value: channelReport.delivery.orders },
      {
        Metric: "Avg Order-to-Delivery / Completion Time",
        Value: formatDurationSeconds(serviceTimeReport.avgOrderSec),
      },
      {
        Metric: "Avg Waiter Call Response Time",
        Value: formatDurationSeconds(serviceTimeReport.avgWaiterSec),
      },
      {
        Metric: "Avg Clean Table Response Time",
        Value: formatDurationSeconds(serviceTimeReport.avgCleanSec),
      },
      {
        Metric: "Avg Ask for Bill Response Time",
        Value: formatDurationSeconds(serviceTimeReport.avgBillSec),
      },
      { Metric: "Active Floor Tables", Value: `${tables.filter((t) => t.status === "occupied").length} / ${tables.length}` },
      { Metric: "Reservations Count", Value: reservations.length },
      { Metric: "CRM Registered Customers", Value: customersList.length },
      {
        Metric: "Inventory Holding Value (INR)",
        Value: Number(inventoryItems.reduce((s, i) => s + i.currentStock * i.costPerUnit, 0).toFixed(2)),
      },
      { Metric: "Active Staff on Shift", Value: `${teamMembers.filter((m) => m.status === "active").length} / ${teamMembers.length}` },
    ]
    const wsSummary = XLSX.utils.json_to_sheet(summaryData)
    wsSummary["!cols"] = [{ wch: 42 }, { wch: 45 }]
    XLSX.utils.book_append_sheet(wb, wsSummary, "Executive Summary")

    // Sheet 2: Item-Wise Performance
    const itemSheetRows = filteredItemRows.map((r, idx) => ({
      Rank: idx + 1,
      "Item Name": r.name,
      Category: r.category,
      Station: r.station.toUpperCase(),
      Dietary: r.isVeg ? "Veg" : "Non-Veg",
      "Total Qty Sold": r.totalQty,
      "Dine-In Qty": r.dineInQty,
      "Takeaway Qty": r.takeawayQty,
      "Delivery Qty": r.deliveryQty,
      "QR Menu Qty": r.qrQty,
      "POS Counter Qty": r.posQty,
      "Unit Price (INR)": Number(r.unitPrice.toFixed(2)),
      "Total Revenue (INR)": Number(r.revenue.toFixed(2)),
      "Sales Share (%)": Number(r.qtySharePct.toFixed(1)),
    }))
    const wsItems = XLSX.utils.json_to_sheet(itemSheetRows)
    wsItems["!cols"] = [
      { wch: 6 },
      { wch: 30 },
      { wch: 12 },
      { wch: 10 },
      { wch: 10 },
      { wch: 14 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 14 },
      { wch: 16 },
      { wch: 18 },
      { wch: 14 },
    ]
    XLSX.utils.book_append_sheet(wb, wsItems, "Item-Wise Sales")

    // Sheet 3: Order Type & Channel Breakdown
    const channelSheetRows = channelReport.list.map((c) => ({
      "Order Channel": c.label,
      "Orders Count": c.orders,
      "Order Share (%)": Number(c.orderSharePct.toFixed(1)),
      "Items Sold": c.items,
      "QR Self-Order Count": c.qr,
      "POS Counter Count": c.pos,
      "Gross Revenue (INR)": Number(c.revenue.toFixed(2)),
      "Revenue Share (%)": Number(c.revenueSharePct.toFixed(1)),
      "Avg Order Value (INR)": Number(c.avgOrderValue.toFixed(2)),
    }))
    const wsChannels = XLSX.utils.json_to_sheet(channelSheetRows)
    wsChannels["!cols"] = [
      { wch: 16 },
      { wch: 14 },
      { wch: 16 },
      { wch: 12 },
      { wch: 18 },
      { wch: 18 },
      { wch: 20 },
      { wch: 18 },
      { wch: 20 },
    ]
    XLSX.utils.book_append_sheet(wb, wsChannels, "Dine-In vs Takeaway")

    // Sheet 4: Service Time & SLA Summary
    const slaSummaryRows = [
      {
        "SLA Metric": "Order-to-Delivery / Completion (All Orders)",
        "Sample Count": serviceTimeReport.orderLogs.length,
        "Average Time": formatDurationSeconds(serviceTimeReport.avgOrderSec),
        "Fastest": formatDurationSeconds(serviceTimeReport.minOrderSec),
        "Slowest": formatDurationSeconds(serviceTimeReport.maxOrderSec),
      },
      {
        "SLA Metric": "Dine-In Order Turnaround",
        "Sample Count": serviceTimeReport.orderLogs.filter((l) => l.orderType === "dine-in").length,
        "Average Time": formatDurationSeconds(serviceTimeReport.avgByChannel.dineIn),
        "Fastest": "—",
        "Slowest": "—",
      },
      {
        "SLA Metric": "Takeaway Order Turnaround",
        "Sample Count": serviceTimeReport.orderLogs.filter((l) => l.orderType === "takeaway").length,
        "Average Time": formatDurationSeconds(serviceTimeReport.avgByChannel.takeaway),
        "Fastest": "—",
        "Slowest": "—",
      },
      {
        "SLA Metric": "Delivery Order Turnaround",
        "Sample Count": serviceTimeReport.orderLogs.filter((l) => l.orderType === "delivery").length,
        "Average Time": formatDurationSeconds(serviceTimeReport.avgByChannel.delivery),
        "Fastest": "—",
        "Slowest": "—",
      },
      {
        "SLA Metric": "Waiter Call Response Time",
        "Sample Count": serviceTimeReport.waiterCount,
        "Average Time": formatDurationSeconds(serviceTimeReport.avgWaiterSec),
        "Fastest": "—",
        "Slowest": "—",
      },
      {
        "SLA Metric": "Clean Table Response Time",
        "Sample Count": serviceTimeReport.cleanCount,
        "Average Time": formatDurationSeconds(serviceTimeReport.avgCleanSec),
        "Fastest": "—",
        "Slowest": "—",
      },
      {
        "SLA Metric": "Ask for Bill Response Time",
        "Sample Count": serviceTimeReport.billCount,
        "Average Time": formatDurationSeconds(serviceTimeReport.avgBillSec),
        "Fastest": "—",
        "Slowest": "—",
      },
    ]
    const wsSla = XLSX.utils.json_to_sheet(slaSummaryRows)
    wsSla["!cols"] = [{ wch: 42 }, { wch: 14 }, { wch: 16 }, { wch: 12 }, { wch: 12 }]
    XLSX.utils.book_append_sheet(wb, wsSla, "Service Time & SLA")

    // Sheet 5: Order Turnaround Log
    const orderLogRows = serviceTimeReport.orderLogs.map((l) => ({
      "Order #": l.orderNumber,
      Type: l.orderType.toUpperCase(),
      "Table / Channel": l.table,
      Source: l.source,
      "Created At": new Date(l.createdAt).toLocaleString("en-IN"),
      "Completed At": new Date(l.completedAt).toLocaleString("en-IN"),
      "Turnaround Duration": formatDurationSeconds(l.durationSeconds),
      "Turnaround (Minutes)": Number((l.durationSeconds / 60).toFixed(2)),
      "Amount (INR)": Number(l.totalAmount.toFixed(2)),
    }))
    const wsOrderLogs = XLSX.utils.json_to_sheet(orderLogRows)
    wsOrderLogs["!cols"] = [
      { wch: 14 },
      { wch: 12 },
      { wch: 16 },
      { wch: 12 },
      { wch: 22 },
      { wch: 22 },
      { wch: 18 },
      { wch: 18 },
      { wch: 14 },
    ]
    XLSX.utils.book_append_sheet(wb, wsOrderLogs, "Order Turnaround Log")

    // Sheet 6: Service Call Response Log
    const srvLogRows = serviceTimeReport.serviceLogs.map((s) => ({
      Table: s.table,
      "Request Type": s.title,
      "Requested At": new Date(s.createdAt).toLocaleString("en-IN"),
      "Cleared At": s.clearedAt ? new Date(s.clearedAt).toLocaleString("en-IN") : "Pending",
      "Response Time": formatDurationSeconds(s.responseSeconds),
      "Response (Seconds)": Math.round(s.responseSeconds),
      "Cleared By": s.clearedBy || "Front Desk",
    }))
    const wsSrvLogs = XLSX.utils.json_to_sheet(srvLogRows)
    wsSrvLogs["!cols"] = [
      { wch: 12 },
      { wch: 18 },
      { wch: 22 },
      { wch: 22 },
      { wch: 16 },
      { wch: 18 },
      { wch: 16 },
    ]
    XLSX.utils.book_append_sheet(wb, wsSrvLogs, "Waiter & Service Calls")

    const fileName = `Nodedr-Bistro-Restaurant-Report-${period}-${new Date().toISOString().slice(0, 10)}.xlsx`
    XLSX.writeFile(wb, fileName)
    setExportToast(`Exported 6-sheet Excel report: ${fileName}`)
    setTimeout(() => setExportToast(null), 5000)
  }

  const cardSurface = isDarkMode
    ? "bg-[#14161f] border-[#202330]"
    : "bg-white border-[#E5E1D9] shadow-2xs"
  const subSurface = isDarkMode ? "bg-[#191c27] border-[#252938]" : "bg-[#F7F5F0] border-[#E5E1D9]"
  const headingText = isDarkMode ? "text-white" : "text-[#20252B]"
  const mutedText = isDarkMode ? "text-slate-400" : "text-[#64748B]"

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto pb-8">
      {/* Export Toast */}
      {exportToast && (
        <div className="p-3.5 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-500 text-xs font-semibold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{exportToast}</span>
          </div>
          <button type="button" onClick={() => setExportToast(null)} className="cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C46B4E]/15 border border-[#C46B4E]/30 flex items-center justify-center text-[#C46B4E] shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className={`text-2xl lg:text-3xl font-bold tracking-tight ${headingText}`}>
              Restaurant Reports & Analytics
            </h1>
            <p className={`text-xs sm:text-sm mt-0.5 ${mutedText}`}>
              Item-wise sales rankings, Dine-In vs. Takeaway vs. Delivery split, service response SLAs & full Excel (.xlsx) export.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Period Switcher */}
          <div
            className={`inline-flex p-1 rounded-xl border ${
              isDarkMode ? "bg-[#14161f] border-[#242838]" : "bg-white border-[#E5E1D9]"
            }`}
          >
            {(
              [
                { id: "today", label: "Today" },
                { id: "7d", label: "7 Days" },
                { id: "month", label: "This Month" },
                { id: "all", label: "All Time" },
              ] as const
            ).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriod(p.id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  period === p.id ? "bg-[#C46B4E] text-white" : mutedText
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleExportExcel}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition flex items-center gap-2 shadow-2xs cursor-pointer active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export to Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Top Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Highest Selling Item */}
        <div className={`p-4 rounded-2xl border ${cardSurface}`}>
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase text-[#64748B]">
            <span>Highest Selling Item</span>
            <Crown className="w-4 h-4 text-amber-500" />
          </div>
          <div className={`text-base font-bold mt-2 truncate ${headingText}`}>
            {itemWiseReport.topByQty ? itemWiseReport.topByQty.name : "No sales yet"}
          </div>
          <div className="text-[11px] mt-1 text-[#C46B4E] font-semibold">
            {itemWiseReport.topByQty
              ? `${itemWiseReport.topByQty.totalQty} units sold · ${itemWiseReport.topByQty.qtySharePct.toFixed(1)}% share`
              : "—"}
          </div>
        </div>

        {/* Dine-In Share */}
        <div className={`p-4 rounded-2xl border ${cardSurface}`}>
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase text-[#64748B]">
            <span>Dine-In Volume</span>
            <Utensils className="w-4 h-4 text-[#C46B4E]" />
          </div>
          <div className={`text-xl font-bold mt-2 ${headingText}`}>
            {channelReport.dineIn.orders} orders
          </div>
          <div className={`text-[11px] mt-1 ${mutedText}`}>
            {channelReport.dineIn.orderSharePct.toFixed(1)}% · {formatINR(channelReport.dineIn.revenue, 0)}
          </div>
        </div>

        {/* Takeaway & Delivery Share */}
        <div className={`p-4 rounded-2xl border ${cardSurface}`}>
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase text-[#64748B]">
            <span>Takeaway + Delivery</span>
            <ShoppingBag className="w-4 h-4 text-blue-500" />
          </div>
          <div className={`text-xl font-bold mt-2 ${headingText}`}>
            {channelReport.takeaway.orders + channelReport.delivery.orders} orders
          </div>
          <div className={`text-[11px] mt-1 ${mutedText}`}>
            Takeaway {channelReport.takeaway.orders} · Delivery {channelReport.delivery.orders}
          </div>
        </div>

        {/* Avg Order-to-Delivery Time */}
        <div className={`p-4 rounded-2xl border ${cardSurface}`}>
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase text-[#64748B]">
            <span>Avg Order Turnaround</span>
            <Timer className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl font-bold mt-2 text-blue-500">
            {formatDurationSeconds(serviceTimeReport.avgOrderSec)}
          </div>
          <div className={`text-[11px] mt-1 ${mutedText}`}>
            Across {serviceTimeReport.orderLogs.length} completed orders
          </div>
        </div>

        {/* Avg Waiter Call Response */}
        <div className={`p-4 rounded-2xl border ${cardSurface}`}>
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase text-[#64748B]">
            <span>Waiter Call Response</span>
            <BellRing className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-xl font-bold mt-2 text-purple-400">
            {formatDurationSeconds(serviceTimeReport.avgWaiterSec)}
          </div>
          <div className={`text-[11px] mt-1 ${mutedText}`}>
            Clean {formatDurationSeconds(serviceTimeReport.avgCleanSec)} · Bill{" "}
            {formatDurationSeconds(serviceTimeReport.avgBillSec)}
          </div>
        </div>
      </div>

      {/* Sub-Navigation Pills */}
      <div className="flex items-center gap-2 flex-wrap border-b pb-3 border-[#E5E1D9] dark:border-[#202330]">
        {(
          [
            { id: "overview", label: "Whole Restaurant Overview" },
            { id: "items", label: `Item-Wise Sales (${itemWiseReport.uniqueSoldCount} active)` },
            { id: "channels", label: "Dine-In, Takeaway & Delivery" },
            { id: "sla", label: "Service Time & Waiter SLA" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setReportTab(t.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              reportTab === t.id
                ? "bg-[#C46B4E] text-white shadow-2xs"
                : isDarkMode
                ? "bg-[#14161f] text-slate-400 hover:text-white border border-[#202330]"
                : "bg-white text-[#64748B] hover:text-[#20252B] border border-[#E5E1D9]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* VIEW 1: WHOLE RESTAURANT OVERVIEW (Combines Highlights of All Sections) */}
      {reportTab === "overview" && (
        <div className="space-y-6">
          {/* Spotlight Row: #1 Best Seller + Channel Split + Service Speed */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Top 5 Highest Selling Items Visual Chart */}
            <div className={`lg:col-span-5 p-5 rounded-2xl border ${cardSurface}`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className={`text-sm font-bold flex items-center gap-2 ${headingText}`}>
                    <Flame className="w-4 h-4 text-[#C46B4E]" />
                    <span>Top Highest Selling Dishes</span>
                  </h2>
                  <p className={`text-xs mt-0.5 ${mutedText}`}>
                    {itemWiseReport.totalUnitsSold} total items ordered across {channelReport.totalOrders} orders
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setReportTab("items")}
                  className="text-xs font-semibold text-[#C46B4E] hover:underline cursor-pointer"
                >
                  Full Item Report
                </button>
              </div>

              <div className="space-y-3">
                {filteredItemRows.slice(0, 6).map((item, idx) => {
                  const maxQty = Math.max(1, filteredItemRows[0]?.totalQty || 1)
                  const pct = Math.max(8, Math.round((item.totalQty / maxQty) * 100))
                  return (
                    <div key={item.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`w-5 h-5 rounded-md text-[10px] font-bold flex items-center justify-center shrink-0 ${
                              idx === 0
                                ? "bg-amber-500/20 text-amber-500"
                                : "bg-slate-500/10 text-[#64748B]"
                            }`}
                          >
                            #{idx + 1}
                          </span>
                          <span className={`font-semibold truncate ${headingText}`}>{item.name}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`font-bold ${headingText}`}>{item.totalQty} sold</span>
                          <span className="text-[10px] text-[#64748B]">({formatINR(item.revenue, 0)})</span>
                        </div>
                      </div>
                      <div className={`h-2 rounded-full overflow-hidden ${isDarkMode ? "bg-[#1e2230]" : "bg-[#EFECE6]"}`}>
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#C46B4E] to-amber-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Dine-In vs Takeaway vs Delivery Visual Breakdown */}
            <div className={`lg:col-span-4 p-5 rounded-2xl border flex flex-col justify-between ${cardSurface}`}>
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className={`text-sm font-bold flex items-center gap-2 ${headingText}`}>
                      <ShoppingBag className="w-4 h-4 text-blue-500" />
                      <span>Order Channel Mix</span>
                    </h2>
                    <p className={`text-xs mt-0.5 ${mutedText}`}>Dine-In vs. Takeaway vs. Delivery</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReportTab("channels")}
                    className="text-xs font-semibold text-[#C46B4E] hover:underline cursor-pointer"
                  >
                    Details
                  </button>
                </div>

                {/* Segmented Bar */}
                <div className="h-4 rounded-full overflow-hidden flex gap-0.5 mb-4">
                  {channelReport.list.map((c) => {
                    if (c.orders === 0) return null
                    const color =
                      c.key === "dine-in"
                        ? "bg-[#C46B4E]"
                        : c.key === "takeaway"
                        ? "bg-blue-500"
                        : "bg-blue-500"
                    return (
                      <div
                        key={c.key}
                        className={`${color} h-full transition-all`}
                        style={{ width: `${Math.max(5, c.orderSharePct)}%` }}
                        title={`${c.label}: ${c.orders} orders (${c.orderSharePct.toFixed(1)}%)`}
                      />
                    )
                  })}
                </div>

                <div className="space-y-2.5">
                  {channelReport.list.map((c) => (
                    <div key={c.key} className={`p-3 rounded-xl border flex items-center justify-between ${subSurface}`}>
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            c.key === "dine-in"
                              ? "bg-[#C46B4E]"
                              : c.key === "takeaway"
                              ? "bg-blue-500"
                              : "bg-blue-500"
                          }`}
                        />
                        <div>
                          <div className={`text-xs font-bold ${headingText}`}>{c.label}</div>
                          <div className="text-[10px] text-[#64748B]">
                            {c.items} items · AOV {formatINR(c.avgOrderValue, 0)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-xs font-bold ${headingText}`}>
                          {c.orders} ({c.orderSharePct.toFixed(1)}%)
                        </div>
                        <div className="text-[10px] text-[#C46B4E] font-semibold">
                          {formatINR(c.revenue, 0)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className={`mt-4 pt-3 border-t flex items-center justify-between text-xs ${isDarkMode ? "border-[#222636]" : "border-[#E5E1D9]"}`}>
                <span className={mutedText}>
                  QR Menu: <strong className={headingText}>{channelReport.qrTotalOrders}</strong>
                </span>
                <span className={mutedText}>
                  POS Counter: <strong className={headingText}>{channelReport.posTotalOrders}</strong>
                </span>
              </div>
            </div>

            {/* Service Time & Waiter Call SLA Summary */}
            <div className={`lg:col-span-3 p-5 rounded-2xl border flex flex-col justify-between ${cardSurface}`}>
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className={`text-sm font-bold flex items-center gap-2 ${headingText}`}>
                      <Clock className="w-4 h-4 text-blue-500" />
                      <span>Service Speed SLA</span>
                    </h2>
                    <p className={`text-xs mt-0.5 ${mutedText}`}>Turnaround & staff response</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReportTab("sla")}
                    className="text-xs font-semibold text-[#C46B4E] hover:underline cursor-pointer"
                  >
                    Logs
                  </button>
                </div>

                <div className="space-y-2.5">
                  <div className={`p-3 rounded-xl border ${subSurface}`}>
                    <div className="text-[10px] uppercase font-semibold text-[#64748B]">
                      Order → Delivery / Ready
                    </div>
                    <div className="text-lg font-bold text-blue-500 mt-0.5">
                      {formatDurationSeconds(serviceTimeReport.avgOrderSec)}
                    </div>
                    <div className="text-[10px] text-[#64748B]">
                      Fastest {formatDurationSeconds(serviceTimeReport.minOrderSec)} · Slowest{" "}
                      {formatDurationSeconds(serviceTimeReport.maxOrderSec)}
                    </div>
                  </div>

                  <div className={`p-3 rounded-xl border ${subSurface}`}>
                    <div className="text-[10px] uppercase font-semibold text-[#64748B]">
                      Waiter Call Response
                    </div>
                    <div className="text-lg font-bold text-purple-400 mt-0.5">
                      {formatDurationSeconds(serviceTimeReport.avgWaiterSec)}
                    </div>
                    <div className="text-[10px] text-[#64748B]">
                      From {serviceTimeReport.waiterCount} resolved waiter calls
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className={`p-2.5 rounded-xl border ${subSurface}`}>
                      <div className="text-[10px] text-[#64748B] font-semibold">Clean Table</div>
                      <div className={`text-sm font-bold mt-0.5 ${headingText}`}>
                        {formatDurationSeconds(serviceTimeReport.avgCleanSec)}
                      </div>
                    </div>
                    <div className={`p-2.5 rounded-xl border ${subSurface}`}>
                      <div className="text-[10px] text-[#64748B] font-semibold">Bill Request</div>
                      <div className={`text-sm font-bold mt-0.5 ${headingText}`}>
                        {formatDurationSeconds(serviceTimeReport.avgBillSec)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Whole-Restaurant Snapshot Strip (Floor, Inventory, Customers, Team) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={`p-4 rounded-2xl border ${cardSurface}`}>
              <div className="flex items-center justify-between text-xs text-[#64748B] mb-1">
                <span>Floor & Reservations</span>
                <Users className="w-4 h-4 text-[#C46B4E]" />
              </div>
              <div className={`text-lg font-bold ${headingText}`}>
                {tables.filter((t) => t.status === "occupied").length}/{tables.length} occupied
              </div>
              <p className="text-[11px] text-[#64748B] mt-0.5">{reservations.length} reservations logged</p>
            </div>

            <div className={`p-4 rounded-2xl border ${cardSurface}`}>
              <div className="flex items-center justify-between text-xs text-[#64748B] mb-1">
                <span>Inventory Valuation</span>
                <Boxes className="w-4 h-4 text-amber-500" />
              </div>
              <div className={`text-lg font-bold ${headingText}`}>
                {formatINR(inventoryItems.reduce((s, i) => s + i.currentStock * i.costPerUnit, 0), 0)}
              </div>
              <p className="text-[11px] text-[#64748B] mt-0.5">{inventoryItems.length} raw materials tracked</p>
            </div>

            <div className={`p-4 rounded-2xl border ${cardSurface}`}>
              <div className="flex items-center justify-between text-xs text-[#64748B] mb-1">
                <span>Registered Diners (CRM)</span>
                <Award className="w-4 h-4 text-purple-500" />
              </div>
              <div className={`text-lg font-bold ${headingText}`}>{customersList.length} VIP profiles</div>
              <p className="text-[11px] text-[#64748B] mt-0.5">
                {customersList.reduce((s, c) => s + c.visits, 0)} repeat visits recorded
              </p>
            </div>

            <div className={`p-4 rounded-2xl border ${cardSurface}`}>
              <div className="flex items-center justify-between text-xs text-[#64748B] mb-1">
                <span>Active Staff Roster</span>
                <ChefHat className="w-4 h-4 text-blue-500" />
              </div>
              <div className={`text-lg font-bold ${headingText}`}>
                {teamMembers.filter((m) => m.status === "active").length} / {teamMembers.length} on duty
              </div>
              <p className="text-[11px] text-[#64748B] mt-0.5">{menuCatalog.length} menu dishes configured</p>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: FULL ITEM-WISE REPORT */}
      {reportTab === "items" && (
        <div className="space-y-4">
          {/* Best Seller Spotlight */}
          {itemWiseReport.topByQty && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`p-4 rounded-2xl border flex items-center justify-between ${cardSurface}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
                    <Crown className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">
                      #1 Highest Selling Dish (Quantity)
                    </span>
                    <h3 className={`text-base font-bold ${headingText}`}>{itemWiseReport.topByQty.name}</h3>
                    <p className={`text-xs ${mutedText}`}>
                      {itemWiseReport.topByQty.dineInQty} Dine-In · {itemWiseReport.topByQty.takeawayQty} Takeaway ·{" "}
                      {itemWiseReport.topByQty.deliveryQty} Delivery
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-[#C46B4E]">{itemWiseReport.topByQty.totalQty} units</div>
                  <div className="text-[11px] text-[#64748B]">
                    {itemWiseReport.topByQty.qtySharePct.toFixed(1)}% of all items
                  </div>
                </div>
              </div>

              {itemWiseReport.topByRevenue && (
                <div className={`p-4 rounded-2xl border flex items-center justify-between ${cardSurface}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-500 flex items-center justify-center shrink-0">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500">
                        #1 Highest Grossing Dish (Revenue)
                      </span>
                      <h3 className={`text-base font-bold ${headingText}`}>{itemWiseReport.topByRevenue.name}</h3>
                      <p className={`text-xs ${mutedText}`}>
                        {itemWiseReport.topByRevenue.totalQty} units · {formatINR(itemWiseReport.topByRevenue.unitPrice, 0)} avg price
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-blue-500">
                      {formatINR(itemWiseReport.topByRevenue.revenue, 0)}
                    </div>
                    <div className="text-[11px] text-[#64748B]">
                      {itemWiseReport.topByRevenue.revSharePct.toFixed(1)}% of item revenue
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Filters & Item-Wise Matrix Table */}
          <div className={`rounded-2xl border overflow-hidden ${cardSurface}`}>
            <div className="p-4 border-b border-[#E5E1D9] dark:border-[#202330] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 flex-wrap">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                    placeholder="Search dish name or category..."
                    className={`w-full pl-9 pr-4 py-2 rounded-xl text-xs border outline-hidden ${
                      isDarkMode
                        ? "bg-[#191c27] border-[#252938] text-white placeholder-slate-500"
                        : "bg-[#F7F5F0] border-[#E5E1D9] text-[#20252B] placeholder-[#64748B]"
                    }`}
                  />
                </div>

                <select
                  value={itemCategory}
                  onChange={(e) => setItemCategory(e.target.value)}
                  className={`px-3 py-2 rounded-xl text-xs border outline-hidden cursor-pointer ${
                    isDarkMode ? "bg-[#191c27] border-[#252938] text-white" : "bg-[#F7F5F0] border-[#E5E1D9]"
                  }`}
                >
                  <option value="all">All Categories</option>
                  <option value="mains">Mains</option>
                  <option value="sides">Sides</option>
                  <option value="drinks">Drinks & Bar</option>
                  <option value="desserts">Desserts</option>
                </select>

                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeUnsold}
                    onChange={(e) => setIncludeUnsold(e.target.checked)}
                    className="accent-[#C46B4E]"
                  />
                  <span className={mutedText}>Show zero-sale menu items</span>
                </label>
              </div>

              <div className="flex items-center gap-1.5 text-xs">
                <span className={mutedText}>Sort:</span>
                {(
                  [
                    { id: "qty", label: "Highest Qty" },
                    { id: "revenue", label: "Revenue" },
                    { id: "dineIn", label: "Dine-In" },
                    { id: "takeaway", label: "Takeaway" },
                    { id: "delivery", label: "Delivery" },
                  ] as const
                ).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setItemSortBy(s.id)}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                      itemSortBy === s.id ? "bg-[#C46B4E] text-white" : subSurface + " " + mutedText
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr
                    className={`border-b ${
                      isDarkMode
                        ? "bg-[#181b25] border-[#252938] text-slate-400"
                        : "bg-[#F7F5F0] border-[#E5E1D9] text-[#64748B]"
                    }`}
                  >
                    <th className="py-3 px-4 font-semibold">#</th>
                    <th className="py-3 px-4 font-semibold">Dish Name</th>
                    <th className="py-3 px-4 font-semibold">Category / Station</th>
                    <th className="py-3 px-4 font-semibold text-right">Total Sold</th>
                    <th className="py-3 px-4 font-semibold text-right">Dine-In</th>
                    <th className="py-3 px-4 font-semibold text-right">Takeaway</th>
                    <th className="py-3 px-4 font-semibold text-right">Delivery</th>
                    <th className="py-3 px-4 font-semibold text-right">QR / POS</th>
                    <th className="py-3 px-4 font-semibold text-right">Revenue</th>
                    <th className="py-3 px-4 font-semibold text-right">Share %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E1D9] dark:divide-[#202330]">
                  {filteredItemRows.map((r, idx) => (
                    <tr key={r.name} className={isDarkMode ? "hover:bg-[#191c27]" : "hover:bg-[#F7F5F0]/70"}>
                      <td className="py-3 px-4 font-bold text-[#64748B]">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${r.isVeg ? "bg-blue-500" : "bg-red-500"}`}
                          />
                          <span className={`font-bold ${headingText}`}>{r.name}</span>
                          {idx === 0 && r.totalQty > 0 && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-500 text-[9px] font-bold">
                              TOP SELLER
                            </span>
                          )}
                        </div>
                      </td>
                      <td className={`py-3 px-4 capitalize ${mutedText}`}>
                        {r.category} · {r.station}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-[#C46B4E]">{r.totalQty}</td>
                      <td className={`py-3 px-4 text-right ${headingText}`}>{r.dineInQty}</td>
                      <td className={`py-3 px-4 text-right ${headingText}`}>{r.takeawayQty}</td>
                      <td className={`py-3 px-4 text-right ${headingText}`}>{r.deliveryQty}</td>
                      <td className={`py-3 px-4 text-right ${mutedText}`}>
                        {r.qrQty} / {r.posQty}
                      </td>
                      <td className={`py-3 px-4 text-right font-bold ${headingText}`}>
                        {formatINR(r.revenue, 0)}
                      </td>
                      <td className="py-3 px-4 text-right text-[#64748B]">{r.qtySharePct.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: DINE-IN, TAKEAWAY & DELIVERY BREAKDOWN */}
      {reportTab === "channels" && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {channelReport.list.map((c) => {
              const Icon = c.key === "dine-in" ? Utensils : c.key === "takeaway" ? ShoppingBag : Truck
              const badgeColor =
                c.key === "dine-in"
                  ? "bg-[#C46B4E]/15 text-[#C46B4E]"
                  : c.key === "takeaway"
                  ? "bg-blue-500/15 text-blue-500"
                  : "bg-indigo-500/15 text-indigo-500"
              const barColor =
                c.key === "dine-in" ? "bg-[#C46B4E]" : c.key === "takeaway" ? "bg-blue-500" : "bg-indigo-500"

              return (
                <div key={c.key} className={`p-5 rounded-2xl border space-y-4 ${cardSurface}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${badgeColor}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className={`text-base font-bold ${headingText}`}>{c.label}</h3>
                        <p className="text-[11px] text-[#64748B]">{c.orderSharePct.toFixed(1)}% of total orders</p>
                      </div>
                    </div>
                    <span className={`text-xl font-bold ${headingText}`}>{c.orders}</span>
                  </div>

                  <div className={`h-2.5 rounded-full overflow-hidden ${isDarkMode ? "bg-[#1e2230]" : "bg-[#EFECE6]"}`}>
                    <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.max(4, c.orderSharePct)}%` }} />
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                    <div className={`p-2.5 rounded-xl border ${subSurface}`}>
                      <div className="text-[10px] text-[#64748B]">Gross Revenue</div>
                      <div className={`font-bold mt-0.5 ${headingText}`}>{formatINR(c.revenue)}</div>
                    </div>
                    <div className={`p-2.5 rounded-xl border ${subSurface}`}>
                      <div className="text-[10px] text-[#64748B]">Avg Ticket Size</div>
                      <div className={`font-bold mt-0.5 ${headingText}`}>{formatINR(c.avgOrderValue)}</div>
                    </div>
                    <div className={`p-2.5 rounded-xl border ${subSurface}`}>
                      <div className="text-[10px] text-[#64748B]">Items Served</div>
                      <div className={`font-bold mt-0.5 ${headingText}`}>{c.items} dishes</div>
                    </div>
                    <div className={`p-2.5 rounded-xl border ${subSurface}`}>
                      <div className="text-[10px] text-[#64748B]">QR vs POS Orders</div>
                      <div className={`font-bold mt-0.5 ${headingText}`}>
                        {c.qr} QR · {c.pos} POS
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* VIEW 4: SERVICE TIME & WAITER CALL SLA ANALYTICS */}
      {reportTab === "sla" && (
        <div className="space-y-5">
          {/* Top Service Time Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={`p-4 rounded-2xl border ${cardSurface}`}>
              <span className="text-[11px] font-semibold uppercase text-[#64748B]">
                Avg Order → Delivery / Complete
              </span>
              <div className="text-2xl font-bold text-blue-500 mt-1.5">
                {formatDurationSeconds(serviceTimeReport.avgOrderSec)}
              </div>
              <p className={`text-[11px] mt-1 ${mutedText}`}>
                Dine-In {formatDurationSeconds(serviceTimeReport.avgByChannel.dineIn)} · Delivery{" "}
                {formatDurationSeconds(serviceTimeReport.avgByChannel.delivery)}
              </p>
            </div>

            <div className={`p-4 rounded-2xl border ${cardSurface}`}>
              <span className="text-[11px] font-semibold uppercase text-[#64748B]">
                Avg Response to Waiter Call
              </span>
              <div className="text-2xl font-bold text-purple-400 mt-1.5">
                {formatDurationSeconds(serviceTimeReport.avgWaiterSec)}
              </div>
              <p className={`text-[11px] mt-1 ${mutedText}`}>
                Measured across {serviceTimeReport.waiterCount} resolved waiter requests
              </p>
            </div>

            <div className={`p-4 rounded-2xl border ${cardSurface}`}>
              <span className="text-[11px] font-semibold uppercase text-[#64748B]">
                Avg Clean Table Turnaround
              </span>
              <div className="text-2xl font-bold text-blue-500 mt-1.5">
                {formatDurationSeconds(serviceTimeReport.avgCleanSec)}
              </div>
              <p className={`text-[11px] mt-1 ${mutedText}`}>
                Across {serviceTimeReport.cleanCount} table clear calls
              </p>
            </div>

            <div className={`p-4 rounded-2xl border ${cardSurface}`}>
              <span className="text-[11px] font-semibold uppercase text-[#64748B]">
                Avg Bill Request Response
              </span>
              <div className="text-2xl font-bold text-[#C46B4E] mt-1.5">
                {formatDurationSeconds(serviceTimeReport.avgBillSec)}
              </div>
              <p className={`text-[11px] mt-1 ${mutedText}`}>
                Across {serviceTimeReport.billCount} bill requests ({serviceTimeReport.pendingRequestsCount} active)
              </p>
            </div>
          </div>

          {/* Order Turnaround Distribution Bars */}
          <div className={`p-5 rounded-2xl border ${cardSurface}`}>
            <h3 className={`text-sm font-bold mb-3 ${headingText}`}>Order Completion Speed Distribution</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              {[
                { label: "Express (< 5 min)", count: serviceTimeReport.buckets.under5, cls: "bg-blue-500/15 text-blue-500 border-blue-500/30" },
                { label: "Standard (5–15 min)", count: serviceTimeReport.buckets.from5to15, cls: "bg-blue-500/15 text-blue-500 border-blue-500/30" },
                { label: "Peak Rush (15–30 min)", count: serviceTimeReport.buckets.from15to30, cls: "bg-amber-500/15 text-amber-500 border-amber-500/30" },
                { label: "Delayed (30+ min)", count: serviceTimeReport.buckets.over30, cls: "bg-rose-500/15 text-rose-500 border-rose-500/30" },
              ].map((b) => (
                <div key={b.label} className={`p-3 rounded-xl border ${b.cls}`}>
                  <div className="text-xl font-bold">{b.count}</div>
                  <div className="text-[11px] font-semibold mt-0.5">{b.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Two Log Tables Side-by-Side: Order Turnaround + Waiter/Service Call Responses */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Order-to-Delivery Log */}
            <div className={`rounded-2xl border overflow-hidden ${cardSurface}`}>
              <div className="p-4 border-b border-[#E5E1D9] dark:border-[#202330]">
                <h3 className={`text-sm font-bold ${headingText}`}>Order-to-Delivery / Completion Log</h3>
                <p className={`text-xs ${mutedText}`}>Time elapsed from order placement to completion</p>
              </div>
              <div className="overflow-x-auto max-h-[320px]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr
                      className={`border-b ${
                        isDarkMode
                          ? "bg-[#181b25] border-[#252938] text-slate-400"
                          : "bg-[#F7F5F0] border-[#E5E1D9] text-[#64748B]"
                      }`}
                    >
                      <th className="py-2.5 px-4 font-semibold">Order #</th>
                      <th className="py-2.5 px-4 font-semibold">Channel</th>
                      <th className="py-2.5 px-4 font-semibold">Placed</th>
                      <th className="py-2.5 px-4 font-semibold text-right">Turnaround</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E1D9] dark:divide-[#202330]">
                    {serviceTimeReport.orderLogs.slice(0, 15).map((l) => (
                      <tr key={l.orderNumber}>
                        <td className={`py-2.5 px-4 font-bold ${headingText}`}>{l.orderNumber}</td>
                        <td className={`py-2.5 px-4 capitalize ${mutedText}`}>
                          {l.orderType} · {l.table}
                        </td>
                        <td className={`py-2.5 px-4 ${mutedText}`}>
                          {new Date(l.createdAt).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-blue-500">
                          {formatDurationSeconds(l.durationSeconds)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Waiter Call & Floor Request Response Log */}
            <div className={`rounded-2xl border overflow-hidden ${cardSurface}`}>
              <div className="p-4 border-b border-[#E5E1D9] dark:border-[#202330]">
                <h3 className={`text-sm font-bold ${headingText}`}>Waiter Call & Service Response Log</h3>
                <p className={`text-xs ${mutedText}`}>Time elapsed from guest tap until cleared by staff</p>
              </div>
              <div className="overflow-x-auto max-h-[320px]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr
                      className={`border-b ${
                        isDarkMode
                          ? "bg-[#181b25] border-[#252938] text-slate-400"
                          : "bg-[#F7F5F0] border-[#E5E1D9] text-[#64748B]"
                      }`}
                    >
                      <th className="py-2.5 px-4 font-semibold">Table</th>
                      <th className="py-2.5 px-4 font-semibold">Request</th>
                      <th className="py-2.5 px-4 font-semibold">Cleared By</th>
                      <th className="py-2.5 px-4 font-semibold text-right">Response Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E1D9] dark:divide-[#202330]">
                    {serviceTimeReport.serviceLogs.map((s) => (
                      <tr key={s.id}>
                        <td className={`py-2.5 px-4 font-bold ${headingText}`}>{s.table}</td>
                        <td className={`py-2.5 px-4 ${mutedText}`}>{s.title}</td>
                        <td className={`py-2.5 px-4 ${mutedText}`}>{s.clearedBy}</td>
                        <td className="py-2.5 px-4 text-right font-bold text-purple-400">
                          {formatDurationSeconds(s.responseSeconds)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
