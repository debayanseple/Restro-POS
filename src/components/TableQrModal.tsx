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
  Smartphone,
  Wifi,
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
  const [lanUrl, setLanUrl] = useState("")

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin)
    }

    fetch("/api/system/network-info")
      .then((res) => res.json())
      .then((data) => {
        if (data?.networkUrl) {
          setLanUrl(data.networkUrl)
          // If accessing via localhost or 127.0.0.1, auto-switch origin to LAN IP so printed/scanned QR works on phone
          if (
            typeof window !== "undefined" &&
            (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
          ) {
            setOrigin(data.networkUrl)
          }
        }
      })
      .catch((err) => console.error("Error fetching network info:", err))
  }, [])

  const menuUrl = table && origin ? `${origin}/menu?table=${encodeURIComponent(table.name)}` : ""

  useEffect(() => {
    if (menuUrl) {
      QRCode.toDataURL(menuUrl, {
        width: 360,
        margin: 2,
        color: {
          dark: "#20252B",
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
              background: #F7F5F0;
              color: #20252B;
            }
            .stand-card {
              background: #ffffff;
              border: 2px solid #E5E1D9;
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
              color: #C46B4E;
              margin-bottom: 6px;
            }
            .outlet {
              font-size: 14px;
              color: #64748B;
              margin-bottom: 24px;
            }
            .table-badge {
              display: inline-block;
              background: #20252B;
              color: #ffffff;
              font-size: 24px;
              font-weight: 800;
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
              border-radius: 12px;
            }
            .instruction {
              font-size: 16px;
              font-weight: 700;
              margin-bottom: 6px;
              color: #20252B;
            }
            .sub {
              font-size: 12px;
              color: #64748B;
              line-height: 1.4;
            }
            .url-text {
              margin-top: 18px;
              font-size: 10px;
              color: #94A3B8;
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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-[#E5E1D9] rounded-2xl p-6 space-y-5 shadow-lg animate-in zoom-in-95 text-[#20252B]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E5E1D9] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#E9E3D8] text-[#C46B4E] border border-[#E5E1D9] flex items-center justify-center">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#20252B] flex items-center gap-2">
                <span>{table.name} QR Code</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {table.seats} Seats
                </span>
              </h3>
              <p className="text-[11px] text-[#64748B]">
                Customers scan this to order directly to {table.name}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F7F5F0] text-[#64748B] hover:text-[#20252B] border border-[#E5E1D9] flex items-center justify-center cursor-pointer transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* QR Code Presentation Stand Card */}
        <div className="p-5 rounded-xl bg-[#F7F5F0] text-[#20252B] text-center border border-[#E5E1D9] space-y-3">
          <div>
            <span className="text-[10px] font-bold tracking-widest text-[#C46B4E] uppercase block">
              Downtown Main Outlet
            </span>
            <div className="inline-block bg-[#20252B] text-white font-bold text-sm px-3.5 py-1 rounded-lg mt-1 tracking-wider uppercase">
              {table.name}
            </div>
          </div>

          <div className="flex justify-center p-2">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`${table.name} QR Code`}
                className="w-48 h-48 rounded-xl bg-white p-2 border border-[#E5E1D9] shadow-2xs"
              />
            ) : (
              <div className="w-48 h-48 rounded-xl bg-white flex items-center justify-center text-xs text-[#64748B] animate-pulse">
                Generating QR...
              </div>
            )}
          </div>

          <div>
            <div className="text-xs font-semibold text-[#20252B] flex items-center justify-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-[#C46B4E]" />
              <span>Scan with camera to order</span>
            </div>
            <p className="text-[10px] text-[#64748B] mt-0.5">
              Orders automatically pin to this table on POS & KDS
            </p>
          </div>
        </div>

        {/* Local Network URL Pill */}
        {lanUrl && (
          <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px]">
            <div className="flex items-center gap-1.5 truncate">
              <Wifi className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="truncate">
                Local Wi-Fi Host: <strong className="font-mono">{origin.replace(/^https?:\/\//, "")}</strong>
              </span>
            </div>
            <button
              onClick={() => {
                const local = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"
                setOrigin(origin === lanUrl ? local : lanUrl)
              }}
              className="text-[10px] text-emerald-700 hover:text-emerald-900 underline font-semibold shrink-0 ml-2 cursor-pointer"
            >
              {origin === lanUrl ? "Switch to Localhost" : "Use Wi-Fi IP"}
            </button>
          </div>
        )}

        {/* Menu Link Box */}
        <div className="p-2.5 rounded-xl bg-[#F7F5F0] border border-[#E5E1D9] flex items-center justify-between text-xs gap-2">
          <span className="text-[#64748B] truncate text-[11px] font-mono flex-1">
            {menuUrl}
          </span>
          <button
            onClick={handleCopy}
            className="px-2.5 py-1 rounded-lg bg-white border border-[#E5E1D9] hover:bg-[#E9E3D8] text-[#20252B] text-xs font-semibold flex items-center gap-1 shrink-0 transition cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-700" />
                <span className="text-emerald-700">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 text-[#64748B]" />
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
            className="py-2.5 rounded-lg bg-white hover:bg-[#F7F5F0] text-[#20252B] text-xs font-semibold border border-[#20252B] transition flex items-center justify-center gap-1.5 text-center cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5 text-[#64748B]" />
            <span>Test Menu</span>
          </a>

          <button
            onClick={handleDownload}
            disabled={!qrDataUrl}
            className="py-2.5 rounded-lg bg-white hover:bg-[#F7F5F0] text-[#20252B] text-xs font-semibold border border-[#E5E1D9] transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5 text-[#64748B]" />
            <span>Save PNG</span>
          </button>

          <button
            onClick={handlePrint}
            disabled={!qrDataUrl}
            className="py-2.5 rounded-lg bg-[#C46B4E] hover:bg-[#B25C40] text-white text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 shadow-2xs"
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
  const [lanUrl, setLanUrl] = useState("")

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin)
    }

    fetch("/api/system/network-info")
      .then((res) => res.json())
      .then((data) => {
        if (data?.networkUrl) {
          setLanUrl(data.networkUrl)
          if (
            typeof window !== "undefined" &&
            (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
          ) {
            setOrigin(data.networkUrl)
          }
        }
      })
      .catch((err) => console.error("Error fetching network info:", err))
  }, [])

  useEffect(() => {
    if (!origin || tables.length === 0) return

    const generateAll = async () => {
      const results: Record<string, string> = {}
      for (const t of tables) {
        try {
          const url = `${origin}/menu?table=${encodeURIComponent(t.name)}`
          const qr = await QRCode.toDataURL(url, {
            width: 260,
            margin: 1,
            color: { dark: "#20252B", light: "#ffffff" },
          })
          results[t.name] = qr
        } catch (e) {
          console.error(e)
        }
      }
      setQrMap(results)
    }

    generateAll()
  }, [tables, origin])

  const handlePrintAll = () => {
    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    const cardsHtml = tables
      .map((t) => {
        const qr = qrMap[t.name] || ""
        const url = `${origin}/menu?table=${encodeURIComponent(t.name)}`
        return `
          <div class="tent-card">
            <div class="tent-brand">RESTRO POS • DINE IN</div>
            <div class="tent-outlet">Downtown Main Outlet</div>
            <div class="tent-table">${t.name.toUpperCase()}</div>
            <img src="${qr}" class="tent-qr" />
            <div class="tent-title">Scan Camera to Order</div>
            <div class="tent-sub">Order directly from your phone.</div>
            <div class="tent-url">${url}</div>
          </div>
        `
      })
      .join("")

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>All Tables — QR Stand Tent Cards</title>
          <style>
            @page { size: A4; margin: 10mm; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              margin: 0;
              background: #fff;
              color: #20252B;
            }
            .grid-container {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 16px;
            }
            .tent-card {
              border: 1.5px dashed #E5E1D9;
              border-radius: 14px;
              padding: 24px;
              text-align: center;
              box-sizing: border-box;
              page-break-inside: avoid;
            }
            .tent-brand {
              font-size: 11px;
              font-weight: 700;
              letter-spacing: 1.5px;
              color: #C46B4E;
              margin-bottom: 3px;
            }
            .tent-outlet {
              font-size: 12px;
              color: #64748B;
              margin-bottom: 12px;
            }
            .tent-table {
              display: inline-block;
              background: #20252B;
              color: #fff;
              font-size: 18px;
              font-weight: 800;
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
              color: #20252B;
            }
            .tent-sub {
              font-size: 10px;
              color: #64748B;
              line-height: 1.3;
            }
            .tent-url {
              font-size: 8px;
              color: #94A3B8;
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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white border border-[#E5E1D9] rounded-2xl p-6 space-y-5 shadow-lg max-h-[90vh] flex flex-col text-[#20252B]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E5E1D9] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#E9E3D8] text-[#C46B4E] border border-[#E5E1D9] flex items-center justify-center">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#20252B]">
                Table QR Tent Stand Cards ({tables.length} Tables)
              </h3>
              <p className="text-[11px] text-[#64748B]">
                Print ready stand cards for each table in your dining floor
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F7F5F0] text-[#64748B] hover:text-[#20252B] border border-[#E5E1D9] flex items-center justify-center cursor-pointer transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Previews Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 overflow-y-auto p-1 flex-1">
          {tables.map((t) => (
            <div
              key={t.id}
              className="p-3 rounded-xl bg-[#F7F5F0] text-[#20252B] text-center space-y-1.5 border border-[#E5E1D9]"
            >
              <div className="text-[10px] font-bold text-[#C46B4E] uppercase tracking-wider">
                {t.name}
              </div>
              <div className="flex justify-center">
                {qrMap[t.name] ? (
                  <img
                    src={qrMap[t.name]}
                    alt={t.name}
                    className="w-24 h-24 rounded-lg bg-white p-1 border border-[#E5E1D9]"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-lg bg-white flex items-center justify-center text-[10px] text-[#64748B]">
                    Generating...
                  </div>
                )}
              </div>
              <div className="text-[10px] font-semibold text-[#20252B]">Scan to Order</div>
              <div className="text-[9px] text-[#64748B]">{t.seats} Seats</div>
            </div>
          ))}
        </div>

        {/* Actions Footer */}
        <div className="pt-3 border-t border-[#E5E1D9] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-[#64748B] space-y-0.5">
            <div>Formatted for 2-column or 4-column table stand printing with cut lines.</div>
            {lanUrl && (
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 font-medium">
                <Wifi className="w-3 h-3 text-emerald-600" />
                <span>Printing with Wi-Fi URL: <strong className="font-mono">{origin}</strong></span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-white hover:bg-[#F7F5F0] text-xs font-semibold text-[#20252B] border border-[#E5E1D9] cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handlePrintAll}
              className="px-5 py-2 rounded-lg bg-[#C46B4E] hover:bg-[#B25C40] text-xs font-semibold text-white shadow-2xs flex items-center gap-1.5 cursor-pointer"
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
