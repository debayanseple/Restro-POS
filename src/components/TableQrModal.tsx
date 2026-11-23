"use client"

import { useState, useEffect } from "react"
import QRCode from "qrcode"
import {
  QrCode,
  Download,
  Printer,
  ExternalLink,
  Copy,
  Check,
  X,
  Sparkles,
  Utensils,
  Smartphone,
} from "lucide-react"

export interface TableItemForQr {
  id: number
  name: string
  seats: number
  status?: string
}

interface TableQrModalProps {
  table: TableItemForQr | null
  onClose: () => void
}

export function TableQrModal({ table, onClose }: TableQrModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("")
  const [copied, setCopied] = useState(false)
  const [origin, setOrigin] = useState("")

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin)
    }
  }, [])

  const menuUrl = table && origin ? `${origin}/menu?table=${encodeURIComponent(table.name)}` : ""

  useEffect(() => {
    if (menuUrl) {
      QRCode.toDataURL(menuUrl, {
        width: 360,
        margin: 2,
        color: {
          dark: "#141624",
          light: "#ffffff",
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error("Error generating QR Code:", err))
    }
  }, [menuUrl])

  if (!table) return null

  const handleCopy = () => {
    if (menuUrl) {
      navigator.clipboard.writeText(menuUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  const handleDownload = () => {
    if (!qrDataUrl) return
    const a = document.createElement("a")
    a.href = qrDataUrl
    a.download = `${table.name.replace(/\s+/g, "-")}-QR.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const handlePrint = () => {
    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${table.name} — QR Menu Stand Card</title>
          <style>
            @page { size: auto; margin: 15mm; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 90vh;
              margin: 0;
              background: #fff;
              color: #111;
            }
            .stand-card {
              border: 2px solid #000;
              border-radius: 20px;
              padding: 40px;
              text-align: center;
              max-width: 380px;
              width: 100%;
              box-sizing: border-box;
            }
            .brand {
              font-size: 13px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 2px;
              color: #6b21a8;
              margin-bottom: 6px;
            }
            .outlet {
              font-size: 14px;
              color: #666;
              margin-bottom: 24px;
            }
            .table-badge {
              display: inline-block;
              background: #000;
              color: #fff;
              font-size: 26px;
              font-weight: 900;
              padding: 8px 24px;
              border-radius: 12px;
              margin-bottom: 20px;
              letter-spacing: 1px;
            }
            .qr-img {
              width: 240px;
              height: 240px;
              margin: 0 auto 20px auto;
              display: block;
            }
            .instruction {
              font-size: 16px;
              font-weight: 700;
              margin-bottom: 6px;
            }
            .sub {
              font-size: 12px;
              color: #666;
              line-height: 1.4;
            }
            .url-text {
              margin-top: 18px;
              font-size: 10px;
              color: #888;
              word-break: break-all;
            }
          </style>
        </head>
        <body>
          <div class="stand-card">
            <div class="brand">RESTRO POS • DINE IN</div>
            <div class="outlet">Downtown Main Outlet</div>
            <div class="table-badge">${table.name.toUpperCase()}</div>
            <img src="${qrDataUrl}" class="qr-img" />
            <div class="instruction">Scan with Phone to Order</div>
            <div class="sub">Open your smartphone camera to view our digital menu and order straight to your table.</div>
            <div class="url-text">${menuUrl}</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#131522] border border-[#262a3f] rounded-3xl p-6 space-y-5 shadow-2xl animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#22263a] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <span>{table.name} QR Code</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                  {table.seats} Seats
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Customers scan this to order directly to {table.name}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#1b1e2e] text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* QR Code Presentation Stand Card */}
        <div className="p-5 rounded-2xl bg-white text-slate-900 text-center shadow-lg border-2 border-purple-500/30 space-y-3">
          <div>
            <span className="text-[10px] font-bold tracking-widest text-purple-700 uppercase block">
              Downtown Main Outlet
            </span>
            <div className="inline-block bg-slate-950 text-white font-extrabold text-sm px-3 py-1 rounded-lg mt-1 tracking-wider uppercase">
              {table.name}
            </div>
          </div>

          <div className="flex justify-center p-2">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`${table.name} QR Code`}
                className="w-48 h-48 rounded-xl shadow-inner border border-slate-200"
              />
            ) : (
              <div className="w-48 h-48 rounded-xl bg-slate-100 flex items-center justify-center text-xs text-slate-400 animate-pulse">
                Generating QR...
              </div>
            )}
          </div>

          <div>
            <div className="text-xs font-bold text-slate-900 flex items-center justify-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-purple-600" />
              <span>Scan with camera to order</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Orders automatically pin to this table on POS & KDS
            </p>
          </div>
        </div>

        {/* Menu Link Box */}
        <div className="p-2.5 rounded-xl bg-[#191c2b] border border-[#272b3e] flex items-center justify-between text-xs gap-2">
          <span className="text-slate-400 truncate text-[11px] font-mono flex-1">
            {menuUrl}
          </span>
          <button
            onClick={handleCopy}
            className="px-2.5 py-1 rounded-lg bg-[#24293f] hover:bg-slate-700 text-purple-300 text-xs font-semibold flex items-center gap-1 shrink-0 transition cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-2">
          <a
            href={menuUrl}
            target="_blank"
            rel="noreferrer"
            className="py-2.5 rounded-xl bg-[#1b1e2e] hover:bg-[#23273c] text-slate-200 text-xs font-semibold border border-[#292e44] transition flex items-center justify-center gap-1.5 text-center cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5 text-purple-400" />
            <span>Test Menu</span>
          </a>

          <button
            onClick={handleDownload}
            disabled={!qrDataUrl}
            className="py-2.5 rounded-xl bg-[#1b1e2e] hover:bg-[#23273c] text-slate-200 text-xs font-semibold border border-[#292e44] transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span>Save PNG</span>
          </button>

          <button
            onClick={handlePrint}
            disabled={!qrDataUrl}
            className="py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-900/30 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Stand</span>
          </button>
        </div>
      </div>
    </div>
  )
}

interface AllTablesQrModalProps {
  tables: TableItemForQr[]
  onClose: () => void
}

export function AllTablesQrModal({ tables, onClose }: AllTablesQrModalProps) {
  const [qrMap, setQrMap] = useState<Record<string, string>>({})
  const [origin, setOrigin] = useState("")

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin)
    }
  }, [])

  useEffect(() => {
    if (!origin || tables.length === 0) return

    const generateAll = async () => {
      const result: Record<string, string> = {}
      for (const t of tables) {
        try {
          const url = `${origin}/menu?table=${encodeURIComponent(t.name)}`
          const dataUrl = await QRCode.toDataURL(url, {
            width: 300,
            margin: 2,
            color: { dark: "#000000", light: "#ffffff" },
          })
          result[t.name] = dataUrl
        } catch (e) {
          console.error("Failed to generate QR for", t.name, e)
        }
      }
      setQrMap(result)
    }

    generateAll()
  }, [tables, origin])

  const handlePrintAll = () => {
    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    const cardsHtml = tables
      .map((t) => {
        const qr = qrMap[t.name] || ""
        const menuUrl = `${origin}/menu?table=${encodeURIComponent(t.name)}`
        return `
          <div class="tent-card">
            <div class="tent-header">RESTRO POS • DINE IN MENU</div>
            <div class="tent-outlet">Downtown Main Outlet</div>
            <div class="tent-table">${t.name.toUpperCase()}</div>
            <img src="${qr}" class="tent-qr" />
            <div class="tent-title">Scan Camera to Order</div>
            <div class="tent-sub">Browse menu, select items & order directly to this table</div>
            <div class="tent-url">${menuUrl}</div>
          </div>
        `
      })
      .join("")

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print All Table QR Stands</title>
          <style>
            @page { size: A4 portrait; margin: 10mm; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              margin: 0;
              background: #fff;
              color: #111;
            }
            .grid-container {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 20px;
              page-break-inside: avoid;
            }
            .tent-card {
              border: 2px dashed #333;
              border-radius: 16px;
              padding: 24px;
              text-align: center;
              box-sizing: border-box;
              page-break-inside: avoid;
            }
            .tent-header {
              font-size: 11px;
              font-weight: 800;
              letter-spacing: 1.5px;
              color: #6b21a8;
            }
            .tent-outlet {
              font-size: 11px;
              color: #666;
              margin-bottom: 12px;
            }
            .tent-table {
              display: inline-block;
              background: #000;
              color: #fff;
              font-size: 18px;
              font-weight: 900;
              padding: 4px 16px;
              border-radius: 8px;
              margin-bottom: 12px;
            }
            .tent-qr {
              width: 170px;
              height: 170px;
              margin: 0 auto 10px auto;
              display: block;
            }
            .tent-title {
              font-size: 13px;
              font-weight: 700;
              margin-bottom: 4px;
            }
            .tent-sub {
              font-size: 10px;
              color: #555;
              line-height: 1.3;
            }
            .tent-url {
              font-size: 8px;
              color: #999;
              margin-top: 8px;
              word-break: break-all;
            }
          </style>
        </head>
        <body>
          <div class="grid-container">
            ${cardsHtml}
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#131522] border border-[#262a3f] rounded-3xl p-6 space-y-5 shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#22263a] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">
                Table QR Tent Stand Cards ({tables.length} Tables)
              </h3>
              <p className="text-[11px] text-slate-400">
                Print ready stand cards for each table in your dining floor
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#1b1e2e] text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Previews Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 overflow-y-auto p-1 flex-1">
          {tables.map((t) => (
            <div
              key={t.id}
              className="p-3 rounded-2xl bg-white text-slate-900 text-center space-y-1.5 shadow-md border border-slate-200"
            >
              <div className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">
                {t.name}
              </div>
              <div className="flex justify-center">
                {qrMap[t.name] ? (
                  <img
                    src={qrMap[t.name]}
                    alt={t.name}
                    className="w-24 h-24 rounded-lg border border-slate-200"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] text-slate-400">
                    Generating...
                  </div>
                )}
              </div>
              <div className="text-[10px] font-bold text-slate-800">Scan to Order</div>
              <div className="text-[9px] text-slate-500">{t.seats} Seats</div>
            </div>
          ))}
        </div>

        {/* Actions Footer */}
        <div className="pt-3 border-t border-[#22263a] flex items-center justify-between gap-3">
          <p className="text-xs text-slate-400">
            Formatted for 2-column or 4-column table stand printing with cut lines.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#1b1e2e] hover:bg-[#23273c] text-xs font-semibold text-slate-300 border border-[#2a2f44] cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handlePrintAll}
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white shadow-lg shadow-purple-900/40 flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print All Stands</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
