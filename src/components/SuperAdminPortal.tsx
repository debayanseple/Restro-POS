"use client"

import React, { useEffect, useMemo, useState } from "react"
import {
  Building2,
  CreditCard,
  BarChart3,
  ShieldCheck,
  Settings,
  Plus,
  Search,
  CheckCircle2,
  X,
  Trash2,
  Download,
  Phone,
  Mail,
  Sparkles,
  Store,
  Calendar,
  Ban,
  Play,
  ArrowUpRight,
} from "lucide-react"
import type {
  AuditLogEntry,
  PlanTier,
  PlatformSettings,
  TenantAccount,
  TenantStatus,
} from "@/app/api/super-admin/route"
import type { DemoBookingRequest } from "@/app/api/contact/route"

interface SuperAdminPortalProps {
  activeTab: string
  isDarkMode: boolean
  onTabChange: (tab: string) => void
}

const PLAN_LIMITS: Record<PlanTier, string> = {
  Starter: "1 Outlet · Touch POS + QR Menu + Single KDS",
  Pro: "Up to 3 Outlets · Split Kitchen/Bar KDS + Floor + Inventory",
  Enterprise: "Unlimited Outlets · Multi-Branch Sync + Priority SLA",
}

export function SuperAdminPortal({
  activeTab,
  isDarkMode,
  onTabChange,
}: SuperAdminPortalProps) {
  const [tenants, setTenants] = useState<TenantAccount[]>([])
  const [demoRequests, setDemoRequests] = useState<DemoBookingRequest[]>([])
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings | null>(null)
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([])
  const [platformStats, setPlatformStats] = useState({ totalOrders: 0, totalGmv: 0 })
  const [isLoading, setIsLoading] = useState(true)

  // Filters
  const [tenantSearch, setTenantSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"All" | TenantStatus>("All")
  const [planFilter, setPlanFilter] = useState<"All" | PlanTier>("All")
  const [auditSearch, setAuditSearch] = useState("")
  const [auditCategoryFilter, setAuditCategoryFilter] = useState<string>("all")

  // Provision Tenant Modal
  const [showProvisionModal, setShowProvisionModal] = useState(false)
  const [provName, setProvName] = useState("")
  const [provOwner, setProvOwner] = useState("")
  const [provEmail, setProvEmail] = useState("")
  const [provPhone, setProvPhone] = useState("")
  const [provCity, setProvCity] = useState("")
  const [provPlan, setProvPlan] = useState<PlanTier>("Pro")
  const [provOutlets, setProvOutlets] = useState(1)
  const [provStatus, setProvStatus] = useState<TenantStatus>("Active")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Platform Settings draft
  const [settingsSavedMsg, setSettingsSavedMsg] = useState(false)

  const loadData = async () => {
    try {
      const res = await fetch("/api/super-admin")
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data.tenants)) setTenants(data.tenants)
        if (Array.isArray(data.demoRequests)) setDemoRequests(data.demoRequests)
        if (data.platformSettings) setPlatformSettings(data.platformSettings)
        if (Array.isArray(data.auditLogs)) setAuditLogs(data.auditLogs)
        if (data.platformStats) setPlatformStats(data.platformStats)
      }
    } catch (err) {
      console.error("Failed to load super admin data:", err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Computed metrics
  const activeCount = tenants.filter((t) => t.status === "Active").length
  const trialCount = tenants.filter((t) => t.status === "Trial").length
  const suspendedCount = tenants.filter((t) => t.status === "Suspended").length
  const totalOutlets = tenants.reduce((s, t) => s + (Number(t.outlets) || 1), 0)
  const totalMrr = tenants
    .filter((t) => t.status === "Active")
    .reduce((s, t) => s + (Number(t.monthlyPrice) || 0), 0)
  const newLeadsCount = demoRequests.filter((r) => r.status === "new").length

  const filteredTenants = useMemo(() => {
    const q = tenantSearch.toLowerCase().trim()
    return tenants.filter((t) => {
      if (statusFilter !== "All" && t.status !== statusFilter) return false
      if (planFilter !== "All" && t.plan !== planFilter) return false
      if (!q) return true
      return (
        t.name.toLowerCase().includes(q) ||
        t.ownerName.toLowerCase().includes(q) ||
        t.city.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q)
      )
    })
  }, [tenants, tenantSearch, statusFilter, planFilter])

  const filteredAuditLogs = useMemo(() => {
    const q = auditSearch.toLowerCase().trim()
    return auditLogs.filter((log) => {
      if (auditCategoryFilter !== "all" && log.category !== auditCategoryFilter) return false
      if (!q) return true
      return (
        log.action.toLowerCase().includes(q) ||
        log.target.toLowerCase().includes(q) ||
        log.actor.toLowerCase().includes(q)
      )
    })
  }, [auditLogs, auditSearch, auditCategoryFilter])

  const postSuperAdminAction = async (payload: Record<string, any>) => {
    const res = await fetch("/api/super-admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data.tenants)) setTenants(data.tenants)
      if (Array.isArray(data.demoRequests)) setDemoRequests(data.demoRequests)
      if (data.platformSettings) setPlatformSettings(data.platformSettings)
      if (Array.isArray(data.auditLogs)) setAuditLogs(data.auditLogs)
      return data
    }
    return null
  }

  const handleProvisionTenant = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!provName.trim() || isSubmitting) return
    setIsSubmitting(true)
    try {
      await postSuperAdminAction({
        action: "provision_tenant",
        name: provName,
        ownerName: provOwner || "Owner",
        email: provEmail,
        phone: provPhone,
        city: provCity || "Mumbai",
        plan: provPlan,
        outlets: provOutlets,
        status: provStatus,
      })
      setShowProvisionModal(false)
      setProvName("")
      setProvOwner("")
      setProvEmail("")
      setProvPhone("")
      setProvCity("")
      setProvPlan("Pro")
      setProvOutlets(1)
      setProvStatus("Active")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleConvertDemoToTrial = async (req: DemoBookingRequest) => {
    await postSuperAdminAction({
      action: "provision_tenant",
      name: req.restaurantName || `${req.name}'s Restaurant`,
      ownerName: req.name,
      email: req.email,
      phone: req.phone,
      city: "India",
      plan: "Pro",
      outlets: 1,
      status: "Trial",
    })
    await postSuperAdminAction({
      action: "update_demo_request",
      id: req.id,
      status: "completed",
    })
  }

  const handleExportAuditCsv = () => {
    const headers = ["Timestamp", "Actor", "Category", "Action", "Target"]
    const rows = filteredAuditLogs.map((l) => [
      new Date(l.timestamp).toLocaleString("en-IN"),
      l.actor,
      l.category,
      l.action,
      l.target,
    ])
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `restro-audit-logs-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const cardClass = isDarkMode
    ? "bg-[#14161f] border-[#202330]"
    : "bg-white border-slate-200 shadow-xs"
  const subCardClass = isDarkMode
    ? "bg-[#1a1c26] border-[#262938]"
    : "bg-slate-50 border-slate-200"
  const textMain = isDarkMode ? "text-white" : "text-slate-900"
  const textMuted = isDarkMode ? "text-slate-400" : "text-slate-500"
  const inputClass = isDarkMode
    ? "bg-[#1a1c26] border-[#2a2e3f] text-white placeholder-slate-500"
    : "bg-white border-slate-200 text-slate-900 placeholder-slate-400"

  if (isLoading) {
    return (
      <div className="max-w-[1440px] mx-auto py-12 text-center text-xs text-slate-400">
        Loading Super Admin platform data...
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto">
      {/* TAB 1: TENANT RESTAURANTS & DEMO LEADS */}
      {activeTab === "tenants" && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className={`text-3xl font-bold tracking-tight ${textMain}`}>
                Tenant Restaurants
              </h1>
              <p className={`text-sm mt-1 ${textMuted}`}>
                Multi-tenant accounts, subscription statuses, branch limits, and incoming demo leads
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowProvisionModal(true)}
              className="px-4 py-2.5 rounded-xl bg-[#C46B4E] hover:bg-[#B25C40] text-white font-semibold text-xs transition flex items-center gap-1.5 shadow-xs cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Provision Tenant</span>
            </button>
          </div>

          {/* KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={`p-5 rounded-2xl border ${cardClass}`}>
              <span className="text-xs font-semibold uppercase text-slate-400">Total Restaurants</span>
              <div className={`text-3xl font-bold mt-2 ${textMain}`}>{tenants.length}</div>
              <span className="text-xs text-blue-500 mt-1 block">
                {activeCount} Active · {trialCount} Trial · {suspendedCount} Suspended
              </span>
            </div>
            <div className={`p-5 rounded-2xl border ${cardClass}`}>
              <span className="text-xs font-semibold uppercase text-slate-400">Connected Outlets</span>
              <div className={`text-3xl font-bold mt-2 ${textMain}`}>{totalOutlets}</div>
              <span className={`text-xs mt-1 block ${textMuted}`}>Across all active tenants</span>
            </div>
            <div className={`p-5 rounded-2xl border ${cardClass}`}>
              <span className="text-xs font-semibold uppercase text-slate-400">Platform MRR</span>
              <div className="text-3xl font-bold text-[#C46B4E] mt-2">
                ₹{totalMrr.toLocaleString("en-IN")}
              </div>
              <span className="text-xs text-emerald-500 mt-1 block">
                Active recurring billing
              </span>
            </div>
            <div className={`p-5 rounded-2xl border ${cardClass}`}>
              <span className="text-xs font-semibold uppercase text-slate-400">Demo Requests</span>
              <div className="text-3xl font-bold text-blue-500 mt-2">{demoRequests.length}</div>
              <span className="text-xs text-amber-500 mt-1 block">
                {newLeadsCount} awaiting follow-up
              </span>
            </div>
          </div>

          {/* Active Tenants Directory */}
          <div className={`rounded-2xl p-5 space-y-4 border ${cardClass}`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <h3 className={`font-bold text-sm flex items-center gap-2 ${textMain}`}>
                <Building2 className="w-4 h-4 text-[#C46B4E]" />
                <span>Active Tenants Directory</span>
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={tenantSearch}
                    onChange={(e) => setTenantSearch(e.target.value)}
                    placeholder="Search tenant, owner, city..."
                    className={`pl-8 pr-3 py-1.5 rounded-lg border text-xs focus:outline-none focus:border-[#C46B4E] ${inputClass}`}
                  />
                </div>
                <select
                  value={planFilter}
                  onChange={(e) => setPlanFilter(e.target.value as any)}
                  className={`px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none ${inputClass}`}
                >
                  <option value="All">All Plans</option>
                  <option value="Starter">Starter</option>
                  <option value="Pro">Pro</option>
                  <option value="Enterprise">Enterprise</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className={`px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none ${inputClass}`}
                >
                  <option value="All">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Trial">Trial</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>
            </div>

            {filteredTenants.length === 0 ? (
              <div className={`p-8 rounded-xl border border-dashed text-center text-xs ${textMuted}`}>
                No tenants match the current filters.
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredTenants.map((t) => (
                  <div
                    key={t.id}
                    className={`p-4 rounded-xl border flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs ${subCardClass}`}
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-bold text-sm ${textMain}`}>{t.name}</span>
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                            t.status === "Active"
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                              : t.status === "Trial"
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                              : "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30"
                          }`}
                        >
                          {t.status}
                        </span>
                      </div>
                      <div className={`text-[11px] flex flex-wrap items-center gap-2 ${textMuted}`}>
                        <span>{t.ownerName}</span>
                        <span>•</span>
                        <span>{t.city}</span>
                        <span>•</span>
                        <span>{t.outlets} Outlet{t.outlets > 1 ? "s" : ""}</span>
                        {t.email && (
                          <>
                            <span>•</span>
                            <span>{t.email}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={t.plan}
                        onChange={(e) =>
                          postSuperAdminAction({
                            action: "update_tenant",
                            id: t.id,
                            plan: e.target.value,
                          })
                        }
                        className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold focus:outline-none cursor-pointer ${inputClass}`}
                      >
                        <option value="Starter">
                          Starter (₹{(platformSettings?.planPrices.Starter ?? 3999).toLocaleString("en-IN")}/mo)
                        </option>
                        <option value="Pro">
                          Pro (₹{(platformSettings?.planPrices.Pro ?? 7999).toLocaleString("en-IN")}/mo)
                        </option>
                        <option value="Enterprise">
                          Enterprise (₹{(platformSettings?.planPrices.Enterprise ?? 14999).toLocaleString("en-IN")}/mo)
                        </option>
                      </select>

                      {t.status !== "Active" ? (
                        <button
                          type="button"
                          onClick={() =>
                            postSuperAdminAction({
                              action: "update_tenant",
                              id: t.id,
                              status: "Active",
                            })
                          }
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1 cursor-pointer transition"
                        >
                          <Play className="w-3 h-3" />
                          <span>Activate</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            postSuperAdminAction({
                              action: "update_tenant",
                              id: t.id,
                              status: "Suspended",
                            })
                          }
                          className="px-2.5 py-1.5 rounded-lg border border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 font-semibold flex items-center gap-1 cursor-pointer transition"
                        >
                          <Ban className="w-3 h-3" />
                          <span>Suspend</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          postSuperAdminAction({ action: "delete_tenant", id: t.id })
                        }
                        title="Remove tenant"
                        className="p-1.5 rounded-lg border border-red-500/30 text-red-500 hover:bg-red-500/10 cursor-pointer transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Incoming Demo Requests from Landing Page */}
          <div className={`rounded-2xl p-5 space-y-4 border ${cardClass}`}>
            <div className="flex items-center justify-between">
              <h3 className={`font-bold text-sm flex items-center gap-2 ${textMain}`}>
                <Calendar className="w-4 h-4 text-[#C46B4E]" />
                <span>Landing Page Demo Requests</span>
                {newLeadsCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-[#C46B4E] text-white text-[10px] font-bold">
                    {newLeadsCount} New
                  </span>
                )}
              </h3>
            </div>

            {demoRequests.length === 0 ? (
              <div className={`p-6 rounded-xl border border-dashed text-center text-xs ${textMuted}`}>
                No demo bookings yet. Requests submitted from the landing page appear here.
              </div>
            ) : (
              <div className="space-y-2.5">
                {demoRequests.map((req) => (
                  <div
                    key={req.id}
                    className={`p-4 rounded-xl border flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs ${subCardClass}`}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-bold text-sm ${textMain}`}>
                          {req.restaurantName}
                        </span>
                        <span className={`text-[11px] ${textMuted}`}>by {req.name}</span>
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                            req.status === "completed"
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                              : req.status === "scheduled"
                              ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30"
                              : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                          }`}
                        >
                          {req.status}
                        </span>
                      </div>
                      <div className={`text-[11px] flex flex-wrap items-center gap-3 ${textMuted}`}>
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {req.phone}
                        </span>
                        {req.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" /> {req.email}
                          </span>
                        )}
                        <span>{req.restaurantType}</span>
                        <span>Slot: {req.preferredSlot}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={req.status}
                        onChange={(e) =>
                          postSuperAdminAction({
                            action: "update_demo_request",
                            id: req.id,
                            status: e.target.value,
                          })
                        }
                        className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold focus:outline-none cursor-pointer ${inputClass}`}
                      >
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="completed">Completed</option>
                      </select>

                      {req.status !== "completed" && (
                        <button
                          type="button"
                          onClick={() => handleConvertDemoToTrial(req)}
                          className="px-3 py-1.5 rounded-lg bg-[#C46B4E] hover:bg-[#B25C40] text-white font-semibold flex items-center gap-1 cursor-pointer transition"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Convert to Trial</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* TAB 2: SUBSCRIPTION PLANS */}
      {activeTab === "subscriptions" && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-3xl font-bold tracking-tight ${textMain}`}>
                Subscription Plans
              </h1>
              <p className={`text-sm mt-1 ${textMuted}`}>
                Manage Starter, Pro, and Enterprise tiers, monthly pricing, and tenant billing assignments
              </p>
            </div>
            <button
              type="button"
              onClick={() => onTabChange("platform-settings")}
              className="px-3.5 py-2 rounded-xl border border-[#C46B4E]/40 text-[#C46B4E] hover:bg-[#C46B4E]/10 text-xs font-semibold cursor-pointer transition flex items-center gap-1.5"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Edit Plan Pricing</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {(["Starter", "Pro", "Enterprise"] as PlanTier[]).map((tier) => {
              const tierTenants = tenants.filter((t) => t.plan === tier)
              const tierMrr = tierTenants
                .filter((t) => t.status === "Active")
                .reduce((s, t) => s + (Number(t.monthlyPrice) || 0), 0)
              const price = platformSettings?.planPrices[tier] ?? 0
              return (
                <div
                  key={tier}
                  className={`p-6 rounded-2xl border space-y-4 ${
                    tier === "Pro"
                      ? isDarkMode
                        ? "bg-[#1a1820] border-[#C46B4E]"
                        : "bg-white border-2 border-[#C46B4E] shadow-sm"
                      : cardClass
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-[#C46B4E]/15 text-[#C46B4E]">
                      {tier}
                    </span>
                    <span className={`text-xs font-semibold ${textMuted}`}>
                      {tierTenants.length} Tenant{tierTenants.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div>
                    <div className={`text-3xl font-extrabold ${textMain}`}>
                      ₹{price.toLocaleString("en-IN")}
                      <span className={`text-xs font-normal ${textMuted}`}> / month</span>
                    </div>
                    <p className={`text-xs mt-1.5 ${textMuted}`}>{PLAN_LIMITS[tier]}</p>
                  </div>
                  <div className={`pt-3 border-t flex items-center justify-between text-xs ${isDarkMode ? "border-[#262938]" : "border-slate-200"}`}>
                    <span className={textMuted}>Active MRR</span>
                    <span className="font-bold text-emerald-500">
                      ₹{tierMrr.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          <div className={`rounded-2xl p-5 space-y-3 border ${cardClass}`}>
            <h3 className={`font-bold text-sm flex items-center gap-2 ${textMain}`}>
              <CreditCard className="w-4 h-4 text-[#C46B4E]" />
              <span>Tenant Plan Assignments</span>
            </h3>
            <div className="space-y-2">
              {tenants.map((t) => (
                <div
                  key={t.id}
                  className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${subCardClass}`}
                >
                  <div>
                    <span className={`font-bold ${textMain}`}>{t.name}</span>
                    <span className={`ml-2 text-[11px] ${textMuted}`}>
                      ({t.status} · {t.outlets} outlet{t.outlets > 1 ? "s" : ""})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {(["Starter", "Pro", "Enterprise"] as PlanTier[]).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() =>
                          postSuperAdminAction({ action: "update_tenant", id: t.id, plan: p })
                        }
                        className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                          t.plan === p
                            ? "bg-[#C46B4E] text-white"
                            : isDarkMode
                            ? "bg-[#252837] text-slate-300 hover:bg-[#2f3346]"
                            : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* TAB 3: PLATFORM ANALYTICS */}
      {activeTab === "analytics" && (
        <>
          <div>
            <h1 className={`text-3xl font-bold tracking-tight ${textMain}`}>
              Platform Analytics
            </h1>
            <p className={`text-sm mt-1 ${textMuted}`}>
              Live SaaS recurring revenue, order volume across terminals, and plan distribution
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={`p-5 rounded-2xl border ${cardClass}`}>
              <span className="text-xs font-semibold uppercase text-slate-400">Monthly Recurring Revenue</span>
              <div className="text-3xl font-bold text-[#C46B4E] mt-2">
                ₹{totalMrr.toLocaleString("en-IN")}
              </div>
              <span className={`text-xs mt-1 block ${textMuted}`}>
                ARR: ₹{(totalMrr * 12).toLocaleString("en-IN")}
              </span>
            </div>
            <div className={`p-5 rounded-2xl border ${cardClass}`}>
              <span className="text-xs font-semibold uppercase text-slate-400">Live Orders Processed</span>
              <div className={`text-3xl font-bold mt-2 ${textMain}`}>
                {platformStats.totalOrders.toLocaleString("en-IN")}
              </div>
              <span className="text-xs text-blue-500 mt-1 block">Synced from POS & QR Menu</span>
            </div>
            <div className={`p-5 rounded-2xl border ${cardClass}`}>
              <span className="text-xs font-semibold uppercase text-slate-400">Platform GMV</span>
              <div className="text-3xl font-bold text-emerald-500 mt-2">
                ₹{Math.round(platformStats.totalGmv).toLocaleString("en-IN")}
              </div>
              <span className={`text-xs mt-1 block ${textMuted}`}>Cumulative order value</span>
            </div>
            <div className={`p-5 rounded-2xl border ${cardClass}`}>
              <span className="text-xs font-semibold uppercase text-slate-400">Avg. Revenue / Tenant</span>
              <div className={`text-3xl font-bold mt-2 ${textMain}`}>
                ₹{activeCount > 0 ? Math.round(totalMrr / activeCount).toLocaleString("en-IN") : 0}
              </div>
              <span className={`text-xs mt-1 block ${textMuted}`}>Per active subscription</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className={`rounded-2xl p-5 space-y-4 border ${cardClass}`}>
              <h3 className={`font-bold text-sm flex items-center gap-2 ${textMain}`}>
                <BarChart3 className="w-4 h-4 text-[#C46B4E]" />
                <span>MRR Breakdown by Plan</span>
              </h3>
              <div className="space-y-3">
                {(["Enterprise", "Pro", "Starter"] as PlanTier[]).map((tier) => {
                  const tierMrr = tenants
                    .filter((t) => t.plan === tier && t.status === "Active")
                    .reduce((s, t) => s + (Number(t.monthlyPrice) || 0), 0)
                  const pct = totalMrr > 0 ? Math.round((tierMrr / totalMrr) * 100) : 0
                  return (
                    <div key={tier} className="space-y-1.5 text-xs">
                      <div className="flex justify-between font-semibold">
                        <span className={textMain}>{tier}</span>
                        <span className={textMuted}>
                          ₹{tierMrr.toLocaleString("en-IN")} ({pct}%)
                        </span>
                      </div>
                      <div className={`h-2.5 rounded-full overflow-hidden ${isDarkMode ? "bg-[#222534]" : "bg-slate-100"}`}>
                        <div
                          className="h-full rounded-full bg-[#C46B4E] transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className={`rounded-2xl p-5 space-y-4 border ${cardClass}`}>
              <h3 className={`font-bold text-sm flex items-center gap-2 ${textMain}`}>
                <Store className="w-4 h-4 text-[#C46B4E]" />
                <span>Tenant Lifecycle Distribution</span>
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div className={`p-4 rounded-xl border text-center ${subCardClass}`}>
                  <div className="text-2xl font-bold text-emerald-500">{activeCount}</div>
                  <div className={`text-xs mt-1 ${textMuted}`}>Active</div>
                </div>
                <div className={`p-4 rounded-xl border text-center ${subCardClass}`}>
                  <div className="text-2xl font-bold text-amber-500">{trialCount}</div>
                  <div className={`text-xs mt-1 ${textMuted}`}>Trial</div>
                </div>
                <div className={`p-4 rounded-xl border text-center ${subCardClass}`}>
                  <div className="text-2xl font-bold text-red-500">{suspendedCount}</div>
                  <div className={`text-xs mt-1 ${textMuted}`}>Suspended</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onTabChange("tenants")}
                className="w-full py-2.5 rounded-xl border border-[#C46B4E]/35 text-[#C46B4E] hover:bg-[#C46B4E]/10 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition"
              >
                <span>Manage Tenants & Leads</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* TAB 4: SECURITY & AUDIT LOGS */}
      {activeTab === "audit" && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className={`text-3xl font-bold tracking-tight ${textMain}`}>
                Security & Audit Logs
              </h1>
              <p className={`text-sm mt-1 ${textMuted}`}>
                Immutable log of tenant provisioning, plan changes, lead conversions, and platform updates
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportAuditCsv}
              className="px-4 py-2 rounded-xl border border-[#C46B4E]/40 text-[#C46B4E] hover:bg-[#C46B4E]/10 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition self-start sm:self-auto"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>

          <div className={`rounded-2xl p-5 space-y-4 border ${cardClass}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[220px] max-w-sm">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  placeholder="Search action, target, actor..."
                  className={`w-full pl-8 pr-3 py-1.5 rounded-lg border text-xs focus:outline-none focus:border-[#C46B4E] ${inputClass}`}
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {["all", "tenant", "subscription", "demo", "settings", "security"].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setAuditCategoryFilter(cat)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize cursor-pointer transition ${
                      auditCategoryFilter === cat
                        ? "bg-[#C46B4E] text-white"
                        : isDarkMode
                        ? "bg-[#1a1c26] text-slate-300 hover:bg-[#242838]"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {filteredAuditLogs.map((log) => (
                <div
                  key={log.id}
                  className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${subCardClass}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/15 text-blue-500 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className={`font-semibold truncate ${textMain}`}>
                        {log.action} · <span className="text-[#C46B4E]">{log.target}</span>
                      </div>
                      <div className={`text-[11px] ${textMuted}`}>
                        Actor: {log.actor} · Category: {log.category}
                      </div>
                    </div>
                  </div>
                  <span className={`text-[11px] shrink-0 ${textMuted}`}>
                    {new Date(log.timestamp).toLocaleString("en-IN")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* TAB 5: PLATFORM SETTINGS */}
      {activeTab === "platform-settings" && platformSettings && (
        <>
          <div>
            <h1 className={`text-3xl font-bold tracking-tight ${textMain}`}>
              Platform Settings
            </h1>
            <p className={`text-sm mt-1 ${textMuted}`}>
              Global SaaS configuration, default trial period, support contacts, and plan pricing
            </p>
          </div>

          <form
            onSubmit={async (e) => {
              e.preventDefault()
              await postSuperAdminAction({
                action: "save_platform_settings",
                settings: platformSettings,
              })
              setSettingsSavedMsg(true)
              setTimeout(() => setSettingsSavedMsg(false), 3000)
            }}
            className={`rounded-2xl p-6 border space-y-6 ${cardClass}`}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5">
                <label className={`font-semibold ${textMain}`}>Platform Name</label>
                <input
                  type="text"
                  value={platformSettings.platformName}
                  onChange={(e) =>
                    setPlatformSettings({ ...platformSettings, platformName: e.target.value })
                  }
                  className={`w-full px-3 py-2 rounded-xl border ${inputClass}`}
                />
              </div>
              <div className="space-y-1.5">
                <label className={`font-semibold ${textMain}`}>Default Trial Days</label>
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={platformSettings.defaultTrialDays}
                  onChange={(e) =>
                    setPlatformSettings({
                      ...platformSettings,
                      defaultTrialDays: Number(e.target.value) || 14,
                    })
                  }
                  className={`w-full px-3 py-2 rounded-xl border ${inputClass}`}
                />
              </div>
              <div className="space-y-1.5">
                <label className={`font-semibold ${textMain}`}>Support Email</label>
                <input
                  type="email"
                  value={platformSettings.supportEmail}
                  onChange={(e) =>
                    setPlatformSettings({ ...platformSettings, supportEmail: e.target.value })
                  }
                  className={`w-full px-3 py-2 rounded-xl border ${inputClass}`}
                />
              </div>
              <div className="space-y-1.5">
                <label className={`font-semibold ${textMain}`}>Support Phone</label>
                <input
                  type="text"
                  value={platformSettings.supportPhone}
                  onChange={(e) =>
                    setPlatformSettings({ ...platformSettings, supportPhone: e.target.value })
                  }
                  className={`w-full px-3 py-2 rounded-xl border ${inputClass}`}
                />
              </div>
            </div>

            <div className={`pt-4 border-t space-y-3 ${isDarkMode ? "border-[#262938]" : "border-slate-200"}`}>
              <h4 className={`font-bold text-xs uppercase tracking-wider ${textMuted}`}>
                Monthly Plan Pricing (₹)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                {(["Starter", "Pro", "Enterprise"] as PlanTier[]).map((tier) => (
                  <div key={tier} className="space-y-1.5">
                    <label className={`font-semibold ${textMain}`}>{tier} Plan (₹/mo)</label>
                    <input
                      type="number"
                      min={0}
                      value={platformSettings.planPrices[tier]}
                      onChange={(e) =>
                        setPlatformSettings({
                          ...platformSettings,
                          planPrices: {
                            ...platformSettings.planPrices,
                            [tier]: Number(e.target.value) || 0,
                          },
                        })
                      }
                      className={`w-full px-3 py-2 rounded-xl border ${inputClass}`}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className={`pt-4 border-t grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs ${isDarkMode ? "border-[#262938]" : "border-slate-200"}`}>
              <label className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer ${subCardClass}`}>
                <div>
                  <div className={`font-bold ${textMain}`}>Allow Landing Demo Bookings</div>
                  <div className={`text-[11px] ${textMuted}`}>Accept new demo requests from public site</div>
                </div>
                <input
                  type="checkbox"
                  checked={platformSettings.allowDemoBookings}
                  onChange={(e) =>
                    setPlatformSettings({
                      ...platformSettings,
                      allowDemoBookings: e.target.checked,
                    })
                  }
                  className="w-4 h-4 accent-[#C46B4E]"
                />
              </label>
              <label className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer ${subCardClass}`}>
                <div>
                  <div className={`font-bold ${textMain}`}>Maintenance Mode</div>
                  <div className={`text-[11px] ${textMuted}`}>Show maintenance notice on tenant logins</div>
                </div>
                <input
                  type="checkbox"
                  checked={platformSettings.maintenanceMode}
                  onChange={(e) =>
                    setPlatformSettings({
                      ...platformSettings,
                      maintenanceMode: e.target.checked,
                    })
                  }
                  className="w-4 h-4 accent-[#C46B4E]"
                />
              </label>
            </div>

            <div className="flex items-center justify-between pt-2">
              {settingsSavedMsg ? (
                <span className="text-xs font-semibold text-emerald-500 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Platform settings saved!
                </span>
              ) : (
                <span />
              )}
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-[#C46B4E] hover:bg-[#B25C40] text-white text-xs font-bold cursor-pointer transition shadow-xs"
              >
                Save Platform Settings
              </button>
            </div>
          </form>
        </>
      )}

      {/* Provision Tenant Modal */}
      {showProvisionModal && (
        <div
          onClick={() => setShowProvisionModal(false)}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <form
            onSubmit={handleProvisionTenant}
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden ${cardClass}`}
          >
            <div className={`px-5 py-4 border-b flex items-center justify-between ${isDarkMode ? "border-[#252938]" : "border-slate-200"}`}>
              <h3 className={`font-bold text-sm ${textMain}`}>Provision New Restaurant Tenant</h3>
              <button
                type="button"
                onClick={() => setShowProvisionModal(false)}
                className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <div className="space-y-1">
                <label className={`font-semibold ${textMain}`}>Restaurant Name *</label>
                <input
                  required
                  value={provName}
                  onChange={(e) => setProvName(e.target.value)}
                  placeholder="e.g. Spice Garden Kitchen"
                  className={`w-full px-3 py-2 rounded-xl border ${inputClass}`}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className={`font-semibold ${textMain}`}>Owner Name</label>
                  <input
                    value={provOwner}
                    onChange={(e) => setProvOwner(e.target.value)}
                    placeholder="e.g. Rohan Sharma"
                    className={`w-full px-3 py-2 rounded-xl border ${inputClass}`}
                  />
                </div>
                <div className="space-y-1">
                  <label className={`font-semibold ${textMain}`}>City</label>
                  <input
                    value={provCity}
                    onChange={(e) => setProvCity(e.target.value)}
                    placeholder="e.g. Mumbai"
                    className={`w-full px-3 py-2 rounded-xl border ${inputClass}`}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className={`font-semibold ${textMain}`}>Email</label>
                  <input
                    type="email"
                    value={provEmail}
                    onChange={(e) => setProvEmail(e.target.value)}
                    placeholder="owner@restaurant.in"
                    className={`w-full px-3 py-2 rounded-xl border ${inputClass}`}
                  />
                </div>
                <div className="space-y-1">
                  <label className={`font-semibold ${textMain}`}>Phone</label>
                  <input
                    value={provPhone}
                    onChange={(e) => setProvPhone(e.target.value)}
                    placeholder="+91 98..."
                    className={`w-full px-3 py-2 rounded-xl border ${inputClass}`}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className={`font-semibold ${textMain}`}>Plan</label>
                  <select
                    value={provPlan}
                    onChange={(e) => setProvPlan(e.target.value as PlanTier)}
                    className={`w-full px-2.5 py-2 rounded-xl border ${inputClass}`}
                  >
                    <option value="Starter">Starter</option>
                    <option value="Pro">Pro</option>
                    <option value="Enterprise">Enterprise</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className={`font-semibold ${textMain}`}>Outlets</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={provOutlets}
                    onChange={(e) => setProvOutlets(Math.max(1, Number(e.target.value) || 1))}
                    className={`w-full px-3 py-2 rounded-xl border ${inputClass}`}
                  />
                </div>
                <div className="space-y-1">
                  <label className={`font-semibold ${textMain}`}>Status</label>
                  <select
                    value={provStatus}
                    onChange={(e) => setProvStatus(e.target.value as TenantStatus)}
                    className={`w-full px-2.5 py-2 rounded-xl border ${inputClass}`}
                  >
                    <option value="Active">Active</option>
                    <option value="Trial">Trial</option>
                  </select>
                </div>
              </div>
            </div>
            <div className={`px-5 py-3.5 border-t flex justify-end gap-2 ${isDarkMode ? "border-[#252938]" : "border-slate-200"}`}>
              <button
                type="button"
                onClick={() => setShowProvisionModal(false)}
                className={`px-4 py-2 rounded-xl border text-xs font-semibold cursor-pointer ${inputClass}`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-[#C46B4E] hover:bg-[#B25C40] text-white text-xs font-bold cursor-pointer"
              >
                {isSubmitting ? "Provisioning..." : "Create Tenant"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
