"use client"

import React, { useEffect, useState } from "react"
import { Printer, Receipt, X } from "lucide-react"
import {
  DEFAULT_RESTAURANT_SETTINGS,
  RestaurantSettings,
} from "@/lib/restaurant-settings"

export interface BillReceiptOrderItem {
  id?: string
  menu_item_id?: string
  name?: string
  quantity?: number
  unit_price?: number
  special_instructions?: string | null
  MenuItem?: { name?: string } | null
}

export interface BillReceiptOrder {
  id: string
  order_number?: string
  order_type?: string
  table_id?: string | null
  customer_name?: string | null
  customer_phone?: string | null
  payment_status?: string
  payment_method?: string
  tax_amount?: number
  discount_amount?: number
  total_amount?: number
  created_at?: string
  order_items?: BillReceiptOrderItem[]
}

interface BillReceiptModalProps {
  title: string
  orders: BillReceiptOrder[]
  resolveItemRate: (item: BillReceiptOrderItem) => number
  onClose: () => void
  isDarkMode?: boolean
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function formatBillDateTime(iso?: string): string {
  const d = iso ? new Date(iso) : new Date()
  if (isNaN(d.getTime())) return new Date().toLocaleString("en-IN")
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })
}

export function BillReceiptModal({
  title,
  orders,
  resolveItemRate,
  onClose,
  isDarkMode = false,
}: BillReceiptModalProps) {
  const [settings, setSettings] = useState<RestaurantSettings>(DEFAULT_RESTAURANT_SETTINGS)
  const [paperFormat, setPaperFormat] = useState<"80mm" | "58mm" | "a4">("80mm")

  useEffect(() => {
    let active = true
    fetch("/api/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data?.settings) {
          setSettings(data.settings)
          if (data.settings.receiptPaperSize === "58mm") {
            setPaperFormat("58mm")
          }
        }
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  const flattenedItems = orders.flatMap((ord) =>
    (ord.order_items || []).map((it, idx) => {
      const name = String(it.MenuItem?.name || it.name || "Menu Item").trim()
      const qty = Math.max(1, Number(it.quantity) || 1)
      const rate = resolveItemRate(it)
      const amount = rate * qty
      return {
        key: `${ord.id}-${it.id || idx}`,
        name,
        qty,
        rate,
        amount,
        notes: it.special_instructions || null,
      }
    })
  )

  const itemsSubtotal = flattenedItems.reduce((sum, it) => sum + it.amount, 0)
  const fallbackSubtotal = orders.reduce((acc, ord) => {
    const computed =
      (Number(ord.total_amount) || 0) -
      (Number(ord.tax_amount) || 0) +
      (Number(ord.discount_amount) || 0)
    return acc + Math.max(0, computed)
  }, 0)
  const subtotal = itemsSubtotal > 0 ? itemsSubtotal : fallbackSubtotal
  const totalTax = orders.reduce((acc, ord) => acc + (Number(ord.tax_amount) || 0), 0)
  const totalDiscount = orders.reduce((acc, ord) => acc + (Number(ord.discount_amount) || 0), 0)
  const rawTotal = orders.reduce((acc, ord) => acc + (Number(ord.total_amount) || 0), 0)
  const grandTotal = rawTotal > 0 ? rawTotal : Math.max(0, subtotal + totalTax - totalDiscount)

  const totalTaxRatePct = (settings.cgstRate || 2.5) + (settings.sgstRate || 2.5)
  const cgstShare =
    totalTaxRatePct > 0 ? totalTax * ((settings.cgstRate || 2.5) / totalTaxRatePct) : totalTax / 2
  const sgstShare = Math.max(0, totalTax - cgstShare)

  const orderNumbers = orders
    .map((o) => o.order_number || `#${o.id.slice(-4)}`)
    .join(", ")
  const firstOrder = orders[0]
  const guestName =
    orders.map((o) => o.customer_name).find(Boolean) || "Walk-in / Table Guest"
  const guestPhone = orders.map((o) => o.customer_phone).find(Boolean) || ""
  const isAllPaid = orders.length > 0 && orders.every((o) => o.payment_status === "PAID")
  const paymentMethod = firstOrder?.payment_method || "CASH / COUNTER"
  const orderTypeLabel = (firstOrder?.order_type || "dine-in").replace(/[-_]/g, " ").toUpperCase()
  const tableLabel = firstOrder?.table_id || title

  const handlePrintFormattedBill = () => {
    if (typeof document === "undefined") return

    const pageWidthCss =
      paperFormat === "58mm" ? "58mm" : paperFormat === "80mm" ? "80mm" : "210mm"
    const contentWidthCss =
      paperFormat === "58mm" ? "52mm" : paperFormat === "80mm" ? "72mm" : "150mm"
    const baseFontSize = paperFormat === "58mm" ? "10px" : paperFormat === "80mm" ? "11.5px" : "13px"

    const itemRowsHtml = flattenedItems
      .map(
        (it) => `
          <tr>
            <td class="col-item">
              <div class="item-name">${escapeHtml(it.name)}</div>
              ${it.notes ? `<div class="item-note">* ${escapeHtml(it.notes)}</div>` : ""}
            </td>
            <td class="col-qty">${it.qty}</td>
            <td class="col-rate">${it.rate.toFixed(2)}</td>
            <td class="col-amt">${it.amount.toFixed(2)}</td>
          </tr>
        `
      )
      .join("")

    const receiptHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Bill - ${escapeHtml(tableLabel)}</title>
          <style>
            @page {
              size: ${pageWidthCss} auto;
              margin: 4mm;
            }
            * {
              box-sizing: border-box;
            }
            body {
              margin: 0;
              padding: 0;
              background: #ffffff;
              color: #111111;
              font-family: "Courier New", Courier, monospace;
              font-size: ${baseFontSize};
              line-height: 1.38;
              -webkit-print-color-adjust: exact;
            }
            .receipt {
              width: ${contentWidthCss};
              margin: 0 auto;
              padding: 6px 2px;
            }
            .center {
              text-align: center;
            }
            .bold {
              font-weight: 700;
            }
            .brand {
              font-size: 1.35em;
              font-weight: 800;
              letter-spacing: 0.4px;
              text-transform: uppercase;
            }
            .sub {
              font-size: 0.9em;
              color: #333333;
            }
            .divider {
              border-top: 1px dashed #222222;
              margin: 7px 0;
            }
            .double-divider {
              border-top: 2px solid #111111;
              margin: 7px 0;
            }
            .meta-row {
              display: flex;
              justify-content: space-between;
              gap: 8px;
              margin: 2px 0;
              font-size: 0.92em;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 4px 0;
            }
            th {
              text-align: left;
              font-size: 0.88em;
              text-transform: uppercase;
              border-bottom: 1px dashed #222222;
              padding: 4px 0;
            }
            td {
              padding: 4px 0;
              vertical-align: top;
            }
            .col-qty {
              text-align: center;
              width: 12%;
            }
            .col-rate, .col-amt {
              text-align: right;
              width: 22%;
              white-space: nowrap;
            }
            .col-item {
              width: 44%;
              padding-right: 4px;
            }
            th.col-qty { text-align: center; }
            th.col-rate, th.col-amt { text-align: right; }
            .item-note {
              font-size: 0.84em;
              color: #444444;
            }
            .summary-row {
              display: flex;
              justify-content: space-between;
              margin: 2px 0;
              font-size: 0.94em;
            }
            .grand-total {
              display: flex;
              justify-content: space-between;
              font-size: 1.25em;
              font-weight: 800;
              padding: 4px 0;
            }
            .status-box {
              margin: 8px auto 4px;
              padding: 3px 8px;
              border: 1px solid #111111;
              display: inline-block;
              font-size: 0.85em;
              font-weight: 700;
              letter-spacing: 0.5px;
            }
            .footer-note {
              margin-top: 6px;
              font-size: 0.88em;
              color: #222222;
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="center">
              <div class="brand">${escapeHtml(settings.restaurantName)}</div>
              <div class="sub">${escapeHtml(settings.outletName)}</div>
              <div class="sub">${escapeHtml(settings.address)}, ${escapeHtml(settings.cityState)} - ${escapeHtml(settings.pinCode)}</div>
              <div class="sub">Tel: ${escapeHtml(settings.phone)}</div>
              <div class="sub">GSTIN: ${escapeHtml(settings.gstin)} | FSSAI: ${escapeHtml(settings.fssaiNumber)}</div>
              ${settings.receiptHeaderNote ? `<div class="sub bold" style="margin-top:3px;">${escapeHtml(settings.receiptHeaderNote)}</div>` : ""}
            </div>

            <div class="divider"></div>

            <div class="meta-row"><span>Bill No:</span><span class="bold">${escapeHtml(orderNumbers || "N/A")}</span></div>
            <div class="meta-row"><span>Date:</span><span>${escapeHtml(formatBillDateTime(firstOrder?.created_at))}</span></div>
            <div class="meta-row"><span>Table / Mode:</span><span class="bold">${escapeHtml(tableLabel)} (${escapeHtml(orderTypeLabel)})</span></div>
            <div class="meta-row"><span>Guest:</span><span>${escapeHtml(guestName)}${guestPhone ? ` (${escapeHtml(guestPhone)})` : ""}</span></div>

            <div class="divider"></div>

            <table>
              <thead>
                <tr>
                  <th class="col-item">Item</th>
                  <th class="col-qty">Qty</th>
                  <th class="col-rate">Rate</th>
                  <th class="col-amt">Amt</th>
                </tr>
              </thead>
              <tbody>
                ${itemRowsHtml}
              </tbody>
            </table>

            <div class="divider"></div>

            <div class="summary-row"><span>Subtotal (${flattenedItems.reduce((s, i) => s + i.qty, 0)} items)</span><span>₹${subtotal.toFixed(2)}</span></div>
            <div class="summary-row"><span>CGST (${settings.cgstRate || 2.5}%)</span><span>₹${cgstShare.toFixed(2)}</span></div>
            <div class="summary-row"><span>SGST (${settings.sgstRate || 2.5}%)</span><span>₹${sgstShare.toFixed(2)}</span></div>
            ${totalDiscount > 0 ? `<div class="summary-row"><span>Discount</span><span>-₹${totalDiscount.toFixed(2)}</span></div>` : ""}

            <div class="double-divider"></div>
            <div class="grand-total"><span>GRAND TOTAL</span><span>₹${grandTotal.toFixed(2)}</span></div>
            <div class="double-divider"></div>

            <div class="center">
              <div class="status-box">${isAllPaid ? `PAID · ${escapeHtml(paymentMethod)}` : "PAYMENT DUE · UNPAID"}</div>
              <div class="footer-note">${escapeHtml(settings.receiptFooterNote)}</div>
              <div class="sub" style="margin-top:4px;">SAC ${escapeHtml(settings.sacCode)} · Printed via Restro POS</div>
            </div>
          </div>
        </body>
      </html>
    `

    const iframe = document.createElement("iframe")
    iframe.style.position = "fixed"
    iframe.style.right = "0"
    iframe.style.bottom = "0"
    iframe.style.width = "0"
    iframe.style.height = "0"
    iframe.style.border = "0"
    iframe.setAttribute("aria-hidden", "true")
    document.body.appendChild(iframe)

    const doc = iframe.contentWindow?.document
    if (!doc) {
      document.body.removeChild(iframe)
      return
    }
    doc.open()
    doc.write(receiptHtml)
    doc.close()

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus()
        iframe.contentWindow?.print()
      } finally {
        setTimeout(() => {
          if (iframe.parentNode) {
            iframe.parentNode.removeChild(iframe)
          }
        }, 1200)
      }
    }, 150)
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden cursor-default flex flex-col max-h-[92dvh] ${
          isDarkMode
            ? "bg-[#161822] border-[#262a3a] text-white"
            : "bg-[#F7F5F0] border-[#E5E1D9] text-[#20252B]"
        }`}
      >
        {/* Top Modal Controls */}
        <div
          className={`px-5 py-3.5 border-b flex flex-wrap items-center justify-between gap-2 ${
            isDarkMode ? "border-[#252938] bg-[#1a1d28]" : "border-[#E5E1D9] bg-white"
          }`}
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#C46B4E]/15 text-[#C46B4E] flex items-center justify-center border border-[#C46B4E]/25">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Bill Print Preview · {title}</h3>
              <p className="text-[11px] text-[#64748B]">Formatted GST Receipt Layout</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div
              className={`flex items-center p-0.5 rounded-lg border text-[11px] font-semibold ${
                isDarkMode ? "bg-[#12141c] border-[#262a3a]" : "bg-[#F7F5F0] border-[#E5E1D9]"
              }`}
            >
              {(
                [
                  { id: "80mm", label: "80mm" },
                  { id: "58mm", label: "58mm" },
                  { id: "a4", label: "A4" },
                ] as const
              ).map((fmt) => (
                <button
                  key={fmt.id}
                  type="button"
                  onClick={() => setPaperFormat(fmt.id)}
                  className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                    paperFormat === fmt.id
                      ? "bg-[#20252B] text-white"
                      : isDarkMode
                        ? "text-slate-400 hover:text-white"
                        : "text-[#64748B] hover:text-[#20252B]"
                  }`}
                >
                  {fmt.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15 flex items-center justify-center cursor-pointer transition"
              aria-label="Close bill preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Receipt Paper Preview Area */}
        <div className="p-4 sm:p-6 overflow-y-auto overscroll-contain flex-1 flex justify-center">
          <div
            className={`bg-white text-[#111827] border border-[#D8CFC0] shadow-md rounded-xl p-5 font-mono text-[11.5px] leading-relaxed transition-all ${
              paperFormat === "58mm"
                ? "w-full max-w-[260px]"
                : paperFormat === "80mm"
                  ? "w-full max-w-[330px]"
                  : "w-full max-w-[440px]"
            }`}
          >
            {/* Restaurant Header */}
            <div className="text-center space-y-0.5">
              <div className="text-base font-extrabold tracking-wide uppercase">
                {settings.restaurantName}
              </div>
              <div className="text-[11px] font-semibold text-slate-700">{settings.outletName}</div>
              <div className="text-[10px] text-slate-600">
                {settings.address}, {settings.cityState} - {settings.pinCode}
              </div>
              <div className="text-[10px] text-slate-600">Tel: {settings.phone}</div>
              <div className="text-[10px] text-slate-600">
                GSTIN: {settings.gstin} · FSSAI: {settings.fssaiNumber}
              </div>
              {settings.receiptHeaderNote && (
                <div className="text-[10px] font-bold pt-1 text-slate-900">
                  {settings.receiptHeaderNote}
                </div>
              )}
            </div>

            <div className="border-t border-dashed border-slate-400 my-2.5" />

            {/* Invoice Metadata */}
            <div className="space-y-0.5 text-[11px]">
              <div className="flex justify-between gap-2">
                <span className="text-slate-600">Bill No:</span>
                <span className="font-bold text-right">{orderNumbers || "N/A"}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-600">Date:</span>
                <span className="text-right">{formatBillDateTime(firstOrder?.created_at)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-600">Table / Mode:</span>
                <span className="font-bold text-right">
                  {tableLabel} ({orderTypeLabel})
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-600">Guest:</span>
                <span className="text-right">
                  {guestName}
                  {guestPhone ? ` (${guestPhone})` : ""}
                </span>
              </div>
            </div>

            <div className="border-t border-dashed border-slate-400 my-2.5" />

            {/* Itemized Table */}
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-dashed border-slate-400 text-[10px] uppercase text-slate-600">
                  <th className="text-left py-1 pr-1 font-bold">Item</th>
                  <th className="text-center py-1 px-1 font-bold">Qty</th>
                  <th className="text-right py-1 px-1 font-bold">Rate</th>
                  <th className="text-right py-1 pl-1 font-bold">Amt</th>
                </tr>
              </thead>
              <tbody>
                {flattenedItems.map((it) => (
                  <tr key={it.key} className="align-top">
                    <td className="py-1 pr-1">
                      <div className="font-semibold text-slate-900">{it.name}</div>
                      {it.notes && (
                        <div className="text-[10px] text-slate-500">* {it.notes}</div>
                      )}
                    </td>
                    <td className="py-1 px-1 text-center">{it.qty}</td>
                    <td className="py-1 px-1 text-right whitespace-nowrap">
                      {it.rate.toFixed(2)}
                    </td>
                    <td className="py-1 pl-1 text-right font-semibold whitespace-nowrap">
                      {it.amount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="border-t border-dashed border-slate-400 my-2.5" />

            {/* Totals Breakdown */}
            <div className="space-y-0.5 text-[11px]">
              <div className="flex justify-between">
                <span>
                  Subtotal ({flattenedItems.reduce((s, i) => s + i.qty, 0)} items)
                </span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>CGST ({settings.cgstRate || 2.5}%)</span>
                <span>₹{cgstShare.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>SGST ({settings.sgstRate || 2.5}%)</span>
                <span>₹{sgstShare.toFixed(2)}</span>
              </div>
              {totalDiscount > 0 && (
                <div className="flex justify-between text-blue-700">
                  <span>Discount</span>
                  <span>-₹{totalDiscount.toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="border-y-2 border-slate-900 my-2.5 py-1.5 flex justify-between items-center text-sm font-extrabold">
              <span>GRAND TOTAL</span>
              <span>₹{grandTotal.toFixed(2)}</span>
            </div>

            {/* Footer */}
            <div className="text-center space-y-1.5 pt-1">
              <div className="inline-block px-2.5 py-0.5 border border-slate-900 text-[10px] font-bold tracking-wider uppercase">
                {isAllPaid ? `PAID · ${paymentMethod}` : "PAYMENT DUE · UNPAID"}
              </div>
              <p className="text-[10px] text-slate-700">{settings.receiptFooterNote}</p>
              <p className="text-[9px] text-slate-500">
                SAC {settings.sacCode} · Printed via Restro POS
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Print Actions */}
        <div
          className={`px-5 py-3.5 border-t flex items-center justify-between gap-2 ${
            isDarkMode ? "border-[#252938] bg-[#1a1d28]" : "border-[#E5E1D9] bg-white"
          }`}
        >
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 rounded-xl border text-xs font-semibold transition cursor-pointer ${
              isDarkMode
                ? "border-[#2e3244] text-slate-300 hover:bg-[#222636]"
                : "border-[#E5E1D9] bg-[#F7F5F0] text-[#20252B] hover:bg-[#E9E3D8]"
            }`}
          >
            Back
          </button>
          <button
            type="button"
            onClick={handlePrintFormattedBill}
            className="px-5 py-2 rounded-xl bg-[#C46B4E] hover:bg-[#B25C40] text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>Print Formatted Bill</span>
          </button>
        </div>
      </div>
    </div>
  )
}
