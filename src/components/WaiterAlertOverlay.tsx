"use client"

import React, { useEffect, useState } from "react"
import {
  BellRing,
  CheckCircle2,
  Clock,
  Receipt,
  Sparkles,
  UserCheck,
  Volume2,
  VolumeX,
  X,
} from "lucide-react"

export interface WaiterAlertItem {
  id: string
  table: string
  tableNumber: number
  type: "clean" | "waiter" | "bill"
  title: string
  status: "pending" | "in-progress" | "resolved"
  createdAt: string
  message?: string
}

interface WaiterAlertOverlayProps {
  requests: WaiterAlertItem[]
  isMuted: boolean
  onToggleMute: () => void
  onRingAgain: () => void
  onAcknowledgeRequest: (id: string) => Promise<void> | void
  onAcknowledgeAll: () => Promise<void> | void
  onDismissOverlay: () => void
}

function formatWaitElapsed(isoString: string, nowMs: number): string {
  const diffSec = Math.max(0, Math.floor((nowMs - new Date(isoString).getTime()) / 1000))
  if (isNaN(diffSec)) return "Just now"
  const mins = Math.floor(diffSec / 60)
  const secs = diffSec % 60
  if (mins === 0) return `${secs}s waiting`
  return `${mins}m ${secs.toString().padStart(2, "0")}s waiting`
}

function getRequestTheme(type: WaiterAlertItem["type"]) {
  if (type === "clean") {
    return {
      headerGradient: "from-sky-600 via-blue-600 to-cyan-600",
      borderColor: "border-sky-500",
      shadowGlow: "shadow-sky-500/30",
      ambientGlow: "bg-sky-500/20",
      iconGradient: "from-sky-500 to-blue-600 shadow-sky-500/50",
      pingBg: "bg-sky-500/30",
      pulseBg: "bg-sky-500/20",
      headerLabel: "Host & Front Desk Alert · Clean Table Requested",
      subHeading: "Table Cleaning Assistance",
      defaultMsg: "Guest requested table clearing or wipe-down from the table QR menu.",
      actionPrefix: "Acknowledge & Send Staff to Clean",
      pillCls: "bg-sky-500/20 text-sky-300 border-sky-500/30",
      pillLabel: "Clean Table",
      Icon: Sparkles,
    }
  }
  if (type === "bill") {
    return {
      headerGradient: "from-indigo-600 via-blue-600 to-indigo-700",
      borderColor: "border-indigo-500",
      shadowGlow: "shadow-indigo-500/30",
      ambientGlow: "bg-indigo-500/20",
      iconGradient: "from-indigo-500 to-blue-600 shadow-indigo-500/50",
      pingBg: "bg-indigo-500/30",
      pulseBg: "bg-indigo-500/20",
      headerLabel: "Host & Front Desk Alert · Bill Requested",
      subHeading: "Guest Ready for Check & Payment",
      defaultMsg: "Guest tapped Ask for Bill from the table QR menu.",
      actionPrefix: "Acknowledge & Send Bill to",
      pillCls: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
      pillLabel: "Request Bill",
      Icon: Receipt,
    }
  }
  return {
    headerGradient: "from-[#C46B4E] via-orange-600 to-amber-600",
    borderColor: "border-[#C46B4E]",
    shadowGlow: "shadow-[#C46B4E]/30",
    ambientGlow: "bg-[#C46B4E]/20",
    iconGradient: "from-[#C46B4E] to-amber-600 shadow-[#C46B4E]/50",
    pingBg: "bg-[#C46B4E]/30",
    pulseBg: "bg-[#C46B4E]/20",
    headerLabel: "Host & Front Desk Alert · Waiter Required",
    subHeading: "Guest Assistance Requested",
    defaultMsg: "Guest tapped Call Waiter from the table QR menu.",
    actionPrefix: "Acknowledge & Send Waiter to",
    pillCls: "bg-orange-500/20 text-orange-300 border-orange-500/30",
    pillLabel: "Call Waiter",
    Icon: BellRing,
  }
}

export function WaiterAlertOverlay({
  requests,
  isMuted,
  onToggleMute,
  onRingAgain,
  onAcknowledgeRequest,
  onAcknowledgeAll,
  onDismissOverlay,
}: WaiterAlertOverlayProps) {
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  if (requests.length === 0) return null

  const primary = requests[0]
  const theme = getRequestTheme(primary.type)
  const PrimaryIcon = theme.Icon

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="service-alert-heading"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 bg-[#0B0D13]/92 backdrop-blur-md animate-in fade-in duration-200"
    >
      {/* Pulsing ambient ring glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
        <div className={`w-[520px] h-[520px] rounded-full blur-3xl animate-pulse ${theme.ambientGlow}`} />
      </div>

      <div
        className={`relative w-full max-w-2xl rounded-3xl border-2 bg-[#141720] text-white shadow-2xl overflow-hidden ${theme.borderColor} ${theme.shadowGlow}`}
      >
        {/* Top Urgent Strip */}
        <div className={`bg-gradient-to-r px-6 py-3 flex items-center justify-between ${theme.headerGradient}`}>
          <div className="flex items-center gap-2.5 text-xs font-extrabold uppercase tracking-widest text-white">
            <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
            <span>{theme.headerLabel}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRingAgain}
              className="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-[11px] font-bold text-white flex items-center gap-1 transition cursor-pointer"
              title="Ring bell again"
            >
              <BellRing className="w-3.5 h-3.5" />
              <span>Ring</span>
            </button>
            <button
              type="button"
              onClick={onToggleMute}
              className="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-[11px] font-bold text-white flex items-center gap-1 transition cursor-pointer"
              title={isMuted ? "Unmute bell" : "Mute bell"}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              <span>{isMuted ? "Muted" : "Sound On"}</span>
            </button>
            <button
              type="button"
              onClick={onDismissOverlay}
              className="p-1 rounded-lg bg-white/15 hover:bg-white/30 text-white transition cursor-pointer"
              title="Dismiss screen alert"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Center Alert Content */}
        <div className="p-6 sm:p-8 text-center space-y-6">
          {/* Animated Alert Icon */}
          <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
            <span className={`absolute inset-0 rounded-full animate-ping ${theme.pingBg}`} />
            <span className={`absolute inset-2 rounded-full animate-pulse ${theme.pulseBg}`} />
            <div
              className={`relative w-20 h-20 rounded-full bg-gradient-to-br flex items-center justify-center shadow-lg ${theme.iconGradient}`}
            >
              <PrimaryIcon className="w-10 h-10 text-white animate-bounce" />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-amber-400">
              {requests.length === 1
                ? theme.subHeading
                : `${requests.length} Active Table Service Requests`}
            </p>
            <h2
              id="service-alert-heading"
              className="text-4xl sm:text-5xl font-black tracking-tight text-white"
            >
              {primary.table} · {primary.title}
            </h2>
            <p className="text-sm sm:text-base text-slate-300 font-medium">
              {primary.message || theme.defaultMsg}
            </p>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold mt-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{formatWaitElapsed(primary.createdAt, nowMs)}</span>
            </div>
          </div>

          {/* Active Queue Cards (when multiple requests are active across waiter/clean/bill) */}
          {requests.length > 1 && (
            <div className="text-left space-y-2 max-h-48 overflow-y-auto pr-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                All Pending Table Requests ({requests.length})
              </div>
              {requests.map((req) => {
                const itemTheme = getRequestTheme(req.type)
                const ItemIcon = itemTheme.Icon
                return (
                  <div
                    key={req.id}
                    className="p-3 rounded-xl bg-[#1a1e2b] border border-[#2a3044] flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`px-2 py-1 rounded-lg border text-[10px] font-bold inline-flex items-center gap-1 shrink-0 ${itemTheme.pillCls}`}
                      >
                        <ItemIcon className="w-3 h-3" />
                        <span>{itemTheme.pillLabel}</span>
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-white truncate">{req.table}</div>
                        <div className="text-[11px] text-amber-400">
                          {formatWaitElapsed(req.createdAt, nowMs)}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onAcknowledgeRequest(req.id)}
                      className="px-3 py-1.5 rounded-lg bg-[#C46B4E] hover:bg-[#B25C40] text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Acknowledge</span>
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            {requests.length === 1 ? (
              <button
                type="button"
                onClick={() => onAcknowledgeRequest(primary.id)}
                className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-[#C46B4E] hover:bg-[#B25C40] text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#C46B4E]/30 transition cursor-pointer active:scale-95"
              >
                <UserCheck className="w-5 h-5" />
                <span>
                  {theme.actionPrefix} {primary.table}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onAcknowledgeAll}
                className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-[#C46B4E] hover:bg-[#B25C40] text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#C46B4E]/30 transition cursor-pointer active:scale-95"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>Acknowledge &amp; Clear All ({requests.length})</span>
              </button>
            )}

            <button
              type="button"
              onClick={onDismissOverlay}
              className="w-full sm:w-auto px-5 py-3.5 rounded-2xl bg-[#222737] hover:bg-[#2b3145] text-slate-200 border border-[#343b52] text-sm font-semibold transition cursor-pointer"
            >
              Keep in Queue &amp; Minimize
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
