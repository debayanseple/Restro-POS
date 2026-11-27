"use client"

import React, { useMemo, useState } from "react"
import {
  Bike,
  Check,
  CheckCircle2,
  ChefHat,
  Clock,
  Edit3,
  MapPin,
  PackageCheck,
  Plus,
  QrCode,
  Receipt,
  Search,
  ShoppingBag,
  Truck,
  Utensils,
  Wallet,
  X,
} from "lucide-react"
import { DashboardOrder } from "@/components/AdminDashboard"

interface MyDeliveriesModuleProps {
  isDarkMode: boolean
  orders: DashboardOrder[]
  onUpdatePaymentStatus: (orderId: string, status: "PAID" | "UNPAID") => Promise<void> | void
  onAdvanceKdsTicket: (ticketId: string) => Promise<void> | void
  onCompleteDispatchOrder: (orderId: string) => Promise<void> | void
  onUpdateOrderNotes: (orderId: string, notes: string) => Promise<void> | void
  onStartNewOrder: (type: "delivery" | "takeaway") => void
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

function formatINR(val: number, decimals = 2): string {
  const safe = isNaN(val) ? 0 : val
  return `₹${safe.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`
}

function formatTimeAgo(isoString?: string): string {
  if (!isoString) return "Just now"
  const diffMs = Date.now() - new Date(isoString).getTime()
  if (isNaN(diffMs) || diffMs < 0) return "Just now"
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function MyDeliveriesModule({
  isDarkMode,
  orders,
  onUpdatePaymentStatus,
  onAdvanceKdsTicket,
  onCompleteDispatchOrder,
  onUpdateOrderNotes,
  onStartNewOrder,
}: MyDeliveriesModuleProps) {
  const [channelFilter, setChannelFilter] = useState<"all" | "delivery" | "takeaway">("all")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "ready" | "completed">("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [editingNoteOrderId, setEditingNoteOrderId] = useState<string | null>(null)
  const [noteDraft, setNoteDraft] = useState("")
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  // Strictly only Delivery & Takeaway orders
  const dispatchOrders = useMemo(() => {
    return orders.filter((o) => {
      const t = String(o.order_type || "").toLowerCase().trim()
      return t === "delivery" || t === "takeaway" || t === "pickup"
    })
  }, [orders])

  const stats = useMemo(() => {
    const deliveries = dispatchOrders.filter(
      (o) => String(o.order_type || "").toLowerCase().trim() === "delivery"
    )
    const takeaways = dispatchOrders.filter((o) => {
      const t = String(o.order_type || "").toLowerCase().trim()
      return t === "takeaway" || t === "pickup"
    })
    const activeCount = dispatchOrders.filter(
      (o) => String(o.status || "").toUpperCase() !== "CLOSED"
    ).length
    const readyCount = dispatchOrders.filter(
      (o) => String(o.status || "").toUpperCase() === "READY"
    ).length
    const unpaidOrders = dispatchOrders.filter(
      (o) => String(o.payment_status || "").toUpperCase() !== "PAID"
    )
    const unpaidAmount = unpaidOrders.reduce((s, o) => s + Number(o.total_amount || 0), 0)
    const deliveryRevenue = deliveries.reduce((s, o) => s + Number(o.total_amount || 0), 0)
    const takeawayRevenue = takeaways.reduce((s, o) => s + Number(o.total_amount || 0), 0)

    return {
      totalCount: dispatchOrders.length,
      deliveryCount: deliveries.length,
      takeawayCount: takeaways.length,
      deliveryRevenue,
      takeawayRevenue,
      activeCount,
      readyCount,
      unpaidCount: unpaidOrders.length,
      unpaidAmount,
    }
  }, [dispatchOrders])

  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return dispatchOrders.filter((o) => {
      const rawType = String(o.order_type || "").toLowerCase().trim()
      const normChannel = rawType === "delivery" ? "delivery" : "takeaway"

      if (channelFilter !== "all" && normChannel !== channelFilter) return false

      const upperStatus = String(o.status || "OPEN").toUpperCase()
      if (statusFilter === "active" && upperStatus === "CLOSED") return false
      if (statusFilter === "ready" && upperStatus !== "READY") return false
      if (statusFilter === "completed" && upperStatus !== "CLOSED") return false

      if (q) {
        const itemsText = (o.order_items || [])
          .map((it) => it.MenuItem?.name || it.name || "")
          .join(" ")
          .toLowerCase()
        const matches =
          o.order_number.toLowerCase().includes(q) ||
          (o.table_id || "").toLowerCase().includes(q) ||
          (o.notes || "").toLowerCase().includes(q) ||
          (o.source || "").toLowerCase().includes(q) ||
          itemsText.includes(q)
        if (!matches) return false
      }

      return true
    })
  }, [dispatchOrders, channelFilter, statusFilter, searchQuery])

  const handleSaveNote = async (orderId: string, orderNum: string) => {
    await onUpdateOrderNotes(orderId, noteDraft.trim())
    setEditingNoteOrderId(null)
    setToastMsg(`Saved delivery / pickup details for ${orderNum}.`)
    setTimeout(() => setToastMsg(null), 3500)
  }

  const handleMarkDispatched = async (orderId: string, orderNum: string, isDelivery: boolean) => {
    await onCompleteDispatchOrder(orderId)
    setToastMsg(
      `${orderNum} marked as ${isDelivery ? "Delivered & Dispatched" : "Picked Up / Handed Over"}.`
    )
    setTimeout(() => setToastMsg(null), 3500)
  }

  const cardSurface = isDarkMode
    ? "bg-[#14161f] border-[#202330]"
    : "bg-white border-[#E5E1D9] shadow-2xs"
  const subSurface = isDarkMode ? "bg-[#191c27] border-[#252938]" : "bg-[#F7F5F0] border-[#E5E1D9]"
  const headingText = isDarkMode ? "text-white" : "text-[#20252B]"
  const mutedText = isDarkMode ? "text-slate-400" : "text-[#64748B]"

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto pb-8">
      {/* Toast */}
      {toastMsg && (
        <div className="p-3.5 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-500 text-xs font-semibold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toastMsg}</span>
          </div>
          <button type="button" onClick={() => setToastMsg(null)} className="cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header Strip */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C46B4E]/15 border border-[#C46B4E]/30 flex items-center justify-center text-[#C46B4E] shrink-0">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className={`text-2xl lg:text-3xl font-bold tracking-tight ${headingText}`}>
                My Deliveries & Takeaway Dispatch
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#C46B4E]/15 text-[#C46B4E] border border-[#C46B4E]/30">
                {stats.totalCount} Orders
              </span>
            </div>
            <p className={`text-xs sm:text-sm mt-0.5 ${mutedText}`}>
              Unified queue exclusively for Delivery orders and Counter Takeaway pickups — track items, rider notes, prep stage & payment collection.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => onStartNewOrder("takeaway")}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 cursor-pointer ${
              isDarkMode
                ? "bg-[#14161f] border-[#242838] text-blue-400 hover:bg-[#1e2230]"
                : "bg-white border-[#E5E1D9] text-blue-600 hover:bg-blue-50"
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>+ New Takeaway</span>
          </button>

          <button
            type="button"
            onClick={() => onStartNewOrder("delivery")}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#C46B4E] hover:bg-[#B25C40] text-white transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Delivery Order</span>
          </button>
        </div>
      </div>

      {/* 4 Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className={`p-4 rounded-2xl border ${cardSurface}`}>
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase text-[#64748B]">
            <span>Delivery Orders</span>
            <Bike className="w-4 h-4 text-blue-500" />
          </div>
          <div className={`text-xl font-bold mt-2 ${headingText}`}>
            {stats.deliveryCount}
            <span className="text-xs font-medium text-[#64748B] ml-1.5">orders</span>
          </div>
          <div className="text-[11px] text-blue-500 font-medium mt-1">
            Total {formatINR(stats.deliveryRevenue)}
          </div>
        </div>

        <div className={`p-4 rounded-2xl border ${cardSurface}`}>
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase text-[#64748B]">
            <span>Takeaway Orders</span>
            <ShoppingBag className="w-4 h-4 text-blue-500" />
          </div>
          <div className={`text-xl font-bold mt-2 ${headingText}`}>
            {stats.takeawayCount}
            <span className="text-xs font-medium text-[#64748B] ml-1.5">orders</span>
          </div>
          <div className="text-[11px] text-blue-500 font-medium mt-1">
            Total {formatINR(stats.takeawayRevenue)}
          </div>
        </div>

        <div className={`p-4 rounded-2xl border ${cardSurface}`}>
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase text-[#64748B]">
            <span>Active / Ready Dispatch</span>
            <PackageCheck className="w-4 h-4 text-[#C46B4E]" />
          </div>
          <div className={`text-xl font-bold mt-2 ${headingText}`}>
            {stats.activeCount}
            <span className="text-xs font-medium text-[#64748B] ml-1.5">in queue</span>
          </div>
          <div className="text-[11px] text-[#C46B4E] font-medium mt-1">
            {stats.readyCount} ready for rider / pickup
          </div>
        </div>

        <div className={`p-4 rounded-2xl border ${cardSurface}`}>
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase text-[#64748B]">
            <span>Pending Collection</span>
            <Wallet className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-bold mt-2 text-amber-500">
            {formatINR(stats.unpaidAmount)}
          </div>
          <div className={`text-[11px] mt-1 ${mutedText}`}>
            {stats.unpaidCount} unpaid COD / pickup bill(s)
          </div>
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div
        className={`p-4 rounded-2xl border flex flex-col lg:flex-row lg:items-center justify-between gap-3 ${cardSurface}`}
      >
        <div className="flex items-center gap-2 flex-wrap">
          {(
            [
              { id: "all", label: `All (${stats.totalCount})` },
              { id: "delivery", label: `Delivery (${stats.deliveryCount})` },
              { id: "takeaway", label: `Takeaway (${stats.takeawayCount})` },
            ] as const
          ).map((ch) => (
            <button
              key={ch.id}
              type="button"
              onClick={() => setChannelFilter(ch.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                channelFilter === ch.id
                  ? "bg-[#C46B4E] text-white"
                  : subSurface + " " + mutedText
              }`}
            >
              {ch.label}
            </button>
          ))}

          <span className="mx-1 text-[#64748B] hidden sm:inline">|</span>

          {(
            [
              { id: "all", label: "All Status" },
              { id: "active", label: "Active" },
              { id: "ready", label: "Ready" },
              { id: "completed", label: "Dispatched / Done" },
            ] as const
          ).map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => setStatusFilter(st.id)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                statusFilter === st.id
                  ? isDarkMode
                    ? "bg-[#252938] text-white"
                    : "bg-[#E9E3D8] text-[#20252B]"
                  : mutedText
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[240px] lg:w-80">
          <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search order #, item, rider or address..."
            className={`w-full pl-9 pr-4 py-2 rounded-xl text-xs border outline-hidden ${
              isDarkMode
                ? "bg-[#191c27] border-[#252938] text-white placeholder-slate-500"
                : "bg-[#F7F5F0] border-[#E5E1D9] text-[#20252B] placeholder-[#64748B]"
            }`}
          />
        </div>
      </div>

      {/* Delivery & Takeaway Orders Detail Cards */}
      {filteredOrders.length === 0 ? (
        <div className={`p-10 rounded-2xl border text-center space-y-3 ${cardSurface}`}>
          <Truck className="w-10 h-10 text-[#64748B] mx-auto opacity-60" />
          <h3 className={`text-base font-bold ${headingText}`}>No Delivery or Takeaway Orders Match</h3>
          <p className={`text-xs max-w-md mx-auto ${mutedText}`}>
            Orders placed as Delivery or Takeaway from Point of Sale will appear here automatically with full item details, rider notes, and dispatch controls.
          </p>
          <div className="flex items-center justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => onStartNewOrder("delivery")}
              className="px-4 py-2 rounded-xl bg-[#C46B4E] hover:bg-[#B25C40] text-white text-xs font-semibold cursor-pointer"
            >
              Create Delivery Order
            </button>
            <button
              type="button"
              onClick={() => onStartNewOrder("takeaway")}
              className={`px-4 py-2 rounded-xl border text-xs font-semibold cursor-pointer ${subSurface} ${headingText}`}
            >
              Create Takeaway Order
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredOrders.map((o) => {
            const isDelivery = String(o.order_type || "").toLowerCase().trim() === "delivery"
            const isPaid = String(o.payment_status || "").toUpperCase() === "PAID"
            const isClosed = String(o.status || "").toUpperCase() === "CLOSED"
            const total = Number(o.total_amount || 0)
            const tax = Number(o.tax_amount || 0)
            const subtotal = Math.max(0, total - tax)

            const hasKitchen = (o.order_items || []).some(
              (it) => !isBarItem(it.MenuItem?.name || it.name || "")
            )
            const hasBar = (o.order_items || []).some((it) =>
              isBarItem(it.MenuItem?.name || it.name || "")
            )
            const kStage =
              o.kitchen_stage ||
              o.kds_stage ||
              (isClosed ? "completed" : o.status === "READY" ? "ready" : o.status === "PREPARING" ? "preparing" : "new")
            const bStage =
              o.bar_stage ||
              o.kds_stage ||
              (isClosed ? "completed" : o.status === "READY" ? "ready" : o.status === "PREPARING" ? "preparing" : "new")

            const orderNumDigits = o.order_number?.replace(/\D/g, "") || o.id.slice(-4)

            return (
              <div
                key={o.id}
                className={`p-5 rounded-2xl border flex flex-col justify-between gap-4 ${cardSurface}`}
              >
                {/* Card Top Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isDelivery
                          ? "bg-blue-500/15 text-blue-500 border border-blue-500/30"
                          : "bg-blue-500/15 text-blue-500 border border-blue-500/30"
                      }`}
                    >
                      {isDelivery ? <Bike className="w-5 h-5" /> : <ShoppingBag className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-base font-bold ${headingText}`}>{o.order_number}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            isDelivery
                              ? "bg-blue-500/15 text-blue-500 border border-blue-500/30"
                              : "bg-blue-500/15 text-blue-500 border border-blue-500/30"
                          }`}
                        >
                          {isDelivery ? "Delivery" : "Takeaway"}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            isClosed
                              ? "bg-slate-500/15 text-slate-400"
                              : o.status === "READY"
                              ? "bg-blue-500/20 text-blue-400"
                              : "bg-amber-500/20 text-amber-400"
                          }`}
                        >
                          {isClosed ? (isDelivery ? "Delivered" : "Picked Up") : o.status}
                        </span>
                      </div>
                      <div className={`text-[11px] mt-1 flex items-center gap-2 ${mutedText}`}>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(o.created_at).toLocaleString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <span>· {formatTimeAgo(o.created_at)}</span>
                        <span>· Source: {o.source?.toUpperCase()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Toggle Pill */}
                  <button
                    type="button"
                    onClick={() => onUpdatePaymentStatus(o.id, isPaid ? "UNPAID" : "PAID")}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
                      isPaid
                        ? "bg-blue-500/15 text-blue-500 border border-blue-500/30"
                        : "bg-amber-500/15 text-amber-500 border border-amber-500/30"
                    }`}
                    title="Click to toggle Paid/Unpaid"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isPaid ? "bg-blue-500" : "bg-amber-500"}`} />
                    {isPaid ? "Paid" : "Unpaid"}
                  </button>
                </div>

                {/* Itemized Order Details */}
                <div className={`p-3.5 rounded-xl border space-y-2 ${subSurface}`}>
                  <div className="flex items-center justify-between text-[11px] font-semibold text-[#64748B]">
                    <span>ORDER ITEMS ({o.order_items?.length || 0})</span>
                    <span>SUBTOTAL {formatINR(subtotal)} + TAX {formatINR(tax)}</span>
                  </div>
                  <div className="divide-y divide-[#E5E1D9] dark:divide-[#252938]">
                    {(o.order_items || []).map((it) => {
                      const itemName = it.MenuItem?.name || it.name || "Item"
                      const lineTotal = Number(it.unit_price || 0) * Number(it.quantity || 1)
                      return (
                        <div key={it.id} className="py-1.5 flex items-center justify-between gap-2 text-xs">
                          <div className="min-w-0">
                            <span className="font-bold text-[#C46B4E] mr-1.5">{it.quantity}x</span>
                            <span className={`font-semibold ${headingText}`}>{itemName}</span>
                            {it.special_instructions && (
                              <span className="ml-2 text-[10px] text-amber-500">({it.special_instructions})</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] uppercase text-[#64748B]">{it.station || "kitchen"}</span>
                            <span className={`font-bold ${headingText}`}>
                              {lineTotal > 0 ? formatINR(lineTotal) : "—"}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="pt-2 border-t border-[#E5E1D9] dark:border-[#252938] flex items-center justify-between text-xs">
                    <span className={mutedText}>
                      Payment Method: <strong className={headingText}>{o.payment_method}</strong>
                    </span>
                    <span className="text-sm font-extrabold text-[#C46B4E]">
                      Total: {formatINR(total)}
                    </span>
                  </div>
                </div>

                {/* Delivery Address / Rider / Pickup Details */}
                <div className={`p-3 rounded-xl border text-xs ${subSurface}`}>
                  {editingNoteOrderId === o.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={noteDraft}
                        onChange={(e) => setNoteDraft(e.target.value)}
                        placeholder={
                          isDelivery
                            ? "e.g. Customer: Rahul (+91 98201...), Address, Rider: Suresh"
                            : "e.g. Pickup Guest: Priya (+91 98302...), Counter Bag #2"
                        }
                        className={`flex-1 px-3 py-1.5 rounded-lg border text-xs outline-hidden ${
                          isDarkMode ? "bg-[#14161f] border-[#2c3144] text-white" : "bg-white border-[#E5E1D9]"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveNote(o.id, o.order_number)}
                        className="px-2.5 py-1.5 rounded-lg bg-blue-600 text-white font-semibold cursor-pointer flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingNoteOrderId(null)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 min-w-0">
                        <MapPin className="w-3.5 h-3.5 text-[#C46B4E] shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <span className="font-semibold text-[11px] text-[#64748B] block">
                            {isDelivery ? "Delivery Address / Rider Info" : "Takeaway Pickup Details"}
                          </span>
                          <span className={`break-words ${o.notes ? headingText : mutedText}`}>
                            {o.notes || (isDelivery ? "No rider or address note added yet." : "Counter pickup — no guest note added.")}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingNoteOrderId(o.id)
                          setNoteDraft(o.notes || "")
                        }}
                        className="text-[11px] font-semibold text-[#C46B4E] hover:underline flex items-center gap-1 shrink-0 cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>{o.notes ? "Edit" : "Add Details"}</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Prep Status & Dispatch Action Footer */}
                <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
                  <div className="flex items-center gap-2 text-[11px]">
                    {hasKitchen && (
                      <span
                        className={`px-2 py-1 rounded-lg border font-semibold ${
                          kStage === "completed"
                            ? "bg-slate-500/10 border-slate-500/20 text-slate-400"
                            : kStage === "ready"
                            ? "bg-blue-500/15 border-blue-500/30 text-blue-500"
                            : "bg-amber-500/15 border-amber-500/30 text-amber-500"
                        }`}
                      >
                        Kitchen: {kStage}
                      </span>
                    )}
                    {hasBar && (
                      <span
                        className={`px-2 py-1 rounded-lg border font-semibold ${
                          bStage === "completed"
                            ? "bg-slate-500/10 border-slate-500/20 text-slate-400"
                            : bStage === "ready"
                            ? "bg-blue-500/15 border-blue-500/30 text-blue-500"
                            : "bg-cyan-500/15 border-cyan-500/30 text-cyan-500"
                        }`}
                      >
                        Bar: {bStage}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {hasKitchen && kStage !== "completed" && (
                      <button
                        type="button"
                        onClick={() => onAdvanceKdsTicket(`T-${orderNumDigits}-K`)}
                        className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1 cursor-pointer ${subSurface} ${headingText}`}
                      >
                        <ChefHat className="w-3.5 h-3.5 text-blue-400" />
                        <span>Advance Kitchen</span>
                      </button>
                    )}
                    {!isClosed && (
                      <button
                        type="button"
                        onClick={() => handleMarkDispatched(o.id, o.order_number, isDelivery)}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        <PackageCheck className="w-3.5 h-3.5" />
                        <span>{isDelivery ? "Mark Delivered" : "Mark Picked Up"}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
