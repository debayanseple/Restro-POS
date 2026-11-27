"use client"

import React, { useEffect, useMemo, useState } from "react"
import {
  ArrowDownRight,
  ArrowUpRight,
  Boxes,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  FileSpreadsheet,
  Landmark,
  Percent,
  Plus,
  Receipt,
  Search,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react"
import { InventoryItem, StockMovement } from "@/lib/inventory-catalog"
import { TeamMember } from "@/lib/team-catalog"
import { DashboardOrder } from "@/components/AdminDashboard"
import { SectionContentSkeleton } from "@/components/ui/skeleton"

export interface ExpenseItem {
  id: string
  title: string
  category: string
  vendor: string
  amount: number
  gstIncluded: boolean
  paymentMode: string
  status: "Paid" | "Scheduled"
  date: string
  notes?: string
}

interface AccountingModuleProps {
  isDarkMode: boolean
  orders: DashboardOrder[]
  inventoryItems: InventoryItem[]
  stockMovements: StockMovement[]
  teamMembers: TeamMember[]
  onUpdateOrderPaymentStatus: (orderId: string, status: "PAID" | "UNPAID") => Promise<void> | void
  onNavigateTab: (tab: string) => void
}

function formatINR(val: number, decimals = 2): string {
  const safe = isNaN(val) ? 0 : val
  return `₹${safe.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`
}

export function AccountingModule({
  isDarkMode,
  orders,
  inventoryItems,
  stockMovements,
  teamMembers,
  onUpdateOrderPaymentStatus,
  onNavigateTab,
}: AccountingModuleProps) {
  const [subTab, setSubTab] = useState<"overview" | "ledger" | "inventory" | "expenses">("overview")
  const [period, setPeriod] = useState<"today" | "7d" | "month" | "all">("all")
  const [ledgerFilter, setLedgerFilter] = useState<"all" | "paid" | "unsettled">("all")
  const [ledgerSearch, setLedgerSearch] = useState("")

  // Expenses state backed by /api/expenses
  const [expenses, setExpenses] = useState<ExpenseItem[]>([])
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(true)
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [isSavingExpense, setIsSavingExpense] = useState(false)
  const [acctToast, setAcctToast] = useState<string | null>(null)

  // Add Expense form
  const [expTitle, setExpTitle] = useState("")
  const [expCategory, setExpCategory] = useState("Vendor Procurement")
  const [expVendor, setExpVendor] = useState("")
  const [expAmount, setExpAmount] = useState("")
  const [expPaymentMode, setExpPaymentMode] = useState("UPI")
  const [expStatus, setExpStatus] = useState<"Paid" | "Scheduled">("Paid")
  const [expDate, setExpDate] = useState(() => new Date().toISOString().split("T")[0])
  const [expGstIncluded, setExpGstIncluded] = useState(true)
  const [expNotes, setExpNotes] = useState("")

  useEffect(() => {
    let active = true
    fetch("/api/expenses")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (active && Array.isArray(d?.expenses)) {
          setExpenses(d.expenses)
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setIsLoadingExpenses(false)
      })
    return () => {
      active = false
    }
  }, [])

  // Filter orders & expenses by period
  const periodMatches = (isoDate?: string) => {
    if (period === "all" || !isoDate) return true
    const datePart = isoDate.slice(0, 10)
    const todayStr = new Date().toISOString().slice(0, 10)
    if (period === "today") return datePart === todayStr
    if (period === "month") return datePart.slice(0, 7) === todayStr.slice(0, 7)
    const diff = Date.now() - new Date(isoDate).getTime()
    return !isNaN(diff) && diff <= 7 * 24 * 60 * 60 * 1000
  }

  const scopedOrders = useMemo(
    () => orders.filter((o) => periodMatches(o.created_at)),
    [orders, period]
  )
  const scopedExpenses = useMemo(
    () => expenses.filter((e) => periodMatches(e.date)),
    [expenses, period]
  )
  const scopedMovements = useMemo(
    () => stockMovements.filter((m) => periodMatches(m.date)),
    [stockMovements, period]
  )

  // Compute complete Financial & GST Numbers
  const financials = useMemo(() => {
    let grossBilled = 0
    let gstTotal = 0
    let discounts = 0
    let paidTotal = 0
    let pendingTotal = 0
    let unpaidTotal = 0
    let paidCount = 0
    let unsettledCount = 0

    const methodTotals: Record<string, number> = {
      CASH: 0,
      UPI: 0,
      CARD: 0,
      MANUAL: 0,
    }

    for (const o of scopedOrders) {
      const total = Number(o.total_amount || 0)
      const tax = Number(o.tax_amount || 0) > 0 ? Number(o.tax_amount) : total - total / 1.05
      const disc = Number(o.discount_amount || 0)

      grossBilled += total
      gstTotal += tax
      discounts += disc

      const ps = String(o.payment_status || "").toUpperCase()
      if (ps === "PAID") {
        paidTotal += total
        paidCount++
      } else if (ps === "PENDING") {
        pendingTotal += total
        unsettledCount++
      } else {
        unpaidTotal += total
        unsettledCount++
      }

      const pm = String(o.payment_method || "MANUAL").toUpperCase()
      methodTotals[pm] = (methodTotals[pm] || 0) + total
    }

    const netTaxableSales = Math.max(0, grossBilled - gstTotal)
    const cgst = gstTotal / 2
    const sgst = gstTotal / 2

    // Inventory asset & COGS from stock movements matched against item unit cost
    const costLookup = new Map<string, number>()
    let inventoryAssetValue = 0
    for (const item of inventoryItems) {
      costLookup.set(item.id, item.costPerUnit)
      inventoryAssetValue += item.currentStock * item.costPerUnit
    }

    let restockCost = 0
    let usageCogs = 0
    let wasteLoss = 0
    for (const m of scopedMovements) {
      const unitCost = costLookup.get(m.itemId) || 0
      const movVal = m.quantity * unitCost
      if (m.type === "RESTOCK") restockCost += movVal
      else if (m.type === "USAGE") usageCogs += movVal
      else if (m.type === "WASTE") wasteLoss += movVal
    }

    // Operating expenses
    let totalExpenses = 0
    let paidExpenses = 0
    let scheduledExpenses = 0
    const expByCategory = new Map<string, number>()

    for (const e of scopedExpenses) {
      const amt = Number(e.amount || 0)
      totalExpenses += amt
      if (e.status === "Paid") paidExpenses += amt
      else scheduledExpenses += amt
      expByCategory.set(e.category, (expByCategory.get(e.category) || 0) + amt)
    }

    const combinedOutflow = totalExpenses + usageCogs + wasteLoss
    const netProfit = netTaxableSales - combinedOutflow
    const profitMarginPct = netTaxableSales > 0 ? (netProfit / netTaxableSales) * 100 : 0

    // Group daily cashflow bars (Revenue vs Outflow)
    const dayMap = new Map<string, { key: string; label: string; revenue: number; expense: number }>()
    for (const o of scopedOrders) {
      const k = (o.created_at || "").slice(0, 10)
      if (!k) continue
      const label = new Date(k + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
      const cur = dayMap.get(k) || { key: k, label, revenue: 0, expense: 0 }
      cur.revenue += Number(o.total_amount || 0)
      dayMap.set(k, cur)
    }
    for (const e of scopedExpenses) {
      const k = (e.date || "").slice(0, 10)
      if (!k) continue
      const label = new Date(k + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
      const cur = dayMap.get(k) || { key: k, label, revenue: 0, expense: 0 }
      cur.expense += Number(e.amount || 0)
      dayMap.set(k, cur)
    }
    const cashflowTimeline = Array.from(dayMap.values())
      .sort((a, b) => a.key.localeCompare(b.key))
      .slice(-8)

    return {
      grossBilled,
      netTaxableSales,
      gstTotal,
      cgst,
      sgst,
      discounts,
      paidTotal,
      receivablesTotal: pendingTotal + unpaidTotal,
      pendingTotal,
      unpaidTotal,
      paidCount,
      unsettledCount,
      methodTotals,
      inventoryAssetValue,
      restockCost,
      usageCogs,
      wasteLoss,
      totalExpenses,
      paidExpenses,
      scheduledExpenses,
      combinedOutflow,
      netProfit,
      profitMarginPct,
      expByCategory: Array.from(expByCategory.entries())
        .map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount),
      cashflowTimeline,
    }
  }, [scopedOrders, scopedExpenses, scopedMovements, inventoryItems])

  // Filtered Sales Ledger
  const filteredLedgerOrders = useMemo(() => {
    return scopedOrders.filter((o) => {
      const ps = String(o.payment_status || "").toUpperCase()
      const matchesStatus =
        ledgerFilter === "all" ||
        (ledgerFilter === "paid" && ps === "PAID") ||
        (ledgerFilter === "unsettled" && ps !== "PAID")

      const q = ledgerSearch.trim().toLowerCase()
      const matchesSearch =
        !q ||
        o.order_number.toLowerCase().includes(q) ||
        (o.table_id && o.table_id.toLowerCase().includes(q)) ||
        o.payment_method.toLowerCase().includes(q) ||
        o.source.toLowerCase().includes(q)

      return matchesStatus && matchesSearch
    })
  }, [scopedOrders, ledgerFilter, ledgerSearch])

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!expTitle.trim() || !expAmount || Number(expAmount) <= 0) {
      alert("Please enter a valid expense description and amount.")
      return
    }
    setIsSavingExpense(true)
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: expTitle.trim(),
          category: expCategory,
          vendor: expVendor.trim() || "General Vendor",
          amount: Number(expAmount),
          gstIncluded: expGstIncluded,
          paymentMode: expPaymentMode,
          status: expStatus,
          date: expDate,
          notes: expNotes.trim() || undefined,
        }),
      })
      if (res.ok) {
        const d = await res.json()
        if (Array.isArray(d.expenses)) setExpenses(d.expenses)
        setExpTitle("")
        setExpVendor("")
        setExpAmount("")
        setExpNotes("")
        setShowExpenseModal(false)
        setAcctToast("Expense entry recorded in financial ledger.")
        setTimeout(() => setAcctToast(null), 4000)
      }
    } finally {
      setIsSavingExpense(false)
    }
  }

  const handleDeleteExpense = async (id: string, title: string) => {
    if (!confirm(`Delete expense entry "${title}"?`)) return
    try {
      const res = await fetch(`/api/expenses?id=${id}`, { method: "DELETE" })
      if (res.ok) {
        const d = await res.json()
        if (Array.isArray(d.expenses)) setExpenses(d.expenses)
        setAcctToast(`Removed expense "${title}".`)
        setTimeout(() => setAcctToast(null), 3500)
      }
    } catch {}
  }

  const handleExportCsv = () => {
    const headers = [
      "Order Number",
      "Date",
      "Table / Channel",
      "Source",
      "Subtotal (INR)",
      "CGST 2.5% (INR)",
      "SGST 2.5% (INR)",
      "Total (INR)",
      "Payment Method",
      "Payment Status",
    ]
    const rows = scopedOrders.map((o) => {
      const total = Number(o.total_amount || 0)
      const tax = Number(o.tax_amount || 0) > 0 ? Number(o.tax_amount) : total - total / 1.05
      const sub = Math.max(0, total - tax)
      return [
        o.order_number,
        (o.created_at || "").slice(0, 19).replace("T", " "),
        o.table_id || o.order_type,
        o.source,
        sub.toFixed(2),
        (tax / 2).toFixed(2),
        (tax / 2).toFixed(2),
        total.toFixed(2),
        o.payment_method,
        o.payment_status,
      ].join(",")
    })
    const csv = [headers.join(","), ...rows].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `nodedr-bistro-accounting-${period}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setAcctToast("Exported GST & Sales Ledger CSV.")
    setTimeout(() => setAcctToast(null), 3500)
  }

  const cardSurface = isDarkMode
    ? "bg-[#14161f] border-[#202330]"
    : "bg-white border-[#E5E1D9] shadow-2xs"

  if (isLoadingExpenses) {
    return <SectionContentSkeleton tab="accounting" isDarkMode={isDarkMode} />
  }
  const subSurface = isDarkMode ? "bg-[#191c27] border-[#252938]" : "bg-[#F7F5F0] border-[#E5E1D9]"
  const headingText = isDarkMode ? "text-white" : "text-[#20252B]"
  const mutedText = isDarkMode ? "text-slate-400" : "text-[#64748B]"

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto pb-8">
      {/* Toast Notification */}
      {acctToast && (
        <div className="p-3.5 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-500 text-xs font-semibold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{acctToast}</span>
          </div>
          <button type="button" onClick={() => setAcctToast(null)} className="cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C46B4E]/15 border border-[#C46B4E]/30 flex items-center justify-center text-[#C46B4E] shrink-0">
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <h1 className={`text-2xl lg:text-3xl font-bold tracking-tight ${headingText}`}>
              Accounting & Financial Ledger
            </h1>
            <p className={`text-xs sm:text-sm mt-0.5 ${mutedText}`}>
              Live Profit & Loss, GST (CGST 2.5% + SGST 2.5%), receivables settlement, inventory COGS & vendor payouts.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Period Filter */}
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
                  period === p.id
                    ? "bg-[#C46B4E] text-white"
                    : mutedText
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleExportCsv}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 cursor-pointer ${
              isDarkMode
                ? "bg-[#14161f] border-[#242838] text-slate-200 hover:bg-[#1e2230]"
                : "bg-white border-[#E5E1D9] text-[#20252B] hover:bg-[#F7F5F0]"
            }`}
          >
            <Download className="w-3.5 h-3.5 text-[#C46B4E]" />
            <span>Export GST CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setShowExpenseModal(true)}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#C46B4E] hover:bg-[#B25C40] text-white transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Record Expense</span>
          </button>
        </div>
      </div>

      {/* Top Financial KPIs (5 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Gross Sales */}
        <div className={`p-4 rounded-2xl border ${cardSurface}`}>
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase text-[#64748B]">
            <span>Gross Revenue</span>
            <Receipt className="w-4 h-4 text-[#C46B4E]" />
          </div>
          <div className={`text-xl font-bold mt-2 ${headingText}`}>
            {formatINR(financials.grossBilled)}
          </div>
          <div className={`text-[11px] mt-1 ${mutedText}`}>
            Net Sales {formatINR(financials.netTaxableSales)} ({scopedOrders.length} bills)
          </div>
        </div>

        {/* Collected vs Receivables */}
        <div className={`p-4 rounded-2xl border ${cardSurface}`}>
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase text-[#64748B]">
            <span>Collected vs Due</span>
            <Wallet className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl font-bold mt-2 text-blue-500">
            {formatINR(financials.paidTotal)}
          </div>
          <div className="text-[11px] mt-1 text-amber-500 font-medium">
            {formatINR(financials.receivablesTotal)} due ({financials.unsettledCount} unsettled)
          </div>
        </div>

        {/* GST Liability */}
        <div className={`p-4 rounded-2xl border ${cardSurface}`}>
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase text-[#64748B]">
            <span>Output GST (5%)</span>
            <Percent className="w-4 h-4 text-blue-500" />
          </div>
          <div className={`text-xl font-bold mt-2 ${headingText}`}>
            {formatINR(financials.gstTotal)}
          </div>
          <div className={`text-[11px] mt-1 ${mutedText}`}>
            CGST {formatINR(financials.cgst)} · SGST {formatINR(financials.sgst)}
          </div>
        </div>

        {/* Operating Expenses + COGS */}
        <div className={`p-4 rounded-2xl border ${cardSurface}`}>
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase text-[#64748B]">
            <span>Expenses & COGS</span>
            <ArrowDownRight className="w-4 h-4 text-rose-500" />
          </div>
          <div className={`text-xl font-bold mt-2 ${headingText}`}>
            {formatINR(financials.combinedOutflow)}
          </div>
          <div className={`text-[11px] mt-1 ${mutedText}`}>
            Ops {formatINR(financials.totalExpenses, 0)} · Stock {formatINR(financials.usageCogs + financials.wasteLoss, 0)}
          </div>
        </div>

        {/* Net Margin / Profit */}
        <div className={`p-4 rounded-2xl border ${cardSurface}`}>
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase text-[#64748B]">
            <span>Net Operating Result</span>
            {financials.netProfit >= 0 ? (
              <TrendingUp className="w-4 h-4 text-blue-500" />
            ) : (
              <TrendingDown className="w-4 h-4 text-rose-500" />
            )}
          </div>
          <div
            className={`text-xl font-bold mt-2 ${
              financials.netProfit >= 0 ? "text-blue-500" : "text-rose-500"
            }`}
          >
            {financials.netProfit >= 0 ? "+" : ""}
            {formatINR(financials.netProfit)}
          </div>
          <div className={`text-[11px] mt-1 ${mutedText}`}>
            Margin {financials.profitMarginPct.toFixed(1)}% · Asset {formatINR(financials.inventoryAssetValue, 0)}
          </div>
        </div>
      </div>

      {/* Sub-Navigation Pills */}
      <div className="flex items-center gap-2 flex-wrap border-b pb-3 border-[#E5E1D9] dark:border-[#202330]">
        {(
          [
            { id: "overview", label: "P&L Statement & Tax Summary" },
            { id: "ledger", label: `Sales Ledger & Invoices (${scopedOrders.length})` },
            { id: "inventory", label: "Inventory Asset & COGS" },
            { id: "expenses", label: `Expenses & Payouts (${scopedExpenses.length})` },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSubTab(t.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              subTab === t.id
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

      {/* TAB 1: OVERVIEW, P&L STATEMENT, CASHFLOW BAR CHART & TAX */}
      {subTab === "overview" && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Structured P&L Statement */}
            <div className={`lg:col-span-7 p-5 rounded-2xl border ${cardSurface}`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className={`text-sm font-bold flex items-center gap-2 ${headingText}`}>
                    <FileSpreadsheet className="w-4 h-4 text-[#C46B4E]" />
                    <span>Profit & Loss Statement (INR)</span>
                  </h2>
                  <p className={`text-xs mt-0.5 ${mutedText}`}>
                    Live accrual calculation from POS/QR orders, stock consumption & recorded expenses
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#C46B4E]/15 text-[#C46B4E] uppercase">
                  FY 2026-27
                </span>
              </div>

              <div className="divide-y divide-[#E5E1D9] dark:divide-[#222636] text-xs">
                <div className="py-2.5 flex items-center justify-between">
                  <span className={mutedText}>Gross Food & Beverage Sales (Taxable Base)</span>
                  <span className={`font-semibold ${headingText}`}>{formatINR(financials.netTaxableSales + financials.discounts)}</span>
                </div>
                <div className="py-2.5 flex items-center justify-between">
                  <span className={mutedText}>Less: Promo & Staff Discounts</span>
                  <span className="font-semibold text-amber-500">-{formatINR(financials.discounts)}</span>
                </div>
                <div className="py-2.5 flex items-center justify-between">
                  <span className={`font-bold ${headingText}`}>Net Taxable Revenue</span>
                  <span className={`font-bold ${headingText}`}>{formatINR(financials.netTaxableSales)}</span>
                </div>
                <div className="py-2.5 flex items-center justify-between">
                  <span className={mutedText}>Add: Output GST Collected (CGST 2.5% + SGST 2.5%)</span>
                  <span className="font-semibold text-blue-500">+{formatINR(financials.gstTotal)}</span>
                </div>
                <div className={`py-2.5 px-2.5 rounded-lg my-1 flex items-center justify-between ${subSurface}`}>
                  <span className={`font-bold ${headingText}`}>Total Gross Billed Revenue</span>
                  <span className="font-bold text-[#C46B4E]">{formatINR(financials.grossBilled)}</span>
                </div>
                <div className="py-2.5 flex items-center justify-between">
                  <span className={mutedText}>Less: Raw Material Kitchen COGS (Usage Movements)</span>
                  <span className="font-semibold text-rose-500">-{formatINR(financials.usageCogs)}</span>
                </div>
                <div className="py-2.5 flex items-center justify-between">
                  <span className={mutedText}>Less: Inventory Spoilage & Waste Write-offs</span>
                  <span className="font-semibold text-rose-500">-{formatINR(financials.wasteLoss)}</span>
                </div>
                <div className="py-2.5 flex items-center justify-between">
                  <span className={mutedText}>Less: Operating Expenses (Rent, Utilities, Vendors, Packaging)</span>
                  <span className="font-semibold text-rose-500">-{formatINR(financials.totalExpenses)}</span>
                </div>
                <div className="pt-3 mt-1 flex items-center justify-between text-sm">
                  <span className={`font-bold ${headingText}`}>Net Operating Margin (Excl. GST)</span>
                  <span
                    className={`font-bold ${
                      financials.netProfit >= 0 ? "text-blue-500" : "text-rose-500"
                    }`}
                  >
                    {financials.netProfit >= 0 ? "+" : ""}
                    {formatINR(financials.netProfit)}
                  </span>
                </div>
              </div>
            </div>

            {/* GST Compliance & Payment Channels */}
            <div className="lg:col-span-5 space-y-5">
              {/* GST Summary Card */}
              <div className={`p-5 rounded-2xl border space-y-3 ${cardSurface}`}>
                <div className="flex items-center justify-between">
                  <h3 className={`text-sm font-bold ${headingText}`}>GST Tax Breakdown (SAC 996331)</h3>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/15 text-blue-500">
                    5% Restaurant Slab
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className={`p-3 rounded-xl border ${subSurface}`}>
                    <div className="text-[10px] font-semibold text-[#64748B] uppercase">CGST (2.5%)</div>
                    <div className={`text-base font-bold mt-1 ${headingText}`}>{formatINR(financials.cgst)}</div>
                  </div>
                  <div className={`p-3 rounded-xl border ${subSurface}`}>
                    <div className="text-[10px] font-semibold text-[#64748B] uppercase">SGST (2.5%)</div>
                    <div className={`text-base font-bold mt-1 ${headingText}`}>{formatINR(financials.sgst)}</div>
                  </div>
                </div>
                <div className={`text-[11px] flex items-center justify-between pt-1 ${mutedText}`}>
                  <span>Total Output Tax Payable</span>
                  <strong className={headingText}>{formatINR(financials.gstTotal)}</strong>
                </div>
              </div>

              {/* Payment Mode & Settlement Split */}
              <div className={`p-5 rounded-2xl border space-y-3 ${cardSurface}`}>
                <h3 className={`text-sm font-bold flex items-center gap-2 ${headingText}`}>
                  <CreditCard className="w-4 h-4 text-[#C46B4E]" />
                  <span>Collections by Payment Method</span>
                </h3>
                <div className="space-y-2.5">
                  {Object.entries(financials.methodTotals)
                    .filter(([, amt]) => amt > 0)
                    .map(([method, amt]) => {
                      const pct = financials.grossBilled > 0 ? Math.round((amt / financials.grossBilled) * 100) : 0
                      return (
                        <div key={method} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className={`font-semibold ${headingText}`}>{method}</span>
                            <span className={mutedText}>
                              <strong className={headingText}>{formatINR(amt)}</strong> ({pct}%)
                            </span>
                          </div>
                          <div className={`h-2 rounded-full overflow-hidden ${isDarkMode ? "bg-[#1e2230]" : "bg-[#EFECE6]"}`}>
                            <div
                              className="h-full rounded-full bg-[#C46B4E]"
                              style={{ width: `${Math.max(4, pct)}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>
            </div>
          </div>

          {/* Cashflow Comparison & Expense Breakdown Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Revenue vs Outflow Bar Chart */}
            <div className={`lg:col-span-7 p-5 rounded-2xl border ${cardSurface}`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className={`text-sm font-bold ${headingText}`}>Revenue vs Recorded Expenses Timeline</h3>
                  <p className={`text-xs mt-0.5 ${mutedText}`}>Daily comparison across billed sales and outflows</p>
                </div>
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-xs bg-blue-500" />
                    <span className={mutedText}>Revenue</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-xs bg-rose-500" />
                    <span className={mutedText}>Expenses</span>
                  </span>
                </div>
              </div>

              {financials.cashflowTimeline.length === 0 ? (
                <p className={`text-xs ${mutedText}`}>No cashflow entries in selected range.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3 items-end pt-4">
                  {(() => {
                    const maxVal = Math.max(
                      1000,
                      ...financials.cashflowTimeline.map((d) => Math.max(d.revenue, d.expense))
                    )
                    return financials.cashflowTimeline.map((d) => {
                      const revPct = Math.max(4, Math.round((d.revenue / maxVal) * 100))
                      const expPct = Math.max(d.expense > 0 ? 4 : 0, Math.round((d.expense / maxVal) * 100))
                      return (
                        <div key={d.key} className="flex flex-col items-center gap-2">
                          <div className="h-32 w-full flex items-end justify-center gap-1.5 px-1">
                            <div
                              className="w-3.5 rounded-t-md bg-blue-500 transition-all duration-300"
                              style={{ height: `${revPct}%` }}
                              title={`Revenue (${d.label}): ${formatINR(d.revenue)}`}
                            />
                            <div
                              className="w-3.5 rounded-t-md bg-rose-500 transition-all duration-300"
                              style={{ height: `${expPct}%` }}
                              title={`Expenses (${d.label}): ${formatINR(d.expense)}`}
                            />
                          </div>
                          <div className="text-center">
                            <div className={`text-[10px] font-bold ${headingText}`}>{d.label}</div>
                            <div className="text-[9px] text-blue-500">{formatINR(d.revenue, 0)}</div>
                          </div>
                        </div>
                      )
                    })
                  })()}
                </div>
              )}
            </div>

            {/* Expense Category Breakdown */}
            <div className={`lg:col-span-5 p-5 rounded-2xl border ${cardSurface}`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className={`text-sm font-bold ${headingText}`}>Expense Mix by Category</h3>
                  <p className={`text-xs mt-0.5 ${mutedText}`}>
                    Paid {formatINR(financials.paidExpenses, 0)} · Scheduled {formatINR(financials.scheduledExpenses, 0)}
                  </p>
                </div>
                <span className="text-xs font-bold text-[#C46B4E]">{formatINR(financials.totalExpenses, 0)}</span>
              </div>

              <div className="space-y-3">
                {financials.expByCategory.map((cat) => {
                  const pct =
                    financials.totalExpenses > 0 ? Math.round((cat.amount / financials.totalExpenses) * 100) : 0
                  return (
                    <div key={cat.category} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className={`font-semibold ${headingText}`}>{cat.category}</span>
                        <span className={mutedText}>
                          <strong className={headingText}>{formatINR(cat.amount, 0)}</strong> ({pct}%)
                        </span>
                      </div>
                      <div className={`h-2 rounded-full overflow-hidden ${isDarkMode ? "bg-[#1e2230]" : "bg-[#EFECE6]"}`}>
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#C46B4E] to-rose-500"
                          style={{ width: `${Math.max(4, pct)}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SALES LEDGER & RECEIVABLES SETTLEMENT */}
      {subTab === "ledger" && (
        <div className={`rounded-2xl border overflow-hidden ${cardSurface}`}>
          <div className="p-4 border-b border-[#E5E1D9] dark:border-[#202330] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={ledgerSearch}
                onChange={(e) => setLedgerSearch(e.target.value)}
                placeholder="Search invoice #, table, payment method..."
                className={`w-full pl-9 pr-4 py-2 rounded-xl text-xs border outline-hidden ${
                  isDarkMode
                    ? "bg-[#191c27] border-[#252938] text-white placeholder-slate-500"
                    : "bg-[#F7F5F0] border-[#E5E1D9] text-[#20252B] placeholder-[#64748B]"
                }`}
              />
            </div>

            <div className="flex items-center gap-1.5">
              {(
                [
                  { id: "all", label: `All (${scopedOrders.length})` },
                  { id: "paid", label: `Paid (${financials.paidCount})` },
                  { id: "unsettled", label: `Pending / Unpaid (${financials.unsettledCount})` },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setLedgerFilter(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    ledgerFilter === f.id
                      ? "bg-[#C46B4E] text-white"
                      : subSurface + " " + mutedText
                  }`}
                >
                  {f.label}
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
                  <th className="py-3 px-4 font-semibold">Invoice #</th>
                  <th className="py-3 px-4 font-semibold">Date & Time</th>
                  <th className="py-3 px-4 font-semibold">Table / Source</th>
                  <th className="py-3 px-4 font-semibold text-right">Subtotal</th>
                  <th className="py-3 px-4 font-semibold text-right">GST (5%)</th>
                  <th className="py-3 px-4 font-semibold text-right">Total</th>
                  <th className="py-3 px-4 font-semibold">Method</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Settlement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E1D9] dark:divide-[#202330]">
                {filteredLedgerOrders.map((o) => {
                  const total = Number(o.total_amount || 0)
                  const tax = Number(o.tax_amount || 0) > 0 ? Number(o.tax_amount) : total - total / 1.05
                  const sub = Math.max(0, total - tax)
                  const isPaid = String(o.payment_status || "").toUpperCase() === "PAID"
                  return (
                    <tr
                      key={o.id}
                      className={isDarkMode ? "hover:bg-[#191c27]" : "hover:bg-[#F7F5F0]/70"}
                    >
                      <td className={`py-3 px-4 font-bold ${headingText}`}>{o.order_number}</td>
                      <td className={`py-3 px-4 ${mutedText}`}>
                        {new Date(o.created_at).toLocaleString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`font-medium ${headingText}`}>{o.table_id || o.order_type}</span>
                        <span className="ml-1.5 text-[10px] text-[#64748B]">({o.source})</span>
                      </td>
                      <td className={`py-3 px-4 text-right ${mutedText}`}>{formatINR(sub)}</td>
                      <td className="py-3 px-4 text-right text-blue-500">{formatINR(tax)}</td>
                      <td className={`py-3 px-4 text-right font-bold ${headingText}`}>{formatINR(total)}</td>
                      <td className={`py-3 px-4 ${mutedText}`}>{o.payment_method}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isPaid
                              ? "bg-blue-500/15 text-blue-500"
                              : "bg-amber-500/15 text-amber-500"
                          }`}
                        >
                          {o.payment_status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => onUpdateOrderPaymentStatus(o.id, isPaid ? "UNPAID" : "PAID")}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                            isPaid
                              ? "bg-slate-500/15 text-slate-400 hover:bg-slate-500/25"
                              : "bg-blue-600 hover:bg-blue-700 text-white"
                          }`}
                        >
                          {isPaid ? "Mark Unpaid" : "Mark Paid"}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: INVENTORY ASSET BALANCE SHEET & COGS */}
      {subTab === "inventory" && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className={`p-4 rounded-2xl border ${cardSurface}`}>
              <span className="text-[11px] font-semibold uppercase text-[#64748B]">Closing Stock Value</span>
              <div className={`text-xl font-bold mt-1.5 ${headingText}`}>
                {formatINR(financials.inventoryAssetValue)}
              </div>
              <span className={`text-[11px] ${mutedText}`}>{inventoryItems.length} raw material SKUs</span>
            </div>
            <div className={`p-4 rounded-2xl border ${cardSurface}`}>
              <span className="text-[11px] font-semibold uppercase text-[#64748B]">Purchases (RESTOCK)</span>
              <div className="text-xl font-bold mt-1.5 text-blue-500">
                {formatINR(financials.restockCost)}
              </div>
              <span className={`text-[11px] ${mutedText}`}>Inbound stock ledger</span>
            </div>
            <div className={`p-4 rounded-2xl border ${cardSurface}`}>
              <span className="text-[11px] font-semibold uppercase text-[#64748B]">Kitchen COGS (USAGE)</span>
              <div className="text-xl font-bold mt-1.5 text-blue-500">
                {formatINR(financials.usageCogs)}
              </div>
              <span className={`text-[11px] ${mutedText}`}>Consumed production value</span>
            </div>
            <div className={`p-4 rounded-2xl border ${cardSurface}`}>
              <span className="text-[11px] font-semibold uppercase text-[#64748B]">Spoilage / Waste Loss</span>
              <div className="text-xl font-bold mt-1.5 text-rose-500">
                {formatINR(financials.wasteLoss)}
              </div>
              <span className={`text-[11px] ${mutedText}`}>Write-off & expiry shrinkage</span>
            </div>
          </div>

          <div className={`rounded-2xl border overflow-hidden ${cardSurface}`}>
            <div className="p-4 border-b border-[#E5E1D9] dark:border-[#202330] flex items-center justify-between">
              <h3 className={`text-sm font-bold ${headingText}`}>Raw Material Stock Valuation Ledger</h3>
              <button
                type="button"
                onClick={() => onNavigateTab("inventory")}
                className="text-xs font-semibold text-[#C46B4E] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Open Inventory Control</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
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
                    <th className="py-3 px-4 font-semibold">Material</th>
                    <th className="py-3 px-4 font-semibold">Category</th>
                    <th className="py-3 px-4 font-semibold">Supplier</th>
                    <th className="py-3 px-4 font-semibold text-right">Stock Qty</th>
                    <th className="py-3 px-4 font-semibold text-right">Unit Cost</th>
                    <th className="py-3 px-4 font-semibold text-right">Holding Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E1D9] dark:divide-[#202330]">
                  {inventoryItems
                    .slice()
                    .sort((a, b) => b.currentStock * b.costPerUnit - a.currentStock * a.costPerUnit)
                    .map((it) => (
                      <tr key={it.id} className={isDarkMode ? "hover:bg-[#191c27]" : "hover:bg-[#F7F5F0]/70"}>
                        <td className={`py-2.5 px-4 font-bold ${headingText}`}>{it.name}</td>
                        <td className={`py-2.5 px-4 ${mutedText}`}>{it.category}</td>
                        <td className={`py-2.5 px-4 ${mutedText}`}>{it.supplier}</td>
                        <td className={`py-2.5 px-4 text-right ${headingText}`}>
                          {it.currentStock} {it.unit}
                        </td>
                        <td className={`py-2.5 px-4 text-right ${mutedText}`}>{formatINR(it.costPerUnit)}</td>
                        <td className="py-2.5 px-4 text-right font-bold text-[#C46B4E]">
                          {formatINR(it.currentStock * it.costPerUnit)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: EXPENSES & VENDOR PAYOUTS */}
      {subTab === "expenses" && (
        <div className={`rounded-2xl border overflow-hidden ${cardSurface}`}>
          <div className="p-4 border-b border-[#E5E1D9] dark:border-[#202330] flex items-center justify-between">
            <div>
              <h3 className={`text-sm font-bold ${headingText}`}>Operating Expenses & Vendor Payouts</h3>
              <p className={`text-xs ${mutedText}`}>
                Track rent, utilities, raw material invoices, payroll & packaging payouts ({teamMembers.length} active staff roster)
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowExpenseModal(true)}
              className="px-3 py-1.5 rounded-xl bg-[#C46B4E] hover:bg-[#B25C40] text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Expense</span>
            </button>
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
                  <th className="py-3 px-4 font-semibold">Date</th>
                  <th className="py-3 px-4 font-semibold">Description & Notes</th>
                  <th className="py-3 px-4 font-semibold">Category</th>
                  <th className="py-3 px-4 font-semibold">Vendor / Payee</th>
                  <th className="py-3 px-4 font-semibold">Mode & ITC</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Amount</th>
                  <th className="py-3 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E1D9] dark:divide-[#202330]">
                {scopedExpenses.map((ex) => (
                  <tr key={ex.id} className={isDarkMode ? "hover:bg-[#191c27]" : "hover:bg-[#F7F5F0]/70"}>
                    <td className={`py-3 px-4 ${mutedText}`}>{ex.date}</td>
                    <td className="py-3 px-4">
                      <div className={`font-bold ${headingText}`}>{ex.title}</div>
                      {ex.notes && <div className="text-[10px] text-[#64748B]">{ex.notes}</div>}
                    </td>
                    <td className={`py-3 px-4 ${mutedText}`}>{ex.category}</td>
                    <td className={`py-3 px-4 ${mutedText}`}>{ex.vendor}</td>
                    <td className="py-3 px-4">
                      <span className={mutedText}>{ex.paymentMode}</span>
                      {ex.gstIncluded && (
                        <span className="ml-1.5 px-1.5 py-0.2 rounded bg-blue-500/15 text-blue-500 text-[9px] font-bold">
                          GST ITC
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          ex.status === "Paid"
                            ? "bg-blue-500/15 text-blue-500"
                            : "bg-amber-500/15 text-amber-500"
                        }`}
                      >
                        {ex.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-rose-500">
                      -{formatINR(ex.amount)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteExpense(ex.id, ex.title)}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/15 transition cursor-pointer"
                        title="Delete Expense"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* RECORD EXPENSE MODAL */}
      {showExpenseModal && (
        <div
          onClick={() => setShowExpenseModal(false)}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleCreateExpense}
            className={`max-w-md w-full rounded-2xl p-6 border space-y-4 ${
              isDarkMode ? "bg-[#161822] border-[#272b3a]" : "bg-white border-[#E5E1D9] shadow-2xl"
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className={`text-base font-bold ${headingText}`}>Record Expense / Vendor Payout</h3>
              <button
                type="button"
                onClick={() => setShowExpenseModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className={`block font-semibold mb-1 ${headingText}`}>Expense Title *</label>
                <input
                  type="text"
                  required
                  value={expTitle}
                  onChange={(e) => setExpTitle(e.target.value)}
                  placeholder="e.g. Fresh Seafood & Poultry Invoice"
                  className={`w-full px-3 py-2 rounded-xl border outline-hidden ${
                    isDarkMode ? "bg-[#1e202c] border-[#2b2f3e] text-white" : "bg-[#F7F5F0] border-[#E5E1D9]"
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block font-semibold mb-1 ${headingText}`}>Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="0.01"
                    value={expAmount}
                    onChange={(e) => setExpAmount(e.target.value)}
                    placeholder="2500"
                    className={`w-full px-3 py-2 rounded-xl border outline-hidden ${
                      isDarkMode ? "bg-[#1e202c] border-[#2b2f3e] text-white" : "bg-[#F7F5F0] border-[#E5E1D9]"
                    }`}
                  />
                </div>
                <div>
                  <label className={`block font-semibold mb-1 ${headingText}`}>Date</label>
                  <input
                    type="date"
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border outline-hidden ${
                      isDarkMode ? "bg-[#1e202c] border-[#2b2f3e] text-white" : "bg-[#F7F5F0] border-[#E5E1D9]"
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block font-semibold mb-1 ${headingText}`}>Category</label>
                  <select
                    value={expCategory}
                    onChange={(e) => setExpCategory(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border outline-hidden ${
                      isDarkMode ? "bg-[#1e202c] border-[#2b2f3e] text-white" : "bg-[#F7F5F0] border-[#E5E1D9]"
                    }`}
                  >
                    <option value="Vendor Procurement">Vendor Procurement</option>
                    <option value="Staff Payroll">Staff Payroll</option>
                    <option value="Rent & Lease">Rent & Lease</option>
                    <option value="Utilities & Gas">Utilities & Gas</option>
                    <option value="Packaging & Delivery">Packaging & Delivery</option>
                    <option value="Maintenance & Misc">Maintenance & Misc</option>
                  </select>
                </div>
                <div>
                  <label className={`block font-semibold mb-1 ${headingText}`}>Payment Mode</label>
                  <select
                    value={expPaymentMode}
                    onChange={(e) => setExpPaymentMode(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border outline-hidden ${
                      isDarkMode ? "bg-[#1e202c] border-[#2b2f3e] text-white" : "bg-[#F7F5F0] border-[#E5E1D9]"
                    }`}
                  >
                    <option value="UPI">UPI</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cash">Cash</option>
                    <option value="Corporate Card">Corporate Card</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block font-semibold mb-1 ${headingText}`}>Vendor / Payee</label>
                  <input
                    type="text"
                    value={expVendor}
                    onChange={(e) => setExpVendor(e.target.value)}
                    placeholder="e.g. Prime Meats Co."
                    className={`w-full px-3 py-2 rounded-xl border outline-hidden ${
                      isDarkMode ? "bg-[#1e202c] border-[#2b2f3e] text-white" : "bg-[#F7F5F0] border-[#E5E1D9]"
                    }`}
                  />
                </div>
                <div>
                  <label className={`block font-semibold mb-1 ${headingText}`}>Status</label>
                  <select
                    value={expStatus}
                    onChange={(e) => setExpStatus(e.target.value as "Paid" | "Scheduled")}
                    className={`w-full px-3 py-2 rounded-xl border outline-hidden ${
                      isDarkMode ? "bg-[#1e202c] border-[#2b2f3e] text-white" : "bg-[#F7F5F0] border-[#E5E1D9]"
                    }`}
                  >
                    <option value="Paid">Paid</option>
                    <option value="Scheduled">Scheduled</option>
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={expGstIncluded}
                  onChange={(e) => setExpGstIncluded(e.target.checked)}
                  className="accent-[#C46B4E]"
                />
                <span className={mutedText}>Eligible for GST Input Tax Credit (ITC)</span>
              </label>

              <div>
                <label className={`block font-semibold mb-1 ${headingText}`}>Notes (Optional)</label>
                <input
                  type="text"
                  value={expNotes}
                  onChange={(e) => setExpNotes(e.target.value)}
                  placeholder="Invoice # or remarks"
                  className={`w-full px-3 py-2 rounded-xl border outline-hidden ${
                    isDarkMode ? "bg-[#1e202c] border-[#2b2f3e] text-white" : "bg-[#F7F5F0] border-[#E5E1D9]"
                  }`}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowExpenseModal(false)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold border cursor-pointer ${
                  isDarkMode ? "border-[#2b2f3e] text-slate-300" : "border-[#E5E1D9] text-[#64748B]"
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingExpense}
                className="px-4 py-2 rounded-xl bg-[#C46B4E] hover:bg-[#B25C40] text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                {isSavingExpense ? "Saving..." : "Save Expense"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
