"use client"

import React, { useEffect, useState } from "react"
import {
  Bell,
  CheckCircle2,
  CreditCard,
  Download,
  Layers,
  LayoutGrid,
  Moon,
  Printer,
  QrCode,
  Receipt,
  RotateCcw,
  Save,
  Settings,
  ShieldCheck,
  Store,
  Sun,
  Utensils,
  X,
} from "lucide-react"
import {
  DEFAULT_RESTAURANT_SETTINGS,
  FloorConfig,
  normalizeFloors,
  resizeFloorsList,
  RestaurantSettings,
} from "@/lib/restaurant-settings"
import { SectionContentSkeleton } from "@/components/ui/skeleton"

export type SettingsSection = "outlet" | "billing" | "qr" | "payments" | "printers" | "alerts"

interface SettingsModuleProps {
  isDarkMode: boolean
  onToggleTheme: () => void
  initialSection?: SettingsSection
  onTablesSynced?: (tables: any[], floors: FloorConfig[]) => void
}

function ToggleSwitch({
  checked,
  onChange,
  label,
  description,
  isDarkMode,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  label: string
  description?: string
  isDarkMode: boolean
}) {
  return (
    <div
      className={`p-3.5 rounded-xl border flex items-center justify-between gap-4 ${
        isDarkMode ? "bg-[#191c27] border-[#252938]" : "bg-[#F7F5F0] border-[#E5E1D9]"
      }`}
    >
      <div className="min-w-0">
        <div className={`text-xs font-bold ${isDarkMode ? "text-white" : "text-[#20252B]"}`}>
          {label}
        </div>
        {description && (
          <div className="text-[11px] text-[#64748B] mt-0.5">{description}</div>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors shrink-0 cursor-pointer ${
          checked ? "bg-[#C46B4E]" : isDarkMode ? "bg-[#2c3144]" : "bg-slate-300"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  )
}

export function SettingsModule({
  isDarkMode,
  onToggleTheme,
  initialSection = "outlet",
  onTablesSynced,
}: SettingsModuleProps) {
  const [section, setSection] = useState<SettingsSection>(initialSection)
  const [form, setForm] = useState<RestaurantSettings>(DEFAULT_RESTAURANT_SETTINGS)
  const [savedSnapshot, setSavedSnapshot] = useState<string>(JSON.stringify(DEFAULT_RESTAURANT_SETTINGS))
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    setSection(initialSection)
  }, [initialSection])

  useEffect(() => {
    let active = true
    fetch("/api/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (active && d?.settings) {
          setForm(d.settings)
          setSavedSnapshot(JSON.stringify(d.settings))
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const hasUnsavedChanges = JSON.stringify(form) !== savedSnapshot

  const updateField = <K extends keyof RestaurantSettings>(key: K, val: RestaurantSettings[K]) => {
    setForm((prev) => ({ ...prev, [key]: val }))
  }

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setIsSaving(true)
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: form }),
      })
      if (res.ok) {
        const d = await res.json()
        if (d.settings) {
          setForm(d.settings)
          setSavedSnapshot(JSON.stringify(d.settings))
          if (Array.isArray(d.tables) && onTablesSynced) {
            onTablesSynced(d.tables, d.settings.floors)
          }
          try {
            if (typeof window !== "undefined" && "BroadcastChannel" in window) {
              const bc = new BroadcastChannel("restro_sync_channel")
              bc.postMessage({ type: "tables_synced", tables: d.tables, floors: d.settings.floors })
              bc.close()
            }
          } catch {}
        }
        setToast("All restaurant settings, floors, and table counts saved & synced.")
        setTimeout(() => setToast(null), 4000)
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleResetDefaults = async () => {
    if (!confirm("Restore all settings back to factory Indian hospitality defaults?")) return
    setIsSaving(true)
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" }),
      })
      if (res.ok) {
        const d = await res.json()
        if (d.settings) {
          setForm(d.settings)
          setSavedSnapshot(JSON.stringify(d.settings))
          if (Array.isArray(d.tables) && onTablesSynced) {
            onTablesSynced(d.tables, d.settings.floors)
          }
          try {
            if (typeof window !== "undefined" && "BroadcastChannel" in window) {
              const bc = new BroadcastChannel("restro_sync_channel")
              bc.postMessage({ type: "tables_synced", tables: d.tables, floors: d.settings.floors })
              bc.close()
            }
          } catch {}
        }
        setToast("Settings restored to factory defaults.")
        setTimeout(() => setToast(null), 4000)
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleTestPrinter = (printerName: string) => {
    setToast(`Test KOT / receipt payload dispatched to ${printerName}.`)
    setTimeout(() => setToast(null), 3500)
  }

  const handleExportSettingsJson = () => {
    const blob = new Blob([JSON.stringify(form, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `nodedr-bistro-settings-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setToast("Exported restaurant configuration backup (.json).")
    setTimeout(() => setToast(null), 3500)
  }

  // Live ₹1,000 GST & Service Charge Sample Calculation Preview
  const sampleBase = 1000
  const sampleCgst = (sampleBase * Number(form.cgstRate || 0)) / 100
  const sampleSgst = (sampleBase * Number(form.sgstRate || 0)) / 100
  const sampleServiceCharge = form.serviceChargeEnabled
    ? (sampleBase * Number(form.serviceChargeRate || 0)) / 100
    : 0
  const sampleGrandTotal = sampleBase + sampleCgst + sampleSgst + sampleServiceCharge

  const cardSurface = isDarkMode
    ? "bg-[#14161f] border-[#202330]"
    : "bg-white border-[#E5E1D9] shadow-2xs"

  if (isLoading) {
    return <SectionContentSkeleton tab="settings" isDarkMode={isDarkMode} />
  }
  const subSurface = isDarkMode ? "bg-[#191c27] border-[#252938]" : "bg-[#F7F5F0] border-[#E5E1D9]"
  const headingText = isDarkMode ? "text-white" : "text-[#20252B]"
  const mutedText = isDarkMode ? "text-slate-400" : "text-[#64748B]"
  const inputCls = `w-full px-3.5 py-2.5 rounded-xl text-xs border outline-hidden transition focus:border-[#C46B4E] ${
    isDarkMode
      ? "bg-[#191c27] border-[#252938] text-white placeholder-slate-500"
      : "bg-[#F7F5F0] border-[#E5E1D9] text-[#20252B] placeholder-[#64748B]"
  }`

  const navTabs: Array<{ id: SettingsSection; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: "outlet", label: "Outlet & Profile", icon: Store },
    { id: "billing", label: "GST, Tax & Billing", icon: Receipt },
    { id: "qr", label: "Floors, Tables & QR", icon: QrCode },
    { id: "payments", label: "Payments & UPI", icon: CreditCard },
    { id: "printers", label: "KDS & Printers", icon: Printer },
    { id: "alerts", label: "Alerts & Appearance", icon: Bell },
  ]

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto pb-10">
      {/* Toast */}
      {toast && (
        <div className="p-3.5 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-700 dark:text-blue-300 text-xs font-semibold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toast}</span>
          </div>
          <button type="button" onClick={() => setToast(null)} className="cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C46B4E]/15 border border-[#C46B4E]/30 flex items-center justify-center text-[#C46B4E] shrink-0">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className={`text-2xl lg:text-3xl font-bold tracking-tight ${headingText}`}>
                Restaurant Settings
              </h1>
              {hasUnsavedChanges && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30">
                  Unsaved Changes
                </span>
              )}
            </div>
            <p className={`text-xs sm:text-sm mt-0.5 ${mutedText}`}>
              Configure outlet identity, Indian GST slabs, QR self-ordering rules, UPI gateway, thermal printers & alerts.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleExportSettingsJson}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 cursor-pointer ${
              isDarkMode
                ? "bg-[#14161f] border-[#242838] text-slate-200 hover:bg-[#1e2230]"
                : "bg-white border-[#E5E1D9] text-[#20252B] hover:bg-[#F7F5F0]"
            }`}
          >
            <Download className="w-3.5 h-3.5 text-[#C46B4E]" />
            <span>Backup JSON</span>
          </button>

          <button
            type="button"
            onClick={handleResetDefaults}
            disabled={isSaving}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 cursor-pointer ${
              isDarkMode
                ? "bg-[#14161f] border-[#242838] text-slate-300 hover:text-white"
                : "bg-white border-[#E5E1D9] text-[#64748B] hover:text-[#20252B]"
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave()}
            disabled={isSaving || isLoading}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#C46B4E] hover:bg-[#B25C40] text-white transition flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? "Saving..." : "Save All Settings"}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Settings Navigation + Active Form Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Navigation Sidebar */}
        <div className={`lg:col-span-3 p-3 rounded-2xl border space-y-1 ${cardSurface}`}>
          {navTabs.map((t) => {
            const Icon = t.icon
            const active = section === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSection(t.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  active
                    ? "bg-[#C46B4E] text-white shadow-2xs"
                    : isDarkMode
                    ? "text-slate-400 hover:text-white hover:bg-[#191c27]"
                    : "text-[#64748B] hover:text-[#20252B] hover:bg-[#F7F5F0]"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{t.label}</span>
              </button>
            )
          })}

          <div className={`mt-3 pt-3 border-t px-2 space-y-1.5 text-[11px] ${isDarkMode ? "border-[#202330]" : "border-[#E5E1D9]"}`}>
            <div className="flex items-center justify-between">
              <span className={mutedText}>Outlet Status</span>
              <span className={`font-bold ${form.isAcceptingOrders ? "text-blue-600 dark:text-blue-400" : "text-rose-500"}`}>
                {form.isAcceptingOrders ? "Open & Live" : "Paused"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className={mutedText}>Tax Slab</span>
              <span className={`font-bold ${headingText}`}>{form.cgstRate + form.sgstRate}% GST</span>
            </div>
            <div className="flex items-center justify-between">
              <span className={mutedText}>Gateway</span>
              <span className="font-bold text-[#C46B4E] uppercase">{form.gatewayMode}</span>
            </div>
          </div>
        </div>

        {/* Right Panel Content */}
        <form onSubmit={handleSave} className={`lg:col-span-9 p-6 rounded-2xl border space-y-6 ${cardSurface}`}>
          {/* SECTION 1: OUTLET & PROFILE */}
          {section === "outlet" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b pb-3 border-[#E5E1D9] dark:border-[#202330]">
                <div>
                  <h2 className={`text-base font-bold ${headingText}`}>Outlet Identity & FSSAI Profile</h2>
                  <p className={`text-xs ${mutedText}`}>Displayed on digital QR menus, printed receipts, and tax invoices.</p>
                </div>
                <Utensils className="w-5 h-5 text-[#C46B4E]" />
              </div>

              <ToggleSwitch
                isDarkMode={isDarkMode}
                checked={form.isAcceptingOrders}
                onChange={(v) => updateField("isAcceptingOrders", v)}
                label="Accepting Live Orders (POS & QR Menu)"
                description="Turn off temporarily during kitchen shutdown or private events."
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${headingText}`}>Restaurant Brand Name</label>
                  <input
                    type="text"
                    value={form.restaurantName}
                    onChange={(e) => updateField("restaurantName", e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${headingText}`}>Outlet Branch Name</label>
                  <input
                    type="text"
                    value={form.outletName}
                    onChange={(e) => updateField("outletName", e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${headingText}`}>Legal Entity Name</label>
                  <input
                    type="text"
                    value={form.legalName}
                    onChange={(e) => updateField("legalName", e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${headingText}`}>FSSAI License Number (14-digit)</label>
                  <input
                    type="text"
                    value={form.fssaiNumber}
                    onChange={(e) => updateField("fssaiNumber", e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${headingText}`}>Contact Phone (India)</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${headingText}`}>Support & Billing Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className={`block text-xs font-semibold mb-1.5 ${headingText}`}>Cuisine Tags / Description</label>
                  <input
                    type="text"
                    value={form.cuisineType}
                    onChange={(e) => updateField("cuisineType", e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className={`block text-xs font-semibold mb-1.5 ${headingText}`}>Street Address</label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => updateField("address", e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${headingText}`}>City & State</label>
                  <input
                    type="text"
                    value={form.cityState}
                    onChange={(e) => updateField("cityState", e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={`block text-xs font-semibold mb-1.5 ${headingText}`}>PIN Code</label>
                    <input
                      type="text"
                      value={form.pinCode}
                      onChange={(e) => updateField("pinCode", e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-semibold mb-1.5 ${headingText}`}>Opens</label>
                    <input
                      type="time"
                      value={form.openingTime}
                      onChange={(e) => updateField("openingTime", e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-semibold mb-1.5 ${headingText}`}>Closes</label>
                    <input
                      type="time"
                      value={form.closingTime}
                      onChange={(e) => updateField("closingTime", e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: GST, TAX & BILLING */}
          {section === "billing" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b pb-3 border-[#E5E1D9] dark:border-[#202330]">
                <div>
                  <h2 className={`text-base font-bold ${headingText}`}>Indian GST, Charges & Receipt Formatting</h2>
                  <p className={`text-xs ${mutedText}`}>Configure CGST/SGST tax slabs, packaging fees, and thermal invoice copy.</p>
                </div>
                <Receipt className="w-5 h-5 text-[#C46B4E]" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${headingText}`}>GSTIN Number</label>
                  <input
                    type="text"
                    value={form.gstin}
                    onChange={(e) => updateField("gstin", e.target.value.toUpperCase())}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${headingText}`}>SAC Code (Restaurant)</label>
                  <input
                    type="text"
                    value={form.sacCode}
                    onChange={(e) => updateField("sacCode", e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${headingText}`}>Invoice Prefix</label>
                  <input
                    type="text"
                    value={form.invoicePrefix}
                    onChange={(e) => updateField("invoicePrefix", e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${headingText}`}>CGST Rate (%)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={form.cgstRate}
                    onChange={(e) => updateField("cgstRate", Number(e.target.value))}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${headingText}`}>SGST Rate (%)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={form.sgstRate}
                    onChange={(e) => updateField("sgstRate", Number(e.target.value))}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${headingText}`}>Takeaway / Delivery Packing Fee (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.packagingFeeInr}
                    onChange={(e) => updateField("packagingFeeInr", Number(e.target.value))}
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ToggleSwitch
                  isDarkMode={isDarkMode}
                  checked={form.serviceChargeEnabled}
                  onChange={(v) => updateField("serviceChargeEnabled", v)}
                  label={`Optional Staff Service Charge (${form.serviceChargeRate}%)`}
                  description="Applies only on Dine-In bills when enabled (removable on customer request)."
                />
                <ToggleSwitch
                  isDarkMode={isDarkMode}
                  checked={form.roundOffBills}
                  onChange={(v) => updateField("roundOffBills", v)}
                  label="Auto Round-Off Bills to Nearest ₹1"
                  description="Clean whole-rupee totals for cash and UPI checkout."
                />
              </div>

              {form.serviceChargeEnabled && (
                <div className="max-w-xs">
                  <label className={`block text-xs font-semibold mb-1.5 ${headingText}`}>Service Charge (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="15"
                    step="0.5"
                    value={form.serviceChargeRate}
                    onChange={(e) => updateField("serviceChargeRate", Number(e.target.value))}
                    className={inputCls}
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${headingText}`}>Receipt Header Note</label>
                  <input
                    type="text"
                    value={form.receiptHeaderNote}
                    onChange={(e) => updateField("receiptHeaderNote", e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${headingText}`}>Receipt Footer Message</label>
                  <input
                    type="text"
                    value={form.receiptFooterNote}
                    onChange={(e) => updateField("receiptFooterNote", e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Live Sample Tax Receipt Preview */}
              <div className={`p-4 rounded-xl border space-y-2 text-xs ${subSurface}`}>
                <div className="font-bold text-[#C46B4E] uppercase text-[11px]">
                  Live Sample Bill Calculation Preview (₹1,000 Subtotal)
                </div>
                <div className="flex justify-between">
                  <span className={mutedText}>Item Subtotal</span>
                  <span className={headingText}>₹1,000.00</span>
                </div>
                {form.serviceChargeEnabled && (
                  <div className="flex justify-between">
                    <span className={mutedText}>Service Charge ({form.serviceChargeRate}%)</span>
                    <span className={headingText}>₹{sampleServiceCharge.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className={mutedText}>CGST ({form.cgstRate}%)</span>
                  <span className={headingText}>₹{sampleCgst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className={mutedText}>SGST ({form.sgstRate}%)</span>
                  <span className={headingText}>₹{sampleSgst.toFixed(2)}</span>
                </div>
                <div className="pt-2 border-t border-[#E5E1D9] dark:border-[#252938] flex justify-between font-bold text-sm">
                  <span className={headingText}>Grand Total</span>
                  <span className="text-[#C46B4E]">
                    ₹{(form.roundOffBills ? Math.round(sampleGrandTotal) : sampleGrandTotal).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 3: FLOORS, TABLES & QR CONTROLS */}
          {section === "qr" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b pb-3 border-[#E5E1D9] dark:border-[#202330]">
                <div>
                  <h2 className={`text-base font-bold ${headingText}`}>Floors, Table Count &amp; QR Menu Controls</h2>
                  <p className={`text-xs ${mutedText}`}>
                    Set how many floors and tables your restaurant has. Saving updates the Tables floor map automatically.
                  </p>
                </div>
                <Layers className="w-5 h-5 text-[#C46B4E]" />
              </div>

              {/* Restaurant Floors & Table Capacity Editor */}
              {(() => {
                const floorsList = normalizeFloors(form.floors)
                const computedTotalTables = floorsList.reduce((s, f) => s + f.tableCount, 0)
                let runningStart = 1

                const applyFloorsUpdate = (nextFloors: FloorConfig[]) => {
                  setForm((prev) => ({
                    ...prev,
                    floors: nextFloors,
                    totalFloors: nextFloors.length,
                    totalTables: nextFloors.reduce((s, f) => s + (Number(f.tableCount) || 0), 0),
                  }))
                }

                return (
                  <div className={`p-4 rounded-2xl border space-y-4 ${subSurface}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <LayoutGrid className="w-4 h-4 text-[#C46B4E]" />
                        <div>
                          <div className={`text-xs font-bold ${headingText}`}>
                            Floor Plan &amp; Tables Configuration
                          </div>
                          <div className={`text-[11px] ${mutedText}`}>
                            Active layout: {floorsList.length} Floor{floorsList.length > 1 ? "s" : ""} · {computedTotalTables} Total Tables (Table 1 – Table {computedTotalTables})
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className={`text-[11px] font-semibold whitespace-nowrap ${headingText}`}>
                          No. of Floors:
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={floorsList.length}
                          onChange={(e) => {
                            const val = Math.max(1, Math.min(10, Number(e.target.value) || 1))
                            applyFloorsUpdate(resizeFloorsList(floorsList, val))
                          }}
                          className={`w-20 px-3 py-1.5 rounded-lg text-xs font-bold border text-center outline-hidden focus:border-[#C46B4E] ${
                            isDarkMode
                              ? "bg-[#14161f] border-[#292d3e] text-white"
                              : "bg-white border-[#E5E1D9] text-[#20252B]"
                          }`}
                        />
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      {floorsList.map((fl, idx) => {
                        const startNum = runningStart
                        const endNum = startNum + fl.tableCount - 1
                        runningStart = endNum + 1
                        return (
                          <div
                            key={fl.id}
                            className={`p-3 rounded-xl border grid grid-cols-1 sm:grid-cols-12 gap-3 items-end ${
                              isDarkMode
                                ? "bg-[#14161f] border-[#252938]"
                                : "bg-white border-[#E5E1D9]"
                            }`}
                          >
                            <div className="sm:col-span-5">
                              <label className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>
                                Floor {idx + 1} Name
                              </label>
                              <input
                                type="text"
                                value={fl.name}
                                onChange={(e) => {
                                  const next = floorsList.map((item, i) =>
                                    i === idx ? { ...item, name: e.target.value } : item
                                  )
                                  applyFloorsUpdate(next)
                                }}
                                placeholder={`Floor ${idx + 1}`}
                                className={inputCls}
                              />
                            </div>

                            <div className="sm:col-span-3">
                              <label className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>
                                No. of Tables
                              </label>
                              <input
                                type="number"
                                min={1}
                                max={50}
                                value={fl.tableCount}
                                onChange={(e) => {
                                  const count = Math.max(1, Math.min(50, Number(e.target.value) || 1))
                                  const next = floorsList.map((item, i) =>
                                    i === idx ? { ...item, tableCount: count } : item
                                  )
                                  applyFloorsUpdate(next)
                                }}
                                className={inputCls}
                              />
                            </div>

                            <div className="sm:col-span-2">
                              <label className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>
                                Seats / Table
                              </label>
                              <select
                                value={fl.defaultSeats}
                                onChange={(e) => {
                                  const seats = Number(e.target.value) || 4
                                  const next = floorsList.map((item, i) =>
                                    i === idx ? { ...item, defaultSeats: seats } : item
                                  )
                                  applyFloorsUpdate(next)
                                }}
                                className={inputCls}
                              >
                                <option value={2}>2 Seats</option>
                                <option value={4}>4 Seats</option>
                                <option value={6}>6 Seats</option>
                                <option value={8}>8 Seats</option>
                                <option value={10}>10 Seats</option>
                              </select>
                            </div>

                            <div className="sm:col-span-2 flex items-center justify-end pb-2">
                              <span className="px-2.5 py-1 rounded-lg bg-[#C46B4E]/15 text-[#C46B4E] text-[10px] font-bold whitespace-nowrap">
                                {startNum === endNum ? `Table ${startNum}` : `T${startNum} – T${endNum}`}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <ToggleSwitch
                  isDarkMode={isDarkMode}
                  checked={form.qrOrderingEnabled}
                  onChange={(v) => updateField("qrOrderingEnabled", v)}
                  label="Allow Guest QR Self-Ordering"
                  description="Diners can browse menu and submit table orders from their phone."
                />
                <ToggleSwitch
                  isDarkMode={isDarkMode}
                  checked={form.qrRequireTable}
                  onChange={(v) => updateField("qrRequireTable", v)}
                  label="Require Table Selection on QR Menu"
                  description="Prevents unattached table orders when scanning generic QR codes."
                />
                <ToggleSwitch
                  isDarkMode={isDarkMode}
                  checked={form.qrWaiterCallEnabled}
                  onChange={(v) => updateField("qrWaiterCallEnabled", v)}
                  label="Waiter Call Button on QR Menu"
                  description="Sends instant table alert to Reception & Service Queue."
                />
                <ToggleSwitch
                  isDarkMode={isDarkMode}
                  checked={form.qrCleanTableEnabled}
                  onChange={(v) => updateField("qrCleanTableEnabled", v)}
                  label="Clean Table Request Button"
                  description="Guests can request clearing or table wipe-down."
                />
                <ToggleSwitch
                  isDarkMode={isDarkMode}
                  checked={form.qrBillRequestEnabled}
                  onChange={(v) => updateField("qrBillRequestEnabled", v)}
                  label="Ask for Bill Button"
                  description="Alerts cashier to bring printed invoice or UPI scanner."
                />
                <ToggleSwitch
                  isDarkMode={isDarkMode}
                  checked={form.autoOccupyTableOnOrder}
                  onChange={(v) => updateField("autoOccupyTableOnOrder", v)}
                  label="Auto-Occupy Floor Table on Order"
                  description="Automatically sets table status to Occupied when QR/POS order arrives."
                />
                <ToggleSwitch
                  isDarkMode={isDarkMode}
                  checked={form.autoAcceptQrToKds}
                  onChange={(v) => updateField("autoAcceptQrToKds", v)}
                  label="Direct QR Order Routing to KDS"
                  description="Dispatch Kitchen & Bar items immediately without cashier confirmation."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${headingText}`}>
                    Target Kitchen Prep SLA (Minutes)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="60"
                    value={form.prepTimeSlaMins}
                    onChange={(e) => updateField("prepTimeSlaMins", Number(e.target.value))}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${headingText}`}>
                    Target Waiter Call Response SLA (Minutes)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={form.waiterCallSlaMins}
                    onChange={(e) => updateField("waiterCallSlaMins", Number(e.target.value))}
                    className={inputCls}
                  />
                </div>
              </div>
            </div>
          )}

          {/* SECTION 4: PAYMENTS & UPI GATEWAY */}
          {section === "payments" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b pb-3 border-[#E5E1D9] dark:border-[#202330]">
                <div>
                  <h2 className={`text-base font-bold ${headingText}`}>Payment Methods, UPI VPA & Gateway</h2>
                  <p className={`text-xs ${mutedText}`}>Manage accepted tender types and Indian UPI merchant settlement details.</p>
                </div>
                <CreditCard className="w-5 h-5 text-[#C46B4E]" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <ToggleSwitch
                  isDarkMode={isDarkMode}
                  checked={form.upiEnabled}
                  onChange={(v) => updateField("upiEnabled", v)}
                  label="UPI Payments (GPay, PhonePe, Paytm, BHIM)"
                  description="Zero-MDR instant QR settlement via merchant VPA."
                />
                <ToggleSwitch
                  isDarkMode={isDarkMode}
                  checked={form.cashEnabled}
                  onChange={(v) => updateField("cashEnabled", v)}
                  label="Cash Counter & COD Acceptance"
                  description="Allow cash tender at POS register and delivery handoff."
                />
                <ToggleSwitch
                  isDarkMode={isDarkMode}
                  checked={form.cardEnabled}
                  onChange={(v) => updateField("cardEnabled", v)}
                  label="Credit / Debit Card Terminal (EDC)"
                  description="Track card swipe/tap transactions separately in Accounting."
                />
                <ToggleSwitch
                  isDarkMode={isDarkMode}
                  checked={form.payLaterEnabled}
                  onChange={(v) => updateField("payLaterEnabled", v)}
                  label="Open Table Tab (Pay at End of Meal)"
                  description="Let dine-in guests place orders now and settle single bill later."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${headingText}`}>Merchant UPI ID (VPA)</label>
                  <input
                    type="text"
                    value={form.upiVpa}
                    onChange={(e) => updateField("upiVpa", e.target.value)}
                    placeholder="restaurant@icici"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${headingText}`}>UPI Merchant Display Name</label>
                  <input
                    type="text"
                    value={form.upiMerchantName}
                    onChange={(e) => updateField("upiMerchantName", e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${headingText}`}>Gateway Environment</label>
                  <select
                    value={form.gatewayMode}
                    onChange={(e) => updateField("gatewayMode", e.target.value as "live" | "sandbox")}
                    className={inputCls}
                  >
                    <option value="live">Live Production Mode</option>
                    <option value="sandbox">Test / Sandbox Mode</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 5: KDS, ROUTING & THERMAL PRINTERS */}
          {section === "printers" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b pb-3 border-[#E5E1D9] dark:border-[#202330]">
                <div>
                  <h2 className={`text-base font-bold ${headingText}`}>KDS Station Routing & Thermal Printers</h2>
                  <p className={`text-xs ${mutedText}`}>Configure automatic Kitchen/Bar KOT splitting, audio chimes, and network printers.</p>
                </div>
                <Printer className="w-5 h-5 text-[#C46B4E]" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <ToggleSwitch
                  isDarkMode={isDarkMode}
                  checked={form.splitKitchenBarTickets}
                  onChange={(v) => updateField("splitKitchenBarTickets", v)}
                  label="Split Kitchen & Bar KDS Tickets"
                  description="Routes beverages automatically to Bar display and food to Kitchen line."
                />
                <ToggleSwitch
                  isDarkMode={isDarkMode}
                  checked={form.kdsSoundAlerts}
                  onChange={(v) => updateField("kdsSoundAlerts", v)}
                  label="Audio Chime on New Order / Bell"
                  description="Plays alert sound on KDS and Reception screens."
                />
                <ToggleSwitch
                  isDarkMode={isDarkMode}
                  checked={form.autoPrintKot}
                  onChange={(v) => updateField("autoPrintKot", v)}
                  label="Auto-Print KOT on Order Creation"
                  description="Dispatches thermal kitchen ticket automatically when order enters queue."
                />
                <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-4 ${subSurface}`}>
                  <div>
                    <div className={`text-xs font-bold ${headingText}`}>Receipt Paper Width</div>
                    <div className="text-[11px] text-[#64748B]">Standard thermal roll size</div>
                  </div>
                  <select
                    value={form.receiptPaperSize}
                    onChange={(e) => updateField("receiptPaperSize", e.target.value as "80mm" | "58mm")}
                    className={`px-3 py-1.5 rounded-lg text-xs border outline-hidden ${
                      isDarkMode ? "bg-[#14161f] border-[#2c3144] text-white" : "bg-white border-[#E5E1D9]"
                    }`}
                  >
                    <option value="80mm">80mm Thermal</option>
                    <option value="58mm">58mm Compact</option>
                  </select>
                </div>
              </div>

              {/* Connected Printers List */}
              <div className="space-y-2.5">
                <h3 className={`text-xs font-bold uppercase tracking-wider text-[#64748B]`}>
                  Configured POS & KOT Printers
                </h3>
                {form.printers.map((prt) => (
                  <div
                    key={prt.id}
                    className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${subSurface}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[#C46B4E]/15 text-[#C46B4E] flex items-center justify-center shrink-0">
                        <Printer className="w-4 h-4" />
                      </div>
                      <div>
                        <div className={`text-xs font-bold ${headingText}`}>{prt.name}</div>
                        <div className="text-[11px] text-[#64748B]">
                          {prt.station} · {prt.ipOrPort} · {prt.paperWidth}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          prt.status === "online"
                            ? "bg-blue-500/15 text-blue-700 dark:text-blue-300"
                            : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        {prt.status}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleTestPrinter(prt.name)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                          isDarkMode
                            ? "bg-[#14161f] border-[#2c3144] text-slate-200 hover:bg-[#1e2230]"
                            : "bg-white border-[#E5E1D9] text-[#20252B] hover:bg-slate-50"
                        }`}
                      >
                        Test Print
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 6: ALERTS & APPEARANCE */}
          {section === "alerts" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b pb-3 border-[#E5E1D9] dark:border-[#202330]">
                <div>
                  <h2 className={`text-base font-bold ${headingText}`}>Inventory Alerts, Digests & Appearance</h2>
                  <p className={`text-xs ${mutedText}`}>Control low-stock thresholds, WhatsApp/email summaries, and console display mode.</p>
                </div>
                <ShieldCheck className="w-5 h-5 text-[#C46B4E]" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <ToggleSwitch
                  isDarkMode={isDarkMode}
                  checked={form.lowStockAlertEnabled}
                  onChange={(v) => updateField("lowStockAlertEnabled", v)}
                  label="Real-Time Low Stock Alerts"
                  description="Highlight raw materials falling below minimum safety threshold."
                />
                <ToggleSwitch
                  isDarkMode={isDarkMode}
                  checked={form.dailyDigestEmail}
                  onChange={(v) => updateField("dailyDigestEmail", v)}
                  label="End-of-Day Sales & GST Email Digest"
                  description="Send daily closing report to outlet owner email."
                />
                <ToggleSwitch
                  isDarkMode={isDarkMode}
                  checked={form.whatsappAlertsEnabled}
                  onChange={(v) => updateField("whatsappAlertsEnabled", v)}
                  label="WhatsApp Critical Alerts"
                  description="Notify manager on out-of-stock ingredients or high-value cancellations."
                />
                <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-4 ${subSurface}`}>
                  <div>
                    <div className={`text-xs font-bold ${headingText}`}>Portal Display Theme</div>
                    <div className="text-[11px] text-[#64748B]">
                      Currently using {isDarkMode ? "Dark Midnight" : "Warm Sand Light"} mode
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onToggleTheme}
                    className="px-3 py-1.5 rounded-lg bg-[#C46B4E] hover:bg-[#B25C40] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    {isDarkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                    <span>Switch to {isDarkMode ? "Light" : "Dark"}</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${headingText}`}>
                    Expiry Warning Lead Window (Days Before Expiry)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={form.expiryAlertDays}
                    onChange={(e) => updateField("expiryAlertDays", Number(e.target.value))}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${headingText}`}>
                    Manager WhatsApp Number (India)
                  </label>
                  <input
                    type="text"
                    value={form.whatsappAlertNumber}
                    onChange={(e) => updateField("whatsappAlertNumber", e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Form Footer */}
          <div className={`pt-4 border-t flex items-center justify-between gap-3 ${isDarkMode ? "border-[#202330]" : "border-[#E5E1D9]"}`}>
            <span className={`text-[11px] ${mutedText}`}>
              Last updated: {new Date(form.updatedAt).toLocaleString("en-IN")}
            </span>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-[#C46B4E] hover:bg-[#B25C40] text-white text-xs font-semibold flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? "Saving Changes..." : "Save Configuration"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
